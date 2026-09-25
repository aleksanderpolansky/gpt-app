import { NextResponse } from "next/server";

import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import {
  localizeGlobalSystemValueObject,
  normalizeGlobalSystemValueObjectLocale,
} from "@/lib/reality-core/global-system-value-object-localization";
import {
  MEASUREMENT_ROLLUP_TARGET_METADATA_VERSION,
  readMeasurementRollupTargetMetadataV1,
  writeMeasurementRollupTargetMetadataV1,
  type MeasurementRollupTargetMetadataV1,
} from "@/lib/reality-core/measurement-rollup-target-metadata-v1";
import { supabase } from "../../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER = "admin-measurement-rollup-target-authoring-v1" as const;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type JsonRecord = Record<string, unknown>;

type ValueObjectRow = {
  id: string;
  title: string;
  description: string | null;
  canonical_key: string | null;
  parent_value_object_id: string | null;
  root_value_object_id: string | null;
  ontology_node_role_code: string | null;
  facet_code: string | null;
  object_kind_code: string | null;
  scope_code: string | null;
  origin_type_code: string | null;
  status: string;
  metadata_json: JsonRecord | null;
  updated_at: string | null;
};

type ParameterDefinitionRow = {
  id: string;
  parameter_code: string;
  title: string;
  dimension_code: string;
  value_type_code: string;
  canonical_unit_code: string;
  status: string;
  scope_code: string;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function finiteNumber(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(parsed) ? parsed : null;
}

function errorResponse(
  status: number,
  errorCode: string,
  errorMessage: string,
) {
  return NextResponse.json(
    {
      ok: false,
      routeMarker: ROUTE_MARKER,
      errorCode,
      errorMessage,
      sideEffects: {
        dbReadExecuted: true,
        dbWriteExecuted: false,
        rowsActuallyWritten: 0,
      },
    },
    { status },
  );
}

async function readTarget(valueObjectId: string): Promise<ValueObjectRow | null> {
  const { data, error } = await supabase
    .from("value_objects")
    .select(
      "id,title,description,canonical_key,parent_value_object_id,root_value_object_id,ontology_node_role_code,facet_code,object_kind_code,scope_code,origin_type_code,status,metadata_json,updated_at",
    )
    .eq("id", valueObjectId)
    .maybeSingle();

  if (error) {
    throw new Error(`ROLLUP_TARGET_READ_FAILED:${error.message}`);
  }

  const row = (data as ValueObjectRow | null) ?? null;
  if (!row) {
    return null;
  }

  const eligible =
    row.scope_code === "global" &&
    row.origin_type_code === "system_model" &&
    row.ontology_node_role_code === "leaf" &&
    row.status === "active" &&
    Boolean(row.parent_value_object_id) &&
    Boolean(row.root_value_object_id);

  return eligible ? row : null;
}

async function readCandidateLeaves(
  target: ValueObjectRow,
  locale: ReturnType<typeof normalizeGlobalSystemValueObjectLocale>,
) {
  if (!target.parent_value_object_id || !target.root_value_object_id) {
    return [];
  }

  const { data, error } = await supabase
    .from("value_objects")
    .select(
      "id,title,description,canonical_key,parent_value_object_id,root_value_object_id,ontology_node_role_code,facet_code,object_kind_code,scope_code,origin_type_code,status,metadata_json,updated_at",
    )
    .eq("scope_code", "global")
    .eq("origin_type_code", "system_model")
    .eq("status", "active")
    .eq("ontology_node_role_code", "leaf")
    .eq("parent_value_object_id", target.parent_value_object_id)
    .eq("root_value_object_id", target.root_value_object_id)
    .neq("id", target.id)
    .order("title", { ascending: true });

  if (error) {
    throw new Error(`ROLLUP_SIBLING_READ_FAILED:${error.message}`);
  }

  return ((data ?? []) as ValueObjectRow[]).map((row) => {
    const localized = localizeGlobalSystemValueObject(row, locale);

    return {
      id: row.id,
      title: localized.title,
      canonicalKey: row.canonical_key,
      facetCode: row.facet_code,
      objectKindCode: row.object_kind_code,
    };
  });
}

async function readSystemNumericParameters() {
  const { data, error } = await supabase
    .from("value_object_parameter_definitions")
    .select(
      "id,parameter_code,title,dimension_code,value_type_code,canonical_unit_code,status,scope_code",
    )
    .eq("scope_code", "system")
    .eq("status", "active")
    .eq("value_type_code", "numeric")
    .neq("parameter_code", "process_count")
    .order("title", { ascending: true })
    .limit(2000);

  if (error) {
    throw new Error(`ROLLUP_PARAMETER_READ_FAILED:${error.message}`);
  }

  return ((data ?? []) as ParameterDefinitionRow[]).map((row) => ({
    id: row.id,
    parameterCode: row.parameter_code,
    title: row.title,
    dimensionCode: row.dimension_code,
    canonicalUnitCode: row.canonical_unit_code,
  }));
}

async function readParameterDefinition(
  parameterDefinitionId: string,
): Promise<ParameterDefinitionRow | null> {
  const { data, error } = await supabase
    .from("value_object_parameter_definitions")
    .select(
      "id,parameter_code,title,dimension_code,value_type_code,canonical_unit_code,status,scope_code",
    )
    .eq("id", parameterDefinitionId)
    .eq("scope_code", "system")
    .eq("status", "active")
    .eq("value_type_code", "numeric")
    .maybeSingle();

  if (error) {
    throw new Error(`ROLLUP_PARAMETER_LOOKUP_FAILED:${error.message}`);
  }

  return (data as ParameterDefinitionRow | null) ?? null;
}

function sameSemanticConfiguration(
  current: MeasurementRollupTargetMetadataV1 | null,
  next: MeasurementRollupTargetMetadataV1,
) {
  return Boolean(
    current &&
      current.parameterDefinitionId === next.parameterDefinitionId &&
      current.parameterCode === next.parameterCode &&
      current.canonicalUnitCode === next.canonicalUnitCode &&
      current.operator === next.operator &&
      current.requiredComponentPolicy === next.requiredComponentPolicy &&
      current.directValuePolicy === next.directValuePolicy &&
      current.missingValuePolicy === next.missingValuePolicy &&
      current.discrepancyPolicy === next.discrepancyPolicy &&
      current.discrepancyToleranceAbsolute ===
        next.discrepancyToleranceAbsolute &&
      JSON.stringify([...current.sourceValueObjectIds].sort()) ===
        JSON.stringify([...next.sourceValueObjectIds].sort()),
  );
}

async function responseBundle(
  target: ValueObjectRow,
  locale: ReturnType<typeof normalizeGlobalSystemValueObjectLocale>,
) {
  const localizedTarget = localizeGlobalSystemValueObject(target, locale);
  const [candidates, parameters] = await Promise.all([
    readCandidateLeaves(target, locale),
    readSystemNumericParameters(),
  ]);

  let configuration: MeasurementRollupTargetMetadataV1 | null = null;
  try {
    configuration = readMeasurementRollupTargetMetadataV1(
      target.metadata_json,
    );
  } catch (error) {
    throw new Error(
      `ROLLUP_METADATA_CORRUPT:${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  return {
    target: {
      id: target.id,
      title: localizedTarget.title,
      canonicalKey: target.canonical_key,
      parentValueObjectId: target.parent_value_object_id,
      rootValueObjectId: target.root_value_object_id,
      facetCode: target.facet_code,
      objectKindCode: target.object_kind_code,
      updatedAt: target.updated_at,
    },
    configuration,
    candidates,
    parameters,
  };
}

export async function GET(request: Request, context: RouteContext) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) {
    return platformAdminErrorResponse(guard, ROUTE_MARKER);
  }

  const { id: rawId } = await context.params;
  const valueObjectId = decodeURIComponent(rawId).trim();
  if (!UUID_RE.test(valueObjectId)) {
    return errorResponse(
      400,
      "ROLLUP_TARGET_ID_INVALID",
      "A valid leaf observation object id is required.",
    );
  }

  const locale = normalizeGlobalSystemValueObjectLocale(
    new URL(request.url).searchParams.get("locale"),
  );

  try {
    const target = await readTarget(valueObjectId);
    if (!target) {
      return errorResponse(
        404,
        "ROLLUP_TARGET_NOT_FOUND_OR_INELIGIBLE",
        "Active global system leaf observation object not found.",
      );
    }

    return NextResponse.json({
      ok: true,
      routeMarker: ROUTE_MARKER,
      locale,
      ...(await responseBundle(target, locale)),
      sideEffects: {
        dbReadExecuted: true,
        dbWriteExecuted: false,
        rowsActuallyWritten: 0,
      },
    });
  } catch (error) {
    return errorResponse(
      500,
      "ROLLUP_TARGET_READ_FAILED",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) {
    return platformAdminErrorResponse(guard, ROUTE_MARKER);
  }

  const { id: rawId } = await context.params;
  const valueObjectId = decodeURIComponent(rawId).trim();
  if (!UUID_RE.test(valueObjectId)) {
    return errorResponse(
      400,
      "ROLLUP_TARGET_ID_INVALID",
      "A valid leaf observation object id is required.",
    );
  }

  let body: JsonRecord;
  try {
    body = asRecord(await request.json());
  } catch {
    return errorResponse(400, "ROLLUP_BODY_INVALID", "Invalid JSON body.");
  }

  const parameterDefinitionId = text(body.parameterDefinitionId);
  const rawSources = Array.isArray(body.sourceValueObjectIds)
    ? body.sourceValueObjectIds
    : [];
  const sourceValueObjectIds = [
    ...new Set(
      rawSources
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
  const tolerance = finiteNumber(body.discrepancyToleranceAbsolute);
  const locale = normalizeGlobalSystemValueObjectLocale(
    text(body.locale) || null,
  );

  if (
    !UUID_RE.test(parameterDefinitionId) ||
    sourceValueObjectIds.length < 2 ||
    sourceValueObjectIds.some((id) => !UUID_RE.test(id)) ||
    tolerance === null ||
    tolerance < 0 ||
    tolerance > 1_000_000
  ) {
    return errorResponse(
      400,
      "ROLLUP_CONFIGURATION_INVALID",
      "Parameter, at least two source leaves, and a non-negative tolerance are required.",
    );
  }

  try {
    const [target, parameter] = await Promise.all([
      readTarget(valueObjectId),
      readParameterDefinition(parameterDefinitionId),
    ]);

    if (!target) {
      return errorResponse(
        404,
        "ROLLUP_TARGET_NOT_FOUND_OR_INELIGIBLE",
        "Active global system leaf observation object not found.",
      );
    }
    if (!parameter) {
      return errorResponse(
        409,
        "ROLLUP_PARAMETER_NOT_AVAILABLE",
        "Selected active system numeric parameter is not available.",
      );
    }

    const candidates = await readCandidateLeaves(target, locale);
    const candidateIds = new Set(candidates.map((candidate) => candidate.id));
    const invalidSource = sourceValueObjectIds.find(
      (id) => !candidateIds.has(id),
    );

    if (invalidSource) {
      return errorResponse(
        409,
        "ROLLUP_SOURCE_NOT_SAME_LEVEL_LEAF",
        `Source observation object is not an active sibling leaf: ${invalidSource}`,
      );
    }

    const now = new Date().toISOString();
    const nextConfiguration: MeasurementRollupTargetMetadataV1 = {
      contractVersion: MEASUREMENT_ROLLUP_TARGET_METADATA_VERSION,
      status: "active",
      parameterDefinitionId: parameter.id,
      parameterCode: parameter.parameter_code,
      canonicalUnitCode: parameter.canonical_unit_code,
      operator: "sum",
      sourceValueObjectIds,
      requiredComponentPolicy: "all",
      directValuePolicy: "prefer_direct",
      missingValuePolicy: "unknown",
      discrepancyPolicy: "flag",
      discrepancyToleranceAbsolute: tolerance,
      configuredAt: now,
      configuredByAppUserId: guard.appUser.id,
      configuredByAdminId: guard.platformAdmin.id,
    };

    const currentConfiguration = readMeasurementRollupTargetMetadataV1(
      target.metadata_json,
    );

    if (sameSemanticConfiguration(currentConfiguration, nextConfiguration)) {
      return NextResponse.json({
        ok: true,
        routeMarker: ROUTE_MARKER,
        idempotentReplay: true,
        ...(await responseBundle(target, locale)),
        sideEffects: {
          dbReadExecuted: true,
          dbWriteExecuted: false,
          rowsActuallyWritten: 0,
        },
      });
    }

    const nextMetadata = writeMeasurementRollupTargetMetadataV1(
      target.metadata_json,
      nextConfiguration,
    );

    let updateQuery = supabase
      .from("value_objects")
      .update({
        metadata_json: nextMetadata,
        updated_at: now,
      })
      .eq("id", target.id)
      .eq("scope_code", "global")
      .eq("origin_type_code", "system_model")
      .eq("ontology_node_role_code", "leaf");

    if (target.updated_at) {
      updateQuery = updateQuery.eq("updated_at", target.updated_at);
    }

    const { data: updatedRows, error: updateError } = await updateQuery
      .select(
        "id,title,description,canonical_key,parent_value_object_id,root_value_object_id,ontology_node_role_code,facet_code,object_kind_code,scope_code,origin_type_code,status,metadata_json,updated_at",
      )
      .limit(1);

    if (updateError) {
      throw new Error(`ROLLUP_TARGET_WRITE_FAILED:${updateError.message}`);
    }

    const updated = (updatedRows?.[0] as ValueObjectRow | undefined) ?? null;
    if (!updated) {
      return errorResponse(
        409,
        "ROLLUP_TARGET_CONCURRENT_UPDATE",
        "The observation object changed while the rollup setting was being saved. Reload and retry.",
      );
    }

    return NextResponse.json({
      ok: true,
      routeMarker: ROUTE_MARKER,
      idempotentReplay: false,
      ...(await responseBundle(updated, locale)),
      sideEffects: {
        dbReadExecuted: true,
        dbWriteExecuted: true,
        rowsActuallyWritten: 1,
      },
    });
  } catch (error) {
    return errorResponse(
      500,
      "ROLLUP_TARGET_WRITE_FAILED",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) {
    return platformAdminErrorResponse(guard, ROUTE_MARKER);
  }

  const { id: rawId } = await context.params;
  const valueObjectId = decodeURIComponent(rawId).trim();
  if (!UUID_RE.test(valueObjectId)) {
    return errorResponse(
      400,
      "ROLLUP_TARGET_ID_INVALID",
      "A valid leaf observation object id is required.",
    );
  }

  let body: JsonRecord = {};
  try {
    const raw = await request.json();
    body = asRecord(raw);
  } catch {
    body = {};
  }

  const locale = normalizeGlobalSystemValueObjectLocale(
    text(body.locale) || null,
  );

  try {
    const target = await readTarget(valueObjectId);
    if (!target) {
      return errorResponse(
        404,
        "ROLLUP_TARGET_NOT_FOUND_OR_INELIGIBLE",
        "Active global system leaf observation object not found.",
      );
    }

    const currentConfiguration = readMeasurementRollupTargetMetadataV1(
      target.metadata_json,
    );

    if (!currentConfiguration) {
      return NextResponse.json({
        ok: true,
        routeMarker: ROUTE_MARKER,
        idempotentReplay: true,
        ...(await responseBundle(target, locale)),
        sideEffects: {
          dbReadExecuted: true,
          dbWriteExecuted: false,
          rowsActuallyWritten: 0,
        },
      });
    }

    const now = new Date().toISOString();
    const nextMetadata = writeMeasurementRollupTargetMetadataV1(
      target.metadata_json,
      null,
    );

    let updateQuery = supabase
      .from("value_objects")
      .update({
        metadata_json: nextMetadata,
        updated_at: now,
      })
      .eq("id", target.id)
      .eq("scope_code", "global")
      .eq("origin_type_code", "system_model")
      .eq("ontology_node_role_code", "leaf");

    if (target.updated_at) {
      updateQuery = updateQuery.eq("updated_at", target.updated_at);
    }

    const { data: updatedRows, error: updateError } = await updateQuery
      .select(
        "id,title,description,canonical_key,parent_value_object_id,root_value_object_id,ontology_node_role_code,facet_code,object_kind_code,scope_code,origin_type_code,status,metadata_json,updated_at",
      )
      .limit(1);

    if (updateError) {
      throw new Error(`ROLLUP_TARGET_CLEAR_FAILED:${updateError.message}`);
    }

    const updated = (updatedRows?.[0] as ValueObjectRow | undefined) ?? null;
    if (!updated) {
      return errorResponse(
        409,
        "ROLLUP_TARGET_CONCURRENT_UPDATE",
        "The observation object changed while the rollup setting was being cleared. Reload and retry.",
      );
    }

    return NextResponse.json({
      ok: true,
      routeMarker: ROUTE_MARKER,
      idempotentReplay: false,
      ...(await responseBundle(updated, locale)),
      sideEffects: {
        dbReadExecuted: true,
        dbWriteExecuted: true,
        rowsActuallyWritten: 1,
      },
    });
  } catch (error) {
    return errorResponse(
      500,
      "ROLLUP_TARGET_CLEAR_FAILED",
      error instanceof Error ? error.message : String(error),
    );
  }
}

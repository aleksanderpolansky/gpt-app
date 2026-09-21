import crypto from "node:crypto";

import { NextResponse } from "next/server";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT = "/api/activity/facts/snapshots" as const;
const SNAPSHOT_CONTRACT = "ARCTOR_USER_STATE_SNAPSHOT_CAPTURE_V1" as const;
const STATES_AND_NEEDS_ROOT_ID =
  "6ba4ecf1-8a05-5eaa-b280-4eb7aff2a42a" as const;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SUPPORTED_FACT_MEASURE_TYPES = new Set([
  "duration",
  "distance",
  "count",
  "volume",
  "mass",
  "money",
  "energy",
  "repetitions",
  "state_score",
  "state_text",
  "boolean_state",
  "role",
  "context_tag",
  "derived_metric",
  "rate",
  "pressure",
  "ratio",
  "temperature",
  "sound_level",
  "illuminance",
]);

type JsonRecord = Record<string, unknown>;

type AssignmentRow = {
  id: string;
  value_object_id: string;
  parameter_definition_id: string;
  scope_code: string;
  assignment_scope_code: string;
  owner_user_id: string | null;
  owner_actor_id: string | null;
  status: string;
};

type DefinitionRow = {
  id: string;
  parameter_code: string;
  title: string;
  description: string | null;
  dimension_code: string;
  value_type_code: string;
  canonical_unit_code: string;
  allowed_unit_codes: unknown;
  aggregation_method_code: string;
  default_window_code: string;
  allow_negative: boolean;
  scope_code: string;
  status: string;
};

type ValueObjectRow = {
  id: string;
  canonical_key: string;
  title: string;
  metadata_json: unknown;
  scope_code: string;
  origin_type_code: string;
  ontology_node_role_code: string | null;
  root_value_object_id: string | null;
  status: string;
};

type AuthenticatedContext =
  | {
      ok: true;
      appUserId: string;
      actorId: string;
    }
  | {
      ok: false;
      status: number;
      errorCode: string;
      errorMessage: string;
    };

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .map((item) => text(item))
        .filter(Boolean)
    : [];
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const objectValue = value as JsonRecord;
    return `{${Object.keys(objectValue)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(objectValue[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value) ?? "null";
}

function sha256(value: unknown) {
  return crypto
    .createHash("sha256")
    .update(stableJson(value), "utf8")
    .digest("hex");
}

function localizedValueObjectTitle(
  row: ValueObjectRow,
  locale: string,
): string {
  const metadata = record(row.metadata_json);
  const localized = record(metadata.localizedContent);
  const variants = record(localized.variants);
  const localeVariant = record(variants[locale]);
  const englishVariant = record(variants.en);

  return (
    text(localeVariant.title) ||
    text(englishVariant.title) ||
    text(row.title) ||
    text(row.canonical_key)
  );
}

function semanticObjectKey(canonicalKey: string): string {
  return canonicalKey
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

async function authenticatedContext(): Promise<AuthenticatedContext> {
  let session: Awaited<ReturnType<typeof auth0.getSession>> | null = null;

  try {
    session = await auth0.getSession();
  } catch {
    session = null;
  }

  const auth0Sub = text(session?.user?.sub);
  if (!auth0Sub) {
    return {
      ok: false,
      status: 401,
      errorCode: "SNAPSHOT_CAPTURE_UNAUTHENTICATED",
      errorMessage: "Authentication is required.",
    };
  }

  try {
    const actor = await resolveActiveActorContext(auth0Sub);

    return {
      ok: true,
      appUserId: actor.appUserId,
      actorId: actor.actorId,
    };
  } catch (error) {
    if (error instanceof ActorContextError) {
      return {
        ok: false,
        status: error.status,
        errorCode: error.code,
        errorMessage: error.message,
      };
    }

    return {
      ok: false,
      status: 500,
      errorCode: "SNAPSHOT_CAPTURE_ACTOR_CONTEXT_FAILED",
      errorMessage: "Could not resolve active actor.",
    };
  }
}

async function systemSnapshotOptions(input: {
  locale: string;
  parameterCode?: string | null;
}) {
  let definitionQuery = supabase
    .from("value_object_parameter_definitions")
    .select(
      "id,parameter_code,title,description,dimension_code,value_type_code,canonical_unit_code,allowed_unit_codes,aggregation_method_code,default_window_code,allow_negative,scope_code,status",
    )
    .eq("scope_code", "system")
    .eq("status", "active")
    .eq("value_type_code", "numeric")
    .limit(1000);

  const parameterCode = text(input.parameterCode).toLowerCase();
  if (parameterCode) {
    definitionQuery = definitionQuery.eq("parameter_code", parameterCode);
  }

  const { data: definitionData, error: definitionError } =
    await definitionQuery;

  if (definitionError) {
    throw new Error(
      `SNAPSHOT_CAPTURE_PARAMETER_READ_FAILED:${definitionError.message}`,
    );
  }

  const definitions = (definitionData ?? []) as DefinitionRow[];
  const supportedDefinitions = definitions.filter((definition) =>
    SUPPORTED_FACT_MEASURE_TYPES.has(text(definition.parameter_code)),
  );

  if (supportedDefinitions.length === 0) {
    return [];
  }

  const definitionIds = supportedDefinitions.map((row) => row.id);

  const { data: assignmentData, error: assignmentError } = await supabase
    .from("value_object_parameter_assignments")
    .select(
      "id,value_object_id,parameter_definition_id,scope_code,assignment_scope_code,owner_user_id,owner_actor_id,status",
    )
    .in("parameter_definition_id", definitionIds)
    .eq("scope_code", "system")
    .eq("assignment_scope_code", "system")
    .eq("status", "active")
    .is("owner_user_id", null)
    .is("owner_actor_id", null)
    .limit(3000);

  if (assignmentError) {
    throw new Error(
      `SNAPSHOT_CAPTURE_ASSIGNMENT_READ_FAILED:${assignmentError.message}`,
    );
  }

  const assignments = (assignmentData ?? []) as AssignmentRow[];
  const valueObjectIds = Array.from(
    new Set(assignments.map((row) => text(row.value_object_id)).filter(Boolean)),
  );

  if (valueObjectIds.length === 0) {
    return [];
  }

  const { data: valueObjectData, error: valueObjectError } = await supabase
    .from("value_objects")
    .select(
      "id,canonical_key,title,metadata_json,scope_code,origin_type_code,ontology_node_role_code,root_value_object_id,status",
    )
    .in("id", valueObjectIds)
    .eq("scope_code", "global")
    .eq("origin_type_code", "system_model")
    .eq("ontology_node_role_code", "leaf")
    .eq("root_value_object_id", STATES_AND_NEEDS_ROOT_ID)
    .eq("status", "active")
    .limit(3000);

  if (valueObjectError) {
    throw new Error(
      `SNAPSHOT_CAPTURE_VALUE_OBJECT_READ_FAILED:${valueObjectError.message}`,
    );
  }

  const valueObjects = (valueObjectData ?? []) as ValueObjectRow[];
  const valueObjectById = new Map(
    valueObjects.map((row) => [String(row.id), row]),
  );
  const definitionById = new Map(
    supportedDefinitions.map((row) => [String(row.id), row]),
  );

  return assignments
    .map((assignment) => {
      const definition = definitionById.get(assignment.parameter_definition_id);
      const valueObject = valueObjectById.get(assignment.value_object_id);

      if (!definition || !valueObject) {
        return null;
      }

      const allowedUnits = stringArray(definition.allowed_unit_codes);
      const canonicalUnit = text(definition.canonical_unit_code);

      if (!canonicalUnit || !allowedUnits.includes(canonicalUnit)) {
        return null;
      }

      return {
        assignmentId: assignment.id,
        parameterDefinitionId: definition.id,
        parameterCode: definition.parameter_code,
        parameterTitle: definition.title,
        dimensionCode: definition.dimension_code,
        canonicalUnitCode: canonicalUnit,
        allowedUnitCodes: allowedUnits,
        aggregationMethodCode: definition.aggregation_method_code,
        defaultWindowCode: definition.default_window_code,
        allowNegative: definition.allow_negative === true,
        valueObjectId: valueObject.id,
        valueObjectCanonicalKey: valueObject.canonical_key,
        valueObjectTitle: localizedValueObjectTitle(
          valueObject,
          input.locale,
        ),
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      const leftLabel = `${left?.valueObjectTitle ?? ""} ${left?.parameterTitle ?? ""}`;
      const rightLabel = `${right?.valueObjectTitle ?? ""} ${right?.parameterTitle ?? ""}`;
      return leftLabel.localeCompare(rightLabel, input.locale);
    });
}

export async function GET(request: Request) {
  const context = await authenticatedContext();
  if (!context.ok) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        errorCode: context.errorCode,
        errorMessage: context.errorMessage,
      },
      { status: context.status },
    );
  }

  const url = new URL(request.url);
  const locale = text(url.searchParams.get("locale")) || "en";
  const parameterCode = text(url.searchParams.get("parameterCode")) || null;

  try {
    const options = await systemSnapshotOptions({
      locale,
      parameterCode,
    });

    return NextResponse.json({
      ok: true,
      endpoint: ENDPOINT,
      readStatus: "ready",
      options,
      count: options.length,
      ownership: {
        appUserId: context.appUserId,
        actorId: context.actorId,
      },
      sideEffects: {
        dbWritesExecuted: false,
        sqlExecuted: false,
        openAiCallExecuted: false,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        readStatus: "error",
        errorCode: "SNAPSHOT_CAPTURE_OPTIONS_FAILED",
        errorMessage:
          error instanceof Error ? error.message : "Snapshot options failed.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const context = await authenticatedContext();
  if (!context.ok) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        errorCode: context.errorCode,
        errorMessage: context.errorMessage,
      },
      { status: context.status },
    );
  }

  let body: JsonRecord = {};
  try {
    body = record(await request.json());
  } catch {
    body = {};
  }

  const assignmentId = text(body.assignmentId);
  const unit = text(body.unit).toLowerCase();
  const sourceText = text(body.sourceText);
  const clientRequestId = text(body.clientRequestId);
  const effectiveAtInput = text(body.effectiveAt);
  const value =
    typeof body.value === "number" && Number.isFinite(body.value)
      ? body.value
      : Number.NaN;

  if (
    !UUID_RE.test(assignmentId) ||
    !UUID_RE.test(clientRequestId) ||
    !unit ||
    !Number.isFinite(value)
  ) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        errorCode: "SNAPSHOT_CAPTURE_INPUT_INVALID",
        errorMessage:
          "assignmentId, numeric value, unit and clientRequestId are required.",
      },
      { status: 400 },
    );
  }

  const effectiveDate = new Date(effectiveAtInput);
  if (
    !effectiveAtInput ||
    Number.isNaN(effectiveDate.getTime()) ||
    effectiveDate.getTime() > Date.now() + 5 * 60 * 1000
  ) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        errorCode: "SNAPSHOT_CAPTURE_EFFECTIVE_AT_INVALID",
        errorMessage:
          "effectiveAt must be a valid timestamp not more than five minutes in the future.",
      },
      { status: 400 },
    );
  }

  try {
    const { data: assignmentData, error: assignmentError } = await supabase
      .from("value_object_parameter_assignments")
      .select(
        "id,value_object_id,parameter_definition_id,scope_code,assignment_scope_code,owner_user_id,owner_actor_id,status",
      )
      .eq("id", assignmentId)
      .eq("scope_code", "system")
      .eq("assignment_scope_code", "system")
      .eq("status", "active")
      .is("owner_user_id", null)
      .is("owner_actor_id", null)
      .maybeSingle();

    if (assignmentError) {
      throw new Error(
        `SNAPSHOT_CAPTURE_ASSIGNMENT_READ_FAILED:${assignmentError.message}`,
      );
    }

    const assignment = assignmentData as AssignmentRow | null;
    if (!assignment) {
      throw new Error("SNAPSHOT_CAPTURE_ACTIVE_SYSTEM_ASSIGNMENT_REQUIRED");
    }

    const [definitionResult, valueObjectResult] = await Promise.all([
      supabase
        .from("value_object_parameter_definitions")
        .select(
          "id,parameter_code,title,description,dimension_code,value_type_code,canonical_unit_code,allowed_unit_codes,aggregation_method_code,default_window_code,allow_negative,scope_code,status",
        )
        .eq("id", assignment.parameter_definition_id)
        .eq("scope_code", "system")
        .eq("status", "active")
        .maybeSingle(),
      supabase
        .from("value_objects")
        .select(
          "id,canonical_key,title,metadata_json,scope_code,origin_type_code,ontology_node_role_code,root_value_object_id,status",
        )
        .eq("id", assignment.value_object_id)
        .eq("scope_code", "global")
        .eq("origin_type_code", "system_model")
        .eq("ontology_node_role_code", "leaf")
        .eq("root_value_object_id", STATES_AND_NEEDS_ROOT_ID)
        .eq("status", "active")
        .maybeSingle(),
    ]);

    if (definitionResult.error) {
      throw new Error(
        `SNAPSHOT_CAPTURE_PARAMETER_READ_FAILED:${definitionResult.error.message}`,
      );
    }
    if (valueObjectResult.error) {
      throw new Error(
        `SNAPSHOT_CAPTURE_VALUE_OBJECT_READ_FAILED:${valueObjectResult.error.message}`,
      );
    }

    const definition = definitionResult.data as DefinitionRow | null;
    const valueObject = valueObjectResult.data as ValueObjectRow | null;

    if (!definition || !valueObject) {
      throw new Error("SNAPSHOT_CAPTURE_ASSIGNMENT_TARGET_INVALID");
    }

    if (
      definition.value_type_code !== "numeric" ||
      !SUPPORTED_FACT_MEASURE_TYPES.has(definition.parameter_code)
    ) {
      throw new Error("SNAPSHOT_CAPTURE_PARAMETER_NOT_SUPPORTED_V1");
    }

    const allowedUnits = stringArray(definition.allowed_unit_codes);
    if (!allowedUnits.includes(unit)) {
      throw new Error("SNAPSHOT_CAPTURE_UNIT_NOT_ALLOWED");
    }

    if (!definition.allow_negative && value < 0) {
      throw new Error("SNAPSHOT_CAPTURE_NEGATIVE_VALUE_NOT_ALLOWED");
    }

    const effectiveAt = effectiveDate.toISOString();
    const idempotencyKey =
      `${SNAPSHOT_CONTRACT}:${context.appUserId}:${context.actorId}:${clientRequestId}`;
    const requestPayload = {
      contract: SNAPSHOT_CONTRACT,
      assignmentId: assignment.id,
      valueObjectId: valueObject.id,
      parameterDefinitionId: definition.id,
      value,
      unit,
      effectiveAt,
      sourceText,
    };
    const requestHash = sha256(requestPayload);

    const { data: existingData, error: existingError } = await supabase
      .from("activity_object_facts")
      .select(
        "id,metadata,value_numeric,unit,effective_at,previous_snapshot_fact_id,created_at",
      )
      .eq("user_id", context.appUserId)
      .eq("acting_as_actor_id", context.actorId)
      .eq("fact_role_code", "snapshot")
      .contains("metadata", {
        snapshotCaptureV1: {
          idempotencyKey,
        },
      })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      throw new Error(
        `SNAPSHOT_CAPTURE_IDEMPOTENCY_READ_FAILED:${existingError.message}`,
      );
    }

    if (existingData) {
      const metadata = record(existingData.metadata);
      const snapshotMeta = record(metadata.snapshotCaptureV1);

      if (text(snapshotMeta.requestHash) !== requestHash) {
        throw new Error("SNAPSHOT_CAPTURE_IDEMPOTENCY_CONFLICT");
      }

      return NextResponse.json({
        ok: true,
        endpoint: ENDPOINT,
        writeStatus: "idempotent_replay",
        factId: text(existingData.id),
        valueObjectId: valueObject.id,
        parameterDefinitionId: definition.id,
        value,
        unit,
        effectiveAt,
        sideEffects: {
          dbWritesExecuted: false,
          sqlExecuted: false,
          openAiCallExecuted: false,
        },
      });
    }

    const { data: previousData, error: previousError } = await supabase
      .from("activity_object_facts")
      .select("id,effective_at")
      .eq("user_id", context.appUserId)
      .eq("acting_as_actor_id", context.actorId)
      .eq("fact_role_code", "snapshot")
      .eq("value_object_id", valueObject.id)
      .eq("parameter_definition_id", definition.id)
      .lte("effective_at", effectiveAt)
      .order("effective_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (previousError) {
      throw new Error(
        `SNAPSHOT_CAPTURE_PREVIOUS_READ_FAILED:${previousError.message}`,
      );
    }

    const previousSnapshotFactId = text(previousData?.id) || null;
    const semanticKey = semanticObjectKey(valueObject.canonical_key);
    if (!semanticKey) {
      throw new Error("SNAPSHOT_CAPTURE_SEMANTIC_KEY_INVALID");
    }

    const capturedAt = new Date().toISOString();
    const metadata = {
      contract: SNAPSHOT_CONTRACT,
      valueOriginCode: "user_explicit",
      sourceReliabilityCode: "user_reported",
      systemAssignmentResolution:
        "active_ownerless_system_parameter_assignment_v1",
      snapshotCaptureV1: {
        contract: SNAPSHOT_CONTRACT,
        idempotencyKey,
        requestHash,
        clientRequestId,
        capturedAt,
        sourceText: sourceText || null,
        assignmentId: assignment.id,
        parameterDefinitionId: definition.id,
        parameterCode: definition.parameter_code,
        targetValueObjectId: valueObject.id,
        targetCanonicalKey: valueObject.canonical_key,
      },
    };

    const { data: insertedData, error: insertError } = await supabase
      .from("activity_object_facts")
      .insert({
        activity_event_id: null,
        measure_id: null,
        user_id: context.appUserId,
        performed_by_actor_id: context.actorId,
        acting_as_actor_id: context.actorId,
        acting_for_actor_id: null,
        value_object_id: valueObject.id,
        semantic_object_key: semanticKey,
        semantic_object_label: valueObject.title,
        measure_type: definition.parameter_code,
        value_numeric: value,
        value_text: null,
        value_boolean: null,
        unit,
        period_start: effectiveAt,
        period_end: effectiveAt,
        fact_status: "confirmed",
        confidence: 1,
        source_type: "user_text",
        is_chronological_primary: false,
        is_exposure_fact: false,
        is_user_confirmed: true,
        metadata,
        semantic_match_confidence: 1,
        semantic_match_method_code: "user_confirmed",
        parameter_definition_id: definition.id,
        parameter_assignment_id: assignment.id,
        fact_role_code: "snapshot",
        effective_at: effectiveAt,
        valid_from: null,
        valid_to: null,
        snapshot_window_code: "point_in_time",
        calculation_rule_code: null,
        calculation_rule_version: null,
        previous_snapshot_fact_id: previousSnapshotFactId,
      })
      .select(
        "id,effective_at,previous_snapshot_fact_id,created_at",
      )
      .limit(1)
      .single();

    if (insertError) {
      throw new Error(
        `SNAPSHOT_CAPTURE_INSERT_FAILED:${insertError.message}`,
      );
    }

    return NextResponse.json({
      ok: true,
      endpoint: ENDPOINT,
      writeStatus: "materialized",
      contract: SNAPSHOT_CONTRACT,
      factId: text(insertedData.id),
      previousSnapshotFactId:
        text(insertedData.previous_snapshot_fact_id) || null,
      valueObjectId: valueObject.id,
      valueObjectTitle: localizedValueObjectTitle(valueObject, "en"),
      parameterDefinitionId: definition.id,
      parameterCode: definition.parameter_code,
      value,
      unit,
      effectiveAt: text(insertedData.effective_at) || effectiveAt,
      sideEffects: {
        dbWritesExecuted: true,
        sqlExecuted: false,
        openAiCallExecuted: false,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        writeStatus: "blocked",
        errorCode: "SNAPSHOT_CAPTURE_FAILED",
        errorMessage:
          error instanceof Error ? error.message : "Snapshot capture failed.",
        sideEffects: {
          sqlExecuted: false,
          openAiCallExecuted: false,
        },
      },
      { status: 409 },
    );
  }
}

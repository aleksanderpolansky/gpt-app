import { NextResponse } from "next/server";

import { supabase } from "../../../../../lib/supabase";
import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "../../../../lib/admin/require-platform-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER = "admin-activity-parameter-definitions-v1" as const;
const SOURCE_VERSION = "admin-parameter-catalog-v1" as const;

const DIMENSION_CODES = new Set([
  "time",
  "distance",
  "count",
  "volume",
  "mass",
  "energy",
  "money",
  "rate",
  "score",
  "temperature",
  "text",
  "boolean",
  "timestamp",
  "pressure",
  "ratio",
  "sound_level",
  "illuminance",
]);
const VALUE_TYPE_CODES = new Set(["numeric", "text", "boolean", "timestamp"]);
const AGGREGATION_CODES = new Set([
  "sum",
  "average",
  "minimum",
  "maximum",
  "latest",
  "count",
  "duration",
  "rate",
  "none",
]);
const WINDOW_CODES = new Set([
  "event",
  "hour",
  "day",
  "week",
  "month",
  "rolling_7_days",
  "rolling_30_days",
]);
const STATUS_CODES = new Set(["active", "retired"]);
const TECHNICAL_CODE_RE = /^[a-z][a-z0-9_]{1,79}$/;
const UNIT_CODE_RE = /^[a-z][a-z0-9_]{0,79}$/;

const SELECT_COLUMNS =
  "id,parameter_series_id,version,scope_code,parameter_code,title,description,dimension_code,value_type_code,canonical_unit_code,allowed_unit_codes,aggregation_method_code,default_window_code,allow_negative,validation_json,source_version,status,valid_from,valid_to,metadata_json,created_at,updated_at" as const;

type DefinitionRow = {
  id: string;
  parameter_series_id: string;
  version: number;
  scope_code: string;
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
  validation_json: unknown;
  source_version: string | null;
  status: string;
  valid_from: string;
  valid_to: string | null;
  metadata_json: unknown;
  created_at: string;
  updated_at: string;
};

type SemanticInput = {
  title: string;
  description: string | null;
  dimensionCode: string;
  valueTypeCode: string;
  canonicalUnitCode: string;
  allowedUnitCodes: string[];
  aggregationMethodCode: string;
  defaultWindowCode: string;
  allowNegative: boolean;
};

type Usage = {
  valueObjectAssignmentCount: number;
  activityTemplateUsageCount: number;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableDescription(value: unknown): string | null {
  const text = asTrimmedString(value);
  return text.length > 0 ? text : null;
}

function normalizeUnitCodes(value: unknown, canonicalUnitCode: string): string[] {
  const candidates = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\s,;]+/u)
      : [];
  const normalized = new Set<string>();

  for (const candidate of candidates) {
    const code = asTrimmedString(candidate).toLowerCase();
    if (!code) continue;
    if (!UNIT_CODE_RE.test(code)) {
      throw new Error(`Invalid unit code: ${code}`);
    }
    normalized.add(code);
  }

  normalized.add(canonicalUnitCode);
  return [...normalized];
}

function readSemanticInput(body: Record<string, unknown>): SemanticInput {
  const title = asTrimmedString(body.title);
  const description = asNullableDescription(body.description);
  const dimensionCode = asTrimmedString(body.dimensionCode).toLowerCase();
  const valueTypeCode = asTrimmedString(body.valueTypeCode).toLowerCase();
  const canonicalUnitCode = asTrimmedString(body.canonicalUnitCode).toLowerCase();
  const aggregationMethodCode = asTrimmedString(body.aggregationMethodCode).toLowerCase();
  const defaultWindowCode = asTrimmedString(body.defaultWindowCode).toLowerCase();
  const allowNegative = body.allowNegative === true;

  if (title.length < 1 || title.length > 200) {
    throw new Error("Parameter title must contain 1-200 characters.");
  }
  if (description && description.length > 4000) {
    throw new Error("Parameter description is too long.");
  }
  if (!DIMENSION_CODES.has(dimensionCode)) {
    throw new Error(`Unsupported dimension: ${dimensionCode}`);
  }
  if (!VALUE_TYPE_CODES.has(valueTypeCode)) {
    throw new Error(`Unsupported value type: ${valueTypeCode}`);
  }
  if (!UNIT_CODE_RE.test(canonicalUnitCode)) {
    throw new Error("Canonical unit must be a lowercase ASCII technical code.");
  }
  if (!AGGREGATION_CODES.has(aggregationMethodCode)) {
    throw new Error(`Unsupported aggregation: ${aggregationMethodCode}`);
  }
  if (!WINDOW_CODES.has(defaultWindowCode)) {
    throw new Error(`Unsupported window: ${defaultWindowCode}`);
  }

  return {
    title,
    description,
    dimensionCode,
    valueTypeCode,
    canonicalUnitCode,
    allowedUnitCodes: normalizeUnitCodes(body.allowedUnitCodes, canonicalUnitCode),
    aggregationMethodCode,
    defaultWindowCode,
    allowNegative,
  };
}

function readParameterCode(body: Record<string, unknown>): string {
  const parameterCode = asTrimmedString(body.parameterCode).toLowerCase();
  if (!TECHNICAL_CODE_RE.test(parameterCode)) {
    throw new Error("Technical code must be 2-80 characters: lowercase ASCII letters, digits and underscores, starting with a letter.");
  }
  return parameterCode;
}

async function systemParameterCodeExists(parameterCode: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("value_object_parameter_definitions")
    .select("id")
    .eq("scope_code", "system")
    .eq("parameter_code", parameterCode)
    .limit(1);
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

function asAllowedUnitCodes(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

async function readUsage(ids: readonly string[]): Promise<Map<string, Usage>> {
  const result = new Map<string, Usage>();
  for (const id of ids) {
    result.set(id, { valueObjectAssignmentCount: 0, activityTemplateUsageCount: 0 });
  }
  if (ids.length === 0) return result;

  const [assignmentResult, templateResult] = await Promise.all([
    supabase
      .from("value_object_parameter_assignments")
      .select("parameter_definition_id")
      .in("parameter_definition_id", [...ids]),
    supabase
      .from("activity_template_profile_parameters_v2")
      .select("parameter_definition_id")
      .in("parameter_definition_id", [...ids]),
  ]);

  if (assignmentResult.error) throw new Error(assignmentResult.error.message);
  if (templateResult.error) throw new Error(templateResult.error.message);

  for (const row of (assignmentResult.data ?? []) as Array<{ parameter_definition_id: string }>) {
    const usage = result.get(row.parameter_definition_id);
    if (usage) usage.valueObjectAssignmentCount += 1;
  }
  for (const row of (templateResult.data ?? []) as Array<{ parameter_definition_id: string }>) {
    const usage = result.get(row.parameter_definition_id);
    if (usage) usage.activityTemplateUsageCount += 1;
  }

  return result;
}

function mapDefinition(row: DefinitionRow, usage: Usage) {
  const usageCount = usage.valueObjectAssignmentCount + usage.activityTemplateUsageCount;
  return {
    id: row.id,
    parameterSeriesId: row.parameter_series_id,
    version: row.version,
    parameterCode: row.parameter_code,
    title: row.title,
    description: row.description,
    dimensionCode: row.dimension_code,
    valueTypeCode: row.value_type_code,
    canonicalUnitCode: row.canonical_unit_code,
    allowedUnitCodes: asAllowedUnitCodes(row.allowed_unit_codes),
    aggregationMethodCode: row.aggregation_method_code,
    defaultWindowCode: row.default_window_code,
    allowNegative: row.allow_negative,
    sourceVersion: row.source_version,
    status: row.status,
    validFrom: row.valid_from,
    validTo: row.valid_to,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    usageCount,
    valueObjectAssignmentCount: usage.valueObjectAssignmentCount,
    activityTemplateUsageCount: usage.activityTemplateUsageCount,
    semanticLocked: usageCount > 0,
  };
}

function semanticChanged(row: DefinitionRow, input: SemanticInput): boolean {
  const oldUnits = asAllowedUnitCodes(row.allowed_unit_codes).slice().sort();
  const newUnits = input.allowedUnitCodes.slice().sort();
  return (
    row.title !== input.title ||
    row.description !== input.description ||
    row.dimension_code !== input.dimensionCode ||
    row.value_type_code !== input.valueTypeCode ||
    row.canonical_unit_code !== input.canonicalUnitCode ||
    JSON.stringify(oldUnits) !== JSON.stringify(newUnits) ||
    row.aggregation_method_code !== input.aggregationMethodCode ||
    row.default_window_code !== input.defaultWindowCode ||
    row.allow_negative !== input.allowNegative
  );
}

async function readSystemDefinition(id: string): Promise<DefinitionRow | null> {
  const { data, error } = await supabase
    .from("value_object_parameter_definitions")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .eq("scope_code", "system")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as DefinitionRow | null) ?? null;
}

export async function GET() {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return platformAdminErrorResponse(guard, ROUTE_MARKER);

  try {
    const { data, error } = await supabase
      .from("value_object_parameter_definitions")
      .select(SELECT_COLUMNS)
      .eq("scope_code", "system")
      .neq("parameter_code", "process_count")
      .order("updated_at", { ascending: false })
      .limit(2000);

    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as DefinitionRow[];
    const usage = await readUsage(rows.map((row) => row.id));
    const definitions = rows
      .map((row) => mapDefinition(row, usage.get(row.id) ?? { valueObjectAssignmentCount: 0, activityTemplateUsageCount: 0 }))
      .sort((left, right) => {
        if (left.status !== right.status) return left.status === "active" ? -1 : 1;
        return left.dimensionCode.localeCompare(right.dimensionCode) || left.title.localeCompare(right.title);
      });

    return NextResponse.json(
      { ok: true, routeMarker: ROUTE_MARKER, definitions },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, routeMarker: ROUTE_MARKER, error: error instanceof Error ? error.message : "Parameter catalog load failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return platformAdminErrorResponse(guard, ROUTE_MARKER);

  try {
    const body = asObject(await request.json());
    const input = readSemanticInput(body);
    const parameterCode = readParameterCode(body);
    if (await systemParameterCodeExists(parameterCode)) {
      return NextResponse.json(
        {
          ok: false,
          routeMarker: ROUTE_MARKER,
          errorCode: "PARAMETER_CODE_ALREADY_EXISTS",
          error: "This system parameter technical code already exists. Reuse or reactivate the existing parameter instead of creating a duplicate.",
        },
        { status: 409 },
      );
    }
    const { data, error } = await supabase
      .from("value_object_parameter_definitions")
      .insert({
        scope_code: "system",
        parameter_code: parameterCode,
        owner_user_id: null,
        owner_actor_id: null,
        created_by_actor_id: null,
        title: input.title,
        description: input.description,
        dimension_code: input.dimensionCode,
        value_type_code: input.valueTypeCode,
        canonical_unit_code: input.canonicalUnitCode,
        allowed_unit_codes: input.allowedUnitCodes,
        aggregation_method_code: input.aggregationMethodCode,
        default_window_code: input.defaultWindowCode,
        allow_negative: input.allowNegative,
        validation_json: {},
        source_version: SOURCE_VERSION,
        status: "active",
        metadata_json: {
          authoring_surface: ROUTE_MARKER,
          created_by_app_user_id: guard.appUser.id,
        },
      })
      .select(SELECT_COLUMNS)
      .single();

    if (error) throw new Error(error.message);
    const row = data as unknown as DefinitionRow;
    return NextResponse.json(
      { ok: true, routeMarker: ROUTE_MARKER, definition: mapDefinition(row, { valueObjectAssignmentCount: 0, activityTemplateUsageCount: 0 }) },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, routeMarker: ROUTE_MARKER, error: error instanceof Error ? error.message : "Parameter creation failed" },
      { status: 400 },
    );
  }
}

export async function PUT(request: Request) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return platformAdminErrorResponse(guard, ROUTE_MARKER);

  try {
    const body = asObject(await request.json());
    const id = asTrimmedString(body.id);
    if (!id) throw new Error("Parameter id is required.");

    const current = await readSystemDefinition(id);
    if (!current) {
      return NextResponse.json(
        { ok: false, routeMarker: ROUTE_MARKER, error: "System parameter not found." },
        { status: 404 },
      );
    }

    const requestedCode = asTrimmedString(body.parameterCode);
    if (requestedCode && requestedCode !== current.parameter_code) {
      return NextResponse.json(
        { ok: false, routeMarker: ROUTE_MARKER, error: "parameter_code is immutable after creation." },
        { status: 409 },
      );
    }

    const nextStatus = body.status === undefined ? current.status : asTrimmedString(body.status);
    if (!STATUS_CODES.has(nextStatus)) {
      throw new Error(`Unsupported status: ${nextStatus}`);
    }

    const hasSemanticPayload = [
      "title",
      "description",
      "dimensionCode",
      "valueTypeCode",
      "canonicalUnitCode",
      "allowedUnitCodes",
      "aggregationMethodCode",
      "defaultWindowCode",
      "allowNegative",
    ].some((key) => Object.prototype.hasOwnProperty.call(body, key));

    const update: Record<string, unknown> = {
      status: nextStatus,
      updated_at: new Date().toISOString(),
      metadata_json: {
        ...asObject(current.metadata_json),
        last_admin_app_user_id: guard.appUser.id,
        last_admin_surface: ROUTE_MARKER,
      },
    };

    if (hasSemanticPayload) {
      const input = readSemanticInput(body);
      const usageMap = await readUsage([id]);
      const usage = usageMap.get(id) ?? { valueObjectAssignmentCount: 0, activityTemplateUsageCount: 0 };
      const usageCount = usage.valueObjectAssignmentCount + usage.activityTemplateUsageCount;

      if (usageCount > 0 && semanticChanged(current, input)) {
        return NextResponse.json(
          {
            ok: false,
            routeMarker: ROUTE_MARKER,
            errorCode: "PARAMETER_SEMANTICS_LOCKED_AFTER_USE",
            error: "This parameter is already used. Its semantic fields are locked; create a new parameter for a different meaning. Status can still be changed.",
            usageCount,
          },
          { status: 409 },
        );
      }

      Object.assign(update, {
        title: input.title,
        description: input.description,
        dimension_code: input.dimensionCode,
        value_type_code: input.valueTypeCode,
        canonical_unit_code: input.canonicalUnitCode,
        allowed_unit_codes: input.allowedUnitCodes,
        aggregation_method_code: input.aggregationMethodCode,
        default_window_code: input.defaultWindowCode,
        allow_negative: input.allowNegative,
      });
    }

    const { data, error } = await supabase
      .from("value_object_parameter_definitions")
      .update(update)
      .eq("id", id)
      .eq("scope_code", "system")
      .select(SELECT_COLUMNS)
      .single();
    if (error) throw new Error(error.message);

    const row = data as unknown as DefinitionRow;
    const usageMap = await readUsage([id]);
    return NextResponse.json({
      ok: true,
      routeMarker: ROUTE_MARKER,
      definition: mapDefinition(row, usageMap.get(id) ?? { valueObjectAssignmentCount: 0, activityTemplateUsageCount: 0 }),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, routeMarker: ROUTE_MARKER, error: error instanceof Error ? error.message : "Parameter update failed" },
      { status: 400 },
    );
  }
}

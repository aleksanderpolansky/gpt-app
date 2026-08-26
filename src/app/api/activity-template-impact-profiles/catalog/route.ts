import { NextResponse } from "next/server";

import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SELECT_COLUMNS =
  "id,scope_code,parameter_code,title,description,dimension_code,value_type_code,canonical_unit_code,allowed_unit_codes,aggregation_method_code,default_window_code" as const;

type DefinitionRow = {
  id: string;
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
};

function mapDefinition(row: DefinitionRow) {
  return {
    id: row.id,
    scopeCode: row.scope_code,
    parameterCode: row.parameter_code,
    title: row.title,
    description: row.description,
    dimensionCode: row.dimension_code,
    valueTypeCode: row.value_type_code,
    canonicalUnitCode: row.canonical_unit_code,
    allowedUnitCodes: Array.isArray(row.allowed_unit_codes)
      ? row.allowed_unit_codes.filter(
          (value): value is string => typeof value === "string",
        )
      : [],
    aggregationMethodCode: row.aggregation_method_code,
    defaultWindowCode: row.default_window_code,
  };
}

export async function GET() {
  const { appUser, personActor, errorResponse } =
    await getActivityUserContext();

  if (errorResponse) {
    return errorResponse;
  }
  if (!appUser || !personActor) {
    return NextResponse.json(
      { ok: false, error: "Active actor context not found" },
      { status: 500 },
    );
  }

  const [systemResult, actorResult] = await Promise.all([
    supabase
      .from("value_object_parameter_definitions")
      .select(SELECT_COLUMNS)
      .eq("scope_code", "system")
      .eq("status", "active")
      .neq("parameter_code", "process_count")
      .order("dimension_code", { ascending: true })
      .order("title", { ascending: true }),
    supabase
      .from("value_object_parameter_definitions")
      .select(SELECT_COLUMNS)
      .eq("scope_code", "actor")
      .eq("owner_user_id", appUser.id)
      .eq("owner_actor_id", personActor.id)
      .eq("status", "active")
      .neq("parameter_code", "process_count")
      .order("dimension_code", { ascending: true })
      .order("title", { ascending: true }),
  ]);

  if (systemResult.error) {
    return NextResponse.json(
      { ok: false, error: systemResult.error.message },
      { status: 500 },
    );
  }
  if (actorResult.error) {
    return NextResponse.json(
      { ok: false, error: actorResult.error.message },
      { status: 500 },
    );
  }

  const parameters = [
    ...((systemResult.data ?? []) as unknown as DefinitionRow[]),
    ...((actorResult.data ?? []) as unknown as DefinitionRow[]),
  ]
    .map(mapDefinition)
    .sort(
      (left, right) =>
        left.dimensionCode.localeCompare(right.dimensionCode) ||
        left.title.localeCompare(right.title),
    );

  return NextResponse.json(
    {
      ok: true,
      contract: "ARCTOR_ACTIVITY_PARAMETER_ROUTING_V2",
      parameters,
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
}

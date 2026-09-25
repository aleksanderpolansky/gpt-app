import { NextResponse } from "next/server";

import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../lib/supabase";
import { resolveLocalizedContentField } from "@/lib/localization/contentLocalization";
import {
  localizeGlobalSystemValueObject,
  normalizeGlobalSystemValueObjectLocale,
} from "@/lib/reality-core/global-system-value-object-localization";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Row = Record<string, unknown>;

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asRecord(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Row)
    : {};
}

export async function GET(request: Request) {
  const { appUser, personActor, errorResponse } = await getActivityUserContext();
  if (errorResponse) return errorResponse;

  if (!appUser || !personActor) {
    return NextResponse.json(
      { ok: false, error: "Dashboard actor context not found" },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const valueObjectId = url.searchParams.get("valueObjectId")?.trim() ?? "";
  const locale = normalizeGlobalSystemValueObjectLocale(
    url.searchParams.get("locale"),
  );

  if (!UUID_RE.test(valueObjectId)) {
    return NextResponse.json(
      { ok: false, error: "A valid observation object id is required" },
      { status: 400 },
    );
  }

  const { data: valueObjectData, error: valueObjectError } = await supabase
    .from("value_objects")
    .select(
      "id,title,canonical_key,status,scope_code,origin_type_code,ontology_node_role_code,node_role_code,owner_user_id,owner_actor_id,metadata_json",
    )
    .eq("id", valueObjectId)
    .maybeSingle();

  if (valueObjectError) {
    return NextResponse.json(
      { ok: false, error: valueObjectError.message },
      { status: 500 },
    );
  }

  const valueObject = (valueObjectData as Row | null) ?? null;
  if (!valueObject) {
    return NextResponse.json(
      { ok: false, error: "Observation object not found" },
      { status: 404 },
    );
  }

  const isGlobalLeaf =
    asString(valueObject.scope_code) === "global" &&
    asString(valueObject.status) === "active" &&
    asString(valueObject.ontology_node_role_code) === "leaf";

  const isOwnedLeaf =
    asString(valueObject.owner_user_id) === appUser.id &&
    asString(valueObject.owner_actor_id) === personActor.id &&
    ["active", "draft"].includes(asString(valueObject.status) ?? "") &&
    (asString(valueObject.ontology_node_role_code) === "leaf" ||
      asString(valueObject.node_role_code) === "activity_leaf");

  if (!isGlobalLeaf && !isOwnedLeaf) {
    return NextResponse.json(
      { ok: false, error: "Observation object is not an accessible leaf" },
      { status: 403 },
    );
  }

  const { data: assignmentData, error: assignmentError } = await supabase
    .from("value_object_parameter_assignments")
    .select(
      "id,parameter_definition_id,status,assignment_scope_code,owner_user_id,owner_actor_id,display_order",
    )
    .eq("value_object_id", valueObjectId)
    .eq("status", "active")
    .order("display_order", { ascending: true });

  if (assignmentError) {
    return NextResponse.json(
      { ok: false, error: assignmentError.message },
      { status: 500 },
    );
  }

  const assignments = (Array.isArray(assignmentData)
    ? assignmentData
    : []
  ).map((row) => row as Row);

  const accessibleAssignments = assignments.filter((assignment) => {
    const scope = asString(assignment.assignment_scope_code);
    if (isGlobalLeaf) return scope === "system";

    return (
      scope === "actor" &&
      asString(assignment.owner_user_id) === appUser.id &&
      asString(assignment.owner_actor_id) === personActor.id
    );
  });

  const parameterDefinitionIds = Array.from(
    new Set(
      accessibleAssignments
        .map((row) => asString(row.parameter_definition_id))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const definitions: Row[] = [];
  for (let index = 0; index < parameterDefinitionIds.length; index += 200) {
    const ids = parameterDefinitionIds.slice(index, index + 200);
    const { data, error } = await supabase
      .from("value_object_parameter_definitions")
      .select(
        "id,parameter_code,title,description,dimension_code,value_type_code,canonical_unit_code,aggregation_method_code,default_window_code,status",
      )
      .in("id", ids)
      .eq("status", "active")
      .eq("value_type_code", "numeric");

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    definitions.push(
      ...(Array.isArray(data) ? data.map((row) => row as Row) : []),
    );
  }

  const assignmentByDefinitionId = new Map(
    accessibleAssignments
      .map((assignment) => {
        const definitionId = asString(assignment.parameter_definition_id);
        return definitionId ? ([definitionId, assignment] as const) : null;
      })
      .filter(
        (entry): entry is readonly [string, Row] => entry !== null,
      ),
  );

  const parameters = definitions
    .map((definition) => {
      const id = asString(definition.id);
      const parameterCode = asString(definition.parameter_code);
      const title = asString(definition.title);
      const canonicalUnitCode = asString(definition.canonical_unit_code);
      if (!id || !parameterCode || !title || !canonicalUnitCode) return null;

      const assignment = assignmentByDefinitionId.get(id);

      return {
        id,
        parameterCode,
        title,
        description: asString(definition.description),
        dimensionCode: asString(definition.dimension_code),
        canonicalUnitCode,
        aggregationMethodCode: asString(definition.aggregation_method_code),
        defaultWindowCode: asString(definition.default_window_code),
        assignmentId: asString(assignment?.id),
        displayOrder: Number(assignment?.display_order ?? 1000),
      };
    })
    .filter(
      (item): item is NonNullable<typeof item> => item !== null,
    )
    .sort(
      (left, right) =>
        left.displayOrder - right.displayOrder ||
        left.title.localeCompare(right.title, undefined, {
          sensitivity: "base",
          numeric: true,
        }),
    );

  const fallbackTitle = asString(valueObject.title) ?? valueObjectId;
  const localizedTitle = isGlobalLeaf
    ? localizeGlobalSystemValueObject(
        {
          canonical_key: asString(valueObject.canonical_key),
          title: fallbackTitle,
        },
        locale,
      ).title
    : resolveLocalizedContentField({
        metadata: asRecord(valueObject.metadata_json),
        locale,
        fieldCode: "title",
        fallback: fallbackTitle,
      }) ?? fallbackTitle;

  return NextResponse.json(
    {
      ok: true,
      valueObject: {
        id: valueObjectId,
        title: localizedTitle,
        canonicalKey: asString(valueObject.canonical_key),
        scopeCode: asString(valueObject.scope_code),
      },
      parameters,
      count: parameters.length,
      sideEffects: {
        dbReadExecuted: true,
        dbWriteExecuted: false,
        rowsActuallyWritten: 0,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

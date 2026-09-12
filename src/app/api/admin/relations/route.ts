import { NextResponse } from "next/server";

import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import {
  localizeGlobalSystemValueObject,
  normalizeGlobalSystemValueObjectLocale,
} from "@/lib/reality-core/global-system-value-object-localization";
import type {
  ValueObjectRelationDirectionality,
  ValueObjectRelationTypeDto,
} from "@/types/value-object-semantic-relation";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER = "admin-system-relations-list-v1" as const;
const PROCESSOR_NAME = "reality_curator_relation_constructor" as const;

type JsonRecord = Record<string, unknown>;

type RelationRow = {
  id: string;
  relation_type_code: string;
  source_value_object_id: string;
  target_value_object_id: string;
  status: string;
  provenance_code: string;
  created_at: string;
  updated_at: string;
};

type ValueObjectRow = {
  id: string;
  title: string;
  description: string | null;
  canonical_key: string | null;
  metadata_json: unknown;
  facet_code: string | null;
  node_role_code: string | null;
  status: string;
};

type RelationTypeRow = {
  relation_type_code: string;
  directionality_code: string;
  from_scope_code: string;
  to_scope_code: string;
  title_key: string;
  description_key: string;
  reverse_title_key: string;
  reverse_description_key: string;
  allow_self_link: boolean;
  contract_version: number;
  display_order: number;
  status: string;
};

type LogRow = {
  created_at: string;
  metadata_json: unknown;
  output_json: unknown;
};

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function cleanText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isDirectionality(
  value: string,
): value is ValueObjectRelationDirectionality {
  return value === "directed" || value === "symmetric";
}

function toRelationTypeDto(row: RelationTypeRow): ValueObjectRelationTypeDto {
  return {
    relationTypeCode: row.relation_type_code,
    directionalityCode: isDirectionality(row.directionality_code)
      ? row.directionality_code
      : "directed",
    fromScopeCode: row.from_scope_code,
    toScopeCode: row.to_scope_code,
    titleKey: row.title_key,
    descriptionKey: row.description_key,
    reverseTitleKey: row.reverse_title_key,
    reverseDescriptionKey: row.reverse_description_key,
    allowSelfLink: row.allow_self_link,
    contractVersion: row.contract_version,
    displayOrder: row.display_order,
    status: row.status,
  };
}

export async function GET(request: Request) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return platformAdminErrorResponse(guard, ROUTE_MARKER);

  const locale = normalizeGlobalSystemValueObjectLocale(
    new URL(request.url).searchParams.get("locale"),
  );

  const relationsResult = await supabase
    .from("system_value_object_relations")
    .select(
      "id,relation_type_code,source_value_object_id,target_value_object_id,status,provenance_code,created_at,updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(5000);

  if (relationsResult.error) {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        error: relationsResult.error.message,
        errorCode: "SYSTEM_RELATIONS_LIST_READ_FAILED",
      },
      { status: 500 },
    );
  }

  const relations = (relationsResult.data ?? []) as RelationRow[];
  if (!relations.length) {
    return NextResponse.json({
      ok: true,
      routeMarker: ROUTE_MARKER,
      locale,
      count: 0,
      relations: [],
    });
  }

  const valueObjectIds = [
    ...new Set(
      relations.flatMap((relation) => [
        relation.source_value_object_id,
        relation.target_value_object_id,
      ]),
    ),
  ];

  const [objectsResult, relationTypesResult, commentsResult] = await Promise.all([
    supabase
      .from("value_objects")
      .select(
        "id,title,description,canonical_key,metadata_json,facet_code,node_role_code,status",
      )
      .in("id", valueObjectIds),
    supabase
      .from("value_object_relation_types")
      .select(
        "relation_type_code,directionality_code,from_scope_code,to_scope_code,title_key,description_key,reverse_title_key,reverse_description_key,allow_self_link,contract_version,display_order,status",
      )
      .order("display_order", { ascending: true })
      .order("relation_type_code", { ascending: true }),
    supabase
      .from("activity_processing_logs")
      .select("created_at,metadata_json,output_json")
      .eq("processor_name", PROCESSOR_NAME)
      .eq("processing_status", "completed")
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);

  if (objectsResult.error) {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        error: objectsResult.error.message,
        errorCode: "SYSTEM_RELATIONS_OBJECTS_READ_FAILED",
      },
      { status: 500 },
    );
  }
  if (relationTypesResult.error) {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        error: relationTypesResult.error.message,
        errorCode: "SYSTEM_RELATIONS_TYPES_READ_FAILED",
      },
      { status: 500 },
    );
  }
  if (commentsResult.error) {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        error: commentsResult.error.message,
        errorCode: "SYSTEM_RELATIONS_COMMENTS_READ_FAILED",
      },
      { status: 500 },
    );
  }

  const objectsById = new Map(
    ((objectsResult.data ?? []) as ValueObjectRow[]).map((row) => {
      const localized = localizeGlobalSystemValueObject(row, locale);
      return [
        row.id,
        {
          id: row.id,
          title: localized.title,
          description: localized.description,
          facetCode: row.facet_code,
          nodeRoleCode: row.node_role_code,
          status: row.status,
        },
      ] as const;
    }),
  );

  const relationTypesByCode = new Map(
    ((relationTypesResult.data ?? []) as RelationTypeRow[]).map((row) => [
      row.relation_type_code,
      toRelationTypeDto(row),
    ] as const),
  );

  const latestCommentByRelationId = new Map<
    string,
    { comment: string; createdAt: string }
  >();

  for (const row of (commentsResult.data ?? []) as LogRow[]) {
    const output = record(row.output_json);
    const metadata = record(row.metadata_json);
    const relationId = cleanText(output?.relationId);
    const comment = cleanText(metadata?.curatorComment);
    if (
      relationId &&
      comment &&
      !latestCommentByRelationId.has(relationId)
    ) {
      latestCommentByRelationId.set(relationId, {
        comment,
        createdAt: row.created_at,
      });
    }
  }

  const responseRows = relations
    .map((relation) => {
      const source = objectsById.get(relation.source_value_object_id);
      const target = objectsById.get(relation.target_value_object_id);
      const relationType = relationTypesByCode.get(relation.relation_type_code);

      if (!source || !target || !relationType) return null;

      return {
        id: relation.id,
        source,
        target,
        relationType,
        status: relation.status,
        provenanceCode: relation.provenance_code,
        curatorComment:
          latestCommentByRelationId.get(relation.id)?.comment ?? null,
        curatorCommentAt:
          latestCommentByRelationId.get(relation.id)?.createdAt ?? null,
        createdAt: relation.created_at,
        updatedAt: relation.updated_at,
      };
    })
    .filter(Boolean);

  return NextResponse.json({
    ok: true,
    routeMarker: ROUTE_MARKER,
    locale,
    count: responseRows.length,
    relations: responseRows,
  });
}

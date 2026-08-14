import { NextResponse } from "next/server";

import {
  localizeGlobalSystemValueObject,
  normalizeGlobalSystemValueObjectLocale,
} from "@/lib/reality-core/global-system-value-object-localization";
import type { ValueObjectOntologyCardV1 } from "@/types/reality-core/value-object-ontology-runtime-v1";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type OntologyNodeRow = {
  id: string;
  canonical_key: string | null;
  title: string;
  description: string | null;
  facet_code: string | null;
  object_kind_code: string | null;
  ontology_node_role_code: string | null;
  parent_value_object_id: string | null;
  root_value_object_id: string | null;
  hierarchy_relation_code: string | null;
  scope_code: string | null;
  owner_actor_id: string | null;
  status: string;
  visibility_code: string | null;
  privacy_class_code: string | null;
  valid_from: string | null;
  valid_to: string | null;
  definition_version: number | null;
  origin_type_code: string | null;
  created_by_actor_id: string | null;
  created_at: string;
  updated_at: string;
};

type FacetRow = {
  facet_code: string;
  title_key: string;
  description_key: string;
  display_order: number;
  status: string;
  version: number;
};

type KindRow = {
  object_kind_code: string;
  facet_code: string;
  title_key: string;
  description_key: string;
  allowed_node_roles_json: unknown;
  policy_json: unknown;
  status: string;
  version: number;
};

type DefinitionRow = {
  id: string;
  version: number;
  source_context: string | null;
  created_at: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ONTOLOGY_NODE_SELECT = [
  "id",
  "canonical_key",
  "title",
  "description",
  "facet_code",
  "object_kind_code",
  "ontology_node_role_code",
  "parent_value_object_id",
  "root_value_object_id",
  "hierarchy_relation_code",
  "scope_code",
  "owner_actor_id",
  "status",
  "visibility_code",
  "privacy_class_code",
  "valid_from",
  "valid_to",
  "definition_version",
  "origin_type_code",
  "created_by_actor_id",
  "created_at",
  "updated_at",
].join(",");

function isGlobalSystemObject(
  row: OntologyNodeRow | null | undefined,
): row is OntologyNodeRow {
  return Boolean(
    row &&
      row.scope_code === "global" &&
      row.origin_type_code === "system_model" &&
      row.status === "active",
  );
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toCardNode(row: OntologyNodeRow, locale: string) {
  const projected = isGlobalSystemObject(row)
    ? localizeGlobalSystemValueObject(row, locale)
    : row;

  return {
    id: projected.id,
    canonicalKey: projected.canonical_key,
    title: projected.title,
    description: projected.description,
    facetCode: projected.facet_code,
    objectKindCode: projected.object_kind_code,
    nodeRoleCode: projected.ontology_node_role_code,
    parentValueObjectId: projected.parent_value_object_id,
    rootValueObjectId: projected.root_value_object_id,
    hierarchyRelationCode: projected.hierarchy_relation_code,
    scopeCode: projected.scope_code,
    ownerActorId: projected.owner_actor_id,
    statusCode: projected.status,
    visibilityCode: projected.visibility_code,
    privacyClassCode: projected.privacy_class_code,
    validFrom: projected.valid_from,
    validTo: projected.valid_to,
    definitionVersion: projected.definition_version,
    originTypeCode: projected.origin_type_code,
    createdByActorId: projected.created_by_actor_id,
    createdAt: projected.created_at,
    updatedAt: projected.updated_at,
  };
}

async function readGlobalSystemOntologyCard(
  valueObjectId: string,
  locale: string,
): Promise<
  | { handled: false }
  | { handled: true; response: NextResponse }
> {
  const { data: valueObjectData, error: valueObjectError } = await supabase
    .from("value_objects")
    .select(ONTOLOGY_NODE_SELECT)
    .eq("id", valueObjectId)
    .maybeSingle();

  if (valueObjectError) {
    return {
      handled: true,
      response: NextResponse.json(
        {
          ok: false,
          error: valueObjectError.message,
          errorCode: "GLOBAL_SYSTEM_ONTOLOGY_LOOKUP_FAILED",
        },
        { status: 500 },
      ),
    };
  }

  const valueObject = valueObjectData as OntologyNodeRow | null;

  if (!isGlobalSystemObject(valueObject)) {
    return { handled: false };
  }

  if (
    !valueObject.canonical_key ||
    !valueObject.facet_code ||
    !valueObject.object_kind_code ||
    !valueObject.ontology_node_role_code ||
    !valueObject.root_value_object_id ||
    !valueObject.visibility_code ||
    !valueObject.privacy_class_code ||
    !valueObject.definition_version
  ) {
    return {
      handled: true,
      response: NextResponse.json(
        {
          ok: false,
          error: "GLOBAL_SYSTEM_VALUE_OBJECT_NOT_ONTOLOGY_READY",
          errorCode: "GLOBAL_SYSTEM_VALUE_OBJECT_NOT_ONTOLOGY_READY",
        },
        { status: 409 },
      ),
    };
  }

  const parentPromise = valueObject.parent_value_object_id
    ? supabase
        .from("value_objects")
        .select(ONTOLOGY_NODE_SELECT)
        .eq("id", valueObject.parent_value_object_id)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const [parentResult, rootResult, facetResult, kindResult, definitionResult] =
    await Promise.all([
      parentPromise,
      supabase
        .from("value_objects")
        .select(ONTOLOGY_NODE_SELECT)
        .eq("id", valueObject.root_value_object_id)
        .maybeSingle(),
      supabase
        .from("value_object_facet_registry")
        .select(
          "facet_code,title_key,description_key,display_order,status,version",
        )
        .eq("facet_code", valueObject.facet_code)
        .maybeSingle(),
      supabase
        .from("value_object_kind_registry")
        .select(
          "object_kind_code,facet_code,title_key,description_key,allowed_node_roles_json,policy_json,status,version",
        )
        .eq("object_kind_code", valueObject.object_kind_code)
        .maybeSingle(),
      supabase
        .from("value_object_definition_versions")
        .select("id,version,source_context,created_at")
        .eq("value_object_id", valueObject.id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const readError =
    parentResult.error ??
    rootResult.error ??
    facetResult.error ??
    kindResult.error ??
    definitionResult.error;

  if (readError) {
    return {
      handled: true,
      response: NextResponse.json(
        {
          ok: false,
          error: readError.message,
          errorCode: "GLOBAL_SYSTEM_ONTOLOGY_CARD_READ_FAILED",
        },
        { status: 500 },
      ),
    };
  }

  const parent = parentResult.data as OntologyNodeRow | null;
  const root = rootResult.data as OntologyNodeRow | null;
  const facet = facetResult.data as FacetRow | null;
  const kind = kindResult.data as KindRow | null;
  const latestDefinition = definitionResult.data as DefinitionRow | null;

  if (
    !root ||
    !facet ||
    !kind ||
    !isGlobalSystemObject(root) ||
    (parent && !isGlobalSystemObject(parent))
  ) {
    return {
      handled: true,
      response: NextResponse.json(
        {
          ok: false,
          error: "GLOBAL_SYSTEM_ONTOLOGY_CARD_INTEGRITY_FAILED",
          errorCode: "GLOBAL_SYSTEM_ONTOLOGY_CARD_INTEGRITY_FAILED",
        },
        { status: 500 },
      ),
    };
  }

  const card: ValueObjectOntologyCardV1 = {
    contractVersion: "value-object-ontology-card-v1",
    valueObject: toCardNode(valueObject, locale) as ValueObjectOntologyCardV1["valueObject"],
    parent: parent
      ? (toCardNode(parent, locale) as ValueObjectOntologyCardV1["parent"])
      : null,
    root: toCardNode(root, locale) as ValueObjectOntologyCardV1["root"],
    facet: {
      facetCode: facet.facet_code,
      titleKey: facet.title_key,
      descriptionKey: facet.description_key,
      displayOrder: facet.display_order,
      status: facet.status === "inactive" ? "inactive" : "active",
      version: facet.version,
    },
    kind: {
      objectKindCode: kind.object_kind_code,
      facetCode: kind.facet_code,
      titleKey: kind.title_key,
      descriptionKey: kind.description_key,
      allowedNodeRoles: asStringArray(kind.allowed_node_roles_json),
      policy: asRecord(kind.policy_json),
      status: kind.status === "inactive" ? "inactive" : "active",
      version: kind.version,
    },
    latestDefinition: latestDefinition
      ? {
          id: latestDefinition.id,
          version: latestDefinition.version,
          sourceContext: latestDefinition.source_context,
          createdAt: latestDefinition.created_at,
        }
      : null,
    allowedLifecycleActions: [],
  };

  return {
    handled: true,
    response: NextResponse.json(
      {
        ok: true,
        card,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    ),
  };
}

export async function GET(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  const valueObjectId = decodeURIComponent(rawId).trim();

  if (!UUID_PATTERN.test(valueObjectId)) {
    return NextResponse.json(
      { ok: false, error: "Valid Value Object id is required" },
      { status: 400 },
    );
  }

  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  let actorContext: Awaited<ReturnType<typeof resolveActiveActorContext>>;

  try {
    actorContext = await resolveActiveActorContext(session.user.sub);
  } catch (error) {
    if (error instanceof ActorContextError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          errorCode: error.code,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { ok: false, error: "Could not resolve active actor context" },
      { status: 500 },
    );
  }

  const requestedLocale =
    new URL(request.url).searchParams.get("locale") ?? "en";
  const locale = normalizeGlobalSystemValueObjectLocale(requestedLocale);
  const globalRead = await readGlobalSystemOntologyCard(valueObjectId, locale);

  if (globalRead.handled) {
    return globalRead.response;
  }

  const { data, error } = await supabase.rpc(
    "get_value_object_ontology_card_v1",
    {
      p_owner_user_id: actorContext.appUserId,
      p_owner_actor_id: actorContext.actorId,
      p_value_object_id: valueObjectId,
    },
  );

  if (error) {
    const status =
      error.code === "42501"
        ? 403
        : error.code === "P0002"
          ? 404
          : 400;

    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        errorCode: error.code ?? null,
      },
      { status },
    );
  }

  return NextResponse.json({
    ok: true,
    card: data as ValueObjectOntologyCardV1,
  });
}

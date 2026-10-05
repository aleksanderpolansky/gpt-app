import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../lib/actor-context";
import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";
import { materializeActorValueObjectAllLocalizationsV1 } from "@/lib/localization/valueObjectLocalizationMaterialization.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type JsonRecord = Record<string, unknown>;

type Body = {
  parentProjectContextId?: unknown;
  title?: unknown;
  description?: unknown;
  locale?: unknown;
  clientRequestId?: unknown;
};

type ActorContext = {
  appUserId: string;
  actorId: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CLIENT_REQUEST_RE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{7,179}$/;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function uuid(value: unknown) {
  const candidate = text(value);
  return UUID_RE.test(candidate) ? candidate : null;
}

function locale(value: unknown) {
  const candidate = text(value).toLowerCase();
  return ["en", "pl", "ru", "uk", "de", "es", "cs"].includes(candidate)
    ? candidate
    : "en";
}

function genericKindForFacet(facetCode: string) {
  const values: Record<string, string> = {
    ENTITY: "generic_entity",
    PROCESS: "generic_process",
    STATE: "generic_state",
    RELATIONSHIP: "generic_relationship",
    ROLE: "generic_role",
    KNOWLEDGE: "generic_knowledge",
    BEHAVIOR: "generic_behavior",
    CONTEXT: "generic_context",
  };

  return values[facetCode] ?? null;
}

function errorStatus(error: {
  code?: string | null;
}) {
  if (error.code === "42501") return 403;
  if (error.code === "P0002") return 404;
  if (error.code === "23505") return 409;
  if (
    error.code === "22023" ||
    error.code === "23503" ||
    error.code === "23514"
  ) {
    return 400;
  }
  return 500;
}

function cardValueObjectId(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const valueObject = (value as JsonRecord).valueObject;
  if (
    !valueObject ||
    typeof valueObject !== "object" ||
    Array.isArray(valueObject)
  ) {
    return null;
  }

  return uuid((valueObject as JsonRecord).id);
}

async function resolveContext(): Promise<
  | { context: ActorContext; errorResponse: null }
  | { context: null; errorResponse: NextResponse }
> {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return {
      context: null,
      errorResponse: NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 },
      ),
    };
  }

  try {
    const actor = await resolveActiveActorContext(session.user.sub);
    return {
      context: {
        appUserId: actor.appUserId,
        actorId: actor.actorId,
      },
      errorResponse: null,
    };
  } catch (error) {
    if (error instanceof ActorContextError) {
      return {
        context: null,
        errorResponse: NextResponse.json(
          {
            ok: false,
            error: error.message,
            errorCode: error.code,
          },
          { status: error.status },
        ),
      };
    }

    return {
      context: null,
      errorResponse: NextResponse.json(
        { ok: false, error: "Could not resolve active actor context" },
        { status: 500 },
      ),
    };
  }
}

async function userProjectGraph(params: {
  userId: string;
  actorId: string;
}) {
  const { data: projects, error: projectError } = await supabase
    .from("project_contexts")
    .select("id,root_value_object_id")
    .eq("owner_user_id", params.userId)
    .eq("owner_actor_id", params.actorId)
    .neq("status_code", "archived");

  if (projectError) {
    throw new Error(projectError.message);
  }

  const projectRows = (projects ?? []) as Array<{
    id: string;
    root_value_object_id: string;
  }>;
  const projectIds = projectRows.map((row) => row.id);

  if (projectIds.length === 0) {
    return {
      projects: projectRows,
      relations: [] as Array<{
        project_context_id: string;
        parent_value_object_id: string;
        child_value_object_id: string;
      }>,
    };
  }

  const { data: relations, error: relationError } = await supabase
    .from("project_composition_relations")
    .select(
      "project_context_id,parent_value_object_id,child_value_object_id",
    )
    .in("project_context_id", projectIds)
    .eq("relation_type_code", "decomposes_into")
    .eq("status_code", "active");

  if (relationError) {
    throw new Error(relationError.message);
  }

  return {
    projects: projectRows,
    relations: (relations ?? []) as Array<{
      project_context_id: string;
      parent_value_object_id: string;
      child_value_object_id: string;
    }>,
  };
}

function wouldCreateProjectCycle(
  relations: Array<{
    parent_value_object_id: string;
    child_value_object_id: string;
  }>,
  parentRootId: string,
  childRootId: string,
) {
  const byParent = new Map<string, string[]>();

  for (const relation of relations) {
    const children = byParent.get(relation.parent_value_object_id) ?? [];
    children.push(relation.child_value_object_id);
    byParent.set(relation.parent_value_object_id, children);
  }

  const queue = [childRootId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === parentRootId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    queue.push(...(byParent.get(current) ?? []));
  }

  return false;
}

export async function POST(request: Request) {
  const resolved = await resolveContext();
  if (resolved.errorResponse || !resolved.context) {
    return resolved.errorResponse;
  }

  let body: Body;

  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const parentProjectContextId = uuid(body.parentProjectContextId);
  const title = text(body.title).slice(0, 180);
  const description = text(body.description).slice(0, 4000) || title;
  const targetLocale = locale(body.locale);
  const clientRequestId = text(body.clientRequestId);

  if (
    !parentProjectContextId ||
    !title ||
    !CLIENT_REQUEST_RE.test(clientRequestId)
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "parentProjectContextId, title and a valid clientRequestId are required.",
      },
      { status: 400 },
    );
  }

  const { appUserId, actorId } = resolved.context;

  const { data: parentProject, error: parentProjectError } = await supabase
    .from("project_contexts")
    .select(
      "id,title,description,project_mode_code,status_code,timezone,currency_code,root_value_object_id",
    )
    .eq("id", parentProjectContextId)
    .eq("owner_user_id", appUserId)
    .eq("owner_actor_id", actorId)
    .single();

  if (parentProjectError || !parentProject) {
    return NextResponse.json(
      {
        ok: false,
        error: parentProjectError?.message ?? "Parent project not found.",
      },
      { status: 404 },
    );
  }

  if (parentProject.status_code === "archived") {
    return NextResponse.json(
      { ok: false, error: "Archived project cannot accept subprojects." },
      { status: 409 },
    );
  }

  const { data: parentLeaf, error: parentLeafError } = await supabase
    .from("value_objects")
    .select(
      "id,parent_value_object_id,scope_code,ontology_node_role_code,status,owner_user_id,owner_actor_id,visibility_code,visibility",
    )
    .eq("id", parentProject.root_value_object_id)
    .single();

  if (parentLeafError || !parentLeaf) {
    return NextResponse.json(
      {
        ok: false,
        error: parentLeafError?.message ?? "Parent project root leaf not found.",
      },
      { status: 404 },
    );
  }

  const visibility =
    parentLeaf.visibility_code ?? parentLeaf.visibility ?? "private";

  if (
    parentLeaf.scope_code !== "actor" ||
    parentLeaf.ontology_node_role_code !== "leaf" ||
    parentLeaf.status !== "active" ||
    parentLeaf.owner_user_id !== appUserId ||
    parentLeaf.owner_actor_id !== actorId ||
    visibility !== "private" ||
    !uuid(parentLeaf.parent_value_object_id)
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Parent project root must be an active private personal leaf with a structural parent.",
        errorCode: "PROJECT_SUBPROJECT_PARENT_LEAF_INVALID",
      },
      { status: 409 },
    );
  }

  const systemParentId = parentLeaf.parent_value_object_id;

  const { data: systemParent, error: systemParentError } = await supabase
    .from("value_objects")
    .select(
      "id,title,facet_code,root_value_object_id,branch_type_code,scope_code,origin_type_code,ontology_node_role_code,status,owner_user_id,owner_actor_id",
    )
    .eq("id", systemParentId)
    .single();

  if (systemParentError || !systemParent) {
    return NextResponse.json(
      {
        ok: false,
        error:
          systemParentError?.message ??
          "System intermediate parent observation object not found.",
      },
      { status: 404 },
    );
  }

  const objectKindCode = genericKindForFacet(systemParent.facet_code);

  if (
    systemParent.scope_code !== "global" ||
    systemParent.origin_type_code !== "system_model" ||
    systemParent.ontology_node_role_code !== "intermediate" ||
    systemParent.status !== "active" ||
    systemParent.owner_user_id !== null ||
    systemParent.owner_actor_id !== null ||
    !objectKindCode ||
    !text(systemParent.root_value_object_id) ||
    !text(systemParent.branch_type_code)
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Subproject must use the same active global system intermediate parent as the parent project.",
        errorCode: "PROJECT_SUBPROJECT_SYSTEM_INTERMEDIATE_REQUIRED",
      },
      { status: 409 },
    );
  }

  const ontologyPayload = {
    title,
    description,
    facetCode: systemParent.facet_code,
    objectKindCode,
    nodeRoleCode: "leaf",
    parentValueObjectId: systemParent.id,
    hierarchyRelationCode: "part_of",
    allowGlobalSystemParent: true,
    visibilityCode: "private",
    privacyClassCode: "standard",
  };

  const requestHash = createHash("sha256")
    .update(JSON.stringify(ontologyPayload), "utf8")
    .digest("hex")
    .toUpperCase();

  const ontologyIdempotencyKey =
    `pp5b:subproject-leaf:${parentProjectContextId}:${clientRequestId}`;

  const { data: createdCard, error: createError } = await supabase.rpc(
    "create_value_object_ontology_v1",
    {
      p_owner_user_id: appUserId,
      p_owner_actor_id: actorId,
      p_created_by_actor_id: actorId,
      p_payload: ontologyPayload,
      p_idempotency_key: ontologyIdempotencyKey,
      p_request_hash: requestHash,
    },
  );

  if (createError) {
    return NextResponse.json(
      {
        ok: false,
        error: createError.message,
        errorCode: createError.code ?? null,
      },
      { status: errorStatus(createError) },
    );
  }

  const childRootValueObjectId = cardValueObjectId(createdCard);

  if (!childRootValueObjectId) {
    return NextResponse.json(
      {
        ok: false,
        error: "Subproject leaf creation returned an invalid ontology card.",
      },
      { status: 500 },
    );
  }

  let finalCard = createdCard as JsonRecord | null;
  const statusCode =
    finalCard &&
    finalCard.valueObject &&
    typeof finalCard.valueObject === "object" &&
    !Array.isArray(finalCard.valueObject)
      ? text((finalCard.valueObject as JsonRecord).statusCode)
      : "";

  if (statusCode === "draft") {
    const { data: activatedCard, error: activationError } = await supabase.rpc(
      "set_value_object_ontology_lifecycle_v1",
      {
        p_owner_user_id: appUserId,
        p_owner_actor_id: actorId,
        p_value_object_id: childRootValueObjectId,
        p_new_status: "active",
      },
    );

    if (activationError) {
      return NextResponse.json(
        {
          ok: false,
          error: activationError.message,
          errorCode: activationError.code ?? "VO_AUTHORING_ACTIVATION_FAILED",
          childRootValueObjectId,
        },
        { status: errorStatus(activationError) },
      );
    }

    finalCard = activatedCard as JsonRecord | null;
  }

  const localization = await materializeActorValueObjectAllLocalizationsV1({
    appUserId,
    actorId,
    entityId: childRootValueObjectId,
    sourceLocaleHint: targetLocale,
    fieldCodes: ["title", "description"],
    sourceFields: {
      title,
      description,
    },
  }).catch((error: unknown) => ({
    ok: true as const,
    entityId: childRootValueObjectId,
    complete: false as const,
    warning:
      error instanceof Error
        ? error.message
        : "VALUE_OBJECT_ALL_LOCALE_MATERIALIZATION_FAILED",
  }));

  const { data: existingChildProject, error: existingProjectError } = await supabase
    .from("project_contexts")
    .select(
      "id,title,description,project_mode_code,status_code,timezone,currency_code,root_value_object_id,created_at,updated_at",
    )
    .eq("owner_user_id", appUserId)
    .eq("owner_actor_id", actorId)
    .eq("root_value_object_id", childRootValueObjectId)
    .neq("status_code", "archived")
    .maybeSingle();

  if (existingProjectError) {
    return NextResponse.json(
      {
        ok: false,
        error: existingProjectError.message,
        childRootValueObjectId,
      },
      { status: 500 },
    );
  }

  let childProject = existingChildProject;

  if (!childProject) {
    const createdProject = await supabase
      .from("project_contexts")
      .insert({
        owner_user_id: appUserId,
        owner_actor_id: actorId,
        scope_code: "personal",
        organization_id: null,
        root_value_object_id: childRootValueObjectId,
        title,
        description,
        project_mode_code: "finite",
        status_code: "draft",
        timezone: parentProject.timezone,
        currency_code: parentProject.currency_code,
        created_by_actor_id: actorId,
        metadata_json: {
          ui_origin: "project_map_subproject_pp5b",
          parent_project_context_id: parentProjectContextId,
        },
      })
      .select(
        "id,title,description,project_mode_code,status_code,timezone,currency_code,root_value_object_id,created_at,updated_at",
      )
      .single();

    if (createdProject.error || !createdProject.data) {
      return NextResponse.json(
        {
          ok: false,
          error:
            createdProject.error?.message ??
            "Subproject context creation failed.",
          childRootValueObjectId,
          retrySafe: true,
        },
        { status: 500 },
      );
    }

    childProject = createdProject.data;
  }

  if (childProject.id === parentProjectContextId) {
    return NextResponse.json(
      { ok: false, error: "Project cannot be its own subproject." },
      { status: 409 },
    );
  }

  let graph;
  try {
    graph = await userProjectGraph({
      userId: appUserId,
      actorId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not validate project composition graph.",
        retrySafe: true,
      },
      { status: 500 },
    );
  }

  if (
    wouldCreateProjectCycle(
      graph.relations,
      parentProject.root_value_object_id,
      childRootValueObjectId,
    )
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Project decomposition cycle is forbidden.",
        errorCode: "PROJECT_SUBPROJECT_CYCLE_FORBIDDEN",
      },
      { status: 409 },
    );
  }

  const { data: existingRelation, error: existingRelationError } =
    await supabase
      .from("project_composition_relations")
      .select("id")
      .eq("project_context_id", parentProjectContextId)
      .eq("parent_value_object_id", parentProject.root_value_object_id)
      .eq("child_value_object_id", childRootValueObjectId)
      .eq("relation_type_code", "decomposes_into")
      .eq("status_code", "active")
      .maybeSingle();

  if (existingRelationError) {
    return NextResponse.json(
      {
        ok: false,
        error: existingRelationError.message,
        retrySafe: true,
      },
      { status: 500 },
    );
  }

  let relationId = existingRelation?.id ?? null;

  if (!relationId) {
    const { data: relation, error: relationError } = await supabase
      .from("project_composition_relations")
      .insert({
        project_context_id: parentProjectContextId,
        parent_value_object_id: parentProject.root_value_object_id,
        child_value_object_id: childRootValueObjectId,
        relation_type_code: "decomposes_into",
        display_order: 0,
        local_label: title,
        local_note: null,
        status_code: "active",
        provenance_code: "manual",
        metadata_json: {
          contract: "ARCTOR_PROJECT_SUBPROJECT_PP5B_V1",
          child_project_context_id: childProject.id,
        },
        created_by_actor_id: actorId,
      })
      .select("id")
      .single();

    if (relationError || !relation) {
      return NextResponse.json(
        {
          ok: false,
          error:
            relationError?.message ??
            "Project decomposition relation creation failed.",
          childRootValueObjectId,
          childProjectContextId: childProject.id,
          retrySafe: true,
        },
        { status: relationError?.code === "23514" ? 409 : 500 },
      );
    }

    relationId = relation.id;
  }

  return NextResponse.json(
    {
      ok: true,
      disposition:
        existingRelation?.id ? "idempotent_replay" : "created",
      parentProjectContextId,
      relationId,
      subproject: {
        id: childProject.id,
        title: childProject.title,
        description: childProject.description,
        projectModeCode: childProject.project_mode_code,
        statusCode: childProject.status_code,
        timezone: childProject.timezone,
        currencyCode: childProject.currency_code,
        rootValueObjectId: childRootValueObjectId,
      },
      observationObject: {
        id: childRootValueObjectId,
        parentValueObjectId: systemParent.id,
        parentTitle: systemParent.title,
        ontologyCard: finalCard,
      },
      localization,
    },
    { status: existingRelation?.id ? 200 : 201 },
  );
}

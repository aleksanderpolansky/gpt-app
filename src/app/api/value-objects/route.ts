import { NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../lib/actor-context";
import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";
import { localizeGlobalSystemValueObject } from "@/lib/reality-core/global-system-value-object-localization";
import {
  isValueObjectLeafKindV2,
  isValueObjectStructuralKindV2,
  type ValueObjectLeafKindV2,
  type ValueObjectStructuralKindV2,
} from "@/types/reality-core/reality-core-contracts-v2";

export const dynamic = "force-dynamic";

type UsageScope = "private" | "commercial";

type AppUserRow = {
  id: string;
  auth0_sub?: string | null;
};

type ActorRow = {
  id: string;
  actor_type?: string | null;
};

type OrganizationRow = {
  id: string;
  organization_name: string | null;
  organization_type: string | null;
  status: string | null;
  owner_actor_id: string | null;
};

type CurrentUserContext =
  | {
      appUser: AppUserRow;
      personActor: ActorRow;
      errorResponse: null;
    }
  | {
      appUser: null;
      personActor: null;
      errorResponse: NextResponse;
    };

type OrganizationAccessResult =
  | {
      organization: OrganizationRow;
      errorResponse: null;
    }
  | {
      organization: null;
      errorResponse: NextResponse;
    };

type ValueObjectRequestBody = {
  usageScope?: unknown;
  creationMode?: unknown;
  parentValueObjectId?: unknown;
  organizationId?: unknown;
  valueType?: unknown;
  title?: unknown;
  description?: unknown;
  unitType?: unknown;
  defaultPrice?: unknown;
  defaultCurrency?: unknown;
  defaultDurationMinutes?: unknown;
  isMarketplaceSellable?: unknown;
  isFreePossible?: unknown;
  commercialUsage?: unknown;
  branchTypeCode?: unknown;
  objectKind?: unknown;
  locale?: unknown;
  idempotencyKey?: unknown;
};

function normalizeRequiredString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed;
}

function normalizeOptionalString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed;
}

function normalizeOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeBoolean(value: unknown): boolean {
  return value === true;
}

function normalizeUsageScope(value: unknown): UsageScope | null {
  if (value === "private" || value === "commercial") {
    return value;
  }

  return null;
}

function normalizeCommercialUsage(value: unknown): string {
  const normalized = normalizeOptionalString(value);

  if (
    normalized === "catalog_info" ||
    normalized === "certificate_base" ||
    normalized === "both"
  ) {
    return normalized;
  }

  return "none";
}

function normalizeDraftCreationMode(value: unknown): boolean {
  const normalized = normalizeOptionalString(value);

  return (
    normalized === "draft" ||
    normalized === "manual_draft" ||
    normalized === "draft_first"
  );
}

function normalizeRootDraftCreationMode(value: unknown): boolean {
  return normalizeOptionalString(value) === "root_draft_v3";
}

function normalizeLeafDraftCreationMode(value: unknown): boolean {
  return normalizeOptionalString(value) === "leaf_draft_v3";
}

function normalizeIntermediateDraftCreationMode(value: unknown): boolean {
  return normalizeOptionalString(value) === "intermediate_draft_v3";
}

function normalizeUuid(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    normalized,
  )
    ? normalized
    : null;
}

function normalizeBranchTypeCode(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return /^[a-z][a-z0-9_]{1,79}$/.test(normalized)
    ? normalized
    : null;
}

function normalizeStructuralObjectKind(
  value: unknown,
): ValueObjectStructuralKindV2 | null {
  if (value === undefined || value === null || value === "") {
    return "other";
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return isValueObjectStructuralKindV2(normalized) ? normalized : null;
}

function normalizeLeafObjectKind(
  value: unknown,
): ValueObjectLeafKindV2 | null {
  if (value === undefined || value === null || value === "") {
    return "activity_pattern";
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return isValueObjectLeafKindV2(normalized) ? normalized : null;
}

function normalizeLocale(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  return ["en", "pl", "ru", "uk", "de", "es", "cs"].includes(normalized)
    ? normalized
    : null;
}

function buildValueObjectDetailUrl(id: string, locale: string | null) {
  const pathname = `/value-objects/${id}`;

  if (!locale || locale === "en") {
    return pathname;
  }

  return `${pathname}?locale=${encodeURIComponent(locale)}`;
}

function getDraftDefaults(usageScope: UsageScope) {
  if (usageScope === "commercial") {
    return {
      title: "Новый коммерческий ценный объект",
      valueType: "service",
    };
  }

  return {
    title: "Новый частный ценный объект",
    valueType: "personal_value_object",
  };
}

function buildValueObjectEditUrl(id: string) {
  return `/value-objects/${id}/edit`;
}

async function getCurrentUserContext(): Promise<CurrentUserContext> {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return {
      appUser: null,
      personActor: null,
      errorResponse: NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 },
      ),
    };
  }

  try {
    const actorContext = await resolveActiveActorContext(session.user.sub);

    return {
      appUser: {
        id: actorContext.appUserId,
        auth0_sub: session.user.sub,
      },
      personActor: {
        id: actorContext.actorId,
        actor_type: actorContext.actorType,
      },
      errorResponse: null,
    };
  } catch (error) {
    if (error instanceof ActorContextError) {
      return {
        appUser: null,
        personActor: null,
        errorResponse: NextResponse.json(
          {
            error: error.message,
            errorCode: error.code,
          },
          { status: error.status },
        ),
      };
    }

    return {
      appUser: null,
      personActor: null,
      errorResponse: NextResponse.json(
        { error: "Could not resolve active actor context" },
        { status: 500 },
      ),
    };
  }
}

async function verifyOrganizationAccess(
  activeActorId: string,
  organizationId: string,
): Promise<OrganizationAccessResult> {
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, organization_name, organization_type, status, owner_actor_id")
    .eq("id", organizationId)
    .eq("owner_actor_id", activeActorId)
    .single();

  if (organizationError || !organization) {
    return {
      organization: null,
      errorResponse: NextResponse.json(
        { error: "Organization not found or access denied" },
        { status: 403 },
      ),
    };
  }

  return {
    organization,
    errorResponse: null,
  };
}

export async function GET(request: Request) {
  const locale = normalizeLocale(new URL(request.url).searchParams.get("locale")) ?? "en";
  const { appUser, personActor, errorResponse } =
    await getCurrentUserContext();

  if (errorResponse) {
    return errorResponse;
  }

  const selectShape = `
      *,
      organizations (
        id,
        organization_name,
        organization_type,
        status
      )
    `;

  const [ownedResult, globalResult] = await Promise.all([
    supabase
      .from("value_objects")
      .select(selectShape)
      .eq("owner_user_id", appUser.id)
      .eq("owner_actor_id", personActor.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("value_objects")
      .select(selectShape)
      .eq("scope_code", "global")
      .order("created_at", { ascending: false }),
  ]);

  if (ownedResult.error) {
    return NextResponse.json(
      { error: ownedResult.error.message },
      { status: 500 },
    );
  }

  if (globalResult.error) {
    return NextResponse.json(
      { error: globalResult.error.message },
      { status: 500 },
    );
  }

  const mergedById = new Map<string, Record<string, unknown>>();

  for (const valueObject of [
    ...(globalResult.data ?? []),
    ...(ownedResult.data ?? []),
  ]) {
    if (
      valueObject &&
      typeof valueObject === "object" &&
      typeof valueObject.id === "string"
    ) {
      mergedById.set(valueObject.id, valueObject as Record<string, unknown>);
    }
  }

  const observationValueObjects = [...mergedById.values()].filter(
    (valueObject) => {
      const rawMetadata = valueObject.metadata_json;
      const metadata =
        rawMetadata &&
        typeof rawMetadata === "object" &&
        !Array.isArray(rawMetadata)
          ? (rawMetadata as Record<string, unknown>)
          : null;

      return (
        metadata?.system_hidden_from_observation_ui !== true &&
        metadata?.system_root_code !== "products_services"
      );
    },
  );

  const localizedObservationValueObjects = observationValueObjects.map(
    (valueObject) =>
      valueObject.scope_code === "global"
        ? localizeGlobalSystemValueObject(valueObject, locale)
        : valueObject,
  );

  return NextResponse.json({
    ok: true,
    valueObjects: localizedObservationValueObjects,
    counts: {
      total: observationValueObjects.length,
      global: observationValueObjects.filter(
        (valueObject) => valueObject.scope_code === "global",
      ).length,
      actorOwned: observationValueObjects.filter(
        (valueObject) => valueObject.scope_code !== "global",
      ).length,
    },
  });
}

type OntologyFacetCode =
  | "ENTITY"
  | "PROCESS"
  | "STATE"
  | "RELATIONSHIP"
  | "ROLE"
  | "KNOWLEDGE"
  | "BEHAVIOR"
  | "CONTEXT";

type OntologyKindSpec = {
  readonly facetCode: OntologyFacetCode;
  readonly objectKindCode: string;
};

type OntologyCreateCard = {
  readonly valueObject?: {
    readonly id?: string;
    readonly title?: string;
    readonly facetCode?: string;
    readonly objectKindCode?: string;
    readonly nodeRoleCode?: string;
    readonly parentValueObjectId?: string | null;
    readonly rootValueObjectId?: string | null;
    readonly statusCode?: string;
    readonly visibilityCode?: string;
  };
};

type OntologyParent = {
  readonly id: string;
  readonly title: string;
  readonly facetCode: string;
  readonly ontologyNodeRoleCode: "root" | "intermediate";
  readonly rootValueObjectId: string;
  readonly branchTypeCode: string;
};

const GENERIC_KIND_BY_FACET: Readonly<Record<OntologyFacetCode, string>> = {
  ENTITY: "generic_entity",
  PROCESS: "generic_process",
  STATE: "generic_state",
  RELATIONSHIP: "generic_relationship",
  ROLE: "generic_role",
  KNOWLEDGE: "generic_knowledge",
  BEHAVIOR: "generic_behavior",
  CONTEXT: "generic_context",
};

function createOntologyRequestHash(payload: Record<string, unknown>): string {
  return createHash("sha256")
    .update(JSON.stringify(payload), "utf8")
    .digest("hex")
    .toUpperCase();
}

function resolveOntologyIdempotencyKey(
  supplied: unknown,
  kind: "root" | "intermediate" | "leaf",
): string {
  if (typeof supplied === "string") {
    const normalized = supplied.trim();
    if (normalized.length >= 8 && normalized.length <= 200) {
      return normalized;
    }
  }

  return `vo-authoring-${kind}-${randomUUID()}`;
}

function mapOntologyRpcErrorStatus(error: {
  readonly code?: string | null;
  readonly message?: string | null;
}): number {
  if (error.code === "42501") {
    return 403;
  }

  if (error.code === "P0002") {
    return 404;
  }

  if (error.code === "23505") {
    return 409;
  }

  if (
    error.code === "22023" ||
    error.code === "23503" ||
    error.code === "23514"
  ) {
    return 400;
  }

  return 500;
}

function mapLegacyStructuralKindToOntology(
  objectKind: ValueObjectStructuralKindV2,
): OntologyKindSpec {
  switch (objectKind) {
    case "relationship":
      return { facetCode: "RELATIONSHIP", objectKindCode: "generic_relationship" };
    case "skill":
    case "knowledge":
      return { facetCode: "KNOWLEDGE", objectKindCode: "generic_knowledge" };
    case "project":
    case "process":
      return { facetCode: "PROCESS", objectKindCode: "generic_process" };
    case "state":
    case "symptom":
    case "risk":
    case "goal":
    case "reputation":
      return { facetCode: "STATE", objectKindCode: "generic_state" };
    case "lifestyle":
      return { facetCode: "BEHAVIOR", objectKindCode: "generic_behavior" };
    case "asset":
    case "person":
    case "content":
    case "instance":
    case "right":
    case "resource":
    case "other":
    default:
      return { facetCode: "ENTITY", objectKindCode: "generic_entity" };
  }
}

function genericOntologyKindForFacet(facetCode: string): OntologyKindSpec | null {
  if (
    facetCode === "ENTITY" ||
    facetCode === "PROCESS" ||
    facetCode === "STATE" ||
    facetCode === "RELATIONSHIP" ||
    facetCode === "ROLE" ||
    facetCode === "KNOWLEDGE" ||
    facetCode === "BEHAVIOR" ||
    facetCode === "CONTEXT"
  ) {
    return {
      facetCode,
      objectKindCode: GENERIC_KIND_BY_FACET[facetCode],
    };
  }

  return null;
}

function mapLeafKindToOntology(
  objectKind: ValueObjectLeafKindV2,
): OntologyKindSpec {
  if (objectKind === "product_type") {
    return { facetCode: "ENTITY", objectKindCode: "product_type" };
  }

  if (objectKind === "service_type") {
    return { facetCode: "PROCESS", objectKindCode: "service_type" };
  }

  return { facetCode: "PROCESS", objectKindCode: "activity_pattern" };
}

async function createOntologyValueObject(params: {
  readonly appUser: AppUserRow;
  readonly personActor: ActorRow;
  readonly payload: Record<string, unknown>;
  readonly idempotencyKey: string;
}) {
  const requestHash = createOntologyRequestHash(params.payload);
  const { data, error } = await supabase.rpc("create_value_object_ontology_v1", {
    p_owner_user_id: params.appUser.id,
    p_owner_actor_id: params.personActor.id,
    p_created_by_actor_id: params.personActor.id,
    p_payload: params.payload,
    p_idempotency_key: params.idempotencyKey,
    p_request_hash: requestHash,
  });

  if (error) {
    return {
      card: null,
      valueObjectId: null,
      errorResponse: NextResponse.json(
        {
          error: error.message,
          errorCode: error.code ?? null,
        },
        { status: mapOntologyRpcErrorStatus(error) },
      ),
    };
  }

  const card = data as OntologyCreateCard | null;
  const valueObjectId = normalizeUuid(card?.valueObject?.id);

  if (!card || !valueObjectId) {
    return {
      card: null,
      valueObjectId: null,
      errorResponse: NextResponse.json(
        {
          error: "Ontology creation returned an invalid card",
          errorCode: "VO_AUTHORING_ONTOLOGY_CARD_INVALID",
        },
        { status: 500 },
      ),
    };
  }

  return {
    card,
    valueObjectId,
    errorResponse: null,
  };
}

async function createRootDraftValueObject(
  body: ValueObjectRequestBody,
  appUser: AppUserRow,
  personActor: ActorRow,
) {
  const title = normalizeRequiredString(body.title);
  const description = normalizeOptionalString(body.description);
  const locale = normalizeLocale(body.locale);

  if (!title || title.length > 180) {
    return NextResponse.json(
      { error: "title is required and must be 180 characters or fewer" },
      { status: 400 },
    );
  }

  if (description && description.length > 4000) {
    return NextResponse.json(
      { error: "description must be 4000 characters or fewer" },
      { status: 400 },
    );
  }

  const payload: Record<string, unknown> = {
    title,
    description: description ?? title,
    facetCode: "DOMAIN",
    objectKindCode: "domain_root",
    nodeRoleCode: "root",
    visibilityCode: "private",
    privacyClassCode: "standard",
  };
  const created = await createOntologyValueObject({
    appUser,
    personActor,
    payload,
    idempotencyKey: resolveOntologyIdempotencyKey(body.idempotencyKey, "root"),
  });

  if (created.errorResponse || !created.card || !created.valueObjectId) {
    return (
      created.errorResponse ??
      NextResponse.json(
        { error: "Ontology root creation failed" },
        { status: 500 },
      )
    );
  }

  return NextResponse.json({
    ok: true,
    mode: "root_draft_v3",
    valueObject: created.card.valueObject,
    ontologyCard: created.card,
    redirectUrl: buildValueObjectDetailUrl(created.valueObjectId, locale),
  });
}

async function getOwnedStructuralParent(
  parentValueObjectId: string,
  appUser: AppUserRow,
  personActor: ActorRow,
) {
  const { data: parentData, error: parentError } = await supabase
    .from("value_objects")
    .select(
      `
      id,
      title,
      object_kind,
      node_role_code,
      branch_type_code,
      root_value_object_id,
      parent_value_object_id,
      status,
      canonical_key,
      facet_code,
      object_kind_code,
      ontology_node_role_code,
      scope_code
    `,
    )
    .eq("id", parentValueObjectId)
    .eq("owner_user_id", appUser.id)
    .eq("owner_actor_id", personActor.id)
    .maybeSingle();

  if (parentError) {
    return {
      parent: null,
      errorResponse: NextResponse.json(
        { error: parentError.message },
        { status: 500 },
      ),
    };
  }

  if (!parentData) {
    return {
      parent: null,
      errorResponse: NextResponse.json(
        { error: "Parent observation object not found or access denied" },
        { status: 404 },
      ),
    };
  }

  const rootValueObjectId = normalizeUuid(parentData.root_value_object_id);
  const branchTypeCode = normalizeBranchTypeCode(parentData.branch_type_code);
  const facetCode =
    typeof parentData.facet_code === "string" ? parentData.facet_code : null;
  const ontologyNodeRoleCode = parentData.ontology_node_role_code;
  const parentIsEligible =
    parentData.scope_code === "actor" &&
    typeof parentData.canonical_key === "string" &&
    parentData.canonical_key.length > 0 &&
    typeof facetCode === "string" &&
    (ontologyNodeRoleCode === "root" || ontologyNodeRoleCode === "intermediate") &&
    rootValueObjectId !== null &&
    branchTypeCode !== null &&
    (parentData.status === "draft" || parentData.status === "active");

  if (!parentIsEligible || !facetCode || !rootValueObjectId || !branchTypeCode) {
    return {
      parent: null,
      errorResponse: NextResponse.json(
        {
          error:
            "Children can be created only under an ontology-ready owned root or intermediate observation object",
          errorCode: "VO_AUTHORING_PARENT_NOT_ONTOLOGY_READY",
        },
        { status: 409 },
      ),
    };
  }

  const parent: OntologyParent = {
    id: parentData.id,
    title: parentData.title,
    facetCode,
    ontologyNodeRoleCode,
    rootValueObjectId,
    branchTypeCode,
  };

  return {
    parent,
    errorResponse: null,
  };
}

async function createIntermediateDraftValueObject(
  body: ValueObjectRequestBody,
  appUser: AppUserRow,
  personActor: ActorRow,
) {
  const parentValueObjectId = normalizeUuid(body.parentValueObjectId);
  const title = normalizeRequiredString(body.title);
  const description = normalizeOptionalString(body.description);
  const objectKind = normalizeStructuralObjectKind(body.objectKind);
  const locale = normalizeLocale(body.locale);

  if (!parentValueObjectId) {
    return NextResponse.json(
      { error: "A valid parentValueObjectId is required" },
      { status: 400 },
    );
  }

  if (!title || title.length > 180) {
    return NextResponse.json(
      { error: "title is required and must be 180 characters or fewer" },
      { status: 400 },
    );
  }

  if (description && description.length > 4000) {
    return NextResponse.json(
      { error: "description must be 4000 characters or fewer" },
      { status: 400 },
    );
  }

  if (!objectKind) {
    return NextResponse.json(
      { error: "A valid structural objectKind is required" },
      { status: 400 },
    );
  }

  const parentResult = await getOwnedStructuralParent(
    parentValueObjectId,
    appUser,
    personActor,
  );

  if (parentResult.errorResponse || !parentResult.parent) {
    return (
      parentResult.errorResponse ??
      NextResponse.json(
        { error: "Structural parent resolution failed" },
        { status: 500 },
      )
    );
  }

  const parent = parentResult.parent;
  const semanticKind =
    parent.ontologyNodeRoleCode === "root"
      ? mapLegacyStructuralKindToOntology(objectKind)
      : genericOntologyKindForFacet(parent.facetCode);

  if (!semanticKind) {
    return NextResponse.json(
      {
        error: "Parent facet cannot accept an intermediate object",
        errorCode: "VO_AUTHORING_INTERMEDIATE_FACET_UNSUPPORTED",
      },
      { status: 409 },
    );
  }

  const payload: Record<string, unknown> = {
    title,
    description: description ?? title,
    facetCode: semanticKind.facetCode,
    objectKindCode: semanticKind.objectKindCode,
    nodeRoleCode: "intermediate",
    parentValueObjectId: parent.id,
    hierarchyRelationCode: "is_a",
    visibilityCode: "private",
    privacyClassCode: "standard",
  };
  const created = await createOntologyValueObject({
    appUser,
    personActor,
    payload,
    idempotencyKey: resolveOntologyIdempotencyKey(
      body.idempotencyKey,
      "intermediate",
    ),
  });

  if (created.errorResponse || !created.card || !created.valueObjectId) {
    return (
      created.errorResponse ??
      NextResponse.json(
        { error: "Ontology intermediate creation failed" },
        { status: 500 },
      )
    );
  }

  return NextResponse.json({
    ok: true,
    mode: "intermediate_draft_v3",
    valueObject: created.card.valueObject,
    ontologyCard: created.card,
    parent: {
      id: parent.id,
      title: parent.title,
      facetCode: parent.facetCode,
      rootValueObjectId: parent.rootValueObjectId,
    },
    redirectUrl: buildValueObjectDetailUrl(created.valueObjectId, locale),
  });
}

async function createLeafDraftValueObject(
  body: ValueObjectRequestBody,
  appUser: AppUserRow,
  personActor: ActorRow,
) {
  const parentValueObjectId = normalizeUuid(body.parentValueObjectId);
  const title = normalizeRequiredString(body.title);
  const description = normalizeOptionalString(body.description);
  const objectKind = normalizeLeafObjectKind(body.objectKind);
  const locale = normalizeLocale(body.locale);

  if (!parentValueObjectId) {
    return NextResponse.json(
      { error: "A valid parentValueObjectId is required" },
      { status: 400 },
    );
  }

  if (!objectKind) {
    return NextResponse.json(
      {
        error:
          "A valid leaf objectKind is required: activity_pattern, product_type or service_type",
      },
      { status: 400 },
    );
  }

  if (!title || title.length > 180) {
    return NextResponse.json(
      { error: "title is required and must be 180 characters or fewer" },
      { status: 400 },
    );
  }

  if (description && description.length > 4000) {
    return NextResponse.json(
      { error: "description must be 4000 characters or fewer" },
      { status: 400 },
    );
  }

  const parentResult = await getOwnedStructuralParent(
    parentValueObjectId,
    appUser,
    personActor,
  );

  if (parentResult.errorResponse || !parentResult.parent) {
    return (
      parentResult.errorResponse ??
      NextResponse.json(
        { error: "Structural parent resolution failed" },
        { status: 500 },
      )
    );
  }

  const parent = parentResult.parent;
  const semanticKind = mapLeafKindToOntology(objectKind);

  if (
    parent.ontologyNodeRoleCode === "intermediate" &&
    parent.facetCode !== semanticKind.facetCode
  ) {
    return NextResponse.json(
      {
        error:
          "The selected leaf kind belongs to a different semantic facet than its intermediate parent",
        errorCode: "VO_AUTHORING_LEAF_PARENT_FACET_MISMATCH",
      },
      { status: 409 },
    );
  }

  const payload: Record<string, unknown> = {
    title,
    description: description ?? title,
    facetCode: semanticKind.facetCode,
    objectKindCode: semanticKind.objectKindCode,
    nodeRoleCode: "leaf",
    parentValueObjectId: parent.id,
    hierarchyRelationCode: "is_a",
    visibilityCode: "private",
    privacyClassCode: "standard",
  };
  const created = await createOntologyValueObject({
    appUser,
    personActor,
    payload,
    idempotencyKey: resolveOntologyIdempotencyKey(body.idempotencyKey, "leaf"),
  });

  if (created.errorResponse || !created.card || !created.valueObjectId) {
    return (
      created.errorResponse ??
      NextResponse.json(
        { error: "Ontology leaf creation failed" },
        { status: 500 },
      )
    );
  }

  return NextResponse.json({
    ok: true,
    mode: "leaf_draft_v3",
    valueObject: created.card.valueObject,
    ontologyCard: created.card,
    parent: {
      id: parent.id,
      title: parent.title,
      facetCode: parent.facetCode,
      rootValueObjectId: parent.rootValueObjectId,
    },
    redirectUrl: buildValueObjectDetailUrl(created.valueObjectId, locale),
  });
}

async function createDraftValueObject(
  body: ValueObjectRequestBody,
  appUser: AppUserRow,
  personActor: ActorRow,
  usageScope: UsageScope,
) {
  const defaults = getDraftDefaults(usageScope);
  const organizationId = normalizeOptionalString(body.organizationId);
  const valueType = normalizeOptionalString(body.valueType) ?? defaults.valueType;
  const title = normalizeOptionalString(body.title) ?? defaults.title;
  const description = normalizeOptionalString(body.description);
  const unitType = normalizeOptionalString(body.unitType);
  const defaultPrice = normalizeOptionalNumber(body.defaultPrice);
  const defaultCurrency = normalizeOptionalString(body.defaultCurrency);
  const defaultDurationMinutes = normalizeOptionalNumber(
    body.defaultDurationMinutes,
  );
  const isMarketplaceSellable =
    usageScope === "commercial" ? normalizeBoolean(body.isMarketplaceSellable) : false;
  const isFreePossible = normalizeBoolean(body.isFreePossible);
  const commercialUsage =
    usageScope === "commercial" ? normalizeCommercialUsage(body.commercialUsage) : "none";

  let organization: OrganizationRow | null = null;

  if (usageScope === "commercial") {
    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required for commercial Value Object drafts" },
        { status: 400 },
      );
    }

    const {
      organization: verifiedOrganization,
      errorResponse: organizationAccessErrorResponse,
    } = await verifyOrganizationAccess(personActor.id, organizationId);

    if (organizationAccessErrorResponse) {
      return organizationAccessErrorResponse;
    }

    organization = verifiedOrganization;
  }

  const { data: valueObject, error: valueObjectError } = await supabase
    .from("value_objects")
    .insert({
      owner_actor_id: personActor.id,
      created_by_actor_id: personActor.id,
      actor_id: personActor.id,
      app_user_id: appUser.id,
      owner_user_id: appUser.id,
      organization_id: organization?.id ?? null,
      usage_scope: usageScope,
      value_type: valueType,
      title,
      description,
      unit_type: unitType,
      default_price: defaultPrice,
      default_currency: defaultCurrency,
      default_duration_minutes: defaultDurationMinutes,
      is_marketplace_sellable: isMarketplaceSellable,
      is_free_possible: isFreePossible,
      commercial_usage: commercialUsage,
      visibility: "private",
      source: "manual",
      status: "draft",
    })
    .select(
      `
      *,
      organizations (
        id,
        organization_name,
        organization_type,
        status
      )
    `,
    )
    .single();

  if (valueObjectError) {
    return NextResponse.json(
      { error: valueObjectError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    mode: "draft_first",
    valueObject,
    redirectUrl: buildValueObjectEditUrl(valueObject.id),
  });
}

async function createLegacyCommercialValueObject(
  body: ValueObjectRequestBody,
  appUser: AppUserRow,
  personActor: ActorRow,
) {
  const organizationId = normalizeRequiredString(body.organizationId);
  const valueType = normalizeRequiredString(body.valueType);
  const title = normalizeRequiredString(body.title);
  const description = normalizeOptionalString(body.description);
  const unitType = normalizeOptionalString(body.unitType);
  const defaultPrice = normalizeOptionalNumber(body.defaultPrice);
  const defaultCurrency = normalizeOptionalString(body.defaultCurrency);
  const defaultDurationMinutes = normalizeOptionalNumber(
    body.defaultDurationMinutes,
  );
  const isMarketplaceSellable = normalizeBoolean(body.isMarketplaceSellable);
  const isFreePossible = normalizeBoolean(body.isFreePossible);

  if (!organizationId || !valueType || !title) {
    return NextResponse.json(
      { error: "organizationId, valueType and title are required" },
      { status: 400 },
    );
  }

  const { organization, errorResponse: organizationAccessErrorResponse } =
    await verifyOrganizationAccess(personActor.id, organizationId);

  if (organizationAccessErrorResponse) {
    return organizationAccessErrorResponse;
  }

  const { data: valueObject, error: valueObjectError } = await supabase
    .from("value_objects")
    .insert({
      owner_actor_id: personActor.id,
      created_by_actor_id: personActor.id,
      actor_id: personActor.id,
      app_user_id: appUser.id,
      owner_user_id: appUser.id,
      organization_id: organization.id,
      usage_scope: "commercial",
      value_type: valueType,
      title,
      description,
      unit_type: unitType,
      default_price: defaultPrice,
      default_currency: defaultCurrency,
      default_duration_minutes: defaultDurationMinutes,
      is_marketplace_sellable: isMarketplaceSellable,
      is_free_possible: isFreePossible,
      commercial_usage: "none",
      visibility: "private",
      source: "manual",
      status: "active",
    })
    .select(
      `
      *,
      organizations (
        id,
        organization_name,
        organization_type,
        status
      )
    `,
    )
    .single();

  if (valueObjectError) {
    return NextResponse.json(
      { error: valueObjectError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    mode: "legacy_commercial_active",
    valueObject,
  });
}

export async function POST(request: Request) {
  const { appUser, personActor, errorResponse } = await getCurrentUserContext();

  if (errorResponse) {
    return errorResponse;
  }

  let body: ValueObjectRequestBody;

  try {
    body = (await request.json()) as ValueObjectRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const intermediateDraftRequested =
    normalizeIntermediateDraftCreationMode(body.creationMode);

  if (intermediateDraftRequested) {
    return createIntermediateDraftValueObject(
      body,
      appUser,
      personActor,
    );
  }

  const leafDraftRequested = normalizeLeafDraftCreationMode(
    body.creationMode,
  );

  if (leafDraftRequested) {
    return createLeafDraftValueObject(body, appUser, personActor);
  }

  const rootDraftRequested = normalizeRootDraftCreationMode(
    body.creationMode,
  );

  if (rootDraftRequested) {
    return createRootDraftValueObject(body, appUser, personActor);
  }

  const usageScope = normalizeUsageScope(body.usageScope);
  const draftModeRequested = normalizeDraftCreationMode(body.creationMode);

  if (draftModeRequested && !usageScope) {
    return NextResponse.json(
      { error: "usageScope is required for draft-first Value Object creation" },
      { status: 400 },
    );
  }

  if (usageScope) {
    return createDraftValueObject(body, appUser, personActor, usageScope);
  }

  return createLegacyCommercialValueObject(body, appUser, personActor);
}

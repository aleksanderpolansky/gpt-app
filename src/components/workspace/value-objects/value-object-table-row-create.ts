import {
  createArctorTableRowOperationId,
  type ArctorTableRowCreateRequest,
} from "@/components/tables/arctor-row-create-contract";

export type ValueObjectTableCreateRole = "intermediate" | "leaf";

type ValueObjectSemanticRole = "root" | "intermediate" | "leaf";

export type ValueObjectTableCreateCandidate = {
  id?: string | null;
  usage_scope?: string | null;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  organizations?: { organization_name?: string | null } | null;
  object_kind?: string | null;
  node_role_code?: string | null;
  root_value_object_id?: string | null;
  parent_value_object_id?: string | null;
  branch_type_code?: string | null;
  canonical_key?: string | null;
  facet_code?: string | null;
  object_kind_code?: string | null;
  ontology_node_role_code?: string | null;
  scope_code?: string | null;
  origin_type_code?: string | null;
  definition_version?: number | null;
  visibility_code?: string | null;
  privacy_class_code?: string | null;
};

export type ValueObjectTableCreateDraft = {
  operationId: string;
  role: ValueObjectTableCreateRole;
  parentId: string;
  title: string;
  description: string;
  locale: string;
};

type ValueObjectCreateApiResponse = {
  ok?: boolean;
  error?: string;
  errorCode?: string | null;
  mode?: string;
  valueObject?: {
    id?: string;
    title?: string;
    facetCode?: string;
    objectKindCode?: string;
    nodeRoleCode?: string;
    parentValueObjectId?: string | null;
    rootValueObjectId?: string | null;
    statusCode?: string;
    visibilityCode?: string;
  };
};

type ValueObjectCatalogResponse = {
  ok?: boolean;
  valueObjects?: ValueObjectTableCreateCandidate[];
};

export type ValueObjectTableCreateResult = {
  row: ValueObjectTableCreateCandidate & { id: string };
  refreshed: boolean;
  warningCode: string | null;
};

function semanticRole(
  valueObject: ValueObjectTableCreateCandidate,
): ValueObjectSemanticRole {
  if (
    valueObject.ontology_node_role_code === "root" ||
    valueObject.ontology_node_role_code === "intermediate" ||
    valueObject.ontology_node_role_code === "leaf"
  ) {
    return valueObject.ontology_node_role_code;
  }

  if (
    valueObject.id &&
    valueObject.parent_value_object_id === null &&
    valueObject.root_value_object_id === valueObject.id
  ) {
    return "root";
  }

  if (valueObject.node_role_code === "activity_leaf") {
    return "leaf";
  }

  return "intermediate";
}

export function canCreateObservationObjectChildUnder(
  valueObject: ValueObjectTableCreateCandidate | null | undefined,
): valueObject is ValueObjectTableCreateCandidate & { id: string } {
  if (!valueObject?.id) {
    return false;
  }

  const role = semanticRole(valueObject);

  return Boolean(
    valueObject.scope_code === "actor" &&
      (valueObject.status === "draft" || valueObject.status === "active") &&
      valueObject.canonical_key?.trim() &&
      valueObject.branch_type_code?.trim() &&
      valueObject.root_value_object_id?.trim() &&
      (role === "root" || role === "intermediate"),
  );
}

export function canUseObservationObjectTableParent(
  valueObject: ValueObjectTableCreateCandidate | null | undefined,
  role: ValueObjectTableCreateRole,
): valueObject is ValueObjectTableCreateCandidate & { id: string } {
  if (!canCreateObservationObjectChildUnder(valueObject)) {
    return false;
  }

  const parentRole = semanticRole(valueObject);

  if (role === "leaf") {
    return parentRole === "intermediate";
  }

  return parentRole === "root" || parentRole === "intermediate";
}

export function getDefaultObservationObjectTableChildRole(
  parent: ValueObjectTableCreateCandidate | null | undefined,
): ValueObjectTableCreateRole | null {
  if (!canCreateObservationObjectChildUnder(parent)) {
    return null;
  }

  return semanticRole(parent) === "root" ? "intermediate" : "leaf";
}

export function createValueObjectTableDraft(input: {
  locale: string;
  preferredParent: ValueObjectTableCreateCandidate | null | undefined;
}): ValueObjectTableCreateDraft | null {
  const preferredParent = canCreateObservationObjectChildUnder(input.preferredParent)
    ? input.preferredParent
    : null;
  const defaultRole = getDefaultObservationObjectTableChildRole(preferredParent);

  if (!preferredParent || !defaultRole) {
    return null;
  }

  return {
    operationId: createArctorTableRowOperationId("vo-table-row"),
    role: defaultRole,
    parentId: preferredParent.id,
    title: "",
    description: "",
    locale: input.locale,
  };
}

function normalizeDraft(
  draft: ValueObjectTableCreateDraft,
  parent: ValueObjectTableCreateCandidate | null | undefined,
): ArctorTableRowCreateRequest<{
  role: ValueObjectTableCreateRole;
  parentId: string;
  title: string;
  description: string;
  locale: string;
}> {
  const title = draft.title.trim();
  const description = draft.description.trim();

  if (!title) {
    throw new Error("ROW_CREATE_TITLE_REQUIRED");
  }

  if (title.length > 180) {
    throw new Error("ROW_CREATE_TITLE_TOO_LONG");
  }

  if (description.length > 4000) {
    throw new Error("ROW_CREATE_DESCRIPTION_TOO_LONG");
  }

  if (!canUseObservationObjectTableParent(parent, draft.role)) {
    throw new Error("ROW_CREATE_PARENT_INVALID");
  }

  if (parent.id !== draft.parentId) {
    throw new Error("ROW_CREATE_PARENT_CHANGED");
  }

  return {
    operationId: draft.operationId,
    source: "toolbar",
    placement: { kind: "child", parentRowKey: parent.id },
    historyPolicy: "domain_managed",
    draft: {
      role: draft.role,
      parentId: parent.id,
      title,
      description,
      locale: draft.locale,
    },
  };
}

function creationMode(role: ValueObjectTableCreateRole) {
  return role === "leaf"
    ? "leaf_branch_active_v4"
    : "intermediate_branch_active_v4";
}

function createFallbackRow(input: {
  request: ReturnType<typeof normalizeDraft>;
  response: ValueObjectCreateApiResponse;
  createdId: string;
}): ValueObjectTableCreateCandidate & { id: string } {
  const card = input.response.valueObject;
  const role = input.request.draft.role;

  return {
    id: input.createdId,
    usage_scope: "private",
    title: input.request.draft.title,
    description:
      input.request.draft.description || input.request.draft.title,
    status: card?.statusCode ?? "active",
    object_kind_code: card?.objectKindCode ?? null,
    ontology_node_role_code: card?.nodeRoleCode ?? role,
    root_value_object_id: card?.rootValueObjectId ?? null,
    parent_value_object_id:
      card?.parentValueObjectId ?? input.request.draft.parentId,
    branch_type_code: null,
    canonical_key: null,
    facet_code: card?.facetCode ?? null,
    scope_code: "actor",
    origin_type_code: "user_declared",
    definition_version: 1,
    visibility_code: card?.visibilityCode ?? "private",
    privacy_class_code: "standard",
  };
}

async function reloadCreatedRow(
  createdId: string,
  locale: string,
): Promise<(ValueObjectTableCreateCandidate & { id: string }) | null> {
  const searchParams = new URLSearchParams();
  searchParams.set("locale", locale);
  const response = await fetch(`/api/value-objects?${searchParams.toString()}`, {
    method: "GET",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response
    .json()
    .catch(() => null)) as ValueObjectCatalogResponse | null;
  const row = payload?.valueObjects?.find((candidate) => candidate.id === createdId);

  return row?.id ? (row as ValueObjectTableCreateCandidate & { id: string }) : null;
}

export async function createObservationObjectFromTable(input: {
  draft: ValueObjectTableCreateDraft;
  parent: ValueObjectTableCreateCandidate | null | undefined;
}): Promise<ValueObjectTableCreateResult> {
  const request = normalizeDraft(input.draft, input.parent);
  const expectedMode = creationMode(request.draft.role);
  const response = await fetch("/api/value-objects", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      creationMode: expectedMode,
      parentValueObjectId: request.draft.parentId,
      title: request.draft.title,
      description: request.draft.description || null,
      locale: request.draft.locale,
      idempotencyKey: request.operationId,
    }),
  });
  const payload = (await response
    .json()
    .catch(() => null)) as ValueObjectCreateApiResponse | null;

  if (!response.ok || payload?.ok !== true) {
    throw new Error(
      payload?.errorCode || payload?.error || `ROW_CREATE_HTTP_${response.status}`,
    );
  }

  const createdId = payload.valueObject?.id?.trim();
  if (!createdId) {
    throw new Error("ROW_CREATE_RESPONSE_ID_MISSING");
  }

  const fallbackRow = createFallbackRow({
    request,
    response: payload,
    createdId,
  });
  let refreshedRow: (ValueObjectTableCreateCandidate & { id: string }) | null = null;

  try {
    refreshedRow = await reloadCreatedRow(createdId, request.draft.locale);
  } catch {
    refreshedRow = null;
  }

  const warningCode =
    payload.mode !== expectedMode
      ? "ROW_CREATE_RESPONSE_MODE_MISMATCH"
      : refreshedRow
        ? null
        : "ROW_CREATE_CATALOG_REFRESH_FAILED";

  return {
    row: refreshedRow ?? fallbackRow,
    refreshed: Boolean(refreshedRow),
    warningCode,
  };
}

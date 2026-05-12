    import { supabase } from "../supabase";
import {
  type ActionTypeRow,
  type ContextRow,
  type ContextualCategoryOption,
  type EntityClassificationRow,
  type EntityType,
  type GetContextualCategoryResult,
  type IsoTimestamp,
  type ObjectActionLookupInput,
  type ObjectActionStatus,
  type ObjectTypeRow,
  type ResolveContextualCategoryResult,
  type ResolvedObjectActionCategory,
  type Uuid,
  mapContextualCategoryResultToOption,
  mapResolvedCategoryResult,
} from "./types";

export type ObjectActionQueryError = {
  message: string;
  code?: string;
  details?: string;
};

export type ObjectActionQueryResult<T> = {
  data: T;
  error: ObjectActionQueryError | null;
};

export type ObjectActionOption = {
  id: Uuid;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
};

export type ContextOption = ObjectActionOption;

export type ObjectTypeOption = ObjectActionOption & {
  objectClassId: Uuid;
};

export type ActionTypeOption = ObjectActionOption;

export type ActionForObjectTypeOption = ActionTypeOption & {
  affordanceId: Uuid;
  contextId: Uuid | null;
  contextCode: string | null;
  isDefault: boolean;
  affordanceNotes: string | null;
};

export type EntityClassificationOption = {
  id: Uuid;
  entityType: EntityType;
  entityId: Uuid;
  objectTypeId: Uuid;
  actionTypeId: Uuid | null;
  contextId: Uuid;
  contextualCategoryId: Uuid | null;
  classificationRole: EntityClassificationRow["classification_role"];
  isPrimary: boolean;
  confidence: number | null;
  status: ObjectActionStatus;
  sourceType: EntityClassificationRow["source_type"];
  notes: string | null;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
};

type SupabaseErrorLike = {
  message?: string;
  code?: string;
  details?: string;
};

type GetContextsInput = {
  status?: ObjectActionStatus[];
  includeInactive?: boolean;
};

type GetObjectTypesInput = {
  status?: ObjectActionStatus[];
  includeInactive?: boolean;
  objectClassId?: Uuid;
};

type GetActionsForObjectTypeInput = {
  objectTypeCode: string;
  contextCode?: string | null;
  status?: ObjectActionStatus[];
};

type GetContextualCategoriesInput = {
  contextCode?: string | null;
  languageCode?: string;
};

type GetEntityClassificationsInput = {
  entityType: EntityType;
  entityId: Uuid;
  contextCode?: string | null;
  status?: ObjectActionStatus[];
};

type ContextualCategoryVisibilityRow = {
  id: Uuid;
  status: ObjectActionStatus;
  is_active: boolean;
};

const DEFAULT_PUBLIC_STATUSES: ObjectActionStatus[] = [
  "approved",
  "published",
];

function normalizeError(error: unknown): ObjectActionQueryError {
  const maybeError = error as SupabaseErrorLike;

  return {
    message: maybeError.message ?? "Unknown Object-Action query error",
    code: maybeError.code,
    details: maybeError.details,
  };
}

function logObjectActionError(context: string, error: unknown) {
  const normalizedError = normalizeError(error);

  console.error("[objectAction]", context, {
    message: normalizedError.message,
    code: normalizedError.code,
  });
}

function ok<T>(data: T): ObjectActionQueryResult<T> {
  return {
    data,
    error: null,
  };
}

function fail<T>(fallbackData: T, error: unknown): ObjectActionQueryResult<T> {
  return {
    data: fallbackData,
    error: normalizeError(error),
  };
}

function normalizeCode(value: string) {
  return value.trim();
}

function mapContextRowToOption(row: ContextRow): ContextOption {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    sortOrder: row.sort_order,
  };
}

function mapObjectTypeRowToOption(row: ObjectTypeRow): ObjectTypeOption {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    sortOrder: row.sort_order,
    objectClassId: row.object_class_id,
  };
}

function mapActionTypeRowToOption(row: ActionTypeRow): ActionTypeOption {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    sortOrder: row.sort_order,
  };
}

function mapEntityClassificationRowToOption(
  row: EntityClassificationRow
): EntityClassificationOption {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    objectTypeId: row.object_type_id,
    actionTypeId: row.action_type_id,
    contextId: row.context_id,
    contextualCategoryId: row.contextual_category_id,
    classificationRole: row.classification_role,
    isPrimary: row.is_primary,
    confidence: row.confidence,
    status: row.status,
    sourceType: row.source_type,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getContexts(
  input: GetContextsInput = {}
): Promise<ObjectActionQueryResult<ContextOption[]>> {
  const statuses = input.status ?? DEFAULT_PUBLIC_STATUSES;

  try {
    let query = supabase
      .from("contexts")
      .select(
        "id, code, name, description, status, source_type, sort_order, is_active, created_at, updated_at"
      )
      .in("status", statuses)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (!input.includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      logObjectActionError("getContexts", error);
      return fail([], error);
    }

    const rows = (data ?? []) as ContextRow[];

    return ok(rows.map(mapContextRowToOption));
  } catch (error) {
    logObjectActionError("getContexts unexpected", error);
    return fail([], error);
  }
}

export async function getObjectTypes(
  input: GetObjectTypesInput = {}
): Promise<ObjectActionQueryResult<ObjectTypeOption[]>> {
  const statuses = input.status ?? DEFAULT_PUBLIC_STATUSES;

  try {
    let query = supabase
      .from("object_types")
      .select(
        "id, object_class_id, code, name, description, status, source_type, sort_order, is_active, created_at, updated_at"
      )
      .in("status", statuses)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (!input.includeInactive) {
      query = query.eq("is_active", true);
    }

    if (input.objectClassId) {
      query = query.eq("object_class_id", input.objectClassId);
    }

    const { data, error } = await query;

    if (error) {
      logObjectActionError("getObjectTypes", error);
      return fail([], error);
    }

    const rows = (data ?? []) as ObjectTypeRow[];

    return ok(rows.map(mapObjectTypeRowToOption));
  } catch (error) {
    logObjectActionError("getObjectTypes unexpected", error);
    return fail([], error);
  }
}

export async function getActionsForObjectType(
  input: GetActionsForObjectTypeInput
): Promise<ObjectActionQueryResult<ActionForObjectTypeOption[]>> {
  const statuses = input.status ?? DEFAULT_PUBLIC_STATUSES;
  const objectTypeCode = normalizeCode(input.objectTypeCode);
  const contextCode = input.contextCode ? normalizeCode(input.contextCode) : null;

  if (!objectTypeCode) {
    return ok([]);
  }

  try {
    const { data: objectTypeData, error: objectTypeError } = await supabase
      .from("object_types")
      .select(
        "id, object_class_id, code, name, description, status, source_type, sort_order, is_active, created_at, updated_at"
      )
      .eq("code", objectTypeCode)
      .in("status", statuses)
      .eq("is_active", true)
      .maybeSingle();

    if (objectTypeError) {
      logObjectActionError("getActionsForObjectType object type", objectTypeError);
      return fail([], objectTypeError);
    }

    const objectType = objectTypeData as ObjectTypeRow | null;

    if (!objectType) {
      return ok([]);
    }

    let contextId: Uuid | null = null;

    if (contextCode) {
      const { data: contextData, error: contextError } = await supabase
        .from("contexts")
        .select(
          "id, code, name, description, status, source_type, sort_order, is_active, created_at, updated_at"
        )
        .eq("code", contextCode)
        .in("status", statuses)
        .eq("is_active", true)
        .maybeSingle();

      if (contextError) {
        logObjectActionError("getActionsForObjectType context", contextError);
        return fail([], contextError);
      }

      const context = contextData as ContextRow | null;

      if (!context) {
        return ok([]);
      }

      contextId = context.id;
    }

    let affordanceQuery = supabase
      .from("object_action_affordances")
      .select(
        "id, object_type_id, action_type_id, context_id, is_default, status, source_type, notes, created_at, updated_at"
      )
      .eq("object_type_id", objectType.id)
      .in("status", statuses)
      .order("is_default", { ascending: false });

    if (contextId) {
      affordanceQuery = affordanceQuery.eq("context_id", contextId);
    }

    const { data: affordanceData, error: affordanceError } =
      await affordanceQuery;

    if (affordanceError) {
      logObjectActionError("getActionsForObjectType affordances", affordanceError);
      return fail([], affordanceError);
    }

    const affordances =
      (affordanceData ?? []) as {
        id: Uuid;
        action_type_id: Uuid;
        context_id: Uuid | null;
        is_default: boolean;
        notes: string | null;
      }[];

    const actionTypeIds = Array.from(
      new Set(affordances.map((item) => item.action_type_id))
    );

    if (actionTypeIds.length === 0) {
      return ok([]);
    }

    const { data: actionData, error: actionError } = await supabase
      .from("action_types")
      .select(
        "id, code, name, description, status, source_type, sort_order, is_active, created_at, updated_at"
      )
      .in("id", actionTypeIds)
      .in("status", statuses)
      .eq("is_active", true);

    if (actionError) {
      logObjectActionError("getActionsForObjectType actions", actionError);
      return fail([], actionError);
    }

    const actionRows = (actionData ?? []) as ActionTypeRow[];
    const actionById = new Map(actionRows.map((row) => [row.id, row]));

    const contextIds = Array.from(
      new Set(
        affordances
          .map((item) => item.context_id)
          .filter((item): item is Uuid => Boolean(item))
      )
    );

    const contextCodeById = new Map<Uuid, string>();

    if (contextIds.length > 0) {
      const { data: contextRows } = await supabase
        .from("contexts")
        .select(
          "id, code, name, description, status, source_type, sort_order, is_active, created_at, updated_at"
        )
        .in("id", contextIds);

      for (const row of ((contextRows ?? []) as ContextRow[])) {
        contextCodeById.set(row.id, row.code);
      }
    }

    const options = affordances
      .map((affordance) => {
        const action = actionById.get(affordance.action_type_id);

        if (!action) {
          return null;
        }

        return {
          ...mapActionTypeRowToOption(action),
          affordanceId: affordance.id,
          contextId: affordance.context_id,
          contextCode: affordance.context_id
            ? contextCodeById.get(affordance.context_id) ?? null
            : null,
          isDefault: affordance.is_default,
          affordanceNotes: affordance.notes,
        };
      })
      .filter(
        (item): item is ActionForObjectTypeOption => item !== null
      )
      .sort((left, right) => {
        if (left.sortOrder !== right.sortOrder) {
          return left.sortOrder - right.sortOrder;
        }

        return left.name.localeCompare(right.name);
      });

    return ok(options);
  } catch (error) {
    logObjectActionError("getActionsForObjectType unexpected", error);
    return fail([], error);
  }
}

export async function getContextualCategories(
  input: GetContextualCategoriesInput = {}
): Promise<ObjectActionQueryResult<ContextualCategoryOption[]>> {
  try {
    const { data, error } = await supabase.rpc("get_contextual_categories", {
      p_context_code: input.contextCode ?? null,
      p_language_code: input.languageCode ?? "en",
    });

    if (error) {
      logObjectActionError("getContextualCategories", error);
      return fail([], error);
    }

    const rows = (data ?? []) as GetContextualCategoryResult[];

    return ok(rows.map(mapContextualCategoryResultToOption));
  } catch (error) {
    logObjectActionError("getContextualCategories unexpected", error);
    return fail([], error);
  }
}

export async function resolveContextualCategory(
  input: ObjectActionLookupInput
): Promise<ObjectActionQueryResult<ResolvedObjectActionCategory[]>> {
  try {
    const { data, error } = await supabase.rpc("resolve_contextual_category", {
      p_object_type_code: input.objectTypeCode,
      p_action_type_code: input.actionTypeCode,
      p_context_code: input.contextCode,
      p_language_code: input.languageCode ?? "en",
    });

    if (error) {
      logObjectActionError("resolveContextualCategory", error);
      return fail([], error);
    }

    const rows = (data ?? []) as ResolveContextualCategoryResult[];

    return ok(rows.map(mapResolvedCategoryResult));
  } catch (error) {
    logObjectActionError("resolveContextualCategory unexpected", error);
    return fail([], error);
  }
}

export async function getEntityClassifications(
  input: GetEntityClassificationsInput
): Promise<ObjectActionQueryResult<EntityClassificationOption[]>> {
  const statuses = input.status ?? DEFAULT_PUBLIC_STATUSES;

  try {
    let query = supabase
      .from("entity_classifications")
      .select(
        "id, entity_type, entity_id, object_type_id, action_type_id, context_id, contextual_category_id, classification_role, is_primary, confidence, status, source_type, classified_by_user_id, evidence_json, notes, created_at, updated_at"
      )
      .eq("entity_type", input.entityType)
      .eq("entity_id", input.entityId)
      .in("status", statuses)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });

    if (input.contextCode) {
      const { data: contextData, error: contextError } = await supabase
        .from("contexts")
        .select(
          "id, code, name, description, status, source_type, sort_order, is_active, created_at, updated_at"
        )
        .eq("code", normalizeCode(input.contextCode))
        .in("status", statuses)
        .eq("is_active", true)
        .maybeSingle();

      if (contextError) {
        logObjectActionError("getEntityClassifications context", contextError);
        return fail([], contextError);
      }

      const context = contextData as ContextRow | null;

      if (!context) {
        return ok([]);
      }

      query = query.eq("context_id", context.id);
    }

    const { data, error } = await query;

    if (error) {
      logObjectActionError("getEntityClassifications", error);
      return fail([], error);
    }

    const rows = (data ?? []) as EntityClassificationRow[];

    const contextualCategoryIds = Array.from(
      new Set(
        rows
          .map((row) => row.contextual_category_id)
          .filter((value): value is Uuid => Boolean(value))
      )
    );

    if (contextualCategoryIds.length === 0) {
      return ok(rows.map(mapEntityClassificationRowToOption));
    }

    const { data: categoryData, error: categoryError } = await supabase
      .from("contextual_categories")
      .select("id, status, is_active")
      .in("id", contextualCategoryIds)
      .in("status", statuses)
      .eq("is_active", true);

    if (categoryError) {
      logObjectActionError(
        "getEntityClassifications contextual categories",
        categoryError
      );
      return fail([], categoryError);
    }

    const visibleCategoryRows =
      (categoryData ?? []) as ContextualCategoryVisibilityRow[];

    const visibleCategoryIds = new Set(
      visibleCategoryRows.map((category) => category.id)
    );

    const visibleRows = rows.filter((row) => {
      if (!row.contextual_category_id) {
        return true;
      }

      return visibleCategoryIds.has(row.contextual_category_id);
    });

    return ok(visibleRows.map(mapEntityClassificationRowToOption));
  } catch (error) {
    logObjectActionError("getEntityClassifications unexpected", error);
    return fail([], error);
  }
}
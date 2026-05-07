export const OBJECT_ACTION_STATUSES = [
  "draft",
  "suggested",
  "needs_review",
  "approved",
  "published",
  "hidden",
  "flagged",
  "rejected",
  "archived",
] as const;

export type ObjectActionStatus = (typeof OBJECT_ACTION_STATUSES)[number];

export const OBJECT_ACTION_SOURCE_TYPES = [
  "system_seed",
  "manual",
  "ai_suggested",
  "imported",
  "migrated",
  "owner_confirmed",
  "platform_verified",
] as const;

export type ObjectActionSourceType =
  (typeof OBJECT_ACTION_SOURCE_TYPES)[number];

export const ENTITY_CLASSIFICATION_ROLES = [
  "primary",
  "secondary",
  "tag",
  "system",
  "ai_suggestion",
  "owner_selected",
  "admin_selected",
] as const;

export type EntityClassificationRole =
  (typeof ENTITY_CLASSIFICATION_ROLES)[number];

export const CONCEPT_TYPES = [
  "object_class",
  "object_type",
  "action_type",
  "context",
  "contextual_category",
] as const;

export type ConceptType = (typeof CONCEPT_TYPES)[number];

export const KNOWN_ENTITY_TYPES = [
  "organization",
  "person",
  "value_object",
  "offer",
  "offer_item",
  "certificate",
  "purchase_confirmation",
  "points_transaction",
  "activity",
  "task",
  "health_metric",
  "food_entry",
  "exercise",
  "learning_item",
  "learning_session",
  "finance_event",
  "project",
  "note",
] as const;

export type KnownEntityType = (typeof KNOWN_ENTITY_TYPES)[number];

export type EntityType = KnownEntityType | (string & {});

export type Uuid = string;
export type IsoTimestamp = string;
export type LocaleCode = string;

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export type JsonObject = {
  [key: string]: JsonValue;
};

export type ObjectClassRow = {
  id: Uuid;
  code: string;
  name: string;
  description: string | null;
  status: ObjectActionStatus;
  source_type: ObjectActionSourceType;
  sort_order: number;
  is_active: boolean;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
};

export type ObjectTypeRow = {
  id: Uuid;
  object_class_id: Uuid;
  code: string;
  name: string;
  description: string | null;
  status: ObjectActionStatus;
  source_type: ObjectActionSourceType;
  sort_order: number;
  is_active: boolean;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
};

export type ActionTypeRow = {
  id: Uuid;
  code: string;
  name: string;
  description: string | null;
  status: ObjectActionStatus;
  source_type: ObjectActionSourceType;
  sort_order: number;
  is_active: boolean;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
};

export type ContextRow = {
  id: Uuid;
  code: string;
  name: string;
  description: string | null;
  status: ObjectActionStatus;
  source_type: ObjectActionSourceType;
  sort_order: number;
  is_active: boolean;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
};

export type ObjectActionAffordanceRow = {
  id: Uuid;
  object_type_id: Uuid;
  action_type_id: Uuid;
  context_id: Uuid | null;
  is_default: boolean;
  status: ObjectActionStatus;
  source_type: ObjectActionSourceType;
  notes: string | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
};

export type ContextualCategoryRow = {
  id: Uuid;
  context_id: Uuid;
  parent_id: Uuid | null;
  slug: string;
  name: string;
  description: string | null;
  status: ObjectActionStatus;
  source_type: ObjectActionSourceType;
  sort_order: number;
  is_active: boolean;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
};

export type EntityClassificationRow = {
  id: Uuid;
  entity_type: EntityType;
  entity_id: Uuid;
  object_type_id: Uuid;
  action_type_id: Uuid | null;
  context_id: Uuid;
  contextual_category_id: Uuid | null;
  classification_role: EntityClassificationRole;
  is_primary: boolean;
  confidence: number | null;
  status: ObjectActionStatus;
  source_type: ObjectActionSourceType;
  classified_by_user_id: Uuid | null;
  evidence_json: JsonObject;
  notes: string | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
};

export type ObjectTypeTranslationRow = {
  id: Uuid;
  object_type_id: Uuid;
  locale: LocaleCode;
  name: string;
  description: string | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
};

export type ActionTypeTranslationRow = {
  id: Uuid;
  action_type_id: Uuid;
  locale: LocaleCode;
  name: string;
  description: string | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
};

export type ContextTranslationRow = {
  id: Uuid;
  context_id: Uuid;
  locale: LocaleCode;
  name: string;
  description: string | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
};

export type ContextualCategoryTranslationRow = {
  id: Uuid;
  contextual_category_id: Uuid;
  locale: LocaleCode;
  name: string;
  description: string | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
};

export type ConceptAliasRow = {
  id: Uuid;
  concept_type: ConceptType;
  concept_id: Uuid;
  alias_text: string;
  alias_normalized: string;
  locale: LocaleCode | null;
  status: ObjectActionStatus;
  source_type: ObjectActionSourceType;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
};

export type ObjectActionContextualCategoryRow = {
  id: Uuid;
  affordance_id: Uuid;
  contextual_category_id: Uuid;
  is_default: boolean;
  status: ObjectActionStatus;
  source_type: ObjectActionSourceType;
  notes: string | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
};

export type PublicContextualCategoryViewRow = {
  category_id: Uuid;
  context_id: Uuid;
  context_code: string;
  context_default_name: string;
  parent_id: Uuid | null;
  parent_slug: string | null;
  parent_default_name: string | null;
  category_slug: string;
  category_default_name: string;
  category_default_description: string | null;
  status: ObjectActionStatus;
  source_type: ObjectActionSourceType;
  sort_order: number;
  is_active: boolean;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
};

export type DirectoryContextualCategoryViewRow = {
  category_id: Uuid;
  context_id: Uuid;
  context_code: string;
  parent_id: Uuid | null;
  parent_slug: string | null;
  parent_default_name: string | null;
  category_slug: string;
  category_default_name: string;
  category_default_description: string | null;
  status: ObjectActionStatus;
  source_type: ObjectActionSourceType;
  sort_order: number;
  is_active: boolean;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
};

export type GetContextualCategoryResult = {
  category_id: Uuid;
  context_id: Uuid;
  context_code: string;
  parent_id: Uuid | null;
  parent_slug: string | null;
  category_slug: string;
  default_name: string;
  default_description: string | null;
  display_name: string;
  display_description: string | null;
  locale_used: LocaleCode | "default";
  status: ObjectActionStatus;
  source_type: ObjectActionSourceType;
  sort_order: number;
};

export type ResolveContextualCategoryResult = {
  object_type_id: Uuid;
  object_type_code: string;
  object_type_name: string;
  action_type_id: Uuid;
  action_type_code: string;
  action_type_name: string;
  context_id: Uuid;
  context_code: string;
  context_name: string;
  affordance_id: Uuid | null;
  is_affordance_allowed: boolean;
  category_id: Uuid;
  category_slug: string;
  default_name: string;
  display_name: string;
  locale_used: LocaleCode | "default";
  resolution_mode:
    | "mapped_affordance_category"
    | "fallback_context_categories"
    | "context_categories_for_allowed_affordance"
    | (string & {});
};

export type ContextualCategoryOption = {
  id: Uuid;
  slug: string;
  name: string;
  description: string | null;
  contextCode: string;
  parentId: Uuid | null;
  parentSlug: string | null;
  localeUsed: LocaleCode | "default";
  sortOrder: number;
};

export type ResolvedObjectActionCategory = {
  objectTypeCode: string;
  actionTypeCode: string;
  contextCode: string;
  isAffordanceAllowed: boolean;
  categoryId: Uuid;
  categorySlug: string;
  displayName: string;
  localeUsed: LocaleCode | "default";
  resolutionMode: ResolveContextualCategoryResult["resolution_mode"];
};

export type EntityClassificationInput = {
  entityType: EntityType;
  entityId: Uuid;
  objectTypeId: Uuid;
  actionTypeId?: Uuid | null;
  contextId: Uuid;
  contextualCategoryId?: Uuid | null;
  classificationRole?: EntityClassificationRole;
  isPrimary?: boolean;
  confidence?: number | null;
  status?: ObjectActionStatus;
  sourceType?: ObjectActionSourceType;
  evidenceJson?: JsonObject;
  notes?: string | null;
};

export type ObjectActionLookupInput = {
  objectTypeCode: string;
  actionTypeCode: string;
  contextCode: string;
  languageCode?: LocaleCode;
};

export function isObjectActionStatus(
  value: string
): value is ObjectActionStatus {
  return OBJECT_ACTION_STATUSES.includes(value as ObjectActionStatus);
}

export function isObjectActionSourceType(
  value: string
): value is ObjectActionSourceType {
  return OBJECT_ACTION_SOURCE_TYPES.includes(value as ObjectActionSourceType);
}

export function isEntityClassificationRole(
  value: string
): value is EntityClassificationRole {
  return ENTITY_CLASSIFICATION_ROLES.includes(
    value as EntityClassificationRole
  );
}

export function isConceptType(value: string): value is ConceptType {
  return CONCEPT_TYPES.includes(value as ConceptType);
}

export function isKnownEntityType(value: string): value is KnownEntityType {
  return KNOWN_ENTITY_TYPES.includes(value as KnownEntityType);
}

export function mapContextualCategoryResultToOption(
  row: GetContextualCategoryResult
): ContextualCategoryOption {
  return {
    id: row.category_id,
    slug: row.category_slug,
    name: row.display_name,
    description: row.display_description,
    contextCode: row.context_code,
    parentId: row.parent_id,
    parentSlug: row.parent_slug,
    localeUsed: row.locale_used,
    sortOrder: row.sort_order,
  };
}

export function mapResolvedCategoryResult(
  row: ResolveContextualCategoryResult
): ResolvedObjectActionCategory {
  return {
    objectTypeCode: row.object_type_code,
    actionTypeCode: row.action_type_code,
    contextCode: row.context_code,
    isAffordanceAllowed: row.is_affordance_allowed,
    categoryId: row.category_id,
    categorySlug: row.category_slug,
    displayName: row.display_name,
    localeUsed: row.locale_used,
    resolutionMode: row.resolution_mode,
  };
}
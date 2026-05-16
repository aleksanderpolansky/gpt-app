import type { SupabaseClient } from "@supabase/supabase-js";

type GenericRow = Record<string, unknown>;

type KnownTemplateRubricatorClassificationRule = {
  ruleKey: string;
  templateSlug: string;
  objectTypeCode: string;
  actionTypeCode: string;
  contextCode: string;
  contextualCategorySlug: string;
  classificationRole: "primary";
  isPrimary: boolean;
  confidence: number;
};

const ACTIVITY_EVENT_ENTITY_TYPE = "activity_event";

const HELPER_NAME =
  "activityRubricatorClassificationLifecycle.ensureActivityEventRubricatorClassificationForKnownTemplate";

const HELPER_VERSION = "p4_7_8_r_f1";

const KNOWN_TEMPLATE_RULES: KnownTemplateRubricatorClassificationRule[] = [
  {
    ruleKey: "german_marketing_handwriting_practice_to_business_german",
    templateSlug: "german-marketing-handwriting-practice",
    objectTypeCode: "German_language",
    actionTypeCode: "practice",
    contextCode: "learning",
    contextualCategorySlug: "business-german",
    classificationRole: "primary",
    isPrimary: true,
    confidence: 1,
  },
];

export type EnsureActivityEventRubricatorClassificationForKnownTemplateInput = {
  supabase: SupabaseClient;
  eventId: string;
  userId: string;
  activityTemplateId?: string | null;
  templateSlug?: string | null;
  processorName: string;
};

export type EnsureActivityEventRubricatorClassificationForKnownTemplateResult = {
  ok: boolean;
  skipped: boolean;
  skipReason: string | null;
  eventId: string;
  userId: string;
  activityTemplateId: string | null;
  templateSlug: string | null;
  ruleKey: string | null;
  classificationId: string | null;
  classificationStatus: string | null;
  created: boolean;
  alreadyExisted: boolean;
  errors: string[];
  metadata: Record<string, unknown>;
};

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function getString(row: GenericRow | null | undefined, key: string): string | null {
  if (!row) {
    return null;
  }

  return asTrimmedString(row[key]);
}

function getBoolean(row: GenericRow | null | undefined, key: string): boolean | null {
  if (!row) {
    return null;
  }

  const value = row[key];

  return typeof value === "boolean" ? value : null;
}

function normalizeKey(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown rubricator classification lifecycle error.";
  }
}

function getErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const maybeCode = (error as { code?: unknown }).code;

  return typeof maybeCode === "string" ? maybeCode : null;
}

function createBaseResult(
  input: EnsureActivityEventRubricatorClassificationForKnownTemplateInput
): EnsureActivityEventRubricatorClassificationForKnownTemplateResult {
  return {
    ok: false,
    skipped: false,
    skipReason: null,
    eventId: input.eventId,
    userId: input.userId,
    activityTemplateId: input.activityTemplateId ?? null,
    templateSlug: input.templateSlug ?? null,
    ruleKey: null,
    classificationId: null,
    classificationStatus: null,
    created: false,
    alreadyExisted: false,
    errors: [],
    metadata: {
      helper: HELPER_NAME,
      helperVersion: HELPER_VERSION,
      processorName: input.processorName,
    },
  };
}

function findRuleForTemplateSlug(
  templateSlug: string | null
): KnownTemplateRubricatorClassificationRule | null {
  const normalizedTemplateSlug = normalizeKey(templateSlug);

  if (!normalizedTemplateSlug) {
    return null;
  }

  return (
    KNOWN_TEMPLATE_RULES.find(
      (rule) => normalizeKey(rule.templateSlug) === normalizedTemplateSlug
    ) ?? null
  );
}

async function resolveTemplateSlug(input: {
  supabase: SupabaseClient;
  activityTemplateId: string | null;
  explicitTemplateSlug: string | null;
}): Promise<{
  templateSlug: string | null;
  errorMessage: string | null;
}> {
  const explicitTemplateSlug = asTrimmedString(input.explicitTemplateSlug);

  if (explicitTemplateSlug) {
    return {
      templateSlug: explicitTemplateSlug,
      errorMessage: null,
    };
  }

  if (!input.activityTemplateId) {
    return {
      templateSlug: null,
      errorMessage: null,
    };
  }

  const { data, error } = await input.supabase
    .from("activity_templates")
    .select("id, slug")
    .eq("id", input.activityTemplateId)
    .maybeSingle();

  if (error) {
    return {
      templateSlug: null,
      errorMessage: error.message,
    };
  }

  return {
    templateSlug: getString(data as GenericRow | null, "slug"),
    errorMessage: null,
  };
}

async function readLookupRow(input: {
  supabase: SupabaseClient;
  tableName: "object_types" | "action_types" | "contexts";
  code: string;
}): Promise<{
  row: GenericRow | null;
  errorMessage: string | null;
}> {
  const { data, error } = await input.supabase
    .from(input.tableName)
    .select("id, code, name, status, is_active")
    .ilike("code", input.code)
    .maybeSingle();

  if (error) {
    return {
      row: null,
      errorMessage: error.message,
    };
  }

  return {
    row: (data as GenericRow | null) ?? null,
    errorMessage: null,
  };
}

async function readContextualCategory(input: {
  supabase: SupabaseClient;
  contextId: string;
  slug: string;
}): Promise<{
  row: GenericRow | null;
  errorMessage: string | null;
}> {
  const { data, error } = await input.supabase
    .from("contextual_categories")
    .select("id, context_id, slug, name, status, is_active")
    .eq("context_id", input.contextId)
    .ilike("slug", input.slug)
    .maybeSingle();

  if (error) {
    return {
      row: null,
      errorMessage: error.message,
    };
  }

  return {
    row: (data as GenericRow | null) ?? null,
    errorMessage: null,
  };
}

function validateApprovedActiveLookupRow(input: {
  row: GenericRow | null;
  label: string;
  expectedCodeOrSlug: string;
}): string | null {
  if (!input.row) {
    return `${input.label} '${input.expectedCodeOrSlug}' was not found.`;
  }

  const status = getString(input.row, "status");
  const isActive = getBoolean(input.row, "is_active");

  if (status !== "approved" && status !== "published") {
    return `${input.label} '${input.expectedCodeOrSlug}' has unsupported status '${status}'.`;
  }

  if (isActive === false) {
    return `${input.label} '${input.expectedCodeOrSlug}' is not active.`;
  }

  return null;
}

async function readExistingClassification(input: {
  supabase: SupabaseClient;
  eventId: string;
  objectTypeId: string;
  actionTypeId: string;
  contextId: string;
  contextualCategoryId: string;
  classificationRole: string;
}): Promise<{
  row: GenericRow | null;
  errorMessage: string | null;
}> {
  const { data, error } = await input.supabase
    .from("entity_classifications")
    .select(
      [
        "id",
        "entity_type",
        "entity_id",
        "object_type_id",
        "action_type_id",
        "context_id",
        "contextual_category_id",
        "classification_role",
        "is_primary",
        "confidence",
        "status",
        "source_type",
        "evidence_json",
        "created_at",
        "updated_at",
      ].join(", ")
    )
    .eq("entity_type", ACTIVITY_EVENT_ENTITY_TYPE)
    .eq("entity_id", input.eventId)
    .eq("object_type_id", input.objectTypeId)
    .eq("action_type_id", input.actionTypeId)
    .eq("context_id", input.contextId)
    .eq("contextual_category_id", input.contextualCategoryId)
    .eq("classification_role", input.classificationRole)
    .maybeSingle();

  if (error) {
    return {
      row: null,
      errorMessage: error.message,
    };
  }

  return {
    row: (data as GenericRow | null) ?? null,
    errorMessage: null,
  };
}

/**
 * Ensures deterministic approved Object-Action classification for known activity templates.
 *
 * Important:
 * - This helper does not use AI.
 * - This helper does not use text fallback.
 * - This helper does not create Value Objects or Value Object Instances.
 * - It only creates a safe approved entity_classification for known templates.
 * - Value Object creation/processing remains delegated to activityValueObjectLifecycle/valueObjectBridge.
 */
export async function ensureActivityEventRubricatorClassificationForKnownTemplate(
  input: EnsureActivityEventRubricatorClassificationForKnownTemplateInput
): Promise<EnsureActivityEventRubricatorClassificationForKnownTemplateResult> {
  const result = createBaseResult(input);

  try {
    const { templateSlug, errorMessage: templateSlugError } =
      await resolveTemplateSlug({
        supabase: input.supabase,
        activityTemplateId: input.activityTemplateId ?? null,
        explicitTemplateSlug: input.templateSlug ?? null,
      });

    result.templateSlug = templateSlug;

    if (templateSlugError) {
      result.errors.push(templateSlugError);
      return result;
    }

    const rule = findRuleForTemplateSlug(templateSlug);

    if (!rule) {
      result.ok = true;
      result.skipped = true;
      result.skipReason = "no_known_template_rubricator_classification_rule";
      return result;
    }

    result.ruleKey = rule.ruleKey;
    result.metadata = {
      ...result.metadata,
      rule,
    };

    const [objectTypeResult, actionTypeResult, contextResult] =
      await Promise.all([
        readLookupRow({
          supabase: input.supabase,
          tableName: "object_types",
          code: rule.objectTypeCode,
        }),
        readLookupRow({
          supabase: input.supabase,
          tableName: "action_types",
          code: rule.actionTypeCode,
        }),
        readLookupRow({
          supabase: input.supabase,
          tableName: "contexts",
          code: rule.contextCode,
        }),
      ]);

    for (const lookupError of [
      objectTypeResult.errorMessage,
      actionTypeResult.errorMessage,
      contextResult.errorMessage,
    ]) {
      if (lookupError) {
        result.errors.push(lookupError);
      }
    }

    if (result.errors.length > 0) {
      return result;
    }

    const objectTypeValidationError = validateApprovedActiveLookupRow({
      row: objectTypeResult.row,
      label: "object_type",
      expectedCodeOrSlug: rule.objectTypeCode,
    });

    const actionTypeValidationError = validateApprovedActiveLookupRow({
      row: actionTypeResult.row,
      label: "action_type",
      expectedCodeOrSlug: rule.actionTypeCode,
    });

    const contextValidationError = validateApprovedActiveLookupRow({
      row: contextResult.row,
      label: "context",
      expectedCodeOrSlug: rule.contextCode,
    });

    for (const validationError of [
      objectTypeValidationError,
      actionTypeValidationError,
      contextValidationError,
    ]) {
      if (validationError) {
        result.errors.push(validationError);
      }
    }

    if (result.errors.length > 0) {
      return result;
    }

    const objectTypeId = getString(objectTypeResult.row, "id");
    const actionTypeId = getString(actionTypeResult.row, "id");
    const contextId = getString(contextResult.row, "id");

    if (!objectTypeId || !actionTypeId || !contextId) {
      result.errors.push("Failed to resolve required rubricator lookup IDs.");
      return result;
    }

    const contextualCategoryResult = await readContextualCategory({
      supabase: input.supabase,
      contextId,
      slug: rule.contextualCategorySlug,
    });

    if (contextualCategoryResult.errorMessage) {
      result.errors.push(contextualCategoryResult.errorMessage);
      return result;
    }

    const contextualCategoryValidationError = validateApprovedActiveLookupRow({
      row: contextualCategoryResult.row,
      label: "contextual_category",
      expectedCodeOrSlug: rule.contextualCategorySlug,
    });

    if (contextualCategoryValidationError) {
      result.errors.push(contextualCategoryValidationError);
      return result;
    }

    const contextualCategoryId = getString(contextualCategoryResult.row, "id");

    if (!contextualCategoryId) {
      result.errors.push("Failed to resolve contextual_category ID.");
      return result;
    }

    const existingClassification = await readExistingClassification({
      supabase: input.supabase,
      eventId: input.eventId,
      objectTypeId,
      actionTypeId,
      contextId,
      contextualCategoryId,
      classificationRole: rule.classificationRole,
    });

    if (existingClassification.errorMessage) {
      result.errors.push(existingClassification.errorMessage);
      return result;
    }

    if (existingClassification.row) {
      const existingStatus = getString(existingClassification.row, "status");

      result.ok = existingStatus === "approved";
      result.skipped = existingStatus !== "approved";
      result.skipReason =
        existingStatus === "approved"
          ? null
          : "existing_non_approved_classification";
      result.classificationId = getString(existingClassification.row, "id");
      result.classificationStatus = existingStatus;
      result.created = false;
      result.alreadyExisted = true;
      result.metadata = {
        ...result.metadata,
        existingClassification: existingClassification.row,
      };

      return result;
    }

    const evidenceJson = {
      p4_step: "P4.7.8-R-F1",
      helper: HELPER_NAME,
      helperVersion: HELPER_VERSION,
      processorName: input.processorName,
      purpose: "deterministic known-template activity_event classification before production value object bridge",
      eventId: input.eventId,
      userId: input.userId,
      activityTemplateId: input.activityTemplateId ?? null,
      templateSlug,
      ruleKey: rule.ruleKey,
      object_type_code: rule.objectTypeCode,
      action_type_code: rule.actionTypeCode,
      context_code: rule.contextCode,
      contextual_category_slug: rule.contextualCategorySlug,
      expected_mapper_rule: "german_business_writing_practice_duration",
    };

    const { data: insertedData, error: insertError } = await input.supabase
      .from("entity_classifications")
      .insert({
        entity_type: ACTIVITY_EVENT_ENTITY_TYPE,
        entity_id: input.eventId,
        object_type_id: objectTypeId,
        action_type_id: actionTypeId,
        context_id: contextId,
        contextual_category_id: contextualCategoryId,
        classification_role: rule.classificationRole,
        is_primary: rule.isPrimary,
        confidence: rule.confidence,
        status: "approved",
        source_type: "system_seed",
        classified_by_user_id: input.userId,
        evidence_json: evidenceJson,
        notes:
          "Deterministic known-template classification created by P4.7.8-R helper before production Value Object bridge.",
      })
      .select(
        [
          "id",
          "entity_type",
          "entity_id",
          "classification_role",
          "is_primary",
          "confidence",
          "status",
          "source_type",
          "evidence_json",
          "created_at",
          "updated_at",
        ].join(", ")
      )
      .single();

    if (insertError) {
      if (getErrorCode(insertError) === "23505") {
        const duplicateFallback = await readExistingClassification({
          supabase: input.supabase,
          eventId: input.eventId,
          objectTypeId,
          actionTypeId,
          contextId,
          contextualCategoryId,
          classificationRole: rule.classificationRole,
        });

        if (duplicateFallback.row) {
          const duplicateStatus = getString(duplicateFallback.row, "status");

          result.ok = duplicateStatus === "approved";
          result.skipped = duplicateStatus !== "approved";
          result.skipReason =
            duplicateStatus === "approved"
              ? null
              : "duplicate_existing_non_approved_classification";
          result.classificationId = getString(duplicateFallback.row, "id");
          result.classificationStatus = duplicateStatus;
          result.created = false;
          result.alreadyExisted = true;
          result.metadata = {
            ...result.metadata,
            duplicateFallback: duplicateFallback.row,
          };

          return result;
        }
      }

      result.errors.push(insertError.message);
      return result;
    }

    const insertedRow = (insertedData as unknown as GenericRow | null) ?? null;

    result.ok = true;
    result.skipped = false;
    result.skipReason = null;
    result.classificationId = getString(insertedRow, "id");
    result.classificationStatus = getString(insertedRow, "status");
    result.created = true;
    result.alreadyExisted = false;
    result.metadata = {
      ...result.metadata,
      insertedClassification: insertedRow,
    };

    return result;
  } catch (error) {
    result.errors.push(normalizeErrorMessage(error));
    return result;
  }
}


import type { SupabaseClient } from "@supabase/supabase-js";

import type { ValueObjectBridgeMapping } from "./valueObjectBridge";

type GenericRow = Record<string, unknown>;

type ActivityEventForRubricatorMapping = {
  id: string;
  user_id: string;
  status: string;
  title: string | null;
  description: string | null;
  input_text: string | null;
  event_code: string | null;
  duration_minutes: number | null;
  started_at: string | null;
  ended_at: string | null;
  activity_template_id: string | null;
  activity_type_id: string | null;
  template_id: string | null;
  performed_by_actor_id: string | null;
  acting_as_actor_id: string | null;
  acting_for_actor_id: string | null;
};

export type RubricatorClassificationSummary = {
  classificationId: string;
  entityType: string | null;
  entityId: string | null;
  objectTypeId: string | null;
  objectTypeCode: string | null;
  objectTypeName: string | null;
  actionTypeId: string | null;
  actionTypeCode: string | null;
  actionTypeName: string | null;
  contextId: string | null;
  contextCode: string | null;
  contextName: string | null;
  contextualCategoryId: string | null;
  contextualCategorySlug: string | null;
  contextualCategoryName: string | null;
  classificationRole: string | null;
  isPrimary: boolean;
  confidence: number | null;
  status: string | null;
  sourceType: string | null;
  evidence: Record<string, unknown>;
};

export type ResolveValueObjectMappingsFromRubricatorInput = {
  supabase: SupabaseClient;
  eventId: string;
  allowNonCompletedEvent?: boolean;
  createMissingControlledValueObject?: boolean;
  allowControlledTextFallback?: boolean;
};

export type RubricatorValueObjectMappingResult = {
  ok: boolean;
  skipped: boolean;
  skipReason: string | null;
  eventId: string;
  eventStatus: string | null;
  classificationSummary: RubricatorClassificationSummary[];
  mappings: ValueObjectBridgeMapping[];
  errors: string[];
};

const CONTROLLED_VALUE_OBJECT_TITLE = "Business German writing practice";
const CONTROLLED_VALUE_OBJECT_TYPE = "skill";

function getString(row: GenericRow | null | undefined, key: string): string | null {
  if (!row) {
    return null;
  }

  const value = row[key];

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function getBoolean(row: GenericRow | null | undefined, key: string): boolean {
  if (!row) {
    return false;
  }

  return row[key] === true;
}

function getNumber(row: GenericRow | null | undefined, key: string): number | null {
  if (!row) {
    return null;
  }

  const value = row[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getObject(row: GenericRow | null | undefined, key: string): Record<string, unknown> {
  if (!row) {
    return {};
  }

  const value = row[key];

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function normalizeConfidence(value: number | null): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0.75;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").toLowerCase();
}

function joinSearchText(parts: Array<string | null | undefined>): string {
  return parts
    .map((item) => normalizeText(item))
    .filter((item) => item.length > 0)
    .join(" ");
}

function includesAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

function isApprovedActivityEventClassification(row: GenericRow): boolean {
  const entityType = getString(row, "entity_type");
  const status = getString(row, "status");

  return (
    (entityType === "activity_event" || entityType === "activity_events") &&
    status === "approved"
  );
}

async function readActivityEvent(
  supabase: SupabaseClient,
  eventId: string
): Promise<{
  event: ActivityEventForRubricatorMapping | null;
  errorMessage: string | null;
}> {
  const { data, error } = await supabase
    .from("activity_events")
    .select(
      [
        "id",
        "user_id",
        "status",
        "title",
        "description",
        "input_text",
        "event_code",
        "duration_minutes",
        "started_at",
        "ended_at",
        "activity_template_id",
        "activity_type_id",
        "template_id",
        "performed_by_actor_id",
        "acting_as_actor_id",
        "acting_for_actor_id",
      ].join(", ")
    )
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    return {
      event: null,
      errorMessage: error.message,
    };
  }

  return {
    event: (data as ActivityEventForRubricatorMapping | null) ?? null,
    errorMessage: null,
  };
}

async function readEntityClassifications(
  supabase: SupabaseClient,
  eventId: string
): Promise<{
  rows: GenericRow[];
  errorMessage: string | null;
}> {
  const { data, error } = await supabase
    .from("entity_classifications")
    .select("*")
    .eq("entity_id", eventId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return {
      rows: [],
      errorMessage: error.message,
    };
  }

  const rows = ((data as GenericRow[] | null) ?? []).filter(
    isApprovedActivityEventClassification
  );

  return {
    rows,
    errorMessage: null,
  };
}

async function readLookupRow(
  supabase: SupabaseClient,
  tableName:
    | "object_types"
    | "action_types"
    | "contexts"
    | "contextual_categories",
  id: string | null
): Promise<GenericRow | null> {
  if (!id) {
    return null;
  }

  const { data, error } = await supabase
    .from(tableName)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as GenericRow;
}

async function summarizeClassification(
  supabase: SupabaseClient,
  row: GenericRow
): Promise<RubricatorClassificationSummary> {
  const objectTypeId = getString(row, "object_type_id");
  const actionTypeId = getString(row, "action_type_id");
  const contextId = getString(row, "context_id");
  const contextualCategoryId = getString(row, "contextual_category_id");

  const [objectType, actionType, context, contextualCategory] =
    await Promise.all([
      readLookupRow(supabase, "object_types", objectTypeId),
      readLookupRow(supabase, "action_types", actionTypeId),
      readLookupRow(supabase, "contexts", contextId),
      readLookupRow(supabase, "contextual_categories", contextualCategoryId),
    ]);

  return {
    classificationId: getString(row, "id") ?? "",
    entityType: getString(row, "entity_type"),
    entityId: getString(row, "entity_id"),
    objectTypeId,
    objectTypeCode: getString(objectType, "code"),
    objectTypeName: getString(objectType, "name"),
    actionTypeId,
    actionTypeCode: getString(actionType, "code"),
    actionTypeName: getString(actionType, "name"),
    contextId,
    contextCode: getString(context, "code"),
    contextName: getString(context, "name"),
    contextualCategoryId,
    contextualCategorySlug: getString(contextualCategory, "slug"),
    contextualCategoryName: getString(contextualCategory, "name"),
    classificationRole: getString(row, "classification_role"),
    isPrimary: getBoolean(row, "is_primary"),
    confidence: getNumber(row, "confidence"),
    status: getString(row, "status"),
    sourceType: getString(row, "source_type"),
    evidence: getObject(row, "evidence_json"),
  };
}

function isControlledGermanWritingPractice(
  event: ActivityEventForRubricatorMapping,
  classification: RubricatorClassificationSummary | null,
  allowTextFallback: boolean
): boolean {
  const classificationText = classification
    ? joinSearchText([
        classification.objectTypeCode,
        classification.objectTypeName,
        classification.actionTypeCode,
        classification.actionTypeName,
        classification.contextCode,
        classification.contextName,
        classification.contextualCategorySlug,
        classification.contextualCategoryName,
      ])
    : "";

  const eventText = allowTextFallback
    ? joinSearchText([
        event.title,
        event.description,
        event.input_text,
        event.event_code,
      ])
    : "";

  const haystack = joinSearchText([classificationText, eventText]);

  const hasGerman = includesAny(haystack, [
    "german",
    "deutsch",
    "немец",
    "niemieck",
    "alemán",
  ]);

  const hasPracticeOrWriting = includesAny(haystack, [
    "practice",
    "practise",
    "learn",
    "learning",
    "write",
    "writing",
    "handwriting",
    "schrift",
    "schreiben",
    "üben",
    "marketing",
    "b2b",
    "business",
  ]);

  const hasLearningCareerContext = includesAny(haystack, [
    "learning",
    "education",
    "career",
    "work",
    "business",
    "marketing",
    "communication",
    "language",
    "skill",
    "język",
    "idioma",
  ]);

  return hasGerman && hasPracticeOrWriting && hasLearningCareerContext;
}

async function findControlledValueObject(
  supabase: SupabaseClient,
  event: ActivityEventForRubricatorMapping
): Promise<{
  valueObjectId: string | null;
  errorMessage: string | null;
}> {
  const ownerActorId =
    event.acting_as_actor_id ?? event.performed_by_actor_id ?? null;

  let query = supabase
    .from("value_objects")
    .select("id")
    .eq("title", CONTROLLED_VALUE_OBJECT_TITLE)
    .eq("value_type", CONTROLLED_VALUE_OBJECT_TYPE)
    .eq("status", "active")
    .is("organization_id", null)
    .limit(1);

  if (ownerActorId) {
    query = query.eq("owner_actor_id", ownerActorId);
  } else {
    query = query.is("owner_actor_id", null);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    return {
      valueObjectId: null,
      errorMessage: error.message,
    };
  }

  return {
    valueObjectId: getString(data as GenericRow | null, "id"),
    errorMessage: null,
  };
}

async function createControlledValueObject(
  supabase: SupabaseClient,
  event: ActivityEventForRubricatorMapping
): Promise<{
  valueObjectId: string | null;
  errorMessage: string | null;
}> {
  const ownerActorId =
    event.acting_as_actor_id ?? event.performed_by_actor_id ?? null;

  const { data, error } = await supabase
    .from("value_objects")
    .insert({
      owner_actor_id: ownerActorId,
      organization_id: null,
      value_type: CONTROLLED_VALUE_OBJECT_TYPE,
      title: CONTROLLED_VALUE_OBJECT_TITLE,
      description:
        "Controlled P4.7-R value object for German business/marketing writing practice.",
      unit_type: "minutes",
      default_price: null,
      default_currency: null,
      default_duration_minutes: event.duration_minutes,
      is_marketplace_sellable: false,
      is_free_possible: false,
      status: "active",
    })
    .select("id")
    .single();

  if (error) {
    return {
      valueObjectId: null,
      errorMessage: error.message,
    };
  }

  return {
    valueObjectId: getString(data as GenericRow | null, "id"),
    errorMessage: null,
  };
}

async function findOrCreateControlledValueObject(
  supabase: SupabaseClient,
  event: ActivityEventForRubricatorMapping,
  createMissing: boolean
): Promise<{
  valueObjectId: string | null;
  created: boolean;
  errorMessage: string | null;
}> {
  const existing = await findControlledValueObject(supabase, event);

  if (existing.errorMessage) {
    return {
      valueObjectId: null,
      created: false,
      errorMessage: existing.errorMessage,
    };
  }

  if (existing.valueObjectId) {
    return {
      valueObjectId: existing.valueObjectId,
      created: false,
      errorMessage: null,
    };
  }

  if (!createMissing) {
    return {
      valueObjectId: null,
      created: false,
      errorMessage: "controlled_value_object_missing",
    };
  }

  const created = await createControlledValueObject(supabase, event);

  return {
    valueObjectId: created.valueObjectId,
    created: Boolean(created.valueObjectId),
    errorMessage: created.errorMessage,
  };
}

function buildControlledMapping(
  event: ActivityEventForRubricatorMapping,
  valueObjectId: string,
  classification: RubricatorClassificationSummary | null,
  valueObjectCreated: boolean
): ValueObjectBridgeMapping | null {
  if (event.duration_minutes === null) {
    return null;
  }

  const confidence = normalizeConfidence(classification?.confidence ?? null);

  return {
    valueObjectId,
    relationType: "executes",
    weight: 1,
    confidence,
    source: "rule",
    instanceStatus: "completed",
    instanceTitle: event.title ?? CONTROLLED_VALUE_OBJECT_TITLE,
    instanceNote: event.description ?? event.input_text,
    resultStatus: "completed",
    qualityScore: null,
    metricKey: "duration_minutes",
    metricUnit: "minutes",
    deltaValueNumeric: event.duration_minutes,
    deltaValueText: null,
    deltaDirection: "increase",
    aggregateDate: null,
    aggregateType: "value_object",
    aggregateKey: valueObjectId,
    metadata: {
      mapper: "rubricatorValueObjectMapper",
      mapperVersion: "p4_7_3_r",
      controlledRule: "german_business_writing_practice_duration",
      valueObjectCreated,
      classification,
    },
  };
}

export async function resolveValueObjectMappingsFromRubricatorForActivityEvent(
  input: ResolveValueObjectMappingsFromRubricatorInput
): Promise<RubricatorValueObjectMappingResult> {
  const {
    supabase,
    eventId,
    allowNonCompletedEvent = false,
    createMissingControlledValueObject = false,
    allowControlledTextFallback = false,
  } = input;

  const result: RubricatorValueObjectMappingResult = {
    ok: false,
    skipped: false,
    skipReason: null,
    eventId,
    eventStatus: null,
    classificationSummary: [],
    mappings: [],
    errors: [],
  };

  const { event, errorMessage: eventError } = await readActivityEvent(
    supabase,
    eventId
  );

  if (eventError) {
    result.errors.push(eventError);
    return result;
  }

  if (!event) {
    result.errors.push("Activity event not found.");
    return result;
  }

  result.eventStatus = event.status;

  if (!allowNonCompletedEvent && event.status !== "completed") {
    result.ok = true;
    result.skipped = true;
    result.skipReason = `event_status_${event.status}_not_completed`;
    return result;
  }

  const { rows: classificationRows, errorMessage: classificationError } =
    await readEntityClassifications(supabase, eventId);

  if (classificationError) {
    result.errors.push(classificationError);
    return result;
  }

  const summaries = await Promise.all(
    classificationRows.map((row) => summarizeClassification(supabase, row))
  );

  result.classificationSummary = summaries;

  if (summaries.length === 0 && !allowControlledTextFallback) {
    result.ok = true;
    result.skipped = true;
    result.skipReason = "no_approved_activity_event_classification";
    return result;
  }

  const matchedClassification =
    summaries.find((summary) =>
      isControlledGermanWritingPractice(event, summary, false)
    ) ?? null;

  const shouldUseTextFallback =
    !matchedClassification &&
    allowControlledTextFallback &&
    isControlledGermanWritingPractice(event, null, true);

  if (!matchedClassification && !shouldUseTextFallback) {
    result.ok = true;
    result.skipped = true;
    result.skipReason = "no_controlled_rubricator_value_object_mapping";
    return result;
  }

  const valueObjectResult = await findOrCreateControlledValueObject(
    supabase,
    event,
    createMissingControlledValueObject
  );

  if (valueObjectResult.errorMessage) {
    result.ok = true;
    result.skipped = true;
    result.skipReason = valueObjectResult.errorMessage;
    return result;
  }

  if (!valueObjectResult.valueObjectId) {
    result.ok = true;
    result.skipped = true;
    result.skipReason = "controlled_value_object_missing";
    return result;
  }

  const mapping = buildControlledMapping(
    event,
    valueObjectResult.valueObjectId,
    matchedClassification,
    valueObjectResult.created
  );

  if (!mapping) {
    result.ok = true;
    result.skipped = true;
    result.skipReason = "event_duration_missing_for_controlled_mapping";
    return result;
  }

  result.mappings = [mapping];
  result.ok = true;

  return result;
}


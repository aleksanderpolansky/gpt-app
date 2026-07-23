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

type ControlledRubricatorValueObjectRule = {
  ruleKey: string;
  valueObjectTitle: string;
  valueObjectType: string;
  valueObjectDescription: string;
  valueObjectUnitType: string;
  defaultDurationMinutes: number | null;
  objectTypeCode: string;
  actionTypeCode: string;
  contextCode: string;
  contextualCategorySlug: string;
  relationType: ValueObjectBridgeMapping["relationType"];
  metricKey: string;
  metricUnit: string;
  deltaDirection: ValueObjectBridgeMapping["deltaDirection"];
  aggregateType: string;
  fallbackNeedleGroups: string[][];
};

const CONTROLLED_RUBRICATOR_VALUE_OBJECT_RULES: readonly ControlledRubricatorValueObjectRule[] = [
  {
    ruleKey: "german_business_writing_practice_duration",
    valueObjectTitle: "Business German writing practice",
    valueObjectType: "skill",
    valueObjectDescription:
      "Controlled P4.7-R value object for German business/marketing writing practice.",
    valueObjectUnitType: "minutes",
    defaultDurationMinutes: 25,
    objectTypeCode: "German_language",
    actionTypeCode: "practice",
    contextCode: "learning",
    contextualCategorySlug: "business-german",
    relationType: "executes",
    metricKey: "duration_minutes",
    metricUnit: "minutes",
    deltaDirection: "increase",
    aggregateType: "value_object",
    fallbackNeedleGroups: [
      ["german", "deutsch", "немец", "niemieck", "alemán"],
      [
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
      ],
      [
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
      ],
    ],
  },
  {
    ruleKey: "knee_training_health_practice_duration",
    valueObjectTitle: "Knee training practice",
    valueObjectType: "health_activity",
    valueObjectDescription:
      "Controlled P4.7.8-R-L5 value object for knee-focused exercise/training activity tracking. No medical diagnosis or treatment claim.",
    valueObjectUnitType: "minutes",
    defaultDurationMinutes: 10,
    objectTypeCode: "knee",
    actionTypeCode: "train",
    contextCode: "health",
    contextualCategorySlug: "knee-exercises",
    relationType: "executes",
    metricKey: "duration_minutes",
    metricUnit: "minutes",
    deltaDirection: "increase",
    aggregateType: "value_object",
    fallbackNeedleGroups: [
      ["knee", "колено", "kolano", "rodilla", "knie"],
      [
        "train",
        "training",
        "exercise",
        "mobility",
        "practice",
        "ćwiczenie",
        "ćwiczenia",
        "entrenamiento",
        "ejercicio",
        "übung",
        "training",
      ],
      ["health", "body", "rehab", "recovery", "load", "здоров", "salud", "gesundheit"],
    ],
  },
  {
    ruleKey: "walking_to_work_duration",
    valueObjectTitle: "Walking to work",
    valueObjectType: "health_activity",
    valueObjectDescription:
      "Controlled P4.10.0-C6 free-text value object for walking to work / commuting on foot. No medical diagnosis or treatment claim.",
    valueObjectUnitType: "minutes",
    defaultDurationMinutes: 15,
    objectTypeCode: "walking",
    actionTypeCode: "walk",
    contextCode: "commute",
    contextualCategorySlug: "walking-to-work",
    relationType: "executes",
    metricKey: "duration_minutes",
    metricUnit: "minutes",
    deltaDirection: "increase",
    aggregateType: "value_object",
    fallbackNeedleGroups: [
      [
        "walk",
        "walking",
        "walked",
        "foot",
        "on foot",
        "пешком",
        "pieszo",
        "caminar",
        "andando",
        "zu fuss",
      ],
      [
        "work",
        "job",
        "office",
        "commute",
        "commuting",
        "работ",
        "praca",
        "trabajo",
        "oficina",
        "arbeit",
        "buro",
        "buero",
      ],
    ],
  },
];

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

function normalizeKey(value: string | null | undefined): string {
  return normalizeText(value).trim();
}

function joinSearchText(parts: Array<string | null | undefined>): string {
  return parts
    .map((item) => normalizeText(item))
    .filter((item) => item.length > 0)
    .join(" ");
}

function includesAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle.toLowerCase()));
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

function classificationMatchesRule(
  classification: RubricatorClassificationSummary,
  rule: ControlledRubricatorValueObjectRule
): boolean {
  return (
    normalizeKey(classification.objectTypeCode) === normalizeKey(rule.objectTypeCode) &&
    normalizeKey(classification.actionTypeCode) === normalizeKey(rule.actionTypeCode) &&
    normalizeKey(classification.contextCode) === normalizeKey(rule.contextCode) &&
    normalizeKey(classification.contextualCategorySlug) ===
      normalizeKey(rule.contextualCategorySlug)
  );
}

function classificationSearchText(
  classification: RubricatorClassificationSummary | null
): string {
  if (!classification) {
    return "";
  }

  return joinSearchText([
    classification.objectTypeCode,
    classification.objectTypeName,
    classification.actionTypeCode,
    classification.actionTypeName,
    classification.contextCode,
    classification.contextName,
    classification.contextualCategorySlug,
    classification.contextualCategoryName,
  ]);
}

function eventSearchText(event: ActivityEventForRubricatorMapping): string {
  return joinSearchText([
    event.title,
    event.description,
    event.input_text,
    event.event_code,
  ]);
}

function eventOrClassificationMatchesFallbackRule(
  event: ActivityEventForRubricatorMapping,
  classification: RubricatorClassificationSummary | null,
  rule: ControlledRubricatorValueObjectRule,
  allowTextFallback: boolean
): boolean {
  const haystack = joinSearchText([
    classificationSearchText(classification),
    allowTextFallback ? eventSearchText(event) : "",
  ]);

  if (!haystack) {
    return false;
  }

  return rule.fallbackNeedleGroups.every((needleGroup) =>
    includesAny(haystack, needleGroup)
  );
}

function findControlledRubricatorValueObjectRule(input: {
  event: ActivityEventForRubricatorMapping;
  summaries: RubricatorClassificationSummary[];
  allowTextFallback: boolean;
}): {
  rule: ControlledRubricatorValueObjectRule;
  classification: RubricatorClassificationSummary | null;
} | null {
  for (const summary of input.summaries) {
    const exactRule = CONTROLLED_RUBRICATOR_VALUE_OBJECT_RULES.find((rule) =>
      classificationMatchesRule(summary, rule)
    );

    if (exactRule) {
      return {
        rule: exactRule,
        classification: summary,
      };
    }
  }

  if (!input.allowTextFallback) {
    return null;
  }

  const fallbackRule = CONTROLLED_RUBRICATOR_VALUE_OBJECT_RULES.find((rule) =>
    eventOrClassificationMatchesFallbackRule(
      input.event,
      null,
      rule,
      input.allowTextFallback
    )
  );

  if (!fallbackRule) {
    return null;
  }

  return {
    rule: fallbackRule,
    classification: null,
  };
}

async function findControlledValueObject(
  supabase: SupabaseClient,
  event: ActivityEventForRubricatorMapping,
  rule: ControlledRubricatorValueObjectRule
): Promise<{
  valueObjectId: string | null;
  errorMessage: string | null;
}> {
  const ownerActorId =
    event.acting_as_actor_id ?? event.performed_by_actor_id ?? null;

  if (!event.user_id || !ownerActorId) {
    return {
      valueObjectId: null,
      errorMessage: "controlled_value_object_owner_context_missing",
    };
  }

  let query = supabase
    .from("value_objects")
    .select("id")
    .eq("owner_user_id", event.user_id)
    .eq("owner_actor_id", ownerActorId)
    .eq("title", rule.valueObjectTitle)
    .eq("value_type", rule.valueObjectType)
    .eq("status", "active")
    .is("organization_id", null)
    .limit(1);

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
  event: ActivityEventForRubricatorMapping,
  rule: ControlledRubricatorValueObjectRule
): Promise<{
  valueObjectId: string | null;
  errorMessage: string | null;
}> {
  const ownerActorId =
    event.acting_as_actor_id ?? event.performed_by_actor_id ?? null;

  if (!event.user_id || !ownerActorId) {
    return {
      valueObjectId: null,
      errorMessage: "controlled_value_object_owner_context_missing",
    };
  }

  const { data, error } = await supabase
    .from("value_objects")
    .insert({
      owner_user_id: event.user_id,
      owner_actor_id: ownerActorId,
      created_by_actor_id: ownerActorId,
      actor_id: ownerActorId,
      app_user_id: event.user_id,
      organization_id: null,
      value_type: rule.valueObjectType,
      title: rule.valueObjectTitle,
      description: rule.valueObjectDescription,
      unit_type: rule.valueObjectUnitType,
      default_price: null,
      default_currency: null,
      default_duration_minutes:
        rule.defaultDurationMinutes ?? event.duration_minutes,
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
  rule: ControlledRubricatorValueObjectRule,
  createMissing: boolean
): Promise<{
  valueObjectId: string | null;
  created: boolean;
  errorMessage: string | null;
}> {
  const existing = await findControlledValueObject(supabase, event, rule);

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

  const created = await createControlledValueObject(supabase, event, rule);

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
  valueObjectCreated: boolean,
  rule: ControlledRubricatorValueObjectRule
): ValueObjectBridgeMapping | null {
  if (event.duration_minutes === null) {
    return null;
  }

  const confidence = normalizeConfidence(classification?.confidence ?? null);

  return {
    valueObjectId,
    relationType: rule.relationType,
    weight: 1,
    confidence,
    source: "rule",
    instanceStatus: "completed",
    instanceTitle: event.title ?? rule.valueObjectTitle,
    instanceNote: event.description ?? event.input_text,
    resultStatus: "completed",
    qualityScore: null,
    metricKey: rule.metricKey,
    metricUnit: rule.metricUnit,
    deltaValueNumeric: event.duration_minutes,
    deltaValueText: null,
    deltaDirection: rule.deltaDirection,
    aggregateDate: null,
    aggregateType: rule.aggregateType,
    aggregateKey: valueObjectId,
    metadata: {
      mapper: "rubricatorValueObjectMapper",
      mapperVersion: "p4_7_8_r_l5",
      controlledRule: rule.ruleKey,
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

  const ruleMatch = findControlledRubricatorValueObjectRule({
    event,
    summaries,
    allowTextFallback: allowControlledTextFallback,
  });

  if (!ruleMatch) {
    result.ok = true;
    result.skipped = true;
    result.skipReason = "no_controlled_rubricator_value_object_mapping";
    return result;
  }

  const valueObjectResult = await findOrCreateControlledValueObject(
    supabase,
    event,
    ruleMatch.rule,
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
    ruleMatch.classification,
    valueObjectResult.created,
    ruleMatch.rule
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

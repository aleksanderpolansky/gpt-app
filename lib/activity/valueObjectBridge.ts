import type { SupabaseClient } from "@supabase/supabase-js";

type BridgeSource =
  | "rule"
  | "manual"
  | "ai_draft"
  | "api"
  | "system"
  | "correction"
  | "commercial";

type V42ProjectionSource = "rule" | "ai" | "manual" | "system_seed" | "migration";

type ValueObjectCategoryRole =
  | "primary"
  | "semantic_component"
  | "context"
  | "object"
  | "action"
  | "goal"
  | "protocol"
  | "general_meaning"
  | "system_suggested";

type ValueObjectStateDeltaDirection =
  | "increase"
  | "decrease"
  | "neutral"
  | "set";

type ValueObjectInstanceStatus =
  | "draft"
  | "planned"
  | "active"
  | "completed"
  | "cancelled"
  | "archived";

type ActivityEventForValueObjectBridge = {
  id: string;
  user_id: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  title: string | null;
  description: string | null;
  performed_by_actor_id?: string | null;
  acting_as_actor_id?: string | null;
  acting_for_actor_id?: string | null;
};

type ContextualCategoryForLink = {
  id: string;
  slug: string | null;
  name: string | null;
  status: string | null;
  is_active: boolean | null;
};

type ExtractedCategoryLinkMetadata = {
  contextualCategoryId: string | null;
  contextualCategorySlug: string | null;
  contextualCategoryName: string | null;
  classificationRole: string | null;
  classificationId: string | null;
  contextId: string | null;
  contextCode: string | null;
  contextName: string | null;
  objectTypeId: string | null;
  objectTypeCode: string | null;
  objectTypeName: string | null;
  actionTypeId: string | null;
  actionTypeCode: string | null;
  actionTypeName: string | null;
  controlledRule: string | null;
  mapper: string | null;
  mapperVersion: string | null;
};

export type ValueObjectBridgeMapping = {
  valueObjectId: string;

  relationType?:
    | "executes"
    | "creates"
    | "uses"
    | "supports"
    | "consumes"
    | "updates_state"
    | "commercial_source"
    | "related_to";

  weight?: number;
  confidence?: number;
  source?: BridgeSource;

  instanceStatus?: ValueObjectInstanceStatus;
  instanceTitle?: string | null;
  instanceNote?: string | null;
  resultStatus?: string | null;
  qualityScore?: number | null;

  metricKey: string;
  metricUnit?: string | null;
  deltaValueNumeric?: number | null;
  deltaValueText?: string | null;
  deltaDirection?: ValueObjectStateDeltaDirection;

  aggregateDate?: string | null;
  aggregateType?: string;
  aggregateKey?: string;

  metadata?: Record<string, unknown>;
};

export type AdditionalValueObjectCategoryLink = {
  /**
   * C8-P additive optional category-link contract.
   *
   * This type is intentionally optional and is not used unless a caller passes
   * additionalCategoryLinks into processValueObjectBridge().
   */
  categoryId: string;
  categoryTable?: "contextual_categories";
  categoryRole?: ValueObjectCategoryRole;
  source?: V42ProjectionSource;
  confidence?: number | null;

  derivationRunId?: string | null;
  activityCategoryDerivationId?: string | null;
  activityEventId?: string | null;

  candidateSlug: string;
  candidateTitle?: string | null;
  semanticLayer?: string | null;
  categoryType?: string | null;
  resolutionStatus?: string | null;

  metadata?: Record<string, unknown>;
};

export type ProcessValueObjectBridgeInput = {
  supabase: SupabaseClient;
  eventId: string;
  mappings: ValueObjectBridgeMapping[];
  source?: BridgeSource;
  allowNonCompletedEvent?: boolean;
  processorName?: string;

  /**
   * C8-P additive optional input.
   *
   * When absent, existing bridge behavior must remain unchanged.
   * Runtime handling is intentionally implemented in a later checkpoint.
   */
  additionalCategoryLinks?: AdditionalValueObjectCategoryLink[];
};

export type ValueObjectBridgeCreatedItem = {
  valueObjectId: string;
  valueObjectInstanceId: string | null;
  linkId: string | null;
  stateDeltaId: string | null;
  aggregateId: string | null;
  snapshotId: string | null;

  /**
   * P4.9.1 additive v4.2 projection fields.
   *
   * These do not replace the old VOI pipeline:
   * - linkId still refers to activity_event_value_object_instance_links;
   * - activityEventValueObjectLinkId refers to the new direct v4.2 projection table;
   * - usageAggregateId refers to the new object-cloud/read-optimization aggregate.
   */
  activityEventValueObjectLinkId: string | null;
  usageAggregateId: string | null;
  v42ProjectionError: string | null;

  /**
   * P4.9.2 additive category bridge fields.
   *
   * These connect a derived Value Object to reliable category/rubricator metadata.
   * They do not replace VOI links, state deltas, aggregates, snapshots, or relation_type.
   */
  valueObjectCategoryLinkId: string | null;
  valueObjectCategoryLinkError: string | null;

  /**
   * C8-P additive Category Derivation category links.
   *
   * Empty unless additionalCategoryLinks is passed to the bridge.
   */
  additionalValueObjectCategoryLinks: Array<{
    valueObjectCategoryLinkId: string | null;
    categoryId: string;
    candidateSlug: string;
    errorMessage: string | null;
  }>;
  additionalValueObjectCategoryLinkErrors: string[];

  skipped: boolean;
  skipReason: string | null;
};

export type ProcessValueObjectBridgeResult = {
  ok: boolean;
  skipped: boolean;
  skipReason: string | null;
  eventId: string;
  eventStatus: string | null;
  mappingsRequested: number;
  created: ValueObjectBridgeCreatedItem[];
  errors: string[];
};

function clamp01(value: number | null | undefined, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

function normalizeSource(value: string | null | undefined): BridgeSource {
  const allowed: BridgeSource[] = [
    "rule",
    "manual",
    "ai_draft",
    "api",
    "system",
    "correction",
    "commercial",
  ];

  if (allowed.includes(value as BridgeSource)) {
    return value as BridgeSource;
  }

  return "rule";
}

function normalizeV42ProjectionSource(source: BridgeSource): V42ProjectionSource {
  if (source === "manual") {
    return "manual";
  }

  if (source === "ai_draft") {
    return "ai";
  }

  if (source === "system") {
    return "system_seed";
  }

  /*
   * The v4.2 projection/category tables currently allow:
   * rule | ai | manual | system_seed | migration
   *
   * Bridge-specific sources such as api/correction/commercial are kept in metadata,
   * while the table-level source remains rule-compatible.
   */
  return "rule";
}

function normalizeDeltaDirection(
  value: string | null | undefined
): ValueObjectStateDeltaDirection {
  const allowed: ValueObjectStateDeltaDirection[] = [
    "increase",
    "decrease",
    "neutral",
    "set",
  ];

  if (allowed.includes(value as ValueObjectStateDeltaDirection)) {
    return value as ValueObjectStateDeltaDirection;
  }

  return "neutral";
}

function normalizeRelationType(
  value: string | null | undefined
): NonNullable<ValueObjectBridgeMapping["relationType"]> {
  const allowed: NonNullable<ValueObjectBridgeMapping["relationType"]>[] = [
    "executes",
    "creates",
    "uses",
    "supports",
    "consumes",
    "updates_state",
    "commercial_source",
    "related_to",
  ];

  if (
    allowed.includes(value as NonNullable<ValueObjectBridgeMapping["relationType"]>)
  ) {
    return value as NonNullable<ValueObjectBridgeMapping["relationType"]>;
  }

  return "executes";
}

function normalizeCategoryRole(
  value: string | null | undefined
): ValueObjectCategoryRole {
  const allowed: ValueObjectCategoryRole[] = [
    "primary",
    "semantic_component",
    "context",
    "object",
    "action",
    "goal",
    "protocol",
    "general_meaning",
    "system_suggested",
  ];

  if (allowed.includes(value as ValueObjectCategoryRole)) {
    return value as ValueObjectCategoryRole;
  }

  return value === "primary" ? "primary" : "semantic_component";
}

function getDateFromEvent(event: ActivityEventForValueObjectBridge): string {
  const sourceDate = event.started_at ?? event.ended_at ?? new Date().toISOString();
  return sourceDate.slice(0, 10);
}

function getEventFirstUsedAt(event: ActivityEventForValueObjectBridge): string {
  return event.started_at ?? event.ended_at ?? new Date().toISOString();
}

function getEventLastUsedAt(event: ActivityEventForValueObjectBridge): string {
  return event.ended_at ?? event.started_at ?? new Date().toISOString();
}

function normalizeExposureMinutes(durationMinutes: number | null | undefined): number {
  if (typeof durationMinutes !== "number" || Number.isNaN(durationMinutes)) {
    return 0;
  }

  if (durationMinutes < 0) {
    return 0;
  }

  return durationMinutes;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  return fallback;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isUuid(value: string | null | undefined): value is string {
  if (!value) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function getSignedNumericDelta(
  value: number | null | undefined,
  direction: ValueObjectStateDeltaDirection
): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  if (direction === "decrease") {
    return -Math.abs(value);
  }

  if (direction === "increase") {
    return Math.abs(value);
  }

  return value;
}

function extractCategoryLinkMetadata(
  metadata: Record<string, unknown>
): ExtractedCategoryLinkMetadata {
  const classification = asRecord(metadata.classification) ?? {};

  return {
    contextualCategoryId: asString(classification.contextualCategoryId),
    contextualCategorySlug: asString(classification.contextualCategorySlug),
    contextualCategoryName: asString(classification.contextualCategoryName),
    classificationRole: asString(classification.classificationRole),
    classificationId: asString(classification.classificationId),
    contextId: asString(classification.contextId),
    contextCode: asString(classification.contextCode),
    contextName: asString(classification.contextName),
    objectTypeId: asString(classification.objectTypeId),
    objectTypeCode: asString(classification.objectTypeCode),
    objectTypeName: asString(classification.objectTypeName),
    actionTypeId: asString(classification.actionTypeId),
    actionTypeCode: asString(classification.actionTypeCode),
    actionTypeName: asString(classification.actionTypeName),
    controlledRule: asString(metadata.controlledRule),
    mapper: asString(metadata.mapper),
    mapperVersion: asString(metadata.mapperVersion),
  };
}

async function readActivityEvent(
  supabase: SupabaseClient,
  eventId: string
): Promise<{
  event: ActivityEventForValueObjectBridge | null;
  errorMessage: string | null;
}> {
  const { data, error } = await supabase
    .from("activity_events")
    .select(
      [
        "id",
        "user_id",
        "status",
        "started_at",
        "ended_at",
        "duration_minutes",
        "title",
        "description",
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
    event: (data as ActivityEventForValueObjectBridge | null) ?? null,
    errorMessage: null,
  };
}

async function readValueObjectOwnerContext(
  supabase: SupabaseClient,
  valueObjectId: string
): Promise<{
  ownerActorId: string | null;
  organizationId: string | null;
  errorMessage: string | null;
}> {
  const { data, error } = await supabase
    .from("value_objects")
    .select("id, owner_actor_id, organization_id")
    .eq("id", valueObjectId)
    .maybeSingle();

  if (error) {
    return {
      ownerActorId: null,
      organizationId: null,
      errorMessage: error.message,
    };
  }

  if (!data) {
    return {
      ownerActorId: null,
      organizationId: null,
      errorMessage: "Value object not found.",
    };
  }

  const row = data as {
    owner_actor_id: string | null;
    organization_id: string | null;
  };

  return {
    ownerActorId: row.owner_actor_id,
    organizationId: row.organization_id,
    errorMessage: null,
  };
}

async function readContextualCategoryForLink(
  supabase: SupabaseClient,
  contextualCategoryId: string
): Promise<{
  category: ContextualCategoryForLink | null;
  errorMessage: string | null;
}> {
  const { data, error } = await supabase
    .from("contextual_categories")
    .select("id, slug, name, status, is_active")
    .eq("id", contextualCategoryId)
    .maybeSingle();

  if (error) {
    return {
      category: null,
      errorMessage: error.message,
    };
  }

  if (!data) {
    return {
      category: null,
      errorMessage: null,
    };
  }

  return {
    category: data as ContextualCategoryForLink,
    errorMessage: null,
  };
}

async function readExistingStateDeltaForMapping(
  supabase: SupabaseClient,
  eventId: string,
  valueObjectId: string,
  metricKey: string
): Promise<{
  stateDeltaId: string | null;
  valueObjectInstanceId: string | null;
  errorMessage: string | null;
}> {
  const { data, error } = await supabase
    .from("value_object_state_deltas")
    .select("id, value_object_instance_id")
    .eq("event_id", eventId)
    .eq("value_object_id", valueObjectId)
    .eq("metric_key", metricKey)
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    return {
      stateDeltaId: null,
      valueObjectInstanceId: null,
      errorMessage: error.message,
    };
  }

  const rows =
    (data as Array<{
      id: string;
      value_object_instance_id: string | null;
    }> | null) ?? [];

  const firstRow = rows[0] ?? null;

  if (!firstRow) {
    return {
      stateDeltaId: null,
      valueObjectInstanceId: null,
      errorMessage: null,
    };
  }

  return {
    stateDeltaId: firstRow.id,
    valueObjectInstanceId: firstRow.value_object_instance_id,
    errorMessage: null,
  };
}

async function readExistingNumericValue(
  supabase: SupabaseClient,
  tableName: "value_object_daily_aggregates" | "value_object_state_snapshots",
  filters: Record<string, string>,
  valueColumn: "metric_value_numeric"
): Promise<number | null> {
  let query = supabase.from(tableName).select(valueColumn);

  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as Record<string, unknown>;
  const value = row[valueColumn];

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

async function readExistingV42ProjectionLink(
  supabase: SupabaseClient,
  eventId: string,
  valueObjectId: string,
  source: V42ProjectionSource
): Promise<{
  id: string | null;
  errorMessage: string | null;
}> {
  const { data, error } = await supabase
    .from("activity_event_value_object_links")
    .select("id")
    .eq("event_id", eventId)
    .eq("value_object_id", valueObjectId)
    .eq("source", source)
    .maybeSingle();

  if (error) {
    return {
      id: null,
      errorMessage: error.message,
    };
  }

  return {
    id: (data as { id: string } | null)?.id ?? null,
    errorMessage: null,
  };
}

async function readExistingV42UsageAggregate(
  supabase: SupabaseClient,
  userId: string,
  valueObjectId: string
): Promise<{
  id: string | null;
  usageCount: number;
  exposureMinutes: number;
  firstUsedAt: string | null;
  errorMessage: string | null;
}> {
  const { data, error } = await supabase
    .from("value_object_usage_aggregates")
    .select("id, usage_count, exposure_minutes, first_used_at")
    .eq("user_id", userId)
    .eq("value_object_id", valueObjectId)
    .maybeSingle();

  if (error) {
    return {
      id: null,
      usageCount: 0,
      exposureMinutes: 0,
      firstUsedAt: null,
      errorMessage: error.message,
    };
  }

  if (!data) {
    return {
      id: null,
      usageCount: 0,
      exposureMinutes: 0,
      firstUsedAt: null,
      errorMessage: null,
    };
  }

  const row = data as {
    id: string;
    usage_count: unknown;
    exposure_minutes: unknown;
    first_used_at: string | null;
  };

  return {
    id: row.id,
    usageCount: Math.max(0, Math.trunc(asNumber(row.usage_count, 0))),
    exposureMinutes: Math.max(0, asNumber(row.exposure_minutes, 0)),
    firstUsedAt: row.first_used_at,
    errorMessage: null,
  };
}

async function upsertV42ValueObjectProjection(params: {
  supabase: SupabaseClient;
  event: ActivityEventForValueObjectBridge;
  valueObjectId: string;
  valueObjectInstanceId: string;
  oldVoiLinkId: string | null;
  bridgeSource: BridgeSource;
  confidence: number;
  processorName: string;
  mappingMetadata: Record<string, unknown>;
}): Promise<{
  activityEventValueObjectLinkId: string | null;
  usageAggregateId: string | null;
  errorMessage: string | null;
}> {
  const {
    supabase,
    event,
    valueObjectId,
    valueObjectInstanceId,
    oldVoiLinkId,
    bridgeSource,
    confidence,
    processorName,
    mappingMetadata,
  } = params;

  const projectionSource = normalizeV42ProjectionSource(bridgeSource);
  const exposureMinutes = normalizeExposureMinutes(event.duration_minutes);
  const nowIso = new Date().toISOString();

  const existingProjection = await readExistingV42ProjectionLink(
    supabase,
    event.id,
    valueObjectId,
    projectionSource
  );

  if (existingProjection.errorMessage) {
    return {
      activityEventValueObjectLinkId: null,
      usageAggregateId: null,
      errorMessage: existingProjection.errorMessage,
    };
  }

  const { data: projectionData, error: projectionError } = await supabase
    .from("activity_event_value_object_links")
    .upsert(
      {
        user_id: event.user_id,
        event_id: event.id,
        value_object_id: valueObjectId,
        exposure_minutes: exposureMinutes,
        source: projectionSource,
        confidence,
        metadata_json: {
          processorName,
          bridgeSource,
          valueObjectInstanceId,
          oldActivityEventValueObjectInstanceLinkId: oldVoiLinkId,
          mappingMetadata,
          p491: {
            projection: "activity_event_value_object_links",
            mode: "additive_v4_2_runtime_projection",
          },
        },
        updated_at: nowIso,
      },
      {
        onConflict: "event_id,value_object_id,source",
      }
    )
    .select("id")
    .single();

  if (projectionError || !projectionData) {
    return {
      activityEventValueObjectLinkId: null,
      usageAggregateId: null,
      errorMessage:
        projectionError?.message ?? "failed_to_upsert_activity_event_value_object_link",
    };
  }

  const activityEventValueObjectLinkId = (projectionData as { id: string }).id;

  /*
   * Avoid usage overcounting:
   * - if the direct event -> VO projection already existed, do not increment usage again;
   * - still keep the projection row updated above for metadata/confidence freshness.
   */
  if (existingProjection.id) {
    return {
      activityEventValueObjectLinkId,
      usageAggregateId: null,
      errorMessage: null,
    };
  }

  const existingUsage = await readExistingV42UsageAggregate(
    supabase,
    event.user_id,
    valueObjectId
  );

  if (existingUsage.errorMessage) {
    return {
      activityEventValueObjectLinkId,
      usageAggregateId: null,
      errorMessage: existingUsage.errorMessage,
    };
  }

  const firstUsedAt = existingUsage.firstUsedAt ?? getEventFirstUsedAt(event);
  const lastUsedAt = getEventLastUsedAt(event);
  const nextUsageCount = existingUsage.usageCount + 1;
  const nextExposureMinutes = existingUsage.exposureMinutes + exposureMinutes;

  const { data: usageData, error: usageError } = await supabase
    .from("value_object_usage_aggregates")
    .upsert(
      {
        user_id: event.user_id,
        value_object_id: valueObjectId,
        usage_count: nextUsageCount,
        exposure_minutes: nextExposureMinutes,
        first_used_at: firstUsedAt,
        last_used_at: lastUsedAt,
        last_event_id: event.id,
        source: projectionSource,
        metadata_json: {
          processorName,
          bridgeSource,
          lastActivityEventValueObjectLinkId: activityEventValueObjectLinkId,
          lastValueObjectInstanceId: valueObjectInstanceId,
          lastOldActivityEventValueObjectInstanceLinkId: oldVoiLinkId,
          lastExposureMinutes: exposureMinutes,
          p491: {
            projection: "value_object_usage_aggregates",
            mode: "additive_v4_2_runtime_projection",
          },
        },
        updated_at: nowIso,
      },
      {
        onConflict: "user_id,value_object_id",
      }
    )
    .select("id")
    .single();

  if (usageError || !usageData) {
    return {
      activityEventValueObjectLinkId,
      usageAggregateId: null,
      errorMessage:
        usageError?.message ?? "failed_to_upsert_value_object_usage_aggregate",
    };
  }

  return {
    activityEventValueObjectLinkId,
    usageAggregateId: (usageData as { id: string }).id,
    errorMessage: null,
  };
}

async function upsertV42ValueObjectCategoryLink(params: {
  supabase: SupabaseClient;
  event: ActivityEventForValueObjectBridge;
  valueObjectId: string;
  valueObjectInstanceId: string;
  oldVoiLinkId: string | null;
  activityEventValueObjectLinkId: string | null;
  bridgeSource: BridgeSource;
  confidence: number;
  processorName: string;
  mappingMetadata: Record<string, unknown>;
}): Promise<{
  valueObjectCategoryLinkId: string | null;
  errorMessage: string | null;
}> {
  const {
    supabase,
    event,
    valueObjectId,
    valueObjectInstanceId,
    oldVoiLinkId,
    activityEventValueObjectLinkId,
    bridgeSource,
    confidence,
    processorName,
    mappingMetadata,
  } = params;

  const categoryMetadata = extractCategoryLinkMetadata(mappingMetadata);

  if (!isUuid(categoryMetadata.contextualCategoryId)) {
    return {
      valueObjectCategoryLinkId: null,
      errorMessage: null,
    };
  }

  const categoryLookup = await readContextualCategoryForLink(
    supabase,
    categoryMetadata.contextualCategoryId
  );

  if (categoryLookup.errorMessage) {
    return {
      valueObjectCategoryLinkId: null,
      errorMessage: categoryLookup.errorMessage,
    };
  }

  if (!categoryLookup.category) {
    return {
      valueObjectCategoryLinkId: null,
      errorMessage: null,
    };
  }

  const projectionSource = normalizeV42ProjectionSource(bridgeSource);
  const categoryRole = normalizeCategoryRole(
    categoryMetadata.classificationRole === "primary"
      ? "primary"
      : "semantic_component"
  );

  const { data, error } = await supabase
    .from("value_object_category_links")
    .upsert(
      {
        value_object_id: valueObjectId,
        category_table: "contextual_categories",
        category_id: categoryMetadata.contextualCategoryId,
        category_role: categoryRole,
        source: projectionSource,
        confidence,
        metadata_json: {
          processorName,
          bridgeSource,
          valueObjectInstanceId,
          oldActivityEventValueObjectInstanceLinkId: oldVoiLinkId,
          activityEventValueObjectLinkId,
          mapper: categoryMetadata.mapper,
          mapperVersion: categoryMetadata.mapperVersion,
          controlledRule: categoryMetadata.controlledRule,
          classification: {
            classificationId: categoryMetadata.classificationId,
            classificationRole: categoryMetadata.classificationRole,
            contextId: categoryMetadata.contextId,
            contextCode: categoryMetadata.contextCode,
            contextName: categoryMetadata.contextName,
            objectTypeId: categoryMetadata.objectTypeId,
            objectTypeCode: categoryMetadata.objectTypeCode,
            objectTypeName: categoryMetadata.objectTypeName,
            actionTypeId: categoryMetadata.actionTypeId,
            actionTypeCode: categoryMetadata.actionTypeCode,
            actionTypeName: categoryMetadata.actionTypeName,
            contextualCategoryId: categoryMetadata.contextualCategoryId,
            contextualCategorySlug: categoryMetadata.contextualCategorySlug,
            contextualCategoryName: categoryMetadata.contextualCategoryName,
          },
          resolvedContextualCategory: {
            id: categoryLookup.category.id,
            slug: categoryLookup.category.slug,
            name: categoryLookup.category.name,
            status: categoryLookup.category.status,
            isActive: categoryLookup.category.is_active,
          },
          p492: {
            projection: "value_object_category_links",
            mode: "runtime_category_link_from_bridge_mapping_metadata",
            sourceEventId: event.id,
            sourceProjectionId: activityEventValueObjectLinkId,
          },
        },
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "value_object_id,category_table,category_id,category_role",
      }
    )
    .select("id")
    .single();

  if (error || !data) {
    return {
      valueObjectCategoryLinkId: null,
      errorMessage: error?.message ?? "failed_to_upsert_value_object_category_link",
    };
  }

  return {
    valueObjectCategoryLinkId: (data as { id: string }).id,
    errorMessage: null,
  };
}

function isAdditionalCategoryLinkMetadataRecord(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function createAdditionalValueObjectCategoryLinks(params: {
  supabase: SupabaseClient;
  eventId: string;
  valueObjectId: string;
  activityEventValueObjectLinkId: string | null;
  processorName: string;
  additionalCategoryLinks: AdditionalValueObjectCategoryLink[] | null | undefined;
}): Promise<{
  created: Array<{
    valueObjectCategoryLinkId: string | null;
    categoryId: string;
    candidateSlug: string;
    errorMessage: string | null;
  }>;
  errors: string[];
}> {
  const {
    supabase,
    eventId,
    valueObjectId,
    activityEventValueObjectLinkId,
    processorName,
    additionalCategoryLinks,
  } = params;

  const created: Array<{
    valueObjectCategoryLinkId: string | null;
    categoryId: string;
    candidateSlug: string;
    errorMessage: string | null;
  }> = [];
  const errors: string[] = [];

  if (!additionalCategoryLinks || additionalCategoryLinks.length === 0) {
    return {
      created,
      errors,
    };
  }

  for (const item of additionalCategoryLinks) {
    if (!isUuid(item.categoryId)) {
      errors.push(
        `Skipped additional category link with invalid categoryId for candidate ${item.candidateSlug}.`
      );
      continue;
    }

    const categoryTable = item.categoryTable ?? "contextual_categories";

    if (categoryTable !== "contextual_categories") {
      errors.push(
        `Skipped additional category link with unsupported categoryTable ${categoryTable} for candidate ${item.candidateSlug}.`
      );
      continue;
    }

    const categoryRole: ValueObjectCategoryRole =
      item.categoryRole ?? "semantic_component";

    const source: V42ProjectionSource = item.source ?? "rule";

    const confidence =
      typeof item.confidence === "number" && Number.isFinite(item.confidence)
        ? item.confidence
        : 1;

    const inputMetadata = isAdditionalCategoryLinkMetadataRecord(item.metadata)
      ? item.metadata
      : {};

    const metadataJson: Record<string, unknown> = {
      ...inputMetadata,
      sourceLayer: "category_derivation",
      sourceProcessor: "category_derivation_rule_extractor",
      p4Step: "P4.10.0-C8-P3-B2-fix1",
      processorName,
      eventId,
      activityEventId: item.activityEventId ?? eventId,
      activityEventValueObjectLinkId,
      derivationRunId: item.derivationRunId ?? null,
      activityCategoryDerivationId: item.activityCategoryDerivationId ?? null,
      candidateSlug: item.candidateSlug,
      candidateTitle: item.candidateTitle ?? null,
      semanticLayer: item.semanticLayer ?? null,
      categoryType: item.categoryType ?? null,
      resolutionStatus: item.resolutionStatus ?? null,
      confidence,
      p492: {
        projection: "value_object_category_links",
        mode: "runtime_category_link_from_additional_category_links",
        sourceEventId: eventId,
        sourceProjectionId: activityEventValueObjectLinkId,
      },
    };

    const { data, error } = await supabase
      .from("value_object_category_links")
      .upsert(
        {
          value_object_id: valueObjectId,
          category_table: categoryTable,
          category_id: item.categoryId,
          category_role: categoryRole,
          source,
          confidence,
          metadata_json: metadataJson,
        },
        {
          onConflict: "value_object_id,category_table,category_id,category_role",
        }
      )
      .select("id")
      .maybeSingle();

    if (error) {
      const errorMessage = error.message;

      errors.push(
        `Failed to upsert additional category link ${item.candidateSlug}: ${errorMessage}`
      );

      created.push({
        valueObjectCategoryLinkId: null,
        categoryId: item.categoryId,
        candidateSlug: item.candidateSlug,
        errorMessage,
      });

      continue;
    }

    created.push({
      valueObjectCategoryLinkId:
        typeof data?.id === "string" ? data.id : null,
      categoryId: item.categoryId,
      candidateSlug: item.candidateSlug,
      errorMessage: null,
    });
  }

  return {
    created,
    errors,
  };
}
export async function processValueObjectBridgeForActivityEvent(
  input: ProcessValueObjectBridgeInput
): Promise<ProcessValueObjectBridgeResult> {
  const {
    supabase,
    eventId,
    mappings,
    source,
    allowNonCompletedEvent = false,
    processorName = "value_object_bridge_p4_7",
    additionalCategoryLinks,
  } = input;

  const result: ProcessValueObjectBridgeResult = {
    ok: false,
    skipped: false,
    skipReason: null,
    eventId,
    eventStatus: null,
    mappingsRequested: mappings.length,
    created: [],
    errors: [],
  };

  if (mappings.length === 0) {
    result.ok = true;
    result.skipped = true;
    result.skipReason = "no_mappings";
    return result;
  }

  const { event, errorMessage } = await readActivityEvent(supabase, eventId);

  if (errorMessage) {
    result.errors.push(errorMessage);
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

  for (const mapping of mappings) {
    const mappingSource = normalizeSource(mapping.source ?? source);
    const confidence = clamp01(mapping.confidence, 1);
    const weight = clamp01(mapping.weight, 1);
    const deltaDirection = normalizeDeltaDirection(mapping.deltaDirection);
    const relationType = normalizeRelationType(mapping.relationType);
    const aggregateDate = mapping.aggregateDate ?? getDateFromEvent(event);
    const aggregateType = mapping.aggregateType ?? "value_object";
    const aggregateKey = mapping.aggregateKey ?? mapping.valueObjectId;
    const signedDelta = getSignedNumericDelta(
      mapping.deltaValueNumeric ?? null,
      deltaDirection
    );

    const createdItem: ValueObjectBridgeCreatedItem = {
      valueObjectId: mapping.valueObjectId,
      valueObjectInstanceId: null,
      linkId: null,
      stateDeltaId: null,
      aggregateId: null,
      snapshotId: null,
      activityEventValueObjectLinkId: null,
      usageAggregateId: null,
      v42ProjectionError: null,
      valueObjectCategoryLinkId: null,
      valueObjectCategoryLinkError: null,
      additionalValueObjectCategoryLinks: [],
      additionalValueObjectCategoryLinkErrors: [],
      skipped: false,
      skipReason: null,
    };

    if (
      mapping.deltaValueNumeric === null &&
      mapping.deltaValueText === null &&
      typeof mapping.deltaValueNumeric !== "number" &&
      typeof mapping.deltaValueText !== "string"
    ) {
      createdItem.skipped = true;
      createdItem.skipReason = "missing_delta_value";
      result.created.push(createdItem);
      continue;
    }

    const existingStateDelta = await readExistingStateDeltaForMapping(
      supabase,
      event.id,
      mapping.valueObjectId,
      mapping.metricKey
    );

    if (existingStateDelta.errorMessage) {
      createdItem.skipped = true;
      createdItem.skipReason = existingStateDelta.errorMessage;
      result.created.push(createdItem);
      continue;
    }

    if (existingStateDelta.stateDeltaId) {
      createdItem.valueObjectInstanceId =
        existingStateDelta.valueObjectInstanceId;
      createdItem.stateDeltaId = existingStateDelta.stateDeltaId;
      createdItem.skipped = true;
      createdItem.skipReason = "already_processed_event_value_object_metric";
      result.created.push(createdItem);
      continue;
    }

    const ownerContext = await readValueObjectOwnerContext(
      supabase,
      mapping.valueObjectId
    );

    if (ownerContext.errorMessage) {
      createdItem.skipped = true;
      createdItem.skipReason = ownerContext.errorMessage;
      result.created.push(createdItem);
      continue;
    }

    const { data: voiData, error: voiError } = await supabase
      .from("value_object_instances")
      .insert({
        user_id: event.user_id,
        value_object_id: mapping.valueObjectId,
        source_event_id: event.id,
        owner_actor_id:
          ownerContext.ownerActorId ??
          event.acting_as_actor_id ??
          event.performed_by_actor_id ??
          null,
        organization_id: ownerContext.organizationId,
        status: mapping.instanceStatus ?? "completed",
        started_at: event.started_at,
        ended_at: event.ended_at,
        duration_minutes: event.duration_minutes,
        instance_title: mapping.instanceTitle ?? event.title,
        instance_note: mapping.instanceNote ?? event.description,
        result_status: mapping.resultStatus ?? null,
        quality_score: mapping.qualityScore ?? null,
        confidence,
        source: mappingSource,
        metadata_json: {
          processorName,
          eventId: event.id,
          mappingMetadata: mapping.metadata ?? {},
        },
      })
      .select("id")
      .single();

    if (voiError || !voiData) {
      createdItem.skipped = true;
      createdItem.skipReason = voiError?.message ?? "failed_to_create_voi";
      result.created.push(createdItem);
      continue;
    }

    const valueObjectInstanceId = (voiData as { id: string }).id;
    createdItem.valueObjectInstanceId = valueObjectInstanceId;

    const { data: linkData, error: linkError } = await supabase
      .from("activity_event_value_object_instance_links")
      .insert({
        user_id: event.user_id,
        event_id: event.id,
        value_object_instance_id: valueObjectInstanceId,
        relation_type: relationType,
        weight,
        confidence,
        source: mappingSource,
        metadata_json: {
          processorName,
          valueObjectId: mapping.valueObjectId,
        },
      })
      .select("id")
      .single();

    if (linkError) {
      result.errors.push(linkError.message);
    } else if (linkData) {
      createdItem.linkId = (linkData as { id: string }).id;

      const v42Projection = await upsertV42ValueObjectProjection({
        supabase,
        event,
        valueObjectId: mapping.valueObjectId,
        valueObjectInstanceId,
        oldVoiLinkId: createdItem.linkId,
        bridgeSource: mappingSource,
        confidence,
        processorName,
        mappingMetadata: mapping.metadata ?? {},
      });

      createdItem.activityEventValueObjectLinkId =
        v42Projection.activityEventValueObjectLinkId;
      createdItem.usageAggregateId = v42Projection.usageAggregateId;
      createdItem.v42ProjectionError = v42Projection.errorMessage;

      if (v42Projection.errorMessage) {
        /*
         * P4.9.1 compatibility rule:
         * The new v4.2 projection must not roll back the existing VOI pipeline.
         * Keep the old bridge flow running and expose the projection problem
         * in the created item + console warning for post-check diagnostics.
         */
        console.warn("P4.9.1 v4.2 projection failed", {
          eventId: event.id,
          valueObjectId: mapping.valueObjectId,
          valueObjectInstanceId,
          errorMessage: v42Projection.errorMessage,
        });
      }

      const categoryLink = await upsertV42ValueObjectCategoryLink({
        supabase,
        event,
        valueObjectId: mapping.valueObjectId,
        valueObjectInstanceId,
        oldVoiLinkId: createdItem.linkId,
        activityEventValueObjectLinkId:
          v42Projection.activityEventValueObjectLinkId,
        bridgeSource: mappingSource,
        confidence,
        processorName,
        mappingMetadata: mapping.metadata ?? {},
      });

      createdItem.valueObjectCategoryLinkId =
        categoryLink.valueObjectCategoryLinkId;
      createdItem.valueObjectCategoryLinkError = categoryLink.errorMessage;

      if (categoryLink.errorMessage) {
        /*
         * P4.9.2 compatibility rule:
         * Category-link creation is additive and must not roll back the existing VOI
         * pipeline or the already verified P4.9.1 projection layer.
         */
        console.warn("P4.9.2 value_object_category_links upsert failed", {
          eventId: event.id,
          valueObjectId: mapping.valueObjectId,
          valueObjectInstanceId,
          activityEventValueObjectLinkId:
            v42Projection.activityEventValueObjectLinkId,
          errorMessage: categoryLink.errorMessage,
        });
      }
    }

    const additionalCategoryLinksResult =
      await createAdditionalValueObjectCategoryLinks({
        supabase,
        eventId: event.id,
        valueObjectId: mapping.valueObjectId,
        activityEventValueObjectLinkId:
          createdItem.activityEventValueObjectLinkId,
        processorName,
        additionalCategoryLinks,
      });

    createdItem.additionalValueObjectCategoryLinks =
      additionalCategoryLinksResult.created;
    createdItem.additionalValueObjectCategoryLinkErrors =
      additionalCategoryLinksResult.errors;

    if (additionalCategoryLinksResult.errors.length > 0) {
      /*
       * C8-P compatibility rule:
       * additionalCategoryLinks are additive and must not roll back
       * the existing VOI, v4.2 projection, category-link, state delta,
       * aggregate, or snapshot pipeline.
       */
      console.warn("C8-P3-B3 additional value_object_category_links warnings", {
        eventId: event.id,
        valueObjectId: mapping.valueObjectId,
        activityEventValueObjectLinkId:
          createdItem.activityEventValueObjectLinkId,
        errors: additionalCategoryLinksResult.errors,
      });
    }

    const { data: deltaData, error: deltaError } = await supabase
      .from("value_object_state_deltas")
      .insert({
        user_id: event.user_id,
        event_id: event.id,
        value_object_instance_id: valueObjectInstanceId,
        value_object_id: mapping.valueObjectId,
        rule_id: null,
        metric_key: mapping.metricKey,
        delta_value_numeric:
          typeof mapping.deltaValueNumeric === "number"
            ? Math.abs(mapping.deltaValueNumeric)
            : null,
        delta_value_text: mapping.deltaValueText ?? null,
        metric_unit: mapping.metricUnit ?? null,
        delta_direction: deltaDirection,
        source: mappingSource,
        confidence,
        metadata_json: {
          processorName,
          signedDelta,
          mappingMetadata: mapping.metadata ?? {},
        },
      })
      .select("id")
      .single();

    if (deltaError || !deltaData) {
      result.errors.push(deltaError?.message ?? "failed_to_create_state_delta");
      result.created.push(createdItem);
      continue;
    }

    const stateDeltaId = (deltaData as { id: string }).id;
    createdItem.stateDeltaId = stateDeltaId;

    let aggregateNumericValue: number | null = null;

    if (signedDelta !== null) {
      const currentAggregateValue = await readExistingNumericValue(
        supabase,
        "value_object_daily_aggregates",
        {
          user_id: event.user_id,
          value_object_id: mapping.valueObjectId,
          aggregate_date: aggregateDate,
          aggregate_type: aggregateType,
          aggregate_key: aggregateKey,
          metric_key: mapping.metricKey,
        },
        "metric_value_numeric"
      );

      aggregateNumericValue = (currentAggregateValue ?? 0) + signedDelta;
    }

    const { data: aggregateData, error: aggregateError } = await supabase
      .from("value_object_daily_aggregates")
      .upsert(
        {
          user_id: event.user_id,
          value_object_id: mapping.valueObjectId,
          aggregate_date: aggregateDate,
          aggregate_type: aggregateType,
          aggregate_key: aggregateKey,
          metric_key: mapping.metricKey,
          metric_value_numeric: aggregateNumericValue ?? 0,
          metric_value_text: mapping.deltaValueText ?? null,
          metric_unit: mapping.metricUnit ?? null,
          source: mappingSource,
          last_event_id: event.id,
          last_state_delta_id: stateDeltaId,
          updated_at: new Date().toISOString(),
          metadata_json: {
            processorName,
            lastSignedDelta: signedDelta,
          },
        },
        {
          onConflict:
            "user_id,value_object_id,aggregate_date,aggregate_type,aggregate_key,metric_key",
        }
      )
      .select("id")
      .single();

    if (aggregateError) {
      result.errors.push(aggregateError.message);
    } else if (aggregateData) {
      createdItem.aggregateId = (aggregateData as { id: string }).id;
    }

    let snapshotNumericValue: number | null = null;

    if (signedDelta !== null) {
      const currentSnapshotValue = await readExistingNumericValue(
        supabase,
        "value_object_state_snapshots",
        {
          user_id: event.user_id,
          value_object_id: mapping.valueObjectId,
          metric_key: mapping.metricKey,
        },
        "metric_value_numeric"
      );

      if (deltaDirection === "set") {
        snapshotNumericValue = mapping.deltaValueNumeric ?? 0;
      } else {
        snapshotNumericValue = (currentSnapshotValue ?? 0) + signedDelta;
      }
    }

    const { data: snapshotData, error: snapshotError } = await supabase
      .from("value_object_state_snapshots")
      .upsert(
        {
          user_id: event.user_id,
          value_object_id: mapping.valueObjectId,
          metric_key: mapping.metricKey,
          metric_value_numeric: snapshotNumericValue,
          metric_value_text: mapping.deltaValueText ?? null,
          metric_unit: mapping.metricUnit ?? null,
          last_event_id: event.id,
          last_state_delta_id: stateDeltaId,
          updated_at: new Date().toISOString(),
          source: mappingSource,
          metadata_json: {
            processorName,
            lastSignedDelta: signedDelta,
          },
        },
        {
          onConflict: "user_id,value_object_id,metric_key",
        }
      )
      .select("id")
      .single();

    if (snapshotError) {
      result.errors.push(snapshotError.message);
    } else if (snapshotData) {
      createdItem.snapshotId = (snapshotData as { id: string }).id;
    }

    result.created.push(createdItem);
  }

  result.ok = result.errors.length === 0;

  return result;
}

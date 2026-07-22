import { NextResponse } from "next/server";

import {
  saveGateContractPreviewRequest,
  saveGateContractPreviewResponse,
} from "@/data/activity-to-value-objects/save-gate-contract-preview";
import { buildNoWriteExecutionPlan } from "@/lib/activity/facts/saveGate/executionPlan";
import {
  buildRealityCoreNormalizationPreview,
  normalizeLegacyActivityFactToRealityCore,
  type RealityCoreFactNormalizationResult,
  type RealityCoreNormalizationPreview,
} from "@/lib/activity/facts/realityCoreNormalization";
import { buildActivityFactsGuardedPersistenceContract } from "@/lib/activity/facts/saveGate/persistenceContract";
import { buildNoWriteOwnershipContext } from "@/lib/activity/facts/saveGate/ownershipContext";
import { buildNoWriteIdempotencyContext } from "@/lib/activity/facts/saveGate/idempotencyContext";
import { buildNoWritePartialSaveContext } from "@/lib/activity/facts/saveGate/partialSaveContext";
import {
  validateActivityFactsSaveGateRequest,
  type ActivityFactsSaveGateValidationResult,
} from "@/lib/activity/facts/saveGate/requestValidation";
import type {
  ActivityFactsSaveGateRequest,
  ActivityFactsSaveGateResponse,
} from "@/types/activity-facts-save-gate";
import type {
  ActivityMeasureCandidate,
  ActivityMeasureType,
  ActivityMeasureUnit,
  ActivityObjectFactPreview,
  ActivityProcessingPackage,
} from "@/types/activity-to-value-objects";

import { auth0 } from "../../../../../../lib/auth0";
import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../lib/actor-context";
import { supabase } from "../../../../../../lib/supabase";
import {
  buildRealityCoreRequestHash,
  saveRealityActivityViaRpc,
  type RealityCoreRpcFactInput,
} from "@/lib/activity/facts/saveRealityActivityRpc";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT = "/api/activity/facts/save-gate" as const;

const ROUTE_LAYER =
  "activity-facts-save-gate-route-transactional-rpc-v2" as const;

const NO_WRITE_SIDE_EFFECTS = {
  dbReadExecuted: false,
  dbWriteExecuted: false,
  sqlExecuted: false,
  openAiCallExecuted: false,
  valueObjectCreated: false,
  activityEventCreated: false,
  activityEventMeasureCreated: false,
  activityObjectFactCreated: false,
  activityFactReviewItemCreated: false,
  recalculationQueueItemCreated: false,
  rowsActuallyWritten: 0,
} as const;

type UnknownRecord = Record<string, unknown>;

type AuthenticatedSaveContext =
  | {
      ok: true;
      auth0Sub: string;
      appUserId: string;
      actorId: string;
      activeProfileId: string;
    }
  | {
      ok: false;
      status: number;
      errorCode: string;
      errorMessage: string;
    };

type DbWriteIds = {
  activityEventId: string | null;
  measureIds: string[];
  valueObjectIds: string[];
  factIds: string[];
  reviewItemIds: string[];
  recalculationQueueIds: string[];
};

type NormalizedFactWrite = {
  localFactId: string;
  decision: "accept" | "edit";
  semanticObjectKey: string;
  semanticObjectLabel: string;
  valueObjectId: string | null;
  measureType: DbMeasureType;
  unit: DbUnit;
  valueNumeric: number | null;
  valueText: string | null;
  valueBoolean: boolean | null;
  confidence: number;
  rawFragment: string | null;
  normalizedFragment: string | null;
  reasonRu: string | null;
  realityCore: RealityCoreFactNormalizationResult;
};

type DbMeasureType =
  | "duration"
  | "distance"
  | "count"
  | "volume"
  | "mass"
  | "money"
  | "energy"
  | "repetitions"
  | "state_score"
  | "state_text"
  | "boolean_state"
  | "role"
  | "context_tag"
  | "derived_metric";

type DbUnit =
  | "minute"
  | "hour"
  | "meter"
  | "kilometer"
  | "count"
  | "repetition"
  | "set"
  | "milliliter"
  | "liter"
  | "gram"
  | "kilogram"
  | "kcal"
  | "pln"
  | "eur"
  | "usd"
  | "score_0_10"
  | "boolean"
  | "text"
  | "tag"
  | "role"
  | "km_per_hour";

const EMPTY_CREATED_IDS: DbWriteIds = {
  activityEventId: null,
  measureIds: [],
  valueObjectIds: [],
  factIds: [],
  reviewItemIds: [],
  recalculationQueueIds: [],
};

function asRecord(value: unknown): UnknownRecord {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as UnknownRecord;
  }

  return {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function isUuid(value: string | null): value is string {
  if (!value) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function sanitizeSemanticObjectKey(value: string | null, fallback: string) {
  const raw = value ?? fallback;
  const normalized = raw
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .slice(0, 79);

  const withLetterPrefix = /^[a-z]/.test(normalized)
    ? normalized
    : `x_${normalized}`;

  const finalValue = withLetterPrefix.replace(/_+$/g, "").slice(0, 79);

  if (finalValue.length >= 2) {
    return finalValue;
  }

  return "activity_fact";
}

function normalizeMeasureType(
  value: ActivityMeasureType | string | null
): DbMeasureType {
  if (value === "duration") {
    return "duration";
  }

  if (value === "distance") {
    return "distance";
  }

  if (value === "count") {
    return "count";
  }

  if (value === "volume") {
    return "volume";
  }

  if (value === "mass") {
    return "mass";
  }

  if (value === "money") {
    return "money";
  }

  if (value === "energy") {
    return "energy";
  }

  if (value === "repetitions") {
    return "repetitions";
  }

  if (value === "role") {
    return "role";
  }

  if (value === "context") {
    return "context_tag";
  }

  if (value === "state") {
    return "state_text";
  }

  if (value === "derived") {
    return "derived_metric";
  }

  return "duration";
}

function normalizeUnit(value: ActivityMeasureUnit | string | null): DbUnit {
  if (value === "minute") {
    return "minute";
  }

  if (value === "hour") {
    return "hour";
  }

  if (value === "meter") {
    return "meter";
  }

  if (value === "kilometer") {
    return "kilometer";
  }

  if (value === "step") {
    return "count";
  }

  if (value === "count") {
    return "count";
  }

  if (value === "liter") {
    return "liter";
  }

  if (value === "milliliter") {
    return "milliliter";
  }

  if (value === "gram") {
    return "gram";
  }

  if (value === "kilogram") {
    return "kilogram";
  }

  if (value === "kcal") {
    return "kcal";
  }

  if (value === "pln") {
    return "pln";
  }

  if (value === "eur") {
    return "eur";
  }

  if (value === "usd") {
    return "usd";
  }

  if (value === "text") {
    return "text";
  }

  if (value === "score") {
    return "score_0_10";
  }

  if (value === "boolean") {
    return "boolean";
  }

  if (value === "repetition") {
    return "repetition";
  }

  if (value === "set") {
    return "set";
  }

  if (value === "tag") {
    return "tag";
  }

  if (value === "role") {
    return "role";
  }

  if (value === "km_per_hour") {
    return "km_per_hour";
  }

  return "minute";
}

function ensureExactlyOneValue(params: {
  valueNumeric: number | null;
  valueText: string | null;
  valueBoolean: boolean | null;
}): {
  valueNumeric: number | null;
  valueText: string | null;
  valueBoolean: boolean | null;
} {
  const valueCount =
    (params.valueNumeric !== null ? 1 : 0) +
    (params.valueText !== null ? 1 : 0) +
    (params.valueBoolean !== null ? 1 : 0);

  if (valueCount === 1) {
    return params;
  }

  if (params.valueNumeric !== null) {
    return {
      valueNumeric: params.valueNumeric,
      valueText: null,
      valueBoolean: null,
    };
  }

  if (params.valueBoolean !== null) {
    return {
      valueNumeric: null,
      valueText: null,
      valueBoolean: params.valueBoolean,
    };
  }

  if (params.valueText !== null) {
    return {
      valueNumeric: null,
      valueText: params.valueText,
      valueBoolean: null,
    };
  }

  return {
    valueNumeric: 1,
    valueText: null,
    valueBoolean: null,
  };
}

function buildNoWriteResponse(params: {
  response: ActivityFactsSaveGateResponse;
  validation: ActivityFactsSaveGateValidationResult;
  ok: boolean;
}) {
  const executionPlan = buildNoWriteExecutionPlan(params.validation);
  const guardedPersistenceContract = buildActivityFactsGuardedPersistenceContract({
    validation: params.validation,
    noWritePlan: executionPlan,
  });

  return {
    ...params.response,
    contractPreviewRequest: saveGateContractPreviewRequest,
    ok: params.ok,
    endpoint: ENDPOINT,
    routeLayer: ROUTE_LAYER,
    routePurpose: "activity_facts_save_gate_preview_or_server_mediated_write",
    routeMarker:
      "activity-facts-save-gate-route-transactional-rpc-v2",
    routeStatus: "preview_ready_real_write_available_when_confirmed",
    productionWriteEnabled: true,
    requestSummary: params.validation.summary,
    futurePersistenceMode: params.validation.summary.futurePersistenceMode,
    ownershipContext: buildNoWriteOwnershipContext(),
    idempotencyContext: buildNoWriteIdempotencyContext({
      sourcePackageId: params.validation.summary.sourcePackageId,
      idempotencyKey: params.validation.summary.idempotencyKey,
    }),
    partialSaveContext: buildNoWritePartialSaveContext(),
    futurePersistenceContract: {
      allowedModes: ["preview", "confirm_save"],
      currentMode: params.validation.summary.futurePersistenceMode,
      confirmSaveEnabled: true,
      confirmSaveBlockedBy: null,
      routeModeCompatibility: {
        contract_preview_only: "preview",
        future_server_mediated_write: "confirm_save",
      },
    },
    validation: {
      ok: params.validation.ok,
      errors: params.validation.errors,
      warnings: params.validation.warnings,
    },
    plannedWrites: executionPlan.plannedWrites,
    skipped: executionPlan.skipped,
    noWriteExecutionPlan: executionPlan,
    guardedPersistenceContract,
    sideEffects: NO_WRITE_SIDE_EFFECTS,
    rules: [
      "Preview mode remains no-write.",
      "Real write mode is allowed only for routeMode=future_server_mediated_write.",
      "Real write mode requires clientSafetyConfirmation.userConfirmedFactWrite=true.",
      "Ownership is derived from authenticated Auth0 session and app_users mapping.",
      "Client-provided user_id and actor_id are ignored.",
      "Direct browser Supabase writes remain forbidden.",
      "No OpenAI call is executed by this route.",
      "SQL is not executed by this route.",
    ],
  };
}

function buildValidationErrorResponse(params: {
  validation: ActivityFactsSaveGateValidationResult;
  errorCode: string;
  errorMessage: string;
  status: number;
}) {
  return NextResponse.json(
    {
      ...buildNoWriteResponse({
        response: {
          ...saveGateContractPreviewResponse,
          ok: false,
          writeStatus: "not_executed_contract_preview",
          dbWriteExecuted: false,
          sqlExecuted: false,
          openAiCallExecuted: false,
        },
        validation: params.validation,
        ok: false,
      }),
      errorCode: params.errorCode,
      errorMessage: params.errorMessage,
    },
    { status: params.status }
  );
}

async function resolveAuthenticatedSaveContext(): Promise<AuthenticatedSaveContext> {
  let session: Awaited<ReturnType<typeof auth0.getSession>> | null = null;

  try {
    session = await auth0.getSession();
  } catch {
    session = null;
  }

  const auth0Sub = asString(session?.user?.sub);

  if (!auth0Sub) {
    return {
      ok: false,
      status: 401,
      errorCode: "ACTIVITY_FACTS_SAVE_UNAUTHENTICATED",
      errorMessage: "Authentication is required to save activity facts.",
    };
  }

  try {
    const actorContext = await resolveActiveActorContext(auth0Sub);

    return {
      ok: true,
      auth0Sub,
      appUserId: actorContext.appUserId,
      actorId: actorContext.actorId,
      activeProfileId: actorContext.profile.profileId,
    };
  } catch (error) {
    if (error instanceof ActorContextError) {
      return {
        ok: false,
        status: error.status,
        errorCode: error.code,
        errorMessage: error.message,
      };
    }

    return {
      ok: false,
      status: 500,
      errorCode: "ACTIVITY_FACTS_SAVE_ACTOR_CONTEXT_FAILED",
      errorMessage: "Could not resolve the authenticated active actor context.",
    };
  }
}

function getActivityProcessingPackage(
  body: UnknownRecord
): ActivityProcessingPackage | null {
  const pkg = asRecord(body.activityProcessingPackage);

  if (Object.keys(pkg).length === 0) {
    return null;
  }

  return pkg as unknown as ActivityProcessingPackage;
}

function findMeasure(
  pkg: ActivityProcessingPackage | null,
  measureLocalId: string | null
): ActivityMeasureCandidate | null {
  if (!pkg || !measureLocalId) {
    return null;
  }

  return (
    pkg.measures.find((measure) => measure.localId === measureLocalId) ?? null
  );
}

function findFactPreview(
  pkg: ActivityProcessingPackage | null,
  factLocalId: string
): ActivityObjectFactPreview | null {
  if (!pkg) {
    return null;
  }

  return pkg.factPreviews.find((fact) => fact.localId === factLocalId) ?? null;
}

function findEditedFactPatch(body: UnknownRecord, factLocalId: string) {
  for (const rawDecision of asArray(body.editedFactDecisions)) {
    const decision = asRecord(rawDecision);

    if (asString(decision.factLocalId) === factLocalId) {
      return asRecord(decision.editedFact);
    }
  }

  return {};
}

function collectAcceptedOrEditedFactIds(body: UnknownRecord): {
  localFactId: string;
  decision: "accept" | "edit";
  reasonRu: string | null;
}[] {
  const result: {
    localFactId: string;
    decision: "accept" | "edit";
    reasonRu: string | null;
  }[] = [];

  for (const rawDecision of asArray(body.factDecisions)) {
    const decision = asRecord(rawDecision);
    const factLocalId = asString(decision.factLocalId);
    const decisionValue = asString(decision.decision);

    if (!factLocalId) {
      continue;
    }

    if (decisionValue === "accept") {
      result.push({
        localFactId: factLocalId,
        decision: "accept",
        reasonRu: asString(decision.reasonRu),
      });
    }
  }

  for (const rawDecision of asArray(body.editedFactDecisions)) {
    const decision = asRecord(rawDecision);
    const factLocalId = asString(decision.factLocalId);
    const decisionValue = asString(decision.decision);

    if (!factLocalId) {
      continue;
    }

    if (decisionValue === "edit") {
      result.push({
        localFactId: factLocalId,
        decision: "edit",
        reasonRu: asString(decision.reasonRu),
      });
    }
  }

  const seen = new Set<string>();

  return result.filter((item) => {
    const key = `${item.localFactId}:${item.decision}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}

function normalizeFactForWrite(params: {
  body: UnknownRecord;
  pkg: ActivityProcessingPackage | null;
  localFactId: string;
  decision: "accept" | "edit";
  reasonRu: string | null;
}): NormalizedFactWrite {
  const preview = findFactPreview(params.pkg, params.localFactId);
  const editedPatch =
    params.decision === "edit"
      ? findEditedFactPatch(params.body, params.localFactId)
      : {};

  const measure = findMeasure(params.pkg, preview?.measureLocalId ?? null);

  const semanticObjectKey = sanitizeSemanticObjectKey(
    asString(editedPatch.semanticObjectKey) ?? preview?.semanticObjectKey ?? null,
    params.localFactId
  );

  const semanticObjectLabel =
    asString(editedPatch.valueObjectTitle) ??
    preview?.valueObjectTitle ??
    preview?.semanticObjectKey ??
    semanticObjectKey;

  const legacyMeasureType =
    asString(editedPatch.measureType) ??
    preview?.measureType ??
    measure?.measureType ??
    "duration";

  const legacyUnit =
    asString(editedPatch.unit) ?? preview?.unit ?? measure?.unit ?? "minute";

  const measureType = normalizeMeasureType(legacyMeasureType);
  const unit = normalizeUnit(legacyUnit);

  const editedNumeric = asNumber(editedPatch.numericValue);
  const editedText = asString(editedPatch.textValue);

  const rawNumeric =
    editedNumeric ??
    preview?.numericValue ??
    measure?.numericValue ??
    null;

  const rawText =
    editedText ??
    preview?.textValue ??
    measure?.textValue ??
    null;

  const rawBoolean = asBoolean(editedPatch.valueBoolean) ?? null;

  const value = ensureExactlyOneValue({
    valueNumeric: rawNumeric,
    valueText: rawText,
    valueBoolean: rawBoolean,
  });

  const realityCore = normalizeLegacyActivityFactToRealityCore({
    localFactId: params.localFactId,
    semanticObjectKey,
    semanticObjectLabel,
    legacyMeasureType,
    legacyUnit,
    valueNumeric: value.valueNumeric,
    valueText: value.valueText,
    valueBoolean: value.valueBoolean,
  });

  const candidateValueObjectId =
    asString(editedPatch.valueObjectId) ?? preview?.valueObjectId ?? null;
  const valueObjectId = isUuid(candidateValueObjectId)
    ? candidateValueObjectId
    : null;

  return {
    localFactId: params.localFactId,
    decision: params.decision,
    semanticObjectKey,
    semanticObjectLabel,
    valueObjectId,
    measureType,
    unit,
    valueNumeric: value.valueNumeric,
    valueText: value.valueText,
    valueBoolean: value.valueBoolean,
    confidence:
      typeof preview?.confidence === "number" && Number.isFinite(preview.confidence)
        ? Math.max(0, Math.min(1, preview.confidence))
        : typeof measure?.confidence === "number" && Number.isFinite(measure.confidence)
          ? Math.max(0, Math.min(1, measure.confidence))
          : 1,
    rawFragment: measure?.evidenceText ?? preview?.explanation ?? null,
    normalizedFragment: measure?.normalizedLabel ?? semanticObjectLabel,
    reasonRu: params.reasonRu,
    realityCore,
  };
}

function buildRealityCorePreviewFromRequest(
  bodyRecord: UnknownRecord
): RealityCoreNormalizationPreview {
  const pkg = getActivityProcessingPackage(bodyRecord);
  const acceptedOrEditedFactInputs = collectAcceptedOrEditedFactIds(bodyRecord);

  const normalizedFacts = acceptedOrEditedFactInputs.map((item) => {
    return normalizeFactForWrite({
      body: bodyRecord,
      pkg,
      localFactId: item.localFactId,
      decision: item.decision,
      reasonRu: item.reasonRu,
    }).realityCore;
  });

  return buildRealityCoreNormalizationPreview(normalizedFacts);
}

function buildRealityCoreNormalizationErrorResponse(params: {
  validation: ActivityFactsSaveGateValidationResult;
  normalization: RealityCoreNormalizationPreview;
}) {
  return NextResponse.json(
    {
      ...buildNoWriteResponse({
        response: {
          ...saveGateContractPreviewResponse,
          ok: false,
          writeStatus: "not_executed_contract_preview",
          dbWriteExecuted: false,
          sqlExecuted: false,
          openAiCallExecuted: false,
        },
        validation: params.validation,
        ok: false,
      }),
      routeStatus: "reality_core_normalization_failed_before_write",
      errorCode: "ACTIVITY_FACTS_SAVE_REALITY_CORE_NORMALIZATION_FAILED",
      errorMessage:
        "One or more accepted facts cannot be normalized against parameter-registry-v1.",
      realityCoreNormalization: params.normalization,
      dbWriteExecuted: false,
      sideEffects: NO_WRITE_SIDE_EFFECTS,
    },
    { status: 400 }
  );
}

function buildActivityTiming(pkg: ActivityProcessingPackage | null, facts: NormalizedFactWrite[]) {
  const durationFact = facts.find((fact) => {
    return fact.measureType === "duration" && fact.unit === "minute";
  });

  const durationMinutes =
    durationFact?.valueNumeric !== null &&
    durationFact?.valueNumeric !== undefined &&
    Number.isFinite(durationFact.valueNumeric)
      ? Math.max(0, Math.round(durationFact.valueNumeric))
      : null;

  const capturedAtRaw = pkg?.rawInput?.capturedAtIso ?? null;
  const capturedAt = capturedAtRaw ? new Date(capturedAtRaw) : new Date();
  const endedAt = Number.isNaN(capturedAt.getTime()) ? new Date() : capturedAt;
  const startedAt =
    durationMinutes !== null
      ? new Date(endedAt.getTime() - durationMinutes * 60 * 1000)
      : null;

  return {
    durationMinutes,
    startedAtIso: startedAt ? startedAt.toISOString() : null,
    endedAtIso: endedAt.toISOString(),
  };
}

function toCurrentSchemaUnitCode(canonicalUnitCode: string): DbUnit {
  if (canonicalUnitCode === "kilometer_per_hour") {
    return "km_per_hour";
  }

  if (canonicalUnitCode === "step") {
    return "count";
  }

  return canonicalUnitCode as DbUnit;
}

function mapRpcErrorStatus(message: string): number {
  if (message.includes("SAVE_REALITY_ACTIVITY_IDEMPOTENCY_CONFLICT")) {
    return 409;
  }

  if (
    /_(REQUIRED|INVALID|NOT_ALLOWED|OUT_OF_RANGE|MUST_BE_|AT_LEAST_|EXACTLY_ONE_|NOT_FOUND)/.test(
      message
    )
  ) {
    return 400;
  }

  return 500;
}

type TransactionRollbackCounts = {
  readonly activityEvents: number | null;
  readonly measures: number | null;
  readonly objectFacts: number | null;
  readonly reviewItems: number | null;
  readonly recalculationQueue: number | null;
};

type TransactionRollbackVerification = {
  readonly checked: boolean;
  readonly passed: boolean | null;
  readonly eventCode: string;
  readonly idempotencyKey: string;
  readonly counts: TransactionRollbackCounts;
  readonly verificationErrors: readonly string[];
};

async function verifyNoDurableTransactionRows(params: {
  appUserId: string;
  eventCode: string;
  idempotencyKey: string;
}): Promise<TransactionRollbackVerification> {
  const [
    activityEventsResult,
    measuresResult,
    objectFactsResult,
    reviewItemsResult,
    recalculationQueueResult,
  ] = await Promise.all([
    supabase
      .from("activity_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", params.appUserId)
      .eq("event_code", params.eventCode),
    supabase
      .from("activity_event_measures")
      .select("id", { count: "exact", head: true })
      .eq("user_id", params.appUserId)
      .contains("metadata", { idempotencyKey: params.idempotencyKey }),
    supabase
      .from("activity_object_facts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", params.appUserId)
      .contains("metadata", { idempotencyKey: params.idempotencyKey }),
    supabase
      .from("activity_fact_review_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", params.appUserId)
      .contains("metadata", { idempotencyKey: params.idempotencyKey }),
    supabase
      .from("activity_fact_recalculation_queue")
      .select("id", { count: "exact", head: true })
      .eq("user_id", params.appUserId)
      .contains("metadata", { idempotencyKey: params.idempotencyKey }),
  ]);

  const verificationErrors = [
    activityEventsResult.error
      ? `activity_events: ${activityEventsResult.error.message}`
      : null,
    measuresResult.error
      ? `activity_event_measures: ${measuresResult.error.message}`
      : null,
    objectFactsResult.error
      ? `activity_object_facts: ${objectFactsResult.error.message}`
      : null,
    reviewItemsResult.error
      ? `activity_fact_review_items: ${reviewItemsResult.error.message}`
      : null,
    recalculationQueueResult.error
      ? `activity_fact_recalculation_queue: ${recalculationQueueResult.error.message}`
      : null,
  ].filter((value): value is string => value !== null);

  const counts: TransactionRollbackCounts = {
    activityEvents: activityEventsResult.error
      ? null
      : (activityEventsResult.count ?? 0),
    measures: measuresResult.error ? null : (measuresResult.count ?? 0),
    objectFacts: objectFactsResult.error
      ? null
      : (objectFactsResult.count ?? 0),
    reviewItems: reviewItemsResult.error
      ? null
      : (reviewItemsResult.count ?? 0),
    recalculationQueue: recalculationQueueResult.error
      ? null
      : (recalculationQueueResult.count ?? 0),
  };

  const countValues = Object.values(counts);

  return {
    checked: true,
    passed:
      verificationErrors.length === 0
        ? countValues.every((count) => count === 0)
        : null,
    eventCode: params.eventCode,
    idempotencyKey: params.idempotencyKey,
    counts,
    verificationErrors,
  };
}

function buildWriteErrorResponse(params: {
  validation: ActivityFactsSaveGateValidationResult;
  errorCode: string;
  errorMessage: string;
  status: number;
  transactionAttempted?: boolean;
  rollbackVerification?: TransactionRollbackVerification | null;
}) {
  const executionPlan = buildNoWriteExecutionPlan(params.validation);
  const transactionAttempted = params.transactionAttempted === true;
  const rollbackVerification = params.rollbackVerification ?? null;

  return NextResponse.json(
    {
      ok: false,
      endpoint: ENDPOINT,
      routeLayer: ROUTE_LAYER,
      routeStatus: transactionAttempted
        ? "transactional_rpc_failed_without_commit"
        : "server_mediated_write_not_started",
      productionWriteEnabled: true,
      writeStatus: "failed",
      transactional: true,
      transactionAttempted,
      transactionCommitted: false,
      errorCode: params.errorCode,
      errorMessage: params.errorMessage,
      requestSummary: params.validation.summary,
      createdIds: EMPTY_CREATED_IDS,
      plannedWrites: executionPlan.plannedWrites,
      skipped: executionPlan.skipped,
      dbWriteExecuted: false,
      sqlExecuted: false,
      openAiCallExecuted: false,
      transactionRollbackVerification: rollbackVerification,
      sideEffects: {
        dbReadExecuted: true,
        dbWriteExecuted: false,
        sqlExecuted: false,
        openAiCallExecuted: false,
        valueObjectCreated: false,
        activityEventCreated: false,
        activityEventMeasureCreated: false,
        activityObjectFactCreated: false,
        activityFactReviewItemCreated: false,
        recalculationQueueItemCreated: false,
        rowsActuallyWritten: 0,
      },
      safety: {
        serverMediatedOnly: true,
        directBrowserSupabaseWriteAllowed: false,
        duplicateChronologicalTimeAllowed: false,
        medicalDiagnosisAllowed: false,
        notes: [
          "The route derives the account and active actor from the authenticated server session.",
          "Client-provided user_id and actor_id are ignored.",
          "All durable writes are delegated to save_reality_activity_v1.",
          "Any RPC failure aborts the PostgreSQL transaction.",
          "The route does not execute SQL text.",
          "The route does not call OpenAI.",
        ],
      },
    },
    { status: params.status }
  );
}

function normalizeRequestTemporalDirection(body: UnknownRecord): "past" | "future" {
  const direct = asString(body.temporalDirection) ?? asString(body.temporal_direction);

  if (direct === "future") {
    return "future";
  }

  if (direct === "past") {
    return "past";
  }

  const metadata = asRecord(body.metadata);
  const metadataValue =
    asString(metadata.temporalDirection) ?? asString(metadata.temporal_direction);

  return metadataValue === "future" ? "future" : "past";
}

function normalizeRequestCalendarEventId(body: UnknownRecord) {
  const value = asString(body.calendarEventId) ?? asString(body.calendar_event_id);

  return isUuid(value) ? value : null;
}

function normalizeRequestExistingActivityEventId(body: UnknownRecord) {
  const value =
    asString(body.existingActivityEventId) ??
    asString(body.activityEventId) ??
    asString(body.activity_event_id);

  return isUuid(value) ? value : null;
}
async function executeRealSave(params: {
  body: UnknownRecord;
  validation: ActivityFactsSaveGateValidationResult;
  context: Extract<AuthenticatedSaveContext, { ok: true }>;
}) {
  const body = params.body as unknown as ActivityFactsSaveGateRequest;
  const bodyRecord = params.body;
  const pkg = getActivityProcessingPackage(bodyRecord);
  const sourcePackageId = params.validation.summary.sourcePackageId;
  const idempotencyKey = params.validation.summary.idempotencyKey;
  const temporalDirection = normalizeRequestTemporalDirection(bodyRecord);
  const calendarEventId = normalizeRequestCalendarEventId(bodyRecord);
  const existingActivityEventId =
    normalizeRequestExistingActivityEventId(bodyRecord);

  const acceptedOrEditedFactInputs =
    collectAcceptedOrEditedFactIds(bodyRecord);

  if (acceptedOrEditedFactInputs.length === 0) {
    return buildWriteErrorResponse({
      validation: params.validation,
      errorCode: "ACTIVITY_FACTS_SAVE_NO_ACCEPTED_OR_EDITED_FACTS",
      errorMessage:
        "At least one accepted or edited fact decision is required for confirm save.",
      status: 400,
    });
  }

  if (!idempotencyKey || !sourcePackageId) {
    return buildWriteErrorResponse({
      validation: params.validation,
      errorCode: "ACTIVITY_FACTS_SAVE_IDEMPOTENCY_REQUIRED",
      errorMessage:
        "sourcePackageId and idempotencyKey are required for real writes.",
      status: 400,
    });
  }

  const facts = acceptedOrEditedFactInputs.map((item) => {
    return normalizeFactForWrite({
      body: bodyRecord,
      pkg,
      localFactId: item.localFactId,
      decision: item.decision,
      reasonRu: item.reasonRu,
    });
  });

  const realityCoreNormalization = buildRealityCoreNormalizationPreview(
    facts.map((fact) => fact.realityCore)
  );

  if (!realityCoreNormalization.ok) {
    return buildRealityCoreNormalizationErrorResponse({
      validation: params.validation,
      normalization: realityCoreNormalization,
    });
  }

  const timing = buildActivityTiming(pkg, facts);
  const rawText =
    pkg?.rawInput?.text ??
    asString(bodyRecord.rawText) ??
    "Activity saved through activity facts save-gate.";

  const title =
    pkg?.recognition?.detectedActivityTitle ??
    rawText.slice(0, 120) ??
    "Saved activity";

  const eventCode = `save_gate:${idempotencyKey}`;

  const rpcFacts: RealityCoreRpcFactInput[] = facts.map((fact) => {
    if (!fact.realityCore.ok) {
      throw new Error(
        `Unexpected failed Reality Core normalization for ${fact.localFactId}.`
      );
    }

    return {
      localFactId: fact.localFactId,
      decision: fact.decision,
      semanticObjectKey: fact.semanticObjectKey,
      semanticObjectLabel: fact.semanticObjectLabel,
      valueObjectId: fact.valueObjectId,
      measureType: fact.measureType,
      parameterCode: fact.realityCore.parameterCode,
      unitCode: toCurrentSchemaUnitCode(
        fact.realityCore.canonicalUnitCode
      ),
      canonicalUnitCode: fact.realityCore.canonicalUnitCode,
      valueNumeric: fact.realityCore.canonicalValueNumeric,
      valueText: fact.realityCore.canonicalValueText,
      valueBoolean: fact.realityCore.canonicalValueBoolean,
      confidence: fact.confidence,
      rawFragment: fact.rawFragment,
      normalizedFragment: fact.normalizedFragment,
      reasonRu: fact.reasonRu,
      metadata: {
        sourcePackageId,
        routeLayer: ROUTE_LAYER,
        temporalDirection,
        calendarEventId,
        existingActivityEventId,
        legacyMeasureType: fact.realityCore.source.legacyMeasureType,
        legacyUnit: fact.realityCore.source.legacyUnit,
      },
    };
  });

  const rpcActorContext = {
    performedByActorId: params.context.actorId,
    actingAsActorId: params.context.actorId,
    actingForActorId: params.context.actorId,
    activeProfileId: params.context.activeProfileId,
  };

  const rpcActivity = {
    idempotencyKey,
    temporalDirection,
    inputText: rawText,
    title,
    description:
      "Created by /api/activity/facts/save-gate transactional Reality Core RPC.",
    startedAtIso: timing.startedAtIso,
    endedAtIso: timing.endedAtIso,
    durationMinutes: timing.durationMinutes,
    source: temporalDirection === "future" ? "calendar_import" : "chat_ai",
    status: temporalDirection === "future" ? "planned" : "completed",
    privacyScope: "private",
    metadata: {
      sourcePackageId,
      routeLayer: ROUTE_LAYER,
      rawInput: pkg?.rawInput ?? null,
      recognition: pkg?.recognition ?? null,
      temporalDirection,
      calendarEventId,
      existingActivityEventId,
      activeProfileId: params.context.activeProfileId,
    },
  };

  const requestHash = buildRealityCoreRequestHash({
    ownerUserId: params.context.appUserId,
    actorContext: rpcActorContext,
    activity: rpcActivity,
    facts: rpcFacts,
  });

  const rpcResult = await saveRealityActivityViaRpc({
    ownerUserId: params.context.appUserId,
    requestHash,
    actorContext: rpcActorContext,
    activity: rpcActivity,
    facts: rpcFacts,
  });

  if (!rpcResult.ok) {
    const isIdempotencyConflict = rpcResult.errorMessage.includes(
      "SAVE_REALITY_ACTIVITY_IDEMPOTENCY_CONFLICT"
    );

    const rollbackVerification = isIdempotencyConflict
      ? null
      : await verifyNoDurableTransactionRows({
          appUserId: params.context.appUserId,
          eventCode,
          idempotencyKey,
        });

    return buildWriteErrorResponse({
      validation: params.validation,
      errorCode: isIdempotencyConflict
        ? "ACTIVITY_FACTS_SAVE_IDEMPOTENCY_CONFLICT"
        : "ACTIVITY_FACTS_SAVE_TRANSACTIONAL_RPC_FAILED",
      errorMessage: rpcResult.errorMessage,
      status: mapRpcErrorStatus(rpcResult.errorMessage),
      transactionAttempted: true,
      rollbackVerification,
    });
  }

  const executionPlan = buildNoWriteExecutionPlan(params.validation);
  const rpcData = rpcResult.data;
  const createdIds: DbWriteIds = {
    activityEventId: rpcData.activityEventId,
    measureIds: rpcData.measureIds,
    valueObjectIds: [],
    factIds: rpcData.factIds,
    reviewItemIds: rpcData.reviewItemIds,
    recalculationQueueIds: rpcData.recalculationQueueIds,
  };

  const durableWriteExecuted = rpcData.writeStatus === "written";

  return NextResponse.json(
    {
      ok: true,
      endpoint: ENDPOINT,
      routeLayer: ROUTE_LAYER,
      routeStatus:
        rpcData.writeStatus === "idempotent_replay"
          ? "transactional_rpc_idempotent_replay"
          : "transactional_rpc_write_completed",
      productionWriteEnabled: true,
      writeStatus: rpcData.writeStatus,
      transactional: true,
      transactionAttempted: true,
      transactionCommitted: durableWriteExecuted,
      requestSummary: params.validation.summary,
      realityCoreNormalization,
      createdIds,
      plannedWrites: executionPlan.plannedWrites.map((write) => {
        return {
          ...write,
          writeStatus:
            rpcData.writeStatus === "idempotent_replay"
              ? "idempotent_replay"
              : "written",
        };
      }),
      skipped: executionPlan.skipped,
      dbWriteExecuted: durableWriteExecuted,
      sqlExecuted: false,
      openAiCallExecuted: false,
      sideEffects: {
        dbReadExecuted: true,
        dbWriteExecuted: durableWriteExecuted,
        sqlExecuted: false,
        openAiCallExecuted: false,
        valueObjectCreated: false,
        activityEventCreated:
          durableWriteExecuted && Boolean(createdIds.activityEventId),
        temporalDirection,
        calendarEventId,
        activityEventMeasureCreated:
          durableWriteExecuted && createdIds.measureIds.length > 0,
        activityObjectFactCreated:
          durableWriteExecuted && createdIds.factIds.length > 0,
        activityFactReviewItemCreated:
          durableWriteExecuted && createdIds.reviewItemIds.length > 0,
        recalculationQueueItemCreated:
          durableWriteExecuted &&
          createdIds.recalculationQueueIds.length > 0,
        rowsActuallyWritten: rpcData.rowsActuallyWritten,
      },
      transaction: {
        rpc: "save_reality_activity_v1",
        requestHash,
        writeStatus: rpcData.writeStatus,
        committed: durableWriteExecuted,
        idempotentReplay:
          rpcData.writeStatus === "idempotent_replay",
      },
      visibility: {
        readApi: "/api/activity/facts",
        page: "/activity-facts",
        expectedFilter: {
          activityEventId: rpcData.activityEventId,
        },
      },
      safety: {
        serverMediatedOnly: true,
        directBrowserSupabaseWriteAllowed: false,
        duplicateChronologicalTimeAllowed: false,
        medicalDiagnosisAllowed: false,
        notes: [
          "The route derives user_id and active actor_id from the authenticated server session.",
          "Client-provided ownership fields are ignored.",
          "All five write stages run inside one PostgreSQL RPC transaction.",
          "Any RPC error rolls back the complete write.",
          "Canonical values from parameter-registry-v1 are persisted.",
          "The route does not execute SQL text.",
          "The route does not call OpenAI.",
        ],
      },
      debug: {
        sourcePackageId: body.sourcePackageId,
        idempotencyKey: body.idempotencyKey,
        factCount: facts.length,
        realityCoreContractVersion:
          realityCoreNormalization.contractVersion,
        parameterRegistryVersion:
          realityCoreNormalization.registryVersion,
        normalizedFactCount:
          realityCoreNormalization.normalizedCount,
        activeActorId: params.context.actorId,
        activeProfileId: params.context.activeProfileId,
      },
    },
    { status: 200 }
  );
}

export async function GET() {
  const validation = validateActivityFactsSaveGateRequest(
    saveGateContractPreviewRequest
  );

  return NextResponse.json(
    buildNoWriteResponse({
      response: saveGateContractPreviewResponse,
      validation,
      ok: true,
    }),
    { status: 200 }
  );
}

export async function POST(request: Request) {
  let body: unknown = {};
  let invalidJson = false;

  try {
    body = await request.json();
  } catch {
    body = {};
    invalidJson = true;
  }

  const bodyRecord = asRecord(body);
  const validation = validateActivityFactsSaveGateRequest(bodyRecord);

  if (invalidJson) {
    return buildValidationErrorResponse({
      validation,
      errorCode: "ACTIVITY_FACTS_SAVE_GATE_INVALID_JSON",
      errorMessage: "Request body must be valid JSON.",
      status: 400,
    });
  }

  if (!validation.ok) {
    return buildValidationErrorResponse({
      validation,
      errorCode: "ACTIVITY_FACTS_SAVE_GATE_VALIDATION_FAILED",
      errorMessage: "Request body did not pass save-gate validation.",
      status: 400,
    });
  }

  if (validation.summary.futurePersistenceMode !== "confirm_save") {
    const realityCoreNormalization =
      buildRealityCorePreviewFromRequest(bodyRecord);

    return NextResponse.json(
      {
        ...buildNoWriteResponse({
          response: saveGateContractPreviewResponse,
          validation,
          ok: true,
        }),
        realityCoreNormalization,
      },
      { status: 200 }
    );
  }

  const safety = asRecord(bodyRecord.clientSafetyConfirmation);

  if (asBoolean(safety.userConfirmedFactWrite) !== true) {
    return buildValidationErrorResponse({
      validation,
      errorCode: "ACTIVITY_FACTS_SAVE_GATE_USER_CONFIRMATION_REQUIRED",
      errorMessage:
        "Real save requires clientSafetyConfirmation.userConfirmedFactWrite=true.",
      status: 409,
    });
  }

  if (asBoolean(safety.userReviewedPreview) !== true) {
    return buildValidationErrorResponse({
      validation,
      errorCode: "ACTIVITY_FACTS_SAVE_GATE_PREVIEW_REVIEW_REQUIRED",
      errorMessage:
        "Real save requires clientSafetyConfirmation.userReviewedPreview=true.",
      status: 409,
    });
  }

  const context = await resolveAuthenticatedSaveContext();

  if (!context.ok) {
    return buildWriteErrorResponse({
      validation,
      errorCode: context.errorCode,
      errorMessage: context.errorMessage,
      status: context.status,
    });
  }

  return executeRealSave({
    body: bodyRecord,
    validation,
    context,
  });
}


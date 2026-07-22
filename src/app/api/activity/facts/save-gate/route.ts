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
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT = "/api/activity/facts/save-gate" as const;

const ROUTE_LAYER =
  "activity-facts-save-gate-route-server-mediated-real-write-v1" as const;

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
      "activity-facts-save-gate-route-server-mediated-real-write-v1",
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

  const { data, error } = await supabase
    .from("app_users")
    .select("id")
    .eq("auth0_sub", auth0Sub)
    .limit(2);

  if (error) {
    return {
      ok: false,
      status: 500,
      errorCode: "ACTIVITY_FACTS_SAVE_APP_USER_LOOKUP_FAILED",
      errorMessage: "Could not resolve app user for authenticated session.",
    };
  }

  const rows = Array.isArray(data) ? data.map(asRecord) : [];

  if (rows.length !== 1) {
    return {
      ok: false,
      status: 403,
      errorCode: "ACTIVITY_FACTS_SAVE_APP_USER_NOT_LINKED",
      errorMessage:
        "Authenticated Auth0 user is not linked to exactly one app_users row.",
    };
  }

  const appUserId = asString(rows[0].id);

  if (!appUserId) {
    return {
      ok: false,
      status: 403,
      errorCode: "ACTIVITY_FACTS_SAVE_APP_USER_ID_MISSING",
      errorMessage: "Mapped app_users row has no id.",
    };
  }

  return {
    ok: true,
    auth0Sub,
    appUserId,
  };
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

function buildWriteErrorResponse(params: {
  validation: ActivityFactsSaveGateValidationResult;
  errorCode: string;
  errorMessage: string;
  status: number;
  createdIds?: DbWriteIds;
  rowsActuallyWritten?: number;
}) {
  const executionPlan = buildNoWriteExecutionPlan(params.validation);

  return NextResponse.json(
    {
      ok: false,
      endpoint: ENDPOINT,
      routeLayer: ROUTE_LAYER,
      routeStatus: "server_mediated_write_failed",
      productionWriteEnabled: true,
      writeStatus: "failed",
      errorCode: params.errorCode,
      errorMessage: params.errorMessage,
      requestSummary: params.validation.summary,
      createdIds: params.createdIds ?? EMPTY_CREATED_IDS,
      plannedWrites: executionPlan.plannedWrites,
      skipped: executionPlan.skipped,
      dbWriteExecuted: true,
      sqlExecuted: false,
      openAiCallExecuted: false,
      sideEffects: {
        dbReadExecuted: true,
        dbWriteExecuted: true,
        sqlExecuted: false,
        openAiCallExecuted: false,
        rowsActuallyWritten: params.rowsActuallyWritten ?? 0,
      },
      safety: {
        serverMediatedOnly: true,
        directBrowserSupabaseWriteAllowed: false,
        duplicateChronologicalTimeAllowed: false,
        medicalDiagnosisAllowed: false,
        notes: [
          "The route is server-mediated.",
          "The route derives user_id from the authenticated session.",
          "The route does not trust client-provided ownership fields.",
          "The route does not execute SQL.",
          "The route does not call OpenAI.",
          "This first runtime patch is not a database transaction; partial writes are reported through createdIds if a later insert fails.",
        ],
      },
    },
    { status: params.status }
  );
}

async function findExistingActivityEvent(params: {
  appUserId: string;
  eventCode: string;
}) {
  const { data, error } = await supabase
    .from("activity_events")
    .select("id")
    .eq("user_id", params.appUserId)
    .eq("event_code", params.eventCode)
    .limit(1);

  if (error) {
    return {
      ok: false as const,
      errorMessage: error.message,
      activityEventId: null,
    };
  }

  const row = Array.isArray(data) ? asRecord(data[0]) : {};
  const activityEventId = asString(row.id);

  return {
    ok: true as const,
    errorMessage: null,
    activityEventId,
  };
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
  const existingActivityEventId = normalizeRequestExistingActivityEventId(bodyRecord);

  const acceptedOrEditedFactInputs = collectAcceptedOrEditedFactIds(bodyRecord);

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

  const existingEvent = await findExistingActivityEvent({
    appUserId: params.context.appUserId,
    eventCode,
  });

  if (!existingEvent.ok) {
    return buildWriteErrorResponse({
      validation: params.validation,
      errorCode: "ACTIVITY_FACTS_SAVE_IDEMPOTENCY_CHECK_FAILED",
      errorMessage: existingEvent.errorMessage,
      status: 500,
    });
  }

  if (existingEvent.activityEventId) {
    const executionPlan = buildNoWriteExecutionPlan(params.validation);

    return NextResponse.json(
      {
        ok: true,
        endpoint: ENDPOINT,
        routeLayer: ROUTE_LAYER,
        routeStatus: "server_mediated_write_idempotent_replay",
        productionWriteEnabled: true,
        writeStatus: "written",
        requestSummary: params.validation.summary,
        realityCoreNormalization,
        createdIds: {
          ...EMPTY_CREATED_IDS,
          activityEventId: existingEvent.activityEventId,
        },
        plannedWrites: executionPlan.plannedWrites,
        skipped: executionPlan.skipped,
        dbWriteExecuted: false,
        sqlExecuted: false,
        openAiCallExecuted: false,
        sideEffects: {
          dbReadExecuted: true,
          dbWriteExecuted: false,
          sqlExecuted: false,
          openAiCallExecuted: false,
          rowsActuallyWritten: 0,
        },
        safety: {
          serverMediatedOnly: true,
          directBrowserSupabaseWriteAllowed: false,
          duplicateChronologicalTimeAllowed: false,
          medicalDiagnosisAllowed: false,
          notes: [
            "Existing activity_event found for the same user_id + idempotencyKey-derived event_code.",
            "Duplicate click did not create duplicate facts in this route invocation.",
          ],
        },
      },
      { status: 200 }
    );
  }

  const createdIds: DbWriteIds = {
    activityEventId: null,
    measureIds: [],
    valueObjectIds: [],
    factIds: [],
    reviewItemIds: [],
    recalculationQueueIds: [],
  };

  let rowsActuallyWritten = 0;

  const activityEventInsert = {
    user_id: params.context.appUserId,
    performed_by_actor_id: null,
    acting_as_actor_id: null,
    acting_for_actor_id: null,
    activity_type_id: null,
    template_id: null,
    event_code: eventCode,
    input_text: rawText,
    title,
    description:
      "Created by /api/activity/facts/save-gate server-mediated real write v1.",
    started_at: timing.startedAtIso,
    ended_at: timing.endedAtIso,
    duration_minutes: timing.durationMinutes,
    source: temporalDirection === "future" ? "calendar_import" : "chat_ai",
    temporal_direction: temporalDirection,
    status: temporalDirection === "future" ? "planned" : "completed",
    privacy_scope: "private",
    processing_status: "processed",
    metadata_json: {
      sourcePackageId,
      idempotencyKey,
      routeLayer: ROUTE_LAYER,
      rawInput: pkg?.rawInput ?? null,
      recognition: pkg?.recognition ?? null,
      temporalDirection,
      calendarEventId,
      existingActivityEventId,
    },
  };

  const { data: activityEventData, error: activityEventError } = await supabase
    .from("activity_events")
    .insert(activityEventInsert)
    .select("id")
    .single();

  if (activityEventError) {
    return buildWriteErrorResponse({
      validation: params.validation,
      errorCode: "ACTIVITY_FACTS_SAVE_ACTIVITY_EVENT_INSERT_FAILED",
      errorMessage: activityEventError.message,
      status: 500,
      createdIds,
      rowsActuallyWritten,
    });
  }

  const activityEventId = asString(asRecord(activityEventData).id);

  if (!activityEventId) {
    return buildWriteErrorResponse({
      validation: params.validation,
      errorCode: "ACTIVITY_FACTS_SAVE_ACTIVITY_EVENT_ID_MISSING",
      errorMessage: "activity_events insert returned no id.",
      status: 500,
      createdIds,
      rowsActuallyWritten,
    });
  }

  createdIds.activityEventId = activityEventId;
  rowsActuallyWritten += 1;

  for (const [index, fact] of facts.entries()) {
    const measureInsert = {
      activity_event_id: activityEventId,
      user_id: params.context.appUserId,
      performed_by_actor_id: null,
      acting_as_actor_id: null,
      acting_for_actor_id: null,
      measure_type: fact.measureType,
      value_numeric: fact.valueNumeric,
      value_text: fact.valueText,
      value_boolean: fact.valueBoolean,
      unit: fact.unit,
      source_type: fact.decision === "edit" ? "user_edit" : "user_text",
      confidence: fact.confidence,
      is_derived: false,
      raw_fragment: fact.rawFragment,
      normalized_fragment: fact.normalizedFragment,
      metadata: {
        localFactId: fact.localFactId,
        sourcePackageId,
        idempotencyKey,
        routeLayer: ROUTE_LAYER,
        temporalDirection,
        calendarEventId,
        existingActivityEventId,
      },
    };

    const { data: measureData, error: measureError } = await supabase
      .from("activity_event_measures")
      .insert(measureInsert)
      .select("id")
      .single();

    if (measureError) {
      return buildWriteErrorResponse({
        validation: params.validation,
        errorCode: "ACTIVITY_FACTS_SAVE_MEASURE_INSERT_FAILED",
        errorMessage: measureError.message,
        status: 500,
        createdIds,
        rowsActuallyWritten,
      });
    }

    const measureId = asString(asRecord(measureData).id);

    if (!measureId) {
      return buildWriteErrorResponse({
        validation: params.validation,
        errorCode: "ACTIVITY_FACTS_SAVE_MEASURE_ID_MISSING",
        errorMessage: "activity_event_measures insert returned no id.",
        status: 500,
        createdIds,
        rowsActuallyWritten,
      });
    }

    createdIds.measureIds.push(measureId);
    rowsActuallyWritten += 1;

    const factInsert = {
      activity_event_id: activityEventId,
      measure_id: measureId,
      user_id: params.context.appUserId,
      performed_by_actor_id: null,
      acting_as_actor_id: null,
      acting_for_actor_id: null,
      value_object_id: fact.valueObjectId,
      semantic_object_key: fact.semanticObjectKey,
      semantic_object_label: fact.semanticObjectLabel,
      measure_type: fact.measureType,
      value_numeric: fact.valueNumeric,
      value_text: fact.valueText,
      value_boolean: fact.valueBoolean,
      unit: fact.unit,
      period_start: timing.startedAtIso,
      period_end: timing.endedAtIso,
      fact_status: temporalDirection === "future" ? "proposed" : "confirmed",
      confidence: fact.confidence,
      source_type: fact.decision === "edit" ? "user_edit" : "user_text",
      is_chronological_primary:
        index === 0 && fact.measureType === "duration" && fact.unit === "minute",
      is_exposure_fact: true,
      is_user_confirmed: temporalDirection === "past",
      metadata: {
        localFactId: fact.localFactId,
        sourcePackageId,
        idempotencyKey,
        routeLayer: ROUTE_LAYER,
        temporalDirection,
        calendarEventId,
        existingActivityEventId,
      },
    };

    const { data: factData, error: factError } = await supabase
      .from("activity_object_facts")
      .insert(factInsert)
      .select("id")
      .single();

    if (factError) {
      return buildWriteErrorResponse({
        validation: params.validation,
        errorCode: "ACTIVITY_FACTS_SAVE_OBJECT_FACT_INSERT_FAILED",
        errorMessage: factError.message,
        status: 500,
        createdIds,
        rowsActuallyWritten,
      });
    }

    const factId = asString(asRecord(factData).id);

    if (!factId) {
      return buildWriteErrorResponse({
        validation: params.validation,
        errorCode: "ACTIVITY_FACTS_SAVE_OBJECT_FACT_ID_MISSING",
        errorMessage: "activity_object_facts insert returned no id.",
        status: 500,
        createdIds,
        rowsActuallyWritten,
      });
    }

    createdIds.factIds.push(factId);
    rowsActuallyWritten += 1;

    const reviewItemInsert = {
      activity_event_id: activityEventId,
      fact_id: factId,
      measure_id: measureId,
      user_id: params.context.appUserId,
      performed_by_actor_id: null,
      acting_as_actor_id: null,
      acting_for_actor_id: null,
      proposed_label: fact.semanticObjectLabel,
      proposed_value_numeric: fact.valueNumeric,
      proposed_value_text: fact.valueText,
      proposed_value_boolean: fact.valueBoolean,
      proposed_unit: fact.unit,
      user_decision: fact.decision === "edit" ? "edited" : "accepted",
      edited_value_numeric: fact.decision === "edit" ? fact.valueNumeric : null,
      edited_value_text: fact.decision === "edit" ? fact.valueText : null,
      edited_value_boolean: fact.decision === "edit" ? fact.valueBoolean : null,
      edited_unit: fact.decision === "edit" ? fact.unit : null,
      rejected_reason: null,
      metadata: {
        localFactId: fact.localFactId,
        reasonRu: fact.reasonRu,
        sourcePackageId,
        idempotencyKey,
        routeLayer: ROUTE_LAYER,
        temporalDirection,
        calendarEventId,
        existingActivityEventId,
      },
    };

    const { data: reviewItemData, error: reviewItemError } = await supabase
      .from("activity_fact_review_items")
      .insert(reviewItemInsert)
      .select("id")
      .single();

    if (reviewItemError) {
      return buildWriteErrorResponse({
        validation: params.validation,
        errorCode: "ACTIVITY_FACTS_SAVE_REVIEW_ITEM_INSERT_FAILED",
        errorMessage: reviewItemError.message,
        status: 500,
        createdIds,
        rowsActuallyWritten,
      });
    }

    const reviewItemId = asString(asRecord(reviewItemData).id);

    if (reviewItemId) {
      createdIds.reviewItemIds.push(reviewItemId);
      rowsActuallyWritten += 1;
    }

    const queueInsert = {
      user_id: params.context.appUserId,
      performed_by_actor_id: null,
      acting_as_actor_id: null,
      acting_for_actor_id: null,
      activity_event_id: activityEventId,
      value_object_id: fact.valueObjectId,
      semantic_object_key: fact.semanticObjectKey,
      reason: "fact_created",
      queue_status: "queued",
      metadata: {
        localFactId: fact.localFactId,
        factId,
        measureId,
        sourcePackageId,
        idempotencyKey,
        routeLayer: ROUTE_LAYER,
        temporalDirection,
        calendarEventId,
        existingActivityEventId,
      },
    };

    const { data: queueData, error: queueError } = await supabase
      .from("activity_fact_recalculation_queue")
      .insert(queueInsert)
      .select("id")
      .single();

    if (queueError) {
      return buildWriteErrorResponse({
        validation: params.validation,
        errorCode: "ACTIVITY_FACTS_SAVE_RECALC_QUEUE_INSERT_FAILED",
        errorMessage: queueError.message,
        status: 500,
        createdIds,
        rowsActuallyWritten,
      });
    }

    const queueId = asString(asRecord(queueData).id);

    if (queueId) {
      createdIds.recalculationQueueIds.push(queueId);
      rowsActuallyWritten += 1;
    }
  }

  const executionPlan = buildNoWriteExecutionPlan(params.validation);

  return NextResponse.json(
    {
      ok: true,
      endpoint: ENDPOINT,
      routeLayer: ROUTE_LAYER,
      routeStatus: "server_mediated_write_completed",
      productionWriteEnabled: true,
      writeStatus: "written",
      requestSummary: params.validation.summary,
      realityCoreNormalization,
      createdIds,
      plannedWrites: executionPlan.plannedWrites.map((write) => {
        return {
          ...write,
          writeStatus: "written",
        };
      }),
      skipped: executionPlan.skipped,
      dbWriteExecuted: true,
      sqlExecuted: false,
      openAiCallExecuted: false,
      sideEffects: {
        dbReadExecuted: true,
        dbWriteExecuted: true,
        sqlExecuted: false,
        openAiCallExecuted: false,
        valueObjectCreated: createdIds.valueObjectIds.length > 0,
        activityEventCreated: Boolean(createdIds.activityEventId),
        temporalDirection,
        calendarEventId,
        activityEventMeasureCreated: createdIds.measureIds.length > 0,
        activityObjectFactCreated: createdIds.factIds.length > 0,
        activityFactReviewItemCreated: createdIds.reviewItemIds.length > 0,
        recalculationQueueItemCreated:
          createdIds.recalculationQueueIds.length > 0,
        rowsActuallyWritten,
      },
      visibility: {
        readApi: "/api/activity/facts",
        page: "/activity-facts",
        expectedFilter: {
          activityEventId,
        },
      },
      safety: {
        serverMediatedOnly: true,
        directBrowserSupabaseWriteAllowed: false,
        duplicateChronologicalTimeAllowed: false,
        medicalDiagnosisAllowed: false,
        notes: [
          "The route derives user_id from Auth0 session -> app_users mapping.",
          "Client-provided user_id and actor_id are ignored.",
          "activity_events stores chronological time once.",
          "activity_object_facts stores user-owned semantic facts/exposures.",
          "This route does not execute SQL.",
          "This route does not call OpenAI.",
          "This first runtime patch reports partial createdIds if a later insert fails; a future step should move this into a DB transaction/RPC.",
        ],
      },
      debug: {
        sourcePackageId: body.sourcePackageId,
        idempotencyKey: body.idempotencyKey,
        factCount: facts.length,
        realityCoreContractVersion: realityCoreNormalization.contractVersion,
        parameterRegistryVersion: realityCoreNormalization.registryVersion,
        normalizedFactCount: realityCoreNormalization.normalizedCount,
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


import {
  runActivitySemanticOrchestrationServiceV0,
  type ActivitySemanticOrchestrationInputV0,
} from "../categoryDerivation/activitySemanticOrchestrationServiceV0";

export const ACTIVITY_CAPTURE_DETACHED_PREVIEW_ADAPTER_VERSION =
  "activity_capture_detached_preview_adapter_v0" as const;

export const ACTIVITY_CAPTURE_DETACHED_PREVIEW_ROUTE_MODE =
  "activity_capture_detached_preview_no_write_v0" as const;

export const ACTIVITY_CAPTURE_PRODUCT_PREVIEW_ROUTE =
  "/api/activity/semantic-orchestration-preview" as const;

const SIDE_EFFECTS = {
  sqlExecuted: false,
  dbReadExecuted: false,
  dbWriteExecuted: false,
  activityEventCreated: false,
  stableBundlePersisted: false,
  valueObjectCreated: false,
  activityValueObjectLinkCreated: false,
  stateFactCreated: false,
  stateDeltaCreated: false,
  stateSnapshotCreated: false,
  productionWriteGateOpened: false,
  sandboxWriteGateOpened: false,
  rowsActuallyWritten: 0,
} as const;

const TRUSTED_CLIENT_FIELD_DENY_LIST = [
  "activityEventId",
  "user_id",
  "userId",
  "authenticatedUserId",
  "owner_user_id",
  "ownerUserId",
  "organization_id",
  "organizationId",
  "organization_owner_id",
  "organizationOwnerId",
  "visibility_scope",
  "visibilityScope",
] as const;

const WRITE_FLAG_DENY_LIST = [
  "allowActivityEventCreation",
  "allowValueObjectCreation",
  "allowStateWrites",
  "productionWriteEnabled",
  "sandboxWriteEnabled",
  "writeGateOpened",
] as const;

type JsonRecord = Record<string, unknown>;

type ActivityCaptureDetachedPreviewSourceV0 = NonNullable<
  ActivitySemanticOrchestrationInputV0["source"]
>;

export type ActivityCaptureDetachedPreviewInputV0 = {
  rawText?: unknown;
  inputLanguage?: unknown;
  source?: unknown;
  mode?: unknown;
  [key: string]: unknown;
};

export type ActivityCaptureDetachedPreviewResultV0 = {
  ok: boolean;
  httpStatus: 200 | 400 | 500;
  adapterVersion: typeof ACTIVITY_CAPTURE_DETACHED_PREVIEW_ADAPTER_VERSION;
  routeMode: typeof ACTIVITY_CAPTURE_DETACHED_PREVIEW_ROUTE_MODE;
  productPreviewRoute: typeof ACTIVITY_CAPTURE_PRODUCT_PREVIEW_ROUTE;
  activityCapturePreviewReady: boolean;
  semanticPreviewReady: boolean;
  orchestrationReady: boolean;
  internalServiceCalled: boolean;
  debugRouteCalled: false;
  activityEventId: null;
  stableBundleId: null;
  transactionStepCount: number;
  memberTransactionStepCount: number;
  blockedAuditTransactionStepCount: number;
  activityReviewDraft: {
    title: "I understood it like this";
    userFacingTitleRu: "Я понял это так";
    savedStatus: "not_saved_yet";
    rawText: string;
    inputLanguage: string;
    source: ActivityCaptureDetachedPreviewSourceV0;
    mode: "preview_only";
    notSavedYet: true;
    canEditBeforeSave: true;
    canConfirmNow: false;
    confirmationRequiresLaterGate: true;
  };
  sideEffects: typeof SIDE_EFFECTS;
  errors: string[];
  warnings: string[];
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeInputLanguage(value: unknown): string {
  const text = asTrimmedString(value);
  return text === "" ? "unknown" : text;
}

function normalizeSource(value: unknown): ActivityCaptureDetachedPreviewSourceV0 {
  const text = asTrimmedString(value);
  const allowed: ActivityCaptureDetachedPreviewSourceV0[] = [
    "manual",
    "chat_ai",
    "calendar",
    "booking",
    "rule",
    "import",
    "system",
  ];

  return allowed.includes(text as ActivityCaptureDetachedPreviewSourceV0)
    ? (text as ActivityCaptureDetachedPreviewSourceV0)
    : "manual";
}

function hasProvidedField(body: JsonRecord, key: string): boolean {
  if (!Object.prototype.hasOwnProperty.call(body, key)) {
    return false;
  }

  const value = body[key];

  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === "string" && value.trim() === "") {
    return false;
  }

  return true;
}

function hasTruthyWriteFlag(body: JsonRecord, key: string): boolean {
  const value = body[key];
  return value === true || value === "true" || value === 1 || value === "1";
}

function buildReviewDraft(
  rawText: string,
  inputLanguage: string,
  source: ActivityCaptureDetachedPreviewSourceV0
): ActivityCaptureDetachedPreviewResultV0["activityReviewDraft"] {
  return {
    title: "I understood it like this",
    userFacingTitleRu: "Я понял это так",
    savedStatus: "not_saved_yet",
    rawText,
    inputLanguage,
    source,
    mode: "preview_only",
    notSavedYet: true,
    canEditBeforeSave: true,
    canConfirmNow: false,
    confirmationRequiresLaterGate: true,
  };
}

function buildDeniedResult(
  errors: string[],
  rawText: string,
  inputLanguage: string,
  source: ActivityCaptureDetachedPreviewSourceV0
): ActivityCaptureDetachedPreviewResultV0 {
  return {
    ok: false,
    httpStatus: 400,
    adapterVersion: ACTIVITY_CAPTURE_DETACHED_PREVIEW_ADAPTER_VERSION,
    routeMode: ACTIVITY_CAPTURE_DETACHED_PREVIEW_ROUTE_MODE,
    productPreviewRoute: ACTIVITY_CAPTURE_PRODUCT_PREVIEW_ROUTE,
    activityCapturePreviewReady: false,
    semanticPreviewReady: false,
    orchestrationReady: false,
    internalServiceCalled: false,
    debugRouteCalled: false,
    activityEventId: null,
    stableBundleId: null,
    transactionStepCount: 0,
    memberTransactionStepCount: 0,
    blockedAuditTransactionStepCount: 0,
    activityReviewDraft: buildReviewDraft(rawText, inputLanguage, source),
    sideEffects: SIDE_EFFECTS,
    errors,
    warnings: [
      "Activity Capture detached preview denied request before semantic service call.",
      "No data was saved.",
      "This preview is not saved yet.",
    ],
  };
}

function validateInput(body: JsonRecord): {
  errors: string[];
  rawText: string;
  inputLanguage: string;
  source: ActivityCaptureDetachedPreviewSourceV0;
} {
  const rawText = asTrimmedString(body.rawText);
  const inputLanguage = normalizeInputLanguage(body.inputLanguage);
  const source = normalizeSource(body.source);
  const errors: string[] = [];

  if (rawText.length === 0) {
    errors.push("rawText is required");
  }

  if (rawText.length > 4000) {
    errors.push("rawText is too long for C33-P.2 detached preview skeleton");
  }

  const mode = asTrimmedString(body.mode);
  if (mode !== "" && mode !== "preview_only") {
    errors.push("only preview_only mode is allowed");
  }

  for (const field of TRUSTED_CLIENT_FIELD_DENY_LIST) {
    if (hasProvidedField(body, field)) {
      errors.push(`${field} is not accepted by Activity Capture detached preview`);
    }
  }

  for (const field of WRITE_FLAG_DENY_LIST) {
    if (hasTruthyWriteFlag(body, field)) {
      errors.push(`${field} is not allowed in Activity Capture detached preview`);
    }
  }

  return {
    errors,
    rawText,
    inputLanguage,
    source,
  };
}

export function runActivityCaptureDetachedPreviewAdapterV0(
  input: ActivityCaptureDetachedPreviewInputV0
): ActivityCaptureDetachedPreviewResultV0 {
  const body = isRecord(input) ? input : {};
  const validation = validateInput(body);

  if (validation.errors.length > 0) {
    return buildDeniedResult(
      validation.errors,
      validation.rawText,
      validation.inputLanguage,
      validation.source
    );
  }

  const orchestrationResult = runActivitySemanticOrchestrationServiceV0({
    mode: "preview_only",
    rawText: validation.rawText,
    inputLanguage: validation.inputLanguage,
    source: validation.source,
    activityEventId: null,
    authenticatedUserId: null,
    allowActivityEventCreation: false,
    allowValueObjectCreation: false,
    allowStateWrites: false,
  });

  return {
    ok: orchestrationResult.ok,
    httpStatus: orchestrationResult.ok ? 200 : 500,
    adapterVersion: ACTIVITY_CAPTURE_DETACHED_PREVIEW_ADAPTER_VERSION,
    routeMode: ACTIVITY_CAPTURE_DETACHED_PREVIEW_ROUTE_MODE,
    productPreviewRoute: ACTIVITY_CAPTURE_PRODUCT_PREVIEW_ROUTE,
    activityCapturePreviewReady: orchestrationResult.ok,
    semanticPreviewReady: orchestrationResult.ok,
    orchestrationReady: true,
    internalServiceCalled: true,
    debugRouteCalled: false,
    activityEventId: null,
    stableBundleId: null,
    transactionStepCount:
      orchestrationResult.orchestration.transactionStepCount,
    memberTransactionStepCount:
      orchestrationResult.orchestration.memberTransactionStepCount,
    blockedAuditTransactionStepCount:
      orchestrationResult.orchestration.blockedAuditTransactionStepCount,
    activityReviewDraft: buildReviewDraft(
      validation.rawText,
      validation.inputLanguage,
      validation.source
    ),
    sideEffects: SIDE_EFFECTS,
    errors: orchestrationResult.errors,
    warnings: [
      ...orchestrationResult.warnings,
      "This preview is not saved yet.",
      "Activity Event is not created in C33-P.2.",
      "Stable Semantic Bundle is not persisted in C33-P.2.",
    ],
  };
}

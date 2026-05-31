import { NextResponse } from "next/server";

import {
  runActivitySemanticOrchestrationServiceV0,
  type ActivitySemanticOrchestrationInputV0,
} from "../../../../../lib/activity/categoryDerivation/activitySemanticOrchestrationServiceV0";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT = "/api/activity/semantic-orchestration-preview";
const ROUTE_CONTRACT_VERSION = "product_semantic_preview_route_skeleton_v0";
const ROUTE_MODE = "product_semantic_preview_no_write_v0" as const;

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
  "user_id",
  "userId",
  "authenticatedUserId",
  "owner_user_id",
  "ownerUserId",
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

type ProductSemanticPreviewSourceV0 = NonNullable<
  ActivitySemanticOrchestrationInputV0["source"]
>;

type JsonRecord = Record<string, unknown>;

function json(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(
    {
      ...payload,
      endpoint: ENDPOINT,
      routeContractVersion: ROUTE_CONTRACT_VERSION,
      routeMode: ROUTE_MODE,
      sourceContracts: {
        c33O1: "product_semantic_preview_route_contract",
        c33N2: "activity_semantic_orchestration_service_v0",
        c33N3: "product_routes_call_internal_services_directly",
        c33N4: "client_identity_is_not_trusted",
      },
    },
    { status }
  );
}

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

function normalizeSource(value: unknown): ProductSemanticPreviewSourceV0 {
  const text = asTrimmedString(value);
  const allowed: ProductSemanticPreviewSourceV0[] = [
    "manual",
    "chat_ai",
    "calendar",
    "booking",
    "rule",
    "import",
    "system",
  ];

  return allowed.includes(text as ProductSemanticPreviewSourceV0)
    ? (text as ProductSemanticPreviewSourceV0)
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

function buildDeniedResponse(errors: string[]) {
  return json(
    {
      ok: false,
      semanticPreviewReady: false,
      orchestrationReady: false,
      productRouteReady: false,
      internalServiceCalled: false,
      debugRouteCalled: false,
      activityEventId: null,
      stableBundleId: null,
      transactionStepCount: 0,
      memberTransactionStepCount: 0,
      blockedAuditTransactionStepCount: 0,
      sideEffects: SIDE_EFFECTS,
      errors,
      warnings: [
        "Request was denied before calling the internal orchestration service.",
        "C33-O.2 route skeleton is preview-only and no-write.",
        "Client-provided identity/write fields are not trusted.",
      ],
    },
    400
  );
}

function validateRequest(body: JsonRecord): {
  errors: string[];
  rawText: string;
  inputLanguage: string;
  source: ProductSemanticPreviewSourceV0;
} {
  const rawText = asTrimmedString(body.rawText);
  const inputLanguage = normalizeInputLanguage(body.inputLanguage);
  const source = normalizeSource(body.source);
  const errors: string[] = [];

  if (rawText.length === 0) {
    errors.push("rawText is required");
  }

  if (rawText.length > 4000) {
    errors.push("rawText is too long for C33-O.2 preview skeleton");
  }

  const mode = asTrimmedString(body.mode);
  if (mode !== "" && mode !== "preview_only") {
    errors.push("only preview_only mode is allowed");
  }

  if (hasProvidedField(body, "activityEventId")) {
    errors.push("activityEventId is not accepted by the first product preview route skeleton");
  }

  for (const field of TRUSTED_CLIENT_FIELD_DENY_LIST) {
    if (hasProvidedField(body, field)) {
      errors.push(`client-provided ${field} is not trusted`);
    }
  }

  for (const field of WRITE_FLAG_DENY_LIST) {
    if (hasTruthyWriteFlag(body, field)) {
      errors.push(`${field} is not allowed in product semantic preview`);
    }
  }

  return {
    errors,
    rawText,
    inputLanguage,
    source,
  };
}

export async function GET() {
  return json({
    ok: true,
    productRouteReady: true,
    routePurpose: "product_style_semantic_preview_no_write",
    allowedMethod: "POST",
    createdByBlock: "C33-O.2",
    rules: [
      "C33-O.2 creates a product-style route skeleton.",
      "Route is preview-only.",
      "Route performs no SQL execution.",
      "Route performs no DB read.",
      "Route performs no DB write.",
      "Route calls internal activitySemanticOrchestrationServiceV0 directly.",
      "Route does not call debug routes.",
      "Route rejects Activity Event references in the first skeleton.",
      "Route rejects client-provided identity fields.",
      "Route rejects write flags.",
      "Route creates no Activity Event.",
      "Route persists no Stable Semantic Bundle.",
      "Route creates no Value Object.",
      "Route creates no State Fact, Delta or Snapshot.",
    ],
    sideEffects: SIDE_EFFECTS,
  });
}

export async function POST(request: Request) {
  let body: JsonRecord = {};

  try {
    const parsed = await request.json();
    body = isRecord(parsed) ? parsed : {};
  } catch {
    body = {};
  }

  const validation = validateRequest(body);

  if (validation.errors.length > 0) {
    return buildDeniedResponse(validation.errors);
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

  return json(
    {
      ok: orchestrationResult.ok,
      semanticPreviewReady: orchestrationResult.ok,
      orchestrationReady: true,
      productRouteReady: true,
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
      input: {
        rawText: validation.rawText,
        inputLanguage: validation.inputLanguage,
        source: validation.source,
        mode: "preview_only",
        activityEventId: null,
      },
      orchestration: {
        servicePolicy: orchestrationResult.policy,
        serviceMode: orchestrationResult.serviceMode,
        stableBundleServiceCalled:
          orchestrationResult.orchestration.stableBundleServiceCalled,
        stableBundleServiceMode:
          orchestrationResult.orchestration.stableBundleServiceMode,
        stableBundleServiceOk:
          orchestrationResult.orchestration.stableBundleServiceOk,
        activityEventReferenceAccepted:
          orchestrationResult.orchestration.activityEventReferenceAccepted,
      },
      sideEffects: SIDE_EFFECTS,
      errors: orchestrationResult.errors,
      warnings: [
        ...orchestrationResult.warnings,
        "C33-O.2 product preview route skeleton performs no DB read or write.",
      ],
    },
    orchestrationResult.ok ? 200 : 500
  );
}

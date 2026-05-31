import { NextResponse } from "next/server";

import {
  STATE_HOOK_PREVIEW_ADAPTER_VERSION,
  STATE_HOOK_PREVIEW_ROUTE,
  STATE_HOOK_PREVIEW_ROUTE_MODE,
  runStateHookPreviewAdapterV0,
} from "../../../../../../lib/activity/stateHooks/stateHookPreviewAdapterV0";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT = "/api/activity/state-hooks/preview";

const SIDE_EFFECTS = {
  sqlExecuted: false,
  dbReadExecuted: false,
  dbWriteExecuted: false,
  stateFactCreated: false,
  stateDeltaCreated: false,
  stateSnapshotCreated: false,
  semanticCapitalWritten: false,
  valueObjectCreated: false,
  activityValueObjectLinkCreated: false,
  activeCategoryCreated: false,
  externalConceptMappingCreated: false,
  medicalDiagnosisCreated: false,
  financialAdviceCreated: false,
  productivityScoreCreated: false,
  productionWriteGateOpened: false,
  sandboxWriteGateOpened: false,
  rowsActuallyWritten: 0,
} as const;

function json(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(
    {
      ...payload,
      endpoint: ENDPOINT,
      adapterVersion: STATE_HOOK_PREVIEW_ADAPTER_VERSION,
      routeMode: STATE_HOOK_PREVIEW_ROUTE_MODE,
      canonicalRoute: STATE_HOOK_PREVIEW_ROUTE,
      sourceContracts: {
        c33S1: "state_hook_boundary",
        c33S2: "state_hook_preview_skeleton",
        c33R5: "value_object_candidate_productization_final_lock",
        c33Q5: "semantic_review_new_concepts_final_lock",
        c33P5: "activity_capture_product_integration_final_lock",
      },
    },
    { status }
  );
}

export async function GET() {
  return json({
    ok: true,
    stateHookPreviewRouteReady: true,
    routePurpose: "state_hooks_preview_no_write",
    allowedMethod: "POST",
    createdByBlock: "C33-S.2",
    rules: [
      "C33-S.2 creates a no-write State hook preview skeleton.",
      "Route derives provisional hooks from Activity Capture, Semantic Review and Value Object candidate previews.",
      "Route performs no SQL execution.",
      "Route performs no DB read.",
      "Route performs no DB write.",
      "Route creates no State Fact.",
      "Route creates no State Delta.",
      "Route creates no State Snapshot.",
      "Route writes no Semantic Capital.",
      "Route creates no Value Object.",
      "Route creates no medical, financial or productivity conclusion as truth.",
      "Route returns hooks marked not confirmed yet.",
      "Confirm/apply/persist actions require a future State write gate.",
    ],
    sideEffects: SIDE_EFFECTS,
  });
}

export async function POST(request: Request) {
  let body: unknown = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const result = runStateHookPreviewAdapterV0(
    body && typeof body === "object" ? (body as Record<string, unknown>) : {}
  );

  return json(result, result.httpStatus);
}


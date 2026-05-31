import { NextResponse } from "next/server";

import {
  ACTIVITY_CAPTURE_DETACHED_PREVIEW_ADAPTER_VERSION,
  ACTIVITY_CAPTURE_DETACHED_PREVIEW_ROUTE_MODE,
  ACTIVITY_CAPTURE_PRODUCT_PREVIEW_ROUTE,
  runActivityCaptureDetachedPreviewAdapterV0,
} from "../../../../../../lib/activity/capture/activityCaptureDetachedPreviewAdapterV0";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT = "/api/activity/capture/detached-semantic-preview";

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

function json(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(
    {
      ...payload,
      endpoint: ENDPOINT,
      adapterVersion: ACTIVITY_CAPTURE_DETACHED_PREVIEW_ADAPTER_VERSION,
      routeMode: ACTIVITY_CAPTURE_DETACHED_PREVIEW_ROUTE_MODE,
      productPreviewRoute: ACTIVITY_CAPTURE_PRODUCT_PREVIEW_ROUTE,
      sourceContracts: {
        c33P1: "activity_capture_detached_preview_contract",
        c33P2: "activity_input_wiring_skeleton",
        c33O2: "product_semantic_preview_route_skeleton",
        c33O5: "product_semantic_preview_final_lock",
      },
    },
    { status }
  );
}

export async function GET() {
  return json({
    ok: true,
    activityCapturePreviewRouteReady: true,
    routePurpose: "activity_capture_detached_semantic_preview_no_write",
    allowedMethod: "POST",
    createdByBlock: "C33-P.2",
    rules: [
      "C33-P.2 creates an Activity Capture detached preview wiring skeleton.",
      "Route is preview-only.",
      "Route performs no SQL execution.",
      "Route performs no DB read.",
      "Route performs no DB write.",
      "Route creates no Activity Event.",
      "Route persists no Stable Semantic Bundle.",
      "Route creates no Value Object.",
      "Route creates no State Fact, Delta or Snapshot.",
      "Route rejects Activity Event ids.",
      "Route rejects client identity fields.",
      "Route rejects write flags.",
      "Route returns an Activity Review draft marked not saved yet.",
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

  const result = runActivityCaptureDetachedPreviewAdapterV0(
    body && typeof body === "object" ? (body as Record<string, unknown>) : {}
  );

  return json(result, result.httpStatus);
}

import { NextResponse } from "next/server";

import {
  VALUE_OBJECT_CANDIDATE_DISPLAY_ADAPTER_VERSION,
  VALUE_OBJECT_CANDIDATE_DISPLAY_ROUTE,
  VALUE_OBJECT_CANDIDATE_DISPLAY_ROUTE_MODE,
  runValueObjectCandidateDisplayAdapterV0,
} from "../../../../../../lib/activity/valueObjects/valueObjectCandidateDisplayAdapterV0";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT = "/api/activity/value-objects/candidates-preview";

const SIDE_EFFECTS = {
  sqlExecuted: false,
  dbReadExecuted: false,
  dbWriteExecuted: false,
  valueObjectCreated: false,
  activityValueObjectLinkCreated: false,
  offerCreated: false,
  certificateBaseCreated: false,
  activeCategoryCreated: false,
  externalConceptMappingCreated: false,
  semanticCapitalWritten: false,
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
      adapterVersion: VALUE_OBJECT_CANDIDATE_DISPLAY_ADAPTER_VERSION,
      routeMode: VALUE_OBJECT_CANDIDATE_DISPLAY_ROUTE_MODE,
      canonicalRoute: VALUE_OBJECT_CANDIDATE_DISPLAY_ROUTE,
      sourceContracts: {
        c33R1: "value_object_candidate_boundary",
        c33R2: "value_object_candidate_display_skeleton",
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
    valueObjectCandidateDisplayRouteReady: true,
    routePurpose: "value_object_candidates_preview_no_write",
    allowedMethod: "POST",
    createdByBlock: "C33-R.2",
    rules: [
      "C33-R.2 creates a no-write Value Object candidate display skeleton.",
      "Route derives provisional candidates from Activity Capture and Semantic Review previews.",
      "Route performs no SQL execution.",
      "Route performs no DB read.",
      "Route performs no DB write.",
      "Route creates no Value Object.",
      "Route creates no Activity-to-Value-Object link.",
      "Route creates no offer or certificate base.",
      "Route writes no Semantic Capital.",
      "Route creates no State Fact, Delta or Snapshot.",
      "Route returns candidates marked not created yet.",
      "Create/link/expose actions require a future Value Object write gate.",
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

  const result = runValueObjectCandidateDisplayAdapterV0(
    body && typeof body === "object" ? (body as Record<string, unknown>) : {}
  );

  return json(result, result.httpStatus);
}

import { NextResponse } from "next/server";

import {
  NEW_CONCEPT_CANDIDATE_DISPLAY_ADAPTER_VERSION,
  NEW_CONCEPT_CANDIDATE_DISPLAY_ROUTE,
  NEW_CONCEPT_CANDIDATE_DISPLAY_ROUTE_MODE,
  runNewConceptCandidateDisplayAdapterV0,
} from "../../../../../../lib/activity/semanticReview/newConceptCandidateDisplayAdapterV0";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT = "/api/activity/semantic-review/new-concept-candidates-preview";

const SIDE_EFFECTS = {
  sqlExecuted: false,
  dbReadExecuted: false,
  dbWriteExecuted: false,
  activeCategoryCreated: false,
  externalConceptMappingCreated: false,
  semanticCapitalWritten: false,
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
      adapterVersion: NEW_CONCEPT_CANDIDATE_DISPLAY_ADAPTER_VERSION,
      routeMode: NEW_CONCEPT_CANDIDATE_DISPLAY_ROUTE_MODE,
      canonicalRoute: NEW_CONCEPT_CANDIDATE_DISPLAY_ROUTE,
      sourceContracts: {
        c33Q1: "semantic_review_new_concepts_ui_boundary",
        c33Q2: "new_concept_candidate_display_skeleton",
        c33P5: "activity_capture_product_integration_final_lock",
      },
    },
    { status }
  );
}

export async function GET() {
  return json({
    ok: true,
    semanticReviewCandidateDisplayRouteReady: true,
    routePurpose: "semantic_review_new_concept_candidates_no_write",
    allowedMethod: "POST",
    createdByBlock: "C33-Q.2",
    rules: [
      "C33-Q.2 creates a no-write Semantic Review candidate display skeleton.",
      "Route derives provisional candidates from detached Activity Capture preview.",
      "Route performs no SQL execution.",
      "Route performs no DB read.",
      "Route performs no DB write.",
      "Route creates no active category.",
      "Route creates no external concept mapping.",
      "Route writes no Semantic Capital.",
      "Route creates no Value Object.",
      "Route creates no State Fact, Delta or Snapshot.",
      "Route returns review candidates marked not approved yet.",
      "Approve/reject/merge actions require a future governance gate.",
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

  const result = runNewConceptCandidateDisplayAdapterV0(
    body && typeof body === "object" ? (body as Record<string, unknown>) : {}
  );

  return json(result, result.httpStatus);
}

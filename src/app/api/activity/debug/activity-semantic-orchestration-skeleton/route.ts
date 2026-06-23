import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { NextResponse } from "next/server";

import {
  ACTIVITY_SEMANTIC_ORCHESTRATION_SERVICE_MODE_V0,
  ACTIVITY_SEMANTIC_ORCHESTRATION_SERVICE_POLICY_V0,
  buildActivitySemanticOrchestrationServiceReadinessV0,
  runActivitySemanticOrchestrationServiceV0,
  type ActivitySemanticOrchestrationInputV0,
} from "../../../../../../lib/activity/categoryDerivation/activitySemanticOrchestrationServiceV0";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT = "/api/activity/debug/activity-semantic-orchestration-skeleton";
const ROUTE_CONTRACT_VERSION =
  "activity_semantic_orchestration_skeleton_route_v0";

function withRouteMetadata(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(
    {
      ...payload,
      endpoint: ENDPOINT,
      routeContractVersion: ROUTE_CONTRACT_VERSION,
      sourceContracts: {
        orchestrationPolicy: ACTIVITY_SEMANTIC_ORCHESTRATION_SERVICE_POLICY_V0,
        orchestrationMode: ACTIVITY_SEMANTIC_ORCHESTRATION_SERVICE_MODE_V0,
        stableBundleServicePolicy: "stable_semantic_bundle_persistence_service_v0",
        c33N1Boundary:
          "activity_capture_and_stable_bundle_persistence_remain_separate_services",
      },
    },
    { status }
  );
}

export async function GET() {
  const platformAdminGuard = await requirePlatformAdmin();

  if (!platformAdminGuard.ok) {
    return platformAdminErrorResponse(
      platformAdminGuard,
      "debug-api-platform-admin-guard-v1",
    );
  }

  return withRouteMetadata({
    ...buildActivitySemanticOrchestrationServiceReadinessV0(),
  });
}

export async function POST(request: Request) {
  const platformAdminGuard = await requirePlatformAdmin();

  if (!platformAdminGuard.ok) {
    return platformAdminErrorResponse(
      platformAdminGuard,
      "debug-api-platform-admin-guard-v1",
    );
  }

  let body: ActivitySemanticOrchestrationInputV0;

  try {
    body = (await request.json()) as ActivitySemanticOrchestrationInputV0;
  } catch {
    body = {};
  }

  const result = runActivitySemanticOrchestrationServiceV0(body);

  return withRouteMetadata(result, result.ok ? 200 : 400);
}

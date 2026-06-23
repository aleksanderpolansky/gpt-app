import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { NextResponse } from "next/server";

import {
  STABLE_SEMANTIC_BUNDLE_ACTIVITY_EVENT_REFERENCE_DRY_RUN_MODE_V0,
  STABLE_SEMANTIC_BUNDLE_ACTIVITY_EVENT_REFERENCE_DRY_RUN_POLICY_V0,
  buildStableSemanticBundleActivityEventReferenceDryRunReadinessV0,
  buildStableSemanticBundleActivityEventReferenceDryRunV0,
} from "../../../../../../lib/activity/categoryDerivation/stableSemanticBundleActivityEventReferenceDryRunV0";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT =
  "/api/activity/debug/stable-semantic-bundle-activity-event-reference-dry-run";
const ROUTE_CONTRACT_VERSION =
  "stable_semantic_bundle_activity_event_reference_dry_run_route_v0";

function withRouteMetadata(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(
    {
      ...payload,
      endpoint: ENDPOINT,
      routeContractVersion: ROUTE_CONTRACT_VERSION,
      sourceContracts: {
        activityEventReferencePolicy:
          STABLE_SEMANTIC_BUNDLE_ACTIVITY_EVENT_REFERENCE_DRY_RUN_POLICY_V0,
        activityEventReferenceMode:
          STABLE_SEMANTIC_BUNDLE_ACTIVITY_EVENT_REFERENCE_DRY_RUN_MODE_V0,
        servicePolicy: "stable_semantic_bundle_persistence_service_v0",
        c33L4Policy:
          "stable_bundle_can_reference_existing_activity_event_but_must_not_create_it",
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
    ...buildStableSemanticBundleActivityEventReferenceDryRunReadinessV0(),
  });
}

export async function POST() {
  const platformAdminGuard = await requirePlatformAdmin();

  if (!platformAdminGuard.ok) {
    return platformAdminErrorResponse(
      platformAdminGuard,
      "debug-api-platform-admin-guard-v1",
    );
  }

  const result = buildStableSemanticBundleActivityEventReferenceDryRunV0();

  return withRouteMetadata(result, result.ok ? 200 : 500);
}

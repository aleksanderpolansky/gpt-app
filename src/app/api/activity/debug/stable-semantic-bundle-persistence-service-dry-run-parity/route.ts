import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { NextResponse } from "next/server";

import {
  STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_DRY_RUN_PARITY_MODE_V0,
  STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_DRY_RUN_PARITY_POLICY_V0,
  buildStableSemanticBundlePersistenceServiceDryRunParityReadinessV0,
  buildStableSemanticBundlePersistenceServiceDryRunParityV0,
} from "../../../../../../lib/activity/categoryDerivation/stableSemanticBundlePersistenceServiceDryRunParityV0";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT =
  "/api/activity/debug/stable-semantic-bundle-persistence-service-dry-run-parity";
const ROUTE_CONTRACT_VERSION =
  "stable_semantic_bundle_persistence_service_dry_run_parity_route_v0";

function withRouteMetadata(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(
    {
      ...payload,
      endpoint: ENDPOINT,
      routeContractVersion: ROUTE_CONTRACT_VERSION,
      sourceContracts: {
        parityPolicy:
          STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_DRY_RUN_PARITY_POLICY_V0,
        parityMode:
          STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_DRY_RUN_PARITY_MODE_V0,
        servicePolicy: "stable_semantic_bundle_persistence_service_v0",
        transactionContractPolicy: "stable_semantic_bundle_transaction_contract_v0",
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
    ...buildStableSemanticBundlePersistenceServiceDryRunParityReadinessV0(),
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

  const result = buildStableSemanticBundlePersistenceServiceDryRunParityV0();

  return withRouteMetadata(result, result.ok ? 200 : 500);
}

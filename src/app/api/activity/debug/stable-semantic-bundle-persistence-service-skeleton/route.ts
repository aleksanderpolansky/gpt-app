import { NextResponse } from "next/server";

import {
  STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_MODE_V0,
  STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_POLICY_V0,
  buildStableSemanticBundlePersistenceServiceReadinessV0,
  runStableSemanticBundlePersistenceServiceV0,
  type StableSemanticBundlePersistenceServiceInputV0,
} from "../../../../../../lib/activity/categoryDerivation/stableSemanticBundlePersistenceServiceV0";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT =
  "/api/activity/debug/stable-semantic-bundle-persistence-service-skeleton";
const ROUTE_CONTRACT_VERSION =
  "stable_semantic_bundle_persistence_service_skeleton_route_v0";

function withRouteMetadata(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(
    {
      ...payload,
      endpoint: ENDPOINT,
      routeContractVersion: ROUTE_CONTRACT_VERSION,
      sourceContracts: {
        servicePolicy: STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_POLICY_V0,
        serviceMode: STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_MODE_V0,
        transactionContractPolicy: "stable_semantic_bundle_transaction_contract_v0",
        c33L5Policy:
          "production_stable_semantic_bundle_writes_remain_closed",
      },
    },
    { status }
  );
}

export async function GET() {
  return withRouteMetadata({
    ...buildStableSemanticBundlePersistenceServiceReadinessV0(),
  });
}

export async function POST(request: Request) {
  let body: StableSemanticBundlePersistenceServiceInputV0;

  try {
    body = (await request.json()) as StableSemanticBundlePersistenceServiceInputV0;
  } catch {
    body = {};
  }

  const result = runStableSemanticBundlePersistenceServiceV0(body);

  return withRouteMetadata(result);
}

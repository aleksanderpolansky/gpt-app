import { NextResponse } from "next/server";

import {
  UNRESOLVED_STABLE_BUNDLE_BLOCKER_MODE_V0,
  UNRESOLVED_STABLE_BUNDLE_BLOCKER_POLICY_V0,
  buildUnresolvedStableBundleBlockerReadinessV0,
  buildUnresolvedStableBundleBlockerV0,
  type UnresolvedStableBundleBlockerRawInputV0,
} from "../../../../../../lib/activity/categoryDerivation/unresolvedStableBundleBlockerV0";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT = "/api/activity/debug/unresolved-stable-bundle-blocker";
const ROUTE_CONTRACT_VERSION =
  "unresolved_stable_bundle_blocker_route_v0";

export async function GET() {
  return NextResponse.json({
    ...buildUnresolvedStableBundleBlockerReadinessV0(),
    endpoint: ENDPOINT,
    routeContractVersion: ROUTE_CONTRACT_VERSION,
    sourceContracts: {
      unresolvedStableBundleBlockerPolicy:
        UNRESOLVED_STABLE_BUNDLE_BLOCKER_POLICY_V0,
      unresolvedStableBundleBlockerMode:
        UNRESOLVED_STABLE_BUNDLE_BLOCKER_MODE_V0,
      resolverDecisionPolicy: "resolver_decision_contract_v0",
      primaryCategorySourceSearchOrderPolicy:
        "primary_category_source_search_order_proof_v0",
      externalConceptStubPolicy: "external_concept_stub_v0",
      unknownTermDetectorPolicy: "unknown_term_detector_v0",
      localControlledCategoryLookupPolicy:
        "local_controlled_category_lookup_v0",
    },
  });
}

export async function POST(request: Request) {
  let body: UnresolvedStableBundleBlockerRawInputV0;

  try {
    body = (await request.json()) as UnresolvedStableBundleBlockerRawInputV0;
  } catch {
    const result = buildUnresolvedStableBundleBlockerV0({});

    return NextResponse.json(
      {
        ...result,
        endpoint: ENDPOINT,
        routeContractVersion: ROUTE_CONTRACT_VERSION,
        error: "Invalid JSON body.",
      },
      { status: 400 }
    );
  }

  const result = buildUnresolvedStableBundleBlockerV0(body);

  return NextResponse.json(
    {
      ...result,
      endpoint: ENDPOINT,
      routeContractVersion: ROUTE_CONTRACT_VERSION,
      sourceContracts: {
        unresolvedStableBundleBlockerPolicy:
          UNRESOLVED_STABLE_BUNDLE_BLOCKER_POLICY_V0,
        unresolvedStableBundleBlockerMode:
          UNRESOLVED_STABLE_BUNDLE_BLOCKER_MODE_V0,
        resolverDecisionPolicy: "resolver_decision_contract_v0",
        primaryCategorySourceSearchOrderPolicy:
          "primary_category_source_search_order_proof_v0",
        externalConceptStubPolicy: "external_concept_stub_v0",
        unknownTermDetectorPolicy: "unknown_term_detector_v0",
        localControlledCategoryLookupPolicy:
          "local_controlled_category_lookup_v0",
      },
      execution: {
        unresolvedStableBundleBlockerExecuted: result.ok,
        resolverDecisionExecuted: true,
        primarySearchOrderProofExecuted: true,
        localControlledCategoryLookupExecuted: true,
        unknownTermDetectorExecuted: true,
        externalConceptStubExecuted: true,
        resolverPersisted: false,
        resolverDecisionPersisted: false,
        stableBundlePersisted: false,
        stableBundleCreated: false,
        externalOntologyCalled: false,
        externalNetworkCallExecuted: false,
        unknownTermCandidatePersisted: false,
        externalConceptCandidatePersisted: false,
        persistenceAttempted: false,
        statePersistenceAttempted: false,
      },
    },
    { status: result.ok ? 200 : 400 }
  );
}

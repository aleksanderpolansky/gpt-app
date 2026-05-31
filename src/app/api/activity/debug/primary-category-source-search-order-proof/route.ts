import { NextResponse } from "next/server";

import {
  PRIMARY_CATEGORY_SOURCE_SEARCH_ORDER_MODE_V0,
  PRIMARY_CATEGORY_SOURCE_SEARCH_ORDER_POLICY_V0,
  buildPrimaryCategorySourceSearchOrderProofV0,
  buildPrimaryCategorySourceSearchOrderReadinessV0,
  type PrimaryCategorySourceSearchOrderRawInputV0,
} from "../../../../../../lib/activity/categoryDerivation/primaryCategorySourceSearchOrderProofV0";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT =
  "/api/activity/debug/primary-category-source-search-order-proof";
const ROUTE_CONTRACT_VERSION =
  "primary_category_source_search_order_proof_route_v0";

export async function GET() {
  return NextResponse.json({
    ...buildPrimaryCategorySourceSearchOrderReadinessV0(),
    endpoint: ENDPOINT,
    routeContractVersion: ROUTE_CONTRACT_VERSION,
    sourceContracts: {
      primaryCategorySourceSearchOrderPolicy:
        PRIMARY_CATEGORY_SOURCE_SEARCH_ORDER_POLICY_V0,
      primaryCategorySourceSearchOrderMode:
        PRIMARY_CATEGORY_SOURCE_SEARCH_ORDER_MODE_V0,
      externalConceptStubPolicy: "external_concept_stub_v0",
      unknownTermDetectorPolicy: "unknown_term_detector_v0",
      localControlledCategoryLookupPolicy:
        "local_controlled_category_lookup_v0",
    },
  });
}

export async function POST(request: Request) {
  let body: PrimaryCategorySourceSearchOrderRawInputV0;

  try {
    body = (await request.json()) as PrimaryCategorySourceSearchOrderRawInputV0;
  } catch {
    const result = buildPrimaryCategorySourceSearchOrderProofV0({});

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

  const result = buildPrimaryCategorySourceSearchOrderProofV0(body);

  return NextResponse.json(
    {
      ...result,
      endpoint: ENDPOINT,
      routeContractVersion: ROUTE_CONTRACT_VERSION,
      sourceContracts: {
        primaryCategorySourceSearchOrderPolicy:
          PRIMARY_CATEGORY_SOURCE_SEARCH_ORDER_POLICY_V0,
        primaryCategorySourceSearchOrderMode:
          PRIMARY_CATEGORY_SOURCE_SEARCH_ORDER_MODE_V0,
        externalConceptStubPolicy: "external_concept_stub_v0",
        unknownTermDetectorPolicy: "unknown_term_detector_v0",
        localControlledCategoryLookupPolicy:
          "local_controlled_category_lookup_v0",
      },
      execution: {
        primarySearchOrderProofExecuted: result.ok,
        localControlledCategoryLookupExecuted: true,
        unknownTermDetectorExecuted: true,
        externalConceptStubExecuted: true,
        resolverExecuted: false,
        stableBundlePersisted: false,
        valueObjectPolicyExecuted: false,
        stateHookPersisted: false,
        externalOntologyCalled: false,
        externalNetworkCallExecuted: false,
        unknownTermCandidatePersisted: false,
        externalConceptCandidatePersisted: false,
        resolverPersisted: false,
        persistenceAttempted: false,
        statePersistenceAttempted: false,
      },
    },
    { status: result.ok ? 200 : 400 }
  );
}

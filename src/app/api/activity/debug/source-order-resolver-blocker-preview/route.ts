import { NextResponse } from "next/server";

import {
  SOURCE_ORDER_RESOLVER_BLOCKER_PREVIEW_MODE_V0,
  SOURCE_ORDER_RESOLVER_BLOCKER_PREVIEW_POLICY_V0,
  buildSourceOrderResolverBlockerPreviewReadinessV0,
  buildSourceOrderResolverBlockerPreviewV0,
  type SourceOrderResolverBlockerPreviewRawInputV0,
} from "../../../../../../lib/activity/categoryDerivation/sourceOrderResolverBlockerPreviewV0";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT = "/api/activity/debug/source-order-resolver-blocker-preview";
const ROUTE_CONTRACT_VERSION =
  "source_order_resolver_blocker_preview_route_v0";

export async function GET() {
  return NextResponse.json({
    ...buildSourceOrderResolverBlockerPreviewReadinessV0(),
    endpoint: ENDPOINT,
    routeContractVersion: ROUTE_CONTRACT_VERSION,
    sourceContracts: {
      sourceOrderResolverBlockerPreviewPolicy:
        SOURCE_ORDER_RESOLVER_BLOCKER_PREVIEW_POLICY_V0,
      sourceOrderResolverBlockerPreviewMode:
        SOURCE_ORDER_RESOLVER_BLOCKER_PREVIEW_MODE_V0,
      unresolvedStableBundleBlockerPolicy:
        "unresolved_stable_bundle_blocker_v0",
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
  let body: SourceOrderResolverBlockerPreviewRawInputV0;

  try {
    body = (await request.json()) as SourceOrderResolverBlockerPreviewRawInputV0;
  } catch {
    const result = buildSourceOrderResolverBlockerPreviewV0({});

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

  const result = buildSourceOrderResolverBlockerPreviewV0(body);

  return NextResponse.json(
    {
      ...result,
      endpoint: ENDPOINT,
      routeContractVersion: ROUTE_CONTRACT_VERSION,
      sourceContracts: {
        sourceOrderResolverBlockerPreviewPolicy:
          SOURCE_ORDER_RESOLVER_BLOCKER_PREVIEW_POLICY_V0,
        sourceOrderResolverBlockerPreviewMode:
          SOURCE_ORDER_RESOLVER_BLOCKER_PREVIEW_MODE_V0,
        unresolvedStableBundleBlockerPolicy:
          "unresolved_stable_bundle_blocker_v0",
        resolverDecisionPolicy: "resolver_decision_contract_v0",
        primaryCategorySourceSearchOrderPolicy:
          "primary_category_source_search_order_proof_v0",
        externalConceptStubPolicy: "external_concept_stub_v0",
        unknownTermDetectorPolicy: "unknown_term_detector_v0",
        localControlledCategoryLookupPolicy:
          "local_controlled_category_lookup_v0",
      },
      execution: {
        sourceOrderResolverBlockerPreviewExecuted: result.ok,
        unresolvedStableBundleBlockerExecuted: true,
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

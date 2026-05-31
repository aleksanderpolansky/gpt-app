import { NextResponse } from "next/server";

import {
  STABLE_SEMANTIC_BUNDLE_PREVIEW_MODE_V0,
  STABLE_SEMANTIC_BUNDLE_PREVIEW_POLICY_V0,
  buildStableSemanticBundlePreviewReadinessV0,
  buildStableSemanticBundlePreviewV0,
  type StableSemanticBundlePreviewRawInputV0,
} from "../../../../../../lib/activity/categoryDerivation/stableSemanticBundlePreviewV0";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT = "/api/activity/debug/stable-semantic-bundle-preview";
const ROUTE_CONTRACT_VERSION = "stable_semantic_bundle_preview_route_v0";

export async function GET() {
  return NextResponse.json({
    ...buildStableSemanticBundlePreviewReadinessV0(),
    endpoint: ENDPOINT,
    routeContractVersion: ROUTE_CONTRACT_VERSION,
    sourceContracts: {
      stableSemanticBundlePreviewPolicy:
        STABLE_SEMANTIC_BUNDLE_PREVIEW_POLICY_V0,
      stableSemanticBundlePreviewMode:
        STABLE_SEMANTIC_BUNDLE_PREVIEW_MODE_V0,
      sourceOrderResolverBlockerPreviewPolicy:
        "source_order_resolver_blocker_preview_v0",
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
  let body: StableSemanticBundlePreviewRawInputV0;

  try {
    body = (await request.json()) as StableSemanticBundlePreviewRawInputV0;
  } catch {
    const result = buildStableSemanticBundlePreviewV0({});

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

  const result = buildStableSemanticBundlePreviewV0(body);

  return NextResponse.json(
    {
      ...result,
      endpoint: ENDPOINT,
      routeContractVersion: ROUTE_CONTRACT_VERSION,
      sourceContracts: {
        stableSemanticBundlePreviewPolicy:
          STABLE_SEMANTIC_BUNDLE_PREVIEW_POLICY_V0,
        stableSemanticBundlePreviewMode:
          STABLE_SEMANTIC_BUNDLE_PREVIEW_MODE_V0,
        sourceOrderResolverBlockerPreviewPolicy:
          "source_order_resolver_blocker_preview_v0",
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
        stableSemanticBundlePreviewExecuted: result.ok,
        sourceOrderResolverBlockerPreviewExecuted: true,
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

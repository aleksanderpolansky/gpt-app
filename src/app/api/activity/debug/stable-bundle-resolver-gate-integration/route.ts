import { NextResponse } from "next/server";

import {
  STABLE_BUNDLE_RESOLVER_GATE_INTEGRATION_MODE_V0,
  STABLE_BUNDLE_RESOLVER_GATE_INTEGRATION_POLICY_V0,
  buildStableBundleResolverGateIntegrationReadinessV0,
  buildStableBundleResolverGateIntegrationV0,
  type StableBundleResolverGateIntegrationRawInputV0,
} from "../../../../../../lib/activity/categoryDerivation/stableBundleResolverGateIntegrationV0";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT = "/api/activity/debug/stable-bundle-resolver-gate-integration";
const ROUTE_CONTRACT_VERSION =
  "stable_bundle_resolver_gate_integration_route_v0";

export async function GET() {
  return NextResponse.json({
    ...buildStableBundleResolverGateIntegrationReadinessV0(),
    endpoint: ENDPOINT,
    routeContractVersion: ROUTE_CONTRACT_VERSION,
    sourceContracts: {
      stableBundleResolverGateIntegrationPolicy:
        STABLE_BUNDLE_RESOLVER_GATE_INTEGRATION_POLICY_V0,
      stableBundleResolverGateIntegrationMode:
        STABLE_BUNDLE_RESOLVER_GATE_INTEGRATION_MODE_V0,
      stableBundlePersistenceGateBlockerPolicy:
        "stable_bundle_persistence_gate_blocker_v0",
      stableSemanticBundlePreviewPolicy:
        "stable_semantic_bundle_preview_v0",
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
  let body: StableBundleResolverGateIntegrationRawInputV0;

  try {
    body = (await request.json()) as StableBundleResolverGateIntegrationRawInputV0;
  } catch {
    const result = buildStableBundleResolverGateIntegrationV0({});

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

  const result = buildStableBundleResolverGateIntegrationV0(body);

  return NextResponse.json(
    {
      ...result,
      endpoint: ENDPOINT,
      routeContractVersion: ROUTE_CONTRACT_VERSION,
      sourceContracts: {
        stableBundleResolverGateIntegrationPolicy:
          STABLE_BUNDLE_RESOLVER_GATE_INTEGRATION_POLICY_V0,
        stableBundleResolverGateIntegrationMode:
          STABLE_BUNDLE_RESOLVER_GATE_INTEGRATION_MODE_V0,
        stableBundlePersistenceGateBlockerPolicy:
          "stable_bundle_persistence_gate_blocker_v0",
        stableSemanticBundlePreviewPolicy:
          "stable_semantic_bundle_preview_v0",
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
        stableBundleResolverGateIntegrationExecuted: result.ok,
        stableBundlePersistenceGateBlockerExecuted: true,
        stableSemanticBundlePreviewExecuted: true,
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

import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { NextResponse } from "next/server";

import {
  STABLE_SEMANTIC_BUNDLE_WRITE_CONTRACT_MODE_V0,
  STABLE_SEMANTIC_BUNDLE_WRITE_CONTRACT_POLICY_V0,
  buildStableSemanticBundleWriteContractReadinessV0,
  buildStableSemanticBundleWriteContractV0,
  type StableSemanticBundleWriteContractRawInputV0,
} from "../../../../../../lib/activity/categoryDerivation/stableSemanticBundleWriteContractV0";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT = "/api/activity/debug/stable-semantic-bundle-write-contract";
const ROUTE_CONTRACT_VERSION =
  "stable_semantic_bundle_write_contract_route_v0";

export async function GET() {
  const platformAdminGuard = await requirePlatformAdmin();

  if (!platformAdminGuard.ok) {
    return platformAdminErrorResponse(
      platformAdminGuard,
      "debug-api-platform-admin-guard-v1",
    );
  }

  return NextResponse.json({
    ...buildStableSemanticBundleWriteContractReadinessV0(),
    endpoint: ENDPOINT,
    routeContractVersion: ROUTE_CONTRACT_VERSION,
    sourceContracts: {
      stableSemanticBundleWriteContractPolicy:
        STABLE_SEMANTIC_BUNDLE_WRITE_CONTRACT_POLICY_V0,
      stableSemanticBundleWriteContractMode:
        STABLE_SEMANTIC_BUNDLE_WRITE_CONTRACT_MODE_V0,
      stableBundleResolverGateIntegrationPolicy:
        "stable_bundle_resolver_gate_integration_v0",
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
  const platformAdminGuard = await requirePlatformAdmin();

  if (!platformAdminGuard.ok) {
    return platformAdminErrorResponse(
      platformAdminGuard,
      "debug-api-platform-admin-guard-v1",
    );
  }

  let body: StableSemanticBundleWriteContractRawInputV0;

  try {
    body = (await request.json()) as StableSemanticBundleWriteContractRawInputV0;
  } catch {
    const result = buildStableSemanticBundleWriteContractV0({});

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

  const result = buildStableSemanticBundleWriteContractV0(body);

  return NextResponse.json(
    {
      ...result,
      endpoint: ENDPOINT,
      routeContractVersion: ROUTE_CONTRACT_VERSION,
      sourceContracts: {
        stableSemanticBundleWriteContractPolicy:
          STABLE_SEMANTIC_BUNDLE_WRITE_CONTRACT_POLICY_V0,
        stableSemanticBundleWriteContractMode:
          STABLE_SEMANTIC_BUNDLE_WRITE_CONTRACT_MODE_V0,
        stableBundleResolverGateIntegrationPolicy:
          "stable_bundle_resolver_gate_integration_v0",
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
        stableSemanticBundleWriteContractExecuted: result.ok,
        stableBundleResolverGateIntegrationExecuted: true,
        stableBundlePersistenceGateBlockerExecuted: true,
        stableSemanticBundlePreviewExecuted: true,
        sourceOrderResolverBlockerPreviewExecuted: true,
        unresolvedStableBundleBlockerExecuted: true,
        resolverDecisionExecuted: true,
        primarySearchOrderProofExecuted: true,
        localControlledCategoryLookupExecuted: true,
        unknownTermDetectorExecuted: true,
        externalConceptStubExecuted: true,
        sqlExecuted: false,
        dbReadExecuted: false,
        dbWriteExecuted: false,
        supabaseReadExecuted: false,
        supabaseWriteExecuted: false,
        resolverPersisted: false,
        resolverDecisionPersisted: false,
        stableBundlePersisted: false,
        stableBundleCreated: false,
        externalOntologyCalled: false,
        externalNetworkCallExecuted: false,
        unknownTermCandidatePersisted: false,
        externalConceptCandidatePersisted: false,
        statePersistenceAttempted: false,
      },
    },
    { status: result.ok ? 200 : 400 }
  );
}

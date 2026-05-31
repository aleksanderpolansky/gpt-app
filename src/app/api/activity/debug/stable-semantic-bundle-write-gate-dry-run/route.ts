import { NextResponse } from "next/server";

import {
  STABLE_SEMANTIC_BUNDLE_WRITE_GATE_DRY_RUN_MODE_V0,
  STABLE_SEMANTIC_BUNDLE_WRITE_GATE_DRY_RUN_POLICY_V0,
  buildStableSemanticBundleWriteGateDryRunReadinessV0,
  buildStableSemanticBundleWriteGateDryRunV0,
  type StableSemanticBundleWriteGateDryRunRawInputV0,
} from "../../../../../../lib/activity/categoryDerivation/stableSemanticBundleWriteGateDryRunV0";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT = "/api/activity/debug/stable-semantic-bundle-write-gate-dry-run";
const ROUTE_CONTRACT_VERSION =
  "stable_semantic_bundle_write_gate_dry_run_route_v0";

export async function GET() {
  return NextResponse.json({
    ...buildStableSemanticBundleWriteGateDryRunReadinessV0(),
    endpoint: ENDPOINT,
    routeContractVersion: ROUTE_CONTRACT_VERSION,
    sourceContracts: {
      stableSemanticBundleWriteGateDryRunPolicy:
        STABLE_SEMANTIC_BUNDLE_WRITE_GATE_DRY_RUN_POLICY_V0,
      stableSemanticBundleWriteGateDryRunMode:
        STABLE_SEMANTIC_BUNDLE_WRITE_GATE_DRY_RUN_MODE_V0,
      stableSemanticBundleSchemaPreflightPolicy:
        "stable_semantic_bundle_schema_preflight_v0",
      stableSemanticBundleWriteContractPolicy:
        "stable_semantic_bundle_write_contract_v0",
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
  let body: StableSemanticBundleWriteGateDryRunRawInputV0;

  try {
    body = (await request.json()) as StableSemanticBundleWriteGateDryRunRawInputV0;
  } catch {
    const result = buildStableSemanticBundleWriteGateDryRunV0({});

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

  const result = buildStableSemanticBundleWriteGateDryRunV0(body);

  return NextResponse.json(
    {
      ...result,
      endpoint: ENDPOINT,
      routeContractVersion: ROUTE_CONTRACT_VERSION,
      sourceContracts: {
        stableSemanticBundleWriteGateDryRunPolicy:
          STABLE_SEMANTIC_BUNDLE_WRITE_GATE_DRY_RUN_POLICY_V0,
        stableSemanticBundleWriteGateDryRunMode:
          STABLE_SEMANTIC_BUNDLE_WRITE_GATE_DRY_RUN_MODE_V0,
        stableSemanticBundleSchemaPreflightPolicy:
          "stable_semantic_bundle_schema_preflight_v0",
        stableSemanticBundleWriteContractPolicy:
          "stable_semantic_bundle_write_contract_v0",
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
        stableSemanticBundleWriteGateDryRunExecuted: result.ok,
        stableSemanticBundleSchemaPreflightExecuted: true,
        stableSemanticBundleWriteContractExecuted: true,
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
        informationSchemaSelectExecuted: false,
        supabaseReadExecuted: false,
        supabaseWriteExecuted: false,
        transactionExecuted: false,
        rowsActuallyWritten: 0,
        resolverPersisted: false,
        resolverDecisionPersisted: false,
        stableBundlePersisted: false,
        stableBundleCreated: false,
        stableBundleTableCreated: false,
        stableBundleTableAltered: false,
        stableBundleMemberInserted: false,
        stableBundleBlockedAuditInserted: false,
        stableBundleSourceSnapshotInserted: false,
        stableBundleResolverSnapshotInserted: false,
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

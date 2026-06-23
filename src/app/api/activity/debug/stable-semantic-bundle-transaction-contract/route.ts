import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { NextResponse } from "next/server";

import {
  STABLE_SEMANTIC_BUNDLE_TRANSACTION_CONTRACT_MODE_V0,
  STABLE_SEMANTIC_BUNDLE_TRANSACTION_CONTRACT_POLICY_V0,
  buildStableSemanticBundleTransactionContractReadinessV0,
  buildStableSemanticBundleTransactionContractV0,
  type StableSemanticBundleTransactionContractRawInputV0,
} from "../../../../../../lib/activity/categoryDerivation/stableSemanticBundleTransactionContractV0";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT = "/api/activity/debug/stable-semantic-bundle-transaction-contract";
const ROUTE_CONTRACT_VERSION =
  "stable_semantic_bundle_transaction_contract_route_v0";

export async function GET() {
  const platformAdminGuard = await requirePlatformAdmin();

  if (!platformAdminGuard.ok) {
    return platformAdminErrorResponse(
      platformAdminGuard,
      "debug-api-platform-admin-guard-v1",
    );
  }

  return NextResponse.json({
    ...buildStableSemanticBundleTransactionContractReadinessV0(),
    endpoint: ENDPOINT,
    routeContractVersion: ROUTE_CONTRACT_VERSION,
    sourceContracts: {
      stableSemanticBundleTransactionContractPolicy:
        STABLE_SEMANTIC_BUNDLE_TRANSACTION_CONTRACT_POLICY_V0,
      stableSemanticBundleTransactionContractMode:
        STABLE_SEMANTIC_BUNDLE_TRANSACTION_CONTRACT_MODE_V0,
      stableSemanticBundleWriteGateDryRunPolicy:
        "stable_semantic_bundle_write_gate_dry_run_v0",
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
  const platformAdminGuard = await requirePlatformAdmin();

  if (!platformAdminGuard.ok) {
    return platformAdminErrorResponse(
      platformAdminGuard,
      "debug-api-platform-admin-guard-v1",
    );
  }

  let body: StableSemanticBundleTransactionContractRawInputV0;

  try {
    body = (await request.json()) as StableSemanticBundleTransactionContractRawInputV0;
  } catch {
    const result = buildStableSemanticBundleTransactionContractV0({});

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

  const result = buildStableSemanticBundleTransactionContractV0(body);

  return NextResponse.json(
    {
      ...result,
      endpoint: ENDPOINT,
      routeContractVersion: ROUTE_CONTRACT_VERSION,
      sourceContracts: {
        stableSemanticBundleTransactionContractPolicy:
          STABLE_SEMANTIC_BUNDLE_TRANSACTION_CONTRACT_POLICY_V0,
        stableSemanticBundleTransactionContractMode:
          STABLE_SEMANTIC_BUNDLE_TRANSACTION_CONTRACT_MODE_V0,
        stableSemanticBundleWriteGateDryRunPolicy:
          "stable_semantic_bundle_write_gate_dry_run_v0",
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
        resolverDecisionPolicy:
          "resolver_decision_contract_v0",
        primaryCategorySourceSearchOrderPolicy:
          "primary_category_source_search_order_proof_v0",
        externalConceptStubPolicy: "external_concept_stub_v0",
        unknownTermDetectorPolicy: "unknown_term_detector_v0",
        localControlledCategoryLookupPolicy:
          "local_controlled_category_lookup_v0",
      },
      execution: {
        stableSemanticBundleTransactionContractExecuted: result.ok,
        stableSemanticBundleWriteGateDryRunExecuted: true,
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
        transactionCommitted: false,
        transactionRolledBack: false,
        rowsActuallyWritten: 0,
        rowsActuallyRolledBack: 0,
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

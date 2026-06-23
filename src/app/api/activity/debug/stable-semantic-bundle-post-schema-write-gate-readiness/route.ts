import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { NextResponse } from "next/server";

import {
  STABLE_SEMANTIC_BUNDLE_POST_SCHEMA_WRITE_GATE_READINESS_MODE_V0,
  STABLE_SEMANTIC_BUNDLE_POST_SCHEMA_WRITE_GATE_READINESS_POLICY_V0,
  buildStableSemanticBundlePostSchemaWriteGateReadinessReadinessV0,
  buildStableSemanticBundlePostSchemaWriteGateReadinessV0,
  type StableSemanticBundlePostSchemaWriteGateReadinessRawInputV0,
} from "../../../../../../lib/activity/categoryDerivation/stableSemanticBundlePostSchemaWriteGateReadinessV0";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT =
  "/api/activity/debug/stable-semantic-bundle-post-schema-write-gate-readiness";
const ROUTE_CONTRACT_VERSION =
  "stable_semantic_bundle_post_schema_write_gate_readiness_route_v0";

export async function GET() {
  const platformAdminGuard = await requirePlatformAdmin();

  if (!platformAdminGuard.ok) {
    return platformAdminErrorResponse(
      platformAdminGuard,
      "debug-api-platform-admin-guard-v1",
    );
  }

  return NextResponse.json({
    ...buildStableSemanticBundlePostSchemaWriteGateReadinessReadinessV0(),
    endpoint: ENDPOINT,
    routeContractVersion: ROUTE_CONTRACT_VERSION,
    sourceContracts: {
      stableSemanticBundlePostSchemaWriteGateReadinessPolicy:
        STABLE_SEMANTIC_BUNDLE_POST_SCHEMA_WRITE_GATE_READINESS_POLICY_V0,
      stableSemanticBundlePostSchemaWriteGateReadinessMode:
        STABLE_SEMANTIC_BUNDLE_POST_SCHEMA_WRITE_GATE_READINESS_MODE_V0,
      stableSemanticBundleTransactionContractPolicy:
        "stable_semantic_bundle_transaction_contract_v0",
      stableSemanticBundleWriteGateDryRunPolicy:
        "stable_semantic_bundle_write_gate_dry_run_v0",
      stableSemanticBundleSchemaPreflightPolicy:
        "stable_semantic_bundle_schema_preflight_v0",
      stableSemanticBundleWriteContractPolicy:
        "stable_semantic_bundle_write_contract_v0",
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

  let body: StableSemanticBundlePostSchemaWriteGateReadinessRawInputV0;

  try {
    body = (await request.json()) as StableSemanticBundlePostSchemaWriteGateReadinessRawInputV0;
  } catch {
    const result = buildStableSemanticBundlePostSchemaWriteGateReadinessV0({});

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

  const result = buildStableSemanticBundlePostSchemaWriteGateReadinessV0(body);

  return NextResponse.json(
    {
      ...result,
      endpoint: ENDPOINT,
      routeContractVersion: ROUTE_CONTRACT_VERSION,
      sourceContracts: {
        stableSemanticBundlePostSchemaWriteGateReadinessPolicy:
          STABLE_SEMANTIC_BUNDLE_POST_SCHEMA_WRITE_GATE_READINESS_POLICY_V0,
        stableSemanticBundlePostSchemaWriteGateReadinessMode:
          STABLE_SEMANTIC_BUNDLE_POST_SCHEMA_WRITE_GATE_READINESS_MODE_V0,
        stableSemanticBundleTransactionContractPolicy:
          "stable_semantic_bundle_transaction_contract_v0",
        stableSemanticBundleWriteGateDryRunPolicy:
          "stable_semantic_bundle_write_gate_dry_run_v0",
        stableSemanticBundleSchemaPreflightPolicy:
          "stable_semantic_bundle_schema_preflight_v0",
        stableSemanticBundleWriteContractPolicy:
          "stable_semantic_bundle_write_contract_v0",
      },
      execution: {
        stableSemanticBundlePostSchemaWriteGateReadinessExecuted: result.ok,
        stableSemanticBundleTransactionContractExecuted: true,
        stableSemanticBundleWriteGateDryRunExecuted: true,
        stableSemanticBundleSchemaPreflightExecuted: true,
        stableSemanticBundleWriteContractExecuted: true,
        manualSchemaReadinessSummaryAccepted:
          result.summary.manualSchemaSummaryAccepted,
        c33K4DesignAllowed: result.nextDecision.c33K4DesignAllowed,
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
        schemaMigrationExecutedByThisRoute: false,
        liveSchemaVerifiedByThisRoute: false,
        writeGateOpened: false,
        resolverPersisted: false,
        resolverDecisionPersisted: false,
        stableBundlePersisted: false,
        stableBundleCreated: false,
        externalOntologyCalled: false,
        externalNetworkCallExecuted: false,
        statePersistenceAttempted: false,
      },
    },
    { status: result.ok ? 200 : 400 }
  );
}

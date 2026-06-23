import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  STABLE_SEMANTIC_BUNDLE_EXPLICIT_SANDBOX_WRITE_CONFIRMATION_V0,
  STABLE_SEMANTIC_BUNDLE_EXPLICIT_SANDBOX_WRITE_GATE_MODE_V0,
  STABLE_SEMANTIC_BUNDLE_EXPLICIT_SANDBOX_WRITE_GATE_POLICY_V0,
  buildStableSemanticBundleExplicitSandboxWriteGatePlanV0,
  buildStableSemanticBundleExplicitSandboxWriteGateReadinessV0,
  type StableSemanticBundleExplicitSandboxWriteGateRawInputV0,
  type StableSemanticBundleExplicitSandboxWriteGateWritesV0,
} from "../../../../../../lib/activity/categoryDerivation/stableSemanticBundleExplicitSandboxWriteGateV0";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT =
  "/api/activity/debug/stable-semantic-bundle-explicit-sandbox-write-gate";
const ROUTE_CONTRACT_VERSION =
  "stable_semantic_bundle_explicit_sandbox_write_gate_route_v0";

function buildNoWriteFlags(): StableSemanticBundleExplicitSandboxWriteGateWritesV0 {
  return {
    sqlExecuted: false,
    dbReadExecuted: false,
    dbWriteExecuted: false,
    supabaseReadExecuted: false,
    supabaseWriteExecuted: false,
    externalNetworkCallExecuted: false,
    transactionExecuted: false,
    transactionCommitted: false,
    transactionRolledBack: false,
    sandboxSequentialWriteExecuted: false,
    writeGateOpened: false,
    rowsActuallyWritten: 0,
    rowsActuallyRolledBack: 0,
    stableBundleCreated: false,
    stableBundlePersisted: false,
    stableBundleMemberInserted: false,
    stableBundleBlockedAuditInserted: false,
    stableBundleSourceSnapshotInserted: false,
    stableBundleResolverSnapshotInserted: false,
    resolverDecisionPersisted: false,
    resolverCandidateInserted: false,
    unknownTermCandidateInserted: false,
    externalConceptCandidateInserted: false,
    categoryInserted: false,
    categoryAliasInserted: false,
    activityEventInserted: false,
    valueObjectCreated: false,
    activityValueObjectLinkCreated: false,
    stateFactCreated: false,
    stateDeltaCreated: false,
    stateSnapshotCreated: false,
  };
}

function getSupabaseServerClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      client: null,
      error:
        "Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  return {
    client: createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }),
    error: null,
  };
}

function withRouteMetadata(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(
    {
      ...payload,
      endpoint: ENDPOINT,
      routeContractVersion: ROUTE_CONTRACT_VERSION,
      sourceContracts: {
        explicitSandboxWriteGatePolicy:
          STABLE_SEMANTIC_BUNDLE_EXPLICIT_SANDBOX_WRITE_GATE_POLICY_V0,
        explicitSandboxWriteGateMode:
          STABLE_SEMANTIC_BUNDLE_EXPLICIT_SANDBOX_WRITE_GATE_MODE_V0,
        requiredConfirmation:
          STABLE_SEMANTIC_BUNDLE_EXPLICIT_SANDBOX_WRITE_CONFIRMATION_V0,
        postSchemaWriteGateReadinessPolicy:
          "stable_semantic_bundle_post_schema_write_gate_readiness_v0",
        stableSemanticBundleTransactionContractPolicy:
          "stable_semantic_bundle_transaction_contract_v0",
      },
    },
    { status }
  );
}

export async function GET() {
  const platformAdminGuard = await requirePlatformAdmin();

  if (!platformAdminGuard.ok) {
    return platformAdminErrorResponse(
      platformAdminGuard,
      "debug-api-platform-admin-guard-v1",
    );
  }

  return withRouteMetadata({
    ...buildStableSemanticBundleExplicitSandboxWriteGateReadinessV0(),
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

  let body: StableSemanticBundleExplicitSandboxWriteGateRawInputV0;

  try {
    body = (await request.json()) as StableSemanticBundleExplicitSandboxWriteGateRawInputV0;
  } catch {
    const plan = buildStableSemanticBundleExplicitSandboxWriteGatePlanV0({});

    return withRouteMetadata(
      {
        ...plan,
        error: "Invalid JSON body.",
      },
      400
    );
  }

  const planResult = buildStableSemanticBundleExplicitSandboxWriteGatePlanV0(body);

  if (!planResult.ok || !planResult.plan.payloads) {
    return withRouteMetadata(
      {
        ...planResult,
        execution: {
          sandboxWriteAttempted: false,
          writeGateOpened: false,
          dbReadExecuted: false,
          dbWriteExecuted: false,
          reason: "Sandbox write gate checks failed before DB access.",
        },
      },
      403
    );
  }

  const { client: supabaseAdmin, error: clientError } = getSupabaseServerClient();

  if (!supabaseAdmin || clientError) {
    return withRouteMetadata(
      {
        ...planResult,
        ok: false,
        errors: [...planResult.errors, clientError ?? "Supabase client error."],
        execution: {
          sandboxWriteAttempted: false,
          writeGateOpened: false,
          dbReadExecuted: false,
          dbWriteExecuted: false,
          reason: "Supabase service-role client is not available.",
        },
      },
      500
    );
  }

  const writes = buildNoWriteFlags();
  writes.dbReadExecuted = true;
  writes.supabaseReadExecuted = true;
  writes.writeGateOpened = true;

  const idempotencyKey = planResult.plan.payloads.header.idempotency_key;

  const existingBundleResult = await supabaseAdmin
    .from("stable_semantic_bundles")
    .select("id,idempotency_key,payload_hash,created_at")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existingBundleResult.error) {
    return withRouteMetadata(
      {
        ...planResult,
        ok: false,
        errors: [
          ...planResult.errors,
          `Existing bundle idempotency read failed: ${existingBundleResult.error.message}`,
        ],
        execution: {
          sandboxWriteAttempted: true,
          writeGateOpened: true,
          dbReadExecuted: true,
          dbWriteExecuted: false,
          idempotentDuplicateDetected: false,
        },
        writes,
      },
      500
    );
  }

  if (existingBundleResult.data) {
    return withRouteMetadata({
      ...planResult,
      ok: true,
      summary: {
        ...planResult.summary,
        rowsActuallyWritten: 0,
      },
      execution: {
        sandboxWriteAttempted: true,
        writeGateOpened: true,
        dbReadExecuted: true,
        dbWriteExecuted: false,
        idempotentDuplicateDetected: true,
        existingStableBundleId: existingBundleResult.data.id,
        rowsActuallyWritten: 0,
      },
      writes,
    });
  }

  writes.dbWriteExecuted = true;
  writes.supabaseWriteExecuted = true;
  writes.sandboxSequentialWriteExecuted = true;

  const insertedBundleResult = await supabaseAdmin
    .from("stable_semantic_bundles")
    .insert(planResult.plan.payloads.header)
    .select("id")
    .single();

  if (insertedBundleResult.error || !insertedBundleResult.data?.id) {
    return withRouteMetadata(
      {
        ...planResult,
        ok: false,
        errors: [
          ...planResult.errors,
          `Stable bundle header insert failed: ${
            insertedBundleResult.error?.message ?? "missing inserted id"
          }`,
        ],
        execution: {
          sandboxWriteAttempted: true,
          writeGateOpened: true,
          dbReadExecuted: true,
          dbWriteExecuted: true,
          idempotentDuplicateDetected: false,
          rowsActuallyWritten: 0,
        },
        writes,
      },
      500
    );
  }

  const stableBundleId = insertedBundleResult.data.id as string;
  let rowsActuallyWritten = 1;

  writes.stableBundleCreated = true;
  writes.stableBundlePersisted = true;
  writes.rowsActuallyWritten = rowsActuallyWritten;

  const memberRows = planResult.plan.payloads.members.map((item) => ({
    stable_semantic_bundle_id: stableBundleId,
    ...item,
  }));

  if (memberRows.length > 0) {
    const memberInsertResult = await supabaseAdmin
      .from("stable_semantic_bundle_members")
      .insert(memberRows);

    if (memberInsertResult.error) {
      await supabaseAdmin
        .from("stable_semantic_bundles")
        .delete()
        .eq("id", stableBundleId);

      writes.rowsActuallyRolledBack = rowsActuallyWritten;

      return withRouteMetadata(
        {
          ...planResult,
          ok: false,
          errors: [
            ...planResult.errors,
            `Stable bundle member insert failed: ${memberInsertResult.error.message}`,
          ],
          execution: {
            sandboxWriteAttempted: true,
            writeGateOpened: true,
            dbReadExecuted: true,
            dbWriteExecuted: true,
            rollbackAttempted: true,
            stableBundleId,
            rowsActuallyWritten,
          },
          writes,
        },
        500
      );
    }

    rowsActuallyWritten += memberRows.length;
    writes.rowsActuallyWritten = rowsActuallyWritten;
    writes.stableBundleMemberInserted = true;
  }

  const blockedRows = planResult.plan.payloads.blockedAuditItems.map((item) => ({
    stable_semantic_bundle_id: stableBundleId,
    ...item,
  }));

  if (blockedRows.length > 0) {
    const blockedInsertResult = await supabaseAdmin
      .from("stable_semantic_bundle_blocked_audit_items")
      .insert(blockedRows);

    if (blockedInsertResult.error) {
      await supabaseAdmin
        .from("stable_semantic_bundles")
        .delete()
        .eq("id", stableBundleId);

      writes.rowsActuallyRolledBack = rowsActuallyWritten;

      return withRouteMetadata(
        {
          ...planResult,
          ok: false,
          errors: [
            ...planResult.errors,
            `Stable bundle blocked audit insert failed: ${blockedInsertResult.error.message}`,
          ],
          execution: {
            sandboxWriteAttempted: true,
            writeGateOpened: true,
            dbReadExecuted: true,
            dbWriteExecuted: true,
            rollbackAttempted: true,
            stableBundleId,
            rowsActuallyWritten,
          },
          writes,
        },
        500
      );
    }

    rowsActuallyWritten += blockedRows.length;
    writes.rowsActuallyWritten = rowsActuallyWritten;
    writes.stableBundleBlockedAuditInserted = true;
  }

  const sourceSnapshotInsertResult = await supabaseAdmin
    .from("stable_semantic_bundle_source_snapshots")
    .insert({
      stable_semantic_bundle_id: stableBundleId,
      ...planResult.plan.payloads.sourceSnapshot,
    });

  if (sourceSnapshotInsertResult.error) {
    await supabaseAdmin
      .from("stable_semantic_bundles")
      .delete()
      .eq("id", stableBundleId);

    writes.rowsActuallyRolledBack = rowsActuallyWritten;

    return withRouteMetadata(
      {
        ...planResult,
        ok: false,
        errors: [
          ...planResult.errors,
          `Stable bundle source snapshot insert failed: ${sourceSnapshotInsertResult.error.message}`,
        ],
        execution: {
          sandboxWriteAttempted: true,
          writeGateOpened: true,
          dbReadExecuted: true,
          dbWriteExecuted: true,
          rollbackAttempted: true,
          stableBundleId,
          rowsActuallyWritten,
        },
        writes,
      },
      500
    );
  }

  rowsActuallyWritten += 1;
  writes.rowsActuallyWritten = rowsActuallyWritten;
  writes.stableBundleSourceSnapshotInserted = true;

  const resolverSnapshotInsertResult = await supabaseAdmin
    .from("stable_semantic_bundle_resolver_snapshots")
    .insert({
      stable_semantic_bundle_id: stableBundleId,
      ...planResult.plan.payloads.resolverSnapshot,
    });

  if (resolverSnapshotInsertResult.error) {
    await supabaseAdmin
      .from("stable_semantic_bundles")
      .delete()
      .eq("id", stableBundleId);

    writes.rowsActuallyRolledBack = rowsActuallyWritten;

    return withRouteMetadata(
      {
        ...planResult,
        ok: false,
        errors: [
          ...planResult.errors,
          `Stable bundle resolver snapshot insert failed: ${resolverSnapshotInsertResult.error.message}`,
        ],
        execution: {
          sandboxWriteAttempted: true,
          writeGateOpened: true,
          dbReadExecuted: true,
          dbWriteExecuted: true,
          rollbackAttempted: true,
          stableBundleId,
          rowsActuallyWritten,
        },
        writes,
      },
      500
    );
  }

  rowsActuallyWritten += 1;
  writes.rowsActuallyWritten = rowsActuallyWritten;
  writes.stableBundleResolverSnapshotInserted = true;

  return withRouteMetadata({
    ...planResult,
    ok: true,
    summary: {
      ...planResult.summary,
      rowsActuallyWritten,
    },
    execution: {
      sandboxWriteAttempted: true,
      writeGateOpened: true,
      dbReadExecuted: true,
      dbWriteExecuted: true,
      supabaseWriteExecuted: true,
      sandboxSequentialWriteExecuted: true,
      idempotentDuplicateDetected: false,
      stableBundleId,
      rowsActuallyWritten,
      memberRowsInserted: memberRows.length,
      blockedAuditRowsInserted: blockedRows.length,
      sourceSnapshotRowsInserted: 1,
      resolverSnapshotRowsInserted: 1,
    },
    writes,
  });
}

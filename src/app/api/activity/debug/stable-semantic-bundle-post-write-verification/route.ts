import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  STABLE_SEMANTIC_BUNDLE_POST_WRITE_VERIFICATION_MODE_V0,
  STABLE_SEMANTIC_BUNDLE_POST_WRITE_VERIFICATION_POLICY_V0,
  buildStableSemanticBundlePostWriteVerificationReadinessV0,
  buildStableSemanticBundlePostWriteVerificationResultV0,
  type StableSemanticBundlePostWriteVerificationRawInputV0,
} from "../../../../../../lib/activity/categoryDerivation/stableSemanticBundlePostWriteVerificationV0";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT =
  "/api/activity/debug/stable-semantic-bundle-post-write-verification";
const ROUTE_CONTRACT_VERSION =
  "stable_semantic_bundle_post_write_verification_route_v0";

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
        postWriteVerificationPolicy:
          STABLE_SEMANTIC_BUNDLE_POST_WRITE_VERIFICATION_POLICY_V0,
        postWriteVerificationMode:
          STABLE_SEMANTIC_BUNDLE_POST_WRITE_VERIFICATION_MODE_V0,
        explicitSandboxWriteGatePolicy:
          "stable_semantic_bundle_explicit_sandbox_write_gate_v0",
        postSchemaWriteGateReadinessPolicy:
          "stable_semantic_bundle_post_schema_write_gate_readiness_v0",
      },
    },
    { status }
  );
}

function emptyVerification(
  body: StableSemanticBundlePostWriteVerificationRawInputV0,
  error: string,
  status = 400
) {
  const result = buildStableSemanticBundlePostWriteVerificationResultV0({
    rawInput: body,
    stableBundle: null,
    members: [],
    blockedAuditItems: [],
    sourceSnapshots: [],
    resolverSnapshots: [],
    dbReadExecuted: false,
    readErrors: [error],
  });

  return withRouteMetadata(result, status);
}

export async function GET() {
  return withRouteMetadata({
    ...buildStableSemanticBundlePostWriteVerificationReadinessV0(),
  });
}

export async function POST(request: Request) {
  let body: StableSemanticBundlePostWriteVerificationRawInputV0;

  try {
    body = (await request.json()) as StableSemanticBundlePostWriteVerificationRawInputV0;
  } catch {
    return emptyVerification({}, "Invalid JSON body.", 400);
  }

  const preliminary = buildStableSemanticBundlePostWriteVerificationResultV0({
    rawInput: body,
    stableBundle: null,
    members: [],
    blockedAuditItems: [],
    sourceSnapshots: [],
    resolverSnapshots: [],
    dbReadExecuted: false,
  });

  if (!preliminary.normalizedInput) {
    return withRouteMetadata(preliminary, 400);
  }

  const { client: supabaseAdmin, error: clientError } = getSupabaseServerClient();

  if (!supabaseAdmin || clientError) {
    return emptyVerification(body, clientError ?? "Supabase client error.", 500);
  }

  const stableBundleId = preliminary.normalizedInput.stableBundleId;
  const readErrors: string[] = [];

  const stableBundleResult = await supabaseAdmin
    .from("stable_semantic_bundles")
    .select(
      "id,input_text,normalized_text,input_language,policy_version,source_order_snapshot_key,resolver_snapshot_key,idempotency_key,payload_hash,bundle_status,is_sandbox_test,created_at"
    )
    .eq("id", stableBundleId)
    .maybeSingle();

  if (stableBundleResult.error) {
    readErrors.push(`Stable bundle read failed: ${stableBundleResult.error.message}`);
  }

  const membersResult = await supabaseAdmin
    .from("stable_semantic_bundle_members")
    .select(
      "id,stable_semantic_bundle_id,member_preview_key,candidate_key,normalized_text,source_kind,resolver_decision_status,created_at"
    )
    .eq("stable_semantic_bundle_id", stableBundleId)
    .order("candidate_key", { ascending: true });

  if (membersResult.error) {
    readErrors.push(`Stable bundle members read failed: ${membersResult.error.message}`);
  }

  const blockedAuditResult = await supabaseAdmin
    .from("stable_semantic_bundle_blocked_audit_items")
    .select(
      "id,stable_semantic_bundle_id,blocked_preview_key,candidate_key,normalized_text,source_kind,excluded_from_future_bundle_members,retained_for_audit_preview,created_at"
    )
    .eq("stable_semantic_bundle_id", stableBundleId)
    .order("candidate_key", { ascending: true });

  if (blockedAuditResult.error) {
    readErrors.push(
      `Stable bundle blocked audit read failed: ${blockedAuditResult.error.message}`
    );
  }

  const sourceSnapshotResult = await supabaseAdmin
    .from("stable_semantic_bundle_source_snapshots")
    .select(
      "id,stable_semantic_bundle_id,source_order_policy,stage_count,stages_json,created_at"
    )
    .eq("stable_semantic_bundle_id", stableBundleId);

  if (sourceSnapshotResult.error) {
    readErrors.push(
      `Stable bundle source snapshot read failed: ${sourceSnapshotResult.error.message}`
    );
  }

  const resolverSnapshotResult = await supabaseAdmin
    .from("stable_semantic_bundle_resolver_snapshots")
    .select(
      "id,stable_semantic_bundle_id,resolver_decision_count,local_accepted_member_count,unresolved_blocker_count,unknown_term_blocked_count,external_concept_blocked_count,created_at"
    )
    .eq("stable_semantic_bundle_id", stableBundleId);

  if (resolverSnapshotResult.error) {
    readErrors.push(
      `Stable bundle resolver snapshot read failed: ${resolverSnapshotResult.error.message}`
    );
  }

  const result = buildStableSemanticBundlePostWriteVerificationResultV0({
    rawInput: body,
    stableBundle: stableBundleResult.data
      ? (stableBundleResult.data as Record<string, unknown>)
      : null,
    members: Array.isArray(membersResult.data)
      ? (membersResult.data as Array<Record<string, unknown>>)
      : [],
    blockedAuditItems: Array.isArray(blockedAuditResult.data)
      ? (blockedAuditResult.data as Array<Record<string, unknown>>)
      : [],
    sourceSnapshots: Array.isArray(sourceSnapshotResult.data)
      ? (sourceSnapshotResult.data as Array<Record<string, unknown>>)
      : [],
    resolverSnapshots: Array.isArray(resolverSnapshotResult.data)
      ? (resolverSnapshotResult.data as Array<Record<string, unknown>>)
      : [],
    dbReadExecuted: true,
    readErrors,
  });

  return withRouteMetadata(result, result.ok ? 200 : 500);
}

import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { requirePlatformAdmin, platformAdminErrorResponse } from "@/lib/admin/require-platform-admin";
import { readAdminContextPreviewV1 } from "@/lib/admin-execution/contextPreview.server";
import { makeInternalSnapshot, isUuid, isSha256 } from "@/lib/admin-execution/contextSnapshotV1";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const CONTRACT = "ARCTOR_ADM5C3B_REGISTER_ONLY_API_V1";
const HEADERS = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
const CASE = /^[A-Z][A-Z0-9]{1,9}-[0-9]{3,6}$/;
const TASK = /^[a-z][a-z0-9_]{2,90}$/;
const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const asText = (value: unknown) => typeof value === "string" ? value : "";
const sha = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");
function fail(code: string, status: number) {
  return NextResponse.json({ok: false, contract: CONTRACT, errorCode: code,
    executionForbidden: true, modelCallsPerformed: false, budgetReserved: false}, {status, headers: HEADERS});
}

// Every call goes through the same read-only ADM-5B compiler. A saved review
// is never interpreted as authorization to run a model or spend funds.
async function verifiedSource(caseCode: string, assignmentId: string, taskCode: string) {
  const source = await readAdminContextPreviewV1(caseCode, assignmentId, taskCode);
  if (source.errorCode || !source.preview) return {errorCode: source.errorCode ?? "PREVIEW_UNAVAILABLE"} as const;
  const frozen = makeInternalSnapshot(source.preview);
  return {preview: source.preview, frozen} as const;
}

export async function GET(request: Request) {
  const guard = await requirePlatformAdmin({allowedRoles: ["owner", "admin"]});
  if (!guard.ok) return platformAdminErrorResponse(guard, CONTRACT);
  const url = new URL(request.url);
  const caseCode = url.searchParams.get("caseCode") ?? "";
  const assignmentId = url.searchParams.get("assignmentId") ?? "";
  const taskCode = url.searchParams.get("taskCode") ?? "";
  if (!CASE.test(caseCode) || !isUuid(assignmentId) || !TASK.test(taskCode)) return fail("INVALID_SELECTION", 400);
  try {
    const current = await verifiedSource(caseCode, assignmentId, taskCode);
    if ("errorCode" in current) return fail(current.errorCode ?? "PREVIEW_UNAVAILABLE", 422);
    const {preview, frozen} = current;
    const [snapshots, attempts] = await Promise.all([
      supabase.from("arctor_admin_context_snapshots_adm5b3_v1")
        .select("id,version_num,manifest_digest,snapshot_digest,captured_at")
        .eq("case_id", preview.caseId).eq("assignment_id", assignmentId).eq("task_code", taskCode)
        .order("version_num", {ascending: false}).limit(1),
      supabase.from("arctor_admin_ai_attempts_adm5c3b_v1")
        .select("id,operation_id,attempt_ordinal,case_code,assignment_id,role_code,task_code,snapshot_id,snapshot_version,manifest_digest,created_at,state,agent_execution_permitted,outbound_authorized,budget_reserved")
        .eq("case_id", preview.caseId).eq("assignment_id", assignmentId).eq("task_code", taskCode)
        .order("attempt_ordinal", {ascending: false}).limit(20)
    ]);
    if (attempts.error) return fail(attempts.error.code === "42P01" ? "RUN_MANUAL_SQL_FIRST" : "ATTEMPT_READ_FAILED", 503);
    if (snapshots.error) return fail("SNAPSHOT_READ_FAILED", 503);
    const snapshot = snapshots.data?.[0] ?? null;
    let reviewed = false;
    if (snapshot) {
      const audit = await supabase.from("arctor_admin_context_snapshot_events_adm5b3_v1")
        .select("kind").eq("snapshot_id", snapshot.id).limit(5);
      if (audit.error) return fail("REVIEW_AUDIT_READ_FAILED", 503);
      reviewed = !!audit.data?.some(x => x.kind === "reviewed_internal") && !audit.data?.some(x => x.kind === "rejected");
    }
    const eligibleSnapshot = !!snapshot && reviewed && snapshot.manifest_digest === frozen.manifestDigest;
    const ids = (attempts.data ?? []).map(a => a.id);
    let registeredEventCount = 0;
    if (ids.length) {
      const eventRead = await supabase.from("arctor_admin_ai_attempt_events_adm5c3b_v1")
        .select("id", {count: "exact", head: true}).in("attempt_id", ids);
      if (eventRead.error) return fail("ATTEMPT_AUDIT_READ_FAILED", 503);
      registeredEventCount = eventRead.count ?? 0;
    }
    return NextResponse.json({ok:true, contract: CONTRACT, caseCode, assignmentId,
      roleCode: preview.roleCode, taskCode, snapshot,
      liveManifestDigest: frozen.manifestDigest, reviewedInternal: reviewed,
      eligibleSnapshot, attempts: attempts.data ?? [], registeredEventCount,
      executionForbidden: true, modelCallsPerformed: false, budgetReserved: false,
      dbWritesPerformed: false}, {headers: HEADERS});
  } catch (e) {
    console.error("ADM5C3B_GET_ERROR", e instanceof Error ? e.name : "unknown");
    return fail("REGISTER_READ_UNAVAILABLE", 503);
  }
}

// POST is the ONLY write action. It registers a blocked, non-executable intent.
// It does NOT authorize AI execution, issue wallet transactions or modify ADM-4.
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return fail("ORIGIN_REJECTED", 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return fail("CONTENT_TYPE_REJECTED", 415);
  const guard = await requirePlatformAdmin({allowedRoles: ["owner", "admin"]});
  if (!guard.ok) return platformAdminErrorResponse(guard, CONTRACT);
  if (Number(request.headers.get("content-length") || 0) > 2500) return fail("REQUEST_TOO_LARGE", 413);
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 2500) return fail("REQUEST_TOO_LARGE", 413);
    body = JSON.parse(raw) as unknown;
  } catch { return fail("INVALID_JSON", 400); }
  if (!isObject(body) || body.action !== "register_intent" ||
      !CASE.test(asText(body.caseCode)) || !isUuid(body.assignmentId) ||
      !TASK.test(asText(body.taskCode)) || !isUuid(body.snapshotId) ||
      !isUuid(body.operationId) || !isSha256(body.expectedManifestDigest)) return fail("INVALID_REQUEST", 400);
  const caseCode = asText(body.caseCode);
  const assignmentId = asText(body.assignmentId);
  const taskCode = asText(body.taskCode);
  const snapshotId = asText(body.snapshotId);
  const expectedDigest = asText(body.expectedManifestDigest).toLowerCase();
  try {
    // Never trust the browser's case ID, digest, role or instruction eligibility.
    const current = await verifiedSource(caseCode, assignmentId, taskCode);
    if ("errorCode" in current) return fail(current.errorCode ?? "PREVIEW_UNAVAILABLE", 422);
    if (current.frozen.manifestDigest !== expectedDigest) return fail("LIVE_CONTEXT_CHANGED", 409);
    const preview = current.preview;
    const stored = await supabase.from("arctor_admin_context_snapshots_adm5b3_v1")
      .select("id,case_id,assignment_id,role_code,task_code,version_num,manifest_digest,snapshot_digest,snapshot_text")
      .eq("id", snapshotId).maybeSingle();
    if (stored.error || !stored.data) return fail("SNAPSHOT_NOT_FOUND", 404);
    const s = stored.data;
    if (s.case_id !== preview.caseId || s.assignment_id !== assignmentId ||
        s.role_code !== preview.roleCode || s.task_code !== taskCode ||
        s.manifest_digest !== expectedDigest || sha(s.snapshot_text) !== s.snapshot_digest)
      return fail("SNAPSHOT_NOT_CURRENT_OR_INTACT", 409);
    const latest = await supabase.from("arctor_admin_context_snapshots_adm5b3_v1")
      .select("id").eq("assignment_id", assignmentId).eq("task_code", taskCode)
      .order("version_num", {ascending: false}).limit(1);
    if (latest.error || latest.data?.[0]?.id !== snapshotId) return fail("SNAPSHOT_SUPERSEDED", 409);
    const history = await supabase.from("arctor_admin_context_snapshot_events_adm5b3_v1")
      .select("kind").eq("snapshot_id", snapshotId).limit(5);
    if (history.error || !history.data?.some(e => e.kind === "reviewed_internal") ||
        history.data.some(e => e.kind === "rejected")) return fail("SNAPSHOT_NOT_INTERNALLY_REVIEWED", 409);
    // RPC repeats the critical DB checks atomically and protects idempotency.
    const result = await supabase.rpc("arctor_admin_ai_attempt_register_adm5c3b_v1", {
      p_actor_app_user_id: guard.appUser.id,
      p_operation_id: asText(body.operationId),
      p_case_id: preview.caseId,
      p_assignment_id: assignmentId,
      p_snapshot_id: snapshotId,
      p_task_code: taskCode,
      p_expected_manifest_digest: expectedDigest,
    });
    if (result.error) {
      console.error("ADM5C3B_RPC_REJECTED", result.error.code);
      return fail(result.error.code === "42883" ? "MIGRATION_NOT_INSTALLED" : "REGISTRATION_REJECTED", result.error.code === "42883" ? 503 : 409);
    }
    return NextResponse.json({ok:true, contract:CONTRACT, result:result.data,
      executionForbidden:true, agentExecutionPermitted:false, outboundAuthorized:false,
      budgetReserved:false, modelCallsPerformed:false}, {headers:HEADERS});
  } catch (e) {
    console.error("ADM5C3B_POST_ERROR", e instanceof Error ? e.name : "unknown");
    return fail("REGISTRATION_UNAVAILABLE", 503);
  }
}

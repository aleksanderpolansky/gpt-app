import { NextResponse } from "next/server";
import { requirePlatformAdmin, platformAdminErrorResponse } from "@/lib/admin/require-platform-admin";
import { readAdminContextPreviewV1 } from "@/lib/admin-execution/contextPreview.server";
import { makeInternalSnapshot, isUuid, isSha256, ADM5B3_CONTRACT } from "@/lib/admin-execution/contextSnapshotV1";
import { supabase } from "../../../../../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const HEADERS = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
const CASE = /^[A-Z][A-Z0-9]{1,9}-[0-9]{3,6}$/;
const TASK = /^[a-z][a-z0-9_]{2,90}$/;
const isRecord = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
function fail(code: string, status: number) {
  return NextResponse.json({ ok: false, contract: ADM5B3_CONTRACT, errorCode: code, agentExecutionPermitted: false }, { status, headers: HEADERS });
}
function asText(x: unknown): string { return typeof x === "string" ? x : ""; }

// Only a human admin can request these two narrowly scoped actions. No OpenAI calls.
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return fail("ORIGIN_REJECTED", 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return fail("CONTENT_TYPE_REJECTED", 415);
  const guard = await requirePlatformAdmin({ allowedRoles: ["owner", "admin"] });
  if (!guard.ok) return platformAdminErrorResponse(guard, ADM5B3_CONTRACT);
  if (Number(request.headers.get("content-length") || 0) > 6000) return fail("REQUEST_TOO_LARGE", 413);
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 6000) return fail("REQUEST_TOO_LARGE", 413);
    body = JSON.parse(raw) as unknown;
  } catch { return fail("INVALID_JSON", 400); }
  if (!isRecord(body) || !["capture", "review_internal", "reject"].includes(asText(body.action)) ||
      !isUuid(body.operationId) || !isSha256(body.expectedDigest) ||
      !CASE.test(asText(body.caseCode)) || !TASK.test(asText(body.taskCode)) || !isUuid(body.assignmentId)) {
    return fail("INVALID_REQUEST", 400);
  }
  const action = asText(body.action);
  const caseCode = asText(body.caseCode);
  const assignmentId = asText(body.assignmentId);
  const taskCode = asText(body.taskCode);
  const expectedDigest = asText(body.expectedDigest).toLowerCase();
  const snapshotId = asText(body.snapshotId);
  const reason = asText(body.reason).trim();
  if (action !== "capture" && (!isUuid(snapshotId) || reason.length < 10 || reason.length > 1000)) {
    return fail("INVALID_REVIEW_INPUT", 400);
  }
  try {
    // Always re-fetch case, assignment, role, instruction status and the live public source.
    // Approvals do not trust browser-copied content or stale digests.
    const current = await readAdminContextPreviewV1(caseCode, assignmentId, taskCode);
    if (current.errorCode || !current.preview) return fail(current.errorCode ?? "PREVIEW_NOT_AVAILABLE", 422);
    const frozen = makeInternalSnapshot(current.preview);
    if (frozen.manifestDigest !== expectedDigest) return fail("MANIFEST_CHANGED_REFRESH_REQUIRED", 409);
    if (action === "capture") {
      const result = await supabase.rpc("arctor_admin_context_snapshot_capture_adm5b3_v1", {
        p_actor_user_id: guard.appUser.id,
        p_operation_id: asText(body.operationId),
        p_case_id: current.preview.caseId,
        p_assignment_id: assignmentId,
        p_role_code: current.preview.roleCode,
        p_task_code: taskCode,
        p_manifest_digest: frozen.manifestDigest,
        p_snapshot_text: frozen.frozenJson,
        p_snapshot_digest: frozen.frozenDigest,
      });
      if (result.error) {
        console.error("ADM5B3_CAPTURE_DB_ERROR", result.error.code);
        return fail(result.error.code === "42883" || result.error.code === "42P01" ? "ADM5B3_SQL_NOT_INSTALLED" : "CAPTURE_REJECTED", result.error.code === "42883" || result.error.code === "42P01" ? 503 : 409);
      }
      return NextResponse.json({ ok: true, contract: ADM5B3_CONTRACT, result: result.data,
        agentExecutionPermitted: false, outboundAuthorized: false, modelCallsPerformed: false }, { headers: HEADERS });
    }
    // A caller cannot direct a review operation at a snapshot from another task/case.
    const registered = await supabase.from("arctor_admin_context_snapshots_adm5b3_v1")
      .select("case_id,assignment_id,role_code,task_code,manifest_digest")
      .eq("id", snapshotId).maybeSingle();
    if (registered.error || !registered.data) return fail("SNAPSHOT_NOT_FOUND", 404);
    if (registered.data.case_id !== current.preview.caseId ||
        registered.data.assignment_id !== assignmentId ||
        registered.data.role_code !== current.preview.roleCode ||
        registered.data.task_code !== taskCode ||
        registered.data.manifest_digest !== expectedDigest) return fail("SNAPSHOT_IDENTITY_MISMATCH", 409);
    const result = await supabase.rpc("arctor_admin_context_snapshot_decide_adm5b3_v1", {
      p_actor_user_id: guard.appUser.id,
      p_operation_id: asText(body.operationId),
      p_snapshot_id: snapshotId,
      p_expected_digest: expectedDigest,
      p_action: action,
      p_reason: reason,
    });
    if (result.error) {
      console.error("ADM5B3_DECISION_DB_ERROR", result.error.code);
      return fail(result.error.code === "42883" || result.error.code === "42P01" ? "ADM5B3_SQL_NOT_INSTALLED" : "DECISION_REJECTED_OR_ALREADY_DECIDED", result.error.code === "42883" || result.error.code === "42P01" ? 503 : 409);
    }
    return NextResponse.json({ ok: true, contract: ADM5B3_CONTRACT, result: result.data,
      agentExecutionPermitted: false, outboundAuthorized: false, modelCallsPerformed: false }, { headers: HEADERS });
  } catch (error) {
    console.error("ADM5B3_SERVER_ERROR", error instanceof Error ? error.name : "unknown");
    return fail("INTERNAL_ERROR", 500);
  }
}

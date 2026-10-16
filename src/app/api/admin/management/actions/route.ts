import { NextResponse } from "next/server";
import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CONTRACT = "ARCTOR_ADMIN_ADM2B2_ATOMIC_ACTION_V1";
const HEADERS = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROLE = /^[a-z][a-z0-9_]{1,40}$/;
type Action = "create" | "assign" | "report" | "handoff";

function fail(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, contract: CONTRACT, errorCode }, { status, headers: HEADERS });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function str(value: unknown, min: number, max: number): value is string {
  return typeof value === "string" && value.trim().length >= min && value.trim().length <= max;
}

function validate(action: Action, payload: Record<string, unknown>): boolean {
  if (action !== "create" && (!str(payload.caseId, 36, 36) || !UUID.test(payload.caseId))) return false;
  if (action === "create") {
    if (!str(payload.title, 3, 240)) return false;
    if (typeof payload.description !== "string" || payload.description.length > 12000) return false;
    if (!["defect", "research", "planned", "operations", "risk", "request", "incident"].includes(String(payload.caseType))) return false;
    if (!["urgent", "high", "normal", "low"].includes(String(payload.priority))) return false;
  }
  if (action === "report" || action === "handoff") {
    if (!str(payload.assignmentId, 36, 36) || !UUID.test(payload.assignmentId)) return false;
  }
  if (action === "report") return str(payload.reportText, 10, 6000);
  if (!str(payload.recipientRoleCode, 2, 41) || !ROLE.test(payload.recipientRoleCode)) return false;
  return str(payload.assignmentText, 4, 12000) && str(payload.requiredResult, 4, 6000);
}

export async function POST(request: Request) {
  // Reject cross-origin mutation requests before performing any DB write.
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return fail("ADM2B2_ORIGIN_REJECTED", 403);
  const guard = await requirePlatformAdmin({ allowedRoles: ["owner", "admin"] });
  if (!guard.ok) return platformAdminErrorResponse(guard, CONTRACT);

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 20000) return fail("ADM2B2_REQUEST_TOO_LARGE", 413);
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 20000) return fail("ADM2B2_REQUEST_TOO_LARGE", 413);
    body = JSON.parse(raw) as unknown;
  } catch { return fail("ADM2B2_INVALID_JSON", 400); }
  if (!isRecord(body) || typeof body.action !== "string" || !["create", "assign", "report", "handoff"].includes(body.action)
      || !str(body.operationId, 36, 36) || !UUID.test(body.operationId) || !isRecord(body.payload)) {
    return fail("ADM2B2_INVALID_INPUT", 400);
  }
  const action = body.action as Action;
  if (!validate(action, body.payload)) return fail("ADM2B2_INVALID_ACTION_PAYLOAD", 400);

  try {
    const { data, error } = await supabase.rpc("arctor_admin_apply_case_action_adm2b2_v1", {
      p_actor_user_id: guard.appUser.id,
      p_operation_id: body.operationId,
      p_action: action,
      p_payload: body.payload,
    });
    if (error) {
      console.error("ADM2B2_RPC_FAILED", { code: error.code, action });
      if (error.code === "42883") return fail("ADM2B2_MIGRATION_REQUIRED", 503);
      if (["23505", "23514", "22023", "P0002"].includes(error.code)) return fail("ADM2B2_CONFLICT_OR_INVALID_TRANSITION", 409);
      return fail("ADM2B2_WRITE_FAILED", 500);
    }
    if (!isRecord(data) || data.ok !== true || data.contract !== CONTRACT) return fail("ADM2B2_CONTRACT_MISMATCH", 500);
    return NextResponse.json(data, { headers: HEADERS });
  } catch (error) {
    console.error("ADM2B2_UNEXPECTED_ERROR", error instanceof Error ? error.name : "unknown");
    return fail("ADM2B2_INTERNAL_ERROR", 500);
  }
}

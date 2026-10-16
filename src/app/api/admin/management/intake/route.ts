import { NextResponse } from "next/server";
import { requirePlatformAdmin, platformAdminErrorResponse } from "@/lib/admin/require-platform-admin";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const CONTRACT = "ARCTOR_ADM4B2_COMMERCIAL_INTAKE_V1";
const HEADERS = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function fail(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, contract: CONTRACT, errorCode }, { status, headers: HEADERS });
}

/** The sole writer is an atomic, server-side RPC. No private source data enters this API. */
export async function POST(request: Request) {
  const guard = await requirePlatformAdmin({ allowedRoles: ["owner", "admin"] });
  if (!guard.ok) return platformAdminErrorResponse(guard, CONTRACT);
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return fail("ADM4B2_ORIGIN_REJECTED", 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return fail("ADM4B2_EXPECTED_JSON", 415);
  if (Number(request.headers.get("content-length") ?? "0") > 2048) return fail("ADM4B2_BODY_TOO_LARGE", 413);
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 2048) return fail("ADM4B2_BODY_TOO_LARGE", 413);
    body = JSON.parse(raw) as unknown;
  } catch { return fail("ADM4B2_INVALID_JSON", 400); }
  if (!isRecord(body) || !["create", "link"].includes(String(body.action))
    || typeof body.operationId !== "string" || !UUID.test(body.operationId)
    || body.sourceKind !== "commercial_activity"
    || typeof body.sourceId !== "string" || !UUID.test(body.sourceId)
    || (body.action === "link" && (typeof body.caseId !== "string" || !UUID.test(body.caseId)))
    || (body.action === "create" && body.caseId != null)) return fail("ADM4B2_INVALID_INPUT", 400);
  try {
    const { data, error } = await supabase.rpc("arctor_admin_intake_commercial_adm4b2_v1", {
      p_actor_user_id: guard.appUser.id,
      p_operation_id: body.operationId,
      p_action: body.action,
      p_source_id: body.sourceId,
      p_case_id: body.action === "link" ? body.caseId : null,
    });
    if (error) {
      console.error("ADM4B2_WRITE_REJECTED", { code: error.code });
      if (error.code === "42883") return fail("ADM4B2_SQL_NOT_INSTALLED", 503);
      if (error.code === "P0002") return fail("ADM4B2_SOURCE_NOT_PUBLIC_OR_CASE_NOT_FOUND", 404);
      if (["23505", "23514", "22023"].includes(error.code)) return fail("ADM4B2_CONFLICT_OR_INVALID_STATE", 409);
      return fail("ADM4B2_WRITE_FAILED", 500);
    }
    if (!isRecord(data) || data.ok !== true || data.contract !== CONTRACT) return fail("ADM4B2_CONTRACT_MISMATCH", 500);
    return NextResponse.json(data, { headers: HEADERS });
  } catch (error) {
    console.error("ADM4B2_INTERNAL_ERROR", error instanceof Error ? error.name : "unknown");
    return fail("ADM4B2_INTERNAL_ERROR", 500);
  }
}

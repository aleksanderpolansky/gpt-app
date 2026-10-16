import { NextResponse } from "next/server";
import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CONTRACT = "ARCTOR_ADM4A_SOURCE_LINK_V1";
const HEADERS = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SOURCE_KINDS = ["activity_template", "public_message"] as const;

type SourceKind = (typeof SOURCE_KINDS)[number];
function fail(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, contract: CONTRACT, errorCode }, { status, headers: HEADERS });
}
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// Source candidates only: never return a private activity, private post, user ID or message body.
export async function GET() {
  const guard = await requirePlatformAdmin({ allowedRoles: ["owner", "admin", "viewer"] });
  if (!guard.ok) return platformAdminErrorResponse(guard, CONTRACT);
  try {
    const [templates, messages] = await Promise.all([
      supabase.from("activity_templates").select("id,title")
        .eq("template_scope", "system").is("owner_user_id", null)
        .in("visibility", ["public", "public_template"])
        .order("title", { ascending: true }).limit(30),
      supabase.from("message_objects").select("id,title,created_at")
        .eq("audience_scope_code", "public").eq("lifecycle_status", "active")
        .order("created_at", { ascending: false }).limit(30),
    ]);
    if (templates.error || messages.error) {
      console.error("ADM4A_SOURCE_DISCOVERY_FAILED", { templates: templates.error?.code, messages: messages.error?.code });
      return fail("ADM4A_SOURCE_DISCOVERY_FAILED", 503);
    }
    const sources = [
      ...(templates.data ?? []).map((item) => ({
        id: item.id, title: item.title || "Системная типовая активность", kind: "activity_template" as SourceKind,
      })),
      ...(messages.data ?? []).map((item) => ({
        id: item.id, title: item.title?.trim() || `Публичная публикация · ${new Date(item.created_at).toLocaleDateString("ru-RU", { timeZone: "UTC" })}`, kind: "public_message" as SourceKind,
      })),
    ];
    return NextResponse.json({ ok: true, contract: CONTRACT, sources,
      limits: { perKind: 30 }, isCompleteQueue: false, dbWritesPerformed: false, agentExecutionPerformed: false },
      { headers: HEADERS });
  } catch (error) {
    console.error("ADM4A_DISCOVERY_UNEXPECTED", error instanceof Error ? error.name : "unknown");
    return fail("ADM4A_DISCOVERY_ERROR", 500);
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return fail("ADM4A_ORIGIN_REJECTED", 403);
  const guard = await requirePlatformAdmin({ allowedRoles: ["owner", "admin"] });
  if (!guard.ok) return platformAdminErrorResponse(guard, CONTRACT);
  if (Number(request.headers.get("content-length") ?? "0") > 4096) return fail("ADM4A_BODY_TOO_LARGE", 413);
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 4096) return fail("ADM4A_BODY_TOO_LARGE", 413);
    body = JSON.parse(raw) as unknown;
  } catch { return fail("ADM4A_INVALID_JSON", 400); }
  if (!object(body) || typeof body.caseId !== "string" || !UUID.test(body.caseId)
    || typeof body.sourceId !== "string" || !UUID.test(body.sourceId)
    || !SOURCE_KINDS.includes(body.sourceKind as SourceKind)) {
    return fail("ADM4A_INVALID_INPUT", 400);
  }
  try {
    const { data, error } = await supabase.rpc("arctor_admin_link_case_source_adm4a_v1", {
      p_actor_user_id: guard.appUser.id,
      p_case_id: body.caseId,
      p_source_kind: body.sourceKind,
      p_source_id: body.sourceId,
    });
    if (error) {
      console.error("ADM4A_SOURCE_BIND_FAILED", { code: error.code });
      if (error.code === "42883") return fail("ADM4A_SQL_NOT_INSTALLED", 503);
      if (error.code === "P0002") return fail("ADM4A_SOURCE_OR_CASE_NOT_FOUND", 404);
      if (["23505", "22023", "23514"].includes(error.code)) return fail("ADM4A_CONFLICT", 409);
      return fail("ADM4A_WRITE_FAILED", 500);
    }
    if (!object(data) || data.ok !== true || data.contract !== CONTRACT) return fail("ADM4A_CONTRACT_MISMATCH", 500);
    return NextResponse.json(data, { headers: HEADERS });
  } catch (error) {
    console.error("ADM4A_SOURCE_BIND_UNEXPECTED", error instanceof Error ? error.name : "unknown");
    return fail("ADM4A_INTERNAL_ERROR", 500);
  }
}

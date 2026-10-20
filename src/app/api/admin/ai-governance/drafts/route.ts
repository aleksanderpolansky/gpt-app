import { NextResponse } from "next/server";
import { supabase } from "../../../../../../lib/supabase";
import { platformAdminErrorResponse, requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import {
  GOVERNANCE_DRAFT_CODE, GOVERNANCE_DRAFT_CONTRACT, GOVERNANCE_DRAFT_LOCALES,
  GOVERNANCE_DRAFT_PREFIX, governanceDraftStorageCode, validateGovernanceDraftDocument,
} from "@/lib/ai/governanceDraftStorageV1";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const HEADERS = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff", Vary: "Cookie" };
const asRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
function fail(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, contract: GOVERNANCE_DRAFT_CONTRACT, errorCode,
    modelCallsPerformed: false, aiEurDebited: false, runtimeActivation: false }, { status, headers: HEADERS });
}
function parseStored(v: string) {
  try { return validateGovernanceDraftDocument(JSON.parse(v)); } catch { return null; }
}
const validLocale = (v: unknown): v is (typeof GOVERNANCE_DRAFT_LOCALES)[number] =>
  typeof v === "string" && (GOVERNANCE_DRAFT_LOCALES as readonly string[]).includes(v);

export async function GET(request: Request) {
  const guard = await requirePlatformAdmin({ allowedRoles: ["owner", "admin", "viewer"] });
  if (!guard.ok) return platformAdminErrorResponse(guard, GOVERNANCE_DRAFT_CONTRACT);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const locale = url.searchParams.get("locale");
  if (code !== null && !GOVERNANCE_DRAFT_CODE.test(code)) return fail("INVALID_CODE", 400);
  if (locale !== null && !validLocale(locale)) return fail("INVALID_LOCALE", 400);
  try {
    // Read ONLY governance_draft__ rows; never return executable processing_rule__ rows.
    const { data, error } = await supabase.from("ai_processing_instruction_sets")
      .select("id,instruction_code,locale_code,current_revision,current_instruction_text,status,updated_at")
      .like("instruction_code", "governance_draft__%")
      .order("updated_at", { ascending: false }).limit(100);
    if (error) return fail("DRAFT_READ_FAILED", 503);
    const drafts = (data ?? []).filter(row => row.instruction_code.startsWith(GOVERNANCE_DRAFT_PREFIX))
      .map(row => ({
        code: row.instruction_code.slice(GOVERNANCE_DRAFT_PREFIX.length), locale: row.locale_code,
        revision: row.current_revision, updatedAt: row.updated_at, status: row.status,
        rule: parseStored(row.current_instruction_text),
      })).filter(row => row.rule && row.status === "inactive" &&
        (locale === null || row.locale === locale) && (code === null || row.code === code));
    let history: Array<{ revision: number; action: string | null; createdAt: string; rule: ReturnType<typeof parseStored> }> = [];
    if (code !== null && locale !== null) {
      const storageCode = governanceDraftStorageCode(code);
      const { data: revisions, error: historyError } = await supabase
        .from("ai_processing_instruction_revisions")
        .select("revision,instruction_text,change_note,created_at")
        .eq("instruction_code", storageCode).eq("locale_code", locale)
        .order("revision", { ascending: false }).limit(30);
      if (historyError) return fail("HISTORY_READ_FAILED", 503);
      history = (revisions ?? []).map(row => ({revision: row.revision,
        action: row.change_note, createdAt: row.created_at, rule: parseStored(row.instruction_text) }))
        .filter(row => row.rule !== null);
    }
    return NextResponse.json({ ok: true, contract: GOVERNANCE_DRAFT_CONTRACT, drafts, history,
      canEdit: guard.platformAdmin.role !== "viewer", runtimeActivation: false,
      modelCallsPerformed: false, aiEurDebited: false,
      scopeNote: "personal is a template intent, not user-owned configuration" }, { headers: HEADERS });
  } catch { return fail("DRAFT_READ_FAILED", 503); }
}

export async function PUT(request: Request) {
  const guard = await requirePlatformAdmin({ allowedRoles: ["owner", "admin"] });
  if (!guard.ok) return platformAdminErrorResponse(guard, GOVERNANCE_DRAFT_CONTRACT);
  // JSON-only same-origin admin writes; no activation or runtime code paths.
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return fail("ORIGIN_MISMATCH", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return fail("JSON_REQUIRED", 415);
  const body: unknown = await request.json().catch(() => null);
  if (!asRecord(body) || typeof body.code !== "string" || !GOVERNANCE_DRAFT_CODE.test(body.code)) return fail("INVALID_CODE", 400);
  const document = validateGovernanceDraftDocument(body.rule);
  if (!document) return fail("INVALID_DRAFT", 400);
  if (!Number.isInteger(body.expectedRevision) || (body.expectedRevision as number) < 0 || (body.expectedRevision as number) > 1000000)
    return fail("INVALID_EXPECTED_REVISION", 400);
  if (body.action !== "save" && body.action !== "restore") return fail("INVALID_ACTION", 400);
  try {
    const { data, error } = await supabase.rpc("arctor_ai_governance_draft_save_v1", {
      p_rule_code: body.code, p_locale_code: document.locale,
      p_document: JSON.stringify(document), p_expected_revision: body.expectedRevision,
      p_changed_by_app_user_id: guard.appUser.id, p_action: body.action,
    });
    if (error) return fail(error.code === "P0001" ? "REVISION_CONFLICT_OR_INVALID_DRAFT" :
      error.code === "PGRST202" || error.code === "42883" ? "INSTALL_SQL_FUNCTION_FIRST" : "DRAFT_SAVE_FAILED", 409);
    const saved = Array.isArray(data) ? data[0] : null;
    return NextResponse.json({ok: true, contract: GOVERNANCE_DRAFT_CONTRACT,
      code: body.code, locale: document.locale, revision: saved?.saved_revision ?? null,
      runtimeActivation: false, modelCallsPerformed: false, aiEurDebited: false}, {headers: HEADERS});
  } catch { return fail("DRAFT_SAVE_FAILED", 503); }
}

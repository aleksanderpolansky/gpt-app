import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { resolveActiveActorContext } from "../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";
import { getPublicationAuthorOptionForUser } from "@/lib/messages/publicationAuthors.server";
import { extractPublicationValueEvidenceV1 } from "@/lib/reader-format/priceRatioV2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };
type SourceRow = {
  id: string;
  owner_user_id: string | null;
  created_by_actor_id: string | null;
  author_actor_id: string | null;
  origin_kind_code: string;
  audience_scope_code: string;
  lifecycle_status: string;
  content_text: string | null;
  language_code: string | null;
  updated_at: string;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_LENGTH = 5000;

function fail(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status, headers: { "cache-control": "no-store" } });
}

async function sourceForOwner(messageId: string) {
  const session = await auth0.getSession();
  if (!session?.user?.sub) return { row: null, ownerUserId: null, actorId: null, error: fail(401, "NOT_AUTHENTICATED") };
  let actorContext: Awaited<ReturnType<typeof resolveActiveActorContext>>;
  try {
    actorContext = await resolveActiveActorContext(session.user.sub);
  } catch {
    return { row: null, ownerUserId: null, actorId: null, error: fail(403, "ACTIVE_ACTOR_REQUIRED") };
  }
  const { data, error } = await supabase
    .from("message_objects")
    .select("id,owner_user_id,created_by_actor_id,author_actor_id,origin_kind_code,audience_scope_code,lifecycle_status,content_text,language_code,updated_at")
    .eq("id", messageId)
    .eq("owner_user_id", actorContext.appUserId)
    .maybeSingle();
  if (error) return { row: null, ownerUserId: null, actorId: null, error: fail(500, "SOURCE_READ_FAILED") };
  const row = data as SourceRow | null;
  if (!row || row.origin_kind_code !== "native" || row.audience_scope_code !== "public" || row.lifecycle_status !== "active" || !row.author_actor_id) {
    return { row: null, ownerUserId: null, actorId: null, error: fail(404, "PUBLICATION_NOT_EDITABLE") };
  }
  const option = await getPublicationAuthorOptionForUser({ ownerUserId: actorContext.appUserId, authorActorId: row.author_actor_id });
  if (!option) return { row: null, ownerUserId: null, actorId: null, error: fail(403, "AUTHOR_NOT_CONTROLLED") };
  return { row, ownerUserId: actorContext.appUserId, actorId: actorContext.actorId, error: null };
}

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  if (!UUID.test(id)) return fail(400, "INVALID_PUBLICATION_ID");
  const source = await sourceForOwner(id);
  if (!source.row) return source.error ?? fail(404, "NOT_FOUND");
  const { data, error } = await supabase
    .from("message_object_edit_proposals_v1")
    .select("id,revision,created_at,status,linked_activities_at_request,proposed_content_text")
    .eq("message_object_id", id)
    .eq("owner_user_id", source.ownerUserId!)
    .order("revision", { ascending: false })
    .limit(10);
  if (error) return fail(503, "P36B2_DATABASE_CONTRACT_NOT_INSTALLED");
  const { data: applied, error: appliedError } = await supabase
    .from("message_object_applied_edits_v1")
    .select("proposal_id")
    .eq("message_object_id", id)
    .eq("owner_user_id", source.ownerUserId!);
  if (appliedError) return fail(503, "P36B22_DATABASE_CONTRACT_NOT_INSTALLED");
  const appliedProposalIds = new Set((applied ?? []).map(entry => entry.proposal_id));
  return NextResponse.json({
    ok: true,
    originalText: source.row.content_text ?? "",
    languageCode: source.row.language_code,
    updatedAt: source.row.updated_at,
    proposals: (data ?? []).map(entry => ({ ...entry, status: appliedProposalIds.has(entry.id) ? "applied" : entry.status })),
    mode: "PROPOSAL_ONLY_NO_CANONICAL_UPDATE",
  }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  if (!UUID.test(id)) return fail(400, "INVALID_PUBLICATION_ID");
  // Reject cross-origin mutation requests independently of cookie settings.
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return fail(403, "ORIGIN_MISMATCH");
  if (!(request.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) return fail(415, "JSON_REQUIRED");
  const data = await request.json().catch(() => null) as { contentText?: unknown; expectedUpdatedAt?: unknown } | null;
  const raw = data?.contentText;
  const contentText = typeof raw === "string" ? raw.trim() : "";
  if (!contentText || contentText.length > MAX_LENGTH || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(contentText)) return fail(400, "INVALID_CONTENT_TEXT");
  const expected = data?.expectedUpdatedAt;
  if (typeof expected !== "string" || Number.isNaN(Date.parse(expected))) return fail(400, "EXPECTED_REVISION_REQUIRED");

  const source = await sourceForOwner(id);
  if (!source.row) return source.error ?? fail(404, "NOT_FOUND");
  if (source.row.content_text === contentText) return fail(400, "NO_CHANGES");
  if (new Date(source.row.updated_at).getTime() !== new Date(expected).getTime()) return fail(409, "SOURCE_CHANGED_RELOAD");

  const sourceSha256 = createHash("sha256").update(contentText, "utf8").digest("hex");
  const evidence = {
    schemaVersion: 1,
    evidenceStatus: "source_derived_unverified",
    origin: "proposed_publication_text",
    extractor: "READER_PRICE_RATIO_V2_STRICT",
    sourceSha256,
    priceRatios: extractPublicationValueEvidenceV1(contentText),
  };
  // This RPC only appends an immutable proposal. It NEVER modifies the message,
  // original raw signals, analysis, semantic facts, localized caches or billing.
  const { data: receipt, error } = await supabase.rpc("arctor_publication_propose_edit_v1", {
    p_owner_user_id: source.ownerUserId,
    p_requesting_actor_id: source.actorId,
    p_message_object_id: id,
    p_expected_updated_at: expected,
    p_proposed_content_text: contentText,
    p_proposed_evidence: evidence,
  });
  if (error) {
    if (error.message.includes("P36B2_SOURCE_CHANGED")) return fail(409, "SOURCE_CHANGED_RELOAD");
    if (error.message.includes("P36B2_NOT_EDITABLE") || error.code === "42501") return fail(403, "PUBLICATION_NOT_EDITABLE");
    if (error.code === "42883" || error.code === "42P01") return fail(503, "P36B2_DATABASE_CONTRACT_NOT_INSTALLED");
    return fail(500, "EDIT_PROPOSAL_SAVE_FAILED");
  }
  return NextResponse.json({ ok: true, receipt, mode: "PROPOSAL_ONLY_NO_CANONICAL_UPDATE" }, { headers: { "cache-control": "no-store" } });
}

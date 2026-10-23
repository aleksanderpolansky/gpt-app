import { NextResponse } from "next/server";
import { resolveActiveActorContext } from "../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";
import { getPublicationAuthorOptionForUser } from "@/lib/messages/publicationAuthors.server";
import { createCommercialPublicationRevisionEvidenceV1 } from "@/lib/activity/commercialPublicationRebuildV1.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function fail(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status, headers: { "cache-control": "no-store" } });
}
async function authorize(id: string) {
  const session = await auth0.getSession();
  if (!session?.user?.sub) return { context: null, error: fail(401, "NOT_AUTHENTICATED") };
  let context: Awaited<ReturnType<typeof resolveActiveActorContext>>;
  try { context = await resolveActiveActorContext(session.user.sub); }
  catch { return { context: null, error: fail(403, "ACTIVE_ACTOR_REQUIRED") }; }
  const { data: message, error } = await supabase.from("message_objects")
    .select("id,owner_user_id,author_actor_id,origin_kind_code,audience_scope_code,lifecycle_status")
    .eq("id", id).eq("owner_user_id", context.appUserId).maybeSingle();
  if (error) return { context: null, error: fail(500, "SOURCE_READ_FAILED") };
  if (!message || message.origin_kind_code !== "native" || message.audience_scope_code !== "public" || message.lifecycle_status !== "active" || !message.author_actor_id) {
    return { context: null, error: fail(404, "PUBLICATION_NOT_EDITABLE") };
  }
  const author = await getPublicationAuthorOptionForUser({ ownerUserId: context.appUserId, authorActorId: message.author_actor_id });
  if (!author) return { context: null, error: fail(403, "AUTHOR_NOT_CONTROLLED") };
  return { context, error: null };
}

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  if (!UUID.test(id)) return fail(400, "INVALID_PUBLICATION_ID");
  const auth = await authorize(id);
  if (!auth.context) return auth.error ?? fail(404, "NOT_FOUND");
  const { data, error } = await supabase.from("message_object_rebuild_jobs_v1")
    .select("id,applied_edit_id,status,raw_signal_id,activity_event_id,error_code,claimed_at,completed_at")
    .eq("message_object_id", id).eq("owner_user_id", auth.context.appUserId)
    .order("claimed_at", { ascending: false }).limit(10);
  if (error) return fail(503, "P36B23_DATABASE_CONTRACT_NOT_INSTALLED");
  const { data: applied, error: appliedError } = await supabase.from("message_object_applied_edits_v1")
    .select("id,proposal_id,requires_commercial_rebuild")
    .eq("message_object_id", id).eq("owner_user_id", auth.context.appUserId);
  if (appliedError) return fail(500, "APPLIED_EDIT_READ_FAILED");
  return NextResponse.json({ ok: true, jobs: data ?? [], appliedEdits: applied ?? [] }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  if (!UUID.test(id)) return fail(400, "INVALID_PUBLICATION_ID");
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return fail(403, "ORIGIN_MISMATCH");
  if (!(request.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) return fail(415, "JSON_REQUIRED");
  const auth = await authorize(id);
  if (!auth.context) return auth.error ?? fail(404, "NOT_FOUND");
  const body = await request.json().catch(() => null) as { appliedEditId?: unknown; confirmRevisionRebuild?: unknown } | null;
  if (typeof body?.appliedEditId !== "string" || !UUID.test(body.appliedEditId) || body.confirmRevisionRebuild !== true) {
    return fail(400, "EXPLICIT_REBUILD_CONFIRMATION_REQUIRED");
  }
  const { data: applied, error: readError } = await supabase.from("message_object_applied_edits_v1")
    .select("id")
    .eq("id", body.appliedEditId).eq("message_object_id", id)
    .eq("owner_user_id", auth.context.appUserId).maybeSingle();
  if (readError) return fail(500, "APPLIED_EDIT_READ_FAILED");
  if (!applied) return fail(404, "APPLIED_EDIT_NOT_FOUND");
  try {
    const receipt = await createCommercialPublicationRevisionEvidenceV1({
      ownerUserId: auth.context.appUserId,
      actorId: auth.context.actorId,
      appliedEditId: body.appliedEditId,
    });
    return NextResponse.json({ ok: true, receipt }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("P36B23_ALREADY_CLAIMED_NO_AUTOMATIC_RETRY")) return fail(409, "P36B23_ALREADY_CLAIMED_NO_AUTOMATIC_RETRY");
    if (message.includes("P36B23_MANUAL_RECONCILIATION_REQUIRED")) return fail(409, "P36B23_MANUAL_RECONCILIATION_REQUIRED");
    if (message.includes("P36B23_REQUIRED_CONTRACT_MISSING") || message.includes("function public.arctor_publication_claim_rebuild_v1")) return fail(503, "P36B23_DATABASE_CONTRACT_NOT_INSTALLED");
    if (/P36B23_(SOURCE_REVISION_MISMATCH|ACTIVITY_SET_CHANGED|HISTORICAL_ACTIVITY_NOT_SAFE|FACTS_REQUIRE_CURATOR|APPLIED_REVISION_NOT_ELIGIBLE)/.test(message)) return fail(409, message.match(/P36B23_[A-Z_]+/)?.[0] ?? "REBUILD_CONFLICT");
    console.error("P36B23_REBUILD_REQUEST_FAILED", message.slice(0, 400));
    return fail(500, "P36B23_REBUILD_FAILED");
  }
}

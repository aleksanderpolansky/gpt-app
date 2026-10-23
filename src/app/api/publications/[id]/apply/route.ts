import { NextResponse } from "next/server";
import { resolveActiveActorContext } from "../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";
import { getPublicationAuthorOptionForUser } from "@/lib/messages/publicationAuthors.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function reject(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status, headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  if (!UUID.test(id)) return reject(400, "INVALID_PUBLICATION_ID");
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return reject(403, "ORIGIN_MISMATCH");
  if (!(request.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) return reject(415, "JSON_REQUIRED");
  const session = await auth0.getSession();
  if (!session?.user?.sub) return reject(401, "NOT_AUTHENTICATED");
  let context: Awaited<ReturnType<typeof resolveActiveActorContext>>;
  try { context = await resolveActiveActorContext(session.user.sub); }
  catch { return reject(403, "ACTIVE_ACTOR_REQUIRED"); }

  const input = await request.json().catch(() => null) as {
    proposalId?: unknown;
    confirmCommercialReview?: unknown;
  } | null;
  if (typeof input?.proposalId !== "string" || !UUID.test(input.proposalId)) return reject(400, "INVALID_PROPOSAL_ID");
  if (input.confirmCommercialReview !== true) return reject(400, "EXPLICIT_REVIEW_CONFIRMATION_REQUIRED");

  const { data: publication, error: sourceError } = await supabase.from("message_objects")
    .select("id,owner_user_id,author_actor_id,origin_kind_code,audience_scope_code,lifecycle_status")
    .eq("id", id).eq("owner_user_id", context.appUserId).maybeSingle();
  if (sourceError) return reject(500, "PUBLICATION_READ_FAILED");
  if (!publication || publication.origin_kind_code !== "native" || publication.audience_scope_code !== "public" || publication.lifecycle_status !== "active" || !publication.author_actor_id) {
    return reject(404, "PUBLICATION_NOT_EDITABLE");
  }
  const author = await getPublicationAuthorOptionForUser({ ownerUserId: context.appUserId, authorActorId: publication.author_actor_id });
  if (!author) return reject(403, "AUTHOR_NOT_CONTROLLED");
  // The URL's publication ID must match the immutable proposal's source.
  const { data: proposal, error: proposalError } = await supabase
    .from("message_object_edit_proposals_v1").select("id")
    .eq("id", input.proposalId).eq("message_object_id", id)
    .eq("owner_user_id", context.appUserId).maybeSingle();
  if (proposalError) return reject(500, "PROPOSAL_READ_FAILED");
  if (!proposal) return reject(404, "PROPOSAL_NOT_FOUND");
  const { data: receipt, error } = await supabase.rpc("arctor_publication_apply_edit_v1", {
    p_owner_user_id: context.appUserId,
    p_requesting_actor_id: context.actorId,
    p_proposal_id: input.proposalId,
  });
  if (error) {
    const msg = error.message || "";
    if (/P36B22_(SOURCE_CHANGED|PROPOSAL_ALREADY_APPLIED|NEWER_PROPOSAL_EXISTS|ACTIVITY_LINKS_CHANGED|ACTIVITY_NOT_SAFE_TO_SUPERSEDE|EXISTING_FACTS_REQUIRE_CURATOR)/.test(msg)) {
      return reject(409, msg.match(/P36B22_[A-Z_]+/)?.[0] ?? "SOURCE_CONFLICT");
    }
    if (error.code === "42501") return reject(403, "PUBLICATION_NOT_EDITABLE");
    if (error.code === "42883" || error.code === "42P01") return reject(503, "P36B22_DATABASE_CONTRACT_NOT_INSTALLED");
    return reject(500, "PUBLICATION_APPLY_FAILED");
  }
  return NextResponse.json({ ok: true, receipt, mode: "SOURCE_APPLIED_COMMERCIAL_REVIEW_REQUIRED" }, { headers: { "cache-control": "no-store" } });
}

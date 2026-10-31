/**
 * Opt-in read-only global/owned ON lookup without materializing the catalog in Next.js.
 * Intentionally independent of legacy ontology research API and ARI-02 benchmark.
 */
import { NextResponse } from "next/server";
import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";
import { resolveActiveActorContext } from "../../../../../lib/actor-context";
import {
  INDEXED_LOOKUP_CONTRACT, parseIndexedLookupInput, encodeLookupCursor, decodeLookupCursor,
} from "@/lib/ontology-research/indexedLookupContractV1";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const HEADERS = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff", Vary: "Cookie" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type ResultRow = {
  id: string;
  title: string | null;
  scope_code: string | null;
  origin_type_code: string | null;
  parent_value_object_id: string | null;
  branch_type_code: string | null;
  canonical_key: string | null;
  evidence_scope: string;
};
function respond(body: Record<string, unknown>, status = 200) {
  return NextResponse.json({ contract: INDEXED_LOOKUP_CONTRACT, ...body, dbWritesPerformed: false,
    aiCallsPerformed: false }, { status, headers: HEADERS });
}
export async function POST(request: Request) {
  // Feature OFF unless explicitly enabled at deployment after SQL/privacy checks.
  if (process.env.ARCTOR_ON_INDEXED_LOOKUP_V1 !== "enabled")
    return respond({ ok: false, errorCode: "FEATURE_DISABLED" }, 404);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    return respond({ ok: false, errorCode: "JSON_CONTENT_TYPE_REQUIRED" }, 415);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return respond({ ok: false, errorCode: "ORIGIN_MISMATCH" }, 403);
  const session = await auth0.getSession();
  if (!session?.user?.sub) return respond({ ok: false, errorCode: "AUTH_REQUIRED" }, 401);
  let actor;
  try { actor = await resolveActiveActorContext(session.user.sub); }
  catch { return respond({ ok: false, errorCode: "ACTOR_CONTEXT_UNAVAILABLE" }, 403); }
  if (!UUID.test(actor.appUserId) || !UUID.test(actor.actorId))
    return respond({ ok: false, errorCode: "ACTOR_IDS_INVALID" }, 403);
  let raw: unknown;
  try {
    const body = await request.text();
    if (body.length > 2048) return respond({ ok: false, errorCode: "REQUEST_TOO_LARGE" }, 413);
    raw = JSON.parse(body);
  } catch { return respond({ ok: false, errorCode: "INVALID_JSON" }, 400); }
  const parsed = parseIndexedLookupInput(raw);
  if (!parsed.ok) return respond({ ok: false, errorCode: parsed.reason }, 400);
  const options = parsed.value;
  let afterId: string | null;
  try { afterId = decodeLookupCursor(options, actor.actorId); }
  catch { return respond({ ok: false, errorCode: "INVALID_CURSOR_SCOPE" }, 400); }
  const { data, error } = await supabase.rpc("arctor_on_indexed_lookup_v1", {
    p_term: options.term,
    p_owner_user_id: actor.appUserId,
    p_owner_actor_id: actor.actorId,
    p_branch: options.branch,
    p_after: afterId,
    p_limit: options.limit + 1,
  });
  if (error) {
    // Fail closed; never substitute the truncated legacy in-memory search.
    console.error("ARCTOR_ON_INDEXED_LOOKUP_RPC_UNAVAILABLE", error.code ?? "DB_ERROR");
    return respond({ ok: false, errorCode: "INDEXED_LOOKUP_UNAVAILABLE", searchComplete: false }, 503);
  }
  const rows = (data ?? []) as ResultRow[];
  if (rows.some(r => !UUID.test(r.id) || typeof r.title !== "string" ||
    !["global_system", "owned_actor", "public_commercial"].includes(r.evidence_scope)))
    return respond({ ok: false, errorCode: "INVALID_RPC_RESPONSE", searchComplete: false }, 503);
  const hasMore = rows.length > options.limit;
  const page = rows.slice(0, options.limit);
  const nextCursor = hasMore && page.length ? encodeLookupCursor(page[page.length - 1].id, options, actor.actorId) : null;
  return respond({
    ok: true,
    term: options.term,
    locale: options.locale,
    branch: options.branch,
    matches: page.map(r => ({ id: r.id, title: r.title, scope: r.evidence_scope,
      branch: r.branch_type_code, parentId: r.parent_value_object_id, canonicalKey: r.canonical_key })),
    pagination: { pageSize: options.limit, hasMore, nextCursor, order: "UUID_ASC_KEYSET" },
    examinedScope: "ACTIVE_GLOBAL_SYSTEM_OR_AUTHORIZED_OWNED_OR_EXPLICITLY_PUBLIC_COMMERCIAL",
    // Title/canonical search does not include all locale aliases, semantics or address identity.
    titleIndexQueriedAcrossAllRows: true,
    completeness: "LEXICAL_TITLE_KEY_ONLY; NOT FULL ONTOLOGY IDENTITY VERIFICATION",
    noMatchProvesAbsence: false,
    duplicateCreationAuthorized: false,
  });
}

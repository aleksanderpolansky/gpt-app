import { NextResponse } from "next/server";
import { ActorContextError } from "../../../../../lib/actor-context";
import { resolveRequiredAiProcessingActorContext } from "@/lib/ai/processingInstructions.server";
import { ACTOR_SCOPED_RULE_CONTRACT, SCOPED_RULE_CODE_RE, validateActorScopedRuleV1 } from "@/lib/ai/actorScopedRulesV1";
import { readActorScopedRuleCatalog, saveActorScopedRule } from "@/lib/ai/actorScopedRules.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const HEADERS = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff", Vary: "Cookie" };
function reply(body: Record<string, unknown>, status = 200) {
  return NextResponse.json({ contract: ACTOR_SCOPED_RULE_CONTRACT, ...body }, { status, headers: HEADERS });
}
function fail(error: unknown) {
  if (error instanceof ActorContextError) return reply({ ok: false, errorCode: error.code }, error.status);
  const code = error instanceof Error ? error.message : "P32_UNEXPECTED_ERROR";
  const allowed = ["P32_INVALID_CODE", "P32_INVALID_RULE", "P32_INVALID_REVISION",
    "P32_INVALID_ACTION", "P32_ORIGIN_MISMATCH", "P32_JSON_REQUIRED", "P32_REVISION_CONFLICT",
    "P32_SQL_INSTALL_REQUIRED", "P32_RULE_CATALOG_UNAVAILABLE", "P32_RULE_HISTORY_UNAVAILABLE", "P32_RULE_SAVE_FAILED"];
  const safe = allowed.includes(code) ? code : "P32_UNEXPECTED_ERROR";
  const status = safe === "P32_REVISION_CONFLICT" ? 409 :
    safe === "P32_ORIGIN_MISMATCH" ? 403 : safe === "P32_JSON_REQUIRED" ? 415 :
    safe.startsWith("P32_INVALID_") ? 400 : 503;
  return reply({ ok: false, errorCode: safe }, status);
}
export async function GET(request: Request) {
  try {
    const actor = await resolveRequiredAiProcessingActorContext();
    const code = new URL(request.url).searchParams.get("code");
    if (code !== null && !SCOPED_RULE_CODE_RE.test(code)) throw new Error("P32_INVALID_CODE");
    return reply({ ok: true, ...await readActorScopedRuleCatalog(actor, code),
      actor: { displayName: actor.profile.displayName, profileKind: actor.profile.profileKind } });
  } catch (error) { return fail(error); }
}
export async function PUT(request: Request) {
  try {
    const actor = await resolveRequiredAiProcessingActorContext();
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin) throw new Error("P32_ORIGIN_MISMATCH");
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new Error("P32_JSON_REQUIRED");
    const raw: unknown = await request.json().catch(() => null);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("P32_INVALID_RULE");
    const body = raw as Record<string, unknown>;
    if (typeof body.ruleCode !== "string" || !SCOPED_RULE_CODE_RE.test(body.ruleCode)) throw new Error("P32_INVALID_CODE");
    if (!Number.isInteger(body.expectedRevision) || (body.expectedRevision as number) < 0 ||
      (body.expectedRevision as number) > 1000000) throw new Error("P32_INVALID_REVISION");
    if (body.action !== "save" && body.action !== "disable") throw new Error("P32_INVALID_ACTION");
    const doc = body.action === "save" ? validateActorScopedRuleV1(body.document) : null;
    if (body.action === "save" && !doc) throw new Error("P32_INVALID_RULE");
    const result = await saveActorScopedRule({ actor, ruleCode: body.ruleCode,
      expectedRevision: body.expectedRevision as number, action: body.action, document: doc });
    return reply({ ok: true, ...result });
  } catch (error) { return fail(error); }
}

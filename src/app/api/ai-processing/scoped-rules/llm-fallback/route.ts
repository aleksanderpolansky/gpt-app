import { NextResponse } from "next/server";
import { getActivityUserContext } from "../../../../../../lib/activity/activityUserContext";
import { quoteP35, runP35, validateP35Request } from "@/lib/ai/actorScopedLlmFallback.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const PATH = "/api/ai-processing/scoped-rules/llm-fallback";
const HEADERS = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", Vary: "Cookie" };
const safeErrors = new Set([
  "P35_RULE_NOT_FOUND", "P35_STALE_RULE_REVISION", "P35_RULE_DISABLED", "P35_RULE_SCOPE_MISMATCH",
  "P35_DETERMINISTIC_OR_INELIGIBLE", "P35_NANO_MODEL_UNAVAILABLE", "P35_CONTEXT_TOO_LARGE",
  "P35_BUDGET_LIMIT_EXCEEDED", "P35_INSUFFICIENT_AI_WALLET", "P35_QUOTE_CHANGED",
  "P35_EXPLICIT_CONSENT_REQUIRED", "AI_BILLING_REQUEST_ALREADY_ACQUIRED",
]);
function json(value: object, status = 200) { return NextResponse.json(value, { status, headers: HEADERS }); }

export async function POST(request: Request) {
  // No cross-origin POSTs, no GET text in URLs, no unauthenticated quotes.
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return json({ ok: false, errorCode: "P35_ORIGIN_MISMATCH" }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ ok: false, errorCode: "P35_JSON_REQUIRED" }, 415);
  let payload: Record<string, unknown>;
  try {
    const body = await request.text();
    if (body.length > 4000) return json({ ok: false, errorCode: "P35_BODY_TOO_LARGE" }, 413);
    payload = JSON.parse(body) as Record<string, unknown>;
  } catch { return json({ ok: false, errorCode: "P35_BAD_JSON" }, 400); }
  const input = validateP35Request(payload);
  if (!input || (payload.action !== "quote" && payload.action !== "resolve"))
    return json({ ok: false, errorCode: "P35_BAD_INPUT" }, 400);

  const { appUser, personActor, errorResponse } = await getActivityUserContext();
  if (errorResponse) return errorResponse;
  if (!appUser || !personActor) return json({ ok: false, errorCode: "P35_ACTOR_UNAVAILABLE" }, 403);
  const actor = { appUserId: appUser.id, actorId: personActor.id };
  try {
    if (payload.action === "quote") return json(await quoteP35(actor, input));
    return json(await runP35(actor, input, {
      explicitConsent: payload.explicitConsent === true,
      quoteHash: payload.quoteHash, approvedMaxEur: payload.approvedMaxEur,
      operationId: payload.operationId,
    }));
  } catch (error) {
    const detail = error instanceof Error ? error.message : "";
    const code = detail.startsWith("AI_BILLING_REQUEST_ALREADY_ACQUIRED:") ?
      "AI_BILLING_REQUEST_ALREADY_ACQUIRED" : safeErrors.has(detail) ? detail : "P35_EXECUTION_UNAVAILABLE";
    const status = code === "P35_RULE_NOT_FOUND" ? 404 :
      code === "P35_EXPLICIT_CONSENT_REQUIRED" || code === "P35_QUOTE_CHANGED" ||
      code === "P35_STALE_RULE_REVISION" || code === "P35_RULE_DISABLED" ||
      code === "P35_DETERMINISTIC_OR_INELIGIBLE" || code === "AI_BILLING_REQUEST_ALREADY_ACQUIRED" ? 409 :
      code === "P35_INSUFFICIENT_AI_WALLET" || code === "P35_BUDGET_LIMIT_EXCEEDED" ? 402 :
      code === "P35_RULE_SCOPE_MISMATCH" ? 400 : 503;
    // Fail closed. Provider/billing errors may contain prompts, never echo them into the UI.
    console.error("P35_API_FAILURE", PATH, code);
    return json({ ok: false, errorCode: code }, status);
  }
}

import { NextResponse } from "next/server";
import { ActorContextError } from "../../../../../../lib/actor-context";
import { resolveRequiredAiProcessingActorContext } from "@/lib/ai/processingInstructions.server";
import { SCOPED_RULE_CODE_RE, validateActorScopedRuleV1, type ActorScopedRuleDocumentV1 } from "@/lib/ai/actorScopedRulesV1";
import { readActorScopedRuleCatalog } from "@/lib/ai/actorScopedRules.server";
import { evaluateScopedRulePreview, P33_SIMULATION_CONTRACT, type P33Fixture } from "@/lib/ai/actorScopedRuleSimulatorV1";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const HEADERS = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff", Vary: "Cookie" };
function reply(body: Record<string, unknown>, status = 200) {
  return NextResponse.json({ contract: P33_SIMULATION_CONTRACT, ...body }, { status, headers: HEADERS });
}
function failure(error: unknown) {
  if (error instanceof ActorContextError) return reply({ ok: false, errorCode: error.code }, error.status);
  const message = error instanceof Error ? error.message : "P33_UNEXPECTED_ERROR";
  const codes = ["P33_ORIGIN_MISMATCH", "P33_JSON_REQUIRED", "P33_BAD_INPUT", "P33_RULE_NOT_FOUND",
    "P33_REVISION_NOT_FOUND", "P33_CATALOG_ERROR"];
  const code = codes.includes(message) ? message : "P33_UNEXPECTED_ERROR";
  const status = code === "P33_ORIGIN_MISMATCH" ? 403 : code === "P33_JSON_REQUIRED" ? 415 :
    code === "P33_RULE_NOT_FOUND" || code === "P33_REVISION_NOT_FOUND" ? 404 :
    code === "P33_BAD_INPUT" ? 400 : 503;
  return reply({ ok: false, errorCode: code }, status);
}

type InputRow = P33Fixture;
const VALID_LOCALES = new Set(["ru", "pl", "uk", "en", "de", "es", "cs"]);
const VALID_MODES = new Set(["text_activity", "voice_command"]);
const VALID_DOMAINS = new Set(["personal_activities", "publications"]);
const VALID_SURFACES = new Set(["activity_quick_capture", "feed"]);
const VALID_EVENTS = new Set(["raw_activity_submitted", "publication_submitted"]);
function validCases(value: unknown): value is InputRow[] {
  return Array.isArray(value) && value.length >= 1 && value.length <= 16 && value.every((v: unknown) => {
    if (!v || typeof v !== "object" || Array.isArray(v)) return false;
    const row = v as Record<string, unknown>;
    return typeof row.label === "string" && row.label.length <= 80 &&
      typeof row.text === "string" && row.text.length <= 800 &&
      typeof row.expectedMatch === "boolean" &&
      typeof row.localeCode === "string" && VALID_LOCALES.has(row.localeCode) &&
      typeof row.inputMode === "string" && VALID_MODES.has(row.inputMode) &&
      typeof row.domainCode === "string" && VALID_DOMAINS.has(row.domainCode) &&
      typeof row.surfaceCode === "string" && VALID_SURFACES.has(row.surfaceCode) &&
      typeof row.eventType === "string" && VALID_EVENTS.has(row.eventType);
  });
}

/** POST accepts test cases but is strictly READ ONLY. No RPC writes, events, AI or billing. */
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin) throw new Error("P33_ORIGIN_MISMATCH");
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new Error("P33_JSON_REQUIRED");
    const rawBody = await request.text();
    if (rawBody.length > 24000) throw new Error("P33_BAD_INPUT");
    let body: Record<string, unknown>;
    try { body = JSON.parse(rawBody) as Record<string, unknown>; }
    catch { throw new Error("P33_BAD_INPUT"); }
    if (!body || typeof body !== "object" || Array.isArray(body) ||
        typeof body.ruleCode !== "string" || !SCOPED_RULE_CODE_RE.test(body.ruleCode) ||
        !validCases(body.cases) ||
        (body.compareRevision != null && (!Number.isInteger(body.compareRevision) ||
         (body.compareRevision as number) < 1 || (body.compareRevision as number) > 1000000))) {
      throw new Error("P33_BAD_INPUT");
    }
    // IDs from trusted server session only. No owner/actor IDs are accepted from request JSON.
    const actor = await resolveRequiredAiProcessingActorContext();
    const { rules, history } = await readActorScopedRuleCatalog(actor, body.ruleCode);
    const row = rules.find((candidate) => candidate.rule_code === body.ruleCode);
    if (!row) throw new Error("P33_RULE_NOT_FOUND");
    const document = validateActorScopedRuleV1(row.document_json);
    if (!document) throw new Error("P33_BAD_INPUT");
    let historical: ActorScopedRuleDocumentV1 | null = null;
    if (body.compareRevision != null) {
      const previous = history.find((candidate) => candidate.revision === body.compareRevision);
      if (!previous) throw new Error("P33_REVISION_NOT_FOUND");
      historical = validateActorScopedRuleV1(previous.document_json);
      if (!historical) throw new Error("P33_BAD_INPUT");
    }
    const cases = body.cases.map((fixture) => {
      const decision = evaluateScopedRulePreview(document, row.status, fixture);
      // Historic comparison measures document semantics, not activation of archived revisions.
      const baseline = historical ? evaluateScopedRulePreview(historical, "draft", fixture) : null;
      const syntaxRegression = baseline?.previewMatch === true &&
        evaluateScopedRulePreview(document, "draft", fixture).previewMatch === false;
      return {
        label: fixture.label, expectedMatch: fixture.expectedMatch,
        previewMatch: decision.previewMatch, reason: decision.reason,
        proposedRawActivity: decision.proposedRawActivity,
        passed: fixture.expectedMatch === decision.previewMatch,
        baselinePreviewMatch: baseline?.previewMatch ?? null,
        syntaxRegression: historical ? syntaxRegression : null,
      };
    });
    return reply({
      ok: true,
      ruleCode: row.rule_code, revision: row.current_revision, ruleStatus: row.status,
      comparedRevision: body.compareRevision ?? null,
      cases,
      total: cases.length,
      passed: cases.filter((v) => v.passed).length,
      failed: cases.filter((v) => !v.passed).length,
      regressions: cases.filter((v) => v.syntaxRegression === true).length,
      runtimeActivation: false, rawActivityWrites: false, factWrites: false, aiCalls: false,
      billedEur: 0, persistedTestCases: false,
    });
  } catch (error) { return failure(error); }
}

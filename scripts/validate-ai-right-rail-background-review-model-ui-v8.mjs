import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const checks = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8").replace(/\r\n/g, "\n");
}
function pass(name, detail = "") {
  checks.push({ name, passed: true, detail });
  console.log(`PASS ${name}${detail ? ` :: ${detail}` : ""}`);
}
function fail(name, detail = "") {
  checks.push({ name, passed: false, detail });
  console.error(`FAIL ${name}${detail ? ` :: ${detail}` : ""}`);
}
function requireText(name, rel, needles) {
  const text = read(rel);
  const missing = needles.filter((needle) => !text.includes(needle));
  missing.length ? fail(name, `${rel} missing ${missing.join(" | ")}`) : pass(name, rel);
}
function requireAbsent(name, rel, needles) {
  const text = read(rel);
  const present = needles.filter((needle) => text.includes(needle));
  present.length ? fail(name, `${rel} contains ${present.join(" | ")}`) : pass(name, rel);
}
function requireOrder(name, rel, first, second) {
  const text = read(rel);
  const firstAt = text.indexOf(first);
  const secondAt = text.indexOf(second);
  if (firstAt >= 0 && secondAt > firstAt) pass(name, `${rel} ${firstAt}<${secondAt}`);
  else fail(name, `${rel} order invalid first=${firstAt} second=${secondAt}`);
}

const provider = "src/components/app-shell/ai-navigator-provider.tsx";
const rail = "src/components/app-shell/global-ai-navigator.tsx";
const shell = "src/components/app-shell/global-app-shell.tsx";
const quick = "src/app/api/activity/quick-capture/route.ts";
const review = "src/lib/ai/activitySemanticReviewA31.server.ts";
const reviewUi = "src/components/activity/activity-semantic-review-a31.tsx";
const apiTest = "src/app/api/test/route.ts";
const catalog = "lib/ai/navigatorModelCatalog.ts";
const catalogRoute = "src/app/api/ai/model-catalog/route.ts";
const openai = "lib/ai/openaiClient.ts";

requireText("background review scheduled after response", quick, [
  'import { after, NextResponse } from "next/server"',
  "ARCTOR_AI_RIGHT_RAIL_BACKGROUND_REVIEW_V1",
  "function scheduleBackgroundSemanticReview",
  "after(async () =>",
  "analyzeActivityForSemanticReviewA31",
  'backgroundSemanticReview: "scheduled"',
  "factsWrittenAtCapture: 0",
  "aiCallsAtCapture: 0",
  "Semantic AI review is scheduled in the background after the response",
]);
requireText("duplicate capture re-requests review idempotently", quick, [
  "existingActivityEventId",
  "Activity was already captured. Background semantic review was re-requested idempotently",
]);
requireText("duplicate receipt exposes typed primary activity id", quick, [
  "primaryActivityEventId: hasActivityEventId ? text(activityEventIds[0]) : null",
  "const existingActivityEventId = existing.primaryActivityEventId",
]);
requireAbsent("duplicate branch does not re-index unknown receipt JSON", quick, [
  "existing.result.activityEventIds?.[0]",
]);

requireText("concurrent review draft race is reused", review, [
  'draftError?.code === "23505"',
  "const racedDraft = await readExistingDraft",
  "concurrentDraftReuse: true",
]);
requireText("canonical leaf retrieval contract intentionally unchanged", review, [
  "providerCatalogSent: false",
  "serverLeafResolutionRequired: true",
  'proposalKind: "semantic_proposal"',
  "valueObjectId: null",
  "Do not guess or invent",
]);

requireText("review loading has staged corporate progress", reviewUi, [
  "const LOADING_FLOW",
  "loadingStage",
  "stageTimers",
  "Checking for a completed background review",
  "ШІ аналізує текст і вкладення",
  "animate-pulse",
  "transition-[width]",
  "The activity is already saved",
]);
requireAbsent("review loading does not synchronously set stage in effect", reviewUi, [
  "let cancelled = false;\n    setLoadingStage(0);",
]);

requireText("narrow desktop uses same icon modes with accessibility text", rail, [
  'mode: "past", icon: Activity',
  'mode: "future", icon: CalendarPlus',
  'mode: "chat", icon: MessageSquare',
  "title={t(item.labelKey)}",
  "aria-label={t(item.labelKey)}",
  'mobileDrawer ? <span className="truncate"',
  '<span className="sr-only">',
]);
requireText("mobile still uses corporate icon modes", shell, [
  'mode: "past"', 'mode: "future"', 'mode: "chat"',
  "Activity", "CalendarPlus", "MessageSquare", "#3b6ef8",
]);

requireText("client model selector uses server catalog actual names", provider, [
  "AiNavigatorModelOption",
  'modelName: "gpt-5.6-luna"',
  'modelName: "gpt-5.6-terra"',
  'modelName: "gpt-5.6-sol"',
  'fetch("/api/ai/model-catalog"',
  "modelOptions",
]);
requireText("rail renders actual 5.6 model labels", rail, [
  "modelOptions.map",
  "5.6 ${tier.shortLabel}",
  'tier.reasoningEffort === "max" ? "Max"',
]);
requireAbsent("legacy user-facing model tier list removed", rail, [
  "const AI_MODEL_TIERS = [",
  'label: "Nano"',
  'label: "Standard"',
  'label: "Pro"',
]);

requireText("server model catalog is verified and bounded", catalog, [
  "ARCTOR_NAVIGATOR_MODEL_CATALOG_V1",
  'NAVIGATOR_MODEL_CATALOG_VERIFIED_AT =\n  "2026-08-19T13:00:00.000Z"',
  'NAVIGATOR_MODEL_AUTO_SEED_EXPIRES_AT =\n  "2026-08-26T23:59:59.999Z"',
  'modelName: "gpt-5.6-luna"',
  'modelName: "gpt-5.6-terra"',
  'modelName: "gpt-5.6-sol"',
  'reasoningEffort: "max"',
  "inputUsdPer1m: 5",
  "cachedInputUsdPer1m: 0.5",
  "outputUsdPer1m: 30",
]);
requireText("model catalog endpoint exposes approved slot", catalogRoute, [
  "getPublicNavigatorModelCatalog",
  'selectionPolicy: "server_approved_frontier_slot"',
]);

requireText("chat billing routes tiers to GPT-5.6 catalog", apiTest, [
  "ARCTOR_AI_RIGHT_RAIL_GPT56_MODEL_REGISTRY_V1",
  "ensureNavigatorTierModelCatalog",
  "pricesMatchCatalog",
  "AI_NAVIGATOR_GPT56_PRICE_MISMATCH_FAIL_CLOSED",
  "AI_NAVIGATOR_GPT56_AUTO_SEED_LEASE_EXPIRED",
  "server_verified_openai_model_catalog",
  "getNavigatorModelDefinition(params.selectedTier).modelName",
  "reasoningEffort: getNavigatorModelDefinition(selectedTier).reasoningEffort",
]);
requireOrder(
  "new model price is inserted before old active model is retired",
  apiTest,
  '.insert({\n      tier_code: input.tierCode,',
  '.neq("model_name", expected.modelName)',
);
requireText("old price cleanup is non-destructive best effort", apiTest, [
  "AI_NAVIGATOR_GPT56_OLD_PRICE_DEACTIVATE_WARNING",
  "AI_NAVIGATOR_GPT56_TIER_UPDATE_WARNING",
]);
requireText("OpenAI client allows max reasoning", openai, [
  '| "max";',
  "reasoningEffort?: RunAiReasoningEffort",
]);

requireText("recovery current state V8", "docs/recovery/ARCTOR_CURRENT_STATE_RU.md", [
  "AI RIGHT RAIL — V6 background review + loading UX + GPT-5.6 model selector",
  "AI RIGHT RAIL — V8 model selector TypeScript hotfix",
  "062b22afe2c7250e8ec69383394b994763524e99",
  "Canonical leaf/candidate retrieval этим шагом намеренно НЕ меняется",
]);
requireText("recovery decisions V8", "docs/recovery/ARCTOR_DECISIONS_AND_FAILURES_RU.md", [
  "AI RIGHT RAIL V6: background review / model selector",
  "AI RIGHT RAIL V8: model option contract hotfix",
  "Capture обязан завершить durable raw write раньше AI",
  "Canonical leaf/candidate retrieval в V6 запрещено менять",
]);
requireText("restore instructions V8", "docs/recovery/ARCTOR_RESTORE_FROM_ZERO_RU.md", [
  "AI RIGHT RAIL V6 — восстановление",
  "AI RIGHT RAIL V8 — model selector hotfix / восстановление",
  "backgroundSemanticReview=scheduled",
  "narrow desktop — 3 icon-only mode buttons",
]);

try {
  const manifest = JSON.parse(read("docs/recovery/CHECKPOINT_MANIFEST.json"));
  const state = manifest.aiRightRailMultimodalActivityV1;
  if (
    manifest.originMainAtCheckpoint === "062b22afe2c7250e8ec69383394b994763524e99" &&
    manifest.documentedState === "AI_RIGHT_RAIL_BACKGROUND_REVIEW_MODEL_UI_V8_CODED_AWAITING_PRODUCTION_RELEASE" &&
    state?.status === "v8_coded_awaiting_production_release" &&
    state?.backgroundReviewFactsWritten === 0 &&
    state?.canonicalLeafRetrievalChanged === false &&
    state?.modelTierRouting?.pro === "gpt-5.6-sol:max" &&
    state?.sqlRequired === false
  ) pass("checkpoint manifest V8", manifest.documentedState);
  else fail("checkpoint manifest V8", "V8 checkpoint fields mismatch");

  const evidenceRel = state?.recoveryEvidence;
  const expectedSha = state?.recoveryEvidenceSha256;
  const evidenceText = read(evidenceRel).replace(/\r\n/g, "\n");
  const actualSha = crypto.createHash("sha256").update(Buffer.from(evidenceText, "utf8")).digest("hex");
  if (actualSha === expectedSha) pass("recovery evidence hash V8", actualSha);
  else fail("recovery evidence hash V8", `expected=${expectedSha} actual=${actualSha}`);

  const index = JSON.parse(read("docs/recovery/evidence/EVIDENCE_INDEX.json"));
  const entry = Array.isArray(index.files) ? index.files.find((item) => item.file === evidenceRel) : null;
  if (entry?.sha256 === actualSha && entry?.group === "AI_RIGHT_RAIL") pass("recovery evidence indexed V8", evidenceRel);
  else fail("recovery evidence indexed V8", evidenceRel);
} catch (error) {
  fail("recovery JSON parse V8", error instanceof Error ? error.message : String(error));
}

requireText("model selector uses AiNavigatorModelOption.tierCode contract", rail, [
  "selectedTier === tier.tierCode",
  "key={tier.tierCode}",
  "setSelectedTier(tier.tierCode)",
]);
requireAbsent("legacy model selector tier.code property removed", rail, ["tier.code"]);

const failed = checks.filter((check) => !check.passed);
console.log(`SUMMARY total=${checks.length} passed=${checks.length - failed.length} failed=${failed.length}`);
process.exit(failed.length ? 1 : 0);

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const checks = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
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
  if (missing.length) fail(name, `${rel} missing ${missing.join(" | ")}`);
  else pass(name, rel);
}


function requireAbsent(name, rel, needles) {
  const text = read(rel);
  const present = needles.filter((needle) => text.includes(needle));
  if (present.length) fail(name, `${rel} still contains ${present.join(" | ")}`);
  else pass(name, rel);
}
function requireCount(name, rel, needle, expected) {
  const text = read(rel);
  const count = text.split(needle).length - 1;
  if (count !== expected) fail(name, `${rel} count=${count} expected=${expected}`);
  else pass(name, `${rel} count=${count}`);
}

const provider = "src/components/app-shell/ai-navigator-provider.tsx";
const rail = "src/components/app-shell/global-ai-navigator.tsx";
const shell = "src/components/app-shell/global-app-shell.tsx";
const apiTest = "src/app/api/test/route.ts";
const balance = "src/app/api/ai-billing/balance/route.ts";
const openai = "lib/ai/openaiClient.ts";
const quickCapture = "src/app/api/activity/quick-capture/route.ts";
const semanticReview = "src/lib/ai/activitySemanticReviewA31.server.ts";

requireText("provider marker + explicit modes", provider, [
  "ARCTOR_AI_RIGHT_RAIL_MULTIMODAL_ACTIVITY_V1",
  'export type AiNavigatorMode = "past" | "future" | "chat"',
  'fetch("/api/activity/quick-capture"',
  'const temporalDirection = mode === "past" ? "past" : "future";',
  "clientRequestId",
  "retryRequestId",
  'router.push(result.href)',
  'fetch("/api/messages"',
  'forceChat: true',
  'new FormData()',
  'formData.set(',
  'retryImage',
]);
requireCount("one canonical rail activity write path", provider, 'fetch("/api/activity/quick-capture"', 1);
requireCount("no direct activity-events write from rail provider", provider, 'fetch("/api/activity/events"', 0);

requireAbsent("activity photo no longer blocked outside chat", provider, [
  "IMAGE_ATTACHMENT_ACTIVITY_MODE_NOT_SUPPORTED",
]);

requireText("provider uses project i18n helper and seven locales", provider, [
  "getLocaleMessage",
  "normalizeLocale",
  'ru:', 'pl:', 'en:', 'es:', 'uk:', 'de:', 'cs:',
  'pastSaved', 'futureSaved', 'pricingUnavailable',
]);

requireText("messenger UX + corporate desktop mode switch", rail, [
  "ARCTOR_AI_RIGHT_RAIL_MESSENGER_UX_V1",
  "MODE_ITEMS",
  "grid grid-cols-3",
  "#3b6ef8",
  "#eef2ff",
  "messageEndRef",
  "stickToBottomRef",
  "hasUnreadBelow",
  'aiNavigator.newMessages',
  "scrollIntoView",
  "onRetry",
  "SpeechRecognition",
  "webkitSpeechRecognition",
  'accept="image/jpeg,image/png,image/webp"',
  "3 * 1024 * 1024",
  "mobileDrawer",
]);
requireText("seven-locale mode labels", rail, [
  '"aiNavigator.modePast"', '"aiNavigator.modeFuture"', '"aiNavigator.modeChat"',
  'ru:', 'pl:', 'en:', 'es:', 'uk:', 'de:', 'cs:',
]);
requireText("V4 lint-safe mode and message effects", rail, [
  "function changeNavigatorMode(mode: AiNavigatorMode)",
  "setNavigatorMode(mode)",
  "const timeoutId = window.setTimeout(() => {",
  "[isSending, latestMessage, scrollToBottom]",
]);
requireAbsent("V3 ESLint blocker removed", rail, [
  'useEffect(() => {\n    if (navigatorMode !== "chat" && selectedImage)',
  "const QUICK_COMMANDS = [",
  "function ActivityComposer(",
  "AlertTriangle,",
  "CheckCircle2,",
  "Clock,",
  "Trash2,",
]);

requireAbsent("rail photo control is not chat-only", rail, [
  "aiNavigator.photoOnlyChat",
  'if (navigatorMode !== "chat") {\n      setComposerNotice',
]);
requireText("rail photo control stays active for every mode", rail, [
  "function choosePhoto()",
  "fileInputRef.current?.click()",
  'accept="image/jpeg,image/png,image/webp"',
]);

requireText("mobile corporate three-mode controls", shell, [
  "ARCTOR_AI_RIGHT_RAIL_CORPORATE_MOBILE_MODES_V1",
  '{ mode: "past"',
  '{ mode: "future"',
  '{ mode: "chat"',
  "MOBILE_AI_MODES.map",
  "#3b6ef8",
  "rounded-2xl",
  "mobileDrawer",
]);

requireText("chat image server guard and FX compatibility", apiTest, [
  "ARCTOR_AI_RIGHT_RAIL_CHAT_PRICE_IMAGE_COMPAT_V1",
  "CHAT_IMAGE_MAX_BYTES = 3 * 1024 * 1024",
  "image\\/(?:jpeg|png|webp)",
  "CHAT_IMAGE_PREFLIGHT_TOKEN_ALLOWANCE",
  "resolveUsdToEurRate",
  'source: "historical_snapshot_fallback"',
  '.not("usd_to_eur_rate", "is", null)',
  "effectivePriceSnapshot",
  "hasImage: Boolean(chatImage)",
  "userImageDataUrl: chatImage?.dataUrl ?? null",
  "store: false",
]);
requireText("price display uses same missing-FX recovery", balance, [
  "ARCTOR_AI_RIGHT_RAIL_PRICE_DISPLAY_COMPAT_V1",
  "fallbackUsdToEurRate",
  '.not("usd_to_eur_rate", "is", null)',
]);
requireText("OpenAI Responses image input contract", openai, [
  "ARCTOR_AI_RIGHT_RAIL_IMAGE_INPUT_V1",
  "userImageDataUrl?: string | null",
  '{ type: "input_text", text: JSON.stringify(user) }',
  '{ type: "input_image", image_url: userImageDataUrl, detail: "low" }',
]);

requireText("activity quick capture stores private image evidence without AI", quickCapture, [
  'ACTIVITY_EVIDENCE_BUCKET = "activity-evidence-media-v1"',
  "public: false",
  "ACTIVITY_EVIDENCE_BUCKET_MUST_BE_PRIVATE",
  "multipart/form-data",
  'formData.get("image")',
  "MAX_IMAGE_BYTES = 3 * 1024 * 1024",
  "hasExpectedImageSignature",
  "ACTIVITY_EVIDENCE_IMAGE_CONTENT_INVALID",
  ".remove([uploadedEvidence.storagePath])",
  'provenance: "user_uploaded_raw_evidence"',
  "quickCaptureImageEvidence: imageEvidence",
  "aiCallsAtCapture: 0",
  "factsWrittenAtCapture: 0",
]);
requireText("semantic review consumes private image with integrity guards", semanticReview, [
  'ACTIVITY_EVIDENCE_BUCKET = "activity-evidence-media-v1"',
  "AI_A3_1_SEMANTIC_REVIEW_IMAGE_HASH_MISMATCH",
  "input.evidence.storagePath.startsWith(`${input.appUserId}/`)",
  "userImageDataUrl",
  "imageMeasurementsAllowed: false",
  "filterImageMeasurementsToDeclaredText",
  "quickCaptureSourceMessageText",
  "Image evidence may inform semantic proposals",
]);
requireText("semantic review stale price self-heal is bounded and fail-closed", semanticReview, [
  'STANDARD_PRICE_REFRESH_VERIFIED_AT = "2026-08-19T00:00:00.000Z"',
  'STANDARD_PRICE_REFRESH_EXPIRES_AT = "2026-08-26T23:59:59.999Z"',
  'input.modelName !== "gpt-5.4-mini"',
  "inputPrice !== 0.75",
  "cachedPrice !== 0.075",
  "outputPrice !== 4.5",
  "AI_A3_1_PRICE_REFRESH_BASELINE_MISMATCH_FAIL_CLOSED",
  'asText(row.reason) === "PRICE_SNAPSHOT_STALE"',
]);

requireText("root cause SQL still explicit", "supabase/manual-applied/20260811_gsr1e_openai_pilot_price_refresh_budget_hardening_v1.sql", [
  "usd_to_eur_rate",
  "null,",
  "'fx_intentionally_unset',true",
]);
requireText("historical positive FX seed exists", "supabase/migrations/20260622152434_seed_ai_model_price_snapshots_openai_actual_schema.sql", [
  "0.87290503::numeric",
]);

requireText("recovery current state", "docs/recovery/ARCTOR_CURRENT_STATE_RU.md", [
  "AI RIGHT RAIL MULTIMODAL ACTIVITY V1",
  "invalid_price_snapshot",
  "RELEASED_AWAITING_LIVE_UX_ACCEPTANCE",
  "V5 activity image evidence + semantic-review price recovery",
]);
requireText("recovery decisions/root cause", "docs/recovery/ARCTOR_DECISIONS_AND_FAILURES_RU.md", [
  "AI RIGHT RAIL: решения и причина `invalid_price_snapshot`",
  "fx_intentionally_unset=true",
  "clientRequestId",
  "activity-evidence-media-v1",
  "PRICE_SNAPSHOT_STALE",
]);
requireText("restore instructions", "docs/recovery/ARCTOR_RESTORE_FROM_ZERO_RU.md", [
  "AI RIGHT RAIL MULTIMODAL ACTIVITY V1 — восстановление/проверка",
  "npm run build",
  "Live acceptance",
  "AI RIGHT RAIL V5",
  "activity-evidence-media-v1",
]);

try {
  const manifest = JSON.parse(read("docs/recovery/CHECKPOINT_MANIFEST.json"));
  const state = manifest.aiRightRailMultimodalActivityV1;
  if (
    manifest.originMainAtCheckpoint === "2edd9026bd0d4e7764993d92c28ae30384fce01f" &&
    state?.status === "v5_released_awaiting_live_acceptance" &&
    state?.retryIdempotency === "stable_clientRequestId" &&
    state?.photoInput?.maxMiB === 3 &&
    state?.photoInput?.mode === "past_future_chat_v5" &&
    state?.photoInput?.activityStoragePublic === false &&
    state?.photoInput?.activityCaptureAiCalls === 0 &&
    state?.photoInput?.imageNumericMeasurementsAllowed === false &&
    state?.sqlRequired === false
  ) pass("checkpoint manifest updated", manifest.documentedState ?? "");
  else fail("checkpoint manifest updated", "AI right rail checkpoint fields mismatch");

  const evidenceRel = state?.recoveryEvidence;
  const expectedSha = state?.recoveryEvidenceSha256;
  if (!evidenceRel || !expectedSha) {
    fail("recovery evidence hash", "missing manifest evidence pointer/hash");
  } else {
    const evidenceText = fs.readFileSync(path.join(root, evidenceRel), "utf8").replace(/\r\n/g, "\n");
    const actualSha = crypto.createHash("sha256").update(Buffer.from(evidenceText, "utf8")).digest("hex");
    if (actualSha === expectedSha) pass("recovery evidence hash", actualSha);
    else fail("recovery evidence hash", `expected=${expectedSha} actual=${actualSha}`);

    const index = JSON.parse(read("docs/recovery/evidence/EVIDENCE_INDEX.json"));
    const entry = Array.isArray(index.files) ? index.files.find((item) => item.file === evidenceRel) : null;
    if (entry?.sha256 === actualSha && entry?.group === "AI_RIGHT_RAIL") pass("recovery evidence indexed", evidenceRel);
    else fail("recovery evidence indexed", evidenceRel);
  }
} catch (error) {
  fail("recovery JSON parse", error instanceof Error ? error.message : String(error));
}

const failed = checks.filter((check) => !check.passed);
console.log(`SUMMARY total=${checks.length} passed=${checks.length - failed.length} failed=${failed.length}`);
process.exit(failed.length ? 1 : 0);

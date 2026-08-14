import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import os from "node:os";

const repo = path.resolve(process.argv[2] || process.cwd());
const checks = [];
const add = (name, passed, detail = "") => checks.push({ name, passed: Boolean(passed), detail: String(detail ?? "") });
const read = (rel) => fs.readFileSync(path.join(repo, rel), "utf8").replace(/\r\n?/gu, "\n");
const has = (source, needle) => source.includes(needle);

const requireFromRepo = createRequire(path.join(repo, "package.json"));
const ts = requireFromRepo("typescript");

const files = [
  "src/lib/localization/contentLocalization.ts",
  "src/lib/localization/contentLocalization.server.ts",
  "src/lib/activity/aiLabTraceLocalization.ts",
  "src/app/api/activity/review-queue/route.ts",
  "src/app/api/activity/review-queue/[id]/resolve/route.ts",
  "src/app/api/value-objects/selector/route.ts",
  "src/app/activity-review/page.tsx",
  "src/app/activity-ai-lab/page.tsx",
  "src/lib/activity/aiLabQuickCaptureDurable.server.ts",
  "src/lib/activity/aiLabUiCopy.ts",
  "src/lib/ai/processingRuleContract.ts",
];

for (const rel of files) {
  const source = read(rel);
  const compilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  };
  if (rel.endsWith(".tsx")) {
    compilerOptions.jsx = ts.JsxEmit.ReactJSX;
  }
  const result = ts.transpileModule(source, {
    compilerOptions,
    fileName: rel,
    reportDiagnostics: true,
  });
  const diagnostics = (result.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  add(`TS_PARSE:${rel}`, diagnostics.length === 0, diagnostics.map((d) => d.code).join(","));
}

const contract = read("src/lib/localization/contentLocalization.ts");
const server = read("src/lib/localization/contentLocalization.server.ts");
const trace = read("src/lib/activity/aiLabTraceLocalization.ts");
const reviewQueue = read("src/app/api/activity/review-queue/route.ts");
const resolveRoute = read("src/app/api/activity/review-queue/[id]/resolve/route.ts");
const selector = read("src/app/api/value-objects/selector/route.ts");
const reviewList = read("src/app/activity-review/page.tsx");
const page = read("src/app/activity-ai-lab/page.tsx");
const durable = read("src/lib/activity/aiLabQuickCaptureDurable.server.ts");
const uiCopy = read("src/lib/activity/aiLabUiCopy.ts");
const ruleContract = read("src/lib/ai/processingRuleContract.ts");

add("CONTENT_LOCALES_SEVEN", has(contract, '["en", "pl", "ru", "uk", "de", "es", "cs"]'));
add("CONTENT_ORIGINAL_IMMUTABLE_ENVELOPE", has(contract, "original: LocalizedContentFieldMap") && has(contract, "sourceRevision"));
add("CONTENT_GENERIC_FIELD_MAP", has(contract, "Record<string, string | null>") && has(server, "MAX_FIELDS_PER_ITEM"));
add("CONTENT_DETECTED_SOURCE_LANGUAGE", has(server, "detectedSourceLocale") && has(server, "sourceLocaleHint is only a hint"));
add("CONTENT_ALL_LOCALE_VARIANTS", has(server, "required: [...ARCTOR_CONTENT_LOCALES]") && has(server, "targetLocales: ARCTOR_CONTENT_LOCALES"));
add("CONTENT_ONE_BATCH_CALL", has(server, "generateLocalizedContentBatch") && has(server, "MAX_BATCH_ITEMS = 5"));
add("CONTENT_NANO_MODEL", has(server, '.eq("tier_code", MODEL_TIER)') && has(server, 'const MODEL_TIER = "nano"'));
add("CONTENT_NO_PROVIDER_RETRY", has(server, "maxRetries: 0"));
add("CONTENT_OPENAI_STORE_FALSE", has(server, "store: false"));
add("CONTENT_BUDGET_PREFLIGHT", has(server, 'preflight_ai_pilot_call_budget_v1') && has(server, "pilot_budget_reservation_id"));
add("CONTENT_USAGE_EVENT", has(server, '.from("ai_usage_events")') && has(server, "actual_provider_cost_usd"));
add("CONTENT_TRANSLATION_FAILURE_NON_FATAL", has(durable, "CONTENT_LOCALIZATION_WARNING") && has(durable, "try {"));
add("CONTENT_ACTIVITY_RUNTIME_WIRED", has(durable, "ensureActivityEventLocalizations") && has(durable, "localizationInputs"));
add("CONTENT_ACTIVITY_ANALYSIS_PROVENANCE", has(durable, "analysisExecutionId: analysis.preview.analysisExecutionId") && has(durable, "operationId"));
add("REVIEW_QUEUE_LOCALE_PARAM", has(reviewQueue, 'normalizeContentLocale(url.searchParams.get("locale"))'));
add("REVIEW_QUEUE_LOCALIZED_FIELDS", has(reviewQueue, "resolveLocalizedContentFields") && has(reviewQueue, "contentSourceLocale"));
add("REVIEW_LIST_SENDS_LOCALE", has(reviewList, "locale=${encodeURIComponent(locale)}") || has(reviewList, "locale: locale"));
add("REVIEW_LIST_NO_ENGLISH_BUFFER_LABEL", !has(reviewList, "P5C · REVIEW BUFFER"));
add("SELECTOR_ACCEPTS_LOCALE", has(selector, "normalizeGlobalSystemValueObjectLocale") && has(selector, 'url.searchParams.get("locale")'));
add("SELECTOR_LOCALIZES_GLOBAL_IDS", has(selector, "localizeGlobalSystemValueObject") && has(selector, "canonical_key"));
add("SELECTOR_LOCALIZES_OWNED_METADATA", has(selector, "resolveLocalizedContentField") && has(selector, 'fieldCode: "title"'));
add("REVIEW_PICKER_SENDS_UI_LOCALE", has(page, 'locale: uiLocale') && has(page, "uiLocale: AiLabUiLocale"));
add("REVIEW_TRACE_LOCALIZED", has(page, "buildLocalizedAiLabTrace") && has(page, "buildGlobalTraceLegacyRu") && has(trace, "const C: Record<AiLabUiLocale, Copy>"));
add("REVIEW_SOURCE_DISPLAY_LOCALIZED", has(page, "payload.activity?.inputText?.trim()") && page.indexOf("payload.activity?.inputText?.trim()") < page.indexOf("payload.reviewSnapshot?.sourceFragment?.trim()"));
add("REVIEW_DETECTED_MESSAGE_LOCALE", has(page, "payload.activity?.contentSourceLocale"));
add("REVIEW_NO_CHANGE_MODE_STATE", !has(page, "reviewChangeMode") && !has(page, "setReviewChangeMode"));
add("REVIEW_SAVE_CHANGES_BUTTON", has(page, "saveReviewChanges") && has(page, "ui.savingChanges") && has(page, "ui.editActive"));
add("REVIEW_EXPLICIT_RESOLVE_ONLY", has(page, "/resolve") && has(resolveRoute, 'quickCaptureReviewStatus: "resolved"'));
add("REVIEW_NOT_AUTO_RESOLVED", !has(durable, 'quickCaptureReviewStatus: "resolved"'));
add("REVIEW_SAVED_MESSAGE_LOCALIZED", has(uiCopy, "reviewSavedRedirect") && has(page, "ui.reviewSavedRedirect"));
add("TRACE_SEVEN_LOCALES", ["en:", "pl:", "ru:", "uk:", "de:", "es:", "cs:"].every((needle) => has(trace, needle)));
add("TRACE_LOCALIZES_GLOBAL_OBJECT_NAMES", has(trace, "localizeGlobalSystemValueObject"));
add("TRACE_LOCALIZES_STATUSES_PRECISION_UNITS", has(trace, "STATUS_LABELS") && has(trace, "PRECISION_LABELS") && has(trace, "UNIT_LABELS"));
add("ADMIN_GUARD_VISIBLE", has(ruleContract, 'guardCode: "user_content_all_locale_versions"') && has(ruleContract, "contentLocalization.server.ts"));
add("NO_DB_MIGRATION_REQUIRED", !files.some((rel) => rel.startsWith("supabase/migrations/")));

// Runtime-check the pure localization envelope reader/resolver without importing app aliases.
const contractJs = ts.transpileModule(contract, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "arctor-localization-validator-"));
const contractModule = path.join(temp, "contentLocalization.mjs");
fs.writeFileSync(contractModule, contractJs, "utf8");
const localized = await import(`${pathToFileURL(contractModule).href}?v=${Date.now()}`);
const variants = Object.fromEntries(localized.ARCTOR_CONTENT_LOCALES.map((locale) => [locale, { title: `${locale}-title`, inputText: `${locale}-text` }]));
variants.ru = { title: "Русский оригинал", inputText: "выгулять собаку 19:00" };
const metadata = { localizedContent: {
  schemaVersion: 1,
  detectedSourceLocale: "ru",
  sourceLocaleHint: "en",
  sourceRevision: "abc",
  fieldCodes: ["title", "inputText"],
  original: { title: "Русский оригинал", inputText: "выгулять собаку 19:00" },
  variants,
  generatedAt: new Date().toISOString(),
  provider: "openai",
  model: "test",
  responseId: "test",
  usage: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 1, totalTokens: 2 },
}};
const pl = localized.resolveLocalizedContentFields({ metadata, locale: "pl", fallback: { title: "fallback", inputText: "fallback" } });
const ru = localized.resolveLocalizedContentFields({ metadata, locale: "ru", fallback: { title: "fallback", inputText: "fallback" } });
add("RUNTIME_LOCALIZED_VARIANT_PL", pl.title === "pl-title" && pl.inputText === "pl-text", JSON.stringify(pl));
add("RUNTIME_ORIGINAL_SOURCE_RU", ru.title === "Русский оригинал" && ru.inputText === "выгулять собаку 19:00", JSON.stringify(ru));
add("RUNTIME_UNKNOWN_LOCALE_SAFE_FALLBACK", localized.normalizeContentLocale("xx") === "en");

const failed = checks.filter((item) => !item.passed);
console.log(JSON.stringify({ ok: failed.length === 0, checks }, null, 2));
if (failed.length > 0) process.exit(1);

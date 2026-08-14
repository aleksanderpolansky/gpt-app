import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import vm from "node:vm";

const repo = path.resolve(process.argv[2] || process.cwd());
const checks = [];
const add = (name, passed, detail = "") => checks.push({ name, passed: Boolean(passed), detail: String(detail ?? "") });
const read = (rel) => fs.readFileSync(path.join(repo, rel), "utf8").replace(/\r\n?/gu, "\n");
const has = (source, needle) => source.includes(needle);

const requireFromRepo = createRequire(path.join(repo, "package.json"));
const ts = requireFromRepo("typescript");

const files = [
  "src/app/activity-ai-lab/page.tsx",
  "src/app/api/activity/quick-capture/route.ts",
  "src/app/api/activity/review-queue/route.ts",
  "src/lib/activity/aiLabQuickCaptureDurable.server.ts",
  "src/lib/activity/aiLabQuickCapture.ts",
  "src/lib/activity/quickCaptureTemporalMode.ts",
  "src/lib/activity/quickCaptureTemporalModeCopy.ts",
  "src/lib/ai/processingRuleContract.ts",
];

for (const rel of files) {
  const source = read(rel);
  const compilerOptions = { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 };
  if (rel.endsWith(".tsx")) compilerOptions.jsx = ts.JsxEmit.ReactJSX;
  const result = ts.transpileModule(source, { compilerOptions, fileName: rel, reportDiagnostics: true });
  const diagnostics = (result.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  add(`TS_PARSE:${rel}`, diagnostics.length === 0, diagnostics.map((d) => d.code).join(","));
}

const page = read("src/app/activity-ai-lab/page.tsx");
const route = read("src/app/api/activity/quick-capture/route.ts");
const review = read("src/app/api/activity/review-queue/route.ts");
const durable = read("src/lib/activity/aiLabQuickCaptureDurable.server.ts");
const quick = read("src/lib/activity/aiLabQuickCapture.ts");
const temporal = read("src/lib/activity/quickCaptureTemporalMode.ts");
const temporalCopy = read("src/lib/activity/quickCaptureTemporalModeCopy.ts");
const rules = read("src/lib/ai/processingRuleContract.ts");

add("UI_EXPLICIT_SELECTOR", has(page, 'captureTemporalDirection') && has(page, 'aria-pressed={selected}') && has(page, 'temporalUi.actual') && has(page, 'temporalUi.planned'));
add("UI_REVIEW_RESTORES_TEMPORAL_MODE", has(page, 'temporalDirection?: QuickCaptureTemporalMode | null') && has(page, 'reviewTemporalDirection') && has(page, 'setCaptureTemporalDirection(reviewTemporalDirection)'));
add("UI_MODE_DEFAULT_ACTUAL", has(page, 'useState<QuickCaptureTemporalMode>("past")'));
add("UI_MODE_REQUEST_ID_SCOPED", has(page, 'JSON.stringify([sourceText, locale, timeZone, captureTemporalDirection])'));
add("UI_SENDS_TEMPORAL_DIRECTION", has(page, 'temporalDirection: captureTemporalDirection'));
add("UI_PLANNED_BUTTON", has(page, 'temporalUi.analyzePlanned') && has(page, 'temporalUi.analyzeActual'));
add("UI_CONFLICT_LOCALIZED", has(page, 'localizeQuickCaptureTemporalModeError') && has(temporalCopy, 'conflictFutureForActual') && has(temporalCopy, 'conflictPastForPlanned'));
add("UI_SEVEN_LOCALES", ["ru:", "en:", "pl:", "uk:", "de:", "es:", "cs:"].every((needle) => has(temporalCopy, needle)));

add("API_REQUIRES_EXPLICIT_MODE", has(route, 'temporalDirection must be past or future') && has(route, 'normalizeQuickCaptureTemporalMode(body.temporalDirection)'));
add("API_RECEIPT_PERSISTS_MODE", has(route, 'temporalDirection,') && has(durable, 'temporalIntentSource: "explicit_user_control"'));
add("API_GET_SELF_HEAL", has(route, 'requeueDurableSignalIfStale(signal)') && has(route, 'scheduleProcessing({') && has(route, 'personActor.id'));

add("DURABLE_MODE_STORED_RAW", has(durable, 'temporalDirection: input.temporalDirection') && has(durable, 'temporalIntentSource: "explicit_user_control"'));
add("DURABLE_MODE_OVERRIDE_WIRED", has(durable, 'temporalDirectionOverride: requestedTemporalDirection'));
add("DURABLE_EVENT_PROVENANCE", has(durable, 'quickCaptureRequestedTemporalDirection') && has(durable, 'quickCaptureTemporalIntentSource'));
add("DURABLE_LEGACY_COMPAT", has(durable, 'requestedTemporalDirection ? "explicit_user_control" : "legacy_inference"'));
add("DURABLE_RECOVERY_LIST", has(durable, 'listDurableQuickCaptureSignalsForRecovery') && has(durable, '["pending", "received", "processing"]'));
add("DURABLE_RECOVERY_ONLY_OWN_RECEIPTS", has(durable, '.like("idempotency_key", "activity_ai_lab_quick_capture:%")'));
add("DURABLE_STALE_REQUEUE_PRESERVED", has(durable, 'P5C_DURABLE_STALE_PROCESSING_REQUEUED') && has(durable, 'PROCESSING_STALE_AFTER_MS'));
add("REVIEW_DEMAND_WATCHDOG", has(review, 'after(async () =>') && has(review, 'listDurableQuickCaptureSignalsForRecovery') && has(review, 'processDurableQuickCaptureSignal'));
add("REVIEW_WATCHDOG_BOUNDED", has(review, 'limit: 3') && has(review, 'maxDuration = 300'));

add("TIMING_OVERRIDE_CONTRACT", has(quick, 'temporalDirectionOverride?: QuickCaptureTemporalMode | null') && has(quick, 'input.temporalDirectionOverride ?? inferredTemporalDirection'));
add("TIMING_EXPLICIT_EVIDENCE", has(quick, 'hasExplicitQuickCaptureTemporalEvidence(input.sourceText)'));
add("TIMING_IGNORES_UNEVIDENCED_MODEL_TIME", has(quick, '!input.temporalDirectionOverride || explicitTemporalEvidence') && has(quick, 'input.row.temporal?.occurredAtRaw?.trim()'));
add("TIMING_CONFLICT_GUARD", has(quick, 'assertQuickCaptureTemporalModeConsistency({'));
add("TIMING_SEQUENCE_OVERRIDE", has(quick, 'temporalDirectionOverride: input.temporalDirectionOverride'));
add("TEMPORAL_CONTRACT_CODES", has(temporal, 'P5C_TEMPORAL_MODE_CONFLICT_FUTURE_TIME_FOR_ACTUAL') && has(temporal, 'P5C_TEMPORAL_MODE_CONFLICT_PAST_TIME_FOR_PLANNED') && has(temporal, 'P5C_TEMPORAL_MODE_CONFLICT_FUTURE_DATE_FOR_ACTUAL') && has(temporal, 'P5C_TEMPORAL_MODE_CONFLICT_PAST_DATE_FOR_PLANNED'));

const explicitGuardBlock = rules.match(/guardCode: "activity_explicit_temporal_mode_authoritative"[\s\S]*?changeMode: "code_release"/u)?.[0] ?? "";
add("ADMIN_EXPLICIT_MODE_GUARD", has(explicitGuardBlock, 'precedenceRank: 300'));
add("ADMIN_GUARD_TYPE_COMPAT", /export type SystemGuardCatalogItem = \{[\s\S]*?precedenceRank: 300;[\s\S]*?\};/u.test(rules));
add("ADMIN_RECOVERY_GUARD", has(rules, 'guardCode: "activity_durable_recovery_watchdog"'));
add("LEGACY_INFINITIVE_SUBORDINATED", has(rules, 'Legacy/fallback эвристика') && has(rules, 'При наличии «Произошло / Запланировать» эта эвристика не имеет права менять temporalDirection.'));
add("NO_DB_MIGRATION", !files.some((rel) => rel.startsWith("supabase/migrations/")));
add("NO_CRON_DEPENDENCY", !has(review, 'CRON_SECRET') && !has(route, 'CRON_SECRET'));

// Runtime-check the pure temporal-mode helper without app aliases.
const helperJs = ts.transpileModule(temporal, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  fileName: "quickCaptureTemporalMode.ts",
  reportDiagnostics: true,
}).outputText;
const moduleBox = { exports: {} };
vm.runInNewContext(helperJs, {
  module: moduleBox,
  exports: moduleBox.exports,
  console,
  Date,
  Error,
  Number,
  RegExp,
  String,
});
const helper = moduleBox.exports;
add("RUNTIME_NORMALIZE_PAST", helper.normalizeQuickCaptureTemporalMode("past") === "past");
add("RUNTIME_NORMALIZE_FUTURE", helper.normalizeQuickCaptureTemporalMode("future") === "future");
add("RUNTIME_REJECT_UNKNOWN_MODE", helper.normalizeQuickCaptureTemporalMode("maybe") === null);
add("RUNTIME_EVIDENCE_CLOCK", helper.hasExplicitQuickCaptureTemporalEvidence("выгулять собаку 21:00") === true);
add("RUNTIME_EVIDENCE_RELATIVE_RU", helper.hasExplicitQuickCaptureTemporalEvidence("завтра тренировка") === true);
add("RUNTIME_EVIDENCE_RELATIVE_ES", helper.hasExplicitQuickCaptureTemporalEvidence("mañana caminar") === true);
add("RUNTIME_NO_FALSE_EVIDENCE", helper.hasExplicitQuickCaptureTemporalEvidence("гулял с собакой") === false);

function throwsCode(fn, code) {
  try { fn(); return false; } catch (error) { return error instanceof Error && error.message === code; }
}

add("RUNTIME_ACTUAL_FUTURE_TIME_BLOCKED", throwsCode(() => helper.assertQuickCaptureTemporalModeConsistency({
  mode: "past",
  explicitTemporalEvidence: true,
  reportedAtIso: "2026-08-14T18:00:00.000Z",
  reportedDateKey: "2026-08-14",
  startedAtIso: "2026-08-14T19:00:00.000Z",
  focusDate: "2026-08-14",
}), "P5C_TEMPORAL_MODE_CONFLICT_FUTURE_TIME_FOR_ACTUAL"));

add("RUNTIME_PLANNED_PAST_TIME_BLOCKED", throwsCode(() => helper.assertQuickCaptureTemporalModeConsistency({
  mode: "future",
  explicitTemporalEvidence: true,
  reportedAtIso: "2026-08-14T18:00:00.000Z",
  reportedDateKey: "2026-08-14",
  startedAtIso: "2026-08-14T17:00:00.000Z",
  focusDate: "2026-08-14",
}), "P5C_TEMPORAL_MODE_CONFLICT_PAST_TIME_FOR_PLANNED"));

add("RUNTIME_ACTUAL_FUTURE_DATE_BLOCKED", throwsCode(() => helper.assertQuickCaptureTemporalModeConsistency({
  mode: "past",
  explicitTemporalEvidence: true,
  reportedAtIso: "2026-08-14T18:00:00.000Z",
  reportedDateKey: "2026-08-14",
  startedAtIso: null,
  focusDate: "2026-08-15",
}), "P5C_TEMPORAL_MODE_CONFLICT_FUTURE_DATE_FOR_ACTUAL"));

add("RUNTIME_NO_EVIDENCE_NO_BLOCK", (() => {
  try {
    helper.assertQuickCaptureTemporalModeConsistency({
      mode: "past",
      explicitTemporalEvidence: false,
      reportedAtIso: "2026-08-14T18:00:00.000Z",
      reportedDateKey: "2026-08-14",
      startedAtIso: "2026-08-14T19:00:00.000Z",
      focusDate: "2026-08-15",
    });
    return true;
  } catch { return false; }
})());

const failed = checks.filter((item) => !item.passed);
console.log(JSON.stringify({ ok: failed.length === 0, checks }, null, 2));
if (failed.length > 0) process.exit(1);

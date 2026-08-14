import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const repo = path.resolve(process.argv[2] || process.cwd());
const checks = [];
function check(name, passed, detail = "") {
  checks.push({ name, passed: Boolean(passed), detail: String(detail || "") });
}
function read(rel) {
  return fs.readFileSync(path.join(repo, rel), "utf8");
}
function exists(rel) {
  return fs.existsSync(path.join(repo, rel));
}
function tsParse(rel) {
  try {
    const source = read(rel);
    const kind = rel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const file = ts.createSourceFile(rel, source, ts.ScriptTarget.ESNext, true, kind);
    check(`TS_PARSE:${rel}`, file.parseDiagnostics.length === 0, file.parseDiagnostics.map((item) => item.messageText).join(" | "));
  } catch (error) {
    check(`TS_PARSE:${rel}`, false, error instanceof Error ? error.message : String(error));
  }
}

const files = [
  "src/lib/ai/processingRuleExecutor.ts",
  "src/lib/ai/processingRuleExecutor.server.ts",
  "src/lib/activity/quickCaptureTimeZone.ts",
  "src/lib/activity/aiLabQuickCaptureDurable.server.ts",
  "src/app/api/activity/quick-capture/route.ts",
  "src/lib/activity/aiLabQuickCapture.ts",
  "src/app/activity-ai-lab/page.tsx",
  "src/app/activity-review/page.tsx",
  "src/lib/ai/processingRules.server.ts",
];
for (const rel of files) tsParse(rel);

const route = exists("src/app/api/activity/quick-capture/route.ts") ? read("src/app/api/activity/quick-capture/route.ts") : "";
const durable = exists("src/lib/activity/aiLabQuickCaptureDurable.server.ts") ? read("src/lib/activity/aiLabQuickCaptureDurable.server.ts") : "";
const executor = exists("src/lib/ai/processingRuleExecutor.ts") ? read("src/lib/ai/processingRuleExecutor.ts") : "";
const executorServer = exists("src/lib/ai/processingRuleExecutor.server.ts") ? read("src/lib/ai/processingRuleExecutor.server.ts") : "";
const page = exists("src/app/activity-ai-lab/page.tsx") ? read("src/app/activity-ai-lab/page.tsx") : "";
const quick = exists("src/lib/activity/aiLabQuickCapture.ts") ? read("src/lib/activity/aiLabQuickCapture.ts") : "";
const rulesServer = exists("src/lib/ai/processingRules.server.ts") ? read("src/lib/ai/processingRules.server.ts") : "";
const review = exists("src/app/activity-review/page.tsx") ? read("src/app/activity-review/page.tsx") : "";

check("P5C_DURABLE_ACTIVITY_CONTEXT_IMPORT_DEPTH", route.includes('from "../../../../../lib/activity/activityUserContext";') && !route.includes('from "../../../../../../lib/activity/activityUserContext";'));
check("P5C_DURABLE_RUNTIME_LOCALE_TYPE", route.includes('function normalizeLocale(value: unknown): ActivityTimingLocalePp1') && durable.includes('function normalizeLocale(value: unknown): ActivityTimingLocalePp1') && durable.includes('locale: ActivityTimingLocalePp1;') && !durable.includes('locale: AiControlLocale;'));
check("P5C_DURABLE_CLIENT_UNUSED_TITLE_IMPORT_REMOVED", !page.includes("  deriveAiLabActivityTitle,"));
check("P5C_DURABLE_AFTER", route.includes("after(async () =>"));
check("P5C_DURABLE_MAX_DURATION", route.includes("export const maxDuration = 300"));
check("P5C_DURABLE_TIMEZONE_VALIDATION", route.includes("isSupportedTimeZone") && route.includes("Intl.DateTimeFormat"));
check("P5C_DURABLE_RECEIPT_BEFORE_BACKGROUND", route.indexOf("createDurableQuickCaptureSignal") < route.indexOf("scheduleProcessing"));
check("P5C_DURABLE_KEEPALIVE_CLIENT", page.includes("keepalive: true"));
check("P5C_DURABLE_STATUS_POLL", page.includes("/api/activity/quick-capture?"));
check("P5C_DURABLE_NO_CLIENT_EVENT_LOOP", !page.includes("async function persistQuickCapture("));
check("P5C_DURABLE_RAW_SIGNAL", durable.includes("raw_activity_signals") && durable.includes('processing_status: "pending"'));
check("P5C_DURABLE_CHECKPOINT_BEFORE_EVENT", durable.indexOf("storeDurableAnalysis") < durable.indexOf("authenticatedJsonFetch({\n        origin: input.origin,\n        path: \"/api/activity/events\""));
check("P5C_DURABLE_EVENT_IDEMPOTENCY_SIGNAL", durable.includes("operationId: signal.id"));
check("P5C_DURABLE_FACTS_SERVER_BACKGROUND", durable.includes('path: "/api/ai/reality/fact-materialize"'));
check("P5C_RULE_EXECUTOR_DB_CATALOG", executorServer.includes("readProcessingControlCatalog"));
check("P5C_RULE_EXECUTOR_PRIORITY", executor.includes("right.priority - left.priority"));
check("P5C_RULE_EXECUTOR_CONFLICT_FAIL_CLOSED", executor.includes("PROCESSING_RULE_CONFLICT_RUNTIME_BLOCKED"));
check("P5C_RULE_EXECUTOR_RUNTIME_WIRED", rulesServer.includes('"runtime_wired"'));
check("P5C_RULE_EXECUTOR_ADMIN_NOTE_WIRED", rulesServer.includes("универсальный executor подключен"));
check("P5C_RULE_EXECUTOR_APPLICATION_PROVENANCE", durable.includes("quickCaptureProcessingRuleApplications"));
check("P5C_TIMEZONE_WIRED", quick.includes("datetimeLocalInTimeZoneToIso") && quick.includes("wallClockDateForTimeZone"));
check("P5C_REVIEW_DATE_FORMATTED", review.includes("formatReviewWhen") && !review.includes('const when = activity.startedAt || activity.scheduledDate || activity.createdAt || "—"'));

async function importTranspiled(rel) {
  const source = read(rel);
  const out = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
    },
  }).outputText;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "arctor-p5c-"));
  const file = path.join(dir, path.basename(rel).replace(/\.tsx?$/u, ".mjs"));
  fs.writeFileSync(file, out, "utf8");
  return import(`${pathToFileURL(file).href}?v=${Date.now()}`);
}

try {
  const mod = await importTranspiled("src/lib/ai/processingRuleExecutor.ts");
  const catalog = (ruleCode, matcherCode, actionCode, priority = 100, parameters = {}) => ({
    ruleCode,
    title: ruleCode,
    purpose: ruleCode,
    localeCode: "global",
    runtimeTargets: ["activity_quick_capture"],
    matcherCode,
    actionCode,
    priority,
    status: "active",
    parameters,
    examples: [],
    source: "code_default",
    instructionSetId: null,
    revision: 1,
    updatedAt: null,
    isCodeDefault: true,
    runtimeConsumption: "runtime_wired",
    history: [],
    conflicts: [],
  });
  const baseRules = [
    catalog("measurement_without_independent_predicate", "modifier_only_measurement", "attach_to_adjacent_semantic_activity", 100, { preferredDirection: "previous_then_next" }),
    catalog("temporal_without_independent_predicate", "modifier_only_temporal", "attach_to_adjacent_semantic_activity", 110, { preferredDirection: "previous_then_next" }),
  ];
  const training = mod.applyActivityQuickCaptureProcessingRules({
    rows: [
      { segmentId: "a", sourceFragment: "тренировка", selected: null, facts: [] },
      { segmentId: "b", sourceFragment: "40 минут", selected: { canonicalKey: "wrong" }, facts: [] },
    ],
    rules: baseRules,
  });
  check("RUNTIME_MODIFIER_40_MINUTES_ONE_ACTIVITY", training.rows.length === 1 && training.rows[0].sourceFragment.includes("40 минут"), JSON.stringify(training));

  const temporal = mod.applyActivityQuickCaptureProcessingRules({
    rows: [
      { segmentId: "t", sourceFragment: "завтра в 18:00", temporal: { occurredAtRaw: "завтра в 18:00" }, facts: [] },
      { segmentId: "a", sourceFragment: "тренировка", selected: null, facts: [] },
      { segmentId: "d", sourceFragment: "40 минут", facts: [] },
    ],
    rules: baseRules,
  });
  check("RUNTIME_TEMPORAL_AND_DURATION_MERGE", temporal.rows.length === 1 && /завтра в 18:00.*тренировка.*40 минут/u.test(temporal.rows[0].sourceFragment), JSON.stringify(temporal));

  const keepOverride = mod.applyActivityQuickCaptureProcessingRules({
    rows: [
      { segmentId: "a", sourceFragment: "тренировка", facts: [] },
      { segmentId: "b", sourceFragment: "40 минут", facts: [] },
    ],
    rules: [
      ...baseRules,
      catalog("admin_keep_minutes", "lexeme_set", "keep_independent_activity", 250, { words: ["минут"] }),
    ],
  });
  check("RUNTIME_ADMIN_HIGHER_PRIORITY_OVERRIDE", keepOverride.rows.length === 2, JSON.stringify(keepOverride));

  let conflictBlocked = false;
  try {
    mod.applyActivityQuickCaptureProcessingRules({
      rows: [{ segmentId: "b", sourceFragment: "40 минут", facts: [] }],
      rules: [
        catalog("one", "modifier_only_measurement", "keep_independent_activity", 200),
        catalog("two", "modifier_only_measurement", "drop_from_activity_candidates", 200),
      ],
    });
  } catch (error) {
    conflictBlocked = String(error).includes("PROCESSING_RULE_CONFLICT_RUNTIME_BLOCKED");
  }
  check("RUNTIME_EQUAL_PRIORITY_CONFLICT_BLOCKED", conflictBlocked);
} catch (error) {
  check("RUNTIME_PROCESSING_EXECUTOR_IMPORT", false, error instanceof Error ? error.stack || error.message : String(error));
}

try {
  const mod = await importTranspiled("src/lib/activity/quickCaptureTimeZone.ts");
  const summer = mod.datetimeLocalInTimeZoneToIso("2026-08-15T18:00", "Europe/Berlin");
  const winter = mod.datetimeLocalInTimeZoneToIso("2026-12-15T18:00", "Europe/Berlin");
  check("RUNTIME_TIMEZONE_SUMMER", summer === "2026-08-15T16:00:00.000Z", summer);
  check("RUNTIME_TIMEZONE_WINTER", winter === "2026-12-15T17:00:00.000Z", winter);
  check("RUNTIME_TIMEZONE_DATEKEY", mod.dateKeyInTimeZone(new Date("2026-08-14T23:30:00.000Z"), "Europe/Berlin") === "2026-08-15");
  check("RUNTIME_TIMEZONE_DST_GAP_FAIL_CLOSED", mod.datetimeLocalInTimeZoneToIso("2026-03-29T02:30", "Europe/Berlin") === null);
  check("RUNTIME_TIMEZONE_INVALID_ZONE_FAIL_CLOSED", mod.datetimeLocalInTimeZoneToIso("2026-08-15T18:00", "Not/A_Zone") === null);
} catch (error) {
  check("RUNTIME_TIMEZONE_IMPORT", false, error instanceof Error ? error.stack || error.message : String(error));
}

const failed = checks.filter((item) => !item.passed);
console.log(JSON.stringify({ ok: failed.length === 0, checks }, null, 2));
process.exit(failed.length === 0 ? 0 : 1);

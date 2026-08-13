import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";

const root = process.cwd();
const files = {
  page: "src/app/activity-ai-lab/page.tsx",
  helper: "src/lib/activity/aiLabDirectSave.ts",
  activityApi: "src/app/api/activity/events/route.ts",
  materializeApi: "src/app/api/ai/reality/manual-link-materialize/route.ts",
  timingEditor: "src/components/activity/pp1/activity-timing-editor.tsx",
  plannedSelector: "src/components/activity/pp1/planned-target-selector.tsx",
  timingLib: "src/lib/activity/pp1/activityTiming.ts",
  legacyReview: "src/app/calendar/activity-review/activity-review-client.tsx",
  contract:
    "docs/reality-core/ARCTOR_AI_A3_P3_ACTIVITY_AI_LAB_DIRECT_SAVE_CONTRACT_V1_RU.md",
};

function fail(message) {
  console.error(
    JSON.stringify(
      { validator: "AI_A3_P3_DIRECT_SAVE", passed: false, error: message },
      null,
      2,
    ),
  );
  process.exit(1);
}

function read(rel) {
  const full = path.join(root, ...rel.split("/"));
  if (!fs.existsSync(full)) fail(`missing file: ${rel}`);
  const source = fs
    .readFileSync(full, "utf8")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  if (source.startsWith("\ufeff")) fail(`unexpected BOM: ${rel}`);
  if (source.includes("\u0000")) fail(`NUL byte: ${rel}`);
  return source;
}

function requireToken(text, token, label = token) {
  if (!text.includes(token)) fail(`missing marker: ${label}`);
}

function forbidToken(text, token, label = token) {
  if (text.includes(token)) fail(`forbidden marker: ${label}`);
}

let ts;
try {
  const require = createRequire(import.meta.url);
  ts = require("typescript");
} catch (error) {
  fail(
    `typescript package unavailable: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
}

function syntaxCheck(source, rel, jsx = false) {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      ...(jsx ? { jsx: ts.JsxEmit.ReactJSX } : {}),
    },
    reportDiagnostics: true,
    fileName: rel,
  });
  const errors = (result.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  if (errors.length > 0) {
    fail(
      `${rel} TypeScript diagnostics: ${errors
        .map((diagnostic) =>
          ts.flattenDiagnosticMessageText(diagnostic.messageText, " "),
        )
        .join(" | ")}`,
    );
  }
}

const page = read(files.page);
const helper = read(files.helper);
const activityApi = read(files.activityApi);
const materializeApi = read(files.materializeApi);
const timingEditor = read(files.timingEditor);
const plannedSelector = read(files.plannedSelector);
const timingLib = read(files.timingLib);
const legacyReview = read(files.legacyReview);
const contract = read(files.contract);

for (const [rel, source, jsx] of [
  [files.page, page, true],
  [files.helper, helper, false],
  [files.activityApi, activityApi, false],
  [files.materializeApi, materializeApi, false],
  [files.timingEditor, timingEditor, true],
  [files.plannedSelector, plannedSelector, true],
  [files.timingLib, timingLib, false],
]) {
  syntaxCheck(source, rel, jsx);
}

for (const marker of [
  'import { useRouter } from "next/navigation";',
  'ActivityTimingEditorPp1',
  'PlannedTargetSelectorPp1',
  'deriveAiLabActivityTitle',
  'buildAiLabDirectActivityRequest',
  'buildAiLabDirectSaveReturnUrl',
  'const [analyzedText, setAnalyzedText]',
  'const [analyzedLocale, setAnalyzedLocale]',
  'analyzedText === inputText.trim()',
  'analyzedLocale === locale',
  'function invalidateAnalysisArtifacts()',
  'if (analyzedText !== null && nextValue.trim() !== analyzedText)',
  'if (analyzedLocale !== null && nextLocale !== analyzedLocale)',
  'async function handleDirectSave()',
  'fetch("/api/activity/events"',
  '"/api/ai/reality/manual-link-materialize"',
  'const [saveCheckpoint, setSaveCheckpoint]',
  'if (!checkpoint) {',
  'setSaveCheckpoint(checkpoint);',
  'checkpoint.manualFeedbackIds.length > 0',
  'Сохранить как прошедшую',
  'Сохранить в журнал',
  'Сохранить и открыть календарь',
  'Промежуточный «Контейнер активности» для этого маршрута больше',
  'Факты и смысловые догадки из анализа не записываются автоматически',
  'disabled={Boolean(saveCheckpoint?.activityEventId)}',
  'disabled={loading || !inputText.trim() || Boolean(saveCheckpoint?.activityEventId)}',
  'disabled={loading || Boolean(saveCheckpoint?.activityEventId)}',
]) {
  requireToken(page, marker);
}

forbidToken(
  page,
  '/calendar/activity-review?locale=',
  "AI Lab must not hand off to Activity Review Container",
);
forbidToken(
  page,
  'router.push(`/calendar/activity-review',
  "AI Lab must not route through legacy container",
);
forbidToken(
  page,
  'await saveFactsForActivityContainer(',
  "AI Lab direct save must not invoke legacy fact save pipeline",
);

for (const marker of [
  'AI_A3_P3_ACTIVITY_AI_LAB_DIRECT_SAVE_V1',
  'activityRoleCode: input.temporalDirection === "future" ? "planned" : "actual"',
  'status: input.temporalDirection === "future" ? "planned" : "completed"',
  'sourceSurface: "activity_ai_lab"',
  'factMaterializationPolicy: "confirmed_feedback_only_not_materialized_in_p3"',
  'future.createCalendarProjection = true;',
  'return `/activity-today?${new URLSearchParams({ locale: params.locale }).toString()}`;',
  'return `/calendar?${query.toString()}`;',
]) {
  requireToken(helper, marker);
}

for (const marker of [
  'const idempotencyKey = asString(body.idempotencyKey);',
  'activityRoleCode = normalizeActivityRole(body.activityRoleCode)',
  'plannedTargetValueObjectIds = parseUuidArray(body.plannedTargetValueObjectIds);',
  'createCalendarProjection: body.createCalendarProjection !== false',
  'pp1bWritePath: "/api/activity/events"',
]) {
  requireToken(activityApi, marker);
}

for (const marker of [
  'onConflict: "activity_event_id,value_object_id,link_type"',
  'ignoreDuplicates: true',
  'link_type: "semantic_exposure"',
  'provenance_code: "manual"',
  'semantic_match_method_code: "user_confirmed"',
]) {
  requireToken(materializeApi, marker);
}

for (const marker of [
  'export function ActivityTimingEditorPp1',
  'temporalDirection: ActivityTemporalDirectionPp1;',
  'draft: ActivityTimingDraftPp1;',
]) {
  requireToken(timingEditor, marker);
}

for (const marker of [
  'export function PlannedTargetSelectorPp1',
  'selectedIds: string[];',
  'onChange: (ids: string[]) => void;',
]) {
  requireToken(plannedSelector, marker);
}

for (const marker of [
  'export function validateActivityTimingDraftPp1',
  'export function inferActivityTimingDraftPp1',
  'export function datetimeLocalToIsoPp1',
  'export function parsePositiveDurationMinutesPp1',
]) {
  requireToken(timingLib, marker);
}

if (!legacyReview.includes("Контейнер активности")) {
  fail("legacy Activity Review route unexpectedly removed in this scoped release");
}

for (const marker of [
  "не удаляется этим шагом физически",
  "POST /api/activity/events",
  "POST /api/ai/reality/manual-link-materialize",
  "Stale-analysis guard",
  "Idempotency и partial-save recovery",
  "Fact/projection write boundary",
  "Legacy route boundary",
]) {
  requireToken(contract, marker);
}

function loadHelperExports() {
  const transpiled = ts.transpileModule(helper, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
    fileName: files.helper,
  }).outputText;
  const sandboxModule = { exports: {} };
  vm.runInNewContext(transpiled, {
    module: sandboxModule,
    exports: sandboxModule.exports,
    URLSearchParams,
  });
  return sandboxModule.exports;
}

const helperExports = loadHelperExports();
const deriveTitle = helperExports.deriveAiLabActivityTitle;
const buildRequest = helperExports.buildAiLabDirectActivityRequest;
const buildReturnUrl = helperExports.buildAiLabDirectSaveReturnUrl;
if (
  typeof deriveTitle !== "function" ||
  typeof buildRequest !== "function" ||
  typeof buildReturnUrl !== "function"
) {
  fail("helper exports unavailable after TypeScript transpilation");
}

let behavioralChecks = 0;
function expectEqual(name, actual, expected) {
  behavioralChecks += 1;
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(
      `${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

expectEqual(
  "selected title derives from grounded segment",
  deriveTitle("сходил в магазин", [
    {
      sourceFragment: "купил продукты",
      selected: { title: "Покупка", canonicalKey: "process.finance.purchase" },
    },
  ]),
  "Покупка: купил продукты",
);

const commonInput = {
  idempotencyKey: "idem-1",
  temporalDirection: "past",
  rawText: " купил продукты ",
  title: "Покупка",
  locale: "ru",
  timingLabel: "13.08.2026",
  analysisOperationId: "analysis-1",
  manualFeedbackIds: ["feedback-1", "feedback-1", "feedback-2"],
  durationMinutes: 20,
  observedDate: "2026-08-13",
  startedAt: null,
  endedAt: null,
  scheduleModeCode: "unscheduled",
  scheduledDate: null,
  scheduleStartDate: null,
  scheduleEndDate: null,
  deadlineAt: null,
  plannedTargetValueObjectIds: ["vo-1", "vo-1"],
};
const past = buildRequest(commonInput);
expectEqual("past role", past.activityRoleCode, "actual");
expectEqual("past status", past.status, "completed");
expectEqual("past has no schedule mode", past.scheduleModeCode, undefined);
expectEqual(
  "manual feedback IDs deduplicate into metadata count",
  past.metadata.manualLeafFeedbackIntentCount,
  2,
);

const future = buildRequest({
  ...commonInput,
  temporalDirection: "future",
  scheduleModeCode: "exact",
  startedAt: "2026-08-14T08:00:00.000Z",
  endedAt: "2026-08-14T08:30:00.000Z",
  plannedTargetValueObjectIds: ["vo-1", "vo-1", "vo-2"],
});
expectEqual("future role", future.activityRoleCode, "planned");
expectEqual("future exact projection", future.createCalendarProjection, true);
expectEqual("future target dedupe", future.plannedTargetValueObjectIds, ["vo-1", "vo-2"]);
expectEqual(
  "future does not claim observed date",
  future.metadata.observedDate,
  null,
);
expectEqual(
  "past return URL",
  buildReturnUrl({ temporalDirection: "past", locale: "ru" }),
  "/activity-today?locale=ru",
);
expectEqual(
  "future return URL",
  buildReturnUrl({ temporalDirection: "future", locale: "ru", focusDate: "2026-08-14" }),
  "/calendar?locale=ru&focusDate=2026-08-14",
);

console.log(
  JSON.stringify(
    {
      validator: "AI_A3_P3_DIRECT_SAVE",
      passed: true,
      checks: {
        typescriptSyntax: "PASS",
        aiLabNoLegacyContainerHandoff: "PASS",
        directCanonicalActivityCreate: "PASS",
        timingAndPlannedTargets: "PASS",
        staleAnalysisGuard: "PASS",
        partialSaveCheckpoint: "PASS",
        manualLeafMaterialization: "PASS",
        legacyRoutePreservedForOtherCallers: "PASS",
        factProjectionWriteBoundary: "PASS",
        behavioralHelperChecks: `${behavioralChecks}/11 PASS`,
      },
    },
    null,
    2,
  ),
);

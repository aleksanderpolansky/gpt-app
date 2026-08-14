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
  return fs.readFileSync(path.join(repo, rel), "utf8").replace(/\r\n?/gu, "\n");
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
  "src/app/activity-ai-lab/page.tsx",
  "src/lib/activity/aiLabQuickCapture.ts",
  "src/lib/activity/pp1/activityTiming.ts",
  "src/lib/activity/aiLabQuickCaptureDurable.server.ts",
  "src/lib/activity/quickCaptureIntent.ts",
  "src/lib/activity/quickCaptureSourceText.ts",
  "src/lib/activity/aiLabUiCopy.ts",
  "src/lib/ai/processingRuleContract.ts",
];
for (const rel of files) tsParse(rel);

const page = exists(files[0]) ? read(files[0]) : "";
const quick = exists(files[1]) ? read(files[1]) : "";
const timing = exists(files[2]) ? read(files[2]) : "";
const durable = exists(files[3]) ? read(files[3]) : "";
const uiCopy = exists(files[6]) ? read(files[6]) : "";
const ruleContract = exists(files[7]) ? read(files[7]) : "";

check("REVIEW_MULTISELECT_STAGED_STATE", page.includes("const [pendingItems, setPendingItems] = useState<SelectorItem[]>([]);"));
check("REVIEW_MULTISELECT_TOGGLE", page.includes("function togglePendingItem(item: SelectorItem)"));
check("REVIEW_MULTISELECT_CONFIRM", page.includes("async function confirmPendingLinks()"));
check("REVIEW_MULTISELECT_CONFIRM_COUNT", page.includes("`${copy.confirm} (${pendingItems.length})`"));
check("REVIEW_MULTISELECT_NO_IMMEDIATE_SEARCH_SAVE", !page.includes('onClick={() => void addManualLink(item)}'));
check("REVIEW_MULTISELECT_MATERIALIZE_PRESERVED", page.includes('fetch("/api/ai/reality/manual-link-materialize"'));
check("REVIEW_EXPLICIT_SAVE_STATE", page.includes("const [reviewSaveStatus, setReviewSaveStatus]") && page.includes("saveReviewChanges"));
check("REVIEW_SAVE_BUTTON_VISIBLE", page.includes("ui.savingChanges") && page.includes("ui.editActive") && !page.includes("reviewChangeMode"));
check("UI_LOCALE_SEPARATE_STATE", page.includes("const [uiLocale, setUiLocale] = useState<AiLabUiLocale>(\"en\")"));
check("UI_LOCALE_URL_SOURCE", page.includes("normalizeAiLabUiLocale(params.get(\"locale\"))"));
check("MESSAGE_LOCALE_REVIEW_PRESERVED", page.includes("setLocale(normalizedLocale)"));
check("UI_LOCALE_REVIEW_REDIRECT_PRESERVED", page.includes('reviewUrl.searchParams.set("locale", uiLocale)'));
check("UI_COPY_SEVEN_LOCALES", ["ru:", "en:", "pl:", "uk:", "de:", "es:", "cs:"].every((needle) => uiCopy.includes(needle)));
check("UI_COPY_TRACE_AND_MANUAL", uiCopy.includes("trace: AiLabTraceCopy") && uiCopy.includes("manualLink: AiLabManualLinkCopy"));
check("FOOTER_NO_HARDCODED_RU", !page.includes('href="/activity-today?locale=ru"'));

check("INFINITIVE_INTENT_HELPER_WIRED", quick.includes("hasInfinitiveFutureIntent") && quick.includes("return \"future\";"));
check("INFINITIVE_INTENT_GUARD_VISIBLE", ruleContract.includes('guardCode: "activity_infinitive_intent_future"') && ruleContract.includes("hasInfinitiveFutureIntent"));
check("SOURCE_PRESERVATION_HELPER_WIRED", durable.includes("buildAiLabQuickCaptureSourceTexts") && durable.includes("sourceMessageText: inputText"));
check("SOURCE_PRESERVATION_GUARD_VISIBLE", ruleContract.includes('guardCode: "activity_source_text_preservation"') && ruleContract.includes("buildAiLabQuickCaptureSourceTexts"));
check("FUTURE_CLOCK_WITHOUT_DATE", timing.includes("nextFutureClockDateKeyPp1") && timing.includes("if (clocks[0])"));

async function importTranspiled(rel) {
  const source = read(rel);
  const out = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
    },
  }).outputText;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "arctor-p5c-refine-"));
  const file = path.join(dir, path.basename(rel).replace(/\.tsx?$/u, ".mjs"));
  fs.writeFileSync(file, out, "utf8");
  return import(`${pathToFileURL(file).href}?v=${Date.now()}-${Math.random()}`);
}

try {
  const mod = await importTranspiled("src/lib/activity/quickCaptureIntent.ts");
  check("RUNTIME_INFINITIVE_RU", mod.hasInfinitiveFutureIntent("выгулять собаку 18.00", "ru") === true);
  check("RUNTIME_INFINITIVE_RU_META_PREFIX", mod.hasInfinitiveFutureIntent("активность выгулять собаку 18.00", "ru") === true);
  check("RUNTIME_CONJUGATED_PAST_NOT_FUTURE", mod.hasInfinitiveFutureIntent("выгуливал собаку 18.00", "ru") === false);
  check("RUNTIME_NOUN_EXCEPTION", mod.hasInfinitiveFutureIntent("кровать у окна", "ru") === false);
  check("RUNTIME_NON_RU_NOT_GUESSED", mod.hasInfinitiveFutureIntent("walk the dog", "en") === false);
} catch (error) {
  check("RUNTIME_INTENT_IMPORT", false, error instanceof Error ? error.stack || error.message : String(error));
}

try {
  const mod = await importTranspiled("src/lib/activity/quickCaptureSourceText.ts");
  const single = mod.buildAiLabQuickCaptureSourceTexts({
    rows: [{ sourceFragment: "выгулять собаку", temporal: { occurredAtRaw: "в 18:00" }, facts: [] }],
    sourceMessageText: "выгулять собаку 18.00",
  });
  check("RUNTIME_SINGLE_SOURCE_EXACT", single.length === 1 && single[0] === "выгулять собаку 18.00", JSON.stringify(single));
  const multi = mod.buildAiLabQuickCaptureSourceTexts({
    rows: [
      { sourceFragment: "гулял", facts: [{ rawFragment: "20 минут" }] },
      { sourceFragment: "пил кофе", temporal: { occurredAtRaw: "в 15:00" }, facts: [] },
    ],
    sourceMessageText: "гулял 20 минут, пил кофе в 15:00",
  });
  check("RUNTIME_MULTI_SOURCE_MODIFIERS", multi[0] === "гулял 20 минут" && multi[1] === "пил кофе в 15:00", JSON.stringify(multi));
  const noDuplicate = mod.buildAiLabQuickCaptureSourceTexts({
    rows: [{ sourceFragment: "гулял 20 минут", facts: [{ rawFragment: "20 минут" }] }],
    sourceMessageText: "",
  });
  check("RUNTIME_SOURCE_NO_DUPLICATE", noDuplicate[0] === "гулял 20 минут", JSON.stringify(noDuplicate));
} catch (error) {
  check("RUNTIME_SOURCE_IMPORT", false, error instanceof Error ? error.stack || error.message : String(error));
}

try {
  const mod = await importTranspiled("src/lib/activity/pp1/activityTiming.ts");
  const before = mod.inferActivityTimingDraftPp1("выгулять собаку 18.00", "future", new Date(2026, 7, 14, 16, 21, 0));
  check("RUNTIME_CLOCK_TODAY_FUTURE", before.scheduleModeCode === "exact" && before.startedAtLocal === "2026-08-14T18:00", JSON.stringify(before));
  const after = mod.inferActivityTimingDraftPp1("выгулять собаку 18.00", "future", new Date(2026, 7, 14, 19, 0, 0));
  check("RUNTIME_CLOCK_NEXT_DAY_AFTER_PASS", after.scheduleModeCode === "exact" && after.startedAtLocal === "2026-08-15T18:00", JSON.stringify(after));
  check("RUNTIME_CLOCK_DEFAULT_DURATION", before.durationMinutes === "15" && before.endedAtLocal === "2026-08-14T18:15", JSON.stringify(before));
} catch (error) {
  check("RUNTIME_TIMING_IMPORT", false, error instanceof Error ? error.stack || error.message : String(error));
}

const failed = checks.filter((item) => !item.passed);
console.log(JSON.stringify({ ok: failed.length === 0, checks }, null, 2));
process.exit(failed.length === 0 ? 0 : 1);

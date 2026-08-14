import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import os from "node:os";
import { pathToFileURL } from "node:url";

const repo = path.resolve(process.argv[2] ?? process.cwd());
const require = createRequire(path.join(repo, "package.json"));
const ts = require("typescript");
const checks = [];
function check(name, condition, detail = "") { checks.push({ name, passed: Boolean(condition), detail }); if (!condition) throw new Error(`${name}: ${detail || "failed"}`); }
function read(rel) { return fs.readFileSync(path.join(repo, rel), "utf8"); }
function parse(rel, kind = ts.ScriptKind.TS) {
  const source = read(rel);
  const result = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, jsx: ts.JsxEmit.Preserve, strict: true }, fileName: rel, reportDiagnostics: true });
  const diagnostics = (result.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  check(`TS_PARSE:${rel}`, diagnostics.length === 0, diagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, " | ")).join(" | "));
  return source;
}

const contractPath = "src/lib/ai/processingRuleContract.ts";
const serverPath = "src/lib/ai/processingRules.server.ts";
const routePath = "src/app/api/admin/ai-instructions/route.ts";
const clientPath = "src/app/admin/ai-instructions/ai-instructions-admin-client.tsx";
const contract = parse(contractPath);
const server = parse(serverPath);
const route = parse(routePath);
const client = parse(clientPath, ts.ScriptKind.TSX);

check("CONTROL_THREE_SECTIONS", client.includes("1 · Инструкции AI") && client.includes("2 · Правила обработки") && client.includes("3 · Системные ограничения"));
check("CONTROL_PRECEDENCE_VISIBLE", client.includes("ПРИОРИТЕТ") && contract.includes("AI_CONTROL_PRECEDENCE"));
check("CONTROL_CHANGE_GUIDE", client.includes("Как менять безопасно") && client.includes("Что делать, если это всё-таки нужно изменить"));
check("CONTROL_SOURCE_POINTERS", contract.includes("sourcePath") && contract.includes("sourceSymbol") && client.includes("Файл:"));
check("CONTROL_GUARDS_READ_ONLY", contract.includes("editable: false") && contract.includes('changeMode: "code_release"'));
check("CONTROL_SAFE_ENGINE_ONLY", contract.includes("PROCESSING_RULE_MATCHERS") && contract.includes("PROCESSING_RULE_ACTIONS") && contract.includes("executable configuration is forbidden"));
check("CONTROL_NO_EXECUTABLE_DB", !server.includes("new Function") && !server.includes("eval(") && !server.includes("RegExp(") && client.includes("Исполняемый код в БД"));
check("CONTROL_DYNAMIC_RULE_CODE", server.includes("processing_rule__") && route.includes('entityKind === "processing_rule"'));
check("CONTROL_VERSIONED_STORAGE", server.includes("ai_processing_instruction_revisions") && server.includes("current_revision") && server.includes("nextRevision"));
check("CONTROL_CONFLICT_DETECTION", contract.includes("detectProcessingRuleConflicts") && client.includes("Конфликты"));
check("CONTROL_DEFAULT_MEASUREMENT_RULE", contract.includes("measurement_without_independent_predicate") && contract.includes("modifier_only_measurement") && contract.includes("attach_to_adjacent_semantic_activity"));
check("CONTROL_CURRENT_INSTRUCTIONS_PRESERVED", route.includes("readAdminInstructionCatalog") && route.includes("saveSystemInstructionOverride") && route.includes("restoreSystemInstructionDefault"));
check("CONTROL_ADMIN_PERMISSIONS", route.includes('allowedRoles: ["owner", "admin", "viewer"]') && route.includes('allowedRoles: ["owner", "admin"]'));
check("CONTROL_DB_PREFIX_ISOLATED", server.includes('const STORAGE_PREFIX = "processing_rule__"'));
check("CONTROL_RULE_STATUS_STORED_IN_SNAPSHOT", server.includes('status: "active"') && server.includes("serializeProcessingRule(rule)"), "instruction-set override stays active; rule.status lives in versioned JSON");
check("CONTROL_RULE_DISABLE_WITHOUT_RELEASE", client.includes("снимите флажок «Активно»") && client.includes("Вернуть fallback из кода"));
check("CONTROL_RUNTIME_TRANSPARENCY", server.includes("catalog_only_until_executor_wired") && client.includes("Состояние подключения"));
check("CONTROL_CLIENT_HOOK_DEPENDENCIES", client.includes("useCallback") && client.includes("}, [fillRuleDraft]);") && client.includes("}, [load, localeCode]);"));
check("CONTROL_CLIENT_NO_HOOK_LINT_SUPPRESSION", !client.includes("eslint-disable-next-line react-hooks/exhaustive-deps"));

const processingInstructionSource = read("src/lib/ai/processingInstructions.server.ts");
const globalPilotSource = read("lib/reality/globalObservationPilot.ts");
for (const needle of [
  "Return valid compact JSON in the exact shape",
  "untrusted user data",
  "Return only valid JSON and never perform writes",
  "Never invent a date, time, duration, end time or year",
  "Do not create or mutate Value Objects or Goal Worlds",
  "Explicit data in the current message is authoritative",
]) check(`GUARD_EVIDENCE:${needle.slice(0, 24)}`, processingInstructionSource.includes(needle), needle);
for (const needle of ["AI_SELECTION_KEY_CONTRACT_FAILED", "FACTS_DROPPED_WITHOUT_SELECTED_LEAF", "FACT_DROPPED", "__NONE__"]) check(`PILOT_GUARD_EVIDENCE:${needle}`, globalPilotSource.includes(needle), needle);
const quickCaptureSource = read("src/lib/activity/aiLabQuickCapture.ts");
for (const needle of ["FUTURE_TEXT_PHRASES", "buildAiLabQuickCaptureSequentialTimings", "deriveAiLabQuickCaptureIdempotencyKey"]) check(`QUICK_CAPTURE_GUARD_EVIDENCE:${needle}`, quickCaptureSource.includes(needle), needle);
const timingSource = read("src/lib/activity/pp1/activityTiming.ts");
check("TIMING_GUARD_EVIDENCE", timingSource.includes("inferActivityTimingDraftPp1"), "inferActivityTimingDraftPp1");
const factHelperSource = read("src/lib/activity/aiLabFactMaterialization.ts");
check("FACT_EVIDENCE_GUARD", factHelperSource.includes("containsEvidenceFragment"), "containsEvidenceFragment");

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "arctor-control-catalog-"));
const transpiled = ts.transpileModule(contract, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, strict: true }, reportDiagnostics: true, fileName: contractPath });
check("CONTROL_CONTRACT_TRANSPILE", (transpiled.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error).length === 0);
const modulePath = path.join(temp, "contract.mjs");
fs.writeFileSync(modulePath, transpiled.outputText, "utf8");
const mod = await import(`${pathToFileURL(modulePath).href}?t=${Date.now()}`);
const valid = mod.validateProcessingRuleDraft({ ruleCode: "custom_duration_guard", title: "Duration guard", purpose: "Attach duration modifiers", localeCode: "global", runtimeTargets: ["activity_quick_capture"], matcherCode: "modifier_only_measurement", actionCode: "attach_to_adjacent_semantic_activity", priority: 90, status: "active", parameters: { words: ["minute"] }, examples: ["40 minutes"] });
check("CONTROL_RUNTIME_VALID_RULE", valid.ok === true, JSON.stringify(valid));
const badAction = mod.validateProcessingRuleDraft({ ...(valid.ok ? valid.value : {}), actionCode: "run_arbitrary_js" });
check("CONTROL_RUNTIME_REJECT_UNKNOWN_ACTION", badAction.ok === false, JSON.stringify(badAction));
const badParams = mod.validateProcessingRuleDraft({ ...(valid.ok ? valid.value : {}), parameters: { javascript: "alert(1)" } });
check("CONTROL_RUNTIME_REJECT_EXECUTABLE_PARAM", badParams.ok === false, JSON.stringify(badParams));
const encoded = mod.serializeProcessingRule(valid.value);
const decoded = mod.parseProcessingRuleStoredText(encoded);
check("CONTROL_RUNTIME_SERIALIZATION_ROUNDTRIP", decoded?.ruleCode === "custom_duration_guard", encoded);
const conflicts = mod.detectProcessingRuleConflicts([
  { ...valid.value, source: "code_default", instructionSetId: null, revision: null, updatedAt: null, isCodeDefault: true, runtimeConsumption: "catalog_only_until_executor_wired", history: [], conflicts: [] },
  { ...valid.value, ruleCode: "opposite", actionCode: "keep_independent_activity", source: "code_default", instructionSetId: null, revision: null, updatedAt: null, isCodeDefault: true, runtimeConsumption: "catalog_only_until_executor_wired", history: [], conflicts: [] },
]);
check("CONTROL_RUNTIME_CONFLICT", conflicts.every((item) => item.conflicts.length === 1), JSON.stringify(conflicts));

console.log(JSON.stringify({ ok: true, checks }, null, 2));

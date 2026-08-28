import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
let n = 0;
let failed = 0;
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
}
function check(condition, label) {
  n += 1;
  if (condition) console.log(`PASS ${String(n).padStart(3, "0")} ${label}`);
  else { failed += 1; console.error(`FAIL ${String(n).padStart(3, "0")} ${label}`); }
}

const adapter = read("src/components/tables/arctor-tabulator.tsx");
const util = read("src/components/tables/arctor-clipboard.ts");
const catalog = read("src/components/workspace/value-objects/value-object-catalog-views.tsx");
const editor = read("src/components/workspace/value-objects/value-object-table-editor.tsx");
const current = read("docs/recovery/ARCTOR_CURRENT_STATE_RU.md");
const recovery = read("docs/recovery/ARCTOR_TABLE_VIEWS_T2_3_1_COPY_HOTFIX_V1_1_RU.md");
const pkg = JSON.parse(read("package.json"));

check(pkg.dependencies?.["tabulator-tables"] === "6.5.2", "Tabulator remains exact 6.5.2");
for (const [needle, label] of [
  ['import { serializeArctorClipboardMatrix } from "./arctor-clipboard"', "clipboard serializer imported"],
  ["getStructuredCells: () => TabulatorRangeCellComponent[][]", "typed structured range cells"],
  ["type TabulatorRangeEventEmitter", "typed range event bridge"],
  ['event: "rangeAdded" | "rangeChanged" | "rangeRemoved"', "range event union"],
  ["let copyDocument: Document | null = null", "document copy cleanup state"],
  ["let rangeCopyArmed = false", "copy armed state"],
  ["selectableRangeInitializeDefault: false", "initial range disabled"],
  ['rangeEvents.on("rangeAdded", syncRangeCopyArm)', "range added arms copy"],
  ['rangeEvents.on("rangeChanged", syncRangeCopyArm)', "range changed arms copy"],
  ['rangeEvents.on("rangeRemoved", syncRangeCopyArm)', "range removed syncs copy"],
  ["rangeTable.getRanges().length > 0", "copy arm derives from actual ranges"],
  ["copyPointerListener = (event) =>", "outside pointer guard"],
  ["!host.contains(target)", "outside table disarms copy"],
  ["rangeCopyArmed = false", "disarm assignment"],
  ["copyListener = (event) =>", "custom copy listener"],
  ["!rangeCopyArmed || isInteractiveTarget(event.target)", "interactive editor copy bypass"],
  ["selection && !selection.isCollapsed", "DOM text selection bypass"],
  ["const activeRange = ranges[ranges.length - 1]", "last selected range used"],
  [".getStructuredCells()", "structured range read"],
  ["row.map((cell) => cell.getValue())", "cell values extracted"],
  ["serializeArctorClipboardMatrix(matrix)", "TSV serializer used"],
  ['clipboardData.setData("text/plain", clipboard)', "clipboardData populated"],
  ["event.preventDefault()", "browser default stopped after write"],
  ["event.stopPropagation()", "built-in focus-dependent copy bypassed"],
  ["onRangeCopiedRef.current?.(clipboard)", "existing copied feedback retained"],
  ['copyDocument.addEventListener("copy", copyListener, true)', "document capture copy listener"],
  ['copyDocument.addEventListener("pointerdown", copyPointerListener, true)', "document capture pointer listener"],
  ['copyDocument.removeEventListener("copy", copyListener, true)', "copy listener cleanup"],
  ['copyDocument.removeEventListener("pointerdown", copyPointerListener, true)', "pointer listener cleanup"],
  ['pasteHost.addEventListener("paste", pasteListener)', "T2_3 custom paste retained"],
  ["rangeClipboard && editMode && !compactTouchEnvironment", "smartphone range boundary retained"],
]) check(adapter.includes(needle), label);
check(adapter.includes("TabulatorClipboardCopiedEmitter"), "legacy Tabulator clipboard callback retained as fallback");
check(adapter.includes('clipboardEmitter.on("clipboardCopied"'), "legacy clipboardCopied subscription retained as fallback");
check(adapter.includes("document capture listener above is authoritative for actual clipboard data"), "document copy remains authoritative over fallback");

for (const [needle, label] of [
  ["function serializeClipboardCell", "cell serializer helper"],
  ["value == null ? \"\" : String(value)", "nullish cells serialize empty"],
  ["/[\"\\t\\r\\n]/", "special character quoting gate"],
  ["text.replace(/\"/g, '\"\"')", "double quote escaping"],
  ['.join("\\t")', "TSV columns"],
  ['.join("\\r\\n")', "Excel-friendly CRLF rows"],
  ["export function serializeArctorClipboardMatrix", "serializer exported"],
]) check(util.includes(needle), label);

for (const [needle, label] of [
  ["rangeClipboard={tableEditMode}", "range clipboard still wired"],
  ["onRangeCopied={() =>", "copied feedback still wired"],
  ["onRangePaste={handleTableRangePaste}", "paste handler still wired"],
  ["async function applyTableHistory", "Undo/Redo retained"],
]) check(catalog.includes(needle), label);
for (const [needle, label] of [
  ['valueObject.scope_code === "global"', "global write fail-closed retained"],
  ['valueObject.origin_type_code === "system"', "system write fail-closed retained"],
  ['method: "PATCH"', "existing PATCH writes retained"],
  ["/ontology-definition", "ontology endpoint retained"],
]) check(editor.includes(needle), label);

for (const [needle, label] of [
  ["21da8ca46802559e2c8a6f114ee4b89db21c7d1b", "recovery exact baseline"],
  ["defaultPrevented: false", "recovery observed defaultPrevented"],
  ["types: []", "recovery observed empty clipboard types"],
  ["textLength: 0", "recovery observed zero clipboard text"],
  ["document-level capture", "recovery document capture strategy"],
  ["getStructuredCells()", "recovery structured range strategy"],
  ["Excel", "recovery Excel compatibility"],
  ["Google Sheets", "recovery Google Sheets compatibility"],
  ["Pointer click вне таблицы", "recovery outside click boundary"],
  ["DOM text selection", "recovery native text copy boundary"],
  ["100", "recovery paste cap retained"],
  ["_arctor_t231_preflight", "recovery short scratch path"],
  ["ROLLBACK=NOT_NEEDED_PREMUTATION", "recovery V1 pre-mutation rollback status"],
  ["FAIL 034", "recovery V1 validator false-negative"],
  ["fallback subscription", "recovery V1_1 fallback resolution"],
  ["Guest/Local Documents / Spreadsheets / Mind Maps", "future local tools direction retained"],
]) check(recovery.includes(needle), label);
for (const [needle, label] of [
  ["Table Views T2_3_1 Copy Hotfix", "current state hotfix checkpoint"],
  ["21da8ca46802559e2c8a6f114ee4b89db21c7d1b", "current state baseline"],
  ["defaultPrevented:false", "current state production diagnosis"],
  ["getStructuredCells()", "current state structured copy"],
  ["selectableRangeInitializeDefault:false", "current state default range guard"],
  ["Smartphone multi-cell range", "current state smartphone boundary"],
]) check(current.includes(needle), label);

if (failed) {
  console.error(`RESULT=FAIL checks=${n} failed=${failed}`);
  process.exit(1);
}
console.log(`RESULT=PASS checks=${n}`);

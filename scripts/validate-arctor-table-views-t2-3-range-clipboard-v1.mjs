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
function section(text, start, end) {
  const a = text.indexOf(start);
  if (a < 0) return "";
  const b = end ? text.indexOf(end, a + start.length) : -1;
  return b >= 0 ? text.slice(a, b) : text.slice(a);
}

const adapter = read("src/components/tables/arctor-tabulator.tsx");
const css = read("src/components/tables/arctor-tabulator.css");
const catalog = read("src/components/workspace/value-objects/value-object-catalog-views.tsx");
const editor = read("src/components/workspace/value-objects/value-object-table-editor.tsx");
const current = read("docs/recovery/ARCTOR_CURRENT_STATE_RU.md");
const recovery = read("docs/recovery/ARCTOR_TABLE_VIEWS_T2_3_RANGE_CLIPBOARD_V1_RU.md");
const layout = read("src/app/layout.tsx");
const pkg = JSON.parse(read("package.json"));

check(pkg.dependencies?.["tabulator-tables"] === "6.5.2", "Tabulator remains exact 6.5.2");

for (const [needle, label] of [
  ['"arctor-expanded-input"', "expanded input retained"],
  ['"arctor-expanded-textarea"', "expanded textarea retained"],
  ["function createExpandedEditor", "expanded editor retained"],
  ["window.visualViewport", "VisualViewport retained"],
  ['cellEditedEmitter.on("cellEdited"', "typed cellEdited bridge retained"],
  ["cell.restoreOldValue()", "cell rollback retained"],
  ["mobileHorizontalScroll?: boolean", "mobile horizontal scroll retained"],
  ["allowNativePinchZoom?: boolean", "native pinch zoom retained"],
  ["rangeClipboard?: boolean", "range clipboard prop"],
  ["ArctorTableRangePasteCell", "range paste cell type"],
  ["ArctorTableRangePasteEvent", "range paste event type"],
  ["onRangeCopied?:", "range copied callback"],
  ["onRangePaste?:", "range paste callback"],
  ["parseArctorClipboardMatrix", "TSV parser"],
  ["collectRangePasteCells", "range target collector"],
  ["getRanges: () => TabulatorRangeComponent[]", "typed range table bridge"],
  ['on: (event: "clipboardCopied"', "typed clipboard copied bridge"],
  ["clipboard.replace(/^\\uFEFF/", "clipboard BOM removal"],
  ['character === "\\t"', "TSV tab parser"],
  ['character === "\\n" || character === "\\r"', "TSV newline parser"],
  ["quoted && source[index + 1] === '\"'", "escaped quote parser"],
  ["sourceColumns", "source column count"],
  ["truncatedCells", "truncated paste count"],
  ["candidate.getColumn().isVisible()", "paste maps visible columns"],
  ["currentRow.getNextRow()", "paste maps subsequent rows"],
  ["rangeClipboardActive", "range runtime gate"],
  ["rangeClipboard && editMode && !compactTouchEnvironment", "range disabled on compact touch"],
  ["smartphone single-cell copy/paste remains available", "mobile rationale documented in source"],
  ["selectableRange: 1", "single active range enabled"],
  ["selectableRangeColumns: false", "column selection disabled"],
  ["selectableRangeRows: false", "row selection disabled"],
  ["selectableRangeClearCells: false", "delete-to-clear disabled"],
  ["selectableRangeAutoFocus: true", "range auto focus"],
  ['clipboard: "copy"', "Tabulator clipboard copy-only"],
  ["clipboardCopyStyled: false", "unstyled clipboard copy"],
  ["rowHeaders: false", "copy excludes row headers"],
  ["columnHeaders: false", "copy excludes column headers"],
  ['clipboardCopyRowRange: "range"', "copy selected range as row range"],
  ["pasteHost.addEventListener(\"paste\"", "custom paste listener"],
  ["event.clipboardData?.getData(\"text/plain\")", "plain text clipboard input"],
  ["event.preventDefault()", "custom paste prevents local default mutation"],
  ["pasteHost.removeEventListener(\"paste\"", "paste listener cleanup"],
  ['data-range-clipboard={rangeClipboard && editMode ? "true" : undefined}', "range clipboard host marker"],
]) check(adapter.includes(needle), label);
check(!adapter.includes('clipboardPasteAction: "range"'), "built-in mutation paste absent");
check(!adapter.includes('clipboardPasteParser: "range"'), "built-in paste parser not relied upon");
check(!adapter.includes('instance.on("cellEdited"'), "old JS inference trap absent");

for (const [needle, label] of [
  ["overflow-x: auto !important", "mobile horizontal scroll CSS retained"],
  ["touch-action: pan-x pan-y pinch-zoom", "native pinch CSS retained"],
  ['[data-edit-mode="true"] .tabulator-row .tabulator-cell:not(.tabulator-editable)', "read-only gray selector retained"],
  ["background: #f3f4f6", "read-only gray retained"],
  ["font-size: 16px", "mobile editor iOS anti-zoom retained"],
]) check(css.includes(needle), label);

for (const [needle, label] of [
  ["type TableEditHistoryAction", "batch history action type"],
  ['kind: "cell" | "paste"', "history action kinds"],
  ["entries: TableEditHistoryEntry[]", "history action entries"],
  ["MAX_TABLE_PASTE_WRITES = 100", "paste write cap"],
  ["useState<TableEditHistoryAction[]>([])", "history stack stores actions"],
  ["validateValueObjectTableFieldValue", "paste prevalidation helper imported"],
  ["async function persistTableHistoryEntries", "batch persistence helper"],
  ['direction: "forward" | "reverse"', "batch direction typed"],
  ["const workingObjects = new Map", "batch tracks confirmed object state"],
  ["const applied: Array", "batch tracks applied writes"],
  ["saveValueObjectTableField({", "batch reuses existing write helper"],
  ["onValueObjectUpdated?.(patch)", "confirmed batch patch updates state"],
  ["for (const appliedWrite of [...applied].reverse())", "compensation reverses applied writes"],
  ["rollbackIncomplete = true", "rollback incomplete tracked"],
  ["onValueObjectUpdated?.(rollbackPatch)", "rollback patch updates state"],
  ["async function handleTableRangePaste", "range paste handler"],
  ['cell.field !== "title" && cell.field !== "description"', "paste only title/description"],
  ['strategy === "readonly_system" || strategy === "readonly_contract"', "read-only paste skip gate"],
  ["event.truncatedCells", "truncated cells counted skipped"],
  ["plannedByCell", "paste deduplicates target cells"],
  ["validation.previousValue", "history before from validated persisted state"],
  ["validation.nextValue", "history after from normalized validated value"],
  ["entries.length > MAX_TABLE_PASTE_WRITES", "paste cap enforced before write"],
  ["tableEditCopy.pasting", "pasting feedback"],
  ['persistTableHistoryEntries(entries, "forward")', "paste executes one batch"],
  ['kind: "paste", entries', "paste stored as one history action"],
  ["setTableRedoStack([])", "new paste clears redo"],
  ["tableEditCopy.pasteRollbackFailed", "incomplete rollback feedback"],
  ["tableEditCopy.pasteRolledBack", "successful compensation feedback"],
  ["async function applyTableHistory", "undo redo retained"],
  ['direction === "undo" ? "reverse" : "forward"', "undo reverses batch order"],
  ["rangeClipboard={tableEditMode}", "range clipboard wired in edit mode"],
  ["onRangeCopied={() =>", "copy feedback wired"],
  ["onRangePaste={handleTableRangePaste}", "paste callback wired"],
  ["tableEditCopy.rangeHint", "range help text rendered"],
  ["mobileHorizontalScroll", "mobile scroll still forwarded"],
  ["allowNativePinchZoom", "pinch still forwarded"],
]) check(catalog.includes(needle), label);

for (const [needle, label] of [
  ["copied: string", "copy copy-field"],
  ["pasting: string", "pasting copy-field"],
  ["pasted: string", "pasted copy-field"],
  ["pasteNoEditable: string", "no editable copy-field"],
  ["pasteTooLarge: string", "paste cap copy-field"],
  ["pasteRolledBack: string", "rollback copy-field"],
  ["pasteRollbackFailed: string", "incomplete rollback copy-field"],
  ["rangeHint: string", "range hint copy-field"],
  ['copied: "Copied selected cells."', "English copied copy"],
  ['copied: "Выделенные ячейки скопированы."', "Russian copied copy"],
  ["export function validateValueObjectTableFieldValue", "shared value prevalidator exported"],
  ["const valueObjectId = selectedValueObject.id", "save helper narrows object id"],
  ["const validation = validateValueObjectTableFieldValue(args)", "single edit uses shared prevalidator"],
  ["nextValue.length > 180", "title max 180"],
  ["nextValue.length > 4000", "description max 4000"],
  ['valueObject.scope_code === "global"', "global fail-closed"],
  ['valueObject.origin_type_code === "system"', "system fail-closed"],
  ['return "readonly_contract"', "unsupported contract fail-closed"],
  ['method: "PATCH"', "existing PATCH writes retained"],
  ["/ontology-definition", "ontology definition endpoint retained"],
  ["/api/value-objects/", "draft endpoint retained"],
]) check(editor.includes(needle), label);

const saveHelper = section(editor, "export async function saveValueObjectTableField", "export function ValueObjectTableEditor");
check(saveHelper.length > 0, "single-field helper located");
check(!saveHelper.includes("parentValueObjectId"), "single-field helper never writes parentValueObjectId");
check(!saveHelper.includes("parent_value_object_id"), "single-field helper never writes parent_value_object_id");
check(!saveHelper.includes("node_role"), "single-field helper never writes role" );
check(!saveHelper.includes("status:"), "single-field helper never writes status");

check(!layout.includes("userScalable: false"), "Next layout still allows user scaling");
check(!layout.includes("maximumScale: 1"), "Next layout still has no max-scale lock");
check(!layout.includes("user-scalable=no"), "no user-scalable=no viewport lock");

for (const [needle, label] of [
  ["95bbcac37b025ac8ba6e8e16d915e764fa87adf1", "recovery exact baseline"],
  ["Ctrl+C", "recovery copy workflow"],
  ["Ctrl+V", "recovery paste workflow"],
  ["Excel", "recovery Excel compatibility"],
  ["Google Sheets", "recovery Google Sheets compatibility"],
  ["компенсационный rollback", "recovery compensation rule"],
  ["best-effort compensation", "recovery non-ACID disclosure"],
  ["100", "recovery paste cap"],
  ["multi-cell drag-range намеренно НЕ включается", "recovery smartphone range boundary"],
  ["_arctor_t23_preflight", "recovery short scratch path"],
  ["Guest/Local Documents / Spreadsheets / Mind Maps", "recovery future guest/local direction"],
]) check(recovery.includes(needle), label);
for (const [needle, label] of [
  ["Table Views T2_3 Range Clipboard", "current state T2_3 checkpoint"],
  ["95bbcac37b025ac8ba6e8e16d915e764fa87adf1", "current state baseline"],
  ["T2_2_2 считается CLOSED / PASS", "current state prior production pass"],
  ["Ctrl/Cmd+C", "current state copy"],
  ["Ctrl/Cmd+V", "current state paste"],
  ["best-effort compensation rollback", "current state rollback boundary"],
  ["smartphone multi-cell drag range намеренно отключён", "current state mobile boundary"],
]) check(current.includes(needle), label);

if (failed) {
  console.error(`RESULT=FAIL checks=${n} failed=${failed}`);
  process.exit(1);
}
console.log(`RESULT=PASS checks=${n}`);

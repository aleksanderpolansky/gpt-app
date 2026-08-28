import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
let n = 0;
let failed = 0;
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8").replace(/\r\n/g, "\n"); }
function check(condition, label) {
  n += 1;
  if (condition) console.log(`PASS ${String(n).padStart(3, "0")} ${label}`);
  else { failed += 1; console.error(`FAIL ${String(n).padStart(3, "0")} ${label}`); }
}

const adapter = read("src/components/tables/arctor-tabulator.tsx");
const css = read("src/components/tables/arctor-tabulator.css");
const catalog = read("src/components/workspace/value-objects/value-object-catalog-views.tsx");
const editor = read("src/components/workspace/value-objects/value-object-table-editor.tsx");
const current = read("docs/recovery/ARCTOR_CURRENT_STATE_RU.md");
const recovery = read("docs/recovery/ARCTOR_TABLE_VIEWS_T2_2_2_MOBILE_SCROLL_HISTORY_ZOOM_V1_RU.md");
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
  ["mobileHorizontalScroll?: boolean", "mobile horizontal scroll prop"],
  ["allowNativePinchZoom?: boolean", "native pinch zoom prop"],
  ["mobileMinWidth?: number", "column mobile min width hint"],
  ["mobileWidth?: number", "column mobile width hint"],
  ["mobileFrozen?: boolean", "column mobile frozen hint"],
  ["mobileHorizontalScrollActive", "mobile scroll runtime gate"],
  ['layout: "fitData"', "mobile fitData layout"],
  ["responsiveLayout: false", "mobile responsive hiding disabled"],
  ['data-mobile-horizontal-scroll={mobileHorizontalScroll ? "true" : undefined}', "mobile scroll data flag"],
  ['data-native-pinch-zoom={allowNativePinchZoom ? "true" : undefined}', "pinch zoom data flag"],
  ['editTriggerEvent: "click"', "touch single-tap editing retained"],
]) check(adapter.includes(needle), label);
check(!adapter.includes('instance.on("cellEdited"'), "old JS inference trap absent");

for (const [needle, label] of [
  ['[data-mobile-horizontal-scroll="true"] .tabulator-tableholder', "mobile tableholder selector"],
  ["overflow-x: auto !important", "horizontal overflow enabled"],
  ["overscroll-behavior-x: contain", "horizontal overscroll contained"],
  ["-webkit-overflow-scrolling: touch", "iOS inertial scrolling"],
  ["touch-action: pan-x pan-y pinch-zoom", "native pinch zoom touch action"],
  ['[data-native-pinch-zoom="true"]', "native pinch zoom host selector"],
  ["min-width: max-content", "table preserves full mobile width"],
  ['[data-edit-mode="true"] .tabulator-row .tabulator-cell:not(.tabulator-editable)', "read-only gray selector retained"],
  ["background: #f3f4f6", "read-only gray retained"],
  ["font-size: 16px", "mobile editor avoids iOS zoom"],
]) check(css.includes(needle), label);

for (const [needle, label] of [
  ["Undo2", "Undo icon imported"],
  ["Redo2", "Redo icon imported"],
  ["type TableEditHistoryEntry", "history entry type"],
  ["tableUndoStack", "undo stack state"],
  ["tableRedoStack", "redo stack state"],
  ["tableHistoryBusy", "history busy state"],
  ["!tableEditMode || tableHistoryBusy", "cell edits blocked during history write"],
  ["tableEditMode && !tableHistoryBusy", "editable cells disabled during history write"],
  ['direction: "undo" | "redo"', "history direction typed"],
  ["async function applyTableHistory", "history write handler"],
  ["saveValueObjectTableField({", "history reuses existing write helper"],
  ["expectedCurrentValue", "history uses expected persisted current value"],
  ["setTableUndoStack((current) => current.slice(0, -1))", "undo pops undo stack"],
  ["setTableRedoStack((current) => current.slice(0, -1))", "redo pops redo stack"],
  ["setTableRedoStack([])", "new edit clears redo stack"],
  ["current.slice(-49)", "history bounded to 50 entries"],
  ['applyTableHistory("undo")', "Undo button wired"],
  ['applyTableHistory("redo")', "Redo button wired"],
  ["disabled={tableHistoryBusy || tableUndoStack.length === 0}", "Undo disabled safely"],
  ["disabled={tableHistoryBusy || tableRedoStack.length === 0}", "Redo disabled safely"],
  ["setTableUndoStack([])", "history clears when edit session toggles"],
  ["mobileHorizontalScroll", "mobile scroll forwarded"],
  ["allowNativePinchZoom", "pinch zoom forwarded"],
  ["mobileMinWidth: 210", "mobile title width"],
  ["mobileFrozen: false", "mobile title unfrozen"],
  ["mobileMinWidth: 260", "mobile description width"],
  ['editor: tableEditMode ? "arctor-expanded-input" : false', "Name editor retained"],
  ['editor: tableEditMode ? "arctor-expanded-textarea" : false', "Description editor retained"],
  ["event.restoreOldValue();", "save rollback retained"],
  ["getValueObjectTableEditStrategy(valueObject)", "history/edit safety strategy retained"],
  ["tableEditCopy.readOnlySystem", "system readonly feedback retained"],
  ["tableEditCopy.readOnlyContract", "contract readonly feedback retained"],
]) check(catalog.includes(needle), label);
check(!catalog.includes("<ValueObjectTableEditor"), "upper editor form remains removed");

for (const [needle, label] of [
  ["undo: string", "copy Undo field"],
  ["redo: string", "copy Redo field"],
  ["undone: string", "copy undone feedback"],
  ["redone: string", "copy redone feedback"],
  ['undo: "Undo"', "English Undo"],
  ['redo: "Redo"', "English Redo"],
  ['undo: "Cofnij"', "Polish Undo"],
  ['redo: "Ponów"', "Polish Redo"],
  ['undo: "Отменить"', "Russian Undo"],
  ['redo: "Повторить"', "Russian Redo"],
  ['undo: "Скасувати зміну"', "Ukrainian Undo"],
  ['redo: "Wiederholen"', "German Redo"],
  ['undo: "Deshacer"', "Spanish Undo"],
  ['undo: "Zpět"', "Czech Undo"],
  ["swipe sideways to see all columns and pinch to zoom", "English mobile navigation hint"],
  ["листайте таблицу по горизонтали", "Russian mobile navigation hint"],
  ["export async function saveValueObjectTableField", "single-field save helper retained"],
  ['valueObject.scope_code === "global"', "global fail-closed"],
  ['valueObject.origin_type_code === "system"', "system fail-closed"],
  ['return "readonly_contract"', "unsupported objects fail-closed"],
  ['editKind: "rename"', "ontology rename contract retained"],
  ['editKind: "semantic_definition"', "ontology description contract retained"],
  ['credentials: "same-origin"', "authenticated writes retained"],
  ['method: "PATCH"', "writes remain PATCH"],
]) check(editor.includes(needle), label);
check(!editor.includes('method: "POST"'), "no create behavior added");
check(!editor.includes('method: "DELETE"'), "no delete behavior added");

const helperStart = editor.indexOf("export async function saveValueObjectTableField");
const helperEnd = editor.indexOf("export function ValueObjectTableEditor", helperStart);
const helper = helperStart >= 0 && helperEnd > helperStart ? editor.slice(helperStart, helperEnd) : "";
check(helper.length > 0, "single-field helper located");
for (const forbidden of ["parentValueObjectId", "parent_value_object_id", "role", "status"]) {
  check(!helper.includes(forbidden), `single-field helper never writes ${forbidden}`);
}

check(!/userScalable\s*:\s*false/.test(layout), "Next layout does not disable user scaling");
check(!/maximumScale\s*:\s*1/.test(layout), "Next layout does not cap maximumScale at 1");
check(!/user-scalable\s*=\s*no/i.test(layout), "No user-scalable=no viewport lock");

for (const [condition, label] of [
  [recovery.includes("ef40312b861db69553199249bef6500dcd021d5e"), "recovery exact baseline"],
  [recovery.includes("touch-scroll"), "recovery mobile scroll"],
  [recovery.includes("browser-native pinch zoom"), "recovery pinch zoom"],
  [recovery.includes("Undo / Redo"), "recovery undo redo"],
  [recovery.includes("saveValueObjectTableField"), "recovery real server undo/redo"],
  [recovery.includes("50"), "recovery history limit"],
  [recovery.includes("_arctor_t222_preflight"), "recovery short scratch path"],
  [recovery.includes("controlled restructure preview/apply"), "recovery restructure boundary"],
  [recovery.includes("DB_WRITES=0") && recovery.includes("SQL_EXECUTED=0"), "recovery no release data writes"],
  [recovery.includes("Guest/Local Documents / Spreadsheets / Mind Maps"), "recovery future guest/local direction"],
  [current.includes("Table Views T2_2_2 Mobile Scroll / Undo-Redo / Pinch Zoom"), "current state T2_2_2 checkpoint"],
  [current.includes("fitData"), "current state mobile layout"],
  [current.includes("Undo/Redo"), "current state history"],
  [current.includes("pinch zoom"), "current state pinch zoom"],
]) check(condition, label);

if (failed) {
  console.error(`RESULT=FAIL checks=${n} failed=${failed}`);
  process.exit(1);
}
console.log(`RESULT=PASS checks=${n}`);

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
let n = 0;
let failed = 0;

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8").replace(/\r\n/g, "\n");
}

function check(condition, label) {
  n += 1;
  if (condition) console.log(`PASS ${String(n).padStart(3, "0")} ${label}`);
  else {
    failed += 1;
    console.error(`FAIL ${String(n).padStart(3, "0")} ${label}`);
  }
}

const adapter = read("src/components/tables/arctor-tabulator.tsx");
const css = read("src/components/tables/arctor-tabulator.css");
const catalog = read("src/components/workspace/value-objects/value-object-catalog-views.tsx");
const editor = read("src/components/workspace/value-objects/value-object-table-editor.tsx");
const current = read("docs/recovery/ARCTOR_CURRENT_STATE_RU.md");
const recovery = read("docs/recovery/ARCTOR_TABLE_VIEWS_T2_2_1_EXPANDED_CELL_EDITOR_UX_HOTFIX_V1_1_RU.md");
const pkg = JSON.parse(read("package.json"));

check(pkg.dependencies?.["tabulator-tables"] === "6.5.2", "Tabulator remains exact 6.5.2");

for (const [needle, label] of [
  ['"arctor-expanded-input"', "expanded input marker"],
  ['"arctor-expanded-textarea"', "expanded textarea marker"],
  ['createExpandedEditor("input")', "expanded input custom editor"],
  ['createExpandedEditor("textarea")', "expanded textarea custom editor"],
  ["type TabulatorEditor =", "custom editor boundary typed"],
  ["document.body.appendChild(shell)", "overlay shell renders in body"],
  ["cell.getElement().getBoundingClientRect()", "overlay anchors to source cell"],
  ["MutationObserver", "orphan overlay observer"],
  ["anchor.isConnected", "anchor connectivity guard"],
  ['editorElement.addEventListener("blur", commit)', "blur saves"],
  ['keyboardEvent.key === "Escape"', "Esc cancels"],
  ['kind === "input" && keyboardEvent.key === "Enter"', "Name Enter saves"],
  ["keyboardEvent.ctrlKey || keyboardEvent.metaKey", "Description Ctrl/Cmd+Enter saves"],
  ['window.addEventListener("resize", sizeAndPosition)', "window resize reposition"],
  ['window.addEventListener("scroll", sizeAndPosition, true)', "window scroll reposition"],
  ['window.removeEventListener("resize", sizeAndPosition)', "window resize cleanup"],
  ['window.removeEventListener("scroll", sizeAndPosition, true)', "window scroll cleanup"],
  ['cellEditedEmitter.on("cellEdited"', "typed cellEdited bridge retained"],
  ["cell.restoreOldValue()", "cell rollback retained"],
  ["onCellEdited?:", "save event prop retained"],
  ["editMode?: boolean", "edit mode prop retained"],
  ["adaptiveTouchEditing?: boolean", "adaptive touch prop exists"],
  ['data-edit-mode={editMode ? "true" : undefined}', "edit mode exposed to CSS"],
]) check(adapter.includes(needle), label);
check(!adapter.includes('instance.on("cellEdited"'), "old JS inference trap absent");

for (const [needle, label] of [
  ["function isCompactTouchEnvironment()", "compact touch detector"],
  ['window.matchMedia?.("(pointer: coarse)").matches', "coarse pointer detection"],
  ["window.innerWidth <= 768", "narrow viewport detection"],
  ["window.visualViewport", "VisualViewport support"],
  ["visualViewport?.offsetLeft", "VisualViewport horizontal offset"],
  ["visualViewport?.offsetTop", "VisualViewport vertical offset"],
  ["visualViewport?.width", "VisualViewport width"],
  ["visualViewport?.height", "VisualViewport height"],
  ['visualViewport.addEventListener("resize", sizeAndPosition)', "keyboard resize listener"],
  ['visualViewport.addEventListener("scroll", sizeAndPosition)', "VisualViewport scroll listener"],
  ['visualViewport.removeEventListener("resize", sizeAndPosition)', "VisualViewport resize cleanup"],
  ['visualViewport.removeEventListener("scroll", sizeAndPosition)', "VisualViewport scroll cleanup"],
  ['shell.dataset.mobile = compactTouch ? "true" : "false"', "mobile shell state"],
  ["mobileActions.hidden = !compactTouch", "mobile actions only on compact touch"],
  ['editorElement.style.height = "48px"', "mobile Name touch height"],
  ["viewportHeight * 0.34", "mobile Description minimum viewport proportion"],
  ["viewportHeight * 0.55", "mobile Description maximum viewport proportion"],
  ['cancelButton.textContent', "mobile cancel label"],
  ['saveButton.textContent', "mobile save label"],
  ['button.addEventListener("pointerdown"', "buttons protect editor focus"],
  ['cancelButton.addEventListener("click"', "mobile cancel action"],
  ['saveButton.addEventListener("click"', "mobile save action"],
  ['editorElement.enterKeyHint = "done"', "mobile Name keyboard hint"],
  ['editorElement.enterKeyHint = "enter"', "mobile Description keyboard hint"],
  ["compactTouchEditing", "touch-specific column resolution"],
  ["minWidth: 180, responsive: 0", "editable mobile columns stay available"],
  ['editTriggerEvent: "click"', "touch edit uses single tap"],
]) check(adapter.includes(needle), label);

for (const [needle, label] of [
  ['[data-edit-mode="true"] .tabulator-row .tabulator-cell:not(.tabulator-editable)', "read-only cell selector"],
  ["background: #f3f4f6", "read-only gray surface"],
  ["color: #8a90a3", "read-only muted text"],
  [".tabulator-cell.tabulator-editable", "editable cell styling"],
  ["cursor: text", "editable cursor"],
  ["box-shadow: inset 0 0 0 1px #c9d5ff", "editable hover frame"],
  [".arctor-expanded-cell-editor-shell", "expanded shell CSS"],
  ["position: fixed", "expanded shell fixed"],
  ["z-index: 2147483000", "expanded shell above rails"],
  ['[data-mobile="true"]', "mobile shell CSS"],
  ["font-size: 16px", "mobile controls prevent iOS zoom"],
  ["resize: none", "mobile textarea avoids resize handle"],
  ["min-height: 44px", "mobile action touch target"],
  ["touch-action: manipulation", "mobile action touch optimization"],
]) check(css.includes(needle), label);

for (const [needle, label] of [
  ['editor: tableEditMode ? "arctor-expanded-input" : false', "Name expanded editor"],
  ['editor: tableEditMode ? "arctor-expanded-textarea" : false', "Description expanded editor"],
  ["expandedMinWidth: 420", "desktop Name min width"],
  ["expandedMaxWidth: 620", "desktop Name max width"],
  ["expandedMinWidth: 620", "desktop Description min width"],
  ["expandedMaxWidth: 760", "desktop Description max width"],
  ["expandedMinHeight: 120", "desktop Description min height"],
  ["expandedMaxHeight: 240", "desktop Description max auto height"],
  ['elementAttributes: { maxlength: "180" }', "Name max length"],
  ['elementAttributes: { maxlength: "4000" }', "Description max length"],
  ["saveLabel: tableEditCopy.save", "localized mobile save label forwarded"],
  ["cancelLabel: tableEditCopy.cancel", "localized mobile cancel label forwarded"],
  ["editable: canEditValueObjectTableCells(valueObject)", "row editability from write contract"],
  ["editMode={tableEditMode}", "visual edit mode forwarded"],
  ["adaptiveTouchEditing={tableEditMode}", "touch adaptation forwarded"],
  ['editTriggerEvent: "dblclick"', "desktop double-click default retained"],
  ["async function handleTableCellEdited", "async save handler retained"],
  ["event.restoreOldValue();", "failed/no-op rollback retained"],
  ["onValueObjectUpdated?.(patch)", "confirmed patch updates React state"],
  ["tableEditCopy.saved", "Saved feedback retained"],
  ["tableEditCopy.readOnlySystem", "system read-only feedback retained"],
  ["tableEditCopy.readOnlyContract", "contract read-only feedback retained"],
  ["dataTree: true", "Data Tree retained"],
  ['dataTreeChildField: "_children"', "Data Tree child contract retained"],
]) check(catalog.includes(needle), label);
check(!catalog.includes("<ValueObjectTableEditor"), "upper T2_1 editor form remains removed");

for (const [needle, label] of [
  ["export function canEditValueObjectTableCells", "editability gate retained"],
  ["export async function saveValueObjectTableField", "single-field save helper retained"],
  ['valueObject.scope_code === "global"', "global fail-closed"],
  ['valueObject.origin_type_code === "system"', "system-origin fail-closed"],
  ['return "readonly_contract"', "unsupported objects fail-closed"],
  ['editKind: "rename"', "ontology rename contract retained"],
  ['editKind: "semantic_definition"', "ontology description contract retained"],
  ["idempotencyKey:", "ontology idempotency retained"],
  ['credentials: "same-origin"', "authenticated same-origin writes"],
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

for (const token of [
  "On a phone, tap a Name or Description cell once",
  "Na telefonie stuknij komórkę Nazwa lub Opis jeden raz",
  "На смартфоне один раз нажмите ячейку",
  "На смартфоні один раз натисніть клітинку",
  "Auf dem Smartphone tippen Sie einmal",
  "En el teléfono, toque una vez",
  "Na telefonu klepněte na buňku",
]) check(editor.includes(token), `mobile edit hint localized: ${token}`);
for (const token of [
  "Gray cells are read-only",
  "Szare komórki są tylko do odczytu",
  "Серые ячейки доступны только для чтения",
  "Сірі клітинки доступні лише для читання",
  "Graue Zellen sind schreibgeschützt",
  "Las celdas grises son de solo lectura",
  "Šedé buňky jsou pouze pro čtení",
]) check(editor.includes(token), `read-only hint localized: ${token}`);

for (const [condition, label] of [
  [recovery.includes("Filename too long"), "recovery records V1 path-length failure"],
  [recovery.includes("ROLLBACK=NOT_NEEDED_PREMUTATION"), "recovery records no source mutation"],
  [recovery.includes("_arctor_t221_preflight"), "recovery records short scratch path"],
  [recovery.includes("core.longpaths=true"), "recovery records command-local longpaths"],
  [recovery.includes("window.visualViewport"), "recovery records mobile keyboard strategy"],
  [recovery.includes("single tap"), "recovery records touch trigger"],
  [recovery.includes("44px"), "recovery records touch targets"],
  [recovery.includes("`.tabulator-editable`"), "recovery records visual gate source"],
  [recovery.includes("scope_code=global") && recovery.includes("origin_type_code=system"), "recovery records fail-closed rules"],
  [recovery.includes("controlled restructure preview/apply"), "recovery preserves restructure boundary"],
  [recovery.includes("DB_WRITES=0") && recovery.includes("SQL_EXECUTED=0"), "recovery records no release DB/SQL writes"],
  [recovery.includes("Guest/Local Documents / Spreadsheets / Mind Maps"), "recovery preserves guest/local direction"],
  [current.includes("ARCTOR_TABLE_VIEWS_T2_2_1_EXPANDED_CELL_EDITOR_UX_HOTFIX_V1_1"), "current state includes V1_1 checkpoint"],
  [current.includes("Filename too long"), "current state records V1 pre-mutation failure"],
  [current.includes("single-tap"), "current state records smartphone trigger"],
  [current.includes("gray/read-only"), "current state records gray read-only UX"],
]) check(condition, label);

if (failed) {
  console.error(`RESULT=FAIL checks=${n} failed=${failed}`);
  process.exit(1);
}
console.log(`RESULT=PASS checks=${n}`);

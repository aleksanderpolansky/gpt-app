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
  else { failed += 1; console.error(`FAIL ${String(n).padStart(3, "0")} ${label}`); }
}

const adapter = read("src/components/tables/arctor-tabulator.tsx");
const catalog = read("src/components/workspace/value-objects/value-object-catalog-views.tsx");
const editor = read("src/components/workspace/value-objects/value-object-table-editor.tsx");
const list = read("src/components/workspace/value-objects/actual-value-objects-list.tsx");
const current = read("docs/recovery/ARCTOR_CURRENT_STATE_RU.md");
const recovery = read("docs/recovery/ARCTOR_TABLE_VIEWS_T2_2_INLINE_CELL_EDITING_V1_1_RU.md");
const pkg = JSON.parse(read("package.json"));

check(pkg.dependencies?.["tabulator-tables"] === "6.5.2", "Tabulator remains exact 6.5.2");

check(adapter.includes("export type ArctorTableCellEditedEvent"), "adapter exposes typed cell-edited event");
check(adapter.includes('editor?: boolean | false | "input" | "textarea"'), "adapter supports built-in editors");
check(adapter.includes("editable?: boolean | ((cell:"), "adapter supports per-cell editable gate");
check(adapter.includes("editorParams?: Record<string, unknown>"), "adapter supports editor params");
check(adapter.includes("onCellEdited?:"), "adapter exposes onCellEdited prop");
check(adapter.includes("type TabulatorCellEditedEmitter"), "adapter defines narrow typed cellEdited emitter bridge");
check(adapter.includes('cellEditedEmitter.on("cellEdited"'), "adapter subscribes to Tabulator cellEdited through typed bridge");
check(adapter.includes("instance as unknown as TabulatorCellEditedEmitter"), "adapter isolates JS inference mismatch to cellEdited bridge");
check(!adapter.includes('instance.on("cellEdited"'), "adapter no longer relies on rowClick-inferred instance.on for cellEdited");
check(adapter.includes("cell.getOldValue()"), "adapter captures old value");
check(adapter.includes("cell.restoreOldValue()"), "adapter exposes Tabulator rollback");
check(adapter.includes("Promise.resolve(callback(editEvent)).catch"), "adapter has rejected-callback rollback fallback");
check(adapter.includes("isInteractiveTarget"), "row navigation interaction guard remains");
check(adapter.includes(".tabulator-data-tree-control"), "data-tree control remains interactive target");

check(catalog.includes("canEditValueObjectTableCells"), "catalog imports editability contract");
check(catalog.includes("getValueObjectTableEditStrategy"), "catalog imports read-only strategy");
check(catalog.includes("saveValueObjectTableField"), "catalog imports single-field save helper");
check(catalog.includes("type ArctorTableCellEditedEvent"), "catalog imports typed cell event");
check(catalog.includes("editable: canEditValueObjectTableCells(valueObject)"), "row carries server-contract editability");
check(catalog.includes('editor: tableEditMode ? "input" : false'), "Name uses Tabulator input editor only in edit mode");
check(catalog.includes('editor: tableEditMode ? "textarea" : false'), "Description uses Tabulator textarea editor only in edit mode");
check(catalog.includes('elementAttributes: { maxlength: "180" }'), "Name editor maxlength is 180");
check(catalog.includes('elementAttributes: { maxlength: "4000" }'), "Description editor maxlength is 4000");
check(catalog.includes('editTriggerEvent: "dblclick"'), "intentional double-click edit trigger configured");
check(catalog.includes("async function handleTableCellEdited"), "catalog has async inline save handler");
check(catalog.includes("event.restoreOldValue();"), "catalog rolls back local cell on rejected/no-op edits");
check(catalog.includes("onValueObjectUpdated?.(patch)"), "confirmed write updates canonical React state");
check(catalog.includes('kind: "saving"'), "Saving feedback state exists");
check(catalog.includes('kind: "success"'), "Saved feedback state exists");
check(catalog.includes('kind: "error"'), "Error feedback state exists");
check(catalog.includes("tableEditCopy.saved"), "localized Saved feedback rendered");
check(catalog.includes("tableEditCopy.readOnlySystem"), "system/global read-only reason surfaced");
check(catalog.includes("tableEditCopy.readOnlyContract"), "unsupported contract read-only reason surfaced");
check(catalog.includes("onCellEdited={handleTableCellEdited}"), "Tabulator cell event wired to save handler");
check(!catalog.includes("<ValueObjectTableEditor"), "upper T2_1 edit form is no longer rendered");
check(!catalog.includes("selectedTableEditId"), "row-selection form state removed from catalog");
check(catalog.includes("window.location.assign"), "normal row navigation remains outside edit mode");
check(catalog.includes("dataTree: true"), "Observation Object table remains Data Tree");
check(catalog.includes('dataTreeChildField: "_children"'), "Data Tree child contract remains");
check(catalog.includes('viewMode === "tree"'), "Tree view remains");
check(catalog.includes('viewMode === "cards"'), "Cards view remains");
check(catalog.includes('viewMode === "map"'), "Map view remains");

check(editor.includes("export function getValueObjectTableEditStrategy"), "edit strategy is reusable");
check(editor.includes("export function canEditValueObjectTableCells"), "editability gate is reusable");
check(editor.includes("export async function saveValueObjectTableField"), "single-field save helper exists");
check(editor.includes('valueObject.scope_code === "global"'), "global objects fail closed");
check(editor.includes('valueObject.origin_type_code === "system"'), "system-origin objects fail closed");
check(editor.includes('valueObject.status === "draft"'), "draft strategy remains explicit");
check(editor.includes("valueObject.canonical_key && valueObject.ontology_node_role_code"), "ontology strategy remains explicit");
check(editor.includes('return "readonly_contract"'), "unsupported active objects fail closed");
check(editor.includes("if (!nextTitle)"), "empty title blocked");
check(editor.includes("nextTitle.length > 180"), "title max enforced in save helper");
check(editor.includes("nextDescriptionText.length > 4000"), "description max enforced in save helper");
check(editor.includes("nextDescriptionText || null"), "empty description normalizes to null");
check(editor.includes('editKind: "rename"'), "ontology title uses rename");
check(editor.includes('editKind: "semantic_definition"'), "ontology description uses semantic_definition");
check(editor.includes("idempotencyKey:"), "ontology writes keep idempotency key");
check(editor.includes('credentials: "same-origin"'), "writes remain authenticated same-origin");
check(editor.includes('method: "PATCH"'), "writes remain PATCH only");
check(!editor.includes('method: "POST"'), "inline editor does not create objects");
check(!editor.includes('method: "DELETE"'), "inline editor does not delete objects");

const helperStart = editor.indexOf("export async function saveValueObjectTableField");
const helperEnd = editor.indexOf("export function ValueObjectTableEditor", helperStart);
const helper = helperStart >= 0 && helperEnd > helperStart ? editor.slice(helperStart, helperEnd) : "";
check(helper.length > 0, "single-field helper section located");
check(!helper.includes("parentValueObjectId"), "single-field helper never sends parentValueObjectId");
check(!helper.includes("parent_value_object_id"), "single-field helper never writes parent_value_object_id");
check(!helper.includes("role"), "single-field helper never writes role");
check(!helper.includes("status"), "single-field helper never writes status");

for (const token of [
  "Double-click a Name or Description cell",
  "Kliknij dwukrotnie komórkę Nazwa lub Opis",
  "Дважды нажмите ячейку",
  "Двічі натисніть клітинку",
  "Doppelklicken Sie auf eine Zelle",
  "Haga doble clic en una celda",
  "Dvakrát klikněte na buňku",
]) check(editor.includes(token), `inline help localization present: ${token}`);

check(list.includes("onValueObjectUpdated={(updatedValueObject) =>"), "existing parent state update callback remains");
check(list.includes("valueObject.id === updatedValueObject.id"), "parent updates only matching object");
check(list.includes("{ ...valueObject, ...updatedValueObject }"), "parent merges confirmed patch");
check(list.includes("onValueObjectDeleted"), "delete callback remains");
check(list.includes("onValueObjectReparented"), "reparent callback remains");
check(list.includes("onValueObjectCreated"), "create callback remains");

check(recovery.includes("3ce5f149818dac7cc0d30351d1f32746defbf5ee"), "recovery records exact T2_1 baseline");
check(recovery.toLowerCase().includes("production runtime persistence"), "recovery records T2_1 runtime persistence evidence");
check(recovery.includes("double-click"), "recovery records inline editing trigger");
check(recovery.includes("restoreOldValue()"), "recovery records client rollback semantics");
check(recovery.includes("scope_code=global") && recovery.includes("origin_type_code=system"), "recovery records fail-closed system rules");
check(recovery.includes("ontology-definition"), "recovery records ontology contract reuse");
check(recovery.includes("status=draft") && recovery.includes("PATCH /api/value-objects/[id]"), "recovery records draft contract reuse");
check(recovery.includes("controlled restructure preview/apply"), "recovery preserves structural parent rule");
check(recovery.includes("Activity Journal") && recovery.includes("Facts"), "recovery records other domain tables remain read-only");
check(recovery.includes("SQL") && recovery.includes("schema"), "recovery records no schema work");
check(recovery.includes("Guest/Local") || recovery.includes("Guest / Local"), "recovery preserves guest/local editor direction");
check(recovery.includes("TS2345") && recovery.includes("TS2339"), "recovery records V1 full TypeScript failure class");
check(recovery.includes("ROLLBACK=PASS"), "recovery records V1 clean rollback");
check(recovery.includes("TabulatorCellEditedEmitter"), "recovery records V1_1 typed event bridge fix");
check(current.includes("ARCTOR_TABLE_VIEWS_T2_2_INLINE_CELL_EDITING_V1_1"), "current-state includes T2_2 V1_1 checkpoint");
check(current.includes("3ce5f149818dac7cc0d30351d1f32746defbf5ee"), "current-state records exact T2_2 baseline");
check(current.includes("Guest/Local Documents / Spreadsheets / Mind Maps"), "current-state preserves future guest/local direction");

if (failed) {
  console.error(`RESULT=FAIL checks=${n} failed=${failed}`);
  process.exit(1);
}
console.log(`RESULT=PASS checks=${n}`);

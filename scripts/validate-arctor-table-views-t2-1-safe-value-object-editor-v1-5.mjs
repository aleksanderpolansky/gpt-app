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
  if (condition) {
    console.log(`PASS ${String(n).padStart(3, "0")} ${label}`);
  } else {
    failed += 1;
    console.error(`FAIL ${String(n).padStart(3, "0")} ${label}`);
  }
}

const catalog = read("src/components/workspace/value-objects/value-object-catalog-views.tsx");
const list = read("src/components/workspace/value-objects/actual-value-objects-list.tsx");
const editor = read("src/components/workspace/value-objects/value-object-table-editor.tsx");
const current = read("docs/recovery/ARCTOR_CURRENT_STATE_RU.md");
const recovery = read("docs/recovery/ARCTOR_TABLE_VIEWS_T2_1_SAFE_VALUE_OBJECT_EDITOR_V1_5_RU.md");
const pkg = JSON.parse(read("package.json"));

check(pkg.dependencies?.["tabulator-tables"] === "6.5.2", "Tabulator dependency remains exact 6.5.2");
check(catalog.includes('from "./value-object-table-editor"'), "catalog imports safe table editor");
check(catalog.includes("type ValueObjectTableEditPatch"), "catalog imports typed edit patch");
check(catalog.includes("canonical_key?: string | null;"), "catalog carries canonical key for edit strategy");
check(catalog.includes("onValueObjectUpdated?:"), "catalog exposes update callback");
check(catalog.includes("tableEditMode"), "catalog has explicit table edit mode");
check(catalog.includes("selectedTableEditId"), "catalog tracks selected table edit row");
check(catalog.includes("getValueObjectTableEditorCopy(locale)"), "catalog localizes edit-mode toggle");
check(catalog.includes("<ValueObjectTableEditor"), "catalog renders safe row editor");
check(catalog.includes("valueObject={selectedTableEditObject}"), "editor receives selected object");
check(catalog.includes('key={selectedTableEditObject?.id ?? "no-selection"}'), "editor remounts when selected row changes");
check(catalog.includes("onSaved={(patch) =>"), "catalog handles editor save callback");
check(catalog.includes("onValueObjectUpdated?.(patch)"), "catalog forwards successful patch to parent state");
check(catalog.includes("if (tableEditMode)"), "row click branches on edit mode");
check(catalog.includes("setSelectedTableEditId(row.id)"), "edit-mode row click selects row");
check(catalog.includes("window.location.assign"), "normal table row navigation remains intact");
check(catalog.includes("tableEditCopy.enableMode"), "enable edit-mode label rendered");
check(catalog.includes("tableEditCopy.disableMode"), "disable edit-mode label rendered");
check(catalog.includes("dataTree: true"), "value-object table remains Data Tree");
check(catalog.includes('dataTreeChildField: "_children"'), "value-object table retains _children contract");
check(catalog.includes('viewMode === "map"'), "Map view remains intact");
check(catalog.includes('viewMode === "cards"'), "Cards view remains intact");
check(catalog.includes('viewMode === "tree"'), "Tree view remains intact");

check(list.includes("onValueObjectUpdated={(updatedValueObject) =>"), "list wires update callback");
check(list.includes("valueObject.id === updatedValueObject.id"), "list updates only matching object");
check(list.includes("{ ...valueObject, ...updatedValueObject }"), "list merges successful title/description patch");
check(list.includes("onValueObjectDeleted"), "existing delete callback remains");
check(list.includes("onValueObjectReparented"), "existing reparent callback remains");
check(list.includes("onValueObjectCreated"), "existing create callback remains");

check(editor.includes('type EditStrategy = "ontology" | "draft" | "readonly_system" | "readonly_contract"'), "editor strategy is explicit and closed");
check(!editor.includes("useEffect"), "editor does not synchronize local drafts with setState inside useEffect");
check(editor.includes('() => valueObject?.title?.trim() ?? ""'), "title draft initializes from selected object without effect");
check(editor.includes('() => valueObject?.description ?? ""'), "description draft initializes from selected object without effect");
check(editor.includes("const selectedValueObject = valueObject;"), "editor captures narrowed selected object for async closure safety");
check(editor.includes("valueObjectId: selectedValueObject.id"), "async writes use narrowed selected object id");
check(!editor.includes("onSaved({ id: valueObject.id"), "onSaved paths do not use nullable prop id");
check(editor.includes('valueObject.scope_code === "global"'), "global objects are read-only");
check(editor.includes('valueObject.origin_type_code === "system"'), "system-origin objects are read-only");
check(editor.includes("valueObject.canonical_key && valueObject.ontology_node_role_code"), "ontology objects use ontology strategy");
check(editor.includes('valueObject.status === "draft"'), "draft objects use draft strategy");
check(editor.includes('return "readonly_contract"'), "unsupported active objects fail closed");
check(editor.includes("/ontology-definition"), "ontology edits use existing ontology-definition endpoint");
check(editor.includes('editKind: "rename"'), "title save uses rename edit kind");
check(editor.includes('editKind: "semantic_definition"'), "description save uses semantic-definition edit kind");
check(editor.includes("idempotencyKey:"), "ontology edits carry idempotency key");
check(editor.includes("makeIdempotencyKey"), "idempotency key helper exists");
check(editor.includes('method: "PATCH"'), "editor uses PATCH only");
check(!editor.includes('method: "DELETE"'), "editor never deletes objects");
check(!editor.includes('method: "POST"'), "editor does not create objects");
check(editor.includes("requestDraftEdit"), "draft edits use existing draft PATCH contract");
check(editor.includes("body.title = args.title"), "draft body may contain title");
check(editor.includes("body.description = args.description"), "draft body may contain description");
check(!editor.includes("parentValueObjectId"), "editor never sends parentValueObjectId");
check(!editor.includes("parent_value_object_id:"), "editor never writes parent_value_object_id");
check(editor.includes("/restructure"), "structural parent changes link to controlled restructure flow");
check(editor.includes("structuralHint"), "structural safety hint is visible");
check(editor.includes("maxLength={180}"), "title editor enforces ontology-safe max length");
check(editor.includes("maxLength={4000}"), "description editor enforces contract max length");
check(editor.includes("if (!nextTitle)"), "empty title is blocked client-side");
check(editor.includes("if (!titleChanged && !descriptionChanged)"), "no-op save is blocked");
check(editor.includes("onSaved({ id: selectedValueObject.id, title: nextTitle })"), "successful ontology rename updates client state immediately");
check(editor.includes("onSaved({ id: selectedValueObject.id, description: nextDescription })"), "successful ontology definition update updates client state immediately");
check(editor.includes("response.ok"), "HTTP failure is checked");
check(editor.includes("payload.ok === false"), "application-level failure is checked");
check(editor.includes("credentials: \"same-origin\""), "editor keeps authenticated same-origin requests");

for (const token of [
  "Edit table", "Edytuj tabelę", "Редактировать таблицу", "Редагувати таблицю",
  "Tabelle bearbeiten", "Editar tabla", "Upravit tabulku",
]) {
  check(editor.includes(token), `edit-mode locale present: ${token}`);
}

check(recovery.includes("3e664a4aa45c88f698c0b8c63cad2b8f8b0c6869"), "recovery records exact T1 baseline");
check(recovery.includes("T2_1"), "recovery identifies T2_1");
check(recovery.includes("title / description"), "recovery records editable fields");
check(recovery.includes("scope_code=global") && recovery.includes("origin_type_code=system") && recovery.includes("read-only"), "recovery records global/system read-only rule semantically");
check(recovery.includes("ontology-definition"), "recovery records ontology endpoint reuse");
check(recovery.includes("draft PATCH"), "recovery records draft PATCH reuse");
check(recovery.includes("preview/apply"), "recovery records structural preview/apply rule");
check(recovery.includes("Activity Journal") && recovery.includes("Facts"), "recovery records Journal/Facts still read-only");
check(recovery.includes("SQL: 0"), "recovery records no SQL");
check(recovery.includes("schema migration: 0"), "recovery records no schema migration");
check(current.includes("ARCTOR_TABLE_VIEWS_T2_1_SAFE_VALUE_OBJECT_EDITOR_V1_5"), "current-state history updated");
check(current.includes("3e664a4aa45c88f698c0b8c63cad2b8f8b0c6869"), "current-state records T2_1 baseline");
check(recovery.includes("ROLLBACK=PASS"), "recovery records failed V1 rollback evidence");
check(recovery.includes("cmd.exe /d /s /c"), "recovery records Windows npm transport fix");
check(recovery.includes("MODULE_NOT_FOUND"), "recovery records V1_1 packaging failure");
check(recovery.includes("v1-1-1.mjs"), "recovery records exact bad V1_1 validator path");
check(recovery.includes("package-path audit"), "recovery records package path audit");
check(recovery.includes("V1_2") && recovery.includes("Единственный FAIL release validator был ложным") && recovery.includes("ROLLBACK=PASS"), "recovery records V1_2 validator false-negative and rollback");
check(recovery.includes("V1_3") && recovery.includes("react-hooks/set-state-in-effect") && recovery.includes("ROLLBACK=PASS"), "recovery records V1_3 ESLint failure and rollback");
check(recovery.includes("V1_4") && recovery.includes("TS18047") && recovery.includes("PREMUTATION_EDITOR_SEMANTIC_TYPESCRIPT") && recovery.includes("ROLLBACK=PASS"), "recovery records V1_4 TypeScript failure and semantic preflight fix");
check(recovery.includes("Guest / Local mode"), "recovery records future guest/local editor direction");
check(current.includes("Guest/Local mode"), "current-state records future guest/local editor principle");

if (failed > 0) {
  console.error(`RESULT=FAIL checks=${n} failed=${failed}`);
  process.exit(1);
}

console.log(`RESULT=PASS checks=${n}`);

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
let checks = 0;

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function pass(label) {
  checks += 1;
  console.log(`PASS ${String(checks).padStart(3, "0")} ${label}`);
}

function assert(condition, label) {
  if (!condition) {
    console.error(`FAIL ${label}`);
    process.exit(1);
  }
  pass(label);
}

function includes(text, needle, label) {
  assert(text.includes(needle), label);
}

function excludes(text, needle, label) {
  assert(!text.includes(needle), label);
}

function count(text, needle) {
  return text.split(needle).length - 1;
}

function blockBetween(text, start, end) {
  const startIndex = text.indexOf(start);
  const endIndex = text.indexOf(end, startIndex + start.length);
  assert(startIndex >= 0 && endIndex > startIndex, `block ${start} ... ${end} exists`);
  return text.slice(startIndex, endIndex);
}

const packageJson = JSON.parse(read("package.json"));
const packageLock = read("package-lock.json");
const adapter = read("src/components/tables/arctor-tabulator.tsx");
const css = read("src/components/tables/arctor-tabulator.css");
const vo = read("src/components/workspace/value-objects/value-object-catalog-views.tsx");
const journal = read("src/app/activity-today/page.tsx");
const facts = read("src/app/activity-facts/page.tsx");
const recovery = read("docs/recovery/ARCTOR_TABLE_VIEWS_T1_3_READABILITY_HOTFIX_V1_RU.md");
const currentState = read("docs/recovery/ARCTOR_CURRENT_STATE_RU.md");

assert(packageJson.dependencies?.["tabulator-tables"] === "6.5.2", "Tabulator dependency remains exact 6.5.2");
includes(packageLock, '"node_modules/tabulator-tables"', "package-lock still contains Tabulator");
includes(packageLock, '"version": "6.5.2"', "package-lock still pins Tabulator 6.5.2");
includes(adapter, 'layout: "fitColumns"', "shared adapter remains fitColumns");
includes(adapter, 'responsiveLayout: "hide"', "shared adapter remains responsive hide");
includes(adapter, "resizableColumnFit: true", "shared adapter preserves paired resize");
includes(adapter, "tooltip?: boolean | string;", "shared adapter supports cell tooltips");
includes(adapter, "rowHeight: 32", "shared adapter remains compact 32px");
includes(css, "ARCTOR_TABLE_VIEWS_T1_2_LAYOUT_UX_HOTFIX_V1", "T1_2 width/ellipsis CSS remains active");
includes(css, "text-overflow: ellipsis;", "ellipsis protection remains active");

includes(journal, "function getBasicAnalysisStatusShortText", "Journal adds short analysis formatter");
for (const label of ["Ready", "Running", "Retry", "Готов", "Выполняется", "Повторить", "Gotowa", "Trwa", "Powtórz"]) {
  includes(journal, `"${label}"`, `Journal short analysis label ${label} present`);
}
includes(journal, "function getJournalTableStatusText", "Journal adds user-facing table status formatter");
for (const label of ["Completed", "Planned", "Deleted", "Archived", "Active", "Updated", "Restored", "Выполнено", "Запланировано", "Удалено"]) {
  includes(journal, `"${label}"`, `Journal status label ${label} present`);
}
includes(journal, "getBasicAnalysisStatusShortText(", "Journal table rows use short analysis formatter");
includes(journal, "status: getJournalTableStatusText(item, locale)", "Journal table rows use short status formatter");
const journalColumns = blockBetween(journal, "const journalTableColumns = useMemo", "// ARCTOR_ACTIVITY_TODAY_LINT_SAFE_AUTO_OPEN_EFFECT_V1");
for (const field of ["when", "activity", "eventTime", "duration", "analysis", "status", "source"]) {
  includes(journalColumns, `field: "${field}"`, `Journal table keeps ${field} field`);
}
excludes(journalColumns, 'field: "actor"', "Journal main table still omits repetitive actor field");
const sourceIndex = journalColumns.indexOf('field: "source"');
assert(sourceIndex >= 0, "Journal Source field exists in column model");
const sourceSlice = journalColumns.slice(sourceIndex, sourceIndex + 220);
includes(sourceSlice, "visible: false", "Journal Source is hidden from main table surface");
assert(count(journalColumns, "tooltip: true") >= 6, "Journal visible text columns expose full-value tooltips");
includes(journalColumns, "minWidth: 250", "Journal Activity receives wider minimum width");
includes(journalColumns, "widthGrow: 5", "Journal Activity gets primary width growth");
includes(journal, "onRowClick={(row) => openItem(row.item)}", "Journal row click still opens existing detail");
includes(journal, "cancelItem(item)", "Journal delete action remains intact");
includes(journal, "restoreItem(item)", "Journal restore action remains intact");

assert(count(facts, "unlinkedValueObject: string;") === 1, "Facts copy contract adds unlinkedValueObject once");
for (const [locale, label] of [
  ["en", "Not linked to an observation object"],
  ["pl", "Niepowiązany z obiektem obserwacji"],
  ["ru", "Не привязан к объекту наблюдения"],
  ["uk", "Не прив’язаний до об’єкта спостереження"],
  ["de", "Nicht mit einem Beobachtungsobjekt verknüpft"],
  ["es", "No vinculado a un objeto de observación"],
  ["cs", "Není propojeno s objektem pozorování"],
]) {
  includes(facts, `unlinkedValueObject: "${label}"`, `Facts ${locale} unlinked marker present`);
}
assert(count(facts, "unlinkedValueObject:") === 8, "Facts unlinked marker appears once in type + seven locales");
includes(facts, "const FACT_DISPLAY_CODES: Record<Locale, FactDisplayCodeCopy>", "Facts adds locale display-code dictionary");
for (const code of ["duration", "count", "context_tag", "user_edit", "ai_extraction", "manual_form", "system_event", "activity_capture"]) {
  includes(facts, `${code}:`, `Facts known display code ${code} mapped`);
}
includes(facts, "function localizeFactCode", "Facts uses dedicated display-only code localization helper");
includes(facts, "return FACT_DISPLAY_CODES[locale][kind][value] ?? value;", "Unknown Facts codes remain unchanged instead of guessed");
includes(facts, "function formatFactValueObjectLabel", "Facts has explicit effective-link/fallback formatter");
includes(facts, "linkedTitles.length > 0", "Facts prefers actual linked titles");
includes(facts, "return linkedTitles.join(\"; \")", "Facts returns hydrated effective titles when available");
includes(facts, "`${fact.semanticObjectKey} · ${copy.unlinkedValueObject}`", "Facts semantic-key fallback is explicitly marked unlinked");
includes(facts, "· {copy.unlinkedValueObject}", "Facts Cards view also marks semantic fallback unlinked");
includes(facts, 'type: localizeFactCode(locale, "measureTypes", fact.measureType)', "Facts table localizes measure type only on display layer");
includes(facts, 'unit: localizeFactCode(locale, "units", fact.unit)', "Facts table localizes unit only on display layer");
includes(facts, 'source: localizeFactCode(locale, "sources", fact.sourceType)', "Facts table localizes source only on display layer");
includes(facts, "valueObject: formatFactValueObjectLabel(fact, copy)", "Facts table uses honest linked/fallback label");
const factColumns = blockBetween(facts, "const factTableColumns = useMemo", "const loadFacts = useCallback");
for (const field of ["date", "activity", "valueObject", "type", "value", "unit", "status", "source", "confidence"]) {
  includes(factColumns, `field: "${field}"`, `Facts table keeps ${field} column`);
}
assert(count(factColumns, "tooltip: true") >= 9, "Facts table exposes tooltip on all display columns");
includes(factColumns, "minWidth: 220", "Facts Value Object column gets readability width");
includes(factColumns, "width: 98", "Facts Confidence header gets enough width");
includes(facts, "<ActivityFactTaggingPanel", "Facts tagging panel remains intact");
includes(facts, "<FactGroup", "Facts Cards/grouped view remains intact");
includes(facts, '<details className="mt-4 rounded-2xl', "Facts technical filters remain collapsible");

const voColumns = blockBetween(vo, "const tableColumns = useMemo", "const tableOptions = useMemo");
for (const field of ["title", "description", "parent", "role", "directChildren", "descendants", "descendantLeaves", "status"]) {
  includes(voColumns, `field: "${field}"`, `VO table keeps ${field} data field`);
}
const parentIndex = voColumns.indexOf('field: "parent"');
assert(parentIndex >= 0, "VO Parent field remains in row/column model");
const parentSlice = voColumns.slice(parentIndex, parentIndex + 220);
includes(parentSlice, "visible: false", "VO Parent hidden from primary tree table surface");
const titleIndex = voColumns.indexOf('field: "title"');
const titleSlice = voColumns.slice(titleIndex, titleIndex + 260);
includes(titleSlice, "minWidth: 340", "VO Object gets wider minimum width");
includes(titleSlice, "widthGrow: 5", "VO Object gets primary width growth");
const directIndex = voColumns.indexOf('field: "directChildren"');
includes(voColumns.slice(directIndex, directIndex + 220), "width: 108", "VO Direct children header gets wider column");
const descendantsIndex = voColumns.indexOf('field: "descendants"');
includes(voColumns.slice(descendantsIndex, descendantsIndex + 220), "width: 122", "VO Descendants header gets wider column");
const leavesIndex = voColumns.indexOf('field: "descendantLeaves"');
includes(voColumns.slice(leavesIndex, leavesIndex + 220), "width: 92", "VO Leaves header gets wider column");
assert(count(voColumns, "tooltip: true") >= 8, "VO table exposes full-value tooltips");
includes(vo, "dataTree: true", "VO Table View remains Data Tree");
includes(vo, 'dataTreeChildField: "_children"', "VO Table View keeps _children tree field");
includes(vo, "<ValueObjectMindMap", "VO Map view remains intact");

includes(recovery, "f0ca8bcfb785592375972913567b30d2661603e5", "Recovery records exact T1_3 baseline");
includes(recovery, "Production visual postcheck", "Recovery records visual evidence basis");
includes(recovery, "Not linked to an observation object", "Recovery records epistemically honest semantic fallback");
includes(recovery, "visible: false", "Recovery records hidden secondary columns");
includes(recovery, "SQL/migrations: нет", "Recovery records no SQL scope");
includes(recovery, "Inline editing: нет", "Recovery records no editable-grid scope");
includes(recovery, "Postcheck после PASS", "Recovery records production postcheck continuation point");
includes(currentState, "ARCTOR_TABLE_VIEWS_T1_3_READABILITY_HOTFIX_V1", "Current-state recovery history updated");
includes(currentState, "legacy `semanticObjectKey` fallback", "Current-state records semantic-key honesty rule");

console.log(`RESULT=PASS checks=${checks}`);

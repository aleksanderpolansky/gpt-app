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
const recovery = read("docs/recovery/ARCTOR_TABLE_VIEWS_T1_2_LAYOUT_UX_HOTFIX_V1_RU.md");
const currentState = read("docs/recovery/ARCTOR_CURRENT_STATE_RU.md");

assert(packageJson.dependencies?.["tabulator-tables"] === "6.5.2", "Tabulator dependency remains exact 6.5.2");
includes(packageLock, '"node_modules/tabulator-tables"', "package-lock still contains Tabulator");
includes(packageLock, '"version": "6.5.2"', "package-lock still pins Tabulator 6.5.2");

includes(adapter, 'layout: "fitColumns"', "shared adapter uses fitColumns");
excludes(adapter, 'layout: "fitDataStretch"', "shared adapter no longer uses fitDataStretch");
includes(adapter, 'responsiveLayout: "hide"', "shared adapter enables responsive hide");
includes(adapter, "resizableColumnFit: true", "shared adapter preserves paired column resizing");
includes(adapter, "responsive?: number;", "shared column contract supports responsive priority");
includes(adapter, "visible?: boolean;", "shared column contract supports visibility");
includes(adapter, "tooltip?: boolean | string;", "shared column contract supports tooltip");
includes(adapter, "rowHeight: 32", "row height remains compact 32px");
includes(adapter, "table?.destroy()", "adapter still destroys instance on reconfiguration");

includes(css, "ARCTOR_TABLE_VIEWS_T1_2_LAYOUT_UX_HOTFIX_V1", "layout UX CSS marker present");
includes(css, "width: 100%;", "Tabulator width constrained to container");
includes(css, "max-width: 100%;", "Tabulator max-width constrained to container");
includes(css, "text-overflow: ellipsis;", "long cell/header text uses ellipsis");
includes(css, "white-space: nowrap;", "compact rows stay single-line");
includes(css, "@media (max-width: 1100px)", "narrow desktop density rule present");

const voColumns = blockBetween(vo, "const tableColumns = useMemo", "const tableOptions = useMemo");
includes(voColumns, 'field: "title"', "VO table keeps object title");
includes(voColumns, "responsive: 0", "VO object title is critical responsive column");
includes(voColumns, 'field: "description"', "VO table retains description data column");
includes(voColumns, "responsive: 6", "VO description hides before critical columns");
includes(voColumns, 'field: "parent"', "VO table retains parent data column");
includes(voColumns, "responsive: 7", "VO parent has lowest responsive priority");
includes(voColumns, 'field: "role"', "VO table keeps role");
includes(voColumns, 'field: "directChildren"', "VO table keeps direct children count");
includes(voColumns, 'field: "descendants"', "VO table keeps descendants count");
includes(voColumns, 'field: "descendantLeaves"', "VO table keeps leaf count");
includes(voColumns, 'field: "status"', "VO table keeps status");
includes(vo, "dataTree: true", "VO Table View remains Data Tree");
includes(vo, 'dataTreeChildField: "_children"', "VO Table View keeps _children tree field");
includes(vo, "<ValueObjectMindMap", "VO Map view remains intact");

const journalColumns = blockBetween(journal, "const journalTableColumns = useMemo", "// ARCTOR_ACTIVITY_TODAY_LINT_SAFE_AUTO_OPEN_EFFECT_V1");
includes(journalColumns, 'field: "when"', "Journal table keeps when");
includes(journalColumns, 'field: "activity"', "Journal table keeps activity");
includes(journalColumns, 'field: "eventTime"', "Journal table keeps activity time");
includes(journalColumns, 'field: "duration"', "Journal table keeps duration");
includes(journalColumns, 'field: "analysis"', "Journal table keeps analysis");
includes(journalColumns, 'field: "status"', "Journal table keeps status");
includes(journalColumns, 'field: "source"', "Journal table keeps source as secondary column");
excludes(journalColumns, 'field: "actor"', "Journal main table removes repetitive actor/User column");
includes(journalColumns, "responsive: 0", "Journal has never-hide critical columns");
includes(journal, "onRowClick={(row) => openItem(row.item)}", "Journal row click still opens existing detail");
includes(journal, "cancelItem(item)", "Journal delete action remains");
includes(journal, "restoreItem(item)", "Journal restore action remains");

assert(count(facts, "advancedFilters: string;") === 1, "Facts copy contract adds advancedFilters once");
for (const [locale, label] of [
  ["en", "Technical filters"],
  ["pl", "Filtry techniczne"],
  ["ru", "Технические фильтры"],
  ["uk", "Технічні фільтри"],
  ["de", "Technische Filter"],
  ["es", "Filtros técnicos"],
  ["cs", "Technické filtry"],
]) {
  includes(facts, `advancedFilters: "${label}"`, `Facts ${locale} advanced filter label present`);
}
assert(count(facts, "advancedFilters:") === 8, "Facts advancedFilters appears once in type + seven locales");
includes(facts, '<details className="mt-4 rounded-2xl', "Facts technical filters use collapsible details");
includes(facts, "{copy.advancedFilters}", "Facts technical filter summary is localized");
includes(facts, 'className="mt-5 grid gap-3 md:grid-cols-2"', "Facts primary filters reduced to two-column surface");
includes(facts, 'value={semanticObjectKey}', "Facts semantic-key filter is preserved");
includes(facts, 'value={valueObjectId}', "Facts value-object UUID filter is preserved");
includes(facts, 'value={activityEventId}', "Facts activity UUID filter is preserved");
includes(facts, 'value={factStatus}', "Facts status filter remains primary");

const factColumns = blockBetween(facts, "const factTableColumns = useMemo", "const loadFacts = useCallback");
for (const field of ["date", "activity", "valueObject", "type", "value", "unit", "status", "source", "confidence"]) {
  includes(factColumns, `field: "${field}"`, `Facts table keeps ${field} column`);
}
assert(count(factColumns, "responsive: 0") >= 3, "Facts critical Activity/Value Object/Value columns never hide");
includes(factColumns, "responsive: 6", "Facts source is lowest-priority responsive column");
includes(factColumns, "responsive: 5", "Facts confidence is secondary responsive column");
includes(facts, '(fact.valueObjects ?? []).map((valueObject) => valueObject.title)', "Facts table still prefers hydrated value-object titles");
includes(facts, "fact.semanticObjectKey ||", "Facts retains safe legacy semantic-key fallback");
includes(facts, "<ActivityFactTaggingPanel", "Facts tagging panel remains intact");
includes(facts, "<FactGroup", "Facts cards/grouped view remains intact");

includes(recovery, "5e99924af14df853036cc9b4d4c01cb2afa6ba64", "recovery records exact baseline");
includes(recovery, "fitDataStretch", "recovery records visual defect cause");
includes(recovery, 'layout: "fitColumns"', "recovery records fitColumns decision");
includes(recovery, 'responsiveLayout: "hide"', "recovery records responsive decision");
includes(recovery, "actor/User", "recovery records Journal actor-column decision");
includes(recovery, "Technical filters", "recovery records Facts technical-filter decision");
includes(recovery, "SQL/migrations: нет", "recovery records no SQL scope");
includes(recovery, "inline editing: нет", "recovery records no editable grid scope");
includes(currentState, "ARCTOR_TABLE_VIEWS_T1_2_LAYOUT_UX_HOTFIX_V1", "current-state recovery history updated");

console.log(`RESULT=PASS checks=${checks}`);

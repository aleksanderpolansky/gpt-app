import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
let checks = 0;

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`MISSING_FILE: ${relativePath}`);
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function assert(condition, label) {
  checks += 1;
  if (!condition) {
    throw new Error(`CHECK_FAILED: ${label}`);
  }
  console.log(`PASS ${String(checks).padStart(2, "0")} ${label}`);
}

function includesAll(text, fragments, label) {
  for (const fragment of fragments) {
    assert(text.includes(fragment), `${label}: ${fragment}`);
  }
}

function occurrenceCount(text, fragment) {
  if (!fragment) return 0;
  return text.split(fragment).length - 1;
}

function localeBlock(text, locale, startMarker = "const COPY") {
  const start = text.indexOf(startMarker);
  if (start < 0) throw new Error(`MISSING_COPY_MARKER: ${startMarker}`);
  const scoped = text.slice(start);
  const marker = `  ${locale}: {`;
  const blockStart = scoped.indexOf(marker);
  if (blockStart < 0) throw new Error(`MISSING_LOCALE_BLOCK: ${locale}`);
  const bodyStart = blockStart + marker.length;
  const blockEnd = scoped.indexOf("\n  },", bodyStart);
  if (blockEnd < 0) throw new Error(`UNTERMINATED_LOCALE_BLOCK: ${locale}`);
  return scoped.slice(bodyStart, blockEnd);
}

function assertLocaleKeysExactlyOnce(text, locales, keys, label, startMarker = "const COPY") {
  for (const locale of locales) {
    const block = localeBlock(text, locale, startMarker);
    for (const key of keys) {
      const count = occurrenceCount(block, `\n    ${key}: `);
      assert(count === 1, `${label} ${locale}.${key} exactly once`);
    }
  }
}

const packageJson = JSON.parse(read("package.json"));
assert(
  packageJson.dependencies?.["tabulator-tables"] === "6.5.2",
  "package.json pins tabulator-tables exactly to 6.5.2",
);

const packageLock = JSON.parse(read("package-lock.json"));
const lockedTabulator = packageLock.packages?.["node_modules/tabulator-tables"];
if (process.env.ARCTOR_REQUIRE_TABULATOR_LOCK === "1") {
  assert(Boolean(lockedTabulator), "package-lock contains node_modules/tabulator-tables");
  assert(lockedTabulator?.version === "6.5.2", "package-lock pins Tabulator 6.5.2");
} else if (lockedTabulator) {
  assert(lockedTabulator.version === "6.5.2", "existing package-lock Tabulator entry is 6.5.2");
} else {
  console.log("INFO package-lock Tabulator check deferred until release npm install");
}

const adapter = read("src/components/tables/arctor-tabulator.tsx");
includesAll(
  adapter,
  [
    'import "tabulator-tables/dist/css/tabulator.min.css";',
    'await import("tabulator-tables")',
    'new TabulatorFull(host, {',
    'rowHeight: 32',
    'table?.destroy()',
    'onRowClickRef.current = onRowClick',
    '.tabulator-data-tree-control',
  ],
  "shared Tabulator adapter",
);
assert(!adapter.includes("cellEdited"), "shared adapter has no editable-grid callback in T1");

const adapterCss = read("src/components/tables/arctor-tabulator.css");
includesAll(
  adapterCss,
  [
    ".arctor-tabulator.tabulator",
    "min-height: 32px",
    ".tabulator-data-tree-control",
    ".arctor-table-title",
  ],
  "ARCTor compact table CSS",
);

const declaration = read("src/types/tabulator-tables.d.ts");
includesAll(
  declaration,
  ['declare module "tabulator-tables"', "export class TabulatorFull", 'event: "rowClick"'],
  "local Tabulator TypeScript declaration",
);

const vo = read("src/components/workspace/value-objects/value-object-catalog-views.tsx");
includesAll(
  vo,
  [
    'type ViewMode = "tree" | "cards" | "map" | "table";',
    'onClick={() => setViewMode("table")}',
    "<Table2 size={15} />",
    "<ArctorTabulator<TableObjectRow>",
    'dataTree: true',
    'dataTreeChildField: "_children"',
    'field: "description"',
    'field: "parent"',
    "<ValueObjectMindMap",
    'viewMode === "tree"',
  ],
  "/value-objects Table View",
);
assertLocaleKeysExactlyOnce(
  vo,
  ["en", "pl", "ru", "uk", "de", "es", "cs"],
  ["table", "description", "parent", "emptyTable"],
  "/value-objects localized Table View key",
);
includesAll(
  vo,
  [
    'pl: {\n    tree: "Drzewo"',
    'table: "Tabela"',
    'es: {\n    tree: "Árbol"',
    'table: "Tabla"',
    'cs: {\n    tree: "Strom"',
    'table: "Tabulka"',
  ],
  "/value-objects corrected pl/es/cs locale placement",
);

const journal = read("src/app/activity-today/page.tsx");
includesAll(
  journal,
  [
    'type JournalViewMode = "cards" | "table";',
    'useState<JournalViewMode>("cards")',
    "<ArctorTabulator<JournalTableRow>",
    'field: "when"',
    'field: "activity"',
    'field: "duration"',
    'field: "analysis"',
    'onRowClick={(row) => openItem(row.item)}',
    "ActivityLifecycleBadge",
    "cancelItem(item)",
    "restoreItem(item)",
  ],
  "/activity-today Table View",
);
assertLocaleKeysExactlyOnce(
  journal,
  ["en", "pl", "ru", "uk", "de", "es", "cs"],
  ["cardsView", "tableView", "when", "activity", "analysis"],
  "/activity-today localized Table View key",
  "const UI",
);

const facts = read("src/app/activity-facts/page.tsx");
includesAll(
  facts,
  [
    'type FactsViewMode = "cards" | "table";',
    'useState<FactsViewMode>("cards")',
    "<ArctorTabulator<FactTableRow>",
    'field: "date"',
    'field: "activity"',
    'field: "valueObject"',
    'field: "value"',
    'field: "confidence"',
    "<ActivityFactTaggingPanel",
    "<FactGroup",
  ],
  "/activity-facts Table View",
);
assertLocaleKeysExactlyOnce(
  facts,
  ["en", "pl", "ru", "uk", "de", "es", "cs"],
  ["cardsView", "tableView", "date", "activity"],
  "/activity-facts localized Table View key",
);

const recovery = read("docs/recovery/ARCTOR_TABLE_VIEWS_T1_TABULATOR_V1_1_RU.md");
includesAll(
  recovery,
  [
    "6c91b6d48a379c05fdc5532cd74e327d34b32313",
    "table-views-t1-tabulator-v1-1",
    "/value-objects",
    "/activity-today",
    "/activity-facts",
    "inline cell editing",
    "TS1117",
    "TS2739",
    "ROLLBACK=PASS",
    "isolated TypeScript delta gate",
  ],
  "release recovery checkpoint",
);

const currentState = read("docs/recovery/ARCTOR_CURRENT_STATE_RU.md");
assert(
  currentState.includes("## 2026-08-28 — ARCTOR_TABLE_VIEWS_T1_TABULATOR_V1_1"),
  "current-state recovery history updated",
);

console.log(`RESULT=PASS checks=${checks}`);

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
let checks = 0;
let failures = 0;

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}
function check(condition, label) {
  checks += 1;
  if (condition) {
    console.log(`PASS ${String(checks).padStart(3, "0")} ${label}`);
  } else {
    failures += 1;
    console.error(`FAIL ${String(checks).padStart(3, "0")} ${label}`);
  }
}
function has(text, needle, label) {
  check(text.includes(needle), label);
}
function lacks(text, needle, label) {
  check(!text.includes(needle), label);
}

const pkg = JSON.parse(read("package.json"));
const page = read("src/app/value-objects/page.tsx");
const workspace = read("src/app/value-objects/table/page.tsx");
const shell = read("src/components/app-shell/global-app-shell.tsx");
const catalog = read("src/components/workspace/value-objects/value-object-catalog-views.tsx");
const adapter = read("src/components/tables/arctor-tabulator.tsx");
const clipboard = read("src/components/tables/arctor-clipboard.ts");
const currentState = read("docs/recovery/ARCTOR_CURRENT_STATE_RU.md");
const recovery = read("docs/recovery/ARCTOR_TABLE_VIEWS_T2_3_2_STANDALONE_TABLE_WORKSPACE_V1_RU.md");

check(pkg.dependencies?.["tabulator-tables"] === "6.5.2", "Tabulator remains exact 6.5.2");
has(page, '"/value-objects/table"', "main page workspace href");
has(page, 'target="_blank"', "workspace opens new tab");
has(page, 'rel="noopener noreferrer"', "new tab opener isolation");
has(page, "OPEN_TABLE_WORKSPACE_LABELS", "workspace labels are localized");
for (const locale of ["en", "pl", "ru", "uk", "de", "es", "cs"]) {
  has(page, `${locale}:`, `main workspace label locale ${locale}`);
}

has(workspace, "ValueObjectsTableWorkspacePage", "standalone route component");
has(workspace, "<ActualValueObjectsList />", "standalone reuses live value object catalog");
has(workspace, 'max-w-[1920px]', "standalone wide workspace");
has(workspace, 'buildLocaleAwareHref("/value-objects", locale)', "standalone back route");
for (const locale of ["en", "pl", "ru", "uk", "de", "es", "cs"]) {
  has(workspace, `${locale}:`, `standalone locale ${locale}`);
}

has(shell, 'pathname === "/value-objects/table"', "GlobalAppShell plain workspace gate");
has(catalog, 'import { usePathname } from "next/navigation";', "catalog pathname awareness");
has(catalog, 'pathname === "/value-objects/table"', "catalog standalone route detection");
has(catalog, 'standaloneTableWorkspace ? "table" : "tree"', "workspace starts table view");
has(catalog, "useState(standaloneTableWorkspace)", "workspace starts edit mode");

has(adapter, "shouldBypassArctorRangeCopyForNativeSelection", "selection boundary helper wired");
has(adapter, "const hasNativeSelection = Boolean(", "native selection state retained");
has(adapter, "selection && !selection.isCollapsed", "native noncollapsed selection detected");
has(adapter, "anchorInsideTable", "range copy anchor table boundary");
has(adapter, "focusInsideTable", "range copy focus table boundary");
has(adapter, "selectionInsideEditor", "native editor copy boundary");
has(adapter, ".getStructuredCells()", "structured range copy retained");
has(adapter, 'clipboardData.setData("text/plain", clipboard)', "clipboardData write retained");
has(adapter, 'copyDocument.addEventListener("copy", copyListener, true)', "document capture copy retained");
has(adapter, 'pasteHost.addEventListener("paste", pasteListener)', "custom paste retained");
has(adapter, "selectableRangeInitializeDefault: false", "no phantom initial range");
has(adapter, "mobileHorizontalScrollActive", "mobile horizontal scroll retained");
has(adapter, "allowNativePinchZoom", "pinch zoom retained");

has(clipboard, "ArctorRangeCopySelectionBoundary", "selection boundary contract exported");
has(clipboard, "shouldBypassArctorRangeCopyForNativeSelection", "selection boundary helper exported");
has(clipboard, "boundary.selectionInsideEditor", "editor selection bypass");
has(clipboard, "!boundary.anchorInsideTable", "outside anchor bypass");
has(clipboard, "!boundary.focusInsideTable", "outside focus bypass");
has(clipboard, "serializeArctorClipboardMatrix", "TSV serializer retained");

// Fail-closed/write-contract regression markers inherited from T2_3/T2_3_1.
has(catalog, "canEditValueObjectTableCells", "read-only edit gate retained");
has(catalog, "saveValueObjectTableField", "existing single-field write helper retained");
has(catalog, "Undo2", "Undo UI retained");
has(catalog, "Redo2", "Redo UI retained");
has(catalog, "onRangePaste", "range paste callback retained");
has(catalog, "onRangeCopied", "range copy feedback retained");

has(recovery, "6fd99c47044ab13b85c0d1f0a6456bf4b30bc650", "recovery exact baseline");
has(recovery, "Ctrl+C", "recovery production copy failure");
has(recovery, "/value-objects/table", "recovery standalone route");
has(recovery, "GlobalSidebar", "recovery shell isolation");
has(recovery, "DOM selection", "recovery DOM selection root cause");
has(recovery, "Spreadsheet mode", "recovery future spreadsheet direction");
has(recovery, "PATCH_ANCHOR_MISSING:workspace-labels", "recovery V1_1 anchor failure");
has(recovery, "LF/CRLF", "recovery newline hardening");
has(recovery, "worktree-bytes replay", "recovery pre-mutation replay hardening");
has(currentState, "T2_3_2 standalone table workspace", "current state checkpoint");
has(currentState, "6fd99c47044ab13b85c0d1f0a6456bf4b30bc650", "current state baseline");
has(currentState, "/value-objects/table", "current state workspace route");

lacks(workspace, "GlobalAiNavigator", "standalone route does not embed AI Navigator");
lacks(workspace, "GlobalSidebar", "standalone route does not embed sidebar");

if (failures > 0) {
  console.error(`RESULT=FAIL checks=${checks} failed=${failures}`);
  process.exit(1);
}
console.log(`RESULT=PASS checks=${checks}`);

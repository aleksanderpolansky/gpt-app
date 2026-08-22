import fs from "node:fs";

const checks = [];
function check(name, passed) {
  checks.push({ name, passed: Boolean(passed) });
  console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
}
function read(path) {
  return fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

const packageJson = JSON.parse(read("package.json"));
const packageLockText = read("package-lock.json");
const packageLock = JSON.parse(packageLockText);
const globals = read("src/app/globals.css");
const catalog = read(
  "src/components/workspace/value-objects/value-object-catalog-views.tsx",
);
const map = read(
  "src/components/workspace/value-objects/value-object-mind-map.tsx",
);
const recovery = read("docs/recovery/ARCTOR_VO_MIND_MAP_V0_READONLY_RU.md");
const evidence = read(
  "docs/recovery/evidence/HELP_FILES/ARCTOR_VO_MIND_MAP_V0_READONLY_EVIDENCE.json",
);

for (const path of [
  "src/components/workspace/value-objects/value-object-catalog-views.tsx",
  "src/components/workspace/value-objects/value-object-mind-map.tsx",
  "src/app/globals.css",
  "package.json",
  "package-lock.json",
  "docs/recovery/ARCTOR_VO_MIND_MAP_V0_READONLY_RU.md",
  "docs/recovery/evidence/HELP_FILES/ARCTOR_VO_MIND_MAP_V0_READONLY_EVIDENCE.json",
]) {
  check(`FILE_EXISTS:${path}`, fs.existsSync(path));
}

check(
  "XYFLOW_DEPENDENCY_PINNED",
  packageJson.dependencies?.["@xyflow/react"] === "12.11.3",
);
check(
  "XYFLOW_LOCK_PRESENT",
  packageLock.packages?.["node_modules/@xyflow/react"]?.version === "12.11.3",
);
const tailwindIndex = globals.indexOf('@import "tailwindcss";');
const xyflowIndex = globals.indexOf('@import "@xyflow/react/dist/style.css";');
check("XYFLOW_CSS_IMPORTED", xyflowIndex >= 0);
check("XYFLOW_CSS_AFTER_TAILWIND", xyflowIndex > tailwindIndex);

check("CATALOG_MAP_VIEW_MODE", catalog.includes('type ViewMode = "tree" | "cards" | "map";'));
check("CATALOG_MAP_ICON", catalog.includes("Map as MapIcon"));
check("CATALOG_MAP_IMPORT", catalog.includes('import { ValueObjectMindMap } from "./value-object-mind-map";'));
check("CATALOG_TREE_DEFAULT_RETAINED", catalog.includes('useState<ViewMode>("tree")'));
check("CATALOG_MAP_BUTTON", catalog.includes('onClick={() => setViewMode("map")}'));
check("CATALOG_MAP_RENDER", catalog.includes("<ValueObjectMindMap"));
check("CATALOG_MAP_FILTER_REUSE", catalog.includes("visibleIds.has(valueObject.id)"));

const catalogLocales = ["en", "pl", "ru", "uk", "de", "es", "cs"];
function catalogLocaleMapCount(locale) {
  const pattern = new RegExp(`\\n  ${locale}: \\{([\\s\\S]*?)\\n  \\},`);
  const match = catalog.match(pattern);
  if (!match) return -1;
  return (match[1].match(/^    map\s*:/gm) ?? []).length;
}
check(
  "CATALOG_MAP_COPY_EXACT_ONE_PER_LOCALE",
  catalogLocales.every((locale) => catalogLocaleMapCount(locale) === 1),
);
check("CATALOG_MAP_COPY_PL_NOT_DUPLICATED", catalogLocaleMapCount("pl") === 1);
check("CATALOG_MAP_COPY_CS_PRESENT", catalogLocaleMapCount("cs") === 1);

check("MAP_REACT_FLOW", map.includes("<ReactFlow<MindMapNode, Edge>"));
check("MAP_PROVIDER", map.includes("<ReactFlowProvider>"));
check("MAP_REAL_PARENT_LINK", map.includes("valueObject.parent_value_object_id"));
check("MAP_STRUCTURAL_EDGE", map.includes("structural-${id}-${child.id}"));
check("MAP_READ_ONLY_DRAG", map.includes("nodesDraggable={false}"));
check("MAP_READ_ONLY_CONNECT", map.includes("nodesConnectable={false}"));
check("MAP_NO_WRITE_FETCH", !/fetch\s*\(/.test(map));
check("MAP_NO_MUTATION_HTTP", !/(POST|PATCH|PUT|DELETE)/.test(map));
check("MAP_NO_PRO_OPTIONS", !map.includes("proOptions"));
check("MAP_ATTRIBUTION_VISIBLE", map.includes('attributionPosition="bottom-right"'));
check("MAP_ZOOM_PAN", map.includes("zoomOnScroll") && map.includes("panOnDrag") && map.includes("zoomOnPinch"));
check("MAP_FIT_VIEW", map.includes("fitView") && map.includes("fitViewOptions"));
check("MAP_CONTROLS", map.includes("<Controls"));
check("MAP_BACKGROUND", map.includes("<Background"));
check("MAP_COLLAPSE_STATE", map.includes("collapsedIds") && map.includes("toggleCollapsed"));
check("MAP_COLLAPSED_CHILDREN_HIDDEN", map.includes("collapsedIds.has(id) ? [] : allChildren"));
check("MAP_OPEN_EXISTING_CARD", map.includes("/value-objects/${id}"));
check("MAP_SEVEN_LOCALES", ["en", "pl", "ru", "uk", "de", "es", "cs"].every((locale) => map.includes(`${locale}: {`)));
check("MAP_CORPORATE_PRIMARY", map.includes("#3b6ef8") && map.includes("#eef2ff"));
check("MAP_MOBILE_HEIGHT", map.includes("h-[560px]") && map.includes("sm:h-[620px]"));
check("MAP_NO_REACT_FLOW_PRO", !map.includes("React Flow Pro") && !map.includes("hideAttribution"));
check("MAP_NO_DAGRE_ELK_DEP", !map.includes("dagre") && !map.includes("elk"));
check("MAP_DETERMINISTIC_LAYOUT", map.includes("function buildGraph") && map.includes("depth * (NODE_WIDTH + LEVEL_GAP)"));
check("MAP_CYCLE_FAIL_CLOSED", map.includes("not promoted to fake roots"));

check("RECOVERY_BASELINE", recovery.includes("c15d831201b8e3814b2320a94075c765917c345f"));
check("RECOVERY_READ_ONLY_SCOPE", recovery.includes("READ-ONLY") && recovery.includes("запись в БД"));
check("RECOVERY_REACT_FLOW_FREE", recovery.includes("React Flow Free") && recovery.includes("MIT"));
check("RECOVERY_NEXT_V1", recovery.includes("Mind Map V1"));
check("RECOVERY_RUNTIME_EVIDENCE", recovery.includes("Tree/Mobile/L10"));
check("EVIDENCE_SOURCE_ONLY", evidence.includes('"productionDataRead": false'));
check("EVIDENCE_NO_DB_CHANGE", evidence.includes('"dbSchemaChange": false'));
check("EVIDENCE_XYFLOW_VERSION", evidence.includes('"reactFlowVersion": "12.11.3"'));

const failed = checks.filter((item) => !item.passed);
console.log(`SUMMARY total=${checks.length} passed=${checks.length - failed.length} failed=${failed.length}`);
if (failed.length > 0) process.exit(1);

import fs from "node:fs";
import path from "node:path";

const checks = [];
function check(name, passed, detail = "") {
  checks.push({ name, passed: Boolean(passed), detail });
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${detail ? ` ${detail}` : ""}`);
}
function read(relativePath) {
  const file = path.resolve(process.cwd(), relativePath);
  const exists = fs.existsSync(file);
  check(`FILE_EXISTS:${relativePath}`, exists);
  return exists ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n") : "";
}

const list = read("src/components/workspace/value-objects/actual-value-objects-list.tsx");
const view = read("src/components/workspace/value-objects/value-object-catalog-views.tsx");
const page = read("src/app/value-objects/page.tsx");
const recovery = read("docs/recovery/ARCTOR_VO_TREE_TABLE_V1_RU.md");
const evidence = read("docs/recovery/evidence/HELP_FILES/ARCTOR_VO_TREE_TABLE_V1_EVIDENCE.json");

check("CATALOG_VIEW_IMPORT", list.includes('ValueObjectCatalogViews } from "@/components/workspace/value-objects/value-object-catalog-views"'));
check("CATALOG_VIEW_WRAP", list.includes("<ValueObjectCatalogViews") && list.includes("</ValueObjectCatalogViews>"));
check("CATALOG_VIEW_QUERY_PROP", list.includes("query={query}"));
check("CATALOG_VIEW_ROLE_FILTER_PROP", list.includes("roleFilter={roleFilter}"));
check("CATALOG_VIEW_SORT_PROP", list.includes("sortMode={sortMode}"));
check("CATALOG_DEFAULT_TREE", view.includes('useState<ViewMode>("tree")'));
check("CATALOG_TREE_CARDS_TOGGLE", view.includes('setViewMode("tree")') && view.includes('setViewMode("cards")'));
check("TREE_COLLAPSE_EXPAND", view.includes("function expandAll()") && view.includes("function collapseAll()"));
check("TREE_REAL_PARENT_LINK", view.includes("parent_value_object_id") && view.includes("childrenByParent"));
check("TREE_DEPTH_INDENT", view.includes("depth * 26") && view.includes("Math.min(depth * 14, 56)"));
check("TREE_DIRECT_COUNT", view.includes("directChildren"));
check("TREE_DESCENDANT_COUNT", view.includes("descendantCountById"));
check("TREE_LEAF_COUNT", view.includes("descendantLeafCountById"));
check("TREE_FILTER_ANCESTORS", view.includes("matchingIds") && view.includes("visible.add(cursor.id)"));
check("TREE_FORCE_EXPAND_FILTER", view.includes("filterActive || activeExpandedIds.has"));
check("TREE_DESKTOP_TABLE", view.includes('className="w-full min-w-[1000px] border-collapse"'));
check("TREE_MOBILE_LAYOUT", view.includes("md:hidden") && view.includes("hidden overflow-hidden") && view.includes("md:block"));
check("TREE_OPEN_OBJECT", view.includes("/value-objects/${valueObject.id}"));
check("TREE_CORPORATE_PRIMARY", view.includes("#3b6ef8") && view.includes("#eef2ff") && view.includes("#f5f6fb"));
check("TREE_SEVEN_LOCALES", ["en:", "pl:", "ru:", "uk:", "de:", "es:", "cs:"].every((token) => view.includes(token)));
check("CATALOG_WIDER_CANVAS", page.includes("max-w-[1440px]"));
check("NO_REACT_FLOW_YET", !view.includes("@xyflow/react") && !list.includes("@xyflow/react"));
check("NO_DB_CHANGE", !view.includes("supabase") && !list.includes("VO_TREE_TABLE_DB"));
check("RECOVERY_BASELINE", recovery.includes("16687ab28aa41224459e0dabee8d04619be41028"));
check("RECOVERY_MIND_MAP_NEXT", recovery.includes("Mind Map") && recovery.includes("React Flow"));
check("RECOVERY_STYLE_LOCK", recovery.includes("корпоратив") || recovery.includes("стил"));
check("EVIDENCE_SOURCE_ONLY", evidence.includes('"dbSchemaChange": false'));
check("EVIDENCE_DESIGN_REFERENCE", evidence.includes("High-Fidelity Dashboard Design"));

const failed = checks.filter((item) => !item.passed);
console.log(`SUMMARY total=${checks.length} passed=${checks.length - failed.length} failed=${failed.length}`);
if (failed.length > 0) process.exit(1);

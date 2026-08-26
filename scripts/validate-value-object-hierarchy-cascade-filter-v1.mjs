import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const actualPath = path.join(
  root,
  "src/components/workspace/value-objects/actual-value-objects-list.tsx",
);
const catalogPath = path.join(
  root,
  "src/components/workspace/value-objects/value-object-catalog-views.tsx",
);

const actual = fs.readFileSync(actualPath, "utf8");
const catalog = fs.readFileSync(catalogPath, "utf8");

const checks = [];
function check(name, condition) {
  checks.push({ name, pass: Boolean(condition) });
}

check("PARENT_HIERARCHY_STATE", actual.includes("const [hierarchyPathIds, setHierarchyPathIds] = useState<string[]>([]);"));
check("PARENT_SUBTREE_FILTER", actual.includes("const hierarchyVisibleIds = useMemo(() =>"));
check("PARENT_FILTER_COMBINES_BRANCH", actual.includes("!hierarchyVisibleIds.has(valueObject.id)"));
check("PARENT_PASSES_PATH", actual.includes("hierarchyPathIds={hierarchyPathIds}"));
check("PARENT_PASSES_CALLBACK", actual.includes("onHierarchyPathChange={setHierarchyPathIds}"));
check("DELETE_RESETS_INVALID_PATH", actual.includes("current.includes(deletedId) ? [] : current"));
check("REPARENT_RESETS_INVALID_PATH", actual.includes("current.includes(movedId) ? [] : current"));

check("CATALOG_ROOT_LABEL", catalog.includes('rootFilter: "Корневой объект"'));
check("CATALOG_INSIDE_LABEL", catalog.includes('insideFilter: "Внутри «{parent}»"'));
check("CATALOG_ALL_ROOTS_LABEL", catalog.includes('allRoots: "Все корневые объекты"'));
check("CATALOG_ALL_CHILDREN_LABEL", catalog.includes('allChildren: "Все дочерние объекты"'));
check("CATALOG_RESET_LABEL", catalog.includes('resetHierarchy: "Сбросить"'));
check("ALL_SEVEN_LOCALES", ["en", "pl", "ru", "uk", "de", "es", "cs"].every((locale) => catalog.includes(`  ${locale}: {`)));

check("ROOTS_SORTED_BY_TITLE", catalog.includes('roots.filter((valueObject) => getSemanticRole(valueObject) === "root")'));
check("PATH_VALIDATES_PARENT_CHAIN", catalog.includes("valueObject.parent_value_object_id !== expectedParentId"));
check("SUBTREE_IDS", catalog.includes("const hierarchySubtreeIds = useMemo(() =>"));
check("MATCHES_RESTRICTED_TO_SUBTREE", catalog.includes("hierarchySubtreeIds && !hierarchySubtreeIds.has(valueObject.id)"));
check("TREE_REROOTS_TO_SELECTION", catalog.includes("const treeRoots = useMemo(() =>"));
check("TREE_USES_SELECTED_ROOT", catalog.includes("return selected ? [selected] : [];"));
check("MAP_USES_VISIBLE_IDS", catalog.includes("visibleIds.has(valueObject.id)"));
check("CASCADE_ROOT_ALWAYS_RENDERED", catalog.includes('key="root"'));
check("CASCADE_CHILD_ONLY_IF_CHILDREN", catalog.includes("if (options.length === 0)"));
check("CASCADE_TRUNCATES_ON_CHANGE", catalog.includes(".slice(0, levelIndex)"));
check("CASCADE_BLANK_MEANS_PARENT_BRANCH", catalog.includes("onHierarchyPathChange(nextId ? [...basePath, nextId] : basePath)"));
check("DESKTOP_FILTER_AFTER_VIEW_TABS", catalog.indexOf("{renderHierarchyFilters()}") > catalog.indexOf("{copy.map}"));
check("DESKTOP_CASCADE_START_ALIGNED", catalog.includes("lg:flex-wrap lg:justify-start"));
check("MOBILE_FILTER_BELOW_TABS", catalog.includes("flex flex-col gap-2 lg:flex-row"));
check("MOBILE_ONE_COLUMN", catalog.includes("grid-cols-1 gap-2 sm:grid-cols-2"));
check("DESKTOP_COMPACT_WIDTH", catalog.includes("lg:w-[220px] xl:w-[240px]"));
check("SELECTED_BRANCH_BREADCRUMB", catalog.includes('.join(" › ")'));
check("RESET_HIERARCHY", catalog.includes("onClick={() => onHierarchyPathChange([])}"));
check("QUERY_ROLE_AND_HIERARCHY_COMBINE", catalog.includes("const filterActive = searchRoleFilterActive || hierarchyFilterActive;"));
check("HIERARCHY_ONLY_SHOWS_WHOLE_SUBTREE", catalog.includes("if (hierarchySubtreeIds && !searchRoleFilterActive)"));
check("FILTERED_TREE_STOPS_ANCESTOR_WALK_AT_SELECTION", catalog.includes("cursor.id === selectedHierarchyId"));

// Deterministic contract test for cascade truncation and subtree behavior.
const nodes = [
  { id: "r", parent: null },
  { id: "a", parent: "r" },
  { id: "b", parent: "a" },
  { id: "c", parent: "b" },
  { id: "x", parent: "r" },
];
const children = new Map();
for (const node of nodes) {
  if (!node.parent) continue;
  const list = children.get(node.parent) ?? [];
  list.push(node.id);
  children.set(node.parent, list);
}
function subtree(selected) {
  const result = new Set();
  const stack = [selected];
  while (stack.length) {
    const id = stack.pop();
    if (!id || result.has(id)) continue;
    result.add(id);
    for (const child of children.get(id) ?? []) stack.push(child);
  }
  return [...result].sort();
}
function update(pathIds, levelIndex, nextId) {
  const base = pathIds.slice(0, levelIndex);
  return nextId ? [...base, nextId] : base;
}
check("SELFTEST_SUBTREE", JSON.stringify(subtree("a")) === JSON.stringify(["a", "b", "c"]));
check("SELFTEST_REPLACE_CHILD_RESETS_DESCENDANTS", JSON.stringify(update(["r", "a", "b", "c"], 1, "x")) === JSON.stringify(["r", "x"]));
check("SELFTEST_CLEAR_LEVEL_RETURNS_PARENT_BRANCH", JSON.stringify(update(["r", "a", "b"], 2, "")) === JSON.stringify(["r", "a"]));

const failed = checks.filter((item) => !item.pass);
const result = {
  release: "ARCTOR_VALUE_OBJECT_HIERARCHY_CASCADE_FILTER_V1",
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  allPass: failed.length === 0,
  checks,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
process.exit(failed.length === 0 ? 0 : 1);

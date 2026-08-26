import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const catalogPath = path.join(
  root,
  "src/components/workspace/value-objects/value-object-catalog-views.tsx",
);
const catalog = fs.readFileSync(catalogPath, "utf8");

const checks = [];
function check(name, condition) {
  checks.push({ name, pass: Boolean(condition) });
}

check("ROOT_SELECT_ACCESSIBLE_NAME", catalog.includes("aria-label={copy.rootFilter}"));
check("CHILD_SELECT_ACCESSIBLE_NAME", catalog.includes("aria-label={label}"));
check("ROOT_SELECT_TITLE", catalog.includes("title={copy.rootFilter}"));
check("CHILD_SELECT_TITLE", catalog.includes("title={label}"));

check("NO_VISIBLE_ROOT_HEADING_WRAPPER", !catalog.includes('<label key="root"'));
check(
  "NO_VISIBLE_ROOT_HEADING_TEXT",
  !catalog.includes("{copy.rootFilter}\n        </span>"),
);
check(
  "NO_VISIBLE_CHILD_HEADING_TEXT",
  !catalog.includes("{label}\n          </span>"),
);

const alignedSelectClass =
  'className="h-11 w-full rounded-xl border border-[#dfe3f1] bg-white px-3 text-[11px] font-semibold text-[#4a4f6a] outline-none transition focus:border-[#9db3ff] focus:ring-2 focus:ring-[#e7edff] lg:w-[220px] xl:w-[240px]"';
check(
  "SELECT_HEIGHT_MATCHES_SEGMENTED_CONTROL",
  catalog.split(alignedSelectClass).length - 1 === 2,
);
check(
  "TOOLBAR_DESKTOP_VERTICAL_ALIGNMENT",
  catalog.includes("flex flex-col gap-2 lg:flex-row lg:items-center"),
);
check(
  "MOBILE_FILTER_REMAINS_BELOW_VIEW_TABS",
  catalog.includes("flex flex-col gap-2 lg:flex-row"),
);
check(
  "DESKTOP_FILTER_REMAINS_RIGHT_OF_MAP",
  catalog.indexOf("{renderHierarchyFilters()}") > catalog.indexOf("{copy.map}"),
);
check(
  "FILTERS_REMAIN_DYNAMIC",
  catalog.includes("if (options.length === 0)"),
);
check(
  "CASCADE_TRUNCATES_DESCENDANTS",
  catalog.includes(".slice(0, levelIndex)"),
);
check(
  "ROOT_PLACEHOLDER_REMAINS_SELF_EXPLANATORY",
  catalog.includes("<option value=\"\">{copy.allRoots}</option>"),
);
check(
  "CHILD_PLACEHOLDER_REMAINS_SELF_EXPLANATORY",
  catalog.includes("<option value=\"\">{copy.allChildren}</option>"),
);
check(
  "DESKTOP_COMPACT_WIDTH_RETAINED",
  catalog.includes("lg:w-[220px] xl:w-[240px]"),
);
check(
  "SELECTED_BRANCH_BREADCRUMB_RETAINED",
  catalog.includes('.join(" › ")'),
);
check(
  "RESET_HIERARCHY_RETAINED",
  catalog.includes("onClick={() => onHierarchyPathChange([])}"),
);

// Focused contract self-test: changing an ancestor still truncates deeper choices.
function update(pathIds, levelIndex, nextId) {
  const base = pathIds.slice(0, levelIndex);
  return nextId ? [...base, nextId] : base;
}
check(
  "SELFTEST_REPLACE_PARENT_TRUNCATES_CHILDREN",
  JSON.stringify(update(["root", "a", "b", "c"], 1, "x")) ===
    JSON.stringify(["root", "x"]),
);

const failed = checks.filter((item) => !item.pass);
const result = {
  release: "ARCTOR_VALUE_OBJECT_HIERARCHY_FILTER_ALIGNMENT_HOTFIX_V1",
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  allPass: failed.length === 0,
  checks,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
process.exit(failed.length === 0 ? 0 : 1);

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const repo = process.cwd();
const source = fs.readFileSync(
  path.join(repo, "src/app/projects/ProjectMapStartClient.tsx"),
  "utf8",
);
const projectRoute = fs.readFileSync(
  path.join(repo, "src/app/api/projects/route.ts"),
  "utf8",
);
const subprojectRoute = fs.readFileSync(
  path.join(repo, "src/app/api/projects/subprojects/route.ts"),
  "utf8",
);

let pass = 0;
let fail = 0;

function check(name, condition, detail = "") {
  if (condition) {
    pass += 1;
    console.log(`PASS ${name}${detail ? ` :: ${detail}` : ""}`);
  } else {
    fail += 1;
    console.error(`FAIL ${name}${detail ? ` :: ${detail}` : ""}`);
  }
}

check(
  "STRUCTURED_VIEWPORT_MODEL",
  source.includes("type ProjectMapViewport = {") &&
    source.includes("structuredViewport") &&
    source.includes("structuredRestoreViewport"),
);

check(
  "COLLAPSE_CAPTURES_VIEWPORT",
  source.includes("if (structuredViewport) {") &&
    source.includes("setStructuredRestoreViewport(structuredViewport);"),
);

check(
  "COLLAPSE_RESTORE_EXACT_VIEWPORT",
  source.includes("void instance.setViewport(") &&
    source.includes("structuredRestoreViewport") &&
    source.includes("{ duration: 0 }"),
);

check(
  "INITIAL_STRUCTURED_FIT_PRESERVED",
  source.includes("void instance.fitView({") &&
    source.includes("padding: 0.2") &&
    source.includes("minZoom: 0.42") &&
    source.includes("maxZoom: 1.05") &&
    source.includes("duration: 0"),
);

check(
  "AUTO_FITVIEW_PROP_REMOVED",
  !source.includes(
    "fitView\n                  fitViewOptions={{ padding: 0.2, minZoom: 0.42, maxZoom: 1.05 }}",
  ),
);

check(
  "VIEWPORT_TRACKED_ON_MOVE_END",
  source.includes("setStructuredViewport(viewport);") &&
    source.includes("projectSemanticZoomLevel(viewport.zoom)"),
);

check(
  "VIEWPORT_RESET_ON_FOCUS_CHANGE",
  (source.match(/setStructuredViewport\(null\);/g)?.length ?? 0) >= 4 &&
    (source.match(/setStructuredRestoreViewport\(null\);/g)?.length ?? 0) >= 5,
);

check(
  "SEMANTIC_ZOOM_PRESERVED",
  source.includes(
    'type ProjectSemanticZoomLevel = "detail" | "compact" | "overview"',
  ) &&
    source.includes("projectSemanticZoomLevel"),
);

check(
  "COLLAPSE_PERSISTENCE_PRESERVED",
  source.includes("PROJECT_MAP_STRUCTURED_STORAGE_PREFIX") &&
    source.includes("readProjectMapStructuredCollapsed") &&
    source.includes("collapsed: next"),
);

check(
  "BREADCRUMB_FOCUS_PRESERVED",
  source.includes("projectBreadcrumbPath") &&
    source.includes('aria-label="Project focus path"'),
);

check(
  "FREE_VIEW_UNCONTROLLED_PRESERVED",
  source.includes("defaultNodes={freeNodes}") &&
    source.includes("defaultEdges={graphEdges}") &&
    !source.includes("onNodesChange={handleFreeNodesChange}"),
);

check(
  "FREE_DRAG_PERSISTENCE_PRESERVED",
  source.includes(
    "onNodeDragStop={(_, node) => persistFreeNodePosition(node)}",
  ),
);

check(
  "PROJECT_READS_DECOMPOSES_INTO",
  projectRoute.includes('relation_type_code", "decomposes_into"') &&
    projectRoute.includes("subprojectIds"),
);

check(
  "SAME_SYSTEM_INTERMEDIATE_PARENT_GUARD",
  subprojectRoute.includes(
    "Subproject must use the same active global system intermediate parent as the parent project.",
  ) &&
    subprojectRoute.includes("parentValueObjectId: systemParent.id"),
);

check(
  "SUBPROJECT_PRIVATE_ACTOR_LEAF",
  subprojectRoute.includes('nodeRoleCode: "leaf"') &&
    subprojectRoute.includes('visibilityCode: "private"'),
);

check(
  "PROJECT_HIERARCHY_DECOMPOSES_INTO",
  subprojectRoute.includes('relation_type_code: "decomposes_into"') &&
    subprojectRoute.includes("project_composition_relations"),
);

check(
  "CYCLE_GUARD_PRESERVED",
  subprojectRoute.includes("wouldCreateProjectCycle") &&
    subprojectRoute.includes("PROJECT_SUBPROJECT_CYCLE_FORBIDDEN"),
);

check(
  "NO_DIRECT_ONTOLOGY_PARENT_MUTATION",
  !source.includes(".update({ parent_value_object_id") &&
    !source.includes(".update({parent_value_object_id"),
);

const apiDiff = execFileSync(
  "git",
  ["diff", "--name-only", "HEAD", "--", "src/app/api"],
  { cwd: repo, encoding: "utf8" },
).trim();
check("NO_API_CHANGE", apiDiff.length === 0, apiDiff || "none");

const dbDiff = execFileSync(
  "git",
  ["diff", "--name-only", "HEAD", "--", "supabase", "migrations"],
  { cwd: repo, encoding: "utf8" },
).trim();
check("NO_DB_MIGRATION", dbDiff.length === 0, dbDiff || "none");

const packageDiff = execFileSync(
  "git",
  ["diff", "--name-only", "HEAD", "--", "package.json", "package-lock.json"],
  { cwd: repo, encoding: "utf8" },
).trim();
check("NO_DEPENDENCY_CHANGE", packageDiff.length === 0, packageDiff || "none");

console.log(
  `PROJECT_MAP_STRUCTURED_VIEWPORT_PRESERVE_VALIDATOR=PASS_${pass}/${pass + fail}`,
);

if (fail > 0) process.exit(1);

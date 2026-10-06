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
  "SEMANTIC_ZOOM_LEVELS",
  source.includes(
    'type ProjectSemanticZoomLevel = "detail" | "compact" | "overview"',
  ) &&
    source.includes("function projectSemanticZoomLevel(zoom: number)") &&
    source.includes('if (zoom < 0.42) return "overview"') &&
    source.includes('if (zoom < 0.72) return "compact"'),
);

check(
  "SEMANTIC_ZOOM_EVENT_BOUNDARY",
  source.includes("onMoveEnd={(_, viewport) => {") &&
    source.includes("projectSemanticZoomLevel(viewport.zoom)") &&
    source.includes("projectSemanticZoomLevel(instance.getZoom())"),
);

check(
  "TASK_SEMANTIC_CONTENT",
  source.includes('data.semanticLevel !== "overview"') &&
    source.includes('data.semanticLevel === "detail" &&') &&
    source.includes("upcomingOccurrences"),
);

check(
  "SUBPROJECT_SEMANTIC_CONTENT",
  source.includes('data.semanticLevel !== "overview" ? (') &&
    source.includes('data.semanticLevel === "detail" ? (') &&
    source.includes("onOpenProject(data.project.id)"),
);

check(
  "TIME_WINDOW_SEMANTIC_CONTENT",
  source.includes(
    'data.semanticLevel === "detail" && data.containedActivities.length === 0',
  ) &&
    source.includes('data.semanticLevel !== "overview" ? ('),
);

check(
  "STRUCTURED_COLLAPSE_PERSISTENCE",
  source.includes("PROJECT_MAP_STRUCTURED_STORAGE_PREFIX") &&
    source.includes("readProjectMapStructuredCollapsed") &&
    source.includes("window.localStorage.setItem") &&
    source.includes("collapsed: next"),
);

check(
  "COLLAPSE_PER_PROJECT",
  source.includes(
    "projectMapStructuredStorageKey(selectedProjectId)",
  ) &&
    source.includes(
      "readProjectMapStructuredCollapsed(nextSelectedId)",
    ) &&
    source.includes(
      "readProjectMapStructuredCollapsed(project.id)",
    ),
);

check(
  "THREE_COLLAPSIBLE_TERRITORIES",
  source.includes(
    'type ProjectStructuredTerritoryKey = "subprojects" | "windows" | "tasks"',
  ) &&
    source.includes("structuredCollapsed.subprojects") &&
    source.includes("structuredCollapsed.windows") &&
    source.includes("structuredCollapsed.tasks"),
);

check(
  "COLLAPSED_TERRITORY_COMPACT_DIMENSIONS",
  source.includes("PROJECT_TERRITORY_COLLAPSED_HEIGHT") &&
    source.includes("height: PROJECT_TERRITORY_COLLAPSED_HEIGHT"),
);

check(
  "COLLAPSED_CHILDREN_NOT_RENDERED",
  source.includes(
    "if (!structuredCollapsed.subprojects) structuredMetrics.directSubprojects.forEach",
  ) &&
    source.includes(
      "if (!structuredCollapsed.windows) structuredMetrics.windowEntries.forEach",
    ) &&
    source.includes(
      "if (!structuredCollapsed.tasks) structuredMetrics.tasks.forEach",
    ),
);

check(
  "TERRITORY_TOGGLE_BUTTON",
  source.includes("onClick={data.onToggle}") &&
    source.includes('{data.collapsed ? "+" : "−"}') &&
    source.includes("collapseLabel") &&
    source.includes("expandLabel"),
);

check(
  "BREADCRUMB_FOCUS_PATH",
  source.includes("function projectBreadcrumbPath(") &&
    source.includes('aria-label="Project focus path"') &&
    source.includes("structuredBreadcrumb.map") &&
    source.includes("onClick={() => showProject(project.id)}"),
);

check(
  "BREADCRUMB_DAG_SAFE",
  source.includes("bestDepth") &&
    source.includes("current.parentProjectIds") &&
    source.includes("left.id.localeCompare(right.id)"),
);

check(
  "FREE_VIEW_UNCONTROLLED_PRESERVED",
  source.includes("defaultNodes={freeNodes}") &&
    source.includes("defaultEdges={graphEdges}") &&
    !source.includes("onNodesChange={handleFreeNodesChange}"),
);

check(
  "FREE_VIEW_FULL_DETAIL_PRESERVED",
  source.includes('semanticLevel: "detail"') &&
    source.includes('dragHandle: ".project-map-drag-handle"'),
);

check(
  "FREE_DRAG_PERSISTENCE_PRESERVED",
  source.includes(
    "onNodeDragStop={(_, node) => persistFreeNodePosition(node)}",
  ) &&
    source.includes("PROJECT_MAP_FREE_STORAGE_PREFIX"),
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
  `PROJECT_MAP_SEMANTIC_ZOOM_COLLAPSE_FOCUS_VALIDATOR=PASS_${pass}/${pass + fail}`,
);

if (fail > 0) process.exit(1);

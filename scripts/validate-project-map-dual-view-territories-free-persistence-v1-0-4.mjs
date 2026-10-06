import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const repo = process.cwd();
const source = fs.readFileSync(path.join(repo, "src/app/projects/ProjectMapStartClient.tsx"), "utf8");
const projectRoute = fs.readFileSync(path.join(repo, "src/app/api/projects/route.ts"), "utf8");
const subprojectRoute = fs.readFileSync(path.join(repo, "src/app/api/projects/subprojects/route.ts"), "utf8");

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

check("TWO_VIEW_MODES",
  source.includes('type ProjectMapViewMode = "structured" | "free"') &&
  source.includes('setMapViewMode("structured")') &&
  source.includes('setMapViewMode("free")'));

check("FREE_VIEW_PRESERVES_CURRENT_GRAPH",
  source.includes("nodes={freeNodes}") &&
  source.includes("edges={graphEdges}") &&
  source.includes("layoutedNodes.map"));

check("FREE_DRAGGING",
  source.includes('dragHandle: ".project-map-drag-handle"') &&
  source.includes("onNodesChange={handleFreeNodesChange}") &&
  source.includes("onNodeDragStop={(_, node) => persistFreeNodePosition(node)}"));

check("DOUBLE_DASHED_HANDLE",
  source.includes("project-map-drag-handle") &&
  (source.match(/border-l border-dashed border-\[#8ea2df\]/g)?.length ?? 0) >= 2);

check("PERSISTENT_BROWSER_LAYOUT",
  source.includes("PROJECT_MAP_FREE_STORAGE_PREFIX") &&
  source.includes("window.localStorage.getItem") &&
  source.includes("window.localStorage.setItem"));

const persistencePerProjectChecks = {
  helper: source.includes(
    "function projectMapFreeStorageKey(projectId: string | null)",
  ),
  keyUsesProjectId:
    source.includes("PROJECT_MAP_FREE_STORAGE_PREFIX") &&
    source.includes("${projectId}"),
  selectedProjectKey: source.includes(
    "const freeStorageKey = projectMapFreeStorageKey(selectedProjectId);",
  ),
  loadHydration: source.includes(
    "setFreePositions(readProjectMapFreePositions(nextSelectedId));",
  ),
  focusHydration: source.includes(
    "setFreePositions(readProjectMapFreePositions(project.id));",
  ),
};

check(
  "PERSISTENCE_PER_PROJECT",
  Object.values(persistencePerProjectChecks).every(Boolean),
  JSON.stringify(persistencePerProjectChecks),
);

check("RESET_FREE_LAYOUT",
  source.includes("resetFreeLayout") &&
  source.includes("window.localStorage.removeItem"));

check("FREE_LAYOUT_HYDRATES_ON_PROJECT_SELECTION",
  source.includes("setFreePositions(readProjectMapFreePositions(nextSelectedId));") &&
  source.includes("setFreePositions(readProjectMapFreePositions(project.id));"));

check("NO_SYNC_FREE_STORAGE_SETSTATE_EFFECT",
  !source.includes("useEffect(() => {\n  if (!freeStorageKey)") &&
  source.includes("const freeStorageKey = projectMapFreeStorageKey(selectedProjectId);"));

check("NO_SYNC_STRUCTURED_EMPTY_SETSTATE_EFFECT",
  !source.includes("if (!structuredMetrics) {\n    setStructuredLayoutState") &&
  source.includes("!structuredMetrics || structuredLayoutState.key === structuredFlowKey"));

check("STRUCTURED_TERRITORIES",
  source.includes("STRUCTURED_SUBPROJECTS_ID") &&
  source.includes("STRUCTURED_WINDOWS_ID") &&
  source.includes("STRUCTURED_TASKS_ID") &&
  source.includes('"project-territory": ProjectTerritoryCard'));

check("STRUCTURED_DIRECT_PROJECT_LEVEL",
  source.includes("selectedProject.subprojectIds") &&
  source.includes("selectedProject.activities"));

check("SUBPROJECT_COMPOUND_TERRITORY",
  source.includes("parentId: STRUCTURED_SUBPROJECTS_ID"));

check("WINDOW_COMPOUND_TERRITORY",
  source.includes("parentId: STRUCTURED_WINDOWS_ID"));

check("TASK_COMPOUND_TERRITORY",
  source.includes("parentId: STRUCTURED_TASKS_ID"));

check("CONTAINED_TASK_REMAINS_IN_WINDOW",
  source.includes("parentId: windowNodeId"));

check("BOUNDED_LOCAL_GRID",
  source.includes("projectMapGrid(") &&
  source.includes("PROJECT_TERRITORY_GAP") &&
  source.includes("PROJECT_TERRITORY_PADDING"));

check("STRUCTURED_TOP_LEVEL_ELK",
  source.includes("layoutStructuredProjectTopLevel") &&
  source.includes('"elk.algorithm": "org.eclipse.elk.layered"') &&
  source.includes('"elk.edgeRouting": "ORTHOGONAL"'));

check("SUBPROJECT_FOCUS_PRESERVED",
  source.includes("onOpenProject: showProject"));

check("RECURSIVE_ACTIONS_PRESERVED",
  source.includes("onAddSubproject: openSubprojectCapture") &&
  source.includes("openTaskCapture(project.id, containerActivityEventId)"));

check("PROJECT_READS_DECOMPOSES_INTO",
  projectRoute.includes('relation_type_code", "decomposes_into"') &&
  projectRoute.includes("subprojectIds"));

check("SAME_SYSTEM_INTERMEDIATE_PARENT_GUARD",
  subprojectRoute.includes("Subproject must use the same active global system intermediate parent as the parent project.") &&
  subprojectRoute.includes("parentValueObjectId: systemParent.id"));

check("SUBPROJECT_PRIVATE_ACTOR_LEAF",
  subprojectRoute.includes('nodeRoleCode: "leaf"') &&
  subprojectRoute.includes('visibilityCode: "private"'));

check("PROJECT_HIERARCHY_DECOMPOSES_INTO",
  subprojectRoute.includes('relation_type_code: "decomposes_into"') &&
  subprojectRoute.includes("project_composition_relations"));

check("CYCLE_GUARD_PRESERVED",
  subprojectRoute.includes("wouldCreateProjectCycle") &&
  subprojectRoute.includes("PROJECT_SUBPROJECT_CYCLE_FORBIDDEN"));

check("NO_DIRECT_ONTOLOGY_PARENT_MUTATION",
  !source.includes(".update({ parent_value_object_id") &&
  !source.includes(".update({parent_value_object_id"));

const apiDiff = execFileSync("git", ["diff","--name-only","HEAD","--","src/app/api"], {cwd: repo, encoding:"utf8"}).trim();
check("NO_API_CHANGE", apiDiff.length === 0, apiDiff || "none");

const dbDiff = execFileSync("git", ["diff","--name-only","HEAD","--","supabase","migrations"], {cwd: repo, encoding:"utf8"}).trim();
check("NO_DB_MIGRATION", dbDiff.length === 0, dbDiff || "none");

const packageDiff = execFileSync("git", ["diff","--name-only","HEAD","--","package.json","package-lock.json"], {cwd: repo, encoding:"utf8"}).trim();
check("NO_DEPENDENCY_CHANGE", packageDiff.length === 0, packageDiff || "none");

console.log(`PROJECT_MAP_DUAL_VIEW_TERRITORIES_FREE_PERSISTENCE_VALIDATOR=PASS_${pass}/${pass + fail}`);
if (fail > 0) process.exit(1);

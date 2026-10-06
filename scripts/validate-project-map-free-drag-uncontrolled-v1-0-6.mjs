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
  "FREE_VIEW_UNCONTROLLED",
  source.includes("defaultNodes={freeNodes}") &&
    source.includes("defaultEdges={graphEdges}"),
);

check(
  "NO_PER_FRAME_PARENT_NODE_STATE",
  !source.includes("const handleFreeNodesChange = useCallback") &&
    !source.includes("onNodesChange={handleFreeNodesChange}") &&
    !source.includes("type NodeChange,"),
);

check(
  "PERSIST_ONLY_ON_DRAG_STOP",
  source.includes(
    "onNodeDragStop={(_, node) => persistFreeNodePosition(node)}",
  ) &&
    source.includes("window.localStorage.setItem"),
);

check(
  "DRAG_HANDLE_PRESERVED",
  source.includes('dragHandle: ".project-map-drag-handle"') &&
    source.includes("rounded-xl border border-[#d7e0f6] bg-white") &&
    (source.match(/border-l border-dashed border-\[#7f96dd\]/g)?.length ?? 0) >= 2,
);

check(
  "FREE_VIEW_CAMERA_STABLE",
  source.includes("autoPanOnNodeDrag={false}") &&
    source.includes("onInit={(instance) => {") &&
    source.includes(
      "instance.fitView({ padding: 0.24, minZoom: 0.32, maxZoom: 1.05 });",
    ),
);

check(
  "PERSISTENT_BROWSER_LAYOUT_PRESERVED",
  source.includes("PROJECT_MAP_FREE_STORAGE_PREFIX") &&
    source.includes("window.localStorage.getItem") &&
    source.includes("window.localStorage.setItem") &&
    source.includes("setFreePositions(readProjectMapFreePositions(nextSelectedId));") &&
    source.includes("setFreePositions(readProjectMapFreePositions(project.id));"),
);

check(
  "RESET_FREE_LAYOUT_PRESERVED",
  source.includes("resetFreeLayout") &&
    source.includes("window.localStorage.removeItem") &&
    source.includes("setFreeLayoutRevision((value) => value + 1)"),
);

check(
  "STRUCTURED_VIEW_PRESERVED",
  source.includes("structuredNodes") &&
    source.includes("structuredEdges") &&
    source.includes("STRUCTURED_SUBPROJECTS_ID") &&
    source.includes("STRUCTURED_WINDOWS_ID") &&
    source.includes("STRUCTURED_TASKS_ID"),
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
  `PROJECT_MAP_FREE_DRAG_UNCONTROLLED_VALIDATOR=PASS_${pass}/${pass + fail}`,
);

if (fail > 0) process.exit(1);

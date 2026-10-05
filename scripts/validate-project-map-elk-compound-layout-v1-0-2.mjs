import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const repo = process.cwd();
const sourcePath = path.join(repo, "src/app/projects/ProjectMapStartClient.tsx");
const packagePath = path.join(repo, "package.json");
const lockPath = path.join(repo, "package-lock.json");
const subprojectRoutePath = path.join(
  repo,
  "src/app/api/projects/subprojects/route.ts",
);

const source = fs.readFileSync(sourcePath, "utf8");
const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
const subprojectRoute = fs.readFileSync(subprojectRoutePath, "utf8");

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
  "ELK_DEPENDENCY_EXACT",
  pkg.dependencies?.elkjs === "0.12.0",
  String(pkg.dependencies?.elkjs ?? "missing"),
);

check(
  "ELK_LOCK_VERSION",
  lock.packages?.["node_modules/elkjs"]?.version === "0.12.0",
  String(lock.packages?.["node_modules/elkjs"]?.version ?? "missing"),
);

check(
  "ELK_BUNDLED_IMPORT",
  source.includes('import ELK from "elkjs/lib/elk.bundled.js";'),
);

check(
  "ELK_LAYERED_TOP_LEVEL",
  source.includes('"elk.algorithm": "org.eclipse.elk.layered"'),
);

check(
  "ELK_RECTPACKING_TIME_CONTAINER",
  source.includes('"elk.algorithm": "org.eclipse.elk.rectpacking"'),
);

check(
  "ORTHOGONAL_LAYOUT_ROUTING",
  source.includes('"elk.edgeRouting": "ORTHOGONAL"'),
);

check(
  "MODEL_ORDER_STABILITY",
  source.includes(
    '"elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES"',
  ) &&
    source.includes(
      '"elk.layered.crossingMinimization.forceNodeModelOrder": "true"',
    ),
);

check(
  "RECURSIVE_PROJECT_BRANCH",
  source.includes("collectVisibleProjectBranch") &&
    source.includes("for (const project of visibleProjects)"),
);

check(
  "SUBPROJECT_IS_BRANCH_ANCHOR",
  source.includes('project.id === selectedProject.id') &&
    source.includes(': `project-subproject:${project.id}`'),
);

check(
  "PROJECT_SCOPED_ACTIVITY_PLACEMENTS",
  source.includes("`project-activity:${project.id}:${activity.id}`") &&
    source.includes("`project-activity:${project.id}:${container.id}`"),
);

check(
  "TRUE_REACT_FLOW_CONTAINER_PARENT",
  source.includes("parentId: containerNodeId") &&
    source.includes('extent: "parent"'),
);

check(
  "CONTAINED_ACTIVITY_PLACEMENT_IS_CONTEXT_SCOPED",
  source.includes(
    "`project-contained-activity:${project.id}:${container.id}:${childActivity.id}`",
  ),
);

check(
  "CONTAINMENT_RENDERED_BY_NESTING",
  !source.includes('className="mt-4 grid grid-cols-2 gap-2"'),
);

check(
  "DECOMPOSITION_EDGE_PER_PROJECT",
  source.includes(
    "`project-decomposition:${project.id}:${childProjectId}`",
  ) &&
    source.includes("target: `project-subproject:${childProjectId}`"),
);

check(
  "NO_SINGLE_SHARED_VERTICAL_MANUAL_LAYOUT",
  !source.includes("x: 145 + (index % 3) * 335") &&
    !source.includes("containerBaseY = 525 + subprojectRows * 145") &&
    !source.includes("standaloneBaseY"),
);

check(
  "ASYNC_LAYOUT_READY_GATE",
  source.includes("layoutReady = layoutState.key === flowKey") &&
    source.includes("nodes={layoutedNodes}") &&
    source.includes("edges={graphEdges}"),
);

check(
  "ELK_RUNTIME_FALLBACK",
  source.includes("fallbackProjectMapLayout") &&
    source.includes(
      ".catch(() => fallbackProjectMapLayout(nodesForLayout, edgesForLayout))",
    ),
);

check(
  "NO_DEAD_BLUR_REF_TAINT",
  !source.includes("blurTimerRef"),
);

check(
  "NO_RENDER_MEMO_NODE_ARRAY_REF_TAINT",
  !source.includes("const graphNodes = useMemo<Node[]>") &&
    !source.includes("const graphEdges = useMemo<Edge[]>") &&
    !source.includes("const layoutedNodes = useMemo("),
);

check(
  "ELK_ROOT_RESULT_DIMENSIONS_TYPED",
  source.includes("const packedResult = packed as unknown as {") &&
    source.includes("packedResult.width ?? PROJECT_TIME_CONTAINER_MIN_WIDTH") &&
    source.includes("packedResult.height ?? PROJECT_TIME_CONTAINER_EMPTY_HEIGHT") &&
    source.includes("for (const child of packedResult.children ?? [])") &&
    !source.includes("packed.width ?? PROJECT_TIME_CONTAINER_MIN_WIDTH") &&
    !source.includes("packed.height ?? PROJECT_TIME_CONTAINER_EMPTY_HEIGHT"),
);

check(
  "RECURSIVE_ACTION_CONTEXT_PRESERVED",
  source.includes("openTaskCapture(project.id, containerActivityEventId)") &&
    source.includes("onAddSubproject: openSubprojectCapture"),
);

check(
  "ONTOLOGY_SAME_SYSTEM_INTERMEDIATE_PARENT_GUARD_PRESERVED",
  subprojectRoute.includes(
    "Subproject must use the same active global system intermediate parent as the parent project.",
  ) &&
    subprojectRoute.includes(
      'errorCode: "PROJECT_SUBPROJECT_SYSTEM_INTERMEDIATE_REQUIRED"',
    ),
);

check(
  "NEW_SUBPROJECT_REMAINS_PERSONAL_LEAF",
  subprojectRoute.includes('nodeRoleCode: "leaf"') &&
    subprojectRoute.includes("parentValueObjectId: systemParent.id") &&
    subprojectRoute.includes('visibilityCode: "private"'),
);

check(
  "PROJECT_HIERARCHY_REMAINS_DECOMPOSITION_RELATION",
  subprojectRoute.includes('relation_type_code: "decomposes_into"') &&
    subprojectRoute.includes("project_composition_relations"),
);

check(
  "PROJECT_CYCLE_GUARD_PRESERVED",
  subprojectRoute.includes("wouldCreateProjectCycle") &&
    subprojectRoute.includes("PROJECT_SUBPROJECT_CYCLE_FORBIDDEN"),
);

check(
  "NO_DIRECT_VALUE_OBJECT_PARENT_MUTATION_IN_PROJECT_MAP",
  !source.includes(".update({ parent_value_object_id") &&
    !source.includes(".update({parent_value_object_id"),
);

const apiDiff = execFileSync(
  "git",
  ["diff", "--name-only", "HEAD", "--", "src/app/api"],
  { cwd: repo, encoding: "utf8" },
)
  .trim()
  .split(/\r?\n/)
  .filter(Boolean);

check("NO_PROJECT_API_CHANGE", apiDiff.length === 0, apiDiff.join(",") || "none");

const dbDiff = execFileSync(
  "git",
  ["diff", "--name-only", "HEAD", "--", "supabase", "migrations"],
  { cwd: repo, encoding: "utf8" },
)
  .trim()
  .split(/\r?\n/)
  .filter(Boolean);

check("NO_DB_MIGRATION", dbDiff.length === 0, dbDiff.join(",") || "none");

console.log(
  `PROJECT_MAP_ELK_HIERARCHICAL_COMPOUND_VALIDATOR=PASS_${pass}/${pass + fail}`,
);

if (fail > 0) {
  process.exit(1);
}

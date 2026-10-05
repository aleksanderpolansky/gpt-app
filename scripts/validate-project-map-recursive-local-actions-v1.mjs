import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const repoPath = path.resolve(process.argv[2] || process.cwd());
const clientPath = path.join(
  repoPath,
  "src/app/projects/ProjectMapStartClient.tsx",
);
const subprojectRoutePath = path.join(
  repoPath,
  "src/app/api/projects/subprojects/route.ts",
);

const client = fs.readFileSync(clientPath, "utf8").replace(/\r\n/g, "\n");
const subprojectRoute = fs
  .readFileSync(subprojectRoutePath, "utf8")
  .replace(/\r\n/g, "\n");

const results = [];
let failed = false;

function pass(name, condition, detail = "") {
  if (condition) {
    results.push(`PASS ${name}${detail ? ` :: ${detail}` : ""}`);
  } else {
    failed = true;
    results.push(`FAIL ${name}${detail ? ` :: ${detail}` : ""}`);
  }
}

function count(text, needle) {
  return text.split(needle).length - 1;
}

pass(
  "SUBPROJECT_NODE_HAS_FOUR_LOCAL_ACTIONS",
  client.includes("data.onAddSubproject(data.project.id)") &&
    client.includes("data.onAddTask(data.project.id)") &&
    client.includes("data.onAddDateWindow(data.project.id)") &&
    client.includes("data.onAddTimeWindow(data.project.id)"),
);
pass(
  "ACTION_PROJECT_CONTEXT_STATE",
  client.includes("actionProjectId") &&
    client.includes("const actionProject = useMemo("),
);
pass(
  "TASK_ACTION_USES_TARGET_PROJECT",
  client.includes("const openTaskCapture = useCallback((") &&
    client.includes("setActionProjectId(projectId);") &&
    count(client, "const project = actionProject;") === 2,
);
pass(
  "WINDOW_ACTION_USES_TARGET_PROJECT",
  client.includes(
    'kind: "date_range" | "time_of_day",\n  ) => {\n    if (!projectId) return;\n    setActionProjectId(projectId);',
  ),
);
pass(
  "SUBPROJECT_ACTION_USES_TARGET_PROJECT",
  client.includes("const parentProject = actionProject;") &&
    client.includes("parentProjectContextId: parentProject.id"),
);
pass(
  "ACTION_MODAL_SHOWS_TARGET_PROJECT",
  count(client, "{copy.projectLabel}: {actionProject.title}") === 2 &&
    client.includes("subprojectCaptureOpen && actionProject") &&
    client.includes("windowCaptureKind && actionProject") &&
    client.includes("taskCaptureOpen && actionProject"),
);
pass(
  "TARGET_PROJECT_ROUTE_SYNC",
  client.includes(
    '"/projects?project=" + encodeURIComponent(parentProject.id)',
  ) &&
    count(
      client,
      '"/projects?project=" + encodeURIComponent(project.id)',
    ) === 2,
);
pass(
  "CONTAINED_TASK_RETAINS_PROJECT_CONTEXT",
  count(
    client,
    "openTaskCapture(selectedProject.id, containerActivityEventId)",
  ) === 2,
);

// Ontology integrity: a subproject is another personal leaf under the SAME
// global system intermediate structural parent. Project hierarchy lives only
// in the project composition graph.
pass(
  "PARENT_PROJECT_ROOT_IS_PERSONAL_LEAF",
  subprojectRoute.includes('parentLeaf.scope_code !== "actor"') &&
    subprojectRoute.includes(
      'parentLeaf.ontology_node_role_code !== "leaf"',
    ) &&
    subprojectRoute.includes('visibility !== "private"'),
);
pass(
  "SAME_SYSTEM_INTERMEDIATE_PARENT_REQUIRED",
  subprojectRoute.includes(
    "const systemParentId = parentLeaf.parent_value_object_id;",
  ) &&
    subprojectRoute.includes('systemParent.scope_code !== "global"') &&
    subprojectRoute.includes(
      'systemParent.ontology_node_role_code !== "intermediate"',
    ) &&
    subprojectRoute.includes(
      'systemParent.origin_type_code !== "system_model"',
    ),
);
pass(
  "NEW_SUBPROJECT_IS_PERSONAL_LEAF",
  subprojectRoute.includes('nodeRoleCode: "leaf"') &&
    subprojectRoute.includes("parentValueObjectId: systemParent.id") &&
    subprojectRoute.includes('hierarchyRelationCode: "part_of"') &&
    subprojectRoute.includes("allowGlobalSystemParent: true") &&
    subprojectRoute.includes('visibilityCode: "private"'),
);
pass(
  "CANONICAL_ONTOLOGY_RPC_REUSED",
  subprojectRoute.includes('"create_value_object_ontology_v1"') &&
    subprojectRoute.includes('"set_value_object_ontology_lifecycle_v1"'),
);
pass(
  "PROJECT_HIERARCHY_IS_DECOMPOSITION_RELATION",
  subprojectRoute.includes('.from("project_composition_relations")') &&
    subprojectRoute.includes('relation_type_code: "decomposes_into"') &&
    subprojectRoute.includes(
      "parent_value_object_id: parentProject.root_value_object_id",
    ) &&
    subprojectRoute.includes(
      "child_value_object_id: childRootValueObjectId",
    ),
);
pass(
  "PROJECT_CYCLE_GUARD_PRESERVED",
  subprojectRoute.includes("wouldCreateProjectCycle(") &&
    subprojectRoute.includes("PROJECT_SUBPROJECT_CYCLE_FORBIDDEN"),
);
pass(
  "NO_DIRECT_VALUE_OBJECT_PARENT_MUTATION",
  !/\.from\("value_objects"\)[\s\S]{0,400}\.update\([\s\S]{0,220}parent_value_object_id/.test(
    subprojectRoute,
  ),
);

let changedFiles = "";
try {
  changedFiles = execFileSync(
    "git",
    ["diff", "--name-only", "--", "supabase/migrations"],
    { cwd: repoPath, encoding: "utf8" },
  ).trim();
} catch {
  changedFiles = "GIT_DIFF_CHECK_FAILED";
}
pass("NO_DB_MIGRATION", changedFiles === "", changedFiles || "none");

for (const result of results) console.log(result);
console.log(
  `PROJECT_MAP_RECURSIVE_LOCAL_ACTIONS_VALIDATOR=${
    failed ? "FAIL" : `PASS_${results.length}/${results.length}`
  }`,
);

if (failed) process.exit(1);

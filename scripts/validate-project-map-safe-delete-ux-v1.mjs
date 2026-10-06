import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const repo = process.cwd();
const mapPath = "src/app/projects/ProjectMapStartClient.tsx";
const projectRoutePath = "src/app/api/projects/route.ts";
const timeRoutePath = "src/app/api/projects/time-containers/route.ts";
const taskDeleteRoutePath =
  "src/app/api/calendar/task-shelf/[activityEventId]/route.ts";
const subprojectRoutePath = "src/app/api/projects/subprojects/route.ts";

const map = fs.readFileSync(path.join(repo, mapPath), "utf8");
const projectRoute = fs.readFileSync(path.join(repo, projectRoutePath), "utf8");
const timeRoute = fs.readFileSync(path.join(repo, timeRoutePath), "utf8");
const taskRoute = fs.readFileSync(path.join(repo, taskDeleteRoutePath), "utf8");
const subprojectRoute = fs.readFileSync(path.join(repo, subprojectRoutePath), "utf8");

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
  "DELETE_PENDING_OVERLAY",
  map.includes("LoaderCircle") &&
    map.includes("deletingEntityKey") &&
    map.includes("cursor-wait") &&
    map.includes("safeDeleteCopy.deleting"),
);

check(
  "TASK_DELETE_VIEWPORT_PRESERVE",
  map.includes('setDeletingEntityKey(`task:${activityEventId}`)') &&
    map.includes("preserveViewport: true") &&
    map.includes("captureMutationViewport()"),
);

check(
  "FREE_VIEWPORT_RESTORE",
  map.includes("freeRestoreViewport") &&
    map.includes("instance.setViewport(freeRestoreViewport") &&
    map.includes("setFreeViewport(instance.getViewport())"),
);

check(
  "STRUCTURED_VIEWPORT_RESTORE_PRESERVED",
  map.includes("structuredRestoreViewport") &&
    map.includes("instance.setViewport(") &&
    map.includes("setStructuredRestoreViewport({ ...structuredViewport })"),
);

check(
  "PROJECT_DELETE_X",
  map.includes("data.deleteCopy.deleteProject") &&
    map.includes('deleteProjectContext(selectedProject.id, "project")'),
);

check(
  "SUBPROJECT_DELETE_X",
  map.includes("data.deleteCopy.deleteSubproject") &&
    map.includes('deleteProjectContext(projectId, "subproject")'),
);

check(
  "TIME_WINDOW_DELETE_X",
  map.includes("data.deleteCopy.deleteTimeWindow") &&
    map.includes("deleteTimeContainer(project.id, activityEventId)"),
);

check(
  "PROJECT_DELETE_API",
  projectRoute.includes("export async function DELETE(request: Request)") &&
    projectRoute.includes('errorCode: "PROJECT_DELETE_BLOCKED"') &&
    projectRoute.includes('status_code: "archived"') &&
    projectRoute.includes("rootValueObjectPreserved: true"),
);

check(
  "PROJECT_DELETE_GUARDS",
  projectRoute.includes('.from("project_activity_links")') &&
    projectRoute.includes('.from("activity_event_relations")') &&
    projectRoute.includes('.from("project_composition_relations")') &&
    projectRoute.includes("parentProjects > 1") &&
    projectRoute.includes("otherProjectContexts > 0"),
);

check(
  "PROJECT_DELETE_CLASSIFIES_TASKS_WINDOWS",
  projectRoute.includes("readProjectPlanningTimeContainerV1(activity.metadata_json)") &&
    projectRoute.includes("timeWindows += 1") &&
    projectRoute.includes("tasks += 1"),
);

check(
  "SUBPROJECT_PARENT_RELATION_DEACTIVATED_ONLY_WHEN_SINGLE",
  projectRoute.includes("parentRelations.length === 1") &&
    projectRoute.includes('status_code: "inactive"'),
);

check(
  "ONTOLOGY_ROOT_PRESERVED",
  projectRoute.includes("rootValueObjectPreserved: true") &&
    !projectRoute.includes('.from("value_objects")\n    .delete('),
);

check(
  "TIME_WINDOW_DELETE_API",
  timeRoute.includes("export async function DELETE(request: Request)") &&
    timeRoute.includes('errorCode: "TIME_CONTAINER_DELETE_BLOCKED"') &&
    timeRoute.includes('disposition: "time_container_removed"'),
);

check(
  "TIME_WINDOW_DEBT_GUARDS",
  timeRoute.includes("containedTasks") &&
    timeRoute.includes("otherProjectMemberships") &&
    timeRoute.includes("recurrenceRules") &&
    timeRoute.includes("fulfillments"),
);

check(
  "TIME_WINDOW_AUDIT_PRESERVED",
  timeRoute.includes('status: "cancelled"') &&
    timeRoute.includes('status_code: "inactive"') &&
    timeRoute.includes("auditRowPreserved: true") &&
    !timeRoute.includes('.from("activity_events")\n    .delete('),
);

check(
  "TASK_DELETE_ROUTE_PRESERVED",
  taskRoute.includes('disposition: "whole_task_removed"') &&
    taskRoute.includes("auditRowsPreserved: true"),
);

check(
  "PROJECT_HIERARCHY_STILL_CONTEXTUAL",
  subprojectRoute.includes('relation_type_code: "decomposes_into"') &&
    subprojectRoute.includes("parentValueObjectId: systemParent.id"),
);

check(
  "SAME_SYSTEM_INTERMEDIATE_PARENT_GUARD",
  subprojectRoute.includes(
    "Subproject must use the same active global system intermediate parent as the parent project.",
  ),
);

check(
  "NO_DB_MIGRATION",
  execFileSync("git", ["diff", "--name-only", "HEAD", "--", "supabase", "migrations"], {
    cwd: repo,
    encoding: "utf8",
  }).trim() === "",
);

check(
  "NO_DEPENDENCY_CHANGE",
  execFileSync("git", ["diff", "--name-only", "HEAD", "--", "package.json", "package-lock.json"], {
    cwd: repo,
    encoding: "utf8",
  }).trim() === "",
);

const apiDiff = execFileSync("git", ["diff", "--name-only", "HEAD", "--", "src/app/api"], {
  cwd: repo,
  encoding: "utf8",
}).trim().split(/\r?\n/).filter(Boolean).sort();

check(
  "ONLY_INTENDED_API_CHANGES",
  apiDiff.length === 2 &&
    apiDiff[0] === projectRoutePath &&
    apiDiff[1] === timeRoutePath,
  apiDiff.join(","),
);

console.log(
  `PROJECT_MAP_SAFE_DELETE_UX_V1_VALIDATOR=PASS_${pass}/${pass + fail}`,
);

if (fail > 0) process.exit(1);

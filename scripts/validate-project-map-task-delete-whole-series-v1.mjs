import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const repo = process.cwd();

const projectMapPath =
  "src/app/projects/ProjectMapStartClient.tsx";
const modalPath =
  "src/components/calendar/cux6-task-detail-modal.tsx";
const deleteRoutePath =
  "src/app/api/calendar/task-shelf/[activityEventId]/route.ts";

const projectMap = fs.readFileSync(
  path.join(repo, projectMapPath),
  "utf8",
);
const modal = fs.readFileSync(
  path.join(repo, modalPath),
  "utf8",
);
const route = fs.readFileSync(
  path.join(repo, deleteRoutePath),
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
  "DIRECT_MAP_DELETE_X",
  projectMap.includes("void data.onDeleteActivity(data.activity.id);") &&
    projectMap.includes("<X size={13} strokeWidth={2.2} />") &&
    projectMap.includes("data.copy.deleteTask"),
);

check(
  "MAP_DELETE_CONFIRMATION",
  projectMap.includes("window.confirm(copy.confirmDeleteTask)") &&
    projectMap.includes(
      "Для повторяющейся задачи будут удалены вся серия и будущие плановые экземпляры.",
    ),
);

check(
  "MAP_DELETE_REFRESH",
  projectMap.includes("async function deleteProjectActivity(activityEventId: string)") &&
    projectMap.includes("await loadProjects(selectedProjectId ?? undefined") &&
    projectMap.includes("window.dispatchEvent(new Event(PROJECTS_CHANGED_EVENT))"),
);

check(
  "ALL_TASK_NODE_KINDS_WIRED",
  (projectMap.match(/onDeleteActivity: deleteProjectActivity,/g)?.length ?? 0) === 3,
);

check(
  "MODAL_DELETE_COPY",
  modal.includes('cancel: "Удалить задачу"') &&
    modal.includes("async function deleteTask()") &&
    modal.includes("onClick={() => void deleteTask()}"),
);

check(
  "OLD_CANCEL_ERROR_REMOVED",
  !route.includes("Only active planned activities can be cancelled."),
);

check(
  "WHOLE_TASK_SCOPE_RESOLUTION",
  route.includes("type WholeTaskDeletionScope = {") &&
    route.includes("resolveWholeTaskDeletionScope") &&
    route.includes("materialized_activity_event_id") &&
    route.includes("source_activity_event_id"),
);

check(
  "RECURRENCE_SERIES_ENDED",
  route.includes('.from("activity_recurrence_rules")') &&
    route.includes('status_code: "ended"') &&
    route.includes('.in("status_code", ["active", "paused"])'),
);

check(
  "RECURRENCE_OCCURRENCES_CANCELLED",
  route.includes('.from("activity_recurrence_occurrences")') &&
    route.includes('status_code: "cancelled"') &&
    route.includes('.in("status_code", ["active", "rescheduled"])'),
);

check(
  "PROJECT_MEMBERSHIPS_DEACTIVATED",
  route.includes('.from("project_activity_links")') &&
    route.includes('status_code: "inactive"') &&
    route.includes('.in("activity_event_id", params.activityEventIds)'),
);

check(
  "PROJECT_RELATIONS_DEACTIVATED",
  route.includes('.from("activity_event_relations")') &&
    route.includes('.in("source_activity_event_id", params.activityEventIds)') &&
    route.includes('.in("target_activity_event_id", params.activityEventIds)'),
);

check(
  "CALENDAR_PROJECTIONS_CANCELLED",
  route.includes('.from("calendar_events")') &&
    route.includes('.in("related_activity_event_id", params.activityEventIds)'),
);

check(
  "AUDIT_ROWS_PRESERVED",
  route.includes('disposition: "whole_task_removed"') &&
    route.includes("auditRowsPreserved: true") &&
    !route.includes('.from("activity_events")\n    .delete('),
);

check(
  "RETRY_SAFE_PARTIAL_CLEANUP",
  route.includes("retrySafe: true") &&
    route.includes("deactivate_project_memberships"),
);

check(
  "PROJECT_READS_ACTIVE_MEMBERSHIP_ONLY",
  projectRoute.includes('.from("project_activity_links")') &&
    projectRoute.includes('.eq("status_code", "active")'),
);

check(
  "PROJECT_HIERARCHY_DECOMPOSES_INTO",
  projectRoute.includes('relation_type_code", "decomposes_into"') &&
    subprojectRoute.includes('relation_type_code: "decomposes_into"'),
);

check(
  "SAME_SYSTEM_INTERMEDIATE_PARENT_GUARD",
  subprojectRoute.includes(
    "Subproject must use the same active global system intermediate parent as the parent project.",
  ) &&
    subprojectRoute.includes("parentValueObjectId: systemParent.id"),
);

check(
  "NO_DIRECT_ONTOLOGY_PARENT_MUTATION",
  !projectMap.includes(".update({ parent_value_object_id") &&
    !projectMap.includes(".update({parent_value_object_id"),
);

const changedApi = execFileSync(
  "git",
  ["diff", "--name-only", "HEAD", "--", "src/app/api"],
  { cwd: repo, encoding: "utf8" },
)
  .trim()
  .split(/\r?\n/)
  .filter(Boolean)
  .sort();

check(
  "ONLY_INTENDED_API_CHANGE",
  changedApi.length === 1 &&
    changedApi[0] === deleteRoutePath,
  changedApi.join(",") || "none",
);

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
  `PROJECT_MAP_TASK_DELETE_WHOLE_SERIES_VALIDATOR=PASS_${pass}/${pass + fail}`,
);

if (fail > 0) {
  process.exit(1);
}

import fs from "node:fs";

const files = {
  projectClient: "src/app/projects/ProjectMapStartClient.tsx",
  projectsApi: "src/app/api/projects/route.ts",
  activityApi: "src/app/api/activity/events/route.ts",
  calendarAdd: "src/app/calendar/add/add-activity-client.tsx",
  activityReview:
    "src/app/calendar/activity-review/activity-review-client.tsx",
};

function read(path) {
  if (!fs.existsSync(path)) throw new Error(`MISSING_FILE:${path}`);
  return fs.readFileSync(path, "utf8");
}

const source = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, read(path)]),
);

const checks = [];

function check(name, ok) {
  if (!ok) throw new Error(`FAIL ${name}`);
  console.log(`PASS ${name}`);
  checks.push(name);
}

check(
  "PROJECT_ADD_TASK_ACTION",
  source.projectClient.includes("addProjectActivity") &&
    source.projectClient.includes("returnTo=project") &&
    source.projectClient.includes("projectId="),
);

check(
  "PROJECT_ACTIVITY_NODE",
  source.projectClient.includes('"project-activity": ProjectActivityCard') &&
    source.projectClient.includes("selectedProject?.activities"),
);

check(
  "PROJECT_ACTIVITY_EDGES",
  source.projectClient.includes("project-to-activity:") &&
    source.projectClient.includes("edges={edges}"),
);

check(
  "PROJECT_API_READS_ACTIVITY_LINKS",
  source.projectsApi.includes('.from("project_activity_links")') &&
    source.projectsApi.includes('.eq("status_code", "active")'),
);

check(
  "PROJECT_API_READS_ACTIVITY_EVENTS",
  source.projectsApi.includes('.from("activity_events")') &&
    source.projectsApi.includes("schedule_mode_code") &&
    source.projectsApi.includes("duration_minutes"),
);

check(
  "ACTIVITY_API_ACCEPTS_PROJECT",
  source.activityApi.includes("projectContextId?: unknown") &&
    source.activityApi.includes("PROJECT_ACTIVITY_CONTEXT_NOT_AVAILABLE"),
);

check(
  "ACTIVITY_API_VALIDATES_PROJECT_OWNER",
  source.activityApi.includes('.eq("owner_user_id", appUser.id)') &&
    source.activityApi.includes('.eq("owner_actor_id", personActor.id)'),
);

check(
  "ACTIVITY_API_WRITES_PROJECT_LINK",
  source.activityApi.includes('.from("project_activity_links")') &&
    source.activityApi.includes('provenance_code: "manual"') &&
    source.activityApi.includes('ui_origin: "project_activity_intake_v1"'),
);

check(
  "CALENDAR_ADD_PROJECT_RETURN",
  source.calendarAdd.includes('| "project";') &&
    source.calendarAdd.includes('pathname: "/projects"') &&
    source.calendarAdd.includes('params.set("projectId", projectId)'),
);

check(
  "ACTIVITY_REVIEW_PROJECT_RETURN",
  source.activityReview.includes('| "project";') &&
    source.activityReview.includes("projectContextId: projectId") &&
    source.activityReview.includes('pathname: "/projects"'),
);

check(
  "NO_NEW_TASK_ENTITY",
  !source.projectsApi.includes("project_tasks") &&
    !source.activityApi.includes("project_tasks"),
);

check(
  "USES_EXISTING_PROJECT_ACTIVITY_LINKS",
  source.projectsApi.includes("project_activity_links") &&
    source.activityApi.includes("project_activity_links"),
);

console.log(`VALIDATOR=PASS_${checks.length}/${checks.length}`);

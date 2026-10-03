import fs from "node:fs";

const files = {
  projectMap: "src/app/projects/ProjectMapStartClient.tsx",
  provider: "src/components/app-shell/ai-navigator-provider.tsx",
  navigator: "src/components/app-shell/global-ai-navigator.tsx",
  quickCapture: "src/app/api/activity/quick-capture/route.ts",
  journal: "src/app/activity-today/page.tsx",
  calendar: "src/app/calendar-rebuild/CalendarRebuildClient.tsx",
  activityApi: "src/app/api/activity/events/route.ts",
};

function read(path) {
  if (!fs.existsSync(path)) throw new Error(`MISSING_FILE:${path}`);
  return fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

const s = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, read(path)]),
);

const checks = [];

function check(name, ok) {
  if (!ok) throw new Error(`FAIL ${name}`);
  console.log(`PASS ${name}`);
  checks.push(name);
}

check(
  "PROJECT_ADD_TASK_USES_AI_NAVIGATOR",
  s.projectMap.includes("prepareActivityCapture({") &&
    s.projectMap.includes('mode: "future"') &&
    s.projectMap.includes("projectContext:"),
);

check(
  "PROJECT_ADD_TASK_NO_LEGACY_CALENDAR_ADD",
  !s.projectMap.includes("/calendar/add?returnTo=project"),
);

check(
  "PROJECT_REFRESHES_AFTER_CURRENT_CAPTURE",
  s.projectMap.includes("arctor:project-activity-created") &&
    s.projectMap.includes("void loadProjects(selectedProjectId)"),
);

check(
  "NAVIGATOR_HAS_PROJECT_ACTIVITY_CONTEXT",
  s.provider.includes("AiNavigatorProjectActivityContext") &&
    s.provider.includes("activityProjectContext") &&
    s.provider.includes("prepareActivityCapture"),
);

check(
  "NAVIGATOR_SENDS_PROJECT_CONTEXT",
  s.provider.includes("projectContextAtSubmit?.id ?? null") &&
    s.provider.includes('formData.set("projectContextId", projectContextId)') &&
    s.provider.includes("projectContextId,"),
);

check(
  "NAVIGATOR_DISPATCHES_PROJECT_ACTIVITY_CREATED",
  s.provider.includes('new CustomEvent("arctor:project-activity-created"') &&
    s.provider.includes("activityEventIds?.[0]"),
);

check(
  "RIGHT_RAIL_SHOWS_PROJECT_CONTEXT",
  s.navigator.includes('navigationT("navigation.projects")') &&
    s.navigator.includes("activityProjectContext.title"),
);

check(
  "QUICK_CAPTURE_ACCEPTS_PROJECT_CONTEXT",
  s.quickCapture.includes("projectContextId?: unknown") &&
    s.quickCapture.includes('formData.get("projectContextId")') &&
    s.quickCapture.includes("projectContextId must be a valid UUID"),
);

check(
  "QUICK_CAPTURE_ONLY_PROJECTS_PLANNED_ACTIVITY",
  s.quickCapture.includes(
    "projectContextId is only supported for planned activity capture",
  ),
);

check(
  "QUICK_CAPTURE_PASSES_PROJECT_TO_CANONICAL_EVENT_WRITE",
  s.quickCapture.includes(
    "...(projectContextId ? { projectContextId } : {}),",
  ),
);

check(
  "CANONICAL_ACTIVITY_API_STILL_WRITES_PROJECT_LINK",
  s.activityApi.includes('.from("project_activity_links")') &&
    s.activityApi.includes("projectContextId"),
);

check(
  "JOURNAL_ADD_USES_CURRENT_AI_CHANNEL",
  s.journal.includes("addActivityViaNavigator") &&
    s.journal.includes('prepareActivityCapture({ mode: "past" })') &&
    !s.journal.includes('const addHref = `/calendar/add?'),
);

check(
  "JOURNAL_ACTIVITY_DETAILS_USE_CURRENT_ANALYSIS",
  s.journal.includes("/activity-ai-lab?") &&
    !s.journal.includes('containerHref: `/calendar/activity-review?'),
);

check(
  "CALENDAR_ADD_USES_CURRENT_AI_CHANNEL",
  s.calendar.includes('prepareActivityCapture({ mode: "future" })'),
);

check(
  "CALENDAR_ACTIVITY_DETAILS_USE_CURRENT_ANALYSIS",
  s.calendar.includes("/activity-ai-lab?") &&
    !s.calendar.includes('pathname: "/calendar/activity-review"'),
);

check(
  "NO_NEW_TASK_ENTITY",
  !Object.values(s).some((value) => value.includes("project_tasks")),
);

console.log(`VALIDATOR=PASS_${checks.length}/${checks.length}`);

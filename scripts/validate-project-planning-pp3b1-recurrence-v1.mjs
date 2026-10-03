import fs from "node:fs";

const files = {
  migration: "supabase/migrations/20261003160000_activity_recurrence_rules_pp3b1.sql",
  recurrence: "src/lib/activity/pp3/activityRecurrence.ts",
  quickCapture: "src/app/api/activity/quick-capture/route.ts",
  projectsApi: "src/app/api/projects/route.ts",
  projectClient: "src/app/projects/ProjectMapStartClient.tsx",
  activityTypes: "src/types/activity-model-pp1.ts",
};

function read(path) {
  if (!fs.existsSync(path)) throw new Error(`MISSING_FILE:${path}`);
  return fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

const s = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, read(path)]),
);

let passed = 0;

function check(name, ok) {
  if (!ok) throw new Error(`FAIL ${name}`);
  console.log(`PASS ${name}`);
  passed += 1;
}

check(
  "RECURRENCE_TABLE_ADDITIVE",
  s.migration.includes("create table public.activity_recurrence_rules") &&
    s.migration.includes("source_activity_event_id uuid not null") &&
    s.migration.includes("references public.activity_events(id)"),
);

check(
  "RECURRENCE_ONLY_PLANNED_GUARD",
  s.migration.includes("PP3B1_RECURRENCE_REQUIRES_PLANNED_ACTIVITY") &&
    s.migration.includes("activity_role_code <> 'planned'"),
);

check(
  "RECURRENCE_OWNER_GUARD",
  s.migration.includes("PP3B1_RECURRENCE_OWNER_MISMATCH"),
);

check(
  "RECURRENCE_RLS_SERVICE_ROLE_ONLY",
  s.migration.includes("activity_recurrence_rules_no_direct_public_pp3b1") &&
    s.migration.includes("activity_recurrence_rules_service_role_all_pp3b1"),
);

check(
  "RECURRENCE_PARSER_DAILY_WEEKLY_MONTHLY",
  s.recurrence.includes('"daily"') &&
    s.recurrence.includes('"weekly"') &&
    s.recurrence.includes('"monthly"') &&
    s.recurrence.includes("inferActivityRecurrenceDraftPp3"),
);

check(
  "RECURRENCE_MULTILINGUAL",
  [
    "каждую неделю",
    "щотижня",
    "co tydzień",
    "every week",
    "jede woche",
    "cada semana",
    "každý týden",
  ].every((value) => s.recurrence.toLocaleLowerCase().includes(value)),
);

check(
  "QUICK_CAPTURE_DETECTS_RECURRENCE",
  s.quickCapture.includes("inferActivityRecurrenceDraftPp3") &&
    s.quickCapture.includes('temporalDirection === "future"'),
);

check(
  "QUICK_CAPTURE_PERSISTS_RECURRENCE",
  s.quickCapture.includes('.from("activity_recurrence_rules")') &&
    s.quickCapture.includes("persistActivityRecurrenceRulePp3"),
);

check(
  "QUICK_CAPTURE_CANONICAL_EVENT_FIRST",
  s.quickCapture.indexOf("authenticatedActivityEventCreate") <
    s.quickCapture.lastIndexOf("persistActivityRecurrenceRulePp3"),
);

check(
  "PROJECT_API_READS_RECURRENCE",
  s.projectsApi.includes('.from("activity_recurrence_rules")') &&
    s.projectsApi.includes("projectRecurrenceByActivityId"),
);

check(
  "PROJECT_API_RETURNS_RECURRENCE",
  s.projectsApi.includes("frequencyCode: recurrence.frequency_code") &&
    s.projectsApi.includes("intervalCount: recurrence.interval_count"),
);

check(
  "PROJECT_MAP_SHOWS_RECURRENCE",
  s.projectClient.includes("projectActivityRecurrenceLabel") &&
    s.projectClient.includes('"Каждую неделю"') &&
    s.projectClient.includes('"Every week"'),
);

check(
  "RECURRENCE_NOT_SCHEDULE_MODE",
  !s.activityTypes.includes('"recurring"') &&
    !s.activityTypes.includes('"recurrence"'),
);

check(
  "NO_PROJECT_TASK_ENTITY",
  !Object.values(s).some((value) => value.includes("project_tasks")),
);

check(
  "NO_OCCURRENCE_MATERIALIZATION_YET",
  !s.migration.includes("activity_recurrence_occurrences") &&
    !s.migration.includes("materialize_activity_recurrence_rule_pp3b2"),
);

console.log(`VALIDATOR=PASS_${passed}/${passed}`);

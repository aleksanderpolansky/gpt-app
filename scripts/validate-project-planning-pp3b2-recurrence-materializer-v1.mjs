import fs from "node:fs";

const files = {
  migration: "supabase/migrations/20261003190000_activity_recurrence_occurrences_pp3b2.sql",
  materializer: "src/lib/activity/pp3/activityRecurrenceMaterializer.server.ts",
  quickCapture: "src/app/api/activity/quick-capture/route.ts",
  projectsApi: "src/app/api/projects/route.ts",
  projectMap: "src/app/projects/ProjectMapStartClient.tsx",
  taskShelf: "src/app/api/calendar/task-shelf/route.ts",
  pp3b1Validator: "scripts/validate-project-planning-pp3b1-recurrence-v1.mjs",
  hotfixValidator: "scripts/validate-pp3b1-production-smoke-hotfix-v1.mjs",
};

function read(path) {
  if (!fs.existsSync(path)) throw new Error(`MISSING_FILE:${path}`);
  return fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

const s = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, read(file)]),
);

let passed = 0;
function check(name, condition) {
  if (!condition) throw new Error(`FAIL ${name}`);
  console.log(`PASS ${name}`);
  passed += 1;
}

check(
  "OCCURRENCE_TABLE_IS_TECHNICAL_LINEAGE",
  s.migration.includes("create table public.activity_recurrence_occurrences") &&
    s.migration.includes("materialized_activity_event_id uuid not null") &&
    s.migration.includes("references public.activity_events(id)") &&
    s.migration.includes("This is not a Project Task entity"),
);

const runtimeArchitectureSources = [
  s.migration,
  s.materializer,
  s.quickCapture,
  s.projectsApi,
  s.projectMap,
  s.taskShelf,
];

check(
  "NO_PROJECT_TASK_ENTITY",
  !runtimeArchitectureSources.some((value) => value.includes("project_tasks")),
);

check(
  "MATERIALIZER_REUSES_CANONICAL_PP1_CREATE",
  s.migration.includes("public.create_activity_event_pp1_v1") &&
    !s.migration.includes("insert into public.activity_events"),
);

check(
  "BOUNDED_HORIZON_DEFAULT_56_CAP_366_EXACT_WINDOW",
  s.materializer.includes("DEFAULT_RECURRENCE_MATERIALIZATION_HORIZON_DAYS_PP3B2 = 56") &&
    s.materializer.includes("horizonDays > 366") &&
    s.migration.includes("p_horizon_days integer default 56") &&
    s.migration.includes("p_horizon_days>366") &&
    s.migration.includes("v_window_end := v_window_start + (p_horizon_days - 1)"),
);

check(
  "NO_MIGRATION_TIME_BACKFILL",
  !s.migration.includes("select public.materialize_activity_recurrence_rule_pp3b2(") ||
    s.migration.indexOf("select public.materialize_activity_recurrence_rule_pp3b2(") >
      s.migration.indexOf("as $function$"),
);

check(
  "DAILY_MATERIALIZES_DATE_ONLY",
  s.migration.includes("'scheduleModeCode','date_only'") &&
    s.migration.includes("'scheduledDate',to_char(v_candidate_start,'YYYY-MM-DD')"),
);

check(
  "WEEKLY_MONTHLY_MATERIALIZE_DATE_RANGE",
  s.migration.includes("Generic weekly recurrence is a full ISO week") &&
    s.migration.includes("v_candidate_end := v_candidate_start + 6") &&
    s.migration.includes("'scheduleModeCode','date_range'") &&
    s.migration.includes("interval '1 month'-interval '1 day'"),
);

check(
  "RECURRENCE_END_BOUNDS_HONORED",
  s.migration.includes("v_rule.end_mode_code='count'") &&
    s.migration.includes("v_occurrence_ordinal>v_rule.count_limit") &&
    s.migration.includes("v_rule.end_mode_code='until'") &&
    s.migration.includes("v_candidate_start>v_rule.until_date"),
);

check(
  "DETERMINISTIC_OCCURRENCE_IDEMPOTENCY",
  s.migration.includes("v_idempotency_key := 'pp3b2:'||v_rule.id::text||':'||v_occurrence_key") &&
    s.migration.includes("unique (recurrence_rule_id, occurrence_key)"),
);

check(
  "PLANNED_TARGETS_ARE_COPIED",
  s.migration.includes("link.link_type='planned_target'") &&
    s.migration.includes("v_targets") &&
    s.migration.includes("v_request,v_targets"),
);

check(
  "MATERIALIZED_ACTIVITY_USES_REGISTERED_SYSTEM_SOURCE",
  s.migration.includes("'source','system_event'") &&
    !s.migration.includes("'source','recurrence_materializer_pp3b2'") &&
    s.migration.includes("'eventSource','recurrence_materializer_pp3b2'"),
);

check(
  "SERVICE_ROLE_ONLY_BOUNDARY",
  s.migration.includes("activity_recurrence_occurrences_no_direct_public_pp3b2") &&
    s.migration.includes("activity_recurrence_occurrences_service_role_all_pp3b2") &&
    s.migration.includes("to service_role"),
);

check(
  "QUICK_CAPTURE_MATERIALIZES_NONFATALLY",
  s.quickCapture.includes("materializeActivityRecurrenceRulePp3b2") &&
    s.quickCapture.includes("let recurrenceMaterialization") &&
    s.quickCapture.includes('status: "failed"') &&
    s.quickCapture.includes("recurrence definition remains durable for retry"),
);

check(
  "PROJECT_API_NESTS_OCCURRENCES",
  s.projectsApi.includes('.from("activity_recurrence_occurrences")') &&
    s.projectsApi.includes("projectOccurrencesByRuleId") &&
    s.projectsApi.includes("upcomingOccurrences") &&
    s.projectsApi.includes("materializedOccurrenceCount"),
);

check(
  "PROJECT_MAP_KEEPS_ONE_SOURCE_CARD",
  s.projectMap.includes("upcomingOccurrences") &&
    s.projectMap.includes("projectActivityOccurrenceLabel") &&
    s.projectMap.includes("selectedProject?.activities") &&
    !s.projectMap.includes("occurrenceNodes"),
);

check(
  "TASK_SHELF_EXCLUDES_PATTERN_SOURCE",
  s.taskShelf.includes("const recurrenceSourceIds = new Set<string>();") &&
    s.taskShelf.includes("!recurrenceSourceIds.has(activityId)") &&
    s.taskShelf.includes("recurrenceSourcesExcludedFromUnscheduled"),
);

check(
  "OCCURRENCE_INHERITS_CANONICAL_PROJECT_MEMBERSHIP",
  s.migration.includes("insert into public.project_activity_links") &&
    s.migration.includes("source_link.activity_event_id=v_source.id") &&
    s.migration.includes("'ARCTOR_RECURRENCE_PROJECT_MEMBERSHIP_PP3B2_V1'") &&
    s.migration.includes("project_context.status_code<>'archived'") &&
    s.migration.includes("on conflict do nothing"),
);

const linkedOccurrenceMembershipFilters =
  s.projectsApi.match(
    /linkedActivityIdSet\.has\(\s*occurrence\.materialized_activity_event_id,?\s*\)/g,
  ) ?? [];

check(
  "PROJECT_API_USES_PROJECT_LINKS_AS_OCCURRENCE_MEMBERSHIP_SOURCE",
  s.projectsApi.includes("projectOccurrenceActivityEventIds") &&
    s.projectsApi.includes("linkedActivityIdSet") &&
    s.projectsApi.includes("!projectOccurrenceActivityEventIds.has(activityId)") &&
    linkedOccurrenceMembershipFilters.length >= 2,
);

check(
  "GENERIC_RECURRENCE_ONLY_NO_FAKE_WEEKDAY_EXACTNESS",
  !s.migration.includes("day_of_week") &&
    !s.migration.includes("weekday_code") &&
    !s.migration.includes("scheduleModeCode','exact"),
);

check(
  "OCCURRENCE_EXCEPTION_STATUSES_RESERVED",
  ["'active'", "'skipped'", "'rescheduled'", "'cancelled'"]
    .every((value) => s.migration.includes(value)),
);

check(
  "PP3B1_FOUNDATION_VALIDATOR_REMAINS_PRESENT",
  s.pp3b1Validator.includes("VALIDATOR=PASS_") &&
    s.pp3b1Validator.includes("NO_OCCURRENCE_MATERIALIZATION_YET"),
);


console.log(`VALIDATOR=PASS_${passed}/${passed}`);

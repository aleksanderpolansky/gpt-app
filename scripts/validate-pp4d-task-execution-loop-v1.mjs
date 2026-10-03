import fs from "node:fs";

const files = {
  shelf: "src/components/calendar/cux6-task-shelf.tsx",
  shelfApi: "src/app/api/calendar/task-shelf/route.ts",
  completionApi:
    "src/app/api/calendar/task-shelf/[activityEventId]/complete/route.ts",
  calendarClient: "src/app/calendar-rebuild/CalendarRebuildClient.tsx",
  calendarApi: "src/app/api/calendar-rebuild/events/route.ts",
  projectsApi: "src/app/api/projects/route.ts",
};

function read(file) {
  if (!fs.existsSync(file)) throw new Error(`MISSING_FILE:${file}`);
  return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
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
  "TASK_LIST_REPLACES_THREE_DIAGNOSTIC_COLUMNS",
  s.shelf.includes('type TaskViewKey =') &&
    ["today", "week", "overdue", "unscheduled", "completed"].every((key) =>
      s.shelf.includes(`"${key}"`),
    ) &&
    !s.shelf.includes('type ShelfGroupKey ='),
);

check(
  "TASK_LIST_IS_COMPACT_SINGLE_LIST",
  s.shelf.includes('min-h-[62px]') &&
    !s.shelf.includes("lg:grid-cols-3") &&
    s.shelf.includes("selected.items.map"),
);

check(
  "NEEDS_CLARIFICATION_IS_INDEPENDENT_BADGE",
  s.shelf.includes("needsClarification") &&
    s.shelf.includes("copy.clarification") &&
    !s.shelfApi.includes('buildGroup("needsClarification"'),
);

check(
  "FOCUS_WEEK_FOLLOWS_CALENDAR",
  s.calendarClient.includes("focusDateKey={dateKey(focusDate)}") &&
    s.shelfApi.includes("weekBounds(focusDate)") &&
    s.shelfApi.includes("weekStartDate: week.start") &&
    s.shelfApi.includes("weekEndDate: week.end"),
);

check(
  "COMPLETION_CREATES_CANONICAL_ACTUAL_ACTIVITY",
  s.completionApi.includes("createActivityEventViaPp1Rpc") &&
    s.completionApi.includes('activityRoleCode: "actual"') &&
    s.completionApi.includes('status: "completed"'),
);

check(
  "PLAN_ACTUAL_BRIDGE_IS_CANONICAL",
  s.completionApi.includes("fulfillsPlannedActivityEventId: activityEventId") &&
    s.completionApi.includes("ARCTOR_TASK_EXECUTION_LOOP_PP4D_V1"),
);

check(
  "COMPLETION_USES_REGISTERED_SYSTEM_SOURCE",
  s.completionApi.includes('source: "system_event"') &&
    s.completionApi.includes('eventSource: "task_completion_pp4d_v1"'),
);

check(
  "DOUBLE_CLICK_IS_GUARDED_BY_EXISTING_COMPLETION",
  s.completionApi.includes("findExistingCompletion") &&
    s.completionApi.includes('"already_completed"') &&
    s.completionApi.includes('eq("status", "completed")'),
);

check(
  "ACTUAL_INHERITS_PROJECT_MEMBERSHIP_WITHOUT_DUPLICATE_PROJECT_CARD",
  s.completionApi.includes("inheritProjectMembership") &&
    s.completionApi.includes("project_activity_links") &&
    s.completionApi.includes(
      "ARCTOR_TASK_COMPLETION_PROJECT_MEMBERSHIP_PP4D_V1",
    ) &&
    s.projectsApi.includes('activity_role_code === "planned"'),
);

check(
  "FULFILLED_PLANS_DISAPPEAR_FROM_TASK_LIST",
  s.shelfApi.includes("fulfilledPlannedIds") &&
    s.shelfApi.includes("fulfilledPlannedIds.has(activityId)") &&
    s.shelfApi.includes('activity_role_code", "actual"'),
);

check(
  "COMPLETED_HISTORY_IS_VISIBLE",
  s.shelfApi.includes('buildGroup("completed", completed, limit)') &&
    s.shelf.includes('activeView === key') &&
    s.shelf.includes("completedAt"),
);

check(
  "UNDO_PRESERVES_ACTUAL_HISTORY",
  s.completionApi.includes('status: "cancelled"') &&
    s.completionApi.includes("ARCTOR_TASK_EXECUTION_UNDO_PP4D_V1") &&
    s.shelf.includes("undoCompletion"),
);

check(
  "CALENDAR_HIDES_FULFILLED_PLANNED_ITEMS",
  s.calendarApi.includes("fulfilledPlannedActivityIds") &&
    s.calendarApi.includes("visiblePlannedActivityRecords") &&
    s.calendarApi.includes("visibleCalendarRows"),
);

check(
  "EXACT_PROJECTION_CANCEL_RESTORE",
  s.completionApi.includes("cancelExactProjection") &&
    s.completionApi.includes("restoreExactProjection"),
);

check(
  "PROJECT_UPCOMING_RECURRENCE_HIDES_COMPLETED_OCCURRENCE",
  s.projectsApi.includes("fulfilledPlannedActivityIds") &&
    s.projectsApi.includes(
      "!fulfilledPlannedActivityIds.has(",
    ),
);

check(
  "RECURRENCE_PATTERN_SOURCE_STILL_NOT_ACTIONABLE_TASK",
  s.shelfApi.includes("recurrenceSourceIds") &&
    s.shelfApi.includes("recurrenceSourceIds.has(activityId)"),
);

check(
  "NO_NEW_PARALLEL_TASK_ENTITY",
  !Object.values(s).some((value) => value.includes("project_tasks")) &&
    !Object.values(s).some((value) => value.includes("todo_tasks")),
);

check(
  "NO_DATABASE_MIGRATION_REQUIRED",
  !s.completionApi.includes("create table") &&
    !s.shelfApi.includes("create table"),
);

console.log(`PP4D_VALIDATOR=PASS_${passed}/${passed}`);

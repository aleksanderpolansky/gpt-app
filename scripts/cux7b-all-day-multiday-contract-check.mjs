import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  api: "src/app/api/calendar-rebuild/events/route.ts",
  client: "src/app/calendar-rebuild/CalendarRebuildClient.tsx",
  types: "src/features/calendar-core/types.ts",
  docs: "docs/CUX7B_ALL_DAY_MULTIDAY_LAYER_RU_20260729.md",
};

const source = Object.fromEntries(
  Object.entries(files).map(([key, relativePath]) => [
    key,
    fs.readFileSync(path.join(root, relativePath), "utf8"),
  ]),
);

const checks = [];

function check(name, condition) {
  checks.push({ name, pass: Boolean(condition) });
}

function includes(key, text) {
  return source[key].includes(text);
}

function regex(key, pattern) {
  return pattern.test(source[key]);
}

for (const [key, relativePath] of Object.entries(files)) {
  check(`file exists: ${relativePath}`, fs.existsSync(path.join(root, relativePath)));
  check(`file non-empty: ${relativePath}`, source[key].trim().length > 0);
}

check("types exports CalendarAllDayScheduleMode", includes("types", "export type CalendarAllDayScheduleMode"));
check("types includes date_only", includes("types", '"date_only"'));
check("types includes date_range", includes("types", '"date_range"'));
check("types includes deadline", includes("types", '"deadline"'));
check("types exports CalendarAllDayItem", includes("types", "export type CalendarAllDayItem"));
check("all-day item has activityEventId", includes("types", "activityEventId: string;"));
check("all-day item has startDate", includes("types", "startDate: string;"));
check("all-day item has endDate", includes("types", "endDate: string;"));
check("all-day item has schedule mode", includes("types", "scheduleModeCode: CalendarAllDayScheduleMode;"));
check("all-day item retains scheduledDate", includes("types", "scheduledDate: string | null;"));
check("all-day item retains range start", includes("types", "scheduleStartDate: string | null;"));
check("all-day item retains range end", includes("types", "scheduleEndDate: string | null;"));
check("all-day item retains deadlineAt", includes("types", "deadlineAt: string | null;"));
check("all-day item retains dueAt", includes("types", "dueAt: string | null;"));
check("all-day item retains duration", includes("types", "durationMinutes: number | null;"));
check("all-day item retains updatedAt", includes("types", "updatedAt: string | null;"));

check("API imports CalendarAllDayItem", includes("api", "CalendarAllDayItem,"));
check("API imports CalendarAllDayScheduleMode", includes("api", "CalendarAllDayScheduleMode,"));
check("API imports active actor context", includes("api", "getActivityUserContext"));
check("API preserves auth0 for PATCH/DELETE", includes("api", 'import { auth0 }'));
check("API active planned statuses locked", includes("api", '["draft", "planned", "confirmed"]'));
check("API all-day modes locked", includes("api", '["date_only", "date_range", "deadline"]'));
check("API scan limit bounded", includes("api", "MAX_ALL_DAY_SCAN_LIMIT = 500"));
check("API validates date key", includes("api", "function isDateKey"));
check("API maps timestamp to date key", includes("api", "function dateKeyFromTimestamp"));
check("API maps planned activity item", includes("api", "function mapPlannedActivityAllDayItem"));
check("API excludes malformed range", includes("api", "endDate < startDate"));
check("API creates activity-prefixed display id", includes("api", "id: `activity:${activityEventId}`"));
check("API preserves raw activity id", includes("api", "activityEventId,"));
check("API reads activity_events", includes("api", '.from("activity_events")'));
check("API scopes by user", includes("api", '.eq("user_id", appUser.id)'));
check("API scopes by active actor", includes("api", '.eq("acting_as_actor_id", personActor.id)'));
check("API scopes planned role", includes("api", '.eq("activity_role_code", "planned")'));
check("API scopes active status", includes("api", '.in("status", [...ACTIVE_PLANNED_STATUSES])'));
check("API scopes schedule modes", includes("api", '.in("schedule_mode_code", [...ALL_DAY_SCHEDULE_MODES])'));
check("API keeps calendar_events query", includes("api", '.from("calendar_events")'));
check("API keeps time_blocks query", includes("api", '.from("time_blocks")'));
check("API reads three sources in Promise.all", regex("api", /plannedActivitiesQuery[\s\S]*Promise\.all/));
check("API handles planned activity error", includes("api", "plannedActivityError"));
check("API maps allDayItems", includes("api", "const allDayItems ="));
check("API filters by date range", includes("api", "allDayItemIntersectsDateRange"));
check("API sorts all-day items", includes("api", "left.startDate.localeCompare"));
check("API returns allDayItems", regex("api", /events,\s+allDayItems,\s+logs/));
check("API returns plannedActivities source count", includes("api", "plannedActivities: allDayItems.length"));
check("API preserves PATCH", includes("api", "export async function PATCH"));
check("API preserves DELETE", includes("api", "export async function DELETE"));
check("API does not insert calendar projection for all-day", !regex("api", /plannedActivitiesQuery[\s\S]*\.insert\(/));
check("API does not update activity_events", !regex("api", /\.from\("activity_events"\)[\s\S]{0,500}\.update\(/));
check("API contains no SQL execution", !regex("api", /\b(create table|alter table|drop table|execute sql)\b/i));

check("client imports CalendarAllDayItem", includes("client", "CalendarAllDayItem,"));
check("response includes allDayItems", includes("client", "allDayItems?: CalendarAllDayItem[];"));
check("response includes planned activity count", includes("client", "plannedActivities?: number;"));
check("client defines positioned all-day item", includes("client", "type PositionedAllDayItem"));
check("client has localized all-day copy", includes("client", "CUX7B_ALL_DAY_UI"));
check("English all-day label present", includes("client", 'title: "Scheduled dates"'));
check("Polish all-day label present", includes("client", 'title: "Zaplanowane daty"'));
check("Russian all-day label present", includes("client", 'title: "Запланированные даты"'));
check("Ukrainian all-day label present", includes("client", 'title: "Заплановані дати"'));
check("German all-day label present", includes("client", 'title: "Geplante Daten"'));
check("Spanish all-day label present", includes("client", 'title: "Fechas planificadas"'));
check("Czech all-day label present", includes("client", 'title: "Plánovaná data"'));
check("client has date intersection helper", includes("client", "function allDayItemIntersectsDate"));
check("client has day item selector", includes("client", "function getAllDayItemsForDate"));
check("client has schedule-mode accents", includes("client", "function getAllDayAccentClass"));
check("deadline accent present", includes("client", 'scheduleModeCode === "deadline"'));
check("date-range accent present", includes("client", 'scheduleModeCode === "date_range"'));
check("client formats all-day date", includes("client", "function formatAllDayDateKey"));
check("client formats deadline time", includes("client", "formatAllDayItemRange"));
check("client converts item to existing shelf modal contract", includes("client", "function allDayItemToShelfItem"));
check("modal adapter preserves raw id", includes("client", "id: item.activityEventId"));
check("modal adapter does not invent enrichment", includes("client", "enrichmentStatus: null"));
check("client builds week segments", includes("client", "function buildWeekAllDaySegments"));
check("week segments clip left boundary", includes("client", "item.startDate < firstDate"));
check("week segments clip right boundary", includes("client", "item.endDate > lastDate"));
check("week segments allocate lanes", includes("client", "laneEndColumns.findIndex"));
check("client stores all-day state", includes("client", "useState<CalendarAllDayItem[]>([])"));
check("client requests start date key", includes("client", "startDate: dateKey(range.start)"));
check("client requests end date key", includes("client", "endDate: dateKey(range.end)"));
check("client loads allDayItems response", includes("client", "setAllDayItems(payload.allDayItems ?? [])"));
check("client resets all-day state on error", includes("client", "setAllDayItems([])"));
check("client tracks planned activity source count", includes("client", "plannedActivities: payload.sources?.plannedActivities ?? 0"));
check("client computes visible all-day items", includes("client", "const visibleAllDayItems = useMemo"));
check("visible all-day range is exclusive at end", includes("client", "item.startDate < endDateExclusive"));
check("client computes day all-day items", includes("client", "const dayAllDayItems = useMemo"));
check("client computes week segments", includes("client", "const weekAllDaySegments = useMemo"));
check("client limits visible lanes", includes("client", "const maxVisibleAllDayLanes = 4"));
check("client computes week overflow", includes("client", "hiddenWeekAllDayCount"));
check("visible stat includes all-day items", includes("client", "const visibleRecordCount = visibleEvents.length + visibleAllDayItems.length"));
check("day layer renders title", regex("client", /view === "day"[\s\S]*allDayUi\.title/));
check("day layer opens CUX6 modal", regex("client", /dayAllDayItems\.slice\(0, 4\)[\s\S]*setSelectedShelfItem\(allDayItemToShelfItem\(item\)\)/));
check("day layer has overflow", regex("client", /dayAllDayItems\.length > 4[\s\S]*allDayUi\.more/));
check("day exact hourly grid preserved", regex("client", /dayTimelineEvents\.map/));
check("week layer renders seven-column dates", includes("client", 'gridTemplateColumns: "repeat(7, minmax(132px, 1fr))"'));
check("week layer uses grid span", includes("client", "gridColumn: `${startColumn + 1} / ${endColumn + 2}`"));
check("week layer uses lane row", includes("client", "gridRow: `${lane + 1}`"));
check("week layer opens activity modal", regex("client", /visibleWeekAllDaySegments\.map[\s\S]*allDayItemToShelfItem\(item\)/));
check("week layer has overflow marker", regex("client", /hiddenWeekAllDayCount > 0[\s\S]*allDayUi\.more/));
check("week exact hourly grid preserved", regex("client", /weekTimelineEventsByDay\.get/));
check("month reads all-day items", includes("client", "const dayDateItems = getAllDayItemsForDate"));
check("month shares three-item limit", includes("client", "const availableTimedSlots = Math.max(0, 3 - visibleDateItems.length)"));
check("month computes combined overflow", includes("client", "const hiddenCount ="));
check("month all-day opens popup", regex("client", /visibleDateItems\.map[\s\S]*allDayItemToShelfItem\(item\)/));
check("month timed event selection preserved", regex("client", /visibleTimedEvents\.map[\s\S]*setSelectedEventId\(event\.id\)/));
check("month avoids nested outer button", regex("client", /monthDates\.map[\s\S]*return \(\s*<div/));
check("task shelf remains present", includes("client", "<Cux6TaskShelf"));
check("activity popup remains present", includes("client", "<Cux6TaskDetailModal"));
check("calendar event modal remains present", includes("client", 'role="dialog"'));
check("List implementation not expanded in CUX7B", includes("client", "visibleEvents.slice(0, 8)"));
check("Timeline not added in CUX7B", !includes("client", 'CalendarViewMode>("timeline"'));
check("no project grouping in CUX7B", !includes("client", "CUX7B_PROJECT_GROUP"));
check("no background AI in CUX7B", !includes("client", "after("));
check("no SQL in client", !regex("client", /\b(create table|alter table|drop table)\b/i));

check("docs baseline locked", includes("docs", "5d7a62f43cdec3d12cccb5101613fea2e77f0cc0"));
check("docs canonical source locked", includes("docs", "`activity_events` остаётся canonical source"));
check("docs exact projection rule locked", includes("docs", "`calendar_events` остаётся projection только для exact"));
check("docs excludes Timeline", includes("docs", "- Timeline;"));
check("docs excludes milestones", includes("docs", "- milestones;"));
check("docs excludes grouping", includes("docs", "- Value Object / project grouping;"));
check("docs excludes AI", includes("docs", "- background AI;"));
check("docs excludes SQL", includes("docs", "- SQL и изменение схемы."));
check("docs lists exact five paths", includes("docs", "scripts/cux7b-all-day-multiday-contract-check.mjs"));
check("docs includes runtime acceptance", includes("docs", "Runtime acceptance должно проверить"));

const failed = checks.filter((item) => !item.pass);

for (const item of checks) {
  console.log(`${item.pass ? "PASS" : "FAIL"} ${item.name}`);
}

console.log("");
console.log(`CUX7B all-day/multiday contract: ${checks.length - failed.length}/${checks.length}`);

if (failed.length > 0) {
  console.error("");
  console.error("Failed checks:");
  for (const item of failed) {
    console.error(`- ${item.name}`);
  }
  process.exit(1);
}

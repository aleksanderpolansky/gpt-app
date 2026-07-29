import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const clientPath = path.join(
  root,
  "src/app/calendar-rebuild/CalendarRebuildClient.tsx",
);
const docsPath = path.join(root, "docs/CUX7C2_TIMELINE_VIEW_RU_20260729.md");

const checks = [];

function add(label, pass) {
  checks.push({ label, pass: Boolean(pass) });
}

function includes(source, value) {
  return source.includes(value);
}

function matches(source, pattern) {
  return pattern.test(source);
}

add("client exists", fs.existsSync(clientPath));
add("docs exists", fs.existsSync(docsPath));

const client = fs.existsSync(clientPath) ? fs.readFileSync(clientPath, "utf8") : "";
const docs = fs.existsSync(docsPath) ? fs.readFileSync(docsPath, "utf8") : "";

add("client non-empty", client.length > 1000);
add("docs non-empty", docs.length > 1000);

// Presentation contract.
add("CalendarPresentationMode exists", includes(client, "type CalendarPresentationMode"));
add("presentation includes grid", includes(client, '"grid" | "list" | "timeline"'));
add("presentation includes list", includes(client, '"grid" | "list" | "timeline"'));
add("presentation includes timeline", includes(client, '"grid" | "list" | "timeline"'));
add("state uses CalendarPresentationMode", includes(client, "useState<CalendarPresentationMode>"));
add("presentation switch contains three modes", includes(client, '["grid", "list", "timeline"]'));
add("presentation buttons expose aria pressed", includes(client, "aria-pressed={calendarPresentation === mode}"));
add("timeline surface condition exists", includes(client, 'calendarPresentation === "timeline" ? "block" : "hidden"'));
add("grid surface remains", matches(client, /calendarPresentation === "grid"/));
add("list surface remains", matches(client, /calendarPresentation === "list"/));

// Timeline model types.
add("CalendarTimelineEntry exists", includes(client, "type CalendarTimelineEntry"));
add("timeline all-day variant exists", includes(client, 'kind: "all_day"'));
add("timeline timed variant exists", includes(client, 'kind: "timed"'));
add("timeline entry has key", includes(client, "key: string;"));
add("timeline entry has title", includes(client, "title: string;"));
add("timeline entry has startAt", includes(client, "startAt: Date;"));
add("timeline entry has endAt", includes(client, "endAt: Date;"));
add("timeline entry has point flag", includes(client, "isPoint: boolean;"));
add("timeline retains all-day item", includes(client, "item: CalendarAllDayItem;"));
add("timeline retains exact event", includes(client, "event: CalendarEvent;"));
add("CalendarTimelineAxisCell exists", includes(client, "type CalendarTimelineAxisCell"));
add("axis cell has secondary label", includes(client, "secondaryLabel: string;"));
add("axis cell has focus state", includes(client, "isFocusDate: boolean;"));

// Normalization helpers.
add("startOfDateKey helper exists", includes(client, "function startOfDateKey"));
add("local calendar-day helper exists", includes(client, "function addLocalCalendarDays"));
add("timeline clamp helper exists", includes(client, "function clampTimelineDate"));
add("timeline entries builder exists", includes(client, "function buildTimelineEntries"));
add("timeline axis builder exists", includes(client, "function buildTimelineAxisCells"));
add("timeline position helper exists", includes(client, "function getHorizontalTimelinePosition"));
add("timeline range formatter exists", includes(client, "function formatTimelineEntryRange"));
add("all-day builder reads CalendarAllDayItem", includes(client, "allDayItems: CalendarAllDayItem[]"));
add("timed builder reads CalendarEvent", includes(client, "events: CalendarEvent[]"));
add("builder uses selected range", includes(client, 'range: { start: Date; end: Date }'));
add("deadline has point behavior", includes(client, 'item.scheduleModeCode === "deadline"'));
add("deadline uses deadlineAt", includes(client, "item.deadlineAt ? new Date(item.deadlineAt)"));
add("deadline outside range excluded", includes(client, "markerAt < range.start || markerAt >= range.end"));
add("deadline sets isPoint true", includes(client, "isPoint: true"));
add("non-deadline sets isPoint false", includes(client, "isPoint: false"));
add("all-day end becomes exclusive", includes(client, "addLocalCalendarDays(startOfDateKey(item.endDate), 1)"));
add("all-day start clips to range", includes(client, "clampTimelineDate(rawStart, range.start, range.end)"));
add("all-day end clips to range", includes(client, "clampTimelineDate(rawEndExclusive, range.start, range.end)"));
add("malformed exact end has duration fallback", includes(client, "eventDurationMinutes(event) * 60000"));
add("exact start clips to range", includes(client, "clampTimelineDate(rawStart, range.start, range.end)"));
add("exact end clips to range", includes(client, "clampTimelineDate(rawEnd, range.start, range.end)"));
add("empty intervals excluded", matches(client, /if \(endAt <= startAt\)/));
add("timeline entries sorted by start", includes(client, "left.startAt.getTime() - right.startAt.getTime()"));
add("stable timeline key sort exists", includes(client, "left.key.localeCompare(right.key)"));

// Axis behavior.
add("day timeline uses 24 cells", includes(client, "Array.from({ length: 24 }"));
add("day cells use hourly milliseconds", includes(client, "hour * 60 * 60 * 1000"));
add("day labels use HH:00", includes(client, 'String(hour).padStart(2, "0")'));
add("week axis uses weekDates", includes(client, 'view === "week" ? weekDates : monthDates'));
add("month axis uses monthDates", includes(client, 'view === "week" ? weekDates : monthDates'));
add("week labels use short weekday", includes(client, "formatShortDay(day, locale)"));
add("month labels use day number", includes(client, 'String(day.getDate()).padStart(2, "0")'));
add("month boundary label exists", includes(client, "day.getDate() === 1"));
add("focus day highlighting exists", includes(client, "isFocusDate: isSameDate(day, focusDate)"));
add("day unit width locked", includes(client, 'view === "day" ? 72'));
add("week unit width locked", includes(client, 'view === "week" ? 132 : 56'));
add("month unit width locked", includes(client, 'view === "week" ? 132 : 56'));
add("axis width derived from cells", includes(client, "calendarTimelineAxisCells.length * calendarTimelineUnitWidth"));
add("label width locked", includes(client, "calendarTimelineLabelWidth = 248"));
add("position derives from range duration", includes(client, "range.end.getTime() - range.start.getTime()"));
add("point width fixed", includes(client, "width: 20"));
add("bar minimum width exists", includes(client, "Math.max(18, rawWidth)"));
add("bar clipped to available width", includes(client, "Math.min(availableWidth"));

// Data memos.
add("timeline entries memo exists", includes(client, "const calendarTimelineEntries = useMemo"));
add("timeline memo reads visibleEvents", includes(client, "buildTimelineEntries(visibleEvents, visibleAllDayItems, range)"));
add("timeline memo reads visibleAllDayItems", includes(client, "buildTimelineEntries(visibleEvents, visibleAllDayItems, range)"));
add("timeline memo reads range", includes(client, "buildTimelineEntries(visibleEvents, visibleAllDayItems, range)"));
add("timeline axis memo exists", includes(client, "const calendarTimelineAxisCells = useMemo"));
add("timeline axis respects view", includes(client, "buildTimelineAxisCells(view, focusDate, weekDates, monthDates, locale)"));
add("timeline axis respects locale", includes(client, "buildTimelineAxisCells(view, focusDate, weekDates, monthDates, locale)"));

// Localization.
add("presentation copy typed for three modes", includes(client, "useMemo<Record<CalendarPresentationMode, string>>"));
add("Russian timeline label", includes(client, 'timeline: "Шкала времени"'));
add("Ukrainian timeline label", includes(client, 'timeline: "Часова шкала"'));
add("Polish timeline label", includes(client, 'timeline: "Oś czasu"'));
add("German timeline label", includes(client, 'timeline: "Zeitleiste"'));
add("Spanish timeline label", includes(client, 'timeline: "Línea de tiempo"'));
add("Czech timeline label", includes(client, 'timeline: "Časová osa"'));
add("English timeline label", includes(client, 'timeline: "Timeline"'));
add("timeline UI memo exists", includes(client, "const calendarTimelineUi = useMemo"));
add("Russian timeline title", includes(client, 'title: "Шкала времени периода"'));
add("Ukrainian timeline title", includes(client, 'title: "Часова шкала періоду"'));
add("Polish timeline title", includes(client, 'title: "Oś czasu okresu"'));
add("German timeline title", includes(client, 'title: "Zeitleiste des Zeitraums"'));
add("Spanish timeline title", includes(client, 'title: "Línea de tiempo del período"'));
add("Czech timeline title", includes(client, 'title: "Časová osa období"'));
add("English timeline title", includes(client, 'title: "Period timeline"'));
add("Russian timeline hint", includes(client, "Прокручивайте шкалу по горизонтали"));
add("Polish timeline hint", includes(client, "Przewijaj oś poziomo"));
add("English timeline hint", includes(client, "Scroll the timeline horizontally"));

// Surface and design.
add("CUX7C2 surface marker exists", includes(client, "CUX7C2 horizontal Timeline"));
add("timeline header card exists", includes(client, "calendarTimelineUi.title"));
add("timeline period title exists", includes(client, "{periodTitle}"));
add("timeline record count exists", includes(client, "calendarTimelineEntries.length"));
add("timeline error state preserved", includes(client, "{eventsError}"));
add("timeline loading state preserved", includes(client, "{ui.loadingEvents}"));
add("timeline empty state localized", includes(client, "{calendarTimelineUi.empty}"));
add("timeline horizontal scroll exists", includes(client, 'className="overflow-x-auto rounded-xl'));
add("timeline min width exists", includes(client, 'className="min-w-max"'));
add("timeline label column sticky", includes(client, "sticky left-0 z-30"));
add("timeline row label sticky", includes(client, "sticky left-0 z-20"));
add("timeline uses subtle border", includes(client, "border-[#e8ebf3]"));
add("timeline uses primary blue", includes(client, "#3b6ef8"));
add("timeline uses rounded cards", includes(client, "rounded-xl"));
add("timeline uses shadow", includes(client, "shadow-sm"));
add("timeline axis uses CSS grid", includes(client, "gridTemplateColumns: `repeat(${calendarTimelineAxisCells.length}"));
add("timeline focus column tint exists", includes(client, 'cell.isFocusDate && "bg-[#eef2ff]"'));
add("timeline row background grid exists", includes(client, 'cell.isFocusDate && "bg-[#f7f8ff]"'));
add("timeline rows use calculated positions", includes(client, "getHorizontalTimelinePosition("));
add("deadline diamond uses amber", includes(client, "border-amber-400 bg-amber-100"));
add("deadline diamond is rotated", includes(client, "rotate-45"));
add("timeline bars use all-day accents", includes(client, "getAllDayAccentClass(entry.item)"));
add("timeline bars use exact layer accents", includes(client, "getLayerAccentClass(entry.event)"));
add("timeline selected exact ring remains", includes(client, "selectedEventId === entry.event.id"));
add("narrow bars fall back to mode label", includes(client, "position.width >= 90 ? entry.title : modeLabel"));
add("timeline has focus rings", includes(client, "focus:ring-[#3b6ef8]"));

// Interaction and modal reuse.
add("all-day row clears exact selection", includes(client, "setSelectedEventId(null)"));
add("all-day row opens shelf modal state", includes(client, "setSelectedShelfItem(allDayItemToShelfItem(entry.item))"));
add("timed row clears shelf selection", includes(client, "setSelectedShelfItem(null)"));
add("timed row opens event modal state", includes(client, "setSelectedEventId(entry.event.id)"));
add("timed row updates focus date", includes(client, "setFocusDate(eventStartDate(entry.event))"));
add("point marker opens shelf modal", matches(client, /entry\.isPoint[\s\S]*setSelectedShelfItem\(allDayItemToShelfItem\(entry\.item\)\)/));
add("bar click supports all-day", matches(client, /entry\.kind === "all_day"[\s\S]*allDayItemToShelfItem\(entry\.item\)/));
add("bar click supports exact", matches(client, /setSelectedEventId\(entry\.event\.id\)/));
add("Activity Container modal remains", includes(client, "<Cux6TaskDetailModal"));
add("calendar event modal remains", includes(client, 'role="dialog"'));
add("Task Shelf remains", includes(client, "<Cux6TaskShelf"));

// Regression boundaries.
add("Day grid remains", includes(client, 'view === "day"'));
add("Week grid remains", includes(client, 'view === "week"'));
add("Month grid remains", includes(client, 'view === "month"'));
add("CUX7B day all-day layer remains", includes(client, "dayAllDayItems"));
add("CUX7B week segments remain", includes(client, "visibleWeekAllDaySegments"));
add("CUX7B month all-day remains", includes(client, "visibleDateItems"));
add("CUX7C1 list groups remain", includes(client, "calendarListGroups"));
add("CUX7C1 list surface remains", includes(client, "CUX7C1 complete list surface"));
add("existing read API remains", includes(client, "/api/calendar-rebuild/events"));
add("no new timeline API route", !includes(client, "/api/calendar-rebuild/timeline"));
add("no SQL in client", !matches(client, /\b(select|insert|update|delete)\s+from\b/i));
add("no project grouping added", !includes(client, "timelineProjectGroups"));
add("no milestone model added", !includes(client, "CalendarTimelineMilestone"));
add("no dependency engine added", !includes(client, "criticalPath"));
add("no background AI added", !includes(client, "backgroundTimelineAi"));
add("no drag handler added", !includes(client, "onDragStart"));
add("no resize handler added", !includes(client, "onResize"));
add("no zoom control added", !includes(client, "timelineZoom"));
add("no virtualization added", !includes(client, "VirtualizedTimeline"));

// Documentation lock.
add("docs title locked", includes(docs, "CUX7C2 Timeline View"));
add("docs baseline locked", includes(docs, "8588bc671e9e2e0e4b45a6b1a1f5ba49b8fa56c9"));
add("docs third presentation locked", includes(docs, "Grid | List | Timeline"));
add("docs visibleEvents source locked", includes(docs, "`visibleEvents`"));
add("docs visibleAllDayItems source locked", includes(docs, "`visibleAllDayItems`"));
add("docs no API locked", includes(docs, "Новых API"));
add("docs Day 24 hours locked", includes(docs, "24 часовых колонок"));
add("docs Week 7 days locked", includes(docs, "семи дневных колонок"));
add("docs Month 42 days locked", includes(docs, "42 даты month grid"));
add("docs deadline point locked", includes(docs, "точечным янтарным маркером"));
add("docs range clipping locked", includes(docs, "клипуется"));
add("docs sticky label locked", includes(docs, "sticky left label column"));
add("docs design primary token locked", includes(docs, "#3b6ef8"));
add("docs design background token locked", includes(docs, "#f0f2f7"));
add("docs seven locales locked", includes(docs, "Czech"));
add("docs canonical activity source locked", includes(docs, "`activity_events` остаётся canonical source"));
add("docs exact projection locked", includes(docs, "`calendar_events` остаётся единственной projection"));
add("docs unscheduled excluded", includes(docs, "`unscheduled` остаётся на Task Shelf"));
add("docs excludes SQL", includes(docs, "SQL или изменение схемы"));
add("docs excludes grouping", includes(docs, "Value Object или project-root grouping"));
add("docs excludes milestones", includes(docs, "milestones"));
add("docs excludes dependencies", includes(docs, "dependencies и critical path"));
add("docs excludes drag resize", includes(docs, "drag/drop или resize"));
add("docs excludes zoom", includes(docs, "zoom controls"));
add("docs excludes AI", includes(docs, "background AI"));
add("docs exact three paths", includes(docs, "scripts/cux7c2-timeline-contract-check.mjs"));
add("docs runtime acceptance exists", includes(docs, "Runtime acceptance"));
add("docs next CUX7C3 exists", includes(docs, "CUX7C3 grouping / milestones"));
add("docs next CUX8 exists", includes(docs, "CUX8 visual, mobile and accessibility"));

const failed = checks.filter((check) => !check.pass);
for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.label}`);
}

console.log("");
console.log(`CUX7C2 timeline contract: ${checks.length - failed.length}/${checks.length}`);

if (failed.length > 0) {
  process.exit(1);
}

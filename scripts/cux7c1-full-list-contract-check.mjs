import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    return "";
  }

  return fs.readFileSync(absolutePath, "utf8");
}

const clientPath = "src/app/calendar-rebuild/CalendarRebuildClient.tsx";
const docsPath = "docs/CUX7C1_FULL_LIST_VIEW_RU_20260729.md";
const client = read(clientPath);
const docs = read(docsPath);

const checks = [];

function check(label, condition) {
  checks.push({ label, condition: Boolean(condition) });
}

check("client exists", client.length > 0);
check("docs exists", docs.length > 0);
check("CalendarListEntry type exists", client.includes("type CalendarListEntry ="));
check("CalendarListEntry has all_day", client.includes('kind: "all_day"'));
check("CalendarListEntry has timed", client.includes('kind: "timed"'));
check("CalendarListEntry has dateKey", client.includes("dateKey: string;"));
check("CalendarListEntry has sortAt", client.includes("sortAt: number;"));
check("CalendarListEntry retains CalendarAllDayItem", client.includes("item: CalendarAllDayItem;"));
check("CalendarListEntry retains CalendarEvent", client.includes("event: CalendarEvent;"));
check("CalendarListGroup type exists", client.includes("type CalendarListGroup ="));
check("CalendarListGroup has entries", client.includes("entries: CalendarListEntry[];"));
check("all-day sort helper exists", client.includes("function getAllDayListSortTime"));
check("deadline sort uses deadlineAt", client.includes('item.scheduleModeCode === "deadline" && item.deadlineAt'));
check("deadline sort validates date", client.includes("Number.isNaN(deadline.getTime())"));
check("all-day fallback uses visible start date", client.includes("parseDateKey(visibleStartDateKey).getTime()"));
check("old view reset removed", !client.includes('setCalendarPresentation("grid");\n  }, [view]);'));
check("calendarListGroups memo exists", client.includes("const calendarListGroups = useMemo<CalendarListGroup[]>(() =>"));
check("list groups use range start", client.includes("const rangeStartDateKey = dateKey(range.start);"));
check("list uses Map", client.includes("const groups = new Map<string, CalendarListEntry[]>();"));
check("list addEntry helper exists", client.includes("const addEntry = (entry: CalendarListEntry) =>"));
check("list reads all-day items", client.includes("for (const item of visibleAllDayItems)"));
check("range item clipped to visible start", client.includes("item.startDate < rangeStartDateKey ? rangeStartDateKey : item.startDate"));
check("all-day key prefixed", client.includes("key: `all-day:${item.id}`"));
check("all-day kind stored", client.includes('kind: "all_day"'));
check("all-day date stored", client.includes("dateKey: visibleStartDateKey"));
check("all-day sort helper used", client.includes("getAllDayListSortTime(item, visibleStartDateKey)"));
check("list reads exact events", client.includes("for (const event of visibleEvents)"));
check("timed key prefixed", client.includes("key: `timed:${event.id}`"));
check("timed kind stored", client.includes('kind: "timed"'));
check("timed date derived from start", client.includes("dateKey: dateKey(start)"));
check("timed sort uses start time", client.includes("sortAt: start.getTime()"));
check("date groups sorted", client.includes(".sort(([left], [right]) => left.localeCompare(right))"));
check("entries sorted by sortAt", client.includes("if (left.sortAt !== right.sortAt)"));
check("all-day ordered before timed tie", client.includes('return left.kind === "all_day" ? -1 : 1;'));
check("stable key tie sort", client.includes("return left.key.localeCompare(right.key);"));
check("memo depends on range start", client.includes("[range.start, visibleAllDayItems, visibleEvents]"));
check("Russian title present", client.includes("Все записи периода"));
check("Russian empty present", client.includes("В выбранном периоде нет записей"));
check("Russian exact present", client.includes("Точное время"));
check("Ukrainian title present", client.includes("Усі записи періоду"));
check("Ukrainian empty present", client.includes("У вибраному періоді немає записів"));
check("Polish title present", client.includes("Wszystkie wpisy okresu"));
check("Polish empty present", client.includes("Brak wpisów w wybranym okresie"));
check("German title present", client.includes("Alle Einträge im Zeitraum"));
check("German empty present", client.includes("Keine Einträge im gewählten Zeitraum"));
check("Spanish title present", client.includes("Todos los registros del período"));
check("Spanish empty present", client.includes("No hay registros en el período seleccionado"));
check("Czech title present", client.includes("Všechny záznamy období"));
check("Czech empty present", client.includes("Ve vybraném období nejsou žádné záznamy"));
check("English title present", client.includes("All records in period"));
check("English empty present", client.includes("No records in the selected period"));
check("full list surface marker exists", client.includes("CUX7C1 complete list surface"));
check("list presentation condition preserved", client.includes('calendarPresentation === "list" ? "block" : "hidden"'));
check("list header uses localized title", client.includes("{calendarListUi.title}"));
check("list header uses period title", client.includes("{periodTitle}"));
check("list count uses combined visibleRecordCount", client.includes("{visibleRecordCount} {calendarListUi.records}"));
check("events error preserved", client.includes("{eventsError}"));
check("loading state preserved", client.includes("{ui.loadingEvents}"));
check("empty state uses list groups", client.includes("calendarListGroups.length === 0"));
check("empty state localized", client.includes("{calendarListUi.empty}"));
check("all groups rendered", client.includes("calendarListGroups.map((group) =>"));
check("group key uses date", client.includes("key={group.dateKey}"));
check("group heading uses date formatter", client.includes("formatDateTitle(parseDateKey(group.dateKey), locale)"));
check("group entries rendered", client.includes("group.entries.map((entry) =>"));
check("all-day branch discriminated", client.includes('if (entry.kind === "all_day")'));
check("all-day opens existing shelf modal", client.includes("setSelectedShelfItem(allDayItemToShelfItem(item))"));
check("all-day clears exact selection", client.includes("setSelectedEventId(null);"));
check("all-day accent preserved", client.includes("getAllDayAccentClass(item)"));
check("all-day title rendered", client.includes("{item.title}"));
check("all-day range rendered", client.includes("formatAllDayItemRange(item, locale)"));
check("all-day mode badge rendered", client.includes("allDayUi.modes[item.scheduleModeCode]"));
check("timed branch obtains event", client.includes("const event = entry.event;"));
check("timed opens existing event modal", client.includes("setSelectedEventId(event.id)"));
check("timed clears shelf selection", client.includes("setSelectedShelfItem(null);"));
check("timed updates focus date", client.includes("setFocusDate(eventStartDate(event))"));
check("timed accent preserved", client.includes("getLayerAccentClass(event)"));
check("timed selected ring preserved", client.includes('selectedEventId === event.id && "ring-2 ring-[#3b6ef8] ring-offset-1"'));
check("timed display title preserved", client.includes("getEventDisplayTitle(event) || buildCompactEventLabel(event)"));
check("timed range rendered", client.includes("formatEventDateTimeRange(event, locale)"));
check("exact badge localized", client.includes("{calendarListUi.exact}"));
check("old eight-entry slice removed", !client.includes("visibleEvents.slice(0, 8)"));
check("old exact-only list count removed", !client.includes("{visibleEvents.length} {ui.visibleEvents}"));
check("grid day remains", client.includes('view === "day"'));
check("grid week remains", client.includes('view === "week"'));
check("grid month remains", client.includes('view === "month"'));
check("CUX7B all-day day layer remains", client.includes("dayAllDayItems.slice(0, 4)"));
check("CUX7B week segments remain", client.includes("visibleWeekAllDaySegments.map"));
check("CUX7B month all-day remains", client.includes("const dayDateItems = getAllDayItemsForDate(visibleAllDayItems, day);"));
check("Task Shelf remains", client.includes("<Cux6TaskShelf"));
check("Activity Container modal remains", client.includes("<Cux6TaskDetailModal"));
check("calendar event modal remains", client.includes("selectedEvent ?"));
check("Timeline not added", !client.includes('calendarPresentation === "timeline"'));
check("docs baseline locked", docs.includes("62ddfb6ae8f55d3a9f8db7aad42cffd08ecd1ad9"));
check("docs source models locked", docs.includes("visibleEvents") && docs.includes("visibleAllDayItems"));
check("docs no API locked", docs.includes("Новых API, таблиц, SQL"));
check("docs no eight limit", docs.includes("без лимита `8`"));
check("docs grouping by dates", docs.includes("группируются по календарным датам"));
check("docs all-day modal behavior", docs.includes("CUX6 Activity Container"));
check("docs exact modal behavior", docs.includes("modal календарного события"));
check("docs presentation persists", docs.includes("не сбрасывается автоматически в Grid"));
check("docs range once", docs.includes("показывается в списке один раз"));
check("docs grid unchanged", docs.includes("не меняются"));
check("docs localization seven languages", docs.includes("English") && docs.includes("Czech"));
check("docs excludes Timeline", docs.includes("- Timeline;"));
check("docs excludes grouping", docs.includes("группировка по Value Object"));
check("docs excludes milestones", docs.includes("- milestones;"));
check("docs excludes AI", docs.includes("- background AI;"));
check("docs exact three paths", docs.includes("CalendarRebuildClient.tsx") && docs.includes("cux7c1-full-list-contract-check.mjs"));
check("docs next block Timeline", docs.includes("CUX7C2 — Timeline view"));

const failed = checks.filter((item) => !item.condition);

for (const item of checks) {
  console.log(`${item.condition ? "PASS" : "FAIL"} ${item.label}`);
}

console.log("");
console.log(`CUX7C1 full-list contract: ${checks.length - failed.length}/${checks.length}`);

if (failed.length > 0) {
  process.exit(1);
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  addDays,
  addMonths,
  dateKey,
  eventDateKey,
  eventDurationMinutes,
  eventIntersectsRange,
  eventStartDate,
  formatTimeRange,
  getMonthGridDates,
  getRangeForView,
  getWeekDates,
  isSameDate,
  isSameMonth,
  parseDateKey,
} from "../../features/calendar-core/date-utils";
import type { CalendarEvent, CalendarViewMode } from "../../features/calendar-core/types";

type CalendarRebuildClientProps = {
  initialFocusDateKey: string | null;
  initialLocale: string | null;
};

type CalendarEventsResponse = {
  ok?: boolean;
  events?: CalendarEvent[];
  error?: string;
  sources?: {
    calendarEvents?: number;
    timeBlocks?: number;
  };
};

type PositionedEvent = {
  event: CalendarEvent;
  top: number;
  height: number;
};

const hourStart = 6;
const hourEnd = 23;
const hourHeight = 64;
const timeGutterWidth = 76;
const minEventHeight = 32;

const hours = Array.from({ length: hourEnd - hourStart }, (_, index) => hourStart + index);

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function formatDateTitle(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(value);
}

function formatShortDay(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "short",
  }).format(value);
}

function getEventsForDate(events: CalendarEvent[], value: Date) {
  const key = dateKey(value);

  return events.filter((event) => eventDateKey(event) === key);
}

function buildEventLabel(event: CalendarEvent) {
  return `${formatTimeRange(event)}, ${event.title}`;
}

function getTimelineHeight() {
  return (hourEnd - hourStart) * hourHeight;
}

function getEventTop(event: CalendarEvent) {
  const start = eventStartDate(event);
  const minutesFromStart = (start.getHours() - hourStart) * 60 + start.getMinutes();

  return Math.max(0, (minutesFromStart / 60) * hourHeight);
}

function getEventHeight(event: CalendarEvent, top: number) {
  const rawHeight = Math.max(minEventHeight, (eventDurationMinutes(event) / 60) * hourHeight);
  const maxHeight = Math.max(minEventHeight, getTimelineHeight() - top);

  return Math.min(rawHeight, maxHeight);
}

function positionEvents(events: CalendarEvent[]) {
  return events.map((event): PositionedEvent => {
    const top = getEventTop(event);
    const height = getEventHeight(event, top);

    return { event, top, height };
  });
}

function getLayerAccentClass(event: CalendarEvent) {
  if (event.layer === "work") {
    return "border-emerald-300 bg-emerald-50";
  }

  if (event.layer === "business") {
    return "border-orange-300 bg-orange-50";
  }

  if (event.layer === "health") {
    return "border-rose-300 bg-rose-50";
  }

  if (event.kind === "candidate") {
    return "border-amber-300 bg-amber-50";
  }

  return "border-[#4169f5]/30 bg-[#eef2ff]";
}

export default function CalendarRebuildClient({
  initialFocusDateKey,
  initialLocale,
}: CalendarRebuildClientProps) {
  const [view, setView] = useState<CalendarViewMode>("week");
  const [focusDate, setFocusDate] = useState(() => parseDateKey(initialFocusDateKey));
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [sourceCounts, setSourceCounts] = useState({ calendarEvents: 0, timeBlocks: 0 });

  const addFlowLocale = initialLocale && initialLocale.trim().length > 0 ? initialLocale : "en";
  const addFlowHref = {
    pathname: "/calendar/add",
    query: {
      locale: addFlowLocale,
      returnTo: "calendar-rebuild",
      focusDate: dateKey(focusDate),
    },
  };

  const range = useMemo(() => getRangeForView(view, focusDate), [view, focusDate]);
  const rangeStart = range.start.toISOString();
  const rangeEnd = range.end.toISOString();

  useEffect(() => {
    const abortController = new AbortController();

    async function loadEvents() {
      setIsLoadingEvents(true);
      setEventsError(null);

      const params = new URLSearchParams({
        start: rangeStart,
        end: rangeEnd,
      });

      try {
        const response = await fetch(`/api/calendar-rebuild/events?${params.toString()}`, {
          signal: abortController.signal,
        });

        const payload = (await response.json()) as CalendarEventsResponse;

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error ?? `Calendar events request failed: ${response.status}`);
        }

        setEvents(payload.events ?? []);
        setSourceCounts({
          calendarEvents: payload.sources?.calendarEvents ?? 0,
          timeBlocks: payload.sources?.timeBlocks ?? 0,
        });
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        setEvents([]);
        setSourceCounts({ calendarEvents: 0, timeBlocks: 0 });
        setEventsError(error instanceof Error ? error.message : "Unknown calendar events error");
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoadingEvents(false);
        }
      }
    }

    void loadEvents();

    return () => abortController.abort();
  }, [rangeEnd, rangeStart]);

  const visibleEvents = useMemo(
    () => events.filter((event) => eventIntersectsRange(event, range)),
    [events, range],
  );

  const selectedEvent = useMemo(
    () => visibleEvents.find((event) => event.id === selectedEventId) ?? null,
    [selectedEventId, visibleEvents],
  );

  const weekDates = useMemo(() => getWeekDates(focusDate), [focusDate]);
  const monthDates = useMemo(() => getMonthGridDates(focusDate), [focusDate]);

  const updateFocusDate = (nextDate: Date) => {
    setFocusDate(nextDate);
    setSelectedEventId(null);

    const params = new URLSearchParams(window.location.search);
    params.set("focusDate", dateKey(nextDate));

    window.history.replaceState(null, "", `/calendar-rebuild?${params.toString()}`);
  };

  const shiftDate = (amount: number) => {
    if (view === "month") {
      updateFocusDate(addMonths(focusDate, amount));
      return;
    }

    if (view === "week") {
      updateFocusDate(addDays(focusDate, amount * 7));
      return;
    }

    updateFocusDate(addDays(focusDate, amount));
  };

  const dayTimelineEvents = useMemo(
    () => positionEvents(getEventsForDate(visibleEvents, focusDate)),
    [focusDate, visibleEvents],
  );

  const weekTimelineEventsByDay = useMemo(() => {
    const grouped = new Map<string, PositionedEvent[]>();

    for (const day of weekDates) {
      grouped.set(dateKey(day), positionEvents(getEventsForDate(visibleEvents, day)));
    }

    return grouped;
  }, [visibleEvents, weekDates]);

  return (
    <main className="min-h-screen bg-[#f3f5fb] px-4 py-6 text-[#111827]">
      <div className="mx-auto max-w-[1320px] space-y-4">
        <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#4f6df5]">
                Calendar Rebuild / Time Grid Model
              </div>
              <h1 className="mt-2 text-3xl font-bold">{"\u041a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u044c"}</h1>
              <p className="mt-1 text-sm text-[#667085]">
                Duration-based day and week calendar connected to calendar_events and time_blocks.
              </p>
            </div>

            <Link
              href={addFlowHref}
              className="rounded-xl bg-[#4169f5] px-4 py-2 text-sm font-bold text-white shadow"
            >
              + Add
            </Link>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#9ca3af]">
                  selected date
                </div>
                <h2 className="mt-1 text-xl font-bold capitalize">
                  {formatDateTitle(focusDate)}
                </h2>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-lg border px-3 py-1.5 text-sm font-bold"
                    onClick={() => shiftDate(-1)}
                  >
                    {"<"}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-[#4169f5]/30 bg-[#eef2ff] px-3 py-1.5 text-sm font-bold text-[#4169f5]"
                    onClick={() => updateFocusDate(new Date())}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border px-3 py-1.5 text-sm font-bold"
                    onClick={() => shiftDate(1)}
                  >
                    {">"}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                {(["day", "week", "month"] as CalendarViewMode[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setView(item)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-sm font-bold",
                      view === item
                        ? "border-[#4169f5] bg-[#4169f5] text-white"
                        : "border-[#e5e7eb] bg-white text-[#667085]",
                    )}
                  >
                    {item === "day" ? "Day" : item === "week" ? "Week" : "Month"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#9ca3af]">
              selected event
            </div>
            {selectedEvent ? (
              <div className="mt-3">
                <div className="font-bold">{selectedEvent.title}</div>
                <div className="mt-1 text-sm text-[#667085]">{formatTimeRange(selectedEvent)}</div>
                <div className="mt-3 rounded-xl border border-[#e5e7eb] bg-[#f8faff] p-3 text-xs text-[#667085]">
                  Source: {selectedEvent.source}<br />
                  Kind: {selectedEvent.kind}<br />
                  Layer: {selectedEvent.layer}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[#667085]">
                Click an event in the calendar.
              </p>
            )}

            <div className="mt-4 rounded-xl border border-[#e5e7eb] bg-[#fbfcff] p-3 text-xs text-[#667085]">
              {isLoadingEvents ? "Loading events..." : `${visibleEvents.length} visible events`}
              <br />
              calendar_events: {sourceCounts.calendarEvents}
              <br />
              time_blocks: {sourceCounts.timeBlocks}
              {eventsError ? (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-red-700">
                  {eventsError}
                </div>
              ) : null}
            </div>
          </aside>
        </section>

        <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
          {view === "day" ? (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#4f6df5]">day</div>
                  <h3 className="font-bold">Day timeline</h3>
                </div>
                <div className="text-sm font-bold capitalize">{formatDateTitle(focusDate)}</div>
              </div>

              <div className="relative overflow-hidden rounded-xl border border-[#e5e7eb]">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="grid grid-cols-[76px_1fr] border-b border-[#eef1f7] last:border-b-0"
                    style={{ height: `${hourHeight}px` }}
                  >
                    <div className="border-r border-[#eef1f7] bg-[#fbfcff] px-3 py-2 text-xs font-bold text-[#98a2b3]">
                      {String(hour).padStart(2, "0")}:00
                    </div>
                    <div className="px-3 py-2">
                      <div className="h-full rounded-lg border border-dashed border-[#d8deef] bg-white px-3 py-2 text-xs text-[#b0b4c8]">
                        Free
                      </div>
                    </div>
                  </div>
                ))}

                {dayTimelineEvents.map(({ event, top, height }) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setSelectedEventId(event.id)}
                    className={cn(
                      "absolute z-10 overflow-hidden rounded-lg px-3 py-2 text-left text-xs font-bold text-[#111827] shadow-sm",
                      getLayerAccentClass(event),
                    )}
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      left: `${timeGutterWidth + 12}px`,
                      right: "12px",
                    }}
                  >
                    {buildEventLabel(event)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {view === "week" ? (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#4f6df5]">week</div>
                  <h3 className="font-bold">Working week time grid</h3>
                </div>
                <div className="text-sm font-bold">
                  {dateKey(weekDates[0])} - {dateKey(weekDates[6])}
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[#e5e7eb]">
                <div className="min-w-[960px]">
                  <div className="grid border-b border-[#eef1f7]" style={{ gridTemplateColumns: `${timeGutterWidth}px repeat(7, minmax(120px, 1fr))` }}>
                    <div className="border-r border-[#eef1f7] bg-[#fbfcff] p-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#98a2b3]">
                      Time
                    </div>
                    {weekDates.map((day) => (
                      <button
                        key={dateKey(day)}
                        type="button"
                        onClick={() => updateFocusDate(day)}
                        className={cn(
                          "border-r border-[#eef1f7] p-3 text-left last:border-r-0 hover:bg-[#f8faff]",
                          isSameDate(day, focusDate) && "bg-[#eef2ff]",
                        )}
                      >
                        <div className="text-xs font-bold uppercase text-[#98a2b3]">{formatShortDay(day)}</div>
                        <div className="mt-1 text-xl font-bold">{day.getDate()}</div>
                      </button>
                    ))}
                  </div>

                  <div className="relative" style={{ height: `${getTimelineHeight()}px` }}>
                    <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `${timeGutterWidth}px repeat(7, minmax(120px, 1fr))` }}>
                      <div className="border-r border-[#eef1f7] bg-[#fbfcff]">
                        {hours.map((hour) => (
                          <div
                            key={hour}
                            className="border-b border-[#eef1f7] px-3 py-2 text-xs font-bold text-[#98a2b3]"
                            style={{ height: `${hourHeight}px` }}
                          >
                            {String(hour).padStart(2, "0")}:00
                          </div>
                        ))}
                      </div>

                      {weekDates.map((day) => (
                        <div
                          key={dateKey(day)}
                          className={cn(
                            "relative border-r border-[#eef1f7] last:border-r-0",
                            isSameDate(day, focusDate) && "bg-[#f1f4ff]",
                          )}
                        >
                          {hours.map((hour) => (
                            <div
                              key={hour}
                              className="border-b border-[#eef1f7]"
                              style={{ height: `${hourHeight}px` }}
                            />
                          ))}

                          {(weekTimelineEventsByDay.get(dateKey(day)) ?? []).map(({ event, top, height }) => (
                            <button
                              key={event.id}
                              type="button"
                              onClick={(clickEvent) => {
                                clickEvent.stopPropagation();
                                setSelectedEventId(event.id);
                                setFocusDate(day);
                              }}
                              className={cn(
                                "absolute left-1 right-1 z-10 overflow-hidden rounded-lg px-2 py-1 text-left text-[11px] font-bold leading-tight text-[#111827] shadow-sm",
                                getLayerAccentClass(event),
                              )}
                              style={{
                                top: `${top}px`,
                                height: `${height}px`,
                              }}
                              title={buildEventLabel(event)}
                            >
                              {buildEventLabel(event)}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {view === "month" ? (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#4f6df5]">month</div>
                  <h3 className="font-bold">Working month</h3>
                </div>
                <div className="text-sm font-bold capitalize">
                  {new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(focusDate)}
                </div>
              </div>

              <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-[#e5e7eb]">
                {monthDates.map((day) => {
                  const dayEvents = getEventsForDate(visibleEvents, day);

                  return (
                    <button
                      key={dateKey(day)}
                      type="button"
                      onClick={() => updateFocusDate(day)}
                      className={cn(
                        "min-h-[120px] border-b border-r border-[#eef1f7] p-2 text-left hover:bg-[#f8faff]",
                        !isSameMonth(day, focusDate) && "bg-[#fbfcff] text-[#b0b4c8]",
                        isSameDate(day, focusDate) && "bg-[#eef2ff]",
                      )}
                    >
                      <div className="text-xs font-bold">{day.getDate()}</div>
                      <div className="mt-2 space-y-1">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div
                            key={event.id}
                            className={cn(
                              "truncate rounded-md border px-2 py-1 text-[11px] font-bold text-[#111827]",
                              getLayerAccentClass(event),
                            )}
                          >
                            {buildEventLabel(event)}
                          </div>
                        ))}
                        {dayEvents.length > 3 ? (
                          <div className="text-[10px] font-bold text-[#4169f5]">
                            +{dayEvents.length - 3}
                          </div>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

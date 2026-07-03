import type { CalendarEvent, CalendarRange, CalendarViewMode } from "./types";

export function startOfLocalDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0);
}

export function noonLocal(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12, 0, 0, 0);
}

export function dateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function parseDateKey(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return noonLocal(new Date());
  }

  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function addDays(value: Date, amount: number) {
  const next = noonLocal(value);
  next.setDate(next.getDate() + amount);

  return next;
}

export function addMonths(value: Date, amount: number) {
  const next = noonLocal(value);
  next.setMonth(next.getMonth() + amount);

  return next;
}

export function startOfWeek(value: Date) {
  const date = noonLocal(value);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + mondayOffset);

  return date;
}

export function getWeekDates(value: Date) {
  const start = startOfWeek(value);

  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function getMonthGridDates(value: Date) {
  const firstMonthDay = new Date(value.getFullYear(), value.getMonth(), 1, 12, 0, 0, 0);
  const firstGridDay = startOfWeek(firstMonthDay);

  return Array.from({ length: 42 }, (_, index) => addDays(firstGridDay, index));
}

export function getRangeForView(view: CalendarViewMode, focusDate: Date): CalendarRange {
  if (view === "month") {
    const monthGrid = getMonthGridDates(focusDate);

    return {
      start: startOfLocalDay(monthGrid[0]),
      end: addDays(startOfLocalDay(monthGrid[41]), 1),
    };
  }

  if (view === "week") {
    const week = getWeekDates(focusDate);

    return {
      start: startOfLocalDay(week[0]),
      end: addDays(startOfLocalDay(week[6]), 1),
    };
  }

  return {
    start: startOfLocalDay(focusDate),
    end: addDays(startOfLocalDay(focusDate), 1),
  };
}

export function isSameDate(left: Date, right: Date) {
  return dateKey(left) === dateKey(right);
}

export function isSameMonth(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth()
  );
}

export function eventStartDate(event: CalendarEvent) {
  return new Date(event.startAt);
}

export function eventEndDate(event: CalendarEvent) {
  return new Date(event.endAt);
}

export function eventDurationMinutes(event: CalendarEvent) {
  const start = eventStartDate(event);
  const end = eventEndDate(event);
  const duration = Math.round((end.getTime() - start.getTime()) / 60000);

  return duration > 0 ? duration : 30;
}

export function eventDateKey(event: CalendarEvent) {
  return dateKey(eventStartDate(event));
}

export function eventIntersectsRange(event: CalendarEvent, range: CalendarRange) {
  const start = eventStartDate(event);
  const end = eventEndDate(event);

  return start < range.end && end > range.start;
}

export function formatTimeRange(event: CalendarEvent) {
  const start = eventStartDate(event);
  const end = eventEndDate(event);

  const format = (value: Date) =>
    `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;

  return `${format(start)}-${format(end)}`;
}

import type {
  TodayTimelineConflictMarker,
  TodayTimelineDay,
  TodayTimelineDomain,
  TodayTimelineDomainFilter,
  TodayTimelineEvent,
  TodayTimelineEventStatus,
  TodayTimelineViewModel,
} from "./today-timeline.types";

export const TODAY_TIMELINE_ALL_FILTER_ID = "all" as const;

export const TODAY_TIMELINE_DOMAIN_LABELS: Record<TodayTimelineDomain | typeof TODAY_TIMELINE_ALL_FILTER_ID, string> = {
  all: "All",
  work: "Work",
  learning: "Learning",
  health: "Health",
  family: "Family",
  business: "Business",
  admin: "Admin",
  rest: "Rest",
  other: "Other",
};

export const TODAY_TIMELINE_STATUS_LABELS: Record<TodayTimelineEventStatus, string> = {
  planned: "Planned",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
  missed: "Missed",
  corrected: "Corrected",
};

export const getTodayTimelineDomainLabel = (
  domain: TodayTimelineDomain | typeof TODAY_TIMELINE_ALL_FILTER_ID,
): string => TODAY_TIMELINE_DOMAIN_LABELS[domain];

export const getTodayTimelineStatusLabel = (status: TodayTimelineEventStatus): string =>
  TODAY_TIMELINE_STATUS_LABELS[status];

export const getTodayTimelineEventsByDomain = (
  events: readonly TodayTimelineEvent[],
  domain: TodayTimelineDomain | typeof TODAY_TIMELINE_ALL_FILTER_ID,
): readonly TodayTimelineEvent[] => {
  if (domain === TODAY_TIMELINE_ALL_FILTER_ID) {
    return events;
  }

  return events.filter((event) => event.domain === domain);
};

export const getTodayTimelineTotalMinutes = (events: readonly TodayTimelineEvent[]): number =>
  events.reduce((total, event) => total + event.durationMinutes, 0);

export const getTodayTimelineEventCountByStatus = (
  events: readonly TodayTimelineEvent[],
  status: TodayTimelineEventStatus,
): number => events.filter((event) => event.status === status).length;

export const getTodayTimelineCorrectionCount = (events: readonly TodayTimelineEvent[]): number =>
  events.reduce((total, event) => total + event.corrections.length, 0);

export const createTodayTimelineDomainFilter = (
  id: TodayTimelineDomain | typeof TODAY_TIMELINE_ALL_FILTER_ID,
  events: readonly TodayTimelineEvent[],
  activeFilterId: TodayTimelineDomain | typeof TODAY_TIMELINE_ALL_FILTER_ID = TODAY_TIMELINE_ALL_FILTER_ID,
): TodayTimelineDomainFilter => {
  const scopedEvents = getTodayTimelineEventsByDomain(events, id);

  return {
    id,
    label: getTodayTimelineDomainLabel(id),
    totalEvents: scopedEvents.length,
    totalMinutes: getTodayTimelineTotalMinutes(scopedEvents),
    isActive: id === activeFilterId,
  };
};

export const createTodayTimelineDomainFilters = (
  events: readonly TodayTimelineEvent[],
  activeFilterId: TodayTimelineDomain | typeof TODAY_TIMELINE_ALL_FILTER_ID = TODAY_TIMELINE_ALL_FILTER_ID,
): readonly TodayTimelineDomainFilter[] => [
  createTodayTimelineDomainFilter(TODAY_TIMELINE_ALL_FILTER_ID, events, activeFilterId),
  createTodayTimelineDomainFilter("work", events, activeFilterId),
  createTodayTimelineDomainFilter("learning", events, activeFilterId),
  createTodayTimelineDomainFilter("health", events, activeFilterId),
  createTodayTimelineDomainFilter("family", events, activeFilterId),
  createTodayTimelineDomainFilter("business", events, activeFilterId),
  createTodayTimelineDomainFilter("admin", events, activeFilterId),
  createTodayTimelineDomainFilter("rest", events, activeFilterId),
  createTodayTimelineDomainFilter("other", events, activeFilterId),
];

export const getTodayTimelineVisibleEvents = (
  day: TodayTimelineDay,
  activeFilterId: TodayTimelineDomain | typeof TODAY_TIMELINE_ALL_FILTER_ID,
): readonly TodayTimelineEvent[] => getTodayTimelineEventsByDomain(day.events, activeFilterId);

export const getTodayTimelineVisibleConflicts = (
  day: TodayTimelineDay,
  visibleEvents: readonly TodayTimelineEvent[],
): readonly TodayTimelineConflictMarker[] => {
  const visibleEventIds = new Set(visibleEvents.map((event) => event.id));
  const visibleConflictIds = new Set(visibleEvents.flatMap((event) => event.conflictIds));

  return day.conflicts.filter((conflict) => {
    if (visibleConflictIds.has(conflict.id)) {
      return true;
    }

    return conflict.affectedEventIds.some((eventId) => visibleEventIds.has(eventId));
  });
};

export const createTodayTimelineViewModel = (
  day: TodayTimelineDay,
  activeFilterId: TodayTimelineDomain | typeof TODAY_TIMELINE_ALL_FILTER_ID = TODAY_TIMELINE_ALL_FILTER_ID,
): TodayTimelineViewModel => {
  const visibleEvents = getTodayTimelineVisibleEvents(day, activeFilterId);

  return {
    day: {
      ...day,
      filters: createTodayTimelineDomainFilters(day.events, activeFilterId),
    },
    activeFilterId,
    visibleEvents,
    visibleConflicts: getTodayTimelineVisibleConflicts(day, visibleEvents),
  };
};

export const formatTodayTimelineDuration = (durationMinutes: number): string => {
  if (durationMinutes <= 0) {
    return "0 min";
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${minutes} min`;
};

export const formatTodayTimelineClockTime = (isoString: string): string => {
  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

export const formatTodayTimelineTimeRange = (event: TodayTimelineEvent): string => {
  const startedAt = formatTodayTimelineClockTime(event.startedAt);

  if (!event.endedAt) {
    return `${startedAt} – now`;
  }

  return `${startedAt} – ${formatTodayTimelineClockTime(event.endedAt)}`;
};

export const hasTodayTimelineConflict = (event: TodayTimelineEvent): boolean => event.conflictIds.length > 0;

export const hasTodayTimelineCorrections = (event: TodayTimelineEvent): boolean => event.corrections.length > 0;

export const isTodayTimelineEmpty = (day: TodayTimelineDay): boolean => day.events.length === 0;
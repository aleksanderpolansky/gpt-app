import type {
  TodayTimelineConflictMarker,
  TodayTimelineDay,
  TodayTimelineDomain,
  TodayTimelineDomainFilter,
  TodayTimelineEvent,
  TodayTimelineEventStatus,
} from "./today-timeline.types";

const DOMAIN_LABELS: Record<TodayTimelineDomain | "all", string> = {
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

const createDomainFilter = (
  id: TodayTimelineDomain | "all",
  events: readonly TodayTimelineEvent[],
  activeFilterId: TodayTimelineDomain | "all" = "all",
): TodayTimelineDomainFilter => {
  const scopedEvents = id === "all" ? events : events.filter((event) => event.domain === id);

  return {
    id,
    label: DOMAIN_LABELS[id],
    totalEvents: scopedEvents.length,
    totalMinutes: scopedEvents.reduce((total, event) => total + event.durationMinutes, 0),
    isActive: id === activeFilterId,
  };
};

const createDomainFilters = (
  events: readonly TodayTimelineEvent[],
  activeFilterId: TodayTimelineDomain | "all" = "all",
): readonly TodayTimelineDomainFilter[] => [
  createDomainFilter("all", events, activeFilterId),
  createDomainFilter("work", events, activeFilterId),
  createDomainFilter("learning", events, activeFilterId),
  createDomainFilter("health", events, activeFilterId),
  createDomainFilter("family", events, activeFilterId),
  createDomainFilter("business", events, activeFilterId),
  createDomainFilter("admin", events, activeFilterId),
  createDomainFilter("rest", events, activeFilterId),
  createDomainFilter("other", events, activeFilterId),
];

const countEventsByStatus = (
  events: readonly TodayTimelineEvent[],
  status: TodayTimelineEventStatus,
): number => events.filter((event) => event.status === status).length;

const sumEventMinutes = (events: readonly TodayTimelineEvent[]): number =>
  events.reduce((total, event) => total + event.durationMinutes, 0);

const countCorrections = (events: readonly TodayTimelineEvent[]): number =>
  events.reduce((total, event) => total + event.corrections.length, 0);

export const todayTimelineKnownDayEvents: readonly TodayTimelineEvent[] = [
  {
    id: "event-0603-0630-dog-walk",
    title: "Morning dog walk and stairs",
    description: "Short outdoor movement, stairs, and light recovery before desk work.",
    domain: "health",
    status: "completed",
    processingStatus: "semantic_ready",
    startedAt: "2026-06-03T06:30:00+02:00",
    endedAt: "2026-06-03T06:50:00+02:00",
    durationMinutes: 20,
    sourceLabel: "manual activity event",
    locationLabel: "Szczecin",
    valueObjects: [
      {
        id: "vo-health-walking",
        title: "Walking",
        href: "/value-objects/vo-health-walking",
        domain: "health",
      },
      {
        id: "vo-stairs",
        title: "Stairs",
        href: "/value-objects/vo-stairs",
        domain: "health",
      },
    ],
    corrections: [],
    conflictIds: [],
  },
  {
    id: "event-0603-0715-csp",
    title: "CSP invoice correction work",
    description: "Focused back-office invoice correction block with German context.",
    domain: "work",
    status: "completed",
    processingStatus: "semantic_ready",
    startedAt: "2026-06-03T07:15:00+02:00",
    endedAt: "2026-06-03T09:45:00+02:00",
    durationMinutes: 150,
    sourceLabel: "manual activity event",
    locationLabel: "Home office",
    valueObjects: [
      {
        id: "vo-csp-work",
        title: "CSP back office",
        href: "/value-objects/vo-csp-work",
        domain: "work",
      },
      {
        id: "vo-german-business",
        title: "German business language",
        href: "/value-objects/vo-german-business",
        domain: "learning",
      },
    ],
    corrections: [],
    conflictIds: [],
  },
  {
    id: "event-0603-0900-language-overlap",
    title: "Passive German listening during work",
    description: "Background exposure that overlaps with work and should be shown as a signal, not as duplicated real time.",
    domain: "learning",
    status: "completed",
    processingStatus: "review_needed",
    startedAt: "2026-06-03T09:00:00+02:00",
    endedAt: "2026-06-03T09:40:00+02:00",
    durationMinutes: 40,
    sourceLabel: "manual activity event",
    locationLabel: "Home office",
    valueObjects: [
      {
        id: "vo-german-listening",
        title: "German listening",
        href: "/value-objects/vo-german-listening",
        domain: "learning",
      },
    ],
    corrections: [],
    conflictIds: ["conflict-0603-overlap-work-learning"],
  },
  {
    id: "event-0603-1010-timeline-planning",
    title: "UI-9 Today Timeline planning",
    description: "Read-only implementation planning and route inventory for the Today Timeline block.",
    domain: "business",
    status: "completed",
    processingStatus: "semantic_ready",
    startedAt: "2026-06-03T10:10:00+02:00",
    endedAt: "2026-06-03T11:05:00+02:00",
    durationMinutes: 55,
    sourceLabel: "workspace planning",
    locationLabel: "Project workspace",
    valueObjects: [
      {
        id: "vo-ai-navigator-ui",
        title: "AI Navigator UI",
        href: "/value-objects/vo-ai-navigator-ui",
        domain: "business",
      },
    ],
    corrections: [
      {
        id: "correction-0603-timeline-end-time",
        kind: "time_adjustment",
        title: "End time candidate",
        description: "The end time was reviewed as a candidate correction and is visible here without applying it.",
        createdAt: "2026-06-03T11:20:00+02:00",
        createdByLabel: "review candidate",
        isApplied: false,
        isReadOnly: true,
      },
    ],
    conflictIds: [],
  },
  {
    id: "event-0603-1215-family",
    title: "Family logistics",
    description: "Short family coordination block between work and project planning.",
    domain: "family",
    status: "completed",
    processingStatus: "raw",
    startedAt: "2026-06-03T12:15:00+02:00",
    endedAt: "2026-06-03T12:35:00+02:00",
    durationMinutes: 20,
    sourceLabel: "manual note",
    locationLabel: "Home",
    valueObjects: [
      {
        id: "vo-family-logistics",
        title: "Family logistics",
        href: "/value-objects/vo-family-logistics",
        domain: "family",
      },
    ],
    corrections: [],
    conflictIds: [],
  },
];

export const todayTimelineConflictExamples: readonly TodayTimelineConflictMarker[] = [
  {
    id: "conflict-0603-overlap-work-learning",
    severity: "warning",
    title: "Overlapping attention channel",
    description:
      "German listening overlaps with invoice correction work. UI-9 shows it as an attention signal, not as duplicated real time.",
    affectedEventIds: ["event-0603-0715-csp", "event-0603-0900-language-overlap"],
    isReadOnly: true,
  },
];

export const todayTimelineKnownDayFixture: TodayTimelineDay = {
  id: "today-timeline-known-day-2026-06-03",
  date: "2026-06-03",
  summary: {
    dateLabel: "Today, 3 June 2026",
    timezoneLabel: "Europe/Warsaw",
    totalEvents: todayTimelineKnownDayEvents.length,
    completedEvents: countEventsByStatus(todayTimelineKnownDayEvents, "completed"),
    activeEvents: countEventsByStatus(todayTimelineKnownDayEvents, "active"),
    totalMinutes: sumEventMinutes(todayTimelineKnownDayEvents),
    focusMinutes: 205,
    recoveryMinutes: 20,
    conflictCount: todayTimelineConflictExamples.length,
    correctionCount: countCorrections(todayTimelineKnownDayEvents),
  },
  filters: createDomainFilters(todayTimelineKnownDayEvents),
  events: todayTimelineKnownDayEvents,
  conflicts: todayTimelineConflictExamples,
  emptyStateTitle: "No visible activity events yet",
  emptyStateDescription: "When activity events are connected, they will appear here as a read-only timeline.",
};

export const todayTimelineEmptyDayFixture: TodayTimelineDay = {
  id: "today-timeline-empty-day-2026-06-03",
  date: "2026-06-03",
  summary: {
    dateLabel: "Today, 3 June 2026",
    timezoneLabel: "Europe/Warsaw",
    totalEvents: 0,
    completedEvents: 0,
    activeEvents: 0,
    totalMinutes: 0,
    focusMinutes: 0,
    recoveryMinutes: 0,
    conflictCount: 0,
    correctionCount: 0,
  },
  filters: createDomainFilters([]),
  events: [],
  conflicts: [],
  emptyStateTitle: "No activities today",
  emptyStateDescription:
    "This read-only view is ready. Activity events will appear here after they are connected to the Today Timeline.",
};

export const todayTimelineFixtureDays: readonly TodayTimelineDay[] = [
  todayTimelineKnownDayFixture,
  todayTimelineEmptyDayFixture,
];

export const todayTimelineDefaultFixture = todayTimelineKnownDayFixture;
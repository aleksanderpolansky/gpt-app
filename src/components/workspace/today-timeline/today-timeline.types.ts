export type TodayTimelineDomain =
  | "work"
  | "learning"
  | "health"
  | "family"
  | "business"
  | "admin"
  | "rest"
  | "other";

export type TodayTimelineEventStatus =
  | "planned"
  | "active"
  | "completed"
  | "cancelled"
  | "missed"
  | "corrected";

export type TodayTimelineProcessingStatus =
  | "raw"
  | "semantic_pending"
  | "semantic_ready"
  | "review_needed"
  | "failed";

export type TodayTimelineConflictSeverity = "info" | "warning" | "critical";

export type TodayTimelineCorrectionKind =
  | "time_adjustment"
  | "status_adjustment"
  | "domain_adjustment"
  | "semantic_adjustment"
  | "note";

export type TodayTimelineValueObjectLink = {
  readonly id: string;
  readonly title: string;
  readonly href: string;
  readonly domain: TodayTimelineDomain;
};

export type TodayTimelineCorrectionEntry = {
  readonly id: string;
  readonly kind: TodayTimelineCorrectionKind;
  readonly title: string;
  readonly description: string;
  readonly createdAt: string;
  readonly createdByLabel: string;
  readonly isApplied: boolean;
  readonly isReadOnly: true;
};

export type TodayTimelineConflictMarker = {
  readonly id: string;
  readonly severity: TodayTimelineConflictSeverity;
  readonly title: string;
  readonly description: string;
  readonly affectedEventIds: readonly string[];
  readonly isReadOnly: true;
};

export type TodayTimelineEvent = {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly domain: TodayTimelineDomain;
  readonly status: TodayTimelineEventStatus;
  readonly processingStatus: TodayTimelineProcessingStatus;
  readonly startedAt: string;
  readonly endedAt?: string;
  readonly durationMinutes: number;
  readonly sourceLabel: string;
  readonly locationLabel?: string;
  readonly valueObjects: readonly TodayTimelineValueObjectLink[];
  readonly corrections: readonly TodayTimelineCorrectionEntry[];
  readonly conflictIds: readonly string[];
};

export type TodayTimelineDomainFilter = {
  readonly id: TodayTimelineDomain | "all";
  readonly label: string;
  readonly totalEvents: number;
  readonly totalMinutes: number;
  readonly isActive: boolean;
};

export type TodayTimelineDaySummary = {
  readonly dateLabel: string;
  readonly timezoneLabel: string;
  readonly totalEvents: number;
  readonly completedEvents: number;
  readonly activeEvents: number;
  readonly totalMinutes: number;
  readonly focusMinutes: number;
  readonly recoveryMinutes: number;
  readonly conflictCount: number;
  readonly correctionCount: number;
};

export type TodayTimelineDay = {
  readonly id: string;
  readonly date: string;
  readonly summary: TodayTimelineDaySummary;
  readonly filters: readonly TodayTimelineDomainFilter[];
  readonly events: readonly TodayTimelineEvent[];
  readonly conflicts: readonly TodayTimelineConflictMarker[];
  readonly emptyStateTitle: string;
  readonly emptyStateDescription: string;
};

export type TodayTimelineViewModel = {
  readonly day: TodayTimelineDay;
  readonly activeFilterId: TodayTimelineDomain | "all";
  readonly visibleEvents: readonly TodayTimelineEvent[];
  readonly visibleConflicts: readonly TodayTimelineConflictMarker[];
};
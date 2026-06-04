export type CalendarFreeWindowsBlockKind = "busy" | "free" | "blocked";

export type CalendarFreeWindowsDomain =
  | "work"
  | "learning"
  | "health"
  | "family"
  | "recovery"
  | "admin"
  | "business"
  | "language"
  | "errand"
  | "mixed";

export type CalendarFreeWindowsEnergyLevel = "low" | "medium" | "high";

export type CalendarFreeWindowsAttentionLevel =
  | "shallow"
  | "focused"
  | "deep";

export type CalendarFreeWindowsDurationBucket = 5 | 10 | 20 | 45;

export type CalendarFreeWindowsFitState =
  | "fits"
  | "tight"
  | "too_short"
  | "blocked_by_context";

export type CalendarFreeWindowsSourceKind =
  | "fixture"
  | "derived_from_fixture";

export type CalendarFreeWindowsCandidateState =
  | "candidate"
  | "preview"
  | "deferred"
  | "blocked_by_constraints";

export interface CalendarFreeWindowsTimeRange {
  readonly start: string;
  readonly end: string;
  readonly durationMinutes: number;
}

export interface CalendarFreeWindowsConstraint {
  readonly id: string;
  readonly label: string;
  readonly description: string;
}

export interface CalendarFreeWindowsTimeBlock {
  readonly id: string;
  readonly kind: CalendarFreeWindowsBlockKind;
  readonly title: string;
  readonly description: string;
  readonly domain: CalendarFreeWindowsDomain;
  readonly range: CalendarFreeWindowsTimeRange;
  readonly source: CalendarFreeWindowsSourceKind;
  readonly isReadOnly: true;
}

export interface CalendarFreeWindow {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly domain: CalendarFreeWindowsDomain;
  readonly range: CalendarFreeWindowsTimeRange;
  readonly energyLevel: CalendarFreeWindowsEnergyLevel;
  readonly attentionLevel: CalendarFreeWindowsAttentionLevel;
  readonly availableBuckets: readonly CalendarFreeWindowsDurationBucket[];
  readonly constraintIds: readonly string[];
  readonly suggestedCandidateIds: readonly string[];
  readonly source: CalendarFreeWindowsSourceKind;
  readonly isReadOnly: true;
}

export interface CalendarSuggestedActionForWindow {
  readonly id: string;
  readonly windowId: string;
  readonly title: string;
  readonly description: string;
  readonly domain: CalendarFreeWindowsDomain;
  readonly durationBucket: CalendarFreeWindowsDurationBucket;
  readonly fitState: CalendarFreeWindowsFitState;
  readonly state: CalendarFreeWindowsCandidateState;
  readonly reason: string;
  readonly constraintIds: readonly string[];
  readonly isReadOnly: true;
}

export interface CalendarFreeWindowsDaySummary {
  readonly busyMinutes: number;
  readonly freeMinutes: number;
  readonly blockedMinutes: number;
  readonly largestFreeWindowMinutes: number;
  readonly fittingCandidateCount: number;
}

export interface CalendarFreeWindowsDay {
  readonly id: string;
  readonly isoDate: string;
  readonly weekdayLabel: string;
  readonly dayLabel: string;
  readonly isToday: boolean;
  readonly summary: CalendarFreeWindowsDaySummary;
  readonly blocks: readonly CalendarFreeWindowsTimeBlock[];
  readonly freeWindows: readonly CalendarFreeWindow[];
}

export interface CalendarFreeWindowsLegendItem {
  readonly id: string;
  readonly label: string;
  readonly kind: CalendarFreeWindowsBlockKind;
  readonly domain: CalendarFreeWindowsDomain | "mixed";
  readonly description: string;
}

export interface CalendarFreeWindowsNavigationLink {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly description: string;
}

export interface CalendarReadOnlyBoundaryNotice {
  readonly title: string;
  readonly description: string;
  readonly items: readonly string[];
}

export interface CalendarFreeWindowsViewModel {
  readonly title: string;
  readonly subtitle: string;
  readonly activeDateLabel: string;
  readonly durationBuckets: readonly CalendarFreeWindowsDurationBucket[];
  readonly selectedDurationBucket: CalendarFreeWindowsDurationBucket;
  readonly days: readonly CalendarFreeWindowsDay[];
  readonly constraints: readonly CalendarFreeWindowsConstraint[];
  readonly suggestedCandidates: readonly CalendarSuggestedActionForWindow[];
  readonly legend: readonly CalendarFreeWindowsLegendItem[];
  readonly navigationLinks: readonly CalendarFreeWindowsNavigationLink[];
  readonly readOnlyBoundary: CalendarReadOnlyBoundaryNotice;
}

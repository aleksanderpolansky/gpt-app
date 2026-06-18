import type { ValueObjectTargetStandard } from "@/types/value-object-standards";

export type ValueObjectAnalyticsResolutionStatus =
  | "no_data"
  | "below_target"
  | "on_track"
  | "above_target"
  | "outside_range"
  | "over_target";

export type ValueObjectAnalyticsFactStatus =
  | "accepted"
  | "edited"
  | "derived"
  | "pending"
  | "rejected"
  | "ignored";

export interface ValueObjectAnalyticsPeriodWindow {
  readonly period: string;
  readonly startsAt?: string;
  readonly endsAt?: string;
}

export interface ValueObjectAnalyticsInputFact {
  readonly factId: string;
  readonly activityId?: string;
  readonly valueObjectId: string;
  readonly metricType: string;
  readonly value: number;
  readonly unit: string;
  readonly status?: ValueObjectAnalyticsFactStatus;
  readonly occurredAt?: string;
  readonly source?: string;
}

export interface ValueObjectAnalyticsResolverInput {
  readonly valueObjectId: string;
  readonly standard: ValueObjectTargetStandard;
  readonly facts: readonly ValueObjectAnalyticsInputFact[];
  readonly periodWindow?: ValueObjectAnalyticsPeriodWindow;
  readonly now?: string;
}

export interface ValueObjectAnalyticsResolverResult {
  readonly resolverMarker: "value-object-analytics-resolver-v0-step62";
  readonly valueObjectId: string;
  readonly metricType: string;
  readonly unit: string;
  readonly period: string;
  readonly ruleType: string;
  readonly actualValue: number;
  readonly targetValue: number | null;
  readonly targetMin: number | null;
  readonly targetMax: number | null;
  readonly progressPercent: number | null;
  readonly delta: number | null;
  readonly status: ValueObjectAnalyticsResolutionStatus;
  readonly recommendationCopy: string;
  readonly sourceFactIds: readonly string[];
  readonly sourceActivityIds: readonly string[];
  readonly factsIncluded: number;
  readonly factsIgnored: number;
  readonly generatedAt: string;
}

export interface ValueObjectAnalyticsDemoScenario {
  readonly title: string;
  readonly standard: ValueObjectTargetStandard;
  readonly facts: readonly ValueObjectAnalyticsInputFact[];
  readonly expectedActualValue: number;
  readonly expectedTargetValue: number;
  readonly expectedDelta: number;
  readonly expectedStatus: ValueObjectAnalyticsResolutionStatus;
}

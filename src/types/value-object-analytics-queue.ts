import type { ValueObjectAnalyticsResolverResult } from "./value-object-analytics";

export type ValueObjectAnalyticsRecalculationQueuePriority =
  | "low"
  | "normal"
  | "high"
  | "urgent";

export type ValueObjectAnalyticsRecalculationReason =
  | "activity_fact_created"
  | "activity_fact_corrected"
  | "target_standard_changed"
  | "value_object_hierarchy_changed"
  | "manual_refresh_requested"
  | "initial_preview_seed";

export type ValueObjectAnalyticsRecalculationStatus =
  | "queued"
  | "ready_for_background_worker"
  | "blocked_no_write_adapter";

export interface ValueObjectAnalyticsRecalculationScope {
  actorId: string | null;
  valueObjectId: string;
  dateFrom: string | null;
  dateTo: string | null;
  includeParentRollups: boolean;
}

export interface ValueObjectAnalyticsRecalculationInvalidation {
  directValueObject: boolean;
  parentRollups: boolean;
  currentSnapshot: boolean;
  dailyAggregates: boolean;
}

export interface ValueObjectAnalyticsRecalculationJob {
  id: string;
  createdAt: string;
  reason: ValueObjectAnalyticsRecalculationReason;
  priority: ValueObjectAnalyticsRecalculationQueuePriority;
  status: ValueObjectAnalyticsRecalculationStatus;
  scope: ValueObjectAnalyticsRecalculationScope;
  invalidates: ValueObjectAnalyticsRecalculationInvalidation;
  sourceFactIds: string[];
  notes: string[];
}

export interface ValueObjectAnalyticsRecalculationQueueSummary {
  totalJobs: number;
  queuedJobs: number;
  blockedJobs: number;
  highPriorityJobs: number;
  parentRollupJobs: number;
  currentSnapshotJobs: number;
  dailyAggregateJobs: number;
}

export interface ValueObjectAnalyticsRecalculationQueueSafety {
  writesToDatabase: false;
  executesSql: false;
  callsExternalModels: false;
  requiresCommitGate: true;
  requiresPushGate: true;
}

export interface ValueObjectAnalyticsRecalculationQueueContract {
  marker: "value-object-analytics-recalculation-queue-step65-v1";
  mode: "no_write_contract";
  jobs: ValueObjectAnalyticsRecalculationJob[];
  summary: ValueObjectAnalyticsRecalculationQueueSummary;
  currentResolverPreview: ValueObjectAnalyticsResolverResult | null;
  safety: ValueObjectAnalyticsRecalculationQueueSafety;
}
import type {
  ValueObjectAnalyticsRecalculationInvalidation,
  ValueObjectAnalyticsRecalculationJob,
  ValueObjectAnalyticsRecalculationQueueContract,
  ValueObjectAnalyticsRecalculationQueuePriority,
  ValueObjectAnalyticsRecalculationQueueSummary,
  ValueObjectAnalyticsRecalculationReason,
  ValueObjectAnalyticsRecalculationScope,
} from "@/types/value-object-analytics-queue";

import { resolveDemoFamilyTimeAnalytics } from "./value-object-analytics-resolver";

export const analyticsRecalculationQueueMarker =
  "value-object-analytics-recalculation-queue-step65-v1";

function resolveInvalidation(
  reason: ValueObjectAnalyticsRecalculationReason,
): ValueObjectAnalyticsRecalculationInvalidation {
  const parentRollups = reason === "value_object_hierarchy_changed";

  return {
    directValueObject: true,
    parentRollups,
    currentSnapshot: true,
    dailyAggregates:
      reason === "activity_fact_created" ||
      reason === "activity_fact_corrected" ||
      reason === "manual_refresh_requested" ||
      reason === "initial_preview_seed",
  };
}

function resolveDefaultPriority(
  reason: ValueObjectAnalyticsRecalculationReason,
): ValueObjectAnalyticsRecalculationQueuePriority {
  if (reason === "value_object_hierarchy_changed") {
    return "high";
  }

  if (reason === "target_standard_changed") {
    return "normal";
  }

  return "low";
}

export function createValueObjectAnalyticsRecalculationJob(input: {
  id: string;
  createdAt: string;
  reason: ValueObjectAnalyticsRecalculationReason;
  scope: ValueObjectAnalyticsRecalculationScope;
  sourceFactIds?: string[];
  priority?: ValueObjectAnalyticsRecalculationQueuePriority;
  notes?: string[];
}): ValueObjectAnalyticsRecalculationJob {
  return {
    id: input.id,
    createdAt: input.createdAt,
    reason: input.reason,
    priority: input.priority ?? resolveDefaultPriority(input.reason),
    status: "queued",
    scope: input.scope,
    invalidates: resolveInvalidation(input.reason),
    sourceFactIds: input.sourceFactIds ?? [],
    notes: input.notes ?? [],
  };
}

export function resolveValueObjectAnalyticsRecalculationQueueSummary(
  jobs: ValueObjectAnalyticsRecalculationJob[],
): ValueObjectAnalyticsRecalculationQueueSummary {
  return jobs.reduce<ValueObjectAnalyticsRecalculationQueueSummary>(
    (summary, job) => ({
      totalJobs: summary.totalJobs + 1,
      queuedJobs: summary.queuedJobs + (job.status === "queued" ? 1 : 0),
      blockedJobs:
        summary.blockedJobs +
        (job.status === "blocked_no_write_adapter" ? 1 : 0),
      highPriorityJobs:
        summary.highPriorityJobs +
        (job.priority === "high" || job.priority === "urgent" ? 1 : 0),
      parentRollupJobs:
        summary.parentRollupJobs + (job.invalidates.parentRollups ? 1 : 0),
      currentSnapshotJobs:
        summary.currentSnapshotJobs +
        (job.invalidates.currentSnapshot ? 1 : 0),
      dailyAggregateJobs:
        summary.dailyAggregateJobs +
        (job.invalidates.dailyAggregates ? 1 : 0),
    }),
    {
      totalJobs: 0,
      queuedJobs: 0,
      blockedJobs: 0,
      highPriorityJobs: 0,
      parentRollupJobs: 0,
      currentSnapshotJobs: 0,
      dailyAggregateJobs: 0,
    },
  );
}

export function createValueObjectAnalyticsRecalculationQueueContract(
  jobs: ValueObjectAnalyticsRecalculationJob[],
): ValueObjectAnalyticsRecalculationQueueContract {
  return {
    marker: analyticsRecalculationQueueMarker,
    mode: "no_write_contract",
    jobs,
    summary: resolveValueObjectAnalyticsRecalculationQueueSummary(jobs),
    currentResolverPreview: resolveDemoFamilyTimeAnalytics(),
    safety: {
      writesToDatabase: false,
      executesSql: false,
      callsExternalModels: false,
      requiresCommitGate: true,
      requiresPushGate: true,
    },
  };
}

export function createDemoFamilyTimeAnalyticsRecalculationQueue(): ValueObjectAnalyticsRecalculationQueueContract {
  const familyTimeJob = createValueObjectAnalyticsRecalculationJob({
    id: "analytics-recalc-family-time-step65-demo",
    createdAt: "2026-06-19T00:00:00.000Z",
    reason: "activity_fact_created",
    scope: {
      actorId: "demo-actor",
      valueObjectId: "family-time",
      dateFrom: "2026-06-19",
      dateTo: "2026-06-19",
      includeParentRollups: false,
    },
    sourceFactIds: ["demo-family-time-fact-001"],
    notes: [
      "Step 65 no-write queue contract.",
      "A real background worker can later consume the same job shape.",
      "Parent rollups stay explicit because hierarchy can change dynamically.",
    ],
  });

  return createValueObjectAnalyticsRecalculationQueueContract([familyTimeJob]);
}
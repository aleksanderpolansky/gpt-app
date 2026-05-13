"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const DEFAULT_TIMEZONE = "Europe/Warsaw";

const EXCLUDED_ACTIVITY_STATUSES = new Set([
  "cancelled",
  "missed",
  "archived",
  "corrected",
  "status_corrected",
]);

type DaySummaryEvent = {
  id: string;
  title: string | null;
  status: string;
  source: string;
  privacyScope: string;
  processingStatus: string;
  startedAt: string | null;
  endedAt: string | null;
  durationMinutes: number | null;
  comment: string | null;
  activityTypeId: string | null;
  activityTemplateId: string | null;
  legacyTemplateId: string | null;
  createdAt: string;
  updatedAt: string;
  isEffectiveForDuration?: boolean;
  isExcludedFromEffectiveDuration?: boolean;
};

type DaySummaryAggregate = {
  id: string;
  aggregateDate: string;
  aggregateType: string;
  aggregateKey: string;
  metricKey: string;
  metricValueNumeric: number;
  metricValueText: string | null;
  metricUnit: string | null;
  source: string;
  lastEventId: string | null;
  createdAt: string;
  updatedAt: string;
};

type DaySummarySnapshot = {
  id: string;
  snapshotEntityType: string;
  snapshotEntityKey: string;
  metricKey: string;
  metricValueNumeric: number | null;
  metricValueText: string | null;
  metricUnit: string | null;
  lastEventId: string | null;
  createdAt: string;
  updatedAt: string;
};

type DaySummaryResponse = {
  ok: boolean;
  error?: string;
  date?: string;
  timezone?: string;
  timezoneMode?: string;
  dayRange?: {
    from: string;
    to: string;
    timezone?: string;
    localDate?: string;
  };
  filters?: {
    limit: number;
    timezone?: string;
  };
  summary?: {
    events: {
      totalEvents: number;
      completedEvents: number;
      openEvents: number;
      cancelledEvents?: number;
      missedEvents?: number;
      archivedEvents?: number;
      correctedEvents?: number;
      effectiveEvents?: number;
      excludedEvents?: number;
      totalDurationMinutes: number;
      effectiveDurationMinutes?: number;
      rawDurationMinutes?: number;
      excludedDurationMinutes?: number;
      cancelledDurationMinutes?: number;
      missedDurationMinutes?: number;
      archivedDurationMinutes?: number;
      correctedDurationMinutes?: number;
      durationPolicy?: {
        totalDurationMinutesMeans?: string;
        effectiveStatuses?: string[];
        excludedStatuses?: string[];
        failedProcessingStatusExcluded?: boolean;
      };
      byStatus: Record<string, number>;
      byProcessingStatus: Record<string, number>;
      bySource: Record<string, number>;
    };
    dailyAggregates: {
      totalRows: number;
      totalsByAggregateType: Array<{
        aggregateType: string;
        totalNumericValue: number;
        itemsCount: number;
      }>;
    };
    currentSnapshots: {
      totalRows: number;
    };
  };
  latestEvents?: DaySummaryEvent[];
  openEvents?: DaySummaryEvent[];
  dailyAggregates?: DaySummaryAggregate[];
  currentSnapshots?: DaySummarySnapshot[];
  note?: string;
};

type CorrectionDraft = {
  durationMinutes: string;
  comment: string;
  reason: string;
};

type CorrectionState = {
  loading: boolean;
  error: string | null;
  result: unknown | null;
};

type CorrectionMode = "duration_comment" | "cancelled";

type TimelineConflictSeverity = "info" | "warning" | "blocking";

type TimelineConflictCandidate = {
  eventId: string;
  title: string | null;
  status: string;
  processingStatus: string | null;
  source: string | null;
  currentStartedAt: string | null;
  currentEndedAt: string | null;
  currentDurationMinutes: number | null;
  suggestedStartedAt: string | null;
  suggestedEndedAt: string | null;
  suggestedDurationMinutes: number | null;
  conflictTypes: string[];
  severity: TimelineConflictSeverity;
  isSuggestedChange: boolean;
  explanation: string;
};

type TimelineConflictDetectionResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
  correctedEventId: string;
  previousInterval: {
    startedAt: string | null;
    endedAt: string | null;
    durationMinutes: number | null;
  };
  newInterval: {
    startedAt: string | null;
    endedAt: string | null;
    durationMinutes: number | null;
  };
  searchRange?: {
    from: string;
    to: string;
  };
  summary: {
    candidatesCount: number;
    suggestedChangesCount: number;
    blockingCandidatesCount: number;
  };
  candidates: TimelineConflictCandidate[];
};

type CorrectionPatchResponse = {
  ok: boolean;
  status?: string;
  error?: string;
  warning?: string;
  changedFields?: string[];
  event?: Record<string, unknown>;
  correction?: Record<string, unknown>;
  recalculation?: unknown;
  rollback?: unknown;
  timeline?: TimelineConflictDetectionResult;
  audit?: Record<string, unknown>;
  recovery?: unknown;
};

type CorrectionHistoryItem = {
  id: string;
  eventId: string;
  correctionType: string;
  correctionStatus: string;
  changedFields: string[];
  reason: string | null;
  source: string | null;
  createdAt: string;
  previousEvent: unknown;
  newEvent: unknown;
  previousImpactEvents: unknown;
  previousDailyAggregates: unknown;
  previousCurrentSnapshots: unknown;
  recalculationResult: unknown;
};

type CorrectionHistoryResponse = {
  ok: boolean;
  error?: string;
  endpoint?: string;
  eventId?: string;
  filters?: {
    limit: number;
  };
  summary?: {
    totalCorrectionsReturned: number;
  };
  corrections?: CorrectionHistoryItem[];
};

type CorrectionHistoryState = {
  loading: boolean;
  error: string | null;
  response: CorrectionHistoryResponse | null;
};

function getTodayDateForTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return new Date().toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    timeZone: DEFAULT_TIMEZONE,
  });
}

function formatMetricValue(
  value: number | null | undefined,
  unit: string | null | undefined
) {
  if (value === null || value === undefined) {
    return "—";
  }

  return unit ? `${value} ${unit}` : String(value);
}

function formatMinutes(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }

  return `${value} min`;
}

function humanizeKey(value: string) {
  return value.replaceAll("_", " ");
}

function getDefaultCorrectionDraft(event: DaySummaryEvent): CorrectionDraft {
  return {
    durationMinutes: String(event.durationMinutes ?? 0),
    comment: event.comment ?? "",
    reason: "Manual correction from Activity Today UI",
  };
}

function parseDurationInput(value: string) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function isExcludedActivityRecord(event: DaySummaryEvent) {
  return (
    event.isExcludedFromEffectiveDuration === true ||
    EXCLUDED_ACTIVITY_STATUSES.has(event.status) ||
    event.processingStatus === "failed"
  );
}

function isCountedActivityRecord(event: DaySummaryEvent) {
  if (isExcludedActivityRecord(event)) {
    return false;
  }

  return event.isEffectiveForDuration === true || event.status === "completed";
}

function getExcludedRecordReason(event: DaySummaryEvent) {
  if (event.isExcludedFromEffectiveDuration) {
    return "Excluded from effective duration by day-summary policy.";
  }

  if (event.processingStatus === "failed") {
    return "Processing failed, so this record is kept for audit and excluded from effective progress.";
  }

  if (EXCLUDED_ACTIVITY_STATUSES.has(event.status)) {
    return `Status "${event.status}" is treated as audit/history, not as effective activity.`;
  }

  return "This record is kept for audit and does not affect effective duration.";
}

function getTimelineSeverityClasses(severity: TimelineConflictSeverity) {
  if (severity === "blocking") {
    return "border-red-900/70 bg-red-950/30 text-red-100";
  }

  if (severity === "warning") {
    return "border-amber-900/70 bg-amber-950/20 text-amber-100";
  }

  return "border-zinc-800 bg-zinc-950 text-zinc-200";
}

function getTimelineBadgeClasses(severity: TimelineConflictSeverity) {
  if (severity === "blocking") {
    return "bg-red-950 text-red-200";
  }

  if (severity === "warning") {
    return "bg-amber-950 text-amber-200";
  }

  return "bg-zinc-800 text-zinc-300";
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-[620px] overflow-auto rounded-2xl border border-zinc-800 bg-black p-4 text-xs leading-relaxed text-zinc-200">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-500">
      {text}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-black/50 p-5">
      <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-2 text-sm text-zinc-500">{hint}</p> : null}
    </div>
  );
}

function TechnicalCounters({
  summary,
}: {
  summary: DaySummaryResponse | null;
}) {
  const eventSummary = summary?.summary?.events;

  if (!eventSummary) {
    return <EmptyState text="Load a day summary first." />;
  }

  return (
    <details className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-zinc-300 hover:text-emerald-300">
        Technical counters for debugging
      </summary>

      <div className="mt-4 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-zinc-900 bg-zinc-950 p-3">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">
            Raw activity records
          </p>
          <p className="mt-2 text-xl font-semibold text-white">
            {eventSummary.totalEvents}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-900 bg-zinc-950 p-3">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">
            Excluded records
          </p>
          <p className="mt-2 text-xl font-semibold text-white">
            {eventSummary.excludedEvents ?? 0}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-900 bg-zinc-950 p-3">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">
            Raw duration
          </p>
          <p className="mt-2 text-xl font-semibold text-white">
            {formatMinutes(eventSummary.rawDurationMinutes)}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-900 bg-zinc-950 p-3">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">
            Excluded duration
          </p>
          <p className="mt-2 text-xl font-semibold text-white">
            {formatMinutes(eventSummary.excludedDurationMinutes)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-xs text-zinc-500 md:grid-cols-2">
        <p>Cancelled: {eventSummary.cancelledEvents ?? 0}</p>
        <p>Missed: {eventSummary.missedEvents ?? 0}</p>
        <p>Archived: {eventSummary.archivedEvents ?? 0}</p>
        <p>Corrected records: {eventSummary.correctedEvents ?? 0}</p>
      </div>
    </details>
  );
}

function TimelineCheckPanel({
  timeline,
}: {
  timeline: TimelineConflictDetectionResult | undefined;
}) {
  if (!timeline) {
    return null;
  }

  if (!timeline.ok) {
    return (
      <div className="mt-4 rounded-2xl border border-red-900/70 bg-red-950/30 p-4 text-xs leading-5 text-red-100">
        <p className="font-semibold">Timeline check failed.</p>
        <p className="mt-1">{timeline.error ?? "Unknown timeline error."}</p>
      </div>
    );
  }

  const candidates = timeline.candidates ?? [];
  const hasCandidates = candidates.length > 0;

  return (
    <details
      className={[
        "mt-4 rounded-2xl border p-4",
        hasCandidates
          ? "border-amber-900/60 bg-amber-950/10"
          : "border-emerald-900/60 bg-emerald-950/10",
      ].join(" ")}
      open={hasCandidates}
    >
      <summary
        className={[
          "cursor-pointer text-xs font-semibold uppercase tracking-[0.18em]",
          hasCandidates ? "text-amber-200" : "text-emerald-300",
        ].join(" ")}
      >
        Timeline check
      </summary>

      <div className="mt-4 grid gap-3">
        <div className="grid gap-3 text-xs md:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-black/30 p-3">
            <p className="uppercase tracking-[0.16em] text-zinc-600">
              Candidates
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {timeline.summary.candidatesCount}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-black/30 p-3">
            <p className="uppercase tracking-[0.16em] text-zinc-600">
              Suggested changes
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {timeline.summary.suggestedChangesCount}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-black/30 p-3">
            <p className="uppercase tracking-[0.16em] text-zinc-600">
              Blocking
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {timeline.summary.blockingCandidatesCount}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-black/30 p-3 text-xs leading-5 text-zinc-400">
          <p>
            Corrected interval: {formatDateTime(timeline.previousInterval.endedAt)}{" "}
            → {formatDateTime(timeline.newInterval.endedAt)}
          </p>
          <p className="mt-1">
            Duration: {formatMinutes(timeline.previousInterval.durationMinutes)}{" "}
            → {formatMinutes(timeline.newInterval.durationMinutes)}
          </p>
          {timeline.skipped ? (
            <p className="mt-2 text-zinc-500">
              Timeline detection skipped: {timeline.reason ?? "no reason"}
            </p>
          ) : null}
        </div>

        {!hasCandidates && !timeline.skipped ? (
          <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-3 text-xs leading-5 text-emerald-200">
            No affected activities detected.
          </div>
        ) : null}

        {candidates.map((candidate) => (
          <div
            className={[
              "rounded-xl border p-3 text-xs leading-5",
              getTimelineSeverityClasses(candidate.severity),
            ].join(" ")}
            key={candidate.eventId}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-white">
                  {candidate.title ?? "Untitled activity"}
                </p>
                <p className="mt-1 text-zinc-500">
                  {candidate.source ?? "unknown source"} · {candidate.status} /{" "}
                  {candidate.processingStatus ?? "unknown"}
                </p>
              </div>

              <span
                className={[
                  "rounded-full px-2.5 py-1 text-xs",
                  getTimelineBadgeClasses(candidate.severity),
                ].join(" ")}
              >
                {candidate.severity}
              </span>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <div className="rounded-lg border border-zinc-800 bg-black/30 p-2">
                <p className="uppercase tracking-[0.16em] text-zinc-600">
                  Current
                </p>
                <p className="mt-1 text-zinc-200">
                  {formatDateTime(candidate.currentStartedAt)} →{" "}
                  {formatDateTime(candidate.currentEndedAt)}
                </p>
                <p className="mt-1 text-zinc-500">
                  {formatMinutes(candidate.currentDurationMinutes)}
                </p>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-black/30 p-2">
                <p className="uppercase tracking-[0.16em] text-zinc-600">
                  Suggested
                </p>
                <p className="mt-1 text-zinc-200">
                  {formatDateTime(candidate.suggestedStartedAt)} →{" "}
                  {formatDateTime(candidate.suggestedEndedAt)}
                </p>
                <p className="mt-1 text-zinc-500">
                  {formatMinutes(candidate.suggestedDurationMinutes)}
                </p>
              </div>
            </div>

            <p className="mt-3 text-zinc-400">{candidate.explanation}</p>

            <p className="mt-2 text-zinc-500">
              Conflict types:{" "}
              {candidate.conflictTypes.length > 0
                ? candidate.conflictTypes.join(", ")
                : "—"}
            </p>

            <p className="mt-2 text-zinc-500">
              Suggested change: {candidate.isSuggestedChange ? "yes" : "no"}
            </p>
          </div>
        ))}

        <details>
          <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-300">
            Timeline JSON
          </summary>
          <div className="mt-3">
            <JsonBlock value={timeline} />
          </div>
        </details>
      </div>
    </details>
  );
}

function CorrectionHistoryPanel({
  eventId,
  state,
  onLoad,
}: {
  eventId: string;
  state: CorrectionHistoryState | undefined;
  onLoad: () => void;
}) {
  const corrections = state?.response?.corrections ?? [];
  const hasLoaded = Boolean(state?.response || state?.error);

  return (
    <details className="mt-4 rounded-2xl border border-zinc-800 bg-black/30 p-4">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400 hover:text-emerald-300">
        Correction history
      </summary>

      <div className="mt-4 grid gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-xs leading-5 text-zinc-500">
            Read-only audit history from activity_corrections. It is loaded on
            demand and stays outside the main activity interpretation.
          </p>

          <button
            className="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 hover:border-emerald-500 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={state?.loading ?? false}
            onClick={onLoad}
            type="button"
          >
            {state?.loading
              ? "Loading..."
              : hasLoaded
                ? "Refresh history"
                : "Load history"}
          </button>
        </div>

        {state?.error ? (
          <div className="rounded-xl border border-red-900/70 bg-red-950/40 p-3 text-xs leading-5 text-red-200">
            {state.error}
          </div>
        ) : null}

        {!hasLoaded && !state?.loading ? (
          <EmptyState text="Correction history is not loaded yet." />
        ) : null}

        {state?.response?.ok && corrections.length === 0 ? (
          <EmptyState text="No correction history for this event." />
        ) : null}

        {corrections.map((correction) => (
          <div
            className="rounded-xl border border-zinc-800 bg-zinc-950 p-3"
            key={correction.id}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-white">
                  {humanizeKey(correction.correctionType)}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {formatDateTime(correction.createdAt)} ·{" "}
                  {correction.source ?? "unknown source"}
                </p>
              </div>

              <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300">
                {correction.correctionStatus}
              </span>
            </div>

            <p className="mt-3 text-xs text-zinc-400">
              Changed fields:{" "}
              {correction.changedFields.length > 0
                ? correction.changedFields.join(", ")
                : "—"}
            </p>

            <p className="mt-2 text-xs text-zinc-500">
              Reason: {correction.reason ?? "—"}
            </p>

            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-300">
                Correction audit JSON
              </summary>
              <div className="mt-3">
                <JsonBlock value={correction} />
              </div>
            </details>
          </div>
        ))}

        {state?.response?.ok ? (
          <p className="text-xs text-zinc-600">
            Returned corrections:{" "}
            {state.response.summary?.totalCorrectionsReturned ??
              corrections.length}{" "}
            · event: {eventId}
          </p>
        ) : null}
      </div>
    </details>
  );
}

function EventCorrectionControls({
  event,
  draft,
  state,
  onDraftChange,
  onSubmit,
}: {
  event: DaySummaryEvent;
  draft: CorrectionDraft;
  state: CorrectionState | undefined;
  onDraftChange: (patch: Partial<CorrectionDraft>) => void;
  onSubmit: (mode: CorrectionMode) => void;
}) {
  const isCompleted = event.status === "completed";
  const isLoading = state?.loading ?? false;
  const result = state?.result as CorrectionPatchResponse | null | undefined;

  return (
    <div className="mt-4 rounded-2xl border border-zinc-900 bg-zinc-950/70 p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Correction
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Duration/comment corrections recalculate impacts. Cancelled status
            uses rollback-only correction.
          </p>
        </div>

        <span
          className={[
            "rounded-full px-2.5 py-1 text-xs",
            isCompleted
              ? "bg-emerald-950 text-emerald-200"
              : "bg-zinc-900 text-zinc-500",
          ].join(" ")}
        >
          {isCompleted ? "editable" : "read-only"}
        </span>
      </div>

      {!isCompleted ? (
        <div className="mt-4 rounded-xl border border-zinc-800 bg-black/40 p-3 text-xs text-zinc-500">
          Corrections are available only for completed events. Current status:{" "}
          <span className="text-zinc-300">{event.status}</span>.
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          <div className="grid gap-3 md:grid-cols-[0.35fr_0.65fr]">
            <div>
              <label
                className="mb-2 block text-xs uppercase tracking-[0.18em] text-zinc-600"
                htmlFor={`duration-${event.id}`}
              >
                Duration
              </label>
              <input
                className="w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500"
                disabled={isLoading}
                id={`duration-${event.id}`}
                min={0}
                onChange={(inputEvent) =>
                  onDraftChange({ durationMinutes: inputEvent.target.value })
                }
                type="number"
                value={draft.durationMinutes}
              />
            </div>

            <div>
              <label
                className="mb-2 block text-xs uppercase tracking-[0.18em] text-zinc-600"
                htmlFor={`reason-${event.id}`}
              >
                Reason
              </label>
              <input
                className="w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500"
                disabled={isLoading}
                id={`reason-${event.id}`}
                onChange={(inputEvent) =>
                  onDraftChange({ reason: inputEvent.target.value })
                }
                value={draft.reason}
              />
            </div>
          </div>

          <div>
            <label
              className="mb-2 block text-xs uppercase tracking-[0.18em] text-zinc-600"
              htmlFor={`comment-${event.id}`}
            >
              Comment
            </label>
            <textarea
              className="min-h-20 w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-emerald-500"
              disabled={isLoading}
              id={`comment-${event.id}`}
              onChange={(inputEvent) =>
                onDraftChange({ comment: inputEvent.target.value })
              }
              value={draft.comment}
            />
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <button
              className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-black hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
              onClick={() => onSubmit("duration_comment")}
              type="button"
            >
              {isLoading ? "Saving..." : "Save duration/comment"}
            </button>

            <button
              className="rounded-xl border border-red-700 bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-100 hover:bg-red-900/40 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
              onClick={() => onSubmit("cancelled")}
              type="button"
            >
              {isLoading ? "Rolling back..." : "Mark cancelled + rollback"}
            </button>
          </div>
        </div>
      )}

      {state?.error ? (
        <div className="mt-4 rounded-xl border border-red-900/70 bg-red-950/40 p-3 text-xs leading-5 text-red-200">
          {state.error}
        </div>
      ) : null}

      {result?.ok ? (
        <div className="mt-4 rounded-xl border border-emerald-900/70 bg-emerald-950/30 p-3 text-xs leading-5 text-emerald-200">
          <p className="font-semibold">Correction applied.</p>
          <p className="mt-1">
            Status: {result.status ?? "ok"} · changed fields:{" "}
            {result.changedFields?.join(", ") ?? "—"}
          </p>
          {result.warning ? <p className="mt-1">{result.warning}</p> : null}
        </div>
      ) : null}

      {result?.ok ? <TimelineCheckPanel timeline={result.timeline} /> : null}

      {state?.result ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-300">
            Correction response JSON
          </summary>
          <div className="mt-3">
            <JsonBlock value={state.result} />
          </div>
        </details>
      ) : null}
    </div>
  );
}

function CountedActivityCard({
  event,
  draft,
  state,
  historyState,
  onDraftChange,
  onSubmit,
  onLoadHistory,
}: {
  event: DaySummaryEvent;
  draft: CorrectionDraft;
  state: CorrectionState | undefined;
  historyState: CorrectionHistoryState | undefined;
  onDraftChange: (patch: Partial<CorrectionDraft>) => void;
  onSubmit: (mode: CorrectionMode) => void;
  onLoadHistory: () => void;
}) {
  return (
    <div className="rounded-2xl border border-emerald-900/50 bg-emerald-950/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-white">
          {event.title ?? "Untitled activity"}
        </p>
        <span className="rounded-full bg-emerald-950 px-2.5 py-1 text-xs text-emerald-200">
          counted · {event.status} / {event.processingStatus}
        </span>
      </div>

      <p className="mt-2 text-xs text-zinc-500">
        {event.durationMinutes ?? 0} min · {event.source} · started{" "}
        {formatDateTime(event.startedAt)}
      </p>

      <p className="mt-2 text-xs text-zinc-400">
        {event.comment ?? "no comment"}
      </p>

      <EventCorrectionControls
        draft={draft}
        event={event}
        onDraftChange={onDraftChange}
        onSubmit={onSubmit}
        state={state}
      />

      <CorrectionHistoryPanel
        eventId={event.id}
        onLoad={onLoadHistory}
        state={historyState}
      />
    </div>
  );
}

function ExcludedActivityCard({ event }: { event: DaySummaryEvent }) {
  return (
    <div className="rounded-2xl border border-amber-900/50 bg-amber-950/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-white">
          {event.title ?? "Untitled activity"}
        </p>
        <span className="rounded-full bg-amber-950 px-2.5 py-1 text-xs text-amber-200">
          excluded · {event.status} / {event.processingStatus}
        </span>
      </div>

      <p className="mt-2 text-xs text-zinc-500">
        {event.durationMinutes ?? 0} min · {event.source} · started{" "}
        {formatDateTime(event.startedAt)}
      </p>

      <p className="mt-2 text-xs text-amber-300">
        {getExcludedRecordReason(event)}
      </p>

      <p className="mt-2 text-xs text-zinc-400">
        {event.comment ?? "no comment"}
      </p>

      <div className="mt-4 rounded-xl border border-zinc-800 bg-black/30 p-3 text-xs leading-5 text-zinc-500">
        Read-only audit record. Correction controls are hidden because this
        record is not counted as effective activity.
      </div>
    </div>
  );
}

export default function ActivityTodayPage() {
  const [date, setDate] = useState(getTodayDateForTimezone(DEFAULT_TIMEZONE));
  const [summary, setSummary] = useState<DaySummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRawSummary, setShowRawSummary] = useState(false);
  const [correctionDrafts, setCorrectionDrafts] = useState<
    Record<string, CorrectionDraft>
  >({});
  const [correctionStates, setCorrectionStates] = useState<
    Record<string, CorrectionState>
  >({});
  const [correctionHistoryStates, setCorrectionHistoryStates] = useState<
    Record<string, CorrectionHistoryState>
  >({});

  const dailyAggregates = summary?.dailyAggregates ?? [];
  const currentSnapshots = summary?.currentSnapshots ?? [];
  const latestEvents = summary?.latestEvents ?? [];
  const openEvents = summary?.openEvents ?? [];

  const countedEvents = useMemo(
    () => latestEvents.filter((event) => isCountedActivityRecord(event)),
    [latestEvents]
  );

  const excludedEvents = useMemo(
    () => latestEvents.filter((event) => isExcludedActivityRecord(event)),
    [latestEvents]
  );

  const otherLatestRecords = useMemo(
    () =>
      latestEvents.filter(
        (event) =>
          !isCountedActivityRecord(event) && !isExcludedActivityRecord(event)
      ),
    [latestEvents]
  );

  const aggregatesByType = useMemo(() => {
    const result = new Map<string, DaySummaryAggregate[]>();

    for (const aggregate of dailyAggregates) {
      const current = result.get(aggregate.aggregateType) ?? [];
      current.push(aggregate);
      result.set(aggregate.aggregateType, current);
    }

    return Array.from(result.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [dailyAggregates]);

  const snapshotsByEntityType = useMemo(() => {
    const result = new Map<string, DaySummarySnapshot[]>();

    for (const snapshot of currentSnapshots) {
      const current = result.get(snapshot.snapshotEntityType) ?? [];
      current.push(snapshot);
      result.set(snapshot.snapshotEntityType, current);
    }

    return Array.from(result.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [currentSnapshots]);

  async function loadSummary(targetDate = date) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/activity/day-summary?date=${encodeURIComponent(
          targetDate
        )}&timezone=${encodeURIComponent(DEFAULT_TIMEZONE)}&limit=20`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const body = (await response.json()) as DaySummaryResponse;

      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Failed to load day summary");
      }

      setSummary(body);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unknown day summary error"
      );
    } finally {
      setLoading(false);
    }
  }

  function getCorrectionDraft(event: DaySummaryEvent) {
    return correctionDrafts[event.id] ?? getDefaultCorrectionDraft(event);
  }

  function updateCorrectionDraft(
    event: DaySummaryEvent,
    patch: Partial<CorrectionDraft>
  ) {
    setCorrectionDrafts((current) => ({
      ...current,
      [event.id]: {
        ...getDefaultCorrectionDraft(event),
        ...(current[event.id] ?? {}),
        ...patch,
      },
    }));
  }

  function setCorrectionState(eventId: string, state: CorrectionState) {
    setCorrectionStates((current) => ({
      ...current,
      [eventId]: state,
    }));
  }

  function setCorrectionHistoryState(
    eventId: string,
    state: CorrectionHistoryState
  ) {
    setCorrectionHistoryStates((current) => ({
      ...current,
      [eventId]: state,
    }));
  }

  async function loadCorrectionHistory(eventId: string) {
    setCorrectionHistoryState(eventId, {
      loading: true,
      error: null,
      response: correctionHistoryStates[eventId]?.response ?? null,
    });

    try {
      const response = await fetch(
        `/api/activity/events/${encodeURIComponent(
          eventId
        )}/corrections?limit=20`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const body = (await response.json()) as CorrectionHistoryResponse;

      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Failed to load correction history");
      }

      setCorrectionHistoryState(eventId, {
        loading: false,
        error: null,
        response: body,
      });
    } catch (requestError) {
      setCorrectionHistoryState(eventId, {
        loading: false,
        error:
          requestError instanceof Error
            ? requestError.message
            : "Unknown correction history error",
        response: null,
      });
    }
  }

  async function submitCorrection(event: DaySummaryEvent, mode: CorrectionMode) {
    const draft = getCorrectionDraft(event);

    if (event.status !== "completed") {
      setCorrectionState(event.id, {
        loading: false,
        error: "Only completed events can be corrected from this panel.",
        result: null,
      });
      return;
    }

    const reason =
      draft.reason.trim() ||
      (mode === "cancelled"
        ? "Cancelled from Activity Today UI"
        : "Duration/comment correction from Activity Today UI");

    const body: Record<string, unknown> = {
      comment: draft.comment,
      reason,
    };

    if (mode === "duration_comment") {
      const durationMinutes = parseDurationInput(draft.durationMinutes);

      if (durationMinutes === null) {
        setCorrectionState(event.id, {
          loading: false,
          error: "Duration must be a valid non-negative number.",
          result: null,
        });
        return;
      }

      body.durationMinutes = durationMinutes;
    }

    if (mode === "cancelled") {
      body.status = "cancelled";
    }

    setCorrectionState(event.id, {
      loading: true,
      error: null,
      result: null,
    });

    try {
      const response = await fetch(
        `/api/activity/events/${encodeURIComponent(event.id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const result = (await response.json()) as CorrectionPatchResponse;

      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? "Failed to apply correction");
      }

      setCorrectionState(event.id, {
        loading: false,
        error: null,
        result,
      });

      await loadSummary(date);
      await loadCorrectionHistory(event.id);
    } catch (requestError) {
      setCorrectionState(event.id, {
        loading: false,
        error:
          requestError instanceof Error
            ? requestError.message
            : "Unknown correction error",
        result: null,
      });
    }
  }

  useEffect(() => {
    void loadSummary(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const eventSummary = summary?.summary?.events;
  const aggregateSummary = summary?.summary?.dailyAggregates;
  const snapshotSummary = summary?.summary?.currentSnapshots;
  const activeTimezone = summary?.timezone ?? DEFAULT_TIMEZONE;
  const timezoneMode = summary?.timezoneMode ?? "local";

  const effectiveDurationMinutes =
    eventSummary?.effectiveDurationMinutes ?? eventSummary?.totalDurationMinutes;

  const rawDurationMinutes = eventSummary?.rawDurationMinutes;
  const excludedDurationMinutes = eventSummary?.excludedDurationMinutes;

  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-6 text-zinc-100 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-2xl shadow-black/40">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.3em] text-emerald-400">
                Activity Recording Layer v2
              </p>
              <h1 className="text-2xl font-semibold text-white md:text-3xl">
                Today Activity Panel
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                Dev dashboard based on the day-summary API. The main cards show
                useful completed work, productive time, open activities and
                tracked progress metrics. Technical records stay in debug.
              </p>
              <p className="mt-2 text-xs text-zinc-600">
                Current date mode: {activeTimezone} local day. API timezone
                mode: {timezoneMode}.
              </p>
              {summary?.dayRange ? (
                <p className="mt-2 text-xs text-zinc-700">
                  UTC range: {summary.dayRange.from} → {summary.dayRange.to}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2 text-sm">
              <Link
                className="rounded-full border border-zinc-700 px-4 py-2 text-zinc-200 hover:border-emerald-500 hover:text-emerald-300"
                href="/activity-capture"
              >
                Capture UI
              </Link>
              <Link
                className="rounded-full border border-zinc-700 px-4 py-2 text-zinc-200 hover:border-emerald-500 hover:text-emerald-300"
                href={`/api/activity/day-summary?date=${encodeURIComponent(
                  date
                )}&timezone=${encodeURIComponent(DEFAULT_TIMEZONE)}`}
                target="_blank"
              >
                Day Summary API
              </Link>
              <Link
                className="rounded-full border border-zinc-700 px-4 py-2 text-zinc-200 hover:border-emerald-500 hover:text-emerald-300"
                href="/api/activity/events?limit=10"
                target="_blank"
              >
                Events API
              </Link>
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto] lg:items-end">
            <div>
              <label
                className="mb-2 block text-xs uppercase tracking-[0.22em] text-zinc-500"
                htmlFor="summary-date"
              >
                Summary date ({DEFAULT_TIMEZONE})
              </label>
              <input
                className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-100 outline-none focus:border-emerald-500"
                id="summary-date"
                onChange={(event) => setDate(event.target.value)}
                type="date"
                value={date}
              />
            </div>

            <button
              className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading}
              onClick={() => void loadSummary(date)}
              type="button"
            >
              {loading ? "Loading..." : "Load summary"}
            </button>

            <button
              className="rounded-2xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-200 hover:border-emerald-500 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading}
              onClick={() => {
                const today = getTodayDateForTimezone(DEFAULT_TIMEZONE);
                setDate(today);
                void loadSummary(today);
              }}
              type="button"
            >
              Today Warsaw
            </button>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-900/70 bg-red-950/40 p-4 text-sm text-red-200">
              {error}
            </div>
          ) : null}
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Completed activities"
            value={eventSummary?.completedEvents ?? "—"}
            hint="Useful completed activities counted for this day"
          />
          <StatCard
            label="Effective duration"
            value={
              effectiveDurationMinutes !== undefined
                ? `${effectiveDurationMinutes} min`
                : "—"
            }
            hint={
              rawDurationMinutes !== undefined &&
              excludedDurationMinutes !== undefined
                ? `Raw: ${rawDurationMinutes} min · excluded: ${excludedDurationMinutes} min`
                : "Productive time after corrections and rollbacks"
            }
          />
          <StatCard
            label="Open activities"
            value={eventSummary?.openEvents ?? "—"}
            hint="Started or pending activities"
          />
          <StatCard
            label="Progress metrics"
            value={aggregateSummary?.totalRows ?? "—"}
            hint={`Snapshots: ${snapshotSummary?.totalRows ?? "—"}`}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h2 className="text-lg font-semibold text-white">
              Daily aggregate totals
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Grouped summary from daily_aggregates.
            </p>

            <div className="mt-4 grid gap-3">
              {summary?.summary?.dailyAggregates.totalsByAggregateType.map(
                (item) => (
                  <div
                    className="rounded-2xl border border-zinc-800 bg-black/50 p-4"
                    key={item.aggregateType}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {humanizeKey(item.aggregateType)}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {item.itemsCount} metric rows
                        </p>
                      </div>
                      <p className="text-xl font-semibold text-emerald-300">
                        {item.totalNumericValue}
                      </p>
                    </div>
                  </div>
                )
              )}

              {summary && summary.summary?.dailyAggregates.totalRows === 0 ? (
                <EmptyState text="No daily aggregates for this date." />
              ) : null}

              {!summary ? <EmptyState text="Load a day summary first." /> : null}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h2 className="text-lg font-semibold text-white">
              Daily aggregate details
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Exact rows used for daily progress and future rings.
            </p>

            <div className="mt-4 grid gap-4">
              {aggregatesByType.map(([aggregateType, rows]) => (
                <div
                  className="rounded-2xl border border-zinc-800 bg-black/50 p-4"
                  key={aggregateType}
                >
                  <h3 className="text-sm font-semibold text-white">
                    {humanizeKey(aggregateType)}
                  </h3>

                  <div className="mt-3 grid gap-2">
                    {rows.map((row) => (
                      <div
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-900 bg-zinc-950 px-3 py-2 text-sm"
                        key={row.id}
                      >
                        <div>
                          <p className="text-zinc-200">
                            {humanizeKey(row.aggregateKey)}
                          </p>
                          <p className="mt-1 text-xs text-zinc-600">
                            metric: {row.metricKey} · source: {row.source}
                          </p>
                        </div>
                        <p className="font-semibold text-emerald-300">
                          {formatMetricValue(
                            row.metricValueNumeric,
                            row.metricUnit
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {dailyAggregates.length === 0 ? (
                <EmptyState text="No aggregate rows for this date." />
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h2 className="text-lg font-semibold text-white">
              Counted activities
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Completed and effective records counted in the selected{" "}
              {DEFAULT_TIMEZONE} day. Correction controls are available only
              here.
            </p>

            <div className="mt-4 grid gap-3">
              {countedEvents.map((event) => (
                <CountedActivityCard
                  draft={getCorrectionDraft(event)}
                  event={event}
                  historyState={correctionHistoryStates[event.id]}
                  key={event.id}
                  onDraftChange={(patch) =>
                    updateCorrectionDraft(event, patch)
                  }
                  onLoadHistory={() => void loadCorrectionHistory(event.id)}
                  onSubmit={(mode) => void submitCorrection(event, mode)}
                  state={correctionStates[event.id]}
                />
              ))}

              {summary && countedEvents.length === 0 ? (
                <EmptyState text="No counted activities for this date." />
              ) : null}

              {!summary ? <EmptyState text="Load a day summary first." /> : null}
            </div>

            {excludedEvents.length > 0 ? (
              <details className="mt-5 rounded-2xl border border-amber-900/50 bg-black/30 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-amber-200 hover:text-amber-100">
                  Excluded records ({excludedEvents.length})
                </summary>

                <p className="mt-3 text-xs leading-5 text-zinc-500">
                  Excluded records are kept for audit/history but do not affect
                  effective duration or the main completed-work interpretation.
                </p>

                <div className="mt-4 grid gap-3">
                  {excludedEvents.map((event) => (
                    <ExcludedActivityCard event={event} key={event.id} />
                  ))}
                </div>
              </details>
            ) : null}

            {otherLatestRecords.length > 0 ? (
              <details className="mt-5 rounded-2xl border border-zinc-800 bg-black/30 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-zinc-300 hover:text-zinc-100">
                  Other technical records ({otherLatestRecords.length})
                </summary>

                <p className="mt-3 text-xs leading-5 text-zinc-500">
                  These records are neither counted as effective completed
                  activities nor explicitly excluded by the current day-summary
                  policy.
                </p>

                <div className="mt-4 grid gap-3">
                  {otherLatestRecords.map((event) => (
                    <div
                      className="rounded-2xl border border-zinc-800 bg-black/50 p-4"
                      key={event.id}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-white">
                          {event.title ?? "Untitled activity"}
                        </p>
                        <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300">
                          {event.status} / {event.processingStatus}
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-zinc-500">
                        {event.durationMinutes ?? 0} min · {event.source} ·
                        started {formatDateTime(event.startedAt)}
                      </p>

                      <p className="mt-2 text-xs text-zinc-400">
                        {event.comment ?? "no comment"}
                      </p>
                    </div>
                  ))}
                </div>
              </details>
            ) : null}
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h2 className="text-lg font-semibold text-white">Open sessions</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Started or pending activities detected by day-summary.
            </p>

            <div className="mt-4 grid gap-3">
              {openEvents.map((event) => (
                <div
                  className="rounded-2xl border border-blue-900/70 bg-blue-950/20 p-4"
                  key={event.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-white">
                      {event.title ?? "Untitled activity"}
                    </p>
                    <span className="rounded-full bg-blue-900 px-2.5 py-1 text-xs text-blue-100">
                      {event.status} / {event.processingStatus}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-zinc-500">
                    started: {formatDateTime(event.startedAt)}
                  </p>

                  <p className="mt-2 text-xs text-zinc-400">
                    {event.comment ?? "no comment"}
                  </p>
                </div>
              ))}

              {openEvents.length === 0 ? (
                <EmptyState text="No open sessions for this date." />
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h2 className="text-lg font-semibold text-white">
            Current snapshots
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Current accumulated state from current_snapshots. This is global
            current state, not a pure daily table.
          </p>

          <div className="mt-4 grid gap-4">
            {snapshotsByEntityType.map(([entityType, rows]) => (
              <div
                className="rounded-2xl border border-zinc-800 bg-black/50 p-4"
                key={entityType}
              >
                <h3 className="text-sm font-semibold text-white">
                  {humanizeKey(entityType)}
                </h3>

                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {rows.map((row) => (
                    <div
                      className="rounded-xl border border-zinc-900 bg-zinc-950 px-3 py-2"
                      key={row.id}
                    >
                      <p className="text-sm text-zinc-200">
                        {humanizeKey(row.snapshotEntityKey)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {humanizeKey(row.metricKey)}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-emerald-300">
                        {row.metricValueText ??
                          formatMetricValue(
                            row.metricValueNumeric,
                            row.metricUnit
                          )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {currentSnapshots.length === 0 ? (
              <EmptyState text="No current snapshots found." />
            ) : null}
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Debug and technical details
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                User-facing cards above hide raw technical counters. Open this
                section when debugging records, rollbacks, timezone ranges or
                aggregate rows.
              </p>
            </div>

            <button
              className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-emerald-500 hover:text-emerald-300"
              onClick={() => setShowRawSummary((current) => !current)}
              type="button"
            >
              {showRawSummary ? "Hide raw JSON" : "Show raw JSON"}
            </button>
          </div>

          <div className="mt-4 grid gap-4">
            <TechnicalCounters summary={summary} />

            {showRawSummary && summary ? (
              <JsonBlock value={summary} />
            ) : showRawSummary ? (
              <EmptyState text="No raw response loaded yet." />
            ) : (
              <EmptyState text="Raw JSON is hidden. Use the debug button to inspect the full day-summary response." />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
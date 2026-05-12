"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
  timezoneMode?: string;
  dayRange?: {
    from: string;
    to: string;
  };
  filters?: {
    limit: number;
  };
  summary?: {
    events: {
      totalEvents: number;
      completedEvents: number;
      openEvents: number;
      totalDurationMinutes: number;
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

function getTodayUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function formatMetricValue(value: number | null | undefined, unit: string | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }

  return unit ? `${value} ${unit}` : String(value);
}

function humanizeKey(value: string) {
  return value.replaceAll("_", " ");
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

export default function ActivityTodayPage() {
  const [date, setDate] = useState(getTodayUtcDate());
  const [summary, setSummary] = useState<DaySummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dailyAggregates = summary?.dailyAggregates ?? [];
  const currentSnapshots = summary?.currentSnapshots ?? [];
  const latestEvents = summary?.latestEvents ?? [];
  const openEvents = summary?.openEvents ?? [];

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
        `/api/activity/day-summary?date=${encodeURIComponent(targetDate)}&limit=20`,
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

  useEffect(() => {
    void loadSummary(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const eventSummary = summary?.summary?.events;
  const aggregateSummary = summary?.summary?.dailyAggregates;
  const snapshotSummary = summary?.summary?.currentSnapshots;

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
                Dev dashboard based on the day-summary API. It shows daily
                events, aggregates, current snapshots and raw response data.
              </p>
              <p className="mt-2 text-xs text-zinc-600">
                Current date mode: UTC. Local user timezone support can be added
                later for production daily reports.
              </p>
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
                href={`/api/activity/day-summary?date=${date}`}
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
                Summary date
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
                const today = getTodayUtcDate();
                setDate(today);
                void loadSummary(today);
              }}
              type="button"
            >
              Today UTC
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
            label="Total events"
            value={eventSummary?.totalEvents ?? "—"}
            hint="Events anchored to selected UTC day"
          />
          <StatCard
            label="Completed"
            value={eventSummary?.completedEvents ?? "—"}
            hint={`Open: ${eventSummary?.openEvents ?? "—"}`}
          />
          <StatCard
            label="Total duration"
            value={
              eventSummary
                ? `${eventSummary.totalDurationMinutes} min`
                : "—"
            }
            hint="Sum of duration_minutes"
          />
          <StatCard
            label="Daily aggregate rows"
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
            <h2 className="text-lg font-semibold text-white">Latest events</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Most recent events for the selected UTC day.
            </p>

            <div className="mt-4 grid gap-3">
              {latestEvents.map((event) => (
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
                    {event.durationMinutes ?? 0} min · {event.source} · started{" "}
                    {formatDateTime(event.startedAt)}
                  </p>

                  <p className="mt-2 text-xs text-zinc-400">
                    {event.comment ?? "no comment"}
                  </p>
                </div>
              ))}

              {latestEvents.length === 0 ? (
                <EmptyState text="No events for this date." />
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h2 className="text-lg font-semibold text-white">Open sessions</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Started or pending events detected by day-summary.
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
          <h2 className="text-lg font-semibold text-white">
            Raw day-summary response
          </h2>
          <div className="mt-4">
            {summary ? (
              <JsonBlock value={summary} />
            ) : (
              <EmptyState text="No raw response loaded yet." />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

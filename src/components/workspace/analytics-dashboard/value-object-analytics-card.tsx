import type { ValueObjectAnalyticsResolverResult } from "@/types/value-object-analytics";

const analyticsCardMarker = "value-object-analytics-card-step63-v1";

function formatNumber(value: number | null): string {
  if (value === null) {
    return "n/a";
  }

  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatSignedNumber(value: number | null): string {
  if (value === null) {
    return "n/a";
  }

  if (value > 0) {
    return `+${formatNumber(value)}`;
  }

  return formatNumber(value);
}

function resolveTargetDisplay(result: ValueObjectAnalyticsResolverResult): string {
  const target = result.targetValue ?? result.targetMin ?? result.targetMax;

  if (target === null) {
    return "n/a";
  }

  return formatNumber(target);
}

function resolveProgressWidth(progressPercent: number | null): string {
  if (progressPercent === null) {
    return "0%";
  }

  const normalizedProgress = Math.max(0, Math.min(progressPercent, 100));

  return `${normalizedProgress}%`;
}

function resolveStatusLabel(status: ValueObjectAnalyticsResolverResult["status"]): string {
  switch (status) {
    case "below_target":
      return "Below target";
    case "on_track":
      return "On track";
    case "above_target":
      return "Above target";
    case "outside_range":
      return "Outside range";
    case "over_target":
      return "Over target";
    case "no_data":
      return "No data";
    default:
      return status;
  }
}

export interface ValueObjectAnalyticsCardProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly result: ValueObjectAnalyticsResolverResult;
}

export function ValueObjectAnalyticsCard({
  title,
  subtitle,
  result,
}: ValueObjectAnalyticsCardProps) {
  const targetDisplay = resolveTargetDisplay(result);
  const progressWidth = resolveProgressWidth(result.progressPercent);
  const progressDisplay =
    result.progressPercent === null ? "n/a" : `${formatNumber(result.progressPercent)}%`;

  return (
    <article
      className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-xl shadow-slate-950/30"
      data-testid="value-object-analytics-card-step63"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
            {analyticsCardMarker}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              {subtitle}
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
            Status
          </p>
          <p className="mt-1 text-sm font-semibold text-cyan-100">
            {resolveStatusLabel(result.status)}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
            Actual
          </p>
          <p className="mt-2 text-2xl font-bold text-white">
            {formatNumber(result.actualValue)}
          </p>
          <p className="mt-1 text-xs text-slate-500">{result.unit}</p>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
            Target
          </p>
          <p className="mt-2 text-2xl font-bold text-white">{targetDisplay}</p>
          <p className="mt-1 text-xs text-slate-500">
            {result.unit} / {result.period}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
            Delta
          </p>
          <p className="mt-2 text-2xl font-bold text-white">
            {formatSignedNumber(result.delta)}
          </p>
          <p className="mt-1 text-xs text-slate-500">{result.unit}</p>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
            Progress
          </p>
          <p className="mt-2 text-2xl font-bold text-white">{progressDisplay}</p>
          <p className="mt-1 text-xs text-slate-500">
            {result.factsIncluded} source fact(s)
          </p>
        </div>
      </div>

      <div className="mt-6">
        <div className="h-3 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-cyan-300"
            style={{ width: progressWidth }}
          />
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
        <h3 className="text-sm font-semibold text-cyan-100">
          Recommended attention
        </h3>
        <p className="mt-2 text-sm leading-6 text-cyan-50/90">
          {result.recommendationCopy}
        </p>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-700 bg-slate-950 p-4">
        <h3 className="text-sm font-semibold text-white">Source facts</h3>
        {result.sourceFactIds.length > 0 ? (
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {result.sourceFactIds.map((factId) => (
              <li
                key={factId}
                className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2"
              >
                <span className="text-slate-500">fact_id:</span>{" "}
                <span className="font-mono text-cyan-100">{factId}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-400">
            No source facts are included for this period.
          </p>
        )}
      </section>
    </article>
  );
}

export { analyticsCardMarker };

import type {
  ValueObjectSignalTone,
  ValueObjectUiSummary,
} from "./value-object-types";
import { formatValueObjectPercent } from "./value-object-normalizer";

export interface ValueObjectSummaryStripProps {
  readonly summary: ValueObjectUiSummary;
}

interface ValueObjectSummaryMetric {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly helper: string;
  readonly tone: ValueObjectSignalTone;
}

const STRIP_CLASSES =
  "grid gap-3 sm:grid-cols-2 xl:grid-cols-5";

const CARD_CLASSES =
  "rounded-3xl border bg-white/90 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md";

const TONE_CARD_CLASS_NAMES: Record<ValueObjectSignalTone, string> = {
  slate: "border-slate-200",
  indigo: "border-indigo-200",
  emerald: "border-emerald-200",
  violet: "border-violet-200",
  amber: "border-amber-200",
  rose: "border-rose-200",
  cyan: "border-cyan-200",
};

const TONE_DOT_CLASS_NAMES: Record<ValueObjectSignalTone, string> = {
  slate: "bg-slate-400",
  indigo: "bg-indigo-500",
  emerald: "bg-emerald-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  cyan: "bg-cyan-500",
};

const TONE_VALUE_CLASS_NAMES: Record<ValueObjectSignalTone, string> = {
  slate: "text-slate-900",
  indigo: "text-indigo-700",
  emerald: "text-emerald-700",
  violet: "text-violet-700",
  amber: "text-amber-800",
  rose: "text-rose-700",
  cyan: "text-cyan-700",
};

const createSummaryMetrics = (
  summary: ValueObjectUiSummary,
): readonly ValueObjectSummaryMetric[] => [
  {
    id: "total",
    label: "Total objects",
    value: String(summary.totalObjects),
    helper: "All visible fixture objects.",
    tone: "indigo",
  },
  {
    id: "active",
    label: "Active",
    value: String(summary.activeObjects),
    helper: "Objects currently marked as active.",
    tone: "emerald",
  },
  {
    id: "review",
    label: "Needs review",
    value: String(summary.needsReviewObjects),
    helper: "Objects with review or attention signals.",
    tone: "amber",
  },
  {
    id: "private",
    label: "Private",
    value: String(summary.privateObjects),
    helper: "Objects visible in personal context.",
    tone: "violet",
  },
  {
    id: "average",
    label: "Average progress",
    value: formatValueObjectPercent(summary.averageProgressPercent),
    helper: "Display-only progress average.",
    tone: "cyan",
  },
];

function ValueObjectSummaryCard({
  metric,
}: {
  readonly metric: ValueObjectSummaryMetric;
}) {
  return (
    <article
      className={[
        CARD_CLASSES,
        TONE_CARD_CLASS_NAMES[metric.tone],
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <span
              className={[
                "h-2.5 w-2.5 rounded-full",
                TONE_DOT_CLASS_NAMES[metric.tone],
              ]
                .filter(Boolean)
                .join(" ")}
              aria-hidden="true"
            />
            <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {metric.label}
            </p>
          </div>

          <p
            className={[
              "text-3xl font-semibold tracking-tight",
              TONE_VALUE_CLASS_NAMES[metric.tone],
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {metric.value}
          </p>
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        {metric.helper}
      </p>
    </article>
  );
}

export function ValueObjectSummaryStrip({
  summary,
}: ValueObjectSummaryStripProps) {
  const metrics = createSummaryMetrics(summary);

  return (
    <section aria-label="Value Object summary metrics">
      <div className={STRIP_CLASSES}>
        {metrics.map((metric) => (
          <ValueObjectSummaryCard key={metric.id} metric={metric} />
        ))}
      </div>
    </section>
  );
}

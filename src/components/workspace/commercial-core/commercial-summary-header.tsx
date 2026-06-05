import type {
  CommercialCoreAccessState,
  CommercialCoreHeader,
  CommercialCoreStatusTone,
} from "./commercial-core.types";

type CommercialSummaryMetric = {
  readonly label: string;
  readonly value: string;
  readonly description: string;
  readonly tone: CommercialCoreStatusTone;
};

type CommercialSummaryHeaderProps = {
  readonly header: CommercialCoreHeader;
  readonly metrics: readonly CommercialSummaryMetric[];
  readonly notice: string;
};

const accessStateLabelByState: Record<CommercialCoreAccessState, string> = {
  preview: "Preview only",
  "read-only": "Read-only",
  "future-gated": "Future gate required",
  "no-rights": "No commercial rights",
};

const toneClassNameByTone: Record<CommercialCoreStatusTone, string> = {
  neutral: "border-border bg-card text-foreground",
  primary: "border-primary/20 bg-primary/10 text-primary",
  secondary: "border-border bg-secondary text-secondary-foreground",
  success: "border-border bg-card text-foreground",
  warning: "border-border bg-secondary text-secondary-foreground",
  destructive: "border-destructive/20 bg-destructive/10 text-destructive",
  muted: "border-border bg-muted text-muted-foreground",
};

export function CommercialSummaryHeader({
  header,
  metrics,
  notice,
}: CommercialSummaryHeaderProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-muted-foreground">
            {header.eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {header.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {header.description}
          </p>
        </div>
        <div className="rounded-full border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground">
          {accessStateLabelByState[header.accessState]}
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <article
            className={
              "rounded-xl border p-4 shadow-sm " + toneClassNameByTone[metric.tone]
            }
            key={metric.label}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {metric.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">
              {metric.value}
            </p>
            <p className="mt-2 text-sm leading-5 text-muted-foreground">
              {metric.description}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-dashed border-border bg-secondary/40 p-4 text-sm leading-6 text-muted-foreground">
        {notice}
      </div>
    </section>
  );
}


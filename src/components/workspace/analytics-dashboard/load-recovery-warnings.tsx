import type {
  AnalyticsEvidenceItem,
  AnalyticsWarningSeverity,
  LoadRecoveryWarning,
} from "./analytics-dashboard.types";

const severityLabelBySeverity: Record<AnalyticsWarningSeverity, string> = {
  info: "Info",
  notice: "Notice",
  warning: "Warning",
};

const severityClassNameBySeverity: Record<AnalyticsWarningSeverity, string> = {
  info: "border-border bg-background text-foreground",
  notice: "border-primary/20 bg-secondary text-secondary-foreground",
  warning: "border-border bg-background text-foreground",
};

const evidenceKindLabel: Record<AnalyticsEvidenceItem["kind"], string> = {
  fixture: "Fixture",
  preview: "Preview",
  activity: "Activity",
  "semantic-capital": "Semantic capital",
  calendar: "Calendar",
  manual: "Manual",
};

export interface LoadRecoveryWarningsProps {
  readonly warnings: readonly LoadRecoveryWarning[];
}

interface LoadRecoveryWarningCardProps {
  readonly warning: LoadRecoveryWarning;
}

interface WarningEvidenceListProps {
  readonly evidence: readonly AnalyticsEvidenceItem[];
}

function WarningEvidenceList({ evidence }: WarningEvidenceListProps) {
  if (evidence.length === 0) {
    return (
      <p className="mt-3 rounded-lg border bg-card p-3 text-sm text-muted-foreground">
        No evidence item is attached to this warning preview.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Evidence
      </p>

      {evidence.map((item) => (
        <div key={item.id} className="rounded-lg border bg-card p-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-sm font-medium">{item.label}</p>
            <span className="rounded-full border bg-background px-2 py-1 text-xs text-muted-foreground">
              {evidenceKindLabel[item.kind]}
            </span>
          </div>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {item.description}
          </p>
        </div>
      ))}
    </div>
  );
}

function LoadRecoveryWarningCard({ warning }: LoadRecoveryWarningCardProps) {
  return (
    <article className="rounded-xl border bg-background p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">
            Load / recovery signal
          </p>
          <h3 className="mt-1 text-lg font-semibold">{warning.title}</h3>
        </div>

        <span
          className={[
            "shrink-0 rounded-full border px-3 py-1 text-xs font-medium",
            severityClassNameBySeverity[warning.severity],
          ].join(" ")}
        >
          {severityLabelBySeverity[warning.severity]}
        </span>
      </div>

      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        {warning.body}
      </p>

      <WarningEvidenceList evidence={warning.evidence} />

      <p className="mt-4 rounded-lg border bg-card p-3 text-xs leading-5 text-muted-foreground">
        {warning.boundaryText}
      </p>
    </article>
  );
}

export function LoadRecoveryWarnings({ warnings }: LoadRecoveryWarningsProps) {
  const warningCount = warnings.filter((warning) => warning.severity === "warning").length;
  const noticeCount = warnings.filter((warning) => warning.severity === "notice").length;
  const infoCount = warnings.filter((warning) => warning.severity === "info").length;

  return (
    <section
      aria-label="Load and recovery warnings"
      className="rounded-xl border bg-card p-6 shadow-sm"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Load / recovery
          </p>
          <h2 className="text-xl font-semibold">Warnings as soft signals</h2>
        </div>

        <div className="rounded-xl border bg-background px-4 py-3 text-sm">
          <p className="font-medium">Preview summary</p>
          <p className="text-muted-foreground">
            Warnings: {warningCount} · Notices: {noticeCount} · Info: {infoCount}
          </p>
        </div>
      </div>

      <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
        Load and recovery warnings are read-only analytics signals. UI-11 does not diagnose health, does not make hormone claims, does not prescribe treatment, and does not create tasks.
      </p>

      {warnings.length > 0 ? (
        <div className="mt-6 grid gap-4" role="list">
          {warnings.map((warning) => (
            <div key={warning.id} role="listitem">
              <LoadRecoveryWarningCard warning={warning} />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border bg-background p-5">
          <p className="font-medium">No load/recovery warning available.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            The fixture does not contain warning signals for this preview.
          </p>
        </div>
      )}

      <p className="mt-5 rounded-lg border bg-background p-3 text-xs leading-5 text-muted-foreground">
        This widget is intentionally conservative: it explains signals and boundaries, but it does not turn analytics into medical, productivity, or financial truth.
      </p>
    </section>
  );
}

import type {
  CorrectionHistoryItem,
  CorrectionHistoryMode,
} from "./privacy-audit.types";

interface CorrectionHistoryPanelProps {
  readonly correctionHistory: readonly CorrectionHistoryItem[];
}

const correctionModeLabels: Record<CorrectionHistoryMode, string> = {
  additive: "Additive",
  preview: "Preview",
  applied: "Applied",
};

const correctionModeClassNames: Record<CorrectionHistoryMode, string> = {
  additive: "border-chart-2/30 bg-chart-2/10 text-chart-2",
  preview: "border-primary/30 bg-primary/10 text-primary",
  applied: "border-chart-3/30 bg-chart-3/10 text-chart-3",
};

export function CorrectionHistoryPanel({
  correctionHistory,
}: CorrectionHistoryPanelProps) {
  const additiveCount = correctionHistory.filter(
    (item) => item.mode === "additive",
  ).length;

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-2 border-b border-border pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">
            Correction history
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Corrections are shown as additive audit history. UI-13 does not
            overwrite original events, mutate resolver state, or silently apply
            feedback.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{additiveCount}</span>{" "}
          additive corrections
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {correctionHistory.map((item) => (
          <article
            key={item.id}
            className="rounded-lg border border-border bg-background/60 p-4"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Target
                </p>
                <h3 className="text-base font-semibold text-foreground">
                  {item.targetLabel}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium ${correctionModeClassNames[item.mode]}`}
                >
                  {correctionModeLabels[item.mode]}
                </span>
                <span className="rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {item.createdAtLabel}
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-md border border-border bg-card px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Before
                </p>
                <p className="mt-1 text-sm text-foreground">{item.before}</p>
              </div>

              <div className="rounded-md border border-border bg-card px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  After
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {item.after}
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-md border border-dashed border-border bg-muted px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Reason
              </p>
              <p className="mt-1 text-sm leading-6 text-foreground">
                {item.reason}
              </p>
            </div>

            <div className="mt-3 rounded-md border border-border bg-card px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Additive note
              </p>
              <p className="mt-1 text-sm leading-6 text-foreground">
                {item.additiveNote}
              </p>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-dashed border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
        Correction history is display-only in UI-13. It does not delete prior
        facts, rewrite activity events, or hide rejected/corrected meanings.
      </div>
    </section>
  );
}

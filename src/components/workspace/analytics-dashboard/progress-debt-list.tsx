import type {
  AnalyticsDomainId,
  AnalyticsTone,
  ProgressDebtItem,
} from "./analytics-dashboard.types";

const domainLabelById: Record<AnalyticsDomainId, string> = {
  languages: "Languages",
  work: "Work",
  health: "Health",
  family: "Family",
  recovery: "Recovery",
  marketing: "Marketing",
  management: "Management",
};

const debtClassNameByTone: Record<AnalyticsTone, string> = {
  primary: "border-primary/20 bg-secondary text-secondary-foreground",
  success: "border-border bg-background text-foreground",
  warning: "border-border bg-background text-foreground",
  danger: "border-border bg-background text-foreground",
  muted: "border-border bg-muted text-muted-foreground",
  neutral: "border-border bg-background text-foreground",
};

export interface ProgressDebtListProps {
  readonly debts: readonly ProgressDebtItem[];
}

interface ProgressDebtCardProps {
  readonly debt: ProgressDebtItem;
  readonly rank: number;
}

function ProgressDebtCard({ debt, rank }: ProgressDebtCardProps) {
  return (
    <article className="rounded-xl border bg-background p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">
            Review debt {rank}
          </p>
          <h3 className="mt-1 text-lg font-semibold">{debt.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {debt.gap}
          </p>
        </div>

        <span
          className={[
            "shrink-0 rounded-full border px-3 py-1 text-xs font-medium",
            debtClassNameByTone[debt.tone],
          ].join(" ")}
        >
          {domainLabelById[debt.domainId]}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Likely cause
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {debt.cause}
          </p>
        </div>

        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Last visible activity
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {debt.lastActivity}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border bg-card p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Suggested review
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {debt.suggestedReview}
        </p>
      </div>

      <p className="mt-4 rounded-lg border bg-card p-3 text-xs leading-5 text-muted-foreground">
        {debt.boundaryText}
      </p>
    </article>
  );
}

export function ProgressDebtList({ debts }: ProgressDebtListProps) {
  return (
    <section
      aria-label="Progress debt list"
      className="rounded-xl border bg-card p-6 shadow-sm"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Progress debt
          </p>
          <h2 className="text-xl font-semibold">Attention gaps for review</h2>
        </div>

        <p className="max-w-md text-sm leading-6 text-muted-foreground">
          Progress debt is a planning signal. UI-11 shows where review may be
          useful, but it does not create tasks, write data, or choose a final
          Next Best Action.
        </p>
      </div>

      {debts.length > 0 ? (
        <div className="mt-6 grid gap-4" role="list">
          {debts.map((debt, index) => (
            <div key={debt.id} role="listitem">
              <ProgressDebtCard debt={debt} rank={index + 1} />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border bg-background p-5">
          <p className="font-medium">No progress debt signal available.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            The fixture does not contain progress-debt candidates for this
            preview.
          </p>
        </div>
      )}

      <p className="mt-5 rounded-lg border bg-background p-3 text-xs leading-5 text-muted-foreground">
        Progress debt is not a productivity truth, not a medical assessment, and
        not a financial forecast. It remains a candidate signal for later review.
      </p>
    </section>
  );
}

import type { AIActionPreview } from "./contextual-ai.types";
import {
  getActionRiskLabel,
  getActionStatusLabel,
} from "./contextual-ai.utils";

export interface AIActionCardProps {
  readonly action: AIActionPreview;
}

export function AIActionCard({ action }: AIActionCardProps) {
  const statusLabel = getActionStatusLabel(action.status);
  const riskLabel = getActionRiskLabel(action.riskLabel);
  const hasConstraints = Boolean(action.constraints?.length);

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {action.title}
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              {action.description}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {statusLabel}
            </span>
            <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-primary">
              {riskLabel}
            </span>
          </div>
        </div>

        {action.rationale ? (
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Rationale
            </p>
            <p className="mt-1 text-sm leading-6 text-foreground">
              {action.rationale}
            </p>
          </div>
        ) : null}

        {hasConstraints ? (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Constraints
            </p>
            <ul className="space-y-1.5">
              {action.constraints?.map((constraint) => (
                <li
                  key={constraint}
                  className="flex gap-2 text-sm leading-6 text-muted-foreground"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{constraint}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <button
          type="button"
          disabled
          className="w-full cursor-not-allowed rounded-xl border border-border bg-secondary px-3 py-2 text-sm font-medium text-muted-foreground"
        >
          Future-gated preview only
        </button>
      </div>
    </article>
  );
}

export function AIActionCardList({
  actions,
}: {
  readonly actions: readonly AIActionPreview[];
}) {
  if (actions.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-medium text-foreground">
          No candidate actions
        </p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          The contextual column has no action candidate for this context.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-3">
      {actions.map((action) => (
        <AIActionCard key={action.id} action={action} />
      ))}
    </div>
  );
}

import type { ContextualAIContext } from "./contextual-ai.types";
import {
  buildContextSubtitle,
  buildContextTitle,
  getConfidenceLabel,
  getEntityTypeLabel,
  getPrimarySourceLabel,
} from "./contextual-ai.utils";

export interface AIContextHeaderProps {
  readonly context: ContextualAIContext;
}

export function AIContextHeader({ context }: AIContextHeaderProps) {
  const contextTitle = buildContextTitle(context);
  const contextSubtitle = buildContextSubtitle(context);
  const entityTypeLabel = getEntityTypeLabel(context.entity.type);
  const confidenceLabel = getConfidenceLabel(context.confidence);
  const primarySourceLabel = getPrimarySourceLabel(context);

  return (
    <header className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Contextual AI
            </span>
            <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-primary">
              {confidenceLabel}
            </span>
          </div>

          <div className="space-y-1">
            <h2 className="truncate text-base font-semibold text-foreground">
              {contextTitle}
            </h2>
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {contextSubtitle}
            </p>
          </div>
        </div>

        <div className="shrink-0 rounded-xl border border-border bg-secondary px-3 py-2 text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Source
          </p>
          <p className="text-sm font-semibold text-foreground">
            {primarySourceLabel}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid gap-3 rounded-xl border border-border bg-background p-3 text-sm sm:grid-cols-3">
        <div className="space-y-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Route
          </dt>
          <dd className="truncate font-medium text-foreground">{context.route}</dd>
        </div>

        <div className="space-y-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Entity
          </dt>
          <dd className="truncate font-medium text-foreground">{entityTypeLabel}</dd>
        </div>

        <div className="space-y-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Rights
          </dt>
          <dd className="truncate font-medium text-foreground">
            {context.writesAllowed ? "Write enabled" : "Explain only"}
          </dd>
        </div>
      </dl>
    </header>
  );
}

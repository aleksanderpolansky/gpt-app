import type { AIContextSource } from "./contextual-ai.types";
import { getContextBadgeLabel } from "./contextual-ai.utils";

export interface SourceContextBadgeProps {
  readonly source: AIContextSource;
  readonly compact?: boolean;
}

export function SourceContextBadge({
  source,
  compact = false,
}: SourceContextBadgeProps) {
  const sourceKindLabel = getContextBadgeLabel(source.kind);

  if (compact) {
    return (
      <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
        <span className="truncate">{sourceKindLabel}</span>
      </span>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-start gap-3">
        <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />

        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{source.label}</p>
            <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {sourceKindLabel}
            </span>
          </div>

          {source.description ? (
            <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
              {source.description}
            </p>
          ) : (
            <p className="text-xs leading-5 text-muted-foreground">
              Context source without extra description.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

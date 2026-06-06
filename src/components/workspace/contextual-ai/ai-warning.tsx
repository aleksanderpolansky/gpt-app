import type { AIWarning as AIWarningModel } from "./contextual-ai.types";
import { getWarningLevelLabel } from "./contextual-ai.utils";

export interface AIWarningProps {
  readonly warning: AIWarningModel;
}

export function AIWarning({ warning }: AIWarningProps) {
  const warningLevelLabel = getWarningLevelLabel(warning.level);

  return (
    <section className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-start gap-3">
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-xs font-semibold text-primary">
          !
        </div>

        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">
              {warning.title}
            </p>
            <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {warningLevelLabel}
            </span>
          </div>

          <p className="text-sm leading-6 text-muted-foreground">
            {warning.message}
          </p>
        </div>
      </div>
    </section>
  );
}

export function AIWarningsList({
  warnings,
}: {
  readonly warnings: readonly AIWarningModel[];
}) {
  if (warnings.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-card p-3">
        <p className="text-sm font-medium text-foreground">
          No active AI warnings
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          The contextual column is still read-only and explanation-only.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-3">
      {warnings.map((warning) => (
        <AIWarning key={warning.id} warning={warning} />
      ))}
    </div>
  );
}

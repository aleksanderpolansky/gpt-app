import type { ContextualAIContext } from "./contextual-ai.types";
import {
  buildNoRightsExplanation,
  getContextSummaryLines,
} from "./contextual-ai.utils";

export interface ContextualAINoRightsStateProps {
  readonly context: ContextualAIContext;
}

export function NoRightsPreview({ context }: ContextualAINoRightsStateProps) {
  const explanation = buildNoRightsExplanation(context);
  const summaryLines = getContextSummaryLines(context);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-sm font-semibold text-primary">
            AI
          </div>

          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold text-foreground">
              No write authority
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              {explanation}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Safety boundary
          </p>
          <p className="mt-1 text-sm leading-6 text-foreground">
            This panel can explain context, warnings, candidate actions, and prompt chips. It cannot save, edit, delete, approve, reject, confirm, schedule, or execute anything.
          </p>
        </div>

        <ul className="space-y-1.5">
          {summaryLines.map((line) => (
            <li
              key={line}
              className="flex gap-2 text-sm leading-6 text-muted-foreground"
            >
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function ContextualAINoRightsState({
  context,
}: ContextualAINoRightsStateProps) {
  return <NoRightsPreview context={context} />;
}

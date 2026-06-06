import { AIActionCardList } from "./ai-action-card";
import { AIContextHeader } from "./ai-context-header";
import { AIMessageList } from "./ai-message-list";
import { AIQuickPrompts } from "./ai-quick-prompts";
import { AIWarningsList } from "./ai-warning";
import { NoRightsPreview } from "./contextual-ai-no-rights-state";
import type { ContextualAIColumnProps } from "./contextual-ai.types";
import { SourceContextBadge } from "./source-context-badge";

export function ContextualAIColumn({
  context,
  className,
}: ContextualAIColumnProps) {
  const rootClassName = className
    ? `flex h-full min-h-0 flex-col gap-4 rounded-3xl border border-border bg-background p-4 ${className}`
    : "flex h-full min-h-0 flex-col gap-4 rounded-3xl border border-border bg-background p-4";

  return (
    <aside className={rootClassName} aria-label="Contextual AI column">
      <AIContextHeader context={context} />

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        <section className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Context sources
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              The AI column explains only the currently visible route and selected context.
            </p>
          </div>

          <div className="grid gap-2">
            {context.sources.map((source) => (
              <SourceContextBadge key={`${source.kind}-${source.label}`} source={source} />
            ))}
          </div>
        </section>

        <AIMessageList messages={context.messages} />

        <AIWarningsList warnings={context.warnings} />

        <AIActionCardList actions={context.actions} />

        <AIQuickPrompts prompts={context.quickPrompts} />

        <NoRightsPreview context={context} />
      </div>

      <footer className="rounded-2xl border border-border bg-card p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          UI-15 safety mode
        </p>
        <p className="mt-1 text-sm leading-6 text-foreground">
          Explanation-only composer. All actions and prompts stay disabled or preview-only until a later explicit gate.
        </p>
      </footer>
    </aside>
  );
}

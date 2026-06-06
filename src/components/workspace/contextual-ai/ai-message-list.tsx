import type { AIMessage as AIMessageModel } from "./contextual-ai.types";
import { getContextBadgeLabel } from "./contextual-ai.utils";

export interface AIMessageListProps {
  readonly messages: readonly AIMessageModel[];
}

function getMessageRoleLabel(role: AIMessageModel["role"]): string {
  switch (role) {
    case "assistant":
      return "Assistant";
    case "context":
      return "Context";
    case "warning":
      return "Warning";
    case "system":
      return "System";
    default:
      return "Message";
  }
}

export function AIMessageItem({ message }: { readonly message: AIMessageModel }) {
  const roleLabel = getMessageRoleLabel(message.role);
  const sourceLabel = message.sourceKind
    ? getContextBadgeLabel(message.sourceKind)
    : "No source";

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {roleLabel}
              </span>
              <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-primary">
                {sourceLabel}
              </span>
            </div>

            {message.title ? (
              <h3 className="text-sm font-semibold text-foreground">
                {message.title}
              </h3>
            ) : null}
          </div>
        </div>

        <p className="text-sm leading-6 text-muted-foreground">
          {message.body}
        </p>
      </div>
    </article>
  );
}

export function AIMessageList({ messages }: AIMessageListProps) {
  if (messages.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-medium text-foreground">
          No contextual messages
        </p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          The contextual AI column has no read-only explanation for this context yet.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3" aria-label="Contextual AI messages">
      {messages.map((message) => (
        <AIMessageItem key={message.id} message={message} />
      ))}
    </section>
  );
}

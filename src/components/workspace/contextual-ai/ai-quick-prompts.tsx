import type { AIQuickPrompt } from "./contextual-ai.types";
import { getActionStatusLabel } from "./contextual-ai.utils";

export interface AIQuickPromptsProps {
  readonly prompts: readonly AIQuickPrompt[];
}

export function AIQuickPromptChip({
  prompt,
}: {
  readonly prompt: AIQuickPrompt;
}) {
  const statusLabel = getActionStatusLabel(prompt.status);

  return (
    <button
      type="button"
      disabled
      className="cursor-not-allowed rounded-full border border-border bg-secondary px-3 py-2 text-left text-xs font-medium text-muted-foreground"
      aria-label={`${prompt.label}: ${statusLabel}`}
    >
      <span className="block text-foreground">{prompt.label}</span>
      <span className="mt-0.5 block text-muted-foreground">{statusLabel}</span>
    </button>
  );
}

export function AIQuickPrompts({ prompts }: AIQuickPromptsProps) {
  if (prompts.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-medium text-foreground">
          No quick prompts
        </p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          This contextual AI panel has no preview prompt chips for this context yet.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">
          Quick prompts
        </p>
        <p className="text-sm leading-6 text-muted-foreground">
          Prompt chips are visible as local preview only. They do not submit, save, or call AI yet.
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2" aria-label="Contextual AI quick prompts">
        {prompts.map((prompt) => (
          <AIQuickPromptChip key={prompt.id} prompt={prompt} />
        ))}
      </div>
    </section>
  );
}

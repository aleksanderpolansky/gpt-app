import type { ActivityCaptureExamplePrompt } from "./activity-capture-fixtures";

export const ACTIVITY_CAPTURE_EXAMPLES_CREATED =
  "ACTIVITY_CAPTURE_EXAMPLES_CREATED" as const;

export interface ActivityQuickExamplePromptsProps {
  examples: ActivityCaptureExamplePrompt[];
  onExampleClick: (rawText: string) => void;
}

function getExampleDomainLabel(domain: ActivityCaptureExamplePrompt["domain"]): string {
  if (domain === "language") {
    return "Language";
  }

  if (domain === "health") {
    return "Health";
  }

  if (domain === "work") {
    return "Work";
  }

  if (domain === "family") {
    return "Family";
  }

  if (domain === "money") {
    return "Money";
  }

  return "General";
}

export function ActivityQuickExamplePrompts({
  examples,
  onExampleClick,
}: ActivityQuickExamplePromptsProps) {
  const visibleExamples = examples.slice(0, 6);

  return (
    <aside
      aria-labelledby="activity-quick-example-prompts-title"
      className="rounded-xl border border-slate-200 bg-white p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Quick example prompts
          </p>

          <h3
            id="activity-quick-example-prompts-title"
            className="mt-2 text-sm font-semibold text-slate-900"
          >
            Быстрые примеры
          </h3>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Примеры вставляются только в локальное поле ввода. Они не создают
            draft, Activity Event или запись в системе.
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {visibleExamples.length} prompts
        </span>
      </div>

      <div className="mt-4 grid gap-2">
        {visibleExamples.map((example) => (
          <button
            key={example.id}
            type="button"
            onClick={() => onExampleClick(example.rawText)}
            className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-left transition hover:border-indigo-200 hover:bg-indigo-50"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-800">
                {example.label}
              </p>

              <span className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-slate-500">
                {getExampleDomainLabel(example.domain)}
              </span>
            </div>

            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
              {example.rawText}
            </p>
          </button>
        ))}
      </div>

      <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
        Quick example prompts are local-only helpers. Preview is created only
        after the user chooses an example and clicks local preview.
      </p>
    </aside>
  );
}

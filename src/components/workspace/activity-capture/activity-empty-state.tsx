import type { ActivityCaptureExamplePrompt } from "./activity-capture-fixtures";

export const ACTIVITY_CAPTURE_EMPTY_STATE_CREATED =
  "ACTIVITY_CAPTURE_EMPTY_STATE_CREATED" as const;

export interface ActivityCaptureEmptyStateProps {
  examples: ActivityCaptureExamplePrompt[];
  onExampleClick: (rawText: string) => void;
}

const emptyStateChecklist = [
  "Опиши действие обычным языком",
  "Добавь время, если оно известно",
  "Добавь контекст: работа, здоровье, язык, семья или покупка",
  "Проверь candidates перед будущим сохранением",
];

export function ActivityCaptureEmptyState({
  examples,
  onExampleClick,
}: ActivityCaptureEmptyStateProps) {
  const visibleExamples = examples.slice(0, 3);

  return (
    <article
      aria-labelledby="activity-capture-empty-state-title"
      className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 p-5"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Initial state
          </p>

          <h3
            id="activity-capture-empty-state-title"
            className="mt-2 text-lg font-semibold tracking-tight text-slate-950"
          >
            Начни с одной активности
          </h3>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Введи короткое описание действия или выбери пример. UI-4 создаст
            только локальный preview: Activity Event не создаётся, данные не сохраняются и не отправляются.
          </p>
        </div>

        <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-700">
          empty state
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-xl border border-white bg-white/80 p-4">
          <p className="text-sm font-semibold text-slate-900">
            Что можно записать
          </p>

          <ul className="mt-3 grid gap-2">
            {emptyStateChecklist.map((item) => (
              <li
                key={item}
                className="flex gap-2 text-sm leading-6 text-slate-600"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-white bg-white/80 p-4">
          <p className="text-sm font-semibold text-slate-900">
            Быстрый старт
          </p>

          <div className="mt-3 grid gap-2">
            {visibleExamples.map((example) => (
              <button
                key={example.id}
                type="button"
                onClick={() => onExampleClick(example.rawText)}
                className="rounded-lg border border-indigo-100 bg-white px-3 py-2 text-left text-xs font-medium leading-5 text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-4 rounded-lg bg-white px-3 py-2 text-xs leading-5 text-slate-500">
        Empty state специально отделён от preview state: пока пользователь не
        нажал local preview, нет draft, category candidates, Value Object
        candidates, privacy hints или parsing explanation.
      </p>
    </article>
  );
}

import type {
  LocalDurationHint,
  LocalMetricHint,
  LocalParserResult,
} from "./activity-capture-types";

export const LOCAL_PARSING_EXPLANATION_CREATED =
  "LOCAL_PARSING_EXPLANATION_CREATED" as const;

export interface LocalParsingExplanationPanelProps {
  parserResult: LocalParserResult;
}

function DurationHintsList({ durationHints }: { durationHints: LocalDurationHint[] }) {
  if (durationHints.length === 0) {
    return (
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Duration hints не найдены. Это не ошибка: пользователь мог не указать
        время явно.
      </p>
    );
  }

  return (
    <div className="mt-3 grid gap-2">
      {durationHints.map((hint) => (
        <div
          key={hint.id}
          className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-800">{hint.label}</p>

            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {hint.minutes} min
            </span>
          </div>

          <p className="mt-1 text-xs leading-5 text-slate-500">{hint.reason}</p>

          <p className="mt-1 text-[11px] font-medium text-slate-400">
            sourceRule: {hint.sourceRule}
          </p>
        </div>
      ))}
    </div>
  );
}

function MetricHintsList({ metricHints }: { metricHints: LocalMetricHint[] }) {
  if (metricHints.length === 0) {
    return (
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Metric hints не найдены. Это не означает, что активность нельзя будет
        измерять позже.
      </p>
    );
  }

  return (
    <div className="mt-3 grid gap-2">
      {metricHints.map((hint) => (
        <div
          key={hint.id}
          className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-800">{hint.label}</p>

            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {hint.value}
            </span>
          </div>

          <p className="mt-1 text-xs leading-5 text-slate-500">{hint.reason}</p>

          <p className="mt-1 text-[11px] font-medium text-slate-400">
            sourceRule: {hint.sourceRule}
          </p>
        </div>
      ))}
    </div>
  );
}

function ExplanationSteps({ explanation }: { explanation: string[] }) {
  if (explanation.length === 0) {
    return (
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Explanation steps пока не сформированы.
      </p>
    );
  }

  return (
    <ol className="mt-3 grid gap-2">
      {explanation.map((item, index) => (
        <li
          key={`${index}-${item}`}
          className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600"
        >
          <span className="font-semibold text-slate-900">{index + 1}.</span>{" "}
          {item}
        </li>
      ))}
    </ol>
  );
}

export function LocalParsingExplanationPanel({
  parserResult,
}: LocalParsingExplanationPanelProps) {
  return (
    <article
      aria-labelledby="local-parsing-explanation-title"
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Local parsing explanation
          </p>

          <h3
            id="local-parsing-explanation-title"
            className="mt-2 text-lg font-semibold tracking-tight text-slate-950"
          >
            Объяснение локального разбора
          </h3>

          <p className="mt-1 text-sm leading-6 text-slate-600">
            Это объяснение показывает, как deterministic local rules собрали
            preview. Результат остаётся candidate, not truth.
          </p>
        </div>

        <span className="w-fit rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          local only
        </span>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-100 bg-white p-4">
          <p className="text-sm font-semibold text-slate-900">Duration hints</p>
          <DurationHintsList durationHints={parserResult.durationHints} />
        </section>

        <section className="rounded-xl border border-slate-100 bg-white p-4">
          <p className="text-sm font-semibold text-slate-900">Metric hints</p>
          <MetricHintsList metricHints={parserResult.metricHints} />
        </section>
      </div>

      <section className="mt-4 rounded-xl border border-slate-100 bg-white p-4">
        <p className="text-sm font-semibold text-slate-900">Explanation steps</p>
        <ExplanationSteps explanation={parserResult.explanation} />
      </section>

      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-900">
          Safety boundary
        </p>

        <p className="mt-1 text-xs leading-5 text-amber-800">
          Activity Event не создан. Категории, Value Objects, privacy hints,
          duration hints и metric hints остаются локальными подсказками. Они не
          являются фактами, решениями или записью в систему.
        </p>
      </div>
    </article>
  );
}

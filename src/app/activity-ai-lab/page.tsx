"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Locale = "ru" | "en" | "pl" | "uk" | "de" | "es" | "cs";

type GlobalFact = {
  parameterCode?: string;
  unit?: string;
  valueType?: string;
  valueNumeric?: number | null;
  valueText?: string | null;
  valueBoolean?: boolean | null;
  rawFragment?: string;
  factStatus?: string;
};

type GlobalRow = {
  segmentId?: string;
  sourceFragment?: string;
  selected?: {
    valueObjectId?: string;
    canonicalKey?: string;
    title?: string;
    facetCode?: string;
    objectKindCode?: string | null;
    semanticMatchMethodCode?: string;
  } | null;
  confidence?: number;
  facts?: GlobalFact[];
  temporal?: {
    occurredAtIso?: string | null;
    occurredAtRaw?: string | null;
    temporalPrecision?: string;
  };
};

type GlobalPreview = {
  ok?: boolean;
  contractVersion?: string;
  previewOnly?: boolean;
  dbFactWriteExecuted?: boolean;
  operationId?: string;
  modelTier?: string;
  model?: string;
  reportedAt?: string;
  timeZone?: string;
  locale?: string;
  rows?: GlobalRow[];
  safety?: {
    hardCapUsd?: number;
    providerCallsUsed?: number;
    automaticProviderRetries?: number;
    actualProviderCostUsd?: number | null;
    reservedMaximumProviderCostUsd?: number;
  };
  warnings?: string[];
  code?: string;
  error?: string;
  details?: unknown;
};

type SemanticPackage = {
  packageId?: string;
  status?: string;
  recognition?: {
    status?: string;
    confidence?: number;
    reason?: string;
    detectedActivityTitle?: string;
    shouldAskUserBeforeSaving?: boolean;
  };
  measures?: Array<Record<string, unknown>>;
  semanticCategories?: Array<Record<string, unknown>>;
  valueObjectMatches?: Array<Record<string, unknown>>;
  factPreviews?: Array<Record<string, unknown>>;
  missingValueObjectCandidates?: Array<Record<string, unknown>>;
  counters?: Record<string, unknown>;
};

type SemanticPreview = {
  ok?: boolean;
  activityProcessingPackage?: SemanticPackage | null;
  error?: string;
  errors?: string[];
};

type TraceLine = {
  kind: "system" | "ai" | "server" | "fact" | "warning";
  text: string;
};

type AnalysisResult =
  | {
      mode: "global";
      payload: GlobalPreview;
      trace: TraceLine[];
    }
  | {
      mode: "semantic-fallback";
      payload: SemanticPreview;
      trace: TraceLine[];
      globalError: string;
    };

const LOCALES: Array<{ code: Locale; label: string }> = [
  { code: "ru", label: "Русский" },
  { code: "en", label: "English" },
  { code: "pl", label: "Polski" },
  { code: "uk", label: "Українська" },
  { code: "de", label: "Deutsch" },
  { code: "es", label: "Español" },
  { code: "cs", label: "Čeština" },
];

function createOperationId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `activity-ai-lab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatConfidence(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${Math.round(value * 100)}%`
    : "не указана";
}

function formatUnknown(value: unknown) {
  if (value === null || typeof value === "undefined") {
    return null;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatGlobalFactValue(fact: GlobalFact) {
  if (typeof fact.valueNumeric === "number") {
    return `${fact.valueNumeric}${fact.unit ? ` ${fact.unit}` : ""}`;
  }

  if (typeof fact.valueText === "string") {
    return `${fact.valueText}${fact.unit ? ` ${fact.unit}` : ""}`;
  }

  if (typeof fact.valueBoolean === "boolean") {
    return `${fact.valueBoolean}${fact.unit ? ` ${fact.unit}` : ""}`;
  }

  return "значение не распознано";
}

function buildGlobalTrace(inputText: string, payload: GlobalPreview): TraceLine[] {
  const rows = payload.rows ?? [];
  const trace: TraceLine[] = [
    {
      kind: "system",
      text: `Получил сообщение: «${inputText}»`,
    },
    {
      kind: "server",
      text: `Запущен защищённый анализ. Модель: ${payload.model ?? "не указана"}, уровень: ${payload.modelTier ?? "не указан"}.`,
    },
    {
      kind: "ai",
      text: `После проверки сервером получено наблюдений: ${rows.length}.`,
    },
  ];

  rows.forEach((row, index) => {
    const fragment = row.sourceFragment?.trim() || "(фрагмент не указан)";
    const selected = row.selected;

    if (selected) {
      trace.push({
        kind: "ai",
        text:
          `Наблюдение ${index + 1}: «${fragment}» → считаю наиболее подходящим ЦО ` +
          `«${selected.title ?? selected.canonicalKey ?? "без названия"}» ` +
          `(${selected.canonicalKey ?? "canonical key не указан"}), ` +
          `грань ${selected.facetCode ?? "не указана"}, уверенность ${formatConfidence(row.confidence)}.`,
      });

      trace.push({
        kind: "server",
        text:
          `Способ сопоставления: ${selected.semanticMatchMethodCode ?? "не указан"}. ` +
          `Сервер разрешил этот ЦО только после проверки допустимого набора кандидатов.`,
      });
    } else {
      trace.push({
        kind: "warning",
        text:
          `Наблюдение ${index + 1}: «${fragment}» → уверенного листового ЦО не выбрано. ` +
          `Уверенность ответа ${formatConfidence(row.confidence)}. Неизвестность сохранена.`,
      });
    }

    const temporal = row.temporal;
    if (temporal?.occurredAtRaw || temporal?.occurredAtIso) {
      trace.push({
        kind: "server",
        text:
          `Время наблюдения: источник «${temporal.occurredAtRaw ?? "нет буквального фрагмента"}», ` +
          `точность ${temporal.temporalPrecision ?? "unknown"}, ` +
          `нормализованное время ${temporal.occurredAtIso ?? "не вычислено"}.`,
      });
    }

    const facts = row.facts ?? [];
    if (facts.length === 0) {
      trace.push({
        kind: "server",
        text: `Для наблюдения ${index + 1} явных разрешённых количественных/качественных фактов не извлечено.`,
      });
    }

    facts.forEach((fact) => {
      trace.push({
        kind: "fact",
        text:
          `Факт: ${fact.parameterCode ?? "параметр"} = ${formatGlobalFactValue(fact)}. ` +
          `Основание в тексте: «${fact.rawFragment ?? "не указано"}». ` +
          `Статус: ${fact.factStatus ?? "proposed"}.`,
      });
    });
  });

  const cost = payload.safety?.actualProviderCostUsd;
  trace.push({
    kind: "server",
    text:
      `Проверка безопасности: вызовов модели ${payload.safety?.providerCallsUsed ?? "?"}, ` +
      `автоповторов ${payload.safety?.automaticProviderRetries ?? 0}, ` +
      `фактическая стоимость ${typeof cost === "number" ? `$${cost.toFixed(6)}` : "пока неизвестна"}, ` +
      `жёсткий предел операции $${payload.safety?.hardCapUsd ?? 0.1}.`,
  });

  trace.push({
    kind: "system",
    text:
      payload.dbFactWriteExecuted === true
        ? "ВНИМАНИЕ: ответ сообщает о записи факта."
        : "Этот экран только анализирует сообщение. Сам анализ не записывает факты в Reality Graph.",
  });

  (payload.warnings ?? []).forEach((warning) => {
    trace.push({ kind: "warning", text: warning });
  });

  return trace;
}

function buildSemanticFallbackTrace(
  inputText: string,
  payload: SemanticPreview,
  globalError: string,
): TraceLine[] {
  const pkg = payload.activityProcessingPackage;
  const recognition = pkg?.recognition;
  const categories = pkg?.semanticCategories ?? [];
  const matches = pkg?.valueObjectMatches ?? [];
  const measures = pkg?.measures ?? [];
  const facts = pkg?.factPreviews ?? [];
  const missing = pkg?.missingValueObjectCandidates ?? [];

  const trace: TraceLine[] = [
    { kind: "system", text: `Получил сообщение: «${inputText}»` },
    {
      kind: "warning",
      text:
        `Новый Global Reality анализатор не завершил запрос: ${globalError}. ` +
        "Показываю результат уже существующего семантического конвейера.",
    },
    {
      kind: "ai",
      text:
        `Распознавание: ${recognition?.status ?? "не указано"}, ` +
        `уверенность ${formatConfidence(recognition?.confidence)}. ` +
        `${recognition?.reason ?? ""}`.trim(),
    },
  ];

  if (recognition?.detectedActivityTitle) {
    trace.push({
      kind: "ai",
      text: `Основная активность: «${recognition.detectedActivityTitle}».`,
    });
  }

  categories.forEach((category, index) => {
    const label =
      formatUnknown(category.labelRu) ??
      formatUnknown(category.label) ??
      formatUnknown(category.semanticObjectKey) ??
      `категория ${index + 1}`;

    trace.push({
      kind: "ai",
      text:
        `Смысловая категория ${index + 1}: ${label}; ` +
        `слой ${formatUnknown(category.layer) ?? "не указан"}; ` +
        `уверенность ${formatConfidence(category.confidence)}.`,
    });
  });

  matches.forEach((match, index) => {
    trace.push({
      kind: "server",
      text:
        `Сопоставление с ЦО ${index + 1}: ` +
        `${formatUnknown(match.valueObjectTitle) ?? formatUnknown(match.valueObjectId) ?? "ЦО не найден"}; ` +
        `статус ${formatUnknown(match.matchStatus) ?? "не указан"}; ` +
        `уверенность ${formatConfidence(match.confidence)}.`,
    });
  });

  measures.forEach((measure, index) => {
    trace.push({
      kind: "fact",
      text:
        `Измерение ${index + 1}: ${formatUnknown(measure.measureType) ?? "параметр"} = ` +
        `${formatUnknown(measure.numericValue) ?? formatUnknown(measure.textValue) ?? "не указано"} ` +
        `${formatUnknown(measure.unit) ?? ""}`.trim(),
    });
  });

  facts.forEach((fact, index) => {
    trace.push({
      kind: "fact",
      text:
        `Предлагаемый факт ${index + 1}: ` +
        `${formatUnknown(fact.semanticObjectKey) ?? formatUnknown(fact.valueObjectTitle) ?? "без ЦО"}; ` +
        `значение ${formatUnknown(fact.numericValue) ?? formatUnknown(fact.textValue) ?? "не указано"} ` +
        `${formatUnknown(fact.unit) ?? ""}; статус ${formatUnknown(fact.status) ?? "candidate"}.`,
    });
  });

  if (missing.length > 0) {
    trace.push({
      kind: "warning",
      text: `Найдены смысловые объекты без готового ЦО: ${missing.length}. Они не создаются автоматически.`,
    });
  }

  trace.push({
    kind: "system",
    text:
      "Это запасной семантический preview. Для фактического сохранения сообщения используй кнопку «Добавить как прошедшую активность».",
  });

  return trace;
}

function TracePanel({ lines, loading }: { lines: TraceLine[]; loading: boolean }) {
  const prefix: Record<TraceLine["kind"], string> = {
    system: "SYSTEM",
    ai: "AI",
    server: "SERVER",
    fact: "FACT",
    warning: "WARN",
  };

  return (
    <div className="rounded-3xl border border-emerald-900/70 bg-black p-5 shadow-2xl shadow-emerald-950/20">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">
            Журнал анализа
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Показывает проверяемые этапы обработки, а не скрытые внутренние рассуждения модели.
          </p>
        </div>
        <span className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-500">
          {loading ? "processing" : "ready"}
        </span>
      </div>

      <div className="max-h-[620px] space-y-2 overflow-auto font-mono text-xs leading-6">
        {lines.length === 0 ? (
          <p className="text-zinc-600">
            &gt; Введите сообщение и нажмите «Разобрать».
          </p>
        ) : null}

        {lines.map((line, index) => (
          <div className="grid grid-cols-[64px_1fr] gap-3" key={`${index}-${line.text}`}>
            <span
              className={
                line.kind === "warning"
                  ? "text-amber-400"
                  : line.kind === "fact"
                    ? "text-sky-400"
                    : line.kind === "ai"
                      ? "text-fuchsia-300"
                      : line.kind === "server"
                        ? "text-emerald-400"
                        : "text-zinc-500"
              }
            >
              {prefix[line.kind]}
            </span>
            <span className="whitespace-pre-wrap break-words text-zinc-200">{line.text}</span>
          </div>
        ))}

        {loading ? (
          <div className="grid grid-cols-[64px_1fr] gap-3">
            <span className="text-emerald-400">SYSTEM</span>
            <span className="animate-pulse text-zinc-400">Анализ выполняется…</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function ActivityAiLabPage() {
  const [inputText, setInputText] = useState("");
  const [locale, setLocale] = useState<Locale>("ru");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liveTrace, setLiveTrace] = useState<TraceLine[]>([]);

  const timeZone =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
      : "UTC";

  const reviewHref = useMemo(() => {
    const text = inputText.trim();

    if (!text) {
      return "/activity-today?locale=ru";
    }

    const params = new URLSearchParams({
      locale,
      returnTo: "activity-journal",
      temporalDirection: "past",
      text,
    });

    return `/calendar/activity-review?${params.toString()}`;
  }, [inputText, locale]);

  const futureHref = useMemo(() => {
    const text = inputText.trim();

    if (!text) {
      return "/calendar";
    }

    const params = new URLSearchParams({
      locale,
      returnTo: "calendar",
      temporalDirection: "future",
      text,
    });

    return `/calendar/activity-review?${params.toString()}`;
  }, [inputText, locale]);

  async function analyze() {
    const text = inputText.trim();

    if (!text) {
      setError("Сначала напиши, что произошло.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setLiveTrace([
      { kind: "system", text: `Получил сообщение: «${text}»` },
      {
        kind: "system",
        text:
          "Запускаю анализ: выделение наблюдений → поиск ЦО → извлечение только явно указанных фактов → серверная проверка.",
      },
    ]);

    const operationId = createOperationId();

    try {
      const globalResponse = await fetch("/api/ai/reality/global-observation-preview", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          inputText: text,
          locale,
          timeZone,
          operationId,
        }),
      });

      const globalPayload = (await globalResponse.json().catch(() => null)) as
        | GlobalPreview
        | null;

      if (globalResponse.ok && globalPayload?.ok === true) {
        const trace = buildGlobalTrace(text, globalPayload);
        setResult({ mode: "global", payload: globalPayload, trace });
        setLiveTrace(trace);
        return;
      }

      const globalError =
        globalPayload?.error ||
        globalPayload?.code ||
        `Global preview HTTP ${globalResponse.status}`;

      setLiveTrace((current) => [
        ...current,
        {
          kind: "warning",
          text: `Основной анализатор не завершил запрос: ${globalError}. Пробую существующий семантический preview.`,
        },
      ]);

      const semanticResponse = await fetch("/api/activity/semantic-orchestration-preview", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          rawText: text,
          inputLanguage: locale === "uk" ? "ru" : locale,
          source: "manual",
          mode: "preview_only",
        }),
      });

      const semanticPayload = (await semanticResponse.json().catch(() => null)) as
        | SemanticPreview
        | null;

      if (!semanticResponse.ok || !semanticPayload) {
        const fallbackError =
          semanticPayload?.error ||
          semanticPayload?.errors?.join("; ") ||
          `Semantic preview HTTP ${semanticResponse.status}`;
        throw new Error(`${globalError}; fallback: ${fallbackError}`);
      }

      const trace = buildSemanticFallbackTrace(text, semanticPayload, globalError);
      setResult({
        mode: "semantic-fallback",
        payload: semanticPayload,
        trace,
        globalError,
      });
      setLiveTrace(trace);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Неизвестная ошибка анализа.";
      setError(message);
      setLiveTrace((current) => [
        ...current,
        { kind: "warning", text: `Анализ остановлен: ${message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const rawPayload = result?.payload ?? null;

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 text-zinc-100 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">
            ARCTor · реальный журнал активности
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
            Сообщить, что произошло
          </h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-zinc-400">
            Лучше описывать один основной эпизод за сообщение. В этом же сообщении можно
            указать, что одновременно происходило ещё, что ты думал, чувствовал, с кем
            взаимодействовал и какие величины были измерены.
          </p>
          <div className="mt-4 rounded-2xl border border-amber-900/60 bg-amber-950/20 p-4 text-xs leading-5 text-amber-100">
            Здесь нет доступа к скрытой цепочке внутренних рассуждений модели. Вместо неё
            показывается подробный проверяемый журнал: какие фрагменты распознаны, какие ЦО
            предложены, какая уверенность, какие факты извлечены, на каком тексте они
            основаны и что пропустил/разрешил сервер.
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5">
            <label
              className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
              htmlFor="activity-ai-input"
            >
              Сообщение
            </label>
            <textarea
              className="mt-3 min-h-52 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-4 text-base leading-7 text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-emerald-500"
              id="activity-ai-input"
              onChange={(event) => setInputText(event.target.value)}
              placeholder="Например: Гулял 35 минут с дочерью, разговаривали о школе, сначала нервничал, потом успокоился."
              value={inputText}
            />

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-zinc-500" htmlFor="activity-ai-locale">
                  Язык сообщения
                </label>
                <select
                  className="mt-2 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-sm outline-none focus:border-emerald-500"
                  id="activity-ai-locale"
                  onChange={(event) => setLocale(event.target.value as Locale)}
                  value={locale}
                >
                  {LOCALES.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-black/50 p-4">
                <p className="text-xs text-zinc-500">Часовой пояс</p>
                <p className="mt-2 break-all text-sm text-zinc-200">{timeZone}</p>
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={loading || !inputText.trim()}
                onClick={() => void analyze()}
                type="button"
              >
                {loading ? "Разбираю…" : "Разобрать сообщение"}
              </button>
              <button
                className="rounded-2xl border border-zinc-700 px-4 py-3 text-sm text-zinc-300 hover:border-zinc-500"
                disabled={loading}
                onClick={() => {
                  setInputText("");
                  setResult(null);
                  setError(null);
                  setLiveTrace([]);
                }}
                type="button"
              >
                Очистить
              </button>
            </div>

            <div className="mt-6 border-t border-zinc-800 pt-5">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                После проверки
              </p>
              <div className="mt-3 grid gap-3">
                <Link
                  className={[
                    "rounded-2xl px-4 py-3 text-center text-sm font-semibold",
                    inputText.trim()
                      ? "bg-blue-500 text-black hover:bg-blue-400"
                      : "pointer-events-none bg-zinc-800 text-zinc-600",
                  ].join(" ")}
                  href={reviewHref}
                >
                  Добавить как прошедшую активность
                </Link>
                <Link
                  className={[
                    "rounded-2xl border px-4 py-3 text-center text-sm font-semibold",
                    inputText.trim()
                      ? "border-violet-700 text-violet-200 hover:border-violet-500"
                      : "pointer-events-none border-zinc-800 text-zinc-700",
                  ].join(" ")}
                  href={futureHref}
                >
                  Запланировать эту активность
                </Link>
              </div>
              <p className="mt-3 text-xs leading-5 text-zinc-600">
                Кнопка сохранения ведёт в существующий Activity Review / save-gate. Сам
                терминал анализа ничего в Reality Graph не записывает автоматически.
              </p>
            </div>
          </div>

          <TracePanel lines={liveTrace} loading={loading} />
        </section>

        {rawPayload ? (
          <details className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5">
            <summary className="cursor-pointer text-sm font-semibold text-zinc-300">
              Технический JSON результата
            </summary>
            <pre className="mt-4 max-h-[720px] overflow-auto rounded-2xl border border-zinc-800 bg-black p-4 text-xs leading-6 text-zinc-300">
              {JSON.stringify(rawPayload, null, 2)}
            </pre>
          </details>
        ) : null}

        <footer className="flex flex-wrap gap-3 text-sm">
          <Link
            className="rounded-full border border-zinc-800 px-4 py-2 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
            href="/activity-today?locale=ru"
          >
            Мой журнал активностей
          </Link>
          <Link
            className="rounded-full border border-zinc-800 px-4 py-2 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
            href="/activity-capture"
          >
            Старый Activity Capture
          </Link>
        </footer>
      </div>
    </main>
  );
}

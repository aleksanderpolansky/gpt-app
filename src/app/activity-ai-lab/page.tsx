"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Locale = "ru" | "en" | "pl" | "uk" | "de" | "es" | "cs";

type TraceKind =
  | "system"
  | "model"
  | "check"
  | "fact"
  | "unresolved"
  | "fallback";

type TraceLine = {
  kind: TraceKind;
  text: string;
};

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

type RoutingTraceRow = {
  segmentId?: string;
  sourceFragment?: string;
  lookupText?: string;
  rootCanonicalKey?: string;
  facetCode?: string;
  occurredAtIso?: string | null;
  occurredAtRaw?: string | null;
  temporalPrecision?: string;
};

type CandidateTrace = {
  canonicalKey?: string;
  title?: string;
  description?: string | null;
  facetCode?: string;
  objectKindCode?: string | null;
  allowedParameterCodes?: string[];
};

type CandidateGroupTrace = {
  segmentId?: string;
  resolutionMode?: "exact" | "bounded_candidates" | string;
  exactMatchKind?: string | null;
  candidates?: CandidateTrace[];
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
  analysisTrace?: {
    routing?: RoutingTraceRow[];
    candidateGroups?: CandidateGroupTrace[];
  };
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
  recognition?: {
    status?: string;
    detectedActivityTitle?: string;
  };
  measures?: Array<Record<string, unknown>>;
  semanticCategories?: Array<Record<string, unknown>>;
};

type SemanticPreview = {
  ok?: boolean;
  activityProcessingPackage?: SemanticPackage | null;
  error?: string;
  errors?: string[];
};

type AnalysisResult =
  | {
      mode: "global";
      payload: GlobalPreview;
      trace: TraceLine[];
    }
  | {
      mode: "fallback";
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

function formatModelConfidence(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${Math.round(value * 100)}%`
    : "не указана";
}

function formatUnknown(value: unknown) {
  if (value === null || typeof value === "undefined") {
    return null;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatFactValue(fact: GlobalFact) {
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
  const routing = payload.analysisTrace?.routing ?? [];
  const candidateGroups = payload.analysisTrace?.candidateGroups ?? [];
  const groupBySegment = new Map(
    candidateGroups.map((group) => [group.segmentId ?? "", group]),
  );
  const routingBySegment = new Map(
    routing.map((segment) => [segment.segmentId ?? "", segment]),
  );

  const trace: TraceLine[] = [
    {
      kind: "system",
      text: `Получено сообщение: «${inputText}»`,
    },
    {
      kind: "system",
      text:
        `Запущен полный анализ Global Reality. Модель: ${payload.model ?? "не указана"}; ` +
        `уровень: ${payload.modelTier ?? "не указан"}.`,
    },
  ];

  rows.forEach((row, index) => {
    const segmentId = row.segmentId ?? "";
    const route = routingBySegment.get(segmentId);
    const group = groupBySegment.get(segmentId);
    const fragment =
      row.sourceFragment?.trim() ||
      route?.sourceFragment?.trim() ||
      "(фрагмент не указан)";

    trace.push({
      kind: "model",
      text:
        `Наблюдение ${index + 1}: модель выделила фрагмент «${fragment}». ` +
        `Для поиска сформулировано «${route?.lookupText ?? "не указано"}». ` +
        `Предварительная область: ${route?.rootCanonicalKey ?? "не указана"}; ` +
        `грань: ${route?.facetCode ?? "не указана"}.`,
    });

    const candidates = group?.candidates ?? [];

    if (group) {
      if (group.resolutionMode === "exact" && candidates.length === 1) {
        trace.push({
          kind: "check",
          text:
            `Проверка ЦО: сервер нашёл точное совпадение в живом глобальном реестре: ` +
            `«${candidates[0]?.title ?? candidates[0]?.canonicalKey ?? "без названия"}». ` +
            `Тип совпадения: ${group.exactMatchKind ?? "точное"}.`,
        });
      } else {
        const candidateText =
          candidates.length > 0
            ? candidates
                .map(
                  (candidate) =>
                    `«${candidate.title ?? candidate.canonicalKey ?? "без названия"}»` +
                    (candidate.canonicalKey
                      ? ` [${candidate.canonicalKey}]`
                      : ""),
                )
                .join("; ")
            : "кандидатов нет";

        trace.push({
          kind: "check",
          text:
            `Проверка ЦО: сервер реально прочитал глобальную онтологию и сформировал ` +
            `ограниченный список из ${candidates.length} кандидатов. ${candidateText}.`,
        });
      }
    } else {
      trace.push({
        kind: "unresolved",
        text:
          "Список серверных кандидатов в ответе отсутствует. Такой результат нельзя считать прозрачным.",
      });
    }

    if (row.selected) {
      trace.push({
        kind: "model",
        text:
          `Выбор модели: «${row.selected.title ?? row.selected.canonicalKey ?? "без названия"}» ` +
          `(${row.selected.canonicalKey ?? "canonical key не указан"}). ` +
          `Указанная моделью уверенность выбора среди разрешённых кандидатов: ` +
          `${formatModelConfidence(row.confidence)}. Это не вероятность истинности факта.`,
      });

      trace.push({
        kind: "check",
        text:
          `Сервер подтвердил, что выбранный ЦО был внутри разрешённого набора. ` +
          `Способ сопоставления: ${row.selected.semanticMatchMethodCode ?? "не указан"}.`,
      });
    } else {
      trace.push({
        kind: "unresolved",
        text:
          `Для фрагмента «${fragment}» модель не выбрала листовой ЦО. ` +
          `Это сохраняется как неопределённость, а не заменяется выдуманным объектом.`,
      });
    }

    if (row.temporal?.occurredAtRaw || row.temporal?.occurredAtIso) {
      trace.push({
        kind: "check",
        text:
          `Время: исходный фрагмент «${row.temporal.occurredAtRaw ?? "нет"}»; ` +
          `точность ${row.temporal.temporalPrecision ?? "unknown"}; ` +
          `нормализованное время ${row.temporal.occurredAtIso ?? "не вычислено"}.`,
      });
    }

    const facts = row.facts ?? [];

    if (facts.length === 0) {
      trace.push({
        kind: "check",
        text:
          `Для наблюдения ${index + 1} нет явных фактов, которые одновременно присутствуют ` +
          `в тексте и разрешены параметрами выбранного ЦО.`,
      });
    }

    facts.forEach((fact) => {
      trace.push({
        kind: "fact",
        text:
          `${fact.parameterCode ?? "параметр"} = ${formatFactValue(fact)}. ` +
          `Основание: «${fact.rawFragment ?? "не указано"}». ` +
          `Статус: ${fact.factStatus ?? "proposed"}.`,
      });
    });
  });

  const actualCost = payload.safety?.actualProviderCostUsd;
  trace.push({
    kind: "check",
    text:
      `Безопасность операции: вызовов модели ${payload.safety?.providerCallsUsed ?? "?"}; ` +
      `автоповторов ${payload.safety?.automaticProviderRetries ?? 0}; ` +
      `стоимость ${
        typeof actualCost === "number"
          ? `$${actualCost.toFixed(6)}`
          : "не определена"
      }; жёсткий предел $${payload.safety?.hardCapUsd ?? 0.1}.`,
  });

  trace.push({
    kind: "system",
    text:
      payload.dbFactWriteExecuted === true
        ? "ВНИМАНИЕ: ответ сообщает о записи факта."
        : "Анализ завершён без записи фактов. Сохранение выполняется только отдельным подтверждением.",
  });

  (payload.warnings ?? []).forEach((warning) => {
    trace.push({ kind: "unresolved", text: warning });
  });

  return trace;
}

function buildFallbackTrace(
  inputText: string,
  payload: SemanticPreview,
  globalError: string,
): TraceLine[] {
  const pkg = payload.activityProcessingPackage;
  const categories = pkg?.semanticCategories ?? [];
  const measures = pkg?.measures ?? [];

  const trace: TraceLine[] = [
    {
      kind: "system",
      text: `Получено сообщение: «${inputText}»`,
    },
    {
      kind: "fallback",
      text:
        `Полный Global Reality анализ не выполнился: ${globalError}. ` +
        `Включён резервный технический разбор.`,
    },
    {
      kind: "fallback",
      text:
        "Важно: в резервном режиме OpenAI-модель НЕ вызывается и база ЦО НЕ читается. " +
        "Поэтому здесь нет настоящего сопоставления с ценными объектами и нельзя показывать проценты как уверенность AI.",
    },
  ];

  if (pkg?.recognition?.detectedActivityTitle) {
    trace.push({
      kind: "fallback",
      text:
        `Старый программный разбор сохранил текст активности как: ` +
        `«${pkg.recognition.detectedActivityTitle}».`,
    });
  }

  categories.forEach((category, index) => {
    const label =
      formatUnknown(category.labelRu) ??
      formatUnknown(category.label) ??
      formatUnknown(category.semanticObjectKey) ??
      `категория ${index + 1}`;

    trace.push({
      kind: "fallback",
      text:
        `Программное правило ${index + 1} заметило категорию «${label}». ` +
        "Это только словарное правило старого конвейера, не результат AI и не найденный ЦО.",
    });
  });

  measures.forEach((measure, index) => {
    trace.push({
      kind: "fact",
      text:
        `Простое правило извлечения величин ${index + 1}: ` +
        `${formatUnknown(measure.measureType) ?? "параметр"} = ` +
        `${formatUnknown(measure.numericValue) ?? formatUnknown(measure.textValue) ?? "не указано"} ` +
        `${formatUnknown(measure.unit) ?? ""}`.trim(),
    });
  });

  trace.push({
    kind: "unresolved",
    text:
      "ЦО в живой базе не искались. Сохранение этой активности с данного экрана заблокировано до успешного полного анализа.",
  });

  return trace;
}

function TracePanel({ lines, loading }: { lines: TraceLine[]; loading: boolean }) {
  const label: Record<TraceKind, string> = {
    system: "СИСТЕМА",
    model: "МОДЕЛЬ",
    check: "ПРОВЕРКА",
    fact: "ФАКТ",
    unresolved: "НЕОПР.",
    fallback: "РЕЗЕРВ",
  };

  const style: Record<TraceKind, string> = {
    system: "text-zinc-500",
    model: "text-fuchsia-300",
    check: "text-emerald-400",
    fact: "text-sky-400",
    unresolved: "text-amber-400",
    fallback: "text-orange-400",
  };

  return (
    <div className="rounded-3xl border border-emerald-900/70 bg-black p-5 shadow-2xl shadow-emerald-950/20">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">
            Журнал анализа
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Здесь показано, что модель предложила и что затем проверил сервер. Проценты
            показываются только там, где это действительно самооценка выбора модели.
          </p>
        </div>
        <span className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-500">
          {loading ? "обработка" : "готово"}
        </span>
      </div>

      <div className="max-h-[650px] space-y-2 overflow-auto font-mono text-xs leading-6">
        {lines.length === 0 ? (
          <p className="text-zinc-600">
            &gt; Введите сообщение и нажмите «Разобрать сообщение».
          </p>
        ) : null}

        {lines.map((line, index) => (
          <div
            className="grid grid-cols-[82px_1fr] gap-3"
            key={`${index}-${line.text}`}
          >
            <span className={style[line.kind]}>{label[line.kind]}</span>
            <span className="whitespace-pre-wrap break-words text-zinc-200">
              {line.text}
            </span>
          </div>
        ))}

        {loading ? (
          <div className="grid grid-cols-[82px_1fr] gap-3">
            <span className="text-zinc-500">СИСТЕМА</span>
            <span className="animate-pulse text-zinc-400">
              Выполняется полный анализ…
            </span>
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
  const [trace, setTrace] = useState<TraceLine[]>([]);

  const timeZone =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
      : "UTC";

  const reviewHref = useMemo(() => {
    const params = new URLSearchParams({
      locale,
      returnTo: "activity-journal",
      temporalDirection: "past",
      text: inputText.trim(),
    });

    return `/calendar/activity-review?${params.toString()}`;
  }, [inputText, locale]);

  const futureHref = useMemo(() => {
    const params = new URLSearchParams({
      locale,
      returnTo: "calendar",
      temporalDirection: "future",
      text: inputText.trim(),
    });

    return `/calendar/activity-review?${params.toString()}`;
  }, [inputText, locale]);

  const fullAnalysisSucceeded =
    result?.mode === "global" && result.payload.ok === true;

  async function analyze() {
    const text = inputText.trim();

    if (!text) {
      setError("Сначала напиши, что произошло.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setTrace([
      { kind: "system", text: `Получено сообщение: «${text}»` },
      {
        kind: "system",
        text:
          "Запускаю полный анализ: выделение наблюдений → реальные кандидаты ЦО → выбор модели → проверка фактов сервером.",
      },
    ]);

    try {
      const globalResponse = await fetch(
        "/api/ai/reality/global-observation-preview",
        {
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
            operationId: createOperationId(),
          }),
        },
      );

      const globalPayload = (await globalResponse
        .json()
        .catch(() => null)) as GlobalPreview | null;

      if (globalResponse.ok && globalPayload?.ok === true) {
        const nextTrace = buildGlobalTrace(text, globalPayload);
        setResult({ mode: "global", payload: globalPayload, trace: nextTrace });
        setTrace(nextTrace);
        return;
      }

      const globalError =
        globalPayload?.error ||
        globalPayload?.code ||
        `HTTP ${globalResponse.status}`;

      const fallbackResponse = await fetch(
        "/api/activity/semantic-orchestration-preview",
        {
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
        },
      );

      const fallbackPayload = (await fallbackResponse
        .json()
        .catch(() => null)) as SemanticPreview | null;

      if (!fallbackPayload) {
        throw new Error(
          `${globalError}; резервный разбор также не вернул корректный ответ.`,
        );
      }

      const nextTrace = buildFallbackTrace(text, fallbackPayload, globalError);
      setResult({
        mode: "fallback",
        payload: fallbackPayload,
        trace: nextTrace,
        globalError,
      });
      setTrace(nextTrace);
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Неизвестная ошибка анализа.";
      setError(message);
      setTrace((current) => [
        ...current,
        { kind: "unresolved", text: `Анализ остановлен: ${message}` },
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
            Лучше описывать один основной эпизод за сообщение. В том же сообщении можно
            указать параллельные действия, мысли, чувства, участников и измеренные величины.
          </p>
          <div className="mt-4 rounded-2xl border border-amber-900/60 bg-amber-950/20 p-4 text-xs leading-5 text-amber-100">
            Журнал не показывает скрытые внутренние рассуждения модели. Он показывает
            проверяемый результат обработки: что выделила модель, какие реальные ЦО
            сервер дал ей на выбор, что она выбрала, какие факты извлечены и что сервер
            подтвердил или оставил неопределённым.
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
              placeholder="Например: сходил в магазин, купил две консервы тунца и макароны, заплатил 20 злотых."
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
                  setTrace([]);
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

              {fullAnalysisSucceeded ? (
                <div className="mt-3 grid gap-3">
                  <Link
                    className="rounded-2xl bg-blue-500 px-4 py-3 text-center text-sm font-semibold text-black hover:bg-blue-400"
                    href={reviewHref}
                  >
                    Добавить как прошедшую активность
                  </Link>
                  <Link
                    className="rounded-2xl border border-violet-700 px-4 py-3 text-center text-sm font-semibold text-violet-200 hover:border-violet-500"
                    href={futureHref}
                  >
                    Запланировать эту активность
                  </Link>
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border border-zinc-800 bg-black/40 p-4 text-sm leading-6 text-zinc-500">
                  Сохранение станет доступно только после успешного полного анализа с
                  реальным поиском по ЦО. Резервный разбор недостаточен.
                </div>
              )}
            </div>
          </div>

          <TracePanel lines={trace} loading={loading} />
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
        </footer>
      </div>
    </main>
  );
}

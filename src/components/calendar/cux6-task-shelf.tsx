"use client";

import { useEffect, useMemo, useState } from "react";

export type UiLocale = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

export type TaskViewKey =
  | "today"
  | "week"
  | "overdue"
  | "unscheduled"
  | "completed";

export type Cux6ShelfItem = {
  kind: "planned" | "completed";
  id: string;
  plannedActivityEventId: string | null;
  actualActivityEventId: string | null;
  title: string;
  inputText: string | null;
  description: string | null;
  source: string | null;
  privacyScope: string | null;
  status: string | null;
  scheduleModeCode: string | null;
  scheduledDate: string | null;
  scheduleStartDate: string | null;
  scheduleEndDate: string | null;
  deadlineAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationMinutes: number | null;
  dueAt: string | null;
  enrichmentStatus: string | null;
  enrichmentUpdatedAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
  needsClarification: boolean;
  recurrence: {
    ruleId: string;
    frequencyCode: string;
    intervalCount: number;
    occurrenceOrdinal: number | null;
  } | null;
};

type ShelfGroup = {
  key: TaskViewKey;
  totalCount: number;
  items: Cux6ShelfItem[];
};

type TaskShelfResponse = {
  ok?: boolean;
  error?: string;
  focusDate?: string;
  todayDate?: string;
  weekStartDate?: string;
  weekEndDate?: string;
  timeZone?: string;
  groups?: Partial<Record<TaskViewKey, ShelfGroup>>;
};

type CompletionResponse = {
  ok?: boolean;
  error?: string;
  disposition?: string;
  plannedActivityEventId?: string;
  actualActivityEventId?: string;
  completedAt?: string;
};

type Cux6TaskShelfProps = {
  locale: UiLocale;
  refreshKey: number;
  focusDateKey?: string | null;
  onOpenDetails: (item: Cux6ShelfItem) => void;
  onTaskChanged?: () => void;
};

const VIEW_ORDER: TaskViewKey[] = [
  "today",
  "week",
  "overdue",
  "unscheduled",
  "completed",
];

const INTL_LOCALES: Record<UiLocale, string> = {
  en: "en-GB",
  pl: "pl-PL",
  ru: "ru-RU",
  uk: "uk-UA",
  de: "de-DE",
  es: "es-ES",
  cs: "cs-CZ",
};

type Copy = {
  title: string;
  subtitle: string;
  loading: string;
  loadError: string;
  empty: string;
  details: string;
  complete: string;
  undo: string;
  completedNotice: string;
  clarification: string;
  noDate: string;
  recurrencePrefix: string;
  views: Record<TaskViewKey, string>;
  frequencies: Record<string, { one: string; many: string }>;
};

const COPY: Record<UiLocale, Copy> = {
  en: {
    title: "Tasks",
    subtitle: "What needs attention now. Completion becomes an actual activity and stays in history.",
    loading: "Loading tasks…",
    loadError: "Could not load tasks.",
    empty: "No tasks in this view.",
    details: "Details",
    complete: "Complete",
    undo: "Undo",
    completedNotice: "Completed.",
    clarification: "Needs clarification",
    noDate: "No date",
    recurrencePrefix: "Repeats",
    views: {
      today: "Today",
      week: "Week",
      overdue: "Overdue",
      unscheduled: "No date",
      completed: "Completed",
    },
    frequencies: {
      daily: { one: "daily", many: "every {n} days" },
      weekly: { one: "weekly", many: "every {n} weeks" },
      monthly: { one: "monthly", many: "every {n} months" },
    },
  },
  pl: {
    title: "Zadania",
    subtitle: "To, co wymaga uwagi. Wykonanie staje się faktyczną aktywnością i pozostaje w historii.",
    loading: "Ładowanie zadań…",
    loadError: "Nie udało się wczytać zadań.",
    empty: "Brak zadań w tym widoku.",
    details: "Szczegóły",
    complete: "Wykonaj",
    undo: "Cofnij",
    completedNotice: "Wykonano.",
    clarification: "Wymaga wyjaśnienia",
    noDate: "Bez daty",
    recurrencePrefix: "Powtarza się",
    views: {
      today: "Dzisiaj",
      week: "Tydzień",
      overdue: "Zaległe",
      unscheduled: "Bez daty",
      completed: "Wykonane",
    },
    frequencies: {
      daily: { one: "codziennie", many: "co {n} dni" },
      weekly: { one: "co tydzień", many: "co {n} tygodni" },
      monthly: { one: "co miesiąc", many: "co {n} miesięcy" },
    },
  },
  ru: {
    title: "Задачи",
    subtitle: "То, что требует внимания. Выполнение становится фактической активностью и остаётся в истории.",
    loading: "Загрузка задач…",
    loadError: "Не удалось загрузить задачи.",
    empty: "В этом представлении задач нет.",
    details: "Подробнее",
    complete: "Выполнить",
    undo: "Отменить",
    completedNotice: "Выполнено.",
    clarification: "Нужно уточнение",
    noDate: "Без даты",
    recurrencePrefix: "Повторяется",
    views: {
      today: "Сегодня",
      week: "Неделя",
      overdue: "Просрочено",
      unscheduled: "Без даты",
      completed: "Выполнено",
    },
    frequencies: {
      daily: { one: "каждый день", many: "каждые {n} дн." },
      weekly: { one: "каждую неделю", many: "каждые {n} нед." },
      monthly: { one: "каждый месяц", many: "каждые {n} мес." },
    },
  },
  uk: {
    title: "Завдання",
    subtitle: "Те, що потребує уваги. Виконання стає фактичною активністю та залишається в історії.",
    loading: "Завантаження завдань…",
    loadError: "Не вдалося завантажити завдання.",
    empty: "У цьому поданні завдань немає.",
    details: "Докладніше",
    complete: "Виконати",
    undo: "Скасувати",
    completedNotice: "Виконано.",
    clarification: "Потрібне уточнення",
    noDate: "Без дати",
    recurrencePrefix: "Повторюється",
    views: {
      today: "Сьогодні",
      week: "Тиждень",
      overdue: "Прострочено",
      unscheduled: "Без дати",
      completed: "Виконано",
    },
    frequencies: {
      daily: { one: "щодня", many: "кожні {n} дн." },
      weekly: { one: "щотижня", many: "кожні {n} тиж." },
      monthly: { one: "щомісяця", many: "кожні {n} міс." },
    },
  },
  de: {
    title: "Aufgaben",
    subtitle: "Was jetzt Aufmerksamkeit braucht. Erledigung wird als tatsächliche Aktivität in der Historie gespeichert.",
    loading: "Aufgaben werden geladen…",
    loadError: "Aufgaben konnten nicht geladen werden.",
    empty: "Keine Aufgaben in dieser Ansicht.",
    details: "Details",
    complete: "Erledigen",
    undo: "Rückgängig",
    completedNotice: "Erledigt.",
    clarification: "Klärung nötig",
    noDate: "Ohne Datum",
    recurrencePrefix: "Wiederholt",
    views: {
      today: "Heute",
      week: "Woche",
      overdue: "Überfällig",
      unscheduled: "Ohne Datum",
      completed: "Erledigt",
    },
    frequencies: {
      daily: { one: "täglich", many: "alle {n} Tage" },
      weekly: { one: "wöchentlich", many: "alle {n} Wochen" },
      monthly: { one: "monatlich", many: "alle {n} Monate" },
    },
  },
  es: {
    title: "Tareas",
    subtitle: "Lo que requiere atención. Al completar se registra una actividad real y queda en el historial.",
    loading: "Cargando tareas…",
    loadError: "No se pudieron cargar las tareas.",
    empty: "No hay tareas en esta vista.",
    details: "Detalles",
    complete: "Completar",
    undo: "Deshacer",
    completedNotice: "Completada.",
    clarification: "Necesita aclaración",
    noDate: "Sin fecha",
    recurrencePrefix: "Se repite",
    views: {
      today: "Hoy",
      week: "Semana",
      overdue: "Atrasadas",
      unscheduled: "Sin fecha",
      completed: "Completadas",
    },
    frequencies: {
      daily: { one: "cada día", many: "cada {n} días" },
      weekly: { one: "cada semana", many: "cada {n} semanas" },
      monthly: { one: "cada mes", many: "cada {n} meses" },
    },
  },
  cs: {
    title: "Úkoly",
    subtitle: "Co vyžaduje pozornost. Dokončení se uloží jako skutečná aktivita a zůstane v historii.",
    loading: "Načítání úkolů…",
    loadError: "Úkoly se nepodařilo načíst.",
    empty: "V tomto zobrazení nejsou žádné úkoly.",
    details: "Podrobnosti",
    complete: "Dokončit",
    undo: "Vrátit",
    completedNotice: "Dokončeno.",
    clarification: "Vyžaduje upřesnění",
    noDate: "Bez data",
    recurrencePrefix: "Opakuje se",
    views: {
      today: "Dnes",
      week: "Týden",
      overdue: "Po termínu",
      unscheduled: "Bez data",
      completed: "Dokončeno",
    },
    frequencies: {
      daily: { one: "denně", many: "každých {n} dní" },
      weekly: { one: "týdně", many: "každých {n} týdnů" },
      monthly: { one: "měsíčně", many: "každých {n} měsíců" },
    },
  },
};

function parseTimestamp(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateOnly(value: string | null, locale: UiLocale) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Intl.DateTimeFormat(INTL_LOCALES[locale], {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(parsed);
}

function formatDateTime(value: string | null, locale: UiLocale) {
  const parsed = parseTimestamp(value);
  if (!parsed) return null;

  return new Intl.DateTimeFormat(INTL_LOCALES[locale], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function scheduleLabel(item: Cux6ShelfItem, locale: UiLocale, copy: Copy) {
  if (item.kind === "completed" && item.completedAt) {
    return formatDateTime(item.completedAt, locale);
  }

  if (item.scheduleModeCode === "date_only") {
    return formatDateOnly(item.scheduledDate, locale);
  }

  if (item.scheduleModeCode === "date_range") {
    const start = formatDateOnly(item.scheduleStartDate, locale);
    const end = formatDateOnly(item.scheduleEndDate, locale);
    return start && end ? `${start} – ${end}` : start ?? end;
  }

  if (item.scheduleModeCode === "deadline") {
    return formatDateTime(item.deadlineAt, locale);
  }

  if (item.scheduleModeCode === "exact") {
    const start = formatDateTime(item.startedAt, locale);
    const end = formatDateTime(item.endedAt, locale);
    return start && end ? `${start} – ${end}` : start ?? end;
  }

  return copy.noDate;
}

function recurrenceLabel(item: Cux6ShelfItem, copy: Copy) {
  const recurrence = item.recurrence;
  if (!recurrence) return null;

  const labels = copy.frequencies[recurrence.frequencyCode];
  if (!labels) return copy.recurrencePrefix;

  if (recurrence.intervalCount === 1) {
    return labels.one;
  }

  return labels.many.replace("{n}", String(recurrence.intervalCount));
}

function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function createOperationId() {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `fallback-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function Cux6TaskShelf({
  locale,
  refreshKey,
  focusDateKey,
  onOpenDetails,
  onTaskChanged,
}: Cux6TaskShelfProps) {
  const copy = COPY[locale];
  const [payload, setPayload] = useState<TaskShelfResponse | null>(null);
  const [activeView, setActiveView] = useState<TaskViewKey>("week");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localRefreshKey, setLocalRefreshKey] = useState(0);
  const [notice, setNotice] = useState<{
    plannedActivityEventId: string;
    actualActivityEventId: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTasks() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          limit: "60",
          timeZone: browserTimeZone(),
        });

        if (focusDateKey && /^\d{4}-\d{2}-\d{2}$/.test(focusDateKey)) {
          params.set("focusDate", focusDateKey);
        }

        const response = await fetch(
          `/api/calendar/task-shelf?${params.toString()}`,
          { signal: controller.signal, cache: "no-store" },
        );
        const nextPayload = (await response.json()) as TaskShelfResponse;

        if (!response.ok || nextPayload.ok !== true) {
          throw new Error(
            nextPayload.error ??
              `Task list request failed: ${response.status}`,
          );
        }

        setPayload(nextPayload);
      } catch (caught) {
        if (controller.signal.aborted) return;
        setPayload(null);
        setError(caught instanceof Error ? caught.message : copy.loadError);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadTasks();

    return () => controller.abort();
  }, [
    copy.loadError,
    focusDateKey,
    localRefreshKey,
    refreshKey,
  ]);

  const groups = useMemo(() => {
    const source = payload?.groups ?? {};

    return Object.fromEntries(
      VIEW_ORDER.map((key) => [
        key,
        source[key] ?? { key, totalCount: 0, items: [] },
      ]),
    ) as Record<TaskViewKey, ShelfGroup>;
  }, [payload]);

  const selected = groups[activeView];

  async function completeTask(item: Cux6ShelfItem) {
    if (item.kind !== "planned") return;

    setActionId(item.id);
    setError(null);

    try {
      const response = await fetch(
        `/api/calendar/task-shelf/${encodeURIComponent(item.id)}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operationId: createOperationId() }),
        },
      );
      const result = (await response.json()) as CompletionResponse;

      if (
        !response.ok ||
        result.ok !== true ||
        !result.actualActivityEventId
      ) {
        throw new Error(result.error ?? "Task completion failed.");
      }

      setNotice({
        plannedActivityEventId: item.id,
        actualActivityEventId: result.actualActivityEventId,
        title: item.title,
      });
      setLocalRefreshKey((value) => value + 1);
      onTaskChanged?.();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Task completion failed.",
      );
    } finally {
      setActionId(null);
    }
  }

  async function undoCompletion(params: {
    plannedActivityEventId: string;
    actualActivityEventId: string;
  }) {
    setActionId(params.actualActivityEventId);
    setError(null);

    try {
      const query = new URLSearchParams({
        actualActivityEventId: params.actualActivityEventId,
      });
      const response = await fetch(
        `/api/calendar/task-shelf/${encodeURIComponent(
          params.plannedActivityEventId,
        )}/complete?${query.toString()}`,
        { method: "DELETE" },
      );
      const result = (await response.json()) as CompletionResponse;

      if (!response.ok || result.ok !== true) {
        throw new Error(result.error ?? "Undo failed.");
      }

      setNotice(null);
      setLocalRefreshKey((value) => value + 1);
      onTaskChanged?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Undo failed.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <section
      aria-labelledby="cux6-task-shelf-title"
      className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="cux6-task-shelf-title"
            className="text-lg font-extrabold text-[#1a1d2e]"
          >
            {copy.title}
          </h2>
          <p className="mt-1 max-w-3xl text-xs font-medium text-[#7c8099]">
            {copy.subtitle}
          </p>
        </div>

        {payload?.weekStartDate && payload.weekEndDate ? (
          <div className="rounded-full bg-[#f4f6fb] px-3 py-1.5 text-[11px] font-bold text-[#6f7791]">
            {payload.weekStartDate} – {payload.weekEndDate}
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {VIEW_ORDER.map((key) => {
          const group = groups[key];
          const active = activeView === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveView(key)}
              className={[
                "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-extrabold transition",
                active
                  ? "border-[#3b6ef8] bg-[#3b6ef8] text-white shadow-sm"
                  : "border-[#dce2ef] bg-white text-[#5f6884] hover:bg-[#f7f9ff]",
              ].join(" ")}
            >
              {copy.views[key]}
              <span
                className={[
                  "rounded-full px-1.5 py-0.5 text-[10px]",
                  active
                    ? "bg-white/20 text-white"
                    : "bg-[#eef2ff] text-[#4663b7]",
                ].join(" ")}
              >
                {group.totalCount}
              </span>
            </button>
          );
        })}
      </div>

      {notice ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
          <div className="text-xs font-bold text-emerald-800">
            {copy.completedNotice} {notice.title}
          </div>
          <button
            type="button"
            disabled={actionId === notice.actualActivityEventId}
            onClick={() =>
              void undoCompletion({
                plannedActivityEventId: notice.plannedActivityEventId,
                actualActivityEventId: notice.actualActivityEventId,
              })
            }
            className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-xs font-extrabold text-emerald-800 disabled:opacity-50"
          >
            {copy.undo}
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-4 rounded-xl border border-dashed border-[#d8deef] bg-[#fbfcff] p-4 text-sm font-medium text-[#7c8099]">
          {copy.loading}
        </div>
      ) : null}

      {!loading && error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
          {copy.loadError}
          <span className="mt-1 block text-xs font-normal">{error}</span>
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-[#e7eaf3] bg-white">
          {selected.items.length === 0 ? (
            <div className="px-4 py-6 text-sm font-semibold text-[#8a91a8]">
              {copy.empty}
            </div>
          ) : (
            selected.items.map((item, index) => {
              const recurrence = recurrenceLabel(item, copy);
              const schedule = scheduleLabel(item, locale, copy);
              const completed = item.kind === "completed";
              const plannedId =
                item.plannedActivityEventId ??
                (completed ? null : item.id);
              const actualId = item.actualActivityEventId;

              return (
                <div
                  key={`${item.kind}:${item.id}`}
                  className={[
                    "flex min-h-[62px] items-start gap-3 px-3 py-3 sm:px-4",
                    index > 0 ? "border-t border-[#edf0f6]" : "",
                  ].join(" ")}
                >
                  {completed ? (
                    <div
                      aria-hidden="true"
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-black text-white"
                    >
                      ✓
                    </div>
                  ) : (
                    <button
                      type="button"
                      title={copy.complete}
                      aria-label={`${copy.complete}: ${item.title}`}
                      disabled={actionId === item.id}
                      onClick={() => void completeTask(item)}
                      className="mt-0.5 h-6 w-6 shrink-0 rounded-full border-2 border-[#9eabd2] bg-white transition hover:border-emerald-500 hover:bg-emerald-50 disabled:opacity-50"
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    {completed ? (
                      <div className="truncate text-sm font-bold text-[#596178] line-through decoration-[#b7bfd5]">
                        {item.title}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onOpenDetails(item)}
                        className="block max-w-full truncate text-left text-sm font-bold text-[#20263a] hover:text-[#315ed8]"
                      >
                        {item.title}
                      </button>
                    )}

                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-[#7f879f]">
                      {schedule ? <span>{schedule}</span> : null}
                      {recurrence ? (
                        <span className="rounded-full bg-[#eef2ff] px-2 py-0.5 text-[#4865b4]">
                          ↻ {recurrence}
                        </span>
                      ) : null}
                      {item.needsClarification ? (
                        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-violet-700">
                          ⚠ {copy.clarification}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {!completed ? (
                      <button
                        type="button"
                        onClick={() => onOpenDetails(item)}
                        className="hidden rounded-lg px-2 py-1 text-xs font-bold text-[#315ed8] hover:bg-[#eef2ff] sm:inline-flex"
                      >
                        {copy.details}
                      </button>
                    ) : plannedId && actualId ? (
                      <button
                        type="button"
                        disabled={actionId === actualId}
                        onClick={() =>
                          void undoCompletion({
                            plannedActivityEventId: plannedId,
                            actualActivityEventId: actualId,
                          })
                        }
                        className="rounded-lg border border-[#dce2ef] bg-white px-2.5 py-1 text-xs font-bold text-[#667091] hover:bg-[#f5f6fb] disabled:opacity-50"
                      >
                        {copy.undo}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </section>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";

type UiLocale = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type ShelfGroupKey =
  | "unscheduled"
  | "dueSoon"
  | "needsClarification";

export type Cux6ShelfItem = {
  id: string;
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
};

type ShelfGroup = {
  key: ShelfGroupKey;
  totalCount: number;
  items: Cux6ShelfItem[];
};

type TaskShelfResponse = {
  ok?: boolean;
  error?: string;
  dueDays?: number;
  groups?: {
    unscheduled?: ShelfGroup;
    dueSoon?: ShelfGroup;
    needsClarification?: ShelfGroup;
  };
};

type Cux6TaskShelfProps = {
  locale: UiLocale;
  refreshKey: number;
  onOpenDetails: (item: Cux6ShelfItem) => void;
};

const GROUP_ORDER: ShelfGroupKey[] = [
  "unscheduled",
  "dueSoon",
  "needsClarification",
];

const COPY: Record<
  UiLocale,
  {
    title: string;
    subtitle: string;
    loading: string;
    loadError: string;
    empty: string;
    details: string;
    showAll: string;
    collapse: string;
    groups: Record<
      ShelfGroupKey,
      {
        title: string;
        subtitle: string;
      }
    >;
    modes: Record<string, string>;
    statuses: Record<string, string>;
  }
> = {
  en: {
    title: "Task shelf",
    subtitle:
      "Planned activities that need attention outside the hourly calendar grid.",
    loading: "Loading planned activities…",
    loadError: "Could not load the task shelf.",
    empty: "No items",
    details: "Details",
    showAll: "Show all",
    collapse: "Collapse",
    groups: {
      unscheduled: {
        title: "No date",
        subtitle: "Planned activities without a schedule.",
      },
      dueSoon: {
        title: "Due soon",
        subtitle: "Date, range or deadline within 7 days.",
      },
      needsClarification: {
        title: "Needs clarification",
        subtitle: "The activity container is waiting for your answer.",
      },
    },
    modes: {
      unscheduled: "No date",
      date_only: "Date",
      date_range: "Date range",
      deadline: "Deadline",
      exact: "Exact time",
    },
    statuses: {
      draft: "Draft",
      planned: "Planned",
      confirmed: "Confirmed",
      needs_clarification: "Needs clarification",
    },
  },
  pl: {
    title: "Półka zadań",
    subtitle:
      "Planowane aktywności wymagające uwagi poza godzinową siatką kalendarza.",
    loading: "Ładowanie planowanych aktywności…",
    loadError: "Nie udało się wczytać półki zadań.",
    empty: "Brak elementów",
    details: "Szczegóły",
    showAll: "Pokaż wszystkie",
    collapse: "Zwiń",
    groups: {
      unscheduled: {
        title: "Bez daty",
        subtitle: "Planowane aktywności bez harmonogramu.",
      },
      dueSoon: {
        title: "Termin wkrótce",
        subtitle: "Data, zakres lub termin w ciągu 7 dni.",
      },
      needsClarification: {
        title: "Wymaga wyjaśnienia",
        subtitle: "Kontener aktywności czeka na Twoją odpowiedź.",
      },
    },
    modes: {
      unscheduled: "Bez daty",
      date_only: "Data",
      date_range: "Zakres dat",
      deadline: "Termin",
      exact: "Dokładny czas",
    },
    statuses: {
      draft: "Szkic",
      planned: "Plan",
      confirmed: "Potwierdzone",
      needs_clarification: "Wymaga wyjaśnienia",
    },
  },
  ru: {
    title: "Полка задач",
    subtitle:
      "Плановые активности, требующие внимания вне почасовой сетки календаря.",
    loading: "Загрузка плановых активностей…",
    loadError: "Не удалось загрузить полку задач.",
    empty: "Нет элементов",
    details: "Подробнее",
    showAll: "Показать все",
    collapse: "Свернуть",
    groups: {
      unscheduled: {
        title: "Без даты",
        subtitle: "Плановые активности без расписания.",
      },
      dueSoon: {
        title: "Срок скоро",
        subtitle: "Дата, диапазон или крайний срок в течение 7 дней.",
      },
      needsClarification: {
        title: "Нужно уточнение",
        subtitle: "Контейнер активности ожидает вашего ответа.",
      },
    },
    modes: {
      unscheduled: "Без даты",
      date_only: "Дата",
      date_range: "Диапазон дат",
      deadline: "Крайний срок",
      exact: "Точное время",
    },
    statuses: {
      draft: "Черновик",
      planned: "Запланировано",
      confirmed: "Подтверждено",
      needs_clarification: "Нужно уточнение",
    },
  },
  uk: {
    title: "Полиця завдань",
    subtitle:
      "Заплановані активності, що потребують уваги поза погодинною сіткою календаря.",
    loading: "Завантаження запланованих активностей…",
    loadError: "Не вдалося завантажити полицю завдань.",
    empty: "Немає елементів",
    details: "Докладніше",
    showAll: "Показати всі",
    collapse: "Згорнути",
    groups: {
      unscheduled: {
        title: "Без дати",
        subtitle: "Заплановані активності без розкладу.",
      },
      dueSoon: {
        title: "Термін скоро",
        subtitle: "Дата, діапазон або крайній термін протягом 7 днів.",
      },
      needsClarification: {
        title: "Потрібне уточнення",
        subtitle: "Контейнер активності очікує на вашу відповідь.",
      },
    },
    modes: {
      unscheduled: "Без дати",
      date_only: "Дата",
      date_range: "Діапазон дат",
      deadline: "Крайній термін",
      exact: "Точний час",
    },
    statuses: {
      draft: "Чернетка",
      planned: "Заплановано",
      confirmed: "Підтверджено",
      needs_clarification: "Потрібне уточнення",
    },
  },
  de: {
    title: "Aufgabenablage",
    subtitle:
      "Geplante Aktivitäten, die außerhalb des Stundenrasters Aufmerksamkeit brauchen.",
    loading: "Geplante Aktivitäten werden geladen…",
    loadError: "Die Aufgabenablage konnte nicht geladen werden.",
    empty: "Keine Einträge",
    details: "Details",
    showAll: "Alle anzeigen",
    collapse: "Einklappen",
    groups: {
      unscheduled: {
        title: "Ohne Datum",
        subtitle: "Geplante Aktivitäten ohne Zeitplan.",
      },
      dueSoon: {
        title: "Bald fällig",
        subtitle: "Datum, Zeitraum oder Frist innerhalb von 7 Tagen.",
      },
      needsClarification: {
        title: "Klärung nötig",
        subtitle: "Der Aktivitätscontainer wartet auf Ihre Antwort.",
      },
    },
    modes: {
      unscheduled: "Ohne Datum",
      date_only: "Datum",
      date_range: "Datumsbereich",
      deadline: "Frist",
      exact: "Genaue Zeit",
    },
    statuses: {
      draft: "Entwurf",
      planned: "Geplant",
      confirmed: "Bestätigt",
      needs_clarification: "Klärung nötig",
    },
  },
  es: {
    title: "Bandeja de tareas",
    subtitle:
      "Actividades planificadas que requieren atención fuera de la cuadrícula horaria.",
    loading: "Cargando actividades planificadas…",
    loadError: "No se pudo cargar la bandeja de tareas.",
    empty: "Sin elementos",
    details: "Detalles",
    showAll: "Mostrar todo",
    collapse: "Contraer",
    groups: {
      unscheduled: {
        title: "Sin fecha",
        subtitle: "Actividades planificadas sin programación.",
      },
      dueSoon: {
        title: "Vence pronto",
        subtitle: "Fecha, intervalo o plazo dentro de 7 días.",
      },
      needsClarification: {
        title: "Necesita aclaración",
        subtitle: "El contenedor de actividad espera tu respuesta.",
      },
    },
    modes: {
      unscheduled: "Sin fecha",
      date_only: "Fecha",
      date_range: "Intervalo de fechas",
      deadline: "Plazo",
      exact: "Hora exacta",
    },
    statuses: {
      draft: "Borrador",
      planned: "Planificado",
      confirmed: "Confirmado",
      needs_clarification: "Necesita aclaración",
    },
  },
  cs: {
    title: "Police úkolů",
    subtitle:
      "Plánované aktivity vyžadující pozornost mimo hodinovou mřížku kalendáře.",
    loading: "Načítání plánovaných aktivit…",
    loadError: "Polici úkolů se nepodařilo načíst.",
    empty: "Žádné položky",
    details: "Podrobnosti",
    showAll: "Zobrazit vše",
    collapse: "Sbalit",
    groups: {
      unscheduled: {
        title: "Bez data",
        subtitle: "Plánované aktivity bez rozvrhu.",
      },
      dueSoon: {
        title: "Termín brzy",
        subtitle: "Datum, rozsah nebo termín během 7 dnů.",
      },
      needsClarification: {
        title: "Vyžaduje upřesnění",
        subtitle: "Kontejner aktivity čeká na vaši odpověď.",
      },
    },
    modes: {
      unscheduled: "Bez data",
      date_only: "Datum",
      date_range: "Rozsah dat",
      deadline: "Termín",
      exact: "Přesný čas",
    },
    statuses: {
      draft: "Koncept",
      planned: "Naplánováno",
      confirmed: "Potvrzeno",
      needs_clarification: "Vyžaduje upřesnění",
    },
  },
};

const INTL_LOCALES: Record<UiLocale, string> = {
  en: "en-GB",
  pl: "pl-PL",
  ru: "ru-RU",
  uk: "uk-UA",
  de: "de-DE",
  es: "es-ES",
  cs: "cs-CZ",
};

function parseTimestamp(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(
  value: string | null,
  locale: UiLocale,
) {
  const date = parseTimestamp(value);

  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat(INTL_LOCALES[locale], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDateOnly(
  value: string | null,
  locale: UiLocale,
) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T12:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(INTL_LOCALES[locale], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function itemScheduleLabel(
  item: Cux6ShelfItem,
  locale: UiLocale,
  copy: (typeof COPY)[UiLocale],
) {
  if (item.scheduleModeCode === "deadline") {
    return formatDateTime(item.deadlineAt, locale);
  }

  if (item.scheduleModeCode === "date_only") {
    return formatDateOnly(item.scheduledDate, locale);
  }

  if (item.scheduleModeCode === "date_range") {
    const start = formatDateOnly(item.scheduleStartDate, locale);
    const end = formatDateOnly(item.scheduleEndDate, locale);

    return start && end ? `${start} – ${end}` : start ?? end;
  }

  if (item.scheduleModeCode === "exact") {
    const start = formatDateTime(item.startedAt, locale);
    const end = formatDateTime(item.endedAt, locale);

    return start && end ? `${start} – ${end}` : start ?? end;
  }

  return copy.modes[item.scheduleModeCode ?? ""] ?? null;
}

function groupAccent(groupKey: ShelfGroupKey) {
  if (groupKey === "dueSoon") {
    return "border-amber-200 bg-amber-50/70";
  }

  if (groupKey === "needsClarification") {
    return "border-violet-200 bg-violet-50/70";
  }

  return "border-slate-200 bg-slate-50/80";
}

function groupDot(groupKey: ShelfGroupKey) {
  if (groupKey === "dueSoon") {
    return "bg-amber-500";
  }

  if (groupKey === "needsClarification") {
    return "bg-violet-500";
  }

  return "bg-slate-500";
}

export function Cux6TaskShelf({
  locale,
  refreshKey,
  onOpenDetails,
}: Cux6TaskShelfProps) {
  const copy = COPY[locale];
  const [payload, setPayload] =
    useState<TaskShelfResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<
    Record<ShelfGroupKey, boolean>
  >({
    unscheduled: false,
    dueSoon: false,
    needsClarification: false,
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadShelf() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          limit: "20",
          dueDays: "7",
        });
        const response = await fetch(
          `/api/calendar/task-shelf?${params.toString()}`,
          {
            signal: controller.signal,
          },
        );
        const nextPayload =
          (await response.json()) as TaskShelfResponse;

        if (!response.ok || !nextPayload.ok) {
          throw new Error(
            nextPayload.error ??
              `Task shelf request failed: ${response.status}`,
          );
        }

        setPayload(nextPayload);
      } catch (caught) {
        if (controller.signal.aborted) {
          return;
        }

        setPayload(null);
        setError(
          caught instanceof Error
            ? caught.message
            : copy.loadError,
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadShelf();

    return () => controller.abort();
  }, [copy.loadError, refreshKey]);

  const groups = useMemo(() => {
    const source = payload?.groups;

    return GROUP_ORDER.map((key) => {
      const fallback: ShelfGroup = {
        key,
        totalCount: 0,
        items: [],
      };

      return source?.[key] ?? fallback;
    });
  }, [payload]);

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
      </div>

      {loading ? (
        <div className="mt-4 rounded-xl border border-dashed border-[#d8deef] bg-[#fbfcff] p-4 text-sm font-medium text-[#7c8099]">
          {copy.loading}
        </div>
      ) : null}

      {!loading && error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {copy.loadError}
          <span className="mt-1 block text-xs font-normal">
            {error}
          </span>
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {groups.map((group) => {
            const groupCopy = copy.groups[group.key];
            const isExpanded = expanded[group.key];

            return (
              <article
                key={group.key}
                className={`rounded-xl border p-3 ${groupAccent(
                  group.key,
                )}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className={`h-2.5 w-2.5 rounded-full ${groupDot(
                          group.key,
                        )}`}
                      />
                      <h3 className="text-sm font-extrabold text-[#1a1d2e]">
                        {groupCopy.title}
                      </h3>
                    </div>
                    <p className="mt-1 text-[11px] font-medium leading-relaxed text-[#7c8099]">
                      {groupCopy.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-[#3b6ef8] shadow-sm">
                      {group.totalCount}
                    </span>
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-label={
                        isExpanded ? copy.collapse : copy.showAll
                      }
                      onClick={() =>
                        setExpanded((current) => ({
                          ...current,
                          [group.key]: !current[group.key],
                        }))
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white bg-white text-lg font-extrabold text-[#315ed8] shadow-sm"
                    >
                      <span aria-hidden="true">
                        {isExpanded ? "⌃" : "⌄"}
                      </span>
                    </button>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="mt-3 space-y-2">
                    {group.items.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-white/80 bg-white/60 p-3 text-xs font-semibold text-[#7c8099]">
                        {copy.empty}
                      </div>
                    ) : null}

                    {group.items.map((item) => {
                      const scheduleLabel = itemScheduleLabel(
                        item,
                        locale,
                        copy,
                      );
                      const modeLabel =
                        copy.modes[item.scheduleModeCode ?? ""] ??
                        item.scheduleModeCode;
                      const statusLabel =
                        copy.statuses[item.enrichmentStatus ?? ""] ??
                        copy.statuses[item.status ?? ""] ??
                        item.status;

                      return (
                        <div
                          key={item.id}
                          className="rounded-lg border border-white/90 bg-white p-3 shadow-sm"
                        >
                          <div className="line-clamp-2 text-sm font-bold text-[#1a1d2e]">
                            {item.title}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {modeLabel ? (
                              <span className="rounded-full bg-[#eef2ff] px-2 py-1 text-[10px] font-bold text-[#4865b4]">
                                {modeLabel}
                              </span>
                            ) : null}
                            {statusLabel ? (
                              <span className="rounded-full bg-[#f3f4f8] px-2 py-1 text-[10px] font-bold text-[#667091]">
                                {statusLabel}
                              </span>
                            ) : null}
                          </div>

                          {scheduleLabel ? (
                            <div className="mt-2 text-[11px] font-semibold text-[#7c8099]">
                              {scheduleLabel}
                            </div>
                          ) : null}

                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={() => onOpenDetails(item)}
                              className="text-xs font-extrabold text-[#315ed8] underline decoration-[#9eb3ff] underline-offset-4"
                            >
                              {copy.details}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

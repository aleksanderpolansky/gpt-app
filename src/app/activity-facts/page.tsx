"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Locale = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type FactMetricValue = number | string | boolean | null;

type ActivityFact = {
  factId: string | null;
  userId: string | null;
  activityEventId: string | null;
  measureId: string | null;
  semanticObjectKey: string | null;
  valueObjectId: string | null;
  measureType: string | null;
  metricValue: FactMetricValue;
  metricValueSource: string | null;
  unit: string | null;
  factStatus: string | null;
  sourceType: string | null;
  confidence: number | null;
  performedByActorId: string | null;
  actingAsActorId: string | null;
  actingForActorId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type FactsApiResponse = {
  ok?: boolean;
  facts?: ActivityFact[];
  count?: number;
  errorMessage?: string;
};

type LoadState = {
  status: "idle" | "loading" | "success" | "error";
  message: string;
  response: FactsApiResponse | null;
};

type ActivityFactsCopy = {
  pageTitle: string;
  pageSubtitle: string;
  refresh: string;
  filters: string;
  filtersSubtitle: string;
  limit: string;
  semanticKey: string;
  valueObjectId: string;
  activityId: string;
  status: string;
  allStatuses: string;
  apply: string;
  reset: string;
  loading: string;
  loaded: string;
  empty: string;
  errorLoad: string;
  summaryAll: string;
  summaryConfirmed: string;
  summaryProposed: string;
  summaryOther: string;
  confirmedTitle: string;
  confirmedSubtitle: string;
  proposedTitle: string;
  proposedSubtitle: string;
  otherTitle: string;
  otherSubtitle: string;
  noFactsInGroup: string;
  ids: string;
  semantic: string;
  measure: string;
  actions: string;
  details: string;
  factActivity: string;
  valueObject: string;
  selectedFact: string;
  selectedHint: string;
  type: string;
  value: string;
  unit: string;
  createdAt: string;
  source: string;
  confidence: string;
  factStatusLabels: Record<string, string>;
};

const SUPPORTED_LOCALES: Locale[] = ["en", "pl", "ru", "uk", "de", "es", "cs"];

const COPY: Record<Locale, ActivityFactsCopy> = {
  en: {
    pageTitle: "Activity facts",
    pageSubtitle: "Saved facts extracted from past and planned activity containers.",
    refresh: "Refresh",
    filters: "Filters",
    filtersSubtitle: "Narrow the list by semantic key, value object, activity, or status.",
    limit: "Limit",
    semanticKey: "Semantic key",
    valueObjectId: "Value object ID",
    activityId: "Activity ID",
    status: "Status",
    allStatuses: "All statuses",
    apply: "Apply filters",
    reset: "Reset",
    loading: "Loading facts...",
    loaded: "Facts loaded.",
    empty: "No facts match the current filters.",
    errorLoad: "Could not load activity facts.",
    summaryAll: "All facts",
    summaryConfirmed: "Past confirmed",
    summaryProposed: "Planned facts",
    summaryOther: "Other",
    confirmedTitle: "Past confirmed facts",
    confirmedSubtitle: "Facts from completed activity containers.",
    proposedTitle: "Planned and prognostic facts",
    proposedSubtitle: "Facts from future calendar activity containers.",
    otherTitle: "Other facts",
    otherSubtitle: "Facts waiting for review, rejected, superseded, or using another status.",
    noFactsInGroup: "No facts in this group.",
    ids: "IDs",
    semantic: "Semantic",
    measure: "Measure",
    actions: "Actions",
    details: "Details",
    factActivity: "Fact / activity",
    valueObject: "Value object",
    selectedFact: "Selected fact",
    selectedHint: "Select a row to see the fact details.",
    type: "Type",
    value: "Value",
    unit: "Unit",
    createdAt: "Created at",
    source: "Source",
    confidence: "Confidence",
    factStatusLabels: {
      confirmed: "confirmed",
      proposed: "proposed",
      pending_review: "pending review",
      rejected: "rejected",
      superseded: "superseded",
    },
  },
  pl: {
    pageTitle: "Tabela faktów aktywności",
    pageSubtitle: "Zapisane fakty wyodrębnione z wykonanych i planowanych kontenerów aktywności.",
    refresh: "Odśwież",
    filters: "Filtry",
    filtersSubtitle: "Zawęź listę według klucza semantycznego, obiektu wartości, aktywności albo statusu.",
    limit: "Limit",
    semanticKey: "Klucz semantyczny",
    valueObjectId: "ID obiektu wartości",
    activityId: "ID aktywności",
    status: "Status",
    allStatuses: "Wszystkie statusy",
    apply: "Zastosuj filtry",
    reset: "Wyczyść",
    loading: "Ładuję fakty...",
    loaded: "Fakty załadowane.",
    empty: "Brak faktów dla bieżących filtrów.",
    errorLoad: "Nie udało się załadować faktów aktywności.",
    summaryAll: "Wszystkie fakty",
    summaryConfirmed: "Potwierdzone z przeszłości",
    summaryProposed: "Planowane fakty",
    summaryOther: "Inne",
    confirmedTitle: "Potwierdzone fakty z przeszłości",
    confirmedSubtitle: "Fakty z wykonanych kontenerów aktywności.",
    proposedTitle: "Planowane i prognostyczne fakty",
    proposedSubtitle: "Fakty z przyszłych kontenerów aktywności w kalendarzu.",
    otherTitle: "Inne fakty",
    otherSubtitle: "Fakty oczekujące na przegląd, odrzucone, zastąpione albo z innym statusem.",
    noFactsInGroup: "Brak faktów w tej grupie.",
    ids: "ID",
    semantic: "Semantyka",
    measure: "Miara",
    actions: "Akcje",
    details: "Szczegóły",
    factActivity: "Fakt / aktywność",
    valueObject: "Obiekt wartości",
    selectedFact: "Wybrany fakt",
    selectedHint: "Wybierz wiersz, aby zobaczyć szczegóły faktu.",
    type: "Typ",
    value: "Wartość",
    unit: "Jednostka",
    createdAt: "Utworzono",
    source: "Źródło",
    confidence: "Pewność",
    factStatusLabels: {
      confirmed: "potwierdzony",
      proposed: "planowany",
      pending_review: "do przeglądu",
      rejected: "odrzucony",
      superseded: "zastąpiony",
    },
  },
  ru: {
    pageTitle: "Таблица фактов активности",
    pageSubtitle: "Сохранённые факты, извлечённые из выполненных и плановых контейнеров активности.",
    refresh: "Обновить",
    filters: "Фильтры",
    filtersSubtitle: "Сузь список по семантическому ключу, ценному объекту, активности или статусу.",
    limit: "Лимит",
    semanticKey: "Семантический ключ",
    valueObjectId: "ID ценного объекта",
    activityId: "ID активности",
    status: "Статус",
    allStatuses: "Все статусы",
    apply: "Применить фильтры",
    reset: "Сбросить",
    loading: "Загружаю факты...",
    loaded: "Факты загружены.",
    empty: "Для текущих фильтров фактов нет.",
    errorLoad: "Не удалось загрузить факты активности.",
    summaryAll: "Все факты",
    summaryConfirmed: "Подтверждённые прошлые",
    summaryProposed: "Плановые факты",
    summaryOther: "Прочие",
    confirmedTitle: "Подтверждённые факты прошлого",
    confirmedSubtitle: "Факты из выполненных контейнеров активности.",
    proposedTitle: "Плановые и прогнозные факты",
    proposedSubtitle: "Факты из будущих календарных контейнеров активности.",
    otherTitle: "Прочие факты",
    otherSubtitle: "Факты на проверке, отклонённые, заменённые или с другим статусом.",
    noFactsInGroup: "В этой группе фактов нет.",
    ids: "ID",
    semantic: "Семантика",
    measure: "Измерение",
    actions: "Действия",
    details: "Детали",
    factActivity: "Факт / активность",
    valueObject: "Ценный объект",
    selectedFact: "Выбранный факт",
    selectedHint: "Выбери строку, чтобы увидеть детали факта.",
    type: "Тип",
    value: "Значение",
    unit: "Единица",
    createdAt: "Создано",
    source: "Источник",
    confidence: "Уверенность",
    factStatusLabels: {
      confirmed: "подтверждён",
      proposed: "плановый",
      pending_review: "на проверке",
      rejected: "отклонён",
      superseded: "заменён",
    },
  },
  uk: {
    pageTitle: "Таблиця фактів активності",
    pageSubtitle: "Збережені факти, витягнуті з виконаних і планових контейнерів активності.",
    refresh: "Оновити",
    filters: "Фільтри",
    filtersSubtitle: "Звузь список за семантичним ключем, цінним об’єктом, активністю або статусом.",
    limit: "Ліміт",
    semanticKey: "Семантичний ключ",
    valueObjectId: "ID цінного об’єкта",
    activityId: "ID активності",
    status: "Статус",
    allStatuses: "Усі статуси",
    apply: "Застосувати фільтри",
    reset: "Скинути",
    loading: "Завантажую факти...",
    loaded: "Факти завантажено.",
    empty: "Для поточних фільтрів фактів немає.",
    errorLoad: "Не вдалося завантажити факти активності.",
    summaryAll: "Усі факти",
    summaryConfirmed: "Підтверджені минулі",
    summaryProposed: "Планові факти",
    summaryOther: "Інші",
    confirmedTitle: "Підтверджені факти минулого",
    confirmedSubtitle: "Факти з виконаних контейнерів активності.",
    proposedTitle: "Планові та прогнозні факти",
    proposedSubtitle: "Факти з майбутніх календарних контейнерів активності.",
    otherTitle: "Інші факти",
    otherSubtitle: "Факти на перевірці, відхилені, замінені або з іншим статусом.",
    noFactsInGroup: "У цій групі фактів немає.",
    ids: "ID",
    semantic: "Семантика",
    measure: "Вимір",
    actions: "Дії",
    details: "Деталі",
    factActivity: "Факт / активність",
    valueObject: "Цінний об’єкт",
    selectedFact: "Вибраний факт",
    selectedHint: "Вибери рядок, щоб побачити деталі факту.",
    type: "Тип",
    value: "Значення",
    unit: "Одиниця",
    createdAt: "Створено",
    source: "Джерело",
    confidence: "Впевненість",
    factStatusLabels: {
      confirmed: "підтверджено",
      proposed: "плановий",
      pending_review: "на перевірці",
      rejected: "відхилено",
      superseded: "замінено",
    },
  },
  de: {
    pageTitle: "Aktivitätsfakten",
    pageSubtitle: "Gespeicherte Fakten aus erledigten und geplanten Aktivitätscontainern.",
    refresh: "Aktualisieren",
    filters: "Filter",
    filtersSubtitle: "Liste nach semantischem Schlüssel, Wertobjekt, Aktivität oder Status eingrenzen.",
    limit: "Limit",
    semanticKey: "Semantischer Schlüssel",
    valueObjectId: "Wertobjekt-ID",
    activityId: "Aktivitäts-ID",
    status: "Status",
    allStatuses: "Alle Status",
    apply: "Filter anwenden",
    reset: "Zurücksetzen",
    loading: "Fakten werden geladen...",
    loaded: "Fakten geladen.",
    empty: "Keine Fakten für die aktuellen Filter.",
    errorLoad: "Aktivitätsfakten konnten nicht geladen werden.",
    summaryAll: "Alle Fakten",
    summaryConfirmed: "Bestätigte Vergangenheit",
    summaryProposed: "Geplante Fakten",
    summaryOther: "Andere",
    confirmedTitle: "Bestätigte Fakten aus der Vergangenheit",
    confirmedSubtitle: "Fakten aus erledigten Aktivitätscontainern.",
    proposedTitle: "Geplante und prognostische Fakten",
    proposedSubtitle: "Fakten aus zukünftigen Kalender-Aktivitätscontainern.",
    otherTitle: "Andere Fakten",
    otherSubtitle: "Fakten in Prüfung, abgelehnt, ersetzt oder mit anderem Status.",
    noFactsInGroup: "Keine Fakten in dieser Gruppe.",
    ids: "IDs",
    semantic: "Semantik",
    measure: "Messwert",
    actions: "Aktionen",
    details: "Details",
    factActivity: "Fakt / Aktivität",
    valueObject: "Wertobjekt",
    selectedFact: "Ausgewählter Fakt",
    selectedHint: "Wähle eine Zeile aus, um Details zu sehen.",
    type: "Typ",
    value: "Wert",
    unit: "Einheit",
    createdAt: "Erstellt",
    source: "Quelle",
    confidence: "Sicherheit",
    factStatusLabels: {
      confirmed: "bestätigt",
      proposed: "geplant",
      pending_review: "in Prüfung",
      rejected: "abgelehnt",
      superseded: "ersetzt",
    },
  },
  es: {
    pageTitle: "Hechos de actividad",
    pageSubtitle: "Hechos guardados extraídos de contenedores de actividad realizados y planificados.",
    refresh: "Actualizar",
    filters: "Filtros",
    filtersSubtitle: "Filtra por clave semántica, objeto de valor, actividad o estado.",
    limit: "Límite",
    semanticKey: "Clave semántica",
    valueObjectId: "ID del objeto de valor",
    activityId: "ID de actividad",
    status: "Estado",
    allStatuses: "Todos los estados",
    apply: "Aplicar filtros",
    reset: "Restablecer",
    loading: "Cargando hechos...",
    loaded: "Hechos cargados.",
    empty: "No hay hechos para los filtros actuales.",
    errorLoad: "No se pudieron cargar los hechos de actividad.",
    summaryAll: "Todos los hechos",
    summaryConfirmed: "Pasado confirmado",
    summaryProposed: "Hechos planificados",
    summaryOther: "Otros",
    confirmedTitle: "Hechos confirmados del pasado",
    confirmedSubtitle: "Hechos de contenedores de actividad completados.",
    proposedTitle: "Hechos planificados y pronosticados",
    proposedSubtitle: "Hechos de futuros contenedores de actividad del calendario.",
    otherTitle: "Otros hechos",
    otherSubtitle: "Hechos en revisión, rechazados, reemplazados o con otro estado.",
    noFactsInGroup: "No hay hechos en este grupo.",
    ids: "IDs",
    semantic: "Semántica",
    measure: "Medida",
    actions: "Acciones",
    details: "Detalles",
    factActivity: "Hecho / actividad",
    valueObject: "Objeto de valor",
    selectedFact: "Hecho seleccionado",
    selectedHint: "Selecciona una fila para ver detalles.",
    type: "Tipo",
    value: "Valor",
    unit: "Unidad",
    createdAt: "Creado",
    source: "Fuente",
    confidence: "Confianza",
    factStatusLabels: {
      confirmed: "confirmado",
      proposed: "planificado",
      pending_review: "en revisión",
      rejected: "rechazado",
      superseded: "reemplazado",
    },
  },
  cs: {
    pageTitle: "Fakta aktivit",
    pageSubtitle: "Uložená fakta získaná z dokončených a plánovaných kontejnerů aktivit.",
    refresh: "Obnovit",
    filters: "Filtry",
    filtersSubtitle: "Zúž seznam podle sémantického klíče, hodnotového objektu, aktivity nebo stavu.",
    limit: "Limit",
    semanticKey: "Sémantický klíč",
    valueObjectId: "ID hodnotového objektu",
    activityId: "ID aktivity",
    status: "Stav",
    allStatuses: "Všechny stavy",
    apply: "Použít filtry",
    reset: "Resetovat",
    loading: "Načítám fakta...",
    loaded: "Fakta načtena.",
    empty: "Pro aktuální filtry nejsou žádná fakta.",
    errorLoad: "Nepodařilo se načíst fakta aktivit.",
    summaryAll: "Všechna fakta",
    summaryConfirmed: "Potvrzená minulost",
    summaryProposed: "Plánovaná fakta",
    summaryOther: "Ostatní",
    confirmedTitle: "Potvrzená fakta z minulosti",
    confirmedSubtitle: "Fakta z dokončených kontejnerů aktivit.",
    proposedTitle: "Plánovaná a prognostická fakta",
    proposedSubtitle: "Fakta z budoucích kalendářových kontejnerů aktivit.",
    otherTitle: "Ostatní fakta",
    otherSubtitle: "Fakta čekající na kontrolu, odmítnutá, nahrazená nebo s jiným stavem.",
    noFactsInGroup: "V této skupině nejsou žádná fakta.",
    ids: "ID",
    semantic: "Sémantika",
    measure: "Míra",
    actions: "Akce",
    details: "Detaily",
    factActivity: "Fakt / aktivita",
    valueObject: "Hodnotový objekt",
    selectedFact: "Vybraný fakt",
    selectedHint: "Vyber řádek pro zobrazení detailů faktu.",
    type: "Typ",
    value: "Hodnota",
    unit: "Jednotka",
    createdAt: "Vytvořeno",
    source: "Zdroj",
    confidence: "Jistota",
    factStatusLabels: {
      confirmed: "potvrzeno",
      proposed: "plánováno",
      pending_review: "ke kontrole",
      rejected: "odmítnuto",
      superseded: "nahrazeno",
    },
  },
};

function normalizeLocale(value: string | null): Locale {
  return SUPPORTED_LOCALES.includes(value as Locale) ? (value as Locale) : "en";
}

function localeToIntl(locale: Locale) {
  const map: Record<Locale, string> = {
    en: "en-US",
    pl: "pl-PL",
    ru: "ru-RU",
    uk: "uk-UA",
    de: "de-DE",
    es: "es-ES",
    cs: "cs-CZ",
  };

  return map[locale];
}

function truncateMiddle(value: string | null, left = 8, right = 6) {
  if (!value) {
    return "—";
  }

  if (value.length <= left + right + 3) {
    return value;
  }

  return `${value.slice(0, left)}...${value.slice(-right)}`;
}

function formatMetricValue(value: FactMetricValue) {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value);
}

function formatDate(value: string | null, locale: Locale) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(localeToIntl(locale), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildQuery(params: {
  limit: string;
  semanticObjectKey: string;
  valueObjectId: string;
  activityEventId: string;
  factStatus: string;
}) {
  const search = new URLSearchParams();

  search.set("limit", params.limit || "50");

  if (params.semanticObjectKey.trim()) {
    search.set("semanticObjectKey", params.semanticObjectKey.trim());
  }

  if (params.valueObjectId.trim()) {
    search.set("valueObjectId", params.valueObjectId.trim());
  }

  if (params.activityEventId.trim()) {
    search.set("activityEventId", params.activityEventId.trim());
  }

  if (params.factStatus.trim()) {
    search.set("factStatus", params.factStatus.trim());
  }

  return `/api/activity/facts?${search.toString()}`;
}

function getStatusTone(status: string | null) {
  if (status === "confirmed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "proposed") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (status === "rejected") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (status === "pending_review") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function getStatusLabel(status: string | null, copy: ActivityFactsCopy) {
  if (!status) {
    return "—";
  }

  return copy.factStatusLabels[status] ?? status;
}

function groupFacts(facts: ActivityFact[]) {
  return {
    confirmed: facts.filter((fact) => fact.factStatus === "confirmed"),
    proposed: facts.filter((fact) => fact.factStatus === "proposed"),
    other: facts.filter(
      (fact) => fact.factStatus !== "confirmed" && fact.factStatus !== "proposed"
    ),
  };
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  readonly label: string;
  readonly value: number;
  readonly tone: string;
}) {
  return (
    <div className="rounded-[24px] border border-black/[0.06] bg-white p-5 shadow-sm">
      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#747da0]">
        {label}
      </div>
      <div className={`mt-3 text-4xl font-black ${tone}`}>{value}</div>
    </div>
  );
}

function FactRow({
  fact,
  locale,
  copy,
  selected,
  onSelect,
}: {
  readonly fact: ActivityFact;
  readonly locale: Locale;
  readonly copy: ActivityFactsCopy;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  return (
    <article
      className={[
        "grid gap-4 rounded-[22px] border p-4 transition sm:grid-cols-[1.2fr_1fr_0.8fr_0.75fr_auto]",
        selected ? "border-blue-300 bg-blue-50/70" : "border-black/[0.07] bg-white hover:bg-slate-50",
      ].join(" ")}
    >
      <div className="min-w-0">
        <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#747da0]">
          {copy.factActivity}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
          <span className="font-mono text-slate-800" title={fact.factId ?? undefined}>
            F: {truncateMiddle(fact.factId, 6, 6)}
          </span>
          {fact.activityEventId ? (
            <Link
              href={`/activity-today?locale=${locale}&activityEventId=${encodeURIComponent(
                fact.activityEventId
              )}`}
              className="font-mono text-blue-700 no-underline"
              title={fact.activityEventId}
            >
              A: {truncateMiddle(fact.activityEventId, 6, 6)}
            </Link>
          ) : (
            <span className="font-mono text-slate-400">A: —</span>
          )}
        </div>
        <div className="mt-2 text-xs font-semibold text-slate-500">
          {formatDate(fact.createdAt, locale)}
        </div>
      </div>

      <div className="min-w-0">
        <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#747da0]">
          {copy.semantic}
        </div>
        <div className="mt-2 break-words font-mono text-sm font-black text-slate-900">
          {fact.semanticObjectKey ?? "—"}
        </div>
        <div className="mt-2 text-xs font-semibold text-slate-500">
          {copy.valueObject}:{" "}
          {fact.valueObjectId ? (
            <Link
              href={`/value-objects/${encodeURIComponent(fact.valueObjectId)}?locale=${locale}`}
              className="font-bold text-blue-700 no-underline"
              title={fact.valueObjectId}
            >
              {truncateMiddle(fact.valueObjectId, 6, 6)}
            </Link>
          ) : (
            "—"
          )}
        </div>
      </div>

      <div>
        <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#747da0]">
          {copy.measure}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex min-w-12 items-center justify-center rounded-2xl bg-indigo-50 px-3 py-2 text-xl font-black text-blue-700">
            {formatMetricValue(fact.metricValue)}
          </span>
          <span className="text-sm font-black text-slate-900">{fact.unit ?? "—"}</span>
        </div>
        <div className="mt-2 text-xs font-bold text-slate-500">{fact.measureType ?? "—"}</div>
      </div>

      <div>
        <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#747da0]">
          {copy.status}
        </div>
        <span
          className={[
            "mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-black",
            getStatusTone(fact.factStatus),
          ].join(" ")}
        >
          {getStatusLabel(fact.factStatus, copy)}
        </span>
        <div className="mt-2 text-xs font-semibold text-slate-500">{fact.sourceType ?? "—"}</div>
      </div>

      <div className="flex items-center sm:justify-end">
        <button
          type="button"
          onClick={onSelect}
          className="min-h-10 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900 shadow-sm transition hover:border-blue-300 hover:text-blue-700"
        >
          {copy.details}
        </button>
      </div>
    </article>
  );
}

function FactGroup({
  title,
  subtitle,
  facts,
  locale,
  copy,
  selectedFact,
  onSelect,
}: {
  readonly title: string;
  readonly subtitle: string;
  readonly facts: ActivityFact[];
  readonly locale: Locale;
  readonly copy: ActivityFactsCopy;
  readonly selectedFact: ActivityFact | null;
  readonly onSelect: (factId: string | null) => void;
}) {
  return (
    <section className="rounded-[28px] border border-black/[0.06] bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-[#101632]">{title}</h2>
          <p className="mt-1 text-sm font-medium text-[#69708f]">{subtitle}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-700">
          {facts.length}
        </span>
      </div>

      {facts.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
          {copy.noFactsInGroup}
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="hidden grid-cols-[1.2fr_1fr_0.8fr_0.75fr_auto] gap-4 px-4 text-[10px] font-black uppercase tracking-[0.16em] text-[#747da0] sm:grid">
            <span>{copy.ids}</span>
            <span>{copy.semantic}</span>
            <span>{copy.measure}</span>
            <span>{copy.status}</span>
            <span>{copy.actions}</span>
          </div>

          {facts.map((fact) => (
            <FactRow
              key={fact.factId ?? `${fact.activityEventId}-${fact.semanticObjectKey}`}
              fact={fact}
              locale={locale}
              copy={copy}
              selected={selectedFact?.factId === fact.factId}
              onSelect={() => onSelect(fact.factId)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ActivityFactsPageContent() {
  const searchParams = useSearchParams();
  const locale = normalizeLocale(searchParams.get("locale"));
  const copy = COPY[locale];

  const [limit, setLimit] = useState("50");
  const [semanticObjectKey, setSemanticObjectKey] = useState("");
  const [valueObjectId, setValueObjectId] = useState("");
  const [activityEventId, setActivityEventId] = useState("");
  const [factStatus, setFactStatus] = useState("");
  const [selectedFactId, setSelectedFactId] = useState<string | null>(null);
  const [state, setState] = useState<LoadState>({
    status: "idle",
    message: copy.loading,
    response: null,
  });

  const queryUrl = useMemo(() => {
    return buildQuery({
      limit,
      semanticObjectKey,
      valueObjectId,
      activityEventId,
      factStatus,
    });
  }, [limit, semanticObjectKey, valueObjectId, activityEventId, factStatus]);

  const facts = state.response?.facts ?? [];
  const groupedFacts = useMemo(() => groupFacts(facts), [facts]);
  const selectedFact =
    facts.find((fact) => fact.factId === selectedFactId) ?? facts[0] ?? null;

  const loadFacts = useCallback(async () => {
    setState({
      status: "loading",
      message: copy.loading,
      response: null,
    });

    try {
      const response = await fetch(queryUrl, {
        method: "GET",
        credentials: "same-origin",
      });

      const json = (await response.json().catch(() => {
        return {
          ok: false,
          errorMessage: "Response was not valid JSON.",
        };
      })) as FactsApiResponse;

      if (!response.ok || json.ok !== true) {
        setState({
          status: "error",
          message: json.errorMessage ?? `${copy.errorLoad} HTTP ${response.status}`,
          response: json,
        });

        return;
      }

      const nextFacts = json.facts ?? [];

      setState({
        status: "success",
        message: nextFacts.length > 0 ? copy.loaded : copy.empty,
        response: json,
      });

      if (nextFacts.length > 0) {
        setSelectedFactId((current) => {
          if (current && nextFacts.some((fact) => fact.factId === current)) {
            return current;
          }

          return nextFacts[0]?.factId ?? null;
        });
      } else {
        setSelectedFactId(null);
      }
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : copy.errorLoad,
        response: null,
      });
    }
  }, [copy.empty, copy.errorLoad, copy.loaded, copy.loading, queryUrl]);

  function resetFilters() {
    setLimit("50");
    setSemanticObjectKey("");
    setValueObjectId("");
    setActivityEventId("");
    setFactStatus("");
  }

  useEffect(() => {
    void loadFacts();
  }, [loadFacts]);

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-[#eef2f7] px-4 py-6 text-[#101632] sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <section className="rounded-[32px] border border-black/[0.06] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl">
              <p className="text-[12px] font-black uppercase tracking-[0.18em] text-blue-600">
                Activity facts
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-[#101632] sm:text-4xl">
                {copy.pageTitle}
              </h1>
              <p className="mt-3 text-base font-medium leading-7 text-[#69708f]">
                {copy.pageSubtitle}
              </p>
            </div>

            <button
              type="button"
              onClick={loadFacts}
              className="min-h-11 rounded-2xl border border-blue-200 bg-blue-50 px-5 text-sm font-black text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-100"
            >
              {copy.refresh}
            </button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label={copy.summaryAll} value={facts.length} tone="text-slate-900" />
          <SummaryCard
            label={copy.summaryConfirmed}
            value={groupedFacts.confirmed.length}
            tone="text-emerald-600"
          />
          <SummaryCard
            label={copy.summaryProposed}
            value={groupedFacts.proposed.length}
            tone="text-blue-600"
          />
          <SummaryCard label={copy.summaryOther} value={groupedFacts.other.length} tone="text-amber-600" />
        </section>

        <section className="rounded-[28px] border border-black/[0.06] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-[#101632]">{copy.filters}</h2>
              <p className="mt-1 text-sm font-medium text-[#69708f]">{copy.filtersSubtitle}</p>
            </div>

            <span
              className={[
                "rounded-full border px-3 py-2 text-xs font-black",
                state.status === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : state.status === "loading"
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700",
              ].join(" ")}
            >
              {state.message}
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-5">
            <label className="grid gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#747da0]">
                {copy.limit}
              </span>
              <select
                value={limit}
                onChange={(event) => setLimit(event.target.value)}
                className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none transition focus:border-blue-300"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#747da0]">
                {copy.semanticKey}
              </span>
              <input
                value={semanticObjectKey}
                onChange={(event) => setSemanticObjectKey(event.target.value)}
                placeholder="walk"
                className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none transition focus:border-blue-300"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#747da0]">
                {copy.valueObjectId}
              </span>
              <input
                value={valueObjectId}
                onChange={(event) => setValueObjectId(event.target.value)}
                placeholder="uuid"
                className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none transition focus:border-blue-300"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#747da0]">
                {copy.activityId}
              </span>
              <input
                value={activityEventId}
                onChange={(event) => setActivityEventId(event.target.value)}
                placeholder="uuid"
                className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none transition focus:border-blue-300"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#747da0]">
                {copy.status}
              </span>
              <select
                value={factStatus}
                onChange={(event) => setFactStatus(event.target.value)}
                className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none transition focus:border-blue-300"
              >
                <option value="">{copy.allStatuses}</option>
                <option value="confirmed">{getStatusLabel("confirmed", copy)}</option>
                <option value="proposed">{getStatusLabel("proposed", copy)}</option>
                <option value="pending_review">{getStatusLabel("pending_review", copy)}</option>
                <option value="rejected">{getStatusLabel("rejected", copy)}</option>
                <option value="superseded">{getStatusLabel("superseded", copy)}</option>
              </select>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadFacts}
              className="min-h-11 rounded-2xl bg-[#101632] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#1b2345]"
            >
              {copy.apply}
            </button>

            <button
              type="button"
              onClick={resetFilters}
              className="min-h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-900 shadow-sm transition hover:border-blue-300 hover:text-blue-700"
            >
              {copy.reset}
            </button>
          </div>
        </section>

        <FactGroup
          title={copy.proposedTitle}
          subtitle={copy.proposedSubtitle}
          facts={groupedFacts.proposed}
          locale={locale}
          copy={copy}
          selectedFact={selectedFact}
          onSelect={setSelectedFactId}
        />

        <FactGroup
          title={copy.confirmedTitle}
          subtitle={copy.confirmedSubtitle}
          facts={groupedFacts.confirmed}
          locale={locale}
          copy={copy}
          selectedFact={selectedFact}
          onSelect={setSelectedFactId}
        />

        <FactGroup
          title={copy.otherTitle}
          subtitle={copy.otherSubtitle}
          facts={groupedFacts.other}
          locale={locale}
          copy={copy}
          selectedFact={selectedFact}
          onSelect={setSelectedFactId}
        />

        <section className="rounded-[28px] border border-black/[0.06] bg-white p-5 shadow-sm sm:p-6">
          <p className="text-[12px] font-black uppercase tracking-[0.18em] text-blue-600">
            {copy.details}
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#101632]">{copy.selectedFact}</h2>

          {selectedFact ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[22px] border border-slate-200 p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#747da0]">
                  {copy.type}
                </div>
                <strong className="mt-2 block">{selectedFact.measureType ?? "—"}</strong>
              </div>

              <div className="rounded-[22px] border border-slate-200 p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#747da0]">
                  {copy.value}
                </div>
                <strong className="mt-2 block">{formatMetricValue(selectedFact.metricValue)}</strong>
              </div>

              <div className="rounded-[22px] border border-slate-200 p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#747da0]">
                  {copy.unit}
                </div>
                <strong className="mt-2 block">{selectedFact.unit ?? "—"}</strong>
              </div>

              <div className="rounded-[22px] border border-slate-200 p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#747da0]">
                  {copy.status}
                </div>
                <span
                  className={[
                    "mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-black",
                    getStatusTone(selectedFact.factStatus),
                  ].join(" ")}
                >
                  {getStatusLabel(selectedFact.factStatus, copy)}
                </span>
              </div>

              <div className="rounded-[22px] border border-slate-200 p-4 md:col-span-2">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#747da0]">
                  {copy.semantic}
                </div>
                <strong className="mt-2 block break-words font-mono">
                  {selectedFact.semanticObjectKey ?? "—"}
                </strong>
              </div>

              <div className="rounded-[22px] border border-slate-200 p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#747da0]">
                  {copy.createdAt}
                </div>
                <strong className="mt-2 block">{formatDate(selectedFact.createdAt, locale)}</strong>
              </div>

              <div className="rounded-[22px] border border-slate-200 p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#747da0]">
                  {copy.source}
                </div>
                <strong className="mt-2 block">{selectedFact.sourceType ?? "—"}</strong>
              </div>

              <div className="rounded-[22px] border border-slate-200 p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#747da0]">
                  {copy.confidence}
                </div>
                <strong className="mt-2 block">
                  {typeof selectedFact.confidence === "number"
                    ? `${Math.round(selectedFact.confidence * 100)}%`
                    : "—"}
                </strong>
              </div>

              <div className="rounded-[22px] border border-slate-200 p-4 md:col-span-2">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#747da0]">
                  {copy.factActivity}
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-sm font-bold">
                  <span className="font-mono">F: {truncateMiddle(selectedFact.factId, 10, 8)}</span>
                  <span className="font-mono">A: {truncateMiddle(selectedFact.activityEventId, 10, 8)}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm font-bold text-slate-500">{copy.selectedHint}</p>
          )}
        </section>
      </div>
    </main>
  );
}

export default function ActivityFactsPage() {
  return (
    <Suspense fallback={null}>
      <ActivityFactsPageContent />
    </Suspense>
  );
}
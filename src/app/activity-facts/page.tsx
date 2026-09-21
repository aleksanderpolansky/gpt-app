"use client";

import Link from "next/link";
import { LayoutGrid, Table2 } from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  ArctorTabulator,
  type ArctorTableColumn,
} from "@/components/tables/arctor-tabulator";

import { ActivityFactTaggingPanel } from "./activity-fact-tagging-panel";

type Locale = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

const SNAPSHOT_CAPTURE_ACTION_LABELS: Record<Locale, string> = {
  en: "Add state snapshot",
  pl: "Dodaj przekrój stanu",
  ru: "Добавить факт-срез",
  uk: "Додати факт-зріз",
  de: "Zustandsschnitt hinzufügen",
  es: "Añadir corte de estado",
  cs: "Přidat snímek stavu",
};

const FACTS_PAGE_EYEBROW: Record<Locale, string> = {
  en: "FACTS",
  pl: "FAKTY",
  ru: "ФАКТЫ",
  uk: "ФАКТИ",
  de: "FAKTEN",
  es: "HECHOS",
  cs: "FAKTA",
};

type FactMetricValue = number | string | boolean | null;

type CanonicalAssignment = {
  contract: "ARCTOR_E03_SOURCE_FACT_MATERIALIZATION_V1";
  mode: "system_profile";
  rawSignalId: string;
  templateId: string;
  profileId: string;
  profileVersionNo: number | null;
  routingResolution: "unique_system_assignment_within_active_profile_v1";
  valueOriginCode: "user_explicit";
  sourceReliabilityCode: "user_reported";
  precisionEvidenceStoredInProvenance: boolean;
  approximate: boolean | null;
  rawFragment: string | null;
};

type FinalValueObjectLink = {
  valueObjectId: string;
  sourceCode: string | null;
  sourceTemplateProfileId: string | null;
  confidence: number | null;
  isMaterialized: boolean | null;
};

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
  factRoleCode: string | null;
  effectiveAt: string | null;
  validFrom: string | null;
  validTo: string | null;
  snapshotWindowCode: string | null;
  calculationRuleCode: string | null;
  calculationRuleVersion: string | null;
  previousSnapshotFactId: string | null;
  derivationInputs?: Array<{
    inputFactId: string;
    inputRoleCode: string;
    inputOrdinal: number | null;
  }>;
  sourceType: string | null;
  confidence: number | null;
  performedByActorId: string | null;
  actingAsActorId: string | null;
  actingForActorId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  activityTitle?: string | null;
  projectionFactIds?: string[];
  projectionCount?: number;
  valueObjects?: Array<{
    id: string;
    title: string;
    canonicalKey: string | null;
  }>;
  finalValueObjectLinks?: FinalValueObjectLink[];
  canonicalAssignment?: CanonicalAssignment | null;
};

type FactsViewMode = "cards" | "table";

type FactTableRow = {
  id: string;
  date: string;
  activity: string;
  valueObject: string;
  type: string;
  role: string;
  value: string;
  unit: string;
  status: string;
  source: string;
  confidence: string;
  fact: ActivityFact;
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
  cardsView: string;
  tableView: string;
  date: string;
  activity: string;
  filters: string;
  filtersSubtitle: string;
  advancedFilters: string;
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
  unlinkedValueObject: string;
  factStatusLabels: Record<string, string>;
};

const SUPPORTED_LOCALES: Locale[] = ["en", "pl", "ru", "uk", "de", "es", "cs"];

const FORMULA_RATIONALE_LINK_LABEL: Record<Locale, string> = {
  en: "How was this calculated?",
  pl: "Jak to obliczono?",
  ru: "Как рассчитано?",
  uk: "Як це розраховано?",
  de: "Wie wurde das berechnet?",
  es: "¿Cómo se calculó?",
  cs: "Jak to bylo vypočteno?",
};

type FactCollectionKey = "all" | "planned" | "completed" | "snapshot" | "other";

const FACT_COLLECTION_COPY: Record<Locale, Record<FactCollectionKey, { label: string; subtitle: string }>> = {
  en: {
    all: { label: "All values", subtitle: "All saved facts, including activity values and state snapshots." },
    planned: { label: "Planned values", subtitle: "Values from future and prognostic activities." },
    completed: { label: "Completed activities", subtitle: "Values extracted from completed activities." },
    snapshot: { label: "State snapshots", subtitle: "State values added separately from activities." },
    other: { label: "Other values", subtitle: "Values with a non-standard status or requiring a separate review." },
  },
  pl: {
    all: { label: "Wszystkie wartości", subtitle: "Wszystkie zapisane fakty, w tym wartości aktywności i przekroje stanu." },
    planned: { label: "Wartości planowane", subtitle: "Wartości z przyszłych i prognostycznych aktywności." },
    completed: { label: "Wykonane aktywności", subtitle: "Wartości wyodrębnione z wykonanych aktywności." },
    snapshot: { label: "Przekroje stanu", subtitle: "Wartości stanu dodane niezależnie od aktywności." },
    other: { label: "Pozostałe wartości", subtitle: "Wartości z niestandardowym statusem albo wymagające osobnego przeglądu." },
  },
  ru: {
    all: { label: "Все значения", subtitle: "Все сохранённые факты, включая значения активностей и факт-срезы состояния." },
    planned: { label: "Плановые значения", subtitle: "Значения из будущих и прогнозных активностей." },
    completed: { label: "Завершённые активности", subtitle: "Значения, извлечённые из завершённых активностей." },
    snapshot: { label: "Состояния", subtitle: "Факт-срезы состояния, добавленные отдельно от активности." },
    other: { label: "Прочие значения", subtitle: "Значения с нестандартным статусом или требующие отдельного просмотра." },
  },
  uk: {
    all: { label: "Усі значення", subtitle: "Усі збережені факти, включно зі значеннями активностей і фактами-зрізами стану." },
    planned: { label: "Планові значення", subtitle: "Значення з майбутніх і прогностичних активностей." },
    completed: { label: "Завершені активності", subtitle: "Значення, витягнуті із завершених активностей." },
    snapshot: { label: "Стани", subtitle: "Факти-зрізи стану, додані окремо від активності." },
    other: { label: "Інші значення", subtitle: "Значення з нестандартним статусом або ті, що потребують окремого перегляду." },
  },
  de: {
    all: { label: "Alle Werte", subtitle: "Alle gespeicherten Fakten, einschließlich Aktivitätswerten und Zustandsschnitten." },
    planned: { label: "Geplante Werte", subtitle: "Werte aus zukünftigen und prognostischen Aktivitäten." },
    completed: { label: "Abgeschlossene Aktivitäten", subtitle: "Werte, die aus abgeschlossenen Aktivitäten extrahiert wurden." },
    snapshot: { label: "Zustände", subtitle: "Zustandsschnitte, die unabhängig von Aktivitäten hinzugefügt wurden." },
    other: { label: "Sonstige Werte", subtitle: "Werte mit nicht standardisiertem Status oder besonderem Prüfbedarf." },
  },
  es: {
    all: { label: "Todos los valores", subtitle: "Todos los hechos guardados, incluidos valores de actividad y cortes de estado." },
    planned: { label: "Valores planificados", subtitle: "Valores procedentes de actividades futuras y pronósticas." },
    completed: { label: "Actividades completadas", subtitle: "Valores extraídos de actividades completadas." },
    snapshot: { label: "Estados", subtitle: "Cortes de estado añadidos por separado de las actividades." },
    other: { label: "Otros valores", subtitle: "Valores con estado no estándar o que requieren una revisión aparte." },
  },
  cs: {
    all: { label: "Všechny hodnoty", subtitle: "Všechny uložené fakty včetně hodnot aktivit a snímků stavu." },
    planned: { label: "Plánované hodnoty", subtitle: "Hodnoty z budoucích a prognostických aktivit." },
    completed: { label: "Dokončené aktivity", subtitle: "Hodnoty získané z dokončených aktivit." },
    snapshot: { label: "Stavy", subtitle: "Snímky stavu přidané samostatně mimo aktivity." },
    other: { label: "Ostatní hodnoty", subtitle: "Hodnoty s nestandardním stavem nebo vyžadující samostatnou kontrolu." },
  },
};

function normalizeCollection(value: string | null): FactCollectionKey {
  if (value === "planned") return "planned";
  if (value === "completed") return "completed";
  if (value === "snapshot") return "snapshot";
  if (value === "other") return "other";
  return "all";
}

const COPY: Record<Locale, ActivityFactsCopy> = {
  en: {
    pageTitle: "Activity facts",
    pageSubtitle: "Saved facts extracted from past and planned activity containers.",
    refresh: "Refresh",
    cardsView: "Cards",
    tableView: "Table",
    date: "Date",
    activity: "Activity",
    filters: "Filters",
    filtersSubtitle: "Filter by result count and status. Technical identifiers are available below.",
    advancedFilters: "Technical filters",
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
    semantic: "Linked value objects",
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
    unlinkedValueObject: "Not linked to an observation object",
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
    cardsView: "Karty",
    tableView: "Tabela",
    date: "Data",
    activity: "Aktywność",
    filters: "Filtry",
    filtersSubtitle: "Filtruj według liczby wyników i statusu. Identyfikatory techniczne są dostępne poniżej.",
    advancedFilters: "Filtry techniczne",
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
    semantic: "Powiązane obiekty wartości",
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
    unlinkedValueObject: "Niepowiązany z obiektem obserwacji",
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
    cardsView: "Карточки",
    tableView: "Таблица",
    date: "Дата",
    activity: "Активность",
    filters: "Фильтры",
    filtersSubtitle: "Фильтруйте по количеству результатов и статусу. Технические идентификаторы доступны ниже.",
    advancedFilters: "Технические фильтры",
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
    semantic: "Связанные ЦО",
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
    unlinkedValueObject: "Не привязан к объекту наблюдения",
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
    cardsView: "Картки",
    tableView: "Таблиця",
    date: "Дата",
    activity: "Активність",
    filters: "Фільтри",
    filtersSubtitle: "Фільтруйте за кількістю результатів і статусом. Технічні ідентифікатори доступні нижче.",
    advancedFilters: "Технічні фільтри",
    limit: "Ліміт",
    semanticKey: "Семантичний ключ",
    valueObjectId: "ID об’єкта спостереження",
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
    semantic: "Пов’язані ОН",
    measure: "Вимір",
    actions: "Дії",
    details: "Деталі",
    factActivity: "Факт / активність",
    valueObject: "Об’єкт спостереження",
    selectedFact: "Вибраний факт",
    selectedHint: "Вибери рядок, щоб побачити деталі факту.",
    type: "Тип",
    value: "Значення",
    unit: "Одиниця",
    createdAt: "Створено",
    source: "Джерело",
    confidence: "Впевненість",
    unlinkedValueObject: "Не прив’язаний до об’єкта спостереження",
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
    cardsView: "Karten",
    tableView: "Tabelle",
    date: "Datum",
    activity: "Aktivität",
    filters: "Filter",
    filtersSubtitle: "Nach Ergebnisanzahl und Status filtern. Technische Kennungen sind unten verfügbar.",
    advancedFilters: "Technische Filter",
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
    semantic: "Verknüpfte Wertobjekte",
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
    unlinkedValueObject: "Nicht mit einem Beobachtungsobjekt verknüpft",
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
    cardsView: "Tarjetas",
    tableView: "Tabla",
    date: "Fecha",
    activity: "Actividad",
    filters: "Filtros",
    filtersSubtitle: "Filtra por cantidad de resultados y estado. Los identificadores técnicos están disponibles abajo.",
    advancedFilters: "Filtros técnicos",
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
    semantic: "Objetos vinculados",
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
    unlinkedValueObject: "No vinculado a un objeto de observación",
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
    cardsView: "Karty",
    tableView: "Tabulka",
    date: "Datum",
    activity: "Aktivita",
    filters: "Filtry",
    filtersSubtitle: "Filtrujte podle počtu výsledků a stavu. Technické identifikátory jsou dostupné níže.",
    advancedFilters: "Technické filtry",
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
    semantic: "Propojené hodnotové objekty",
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
    unlinkedValueObject: "Není propojeno s objektem pozorování",
    factStatusLabels: {
      confirmed: "potvrzeno",
      proposed: "plánováno",
      pending_review: "ke kontrole",
      rejected: "odmítnuto",
      superseded: "nahrazeno",
    },
  },
};

type FactCardLabels = {
  role: string;
  effectiveAt: string;
  validity: string;
  snapshotWindow: string;
  calculationRule: string;
  previousSnapshot: string;
  calculationInputs: string;
  notApplicable: string;
  roleLabels: Record<string, string>;
  snapshotLabels: Record<string, string>;
};

const FACT_CARD_LABELS: Record<Locale, FactCardLabels> = {
  en: { role: "Fact role", effectiveAt: "Effective at", validity: "Valid period", snapshotWindow: "Snapshot", calculationRule: "Calculation rule", previousSnapshot: "Previous snapshot", calculationInputs: "Input facts", notApplicable: "Not applicable", roleLabels: { source: "Source fact", result: "Resulting fact", snapshot: "State snapshot" }, snapshotLabels: { point_in_time: "Point in time", daily: "Daily", weekly: "Weekly", event_driven: "Event-driven", custom: "Custom" } },
  pl: { role: "Rola faktu", effectiveAt: "Stan na moment", validity: "Okres ważności", snapshotWindow: "Przekrój stanu", calculationRule: "Reguła obliczenia", previousSnapshot: "Poprzedni przekrój", calculationInputs: "Fakty wejściowe", notApplicable: "Nie dotyczy", roleLabels: { source: "Fakt źródłowy", result: "Fakt wynikowy", snapshot: "Przekrój stanu" }, snapshotLabels: { point_in_time: "Punktowy", daily: "Dzienny", weekly: "Tygodniowy", event_driven: "Po zdarzeniu", custom: "Własny" } },
  ru: { role: "Роль факта", effectiveAt: "Состояние на момент", validity: "Период действия", snapshotWindow: "Срез состояния", calculationRule: "Правило расчёта", previousSnapshot: "Предыдущий срез", calculationInputs: "Входные факты", notApplicable: "Не применяется", roleLabels: { source: "Исходный факт", result: "Результирующий факт", snapshot: "Факт-срез состояния" }, snapshotLabels: { point_in_time: "На момент", daily: "Дневной", weekly: "Недельный", event_driven: "По событию", custom: "Произвольный" } },
  uk: { role: "Роль факту", effectiveAt: "Стан на момент", validity: "Період дії", snapshotWindow: "Зріз стану", calculationRule: "Правило розрахунку", previousSnapshot: "Попередній зріз", calculationInputs: "Вхідні факти", notApplicable: "Не застосовується", roleLabels: { source: "Вихідний факт", result: "Результуючий факт", snapshot: "Факт-зріз стану" }, snapshotLabels: { point_in_time: "На момент", daily: "Денний", weekly: "Тижневий", event_driven: "За подією", custom: "Довільний" } },
  de: { role: "Faktrolle", effectiveAt: "Gültiger Zeitpunkt", validity: "Gültigkeitszeitraum", snapshotWindow: "Zustandsschnitt", calculationRule: "Berechnungsregel", previousSnapshot: "Vorheriger Schnitt", calculationInputs: "Eingangsfakten", notApplicable: "Nicht anwendbar", roleLabels: { source: "Quellfakt", result: "Ergebnisfakt", snapshot: "Zustandsschnitt" }, snapshotLabels: { point_in_time: "Zeitpunkt", daily: "Täglich", weekly: "Wöchentlich", event_driven: "Ereignisbasiert", custom: "Benutzerdefiniert" } },
  es: { role: "Rol del hecho", effectiveAt: "Estado en el momento", validity: "Periodo de validez", snapshotWindow: "Corte de estado", calculationRule: "Regla de cálculo", previousSnapshot: "Corte anterior", calculationInputs: "Hechos de entrada", notApplicable: "No aplica", roleLabels: { source: "Hecho fuente", result: "Hecho resultante", snapshot: "Corte de estado" }, snapshotLabels: { point_in_time: "Puntual", daily: "Diario", weekly: "Semanal", event_driven: "Por evento", custom: "Personalizado" } },
  cs: { role: "Role faktu", effectiveAt: "Stav k okamžiku", validity: "Doba platnosti", snapshotWindow: "Snímek stavu", calculationRule: "Pravidlo výpočtu", previousSnapshot: "Předchozí snímek", calculationInputs: "Vstupní fakta", notApplicable: "Nepoužije se", roleLabels: { source: "Zdrojový fakt", result: "Výsledný fakt", snapshot: "Snímek stavu" }, snapshotLabels: { point_in_time: "K okamžiku", daily: "Denní", weekly: "Týdenní", event_driven: "Podle události", custom: "Vlastní" } },
};

function getFactRoleLabel(locale: Locale, role: string | null) {
  const normalized = role ?? "source";
  return FACT_CARD_LABELS[locale].roleLabels[normalized] ?? normalized;
}

function getSnapshotLabel(locale: Locale, value: string | null) {
  if (!value) return "—";
  return FACT_CARD_LABELS[locale].snapshotLabels[value] ?? value;
}

function formatValidity(
  locale: Locale,
  validFrom: string | null,
  validTo: string | null,
) {
  if (!validFrom && !validTo) return "—";
  return `${validFrom ? formatDate(validFrom, locale) : "…"} → ${
    validTo ? formatDate(validTo, locale) : "…"
  }`;
}

type FactDisplayCodeCopy = {
  measureTypes: Record<string, string>;
  units: Record<string, string>;
  sources: Record<string, string>;
};

const FACT_DISPLAY_CODES: Record<Locale, FactDisplayCodeCopy> = {
  en: {
    measureTypes: { duration: "Duration", count: "Count", context_tag: "Context" },
    units: { minute: "min", minutes: "min", hour: "h", hours: "h", second: "s", seconds: "s", count: "count", tag: "tag", percent: "%", meter: "m", kilometer: "km" },
    sources: { user_edit: "User edit", ai_extraction: "AI extraction", manual_form: "Manual", system_event: "System", activity_capture: "Activity capture", derived_calculation: "Calculated" },
  },
  pl: {
    measureTypes: { duration: "Czas trwania", count: "Liczba", context_tag: "Kontekst" },
    units: { minute: "min", minutes: "min", hour: "h", hours: "h", second: "s", seconds: "s", count: "liczba", tag: "tag", percent: "%", meter: "m", kilometer: "km" },
    sources: { user_edit: "Edycja użytkownika", ai_extraction: "Ekstrakcja AI", manual_form: "Ręcznie", system_event: "System", activity_capture: "Rejestr aktywności", derived_calculation: "Obliczenie" },
  },
  ru: {
    measureTypes: { duration: "Длительность", count: "Количество", context_tag: "Контекст" },
    units: { minute: "мин", minutes: "мин", hour: "ч", hours: "ч", second: "с", seconds: "с", count: "кол-во", tag: "метка", percent: "%", meter: "м", kilometer: "км" },
    sources: { user_edit: "Изменено пользователем", ai_extraction: "Извлечено AI", manual_form: "Вручную", system_event: "Система", activity_capture: "Фиксация активности", derived_calculation: "Расчёт" },
  },
  uk: {
    measureTypes: { duration: "Тривалість", count: "Кількість", context_tag: "Контекст" },
    units: { minute: "хв", minutes: "хв", hour: "год", hours: "год", second: "с", seconds: "с", count: "кільк.", tag: "мітка", percent: "%", meter: "м", kilometer: "км" },
    sources: { user_edit: "Змінено користувачем", ai_extraction: "Видобуто AI", manual_form: "Вручну", system_event: "Система", activity_capture: "Фіксація активності", derived_calculation: "Розрахунок" },
  },
  de: {
    measureTypes: { duration: "Dauer", count: "Anzahl", context_tag: "Kontext" },
    units: { minute: "min", minutes: "min", hour: "h", hours: "h", second: "s", seconds: "s", count: "Anz.", tag: "Tag", percent: "%", meter: "m", kilometer: "km" },
    sources: { user_edit: "Benutzeränderung", ai_extraction: "AI-Extraktion", manual_form: "Manuell", system_event: "System", activity_capture: "Aktivitätserfassung", derived_calculation: "Berechnet" },
  },
  es: {
    measureTypes: { duration: "Duración", count: "Cantidad", context_tag: "Contexto" },
    units: { minute: "min", minutes: "min", hour: "h", hours: "h", second: "s", seconds: "s", count: "cant.", tag: "etiqueta", percent: "%", meter: "m", kilometer: "km" },
    sources: { user_edit: "Edición del usuario", ai_extraction: "Extracción AI", manual_form: "Manual", system_event: "Sistema", activity_capture: "Registro de actividad", derived_calculation: "Calculado" },
  },
  cs: {
    measureTypes: { duration: "Doba trvání", count: "Počet", context_tag: "Kontext" },
    units: { minute: "min", minutes: "min", hour: "h", hours: "h", second: "s", seconds: "s", count: "počet", tag: "štítek", percent: "%", meter: "m", kilometer: "km" },
    sources: { user_edit: "Úprava uživatelem", ai_extraction: "Extrakce AI", manual_form: "Ručně", system_event: "Systém", activity_capture: "Záznam aktivity", derived_calculation: "Výpočet" },
  },
};

const CANONICAL_E03_SOURCE_LABEL: Record<Locale, string> = {
  en: "User reported · system extracted",
  pl: "Podane przez użytkownika · wyodrębnione przez system",
  ru: "Сообщено пользователем · извлечено системой",
  uk: "Повідомлено користувачем · видобуто системою",
  de: "Vom Benutzer angegeben · vom System extrahiert",
  es: "Informado por el usuario · extraído por el sistema",
  cs: "Uvedeno uživatelem · extrahováno systémem",
};

function factSourceLabel(fact: ActivityFact, locale: Locale) {
  if (fact.canonicalAssignment?.mode === "system_profile") {
    return CANONICAL_E03_SOURCE_LABEL[locale];
  }

  return localizeFactCode(locale, "sources", fact.sourceType);
}

function localizeFactCode(
  locale: Locale,
  kind: keyof FactDisplayCodeCopy,
  value: string | null,
) {
  if (!value) {
    return "—";
  }

  return FACT_DISPLAY_CODES[locale][kind][value] ?? value;
}

function formatFactValueObjectLabel(fact: ActivityFact, copy: ActivityFactsCopy) {
  const linkedTitles = (fact.valueObjects ?? [])
    .map((valueObject) => valueObject.title.trim())
    .filter(Boolean);

  if (linkedTitles.length > 0) {
    return linkedTitles.join("; ");
  }

  if (fact.semanticObjectKey) {
    return `${fact.semanticObjectKey} · ${copy.unlinkedValueObject}`;
  }

  return `— · ${copy.unlinkedValueObject}`;
}

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
  locale: Locale;
}) {
  const search = new URLSearchParams();

  search.set("limit", params.limit || "50");
  search.set("locale", params.locale);

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
  if (status === "rejected") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-[rgba(0,0,0,0.08)] bg-[#f5f6fb] text-[#5a5f7a]";
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
}: {
  readonly label: string;
  readonly value: number;
}) {
  return (
    <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4 shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7c8099]">
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold text-[#1a1d2e]">{value}</div>
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
        "grid gap-4 rounded-xl border p-3.5 transition sm:grid-cols-[1.2fr_1fr_0.8fr_0.75fr_auto]",
        selected ? "border-[#3b6ef8]/25 bg-[#eef2ff]" : "border-[rgba(0,0,0,0.08)] bg-white hover:bg-[#f5f6fb]",
      ].join(" ")}
    >
      <div className="min-w-0">
        <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7c8099]">
          {copy.factActivity}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
          <span className="font-mono text-[#2d3047]" title={fact.factId ?? undefined}>
            F: {truncateMiddle(fact.factId, 6, 6)}
          </span>
          {fact.activityEventId ? (
            <Link
              href={`/activity-today?locale=${locale}&activityEventId=${encodeURIComponent(
                fact.activityEventId
              )}`}
              className="text-[#3b6ef8] no-underline hover:underline"
              title={fact.activityEventId}
            >
              {fact.activityTitle ?? `A: ${truncateMiddle(fact.activityEventId, 6, 6)}`}
            </Link>
          ) : (
            <span className="font-mono text-[#9ca3b8]">A: —</span>
          )}
        </div>
        <div className="mt-2 text-xs font-semibold text-[#7c8099]">
          {formatDate(fact.createdAt, locale)}
        </div>
      </div>

      <div className="min-w-0">
        <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7c8099]">
          {copy.semantic}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {(fact.valueObjects ?? []).length > 0 ? (
            (fact.valueObjects ?? []).map((valueObject) => (
              <Link
                key={valueObject.id}
                href={`/value-objects/${encodeURIComponent(valueObject.id)}?locale=${locale}`}
                className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#f5f6fb] px-2.5 py-1 text-xs font-semibold text-[#4a4f6a] no-underline transition hover:text-[#3b6ef8]"
                title={valueObject.canonicalKey ?? valueObject.id}
              >
                {valueObject.title}
              </Link>
            ))
          ) : (
            <span
              className="font-mono text-sm font-black text-[#7c8099]"
              title={copy.unlinkedValueObject}
            >
              {fact.semanticObjectKey ?? "—"}
              <span className="ml-2 font-sans text-[11px] font-bold text-[#7c8099]">
                · {copy.unlinkedValueObject}
              </span>
            </span>
          )}
        </div>
        {typeof fact.projectionCount === "number" && fact.projectionCount > 1 ? (
          <div className="mt-2 text-xs font-semibold text-[#7c8099]">
            {fact.projectionCount} projections share measure {truncateMiddle(fact.measureId, 6, 6)}
          </div>
        ) : null}
      </div>

      <div>
        <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7c8099]">
          {copy.measure}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex min-w-12 items-center justify-center text-lg font-bold text-[#1a1d2e]">
            {formatMetricValue(fact.metricValue)}
          </span>
          <span className="text-sm font-black text-[#1a1d2e]">{fact.unit ?? "—"}</span>
        </div>
        <div className="mt-2 text-xs font-bold text-[#7c8099]">{fact.measureType ?? "—"}</div>
      </div>

      <div>
        <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7c8099]">
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
        <div className="mt-2 text-xs font-black text-[#5a5f7a]">
          {getFactRoleLabel(locale, fact.factRoleCode)}
        </div>
        <div className="mt-1 text-xs font-semibold text-[#7c8099]">{fact.sourceType ?? "—"}</div>
      </div>

      <div className="flex items-center sm:justify-end">
        <button
          type="button"
          onClick={onSelect}
          className="min-h-9 rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 text-sm font-medium text-[#1a1d2e] shadow-sm transition hover:border-[#3b6ef8]/30 hover:text-[#3b6ef8]"
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
    <section className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-[#1a1d2e]">{title}</h2>
          <p className="mt-1 text-sm font-medium text-[#7c8099]">{subtitle}</p>
        </div>
        <span className="rounded-full bg-[#f5f6fb] px-3 py-1 text-sm font-black text-[#5a5f7a]">
          {facts.length}
        </span>
      </div>

      {facts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[rgba(0,0,0,0.10)] bg-[#f5f6fb] p-5 text-center text-sm font-bold text-[#7c8099]">
          {copy.noFactsInGroup}
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="hidden grid-cols-[1.2fr_1fr_0.8fr_0.75fr_auto] gap-4 px-4 text-[10px] font-black uppercase tracking-[0.16em] text-[#7c8099] sm:grid">
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

  const collectionCopy = FACT_COLLECTION_COPY[locale];
  const activeCollection =
    searchParams.get("collection") !== null
      ? normalizeCollection(searchParams.get("collection"))
      : searchParams.get("factRoleCode") === "snapshot"
        ? "snapshot"
        : searchParams.get("factStatus") === "proposed"
          ? "planned"
          : "all";

  const [limit, setLimit] = useState(searchParams.get("limit") ?? "50");
  const [semanticObjectKey, setSemanticObjectKey] = useState(searchParams.get("semanticObjectKey") ?? "");
  const [valueObjectId, setValueObjectId] = useState(searchParams.get("valueObjectId") ?? "");
  const [activityEventId, setActivityEventId] = useState(searchParams.get("activityEventId") ?? "");
  const [factStatus, setFactStatus] = useState(searchParams.get("factStatus") ?? "");
  const [selectedFactId, setSelectedFactId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<FactsViewMode>("cards");
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
      locale,
    });
  }, [limit, semanticObjectKey, valueObjectId, activityEventId, factStatus, locale]);

  const facts = useMemo<ActivityFact[]>(
    () => state.response?.facts ?? [],
    [state.response],
  );
  const groupedFacts = useMemo(() => groupFacts(facts), [facts]);
  const factCollections = useMemo<Record<FactCollectionKey, ActivityFact[]>>(
    () => ({
      all: facts,
      planned: groupedFacts.proposed,
      completed: groupedFacts.confirmed.filter((fact) => fact.factRoleCode !== "snapshot"),
      snapshot: facts.filter((fact) => fact.factRoleCode === "snapshot"),
      other: groupedFacts.other.filter((fact) => fact.factRoleCode !== "snapshot"),
    }),
    [facts, groupedFacts],
  );
  const visibleFacts = factCollections[activeCollection];
  const selectedFact =
    visibleFacts.find((fact) => fact.factId === selectedFactId) ?? visibleFacts[0] ?? null;

  const factTableRows = useMemo<FactTableRow[]>(
    () =>
      visibleFacts.map((fact, index) => ({
        id: fact.factId ?? `${fact.activityEventId ?? "fact"}-${index}`,
        date: formatDate(fact.createdAt, locale),
        activity:
          fact.activityTitle ??
          (fact.activityEventId
            ? `A: ${truncateMiddle(fact.activityEventId, 8, 6)}`
            : "—"),
        valueObject: formatFactValueObjectLabel(fact, copy),
        type: localizeFactCode(locale, "measureTypes", fact.measureType),
        role: getFactRoleLabel(locale, fact.factRoleCode),
        value: formatMetricValue(fact.metricValue),
        unit: localizeFactCode(locale, "units", fact.unit),
        status: getStatusLabel(fact.factStatus, copy),
        source: factSourceLabel(fact, locale),
        confidence:
          typeof fact.confidence === "number"
            ? `${Math.round(fact.confidence * 100)}%`
            : "—",
        fact,
      })),
    [copy, locale, visibleFacts],
  );

  const factTableColumns = useMemo<ArctorTableColumn<FactTableRow>[]>(
    () => [
      {
        title: copy.date,
        field: "date",
        width: 136,
        minWidth: 124,
        widthShrink: 1,
        responsive: 3,
        frozen: true,
        tooltip: true,
        cssClass: "arctor-table-muted",
      },
      {
        title: copy.activity,
        field: "activity",
        minWidth: 210,
        widthGrow: 3,
        widthShrink: 3,
        responsive: 0,
        tooltip: true,
        cssClass: "arctor-table-title",
      },
      {
        title: copy.valueObject,
        field: "valueObject",
        minWidth: 220,
        widthGrow: 4,
        widthShrink: 3,
        responsive: 0,
        tooltip: true,
      },
      {
        title: copy.type,
        field: "type",
        minWidth: 112,
        widthGrow: 1,
        widthShrink: 2,
        responsive: 4,
        tooltip: true,
      },
      {
        title: FACT_CARD_LABELS[locale].role,
        field: "role",
        minWidth: 132,
        widthGrow: 1,
        widthShrink: 2,
        responsive: 4,
        tooltip: true,
      },
      {
        title: copy.value,
        field: "value",
        width: 86,
        minWidth: 76,
        responsive: 0,
        tooltip: true,
        hozAlign: "right",
        headerHozAlign: "right",
        cssClass: "arctor-table-number",
      },
      {
        title: copy.unit,
        field: "unit",
        width: 82,
        minWidth: 72,
        responsive: 1,
        tooltip: true,
      },
      {
        title: copy.status,
        field: "status",
        minWidth: 104,
        widthShrink: 1,
        responsive: 1,
        tooltip: true,
      },
      {
        title: copy.source,
        field: "source",
        minWidth: 112,
        widthShrink: 2,
        responsive: 6,
        tooltip: true,
      },
      {
        title: copy.confidence,
        field: "confidence",
        width: 98,
        minWidth: 90,
        responsive: 5,
        tooltip: true,
        hozAlign: "right",
        headerHozAlign: "right",
        cssClass: "arctor-table-number",
      },
    ],
    [copy, locale],
  );

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
    const timer = window.setTimeout(() => {
      void loadFacts();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadFacts]);

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-[#f0f2f7] px-3 py-4 text-[#1a1d2e] sm:px-5 lg:px-6">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4">
        <section className="py-1">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#7c8099]">
                {FACTS_PAGE_EYEBROW[locale]}
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-[-0.02em] text-[#1a1d2e]">
                {copy.pageTitle}
              </h1>
              <p className="mt-1 text-sm font-medium leading-6 text-[#7c8099]">
                {copy.pageSubtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/activity-facts/snapshot?locale=${locale}`}
                className="inline-flex min-h-10 items-center rounded-lg border border-[#3b6ef8]/30 bg-white px-4 text-sm font-medium text-[#3b6ef8] transition hover:bg-[#eef2ff]"
              >
                {SNAPSHOT_CAPTURE_ACTION_LABELS[locale]}
              </Link>

              <button
                type="button"
                onClick={loadFacts}
                className="min-h-10 rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-4 text-sm font-medium text-[#5a5f7a] transition hover:bg-[#f5f6fb]"
              >
                {copy.refresh}
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard label={copy.summaryAll} value={facts.length} />
          <SummaryCard
            label={collectionCopy.completed.label}
            value={factCollections.completed.length}
          />
          <SummaryCard
            label={copy.summaryProposed}
            value={groupedFacts.proposed.length}
          />
          <SummaryCard
            label={collectionCopy.snapshot.label}
            value={factCollections.snapshot.length}
          />
          <SummaryCard label={copy.summaryOther} value={factCollections.other.length} />
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {(["all", "planned", "completed", "snapshot", "other"] as FactCollectionKey[]).map((collection) => {
              const isActive = activeCollection === collection;
              return (
                <Link
                  key={collection}
                  href={`/activity-facts?locale=${encodeURIComponent(locale)}&collection=${collection}`}
                  className={[
                    "inline-flex min-h-9 items-center rounded-lg border px-3 text-sm font-black no-underline transition",
                    isActive
                      ? "border-[#3b6ef8] bg-[#3b6ef8] text-white shadow-sm"
                      : "border-[rgba(0,0,0,0.08)] bg-white text-[#5a5f7a] hover:bg-[#f5f6fb]",
                  ].join(" ")}
                >
                  {collectionCopy[collection].label}
                  <span
                    className={[
                      "ml-2 inline-flex min-w-6 justify-center rounded-full px-2 py-0.5 text-xs font-black",
                      isActive ? "bg-white/20 text-white" : "bg-[#f5f6fb] text-[#7c8099]",
                    ].join(" ")}
                  >
                    {factCollections[collection].length}
                  </span>
                </Link>
              );
            })}
          </div>

          <p className="text-sm font-medium leading-6 text-[#7c8099]">
            {collectionCopy[activeCollection].subtitle}
          </p>
        </section>

        <div className="flex justify-end">
          <div className="inline-flex rounded-lg border border-[rgba(0,0,0,0.08)] bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={[
                "inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-xs font-black transition",
                viewMode === "cards"
                  ? "bg-white text-[#3b6ef8] shadow-sm"
                  : "text-[#7c8099] hover:text-[#1a1d2e]",
              ].join(" ")}
            >
              <LayoutGrid size={15} />
              {copy.cardsView}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={[
                "inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-xs font-black transition",
                viewMode === "table"
                  ? "bg-white text-[#3b6ef8] shadow-sm"
                  : "text-[#7c8099] hover:text-[#1a1d2e]",
              ].join(" ")}
            >
              <Table2 size={15} />
              {copy.tableView}
            </button>
          </div>
        </div>

        <section className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-[#1a1d2e]">{copy.filters}</h2>
              <p className="mt-1 text-sm font-medium text-[#7c8099]">{copy.filtersSubtitle}</p>
            </div>

            <span
              className={[
                "rounded-full border px-3 py-2 text-xs font-black",
                state.status === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : state.status === "loading"
                    ? "border-[#3b6ef8]/20 bg-[#eef2ff] text-[#3b6ef8]"
                    : "border-[rgba(0,0,0,0.08)] bg-[#f5f6fb] text-[#5a5f7a]",
              ].join(" ")}
            >
              {state.message}
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7c8099]">
                {copy.limit}
              </span>
              <select
                value={limit}
                onChange={(event) => setLimit(event.target.value)}
                className="min-h-11 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-3 text-sm font-bold outline-none transition focus:border-[#3b6ef8]"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7c8099]">
                {copy.status}
              </span>
              <select
                value={factStatus}
                onChange={(event) => setFactStatus(event.target.value)}
                className="min-h-11 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-3 text-sm font-bold outline-none transition focus:border-[#3b6ef8]"
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

          <details className="mt-4 rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#f5f6fb] px-4 py-3">
            <summary className="cursor-pointer text-sm font-black text-[#5a5f7a]">
              {copy.advancedFilters}
            </summary>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <label className="grid gap-2">
                <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7c8099]">
                  {copy.semanticKey}
                </span>
                <input
                  value={semanticObjectKey}
                  onChange={(event) => setSemanticObjectKey(event.target.value)}
                  placeholder="walk"
                  className="min-h-11 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-3 text-sm font-bold outline-none transition focus:border-[#3b6ef8]"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7c8099]">
                  {copy.valueObjectId}
                </span>
                <input
                  value={valueObjectId}
                  onChange={(event) => setValueObjectId(event.target.value)}
                  placeholder="uuid"
                  className="min-h-11 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-3 text-sm font-bold outline-none transition focus:border-[#3b6ef8]"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7c8099]">
                  {copy.activityId}
                </span>
                <input
                  value={activityEventId}
                  onChange={(event) => setActivityEventId(event.target.value)}
                  placeholder="uuid"
                  className="min-h-11 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-3 text-sm font-bold outline-none transition focus:border-[#3b6ef8]"
                />
              </label>
            </div>
          </details>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadFacts}
              className="min-h-10 rounded-lg bg-[#3b6ef8] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[#2c5df0]"
            >
              {copy.apply}
            </button>

            <button
              type="button"
              onClick={resetFilters}
              className="min-h-10 rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-4 text-sm font-medium text-[#5a5f7a] transition hover:bg-[#f5f6fb]"
            >
              {copy.reset}
            </button>
          </div>
        </section>

        {viewMode === "table" ? (
          <section className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-3 shadow-sm">
            <ArctorTabulator<FactTableRow>
              data={factTableRows}
              columns={factTableColumns}
              rowKey="id"
              emptyLabel={copy.empty}
              height="min(68vh, 760px)"
              onRowClick={(row) => setSelectedFactId(row.fact.factId)}
            />
          </section>
        ) : (
          <FactGroup
            title={collectionCopy[activeCollection].label}
            subtitle={collectionCopy[activeCollection].subtitle}
            facts={visibleFacts}
            locale={locale}
            copy={copy}
            selectedFact={selectedFact}
            onSelect={setSelectedFactId}
          />
        )}

        <section className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7c8099]">
            {copy.details}
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#1a1d2e]">{copy.selectedFact}</h2>

          {selectedFact ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7c8099]">
                  {FACT_CARD_LABELS[locale].role}
                </div>
                <strong className="mt-2 block text-[#1a1d2e]">
                  {getFactRoleLabel(locale, selectedFact.factRoleCode)}
                </strong>
              </div>

              <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7c8099]">
                  {copy.type}
                </div>
                <strong className="mt-2 block">{selectedFact.measureType ?? "—"}</strong>
              </div>

              <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7c8099]">
                  {copy.value}
                </div>
                <strong className="mt-2 block">{formatMetricValue(selectedFact.metricValue)}</strong>
              </div>

              <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7c8099]">
                  {copy.unit}
                </div>
                <strong className="mt-2 block">{selectedFact.unit ?? "—"}</strong>
              </div>

              <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7c8099]">
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

              <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4 md:col-span-2">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7c8099]">
                  {copy.semantic}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(selectedFact.valueObjects ?? []).length > 0 ? (
                    (selectedFact.valueObjects ?? []).map((valueObject) => (
                      <Link
                        key={valueObject.id}
                        href={`/value-objects/${encodeURIComponent(valueObject.id)}?locale=${locale}`}
                        className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#f5f6fb] px-2.5 py-1 text-xs font-semibold text-[#4a4f6a] no-underline transition hover:text-[#3b6ef8]"
                      >
                        {valueObject.title}
                      </Link>
                    ))
                  ) : (
                    <strong className="break-words font-mono">
                      {selectedFact.semanticObjectKey ?? "—"}
                    </strong>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7c8099]">
                  {copy.createdAt}
                </div>
                <strong className="mt-2 block">{formatDate(selectedFact.createdAt, locale)}</strong>
              </div>

              <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7c8099]">
                  {copy.source}
                </div>
                <strong className="mt-2 block">{factSourceLabel(selectedFact, locale)}</strong>
              </div>

              <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7c8099]">
                  {copy.confidence}
                </div>
                <strong className="mt-2 block">
                  {typeof selectedFact.confidence === "number"
                    ? `${Math.round(selectedFact.confidence * 100)}%`
                    : "—"}
                </strong>
              </div>

              <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4 md:col-span-2">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7c8099]">
                  {copy.factActivity}
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-sm font-bold">
                  <span className="font-mono">F: {truncateMiddle(selectedFact.factId, 10, 8)}</span>
                  {selectedFact.activityEventId ? (
                    <Link
                      href={`/activity-today?locale=${locale}&activityEventId=${encodeURIComponent(selectedFact.activityEventId)}`}
                      className="font-bold text-[#3b6ef8] no-underline hover:underline"
                    >
                      {selectedFact.activityTitle ?? `A: ${truncateMiddle(selectedFact.activityEventId, 10, 8)}`}
                    </Link>
                  ) : (
                    <span className="font-mono">A: —</span>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7c8099]">
                  {FACT_CARD_LABELS[locale].effectiveAt}
                </div>
                <strong className="mt-2 block">
                  {formatDate(selectedFact.effectiveAt ?? selectedFact.createdAt, locale)}
                </strong>
              </div>

              <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7c8099]">
                  {FACT_CARD_LABELS[locale].validity}
                </div>
                <strong className="mt-2 block">
                  {formatValidity(locale, selectedFact.validFrom, selectedFact.validTo)}
                </strong>
              </div>

              <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7c8099]">
                  {FACT_CARD_LABELS[locale].snapshotWindow}
                </div>
                <strong className="mt-2 block">
                  {selectedFact.factRoleCode === "snapshot"
                    ? getSnapshotLabel(locale, selectedFact.snapshotWindowCode)
                    : FACT_CARD_LABELS[locale].notApplicable}
                </strong>
              </div>

              <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7c8099]">
                  {FACT_CARD_LABELS[locale].previousSnapshot}
                </div>
                <strong className="mt-2 block font-mono">
                  {selectedFact.previousSnapshotFactId
                    ? `F: ${truncateMiddle(selectedFact.previousSnapshotFactId, 10, 8)}`
                    : "—"}
                </strong>
              </div>

              <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4 md:col-span-2">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7c8099]">
                  {FACT_CARD_LABELS[locale].calculationRule}
                </div>
                <strong className="mt-2 block break-words font-mono">
                  {selectedFact.calculationRuleCode
                    ? `${selectedFact.calculationRuleCode} · ${selectedFact.calculationRuleVersion ?? "—"}`
                    : "—"}
                </strong>

                {selectedFact.calculationRuleCode &&
                selectedFact.calculationRuleVersion ? (
                  <Link
                    href={`/formula-rationale?ruleCode=${encodeURIComponent(selectedFact.calculationRuleCode)}&version=${encodeURIComponent(selectedFact.calculationRuleVersion)}&locale=${encodeURIComponent(locale)}`}
                    className="mt-3 inline-flex rounded-lg border border-[#3b6ef8]/30 bg-white px-3 py-2 text-xs font-medium text-[#3b6ef8] no-underline transition hover:bg-[#eef2ff]"
                  >
                    {FORMULA_RATIONALE_LINK_LABEL[locale]}
                  </Link>
                ) : null}
              </div>

              <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4 md:col-span-2">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7c8099]">
                  {FACT_CARD_LABELS[locale].calculationInputs}
                </div>
                {(selectedFact.derivationInputs ?? []).length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(selectedFact.derivationInputs ?? []).map((input) => (
                      <span
                        key={`${input.inputFactId}-${input.inputRoleCode}`}
                        className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#f5f6fb] px-2.5 py-1 font-mono text-xs font-medium text-[#5a5f7a]"
                        title={input.inputFactId}
                      >
                        {input.inputRoleCode}: F:{truncateMiddle(input.inputFactId, 7, 6)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <strong className="mt-2 block">—</strong>
                )}
              </div>

              <ActivityFactTaggingPanel
                fact={selectedFact}
                locale={locale}
                onSaved={loadFacts}
              />
            </div>
          ) : (
            <p className="mt-4 text-sm font-bold text-[#7c8099]">{copy.selectedHint}</p>
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
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Check,
  Hash,
  LineChart as LineChartIcon,
  MapPinned,
  PieChart as PieChartIcon,
  Plus,
  Target,
  Trash2,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { LocaleCode } from "@/i18n";
import type {
  DashboardAnalyticsBlock,
  DashboardAnalyticsVisualizationType,
} from "@/lib/dashboard/analytics-contract";
import {
  DashboardCertificateMap,
  type CertificateMapMarker,
} from "@/components/figma-dashboard/dashboard-certificate-map";
import {
  dashboardMeasurementUnitFamily,
} from "@/lib/dashboard/measurement-unit-normalization";

type AnalyticsUi = {
  analytics: string;
  add: string;
  emptyTitle: string;
  emptyBody: string;
  loadError: string;
  retry: string;
  chooseView: string;
  chooseData: string;
  configure: string;
  line: string;
  lineDescription: string;
  bar: string;
  barDescription: string;
  metric: string;
  metricDescription: string;
  donut: string;
  radar: string;
  heatmap: string;
  scatter: string;
  progress: string;
  later: string;
  activities: string;
  activitiesDescription: string;
  totalDuration: string;
  totalDurationDescription: string;
  grouping: string;
  byDay: string;
  period: string;
  sevenDays: string;
  fourteenDays: string;
  thirtyDays: string;
  back: string;
  next: string;
  create: string;
  cancel: string;
  remove: string;
  journal: string;
  loading: string;
  noData: string;
  totalDurationByDay: string;
  recordedActivities: string;
  hourShort: string;
  minuteShort: string;
  wizardStep: string;
  live: string;
};

const UI: Record<LocaleCode, AnalyticsUi> = {
  ru: {
    analytics: "Аналитика",
    add: "Добавить аналитический блок",
    emptyTitle: "На дашборде пока нет аналитических блоков",
    emptyBody: "Добавьте график и выберите реальные данные ARCTor, которые хотите видеть.",
    loadError: "Не удалось загрузить аналитику.",
    retry: "Повторить",
    chooseView: "Что вы хотите увидеть?",
    chooseData: "Какие данные показать?",
    configure: "Как сгруппировать данные?",
    line: "Изменение во времени",
    lineDescription: "Линия для динамики показателя по дням.",
    bar: "Сравнение по периодам",
    barDescription: "Столбцы для точного сравнения дневных значений.",
    metric: "Одно число с тенденцией",
    metricDescription: "Итоговое значение и компактная динамика.",
    donut: "Распределение",
    radar: "Профиль параметров",
    heatmap: "Тепловая карта",
    scatter: "Связь двух показателей",
    progress: "Прогресс",
    later: "Следующая версия",
    activities: "Активности",
    activitiesDescription: "Фактические активности текущего профиля.",
    totalDuration: "Общая продолжительность",
    totalDurationDescription: "Сумма записанной длительности фактических активностей.",
    grouping: "Группировка",
    byDay: "По дням",
    period: "Период",
    sevenDays: "7 дней",
    fourteenDays: "14 дней",
    thirtyDays: "30 дней",
    back: "Назад",
    next: "Далее",
    create: "Добавить на дашборд",
    cancel: "Отмена",
    remove: "Удалить",
    journal: "Журнал активностей",
    loading: "Загрузка данных…",
    noData: "За выбранный период нет записанной длительности.",
    totalDurationByDay: "Общая продолжительность активностей по дням",
    recordedActivities: "Записанная длительность",
    hourShort: "ч",
    minuteShort: "мин",
    wizardStep: "Шаг {current} из 3",
    live: "Работает сейчас",
  },
  pl: {
    analytics: "Analityka",
    add: "Dodaj blok analityczny",
    emptyTitle: "Na pulpicie nie ma jeszcze bloków analitycznych",
    emptyBody: "Dodaj wykres i wybierz rzeczywiste dane ARCTor, które chcesz widzieć.",
    loadError: "Nie udało się załadować analityki.",
    retry: "Ponów",
    chooseView: "Co chcesz zobaczyć?",
    chooseData: "Jakie dane pokazać?",
    configure: "Jak pogrupować dane?",
    line: "Zmiana w czasie",
    lineDescription: "Linia pokazująca zmianę wskaźnika dzień po dniu.",
    bar: "Porównanie okresów",
    barDescription: "Kolumny do dokładnego porównania wartości dziennych.",
    metric: "Jedna liczba z trendem",
    metricDescription: "Wartość łączna i kompaktowy trend.",
    donut: "Rozkład",
    radar: "Profil parametrów",
    heatmap: "Mapa cieplna",
    scatter: "Zależność dwóch wskaźników",
    progress: "Postęp",
    later: "Następna wersja",
    activities: "Aktywności",
    activitiesDescription: "Rzeczywiste aktywności bieżącego profilu.",
    totalDuration: "Łączny czas trwania",
    totalDurationDescription: "Suma zapisanej długości rzeczywistych aktywności.",
    grouping: "Grupowanie",
    byDay: "Według dni",
    period: "Okres",
    sevenDays: "7 dni",
    fourteenDays: "14 dni",
    thirtyDays: "30 dni",
    back: "Wstecz",
    next: "Dalej",
    create: "Dodaj do pulpitu",
    cancel: "Anuluj",
    remove: "Usuń",
    journal: "Dziennik aktywności",
    loading: "Ładowanie danych…",
    noData: "Brak zapisanej długości w wybranym okresie.",
    totalDurationByDay: "Łączny czas aktywności według dni",
    recordedActivities: "Zapisany czas",
    hourShort: "h",
    minuteShort: "min",
    wizardStep: "Krok {current} z 3",
    live: "Działa teraz",
  },
  en: {
    analytics: "Analytics",
    add: "Add analytics block",
    emptyTitle: "No analytics blocks on your dashboard yet",
    emptyBody: "Add a chart and choose the real ARCTor data you want to see.",
    loadError: "Could not load analytics.",
    retry: "Retry",
    chooseView: "What do you want to see?",
    chooseData: "Which data should be shown?",
    configure: "How should the data be grouped?",
    line: "Change over time",
    lineDescription: "A line showing the metric day by day.",
    bar: "Compare periods",
    barDescription: "Columns for precise comparison of daily values.",
    metric: "One number with trend",
    metricDescription: "A total value with a compact trend.",
    donut: "Distribution",
    radar: "Parameter profile",
    heatmap: "Heat map",
    scatter: "Relationship between two metrics",
    progress: "Progress",
    later: "Next version",
    activities: "Activities",
    activitiesDescription: "Actual activities of the current profile.",
    totalDuration: "Total duration",
    totalDurationDescription: "Sum of recorded duration of actual activities.",
    grouping: "Grouping",
    byDay: "By day",
    period: "Period",
    sevenDays: "7 days",
    fourteenDays: "14 days",
    thirtyDays: "30 days",
    back: "Back",
    next: "Next",
    create: "Add to dashboard",
    cancel: "Cancel",
    remove: "Remove",
    journal: "Activity journal",
    loading: "Loading data…",
    noData: "No recorded duration in the selected period.",
    totalDurationByDay: "Total activity duration by day",
    recordedActivities: "Recorded duration",
    hourShort: "h",
    minuteShort: "min",
    wizardStep: "Step {current} of 3",
    live: "Available now",
  },
  uk: {
    analytics: "Аналітика",
    add: "Додати аналітичний блок",
    emptyTitle: "На панелі поки немає аналітичних блоків",
    emptyBody: "Додайте графік і виберіть реальні дані ARCTor, які хочете бачити.",
    loadError: "Не вдалося завантажити аналітику.",
    retry: "Повторити",
    chooseView: "Що ви хочете побачити?",
    chooseData: "Які дані показати?",
    configure: "Як згрупувати дані?",
    line: "Зміна в часі",
    lineDescription: "Лінія для динаміки показника за днями.",
    bar: "Порівняння періодів",
    barDescription: "Стовпці для точного порівняння денних значень.",
    metric: "Одне число з тенденцією",
    metricDescription: "Підсумкове значення і компактна динаміка.",
    donut: "Розподіл",
    radar: "Профіль параметрів",
    heatmap: "Теплова карта",
    scatter: "Зв’язок двох показників",
    progress: "Прогрес",
    later: "Наступна версія",
    activities: "Активності",
    activitiesDescription: "Фактичні активності поточного профілю.",
    totalDuration: "Загальна тривалість",
    totalDurationDescription: "Сума записаної тривалості фактичних активностей.",
    grouping: "Групування",
    byDay: "За днями",
    period: "Період",
    sevenDays: "7 днів",
    fourteenDays: "14 днів",
    thirtyDays: "30 днів",
    back: "Назад",
    next: "Далі",
    create: "Додати на панель",
    cancel: "Скасувати",
    remove: "Видалити",
    journal: "Журнал активностей",
    loading: "Завантаження даних…",
    noData: "За вибраний період немає записаної тривалості.",
    totalDurationByDay: "Загальна тривалість активностей за днями",
    recordedActivities: "Записана тривалість",
    hourShort: "год",
    minuteShort: "хв",
    wizardStep: "Крок {current} з 3",
    live: "Працює зараз",
  },
  de: {
    analytics: "Analytik",
    add: "Analyseblock hinzufügen",
    emptyTitle: "Noch keine Analyseblöcke auf dem Dashboard",
    emptyBody: "Fügen Sie ein Diagramm hinzu und wählen Sie reale ARCTor-Daten.",
    loadError: "Analytik konnte nicht geladen werden.",
    retry: "Erneut versuchen",
    chooseView: "Was möchten Sie sehen?",
    chooseData: "Welche Daten sollen angezeigt werden?",
    configure: "Wie sollen die Daten gruppiert werden?",
    line: "Veränderung im Zeitverlauf",
    lineDescription: "Eine Linie zeigt den Wert Tag für Tag.",
    bar: "Zeiträume vergleichen",
    barDescription: "Säulen zum genauen Vergleich täglicher Werte.",
    metric: "Eine Zahl mit Trend",
    metricDescription: "Gesamtwert mit kompakter Entwicklung.",
    donut: "Verteilung",
    radar: "Parameterprofil",
    heatmap: "Heatmap",
    scatter: "Zusammenhang zweier Werte",
    progress: "Fortschritt",
    later: "Nächste Version",
    activities: "Aktivitäten",
    activitiesDescription: "Tatsächliche Aktivitäten des aktuellen Profils.",
    totalDuration: "Gesamtdauer",
    totalDurationDescription: "Summe der erfassten Dauer tatsächlicher Aktivitäten.",
    grouping: "Gruppierung",
    byDay: "Nach Tagen",
    period: "Zeitraum",
    sevenDays: "7 Tage",
    fourteenDays: "14 Tage",
    thirtyDays: "30 Tage",
    back: "Zurück",
    next: "Weiter",
    create: "Zum Dashboard hinzufügen",
    cancel: "Abbrechen",
    remove: "Entfernen",
    journal: "Aktivitätsjournal",
    loading: "Daten werden geladen…",
    noData: "Im gewählten Zeitraum gibt es keine erfasste Dauer.",
    totalDurationByDay: "Gesamtdauer der Aktivitäten nach Tagen",
    recordedActivities: "Erfasste Dauer",
    hourShort: "Std.",
    minuteShort: "Min.",
    wizardStep: "Schritt {current} von 3",
    live: "Jetzt verfügbar",
  },
  es: {
    analytics: "Analítica",
    add: "Añadir bloque analítico",
    emptyTitle: "Aún no hay bloques analíticos en el panel",
    emptyBody: "Añade un gráfico y elige los datos reales de ARCTor que quieras ver.",
    loadError: "No se pudo cargar la analítica.",
    retry: "Reintentar",
    chooseView: "¿Qué quieres ver?",
    chooseData: "¿Qué datos deben mostrarse?",
    configure: "¿Cómo agrupar los datos?",
    line: "Cambio en el tiempo",
    lineDescription: "Una línea muestra el indicador día a día.",
    bar: "Comparar períodos",
    barDescription: "Columnas para comparar valores diarios con precisión.",
    metric: "Un número con tendencia",
    metricDescription: "Valor total con una tendencia compacta.",
    donut: "Distribución",
    radar: "Perfil de parámetros",
    heatmap: "Mapa de calor",
    scatter: "Relación entre dos indicadores",
    progress: "Progreso",
    later: "Próxima versión",
    activities: "Actividades",
    activitiesDescription: "Actividades reales del perfil actual.",
    totalDuration: "Duración total",
    totalDurationDescription: "Suma de la duración registrada de actividades reales.",
    grouping: "Agrupación",
    byDay: "Por día",
    period: "Período",
    sevenDays: "7 días",
    fourteenDays: "14 días",
    thirtyDays: "30 días",
    back: "Atrás",
    next: "Siguiente",
    create: "Añadir al panel",
    cancel: "Cancelar",
    remove: "Eliminar",
    journal: "Diario de actividades",
    loading: "Cargando datos…",
    noData: "No hay duración registrada en el período seleccionado.",
    totalDurationByDay: "Duración total de actividades por día",
    recordedActivities: "Duración registrada",
    hourShort: "h",
    minuteShort: "min",
    wizardStep: "Paso {current} de 3",
    live: "Disponible ahora",
  },
  cs: {
    analytics: "Analytika",
    add: "Přidat analytický blok",
    emptyTitle: "Na panelu zatím nejsou analytické bloky",
    emptyBody: "Přidejte graf a vyberte reálná data ARCTor, která chcete vidět.",
    loadError: "Analytiku se nepodařilo načíst.",
    retry: "Opakovat",
    chooseView: "Co chcete vidět?",
    chooseData: "Jaká data se mají zobrazit?",
    configure: "Jak mají být data seskupena?",
    line: "Změna v čase",
    lineDescription: "Čára zobrazuje hodnotu den po dni.",
    bar: "Porovnání období",
    barDescription: "Sloupce pro přesné porovnání denních hodnot.",
    metric: "Jedno číslo s trendem",
    metricDescription: "Celková hodnota s kompaktním trendem.",
    donut: "Rozdělení",
    radar: "Profil parametrů",
    heatmap: "Teplotní mapa",
    scatter: "Vztah dvou ukazatelů",
    progress: "Pokrok",
    later: "Další verze",
    activities: "Aktivity",
    activitiesDescription: "Skutečné aktivity aktuálního profilu.",
    totalDuration: "Celková délka",
    totalDurationDescription: "Součet zaznamenané délky skutečných aktivit.",
    grouping: "Seskupení",
    byDay: "Podle dnů",
    period: "Období",
    sevenDays: "7 dní",
    fourteenDays: "14 dní",
    thirtyDays: "30 dní",
    back: "Zpět",
    next: "Další",
    create: "Přidat na panel",
    cancel: "Zrušit",
    remove: "Odstranit",
    journal: "Deník aktivit",
    loading: "Načítání dat…",
    noData: "Ve zvoleném období není zaznamenaná délka.",
    totalDurationByDay: "Celková délka aktivit podle dnů",
    recordedActivities: "Zaznamenaná délka",
    hourShort: "h",
    minuteShort: "min",
    wizardStep: "Krok {current} ze 3",
    live: "Funguje nyní",
  },
};

type BlocksResponse = {
  readonly ok?: boolean;
  readonly blocks?: DashboardAnalyticsBlock[];
  readonly error?: string;
};

type DataPoint = {
  readonly date: string;
  readonly valueMinutes?: number;
  readonly valueHours?: number;
  readonly activityCount?: number;
  readonly valueNumber?: number | null;
  readonly observationCount?: number;
};

type RootDurationRow = {
  readonly rootValueObjectId: string;
  readonly rootTitle: string;
  readonly valueMinutes: number;
  readonly valueHours: number;
  readonly percentage: number;
  readonly activityCount: number;
  readonly factProjectionCount: number;
};

type BlockDataResponse = {
  readonly ok?: boolean;
  readonly kind?:
    | "activity-duration"
    | "activity-count"
    | "certificate-map"
    | "fact-duration-by-root"
    | "observation-fact-series"
    | "observation-fact-multi-series";
  readonly totalMinutes?: number;
  readonly totalValue?: number;
  readonly unit?: string;
  readonly valueObjectTitle?: string;
  readonly parameterTitle?: string;
  readonly resolvedObservationCount?: number;
  readonly unknownObservationCount?: number;
  readonly rollupApplied?: boolean;
  readonly totalSemanticMinutes?: number;
  readonly uniqueActivityMinutes?: number;
  readonly overlapDetected?: boolean;
  readonly activityCount?: number;
  readonly series?: DataPoint[];
  readonly factSeries?: MultiFactSeries[];
  readonly scaleMode?: "independent";
  readonly layoutMode?: "unit_bands";
  readonly rootBreakdown?: RootDurationRow[];
  readonly availableCertificateCount?: number;
  readonly markers?: CertificateMapMarker[];
  readonly error?: string;
};

type ObservationObjectOption = {
  readonly id: string;
  readonly title: string;
  readonly pathText: string;
  readonly status: string;
  readonly canonicalKey: string | null;
  readonly scopeCode: string | null;
};

type ObservationParameterOption = {
  readonly id: string;
  readonly parameterCode: string;
  readonly title: string;
  readonly canonicalUnitCode: string;
  readonly aggregationMethodCode: string | null;
  readonly defaultWindowCode: string | null;
  readonly assignmentId: string | null;
};

type ObservationSelectorResponse = {
  readonly ok?: boolean;
  readonly valueObjects?: ObservationObjectOption[];
  readonly error?: string;
};

type ObservationOptionsResponse = {
  readonly ok?: boolean;
  readonly valueObject?: {
    readonly id: string;
    readonly title: string;
  };
  readonly parameters?: ObservationParameterOption[];
  readonly error?: string;
};

type FactSeriesDraft = {
  readonly id: string;
  readonly kind: "numeric" | "presence";
  readonly valueObjectId: string;
  readonly valueObjectTitle: string;
  readonly parameterDefinitionId: string | null;
  readonly parameterCode: string | null;
  readonly parameterTitle: string | null;
  readonly canonicalUnitCode: string | null;
};

type MultiFactSeries = {
  readonly id: string;
  readonly kind: "numeric" | "presence";
  readonly valueObjectId: string;
  readonly valueObjectTitle: string;
  readonly parameterDefinitionId: string | null;
  readonly parameterCode: string | null;
  readonly parameterTitle: string | null;
  readonly unit: string;
  readonly unitFamily?: string;
  readonly resolvedObservationCount: number;
  readonly unknownObservationCount: number;
  readonly rollupApplied: boolean;
  readonly points: DataPoint[];
};

const NUMBER_LOCALE_MAP: Record<LocaleCode, string> = {
  ru: "ru-RU",
  pl: "pl-PL",
  en: "en-US",
  es: "es-ES",
  uk: "uk-UA",
  de: "de-DE",
  cs: "cs-CZ",
};

const MAP_BUILDER_COPY: Record<
  LocaleCode,
  {
    title: string;
    description: string;
    certificates: string;
    certificatesDescription: string;
    adaptiveScope: string;
    adaptiveScopeDescription: string;
    openCatalog: string;
  }
> = {
  ru: {
    title: "Карта сертификатов",
    description: "Доступные подарочные сертификаты на карте с автоматическим выбором масштаба.",
    certificates: "Подарочные сертификаты",
    certificatesDescription: "Только публичные доступные сертификаты с публичной географией предоставляющего.",
    adaptiveScope: "Рядом → город → мир",
    adaptiveScopeDescription: "Если рядом есть сертификаты, карта показывает ближайшую область; затем город; если рядом ничего нет — все доступные точки мира.",
    openCatalog: "Все сертификаты",
  },
  pl: {
    title: "Mapa certyfikatów",
    description: "Dostępne certyfikaty prezentowe na mapie z automatycznym doborem skali.",
    certificates: "Certyfikaty prezentowe",
    certificatesDescription: "Tylko publiczne, dostępne certyfikaty z publiczną lokalizacją dostawcy.",
    adaptiveScope: "W pobliżu → miasto → świat",
    adaptiveScopeDescription: "Mapa pokazuje najpierw najbliższą okolicę, potem miasto, a gdy nic nie ma blisko — wszystkie dostępne punkty na świecie.",
    openCatalog: "Wszystkie certyfikaty",
  },
  en: {
    title: "Certificate map",
    description: "Available gift certificates on a map with adaptive geographic scope.",
    certificates: "Gift certificates",
    certificatesDescription: "Only public available certificates with a public provider location.",
    adaptiveScope: "Nearby → city → world",
    adaptiveScopeDescription: "The map shows the nearest area first, then the city; if nothing is nearby, it shows all available world locations.",
    openCatalog: "All certificates",
  },
  uk: {
    title: "Карта сертифікатів",
    description: "Доступні подарункові сертифікати на карті з автоматичним вибором масштабу.",
    certificates: "Подарункові сертифікати",
    certificatesDescription: "Лише публічні доступні сертифікати з публічною географією надавача.",
    adaptiveScope: "Поруч → місто → світ",
    adaptiveScopeDescription: "Карта спочатку показує найближчу область, потім місто; якщо поруч нічого немає — усі доступні точки світу.",
    openCatalog: "Усі сертифікати",
  },
  de: {
    title: "Zertifikatskarte",
    description: "Verfügbare Geschenkgutscheine auf einer Karte mit automatischem geografischem Ausschnitt.",
    certificates: "Geschenkgutscheine",
    certificatesDescription: "Nur öffentliche verfügbare Gutscheine mit öffentlichem Anbieterstandort.",
    adaptiveScope: "Nähe → Stadt → Welt",
    adaptiveScopeDescription: "Die Karte zeigt zuerst die nähere Umgebung, dann die Stadt; wenn nichts in der Nähe liegt, alle verfügbaren Punkte weltweit.",
    openCatalog: "Alle Zertifikate",
  },
  es: {
    title: "Mapa de certificados",
    description: "Certificados regalo disponibles en un mapa con alcance geográfico adaptativo.",
    certificates: "Certificados regalo",
    certificatesDescription: "Solo certificados públicos disponibles con ubicación pública del proveedor.",
    adaptiveScope: "Cerca → ciudad → mundo",
    adaptiveScopeDescription: "El mapa muestra primero la zona cercana, después la ciudad y, si no hay nada cerca, todos los puntos disponibles del mundo.",
    openCatalog: "Todos los certificados",
  },
  cs: {
    title: "Mapa certifikátů",
    description: "Dostupné dárkové certifikáty na mapě s automatickou volbou měřítka.",
    certificates: "Dárkové certifikáty",
    certificatesDescription: "Pouze veřejné dostupné certifikáty s veřejnou polohou poskytovatele.",
    adaptiveScope: "Okolí → město → svět",
    adaptiveScopeDescription: "Mapa nejprve zobrazí nejbližší oblast, potom město; pokud nic není poblíž, zobrazí všechny dostupné body na světě.",
    openCatalog: "Všechny certifikáty",
  },
};

const ACTIVITY_COUNT_COPY: Record<
  LocaleCode,
  {
    metric: string;
    description: string;
    title: string;
    recorded: string;
    noData: string;
  }
> = {
  ru: {
    metric: "Количество активностей",
    description: "Количество фактических активностей текущего профиля.",
    title: "Количество фактических активностей по дням",
    recorded: "Фактические активности",
    noData: "За выбранный период фактических активностей нет.",
  },
  pl: {
    metric: "Liczba aktywności",
    description: "Liczba rzeczywistych aktywności bieżącego profilu.",
    title: "Liczba rzeczywistych aktywności według dni",
    recorded: "Rzeczywiste aktywności",
    noData: "Brak rzeczywistych aktywności w wybranym okresie.",
  },
  en: {
    metric: "Activity count",
    description: "Number of actual activities of the current profile.",
    title: "Actual activity count by day",
    recorded: "Actual activities",
    noData: "No actual activities in the selected period.",
  },
  uk: {
    metric: "Кількість активностей",
    description: "Кількість фактичних активностей поточного профілю.",
    title: "Кількість фактичних активностей за днями",
    recorded: "Фактичні активності",
    noData: "За вибраний період фактичних активностей немає.",
  },
  de: {
    metric: "Anzahl der Aktivitäten",
    description: "Anzahl der tatsächlichen Aktivitäten des aktuellen Profils.",
    title: "Tatsächliche Aktivitäten nach Tagen",
    recorded: "Tatsächliche Aktivitäten",
    noData: "Im gewählten Zeitraum gibt es keine tatsächlichen Aktivitäten.",
  },
  es: {
    metric: "Número de actividades",
    description: "Número de actividades reales del perfil actual.",
    title: "Número de actividades reales por día",
    recorded: "Actividades reales",
    noData: "No hay actividades reales en el período seleccionado.",
  },
  cs: {
    metric: "Počet aktivit",
    description: "Počet skutečných aktivit aktuálního profilu.",
    title: "Počet skutečných aktivit podle dnů",
    recorded: "Skutečné aktivity",
    noData: "Ve zvoleném období nejsou žádné skutečné aktivity.",
  },
};

const ROOT_TIME_COPY: Record<
  LocaleCode,
  {
    description: string;
    facts: string;
    factsDescription: string;
    duration: string;
    durationDescription: string;
    byRoot: string;
    title: string;
    noData: string;
    overlapNote: string;
    factsJournal: string;
  }
> = {
  ru: {
    description: "Круговая диаграмма показывает, к каким корневым объектам относится подтверждённое время из фактов.",
    facts: "Факты",
    factsDescription: "Подтверждённые факты продолжительности текущего профиля.",
    duration: "Время",
    durationDescription: "Продолжительность сворачивается от листового объекта к его корневому объекту.",
    byRoot: "По корневым объектам",
    title: "Распределение времени по корневым объектам",
    noData: "За выбранный период нет подтверждённых фактов продолжительности, связанных с корневыми объектами.",
    overlapNote: "Одна активность может относиться к нескольким корневым объектам. Внутри одного корня она учитывается один раз, но между разными корнями смысловое время может пересекаться.",
    factsJournal: "Журнал фактов",
  },
  pl: {
    description: "Wykres pierścieniowy pokazuje, do których obiektów głównych należy potwierdzony czas z faktów.",
    facts: "Fakty",
    factsDescription: "Potwierdzone fakty czasu trwania bieżącego profilu.",
    duration: "Czas",
    durationDescription: "Czas trwania jest zwijany od obiektu liściowego do jego obiektu głównego.",
    byRoot: "Według obiektów głównych",
    title: "Rozkład czasu według obiektów głównych",
    noData: "W wybranym okresie nie ma potwierdzonych faktów czasu powiązanych z obiektami głównymi.",
    overlapNote: "Jedna aktywność może należeć do kilku obiektów głównych. W obrębie jednego obiektu jest liczona raz, ale między różnymi obiektami czas semantyczny może się nakładać.",
    factsJournal: "Dziennik faktów",
  },
  en: {
    description: "A donut chart shows which root objects receive confirmed duration from facts.",
    facts: "Facts",
    factsDescription: "Confirmed duration facts of the current profile.",
    duration: "Time",
    durationDescription: "Duration is rolled up from each leaf object to its root object.",
    byRoot: "By root object",
    title: "Time distribution by root object",
    noData: "No confirmed duration facts linked to root objects in the selected period.",
    overlapNote: "One activity may belong to several root objects. It is counted once inside each root, while semantic time may overlap across different roots.",
    factsJournal: "Fact journal",
  },
  uk: {
    description: "Кільцева діаграма показує, до яких кореневих об’єктів належить підтверджений час із фактів.",
    facts: "Факти",
    factsDescription: "Підтверджені факти тривалості поточного профілю.",
    duration: "Час",
    durationDescription: "Тривалість згортається від листового об’єкта до його кореневого об’єкта.",
    byRoot: "За кореневими об’єктами",
    title: "Розподіл часу за кореневими об’єктами",
    noData: "За вибраний період немає підтверджених фактів тривалості, пов’язаних із кореневими об’єктами.",
    overlapNote: "Одна активність може належати до кількох кореневих об’єктів. Усередині одного кореня вона рахується один раз, але між різними коренями смисловий час може перетинатися.",
    factsJournal: "Журнал фактів",
  },
  de: {
    description: "Ein Ringdiagramm zeigt, welchen Wurzelobjekten bestätigte Zeitfakten zugeordnet sind.",
    facts: "Fakten",
    factsDescription: "Bestätigte Dauerfakten des aktuellen Profils.",
    duration: "Zeit",
    durationDescription: "Die Dauer wird vom Blattobjekt zu seinem Wurzelobjekt aggregiert.",
    byRoot: "Nach Wurzelobjekt",
    title: "Zeitverteilung nach Wurzelobjekten",
    noData: "Im gewählten Zeitraum gibt es keine bestätigten Dauerfakten mit Wurzelobjekt.",
    overlapNote: "Eine Aktivität kann mehreren Wurzelobjekten angehören. Innerhalb eines Wurzelobjekts wird sie einmal gezählt; zwischen verschiedenen Wurzelobjekten kann sich die semantische Zeit überschneiden.",
    factsJournal: "Faktenjournal",
  },
  es: {
    description: "Un gráfico de dona muestra a qué objetos raíz corresponde el tiempo confirmado de los hechos.",
    facts: "Hechos",
    factsDescription: "Hechos confirmados de duración del perfil actual.",
    duration: "Tiempo",
    durationDescription: "La duración se agrega desde el objeto hoja hasta su objeto raíz.",
    byRoot: "Por objeto raíz",
    title: "Distribución del tiempo por objetos raíz",
    noData: "No hay hechos confirmados de duración vinculados a objetos raíz en el período seleccionado.",
    overlapNote: "Una actividad puede pertenecer a varios objetos raíz. Dentro de un mismo objeto se cuenta una vez, pero el tiempo semántico puede solaparse entre objetos distintos.",
    factsJournal: "Diario de hechos",
  },
  cs: {
    description: "Prstencový graf ukazuje, ke kterým kořenovým objektům patří potvrzený čas z faktů.",
    facts: "Fakta",
    factsDescription: "Potvrzená fakta o délce aktuálního profilu.",
    duration: "Čas",
    durationDescription: "Délka se agreguje od listového objektu k jeho kořenovému objektu.",
    byRoot: "Podle kořenového objektu",
    title: "Rozdělení času podle kořenových objektů",
    noData: "Ve zvoleném období nejsou potvrzená fakta o délce spojená s kořenovými objekty.",
    overlapNote: "Jedna aktivita může patřit k několika kořenovým objektům. Uvnitř jednoho kořene se započítá jednou, ale mezi různými kořeny se může sémantický čas překrývat.",
    factsJournal: "Deník faktů",
  },
};

const FACT_SERIES_COPY: Record<
  LocaleCode,
  {
    source: string;
    sourceDescription: string;
    searchLabel: string;
    searchPlaceholder: string;
    searchHint: string;
    searching: string;
    noObjects: string;
    parameterLabel: string;
    loadingParameters: string;
    noParameters: string;
    selectParameter: string;
    noData: string;
    factsJournal: string;
    summary: string;
  }
> = {
  ru: {
    source: "Факты по объектам наблюдения",
    sourceDescription: "Числовые значения подтверждённых фактов выбранного объекта наблюдения.",
    searchLabel: "Объект наблюдения",
    searchPlaceholder: "Начните вводить название…",
    searchHint: "Введите не менее 2 символов. Сохраняется ID объекта, а не текст названия.",
    searching: "Поиск…",
    noObjects: "Подходящих листовых объектов не найдено.",
    parameterLabel: "Параметр",
    loadingParameters: "Загрузка параметров…",
    noParameters: "У выбранного объекта нет активных числовых параметров.",
    selectParameter: "Выберите числовой параметр.",
    noData: "За выбранный период нет подтверждённых числовых фактов.",
    factsJournal: "Журнал фактов",
    summary: "Подтверждённые факты",
  },
  pl: {
    source: "Fakty według obiektów obserwacji",
    sourceDescription: "Wartości liczbowe potwierdzonych faktów wybranego obiektu obserwacji.",
    searchLabel: "Obiekt obserwacji",
    searchPlaceholder: "Zacznij wpisywać nazwę…",
    searchHint: "Wpisz co najmniej 2 znaki. Zapisywany jest identyfikator obiektu, nie tekst nazwy.",
    searching: "Wyszukiwanie…",
    noObjects: "Nie znaleziono pasujących obiektów liściowych.",
    parameterLabel: "Parametr",
    loadingParameters: "Ładowanie parametrów…",
    noParameters: "Wybrany obiekt nie ma aktywnych parametrów liczbowych.",
    selectParameter: "Wybierz parametr liczbowy.",
    noData: "Brak potwierdzonych faktów liczbowych w wybranym okresie.",
    factsJournal: "Dziennik faktów",
    summary: "Potwierdzone fakty",
  },
  en: {
    source: "Facts by observation object",
    sourceDescription: "Numeric values of confirmed facts for the selected observation object.",
    searchLabel: "Observation object",
    searchPlaceholder: "Start typing a name…",
    searchHint: "Enter at least 2 characters. The object ID is saved, not the display text.",
    searching: "Searching…",
    noObjects: "No matching leaf observation objects found.",
    parameterLabel: "Parameter",
    loadingParameters: "Loading parameters…",
    noParameters: "The selected object has no active numeric parameters.",
    selectParameter: "Select a numeric parameter.",
    noData: "No confirmed numeric facts in the selected period.",
    factsJournal: "Fact journal",
    summary: "Confirmed facts",
  },
  uk: {
    source: "Факти за об’єктами спостереження",
    sourceDescription: "Числові значення підтверджених фактів вибраного об’єкта спостереження.",
    searchLabel: "Об’єкт спостереження",
    searchPlaceholder: "Почніть вводити назву…",
    searchHint: "Введіть щонайменше 2 символи. Зберігається ID об’єкта, а не текст назви.",
    searching: "Пошук…",
    noObjects: "Відповідних листових об’єктів не знайдено.",
    parameterLabel: "Параметр",
    loadingParameters: "Завантаження параметрів…",
    noParameters: "Вибраний об’єкт не має активних числових параметрів.",
    selectParameter: "Виберіть числовий параметр.",
    noData: "За вибраний період немає підтверджених числових фактів.",
    factsJournal: "Журнал фактів",
    summary: "Підтверджені факти",
  },
  de: {
    source: "Fakten nach Beobachtungsobjekt",
    sourceDescription: "Numerische Werte bestätigter Fakten für das ausgewählte Beobachtungsobjekt.",
    searchLabel: "Beobachtungsobjekt",
    searchPlaceholder: "Namen eingeben…",
    searchHint: "Mindestens 2 Zeichen eingeben. Gespeichert wird die Objekt-ID, nicht der Anzeigetext.",
    searching: "Suche…",
    noObjects: "Keine passenden Blatt-Beobachtungsobjekte gefunden.",
    parameterLabel: "Parameter",
    loadingParameters: "Parameter werden geladen…",
    noParameters: "Das ausgewählte Objekt hat keine aktiven numerischen Parameter.",
    selectParameter: "Numerischen Parameter auswählen.",
    noData: "Keine bestätigten numerischen Fakten im gewählten Zeitraum.",
    factsJournal: "Faktenjournal",
    summary: "Bestätigte Fakten",
  },
  es: {
    source: "Hechos por objeto de observación",
    sourceDescription: "Valores numéricos de hechos confirmados del objeto de observación seleccionado.",
    searchLabel: "Objeto de observación",
    searchPlaceholder: "Empieza a escribir un nombre…",
    searchHint: "Introduce al menos 2 caracteres. Se guarda el ID del objeto, no el texto mostrado.",
    searching: "Buscando…",
    noObjects: "No se encontraron objetos hoja coincidentes.",
    parameterLabel: "Parámetro",
    loadingParameters: "Cargando parámetros…",
    noParameters: "El objeto seleccionado no tiene parámetros numéricos activos.",
    selectParameter: "Selecciona un parámetro numérico.",
    noData: "No hay hechos numéricos confirmados en el período seleccionado.",
    factsJournal: "Diario de hechos",
    summary: "Hechos confirmados",
  },
  cs: {
    source: "Fakta podle objektu pozorování",
    sourceDescription: "Číselné hodnoty potvrzených faktů vybraného objektu pozorování.",
    searchLabel: "Objekt pozorování",
    searchPlaceholder: "Začněte psát název…",
    searchHint: "Zadejte alespoň 2 znaky. Ukládá se ID objektu, ne zobrazený text.",
    searching: "Hledání…",
    noObjects: "Nebyly nalezeny odpovídající listové objekty.",
    parameterLabel: "Parametr",
    loadingParameters: "Načítání parametrů…",
    noParameters: "Vybraný objekt nemá aktivní číselné parametry.",
    selectParameter: "Vyberte číselný parametr.",
    noData: "Ve zvoleném období nejsou potvrzená číselná fakta.",
    factsJournal: "Deník faktů",
    summary: "Potvrzená fakta",
  },
};

const MULTI_SERIES_COPY: Record<
  LocaleCode,
  {
    title: string;
    selectedSeries: string;
    addNumericSeries: string;
    addPresenceSeries: string;
    presence: string;
    presenceDescription: string;
    removeSeries: string;
    maxSeries: string;
    independentScale: string;
    independentScaleDescription: string;
    needTwoSeries: string;
    noMultiData: string;
    present: string;
  }
> = {
  ru: {
    title: "Сравнение показателей",
    selectedSeries: "Выбранные ряды",
    addNumericSeries: "Добавить числовой ряд",
    addPresenceSeries: "Добавить факт наличия",
    presence: "Факт наличия",
    presenceDescription: "Точка появляется в день, когда по объекту есть подтверждённый факт. Отсутствие факта остаётся неизвестностью, а не нулём.",
    removeSeries: "Удалить ряд",
    maxSeries: "Можно добавить до 6 рядов.",
    independentScale: "Группы по единицам",
    independentScaleDescription: "Совместимые единицы показаны в одной зоне со своей шкалой Y. Для всех зон используется общая ось X времени.",
    needTwoSeries: "Для совместного графика добавьте минимум два ряда.",
    noMultiData: "За выбранный период нет подтверждённых данных для выбранных рядов.",
    present: "есть факт",
  },
  pl: {
    title: "Porównanie wskaźników",
    selectedSeries: "Wybrane serie",
    addNumericSeries: "Dodaj serię liczbową",
    addPresenceSeries: "Dodaj obecność faktu",
    presence: "Obecność faktu",
    presenceDescription: "Punkt pojawia się w dniu, w którym istnieje potwierdzony fakt dla obiektu. Brak faktu pozostaje niewiadomą, a nie zerem.",
    removeSeries: "Usuń serię",
    maxSeries: "Można dodać do 6 serii.",
    independentScale: "Niezależne skale",
    independentScaleDescription: "Każda seria zachowuje własne jednostki i jest skalowana osobno. Rzeczywiste wartości są widoczne w podpowiedzi.",
    needTwoSeries: "Aby utworzyć wspólny wykres, dodaj co najmniej dwie serie.",
    noMultiData: "Brak potwierdzonych danych dla wybranych serii w tym okresie.",
    present: "jest fakt",
  },
  en: {
    title: "Indicator comparison",
    selectedSeries: "Selected series",
    addNumericSeries: "Add numeric series",
    addPresenceSeries: "Add fact presence",
    presence: "Fact presence",
    presenceDescription: "A point appears on a day when a confirmed fact exists for the object. Missing facts stay unknown rather than becoming zero.",
    removeSeries: "Remove series",
    maxSeries: "You can add up to 6 series.",
    independentScale: "Unit groups",
    independentScaleDescription: "Compatible units share one Y band and one visible Y scale. All bands use one common time X axis.",
    needTwoSeries: "Add at least two series for a combined chart.",
    noMultiData: "No confirmed data for the selected series in this period.",
    present: "fact present",
  },
  uk: {
    title: "Порівняння показників",
    selectedSeries: "Вибрані ряди",
    addNumericSeries: "Додати числовий ряд",
    addPresenceSeries: "Додати факт наявності",
    presence: "Факт наявності",
    presenceDescription: "Точка з’являється в день, коли для об’єкта є підтверджений факт. Відсутність факту залишається невідомістю, а не нулем.",
    removeSeries: "Видалити ряд",
    maxSeries: "Можна додати до 6 рядів.",
    independentScale: "Незалежні шкали",
    independentScaleDescription: "Кожен ряд зберігає свої реальні одиниці та масштабується окремо. Реальні значення видно у підказці.",
    needTwoSeries: "Для спільного графіка додайте щонайменше два ряди.",
    noMultiData: "За вибраний період немає підтверджених даних для вибраних рядів.",
    present: "є факт",
  },
  de: {
    title: "Kennzahlenvergleich",
    selectedSeries: "Ausgewählte Reihen",
    addNumericSeries: "Numerische Reihe hinzufügen",
    addPresenceSeries: "Fakt-Vorhandensein hinzufügen",
    presence: "Fakt vorhanden",
    presenceDescription: "Ein Punkt erscheint an einem Tag, an dem ein bestätigter Fakt für das Objekt vorliegt. Fehlende Fakten bleiben unbekannt und werden nicht zu null.",
    removeSeries: "Reihe entfernen",
    maxSeries: "Bis zu 6 Reihen können hinzugefügt werden.",
    independentScale: "Unabhängige Skalen",
    independentScaleDescription: "Jede Reihe behält ihre reale Einheit und wird separat skaliert. Reale Werte stehen im Tooltip.",
    needTwoSeries: "Für ein gemeinsames Diagramm mindestens zwei Reihen hinzufügen.",
    noMultiData: "Keine bestätigten Daten für die ausgewählten Reihen im Zeitraum.",
    present: "Fakt vorhanden",
  },
  es: {
    title: "Comparación de indicadores",
    selectedSeries: "Series seleccionadas",
    addNumericSeries: "Añadir serie numérica",
    addPresenceSeries: "Añadir presencia del hecho",
    presence: "Presencia del hecho",
    presenceDescription: "Aparece un punto el día en que existe un hecho confirmado para el objeto. La ausencia de un hecho permanece desconocida y no se convierte en cero.",
    removeSeries: "Eliminar serie",
    maxSeries: "Se pueden añadir hasta 6 series.",
    independentScale: "Escalas independientes",
    independentScaleDescription: "Cada serie conserva su unidad real y se escala por separado. Los valores reales aparecen en la información emergente.",
    needTwoSeries: "Añade al menos dos series para un gráfico combinado.",
    noMultiData: "No hay datos confirmados para las series seleccionadas en este período.",
    present: "hay hecho",
  },
  cs: {
    title: "Porovnání ukazatelů",
    selectedSeries: "Vybrané řady",
    addNumericSeries: "Přidat číselnou řadu",
    addPresenceSeries: "Přidat přítomnost faktu",
    presence: "Přítomnost faktu",
    presenceDescription: "Bod se zobrazí v den, kdy pro objekt existuje potvrzený fakt. Chybějící fakt zůstává neznámý a nemění se na nulu.",
    removeSeries: "Odstranit řadu",
    maxSeries: "Lze přidat až 6 řad.",
    independentScale: "Nezávislé škály",
    independentScaleDescription: "Každá řada si ponechává skutečnou jednotku a škáluje se samostatně. Skutečné hodnoty jsou v nápovědě.",
    needTwoSeries: "Pro společný graf přidejte alespoň dvě řady.",
    noMultiData: "Ve zvoleném období nejsou potvrzená data pro vybrané řady.",
    present: "fakt existuje",
  },
};

const MULTI_SERIES_COLORS = [
  "#3b6ef8",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
];

const DONUT_COLORS = [
  "#3b6ef8",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#6366f1",
  "#14b8a6",
] as const;

const AVAILABLE_VISUALIZATIONS: readonly {
  readonly type: DashboardAnalyticsVisualizationType;
  readonly enabled: boolean;
}[] = [
  { type: "line", enabled: true },
  { type: "bar", enabled: true },
  { type: "metric", enabled: true },
  { type: "map", enabled: true },
  { type: "donut", enabled: true },
  { type: "radar", enabled: false },
  { type: "heatmap", enabled: false },
  { type: "scatter", enabled: false },
  { type: "progress", enabled: false },
];

function formatTemplate(value: string, params: Record<string, string | number>) {
  return Object.entries(params).reduce(
    (result, [key, parameter]) =>
      result.replace(`{${key}}`, String(parameter)),
    value,
  );
}

function formatDuration(minutes: number, ui: AnalyticsUi): string {
  const roundedMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(roundedMinutes / 60);
  const remainder = roundedMinutes % 60;

  if (hours > 0 && remainder > 0) {
    return `${hours} ${ui.hourShort} ${remainder} ${ui.minuteShort}`;
  }

  if (hours > 0) {
    return `${hours} ${ui.hourShort}`;
  }

  return `${remainder} ${ui.minuteShort}`;
}

function formatAxisDuration(minutes: number, ui: AnalyticsUi): string {
  if (minutes >= 60) {
    const hours = Math.round((minutes / 60) * 10) / 10;
    return `${hours} ${ui.hourShort}`;
  }

  return `${Math.round(minutes)} ${ui.minuteShort}`;
}

function formatFactNumber(
  value: number,
  unit: string | null | undefined,
  ui: AnalyticsUi,
  locale: LocaleCode,
): string {
  if (unit === "minute") {
    return formatDuration(value, ui);
  }

  if (unit === "hour") {
    const formatted = new Intl.NumberFormat(NUMBER_LOCALE_MAP[locale], {
      maximumFractionDigits: 2,
    }).format(value);
    return `${formatted} ${ui.hourShort}`;
  }

  const formatted = new Intl.NumberFormat(NUMBER_LOCALE_MAP[locale], {
    maximumFractionDigits: 2,
  }).format(value);

  return unit ? `${formatted} ${unit}` : formatted;
}

function formatFactAxis(
  value: number,
  unit: string | null | undefined,
  ui: AnalyticsUi,
  locale: LocaleCode,
): string {
  if (unit === "minute") {
    return formatAxisDuration(value, ui);
  }

  const formatted = new Intl.NumberFormat(NUMBER_LOCALE_MAP[locale], {
    maximumFractionDigits: 1,
  }).format(value);

  return unit ? `${formatted} ${unit}` : formatted;
}

function multiSeriesDisplayName(
  series: MultiFactSeries,
  locale: LocaleCode,
): string {
  if (series.kind === "presence") {
    return `${series.valueObjectTitle} · ${MULTI_SERIES_COPY[locale].presence}`;
  }

  return `${series.valueObjectTitle} · ${
    series.parameterTitle ?? series.parameterCode ?? FACT_SERIES_COPY[locale].summary
  }`;
}

const MULTI_SERIES_GENERIC_TITLES = new Set(
  Object.values(MULTI_SERIES_COPY).map((copy) => copy.title),
);

function multiSeriesBlockTitle(
  blockTitle: string | null | undefined,
  series: readonly MultiFactSeries[],
  locale: LocaleCode,
): string {
  const valueObjectTitles = Array.from(
    new Set(
      series
        .map((item) => item.valueObjectTitle.trim())
        .filter(Boolean),
    ),
  );
  const genericBaseTitle =
    !blockTitle || MULTI_SERIES_GENERIC_TITLES.has(blockTitle);
  const baseTitle = genericBaseTitle
    ? MULTI_SERIES_COPY[locale].title
    : blockTitle;

  if (valueObjectTitles.length === 0) {
    return baseTitle;
  }

  const visibleTitles = valueObjectTitles.slice(0, 3);
  const overflow =
    valueObjectTitles.length > visibleTitles.length
      ? ` +${valueObjectTitles.length - visibleTitles.length}`
      : "";

  return `${baseTitle}: ${visibleTitles.join(", ")}${overflow}`;
}

type MultiSeriesBand = {
  readonly key: string;
  readonly family: string;
  readonly unit: string;
  readonly series: Array<{
    readonly series: MultiFactSeries;
    readonly seriesIndex: number;
  }>;
  readonly domain: [number, number];
  readonly ticks: number[];
};

const COUNT_UNIT_SHORT: Record<LocaleCode, string> = {
  ru: "шт.",
  pl: "szt.",
  en: "count",
  uk: "шт.",
  de: "Anz.",
  es: "uds.",
  cs: "ks",
};

function nicePositiveStep(maxValue: number, targetTicks = 4): number {
  if (!Number.isFinite(maxValue) || maxValue <= 0) return 1;

  const rawStep = maxValue / Math.max(1, targetTicks);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const nice =
    normalized <= 1
      ? 1
      : normalized <= 2
        ? 2
        : normalized <= 2.5
          ? 2.5
          : normalized <= 5
            ? 5
            : 10;

  return nice * magnitude;
}

function buildPositiveBandScale(
  values: number[],
  family: string,
  unit: string,
): { domain: [number, number]; ticks: number[] } {
  const finite = values.filter((value) => Number.isFinite(value));
  const maxValue = finite.length > 0 ? Math.max(...finite, 0) : 0;

  if (family === "presence") {
    return { domain: [0, 1], ticks: [0, 1] };
  }

  if (family === "count") {
    const upper = Math.max(
      3,
      Math.ceil(maxValue) + (Number.isInteger(maxValue) ? 1 : 0),
    );
    return {
      domain: [0, upper],
      ticks: Array.from({ length: upper + 1 }, (_, index) => index),
    };
  }

  let step: number;
  if (family === "duration" && unit === "minute") {
    const candidates = [5, 10, 15, 30, 60, 120, 180, 240, 360, 480, 720];
    const target = maxValue > 0 ? maxValue / 4 : 30;
    step =
      candidates.find((candidate) => candidate >= target) ??
      nicePositiveStep(maxValue, 4);
  } else {
    step = nicePositiveStep(maxValue, 4);
  }

  let upper = Math.max(step, Math.ceil(maxValue / step) * step);
  if (maxValue > 0 && Math.abs(upper - maxValue) < 1e-9) {
    upper += step;
  }

  const tickCount = Math.max(1, Math.round(upper / step));
  const ticks = Array.from(
    { length: tickCount + 1 },
    (_, index) => Math.round(index * step * 10000) / 10000,
  );

  return { domain: [0, upper], ticks };
}

function multiSeriesBandUnitLabel(
  unit: string,
  locale: LocaleCode,
  ui: AnalyticsUi,
): string {
  if (unit === "minute") return ui.minuteShort;
  if (unit === "hour") return ui.hourShort;
  if (unit === "count") return COUNT_UNIT_SHORT[locale];
  if (unit === "presence") return MULTI_SERIES_COPY[locale].presence;
  return unit;
}

function formatMultiSeriesBandTick(
  value: number,
  band: MultiSeriesBand,
  locale: LocaleCode,
): string {
  if (band.family === "count") return String(Math.round(value));
  if (band.family === "presence") return value >= 1 ? "1" : "0";

  return new Intl.NumberFormat(NUMBER_LOCALE_MAP[locale], {
    maximumFractionDigits: 2,
  }).format(value);
}

function visualizationLabel(
  type: DashboardAnalyticsVisualizationType,
  ui: AnalyticsUi,
  locale: LocaleCode,
) {
  if (type === "map") return MAP_BUILDER_COPY[locale].title;

  const labels: Record<
    Exclude<DashboardAnalyticsVisualizationType, "map">,
    string
  > = {
    line: ui.line,
    bar: ui.bar,
    metric: ui.metric,
    donut: ui.donut,
    radar: ui.radar,
    heatmap: ui.heatmap,
    scatter: ui.scatter,
    progress: ui.progress,
  };

  return labels[type];
}

function visualizationDescription(
  type: DashboardAnalyticsVisualizationType,
  ui: AnalyticsUi,
  locale: LocaleCode,
) {
  if (type === "line") return ui.lineDescription;
  if (type === "bar") return ui.barDescription;
  if (type === "metric") return ui.metricDescription;
  if (type === "map") return MAP_BUILDER_COPY[locale].description;
  if (type === "donut") return ROOT_TIME_COPY[locale].description;
  return ui.later;
}

function visualizationIcon(type: DashboardAnalyticsVisualizationType) {
  if (type === "line") return LineChartIcon;
  if (type === "bar") return BarChart3;
  if (type === "metric") return Hash;
  if (type === "map") return MapPinned;
  if (type === "donut") return PieChartIcon;
  if (type === "progress") return Target;
  return Activity;
}

function formatDateLabel(dateKey: string, locale: LocaleCode): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return new Intl.DateTimeFormat(NUMBER_LOCALE_MAP[locale], {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

function AnalyticsBlockCard({
  block,
  locale,
  ui,
  onRemove,
}: {
  readonly block: DashboardAnalyticsBlock;
  readonly locale: LocaleCode;
  readonly ui: AnalyticsUi;
  readonly onRemove: (blockId: string) => Promise<void>;
}) {
  const [data, setData] = useState<BlockDataResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  const loadData = useCallback(async () => {
    // Keep the last successful chart mounted while locale/data revalidation
    // runs in the background. Only the first load uses the loading placeholder.
    setStatus((current) => (current === "ready" ? "ready" : "loading"));

    try {
      const timeZone =
        Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const query = new URLSearchParams({
        blockId: block.id,
        timeZone,
        locale,
      });

      const response = await fetch(
        `/api/dashboard/analytics-data?${query.toString()}`,
        {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | BlockDataResponse
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? ui.loadError);
      }

      setData(payload);
      setStatus("ready");
    } catch {
      // A failed background refresh must not erase data the user already saw.
      setStatus((current) => (current === "ready" ? "ready" : "error"));
    }
  }, [block.id, locale, ui.loadError]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [loadData]);

  const rows = useMemo(
    () =>
      (data?.series ?? []).map((row) => ({
        ...row,
        label: formatDateLabel(row.date, locale),
      })),
    [data?.series, locale],
  );

  const multiSeriesRows = useMemo(() => {
    const factSeries = data?.factSeries ?? [];
    const dateKeys = factSeries[0]?.points.map((point) => point.date) ?? [];

    return dateKeys.map((date, index) => {
      const row: Record<string, string | number | null> = {
        date,
        label: formatDateLabel(date, locale),
      };

      factSeries.forEach((series, seriesIndex) => {
        row[`series_${seriesIndex}`] =
          series.points[index]?.valueNumber ?? null;
      });

      return row;
    });
  }, [data?.factSeries, locale]);

  const multiSeriesBands = useMemo(() => {
    const factSeries = data?.factSeries ?? [];
    const grouped = new Map<
      string,
      {
        family: string;
        unit: string;
        series: Array<{
          series: MultiFactSeries;
          seriesIndex: number;
        }>;
      }
    >();

    factSeries.forEach((series, seriesIndex) => {
      const family =
        series.unitFamily ??
        dashboardMeasurementUnitFamily(series.unit);
      const key = family;
      const current = grouped.get(key);

      if (current) {
        current.series.push({ series, seriesIndex });
        return;
      }

      grouped.set(key, {
        family,
        unit: series.unit,
        series: [{ series, seriesIndex }],
      });
    });

    return Array.from(grouped.entries()).map(
      ([key, group]): MultiSeriesBand => {
        const values = group.series.flatMap((item) =>
          item.series.points.flatMap((point) =>
            typeof point.valueNumber === "number" &&
            Number.isFinite(point.valueNumber)
              ? [point.valueNumber]
              : [],
          ),
        );
        const scale = buildPositiveBandScale(
          values,
          group.family,
          group.unit,
        );

        return {
          key,
          family: group.family,
          unit: group.unit,
          series: group.series,
          domain: scale.domain,
          ticks: scale.ticks,
        };
      },
    );
  }, [data?.factSeries]);

  const isActivityCount = block.metricKey === "activity_count";
  const countCopy = ACTIVITY_COUNT_COPY[locale];
  const rootTimeCopy = ROOT_TIME_COPY[locale];
  const factCopy = FACT_SERIES_COPY[locale];
  const isRootTimeDonut =
    block.visualizationType === "donut" &&
    block.sourceType === "facts" &&
    block.metricKey === "duration_minutes" &&
    block.groupByKey === "observation_object";
  const isObservationFactSeries =
    block.sourceType === "facts" &&
    block.metricKey === "numeric_value" &&
    block.groupByKey === "day";
  const isObservationFactMultiSeries =
    block.visualizationType === "line" &&
    block.sourceType === "facts" &&
    block.metricKey === "multi_series" &&
    block.groupByKey === "day";
  const factUnit =
    data?.unit ??
    (typeof block.config.canonicalUnitCode === "string"
      ? block.config.canonicalUnitCode
      : null);
  const configuredParameterTitle =
    typeof block.config.parameterTitle === "string"
      ? block.config.parameterTitle
      : null;
  const hasRecordedData = isRootTimeDonut
    ? (data?.rootBreakdown ?? []).length > 0
    : isObservationFactMultiSeries
      ? (data?.factSeries ?? []).some(
          (series) => series.resolvedObservationCount > 0,
        )
      : isObservationFactSeries
        ? (data?.resolvedObservationCount ?? 0) > 0
        : isActivityCount
          ? (data?.activityCount ?? 0) > 0
          : (data?.totalMinutes ?? 0) > 0;
  const chartDataKey = isObservationFactSeries
    ? "valueNumber"
    : isActivityCount
      ? "activityCount"
      : "valueMinutes";
  const chartValueName = isObservationFactSeries
    ? data?.parameterTitle ?? configuredParameterTitle ?? factCopy.summary
    : isActivityCount
      ? countCopy.recorded
      : ui.recordedActivities;
  const title = isObservationFactMultiSeries
    ? multiSeriesBlockTitle(
        block.title,
        data?.factSeries ?? [],
        locale,
      )
    : block.title ||
      data?.valueObjectTitle ||
      (block.visualizationType === "map"
        ? MAP_BUILDER_COPY[locale].title
        : isRootTimeDonut
          ? rootTimeCopy.title
          : isActivityCount
            ? countCopy.title
            : ui.totalDurationByDay);
  const periodLabel =
    block.periodDays === 7
      ? ui.sevenDays
      : block.periodDays === 14
        ? ui.fourteenDays
        : ui.thirtyDays;

  return (
    <article
      className={`self-start rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm ${
        block.visualizationType === "map" ? "xl:row-span-2" : ""
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold text-[#1a1d2e]">
            {title}
          </h3>
          <div className="mt-0.5 text-[10px] text-[#9ca3b8]">
            {block.visualizationType === "map"
              ? MAP_BUILDER_COPY[locale].adaptiveScope
              : `${periodLabel} · ${visualizationLabel(
                  block.visualizationType,
                  ui,
                  locale,
                )}`}
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1">
          <Link
            href={
              block.visualizationType === "map"
                ? `/certificates?view=participants&locale=${locale}`
                : isRootTimeDonut ||
                    isObservationFactSeries ||
                    isObservationFactMultiSeries
                  ? `/activity-facts?locale=${locale}`
                  : `/activity-today?locale=${locale}`
            }
            className="rounded-lg px-2 py-1 text-[11px] font-medium text-[#3b6ef8] hover:bg-[#eef2ff]"
          >
            {block.visualizationType === "map"
              ? MAP_BUILDER_COPY[locale].openCatalog
              : isRootTimeDonut
                ? rootTimeCopy.factsJournal
                : isObservationFactSeries || isObservationFactMultiSeries
                  ? factCopy.factsJournal
                  : ui.journal}
          </Link>
          <button
            type="button"
            onClick={() => void onRemove(block.id)}
            title={ui.remove}
            aria-label={ui.remove}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#9ca3b8] transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {status === "loading" ? (
        <div className="flex h-[160px] items-center justify-center text-[12px] font-medium text-[#9ca3b8]">
          {ui.loading}
        </div>
      ) : status === "error" ? (
        <div className="flex h-[160px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-rose-200 bg-rose-50/40 px-4 text-center">
          <div className="text-[12px] font-semibold text-rose-700">
            {ui.loadError}
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-rose-700"
          >
            {ui.retry}
          </button>
        </div>
      ) : block.visualizationType === "map" ? (
        <DashboardCertificateMap
          markers={data?.markers ?? []}
          locale={locale}
        />

      ) : isRootTimeDonut ? (
        (data?.rootBreakdown ?? []).length === 0 ? (
          <div className="flex h-[210px] items-center justify-center rounded-lg border border-dashed border-[#dfe3f1] bg-[#fbfcff] px-4 text-center text-[12px] font-medium text-[#7c8099]">
            {rootTimeCopy.noData}
          </div>
        ) : (
          <div>
            <div className="grid min-h-[210px] grid-cols-1 gap-4 md:grid-cols-[220px_1fr] md:items-center">
              <div className="h-[210px] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data?.rootBreakdown ?? []}
                      dataKey="valueMinutes"
                      nameKey="rootTitle"
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={78}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {(data?.rootBreakdown ?? []).map((row, index) => (
                        <Cell
                          key={row.rootValueObjectId}
                          fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [
                        formatDuration(Number(value), ui),
                        rootTimeCopy.duration,
                      ]}
                      contentStyle={{
                        fontSize: 11,
                        borderRadius: 8,
                        border: "1px solid #f0f2f7",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2">
                {(data?.rootBreakdown ?? []).map((row, index) => (
                  <div
                    key={row.rootValueObjectId}
                    className="flex items-center gap-2 rounded-lg border border-[#eef0f6] px-3 py-2"
                  >
                    <span
                      className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          DONUT_COLORS[index % DONUT_COLORS.length],
                      }}
                    />
                    <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-[#3f4358]">
                      {row.rootTitle}
                    </span>
                    <span className="flex-shrink-0 text-[11px] font-bold text-[#1a1d2e]">
                      {formatDuration(row.valueMinutes, ui)}
                    </span>
                    <span className="w-12 flex-shrink-0 text-right text-[10px] text-[#9ca3b8]">
                      {row.percentage.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {data?.overlapDetected ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-800">
                {rootTimeCopy.overlapNote}
              </div>
            ) : null}
          </div>
        )
      ) : isObservationFactMultiSeries ? (
        !hasRecordedData ? (
          <div className="flex h-[180px] items-center justify-center rounded-lg border border-dashed border-[#dfe3f1] bg-[#fbfcff] px-4 text-center text-[12px] font-medium text-[#7c8099]">
            {MULTI_SERIES_COPY[locale].noMultiData}
          </div>
        ) : (
          <div>
            <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1">
              {(data?.factSeries ?? []).map((series, index) => {
                const color =
                  MULTI_SERIES_COLORS[
                    index % MULTI_SERIES_COLORS.length
                  ];

                return (
                  <div
                    key={series.id}
                    className="flex min-w-0 items-center gap-1.5 text-[10px] text-[#5f6478]"
                  >
                    <span
                      className="h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="truncate">
                      {multiSeriesDisplayName(series, locale)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div>
              {multiSeriesBands.map((band, bandIndex) => {
                const isBottomBand =
                  bandIndex === multiSeriesBands.length - 1;
                const firstSeries =
                  band.series[0]?.series ?? null;
                const bandTitle =
                  firstSeries?.kind === "numeric"
                    ? [
                        firstSeries.parameterTitle ??
                          firstSeries.parameterCode ??
                          FACT_SERIES_COPY[locale].summary,
                        multiSeriesBandUnitLabel(
                          band.unit,
                          locale,
                          ui,
                        ),
                      ].join(", ")
                    : MULTI_SERIES_COPY[locale].presence;

                return (
                  <div
                    key={band.key}
                    className={
                      bandIndex > 0
                        ? "mt-2 border-t border-[#eef0f6] pt-2"
                        : ""
                    }
                  >
                    <div className="mb-3 text-[10px] font-semibold text-[#6f7488]">
                      {bandTitle}
                    </div>
                    <ResponsiveContainer
                      width="100%"
                      height={isBottomBand ? 145 : 118}
                    >
                      <LineChart
                        data={multiSeriesRows}
                        syncId={"dashboard-unit-bands-" + block.id}
                        syncMethod="index"
                        margin={{
                          top: 4,
                          right: 8,
                          bottom: 0,
                          left: 0,
                        }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#f0f2f7"
                        />
                        <XAxis
                          dataKey="label"
                          hide={!isBottomBand}
                          height={isBottomBand ? 28 : 0}
                          tick={{
                            fontSize: 10,
                            fill: "#9ca3b8",
                          }}
                          axisLine={isBottomBand}
                          tickLine={false}
                        />
                        <YAxis
                          domain={band.domain}
                          ticks={band.ticks}
                          allowDecimals={band.family !== "count"}
                          tickFormatter={(value) =>
                            formatMultiSeriesBandTick(
                              Number(value),
                              band,
                              locale,
                            )
                          }
                          tick={{
                            fontSize: 10,
                            fill: "#8a8fa3",
                          }}
                          axisLine={false}
                          tickLine={false}
                          width={52}
                        />
                        <Tooltip
                          content={isBottomBand ? undefined : () => null}
                          cursor={{
                            stroke: "#cbd2e5",
                            strokeDasharray: "3 3",
                          }}
                          formatter={(value, name) => {
                            const matchedSeries =
                              (data?.factSeries ?? []).find(
                                (series) =>
                                  multiSeriesDisplayName(
                                    series,
                                    locale,
                                  ) === String(name),
                              );

                            if (
                              matchedSeries?.kind === "presence"
                            ) {
                              return [
                                MULTI_SERIES_COPY[locale].present,
                                String(name),
                              ];
                            }

                            return [
                              formatFactNumber(
                                Number(value),
                                matchedSeries?.unit,
                                ui,
                                locale,
                              ),
                              String(name),
                            ];
                          }}
                          contentStyle={{
                            fontSize: 11,
                            borderRadius: 8,
                            border: "1px solid #f0f2f7",
                            boxShadow:
                              "0 4px 12px rgba(0,0,0,0.08)",
                          }}
                        />

                        {band.series.map(
                          ({ series, seriesIndex }) => {
                            const color =
                              MULTI_SERIES_COLORS[
                                seriesIndex %
                                  MULTI_SERIES_COLORS.length
                              ];
                            const seriesName =
                              multiSeriesDisplayName(
                                series,
                                locale,
                              );

                            return (
                              <Line
                                key={series.id}
                                type="monotone"
                                dataKey={"series_" + seriesIndex}
                                name={seriesName}
                                stroke={color}
                                strokeWidth={
                                  series.kind === "presence"
                                    ? 0
                                    : 2.5
                                }
                                dot={{
                                  r:
                                    series.kind === "presence"
                                      ? 4
                                      : 3,
                                  fill: color,
                                  stroke: color,
                                }}
                                activeDot={{
                                  r:
                                    series.kind === "presence"
                                      ? 5
                                      : 4,
                                }}
                                connectNulls={false}
                              />
                            );
                          },
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : block.visualizationType === "metric" ? (
        <div className="flex h-[160px] items-center gap-5">
          <div className="min-w-[145px]">
            <div className="text-[28px] font-bold leading-none text-[#1a1d2e]">
              {isObservationFactSeries
                ? formatFactNumber(data?.totalValue ?? 0, factUnit, ui, locale)
                : isActivityCount
                  ? new Intl.NumberFormat(NUMBER_LOCALE_MAP[locale]).format(
                      data?.activityCount ?? 0,
                    )
                  : formatDuration(data?.totalMinutes ?? 0, ui)}
            </div>
            <div className="mt-2 text-[11px] text-[#7c8099]">
              {chartValueName}
            </div>
            <div className="mt-1 text-[10px] text-[#9ca3b8]">
              {periodLabel}
            </div>
          </div>
          <div className="h-[110px] min-w-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows}>
                <Line
                  type="monotone"
                  dataKey={chartDataKey}
                  stroke="#3b6ef8"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : !hasRecordedData ? (
        <div className="flex h-[160px] items-center justify-center rounded-lg border border-dashed border-[#dfe3f1] bg-[#fbfcff] px-4 text-center text-[12px] font-medium text-[#7c8099]">
          {isObservationFactSeries
            ? factCopy.noData
            : isActivityCount
              ? countCopy.noData
              : ui.noData}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          {block.visualizationType === "bar" ? (
            <BarChart data={rows} barSize={20}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f0f2f7"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#9ca3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(value) =>
                  isObservationFactSeries
                    ? formatFactAxis(Number(value), factUnit, ui, locale)
                    : isActivityCount
                      ? String(Math.round(Number(value)))
                      : formatAxisDuration(Number(value), ui)
                }
                tick={{ fontSize: 10, fill: "#9ca3b8" }}
                axisLine={false}
                tickLine={false}
                width={42}
              />
              <Tooltip
                formatter={(value) => [
                  isObservationFactSeries
                    ? formatFactNumber(Number(value), factUnit, ui, locale)
                    : isActivityCount
                      ? String(Math.round(Number(value)))
                      : formatDuration(Number(value), ui),
                  chartValueName,
                ]}
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 8,
                  border: "1px solid #f0f2f7",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              />
              <Bar
                dataKey={chartDataKey}
                fill="#3b6ef8"
                radius={[4, 4, 0, 0]}
                name={chartValueName}
              />
            </BarChart>
          ) : (
            <LineChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#9ca3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(value) =>
                  isObservationFactSeries
                    ? formatFactAxis(Number(value), factUnit, ui, locale)
                    : isActivityCount
                      ? String(Math.round(Number(value)))
                      : formatAxisDuration(Number(value), ui)
                }
                tick={{ fontSize: 10, fill: "#9ca3b8" }}
                axisLine={false}
                tickLine={false}
                width={42}
              />
              <Tooltip
                formatter={(value) => [
                  isObservationFactSeries
                    ? formatFactNumber(Number(value), factUnit, ui, locale)
                    : isActivityCount
                      ? String(Math.round(Number(value)))
                      : formatDuration(Number(value), ui),
                  chartValueName,
                ]}
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 8,
                  border: "1px solid #f0f2f7",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              />
              <Line
                type="monotone"
                dataKey={chartDataKey}
                stroke="#3b6ef8"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#3b6ef8" }}
                activeDot={{ r: 4 }}
                name={chartValueName}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      )}
    </article>
  );
}

function AnalyticsBuilderModal({
  locale,
  ui,
  onClose,
  onCreated,
}: {
  readonly locale: LocaleCode;
  readonly ui: AnalyticsUi;
  readonly onClose: () => void;
  readonly onCreated: (block: DashboardAnalyticsBlock) => void;
}) {
  const [step, setStep] = useState(1);
  const [visualizationType, setVisualizationType] =
    useState<DashboardAnalyticsVisualizationType>("line");
  const [periodDays, setPeriodDays] = useState(7);
  const [activityMetric, setActivityMetric] = useState<
    "duration_minutes" | "activity_count"
  >("duration_minutes");
  const [dataSource, setDataSource] = useState<"activities" | "facts">(
    "activities",
  );
  const [observationQuery, setObservationQuery] = useState("");
  const [observationOptions, setObservationOptions] = useState<
    ObservationObjectOption[]
  >([]);
  const [selectedObservation, setSelectedObservation] =
    useState<ObservationObjectOption | null>(null);
  const [observationSearchLoading, setObservationSearchLoading] =
    useState(false);
  const [observationParameters, setObservationParameters] = useState<
    ObservationParameterOption[]
  >([]);
  const [selectedParameter, setSelectedParameter] =
    useState<ObservationParameterOption | null>(null);
  const [factSeriesDrafts, setFactSeriesDrafts] = useState<FactSeriesDraft[]>([]);
  const [parameterLoading, setParameterLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function resetCurrentFactSelection() {
    setObservationQuery("");
    setObservationOptions([]);
    setSelectedObservation(null);
    setObservationSearchLoading(false);
    setObservationParameters([]);
    setSelectedParameter(null);
    setParameterLoading(false);
  }

  function addNumericFactSeries() {
    if (!selectedObservation || !selectedParameter) {
      setError(FACT_SERIES_COPY[locale].selectParameter);
      return;
    }

    if (factSeriesDrafts.length >= 6) {
      setError(MULTI_SERIES_COPY[locale].maxSeries);
      return;
    }

    const duplicate = factSeriesDrafts.some(
      (series) =>
        series.kind === "numeric" &&
        series.valueObjectId === selectedObservation.id &&
        series.parameterDefinitionId === selectedParameter.id,
    );
    if (duplicate) {
      resetCurrentFactSelection();
      return;
    }

    setFactSeriesDrafts((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        kind: "numeric",
        valueObjectId: selectedObservation.id,
        valueObjectTitle: selectedObservation.title,
        parameterDefinitionId: selectedParameter.id,
        parameterCode: selectedParameter.parameterCode,
        parameterTitle: selectedParameter.title,
        canonicalUnitCode: selectedParameter.canonicalUnitCode,
      },
    ]);
    setError("");
    resetCurrentFactSelection();
  }

  function addPresenceFactSeries() {
    if (!selectedObservation) return;

    if (factSeriesDrafts.length >= 6) {
      setError(MULTI_SERIES_COPY[locale].maxSeries);
      return;
    }

    const duplicate = factSeriesDrafts.some(
      (series) =>
        series.kind === "presence" &&
        series.valueObjectId === selectedObservation.id,
    );
    if (duplicate) {
      resetCurrentFactSelection();
      return;
    }

    setFactSeriesDrafts((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        kind: "presence",
        valueObjectId: selectedObservation.id,
        valueObjectTitle: selectedObservation.title,
        parameterDefinitionId: null,
        parameterCode: null,
        parameterTitle: null,
        canonicalUnitCode: null,
      },
    ]);
    setError("");
    resetCurrentFactSelection();
  }

  async function createBlock() {
    setSaving(true);
    setError("");

    try {
      const isRootTimeDonut = visualizationType === "donut";
      const isObservationFactSeries =
        visualizationType !== "map" &&
        !isRootTimeDonut &&
        dataSource === "facts";
      const isObservationFactMultiSeries =
        visualizationType === "line" &&
        isObservationFactSeries &&
        factSeriesDrafts.length >= 2;

      if (
        isObservationFactSeries &&
        !isObservationFactMultiSeries &&
        (!selectedObservation || !selectedParameter)
      ) {
        throw new Error(FACT_SERIES_COPY[locale].selectParameter);
      }

      const response = await fetch("/api/dashboard/analytics-blocks", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          title: isObservationFactMultiSeries
            ? MULTI_SERIES_COPY[locale].title
            : isObservationFactSeries && selectedObservation
              ? selectedObservation.title
              : null,
          visualizationType,
          sourceType:
            visualizationType === "map"
              ? "certificates"
              : isRootTimeDonut || isObservationFactSeries
                ? "facts"
                : "activities",
          metricKey:
            visualizationType === "map"
              ? "available_certificates"
              : isRootTimeDonut
                ? "duration_minutes"
                : isObservationFactMultiSeries
                  ? "multi_series"
                  : isObservationFactSeries
                    ? "numeric_value"
                    : activityMetric,
          aggregationKey:
            visualizationType === "map" ||
            (!isObservationFactSeries && activityMetric === "activity_count")
              ? "count"
              : "sum",
          groupByKey:
            visualizationType === "map"
              ? "location"
              : isRootTimeDonut
                ? "observation_object"
                : "day",
          periodDays: visualizationType === "map" ? 30 : periodDays,
          config: isObservationFactMultiSeries
            ? {
                scaleMode: "independent",
                series: factSeriesDrafts.map((series) => ({
                  id: series.id,
                  kind: series.kind,
                  valueObjectId: series.valueObjectId,
                  valueObjectTitle: series.valueObjectTitle,
                  ...(series.kind === "numeric"
                    ? {
                        parameterDefinitionId: series.parameterDefinitionId,
                        parameterCode: series.parameterCode,
                        parameterTitle: series.parameterTitle,
                        canonicalUnitCode: series.canonicalUnitCode,
                      }
                    : {}),
                })),
              }
            : isObservationFactSeries &&
                selectedObservation &&
                selectedParameter
              ? {
                  valueObjectId: selectedObservation.id,
                  parameterDefinitionId: selectedParameter.id,
                  parameterCode: selectedParameter.parameterCode,
                  canonicalUnitCode: selectedParameter.canonicalUnitCode,
                  valueObjectTitle: selectedObservation.title,
                  parameterTitle: selectedParameter.title,
                }
              : {},
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; block?: DashboardAnalyticsBlock; error?: string }
        | null;

      if (!response.ok || !payload?.ok || !payload.block) {
        throw new Error(payload?.error ?? ui.loadError);
      }

      onCreated(payload.block);
      onClose();
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : ui.loadError,
      );
    } finally {
      setSaving(false);
    }
  }

  const periodOptions = [
    { value: 7, label: ui.sevenDays },
    { value: 14, label: ui.fourteenDays },
    { value: 30, label: ui.thirtyDays },
  ];

  const usesSelectableFactSeries =
    visualizationType !== "map" &&
    visualizationType !== "donut" &&
    dataSource === "facts";

  useEffect(() => {
    if (!usesSelectableFactSeries || step !== 2) {
      return;
    }

    const query = observationQuery.trim();
    if (query.length < 2 || selectedObservation) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setObservationSearchLoading(true);

      const search = new URLSearchParams({
        includeGlobal: "1",
        level: "leaf",
        limit: "20",
        q: query,
        locale,
      });

      void fetch(`/api/value-objects/selector?${search.toString()}`, {
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      })
        .then(async (response) => {
          const payload = (await response.json().catch(() => null)) as
            | ObservationSelectorResponse
            | null;

          if (!response.ok || !payload?.ok) {
            throw new Error(payload?.error ?? ui.loadError);
          }

          setObservationOptions(
            (payload.valueObjects ?? []).filter(
              (item) => item.status === "active",
            ),
          );
        })
        .catch((searchError) => {
          if (searchError instanceof DOMException && searchError.name === "AbortError") {
            return;
          }
          setObservationOptions([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setObservationSearchLoading(false);
          }
        });
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    locale,
    observationQuery,
    selectedObservation,
    step,
    ui.loadError,
    usesSelectableFactSeries,
  ]);

  useEffect(() => {
    if (!usesSelectableFactSeries || !selectedObservation) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setParameterLoading(true);
      setObservationParameters([]);
      setSelectedParameter(null);

      const query = new URLSearchParams({
        valueObjectId: selectedObservation.id,
        locale,
      });

      void fetch(
        `/api/dashboard/analytics-observation-options?${query.toString()}`,
        {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
          headers: { Accept: "application/json" },
        },
      )
        .then(async (response) => {
          const payload = (await response.json().catch(() => null)) as
            | ObservationOptionsResponse
            | null;

          if (!response.ok || !payload?.ok) {
            throw new Error(payload?.error ?? ui.loadError);
          }

          const parameters = payload.parameters ?? [];
          setObservationParameters(parameters);
          if (parameters.length === 1) {
            setSelectedParameter(parameters[0]);
          }
        })
        .catch((parameterError) => {
          if (
            parameterError instanceof DOMException &&
            parameterError.name === "AbortError"
          ) {
            return;
          }
          setObservationParameters([]);
          setSelectedParameter(null);
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setParameterLoading(false);
          }
        });
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [locale, selectedObservation, ui.loadError, usesSelectableFactSeries]);

  const hasValidFactStepSelection =
    visualizationType === "line" && factSeriesDrafts.length > 0
      ? factSeriesDrafts.length >= 2
      : Boolean(selectedObservation && selectedParameter);

  const canAdvance =
    step !== 2 ||
    !usesSelectableFactSeries ||
    hasValidFactStepSelection;

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#1a1d2e]/35 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label={ui.add}
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#eef0f6] bg-white px-5 py-4">
          <div>
            <h2 className="text-[17px] font-bold text-[#1a1d2e]">
              {ui.add}
            </h2>
            <div className="mt-0.5 text-[11px] text-[#9ca3b8]">
              {formatTemplate(ui.wizardStep, { current: step })}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={ui.cancel}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#7c8099] hover:bg-[#f5f6fb]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {step === 1 ? (
            <>
              <h3 className="mb-4 text-[15px] font-bold text-[#1a1d2e]">
                {ui.chooseView}
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {AVAILABLE_VISUALIZATIONS.map((option) => {
                  const Icon = visualizationIcon(option.type);
                  const selected = visualizationType === option.type;

                  return (
                    <button
                      key={option.type}
                      type="button"
                      disabled={!option.enabled}
                      onClick={() => {
                        if (option.enabled) {
                          setVisualizationType(option.type);
                        }
                      }}
                      className={`relative flex min-h-[105px] items-start gap-3 rounded-xl border p-4 text-left transition ${
                        option.enabled
                          ? selected
                            ? "border-[#3b6ef8] bg-[#eef2ff]"
                            : "border-[#dfe3f1] bg-white hover:border-[#aebefc] hover:bg-[#fbfcff]"
                          : "cursor-not-allowed border-[#edf0f6] bg-[#fafbfe] opacity-60"
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
                          selected && option.enabled
                            ? "bg-white text-[#3b6ef8]"
                            : "bg-[#f4f6fb] text-[#7c8099]"
                        }`}
                      >
                        <Icon size={17} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold text-[#1a1d2e]">
                          {visualizationLabel(option.type, ui, locale)}
                        </div>
                        <div className="mt-1 text-[11px] leading-5 text-[#7c8099]">
                          {visualizationDescription(option.type, ui, locale)}
                        </div>
                      </div>
                      <span
                        className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          option.enabled
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-[#f0f2f7] text-[#9ca3b8]"
                        }`}
                      >
                        {option.enabled ? ui.live : ui.later}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : step === 2 ? (
            <>
              <h3 className="mb-4 text-[15px] font-bold text-[#1a1d2e]">
                {ui.chooseData}
              </h3>

              {visualizationType === "map" ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#3b6ef8] bg-[#eef2ff] p-4">
                    <div className="flex items-center gap-2">
                      <MapPinned size={16} className="text-[#3b6ef8]" />
                      <div className="text-[13px] font-bold text-[#1a1d2e]">
                        {MAP_BUILDER_COPY[locale].certificates}
                      </div>
                      <Check size={15} className="ml-auto text-[#3b6ef8]" />
                    </div>
                    <div className="mt-2 text-[11px] leading-5 text-[#7c8099]">
                      {MAP_BUILDER_COPY[locale].certificatesDescription}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#dfe3f1] bg-white p-4">
                    <div className="text-[13px] font-bold text-[#1a1d2e]">
                      {MAP_BUILDER_COPY[locale].adaptiveScope}
                    </div>
                    <div className="mt-2 text-[11px] leading-5 text-[#7c8099]">
                      {MAP_BUILDER_COPY[locale].adaptiveScopeDescription}
                    </div>
                  </div>
                </div>
              ) : visualizationType === "donut" ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-[#3b6ef8] bg-[#eef2ff] p-4">
                    <div className="flex items-center gap-2">
                      <PieChartIcon size={16} className="text-[#3b6ef8]" />
                      <div className="text-[13px] font-bold text-[#1a1d2e]">
                        {ROOT_TIME_COPY[locale].facts}
                      </div>
                      <Check size={15} className="ml-auto text-[#3b6ef8]" />
                    </div>
                    <div className="mt-2 text-[11px] leading-5 text-[#7c8099]">
                      {ROOT_TIME_COPY[locale].factsDescription}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#3b6ef8] bg-[#eef2ff] p-4">
                    <div className="flex items-center gap-2">
                      <div className="text-[13px] font-bold text-[#1a1d2e]">
                        {ROOT_TIME_COPY[locale].duration}
                      </div>
                      <Check size={15} className="ml-auto text-[#3b6ef8]" />
                    </div>
                    <div className="mt-2 text-[11px] leading-5 text-[#7c8099]">
                      {ROOT_TIME_COPY[locale].durationDescription}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setDataSource("activities")}
                      className={`rounded-xl border p-4 text-left transition ${
                        dataSource === "activities"
                          ? "border-[#3b6ef8] bg-[#eef2ff]"
                          : "border-[#dfe3f1] bg-white hover:border-[#aebefc]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Activity size={16} className="text-[#3b6ef8]" />
                        <div className="text-[13px] font-bold text-[#1a1d2e]">
                          {ui.activities}
                        </div>
                        {dataSource === "activities" ? (
                          <Check size={15} className="ml-auto text-[#3b6ef8]" />
                        ) : null}
                      </div>
                      <div className="mt-2 text-[11px] leading-5 text-[#7c8099]">
                        {ui.activitiesDescription}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDataSource("facts")}
                      className={`rounded-xl border p-4 text-left transition ${
                        dataSource === "facts"
                          ? "border-[#3b6ef8] bg-[#eef2ff]"
                          : "border-[#dfe3f1] bg-white hover:border-[#aebefc]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Hash size={16} className="text-[#3b6ef8]" />
                        <div className="text-[13px] font-bold text-[#1a1d2e]">
                          {FACT_SERIES_COPY[locale].source}
                        </div>
                        {dataSource === "facts" ? (
                          <Check size={15} className="ml-auto text-[#3b6ef8]" />
                        ) : null}
                      </div>
                      <div className="mt-2 text-[11px] leading-5 text-[#7c8099]">
                        {FACT_SERIES_COPY[locale].sourceDescription}
                      </div>
                    </button>
                  </div>

                  {dataSource === "activities" ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setActivityMetric("duration_minutes")}
                        className={`rounded-xl border p-4 text-left transition ${
                          activityMetric === "duration_minutes"
                            ? "border-[#3b6ef8] bg-[#eef2ff]"
                            : "border-[#dfe3f1] bg-white hover:border-[#aebefc]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="text-[13px] font-bold text-[#1a1d2e]">
                            {ui.totalDuration}
                          </div>
                          {activityMetric === "duration_minutes" ? (
                            <Check size={15} className="ml-auto text-[#3b6ef8]" />
                          ) : null}
                        </div>
                        <div className="mt-2 text-[11px] leading-5 text-[#7c8099]">
                          {ui.totalDurationDescription}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActivityMetric("activity_count")}
                        className={`rounded-xl border p-4 text-left transition ${
                          activityMetric === "activity_count"
                            ? "border-[#3b6ef8] bg-[#eef2ff]"
                            : "border-[#dfe3f1] bg-white hover:border-[#aebefc]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="text-[13px] font-bold text-[#1a1d2e]">
                            {ACTIVITY_COUNT_COPY[locale].metric}
                          </div>
                          {activityMetric === "activity_count" ? (
                            <Check size={15} className="ml-auto text-[#3b6ef8]" />
                          ) : null}
                        </div>
                        <div className="mt-2 text-[11px] leading-5 text-[#7c8099]">
                          {ACTIVITY_COUNT_COPY[locale].description}
                        </div>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 rounded-xl border border-[#e4e8f4] bg-[#fbfcff] p-4">
                      {visualizationType === "line" && factSeriesDrafts.length > 0 ? (
                        <div>
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <div className="text-[11px] font-bold uppercase tracking-wide text-[#7c8099]">
                              {MULTI_SERIES_COPY[locale].selectedSeries}
                            </div>
                            <div className="text-[10px] text-[#9ca3b8]">
                              {factSeriesDrafts.length}/6
                            </div>
                          </div>
                          <div className="space-y-2">
                            {factSeriesDrafts.map((series, index) => (
                              <div
                                key={series.id}
                                className="flex items-center gap-3 rounded-lg border border-[#dfe3f1] bg-white px-3 py-2.5"
                              >
                                <span
                                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                                  style={{
                                    backgroundColor:
                                      MULTI_SERIES_COLORS[
                                        index % MULTI_SERIES_COLORS.length
                                      ],
                                  }}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-[11px] font-semibold text-[#1a1d2e]">
                                    {series.valueObjectTitle}
                                  </div>
                                  <div className="mt-0.5 truncate text-[10px] text-[#9ca3b8]">
                                    {series.kind === "presence"
                                      ? MULTI_SERIES_COPY[locale].presence
                                      : `${series.parameterTitle ?? series.parameterCode} · ${
                                          series.canonicalUnitCode ?? ""
                                        }`}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFactSeriesDrafts((current) =>
                                      current.filter((item) => item.id !== series.id),
                                    )
                                  }
                                  title={MULTI_SERIES_COPY[locale].removeSeries}
                                  aria-label={MULTI_SERIES_COPY[locale].removeSeries}
                                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[#9ca3b8] hover:bg-rose-50 hover:text-rose-600"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            ))}
                          </div>
                          {factSeriesDrafts.length === 1 ? (
                            <div className="mt-2 text-[10px] text-amber-700">
                              {MULTI_SERIES_COPY[locale].needTwoSeries}
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      <div>
                        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#7c8099]">
                          {FACT_SERIES_COPY[locale].searchLabel}
                        </div>
                        <input
                          type="text"
                          value={observationQuery}
                          onChange={(event) => {
                            setObservationQuery(event.target.value);
                            setSelectedObservation(null);
                            setObservationOptions([]);
                            setObservationSearchLoading(false);
                            setObservationParameters([]);
                            setSelectedParameter(null);
                            setParameterLoading(false);
                          }}
                          placeholder={FACT_SERIES_COPY[locale].searchPlaceholder}
                          className="w-full rounded-lg border border-[#dfe3f1] bg-white px-3 py-2.5 text-[12px] text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8]"
                        />
                        <div className="mt-1.5 text-[10px] leading-4 text-[#9ca3b8]">
                          {FACT_SERIES_COPY[locale].searchHint}
                        </div>

                        {!selectedObservation &&
                        observationQuery.trim().length >= 2 ? (
                          <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-[#dfe3f1] bg-white">
                            {observationSearchLoading ? (
                              <div className="px-3 py-3 text-[11px] text-[#7c8099]">
                                {FACT_SERIES_COPY[locale].searching}
                              </div>
                            ) : observationOptions.length === 0 ? (
                              <div className="px-3 py-3 text-[11px] text-[#7c8099]">
                                {FACT_SERIES_COPY[locale].noObjects}
                              </div>
                            ) : (
                              observationOptions.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedObservation(item);
                                    setObservationQuery(item.title);
                                    setObservationOptions([]);
                                    setObservationSearchLoading(false);
                                  }}
                                  className="block w-full border-b border-[#eef0f6] px-3 py-2.5 text-left last:border-b-0 hover:bg-[#f5f7ff]"
                                >
                                  <div className="text-[12px] font-semibold text-[#1a1d2e]">
                                    {item.title}
                                  </div>
                                  <div className="mt-0.5 truncate text-[10px] text-[#9ca3b8]">
                                    {item.pathText}
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        ) : null}
                      </div>

                      {selectedObservation ? (
                        <div>
                          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#7c8099]">
                            {FACT_SERIES_COPY[locale].parameterLabel}
                          </div>

                          {parameterLoading ? (
                            <div className="rounded-lg border border-[#dfe3f1] bg-white px-3 py-3 text-[11px] text-[#7c8099]">
                              {FACT_SERIES_COPY[locale].loadingParameters}
                            </div>
                          ) : observationParameters.length === 0 ? (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-[11px] text-amber-800">
                              {FACT_SERIES_COPY[locale].noParameters}
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {observationParameters.map((parameter) => (
                                <button
                                  key={parameter.id}
                                  type="button"
                                  onClick={() => setSelectedParameter(parameter)}
                                  className={`rounded-lg border p-3 text-left transition ${
                                    selectedParameter?.id === parameter.id
                                      ? "border-[#3b6ef8] bg-[#eef2ff]"
                                      : "border-[#dfe3f1] bg-white hover:border-[#aebefc]"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="text-[12px] font-semibold text-[#1a1d2e]">
                                      {parameter.title}
                                    </div>
                                    {selectedParameter?.id === parameter.id ? (
                                      <Check
                                        size={14}
                                        className="ml-auto text-[#3b6ef8]"
                                      />
                                    ) : null}
                                  </div>
                                  <div className="mt-1 text-[10px] text-[#9ca3b8]">
                                    {parameter.parameterCode} ·{" "}
                                    {parameter.canonicalUnitCode}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          {visualizationType === "line" ? (
                            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <button
                                type="button"
                                disabled={
                                  !selectedParameter ||
                                  factSeriesDrafts.length >= 6
                                }
                                onClick={addNumericFactSeries}
                                className="flex items-center justify-center gap-1.5 rounded-lg border border-[#3b6ef8] bg-white px-3 py-2.5 text-[11px] font-semibold text-[#3b6ef8] hover:bg-[#eef2ff] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Plus size={13} />
                                {MULTI_SERIES_COPY[locale].addNumericSeries}
                              </button>

                              <button
                                type="button"
                                disabled={factSeriesDrafts.length >= 6}
                                onClick={addPresenceFactSeries}
                                className="flex items-center justify-center gap-1.5 rounded-lg border border-[#8b5cf6] bg-white px-3 py-2.5 text-[11px] font-semibold text-[#7c3aed] hover:bg-[#f5f3ff] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Plus size={13} />
                                {MULTI_SERIES_COPY[locale].addPresenceSeries}
                              </button>
                            </div>
                          ) : null}

                          {visualizationType === "line" ? (
                            <div className="mt-2 rounded-lg border border-[#e4e8f4] bg-white px-3 py-2 text-[10px] leading-4 text-[#7c8099]">
                              {MULTI_SERIES_COPY[locale].presenceDescription}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <h3 className="mb-4 text-[15px] font-bold text-[#1a1d2e]">
                {ui.configure}
              </h3>

              {visualizationType === "map" ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[#3b6ef8] bg-[#eef2ff] p-4">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-[#3b6ef8]">
                      {MAP_BUILDER_COPY[locale].adaptiveScope}
                    </div>
                    <div className="mt-2 text-[12px] leading-5 text-[#5a5f7a]">
                      {MAP_BUILDER_COPY[locale].adaptiveScopeDescription}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#e4e8f4] bg-[#fbfcff] p-4 text-[12px] leading-5 text-[#5a5f7a]">
                    {MAP_BUILDER_COPY[locale].certificatesDescription}
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#7c8099]">
                      {ui.grouping}
                    </div>
                    <div className="inline-flex rounded-xl border border-[#3b6ef8] bg-[#eef2ff] px-4 py-2.5 text-[12px] font-bold text-[#3b6ef8]">
                      {visualizationType === "donut"
                        ? ROOT_TIME_COPY[locale].byRoot
                        : ui.byDay}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#7c8099]">
                      {ui.period}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {periodOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setPeriodDays(option.value)}
                          className={`rounded-lg px-4 py-2 text-[12px] font-semibold transition ${
                            periodDays === option.value
                              ? "bg-[#3b6ef8] text-white shadow-sm"
                              : "border border-[#dfe3f1] bg-white text-[#5a5f7a] hover:bg-[#f5f6fb]"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#e4e8f4] bg-[#fbfcff] p-4">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-[#7c8099]">
                      {visualizationType === "donut"
                        ? ROOT_TIME_COPY[locale].title
                        : usesSelectableFactSeries && factSeriesDrafts.length >= 2
                          ? MULTI_SERIES_COPY[locale].title
                          : usesSelectableFactSeries && selectedObservation
                            ? selectedObservation.title
                            : activityMetric === "activity_count"
                              ? ACTIVITY_COUNT_COPY[locale].title
                              : ui.totalDurationByDay}
                    </div>
                    <div className="mt-2 text-[12px] leading-5 text-[#5a5f7a]">
                      {visualizationType === "donut" ? (
                        <>
                          {ROOT_TIME_COPY[locale].facts} ·{" "}
                          {ROOT_TIME_COPY[locale].duration} ·{" "}
                          {ROOT_TIME_COPY[locale].byRoot} ·{" "}
                        </>
                      ) : usesSelectableFactSeries &&
                        factSeriesDrafts.length >= 2 ? (
                        <>
                          {FACT_SERIES_COPY[locale].source} ·{" "}
                          {factSeriesDrafts.length} ·{" "}
                          {MULTI_SERIES_COPY[locale].independentScale} ·{" "}
                          {ui.byDay} ·{" "}
                        </>
                      ) : usesSelectableFactSeries &&
                        selectedObservation &&
                        selectedParameter ? (
                        <>
                          {FACT_SERIES_COPY[locale].source} ·{" "}
                          {selectedParameter.title} ·{" "}
                          {selectedParameter.parameterCode} ·{" "}
                          {selectedParameter.canonicalUnitCode} · {ui.byDay} ·{" "}
                        </>
                      ) : (
                        <>
                          {ui.activities} ·{" "}
                          {activityMetric === "activity_count"
                            ? ACTIVITY_COUNT_COPY[locale].metric
                            : ui.totalDuration}{" "}
                          · {ui.byDay} ·{" "}
                        </>
                      )}
                      {periodOptions.find((item) => item.value === periodDays)?.label}
                    </div>
                    {usesSelectableFactSeries && factSeriesDrafts.length >= 2 ? (
                      <div className="mt-2 text-[10px] leading-4 text-[#7c8099]">
                        {MULTI_SERIES_COPY[locale].independentScaleDescription}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </>
          )}

          {error ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[12px] font-semibold text-rose-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-[#eef0f6] bg-white px-5 py-4">
          <button
            type="button"
            onClick={() => {
              if (step === 1) {
                onClose();
              } else {
                setStep((current) => Math.max(1, current - 1));
              }
            }}
            className="flex items-center gap-1.5 rounded-lg border border-[#dfe3f1] bg-white px-4 py-2 text-[12px] font-semibold text-[#5a5f7a] hover:bg-[#f5f6fb]"
          >
            {step > 1 ? <ArrowLeft size={13} /> : null}
            {step === 1 ? ui.cancel : ui.back}
          </button>

          {step < 3 ? (
            <button
              type="button"
              disabled={!canAdvance}
              onClick={() => {
                if (canAdvance) {
                  setStep((current) => Math.min(3, current + 1));
                }
              }}
              className="rounded-lg bg-[#3b6ef8] px-4 py-2 text-[12px] font-bold text-white shadow-sm hover:bg-[#315fd8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {ui.next}
            </button>
          ) : (
            <button
              type="button"
              disabled={
                saving ||
                (usesSelectableFactSeries && !hasValidFactStepSelection)
              }
              onClick={() => void createBlock()}
              className="flex items-center gap-1.5 rounded-lg bg-[#3b6ef8] px-4 py-2 text-[12px] font-bold text-white shadow-sm hover:bg-[#315fd8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={13} />
              {saving ? ui.loading : ui.create}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function DashboardAnalyticsWorkspace({
  locale,
  initialBlocks,
}: {
  readonly locale: LocaleCode;
  readonly initialBlocks: readonly DashboardAnalyticsBlock[] | null;
}) {
  const ui = UI[locale];
  const [blocks, setBlocks] = useState<DashboardAnalyticsBlock[]>(() =>
    initialBlocks === null ? [] : [...initialBlocks],
  );
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    initialBlocks === null ? "error" : "ready",
  );
  const [builderOpen, setBuilderOpen] = useState(false);

  const loadBlocks = useCallback(async () => {
    // Do not replace an already rendered workspace with a loading panel
    // during background revalidation.
    setStatus((current) => (current === "ready" ? "ready" : "loading"));

    try {
      const response = await fetch("/api/dashboard/analytics-blocks", {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      const payload = (await response.json().catch(() => null)) as
        | BlocksResponse
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "DASHBOARD_ANALYTICS_BLOCKS_LOAD_FAILED");
      }

      setBlocks(Array.isArray(payload.blocks) ? payload.blocks : []);
      setStatus("ready");
    } catch {
      // Preserve the current block list if a later refresh fails.
      setStatus((current) => (current === "ready" ? "ready" : "error"));
    }
  }, []);

  async function removeBlock(blockId: string) {
    const response = await fetch(
      `/api/dashboard/analytics-blocks?id=${encodeURIComponent(blockId)}`,
      {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json" },
      },
    );

    if (!response.ok) {
      return;
    }

    setBlocks((current) =>
      current.filter((block) => block.id !== blockId),
    );
  }

  return (
    <>
      <section className="mb-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-bold text-[#1a1d2e]">
              {ui.analytics}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setBuilderOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-[#3b6ef8]/30 bg-white px-3 py-1.5 text-[12px] font-medium text-[#3b6ef8] transition-all hover:bg-[#eef2ff]"
          >
            <Plus size={12} />
            {ui.add}
          </button>
        </div>

        {status === "loading" ? (
          <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-6 text-center text-[12px] font-medium text-[#9ca3b8] shadow-sm">
            {ui.loading}
          </div>
        ) : status === "error" ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-6 text-center shadow-sm">
            <div className="text-[12px] font-semibold text-rose-700">
              {ui.loadError}
            </div>
            <button
              type="button"
              onClick={() => void loadBlocks()}
              className="mt-3 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-rose-700"
            >
              {ui.retry}
            </button>
          </div>
        ) : blocks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#cfd6e8] bg-white p-8 text-center shadow-sm">
            <div className="text-[13px] font-bold text-[#1a1d2e]">
              {ui.emptyTitle}
            </div>
            <div className="mx-auto mt-1 max-w-xl text-[11px] leading-5 text-[#7c8099]">
              {ui.emptyBody}
            </div>
            <button
              type="button"
              onClick={() => setBuilderOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#3b6ef8] px-4 py-2 text-[12px] font-bold text-white shadow-sm hover:bg-[#315fd8]"
            >
              <Plus size={13} />
              {ui.add}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-3 xl:grid-flow-row-dense xl:grid-cols-2">
            {blocks.map((block) => (
              <AnalyticsBlockCard
                key={block.id}
                block={block}
                locale={locale}
                ui={ui}
                onRemove={removeBlock}
              />
            ))}
          </div>
        )}
      </section>

      {builderOpen ? (
        <AnalyticsBuilderModal
          locale={locale}
          ui={ui}
          onClose={() => setBuilderOpen(false)}
          onCreated={(block) =>
            setBlocks((current) => [...current, block])
          }
        />
      ) : null}
    </>
  );
}

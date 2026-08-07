"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Check,
  Hash,
  LineChart as LineChartIcon,
  Plus,
  Target,
  Trash2,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
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
  readonly valueMinutes: number;
  readonly valueHours: number;
  readonly activityCount: number;
};

type BlockDataResponse = {
  readonly ok?: boolean;
  readonly totalMinutes?: number;
  readonly activityCount?: number;
  readonly series?: DataPoint[];
  readonly error?: string;
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

const AVAILABLE_VISUALIZATIONS: readonly {
  readonly type: DashboardAnalyticsVisualizationType;
  readonly enabled: boolean;
}[] = [
  { type: "line", enabled: true },
  { type: "bar", enabled: true },
  { type: "metric", enabled: true },
  { type: "donut", enabled: false },
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

function visualizationLabel(
  type: DashboardAnalyticsVisualizationType,
  ui: AnalyticsUi,
) {
  const labels: Record<DashboardAnalyticsVisualizationType, string> = {
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
) {
  if (type === "line") return ui.lineDescription;
  if (type === "bar") return ui.barDescription;
  if (type === "metric") return ui.metricDescription;
  return ui.later;
}

function visualizationIcon(type: DashboardAnalyticsVisualizationType) {
  if (type === "line") return LineChartIcon;
  if (type === "bar") return BarChart3;
  if (type === "metric") return Hash;
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
    setStatus("loading");

    try {
      const timeZone =
        Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const query = new URLSearchParams({
        blockId: block.id,
        timeZone,
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
      setData(null);
      setStatus("error");
    }
  }, [block.id, ui.loadError]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const rows = useMemo(
    () =>
      (data?.series ?? []).map((row) => ({
        ...row,
        label: formatDateLabel(row.date, locale),
      })),
    [data?.series, locale],
  );

  const hasRecordedDuration = (data?.totalMinutes ?? 0) > 0;
  const title = block.title || ui.totalDurationByDay;
  const periodLabel =
    block.periodDays === 7
      ? ui.sevenDays
      : block.periodDays === 14
        ? ui.fourteenDays
        : ui.thirtyDays;

  return (
    <article className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold text-[#1a1d2e]">
            {title}
          </h3>
          <div className="mt-0.5 text-[10px] text-[#9ca3b8]">
            {periodLabel} · {visualizationLabel(block.visualizationType, ui)}
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1">
          <Link
            href={`/activity-today?locale=${locale}`}
            className="rounded-lg px-2 py-1 text-[11px] font-medium text-[#3b6ef8] hover:bg-[#eef2ff]"
          >
            {ui.journal}
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
      ) : block.visualizationType === "metric" ? (
        <div className="flex h-[160px] items-center gap-5">
          <div className="min-w-[145px]">
            <div className="text-[28px] font-bold leading-none text-[#1a1d2e]">
              {formatDuration(data?.totalMinutes ?? 0, ui)}
            </div>
            <div className="mt-2 text-[11px] text-[#7c8099]">
              {ui.recordedActivities}
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
                  dataKey="valueMinutes"
                  stroke="#3b6ef8"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : !hasRecordedDuration ? (
        <div className="flex h-[160px] items-center justify-center rounded-lg border border-dashed border-[#dfe3f1] bg-[#fbfcff] px-4 text-center text-[12px] font-medium text-[#7c8099]">
          {ui.noData}
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
                  formatAxisDuration(Number(value), ui)
                }
                tick={{ fontSize: 10, fill: "#9ca3b8" }}
                axisLine={false}
                tickLine={false}
                width={42}
              />
              <Tooltip
                formatter={(value) => [
                  formatDuration(Number(value), ui),
                  ui.recordedActivities,
                ]}
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 8,
                  border: "1px solid #f0f2f7",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              />
              <Bar
                dataKey="valueMinutes"
                fill="#3b6ef8"
                radius={[4, 4, 0, 0]}
                name={ui.recordedActivities}
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
                  formatAxisDuration(Number(value), ui)
                }
                tick={{ fontSize: 10, fill: "#9ca3b8" }}
                axisLine={false}
                tickLine={false}
                width={42}
              />
              <Tooltip
                formatter={(value) => [
                  formatDuration(Number(value), ui),
                  ui.recordedActivities,
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
                dataKey="valueMinutes"
                stroke="#3b6ef8"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#3b6ef8" }}
                activeDot={{ r: 4 }}
                name={ui.recordedActivities}
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function createBlock() {
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/dashboard/analytics-blocks", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          visualizationType,
          sourceType: "activities",
          metricKey: "duration_minutes",
          aggregationKey: "sum",
          groupByKey: "day",
          periodDays,
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

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#1a1d2e]/35 p-4 backdrop-blur-[1px]"
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
                          {visualizationLabel(option.type, ui)}
                        </div>
                        <div className="mt-1 text-[11px] leading-5 text-[#7c8099]">
                          {visualizationDescription(option.type, ui)}
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

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#3b6ef8] bg-[#eef2ff] p-4">
                  <div className="flex items-center gap-2">
                    <Activity size={16} className="text-[#3b6ef8]" />
                    <div className="text-[13px] font-bold text-[#1a1d2e]">
                      {ui.activities}
                    </div>
                    <Check size={15} className="ml-auto text-[#3b6ef8]" />
                  </div>
                  <div className="mt-2 text-[11px] leading-5 text-[#7c8099]">
                    {ui.activitiesDescription}
                  </div>
                </div>

                <div className="rounded-xl border border-[#dfe3f1] bg-white p-4">
                  <div className="text-[13px] font-bold text-[#1a1d2e]">
                    {ui.totalDuration}
                  </div>
                  <div className="mt-2 text-[11px] leading-5 text-[#7c8099]">
                    {ui.totalDurationDescription}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <h3 className="mb-4 text-[15px] font-bold text-[#1a1d2e]">
                {ui.configure}
              </h3>

              <div className="space-y-5">
                <div>
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#7c8099]">
                    {ui.grouping}
                  </div>
                  <div className="inline-flex rounded-xl border border-[#3b6ef8] bg-[#eef2ff] px-4 py-2.5 text-[12px] font-bold text-[#3b6ef8]">
                    {ui.byDay}
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
                    {ui.totalDurationByDay}
                  </div>
                  <div className="mt-2 text-[12px] leading-5 text-[#5a5f7a]">
                    {ui.activities} · {ui.totalDuration} · {ui.byDay} ·{" "}
                    {periodOptions.find((item) => item.value === periodDays)?.label}
                  </div>
                </div>
              </div>
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
              onClick={() => setStep((current) => Math.min(3, current + 1))}
              className="rounded-lg bg-[#3b6ef8] px-4 py-2 text-[12px] font-bold text-white shadow-sm hover:bg-[#315fd8]"
            >
              {ui.next}
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={() => void createBlock()}
              className="flex items-center gap-1.5 rounded-lg bg-[#3b6ef8] px-4 py-2 text-[12px] font-bold text-white shadow-sm hover:bg-[#315fd8] disabled:cursor-wait disabled:opacity-60"
            >
              <Plus size={13} />
              {saving ? ui.loading : ui.create}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function DashboardAnalyticsWorkspace({
  locale,
}: {
  readonly locale: LocaleCode;
}) {
  const ui = UI[locale];
  const [blocks, setBlocks] = useState<DashboardAnalyticsBlock[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [builderOpen, setBuilderOpen] = useState(false);

  const loadBlocks = useCallback(async () => {
    setStatus("loading");

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
        throw new Error(payload?.error ?? ui.loadError);
      }

      setBlocks(Array.isArray(payload.blocks) ? payload.blocks : []);
      setStatus("ready");
    } catch {
      setBlocks([]);
      setStatus("error");
    }
  }, [ui.loadError]);

  useEffect(() => {
    void loadBlocks();
  }, [loadBlocks]);

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
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
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

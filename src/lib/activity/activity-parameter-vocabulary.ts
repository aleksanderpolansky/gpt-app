import type { ActivityParameterLocale } from "./activity-parameter-presentation";

type LocalizedCodeTable = Readonly<Record<string, Readonly<Record<ActivityParameterLocale, string>>>>;

const DIMENSION_LABELS: LocalizedCodeTable = {
  time: { en: "Time", pl: "Czas", ru: "Время", uk: "Час", de: "Zeit", es: "Tiempo", cs: "Čas" },
  distance: { en: "Distance", pl: "Dystans", ru: "Расстояние", uk: "Відстань", de: "Distanz", es: "Distancia", cs: "Vzdálenost" },
  count: { en: "Count", pl: "Liczba", ru: "Количество", uk: "Кількість", de: "Anzahl", es: "Cantidad", cs: "Počet" },
  volume: { en: "Volume", pl: "Objętość", ru: "Объём", uk: "Обʼєм", de: "Volumen", es: "Volumen", cs: "Objem" },
  mass: { en: "Mass", pl: "Masa", ru: "Масса", uk: "Маса", de: "Masse", es: "Masa", cs: "Hmotnost" },
  energy: { en: "Energy", pl: "Energia", ru: "Энергия", uk: "Енергія", de: "Energie", es: "Energía", cs: "Energie" },
  money: { en: "Money", pl: "Kwota pieniężna", ru: "Денежная сумма", uk: "Грошова сума", de: "Geldbetrag", es: "Importe monetario", cs: "Peněžní částka" },
  rate: { en: "Rate / speed", pl: "Częstość / tempo", ru: "Частота / скорость", uk: "Частота / швидкість", de: "Rate / Geschwindigkeit", es: "Frecuencia / velocidad", cs: "Frekvence / rychlost" },
  score: { en: "Score", pl: "Ocena", ru: "Оценка", uk: "Оцінка", de: "Bewertung", es: "Puntuación", cs: "Hodnocení" },
  temperature: { en: "Temperature", pl: "Temperatura", ru: "Температура", uk: "Температура", de: "Temperatur", es: "Temperatura", cs: "Teplota" },
  text: { en: "Text", pl: "Tekst", ru: "Текст", uk: "Текст", de: "Text", es: "Texto", cs: "Text" },
  boolean: { en: "Yes / no", pl: "Tak / nie", ru: "Да / нет", uk: "Так / ні", de: "Ja / nein", es: "Sí / no", cs: "Ano / ne" },
  timestamp: { en: "Date and time", pl: "Data i czas", ru: "Дата и время", uk: "Дата і час", de: "Datum und Uhrzeit", es: "Fecha y hora", cs: "Datum a čas" },
  pressure: { en: "Pressure", pl: "Ciśnienie", ru: "Давление", uk: "Тиск", de: "Druck", es: "Presión", cs: "Tlak" },
  ratio: { en: "Ratio", pl: "Stosunek", ru: "Отношение", uk: "Співвідношення", de: "Verhältnis", es: "Relación", cs: "Poměr" },
  sound_level: { en: "Sound level", pl: "Poziom dźwięku", ru: "Уровень звука", uk: "Рівень звуку", de: "Schallpegel", es: "Nivel de sonido", cs: "Hladina zvuku" },
  illuminance: { en: "Illuminance", pl: "Natężenie oświetlenia", ru: "Освещённость", uk: "Освітленість", de: "Beleuchtungsstärke", es: "Iluminancia", cs: "Osvětlenost" },
};

const VALUE_TYPE_LABELS: LocalizedCodeTable = {
  numeric: { en: "Number", pl: "Liczba", ru: "Число", uk: "Число", de: "Zahl", es: "Número", cs: "Číslo" },
  text: { en: "Text", pl: "Tekst", ru: "Текст", uk: "Текст", de: "Text", es: "Texto", cs: "Text" },
  boolean: { en: "Yes / no", pl: "Tak / nie", ru: "Да / нет", uk: "Так / ні", de: "Ja / nein", es: "Sí / no", cs: "Ano / ne" },
  timestamp: { en: "Date and time", pl: "Data i czas", ru: "Дата и время", uk: "Дата і час", de: "Datum und Uhrzeit", es: "Fecha y hora", cs: "Datum a čas" },
};

const AGGREGATION_LABELS: LocalizedCodeTable = {
  sum: { en: "Sum", pl: "Suma", ru: "Суммирование", uk: "Сума", de: "Summe", es: "Suma", cs: "Součet" },
  average: { en: "Average", pl: "Średnia", ru: "Среднее", uk: "Середнє", de: "Durchschnitt", es: "Promedio", cs: "Průměr" },
  minimum: { en: "Minimum", pl: "Minimum", ru: "Минимум", uk: "Мінімум", de: "Minimum", es: "Mínimo", cs: "Minimum" },
  maximum: { en: "Maximum", pl: "Maksimum", ru: "Максимум", uk: "Максимум", de: "Maximum", es: "Máximo", cs: "Maximum" },
  latest: { en: "Latest value", pl: "Ostatnia wartość", ru: "Последнее значение", uk: "Останнє значення", de: "Letzter Wert", es: "Último valor", cs: "Poslední hodnota" },
  count: { en: "Record count", pl: "Liczba rekordów", ru: "Подсчёт записей", uk: "Підрахунок записів", de: "Anzahl Datensätze", es: "Recuento de registros", cs: "Počet záznamů" },
  duration: { en: "Duration", pl: "Czas trwania", ru: "Длительность", uk: "Тривалість", de: "Dauer", es: "Duración", cs: "Doba trvání" },
  rate: { en: "Rate", pl: "Częstość / tempo", ru: "Частота / темп", uk: "Частота / темп", de: "Rate", es: "Frecuencia / ritmo", cs: "Frekvence / tempo" },
  none: { en: "No aggregation", pl: "Bez agregacji", ru: "Без агрегации", uk: "Без агрегації", de: "Keine Aggregation", es: "Sin agregación", cs: "Bez agregace" },
};

const WINDOW_LABELS: LocalizedCodeTable = {
  event: { en: "Single event", pl: "Jedno zdarzenie", ru: "Одно событие", uk: "Одна подія", de: "Ein Ereignis", es: "Un evento", cs: "Jedna událost" },
  hour: { en: "Hour", pl: "Godzina", ru: "Час", uk: "Година", de: "Stunde", es: "Hora", cs: "Hodina" },
  day: { en: "Day", pl: "Dzień", ru: "День", uk: "День", de: "Tag", es: "Día", cs: "Den" },
  week: { en: "Week", pl: "Tydzień", ru: "Неделя", uk: "Тиждень", de: "Woche", es: "Semana", cs: "Týden" },
  month: { en: "Month", pl: "Miesiąc", ru: "Месяц", uk: "Місяць", de: "Monat", es: "Mes", cs: "Měsíc" },
  rolling_7_days: { en: "Rolling 7 days", pl: "Ruchome 7 dni", ru: "Скользящие 7 дней", uk: "Ковзні 7 днів", de: "Rollierende 7 Tage", es: "7 días móviles", cs: "Klouzavých 7 dní" },
  rolling_30_days: { en: "Rolling 30 days", pl: "Ruchome 30 dni", ru: "Скользящие 30 дней", uk: "Ковзні 30 днів", de: "Rollierende 30 Tage", es: "30 días móviles", cs: "Klouzavých 30 dní" },
};

const SHOW_INACTIVE_LABELS: Readonly<Record<ActivityParameterLocale, string>> = {
  en: "Show inactive",
  pl: "Pokaż nieaktywne",
  ru: "Показать неактивные",
  uk: "Показати неактивні",
  de: "Inaktive anzeigen",
  es: "Mostrar inactivos",
  cs: "Zobrazit neaktivní",
};

function fallback(code: string): string {
  return code.replace(/_/gu, " ");
}

function localizedLabel(table: LocalizedCodeTable, code: string, locale: ActivityParameterLocale): string {
  return table[code]?.[locale] ?? table[code]?.en ?? fallback(code);
}

export function getActivityDimensionLabel(code: string, locale: ActivityParameterLocale): string {
  return localizedLabel(DIMENSION_LABELS, code, locale);
}

export function getActivityValueTypeLabel(code: string, locale: ActivityParameterLocale): string {
  return localizedLabel(VALUE_TYPE_LABELS, code, locale);
}

export function getActivityAggregationLabel(code: string, locale: ActivityParameterLocale): string {
  return localizedLabel(AGGREGATION_LABELS, code, locale);
}

export function getActivityWindowLabel(code: string, locale: ActivityParameterLocale): string {
  return localizedLabel(WINDOW_LABELS, code, locale);
}

export function getActivityParameterShowInactiveLabel(locale: ActivityParameterLocale): string {
  return SHOW_INACTIVE_LABELS[locale] ?? SHOW_INACTIVE_LABELS.en;
}

export function withTechnicalCode(label: string, code: string): string {
  return `${label} · ${code}`;
}

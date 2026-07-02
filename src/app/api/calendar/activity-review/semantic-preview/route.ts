import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Locale = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";
type FieldStatus = "ready" | "candidate" | "missing";
type IntentValue = "planned_activity" | "actual_fact" | "ambiguous_activity" | "ordinary_chat";

type ReviewField = {
  key: string;
  label: string;
  value: string;
  status: FieldStatus;
  note: string;
  confidence: number;
};

type ReviewPayload = {
  ok: boolean;
  route: string;
  routeMode: "calendar_activity_review_no_write_v1";
  source: "model" | "fallback";
  modelBacked: boolean;
  modelName: string | null;
  modelAttempted: boolean;
  modelError: string | null;
  rawText: string;
  locale: Locale;
  intent: IntentValue;
  activityTitle: string;
  summary: string;
  fields: ReviewField[];
  counters: Record<FieldStatus, number>;
  safety: {
    previewOnly: true;
    dbWriteExecuted: false;
    sqlExecuted: false;
    factCreated: false;
    planCreated: false;
    valueObjectCreated: false;
    timeBlockCreated: false;
  };
  warnings: string[];
};

type ModelShape = {
  intent?: Partial<{
    value: IntentValue;
    status: FieldStatus;
    confidence: number;
    note: string;
  }>;
  activityTitle?: Partial<{
    value: string;
    status: FieldStatus;
    confidence: number;
    note: string;
  }>;
  date?: Partial<{
    value: string;
    status: FieldStatus;
    confidence: number;
    note: string;
  }>;
  time?: Partial<{
    value: string;
    status: FieldStatus;
    confidence: number;
    note: string;
  }>;
  duration?: Partial<{
    value: string;
    status: FieldStatus;
    confidence: number;
    note: string;
  }>;
  categories?: Array<Partial<{
    label: string;
    status: FieldStatus;
    confidence: number;
    note: string;
  }>>;
  valueObjectCandidates?: Array<Partial<{
    title: string;
    status: FieldStatus;
    confidence: number;
    note: string;
  }>>;
  factPreviews?: Array<Partial<{
    type: string;
    value: string;
    unit: string;
    status: FieldStatus;
    confidence: number;
    note: string;
  }>>;
  summary?: string;
  missingFields?: string[];
  warnings?: string[];
};

const LOCALES: Locale[] = ["en", "pl", "ru", "uk", "de", "es", "cs"];

const LABELS: Record<Locale, Record<string, string>> = {
  pl: {
    sourceText: "Tekst źródłowy",
    activityTitle: "Tytuł aktywności",
    intent: "Intencja",
    date: "Data",
    time: "Czas",
    duration: "Czas trwania",
    categories: "Kategorie",
    vo: "Kandydaci VO",
    facts: "Podgląd faktów",
    noText: "Brak tekstu",
    noExactTime: "Nie wykryto dokładnej godziny",
    noDuration: "Nie wykryto czasu trwania",
    noDate: "Nie wykryto daty",
    noVoLookup: "Rzeczywisty lookup VO nie jest jeszcze podłączony.",
    previewOnly: "Podgląd bez zapisu.",
    modelSummary: "Model AI przygotował pakiet pól bez zapisu.",
    fallbackSummary: "Użyto bezpiecznego lokalnego fallbacku, bo model nie zwrócił pakietu.",
  },
  en: {
    sourceText: "Source text",
    activityTitle: "Activity title",
    intent: "Intent",
    date: "Date",
    time: "Time",
    duration: "Duration",
    categories: "Categories",
    vo: "VO candidates",
    facts: "Fact preview",
    noText: "No text",
    noExactTime: "No exact time detected",
    noDuration: "No duration detected",
    noDate: "No date detected",
    noVoLookup: "Real VO lookup is not connected yet.",
    previewOnly: "Preview without saving.",
    modelSummary: "The AI model prepared a no-write field package.",
    fallbackSummary: "Safe local fallback was used because the model did not return a package.",
  },
  ru: {
    sourceText: "Исходный текст",
    activityTitle: "Заголовок активности",
    intent: "Намерение",
    date: "Дата",
    time: "Время",
    duration: "Длительность",
    categories: "Категории",
    vo: "Кандидаты VO",
    facts: "Предпросмотр фактов",
    noText: "Текста нет",
    noExactTime: "Точное время не найдено",
    noDuration: "Длительность не найдена",
    noDate: "Дата не найдена",
    noVoLookup: "Реальный поиск VO ещё не подключён.",
    previewOnly: "Предпросмотр без сохранения.",
    modelSummary: "AI-модель подготовила пакет полей без записи.",
    fallbackSummary: "Использован безопасный локальный fallback, потому что модель не вернула пакет.",
  },
  uk: {
    sourceText: "Вихідний текст",
    activityTitle: "Заголовок активності",
    intent: "Намір",
    date: "Дата",
    time: "Час",
    duration: "Тривалість",
    categories: "Категорії",
    vo: "Кандидати VO",
    facts: "Передперегляд фактів",
    noText: "Тексту немає",
    noExactTime: "Точний час не знайдено",
    noDuration: "Тривалість не знайдена",
    noDate: "Дата не знайдена",
    noVoLookup: "Реальний пошук VO ще не підключено.",
    previewOnly: "Передперегляд без збереження.",
    modelSummary: "AI-модель підготувала пакет полів без запису.",
    fallbackSummary: "Використано безпечний локальний fallback, бо модель не повернула пакет.",
  },
  de: {
    sourceText: "Quelltext",
    activityTitle: "Aktivitätstitel",
    intent: "Absicht",
    date: "Datum",
    time: "Zeit",
    duration: "Dauer",
    categories: "Kategorien",
    vo: "VO-Kandidaten",
    facts: "Faktenvorschau",
    noText: "Kein Text",
    noExactTime: "Keine genaue Uhrzeit erkannt",
    noDuration: "Keine Dauer erkannt",
    noDate: "Kein Datum erkannt",
    noVoLookup: "Echter VO-Lookup ist noch nicht verbunden.",
    previewOnly: "Vorschau ohne Speichern.",
    modelSummary: "Das AI-Modell hat ein No-Write-Feldpaket erstellt.",
    fallbackSummary: "Sicherer lokaler Fallback wurde verwendet, weil das Modell kein Paket zurückgab.",
  },
  es: {
    sourceText: "Texto fuente",
    activityTitle: "Título de actividad",
    intent: "Intención",
    date: "Fecha",
    time: "Hora",
    duration: "Duración",
    categories: "Categorías",
    vo: "Candidatos VO",
    facts: "Vista previa de hechos",
    noText: "Sin texto",
    noExactTime: "No se detectó hora exacta",
    noDuration: "No se detectó duración",
    noDate: "No se detectó fecha",
    noVoLookup: "La búsqueda real de VO aún no está conectada.",
    previewOnly: "Vista previa sin guardar.",
    modelSummary: "El modelo AI preparó un paquete de campos sin escritura.",
    fallbackSummary: "Se usó fallback local seguro porque el modelo no devolvió paquete.",
  },
  cs: {
    sourceText: "Zdrojový text",
    activityTitle: "Název aktivity",
    intent: "Záměr",
    date: "Datum",
    time: "Čas",
    duration: "Trvání",
    categories: "Kategorie",
    vo: "VO kandidáti",
    facts: "Náhled faktů",
    noText: "Bez textu",
    noExactTime: "Nebyl zjištěn přesný čas",
    noDuration: "Nebyla zjištěna délka",
    noDate: "Nebylo zjištěno datum",
    noVoLookup: "Reálný VO lookup zatím není připojen.",
    previewOnly: "Náhled bez uložení.",
    modelSummary: "AI model připravil balík polí bez zápisu.",
    fallbackSummary: "Byl použit bezpečný lokální fallback, protože model nevrátil balík.",
  },
};

function normalizeLocale(value: unknown): Locale {
  return typeof value === "string" && LOCALES.includes(value as Locale)
    ? (value as Locale)
    : "pl";
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(value: unknown, fallback: FieldStatus): FieldStatus {
  return value === "ready" || value === "candidate" || value === "missing"
    ? value
    : fallback;
}

function normalizeConfidence(value: unknown, fallback = 0.5): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : fallback;
}

function includesAny(text: string, markers: string[]) {
  return markers.some((marker) => text.includes(marker));
}

function extractDuration(raw: string): string | null {
  const lower = raw.toLowerCase();

  if (
    includesAny(lower, ["полчас", "pół godz", "pol godz", "half an hour", "half hour", "media hora", "halbe stunde", "půl hod"])
  ) {
    return "30 min";
  }

  const minuteMatch = lower.match(/(\d{1,3})\s*(минут|мин|хвилин|хв|minute|minutes|minut|minuty|minuta|min|minutes|minutos|minuten|Minuten)/i);
  if (minuteMatch) {
    return `${minuteMatch[1]} min`;
  }

  const hourMatch = lower.match(/(\d{1,2})\s*(час|часа|часов|годин|hour|hours|godz|hora|horas|stunde|stunden)/i);
  if (hourMatch) {
    return `${hourMatch[1]} h`;
  }

  return null;
}

function inferIntent(lower: string): IntentValue {
  if (
    includesAny(lower, [
      "планир",
      "планую",
      "пойду",
      "буду",
      "собираюсь",
      "замierz",
      "planuj",
      "pójdę",
      "pojde",
      "i will",
      "going to",
      "tomorrow",
      "jutro",
      "завтра",
      "через",
      "za ",
      "in ",
      "mañana",
      "manana",
      "morgen",
      "zitra",
      "zítra",
    ])
  ) {
    return "planned_activity";
  }

  if (
    includesAny(lower, [
      "сделал",
      "сделала",
      "прошёл",
      "прошла",
      "пробежал",
      "byłem",
      "zrobiłem",
      "done",
      "completed",
      "did ",
      "hice",
      "udělal",
    ])
  ) {
    return "actual_fact";
  }

  return "ambiguous_activity";
}

function inferActivityTitle(raw: string, locale: Locale): string {
  const lower = raw.toLowerCase();

  if (includesAny(lower, ["покуп", "закуп", "shopping", "shop", "grocery", "zakup", "compras", "compra", "einkauf", "nákup", "nakup"])) {
    return locale === "pl" ? "Zakupy" : locale === "en" ? "Shopping" : locale === "es" ? "Compras" : locale === "de" ? "Einkauf" : locale === "cs" ? "Nákup" : locale === "uk" ? "Покупки" : "Покупки";
  }

  if (includesAny(lower, ["бег", "побег", "біж", "біг", "running", "run", "jog", "bieg", "pobieg", "laufen", "correr", "běh", "behat"])) {
    return locale === "pl" ? "Bieganie" : locale === "en" ? "Running" : locale === "es" ? "Correr" : locale === "de" ? "Laufen" : locale === "cs" ? "Běh" : locale === "uk" ? "Пробіжка" : "Пробежка";
  }

  if (includesAny(lower, ["стоматолог", "dentist", "dentysta", "zahnarzt", "dentista", "zubař"])) {
    return locale === "pl" ? "Wizyta u dentysty" : locale === "en" ? "Dentist appointment" : locale === "es" ? "Cita con dentista" : locale === "de" ? "Zahnarzttermin" : locale === "cs" ? "Návštěva zubaře" : locale === "uk" ? "Візит до стоматолога" : "Приём у стоматолога";
  }

  return raw.trim().length > 0 ? raw.trim().slice(0, 70) : LABELS[locale].noText;
}

function inferTemporal(raw: string, locale: Locale) {
  const lower = raw.toLowerCase();

  const date =
    includesAny(lower, ["завтра", "jutro", "tomorrow", "mañana", "manana", "morgen", "zítra", "zitra"])
      ? locale === "pl"
        ? "Jutro"
        : locale === "en"
          ? "Tomorrow"
          : locale === "es"
            ? "Mañana"
            : locale === "de"
              ? "Morgen"
              : locale === "cs"
                ? "Zítra"
                : locale === "uk"
                  ? "Завтра"
                  : "Завтра"
      : includesAny(lower, ["сегодня", "сьогодні", "dzis", "dziś", "today", "hoy", "heute", "dnes", "через", "за pół", "za pol", "in half", "in 30"])
        ? locale === "pl"
          ? "Dziś"
          : locale === "en"
            ? "Today"
            : locale === "es"
              ? "Hoy"
              : locale === "de"
                ? "Heute"
                : locale === "cs"
                  ? "Dnes"
                  : locale === "uk"
                    ? "Сьогодні"
                    : "Сегодня"
        : null;

  const time =
    includesAny(lower, ["через полчас", "через 30", "за pół godz", "za pol godz", "in half an hour", "in 30"])
      ? locale === "pl"
        ? "Za około 30 minut"
        : locale === "en"
          ? "In about 30 minutes"
          : locale === "es"
            ? "En unos 30 minutos"
            : locale === "de"
              ? "In etwa 30 Minuten"
              : locale === "cs"
                ? "Asi za 30 minut"
                : locale === "uk"
                  ? "Приблизно через 30 хвилин"
                  : "Примерно через 30 минут"
      : includesAny(lower, ["утром", "вранці", "rano", "morning", "por la mañana", "por la manana", "morgens"])
        ? locale === "pl"
          ? "Rano"
          : locale === "en"
            ? "Morning"
            : locale === "es"
              ? "Por la mañana"
              : locale === "de"
                ? "Morgens"
                : locale === "cs"
                  ? "Ráno"
                  : locale === "uk"
                    ? "Вранці"
                    : "Утром"
        : null;

  return { date, time };
}

function inferCategories(raw: string, locale: Locale): string[] {
  const lower = raw.toLowerCase();

  if (includesAny(lower, ["покуп", "shopping", "shop", "grocery", "zakup", "compra", "einkauf", "nákup", "nakup"])) {
    return locale === "pl"
      ? ["Osobiste", "Dom", "Zakupy"]
      : locale === "en"
        ? ["Personal", "Household", "Shopping"]
        : locale === "es"
          ? ["Personal", "Hogar", "Compras"]
          : locale === "de"
            ? ["Persönlich", "Haushalt", "Einkauf"]
            : locale === "cs"
              ? ["Osobní", "Domácnost", "Nákup"]
              : locale === "uk"
                ? ["Особисте", "Побут", "Покупки"]
                : ["Личное", "Быт", "Покупки"];
  }

  if (includesAny(lower, ["бег", "running", "run", "jog", "bieg", "laufen", "correr", "běh", "біг"])) {
    return locale === "pl"
      ? ["Zdrowie", "Ruch", "Wytrzymałość"]
      : locale === "en"
        ? ["Health", "Movement", "Endurance"]
        : locale === "es"
          ? ["Salud", "Movimiento", "Resistencia"]
          : locale === "de"
            ? ["Gesundheit", "Bewegung", "Ausdauer"]
            : locale === "cs"
              ? ["Zdraví", "Pohyb", "Vytrvalost"]
              : locale === "uk"
                ? ["Здоровʼя", "Рух", "Витривалість"]
                : ["Здоровье", "Движение", "Выносливость"];
  }

  return locale === "pl"
    ? ["Osobiste"]
    : locale === "en"
      ? ["Personal"]
      : locale === "es"
        ? ["Personal"]
        : locale === "de"
          ? ["Persönlich"]
          : locale === "cs"
            ? ["Osobní"]
            : locale === "uk"
              ? ["Особисте"]
              : ["Личное"];
}

function field(key: string, label: string, value: string, status: FieldStatus, note: string, confidence: number): ReviewField {
  return {
    key,
    label,
    value,
    status,
    note,
    confidence: normalizeConfidence(confidence),
  };
}

function countFields(fields: ReviewField[]): Record<FieldStatus, number> {
  return {
    ready: fields.filter((item) => item.status === "ready").length,
    candidate: fields.filter((item) => item.status === "candidate").length,
    missing: fields.filter((item) => item.status === "missing").length,
  };
}

function buildFallbackPackage(rawText: string, locale: Locale, modelError: string | null): ReviewPayload {
  const labels = LABELS[locale];
  const raw = rawText.trim();
  const lower = raw.toLowerCase();
  const intent = inferIntent(lower);
  const title = inferActivityTitle(raw, locale);
  const temporal = inferTemporal(raw, locale);
  const duration = extractDuration(raw);
  const categories = inferCategories(raw, locale);
  const voCandidates = categories.slice(0, 3);
  const factPreview = intent === "ordinary_chat" ? "ordinary_chat / preview only" : `${intent} / event / candidate`;

  const fields = [
    field("sourceText", labels.sourceText, raw || labels.noText, raw ? "ready" : "missing", "calendar input", raw ? 1 : 0.1),
    field("activityTitle", labels.activityTitle, title, title === labels.noText ? "missing" : "ready", "fallback semantic title", raw ? 0.72 : 0.1),
    field("intent", labels.intent, intent, "ready", "planned/fact/ambiguous decision", 0.7),
    field("date", labels.date, temporal.date ?? labels.noDate, temporal.date ? "candidate" : "missing", "temporal marker", temporal.date ? 0.65 : 0.1),
    field("time", labels.time, temporal.time ?? labels.noExactTime, temporal.time ? "candidate" : "missing", "time marker", temporal.time ? 0.65 : 0.1),
    field("duration", labels.duration, duration ?? labels.noDuration, duration ? "candidate" : "missing", "duration parser", duration ? 0.75 : 0.1),
    field("categories", labels.categories, categories.join(" / "), "candidate", "semantic category candidates", 0.65),
    field("vo", labels.vo, voCandidates.join(" / "), "candidate", labels.noVoLookup, 0.55),
    field("facts", labels.facts, factPreview, "candidate", labels.previewOnly, 0.6),
  ];

  return {
    ok: true,
    route: "/api/calendar/activity-review/semantic-preview",
    routeMode: "calendar_activity_review_no_write_v1",
    source: "fallback",
    modelBacked: false,
    modelName: null,
    modelAttempted: Boolean(modelError),
    modelError,
    rawText: raw,
    locale,
    intent,
    activityTitle: title,
    summary: labels.fallbackSummary,
    fields,
    counters: countFields(fields),
    safety: {
      previewOnly: true,
      dbWriteExecuted: false,
      sqlExecuted: false,
      factCreated: false,
      planCreated: false,
      valueObjectCreated: false,
      timeBlockCreated: false,
    },
    warnings: [
      "Fallback parser was used.",
      "No DB write was executed.",
      "No Activity Event, Time Block, Fact or Value Object was created.",
    ],
  };
}

function stripJsonFences(value: string) {
  const trimmed = value.trim();
  return trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function toModelField(
  key: string,
  label: string,
  candidate: Partial<{ value: string; status: FieldStatus; confidence: number; note: string }> | undefined,
  fallbackValue: string,
  fallbackStatus: FieldStatus,
  fallbackNote: string
): ReviewField {
  const value = asText(candidate?.value) || fallbackValue;
  return field(
    key,
    label,
    value,
    normalizeStatus(candidate?.status, fallbackStatus),
    asText(candidate?.note) || fallbackNote,
    normalizeConfidence(candidate?.confidence, fallbackStatus === "missing" ? 0.2 : 0.7)
  );
}

function normalizeModelPackage(rawText: string, locale: Locale, modelName: string, model: ModelShape): ReviewPayload {
  const labels = LABELS[locale];

  const categories = Array.isArray(model.categories)
    ? model.categories
        .map((item) => asText(item.label))
        .filter(Boolean)
        .slice(0, 5)
    : [];

  const voCandidates = Array.isArray(model.valueObjectCandidates)
    ? model.valueObjectCandidates
        .map((item) => asText(item.title))
        .filter(Boolean)
        .slice(0, 5)
    : [];

  const factPreviews = Array.isArray(model.factPreviews)
    ? model.factPreviews
        .map((item) => {
          const type = asText(item.type);
          const value = asText(item.value);
          const unit = asText(item.unit);
          return [type, value, unit].filter(Boolean).join(" / ");
        })
        .filter(Boolean)
        .slice(0, 5)
    : [];

  const fallback = buildFallbackPackage(rawText, locale, null);
  const intentValue = model.intent?.value === "actual_fact" || model.intent?.value === "planned_activity" || model.intent?.value === "ordinary_chat" || model.intent?.value === "ambiguous_activity"
    ? model.intent.value
    : fallback.intent;

  const activityTitle = asText(model.activityTitle?.value) || fallback.activityTitle;

  const fields = [
    field("sourceText", labels.sourceText, rawText, "ready", "calendar input", 1),
    toModelField("activityTitle", labels.activityTitle, model.activityTitle, activityTitle, "ready", "model semantic title"),
    toModelField("intent", labels.intent, model.intent ? { value: intentValue, status: model.intent.status, confidence: model.intent.confidence, note: model.intent.note } : undefined, intentValue, "ready", "model intent decision"),
    toModelField("date", labels.date, model.date, labels.noDate, "missing", "model temporal extraction"),
    toModelField("time", labels.time, model.time, labels.noExactTime, "missing", "model time extraction"),
    toModelField("duration", labels.duration, model.duration, labels.noDuration, "missing", "model duration extraction"),
    field("categories", labels.categories, categories.length ? categories.join(" / ") : fallback.fields.find((item) => item.key === "categories")?.value ?? "", categories.length ? "candidate" : "missing", "model semantic category candidates", categories.length ? 0.82 : 0.2),
    field("vo", labels.vo, voCandidates.length ? voCandidates.join(" / ") : labels.noVoLookup, voCandidates.length ? "candidate" : "missing", "model VO candidates only; real lookup is not connected", voCandidates.length ? 0.72 : 0.2),
    field("facts", labels.facts, factPreviews.length ? factPreviews.join("; ") : `${intentValue} / candidate`, "candidate", labels.previewOnly, 0.72),
  ];

  return {
    ok: true,
    route: "/api/calendar/activity-review/semantic-preview",
    routeMode: "calendar_activity_review_no_write_v1",
    source: "model",
    modelBacked: true,
    modelName,
    modelAttempted: true,
    modelError: null,
    rawText,
    locale,
    intent: intentValue,
    activityTitle,
    summary: asText(model.summary) || labels.modelSummary,
    fields,
    counters: countFields(fields),
    safety: {
      previewOnly: true,
      dbWriteExecuted: false,
      sqlExecuted: false,
      factCreated: false,
      planCreated: false,
      valueObjectCreated: false,
      timeBlockCreated: false,
    },
    warnings: [
      ...(Array.isArray(model.warnings) ? model.warnings.map(asText).filter(Boolean) : []),
      "Model output is preview-only.",
      "No DB write was executed.",
      "No Activity Event, Time Block, Fact or Value Object was created.",
    ],
  };
}

async function runModelPreview(rawText: string, locale: Locale): Promise<ReviewPayload | null> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const modelName =
    process.env.OPENAI_ACTIVITY_PREVIEW_MODEL ||
    process.env.OPENAI_MODEL ||
    "gpt-4o-mini";

  const labels = LABELS[locale];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelName,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an activity semantic parser for a calendar activity review screen. Return only valid JSON. Do not provide advice. Do not create events, facts, value objects, time blocks, database rows, or write actions. Your task is to propose structured fields for a preview-only Activity Review Package.",
        },
        {
          role: "user",
          content: JSON.stringify({
            locale,
            rawText,
            requiredJsonShape: {
              intent: {
                value: "planned_activity | actual_fact | ambiguous_activity | ordinary_chat",
                status: "ready | candidate | missing",
                confidence: "0..1",
                note: "short reason",
              },
              activityTitle: {
                value: "short normalized title in the user's language if possible",
                status: "ready | candidate | missing",
                confidence: "0..1",
                note: "short reason",
              },
              date: {
                value: "date meaning, for relative phrases keep natural form, e.g. today / tomorrow / in 30 minutes",
                status: "ready | candidate | missing",
                confidence: "0..1",
                note: "short reason",
              },
              time: {
                value: "time meaning, for relative phrases keep natural form",
                status: "ready | candidate | missing",
                confidence: "0..1",
                note: "short reason",
              },
              duration: {
                value: "duration if found, otherwise empty",
                status: "ready | candidate | missing",
                confidence: "0..1",
                note: "short reason",
              },
              categories: [
                {
                  label: "category candidate",
                  status: "candidate",
                  confidence: "0..1",
                  note: "short reason",
                },
              ],
              valueObjectCandidates: [
                {
                  title: "VO candidate title",
                  status: "candidate",
                  confidence: "0..1",
                  note: "preview only, no real lookup",
                },
              ],
              factPreviews: [
                {
                  type: "preview fact type",
                  value: "preview value",
                  unit: "unit",
                  status: "candidate",
                  confidence: "0..1",
                  note: "preview only",
                },
              ],
              summary: labels.modelSummary,
              missingFields: ["fields that need clarification"],
              warnings: ["no write"],
            },
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI response ${response.status}: ${text.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };

  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI response did not include message content.");
  }

  const parsed = JSON.parse(stripJsonFences(content)) as ModelShape;
  return normalizeModelPackage(rawText, locale, modelName, parsed);
}

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};

  try {
    const parsed = await request.json();
    body = typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    body = {};
  }

  const rawText = asText(body.text ?? body.rawText).slice(0, 2000);
  const locale = normalizeLocale(body.locale);

  if (!rawText) {
    return NextResponse.json(buildFallbackPackage("", locale, "empty input"), { status: 200 });
  }

  try {
    const modelPackage = await runModelPreview(rawText, locale);

    if (modelPackage) {
      return NextResponse.json(modelPackage, { status: 200 });
    }

    return NextResponse.json(
      buildFallbackPackage(rawText, locale, "OPENAI_API_KEY is not configured; model-backed preview was skipped."),
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown model error";
    return NextResponse.json(buildFallbackPackage(rawText, locale, message), { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/calendar/activity-review/semantic-preview",
    routeMode: "calendar_activity_review_no_write_v1",
    purpose: "Model-backed Activity Review Package for calendar input; no writes.",
    safety: {
      previewOnly: true,
      dbWriteExecuted: false,
      sqlExecuted: false,
      factCreated: false,
      planCreated: false,
      valueObjectCreated: false,
      timeBlockCreated: false,
    },
  });
}

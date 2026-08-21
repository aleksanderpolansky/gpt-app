"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  ActivityProfileAggregationCode,
  ActivityProfileParameterCode,
  ActivityProfileRelationCode,
} from "@/lib/activity-template-impact-profile-contract";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type TemplateListItem = {
  id: string;
  title: string;
  description: string | null;
  templateGroup: string;
  defaultDurationMinutes: number | null;
  activeProfile: {
    id: string;
    versionNo: number;
    parameterCount: number;
    objectCount: number;
  } | null;
};

type SelectorItem = {
  id: string;
  title: string;
  pathText: string;
  scopeCode: string | null;
};

type RouteDraft = {
  sourceParameterCode: ActivityProfileParameterCode;
  targetParameterCode: string;
  aggregationCode: ActivityProfileAggregationCode;
};

type LinkDraft = {
  targetValueObjectId: string;
  title: string;
  pathText: string;
  relationCode: ActivityProfileRelationCode;
  confidence: number;
  notes: string;
  routes: RouteDraft[];
};

type AnalyticsDraft = {
  accumulatedUnitCode: string;
  calculationMode: "latest_value" | "sum_facts" | "baseline_plus_facts" | "effect_rules";
  sourceParameterCode: string;
  baselineValue: string;
  targetValue: string;
  criticalValue: string;
  desiredDirection: "increase" | "decrease" | "maintain";
  refreshPeriodDays: string;
  inactivityDelta: string;
  trendWindowDays: string;
};

type Copy = {
  title: string;
  intro: string;
  listTitle: string;
  newTemplate: string;
  loading: string;
  empty: string;
  edit: string;
  basics: string;
  name: string;
  nameHelp: string;
  description: string;
  descriptionHelp: string;
  group: string;
  groupHelp: string;
  duration: string;
  durationHelp: string;
  profileNotes: string;
  profileNotesHelp: string;
  eventParameters: string;
  eventParametersHelp: string;
  process: string;
  repetitions: string;
  distance: string;
  durationSeconds: string;
  requiredAlways: string;
  linkedObjects: string;
  linkedObjectsHelp: string;
  searchObject: string;
  searchPlaceholder: string;
  noSearch: string;
  add: string;
  remove: string;
  relation: string;
  confidence: string;
  notes: string;
  routes: string;
  routesHelp: string;
  enabled: string;
  sourceParameter: string;
  targetParameter: string;
  aggregation: string;
  dynamics: string;
  dynamicsHelp: string;
  loadDynamics: string;
  saveDynamics: string;
  accumulatedUnit: string;
  calculationMode: string;
  sourceParameterCode: string;
  baseline: string;
  target: string;
  critical: string;
  direction: string;
  refreshDays: string;
  inactivityDelta: string;
  trendDays: string;
  dynamicRuntimeNotice: string;
  save: string;
  saving: string;
  saved: string;
  version: string;
};

const COPY: Record<LocaleCode, Copy> = {
  ru: {
    title: "Типовые активности и связи с ЦО/ОН",
    intro: "Настройте типовую активность один раз. Реальное событие хранится одной записью, а связанные ЦО/ОН и параметры разворачиваются из этого профиля без 67 отдельных фактов.",
    listTitle: "Мои типовые активности", newTemplate: "Новая типовая активность", loading: "Загрузка…", empty: "Типовых активностей пока нет.", edit: "Открыть",
    basics: "1. Основные данные", name: "Название", nameHelp: "Пишите устойчивое название, которое можно узнавать повторно: например «Подтягивание узким хватом».", description: "Описание", descriptionHelp: "Коротко уточните, что входит в этот тип активности и чем он отличается от похожих.", group: "Группа", groupHelp: "Необязательная служебная группировка: training, family, work и т.п.", duration: "Длительность по умолчанию, мин", durationHelp: "Заполняйте только если у активности есть разумная стандартная длительность.", profileNotes: "Заметки к версии профиля", profileNotesHelp: "Почему выбраны эти объекты и правила. При следующем сохранении создаётся новая версия, старые события сохраняют старую версию.",
    eventParameters: "2. Что может быть измерено в событии", eventParametersHelp: "Количество процессов всегда равно 1. Дополнительно включите только те параметры, которые реально бывают в сообщении или устройстве.", process: "Количество процессов", repetitions: "Количество повторений", distance: "Расстояние, м", durationSeconds: "Длительность, сек", requiredAlways: "Всегда включён",
    linkedObjects: "3. Связанные ЦО/ОН", linkedObjectsHelp: "Добавьте листовые объекты, которые эта типовая активность обычно затрагивает. Связи сохраняются один раз и затем используются всеми событиями этого типа.", searchObject: "Найти ЦО/ОН", searchPlaceholder: "Например: бицепс, настроение, семья…", noSearch: "Ничего не найдено", add: "Добавить", remove: "Удалить", relation: "Как связана активность", confidence: "Уверенность", notes: "Примечание",
    routes: "Какие параметры передавать этому ЦО/ОН", routesHelp: "«1 процесс» добавляется всегда. Для повторений, расстояния или времени включите передачу только там, где этот параметр имеет смысл.", enabled: "Передавать", sourceParameter: "Из события", targetParameter: "Параметр ЦО/ОН", aggregation: "Как считать",
    dynamics: "4. Динамика состояния ЦО/ОН", dynamicsHelp: "Для объектов, где важны накопление, цель или деградация, можно сохранить существующую модель состояния: базовое значение, цель, период обновления и изменение при отсутствии новых фактов.", loadDynamics: "Открыть настройки динамики", saveDynamics: "Сохранить динамику", accumulatedUnit: "Единица накопленного состояния", calculationMode: "Способ расчёта", sourceParameterCode: "Параметр-источник", baseline: "Базовое значение", target: "Целевое значение", critical: "Критическая граница", direction: "Желаемое направление", refreshDays: "Период обновления, дней", inactivityDelta: "Изменение за пропущенный период", trendDays: "Окно тренда, дней", dynamicRuntimeNotice: "Важно: эта карточка сохраняет модель динамики ЦО/ОН. Виртуальные вклады из нового профиля уже доступны через БД-проекцию, но существующий расчёт текущего состояния пока читает подтверждённые физические факты. Автоматическое подключение виртуальных вкладов к этому расчёту — следующий runtime-шаг, чтобы не допустить двойного счёта.",
    save: "Сохранить новую версию", saving: "Сохраняю…", saved: "Сохранено", version: "Версия",
  },
  uk: {
    title: "Типові активності та зв'язки з ЦО/ОН", intro: "Налаштуйте типову активність один раз. Реальна подія зберігається одним записом, а пов'язані ЦО/ОН і параметри розгортаються з профілю без десятків окремих фактів.", listTitle: "Мої типові активності", newTemplate: "Нова типова активність", loading: "Завантаження…", empty: "Типових активностей ще немає.", edit: "Відкрити", basics: "1. Основні дані", name: "Назва", nameHelp: "Стійка назва, яку система зможе впізнавати повторно.", description: "Опис", descriptionHelp: "Коротко уточніть, що входить до цього типу активності.", group: "Група", groupHelp: "Необов'язкове групування: training, family, work тощо.", duration: "Тривалість за замовчуванням, хв", durationHelp: "Лише якщо є розумна стандартна тривалість.", profileNotes: "Нотатки до версії профілю", profileNotesHelp: "Поясніть вибір об'єктів і правил. Нове збереження створює нову версію.", eventParameters: "2. Що може бути виміряно в події", eventParametersHelp: "Кількість процесів завжди 1. Додайте лише реально доступні параметри.", process: "Кількість процесів", repetitions: "Кількість повторень", distance: "Відстань, м", durationSeconds: "Тривалість, сек", requiredAlways: "Завжди ввімкнено", linkedObjects: "3. Пов'язані ЦО/ОН", linkedObjectsHelp: "Додайте листові об'єкти, яких зазвичай стосується ця активність. Зв'язок зберігається один раз.", searchObject: "Знайти ЦО/ОН", searchPlaceholder: "Наприклад: біцепс, настрій, сім'я…", noSearch: "Нічого не знайдено", add: "Додати", remove: "Видалити", relation: "Тип зв'язку", confidence: "Впевненість", notes: "Примітка", routes: "Які параметри передавати цьому ЦО/ОН", routesHelp: "1 процес передається завжди. Повторення, відстань і час вмикайте лише де вони мають сенс.", enabled: "Передавати", sourceParameter: "З події", targetParameter: "Параметр ЦО/ОН", aggregation: "Як рахувати", dynamics: "4. Динаміка стану ЦО/ОН", dynamicsHelp: "Для накопичення, цілі або деградації можна зберегти модель стану.", loadDynamics: "Відкрити динаміку", saveDynamics: "Зберегти динаміку", accumulatedUnit: "Одиниця стану", calculationMode: "Спосіб розрахунку", sourceParameterCode: "Параметр-джерело", baseline: "Базове значення", target: "Цільове значення", critical: "Критична межа", direction: "Бажаний напрямок", refreshDays: "Період оновлення, днів", inactivityDelta: "Зміна за пропущений період", trendDays: "Вікно тренду, днів", dynamicRuntimeNotice: "Нова БД-проекція вже дає віртуальні внески. Чинний розрахунок поточного стану поки читає підтверджені фізичні факти; підключення віртуальних внесків буде окремим runtime-кроком, щоб уникнути подвійного рахунку.", save: "Зберегти нову версію", saving: "Зберігаю…", saved: "Збережено", version: "Версія",
  },
  en: {
    title: "Activity templates and observation-object links", intro: "Configure a reusable activity once. A real event stays one row; linked observation objects and parameters are expanded virtually from the profile.", listTitle: "My activity templates", newTemplate: "New activity template", loading: "Loading…", empty: "No activity templates yet.", edit: "Open", basics: "1. Basic data", name: "Name", nameHelp: "Use a stable reusable name, e.g. Narrow-grip pull-up.", description: "Description", descriptionHelp: "Briefly define what belongs to this activity type.", group: "Group", groupHelp: "Optional grouping such as training, family or work.", duration: "Default duration, min", durationHelp: "Use only when a sensible default exists.", profileNotes: "Profile version notes", profileNotesHelp: "Explain why objects and rules were selected. Each save creates a new version.", eventParameters: "2. Event parameters", eventParametersHelp: "Process count is always 1. Enable only parameters that can actually be observed.", process: "Process count", repetitions: "Repetitions", distance: "Distance, m", durationSeconds: "Duration, sec", requiredAlways: "Always enabled", linkedObjects: "3. Linked observation objects", linkedObjectsHelp: "Add leaf objects normally affected by this activity. Links are stored once and reused by all events.", searchObject: "Find observation object", searchPlaceholder: "For example: biceps, mood, family…", noSearch: "No results", add: "Add", remove: "Remove", relation: "Relation", confidence: "Confidence", notes: "Note", routes: "Parameters routed to this object", routesHelp: "One process is always routed. Enable repetitions, distance or time only where meaningful.", enabled: "Route", sourceParameter: "From event", targetParameter: "Object parameter", aggregation: "Aggregation", dynamics: "4. Object state dynamics", dynamicsHelp: "For accumulation, targets or degradation, save the existing object-state model.", loadDynamics: "Open dynamics", saveDynamics: "Save dynamics", accumulatedUnit: "Accumulated unit", calculationMode: "Calculation mode", sourceParameterCode: "Source parameter", baseline: "Baseline", target: "Target", critical: "Critical boundary", direction: "Desired direction", refreshDays: "Refresh period, days", inactivityDelta: "Change per missed period", trendDays: "Trend window, days", dynamicRuntimeNotice: "The new database projection exposes virtual contributions. The existing current-state calculator still reads confirmed physical facts; connecting virtual contributions is a separate runtime step to prevent double counting.", save: "Save new version", saving: "Saving…", saved: "Saved", version: "Version",
  },
  pl: {} as Copy, de: {} as Copy, es: {} as Copy, cs: {} as Copy,
};

COPY.pl = { ...COPY.en, title: "Typowe aktywności i powiązania z obiektami obserwacji", intro: "Skonfiguruj typową aktywność raz. Rzeczywiste zdarzenie pozostaje jednym rekordem, a powiązane obiekty i parametry są rozwijane wirtualnie z profilu.", listTitle: "Moje typowe aktywności", newTemplate: "Nowa typowa aktywność", basics: "1. Dane podstawowe", eventParameters: "2. Parametry zdarzenia", linkedObjects: "3. Powiązane obiekty obserwacji", dynamics: "4. Dynamika stanu obiektu", save: "Zapisz nową wersję" };
COPY.de = { ...COPY.en, title: "Typische Aktivitäten und Beobachtungsobjekte", intro: "Konfiguriere eine typische Aktivität einmal. Das reale Ereignis bleibt ein Datensatz; verknüpfte Objekte und Parameter werden virtuell aus dem Profil abgeleitet.", listTitle: "Meine typischen Aktivitäten", newTemplate: "Neue typische Aktivität", basics: "1. Grunddaten", eventParameters: "2. Ereignisparameter", linkedObjects: "3. Verknüpfte Beobachtungsobjekte", dynamics: "4. Zustandsdynamik", save: "Neue Version speichern" };
COPY.es = { ...COPY.en, title: "Actividades típicas y objetos de observación", intro: "Configura una actividad típica una sola vez. El evento real queda como un único registro y los objetos y parámetros se expanden virtualmente desde el perfil.", listTitle: "Mis actividades típicas", newTemplate: "Nueva actividad típica", basics: "1. Datos básicos", eventParameters: "2. Parámetros del evento", linkedObjects: "3. Objetos de observación vinculados", dynamics: "4. Dinámica del estado", save: "Guardar nueva versión" };
COPY.cs = { ...COPY.en, title: "Typické aktivity a objekty pozorování", intro: "Typickou aktivitu nastavte jednou. Skutečná událost zůstává jedním záznamem a propojené objekty a parametry se virtuálně odvozují z profilu.", listTitle: "Moje typické aktivity", newTemplate: "Nová typická aktivita", basics: "1. Základní údaje", eventParameters: "2. Parametry události", linkedObjects: "3. Propojené objekty pozorování", dynamics: "4. Dynamika stavu", save: "Uložit novou verzi" };

const PARAMETER_DEFS: Array<{
  code: ActivityProfileParameterCode;
  titleKey: "process" | "repetitions" | "distance" | "durationSeconds";
  unitCode: string;
}> = [
  { code: "process_count", titleKey: "process", unitCode: "process" },
  { code: "repetition_count", titleKey: "repetitions", unitCode: "repetition" },
  { code: "distance_m", titleKey: "distance", unitCode: "m" },
  { code: "duration_seconds", titleKey: "durationSeconds", unitCode: "s" },
];

const RELATIONS: ActivityProfileRelationCode[] = ["affects", "uses", "supports", "inhibits", "observes"];
const AGGREGATIONS: ActivityProfileAggregationCode[] = ["copy", "count", "sum", "max", "min", "avg"];

function emptyAnalytics(): AnalyticsDraft {
  return {
    accumulatedUnitCode: "effect_point",
    calculationMode: "baseline_plus_facts",
    sourceParameterCode: "process_count",
    baselineValue: "0",
    targetValue: "",
    criticalValue: "",
    desiredDirection: "increase",
    refreshPeriodDays: "",
    inactivityDelta: "0",
    trendWindowDays: "30",
  };
}

function numberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ActivityTemplateImpactProfileEditor({ locale }: { locale: LocaleCode }) {
  const copy = COPY[locale];
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [versionNo, setVersionNo] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [templateGroup, setTemplateGroup] = useState("general");
  const [defaultDurationMinutes, setDefaultDurationMinutes] = useState("");
  const [profileNotes, setProfileNotes] = useState("");
  const [enabledParameters, setEnabledParameters] = useState<Set<ActivityProfileParameterCode>>(new Set(["process_count"]));
  const [links, setLinks] = useState<LinkDraft[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SelectorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [analyticsOpen, setAnalyticsOpen] = useState<string | null>(null);
  const [analyticsDrafts, setAnalyticsDrafts] = useState<Record<string, AnalyticsDraft>>({});
  const [analyticsBusy, setAnalyticsBusy] = useState<string | null>(null);

  const resetEditor = useCallback(() => {
    setSelectedId(null);
    setVersionNo(null);
    setTitle("");
    setDescription("");
    setTemplateGroup("general");
    setDefaultDurationMinutes("");
    setProfileNotes("");
    setEnabledParameters(new Set(["process_count"]));
    setLinks([]);
    setMessage("");
  }, []);

  const loadTemplates = useCallback(async () => {
    const response = await fetch("/api/activity-template-impact-profiles", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok || payload?.ok !== true) throw new Error(payload?.error || "Template load failed");
    setTemplates(payload.templates ?? []);
  }, []);

  useEffect(() => {
    void (async () => {
      try { await loadTemplates(); } catch (error) { setMessage(error instanceof Error ? error.message : "Load failed"); }
      finally { setLoading(false); }
    })();
  }, [loadTemplates]);

  async function localizePinned(objectIds: string[]) {
    if (objectIds.length === 0) return new Map<string, SelectorItem>();
    const params = new URLSearchParams({ level: "leaf", includeGlobal: "1", limit: "120", locale, pinnedIds: objectIds.join(",") });
    const response = await fetch(`/api/value-objects/selector?${params.toString()}`, { cache: "no-store" });
    const payload = await response.json();
    const rows = (payload?.pinnedValueObjects ?? []) as SelectorItem[];
    return new Map(rows.map((row) => [row.id, row]));
  }

  async function openTemplate(templateId: string) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/activity-template-impact-profiles/${templateId}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || payload?.ok !== true) throw new Error(payload?.error || "Template load failed");
      setSelectedId(templateId);
      setTitle(payload.template.title ?? "");
      setDescription(payload.template.description ?? "");
      setTemplateGroup(payload.template.template_group ?? "general");
      setDefaultDurationMinutes(payload.template.default_duration_minutes == null ? "" : String(payload.template.default_duration_minutes));
      setProfileNotes(payload.profile?.notes ?? "");
      setVersionNo(payload.profile?.version_no ?? null);

      const parameterById = new Map<string, ActivityProfileParameterCode>();
      const enabled = new Set<ActivityProfileParameterCode>(["process_count"]);
      for (const parameter of payload.parameters ?? []) {
        parameterById.set(parameter.id, parameter.parameter_code);
        enabled.add(parameter.parameter_code);
      }
      setEnabledParameters(enabled);

      const rawLinks = payload.links ?? [];
      const names = await localizePinned(rawLinks.map((row: { target_value_object_id: string }) => row.target_value_object_id));
      const routeRows = payload.routes ?? [];
      setLinks(rawLinks.map((row: { id: string; target_value_object_id: string; relation_code: ActivityProfileRelationCode; confidence: number; notes: string | null }) => {
        const object = names.get(row.target_value_object_id);
        const routes: RouteDraft[] = routeRows
          .filter((route: { profile_object_link_id: string }) => route.profile_object_link_id === row.id)
          .flatMap((route: { profile_parameter_id: string; target_parameter_code: string; aggregation_code: ActivityProfileAggregationCode }) => {
            const sourceParameterCode = parameterById.get(route.profile_parameter_id);
            return sourceParameterCode ? [{ sourceParameterCode, targetParameterCode: route.target_parameter_code, aggregationCode: route.aggregation_code }] : [];
          });
        return { targetValueObjectId: row.target_value_object_id, title: object?.title ?? row.target_value_object_id, pathText: object?.pathText ?? "", relationCode: row.relation_code, confidence: Number(row.confidence), notes: row.notes ?? "", routes };
      }));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Load failed"); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    const query = search.trim();
    if (query.length < 2) return;
    const timer = window.setTimeout(() => {
      void (async () => {
        const params = new URLSearchParams({ q: query, level: "leaf", includeGlobal: "1", limit: "30", locale });
        const response = await fetch(`/api/value-objects/selector?${params.toString()}`, { cache: "no-store" });
        const payload = await response.json();
        if (response.ok && payload?.ok === true) setSearchResults(payload.valueObjects ?? []);
      })();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, locale]);

  const enabledParameterList = useMemo(() => PARAMETER_DEFS.filter((item) => enabledParameters.has(item.code)), [enabledParameters]);

  function toggleParameter(code: ActivityProfileParameterCode) {
    if (code === "process_count") return;
    setEnabledParameters((current) => {
      const next = new Set(current);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
    setLinks((current) => current.map((link) => ({ ...link, routes: link.routes.filter((route) => route.sourceParameterCode === "process_count" || route.sourceParameterCode !== code) })));
  }

  function addObject(item: SelectorItem) {
    if (links.some((link) => link.targetValueObjectId === item.id)) return;
    setLinks((current) => [...current, {
      targetValueObjectId: item.id,
      title: item.title,
      pathText: item.pathText,
      relationCode: "affects",
      confidence: 1,
      notes: "",
      routes: [{ sourceParameterCode: "process_count", targetParameterCode: "process_count", aggregationCode: "count" }],
    }]);
  }

  function patchLink(id: string, patch: Partial<LinkDraft>) {
    setLinks((current) => current.map((link) => link.targetValueObjectId === id ? { ...link, ...patch } : link));
  }

  function setRouteEnabled(link: LinkDraft, code: ActivityProfileParameterCode, enabled: boolean) {
    if (code === "process_count") return;
    const without = link.routes.filter((route) => route.sourceParameterCode !== code);
    patchLink(link.targetValueObjectId, { routes: enabled ? [...without, { sourceParameterCode: code, targetParameterCode: code, aggregationCode: "sum" }] : without });
  }

  function patchRoute(link: LinkDraft, code: ActivityProfileParameterCode, patch: Partial<RouteDraft>) {
    patchLink(link.targetValueObjectId, { routes: link.routes.map((route) => route.sourceParameterCode === code ? { ...route, ...patch } : route) });
  }

  async function saveTemplate() {
    setBusy(true); setMessage("");
    try {
      const parameters = enabledParameterList.map((item, index) => ({ parameterCode: item.code, title: copy[item.titleKey], unitCode: item.unitCode, isRequired: item.code === "process_count", displayOrder: (index + 1) * 10 }));
      const body = {
        title,
        description,
        templateGroup,
        defaultDurationMinutes: numberOrNull(defaultDurationMinutes),
        notes: profileNotes,
        parameters,
        links: links.map((link) => ({
          targetValueObjectId: link.targetValueObjectId,
          relationCode: link.relationCode,
          confidence: link.confidence,
          notes: link.notes,
          routes: link.routes,
        })),
      };
      const url = selectedId ? `/api/activity-template-impact-profiles/${selectedId}` : "/api/activity-template-impact-profiles";
      const response = await fetch(url, { method: selectedId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok || payload?.ok !== true) throw new Error(payload?.error || "Save failed");
      const templateId = payload.result?.templateId ?? selectedId;
      setMessage(copy.saved);
      await loadTemplates();
      if (templateId) await openTemplate(templateId);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Save failed"); }
    finally { setBusy(false); }
  }

  async function loadAnalytics(objectId: string) {
    setAnalyticsBusy(objectId); setMessage("");
    try {
      const response = await fetch(`/api/value-objects/${objectId}/analytics-profile`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || payload?.ok !== true) throw new Error(payload?.error || "Analytics load failed");
      const profile = payload.profile;
      setAnalyticsDrafts((current) => ({ ...current, [objectId]: profile ? {
        accumulatedUnitCode: profile.accumulated_unit_code,
        calculationMode: profile.calculation_mode,
        sourceParameterCode: profile.source_parameter_code,
        baselineValue: String(profile.baseline_value),
        targetValue: profile.target_value == null ? "" : String(profile.target_value),
        criticalValue: profile.critical_value == null ? "" : String(profile.critical_value),
        desiredDirection: profile.desired_direction,
        refreshPeriodDays: profile.refresh_period_days == null ? "" : String(profile.refresh_period_days),
        inactivityDelta: String(profile.inactivity_delta),
        trendWindowDays: String(profile.trend_window_days),
      } : emptyAnalytics() }));
      setAnalyticsOpen(objectId);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Analytics load failed"); }
    finally { setAnalyticsBusy(null); }
  }

  async function saveAnalytics(objectId: string) {
    const draft = analyticsDrafts[objectId]; if (!draft) return;
    setAnalyticsBusy(objectId); setMessage("");
    try {
      const response = await fetch(`/api/value-objects/${objectId}/analytics-profile`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
          accumulatedUnitCode: draft.accumulatedUnitCode,
          calculationMode: draft.calculationMode,
          sourceParameterCode: draft.sourceParameterCode,
          baselineValue: numberOrNull(draft.baselineValue) ?? 0,
          targetValue: numberOrNull(draft.targetValue),
          criticalValue: numberOrNull(draft.criticalValue),
          desiredDirection: draft.desiredDirection,
          refreshPeriodDays: draft.refreshPeriodDays.trim() ? numberOrNull(draft.refreshPeriodDays) : null,
          inactivityDelta: numberOrNull(draft.inactivityDelta) ?? 0,
          trendWindowDays: numberOrNull(draft.trendWindowDays) ?? 30,
        }),
      });
      const payload = await response.json();
      if (!response.ok || payload?.ok !== true) throw new Error(payload?.error || "Analytics save failed");
      setMessage(copy.saved);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Analytics save failed"); }
    finally { setAnalyticsBusy(null); }
  }

  function patchAnalytics(objectId: string, patch: Partial<AnalyticsDraft>) {
    setAnalyticsDrafts((current) => ({ ...current, [objectId]: { ...(current[objectId] ?? emptyAnalytics()), ...patch } }));
  }

  return (
    <main className="min-h-full bg-[#f5f6fb] p-4 text-[#1a1d2e] sm:p-6">
      <div className="mx-auto grid w-full max-w-[1180px] gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-[24px] border border-black/[0.07] bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:self-start">
          <h2 className="text-[16px] font-bold">{copy.listTitle}</h2>
          <button type="button" onClick={resetEditor} className="mt-3 w-full rounded-xl bg-[#3b6ef8] px-3 py-2.5 text-[13px] font-bold text-white">+ {copy.newTemplate}</button>
          <div className="mt-4 grid gap-2">
            {loading ? <p className="text-[13px] text-[#6b7280]">{copy.loading}</p> : null}
            {!loading && templates.length === 0 ? <p className="text-[13px] text-[#6b7280]">{copy.empty}</p> : null}
            {templates.map((template) => (
              <button key={template.id} type="button" onClick={() => void openTemplate(template.id)} className={`rounded-xl border p-3 text-left ${selectedId === template.id ? "border-[#3b6ef8] bg-[#f3f6ff]" : "border-[#e5e7eb] bg-white"}`}>
                <div className="text-[13px] font-bold">{template.title}</div>
                <div className="mt-1 text-[11px] text-[#7c8099]">{template.activeProfile ? `${copy.version} ${template.activeProfile.versionNo} · ${template.activeProfile.objectCount} ЦО/ОН` : "—"}</div>
              </button>
            ))}
          </div>
        </aside>

        <div className="grid min-w-0 gap-5">
          <section className="rounded-[26px] border border-black/[0.07] bg-white p-5 shadow-sm sm:p-6">
            <h1 className="text-[26px] font-bold text-[#111827]">{copy.title}</h1>
            <p className="mt-2 max-w-[820px] text-[14px] leading-6 text-[#5a5f7a]">{copy.intro}</p>
            {versionNo ? <div className="mt-3 inline-flex rounded-full bg-[#eef2ff] px-3 py-1 text-[11px] font-bold text-[#3b6ef8]">{copy.version} {versionNo}</div> : null}
          </section>

          <section className="rounded-[26px] border border-black/[0.07] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-[18px] font-bold">{copy.basics}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label={copy.name} help={copy.nameHelp}><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={180} className="input" /></Field>
              <Field label={copy.group} help={copy.groupHelp}><input value={templateGroup} onChange={(e) => setTemplateGroup(e.target.value)} maxLength={80} className="input" /></Field>
              <Field label={copy.duration} help={copy.durationHelp}><input value={defaultDurationMinutes} onChange={(e) => setDefaultDurationMinutes(e.target.value)} inputMode="numeric" className="input" /></Field>
              <div />
              <Field label={copy.description} help={copy.descriptionHelp} wide><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={4000} className="input resize-y" /></Field>
              <Field label={copy.profileNotes} help={copy.profileNotesHelp} wide><textarea value={profileNotes} onChange={(e) => setProfileNotes(e.target.value)} rows={3} maxLength={4000} className="input resize-y" /></Field>
            </div>
          </section>

          <section className="rounded-[26px] border border-black/[0.07] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-[18px] font-bold">{copy.eventParameters}</h2>
            <p className="mt-2 text-[13px] leading-5 text-[#6b7280]">{copy.eventParametersHelp}</p>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-[#e5e7eb]">
              <table className="w-full min-w-[580px] text-left text-[13px]"><thead className="bg-[#f8f9fc] text-[#555b73]"><tr><th className="p-3">{copy.enabled}</th><th className="p-3">{copy.sourceParameter}</th><th className="p-3">Unit</th></tr></thead><tbody>
                {PARAMETER_DEFS.map((item) => <tr key={item.code} className="border-t border-[#eef0f5]"><td className="p-3"><input type="checkbox" checked={enabledParameters.has(item.code)} disabled={item.code === "process_count"} onChange={() => toggleParameter(item.code)} /> {item.code === "process_count" ? copy.requiredAlways : ""}</td><td className="p-3 font-semibold">{copy[item.titleKey]}</td><td className="p-3 text-[#6b7280]">{item.unitCode}</td></tr>)}
              </tbody></table>
            </div>
          </section>

          <section className="rounded-[26px] border border-black/[0.07] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-[18px] font-bold">{copy.linkedObjects}</h2>
            <p className="mt-2 text-[13px] leading-5 text-[#6b7280]">{copy.linkedObjectsHelp}</p>
            <label className="mt-4 block text-[13px] font-bold">{copy.searchObject}<input value={search} onChange={(e) => { const next = e.target.value; setSearch(next); if (next.trim().length < 2) setSearchResults([]); }} placeholder={copy.searchPlaceholder} className="input mt-2" /></label>
            {search.trim().length >= 2 ? <div className="mt-2 max-h-[260px] overflow-auto rounded-2xl border border-[#e5e7eb] bg-white p-2">{searchResults.length === 0 ? <p className="p-2 text-[12px] text-[#7c8099]">{copy.noSearch}</p> : searchResults.map((item) => <div key={item.id} className="flex items-start justify-between gap-3 border-b border-[#f0f1f5] p-2 last:border-0"><div><div className="text-[13px] font-semibold">{item.title}</div><div className="text-[11px] text-[#8a8fa5]">{item.pathText}</div></div><button type="button" onClick={() => addObject(item)} className="rounded-lg border border-[#cfd6ee] px-2 py-1 text-[11px] font-bold text-[#3b6ef8]">{copy.add}</button></div>)}</div> : null}

            <div className="mt-5 grid gap-4">
              {links.map((link) => {
                const analytics = analyticsDrafts[link.targetValueObjectId];
                return <article key={link.targetValueObjectId} className="rounded-2xl border border-[#dfe3f1] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-[15px] font-bold">{link.title}</h3><p className="mt-1 text-[11px] text-[#8a8fa5]">{link.pathText}</p></div><button type="button" onClick={() => setLinks((current) => current.filter((item) => item.targetValueObjectId !== link.targetValueObjectId))} className="text-[12px] font-semibold text-red-600">{copy.remove}</button></div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3"><Field label={copy.relation}><select value={link.relationCode} onChange={(e) => patchLink(link.targetValueObjectId, { relationCode: e.target.value as ActivityProfileRelationCode })} className="input">{RELATIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field><Field label={copy.confidence}><input type="number" min="0" max="1" step="0.05" value={link.confidence} onChange={(e) => patchLink(link.targetValueObjectId, { confidence: Math.max(0, Math.min(1, Number(e.target.value))) })} className="input" /></Field><Field label={copy.notes}><input value={link.notes} onChange={(e) => patchLink(link.targetValueObjectId, { notes: e.target.value })} className="input" /></Field></div>
                  <h4 className="mt-5 text-[13px] font-bold">{copy.routes}</h4><p className="mt-1 text-[12px] leading-5 text-[#7c8099]">{copy.routesHelp}</p>
                  <div className="mt-3 overflow-x-auto rounded-xl border border-[#eceef4]"><table className="w-full min-w-[690px] text-left text-[12px]"><thead className="bg-[#fafbff]"><tr><th className="p-2">{copy.enabled}</th><th className="p-2">{copy.sourceParameter}</th><th className="p-2">{copy.targetParameter}</th><th className="p-2">{copy.aggregation}</th></tr></thead><tbody>{enabledParameterList.map((param) => {
                    const route = link.routes.find((item) => item.sourceParameterCode === param.code);
                    const mandatory = param.code === "process_count";
                    return <tr key={param.code} className="border-t border-[#eef0f5]"><td className="p-2"><input type="checkbox" checked={Boolean(route) || mandatory} disabled={mandatory} onChange={(e) => setRouteEnabled(link, param.code, e.target.checked)} /></td><td className="p-2 font-semibold">{copy[param.titleKey]}</td><td className="p-2"><input disabled={!route && !mandatory} value={route?.targetParameterCode ?? param.code} onChange={(e) => patchRoute(link, param.code, { targetParameterCode: e.target.value })} className="input !py-2" /></td><td className="p-2"><select disabled={!route && !mandatory} value={route?.aggregationCode ?? (mandatory ? "count" : "sum")} onChange={(e) => patchRoute(link, param.code, { aggregationCode: e.target.value as ActivityProfileAggregationCode })} className="input !py-2">{AGGREGATIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select></td></tr>;
                  })}</tbody></table></div>
                  <div className="mt-4 rounded-xl bg-[#f8f9fc] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="text-[13px] font-bold">{copy.dynamics}</h4><p className="mt-1 max-w-[680px] text-[11px] leading-4 text-[#7c8099]">{copy.dynamicsHelp}</p></div><button type="button" onClick={() => analyticsOpen === link.targetValueObjectId ? setAnalyticsOpen(null) : void loadAnalytics(link.targetValueObjectId)} className="rounded-lg border border-[#cfd6ee] bg-white px-3 py-2 text-[11px] font-bold text-[#3b6ef8]">{analyticsBusy === link.targetValueObjectId ? copy.loading : copy.loadDynamics}</button></div>
                    {analyticsOpen === link.targetValueObjectId && analytics ? <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <Field label={copy.accumulatedUnit}><input value={analytics.accumulatedUnitCode} onChange={(e) => patchAnalytics(link.targetValueObjectId, { accumulatedUnitCode: e.target.value })} className="input" /></Field>
                      <Field label={copy.calculationMode}><select value={analytics.calculationMode} onChange={(e) => patchAnalytics(link.targetValueObjectId, { calculationMode: e.target.value as AnalyticsDraft["calculationMode"] })} className="input"><option value="latest_value">latest_value</option><option value="sum_facts">sum_facts</option><option value="baseline_plus_facts">baseline_plus_facts</option><option value="effect_rules">effect_rules</option></select></Field>
                      <Field label={copy.sourceParameterCode}><input value={analytics.sourceParameterCode} onChange={(e) => patchAnalytics(link.targetValueObjectId, { sourceParameterCode: e.target.value })} className="input" /></Field>
                      <Field label={copy.baseline}><input value={analytics.baselineValue} onChange={(e) => patchAnalytics(link.targetValueObjectId, { baselineValue: e.target.value })} inputMode="decimal" className="input" /></Field>
                      <Field label={copy.target}><input value={analytics.targetValue} onChange={(e) => patchAnalytics(link.targetValueObjectId, { targetValue: e.target.value })} inputMode="decimal" className="input" /></Field>
                      <Field label={copy.critical}><input value={analytics.criticalValue} onChange={(e) => patchAnalytics(link.targetValueObjectId, { criticalValue: e.target.value })} inputMode="decimal" className="input" /></Field>
                      <Field label={copy.direction}><select value={analytics.desiredDirection} onChange={(e) => patchAnalytics(link.targetValueObjectId, { desiredDirection: e.target.value as AnalyticsDraft["desiredDirection"] })} className="input"><option value="increase">increase</option><option value="decrease">decrease</option><option value="maintain">maintain</option></select></Field>
                      <Field label={copy.refreshDays}><input value={analytics.refreshPeriodDays} onChange={(e) => patchAnalytics(link.targetValueObjectId, { refreshPeriodDays: e.target.value })} inputMode="numeric" className="input" /></Field>
                      <Field label={copy.inactivityDelta}><input value={analytics.inactivityDelta} onChange={(e) => patchAnalytics(link.targetValueObjectId, { inactivityDelta: e.target.value })} inputMode="decimal" className="input" /></Field>
                      <Field label={copy.trendDays}><input value={analytics.trendWindowDays} onChange={(e) => patchAnalytics(link.targetValueObjectId, { trendWindowDays: e.target.value })} inputMode="numeric" className="input" /></Field>
                      <div className="sm:col-span-2 lg:col-span-3"><p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-4 text-amber-900">{copy.dynamicRuntimeNotice}</p><button type="button" onClick={() => void saveAnalytics(link.targetValueObjectId)} className="mt-3 rounded-xl bg-[#27314f] px-4 py-2 text-[12px] font-bold text-white">{analyticsBusy === link.targetValueObjectId ? copy.saving : copy.saveDynamics}</button></div>
                    </div> : null}
                  </div>
                </article>;
              })}
            </div>
          </section>

          {message ? <div className="rounded-xl border border-[#dbe2f5] bg-white p-3 text-[13px] font-semibold">{message}</div> : null}
          <button type="button" disabled={busy || !title.trim()} onClick={() => void saveTemplate()} className="w-full rounded-xl bg-[#3b6ef8] px-4 py-3 text-[14px] font-bold text-white disabled:opacity-50">{busy ? copy.saving : copy.save}</button>
        </div>
      </div>
      <style jsx global>{`.input{width:100%;border:1px solid #dfe3f1;border-radius:.75rem;padding:.7rem .8rem;font-size:13px;outline:none;background:white}.input:focus{border-color:#3b6ef8}.input:disabled{background:#f4f5f8;color:#8a8fa5}`}</style>
    </main>
  );
}

function Field({ label, help, wide, children }: { label: string; help?: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={`block text-[13px] font-bold text-[#343854] ${wide ? "sm:col-span-2" : ""}`}><span>{label}</span>{help ? <span className="mt-1 block text-[11px] font-normal leading-4 text-[#7c8099]">{help}</span> : null}<span className="mt-2 block">{children}</span></label>;
}

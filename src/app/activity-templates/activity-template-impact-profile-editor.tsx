"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ActivityParameterAdminCatalog } from "./activity-parameter-admin-catalog";
import {
  getActivityParameterPresentation,
  getActivityUnitLabel,
} from "@/lib/activity/activity-parameter-presentation";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type TemplateListItem = {
  id: string;
  title: string;
  description: string | null;
  defaultDurationMinutes: number | null;
  activeProfile: {
    id: string;
    versionNo: number;
    routingContractCode: string;
    parameterCount: number;
    objectCount: number;
  } | null;
};

type ParameterItem = {
  id: string;
  scopeCode: string;
  parameterCode: string;
  title: string;
  description: string | null;
  dimensionCode: string;
  valueTypeCode: string;
  canonicalUnitCode: string;
};

type SelectorItem = {
  id: string;
  title: string;
  pathText: string;
  scopeCode: string | null;
  level: "root" | "intermediate" | "leaf";
};

type GroupCode =
  | "time"
  | "count"
  | "movement"
  | "massVolume"
  | "nutritionEnergy"
  | "money"
  | "physiology"
  | "scoresStates"
  | "other";

type Copy = {
  pageTitle: string;
  pageIntro: string;
  listTitle: string;
  newTemplate: string;
  empty: string;
  name: string;
  namePlaceholder: string;
  duration: string;
  durationSuffix: string;
  durationHelp: string;
  parameters: string;
  parametersHelp: string;
  parameterPlaceholder: string;
  noParameters: string;
  linkedObjects: string;
  linkedObjectsHelp: string;
  objectPlaceholder: string;
  typeMore: string;
  noObjects: string;
  nonLeafOnly: string;
  nodeRole: Record<"root" | "intermediate" | "leaf", string>;
  openInfo: string;
  fullCard: string;
  path: string;
  close: string;
  advanced: string;
  description: string;
  notes: string;
  legacyTitle: string;
  legacyBody: string;
  saveNew: string;
  saveVersion: string;
  saving: string;
  saved: string;
  cancel: string;
  loading: string;
  group: Record<GroupCode, string>;
};

const COPY: Record<LocaleCode, Copy> = {
  ru: {
    pageTitle: "Типовые активности",
    pageIntro:
      "Настройте повторяющуюся активность один раз: обычную длительность, возможные параметры и связанные ЦО/ОН.",
    listTitle: "Мои типовые активности",
    newTemplate: "Новая типовая активность",
    empty: "Типовых активностей пока нет.",
    name: "Название",
    namePlaceholder: "Например: Обед",
    duration: "Обычно длится",
    durationSuffix: "мин",
    durationHelp:
      "Это значение используется только как типовое, если в конкретной активности длительность не сообщена явно.",
    parameters: "Что обычно можно учитывать",
    parametersHelp:
      "Выберите показатели, которые могут встречаться в сообщении, устройстве или ручной записи.",
    parameterPlaceholder: "Выберите или начните вводить параметр…",
    noParameters: "Подходящих параметров нет.",
    linkedObjects: "На какие ЦО/ОН обычно влияет",
    linkedObjectsHelp:
      "Начните вводить название листового объекта. Выбранные объекты появятся ниже.",
    objectPlaceholder: "Начните вводить название ЦО/ОН…",
    typeMore: "Введите минимум 2 символа.",
    noObjects: "Ничего не найдено.",
    nonLeafOnly: "Найдены только корневые или промежуточные объекты. Для прямой привязки параметров выберите листовой объект.",
    nodeRole: { root: "корень", intermediate: "промежуточный", leaf: "лист" },
    openInfo: "Открыть",
    fullCard: "Полная карточка",
    path: "Маршрут",
    close: "Закрыть",
    advanced: "Дополнительно",
    description: "Описание",
    notes: "Заметка к версии",
    legacyTitle: "Старая версия профиля",
    legacyBody:
      "Связанные ЦО/ОН загружены, но старые параметры V1 не преобразуются автоматически. Перед сохранением новой версии выберите актуальные параметры из общего реестра.",
    saveNew: "Сохранить",
    saveVersion: "Сохранить новую версию",
    saving: "Сохраняю…",
    saved: "Сохранено",
    cancel: "Отмена",
    loading: "Загрузка…",
    group: {
      time: "Время",
      count: "Количество",
      movement: "Движение",
      massVolume: "Масса и объём",
      nutritionEnergy: "Питание и энергия",
      money: "Деньги",
      physiology: "Физиологические показатели",
      scoresStates: "Оценки и состояния",
      other: "Другие",
    },
  },
  uk: {
    pageTitle: "Типові активності",
    pageIntro:
      "Налаштуйте повторювану активність один раз: типову тривалість, можливі параметри та пов’язані ЦО/ОН.",
    listTitle: "Мої типові активності",
    newTemplate: "Нова типова активність",
    empty: "Типових активностей ще немає.",
    name: "Назва",
    namePlaceholder: "Наприклад: Обід",
    duration: "Зазвичай триває",
    durationSuffix: "хв",
    durationHelp:
      "Типове значення використовується лише якщо конкретну тривалість не повідомлено явно.",
    parameters: "Що зазвичай можна враховувати",
    parametersHelp: "Виберіть показники, які реально можуть бути зафіксовані.",
    parameterPlaceholder: "Виберіть або почніть вводити параметр…",
    noParameters: "Параметрів не знайдено.",
    linkedObjects: "На які ЦО/ОН зазвичай впливає",
    linkedObjectsHelp: "Почніть вводити назву листового об’єкта.",
    objectPlaceholder: "Почніть вводити назву ЦО/ОН…",
    typeMore: "Введіть щонайменше 2 символи.",
    noObjects: "Нічого не знайдено.",
    nonLeafOnly: "Знайдено лише кореневі або проміжні об’єкти. Для прямої прив’язки параметрів виберіть листовий об’єкт.",
    nodeRole: { root: "корінь", intermediate: "проміжний", leaf: "лист" },
    openInfo: "Відкрити",
    fullCard: "Повна картка",
    path: "Маршрут",
    close: "Закрити",
    advanced: "Додатково",
    description: "Опис",
    notes: "Нотатка до версії",
    legacyTitle: "Стара версія профілю",
    legacyBody:
      "ЦО/ОН завантажені, але старі параметри V1 не переносяться автоматично. Виберіть актуальні параметри перед збереженням.",
    saveNew: "Зберегти",
    saveVersion: "Зберегти нову версію",
    saving: "Зберігаю…",
    saved: "Збережено",
    cancel: "Скасувати",
    loading: "Завантаження…",
    group: {
      time: "Час",
      count: "Кількість",
      movement: "Рух",
      massVolume: "Маса й об’єм",
      nutritionEnergy: "Харчування та енергія",
      money: "Гроші",
      physiology: "Фізіологічні показники",
      scoresStates: "Оцінки та стани",
      other: "Інші",
    },
  },
  pl: {
    pageTitle: "Aktywności typowe",
    pageIntro:
      "Skonfiguruj aktywność powtarzalną raz: typowy czas, możliwe parametry i powiązane obiekty obserwacji.",
    listTitle: "Moje aktywności typowe",
    newTemplate: "Nowa aktywność typowa",
    empty: "Brak aktywności typowych.",
    name: "Nazwa",
    namePlaceholder: "Np. Obiad",
    duration: "Zwykle trwa",
    durationSuffix: "min",
    durationHelp:
      "Wartość typowa jest używana tylko wtedy, gdy konkretny czas nie został podany jawnie.",
    parameters: "Co zwykle można uwzględnić",
    parametersHelp: "Wybierz wskaźniki, które mogą być rzeczywiście obserwowane.",
    parameterPlaceholder: "Wybierz lub zacznij wpisywać parametr…",
    noParameters: "Brak pasujących parametrów.",
    linkedObjects: "Na jakie obiekty zwykle wpływa",
    linkedObjectsHelp: "Zacznij wpisywać nazwę obiektu liściowego.",
    objectPlaceholder: "Zacznij wpisywać nazwę obiektu…",
    typeMore: "Wpisz co najmniej 2 znaki.",
    noObjects: "Nic nie znaleziono.",
    nonLeafOnly: "Znaleziono tylko obiekty główne lub pośrednie. Do bezpośredniego przypisania parametrów wybierz obiekt liściowy.",
    nodeRole: { root: "korzeń", intermediate: "pośredni", leaf: "liść" },
    openInfo: "Otwórz",
    fullCard: "Pełna karta",
    path: "Ścieżka",
    close: "Zamknij",
    advanced: "Dodatkowo",
    description: "Opis",
    notes: "Notatka wersji",
    legacyTitle: "Starsza wersja profilu",
    legacyBody:
      "Powiązane obiekty zostały wczytane, ale parametry V1 nie są migrowane automatycznie. Wybierz aktualne parametry przed zapisem.",
    saveNew: "Zapisz",
    saveVersion: "Zapisz nową wersję",
    saving: "Zapisywanie…",
    saved: "Zapisano",
    cancel: "Anuluj",
    loading: "Ładowanie…",
    group: {
      time: "Czas",
      count: "Liczba",
      movement: "Ruch",
      massVolume: "Masa i objętość",
      nutritionEnergy: "Żywienie i energia",
      money: "Pieniądze",
      physiology: "Wskaźniki fizjologiczne",
      scoresStates: "Oceny i stany",
      other: "Inne",
    },
  },
  en: {
    pageTitle: "Typical activities",
    pageIntro:
      "Configure a reusable activity once: typical duration, measurable parameters and linked observation objects.",
    listTitle: "My typical activities",
    newTemplate: "New typical activity",
    empty: "No typical activities yet.",
    name: "Name",
    namePlaceholder: "For example: Lunch",
    duration: "Usually lasts",
    durationSuffix: "min",
    durationHelp:
      "The default is used only when the concrete activity did not state duration explicitly.",
    parameters: "What can usually be captured",
    parametersHelp: "Choose measurements that can actually appear in an event.",
    parameterPlaceholder: "Choose or start typing a parameter…",
    noParameters: "No matching parameters.",
    linkedObjects: "Observation objects usually affected",
    linkedObjectsHelp: "Start typing the name of a leaf observation object.",
    objectPlaceholder: "Start typing an observation object…",
    typeMore: "Enter at least 2 characters.",
    noObjects: "No results.",
    nonLeafOnly: "Only root or intermediate objects matched. Direct parameter links require a leaf object.",
    nodeRole: { root: "root", intermediate: "intermediate", leaf: "leaf" },
    openInfo: "Open",
    fullCard: "Full card",
    path: "Path",
    close: "Close",
    advanced: "Advanced",
    description: "Description",
    notes: "Version note",
    legacyTitle: "Legacy profile version",
    legacyBody:
      "Linked objects were loaded, but V1 parameters are not migrated automatically. Select current registry parameters before saving.",
    saveNew: "Save",
    saveVersion: "Save new version",
    saving: "Saving…",
    saved: "Saved",
    cancel: "Cancel",
    loading: "Loading…",
    group: {
      time: "Time",
      count: "Count",
      movement: "Movement",
      massVolume: "Mass and volume",
      nutritionEnergy: "Nutrition and energy",
      money: "Money",
      physiology: "Physiological measures",
      scoresStates: "Scores and states",
      other: "Other",
    },
  },
  de: {
    pageTitle: "Typische Aktivitäten",
    pageIntro:
      "Eine wiederverwendbare Aktivität einmal konfigurieren: typische Dauer, Parameter und verknüpfte Beobachtungsobjekte.",
    listTitle: "Meine typischen Aktivitäten",
    newTemplate: "Neue typische Aktivität",
    empty: "Noch keine typischen Aktivitäten.",
    name: "Name",
    namePlaceholder: "Zum Beispiel: Mittagessen",
    duration: "Dauert gewöhnlich",
    durationSuffix: "Min",
    durationHelp:
      "Der Standardwert gilt nur, wenn die konkrete Dauer nicht ausdrücklich angegeben wurde.",
    parameters: "Was gewöhnlich erfasst werden kann",
    parametersHelp: "Messwerte auswählen, die im Ereignis vorkommen können.",
    parameterPlaceholder: "Parameter wählen oder tippen…",
    noParameters: "Keine passenden Parameter.",
    linkedObjects: "Üblicherweise betroffene Objekte",
    linkedObjectsHelp: "Namen eines Blattobjekts eingeben.",
    objectPlaceholder: "Beobachtungsobjekt eingeben…",
    typeMore: "Mindestens 2 Zeichen eingeben.",
    noObjects: "Keine Ergebnisse.",
    nonLeafOnly: "Es wurden nur Stamm- oder Zwischenobjekte gefunden. Direkte Parameterverknüpfungen benötigen ein Blattobjekt.",
    nodeRole: { root: "Stamm", intermediate: "Zwischenobjekt", leaf: "Blatt" },
    openInfo: "Öffnen",
    fullCard: "Vollständige Karte",
    path: "Pfad",
    close: "Schließen",
    advanced: "Zusätzlich",
    description: "Beschreibung",
    notes: "Versionsnotiz",
    legacyTitle: "Alte Profilversion",
    legacyBody:
      "Verknüpfte Objekte wurden geladen; V1-Parameter werden nicht automatisch migriert. Bitte aktuelle Parameter neu auswählen.",
    saveNew: "Speichern",
    saveVersion: "Neue Version speichern",
    saving: "Speichern…",
    saved: "Gespeichert",
    cancel: "Abbrechen",
    loading: "Laden…",
    group: {
      time: "Zeit",
      count: "Anzahl",
      movement: "Bewegung",
      massVolume: "Masse und Volumen",
      nutritionEnergy: "Ernährung und Energie",
      money: "Geld",
      physiology: "Physiologische Werte",
      scoresStates: "Bewertungen und Zustände",
      other: "Andere",
    },
  },
  es: {
    pageTitle: "Actividades típicas",
    pageIntro:
      "Configure una actividad reutilizable una vez: duración típica, parámetros y objetos de observación relacionados.",
    listTitle: "Mis actividades típicas",
    newTemplate: "Nueva actividad típica",
    empty: "Todavía no hay actividades típicas.",
    name: "Nombre",
    namePlaceholder: "Por ejemplo: Almuerzo",
    duration: "Suele durar",
    durationSuffix: "min",
    durationHelp:
      "El valor típico solo se usa cuando la duración concreta no fue indicada explícitamente.",
    parameters: "Qué se puede registrar normalmente",
    parametersHelp: "Seleccione medidas que realmente puedan aparecer en el evento.",
    parameterPlaceholder: "Seleccione o escriba un parámetro…",
    noParameters: "No hay parámetros coincidentes.",
    linkedObjects: "Objetos normalmente afectados",
    linkedObjectsHelp: "Empiece a escribir el nombre de un objeto hoja.",
    objectPlaceholder: "Empiece a escribir un objeto…",
    typeMore: "Escriba al menos 2 caracteres.",
    noObjects: "Sin resultados.",
    nonLeafOnly: "Solo se encontraron objetos raíz o intermedios. Los enlaces directos de parámetros requieren un objeto hoja.",
    nodeRole: { root: "raíz", intermediate: "intermedio", leaf: "hoja" },
    openInfo: "Abrir",
    fullCard: "Ficha completa",
    path: "Ruta",
    close: "Cerrar",
    advanced: "Adicional",
    description: "Descripción",
    notes: "Nota de versión",
    legacyTitle: "Versión de perfil anterior",
    legacyBody:
      "Se cargaron los objetos, pero los parámetros V1 no se migran automáticamente. Seleccione parámetros actuales antes de guardar.",
    saveNew: "Guardar",
    saveVersion: "Guardar nueva versión",
    saving: "Guardando…",
    saved: "Guardado",
    cancel: "Cancelar",
    loading: "Cargando…",
    group: {
      time: "Tiempo",
      count: "Cantidad",
      movement: "Movimiento",
      massVolume: "Masa y volumen",
      nutritionEnergy: "Nutrición y energía",
      money: "Dinero",
      physiology: "Medidas fisiológicas",
      scoresStates: "Puntuaciones y estados",
      other: "Otros",
    },
  },
  cs: {
    pageTitle: "Typické aktivity",
    pageIntro:
      "Nastavte opakovanou aktivitu jednou: obvyklou délku, parametry a propojené objekty pozorování.",
    listTitle: "Moje typické aktivity",
    newTemplate: "Nová typická aktivita",
    empty: "Zatím nejsou žádné typické aktivity.",
    name: "Název",
    namePlaceholder: "Například: Oběd",
    duration: "Obvykle trvá",
    durationSuffix: "min",
    durationHelp:
      "Výchozí hodnota se použije jen tehdy, když konkrétní délka nebyla uvedena.",
    parameters: "Co lze obvykle sledovat",
    parametersHelp: "Vyberte měření, která se mohou v události skutečně objevit.",
    parameterPlaceholder: "Vyberte nebo napište parametr…",
    noParameters: "Žádné odpovídající parametry.",
    linkedObjects: "Obvykle ovlivněné objekty",
    linkedObjectsHelp: "Začněte psát název listového objektu.",
    objectPlaceholder: "Začněte psát objekt…",
    typeMore: "Zadejte alespoň 2 znaky.",
    noObjects: "Nic nenalezeno.",
    nonLeafOnly: "Byly nalezeny pouze kořenové nebo mezilehlé objekty. Přímé přiřazení parametrů vyžaduje listový objekt.",
    nodeRole: { root: "kořen", intermediate: "mezilehlý", leaf: "list" },
    openInfo: "Otevřít",
    fullCard: "Úplná karta",
    path: "Cesta",
    close: "Zavřít",
    advanced: "Další",
    description: "Popis",
    notes: "Poznámka k verzi",
    legacyTitle: "Starší verze profilu",
    legacyBody:
      "Propojené objekty byly načteny, ale parametry V1 se automaticky nepřevádějí. Před uložením vyberte aktuální parametry.",
    saveNew: "Uložit",
    saveVersion: "Uložit novou verzi",
    saving: "Ukládání…",
    saved: "Uloženo",
    cancel: "Zrušit",
    loading: "Načítání…",
    group: {
      time: "Čas",
      count: "Počet",
      movement: "Pohyb",
      massVolume: "Hmotnost a objem",
      nutritionEnergy: "Výživa a energie",
      money: "Peníze",
      physiology: "Fyziologické ukazatele",
      scoresStates: "Hodnocení a stavy",
      other: "Ostatní",
    },
  },
};

function groupCode(item: ParameterItem): GroupCode {
  if (item.dimensionCode === "time") return "time";
  if (item.dimensionCode === "count") return "count";
  if (item.dimensionCode === "distance") return "movement";
  if (item.dimensionCode === "mass" || item.dimensionCode === "volume") {
    return "massVolume";
  }
  if (item.dimensionCode === "energy") return "nutritionEnergy";
  if (item.dimensionCode === "money") return "money";
  if (
    item.dimensionCode === "temperature" ||
    item.parameterCode.includes("heart") ||
    item.parameterCode.includes("pulse") ||
    item.parameterCode.includes("blood_pressure")
  ) {
    return "physiology";
  }
  if (item.dimensionCode === "rate") return "movement";
  if (item.dimensionCode === "score") return "scoresStates";
  return "other";
}

export function ActivityTemplateImpactProfileEditor({
  locale,
}: {
  locale: LocaleCode;
}) {
  const copy = COPY[locale] ?? COPY.en;
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [catalog, setCatalog] = useState<ParameterItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [parameterIds, setParameterIds] = useState<string[]>([]);
  const [objects, setObjects] = useState<SelectorItem[]>([]);
  const [parameterSearch, setParameterSearch] = useState("");
  const [parameterOpen, setParameterOpen] = useState(false);
  const [objectSearch, setObjectSearch] = useState("");
  const [objectResults, setObjectResults] = useState<SelectorItem[]>([]);
  const [nonLeafResults, setNonLeafResults] = useState<SelectorItem[]>([]);
  const [objectInfo, setObjectInfo] = useState<SelectorItem | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [legacyProfile, setLegacyProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const resetEditor = useCallback(() => {
    setSelectedId(null);
    setTitle("");
    setDuration("");
    setDescription("");
    setNotes("");
    setParameterIds([]);
    setObjects([]);
    setParameterSearch("");
    setParameterOpen(false);
    setObjectSearch("");
    setObjectResults([]);
    setNonLeafResults([]);
    setAdvancedOpen(false);
    setLegacyProfile(false);
    setMessage("");
  }, []);

  const loadTemplates = useCallback(async () => {
    const response = await fetch("/api/activity-template-impact-profiles", {
      cache: "no-store",
    });
    const payload = await response.json();

    if (!response.ok || payload?.ok !== true) {
      throw new Error(payload?.error || "Template load failed");
    }

    setTemplates(payload.templates ?? []);
  }, []);

  const loadCatalog = useCallback(async () => {
    const response = await fetch(
      "/api/activity-template-impact-profiles/catalog",
      { cache: "no-store" },
    );
    const payload = await response.json();

    if (!response.ok || payload?.ok !== true) {
      throw new Error(payload?.error || "Parameter catalog load failed");
    }

    setCatalog(
      ((payload.parameters ?? []) as ParameterItem[]).map((item) => {
        const presentation = getActivityParameterPresentation(
          item.parameterCode,
          locale,
          item.title,
          item.description,
        );
        return { ...item, title: presentation.title, description: presentation.description };
      }),
    );
  }, [locale]);

  useEffect(() => {
    const reload = () => {
      void loadCatalog().catch((error) =>
        setMessage(error instanceof Error ? error.message : "Parameter catalog load failed"),
      );
    };
    window.addEventListener("arctor:activity-parameter-catalog-changed", reload);
    return () => window.removeEventListener("arctor:activity-parameter-catalog-changed", reload);
  }, [loadCatalog]);

  useEffect(() => {
    void (async () => {
      try {
        await Promise.all([loadTemplates(), loadCatalog()]);
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Initial load failed",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [loadCatalog, loadTemplates]);

  useEffect(() => {
    const query = objectSearch.trim();

    if (query.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const leafParams = new URLSearchParams({
            q: query,
            level: "leaf",
            includeGlobal: "1",
            limit: "30",
            locale,
          });
          const leafResponse = await fetch(
            `/api/value-objects/selector?${leafParams.toString()}`,
            { cache: "no-store", signal: controller.signal },
          );
          const leafPayload = await leafResponse.json();
          if (!leafResponse.ok || leafPayload?.ok !== true) return;

          const selected = new Set(objects.map((item) => item.id));
          const leaves = ((leafPayload.valueObjects ?? []) as SelectorItem[]).filter(
            (item) => !selected.has(item.id),
          );
          setObjectResults(leaves);

          if (leaves.length > 0) {
            setNonLeafResults([]);
            return;
          }

          const allParams = new URLSearchParams({
            q: query,
            level: "all",
            includeGlobal: "1",
            limit: "12",
            locale,
          });
          const allResponse = await fetch(
            `/api/value-objects/selector?${allParams.toString()}`,
            { cache: "no-store", signal: controller.signal },
          );
          const allPayload = await allResponse.json();
          if (!allResponse.ok || allPayload?.ok !== true) return;
          setNonLeafResults(
            ((allPayload.valueObjects ?? []) as SelectorItem[])
              .filter((item) => item.level !== "leaf" && !selected.has(item.id))
              .slice(0, 6),
          );
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
        }
      })();
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [locale, objectSearch, objects]);

  const selectedParameters = useMemo(() => {
    const byId = new Map(catalog.map((item) => [item.id, item]));
    return parameterIds.flatMap((id) => {
      const item = byId.get(id);
      return item ? [item] : [];
    });
  }, [catalog, parameterIds]);

  const filteredParameterGroups = useMemo(() => {
    const query = parameterSearch.trim().toLocaleLowerCase();
    const selected = new Set(parameterIds);
    const groups = new Map<GroupCode, ParameterItem[]>();

    for (const item of catalog) {
      if (selected.has(item.id)) continue;

      const haystack = [
        item.title,
        item.parameterCode,
        item.description ?? "",
        item.canonicalUnitCode,
      ]
        .join(" ")
        .toLocaleLowerCase();

      if (query && !haystack.includes(query)) continue;

      const group = groupCode(item);
      groups.set(group, [...(groups.get(group) ?? []), item]);
    }

    const order: GroupCode[] = [
      "time",
      "count",
      "movement",
      "massVolume",
      "nutritionEnergy",
      "money",
      "physiology",
      "scoresStates",
      "other",
    ];

    return order.flatMap((group) => {
      const items = groups.get(group) ?? [];
      return items.length > 0 ? [{ group, items }] : [];
    });
  }, [catalog, parameterIds, parameterSearch]);

  async function localizePinned(ids: string[]) {
    if (ids.length === 0) return [];

    const params = new URLSearchParams({
      level: "leaf",
      includeGlobal: "1",
      limit: "120",
      locale,
      pinnedIds: ids.join(","),
    });
    const response = await fetch(
      `/api/value-objects/selector?${params.toString()}`,
      { cache: "no-store" },
    );
    const payload = await response.json();

    if (!response.ok || payload?.ok !== true) {
      throw new Error(payload?.error || "Object localization failed");
    }

    const rows = (payload.pinnedValueObjects ?? []) as SelectorItem[];
    const byId = new Map(rows.map((row) => [row.id, row]));

    return ids.map((id) => {
      const row = byId.get(id);
      return (
        row ?? {
          id,
          title: id,
          pathText: "",
          scopeCode: null,
          level: "leaf" as const,
        }
      );
    });
  }

  async function openTemplate(templateId: string) {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/activity-template-impact-profiles/${templateId}`,
        { cache: "no-store" },
      );
      const payload = await response.json();

      if (!response.ok || payload?.ok !== true) {
        throw new Error(payload?.error || "Template load failed");
      }

      setSelectedId(templateId);
      setTitle(payload.template.title ?? "");
      setDuration(
        payload.template.default_duration_minutes === null ||
          payload.template.default_duration_minutes === undefined
          ? ""
          : String(payload.template.default_duration_minutes),
      );
      setDescription(payload.template.description ?? "");
      setNotes(payload.profile?.notes ?? "");
      setParameterIds(payload.parameterDefinitionIds ?? []);
      setObjects(
        await localizePinned(payload.targetValueObjectIds ?? []),
      );
      setLegacyProfile(
        payload.profile?.routing_contract_code === "legacy_v1",
      );
      setAdvancedOpen(false);
      setParameterSearch("");
      setObjectSearch("");
      setObjectResults([]);
      setNonLeafResults([]);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Template load failed",
      );
    } finally {
      setBusy(false);
    }
  }

  function addParameter(id: string) {
    setParameterIds((current) =>
      current.includes(id) ? current : [...current, id],
    );
    setParameterSearch("");
  }

  function removeParameter(id: string) {
    setParameterIds((current) => current.filter((item) => item !== id));
  }

  function addObject(item: SelectorItem) {
    setObjects((current) =>
      current.some((candidate) => candidate.id === item.id)
        ? current
        : [...current, item],
    );
    setObjectSearch("");
    setObjectResults([]);
    setNonLeafResults([]);
  }

  function removeObject(id: string) {
    setObjects((current) => current.filter((item) => item.id !== id));
  }

  async function save() {
    if (!title.trim()) {
      setMessage(copy.name);
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const defaultDurationMinutes =
        duration.trim() === "" ? null : Number(duration);

      const body = {
        title,
        defaultDurationMinutes,
        description,
        notes,
        parameterDefinitionIds: parameterIds,
        targetValueObjectIds: objects.map((item) => item.id),
      };

      const url = selectedId
        ? `/api/activity-template-impact-profiles/${selectedId}`
        : "/api/activity-template-impact-profiles";

      const response = await fetch(url, {
        method: selectedId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();

      if (!response.ok || payload?.ok !== true) {
        throw new Error(payload?.error || "Save failed");
      }

      const templateId = payload.result?.templateId ?? selectedId;
      setMessage(copy.saved);
      setLegacyProfile(false);
      await loadTemplates();

      if (templateId) {
        await openTemplate(templateId);
        setMessage(copy.saved);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const pathSegments = objectInfo?.pathText
    ? objectInfo.pathText
        .split(/\s*(?:→|>|\/)\s*/u)
        .map((part) => part.trim())
        .filter(Boolean)
    : [];

  return (
    <main className="min-h-full bg-[#f5f6fb] p-3 text-[#1a1d2e] sm:p-5">
      <div className="mx-auto grid w-full max-w-[1120px] gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-[20px] border border-black/[0.07] bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:self-start">
          <h2 className="text-[15px] font-bold">{copy.listTitle}</h2>
          <button
            type="button"
            onClick={resetEditor}
            className="mt-3 w-full rounded-xl bg-[#3b6ef8] px-3 py-2.5 text-[13px] font-bold text-white"
          >
            + {copy.newTemplate}
          </button>

          <div className="mt-3 space-y-2">
            {loading ? (
              <p className="text-xs text-slate-500">{copy.loading}</p>
            ) : templates.length === 0 ? (
              <p className="text-xs text-slate-500">{copy.empty}</p>
            ) : (
              templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => void openTemplate(template.id)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                    selectedId === template.id
                      ? "border-[#3b6ef8]/40 bg-[#eef3ff]"
                      : "border-black/[0.07] bg-white hover:bg-slate-50"
                  }`}
                >
                  <span className="block text-[13px] font-semibold">
                    {template.title}
                  </span>
                  {template.activeProfile ? (
                    <span className="mt-1 block text-[11px] text-slate-500">
                      v{template.activeProfile.versionNo} ·{" "}
                      {template.activeProfile.parameterCount} ·{" "}
                      {template.activeProfile.objectCount}
                    </span>
                  ) : null}
                </button>
              ))
            )}
          </div>
        </aside>

        <section>
          <header className="mb-3 px-1">
            <h1 className="text-xl font-bold">{copy.pageTitle}</h1>
            <p className="mt-1 max-w-3xl text-[13px] leading-5 text-slate-500">
              {copy.pageIntro}
            </p>
          </header>

          <div className="rounded-[22px] border border-black/[0.07] bg-white p-4 shadow-sm sm:p-5">
            {legacyProfile ? (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                <p className="text-[13px] font-semibold text-amber-900">
                  {copy.legacyTitle}
                </p>
                <p className="mt-1 text-xs leading-5 text-amber-800">
                  {copy.legacyBody}
                </p>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_170px]">
              <label className="block">
                <span className="text-[13px] font-semibold">{copy.name}</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={copy.namePlaceholder}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#3b6ef8]"
                />
              </label>

              <label className="block">
                <span className="text-[13px] font-semibold">{copy.duration}</span>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={duration}
                    onChange={(event) => setDuration(event.target.value)}
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#3b6ef8]"
                  />
                  <span className="text-xs text-slate-500">
                    {copy.durationSuffix}
                  </span>
                </div>
              </label>
            </div>
            <p className="mt-1.5 text-[11px] leading-4 text-slate-400 sm:ml-auto sm:max-w-[420px]">
              {copy.durationHelp}
            </p>

            <div className="mt-5">
              <p className="text-[13px] font-semibold">{copy.parameters}</p>
              <p className="mt-0.5 text-[11px] leading-4 text-slate-400">
                {copy.parametersHelp}
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                {selectedParameters.map((parameter) => (
                  <span
                    key={parameter.id}
                    className="inline-flex items-center gap-1 rounded-full border border-[#3b6ef8]/20 bg-[#f1f5ff] px-3 py-1.5 text-xs font-medium text-[#315ccc]"
                  >
                    {parameter.title}
                    <button
                      type="button"
                      aria-label={`Remove ${parameter.title}`}
                      onClick={() => removeParameter(parameter.id)}
                      className="ml-0.5 rounded-full px-1 text-sm leading-none hover:bg-[#dfe8ff]"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <div className="relative mt-2">
                <input
                  value={parameterSearch}
                  onFocus={() => setParameterOpen(true)}
                  onClick={() => setParameterOpen(true)}
                  onChange={(event) => {
                    setParameterSearch(event.target.value);
                    setParameterOpen(true);
                  }}
                  placeholder={copy.parameterPlaceholder}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#3b6ef8]"
                />

                {parameterOpen ? (
                  <div className="absolute z-30 mt-1 max-h-[360px] w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                    <div className="flex justify-end px-1 pb-1">
                      <button
                        type="button"
                        onClick={() => setParameterOpen(false)}
                        className="text-[11px] text-slate-400 hover:text-slate-700"
                      >
                        {copy.close}
                      </button>
                    </div>
                    {filteredParameterGroups.length === 0 ? (
                      <p className="px-2 py-3 text-xs text-slate-500">
                        {copy.noParameters}
                      </p>
                    ) : (
                      filteredParameterGroups.map(({ group, items }) => (
                        <div key={group} className="mb-2 last:mb-0">
                          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            {copy.group[group]}
                          </div>
                          {items.map((parameter) => (
                            <button
                              key={parameter.id}
                              type="button"
                              onClick={() => addParameter(parameter.id)}
                              className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50"
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-[13px] font-medium">
                                  {parameter.title}
                                </span>
                                {parameter.description ? (
                                  <span className="mt-0.5 block truncate text-[11px] text-slate-400">
                                    {parameter.description}
                                  </span>
                                ) : null}
                              </span>
                              <span className="shrink-0 text-[10px] text-slate-400">
                                {getActivityUnitLabel(parameter.canonicalUnitCode, locale)}
                              </span>
                            </button>
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-5">
              <p className="text-[13px] font-semibold">{copy.linkedObjects}</p>
              <p className="mt-0.5 text-[11px] leading-4 text-slate-400">
                {copy.linkedObjectsHelp}
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                {objects.map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex max-w-full items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-1 py-1 text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => setObjectInfo(item)}
                      className="max-w-[260px] truncate rounded-full px-2 py-0.5 font-medium text-slate-700 hover:bg-white"
                    >
                      {item.title}
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${item.title}`}
                      onClick={() => removeObject(item.id)}
                      className="rounded-full px-1.5 py-0.5 text-sm leading-none text-slate-400 hover:bg-white hover:text-slate-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <div className="relative mt-2">
                <input
                  value={objectSearch}
                  onChange={(event) => {
                    const value = event.target.value;
                    setObjectSearch(value);
                    if (value.trim().length < 2) {
                      setObjectResults([]);
                      setNonLeafResults([]);
                    }
                  }}
                  placeholder={copy.objectPlaceholder}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#3b6ef8]"
                />

                {objectSearch.trim().length > 0 ? (
                  <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                    {objectSearch.trim().length < 2 ? (
                      <p className="px-2 py-3 text-xs text-slate-500">
                        {copy.typeMore}
                      </p>
                    ) : objectResults.length === 0 && nonLeafResults.length === 0 ? (
                      <p className="px-2 py-3 text-xs text-slate-500">
                        {copy.noObjects}
                      </p>
                    ) : objectResults.length === 0 ? (
                      <div className="px-1 py-1">
                        <p className="px-2 py-2 text-xs leading-5 text-amber-700">
                          {copy.nonLeafOnly}
                        </p>
                        {nonLeafResults.map((item) => (
                          <div key={item.id} className="flex items-center gap-2 rounded-lg bg-amber-50/50">
                            <div className="min-w-0 flex-1 px-2 py-2.5">
                              <span className="block truncate text-[13px] font-medium text-slate-700">{item.title}</span>
                              <span className="text-[10px] text-slate-400">{copy.nodeRole[item.level]}</span>
                            </div>
                            <button type="button" onClick={() => setObjectInfo(item)} className="mr-1 shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-500">
                              {copy.openInfo}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      objectResults.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 rounded-lg hover:bg-slate-50"
                        >
                          <button
                            type="button"
                            onClick={() => addObject(item)}
                            className="min-w-0 flex-1 px-2 py-2.5 text-left text-[13px] font-medium"
                          >
                            <span className="block truncate">{item.title}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setObjectInfo(item)}
                            className="mr-1 shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-500 hover:bg-white"
                          >
                            {copy.openInfo}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setAdvancedOpen((current) => !current)}
                className="text-[13px] font-semibold text-slate-600"
              >
                {advancedOpen ? "▾" : "▸"} {copy.advanced}
              </button>

              {advancedOpen ? (
                <div className="mt-3 grid gap-3">
                  <label className="block">
                    <span className="text-xs font-medium">{copy.description}</span>
                    <textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      rows={3}
                      className="mt-1 w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#3b6ef8]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium">{copy.notes}</span>
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      rows={2}
                      className="mt-1 w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#3b6ef8]"
                    />
                  </label>
                </div>
              ) : null}
            </div>

            {message ? (
              <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {message}
              </div>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={resetEditor}
                disabled={busy}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-[13px] font-semibold text-slate-600 disabled:opacity-50"
              >
                {copy.cancel}
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={busy}
                className="rounded-xl bg-[#3b6ef8] px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
              >
                {busy
                  ? copy.saving
                  : selectedId
                    ? copy.saveVersion
                    : copy.saveNew}
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className="mx-auto mt-4 w-full max-w-[1120px]">
        <ActivityParameterAdminCatalog locale={locale} />
      </div>

      {objectInfo ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={objectInfo.title}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setObjectInfo(null);
          }}
        >
          <div className="w-full max-w-lg rounded-[20px] bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold">{objectInfo.title}</h3>
                {objectInfo.scopeCode ? (
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">
                    {objectInfo.scopeCode}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setObjectInfo(null)}
                className="rounded-lg px-2 py-1 text-lg text-slate-400 hover:bg-slate-50"
              >
                ×
              </button>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-500">{copy.path}</p>
              {pathSegments.length > 0 ? (
                <ol className="mt-2 space-y-1.5">
                  {pathSegments.map((segment, index) => (
                    <li
                      key={`${segment}-${index}`}
                      className="flex gap-2 text-[13px] text-slate-700"
                    >
                      <span className="w-5 shrink-0 text-right text-[10px] text-slate-300">
                        {index + 1}
                      </span>
                      <span>{segment}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-xs text-slate-400">—</p>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setObjectInfo(null)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
              >
                {copy.close}
              </button>
              <a
                href={`/value-objects/${objectInfo.id}?locale=${locale}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-[#3b6ef8] px-3 py-2 text-xs font-semibold text-white"
              >
                {copy.fullCard}
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

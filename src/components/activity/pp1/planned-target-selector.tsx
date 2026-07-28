"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";

import {
  resolveValueObjectBranchPolicyTitle,
  type ValueObjectBranchPolicyLocale,
} from "@/data/value-object-branch-policy-localization";
import type { ActivityTimingLocalePp1 } from "@/lib/activity/pp1/activityTiming";
import type {
  ValueObjectBranchPolicyDto,
  ValueObjectBranchPolicyListResponse,
} from "@/types/value-object-branch-policy";

type SelectorLevel = "all" | "root" | "intermediate" | "leaf";
type SelectorTab = "all" | "recent" | "favorite";
type CreateMode = "root" | "intermediate" | "leaf";

type PathItem = {
  id: string;
  title: string;
};

type ValueObjectOption = {
  id: string;
  title: string;
  aliases: string[];
  nodeRoleCode: string;
  branchTypeCode: string;
  objectKind: string;
  rootValueObjectId: string;
  parentValueObjectId: string | null;
  level: Exclude<SelectorLevel, "all">;
  status: string;
  path: PathItem[];
  pathText: string;
};

type SelectorScope = {
  actorId: string;
  actorType: string;
  displayName: string;
  profileKind: string;
};

type SelectorResponse = {
  ok?: boolean;
  error?: string;
  scope?: SelectorScope;
  valueObjects?: unknown[];
  pinnedValueObjects?: unknown[];
  totalMatched?: number;
  returned?: number;
  sourceTruncated?: boolean;
};

type CreateResponse = {
  ok?: boolean;
  error?: string;
  valueObject?: unknown;
  redirectUrl?: string | null;
};

type Copy = {
  title: string;
  help: string;
  scope: string;
  search: string;
  searchPlaceholder: string;
  branch: string;
  level: string;
  allBranches: string;
  allLevels: string;
  root: string;
  intermediate: string;
  leaf: string;
  all: string;
  recent: string;
  favorite: string;
  loading: string;
  empty: string;
  error: string;
  selected: string;
  remove: string;
  favoriteAdd: string;
  favoriteRemove: string;
  results: string;
  truncated: string;
  create: string;
  createTitle: string;
  createHelp: string;
  createMode: string;
  createName: string;
  createNamePlaceholder: string;
  createBranch: string;
  createParent: string;
  createParentSearch: string;
  createParentPlaceholder: string;
  createSubmit: string;
  creating: string;
  createCancel: string;
  createError: string;
  createSuccess: string;
  fullEditor: string;
  localPreferenceHelp: string;
};

const COPY: Record<ActivityTimingLocalePp1, Copy> = {
  en: {
    title: "Planned targets",
    help: "Select several root, intermediate or leaf observation objects. Search works by title, aliases and the full path.",
    scope: "Active profile",
    search: "Search",
    searchPlaceholder: "Title, alias or path",
    branch: "Branch policy",
    level: "Tree level",
    allBranches: "All policies",
    allLevels: "All levels",
    root: "Root",
    intermediate: "Intermediate",
    leaf: "Leaf",
    all: "All",
    recent: "Recent",
    favorite: "Favorites",
    loading: "Loading observation objects…",
    empty: "Nothing matches the current filters.",
    error: "Observation objects could not be loaded.",
    selected: "Selected",
    remove: "Remove",
    favoriteAdd: "Add to favorites",
    favoriteRemove: "Remove from favorites",
    results: "results",
    truncated: "The source list reached its safety limit. Narrow the search.",
    create: "Create object",
    createTitle: "Create a draft observation object",
    createHelp: "The object is created as a controlled draft and immediately returns to this selector.",
    createMode: "Level",
    createName: "Name",
    createNamePlaceholder: "For example: German pronunciation",
    createBranch: "Branch policy",
    createParent: "Parent object",
    createParentSearch: "Find a parent",
    createParentPlaceholder: "Search structural objects",
    createSubmit: "Create and select",
    creating: "Creating…",
    createCancel: "Cancel",
    createError: "The object could not be created.",
    createSuccess: "Draft created and selected.",
    fullEditor: "Open full editor",
    localPreferenceHelp: "Recent and favorite items are stored for this browser and active profile.",
  },
  pl: {
    title: "Cele planowanej aktywności",
    help: "Wybierz kilka głównych, pośrednich lub liściowych obiektów obserwacji. Wyszukiwanie obejmuje nazwę, aliasy i pełną ścieżkę.",
    scope: "Aktywny profil",
    search: "Szukaj",
    searchPlaceholder: "Nazwa, alias lub ścieżka",
    branch: "Polityka gałęzi",
    level: "Poziom drzewa",
    allBranches: "Wszystkie polityki",
    allLevels: "Wszystkie poziomy",
    root: "Główny",
    intermediate: "Pośredni",
    leaf: "Liść",
    all: "Wszystkie",
    recent: "Ostatnie",
    favorite: "Ulubione",
    loading: "Ładowanie obiektów obserwacji…",
    empty: "Brak wyników dla wybranych filtrów.",
    error: "Nie udało się załadować obiektów obserwacji.",
    selected: "Wybrane",
    remove: "Usuń",
    favoriteAdd: "Dodaj do ulubionych",
    favoriteRemove: "Usuń z ulubionych",
    results: "wyników",
    truncated: "Lista źródłowa osiągnęła limit bezpieczeństwa. Zawęź wyszukiwanie.",
    create: "Utwórz obiekt",
    createTitle: "Utwórz roboczy obiekt obserwacji",
    createHelp: "Obiekt zostanie utworzony jako kontrolowany szkic i od razu wróci do selektora.",
    createMode: "Poziom",
    createName: "Nazwa",
    createNamePlaceholder: "Na przykład: Wymowa niemiecka",
    createBranch: "Polityka gałęzi",
    createParent: "Obiekt nadrzędny",
    createParentSearch: "Znajdź obiekt nadrzędny",
    createParentPlaceholder: "Szukaj obiektów strukturalnych",
    createSubmit: "Utwórz i wybierz",
    creating: "Tworzenie…",
    createCancel: "Anuluj",
    createError: "Nie udało się utworzyć obiektu.",
    createSuccess: "Szkic utworzony i wybrany.",
    fullEditor: "Otwórz pełny edytor",
    localPreferenceHelp: "Ostatnie i ulubione elementy są zapisane dla tej przeglądarki i aktywnego profilu.",
  },
  ru: {
    title: "Цели плановой активности",
    help: "Выберите несколько корневых, промежуточных или листовых объектов наблюдения. Поиск работает по названию, псевдонимам и полному пути.",
    scope: "Активный профиль",
    search: "Поиск",
    searchPlaceholder: "Название, псевдоним или путь",
    branch: "Политика ветви",
    level: "Уровень дерева",
    allBranches: "Все политики",
    allLevels: "Все уровни",
    root: "Корневой",
    intermediate: "Промежуточный",
    leaf: "Листовой",
    all: "Все",
    recent: "Недавние",
    favorite: "Избранные",
    loading: "Загружаю объекты наблюдения…",
    empty: "По выбранным фильтрам ничего не найдено.",
    error: "Не удалось загрузить объекты наблюдения.",
    selected: "Выбрано",
    remove: "Удалить",
    favoriteAdd: "Добавить в избранное",
    favoriteRemove: "Убрать из избранного",
    results: "результатов",
    truncated: "Исходный список достиг защитного лимита. Уточните поиск.",
    create: "Создать объект",
    createTitle: "Создать черновик объекта наблюдения",
    createHelp: "Объект создаётся как контролируемый черновик и сразу возвращается в этот селектор.",
    createMode: "Уровень",
    createName: "Название",
    createNamePlaceholder: "Например: Немецкое произношение",
    createBranch: "Политика ветви",
    createParent: "Родительский объект",
    createParentSearch: "Найти родителя",
    createParentPlaceholder: "Поиск структурных объектов",
    createSubmit: "Создать и выбрать",
    creating: "Создаю…",
    createCancel: "Отмена",
    createError: "Не удалось создать объект.",
    createSuccess: "Черновик создан и выбран.",
    fullEditor: "Открыть полный редактор",
    localPreferenceHelp: "Недавние и избранные объекты хранятся для этого браузера и активного профиля.",
  },
  uk: {
    title: "Цілі запланованої активності",
    help: "Оберіть кілька кореневих, проміжних або листових об’єктів спостереження. Пошук працює за назвою, псевдонімами та повним шляхом.",
    scope: "Активний профіль",
    search: "Пошук",
    searchPlaceholder: "Назва, псевдонім або шлях",
    branch: "Політика гілки",
    level: "Рівень дерева",
    allBranches: "Усі політики",
    allLevels: "Усі рівні",
    root: "Кореневий",
    intermediate: "Проміжний",
    leaf: "Листовий",
    all: "Усі",
    recent: "Нещодавні",
    favorite: "Обрані",
    loading: "Завантажую об’єкти спостереження…",
    empty: "За вибраними фільтрами нічого не знайдено.",
    error: "Не вдалося завантажити об’єкти спостереження.",
    selected: "Обрано",
    remove: "Видалити",
    favoriteAdd: "Додати до обраних",
    favoriteRemove: "Прибрати з обраних",
    results: "результатів",
    truncated: "Початковий список досяг захисного ліміту. Уточніть пошук.",
    create: "Створити об’єкт",
    createTitle: "Створити чернетку об’єкта спостереження",
    createHelp: "Об’єкт створюється як контрольована чернетка й одразу повертається до селектора.",
    createMode: "Рівень",
    createName: "Назва",
    createNamePlaceholder: "Наприклад: Німецька вимова",
    createBranch: "Політика гілки",
    createParent: "Батьківський об’єкт",
    createParentSearch: "Знайти батьківський об’єкт",
    createParentPlaceholder: "Пошук структурних об’єктів",
    createSubmit: "Створити й обрати",
    creating: "Створення…",
    createCancel: "Скасувати",
    createError: "Не вдалося створити об’єкт.",
    createSuccess: "Чернетку створено й обрано.",
    fullEditor: "Відкрити повний редактор",
    localPreferenceHelp: "Нещодавні й обрані об’єкти зберігаються для цього браузера та активного профілю.",
  },
  de: {
    title: "Ziele der geplanten Aktivität",
    help: "Wählen Sie mehrere Wurzel-, Zwischen- oder Blatt-Beobachtungsobjekte. Die Suche umfasst Titel, Aliase und den vollständigen Pfad.",
    scope: "Aktives Profil",
    search: "Suche",
    searchPlaceholder: "Titel, Alias oder Pfad",
    branch: "Zweigregel",
    level: "Baumebene",
    allBranches: "Alle Regeln",
    allLevels: "Alle Ebenen",
    root: "Wurzel",
    intermediate: "Zwischenebene",
    leaf: "Blatt",
    all: "Alle",
    recent: "Zuletzt verwendet",
    favorite: "Favoriten",
    loading: "Beobachtungsobjekte werden geladen…",
    empty: "Keine Ergebnisse für die ausgewählten Filter.",
    error: "Beobachtungsobjekte konnten nicht geladen werden.",
    selected: "Ausgewählt",
    remove: "Entfernen",
    favoriteAdd: "Zu Favoriten hinzufügen",
    favoriteRemove: "Aus Favoriten entfernen",
    results: "Ergebnisse",
    truncated: "Die Quellliste hat das Sicherheitslimit erreicht. Grenzen Sie die Suche ein.",
    create: "Objekt erstellen",
    createTitle: "Entwurf eines Beobachtungsobjekts erstellen",
    createHelp: "Das Objekt wird als kontrollierter Entwurf erstellt und sofort in den Selektor übernommen.",
    createMode: "Ebene",
    createName: "Name",
    createNamePlaceholder: "Zum Beispiel: Deutsche Aussprache",
    createBranch: "Zweigregel",
    createParent: "Übergeordnetes Objekt",
    createParentSearch: "Übergeordnetes Objekt suchen",
    createParentPlaceholder: "Strukturobjekte durchsuchen",
    createSubmit: "Erstellen und auswählen",
    creating: "Wird erstellt…",
    createCancel: "Abbrechen",
    createError: "Das Objekt konnte nicht erstellt werden.",
    createSuccess: "Entwurf erstellt und ausgewählt.",
    fullEditor: "Vollständigen Editor öffnen",
    localPreferenceHelp: "Zuletzt verwendete und favorisierte Objekte werden für diesen Browser und das aktive Profil gespeichert.",
  },
  es: {
    title: "Objetivos de la actividad planificada",
    help: "Seleccione varios objetos de observación raíz, intermedios o hoja. La búsqueda incluye título, alias y ruta completa.",
    scope: "Perfil activo",
    search: "Buscar",
    searchPlaceholder: "Título, alias o ruta",
    branch: "Política de rama",
    level: "Nivel del árbol",
    allBranches: "Todas las políticas",
    allLevels: "Todos los niveles",
    root: "Raíz",
    intermediate: "Intermedio",
    leaf: "Hoja",
    all: "Todos",
    recent: "Recientes",
    favorite: "Favoritos",
    loading: "Cargando objetos de observación…",
    empty: "No hay resultados para los filtros seleccionados.",
    error: "No se pudieron cargar los objetos de observación.",
    selected: "Seleccionados",
    remove: "Eliminar",
    favoriteAdd: "Añadir a favoritos",
    favoriteRemove: "Quitar de favoritos",
    results: "resultados",
    truncated: "La lista de origen alcanzó el límite de seguridad. Acote la búsqueda.",
    create: "Crear objeto",
    createTitle: "Crear un borrador de objeto de observación",
    createHelp: "El objeto se crea como borrador controlado y vuelve inmediatamente al selector.",
    createMode: "Nivel",
    createName: "Nombre",
    createNamePlaceholder: "Por ejemplo: Pronunciación alemana",
    createBranch: "Política de rama",
    createParent: "Objeto padre",
    createParentSearch: "Buscar objeto padre",
    createParentPlaceholder: "Buscar objetos estructurales",
    createSubmit: "Crear y seleccionar",
    creating: "Creando…",
    createCancel: "Cancelar",
    createError: "No se pudo crear el objeto.",
    createSuccess: "Borrador creado y seleccionado.",
    fullEditor: "Abrir editor completo",
    localPreferenceHelp: "Los objetos recientes y favoritos se guardan para este navegador y perfil activo.",
  },
  cs: {
    title: "Cíle plánované aktivity",
    help: "Vyberte více kořenových, mezilehlých nebo listových objektů pozorování. Hledání zahrnuje název, aliasy a úplnou cestu.",
    scope: "Aktivní profil",
    search: "Hledat",
    searchPlaceholder: "Název, alias nebo cesta",
    branch: "Politika větve",
    level: "Úroveň stromu",
    allBranches: "Všechny politiky",
    allLevels: "Všechny úrovně",
    root: "Kořen",
    intermediate: "Mezilehlý",
    leaf: "List",
    all: "Vše",
    recent: "Nedávné",
    favorite: "Oblíbené",
    loading: "Načítám objekty pozorování…",
    empty: "Pro vybrané filtry nebyly nalezeny žádné výsledky.",
    error: "Objekty pozorování se nepodařilo načíst.",
    selected: "Vybráno",
    remove: "Odebrat",
    favoriteAdd: "Přidat do oblíbených",
    favoriteRemove: "Odebrat z oblíbených",
    results: "výsledků",
    truncated: "Zdrojový seznam dosáhl bezpečnostního limitu. Upřesněte hledání.",
    create: "Vytvořit objekt",
    createTitle: "Vytvořit koncept objektu pozorování",
    createHelp: "Objekt se vytvoří jako řízený koncept a ihned se vrátí do selektoru.",
    createMode: "Úroveň",
    createName: "Název",
    createNamePlaceholder: "Například: Německá výslovnost",
    createBranch: "Politika větve",
    createParent: "Nadřazený objekt",
    createParentSearch: "Najít nadřazený objekt",
    createParentPlaceholder: "Hledat strukturální objekty",
    createSubmit: "Vytvořit a vybrat",
    creating: "Vytváření…",
    createCancel: "Zrušit",
    createError: "Objekt se nepodařilo vytvořit.",
    createSuccess: "Koncept vytvořen a vybrán.",
    fullEditor: "Otevřít úplný editor",
    localPreferenceHelp: "Nedávné a oblíbené objekty se ukládají pro tento prohlížeč a aktivní profil.",
  },
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.flatMap((item) => {
        const normalized = asString(item);
        return normalized ? [normalized] : [];
      })
    : [];
}

function normalizeOption(value: unknown): ValueObjectOption | null {
  const row = asRecord(value);
  const id = asString(row.id);
  const title = asString(row.title);
  const nodeRoleCode = asString(row.nodeRoleCode);
  const branchTypeCode = asString(row.branchTypeCode);
  const objectKind = asString(row.objectKind);
  const rootValueObjectId = asString(row.rootValueObjectId);
  const level = asString(row.level);

  if (
    !id ||
    !title ||
    !nodeRoleCode ||
    !branchTypeCode ||
    !objectKind ||
    !rootValueObjectId ||
    (level !== "root" &&
      level !== "intermediate" &&
      level !== "leaf")
  ) {
    return null;
  }

  const path = Array.isArray(row.path)
    ? row.path.flatMap((item) => {
        const pathRow = asRecord(item);
        const pathId = asString(pathRow.id);
        const pathTitle = asString(pathRow.title);

        return pathId && pathTitle
          ? [{ id: pathId, title: pathTitle }]
          : [];
      })
    : [];

  return {
    id,
    title,
    aliases: asStringArray(row.aliases),
    nodeRoleCode,
    branchTypeCode,
    objectKind,
    rootValueObjectId,
    parentValueObjectId: asString(row.parentValueObjectId),
    level,
    status: asString(row.status) ?? "unknown",
    path,
    pathText:
      asString(row.pathText) ??
      path.map((item) => item.title).join(" › "),
  };
}

function mergeOptionCache(
  previous: Record<string, ValueObjectOption>,
  values: unknown[],
): Record<string, ValueObjectOption> {
  const next = { ...previous };

  for (const value of values) {
    const option = normalizeOption(value);

    if (option) {
      next[option.id] = option;
    }
  }

  return next;
}

function readStoredIds(key: string): string[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");

    return Array.isArray(parsed)
      ? parsed.flatMap((item) => {
          const normalized = asString(item);
          return normalized ? [normalized] : [];
        })
      : [];
  } catch {
    return [];
  }
}

function writeStoredIds(key: string, ids: string[]) {
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify(Array.from(new Set(ids))),
    );
  } catch {
    // Browser privacy settings may disable local storage.
  }
}

function optionMatches(
  option: ValueObjectOption,
  query: string,
  branchTypeCode: string,
  level: SelectorLevel,
): boolean {
  if (
    branchTypeCode !== "all" &&
    option.branchTypeCode !== branchTypeCode
  ) {
    return false;
  }

  if (level !== "all" && option.level !== level) {
    return false;
  }

  const normalizedQuery = query.trim().toLocaleLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [
    option.title,
    option.pathText,
    ...option.aliases,
  ]
    .join("\n")
    .toLocaleLowerCase()
    .includes(normalizedQuery);
}

function createdOptionFromResponse(
  value: unknown,
  mode: CreateMode,
  parent: ValueObjectOption | null,
): ValueObjectOption | null {
  const row = asRecord(value);
  const id = asString(row.id);
  const title = asString(row.title);
  const branchTypeCode =
    asString(row.branch_type_code) ?? parent?.branchTypeCode ?? null;
  const objectKind =
    asString(row.object_kind) ??
    (mode === "leaf" ? "activity_pattern" : "other");
  const rootValueObjectId =
    asString(row.root_value_object_id) ??
    (mode === "root" ? id : parent?.rootValueObjectId ?? null);

  if (!id || !title || !branchTypeCode || !rootValueObjectId) {
    return null;
  }

  const path: PathItem[] = [
    ...(parent?.path ?? []),
    { id, title },
  ];

  return {
    id,
    title,
    aliases: [],
    nodeRoleCode: mode === "leaf" ? "activity_leaf" : "structural",
    branchTypeCode,
    objectKind,
    rootValueObjectId,
    parentValueObjectId:
      asString(row.parent_value_object_id) ?? parent?.id ?? null,
    level: mode,
    status: asString(row.status) ?? "draft",
    path,
    pathText: path.map((item) => item.title).join(" › "),
  };
}

function getLevelLabel(copy: Copy, level: ValueObjectOption["level"]) {
  if (level === "root") {
    return copy.root;
  }

  if (level === "intermediate") {
    return copy.intermediate;
  }

  return copy.leaf;
}

export function PlannedTargetSelectorPp1({
  locale,
  selectedIds,
  onChange,
}: {
  locale: ActivityTimingLocalePp1;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const copy = COPY[locale];
  const policyLocale = locale as ValueObjectBranchPolicyLocale;

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [levelFilter, setLevelFilter] =
    useState<SelectorLevel>("all");
  const [tab, setTab] = useState<SelectorTab>("all");

  const [scope, setScope] = useState<SelectorScope | null>(null);
  const [options, setOptions] = useState<ValueObjectOption[]>([]);
  const [optionCache, setOptionCache] = useState<
    Record<string, ValueObjectOption>
  >({});
  const [status, setStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [totalMatched, setTotalMatched] = useState(0);
  const [sourceTruncated, setSourceTruncated] = useState(false);

  const [policies, setPolicies] = useState<
    ValueObjectBranchPolicyDto[]
  >([]);

  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] =
    useState<CreateMode>("root");
  const [createTitle, setCreateTitle] = useState("");
  const [createBranchTypeCode, setCreateBranchTypeCode] =
    useState("");
  const [parentQuery, setParentQuery] = useState("");
  const [debouncedParentQuery, setDebouncedParentQuery] =
    useState("");
  const [parentOptions, setParentOptions] = useState<
    ValueObjectOption[]
  >([]);
  const [selectedParentId, setSelectedParentId] = useState("");
  const [createStatus, setCreateStatus] = useState<
    "idle" | "creating" | "success" | "error"
  >("idle");
  const [createMessage, setCreateMessage] = useState("");
  const [createdEditorHref, setCreatedEditorHref] = useState<
    string | null
  >(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedParentQuery(parentQuery);
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [parentQuery]);

  useEffect(() => {
    let cancelled = false;

    async function loadPolicies() {
      try {
        const response = await fetch(
          "/api/value-object-branch-policies",
          {
            credentials: "include",
            headers: { Accept: "application/json" },
          },
        );
        const payload = (
          await response.json().catch(() => null)
        ) as ValueObjectBranchPolicyListResponse | null;

        if (!response.ok || payload?.ok !== true) {
          throw new Error(payload?.error ?? "branch policies failed");
        }

        if (!cancelled) {
          const activePolicies = (payload.policies ?? []).filter(
            (policy) => policy.status === "active",
          );
          setPolicies(activePolicies);

          if (
            !createBranchTypeCode &&
            activePolicies[0]?.branchTypeCode
          ) {
            setCreateBranchTypeCode(
              activePolicies[0].branchTypeCode,
            );
          }
        }
      } catch {
        if (!cancelled) {
          setPolicies([]);
        }
      }
    }

    void loadPolicies();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!scope || preferencesLoaded) {
      return;
    }

    const prefix = `arctor:cux5:${scope.actorId}`;
    setFavoriteIds(readStoredIds(`${prefix}:favorites`).slice(0, 60));
    setRecentIds(readStoredIds(`${prefix}:recent`).slice(0, 12));
    setPreferencesLoaded(true);
  }, [preferencesLoaded, scope]);

  const pinnedIds = useMemo(
    () =>
      Array.from(
        new Set([
          ...selectedIds,
          ...favoriteIds,
          ...recentIds,
        ]),
      ).slice(0, 80),
    [favoriteIds, recentIds, selectedIds],
  );

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function loadOptions() {
      setStatus("loading");

      const params = new URLSearchParams({
        q: debouncedQuery,
        level: levelFilter,
        limit: "80",
      });

      if (branchFilter !== "all") {
        params.set("branchTypeCode", branchFilter);
      }

      if (pinnedIds.length > 0) {
        params.set("pinnedIds", pinnedIds.join(","));
      }

      try {
        const response = await fetch(
          `/api/value-objects/selector?${params.toString()}`,
          {
            credentials: "include",
            headers: { Accept: "application/json" },
            signal: controller.signal,
          },
        );
        const payload = (
          await response.json().catch(() => null)
        ) as SelectorResponse | null;

        if (!response.ok || payload?.ok !== true) {
          throw new Error(payload?.error ?? "selector request failed");
        }

        if (cancelled) {
          return;
        }

        const loadedOptions = (payload.valueObjects ?? [])
          .map(normalizeOption)
          .filter(
            (option): option is ValueObjectOption => option !== null,
          );

        setOptions(loadedOptions);
        setOptionCache((previous) =>
          mergeOptionCache(previous, [
            ...(payload.valueObjects ?? []),
            ...(payload.pinnedValueObjects ?? []),
          ]),
        );
        setScope(payload.scope ?? null);
        setTotalMatched(payload.totalMatched ?? loadedOptions.length);
        setSourceTruncated(payload.sourceTruncated === true);
        setStatus("ready");
      } catch (error) {
        if (controller.signal.aborted || cancelled) {
          return;
        }

        setStatus("error");
      }
    }

    void loadOptions();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    branchFilter,
    debouncedQuery,
    levelFilter,
    pinnedIds.join(","),
  ]);

  useEffect(() => {
    if (!createOpen || createMode === "root") {
      setParentOptions([]);
      setSelectedParentId("");
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    async function loadParents() {
      const params = new URLSearchParams({
        q: debouncedParentQuery,
        parentOnly: "1",
        limit: "40",
      });

      try {
        const response = await fetch(
          `/api/value-objects/selector?${params.toString()}`,
          {
            credentials: "include",
            headers: { Accept: "application/json" },
            signal: controller.signal,
          },
        );
        const payload = (
          await response.json().catch(() => null)
        ) as SelectorResponse | null;

        if (!response.ok || payload?.ok !== true) {
          throw new Error(payload?.error ?? "parent request failed");
        }

        if (cancelled) {
          return;
        }

        const parents = (payload.valueObjects ?? [])
          .map(normalizeOption)
          .filter(
            (option): option is ValueObjectOption =>
              option !== null &&
              option.nodeRoleCode === "structural",
          );

        setParentOptions(parents);
        setOptionCache((previous) =>
          mergeOptionCache(previous, payload.valueObjects ?? []),
        );
      } catch {
        if (!cancelled && !controller.signal.aborted) {
          setParentOptions([]);
        }
      }
    }

    void loadParents();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [createMode, createOpen, debouncedParentQuery]);

  const selectedSet = useMemo(
    () => new Set(selectedIds),
    [selectedIds],
  );

  const favoriteSet = useMemo(
    () => new Set(favoriteIds),
    [favoriteIds],
  );

  const selectedOptions = useMemo(
    () =>
      selectedIds
        .map((id) => optionCache[id])
        .filter(
          (option): option is ValueObjectOption => Boolean(option),
        ),
    [optionCache, selectedIds],
  );

  const visibleOptions = useMemo(() => {
    if (tab === "all") {
      return options;
    }

    const ids = tab === "favorite" ? favoriteIds : recentIds;

    return ids
      .map((id) => optionCache[id])
      .filter(
        (option): option is ValueObjectOption =>
          Boolean(option) &&
          optionMatches(
            option,
            query,
            branchFilter,
            levelFilter,
          ),
      );
  }, [
    branchFilter,
    favoriteIds,
    levelFilter,
    optionCache,
    options,
    query,
    recentIds,
    tab,
  ]);

  function persistPreference(
    suffix: "favorites" | "recent",
    ids: string[],
  ) {
    if (!scope) {
      return;
    }

    writeStoredIds(`arctor:cux5:${scope.actorId}:${suffix}`, ids);
  }

  function markRecent(id: string) {
    const next = [id, ...recentIds.filter((value) => value !== id)]
      .slice(0, 12);
    setRecentIds(next);
    persistPreference("recent", next);
  }

  function toggleSelected(id: string) {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((value) => value !== id));
      return;
    }

    onChange([...selectedIds, id]);
    markRecent(id);
  }

  function toggleFavorite(id: string) {
    const next = favoriteSet.has(id)
      ? favoriteIds.filter((value) => value !== id)
      : [id, ...favoriteIds.filter((value) => value !== id)]
          .slice(0, 60);

    setFavoriteIds(next);
    persistPreference("favorites", next);
  }

  function resetCreateForm() {
    setCreateTitle("");
    setParentQuery("");
    setSelectedParentId("");
    setCreateStatus("idle");
    setCreateMessage("");
    setCreatedEditorHref(null);
  }

  async function createValueObject() {
    const title = createTitle.trim();
    const parent =
      createMode === "root"
        ? null
        : optionCache[selectedParentId] ??
          parentOptions.find(
            (option) => option.id === selectedParentId,
          ) ??
          null;

    if (
      !title ||
      (createMode === "root" && !createBranchTypeCode) ||
      (createMode !== "root" && !parent)
    ) {
      setCreateStatus("error");
      setCreateMessage(copy.createError);
      return;
    }

    setCreateStatus("creating");
    setCreateMessage("");
    setCreatedEditorHref(null);

    const body =
      createMode === "root"
        ? {
            creationMode: "root_draft_v3",
            title,
            branchTypeCode: createBranchTypeCode,
            objectKind: "other",
            locale,
          }
        : createMode === "intermediate"
          ? {
              creationMode: "intermediate_draft_v3",
              parentValueObjectId: parent?.id,
              title,
              objectKind: "other",
              locale,
            }
          : {
              creationMode: "leaf_draft_v3",
              parentValueObjectId: parent?.id,
              title,
              locale,
            };

    try {
      const response = await fetch("/api/value-objects", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });
      const payload = (
        await response.json().catch(() => null)
      ) as CreateResponse | null;

      if (!response.ok || payload?.ok !== true) {
        throw new Error(payload?.error ?? "create failed");
      }

      const created = createdOptionFromResponse(
        payload.valueObject,
        createMode,
        parent,
      );

      if (!created) {
        throw new Error("unexpected create response");
      }

      setOptionCache((previous) => ({
        ...previous,
        [created.id]: created,
      }));
      setOptions((previous) => [
        created,
        ...previous.filter((option) => option.id !== created.id),
      ]);
      onChange([
        ...selectedIds.filter((id) => id !== created.id),
        created.id,
      ]);
      markRecent(created.id);
      setCreateStatus("success");
      setCreateMessage(copy.createSuccess);
      setCreatedEditorHref(payload.redirectUrl ?? null);
      setCreateTitle("");
    } catch (error) {
      setCreateStatus("error");
      setCreateMessage(
        error instanceof Error
          ? `${copy.createError} ${error.message}`
          : copy.createError,
      );
    }
  }

  return (
    <div className="rounded-[18px] border border-[#dfe5f1] bg-[#f8fafc] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#7c8099]">
            {copy.title}
          </p>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-[#52607a]">
            {copy.help}
          </p>
        </div>

        {scope ? (
          <span className="max-w-full rounded-full border border-[#d8deef] bg-white px-3 py-1.5 text-xs font-bold text-[#52607a]">
            {copy.scope}: {scope.displayName}
          </span>
        ) : null}
      </div>

      {selectedOptions.length > 0 ? (
        <div className="mt-4">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#7c8099]">
            {copy.selected}: {selectedOptions.length}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => toggleSelected(option.id)}
                title={copy.remove}
                className="max-w-full rounded-full border border-[#b9c8fa] bg-[#edf2ff] px-3 py-1.5 text-left text-xs font-bold text-[#244fc7]"
              >
                <span className="block max-w-[280px] truncate">
                  {option.title} ×
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_190px]">
        <label className="block">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#7c8099]">
            {copy.search}
          </span>
          <input
            value={query}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setQuery(event.target.value)
            }
            placeholder={copy.searchPlaceholder}
            className="mt-1.5 w-full rounded-xl border border-[#dfe5f1] bg-white px-3 py-2 text-sm font-semibold text-[#1a1d2e] outline-none focus:border-[#3b6ef8]"
          />
        </label>

        <label className="block">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#7c8099]">
            {copy.branch}
          </span>
          <select
            value={branchFilter}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setBranchFilter(event.target.value)
            }
            className="mt-1.5 w-full rounded-xl border border-[#dfe5f1] bg-white px-3 py-2 text-sm font-semibold text-[#1a1d2e]"
          >
            <option value="all">{copy.allBranches}</option>
            {policies.map((policy) => (
              <option
                key={policy.branchTypeCode}
                value={policy.branchTypeCode}
              >
                {resolveValueObjectBranchPolicyTitle(
                  policy,
                  policyLocale,
                )}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#7c8099]">
            {copy.level}
          </span>
          <select
            value={levelFilter}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setLevelFilter(event.target.value as SelectorLevel)
            }
            className="mt-1.5 w-full rounded-xl border border-[#dfe5f1] bg-white px-3 py-2 text-sm font-semibold text-[#1a1d2e]"
          >
            <option value="all">{copy.allLevels}</option>
            <option value="root">{copy.root}</option>
            <option value="intermediate">
              {copy.intermediate}
            </option>
            <option value="leaf">{copy.leaf}</option>
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["all", "recent", "favorite"] as const).map(
            (nextTab) => (
              <button
                key={nextTab}
                type="button"
                onClick={() => setTab(nextTab)}
                aria-pressed={tab === nextTab}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                  tab === nextTab
                    ? "border-[#3b6ef8] bg-[#3b6ef8] text-white"
                    : "border-[#d8deef] bg-white text-[#52607a]"
                }`}
              >
                {nextTab === "all"
                  ? copy.all
                  : nextTab === "recent"
                    ? copy.recent
                    : copy.favorite}
              </button>
            ),
          )}
        </div>

        <span className="text-xs font-semibold text-[#7c8099]">
          {totalMatched} {copy.results}
        </span>
      </div>

      {status === "loading" ? (
        <p className="mt-4 text-sm text-[#52607a]">
          {copy.loading}
        </p>
      ) : null}

      {status === "error" ? (
        <p className="mt-4 text-sm font-semibold text-[#be123c]">
          {copy.error}
        </p>
      ) : null}

      {status === "ready" && visibleOptions.length === 0 ? (
        <p className="mt-4 text-sm text-[#52607a]">
          {copy.empty}
        </p>
      ) : null}

      {visibleOptions.length > 0 ? (
        <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
          {visibleOptions.map((option) => {
            const selected = selectedSet.has(option.id);
            const favorite = favoriteSet.has(option.id);
            const policy = policies.find(
              (item) =>
                item.branchTypeCode === option.branchTypeCode,
            );

            return (
              <div
                key={option.id}
                className={`flex items-start gap-2 rounded-xl border px-3 py-2 ${
                  selected
                    ? "border-[#9cb2fa] bg-[#edf2ff]"
                    : "border-[#dfe5f1] bg-white"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleSelected(option.id)}
                  aria-pressed={selected}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block break-words text-sm font-extrabold text-[#1a1d2e]">
                    {option.title}
                  </span>
                  <span className="mt-1 block break-words text-[11px] leading-4 text-[#68708a]">
                    {option.pathText}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-[#eef1f7] px-2 py-0.5 text-[10px] font-bold text-[#59627a]">
                      {getLevelLabel(copy, option.level)}
                    </span>
                    <span className="rounded-full bg-[#eef1f7] px-2 py-0.5 text-[10px] font-bold text-[#59627a]">
                      {policy
                        ? resolveValueObjectBranchPolicyTitle(
                            policy,
                            policyLocale,
                          )
                        : option.branchTypeCode}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleFavorite(option.id)}
                  aria-pressed={favorite}
                  title={
                    favorite
                      ? copy.favoriteRemove
                      : copy.favoriteAdd
                  }
                  className={`rounded-lg border px-2.5 py-1.5 text-sm ${
                    favorite
                      ? "border-amber-300 bg-amber-50 text-amber-700"
                      : "border-[#dfe5f1] bg-white text-[#7c8099]"
                  }`}
                >
                  {favorite ? "★" : "☆"}
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      {sourceTruncated ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          {copy.truncated}
        </p>
      ) : null}

      <p className="mt-3 text-[11px] leading-4 text-[#7c8099]">
        {copy.localPreferenceHelp}
      </p>

      <div className="mt-4 border-t border-[#dfe5f1] pt-4">
        {!createOpen ? (
          <button
            type="button"
            onClick={() => {
              resetCreateForm();
              setCreateOpen(true);
            }}
            className="rounded-xl border border-[#3b6ef8] bg-white px-3 py-2 text-sm font-bold text-[#244fc7] hover:bg-[#edf2ff]"
          >
            + {copy.create}
          </button>
        ) : (
          <div className="rounded-[16px] border border-[#d8deef] bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold text-[#1a1d2e]">
                  {copy.createTitle}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#68708a]">
                  {copy.createHelp}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetCreateForm();
                  setCreateOpen(false);
                }}
                className="rounded-lg border border-[#d8deef] px-2.5 py-1.5 text-xs font-bold text-[#52607a]"
              >
                {copy.createCancel}
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <label className="block">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#7c8099]">
                  {copy.createMode}
                </span>
                <select
                  value={createMode}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                    setCreateMode(event.target.value as CreateMode);
                    setSelectedParentId("");
                    setCreateStatus("idle");
                    setCreateMessage("");
                  }}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe5f1] bg-white px-3 py-2 text-sm font-semibold"
                >
                  <option value="root">{copy.root}</option>
                  <option value="intermediate">
                    {copy.intermediate}
                  </option>
                  <option value="leaf">{copy.leaf}</option>
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#7c8099]">
                  {copy.createName}
                </span>
                <input
                  value={createTitle}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setCreateTitle(event.target.value);
                    setCreateStatus("idle");
                    setCreateMessage("");
                  }}
                  placeholder={copy.createNamePlaceholder}
                  maxLength={180}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe5f1] bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#3b6ef8]"
                />
              </label>
            </div>

            {createMode === "root" ? (
              <label className="mt-3 block">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#7c8099]">
                  {copy.createBranch}
                </span>
                <select
                  value={createBranchTypeCode}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                    setCreateBranchTypeCode(event.target.value)
                  }
                  className="mt-1.5 w-full rounded-xl border border-[#dfe5f1] bg-white px-3 py-2 text-sm font-semibold"
                >
                  {policies.map((policy) => (
                    <option
                      key={policy.branchTypeCode}
                      value={policy.branchTypeCode}
                    >
                      {resolveValueObjectBranchPolicyTitle(
                        policy,
                        policyLocale,
                      )}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="mt-3">
                <label className="block">
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#7c8099]">
                    {copy.createParentSearch}
                  </span>
                  <input
                    value={parentQuery}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setParentQuery(event.target.value)
                    }
                    placeholder={copy.createParentPlaceholder}
                    className="mt-1.5 w-full rounded-xl border border-[#dfe5f1] bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#3b6ef8]"
                  />
                </label>

                <p className="mt-3 text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#7c8099]">
                  {copy.createParent}
                </p>
                <div className="mt-2 max-h-48 space-y-2 overflow-y-auto pr-1">
                  {parentOptions.map((option) => (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2 ${
                        selectedParentId === option.id
                          ? "border-[#9cb2fa] bg-[#edf2ff]"
                          : "border-[#dfe5f1] bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="cux5-parent"
                        value={option.id}
                        checked={selectedParentId === option.id}
                        onChange={() =>
                          setSelectedParentId(option.id)
                        }
                        className="mt-1"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-[#1a1d2e]">
                          {option.title}
                        </span>
                        <span className="block break-words text-[11px] text-[#68708a]">
                          {option.pathText}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void createValueObject()}
                disabled={
                  createStatus === "creating" ||
                  !createTitle.trim() ||
                  (createMode === "root"
                    ? !createBranchTypeCode
                    : !selectedParentId)
                }
                className="rounded-xl bg-[#3b6ef8] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#c8d2f4]"
              >
                {createStatus === "creating"
                  ? copy.creating
                  : copy.createSubmit}
              </button>

              {createMessage ? (
                <span
                  className={`text-sm font-semibold ${
                    createStatus === "success"
                      ? "text-emerald-700"
                      : "text-rose-700"
                  }`}
                >
                  {createMessage}
                </span>
              ) : null}

              {createdEditorHref ? (
                <a
                  href={createdEditorHref}
                  className="text-sm font-bold text-[#244fc7] underline"
                >
                  {copy.fullEditor}
                </a>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import {
  Layers3,
  Leaf,
  Network,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  getLocaleSearchParam,
  getValueObjectsMessage,
  type LocaleCode,
  type ValueObjectsMessageKey,
} from "@/i18n";

import { ValueObjectCatalogViews } from "@/components/workspace/value-objects/value-object-catalog-views";

type OrganizationPayload = {
  id?: string;
  organization_name?: string | null;
};

type ActualValueObjectPayload = {
  id?: string | null;
  organization_id?: string | null;
  usage_scope?: string | null;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  organizations?: OrganizationPayload | null;

  object_kind?: string | null;
  node_role_code?: string | null;
  root_value_object_id?: string | null;
  parent_value_object_id?: string | null;
  branch_type_code?: string | null;

  canonical_key?: string | null;
  facet_code?: string | null;
  object_kind_code?: string | null;
  ontology_node_role_code?: string | null;
  scope_code?: string | null;
  origin_type_code?: string | null;
  definition_version?: number | null;
  visibility_code?: string | null;
  privacy_class_code?: string | null;

  metadata_json?: Record<string, unknown> | null;
};

type ActualValueObjectsResponse = {
  ok?: boolean;
  error?: string;
  valueObjects?: ActualValueObjectPayload[];
};

type ActualListStatus =
  | "idle"
  | "loading"
  | "success"
  | "not_authenticated"
  | "forbidden"
  | "error";

type RoleFilter = "all" | "root" | "intermediate" | "leaf" | "draft";
type SortMode = "newest" | "title" | "structure";
type SemanticRole = "root" | "intermediate" | "leaf";

type LocalCopy = {
  eyebrow: string;
  title: string;
  description: string;

  total: string;
  roots: string;
  intermediate: string;
  leaves: string;

  allObjects: string;
  rootObjects: string;
  intermediateObjects: string;
  leafObjects: string;
  drafts: string;

  searchPlaceholder: string;
  sortNewest: string;
  sortTitle: string;
  sortStructure: string;

  personal: string;
  commercial: string;
  system: string;
  draft: string;
  active: string;
  inactive: string;

  children: string;
  descendantLeaves: string;
  version: string;
  path: string;
  noDescription: string;
  shown: string;
  of: string;
  open: string;
};

const COPY: Record<LocaleCode, LocalCopy> = {
  en: {
    eyebrow: "Observation objects",
    title: "Observation objects",
    description:
      "Global system objects plus roots, intermediate nodes and leaves of the active profile. Search and structural filters work across the combined catalog.",
    total: "Total",
    roots: "Roots",
    intermediate: "Intermediate",
    leaves: "Leaves",
    allObjects: "All objects",
    rootObjects: "Roots",
    intermediateObjects: "Intermediate",
    leafObjects: "Leaves",
    drafts: "Drafts",
    searchPlaceholder: "Search by name, description or path",
    sortNewest: "Newest first",
    sortTitle: "By name",
    sortStructure: "By structure",
    personal: "Personal",
    commercial: "Commercial",
    system: "System",
    draft: "Draft",
    active: "Active",
    inactive: "Inactive",
    children: "Children",
    descendantLeaves: "Leaves below",
    version: "Definition",
    path: "Path",
    noDescription: "No description yet.",
    shown: "Shown",
    of: "of",
    open: "Open object",
  },
  pl: {
    eyebrow: "Obiekty obserwacji",
    title: "Obiekty obserwacji",
    description:
      "Korzenie, obiekty pośrednie i liście aktywnego profilu. Lista jest uporządkowana tak, aby szybko poruszać się po drzewie obserwacji.",
    total: "Razem",
    roots: "Korzenie",
    intermediate: "Pośrednie",
    leaves: "Liście",
    allObjects: "Wszystkie obiekty",
    rootObjects: "Korzenie",
    intermediateObjects: "Pośrednie",
    leafObjects: "Liście",
    drafts: "Szkice",
    searchPlaceholder: "Szukaj po nazwie, opisie lub ścieżce",
    sortNewest: "Od najnowszych",
    sortTitle: "Według nazwy",
    sortStructure: "Według struktury",
    personal: "Osobisty",
    commercial: "Komercyjny",
    system: "Systemowy",
    draft: "Szkic",
    active: "Aktywny",
    inactive: "Nieaktywny",
    children: "Dzieci",
    descendantLeaves: "Liście poniżej",
    version: "Definicja",
    path: "Ścieżka",
    noDescription: "Nie dodano jeszcze opisu.",
    shown: "Pokazano",
    of: "z",
    open: "Otwórz obiekt",
  },
  ru: {
    eyebrow: "Объекты наблюдения",
    title: "Все объекты наблюдения",
    description:
      "Глобальные системные ЦО/ОН и объекты активного профиля в одном каталоге. Поиск и структурные фильтры работают по всей совокупности.",
    total: "Всего",
    roots: "Корни",
    intermediate: "Промежуточные",
    leaves: "Листы",
    allObjects: "Все объекты",
    rootObjects: "Корни",
    intermediateObjects: "Промежуточные",
    leafObjects: "Листы",
    drafts: "Черновики",
    searchPlaceholder: "Поиск по названию, описанию или пути",
    sortNewest: "Сначала новые",
    sortTitle: "По названию",
    sortStructure: "По структуре",
    personal: "Личный",
    commercial: "Коммерческий",
    system: "Системный",
    draft: "Черновик",
    active: "Активный",
    inactive: "Неактивный",
    children: "Дочерние",
    descendantLeaves: "Листов ниже",
    version: "Версия",
    path: "Путь",
    noDescription: "Описание пока не добавлено.",
    shown: "Показано",
    of: "из",
    open: "Открыть объект",
  },
  uk: {
    eyebrow: "Об’єкти спостереження",
    title: "Об’єкти спостереження",
    description:
      "Корені, проміжні об’єкти та листи активного профілю. Список організовано для швидкої навігації деревом спостережень.",
    total: "Разом",
    roots: "Корені",
    intermediate: "Проміжні",
    leaves: "Листи",
    allObjects: "Усі об’єкти",
    rootObjects: "Корені",
    intermediateObjects: "Проміжні",
    leafObjects: "Листи",
    drafts: "Чернетки",
    searchPlaceholder: "Пошук за назвою, описом або шляхом",
    sortNewest: "Спочатку нові",
    sortTitle: "За назвою",
    sortStructure: "За структурою",
    personal: "Особистий",
    commercial: "Комерційний",
    system: "Системний",
    draft: "Чернетка",
    active: "Активний",
    inactive: "Неактивний",
    children: "Дочірні",
    descendantLeaves: "Листів нижче",
    version: "Версія",
    path: "Шлях",
    noDescription: "Опис ще не додано.",
    shown: "Показано",
    of: "з",
    open: "Відкрити об’єкт",
  },
  de: {
    eyebrow: "Beobachtungsobjekte",
    title: "Beobachtungsobjekte",
    description:
      "Wurzeln, Zwischenobjekte und Blätter des aktiven Profils. Die Liste ist für eine schnelle Navigation im Beobachtungsbaum aufgebaut.",
    total: "Gesamt",
    roots: "Wurzeln",
    intermediate: "Zwischenobjekte",
    leaves: "Blätter",
    allObjects: "Alle Objekte",
    rootObjects: "Wurzeln",
    intermediateObjects: "Zwischenobjekte",
    leafObjects: "Blätter",
    drafts: "Entwürfe",
    searchPlaceholder: "Nach Name, Beschreibung oder Pfad suchen",
    sortNewest: "Neueste zuerst",
    sortTitle: "Nach Name",
    sortStructure: "Nach Struktur",
    personal: "Persönlich",
    commercial: "Kommerziell",
    system: "System",
    draft: "Entwurf",
    active: "Aktiv",
    inactive: "Inaktiv",
    children: "Kinder",
    descendantLeaves: "Blätter darunter",
    version: "Definition",
    path: "Pfad",
    noDescription: "Noch keine Beschreibung.",
    shown: "Gezeigt",
    of: "von",
    open: "Objekt öffnen",
  },
  es: {
    eyebrow: "Objetos de observación",
    title: "Objetos de observación",
    description:
      "Raíces, objetos intermedios y hojas del perfil activo. La lista está organizada para navegar rápidamente por el árbol de observación.",
    total: "Total",
    roots: "Raíces",
    intermediate: "Intermedios",
    leaves: "Hojas",
    allObjects: "Todos los objetos",
    rootObjects: "Raíces",
    intermediateObjects: "Intermedios",
    leafObjects: "Hojas",
    drafts: "Borradores",
    searchPlaceholder: "Buscar por nombre, descripción o ruta",
    sortNewest: "Más recientes",
    sortTitle: "Por nombre",
    sortStructure: "Por estructura",
    personal: "Personal",
    commercial: "Comercial",
    system: "Sistema",
    draft: "Borrador",
    active: "Activo",
    inactive: "Inactivo",
    children: "Hijos",
    descendantLeaves: "Hojas debajo",
    version: "Definición",
    path: "Ruta",
    noDescription: "Todavía no hay descripción.",
    shown: "Mostrados",
    of: "de",
    open: "Abrir objeto",
  },
  cs: {
    eyebrow: "Objekty pozorování",
    title: "Objekty pozorování",
    description:
      "Kořeny, mezilehlé objekty a listy aktivního profilu. Seznam je uspořádán pro rychlou navigaci ve stromu pozorování.",
    total: "Celkem",
    roots: "Kořeny",
    intermediate: "Mezilehlé",
    leaves: "Listy",
    allObjects: "Všechny objekty",
    rootObjects: "Kořeny",
    intermediateObjects: "Mezilehlé",
    leafObjects: "Listy",
    drafts: "Koncepty",
    searchPlaceholder: "Hledat podle názvu, popisu nebo cesty",
    sortNewest: "Nejnovější",
    sortTitle: "Podle názvu",
    sortStructure: "Podle struktury",
    personal: "Osobní",
    commercial: "Komerční",
    system: "Systémový",
    draft: "Koncept",
    active: "Aktivní",
    inactive: "Neaktivní",
    children: "Děti",
    descendantLeaves: "Listů níže",
    version: "Definice",
    path: "Cesta",
    noDescription: "Popis zatím nebyl přidán.",
    shown: "Zobrazeno",
    of: "z",
    open: "Otevřít objekt",
  },
};

function useInterfaceLocale(): LocaleCode {
  const [locale, setLocale] = useState<LocaleCode>("en");

  useEffect(() => {
    function readLocaleFromUrl() {
      if (typeof window === "undefined") {
        return;
      }

      setLocale(getLocaleSearchParam(new URLSearchParams(window.location.search)));
    }

    readLocaleFromUrl();
    window.addEventListener("popstate", readLocaleFromUrl);

    return () => {
      window.removeEventListener("popstate", readLocaleFromUrl);
    };
  }, []);

  return locale;
}

function getErrorStatus(statusCode: number): ActualListStatus {
  if (statusCode === 401) {
    return "not_authenticated";
  }

  if (statusCode === 403) {
    return "forbidden";
  }

  return "error";
}

function getStatusText(
  status: ActualListStatus,
  t: (key: ValueObjectsMessageKey) => string,
) {
  if (status === "idle" || status === "loading") {
    return t("valueObjects.actual.loading");
  }

  if (status === "not_authenticated") {
    return t("valueObjects.actual.notAuthenticated");
  }

  if (status === "forbidden") {
    return t("valueObjects.actual.forbidden");
  }

  return t("valueObjects.actual.error");
}

function buildLocaleAwareHref(pathname: string, locale: LocaleCode) {
  if (locale === "en") {
    return pathname;
  }

  return `${pathname}?locale=${encodeURIComponent(locale)}`;
}

function getObjectDetailHref(valueObject: ActualValueObjectPayload) {
  return valueObject.id ? `/value-objects/${valueObject.id}` : "#";
}

function readPublicImageUrl(metadata: Record<string, unknown> | null | undefined) {
  const publicProfile =
    metadata &&
    typeof metadata.public_profile === "object" &&
    metadata.public_profile !== null &&
    !Array.isArray(metadata.public_profile)
      ? (metadata.public_profile as Record<string, unknown>)
      : null;

  const imageUrl = publicProfile?.image_url;

  return typeof imageUrl === "string" && imageUrl.trim()
    ? imageUrl.trim()
    : null;
}

function getSemanticRole(valueObject: ActualValueObjectPayload): SemanticRole {
  if (
    valueObject.ontology_node_role_code === "root" ||
    valueObject.ontology_node_role_code === "intermediate" ||
    valueObject.ontology_node_role_code === "leaf"
  ) {
    return valueObject.ontology_node_role_code;
  }

  if (
    valueObject.id &&
    valueObject.parent_value_object_id === null &&
    valueObject.root_value_object_id === valueObject.id
  ) {
    return "root";
  }

  if (valueObject.node_role_code === "activity_leaf") {
    return "leaf";
  }

  return "intermediate";
}

function roleBadgeClass(role: SemanticRole) {
  if (role === "root") {
    return "border-[#dfe4ff] bg-[#eef2ff] text-[#3b6ef8]";
  }

  if (role === "leaf") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-violet-200 bg-violet-50 text-violet-700";
}

function statusBadgeClass(status: string | null | undefined) {
  if (status === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "inactive") {
    return "border-slate-200 bg-slate-50 text-slate-600";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function getRoleLabel(
  role: SemanticRole,
  copy: LocalCopy,
): string {
  if (role === "root") {
    return copy.rootObjects;
  }

  if (role === "leaf") {
    return copy.leafObjects;
  }

  return copy.intermediateObjects;
}

function getStatusLabel(
  status: string | null | undefined,
  copy: LocalCopy,
) {
  if (status === "active") {
    return copy.active;
  }

  if (status === "inactive") {
    return copy.inactive;
  }

  return copy.draft;
}

function getContextLabel(
  valueObject: ActualValueObjectPayload,
  copy: LocalCopy,
) {
  if (
    valueObject.scope_code === "global" ||
    valueObject.origin_type_code === "system"
  ) {
    return copy.system;
  }

  if (valueObject.usage_scope === "commercial") {
    return (
      valueObject.organizations?.organization_name?.trim() ||
      copy.commercial
    );
  }

  return copy.personal;
}

function getFacetLabel(valueObject: ActualValueObjectPayload) {
  return (
    valueObject.facet_code?.trim() ||
    valueObject.object_kind_code?.trim() ||
    valueObject.object_kind?.trim() ||
    "—"
  );
}

function getKindLabel(valueObject: ActualValueObjectPayload) {
  return (
    valueObject.object_kind_code?.trim() ||
    valueObject.object_kind?.trim() ||
    "—"
  );
}

function roleIcon(role: SemanticRole) {
  if (role === "root") {
    return Network;
  }

  if (role === "leaf") {
    return Leaf;
  }

  return Layers3;
}

type ActualValueObjectsListProps = {
  readonly tableWorkspaceOnly?: boolean;
};

export function ActualValueObjectsList({
  tableWorkspaceOnly = false,
}: ActualValueObjectsListProps = {}) {
  const locale = useInterfaceLocale();
  const copy = COPY[locale] ?? COPY.en;
  const t = useMemo(
    () => (key: ValueObjectsMessageKey) => getValueObjectsMessage(key, locale),
    [locale],
  );

  const [status, setStatus] = useState<ActualListStatus>("idle");
  const [valueObjects, setValueObjects] = useState<ActualValueObjectPayload[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [query, setQuery] = useState("");
  const [hierarchyPathIds, setHierarchyPathIds] = useState<string[]>([]);

  useEffect(() => {
    const abortController = new AbortController();

    async function loadValueObjects() {
      setStatus("loading");
      setErrorMessage("");

      try {
        const valueObjectsUrl = new URL("/api/value-objects", window.location.origin);
        valueObjectsUrl.searchParams.set("locale", locale);

        const response = await fetch(valueObjectsUrl.toString(), {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
          signal: abortController.signal,
        });

        const data = (await response
          .json()
          .catch(() => ({}))) as ActualValueObjectsResponse;

        if (!response.ok || !data.ok) {
          setValueObjects([]);
          setErrorMessage(data.error ?? `HTTP ${response.status}`);
          setStatus(getErrorStatus(response.status));
          return;
        }

        setValueObjects(Array.isArray(data.valueObjects) ? data.valueObjects : []);
        setStatus("success");

      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        setValueObjects([]);
        setErrorMessage(
          error instanceof Error ? error.message : "Unknown client read error",
        );
        setStatus("error");
      }
    }

    void loadValueObjects();

    return () => {
      abortController.abort();
    };
  }, [locale]);

  const objectsById = useMemo(() => {
    const map = new Map<string, ActualValueObjectPayload>();

    for (const valueObject of valueObjects) {
      if (valueObject.id) {
        map.set(valueObject.id, valueObject);
      }
    }

    return map;
  }, [valueObjects]);

  const childrenByParent = useMemo(() => {
    const map = new Map<string, ActualValueObjectPayload[]>();

    for (const valueObject of valueObjects) {
      const parentId = valueObject.parent_value_object_id;
      if (!parentId) {
        continue;
      }

      const children = map.get(parentId) ?? [];
      children.push(valueObject);
      map.set(parentId, children);
    }

    return map;
  }, [valueObjects]);

  const hierarchyVisibleIds = useMemo(() => {
    const selectedId =
      hierarchyPathIds.length > 0
        ? hierarchyPathIds[hierarchyPathIds.length - 1]
        : null;

    if (!selectedId || !objectsById.has(selectedId)) {
      return null;
    }

    const visible = new Set<string>();
    const stack = [selectedId];

    while (stack.length > 0) {
      const currentId = stack.pop();
      if (!currentId || visible.has(currentId)) {
        continue;
      }

      visible.add(currentId);

      for (const child of childrenByParent.get(currentId) ?? []) {
        if (child.id && !visible.has(child.id)) {
          stack.push(child.id);
        }
      }
    }

    return visible;
  }, [childrenByParent, hierarchyPathIds, objectsById]);

  const pathById = useMemo(() => {
    const map = new Map<string, string>();

    for (const valueObject of valueObjects) {
      if (!valueObject.id) {
        continue;
      }

      const path: string[] = [];
      const visited = new Set<string>();
      let cursor: ActualValueObjectPayload | undefined = valueObject;

      while (cursor?.id && !visited.has(cursor.id)) {
        visited.add(cursor.id);
        path.unshift(cursor.title?.trim() || "—");

        const parentId = cursor.parent_value_object_id;
        if (!parentId) {
          break;
        }

        cursor = objectsById.get(parentId);
      }

      map.set(valueObject.id, path.join(" → "));
    }

    return map;
  }, [objectsById, valueObjects]);

  const descendantLeafCountById = useMemo(() => {
    const cache = new Map<string, number>();

    function count(objectId: string, visited = new Set<string>()): number {
      if (cache.has(objectId)) {
        return cache.get(objectId) ?? 0;
      }

      if (visited.has(objectId)) {
        return 0;
      }

      const nextVisited = new Set(visited);
      nextVisited.add(objectId);

      const children = childrenByParent.get(objectId) ?? [];
      let total = 0;

      for (const child of children) {
        if (!child.id) {
          continue;
        }

        if (getSemanticRole(child) === "leaf") {
          total += 1;
        } else {
          total += count(child.id, nextVisited);
        }
      }

      cache.set(objectId, total);
      return total;
    }

    for (const valueObject of valueObjects) {
      if (valueObject.id) {
        count(valueObject.id);
      }
    }

    return cache;
  }, [childrenByParent, valueObjects]);

  const counts = useMemo(() => {
    let roots = 0;
    let intermediate = 0;
    let leaves = 0;

    for (const valueObject of valueObjects) {
      const role = getSemanticRole(valueObject);

      if (role === "root") {
        roots += 1;
      } else if (role === "leaf") {
        leaves += 1;
      } else {
        intermediate += 1;
      }
    }

    return {
      total: valueObjects.length,
      roots,
      intermediate,
      leaves,
    };
  }, [valueObjects]);

  const filteredObjects = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale);

    const filtered = valueObjects.filter((valueObject) => {
      const role = getSemanticRole(valueObject);

      if (roleFilter === "root" && role !== "root") {
        return false;
      }

      if (roleFilter === "intermediate" && role !== "intermediate") {
        return false;
      }

      if (roleFilter === "leaf" && role !== "leaf") {
        return false;
      }

      if (roleFilter === "draft" && valueObject.status !== "draft") {
        return false;
      }

      if (
        hierarchyVisibleIds &&
        (!valueObject.id || !hierarchyVisibleIds.has(valueObject.id))
      ) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const path = valueObject.id ? pathById.get(valueObject.id) ?? "" : "";
      const haystack = [
        valueObject.title,
        valueObject.description,
        valueObject.canonical_key,
        valueObject.facet_code,
        valueObject.object_kind_code,
        valueObject.object_kind,
        path,
      ]
        .filter((item): item is string => typeof item === "string")
        .join(" ")
        .toLocaleLowerCase(locale);

      return haystack.includes(normalizedQuery);
    });

    return [...filtered].sort((a, b) => {
      if (sortMode === "title") {
        return (a.title ?? "").localeCompare(b.title ?? "", locale);
      }

      if (sortMode === "structure") {
        const pathA = a.id ? pathById.get(a.id) ?? "" : "";
        const pathB = b.id ? pathById.get(b.id) ?? "" : "";
        return pathA.localeCompare(pathB, locale);
      }

      const timeA = Date.parse(a.created_at ?? "") || 0;
      const timeB = Date.parse(b.created_at ?? "") || 0;
      return timeB - timeA;
    });
  }, [
    hierarchyVisibleIds,
    locale,
    pathById,
    query,
    roleFilter,
    sortMode,
    valueObjects,
  ]);

  const filters: Array<{
    value: RoleFilter;
    label: string;
  }> = [
    { value: "all", label: copy.allObjects },
    { value: "root", label: copy.rootObjects },
    { value: "intermediate", label: copy.intermediateObjects },
    { value: "leaf", label: copy.leafObjects },
    { value: "draft", label: copy.drafts },
  ];

  return (
    <section
      className={tableWorkspaceOnly ? "grid gap-2" : "grid gap-4"}
      aria-label={copy.title}
    >
      <header className={tableWorkspaceOnly ? "hidden" : undefined}>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
          {copy.eyebrow}
        </div>
        <h1 className="mt-1 text-[22px] font-bold leading-tight text-[#111827]">
          {copy.title}
        </h1>
        <p className="mt-1 max-w-[880px] text-[13px] leading-5 text-[#7c8099]">
          {copy.description}
        </p>
      </header>

      <div
        className={
          tableWorkspaceOnly
            ? "hidden"
            : "grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        }
      >
        {[
          [copy.total, counts.total],
          [copy.roots, counts.roots],
          [copy.intermediate, counts.intermediate],
          [copy.leaves, counts.leaves],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-[20px] border border-black/[0.07] bg-white p-5 shadow-sm"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#7c8099]">
              {label}
            </div>
            <div className="mt-3 text-[26px] font-bold text-[#111827]">
              {value}
            </div>
          </div>
        ))}
      </div>

      <div
        className={
          tableWorkspaceOnly ? "hidden" : "flex flex-wrap items-center gap-2"
        }
      >
        {filters.map((filter) => {
          const selected = roleFilter === filter.value;

          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setRoleFilter(filter.value)}
              className={[
                "rounded-xl border px-4 py-2 text-[12px] font-semibold shadow-sm transition",
                selected
                  ? "border-[#3b6ef8] bg-[#3b6ef8] text-white"
                  : "border-[#dfe3f1] bg-white text-[#4a4f6a] hover:bg-gray-50",
              ].join(" ")}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <div
        className={
          tableWorkspaceOnly
            ? "hidden"
            : "grid gap-3 rounded-[20px] border border-black/[0.07] bg-white p-4 shadow-sm md:grid-cols-[1fr_auto]"
        }
      >
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[#dfe3f1] bg-[#f8fafc] px-3">
          <Search size={16} className="shrink-0 text-[#7c8099]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.searchPlaceholder}
            className="w-full bg-transparent text-[13px] text-[#111827] outline-none placeholder:text-[#9ca3b8]"
          />
        </label>

        <select
          value={sortMode}
          onChange={(event) => setSortMode(event.target.value as SortMode)}
          className="min-h-11 rounded-xl border border-[#dfe3f1] bg-white px-4 text-[12px] font-semibold text-[#4a4f6a] outline-none"
        >
          <option value="newest">{copy.sortNewest}</option>
          <option value="title">{copy.sortTitle}</option>
          <option value="structure">{copy.sortStructure}</option>
        </select>
      </div>

      {status !== "success" ? (
        <div className="rounded-[18px] border border-[#fed7aa] bg-[#fff7ed] p-4 text-[13px] font-semibold text-[#9a3412]">
          {getStatusText(status, t)}
          {errorMessage ? ` ${errorMessage}` : ""}
        </div>
      ) : null}

      {status === "success" && valueObjects.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-[#c9d5ff] bg-[#f7f9ff] p-5 text-[13px] leading-5 text-[#4a4f6a]">
          {t("valueObjects.actual.empty")}
        </div>
      ) : null}

      {status === "success" && valueObjects.length > 0 ? (
        <>
          <ValueObjectCatalogViews
            valueObjects={valueObjects}
            locale={locale}
            query={query}
            roleFilter={roleFilter}
            sortMode={sortMode}
            hierarchyPathIds={hierarchyPathIds}
            onHierarchyPathChange={setHierarchyPathIds}
            onValueObjectDeleted={(deletedId) => {
              setValueObjects((current) =>
                current.filter((valueObject) => valueObject.id !== deletedId),
              );
              setHierarchyPathIds((current) =>
                current.includes(deletedId) ? [] : current,
              );
            }}
            onValueObjectReparented={(movedId, newParentId) => {
              setValueObjects((current) =>
                current.map((valueObject) =>
                  valueObject.id === movedId
                    ? { ...valueObject, parent_value_object_id: newParentId }
                    : valueObject,
                ),
              );
              setHierarchyPathIds((current) =>
                current.includes(movedId) ? [] : current,
              );
            }}
            onValueObjectUpdated={(updatedValueObject) => {
              setValueObjects((current) =>
                current.map((valueObject) =>
                  valueObject.id === updatedValueObject.id
                    ? { ...valueObject, ...updatedValueObject }
                    : valueObject,
                ),
              );
            }}
            onValueObjectCreated={(createdValueObject) => {
              setValueObjects((current) =>
                current.some(
                  (valueObject) => valueObject.id === createdValueObject.id,
                )
                  ? current.map((valueObject) =>
                      valueObject.id === createdValueObject.id
                        ? { ...valueObject, ...createdValueObject }
                        : valueObject,
                    )
                  : [...current, createdValueObject],
              );
            }}
          >
            <div className="grid gap-3 xl:grid-cols-2">
              {filteredObjects.map((valueObject) => {
              const title =
                valueObject.title?.trim() || t("valueObjects.actual.noTitle");
              const role = getSemanticRole(valueObject);
              const RoleIcon = roleIcon(role);
              const imageUrl = readPublicImageUrl(valueObject.metadata_json);
              const directChildren = valueObject.id
                ? childrenByParent.get(valueObject.id)?.length ?? 0
                : 0;
              const descendantLeaves = valueObject.id
                ? descendantLeafCountById.get(valueObject.id) ?? 0
                : 0;
              const path = valueObject.id
                ? pathById.get(valueObject.id) ?? title
                : title;
              const definitionVersion =
                valueObject.definition_version ?? 1;
              const showTechnicalCodes =
                valueObject.scope_code === "global" ||
                valueObject.usage_scope === "commercial";

              return (
                <article
                  key={valueObject.id ?? title}
                  className="min-w-0 w-full max-w-full overflow-hidden rounded-[20px] border border-[#dfe3f1] bg-white p-3 shadow-sm transition hover:border-[#c9d5ff] hover:shadow-md sm:p-4"
                >
                  <div className="flex min-w-0 gap-3 sm:gap-4">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#dfe4ff] bg-[#eef2ff] text-[#3b6ef8] sm:h-24 sm:w-24">
                      {imageUrl ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element -- User-configured public image URLs may use arbitrary hosts; native img avoids coupling authoring to the Next image host allowlist. */}
                          <img
                            src={imageUrl}
                            alt={title}
                            className="h-full w-full object-cover object-center"
                          />
                        </>
                      ) : (
                        <RoleIcon size={34} strokeWidth={1.5} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={[
                              "rounded-full border px-2.5 py-1 text-[10px] font-bold",
                              roleBadgeClass(role),
                            ].join(" ")}
                          >
                            {getRoleLabel(role, copy)}
                          </span>

                          <span
                            className={[
                              "rounded-full border px-2.5 py-1 text-[10px] font-bold",
                              statusBadgeClass(valueObject.status),
                            ].join(" ")}
                          >
                            {getStatusLabel(valueObject.status, copy)}
                          </span>

                          <span className="rounded-full border border-[#e7eaf3] bg-[#f8fafc] px-2.5 py-1 text-[10px] font-semibold text-[#5a5f7a]">
                            {getContextLabel(valueObject, copy)}
                          </span>
                        </div>

                        <Link
                          prefetch={false}
                          href={buildLocaleAwareHref(getObjectDetailHref(valueObject), locale)}
                          className="shrink-0 text-[12px] font-bold text-[#3b6ef8] hover:underline"
                        >
                          {copy.open}
                        </Link>
                      </div>

                      <h2 className="mt-2 break-words text-[16px] font-bold text-[#111827] sm:truncate">
                        {title}
                      </h2>

                      {showTechnicalCodes ? (
                        <>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7c8099]">
                            <span>{getFacetLabel(valueObject)}</span>
                            <span aria-hidden="true">·</span>
                            <span>{getKindLabel(valueObject)}</span>
                          </div>

                          {valueObject.canonical_key ? (
                            <div className="mt-1 break-all font-mono text-[10px] text-[#8b91a7] sm:truncate">
                              {valueObject.canonical_key}
                            </div>
                          ) : null}
                        </>
                      ) : null}

                      <p className="mt-2 max-h-10 overflow-hidden text-[12px] leading-5 text-[#5a5f7a]">
                        {valueObject.description?.trim() || copy.noDescription}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-[#edf0f7] bg-[#fafbff] px-3 py-2.5">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7c8099]">
                      {copy.path}
                    </div>
                    <div className="mt-1 break-words text-[12px] font-semibold text-[#334155] sm:truncate">
                      {path}
                    </div>
                  </div>

                  <div className="mt-3 grid min-w-0 grid-cols-3 gap-2">
                    {[
                      [copy.children, directChildren],
                      [copy.descendantLeaves, descendantLeaves],
                      [copy.version, definitionVersion],
                    ].map(([label, value]) => (
                      <div
                        key={String(label)}
                        className="min-w-0 rounded-xl border border-[#edf0f7] bg-[#f8fafc] px-2 py-3 text-center sm:px-3"
                      >
                        <div className="break-words text-[9px] font-semibold uppercase tracking-[0.06em] text-[#7c8099] sm:text-[10px] sm:tracking-[0.1em]">
                          {label}
                        </div>
                        <div className="mt-1 text-[14px] font-bold text-[#111827]">
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
            </div>
          </ValueObjectCatalogViews>

          <div className="rounded-[18px] border border-black/[0.07] bg-white px-4 py-3 text-[12px] text-[#7c8099] shadow-sm">
            {copy.shown} {filteredObjects.length} {copy.of} {valueObjects.length}
          </div>
        </>
      ) : null}
    </section>
  );
}

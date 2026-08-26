"use client";

import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Layers3,
  LayoutGrid,
  Leaf,
  ListTree,
  Map as MapIcon,
  Network,
  Plus,
} from "lucide-react";
import { Fragment, type ReactNode, useMemo, useState } from "react";

import { ValueObjectMindMap } from "./value-object-mind-map";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";
type RoleFilter = "all" | "root" | "intermediate" | "leaf" | "draft";
type SortMode = "newest" | "title" | "structure";
type SemanticRole = "root" | "intermediate" | "leaf";
type ViewMode = "tree" | "cards" | "map";

type OrganizationPayload = {
  organization_name?: string | null;
};

type ValueObjectPayload = {
  id?: string | null;
  usage_scope?: string | null;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  created_at?: string | null;
  organizations?: OrganizationPayload | null;
  node_role_code?: string | null;
  root_value_object_id?: string | null;
  parent_value_object_id?: string | null;
  ontology_node_role_code?: string | null;
  scope_code?: string | null;
  origin_type_code?: string | null;
  definition_version?: number | null;
};

type CatalogCopy = {
  tree: string;
  cards: string;
  map: string;
  rootFilter: string;
  insideFilter: string;
  allRoots: string;
  allChildren: string;
  resetHierarchy: string;
  selectedBranch: string;
  expandAll: string;
  collapseAll: string;
  object: string;
  role: string;
  directChildren: string;
  descendants: string;
  leaves: string;
  status: string;
  action: string;
  open: string;
  root: string;
  intermediate: string;
  leaf: string;
  active: string;
  draft: string;
  inactive: string;
  personal: string;
  commercial: string;
  system: string;
  matches: string;
  objects: string;
  noDescription: string;
  addChild: string;
};

const COPY: Record<LocaleCode, CatalogCopy> = {
  en: {
    tree: "Tree",
    cards: "Cards",
    map: "Map",
    rootFilter: "Root object",
    insideFilter: "Inside “{parent}”",
    allRoots: "All root objects",
    allChildren: "All child objects",
    resetHierarchy: "Reset",
    selectedBranch: "Selected branch",
    expandAll: "Expand all",
    collapseAll: "Collapse all",
    object: "Observation object",
    role: "Role",
    directChildren: "Direct",
    descendants: "Descendants",
    leaves: "Leaves",
    status: "Status",
    action: "Action",
    open: "Open",
    root: "Root",
    intermediate: "Intermediate",
    leaf: "Leaf",
    active: "Active",
    draft: "Draft",
    inactive: "Inactive",
    personal: "Personal",
    commercial: "Commercial",
    system: "System",
    matches: "matches",
    objects: "objects",
    noDescription: "No description yet.",
    addChild: "Add child object",
  },
  pl: {
    tree: "Drzewo",
    cards: "Karty",
    map: "Mapa",
    rootFilter: "Obiekt główny",
    insideFilter: "Wewnątrz „{parent}”",
    allRoots: "Wszystkie obiekty główne",
    allChildren: "Wszystkie obiekty podrzędne",
    resetHierarchy: "Wyczyść",
    selectedBranch: "Wybrana gałąź",
    expandAll: "Rozwiń wszystko",
    collapseAll: "Zwiń wszystko",
    object: "Obiekt obserwacji",
    role: "Rola",
    directChildren: "Dzieci",
    descendants: "Potomkowie",
    leaves: "Liście",
    status: "Status",
    action: "Akcja",
    open: "Otwórz",
    root: "Korzeń",
    intermediate: "Pośredni",
    leaf: "Liść",
    active: "Aktywny",
    draft: "Szkic",
    inactive: "Nieaktywny",
    personal: "Osobisty",
    commercial: "Komercyjny",
    system: "Systemowy",
    matches: "pasuje",
    objects: "obiektów",
    noDescription: "Nie dodano jeszcze opisu.",
    addChild: "Dodaj obiekt podrzędny",
  },
  ru: {
    tree: "Дерево",
    cards: "Карточки",
    map: "Карта",
    rootFilter: "Корневой объект",
    insideFilter: "Внутри «{parent}»",
    allRoots: "Все корневые объекты",
    allChildren: "Все дочерние объекты",
    resetHierarchy: "Сбросить",
    selectedBranch: "Выбранная ветвь",
    expandAll: "Развернуть все",
    collapseAll: "Свернуть все",
    object: "Объект наблюдения",
    role: "Роль",
    directChildren: "Дочерние",
    descendants: "Потомки",
    leaves: "Листы",
    status: "Статус",
    action: "Действие",
    open: "Открыть",
    root: "Корень",
    intermediate: "Промежуточный",
    leaf: "Лист",
    active: "Активный",
    draft: "Черновик",
    inactive: "Неактивный",
    personal: "Личный",
    commercial: "Коммерческий",
    system: "Системный",
    matches: "совпадений",
    objects: "объектов",
    noDescription: "Описание пока не добавлено.",
    addChild: "Добавить дочерний объект",
  },
  uk: {
    tree: "Дерево",
    cards: "Картки",
    map: "Мапа",
    rootFilter: "Кореневий об’єкт",
    insideFilter: "Усередині «{parent}»",
    allRoots: "Усі кореневі об’єкти",
    allChildren: "Усі дочірні об’єкти",
    resetHierarchy: "Скинути",
    selectedBranch: "Вибрана гілка",
    expandAll: "Розгорнути все",
    collapseAll: "Згорнути все",
    object: "Об’єкт спостереження",
    role: "Роль",
    directChildren: "Дочірні",
    descendants: "Нащадки",
    leaves: "Листи",
    status: "Статус",
    action: "Дія",
    open: "Відкрити",
    root: "Корінь",
    intermediate: "Проміжний",
    leaf: "Лист",
    active: "Активний",
    draft: "Чернетка",
    inactive: "Неактивний",
    personal: "Особистий",
    commercial: "Комерційний",
    system: "Системний",
    matches: "збігів",
    objects: "об’єктів",
    noDescription: "Опис ще не додано.",
    addChild: "Додати дочірній об’єкт",
  },
  de: {
    tree: "Baum",
    cards: "Karten",
    map: "Karte",
    rootFilter: "Wurzelobjekt",
    insideFilter: "Innerhalb „{parent}“",
    allRoots: "Alle Wurzelobjekte",
    allChildren: "Alle untergeordneten Objekte",
    resetHierarchy: "Zurücksetzen",
    selectedBranch: "Ausgewählter Zweig",
    expandAll: "Alle aufklappen",
    collapseAll: "Alle zuklappen",
    object: "Beobachtungsobjekt",
    role: "Rolle",
    directChildren: "Direkt",
    descendants: "Nachkommen",
    leaves: "Blätter",
    status: "Status",
    action: "Aktion",
    open: "Öffnen",
    root: "Wurzel",
    intermediate: "Zwischenobjekt",
    leaf: "Blatt",
    active: "Aktiv",
    draft: "Entwurf",
    inactive: "Inaktiv",
    personal: "Persönlich",
    commercial: "Kommerziell",
    system: "System",
    matches: "Treffer",
    objects: "Objekte",
    noDescription: "Noch keine Beschreibung.",
    addChild: "Untergeordnetes Objekt hinzufügen",
  },
  es: {
    tree: "Árbol",
    cards: "Tarjetas",
    map: "Mapa",
    rootFilter: "Objeto raíz",
    insideFilter: "Dentro de «{parent}»",
    allRoots: "Todos los objetos raíz",
    allChildren: "Todos los objetos hijos",
    resetHierarchy: "Restablecer",
    selectedBranch: "Rama seleccionada",
    expandAll: "Expandir todo",
    collapseAll: "Contraer todo",
    object: "Objeto de observación",
    role: "Rol",
    directChildren: "Directos",
    descendants: "Descendientes",
    leaves: "Hojas",
    status: "Estado",
    action: "Acción",
    open: "Abrir",
    root: "Raíz",
    intermediate: "Intermedio",
    leaf: "Hoja",
    active: "Activo",
    draft: "Borrador",
    inactive: "Inactivo",
    personal: "Personal",
    commercial: "Comercial",
    system: "Sistema",
    matches: "coincidencias",
    objects: "objetos",
    noDescription: "Todavía no hay descripción.",
    addChild: "Añadir objeto hijo",
  },
  cs: {
    tree: "Strom",
    cards: "Karty",
    map: "Mapa",
    rootFilter: "Kořenový objekt",
    insideFilter: "Uvnitř „{parent}“",
    allRoots: "Všechny kořenové objekty",
    allChildren: "Všechny podřízené objekty",
    resetHierarchy: "Obnovit",
    selectedBranch: "Vybraná větev",
    expandAll: "Rozbalit vše",
    collapseAll: "Sbalit vše",
    object: "Objekt pozorování",
    role: "Role",
    directChildren: "Přímé",
    descendants: "Potomci",
    leaves: "Listy",
    status: "Stav",
    action: "Akce",
    open: "Otevřít",
    root: "Kořen",
    intermediate: "Mezilehlý",
    leaf: "List",
    active: "Aktivní",
    draft: "Koncept",
    inactive: "Neaktivní",
    personal: "Osobní",
    commercial: "Komerční",
    system: "Systémový",
    matches: "shod",
    objects: "objektů",
    noDescription: "Popis zatím nebyl přidán.",
    addChild: "Přidat podřízený objekt",
  },
};

function getSemanticRole(valueObject: ValueObjectPayload): SemanticRole {
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

function getRoleLabel(role: SemanticRole, copy: CatalogCopy) {
  if (role === "root") return copy.root;
  if (role === "leaf") return copy.leaf;
  return copy.intermediate;
}

function getStatusLabel(status: string | null | undefined, copy: CatalogCopy) {
  if (status === "active") return copy.active;
  if (status === "inactive") return copy.inactive;
  return copy.draft;
}

function getContextLabel(valueObject: ValueObjectPayload, copy: CatalogCopy) {
  if (
    valueObject.scope_code === "global" ||
    valueObject.origin_type_code === "system"
  ) {
    return copy.system;
  }

  if (valueObject.usage_scope === "commercial") {
    return valueObject.organizations?.organization_name?.trim() || copy.commercial;
  }

  return copy.personal;
}

function roleIcon(role: SemanticRole) {
  if (role === "root") return Network;
  if (role === "leaf") return Leaf;
  return Layers3;
}

function buildLocaleAwareHref(pathname: string, locale: LocaleCode) {
  if (locale === "en") return pathname;
  return `${pathname}?locale=${encodeURIComponent(locale)}`;
}

function sortObjects(
  objects: ValueObjectPayload[],
  sortMode: SortMode,
  locale: LocaleCode,
) {
  return [...objects].sort((a, b) => {
    if (sortMode === "newest") {
      const timeA = Date.parse(a.created_at ?? "") || 0;
      const timeB = Date.parse(b.created_at ?? "") || 0;
      const timeDifference = timeB - timeA;
      if (timeDifference !== 0) return timeDifference;
    }

    return (a.title ?? "").localeCompare(b.title ?? "", locale);
  });
}

type TreeRow = {
  valueObject: ValueObjectPayload;
  depth: number;
  directChildren: number;
  descendants: number;
  descendantLeaves: number;
  hasChildren: boolean;
};

type ValueObjectCatalogViewsProps = {
  valueObjects: ValueObjectPayload[];
  locale: LocaleCode;
  query: string;
  roleFilter: RoleFilter;
  sortMode: SortMode;
  hierarchyPathIds: readonly string[];
  onHierarchyPathChange: (pathIds: string[]) => void;
  children: ReactNode;
  onValueObjectDeleted?: (deletedId: string) => void;
  onValueObjectReparented?: (movedId: string, newParentId: string) => void;
  onValueObjectCreated?: (createdValueObject: ValueObjectPayload) => void;
};

export function ValueObjectCatalogViews({
  valueObjects,
  locale,
  query,
  roleFilter,
  sortMode,
  hierarchyPathIds,
  onHierarchyPathChange,
  children,
  onValueObjectDeleted,
  onValueObjectReparented,
  onValueObjectCreated,
}: ValueObjectCatalogViewsProps) {
  const copy = COPY[locale] ?? COPY.en;
  const [viewMode, setViewMode] = useState<ViewMode>("tree");
  const [expandedIds, setExpandedIds] = useState<Set<string> | null>(null);
  const [insertParentId, setInsertParentId] = useState<string | null>(null);

  const objectsById = useMemo(() => {
    const map = new Map<string, ValueObjectPayload>();
    for (const valueObject of valueObjects) {
      if (valueObject.id) map.set(valueObject.id, valueObject);
    }
    return map;
  }, [valueObjects]);

  const childrenByParent = useMemo(() => {
    const map = new Map<string, ValueObjectPayload[]>();
    for (const valueObject of valueObjects) {
      const parentId = valueObject.parent_value_object_id;
      if (!parentId || !valueObject.id) continue;
      const siblings = map.get(parentId) ?? [];
      siblings.push(valueObject);
      map.set(parentId, siblings);
    }
    return map;
  }, [valueObjects]);

  const roots = useMemo(
    () =>
      valueObjects.filter((valueObject) => {
        const parentId = valueObject.parent_value_object_id;
        return !parentId || !objectsById.has(parentId);
      }),
    [objectsById, valueObjects],
  );

  const hierarchyRoots = useMemo(
    () =>
      sortObjects(
        roots.filter((valueObject) => getSemanticRole(valueObject) === "root"),
        "title",
        locale,
      ),
    [locale, roots],
  );

  const hierarchyPathObjects = useMemo(() => {
    const result: Array<ValueObjectPayload & { id: string }> = [];
    let expectedParentId: string | null = null;

    for (const pathId of hierarchyPathIds) {
      const valueObject = objectsById.get(pathId);
      if (!valueObject?.id) {
        break;
      }

      if (result.length === 0) {
        if (getSemanticRole(valueObject) !== "root") {
          break;
        }
      } else if (valueObject.parent_value_object_id !== expectedParentId) {
        break;
      }

      result.push(valueObject as ValueObjectPayload & { id: string });
      expectedParentId = valueObject.id;
    }

    return result;
  }, [hierarchyPathIds, objectsById]);

  const selectedHierarchyId =
    hierarchyPathObjects.length > 0
      ? hierarchyPathObjects[hierarchyPathObjects.length - 1].id
      : null;

  const hierarchySubtreeIds = useMemo(() => {
    if (!selectedHierarchyId) {
      return null;
    }

    const subtree = new Set<string>();
    const stack = [selectedHierarchyId];

    while (stack.length > 0) {
      const currentId = stack.pop();
      if (!currentId || subtree.has(currentId)) {
        continue;
      }

      subtree.add(currentId);
      for (const child of childrenByParent.get(currentId) ?? []) {
        if (child.id && !subtree.has(child.id)) {
          stack.push(child.id);
        }
      }
    }

    return subtree;
  }, [childrenByParent, selectedHierarchyId]);

  const branchIds = useMemo(
    () =>
      valueObjects
        .filter(
          (valueObject): valueObject is ValueObjectPayload & { id: string } =>
            Boolean(
              valueObject.id &&
                (childrenByParent.get(valueObject.id)?.length ?? 0) > 0,
            ),
        )
        .map((valueObject) => valueObject.id),
    [childrenByParent, valueObjects],
  );

  const defaultExpandedIds = useMemo(
    () =>
      new Set(
        valueObjects.length <= 80
          ? branchIds
          : roots
              .map((valueObject) => valueObject.id)
              .filter((id): id is string => Boolean(id)),
      ),
    [branchIds, roots, valueObjects.length],
  );
  const activeExpandedIds = expandedIds ?? defaultExpandedIds;

  const pathById = useMemo(() => {
    const map = new Map<string, string>();
    for (const valueObject of valueObjects) {
      if (!valueObject.id) continue;
      const path: string[] = [];
      const visited = new Set<string>();
      let cursor: ValueObjectPayload | undefined = valueObject;
      while (cursor?.id && !visited.has(cursor.id)) {
        visited.add(cursor.id);
        path.unshift(cursor.title?.trim() || "—");
        const parentId = cursor.parent_value_object_id;
        if (!parentId) break;
        cursor = objectsById.get(parentId);
      }
      map.set(valueObject.id, path.join(" → "));
    }
    return map;
  }, [objectsById, valueObjects]);

  const descendantCountById = useMemo(() => {
    const cache = new Map<string, number>();
    function count(objectId: string, visited = new Set<string>()): number {
      if (cache.has(objectId)) return cache.get(objectId) ?? 0;
      if (visited.has(objectId)) return 0;
      const nextVisited = new Set(visited);
      nextVisited.add(objectId);
      const childObjects = childrenByParent.get(objectId) ?? [];
      let total = childObjects.length;
      for (const child of childObjects) {
        if (child.id) total += count(child.id, nextVisited);
      }
      cache.set(objectId, total);
      return total;
    }
    for (const valueObject of valueObjects) {
      if (valueObject.id) count(valueObject.id);
    }
    return cache;
  }, [childrenByParent, valueObjects]);

  const descendantLeafCountById = useMemo(() => {
    const cache = new Map<string, number>();
    function count(objectId: string, visited = new Set<string>()): number {
      if (cache.has(objectId)) return cache.get(objectId) ?? 0;
      if (visited.has(objectId)) return 0;
      const nextVisited = new Set(visited);
      nextVisited.add(objectId);
      let total = 0;
      for (const child of childrenByParent.get(objectId) ?? []) {
        if (!child.id) continue;
        if (getSemanticRole(child) === "leaf") total += 1;
        else total += count(child.id, nextVisited);
      }
      cache.set(objectId, total);
      return total;
    }
    for (const valueObject of valueObjects) {
      if (valueObject.id) count(valueObject.id);
    }
    return cache;
  }, [childrenByParent, valueObjects]);

  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  const searchRoleFilterActive =
    Boolean(normalizedQuery) || roleFilter !== "all";
  const hierarchyFilterActive = Boolean(selectedHierarchyId);
  const filterActive = searchRoleFilterActive || hierarchyFilterActive;

  const matchingIds = useMemo(() => {
    const matches = new Set<string>();
    for (const valueObject of valueObjects) {
      if (!valueObject.id) continue;
      if (hierarchySubtreeIds && !hierarchySubtreeIds.has(valueObject.id)) {
        continue;
      }
      const role = getSemanticRole(valueObject);
      if (roleFilter === "root" && role !== "root") continue;
      if (roleFilter === "intermediate" && role !== "intermediate") continue;
      if (roleFilter === "leaf" && role !== "leaf") continue;
      if (roleFilter === "draft" && valueObject.status !== "draft") continue;

      if (normalizedQuery) {
        const haystack = [
          valueObject.title,
          valueObject.description,
          pathById.get(valueObject.id),
        ]
          .filter((item): item is string => typeof item === "string")
          .join(" ")
          .toLocaleLowerCase(locale);
        if (!haystack.includes(normalizedQuery)) continue;
      }
      matches.add(valueObject.id);
    }
    return matches;
  }, [
    hierarchySubtreeIds,
    locale,
    normalizedQuery,
    pathById,
    roleFilter,
    valueObjects,
  ]);

  const visibleIds = useMemo(() => {
    if (hierarchySubtreeIds && !searchRoleFilterActive) {
      return new Set(hierarchySubtreeIds);
    }

    if (!filterActive) {
      return new Set(
        valueObjects
          .map((valueObject) => valueObject.id)
          .filter((id): id is string => Boolean(id)),
      );
    }

    const visible = new Set<string>();
    for (const id of matchingIds) {
      let cursor = objectsById.get(id);
      const visited = new Set<string>();
      while (cursor?.id && !visited.has(cursor.id)) {
        visited.add(cursor.id);
        visible.add(cursor.id);

        if (selectedHierarchyId && cursor.id === selectedHierarchyId) {
          break;
        }

        const parentId = cursor.parent_value_object_id;
        if (!parentId) break;
        cursor = objectsById.get(parentId);
      }
    }
    return visible;
  }, [
    filterActive,
    hierarchySubtreeIds,
    matchingIds,
    objectsById,
    searchRoleFilterActive,
    selectedHierarchyId,
    valueObjects,
  ]);

  const treeRoots = useMemo(() => {
    if (!selectedHierarchyId) {
      return roots;
    }

    const selected = objectsById.get(selectedHierarchyId);
    return selected ? [selected] : [];
  }, [objectsById, roots, selectedHierarchyId]);

  const rows = useMemo(() => {
    const result: TreeRow[] = [];
    const visited = new Set<string>();

    function walk(valueObject: ValueObjectPayload, depth: number) {
      if (!valueObject.id || visited.has(valueObject.id)) return;
      if (!visibleIds.has(valueObject.id)) return;
      visited.add(valueObject.id);

      const childObjects = sortObjects(
        childrenByParent.get(valueObject.id) ?? [],
        sortMode,
        locale,
      );
      const hasChildren = childObjects.length > 0;
      result.push({
        valueObject,
        depth,
        directChildren: childObjects.length,
        descendants: descendantCountById.get(valueObject.id) ?? 0,
        descendantLeaves: descendantLeafCountById.get(valueObject.id) ?? 0,
        hasChildren,
      });

      const isExpanded = filterActive || activeExpandedIds.has(valueObject.id);
      if (!hasChildren || !isExpanded) return;

      for (const child of childObjects) {
        walk(child, depth + 1);
      }
    }

    for (const root of sortObjects(treeRoots, sortMode, locale)) {
      walk(root, 0);
    }

    // Do not re-walk descendants hidden by a collapsed ancestor as standalone roots.
    // Unknown-parent objects are already included in `roots`; structural cycles fail closed.
    return result;
  }, [
    childrenByParent,
    descendantCountById,
    descendantLeafCountById,
    activeExpandedIds,
    filterActive,
    locale,
    treeRoots,
    sortMode,
    visibleIds,
  ]);

  function updateHierarchyLevel(levelIndex: number, nextId: string) {
    const basePath = hierarchyPathObjects
      .slice(0, levelIndex)
      .map((valueObject) => valueObject.id);

    onHierarchyPathChange(nextId ? [...basePath, nextId] : basePath);
  }

  function renderHierarchyFilters() {
    const controls: ReactNode[] = [];

    controls.push(
      <select
        key="root"
        aria-label={copy.rootFilter}
        title={copy.rootFilter}
        value={hierarchyPathObjects[0]?.id ?? ""}
        onChange={(event) => updateHierarchyLevel(0, event.target.value)}
        className="h-11 w-full rounded-xl border border-[#dfe3f1] bg-white px-3 text-[11px] font-semibold text-[#4a4f6a] outline-none transition focus:border-[#9db3ff] focus:ring-2 focus:ring-[#e7edff] lg:w-[220px] xl:w-[240px]"
      >
        <option value="">{copy.allRoots}</option>
        {hierarchyRoots.map((valueObject) => (
          <option key={valueObject.id} value={valueObject.id ?? ""}>
            {valueObject.title?.trim() || "—"}
          </option>
        ))}
      </select>,
    );

    hierarchyPathObjects.forEach((parent, parentIndex) => {
      const options = sortObjects(
        childrenByParent.get(parent.id) ?? [],
        "title",
        locale,
      ).filter((valueObject) => Boolean(valueObject.id));

      if (options.length === 0) {
        return;
      }

      const levelIndex = parentIndex + 1;
      const parentTitle = parent.title?.trim() || "—";
      const label = copy.insideFilter.replace("{parent}", parentTitle);

      controls.push(
        <select
          key={`child-${parent.id}`}
          aria-label={label}
          title={label}
          value={hierarchyPathObjects[levelIndex]?.id ?? ""}
          onChange={(event) =>
            updateHierarchyLevel(levelIndex, event.target.value)
          }
          className="h-11 w-full rounded-xl border border-[#dfe3f1] bg-white px-3 text-[11px] font-semibold text-[#4a4f6a] outline-none transition focus:border-[#9db3ff] focus:ring-2 focus:ring-[#e7edff] lg:w-[220px] xl:w-[240px]"
        >
          <option value="">{copy.allChildren}</option>
          {options.map((valueObject) => (
            <option key={valueObject.id} value={valueObject.id ?? ""}>
              {valueObject.title?.trim() || "—"}
            </option>
          ))}
        </select>,
      );
    });

    return controls;
  }

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current ?? defaultExpandedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setExpandedIds(new Set(branchIds));
  }

  function collapseAll() {
    setExpandedIds(new Set());
  }

  function renderInsertControl(row: TreeRow, mobile: boolean) {
    const valueObject = row.valueObject;
    if (!valueObject.id) return null;

    const role = getSemanticRole(valueObject);
    if (role === "leaf") return null;

    const opened = insertParentId === valueObject.id;
    const padding = mobile
      ? Math.min((row.depth + 1) * 14 + 38, 92)
      : (row.depth + 1) * 26 + 38;
    const intermediateHref = buildLocaleAwareHref(
      `/value-objects/${valueObject.id}/new-intermediate`,
      locale,
    );
    const leafHref = buildLocaleAwareHref(
      `/value-objects/${valueObject.id}/new-leaf`,
      locale,
    );

    return (
      <div
        className={[
          "relative flex min-h-6 items-center",
          mobile ? "py-1" : "py-0.5",
        ].join(" ")}
        style={{ paddingLeft: padding }}
      >
        <div className="h-px w-4 bg-[#dfe3f1]" aria-hidden="true" />
        <button
          type="button"
          onClick={() =>
            setInsertParentId((current) =>
              current === valueObject.id ? null : valueObject.id ?? null,
            )
          }
          aria-label={copy.addChild}
          title={copy.addChild}
          className="mx-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#c9d5ff] bg-white text-[#3b6ef8] shadow-sm transition hover:border-[#3b6ef8] hover:bg-[#eef2ff]"
        >
          <Plus size={11} strokeWidth={2.2} />
        </button>
        <div className="h-px flex-1 bg-[#edf0f7]" aria-hidden="true" />

        {opened ? (
          <div className="absolute left-0 top-6 z-30 flex flex-wrap gap-1.5 rounded-xl border border-[#dfe3f1] bg-white p-1.5 shadow-lg" style={{ marginLeft: padding }}>
            <Link
              href={intermediateHref}
              className="rounded-lg bg-[#eef2ff] px-2.5 py-1.5 text-[10px] font-bold text-[#3b6ef8] hover:bg-[#dfe4ff]"
            >
              + {copy.intermediate}
            </Link>
            {role === "intermediate" ? (
              <Link
                href={leafHref}
                className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100"
              >
                + {copy.leaf}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  function renderTreeObject(row: TreeRow, mobile: boolean) {
    const { valueObject, depth, hasChildren } = row;
    const role = getSemanticRole(valueObject);
    const RoleIcon = roleIcon(role);
    const title = valueObject.title?.trim() || "—";
    const description = valueObject.description?.trim() || copy.noDescription;
    const expanded = filterActive || (valueObject.id ? activeExpandedIds.has(valueObject.id) : false);
    const padding = mobile ? Math.min(depth * 14, 56) : depth * 26;

    return (
      <div className="flex min-w-0 items-start gap-2" style={{ paddingLeft: padding }}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center">
          {hasChildren && valueObject.id ? (
            <button
              type="button"
              onClick={() => toggleExpanded(valueObject.id as string)}
              disabled={filterActive}
              aria-label={expanded ? copy.collapseAll : copy.expandAll}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#7c8099] transition hover:bg-[#eef2ff] hover:text-[#3b6ef8] disabled:cursor-default disabled:opacity-60"
            >
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <span className="h-7 w-7" aria-hidden="true" />
          )}
        </div>

        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#dfe4ff] bg-[#eef2ff] text-[#3b6ef8]">
          <RoleIcon size={17} strokeWidth={1.7} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={[
                "min-w-0 break-words text-[13px] text-[#111827]",
                role === "root" ? "font-bold" : "font-semibold",
              ].join(" ")}
            >
              {title}
            </span>
            <span className="rounded-full border border-[#e7eaf3] bg-[#f8fafc] px-2 py-0.5 text-[9px] font-semibold text-[#6b7280]">
              {getContextLabel(valueObject, copy)}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-1 text-[11px] leading-4 text-[#7c8099]">
            {description}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-2 rounded-[18px] border border-black/[0.07] bg-white p-2.5 shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="inline-flex self-start rounded-xl bg-[#f5f6fb] p-1">
            <button
              type="button"
              onClick={() => setViewMode("tree")}
              className={[
                "inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold transition",
                viewMode === "tree"
                  ? "bg-white text-[#3b6ef8] shadow-sm"
                  : "text-[#7c8099] hover:text-[#1a1d2e]",
              ].join(" ")}
            >
              <ListTree size={15} />
              {copy.tree}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={[
                "inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold transition",
                viewMode === "cards"
                  ? "bg-white text-[#3b6ef8] shadow-sm"
                  : "text-[#7c8099] hover:text-[#1a1d2e]",
              ].join(" ")}
            >
              <LayoutGrid size={15} />
              {copy.cards}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={[
                "inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold transition",
                viewMode === "map"
                  ? "bg-white text-[#3b6ef8] shadow-sm"
                  : "text-[#7c8099] hover:text-[#1a1d2e]",
              ].join(" ")}
            >
              <MapIcon size={15} />
              {copy.map}
            </button>
          </div>

          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:ml-1 lg:flex lg:min-w-0 lg:flex-1 lg:flex-wrap lg:justify-start">
            {renderHierarchyFilters()}
          </div>

          {viewMode === "tree" ? (
            <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
              <span className="hidden text-[11px] font-semibold text-[#7c8099] xl:inline">
                {filterActive
                  ? `${matchingIds.size} ${copy.matches}`
                  : `${valueObjects.length} ${copy.objects}`}
              </span>
              <button
                type="button"
                onClick={expandAll}
                className="rounded-xl border border-[#dfe3f1] bg-white px-3 py-2 text-[11px] font-semibold text-[#4a4f6a] transition hover:bg-[#f8fafc]"
              >
                {copy.expandAll}
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="rounded-xl border border-[#dfe3f1] bg-white px-3 py-2 text-[11px] font-semibold text-[#4a4f6a] transition hover:bg-[#f8fafc]"
              >
                {copy.collapseAll}
              </button>
            </div>
          ) : null}
        </div>

        {hierarchyPathObjects.length > 0 ? (
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 border-t border-[#edf0f7] px-1 pt-2 text-[10px] text-[#7c8099]">
            <span className="font-semibold uppercase tracking-[0.08em]">
              {copy.selectedBranch}
            </span>
            <span className="min-w-0 flex-1 truncate font-semibold text-[#4a4f6a]">
              {hierarchyPathObjects
                .map((valueObject) => valueObject.title?.trim() || "—")
                .join(" › ")}
            </span>
            <button
              type="button"
              onClick={() => onHierarchyPathChange([])}
              className="shrink-0 rounded-lg px-2 py-1 font-semibold text-[#3b6ef8] transition hover:bg-[#eef2ff]"
            >
              {copy.resetHierarchy}
            </button>
          </div>
        ) : null}
      </div>

      {viewMode === "cards" ? children : null}

      {viewMode === "map" ? (
        <ValueObjectMindMap
          valueObjects={valueObjects.filter(
            (valueObject) => valueObject.id && visibleIds.has(valueObject.id),
          )}
          locale={locale}
          onValueObjectDeleted={onValueObjectDeleted}
          onValueObjectReparented={onValueObjectReparented}
          onValueObjectCreated={onValueObjectCreated}
        />
      ) : null}

      {viewMode === "tree" ? (
        <>
          <div className="hidden overflow-hidden rounded-[20px] border border-black/[0.07] bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse">
                <thead className="bg-[#f8fafc]">
                  <tr className="border-b border-[#edf0f7] text-left">
                    <th className="min-w-[430px] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7c8099]">
                      {copy.object}
                    </th>
                    <th className="w-[130px] px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7c8099]">
                      {copy.role}
                    </th>
                    <th className="w-[82px] px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7c8099]">
                      {copy.directChildren}
                    </th>
                    <th className="w-[100px] px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7c8099]">
                      {copy.descendants}
                    </th>
                    <th className="w-[82px] px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7c8099]">
                      {copy.leaves}
                    </th>
                    <th className="w-[110px] px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7c8099]">
                      {copy.status}
                    </th>
                    <th className="w-[92px] px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7c8099]">
                      {copy.action}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const valueObject = row.valueObject;
                    const role = getSemanticRole(valueObject);
                    const title = valueObject.title?.trim() || "—";
                    return (
                      <Fragment key={valueObject.id ?? `${title}-${row.depth}`}>
                        <tr
                          className={[
                            "border-b border-[#f0f2f7] transition hover:bg-[#fafbff]",
                            role === "root" ? "bg-[#fcfdff]" : "bg-white",
                          ].join(" ")}
                        >
                          <td className="px-4 py-3">{renderTreeObject(row, false)}</td>
                          <td className="px-3 py-3">
                            <span
                              className={[
                                "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold",
                                roleBadgeClass(role),
                              ].join(" ")}
                            >
                              {getRoleLabel(role, copy)}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center text-[13px] font-bold text-[#334155]">
                            {row.directChildren}
                          </td>
                          <td className="px-3 py-3 text-center text-[13px] font-bold text-[#334155]">
                            {row.descendants}
                          </td>
                          <td className="px-3 py-3 text-center text-[13px] font-bold text-[#334155]">
                            {row.descendantLeaves}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={[
                                "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold",
                                statusBadgeClass(valueObject.status),
                              ].join(" ")}
                            >
                              {getStatusLabel(valueObject.status, copy)}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            {valueObject.id ? (
                              <Link
                                href={buildLocaleAwareHref(`/value-objects/${valueObject.id}`, locale)}
                                className="text-[12px] font-bold text-[#3b6ef8] hover:underline"
                              >
                                {copy.open}
                              </Link>
                            ) : null}
                          </td>
                        </tr>
                        {role !== "leaf" ? (
                          <tr className="bg-white">
                            <td colSpan={7} className="px-4 py-0">
                              {renderInsertControl(row, false)}
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-2 md:hidden">
            {rows.map((row) => {
              const valueObject = row.valueObject;
              const role = getSemanticRole(valueObject);
              const title = valueObject.title?.trim() || "—";
              return (
                <Fragment key={valueObject.id ?? `${title}-${row.depth}`}>
                  <article
                    className="rounded-[18px] border border-[#dfe3f1] bg-white p-3 shadow-sm"
                  >
                    {renderTreeObject(row, true)}
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#edf0f7] pt-3">
                      <span
                        className={[
                          "rounded-full border px-2 py-1 text-[9px] font-bold",
                          roleBadgeClass(role),
                        ].join(" ")}
                      >
                        {getRoleLabel(role, copy)}
                      </span>
                      <span
                        className={[
                          "rounded-full border px-2 py-1 text-[9px] font-bold",
                          statusBadgeClass(valueObject.status),
                        ].join(" ")}
                      >
                        {getStatusLabel(valueObject.status, copy)}
                      </span>
                      <span className="text-[10px] font-semibold text-[#7c8099]">
                        {copy.directChildren}: {row.directChildren} · {copy.descendants}: {row.descendants} · {copy.leaves}: {row.descendantLeaves}
                      </span>
                      {valueObject.id ? (
                        <Link
                          href={buildLocaleAwareHref(`/value-objects/${valueObject.id}`, locale)}
                          className="ml-auto text-[11px] font-bold text-[#3b6ef8] hover:underline"
                        >
                          {copy.open}
                        </Link>
                      ) : null}
                    </div>
                  </article>
                  {role !== "leaf" ? renderInsertControl(row, true) : null}
                </Fragment>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}

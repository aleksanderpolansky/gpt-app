"use client";

import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Layers3,
  Leaf,
  Network,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";
type SemanticRole = "root" | "intermediate" | "leaf";

export type MindMapValueObject = {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  node_role_code?: string | null;
  root_value_object_id?: string | null;
  parent_value_object_id?: string | null;
  ontology_node_role_code?: string | null;
  usage_scope?: string | null;
  scope_code?: string | null;
  origin_type_code?: string | null;
  definition_version?: number | null;
};

type Copy = {
  authoring: string;
  help: string;
  open: string;
  root: string;
  intermediate: string;
  leaf: string;
  children: string;
  empty: string;
  expand: string;
  collapse: string;
  addChild: string;
  addIntermediate: string;
  addLeaf: string;
  deleteObject: string;
  deleteTitle: string;
  deleteWarning: string;
  cancel: string;
  confirmDelete: string;
  deleting: string;
  deleted: string;
  deletedMessage: string;
  close: string;
  blocked: string;
  technicalDependency: string;
};

const COPY: Record<LocaleCode, Copy> = {
  en: {
    authoring: "Map authoring",
    help: "Create child objects and safely delete unused private objects from the real hierarchy. Structural dragging remains disabled in V1.",
    open: "Open object",
    root: "Root",
    intermediate: "Intermediate",
    leaf: "Leaf",
    children: "children",
    empty: "No observation objects match the current filter.",
    expand: "Expand branch",
    collapse: "Collapse branch",
    addChild: "Add child object",
    addIntermediate: "Add intermediate",
    addLeaf: "Add leaf",
    deleteObject: "Delete object",
    deleteTitle: "Delete observation object?",
    deleteWarning: "The existing guarded delete contract will allow this only for an unused private object without children or protected dependencies.",
    cancel: "Cancel",
    confirmDelete: "Delete object",
    deleting: "Deleting…",
    deleted: "Observation object deleted",
    deletedMessage: "The object was removed and the current catalog was updated.",
    close: "Close",
    blocked: "This object cannot be deleted safely.",
    technicalDependency: "Blocking dependency",
  },
  pl: {
    authoring: "Edycja na mapie",
    help: "Twórz obiekty podrzędne i bezpiecznie usuwaj nieużywane obiekty prywatne w rzeczywistej hierarchii. Przeciąganie struktury pozostaje wyłączone w V1.",
    open: "Otwórz obiekt",
    root: "Korzeń",
    intermediate: "Pośredni",
    leaf: "Liść",
    children: "dzieci",
    empty: "Brak obiektów obserwacji pasujących do bieżącego filtra.",
    expand: "Rozwiń gałąź",
    collapse: "Zwiń gałąź",
    addChild: "Dodaj obiekt podrzędny",
    addIntermediate: "Dodaj pośredni",
    addLeaf: "Dodaj liść",
    deleteObject: "Usuń obiekt",
    deleteTitle: "Usunąć obiekt obserwacji?",
    deleteWarning: "Istniejący bezpieczny kontrakt usuwania zezwoli na operację tylko dla nieużywanego obiektu prywatnego bez dzieci i chronionych zależności.",
    cancel: "Anuluj",
    confirmDelete: "Usuń obiekt",
    deleting: "Usuwanie…",
    deleted: "Obiekt obserwacji usunięty",
    deletedMessage: "Obiekt został usunięty, a bieżący katalog zaktualizowany.",
    close: "Zamknij",
    blocked: "Tego obiektu nie można bezpiecznie usunąć.",
    technicalDependency: "Blokująca zależność",
  },
  ru: {
    authoring: "Редактирование на карте",
    help: "Создавайте дочерние объекты и безопасно удаляйте неиспользуемые личные объекты прямо в реальной иерархии. Перетаскивание структуры в V1 остаётся отключено.",
    open: "Открыть объект",
    root: "Корень",
    intermediate: "Промежуточный",
    leaf: "Лист",
    children: "дочерних",
    empty: "Нет объектов наблюдения, соответствующих текущему фильтру.",
    expand: "Развернуть ветвь",
    collapse: "Свернуть ветвь",
    addChild: "Добавить дочерний объект",
    addIntermediate: "Добавить промежуточный",
    addLeaf: "Добавить лист",
    deleteObject: "Удалить объект",
    deleteTitle: "Удалить объект наблюдения?",
    deleteWarning: "Существующий защищённый контракт удаления разрешит операцию только для неиспользуемого личного объекта без дочерних узлов и защищённых зависимостей.",
    cancel: "Отмена",
    confirmDelete: "Удалить объект",
    deleting: "Удаление…",
    deleted: "Объект наблюдения удалён",
    deletedMessage: "Объект удалён, текущий каталог обновлён.",
    close: "Закрыть",
    blocked: "Этот объект нельзя безопасно удалить.",
    technicalDependency: "Блокирующая зависимость",
  },
  uk: {
    authoring: "Редагування на мапі",
    help: "Створюйте дочірні об’єкти та безпечно видаляйте невикористані приватні об’єкти у реальній ієрархії. Перетягування структури у V1 залишається вимкненим.",
    open: "Відкрити об’єкт",
    root: "Корінь",
    intermediate: "Проміжний",
    leaf: "Лист",
    children: "дочірніх",
    empty: "Немає об’єктів спостереження, що відповідають поточному фільтру.",
    expand: "Розгорнути гілку",
    collapse: "Згорнути гілку",
    addChild: "Додати дочірній об’єкт",
    addIntermediate: "Додати проміжний",
    addLeaf: "Додати лист",
    deleteObject: "Видалити об’єкт",
    deleteTitle: "Видалити об’єкт спостереження?",
    deleteWarning: "Наявний захищений контракт видалення дозволить операцію лише для невикористаного приватного об’єкта без дочірніх вузлів і захищених залежностей.",
    cancel: "Скасувати",
    confirmDelete: "Видалити об’єкт",
    deleting: "Видалення…",
    deleted: "Об’єкт спостереження видалено",
    deletedMessage: "Об’єкт видалено, поточний каталог оновлено.",
    close: "Закрити",
    blocked: "Цей об’єкт неможливо безпечно видалити.",
    technicalDependency: "Блокуюча залежність",
  },
  de: {
    authoring: "Bearbeitung auf der Karte",
    help: "Erstellen Sie untergeordnete Objekte und löschen Sie unbenutzte private Objekte sicher in der echten Hierarchie. Strukturelles Ziehen bleibt in V1 deaktiviert.",
    open: "Objekt öffnen",
    root: "Wurzel",
    intermediate: "Zwischenobjekt",
    leaf: "Blatt",
    children: "Kinder",
    empty: "Keine Beobachtungsobjekte entsprechen dem aktuellen Filter.",
    expand: "Zweig aufklappen",
    collapse: "Zweig zuklappen",
    addChild: "Untergeordnetes Objekt hinzufügen",
    addIntermediate: "Zwischenobjekt hinzufügen",
    addLeaf: "Blatt hinzufügen",
    deleteObject: "Objekt löschen",
    deleteTitle: "Beobachtungsobjekt löschen?",
    deleteWarning: "Der vorhandene geschützte Löschvertrag erlaubt dies nur für ein unbenutztes privates Objekt ohne Kinder oder geschützte Abhängigkeiten.",
    cancel: "Abbrechen",
    confirmDelete: "Objekt löschen",
    deleting: "Wird gelöscht…",
    deleted: "Beobachtungsobjekt gelöscht",
    deletedMessage: "Das Objekt wurde entfernt und der aktuelle Katalog aktualisiert.",
    close: "Schließen",
    blocked: "Dieses Objekt kann nicht sicher gelöscht werden.",
    technicalDependency: "Blockierende Abhängigkeit",
  },
  es: {
    authoring: "Edición en el mapa",
    help: "Cree objetos secundarios y elimine de forma segura objetos privados sin uso en la jerarquía real. El arrastre estructural sigue desactivado en V1.",
    open: "Abrir objeto",
    root: "Raíz",
    intermediate: "Intermedio",
    leaf: "Hoja",
    children: "hijos",
    empty: "Ningún objeto de observación coincide con el filtro actual.",
    expand: "Expandir rama",
    collapse: "Contraer rama",
    addChild: "Añadir objeto secundario",
    addIntermediate: "Añadir intermedio",
    addLeaf: "Añadir hoja",
    deleteObject: "Eliminar objeto",
    deleteTitle: "¿Eliminar objeto de observación?",
    deleteWarning: "El contrato de eliminación protegido existente solo permitirá la operación para un objeto privado sin uso, sin hijos ni dependencias protegidas.",
    cancel: "Cancelar",
    confirmDelete: "Eliminar objeto",
    deleting: "Eliminando…",
    deleted: "Objeto de observación eliminado",
    deletedMessage: "El objeto se eliminó y el catálogo actual se actualizó.",
    close: "Cerrar",
    blocked: "Este objeto no se puede eliminar de forma segura.",
    technicalDependency: "Dependencia bloqueante",
  },
  cs: {
    authoring: "Úpravy na mapě",
    help: "Vytvářejte podřízené objekty a bezpečně odstraňujte nepoužívané soukromé objekty ve skutečné hierarchii. Strukturální přetahování zůstává ve V1 vypnuté.",
    open: "Otevřít objekt",
    root: "Kořen",
    intermediate: "Mezilehlý",
    leaf: "List",
    children: "potomků",
    empty: "Aktuálnímu filtru neodpovídají žádné objekty pozorování.",
    expand: "Rozbalit větev",
    collapse: "Sbalit větev",
    addChild: "Přidat podřízený objekt",
    addIntermediate: "Přidat mezilehlý",
    addLeaf: "Přidat list",
    deleteObject: "Odstranit objekt",
    deleteTitle: "Odstranit objekt pozorování?",
    deleteWarning: "Stávající chráněný kontrakt odstranění povolí operaci pouze pro nepoužívaný soukromý objekt bez potomků a chráněných závislostí.",
    cancel: "Zrušit",
    confirmDelete: "Odstranit objekt",
    deleting: "Odstraňování…",
    deleted: "Objekt pozorování odstraněn",
    deletedMessage: "Objekt byl odstraněn a aktuální katalog aktualizován.",
    close: "Zavřít",
    blocked: "Tento objekt nelze bezpečně odstranit.",
    technicalDependency: "Blokující závislost",
  },
};

function getSemanticRole(valueObject: MindMapValueObject): SemanticRole {
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

function roleLabel(role: SemanticRole, copy: Copy) {
  if (role === "root") return copy.root;
  if (role === "leaf") return copy.leaf;
  return copy.intermediate;
}

function roleClasses(role: SemanticRole) {
  if (role === "root") {
    return {
      shell: "border-[#b8c8ff] bg-[#f7f9ff]",
      icon: "border-[#dfe4ff] bg-[#eef2ff] text-[#3b6ef8]",
      badge: "border-[#dfe4ff] bg-[#eef2ff] text-[#3b6ef8]",
    };
  }

  if (role === "leaf") {
    return {
      shell: "border-emerald-200 bg-white",
      icon: "border-emerald-200 bg-emerald-50 text-emerald-700",
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  return {
    shell: "border-violet-200 bg-white",
    icon: "border-violet-200 bg-violet-50 text-violet-700",
    badge: "border-violet-200 bg-violet-50 text-violet-700",
  };
}

function buildLocaleAwareHref(pathname: string, locale: LocaleCode) {
  if (locale === "en") return pathname;
  return `${pathname}?locale=${encodeURIComponent(locale)}`;
}

type MindMapNodeData = Record<string, unknown> & {
  title: string;
  description: string;
  role: SemanticRole;
  roleLabel: string;
  childCount: number;
  childLabel: string;
  hasChildren: boolean;
  collapsed: boolean;
  href: string;
  openLabel: string;
  expandLabel: string;
  collapseLabel: string;
  addChildLabel: string;
  addIntermediateLabel: string;
  addLeafLabel: string;
  deleteLabel: string;
  canAddIntermediate: boolean;
  canAddLeaf: boolean;
  canRequestDelete: boolean;
  intermediateHref: string;
  leafHref: string;
  onToggle: (id: string) => void;
  onDeleteRequest: (id: string, title: string) => void;
};

type DeleteResponse = {
  ok?: boolean;
  error?: string;
  errorCode?: string;
  deletedId?: string;
  parentValueObjectId?: string | null;
  redirectUrl?: string;
  blocker?: {
    table?: string | null;
    column?: string | null;
    count?: number | null;
  } | null;
};

type DeleteTarget = {
  id: string;
  title: string;
};

type MindMapNode = Node<MindMapNodeData, "arctorObservationObject">;

function ObservationObjectMapNode({ id, data }: NodeProps<MindMapNode>) {
  const classes = roleClasses(data.role);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const RoleIcon =
    data.role === "root" ? Network : data.role === "leaf" ? Leaf : Layers3;

  return (
    <div
      className={[
        "relative w-[238px] rounded-[18px] border p-3.5 shadow-[0_6px_20px_rgba(31,41,55,0.08)]",
        classes.shell,
      ].join(" ")}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        className="!h-2 !w-2 !border-2 !border-white !bg-[#9aacdf]"
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        className="!h-2 !w-2 !border-2 !border-white !bg-[#9aacdf]"
      />

      <div className="flex items-start gap-3">
        <div
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
            classes.icon,
          ].join(" ")}
        >
          <RoleIcon size={18} strokeWidth={1.8} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="line-clamp-2 text-[13px] font-bold leading-5 text-[#111827]">
                {data.title}
              </div>
              <span
                className={[
                  "mt-1 inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold",
                  classes.badge,
                ].join(" ")}
              >
                {data.roleLabel}
              </span>
            </div>

            {data.hasChildren ? (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  data.onToggle(id);
                }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#dfe3f1] bg-white text-[#6b7280] transition hover:border-[#b8c8ff] hover:bg-[#eef2ff] hover:text-[#3b6ef8]"
                aria-label={data.collapsed ? data.expandLabel : data.collapseLabel}
              >
                {data.collapsed ? (
                  <ChevronRight size={15} />
                ) : (
                  <ChevronDown size={15} />
                )}
              </button>
            ) : null}
          </div>

          <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-[#7c8099]">
            {data.description}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#edf0f7] pt-2.5">
        <span className="text-[9px] font-semibold text-[#7c8099]">
          {data.childCount} {data.childLabel}
        </span>
        <div className="nodrag nopan flex items-center gap-1">
          {data.canAddIntermediate || data.canAddLeaf ? (
            <div className="relative">
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setAddMenuOpen((current) => !current);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#c9d5ff] bg-white text-[#3b6ef8] transition hover:bg-[#eef2ff]"
                aria-label={data.addChildLabel}
                title={data.addChildLabel}
              >
                <Plus size={14} strokeWidth={2.1} />
              </button>
              {addMenuOpen ? (
                <div
                  className="absolute bottom-9 right-0 z-30 grid min-w-[154px] gap-1 rounded-xl border border-[#dfe3f1] bg-white p-1.5 shadow-xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  {data.canAddIntermediate ? (
                    <Link
                      href={data.intermediateHref}
                      className="rounded-lg bg-[#eef2ff] px-2.5 py-2 text-[10px] font-bold text-[#3b6ef8] hover:bg-[#dfe4ff]"
                    >
                      + {data.addIntermediateLabel}
                    </Link>
                  ) : null}
                  {data.canAddLeaf ? (
                    <Link
                      href={data.leafHref}
                      className="rounded-lg bg-emerald-50 px-2.5 py-2 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100"
                    >
                      + {data.addLeafLabel}
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {data.canRequestDelete ? (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                data.onDeleteRequest(id, data.title);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-100 bg-white text-red-600 transition hover:border-red-200 hover:bg-red-50"
              aria-label={data.deleteLabel}
              title={data.deleteLabel}
            >
              <Trash2 size={13} strokeWidth={1.9} />
            </button>
          ) : null}

          <Link
            href={data.href}
            onClick={(event) => event.stopPropagation()}
            className="inline-flex items-center gap-1 pl-1 text-[10px] font-bold text-[#3b6ef8] hover:underline"
          >
            {data.openLabel}
            <ExternalLink size={11} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function canRequestDelete(valueObject: MindMapValueObject) {
  return (
    valueObject.scope_code !== "global" &&
    valueObject.usage_scope !== "commercial" &&
    valueObject.origin_type_code === "user_declared" &&
    (valueObject.definition_version ?? 1) === 1
  );
}

const NODE_TYPES = {
  arctorObservationObject: ObservationObjectMapNode,
};

const NODE_WIDTH = 238;
const NODE_HEIGHT = 138;
const LEVEL_GAP = 112;
const ROW_GAP = 30;
const ROOT_GAP = 72;

type GraphBuildResult = {
  nodes: MindMapNode[];
  edges: Edge[];
};

function buildGraph(input: {
  valueObjects: MindMapValueObject[];
  collapsedIds: Set<string>;
  locale: LocaleCode;
  copy: Copy;
  onToggle: (id: string) => void;
  onDeleteRequest: (id: string, title: string) => void;
}): GraphBuildResult {
  const {
    valueObjects,
    collapsedIds,
    locale,
    copy,
    onToggle,
    onDeleteRequest,
  } = input;
  const byId = new Map<string, MindMapValueObject>();
  const childrenByParent = new Map<string, MindMapValueObject[]>();

  for (const valueObject of valueObjects) {
    if (valueObject.id) byId.set(valueObject.id, valueObject);
  }

  for (const valueObject of valueObjects) {
    if (!valueObject.id || !valueObject.parent_value_object_id) continue;
    if (!byId.has(valueObject.parent_value_object_id)) continue;
    const siblings = childrenByParent.get(valueObject.parent_value_object_id) ?? [];
    siblings.push(valueObject);
    childrenByParent.set(valueObject.parent_value_object_id, siblings);
  }

  for (const siblings of childrenByParent.values()) {
    siblings.sort((a, b) =>
      (a.title ?? "").localeCompare(b.title ?? "", locale),
    );
  }

  const roots = valueObjects
    .filter(
      (valueObject) =>
        valueObject.id &&
        (!valueObject.parent_value_object_id ||
          !byId.has(valueObject.parent_value_object_id)),
    )
    .sort((a, b) => (a.title ?? "").localeCompare(b.title ?? "", locale));

  const nodes: MindMapNode[] = [];
  const edges: Edge[] = [];
  const visited = new Set<string>();
  let nextY = 0;

  function layout(valueObject: MindMapValueObject, depth: number): number {
    if (!valueObject.id || visited.has(valueObject.id)) return nextY;
    visited.add(valueObject.id);

    const id = valueObject.id;
    const allChildren = childrenByParent.get(id) ?? [];
    const childObjects = collapsedIds.has(id) ? [] : allChildren;
    const childYs: number[] = [];

    for (const child of childObjects) {
      childYs.push(layout(child, depth + 1));
    }

    let y: number;
    if (childYs.length === 0) {
      y = nextY;
      nextY += NODE_HEIGHT + ROW_GAP;
    } else {
      y = (childYs[0] + childYs[childYs.length - 1]) / 2;
    }

    const role = getSemanticRole(valueObject);
    const title = valueObject.title?.trim() || "—";
    const description = valueObject.description?.trim() || "—";

    nodes.push({
      id,
      type: "arctorObservationObject",
      position: {
        x: depth * (NODE_WIDTH + LEVEL_GAP),
        y,
      },
      draggable: false,
      selectable: true,
      data: {
        title,
        description,
        role,
        roleLabel: roleLabel(role, copy),
        childCount: allChildren.length,
        childLabel: copy.children,
        hasChildren: allChildren.length > 0,
        collapsed: collapsedIds.has(id),
        href: buildLocaleAwareHref(`/value-objects/${id}`, locale),
        openLabel: copy.open,
        expandLabel: copy.expand,
        collapseLabel: copy.collapse,
        addChildLabel: copy.addChild,
        addIntermediateLabel: copy.addIntermediate,
        addLeafLabel: copy.addLeaf,
        deleteLabel: copy.deleteObject,
        canAddIntermediate: role === "root" || role === "intermediate",
        canAddLeaf: role === "intermediate",
        canRequestDelete: canRequestDelete(valueObject),
        intermediateHref: buildLocaleAwareHref(
          `/value-objects/${id}/new-intermediate`,
          locale,
        ),
        leafHref: buildLocaleAwareHref(`/value-objects/${id}/new-leaf`, locale),
        onToggle,
        onDeleteRequest,
      },
    });

    for (const child of childObjects) {
      if (!child.id) continue;
      edges.push({
        id: `structural-${id}-${child.id}`,
        source: id,
        target: child.id,
        type: "smoothstep",
        animated: false,
        style: {
          stroke: "#9aacdf",
          strokeWidth: 1.6,
        },
      });
    }

    return y;
  }

  for (const root of roots) {
    layout(root, 0);
    nextY += ROOT_GAP;
  }

  // Fail closed for cycles: objects that cannot be reached from a structural root
  // are intentionally not promoted to fake roots on the map.
  return { nodes, edges };
}

function MindMapCanvas({
  valueObjects,
  locale,
  onValueObjectDeleted,
}: {
  valueObjects: MindMapValueObject[];
  locale: LocaleCode;
  onValueObjectDeleted?: (deletedId: string) => void;
}) {
  const copy = COPY[locale] ?? COPY.en;
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteResult, setDeleteResult] = useState<DeleteResponse | null>(null);
  const { fitView } = useReactFlow<MindMapNode, Edge>();

  const toggleCollapsed = useCallback((id: string) => {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const requestDelete = useCallback((id: string, title: string) => {
    setDeleteTarget({ id, title });
    setDeleteError("");
    setDeleteResult(null);
  }, []);

  const deleteObject = useCallback(async () => {
    if (!deleteTarget || deletePending || deleteResult?.ok) return;

    setDeletePending(true);
    setDeleteError("");

    try {
      const response = await fetch(
        `/api/value-objects/${encodeURIComponent(deleteTarget.id)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        },
      );
      const payload = (await response
        .json()
        .catch(() => null)) as DeleteResponse | null;

      if (!response.ok || payload?.ok !== true) {
        const blockerText = payload?.blocker?.table
          ? ` ${copy.technicalDependency}: ${payload.blocker.table}${
              payload.blocker.column ? `.${payload.blocker.column}` : ""
            }.`
          : "";
        throw new Error(
          `${payload?.error || copy.blocked}${blockerText}`.trim(),
        );
      }

      setDeleteResult(payload);
      onValueObjectDeleted?.(deleteTarget.id);
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : copy.blocked);
    } finally {
      setDeletePending(false);
    }
  }, [
    copy.blocked,
    copy.technicalDependency,
    deletePending,
    deleteResult?.ok,
    deleteTarget,
    onValueObjectDeleted,
  ]);

  const graph = useMemo(
    () =>
      buildGraph({
        valueObjects,
        collapsedIds,
        locale,
        copy,
        onToggle: toggleCollapsed,
        onDeleteRequest: requestDelete,
      }),
    [
      collapsedIds,
      copy,
      locale,
      requestDelete,
      toggleCollapsed,
      valueObjects,
    ],
  );

  useEffect(() => {
    if (graph.nodes.length === 0) return;

    const timer = window.setTimeout(() => {
      void fitView({ padding: 0.18, duration: 220, maxZoom: 1.05 });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fitView, graph]);

  if (graph.nodes.length === 0) {
    return (
      <div className="flex min-h-[420px] items-center justify-center px-6 text-center text-[13px] text-[#7c8099]">
        {copy.empty}
      </div>
    );
  }

  return (
    <>
      <ReactFlow<MindMapNode, Edge>
      nodes={graph.nodes}
      edges={graph.edges}
      nodeTypes={NODE_TYPES}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable
      panOnDrag
      zoomOnScroll
      zoomOnPinch
      fitView
      fitViewOptions={{ padding: 0.18, maxZoom: 1.05 }}
      minZoom={0.2}
      maxZoom={1.6}
      attributionPosition="bottom-right"
      className="bg-[#f8fafc]"
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={22}
        size={1}
        color="#d7def0"
      />
      <Controls
        position="bottom-left"
        showInteractive={false}
        className="!overflow-hidden !rounded-xl !border !border-[#dfe3f1] !bg-white !shadow-sm"
      />
      </ReactFlow>

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mind-map-delete-title"
        >
          <div className="w-full max-w-[540px] rounded-[26px] border border-black/[0.08] bg-white p-6 shadow-2xl">
            {deleteResult?.ok ? (
              <div role="status" aria-live="polite">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2
                      id="mind-map-delete-title"
                      className="text-[20px] font-bold text-[#111827]"
                    >
                      {copy.deleted}
                    </h2>
                    <p className="mt-2 text-[13px] leading-5 text-[#5a5f7a]">
                      {copy.deletedMessage}
                    </p>
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[14px] font-bold text-emerald-950">
                      {deleteTarget.title}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#dfe3f1] bg-white text-[#6b7280] hover:bg-[#f8fafc]"
                    aria-label={copy.close}
                  >
                    <X size={17} />
                  </button>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    className="rounded-xl bg-[#3b6ef8] px-4 py-2.5 text-[12px] font-bold text-white hover:bg-[#315fd8]"
                  >
                    {copy.close}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2
                      id="mind-map-delete-title"
                      className="text-[20px] font-bold text-[#111827]"
                    >
                      {copy.deleteTitle}
                    </h2>
                    <div className="mt-3 rounded-xl border border-red-100 bg-red-50 p-4">
                      <div className="text-[14px] font-bold text-red-950">
                        {deleteTarget.title}
                      </div>
                      <p className="mt-2 text-[12px] leading-5 text-red-900">
                        {copy.deleteWarning}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={deletePending}
                    onClick={() => setDeleteTarget(null)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#dfe3f1] bg-white text-[#6b7280] hover:bg-[#f8fafc] disabled:opacity-50"
                    aria-label={copy.cancel}
                  >
                    <X size={17} />
                  </button>
                </div>

                {deleteError ? (
                  <div
                    role="alert"
                    className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-[12px] font-semibold text-red-800"
                  >
                    {deleteError}
                  </div>
                ) : null}

                <div className="mt-6 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    disabled={deletePending}
                    onClick={() => setDeleteTarget(null)}
                    className="rounded-xl border border-[#dfe3f1] bg-white px-4 py-2.5 text-[12px] font-bold text-[#4a4f6a] hover:bg-[#f8fafc] disabled:opacity-50"
                  >
                    {copy.cancel}
                  </button>
                  <button
                    type="button"
                    disabled={deletePending}
                    onClick={() => void deleteObject()}
                    className="rounded-xl bg-red-600 px-4 py-2.5 text-[12px] font-bold text-white hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
                  >
                    {deletePending ? copy.deleting : copy.confirmDelete}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

export function ValueObjectMindMap({
  valueObjects,
  locale,
  onValueObjectDeleted,
}: {
  valueObjects: MindMapValueObject[];
  locale: LocaleCode;
  onValueObjectDeleted?: (deletedId: string) => void;
}) {
  const copy = COPY[locale] ?? COPY.en;

  return (
    <section className="overflow-hidden rounded-[20px] border border-black/[0.07] bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#edf0f7] px-4 py-3">
        <div>
          <div className="inline-flex rounded-full border border-[#dfe4ff] bg-[#eef2ff] px-2.5 py-1 text-[10px] font-bold text-[#3b6ef8]">
            {copy.authoring}
          </div>
          <p className="mt-2 max-w-3xl text-[11px] leading-5 text-[#7c8099]">
            {copy.help}
          </p>
        </div>
        <span className="rounded-full border border-[#e7eaf3] bg-[#f8fafc] px-2.5 py-1 text-[10px] font-semibold text-[#6b7280]">
          {valueObjects.length}
        </span>
      </div>

      <div className="h-[560px] min-h-[420px] w-full sm:h-[620px] lg:h-[680px]">
        <ReactFlowProvider>
          <MindMapCanvas
            valueObjects={valueObjects}
            locale={locale}
            onValueObjectDeleted={onValueObjectDeleted}
          />
        </ReactFlowProvider>
      </div>
    </section>
  );
}

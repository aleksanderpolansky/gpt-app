"use client";

import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Layers3,
  Leaf,
  Network,
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
};

type Copy = {
  readOnly: string;
  help: string;
  open: string;
  root: string;
  intermediate: string;
  leaf: string;
  children: string;
  empty: string;
  expand: string;
  collapse: string;
};

const COPY: Record<LocaleCode, Copy> = {
  en: {
    readOnly: "Read-only map",
    help: "Structural hierarchy from the same observation objects. Dragging and structural edits are disabled in V0.",
    open: "Open object",
    root: "Root",
    intermediate: "Intermediate",
    leaf: "Leaf",
    children: "children",
    empty: "No observation objects match the current filter.",
    expand: "Expand branch",
    collapse: "Collapse branch",
  },
  pl: {
    readOnly: "Mapa tylko do odczytu",
    help: "Hierarchia strukturalna z tych samych obiektów obserwacji. Przeciąganie i zmiany struktury są wyłączone w V0.",
    open: "Otwórz obiekt",
    root: "Korzeń",
    intermediate: "Pośredni",
    leaf: "Liść",
    children: "dzieci",
    empty: "Brak obiektów obserwacji pasujących do bieżącego filtra.",
    expand: "Rozwiń gałąź",
    collapse: "Zwiń gałąź",
  },
  ru: {
    readOnly: "Карта только для просмотра",
    help: "Структурная иерархия тех же объектов наблюдения. Перетаскивание и изменение структуры в V0 отключены.",
    open: "Открыть объект",
    root: "Корень",
    intermediate: "Промежуточный",
    leaf: "Лист",
    children: "дочерних",
    empty: "Нет объектов наблюдения, соответствующих текущему фильтру.",
    expand: "Развернуть ветвь",
    collapse: "Свернуть ветвь",
  },
  uk: {
    readOnly: "Мапа лише для перегляду",
    help: "Структурна ієрархія тих самих об’єктів спостереження. Перетягування та зміни структури у V0 вимкнені.",
    open: "Відкрити об’єкт",
    root: "Корінь",
    intermediate: "Проміжний",
    leaf: "Лист",
    children: "дочірніх",
    empty: "Немає об’єктів спостереження, що відповідають поточному фільтру.",
    expand: "Розгорнути гілку",
    collapse: "Згорнути гілку",
  },
  de: {
    readOnly: "Schreibgeschützte Karte",
    help: "Strukturhierarchie derselben Beobachtungsobjekte. Ziehen und Strukturänderungen sind in V0 deaktiviert.",
    open: "Objekt öffnen",
    root: "Wurzel",
    intermediate: "Zwischenobjekt",
    leaf: "Blatt",
    children: "Kinder",
    empty: "Keine Beobachtungsobjekte entsprechen dem aktuellen Filter.",
    expand: "Zweig aufklappen",
    collapse: "Zweig zuklappen",
  },
  es: {
    readOnly: "Mapa de solo lectura",
    help: "Jerarquía estructural de los mismos objetos de observación. Arrastrar y cambiar la estructura está desactivado en V0.",
    open: "Abrir objeto",
    root: "Raíz",
    intermediate: "Intermedio",
    leaf: "Hoja",
    children: "hijos",
    empty: "Ningún objeto de observación coincide con el filtro actual.",
    expand: "Expandir rama",
    collapse: "Contraer rama",
  },
  cs: {
    readOnly: "Mapa pouze pro čtení",
    help: "Strukturální hierarchie stejných objektů pozorování. Přetahování a změny struktury jsou ve V0 vypnuté.",
    open: "Otevřít objekt",
    root: "Kořen",
    intermediate: "Mezilehlý",
    leaf: "List",
    children: "potomků",
    empty: "Aktuálnímu filtru neodpovídají žádné objekty pozorování.",
    expand: "Rozbalit větev",
    collapse: "Sbalit větev",
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
  onToggle: (id: string) => void;
};

type MindMapNode = Node<MindMapNodeData, "arctorObservationObject">;

function ObservationObjectMapNode({ id, data }: NodeProps<MindMapNode>) {
  const classes = roleClasses(data.role);
  const RoleIcon =
    data.role === "root" ? Network : data.role === "leaf" ? Leaf : Layers3;

  return (
    <div
      className={[
        "w-[238px] rounded-[18px] border p-3.5 shadow-[0_6px_20px_rgba(31,41,55,0.08)]",
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
        <Link
          href={data.href}
          onClick={(event) => event.stopPropagation()}
          className="inline-flex items-center gap-1 text-[10px] font-bold text-[#3b6ef8] hover:underline"
        >
          {data.openLabel}
          <ExternalLink size={11} />
        </Link>
      </div>
    </div>
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
}): GraphBuildResult {
  const { valueObjects, collapsedIds, locale, copy, onToggle } = input;
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
        onToggle,
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
}: {
  valueObjects: MindMapValueObject[];
  locale: LocaleCode;
}) {
  const copy = COPY[locale] ?? COPY.en;
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const { fitView } = useReactFlow<MindMapNode, Edge>();

  const toggleCollapsed = useCallback((id: string) => {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const graph = useMemo(
    () =>
      buildGraph({
        valueObjects,
        collapsedIds,
        locale,
        copy,
        onToggle: toggleCollapsed,
      }),
    [collapsedIds, copy, locale, toggleCollapsed, valueObjects],
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
  );
}

export function ValueObjectMindMap({
  valueObjects,
  locale,
}: {
  valueObjects: MindMapValueObject[];
  locale: LocaleCode;
}) {
  const copy = COPY[locale] ?? COPY.en;

  return (
    <section className="overflow-hidden rounded-[20px] border border-black/[0.07] bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#edf0f7] px-4 py-3">
        <div>
          <div className="inline-flex rounded-full border border-[#dfe4ff] bg-[#eef2ff] px-2.5 py-1 text-[10px] font-bold text-[#3b6ef8]">
            {copy.readOnly}
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
          <MindMapCanvas valueObjects={valueObjects} locale={locale} />
        </ReactFlowProvider>
      </div>
    </section>
  );
}

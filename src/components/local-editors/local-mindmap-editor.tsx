"use client";

import "@xyflow/react/dist/style.css";

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  applyNodeChanges,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type OnNodeDrag,
  type OnNodesChange,
} from "@xyflow/react";
import {
  ChevronDown,
  ChevronRight,
  Download,
  Edit3,
  Loader2,
  Maximize2,
  Minimize2,
  Plus,
  Redo2,
  ShieldCheck,
  Trash2,
  Undo2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { LocalEditorStandaloneFrame } from "@/components/local-editors/local-editor-standalone-frame";
import { type LocaleCode } from "@/i18n";
import {
  LOCAL_MINDMAP_FORMAT,
  LOCAL_MINDMAP_MIME,
  LOCAL_MINDMAP_VERSION,
  parseLocalMindMapText,
  serializeLocalMindMapDocument,
  type LocalMindMapDocument,
  type LocalMindMapNode,
} from "@/lib/local-editors/local-mindmap-format";
import { saveLocalEditorBlob } from "@/lib/local-editors/local-file-runtime";

type LocalMindMapEditorProps = {
  file: File;
  locale: LocaleCode;
  onDirtyChange?: (dirty: boolean) => void;
};

type MindMapNodeData = {
  label: string;
  parentId: string | null;
  collapsed: boolean;
};

type MindMapFlowNode = Node<MindMapNodeData>;

type MindMapSnapshot = {
  nodes: MindMapFlowNode[];
};

type HistoryStatus = {
  index: number;
  savedIndex: number;
  length: number;
};

type DragSnapshot = {
  nodeId: string;
  startX: number;
  startY: number;
  descendants: Map<string, { x: number; y: number }>;
};

type MindMapCopy = {
  badge: string;
  unsaved: string;
  loading: string;
  save: string;
  saved: string;
  cancelled: string;
  addChild: string;
  rename: string;
  collapse: string;
  expand: string;
  deleteBranch: string;
  undo: string;
  redo: string;
  selected: string;
  noSelection: string;
  renamePrompt: string;
  childPrompt: string;
  deleteConfirm: string;
  cannotDeleteRoot: string;
  invalidName: string;
  maximize: string;
  finish: string;
  hint: string;
};

const COPY: Record<LocaleCode, MindMapCopy> = {
  en: {
    badge: "Local mind map · no server storage",
    unsaved: "unsaved changes",
    loading: "Opening mind map…",
    save: "Save map locally",
    saved: "Local mind-map copy saved.",
    cancelled: "Saving was cancelled.",
    addChild: "Add child",
    rename: "Rename",
    collapse: "Collapse branch",
    expand: "Expand branch",
    deleteBranch: "Delete branch",
    undo: "Undo",
    redo: "Redo",
    selected: "Selected",
    noSelection: "Select a node to edit it.",
    renamePrompt: "Node name",
    childPrompt: "New child node name",
    deleteConfirm: "Delete this node and its whole branch?",
    cannotDeleteRoot: "The root node cannot be deleted.",
    invalidName: "Node name cannot be empty.",
    maximize: "Expand editor",
    finish: "Finish editing",
    hint: "Drag a node to move the whole branch. Double-click a node to rename it.",
  },
  pl: {
    badge: "Lokalna mapa myśli · bez przechowywania na serwerze",
    unsaved: "niezapisane zmiany",
    loading: "Otwieranie mapy myśli…",
    save: "Zapisz mapę lokalnie",
    saved: "Lokalna kopia mapy została zapisana.",
    cancelled: "Zapisywanie zostało anulowane.",
    addChild: "Dodaj węzeł potomny",
    rename: "Zmień nazwę",
    collapse: "Zwiń gałąź",
    expand: "Rozwiń gałąź",
    deleteBranch: "Usuń gałąź",
    undo: "Cofnij",
    redo: "Ponów",
    selected: "Wybrano",
    noSelection: "Wybierz węzeł, aby go edytować.",
    renamePrompt: "Nazwa węzła",
    childPrompt: "Nazwa nowego węzła potomnego",
    deleteConfirm: "Usunąć ten węzeł i całą jego gałąź?",
    cannotDeleteRoot: "Nie można usunąć węzła głównego.",
    invalidName: "Nazwa węzła nie może być pusta.",
    maximize: "Rozwiń edytor",
    finish: "Zakończ edycję",
    hint: "Przeciągnięcie węzła przesuwa całą gałąź. Dwuklik zmienia nazwę.",
  },
  ru: {
    badge: "Локальная мозговая карта · без хранения на сервере",
    unsaved: "несохранённые изменения",
    loading: "Открытие мозговой карты…",
    save: "Сохранить карту локально",
    saved: "Локальная копия карты сохранена.",
    cancelled: "Сохранение отменено.",
    addChild: "Добавить дочерний узел",
    rename: "Переименовать",
    collapse: "Свернуть ветвь",
    expand: "Развернуть ветвь",
    deleteBranch: "Удалить ветвь",
    undo: "Отменить",
    redo: "Повторить",
    selected: "Выбран",
    noSelection: "Выберите узел для редактирования.",
    renamePrompt: "Название узла",
    childPrompt: "Название нового дочернего узла",
    deleteConfirm: "Удалить этот узел и всю его ветвь?",
    cannotDeleteRoot: "Корневой узел удалить нельзя.",
    invalidName: "Название узла не может быть пустым.",
    maximize: "Развернуть редактор",
    finish: "Завершить редактирование",
    hint: "Перетаскивание узла перемещает всю ветвь. Двойной клик переименовывает узел.",
  },
  uk: {
    badge: "Локальна мапа думок · без зберігання на сервері",
    unsaved: "незбережені зміни",
    loading: "Відкриття мапи думок…",
    save: "Зберегти мапу локально",
    saved: "Локальну копію мапи збережено.",
    cancelled: "Збереження скасовано.",
    addChild: "Додати дочірній вузол",
    rename: "Перейменувати",
    collapse: "Згорнути гілку",
    expand: "Розгорнути гілку",
    deleteBranch: "Видалити гілку",
    undo: "Скасувати",
    redo: "Повторити",
    selected: "Вибрано",
    noSelection: "Виберіть вузол для редагування.",
    renamePrompt: "Назва вузла",
    childPrompt: "Назва нового дочірнього вузла",
    deleteConfirm: "Видалити цей вузол і всю його гілку?",
    cannotDeleteRoot: "Кореневий вузол не можна видалити.",
    invalidName: "Назва вузла не може бути порожньою.",
    maximize: "Розгорнути редактор",
    finish: "Завершити редагування",
    hint: "Перетягування вузла переміщує всю гілку. Подвійний клік перейменовує вузол.",
  },
  de: {
    badge: "Lokale Mindmap · keine Serverspeicherung",
    unsaved: "ungespeicherte Änderungen",
    loading: "Mindmap wird geöffnet…",
    save: "Mindmap lokal speichern",
    saved: "Lokale Mindmap-Kopie gespeichert.",
    cancelled: "Speichern wurde abgebrochen.",
    addChild: "Unterknoten hinzufügen",
    rename: "Umbenennen",
    collapse: "Zweig einklappen",
    expand: "Zweig ausklappen",
    deleteBranch: "Zweig löschen",
    undo: "Rückgängig",
    redo: "Wiederholen",
    selected: "Ausgewählt",
    noSelection: "Wählen Sie einen Knoten zum Bearbeiten aus.",
    renamePrompt: "Knotenname",
    childPrompt: "Name des neuen Unterknotens",
    deleteConfirm: "Diesen Knoten und seinen gesamten Zweig löschen?",
    cannotDeleteRoot: "Der Wurzelknoten kann nicht gelöscht werden.",
    invalidName: "Der Knotenname darf nicht leer sein.",
    maximize: "Editor maximieren",
    finish: "Bearbeitung beenden",
    hint: "Beim Ziehen eines Knotens wird der gesamte Zweig verschoben. Doppelklick benennt um.",
  },
  es: {
    badge: "Mapa mental local · sin almacenamiento en servidor",
    unsaved: "cambios sin guardar",
    loading: "Abriendo mapa mental…",
    save: "Guardar mapa localmente",
    saved: "Copia local del mapa guardada.",
    cancelled: "Se canceló el guardado.",
    addChild: "Añadir nodo hijo",
    rename: "Cambiar nombre",
    collapse: "Contraer rama",
    expand: "Expandir rama",
    deleteBranch: "Eliminar rama",
    undo: "Deshacer",
    redo: "Rehacer",
    selected: "Seleccionado",
    noSelection: "Selecciona un nodo para editarlo.",
    renamePrompt: "Nombre del nodo",
    childPrompt: "Nombre del nuevo nodo hijo",
    deleteConfirm: "¿Eliminar este nodo y toda su rama?",
    cannotDeleteRoot: "No se puede eliminar el nodo raíz.",
    invalidName: "El nombre del nodo no puede estar vacío.",
    maximize: "Ampliar editor",
    finish: "Finalizar edición",
    hint: "Arrastrar un nodo mueve toda la rama. El doble clic cambia el nombre.",
  },
  cs: {
    badge: "Lokální myšlenková mapa · bez ukládání na server",
    unsaved: "neuložené změny",
    loading: "Otevírání myšlenkové mapy…",
    save: "Uložit mapu lokálně",
    saved: "Místní kopie mapy byla uložena.",
    cancelled: "Ukládání bylo zrušeno.",
    addChild: "Přidat podřízený uzel",
    rename: "Přejmenovat",
    collapse: "Sbalit větev",
    expand: "Rozbalit větev",
    deleteBranch: "Odstranit větev",
    undo: "Zpět",
    redo: "Znovu",
    selected: "Vybráno",
    noSelection: "Vyberte uzel, který chcete upravit.",
    renamePrompt: "Název uzlu",
    childPrompt: "Název nového podřízeného uzlu",
    deleteConfirm: "Odstranit tento uzel a celou jeho větev?",
    cannotDeleteRoot: "Kořenový uzel nelze odstranit.",
    invalidName: "Název uzlu nesmí být prázdný.",
    maximize: "Rozšířit editor",
    finish: "Dokončit úpravy",
    hint: "Přetažení uzlu přesune celou větev. Dvojklik uzel přejmenuje.",
  },
};

function fileNodesToFlowNodes(nodes: LocalMindMapNode[]): MindMapFlowNode[] {
  return nodes.map((node) => ({
    id: node.id,
    position: { x: node.x, y: node.y },
    data: {
      label: node.label,
      parentId: node.parentId,
      collapsed: node.collapsed,
    },
    type: "default",
  }));
}

function flowNodesToDocument(nodes: MindMapFlowNode[]): LocalMindMapDocument {
  return {
    format: LOCAL_MINDMAP_FORMAT,
    version: LOCAL_MINDMAP_VERSION,
    nodes: nodes.map((node) => ({
      id: node.id,
      label: node.data.label,
      parentId: node.data.parentId,
      x: node.position.x,
      y: node.position.y,
      collapsed: node.data.collapsed,
    })),
  };
}

function cloneNodes(nodes: MindMapFlowNode[]): MindMapFlowNode[] {
  return nodes.map((node) => ({
    id: node.id,
    position: { x: node.position.x, y: node.position.y },
    data: { ...node.data },
    type: "default",
  }));
}

function buildChildMap(nodes: MindMapFlowNode[]): Map<string, string[]> {
  const children = new Map<string, string[]>();
  for (const node of nodes) {
    if (!node.data.parentId) continue;
    const list = children.get(node.data.parentId) ?? [];
    list.push(node.id);
    children.set(node.data.parentId, list);
  }
  return children;
}

function collectDescendantIds(nodeId: string, children: Map<string, string[]>): Set<string> {
  const result = new Set<string>();
  const stack = [...(children.get(nodeId) ?? [])];
  while (stack.length) {
    const current = stack.pop();
    if (!current || result.has(current)) continue;
    result.add(current);
    stack.push(...(children.get(current) ?? []));
  }
  return result;
}

function createNodeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `node-${crypto.randomUUID()}`;
  }
  return `node-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function LocalMindMapEditor({ file, locale, onDirtyChange }: LocalMindMapEditorProps) {
  const copy = COPY[locale] ?? COPY.en;
  const [nodes, setNodes] = useState<MindMapFlowNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [historyStatus, setHistoryStatus] = useState<HistoryStatus>({
    index: 0,
    savedIndex: 0,
    length: 0,
  });
  const exitStandalone = useCallback(() => setStandalone(false), []);
  const historyRef = useRef<MindMapSnapshot[]>([]);
  const historyIndexRef = useRef(0);
  const savedHistoryIndexRef = useRef(0);
  const dragSnapshotRef = useRef<DragSnapshot | null>(null);

  const setDirtyFromHistory = useCallback(() => {
    onDirtyChange?.(historyIndexRef.current !== savedHistoryIndexRef.current);
  }, [onDirtyChange]);

  const resetHistory = useCallback(
    (nextNodes: MindMapFlowNode[]) => {
      historyRef.current = [{ nodes: cloneNodes(nextNodes) }];
      historyIndexRef.current = 0;
      savedHistoryIndexRef.current = 0;
      setHistoryStatus({ index: 0, savedIndex: 0, length: 1 });
      onDirtyChange?.(false);
    },
    [onDirtyChange],
  );

  const commitNodes = useCallback(
    (nextNodes: MindMapFlowNode[]) => {
      const snapshot = { nodes: cloneNodes(nextNodes) };
      const branchBaseIndex = historyIndexRef.current;
      historyRef.current = historyRef.current.slice(0, branchBaseIndex + 1);
      if (savedHistoryIndexRef.current > branchBaseIndex) {
        savedHistoryIndexRef.current = -1;
      }
      historyRef.current.push(snapshot);
      const nextIndex = branchBaseIndex + 1;
      historyIndexRef.current = nextIndex;
      const nextLength = historyRef.current.length;
      setNodes(snapshot.nodes);
      setHistoryStatus({
        index: nextIndex,
        savedIndex: savedHistoryIndexRef.current,
        length: nextLength,
      });
      setDirtyFromHistory();
    },
    [setDirtyFromHistory],
  );

  useEffect(() => {
    let cancelled = false;
    void file
      .text()
      .then((text) => parseLocalMindMapText(text))
      .then((document) => {
        if (cancelled) return;
        const loadedNodes = fileNodesToFlowNodes(document.nodes);
        setNodes(loadedNodes);
        resetHistory(loadedNodes);
        setLoading(false);
      })
      .catch((openError) => {
        if (cancelled) return;
        setNodes([]);
        setLoading(false);
        setError(openError instanceof Error ? openError.message : String(openError));
        onDirtyChange?.(false);
      });
    return () => {
      cancelled = true;
    };
  }, [file, onDirtyChange, resetHistory]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (historyIndexRef.current === savedHistoryIndexRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const childMap = useMemo(() => buildChildMap(nodes), [nodes]);
  const hiddenNodeIds = useMemo(() => {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const hidden = new Set<string>();
    for (const node of nodes) {
      let parentId = node.data.parentId;
      while (parentId) {
        const parent = byId.get(parentId);
        if (!parent) break;
        if (parent.data.collapsed) {
          hidden.add(node.id);
          break;
        }
        parentId = parent.data.parentId;
      }
    }
    return hidden;
  }, [nodes]);

  const visibleNodes = useMemo(
    () =>
      nodes.map((node) => {
        const hasChildren = (childMap.get(node.id)?.length ?? 0) > 0;
        const prefix = hasChildren && node.data.collapsed ? "▶ " : "";
        return {
          ...node,
          hidden: hiddenNodeIds.has(node.id),
          data: { ...node.data, label: `${prefix}${node.data.label}` },
          style: {
            minWidth: 150,
            borderRadius: 14,
            border: node.id === selectedNodeId ? "2px solid #3b6ef8" : "1px solid #dfe3ef",
            background: "#ffffff",
            color: "#20263b",
            fontSize: 12,
            fontWeight: 700,
            boxShadow: "0 4px 16px rgba(31, 41, 55, 0.08)",
          },
        } satisfies MindMapFlowNode;
      }),
    [childMap, hiddenNodeIds, nodes, selectedNodeId],
  );

  const edges = useMemo<Edge[]>(
    () =>
      nodes
        .filter((node) => node.data.parentId !== null)
        .map((node) => ({
          id: `edge-${node.data.parentId}-${node.id}`,
          source: node.data.parentId as string,
          target: node.id,
          type: "smoothstep",
          hidden: hiddenNodeIds.has(node.id),
        })),
    [hiddenNodeIds, nodes],
  );

  const selectedNode = selectedNodeId ? nodes.find((node) => node.id === selectedNodeId) ?? null : null;
  const selectedHasChildren = selectedNode ? (childMap.get(selectedNode.id)?.length ?? 0) > 0 : false;
  const dirty = historyStatus.index !== historyStatus.savedIndex;
  const canUndo = historyStatus.index > 0;
  const canRedo = historyStatus.index < historyStatus.length - 1;

  const onNodesChange: OnNodesChange<MindMapFlowNode> = useCallback((changes) => {
    setNodes((current) => applyNodeChanges(changes, current));
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    const nextIndex = historyIndexRef.current - 1;
    historyIndexRef.current = nextIndex;
    const snapshot = historyRef.current[nextIndex];
    setNodes(cloneNodes(snapshot.nodes));
    setSelectedNodeId(null);
    setHistoryStatus({
      index: nextIndex,
      savedIndex: savedHistoryIndexRef.current,
      length: historyRef.current.length,
    });
    setDirtyFromHistory();
  }, [setDirtyFromHistory]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    const nextIndex = historyIndexRef.current + 1;
    historyIndexRef.current = nextIndex;
    const snapshot = historyRef.current[nextIndex];
    setNodes(cloneNodes(snapshot.nodes));
    setSelectedNodeId(null);
    setHistoryStatus({
      index: nextIndex,
      savedIndex: savedHistoryIndexRef.current,
      length: historyRef.current.length,
    });
    setDirtyFromHistory();
  }, [setDirtyFromHistory]);

  const renameNode = useCallback(
    (nodeId: string) => {
      const node = nodes.find((candidate) => candidate.id === nodeId);
      if (!node) return;
      const nextLabel = window.prompt(copy.renamePrompt, node.data.label);
      if (nextLabel === null) return;
      const trimmed = nextLabel.trim();
      if (!trimmed) {
        setError(copy.invalidName);
        return;
      }
      setError(null);
      commitNodes(
        nodes.map((candidate) =>
          candidate.id === nodeId
            ? { ...candidate, data: { ...candidate.data, label: trimmed } }
            : candidate,
        ),
      );
    },
    [commitNodes, copy.invalidName, copy.renamePrompt, nodes],
  );

  const addChild = useCallback(() => {
    const parent = selectedNode ?? nodes.find((node) => node.data.parentId === null) ?? null;
    if (!parent) return;
    const label = window.prompt(copy.childPrompt, "");
    if (label === null) return;
    const trimmed = label.trim();
    if (!trimmed) {
      setError(copy.invalidName);
      return;
    }
    const siblingCount = childMap.get(parent.id)?.length ?? 0;
    const nextNode: MindMapFlowNode = {
      id: createNodeId(),
      position: { x: parent.position.x + 230, y: parent.position.y + siblingCount * 100 },
      data: { label: trimmed, parentId: parent.id, collapsed: false },
      type: "default",
    };
    setError(null);
    commitNodes([...nodes, nextNode]);
    setSelectedNodeId(nextNode.id);
  }, [childMap, commitNodes, copy.childPrompt, copy.invalidName, nodes, selectedNode]);

  const toggleCollapse = useCallback(() => {
    if (!selectedNode || !selectedHasChildren) return;
    commitNodes(
      nodes.map((node) =>
        node.id === selectedNode.id
          ? { ...node, data: { ...node.data, collapsed: !node.data.collapsed } }
          : node,
      ),
    );
  }, [commitNodes, nodes, selectedHasChildren, selectedNode]);

  const deleteBranch = useCallback(() => {
    if (!selectedNode) return;
    if (selectedNode.data.parentId === null) {
      setError(copy.cannotDeleteRoot);
      return;
    }
    if (!window.confirm(copy.deleteConfirm)) return;
    const ids = collectDescendantIds(selectedNode.id, childMap);
    ids.add(selectedNode.id);
    setError(null);
    commitNodes(nodes.filter((node) => !ids.has(node.id)));
    setSelectedNodeId(selectedNode.data.parentId);
  }, [childMap, commitNodes, copy.cannotDeleteRoot, copy.deleteConfirm, nodes, selectedNode]);

  const handleNodeClick: NodeMouseHandler<MindMapFlowNode> = useCallback((_, node) => {
    setSelectedNodeId(node.id);
  }, []);

  const handleNodeDoubleClick: NodeMouseHandler<MindMapFlowNode> = useCallback(
    (_, node) => renameNode(node.id),
    [renameNode],
  );

  const handleNodeDragStart: OnNodeDrag<MindMapFlowNode> = useCallback(
    (_, node) => {
      const descendants = collectDescendantIds(node.id, childMap);
      const positions = new Map<string, { x: number; y: number }>();
      for (const descendantId of descendants) {
        const descendant = nodes.find((candidate) => candidate.id === descendantId);
        if (descendant) positions.set(descendantId, { ...descendant.position });
      }
      dragSnapshotRef.current = {
        nodeId: node.id,
        startX: node.position.x,
        startY: node.position.y,
        descendants: positions,
      };
    },
    [childMap, nodes],
  );

  const handleNodeDragStop: OnNodeDrag<MindMapFlowNode> = useCallback(
    (_, node) => {
      const drag = dragSnapshotRef.current;
      dragSnapshotRef.current = null;
      if (!drag || drag.nodeId !== node.id) return;
      const dx = node.position.x - drag.startX;
      const dy = node.position.y - drag.startY;
      if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return;
      const moved = nodes.map((candidate) => {
        if (candidate.id === node.id) {
          return { ...candidate, position: { x: node.position.x, y: node.position.y } };
        }
        const start = drag.descendants.get(candidate.id);
        return start
          ? { ...candidate, position: { x: start.x + dx, y: start.y + dy } }
          : candidate;
      });
      commitNodes(moved);
    },
    [commitNodes, nodes],
  );

  const saveMap = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const text = serializeLocalMindMapDocument(flowNodesToDocument(nodes));
      const result = await saveLocalEditorBlob({
        kind: "mindmap",
        blob: new Blob([text], { type: LOCAL_MINDMAP_MIME }),
        suggestedName: file.name,
      });
      if (result.status === "saved") {
        const savedIndex = historyIndexRef.current;
        savedHistoryIndexRef.current = savedIndex;
        setHistoryStatus((current) => ({ ...current, savedIndex }));
        onDirtyChange?.(false);
        setMessage(copy.saved);
      } else {
        setMessage(copy.cancelled);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  }, [copy.cancelled, copy.saved, file.name, nodes, onDirtyChange]);

  if (loading) {
    return (
      <section className="rounded-[26px] border border-black/[0.07] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-[#5f6680]">
          <Loader2 className="animate-spin" size={17} aria-hidden="true" />
          {copy.loading}
        </div>
      </section>
    );
  }

  if (error && nodes.length === 0) {
    return (
      <section className="rounded-[26px] border border-rose-200 bg-white p-6 shadow-sm">
        <div className="text-[13px] font-semibold text-rose-700">{error}</div>
      </section>
    );
  }

  return (
    <LocalEditorStandaloneFrame active={standalone} onExit={exitStandalone}>
      <section
        className={
          standalone
            ? "flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-white"
            : "min-w-0 max-w-full overflow-hidden rounded-[26px] border border-black/[0.07] bg-white shadow-sm"
        }
      >
        <div className="flex shrink-0 flex-col gap-3 border-b border-[#e8eaf2] px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[12px] font-bold text-emerald-700">
              <ShieldCheck size={16} aria-hidden="true" />
              {copy.badge}
            </div>
            <div className="mt-1 truncate text-[14px] font-bold text-[#20263b]" title={file.name}>
              {file.name}
              {dirty ? ` · ${copy.unsaved}` : ""}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={undo} disabled={!canUndo} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[#dce2f2] bg-white px-3 text-[11px] font-bold text-[#3657b6] disabled:opacity-40">
              <Undo2 size={15} aria-hidden="true" />{copy.undo}
            </button>
            <button type="button" onClick={redo} disabled={!canRedo} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[#dce2f2] bg-white px-3 text-[11px] font-bold text-[#3657b6] disabled:opacity-40">
              <Redo2 size={15} aria-hidden="true" />{copy.redo}
            </button>
            <button type="button" onClick={() => setStandalone((current) => !current)} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[#dce2f2] bg-white px-3 text-[11px] font-bold text-[#3657b6]">
              {standalone ? <Minimize2 size={15} aria-hidden="true" /> : <Maximize2 size={15} aria-hidden="true" />}
              {standalone ? copy.finish : copy.maximize}
            </button>
            <button type="button" onClick={() => void saveMap()} disabled={saving} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-[#3b6ef8] px-3 text-[11px] font-bold text-white disabled:opacity-50">
              {saving ? <Loader2 className="animate-spin" size={15} aria-hidden="true" /> : <Download size={15} aria-hidden="true" />}
              {copy.save}
            </button>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[#e8eaf2] bg-[#fafbfe] px-4 py-2.5">
          <button type="button" onClick={addChild} disabled={nodes.length === 0} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[#dce2f2] bg-white px-3 text-[11px] font-bold text-[#3657b6] disabled:opacity-40">
            <Plus size={15} aria-hidden="true" />{copy.addChild}
          </button>
          <button type="button" onClick={() => selectedNode && renameNode(selectedNode.id)} disabled={!selectedNode} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[#dce2f2] bg-white px-3 text-[11px] font-bold text-[#3657b6] disabled:opacity-40">
            <Edit3 size={15} aria-hidden="true" />{copy.rename}
          </button>
          <button type="button" onClick={toggleCollapse} disabled={!selectedNode || !selectedHasChildren} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[#dce2f2] bg-white px-3 text-[11px] font-bold text-[#3657b6] disabled:opacity-40">
            {selectedNode?.data.collapsed ? <ChevronRight size={15} aria-hidden="true" /> : <ChevronDown size={15} aria-hidden="true" />}
            {selectedNode?.data.collapsed ? copy.expand : copy.collapse}
          </button>
          <button type="button" onClick={deleteBranch} disabled={!selectedNode || selectedNode.data.parentId === null} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 text-[11px] font-bold text-rose-600 disabled:opacity-40">
            <Trash2 size={15} aria-hidden="true" />{copy.deleteBranch}
          </button>
          <div className="min-w-0 flex-1 text-right text-[11px] text-[#6f7690]">
            {selectedNode ? `${copy.selected}: ${selectedNode.data.label}` : copy.noSelection}
          </div>
        </div>

        {message ? <div className="shrink-0 border-b border-emerald-100 bg-emerald-50 px-4 py-2 text-[12px] font-semibold text-emerald-700">{message}</div> : null}
        {error ? <div className="shrink-0 border-b border-rose-100 bg-rose-50 px-4 py-2 text-[12px] font-semibold text-rose-700">{error}</div> : null}

        <div className="shrink-0 border-b border-[#e8eaf2] bg-[#f8faff] px-4 py-2 text-[11px] text-[#66708f]">{copy.hint}</div>

        <div className={standalone ? "min-h-0 flex-1" : "h-[70dvh] min-h-[520px] max-h-[900px]"}>
          <ReactFlow
            nodes={visibleNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            onPaneClick={() => setSelectedNodeId(null)}
            onNodeDragStart={handleNodeDragStart}
            onNodeDragStop={handleNodeDragStop}
            nodesConnectable={false}
            deleteKeyCode={null}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            minZoom={0.15}
            maxZoom={2.5}
          >
            <MiniMap pannable zoomable />
            <Controls />
            <Background gap={20} size={1} />
          </ReactFlow>
        </div>
      </section>
    </LocalEditorStandaloneFrame>
  );
}

export const LOCAL_MINDMAP_FORMAT = "arctor.mindmap" as const;
export const LOCAL_MINDMAP_VERSION = 1 as const;
export const LOCAL_MINDMAP_MIME = "application/json";
export const LOCAL_MINDMAP_DEFAULT_NAME = "ARCTor-mind-map.arctormap";
export const LOCAL_MINDMAP_MAX_NODES = 5000;

export type LocalMindMapNode = {
  id: string;
  label: string;
  parentId: string | null;
  x: number;
  y: number;
  collapsed: boolean;
};

export type LocalMindMapDocument = {
  format: typeof LOCAL_MINDMAP_FORMAT;
  version: typeof LOCAL_MINDMAP_VERSION;
  nodes: LocalMindMapNode[];
};

function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function assertFiniteCoordinate(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
  if (Math.abs(value) > 1_000_000) {
    throw new Error(`${label} is outside the supported canvas range.`);
  }
  return value;
}

function assertNode(raw: unknown, index: number): LocalMindMapNode {
  assertRecord(raw, `nodes[${index}]`);
  const id = raw.id;
  const label = raw.label;
  const parentId = raw.parentId;
  const collapsed = raw.collapsed;

  if (typeof id !== "string" || !id.trim() || id.length > 200) {
    throw new Error(`nodes[${index}].id is invalid.`);
  }
  if (typeof label !== "string" || !label.trim() || label.length > 500) {
    throw new Error(`nodes[${index}].label is invalid.`);
  }
  if (parentId !== null && (typeof parentId !== "string" || !parentId.trim())) {
    throw new Error(`nodes[${index}].parentId is invalid.`);
  }
  if (typeof collapsed !== "boolean") {
    throw new Error(`nodes[${index}].collapsed must be boolean.`);
  }

  return {
    id,
    label: label.trim(),
    parentId,
    x: assertFiniteCoordinate(raw.x, `nodes[${index}].x`),
    y: assertFiniteCoordinate(raw.y, `nodes[${index}].y`),
    collapsed,
  };
}

export function validateLocalMindMapDocument(value: unknown): LocalMindMapDocument {
  assertRecord(value, "Mind map");
  if (value.format !== LOCAL_MINDMAP_FORMAT) {
    throw new Error(`Unsupported mind map format. Expected ${LOCAL_MINDMAP_FORMAT}.`);
  }
  if (value.version !== LOCAL_MINDMAP_VERSION) {
    throw new Error(`Unsupported mind map version: ${String(value.version)}.`);
  }
  if (!Array.isArray(value.nodes) || value.nodes.length < 1) {
    throw new Error("Mind map must contain at least one node.");
  }
  if (value.nodes.length > LOCAL_MINDMAP_MAX_NODES) {
    throw new Error(`Mind map exceeds the ${LOCAL_MINDMAP_MAX_NODES}-node safety limit.`);
  }

  const nodes = value.nodes.map(assertNode);
  const byId = new Map<string, LocalMindMapNode>();
  for (const node of nodes) {
    if (byId.has(node.id)) throw new Error(`Duplicate node id: ${node.id}.`);
    byId.set(node.id, node);
  }

  const roots = nodes.filter((node) => node.parentId === null);
  if (roots.length !== 1) {
    throw new Error(`Mind map must contain exactly one root node; found ${roots.length}.`);
  }

  for (const node of nodes) {
    if (node.parentId === null) continue;
    if (node.parentId === node.id) throw new Error(`Node ${node.id} cannot be its own parent.`);
    if (!byId.has(node.parentId)) throw new Error(`Node ${node.id} references missing parent ${node.parentId}.`);
  }

  const rootId = roots[0].id;
  for (const node of nodes) {
    const visited = new Set<string>();
    let current: LocalMindMapNode | undefined = node;
    while (current.parentId !== null) {
      if (visited.has(current.id)) throw new Error(`Cycle detected at node ${current.id}.`);
      visited.add(current.id);
      current = byId.get(current.parentId);
      if (!current) throw new Error(`Broken parent chain at node ${node.id}.`);
    }
    if (current.id !== rootId) throw new Error(`Node ${node.id} is not connected to the root.`);
  }

  return {
    format: LOCAL_MINDMAP_FORMAT,
    version: LOCAL_MINDMAP_VERSION,
    nodes,
  };
}

export function parseLocalMindMapText(text: string): LocalMindMapDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }
  return validateLocalMindMapDocument(parsed);
}

export function serializeLocalMindMapDocument(document: LocalMindMapDocument): string {
  const validated = validateLocalMindMapDocument(document);
  return `${JSON.stringify(validated, null, 2)}\n`;
}

export function createBlankLocalMindMapDocument(rootLabel: string): LocalMindMapDocument {
  const safeLabel = rootLabel.trim() || "Mind map";
  return {
    format: LOCAL_MINDMAP_FORMAT,
    version: LOCAL_MINDMAP_VERSION,
    nodes: [
      {
        id: "root",
        label: safeLabel,
        parentId: null,
        x: 0,
        y: 0,
        collapsed: false,
      },
    ],
  };
}

export function createBlankMindMapFile(rootLabel: string): File {
  const text = serializeLocalMindMapDocument(createBlankLocalMindMapDocument(rootLabel));
  return new File([text], LOCAL_MINDMAP_DEFAULT_NAME, { type: LOCAL_MINDMAP_MIME });
}

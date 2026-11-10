import { GRAPH_ANCESTRY_RULE_PILOT_V1 } from './graphRuleRegistryPilotV1';

export type GraphAncestryNodeV1 = Readonly<{
  id: string;
  title: string;
  parent_value_object_id: string | null;
}>;
export type GraphAncestryItemV1 = Readonly<{
  ancestorValueObjectId: string;
  ancestorTitle: string;
  depth: 1 | 2;
  epistemicKind: 'DIRECT' | 'DERIVED';
  verificationStatus: 'RULE_APPLIED';
  ruleId: string;
  ruleVersion: string;
  supportNodeIds: readonly string[];
  supportEdges: readonly Readonly<{ childId: string; parentId: string }>[];
}>;
export type GraphAncestryResultV1 = Readonly<{
  items: readonly GraphAncestryItemV1[];
  pathComplete: boolean;
  stopReason: 'ROOT_REACHED' | 'MAX_DEPTH' | 'MISSING_OR_INVISIBLE_PARENT';
}>;

const isId = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/** Pure deterministic inference. The server adapter MUST supply only authorized nodes. */
export function inferGraphAncestryPilotV1(args: Readonly<{
  anchorId: string;
  authorizedNodes: readonly GraphAncestryNodeV1[];
}>): GraphAncestryResultV1 {
  if (!isId(args.anchorId) || args.authorizedNodes.length > 3)
    throw new Error('INVALID_ANCESTRY_INPUT');
  const nodes = new Map<string, GraphAncestryNodeV1>();
  for (const node of args.authorizedNodes) {
    if (!isId(node.id) || typeof node.title !== 'string' || node.title.length > 1000 ||
      (node.parent_value_object_id !== null && !isId(node.parent_value_object_id)) || nodes.has(node.id))
      throw new Error('INVALID_ANCESTRY_NODE');
    nodes.set(node.id, node);
  }
  if (!nodes.has(args.anchorId)) throw new Error('ANCHOR_ABSENT');

  const items: GraphAncestryItemV1[] = [];
  const visited = new Set([args.anchorId]);
  let currentId = args.anchorId;
  const path: { childId: string; parentId: string }[] = [];

  for (let depth = 1; depth <= GRAPH_ANCESTRY_RULE_PILOT_V1.maxDepth; depth++) {
    const child = nodes.get(currentId);
    if (!child) return { items, pathComplete: false, stopReason: 'MISSING_OR_INVISIBLE_PARENT' };
    if (child.parent_value_object_id === null)
      return { items, pathComplete: true, stopReason: 'ROOT_REACHED' };
    const parentId = child.parent_value_object_id;
    if (visited.has(parentId)) throw new Error('HIERARCHY_CYCLE');
    const parent = nodes.get(parentId);
    if (!parent)
      return { items, pathComplete: false, stopReason: 'MISSING_OR_INVISIBLE_PARENT' };
    visited.add(parentId);
    path.push({ childId: currentId, parentId });
    items.push({
      ancestorValueObjectId: parentId,
      ancestorTitle: parent.title,
      depth: depth as 1 | 2,
      epistemicKind: depth === 1 ? 'DIRECT' : 'DERIVED',
      verificationStatus: 'RULE_APPLIED',
      ruleId: GRAPH_ANCESTRY_RULE_PILOT_V1.ruleId,
      ruleVersion: GRAPH_ANCESTRY_RULE_PILOT_V1.ruleVersion,
      supportNodeIds: [args.anchorId, ...path.map((p) => p.parentId)],
      supportEdges: path.map((p) => ({ ...p })),
    });
    currentId = parentId;
  }
  const last = nodes.get(currentId)!;
  return { items, pathComplete: last.parent_value_object_id === null,
    stopReason: last.parent_value_object_id === null ? 'ROOT_REACHED' : 'MAX_DEPTH' };
}

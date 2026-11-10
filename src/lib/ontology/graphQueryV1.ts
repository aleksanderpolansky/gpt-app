/**
 * ARI-04.07.02 / M-0195 — read-only, bounded neighbor projection.
 * No DB, HTTP, authentication, GraphDB or mutation in this module.
 * The API adapter must enforce actor ownership and system-scope isolation.
 */
export type GraphNeighborDirection = 'all' | 'incoming' | 'outgoing' | 'symmetric';
export type GraphNeighborScope = 'system' | 'actor';
export type GraphDirectedPerspective = Exclude<GraphNeighborDirection, 'all'>;
export type GraphNeighborQuery = Readonly<{
  direction: GraphNeighborDirection;
  relationTypeCode: string | null;
  limit: number;
}>;
export type GraphRelationTypeV1 = Readonly<{
  relation_type_code: string;
  directionality_code: string;
  status: string;
}>;
export type GraphRelationRowV1 = Readonly<{
  id: string;
  source_value_object_id: string;
  target_value_object_id: string;
  relation_type_code: string;
  status: string;
  updated_at: string;
}>;
export type GraphNeighborNodeV1 = Readonly<{
  id: string;
  title: string;
}>;
export type GraphNeighborItemV1 = Readonly<{
  relationId: string;
  neighborValueObjectId: string;
  neighborTitle: string;
  sourceValueObjectId: string;
  targetValueObjectId: string;
  relationTypeCode: string;
  perspective: GraphDirectedPerspective;
  updatedAt: string;
}>;
export type GraphNeighborResultV1 = Readonly<{
  items: GraphNeighborItemV1[];
  truncated: boolean;
}>;

const VALID_DIRECTIONS = ['all', 'outgoing', 'incoming', 'symmetric'] as const;
const RELATION_TYPE_CODE = /^[a-z][a-z0-9_]{1,79}$/;

export function parseGraphNeighborQueryV1(input: URLSearchParams): GraphNeighborQuery {
  const keys = ['direction', 'type', 'limit'];
  for (const key of keys) {
    if (input.getAll(key).length > 1) throw new Error('DUPLICATE_PARAMETER:' + key);
  }
  for (const key of input.keys()) {
    if (!keys.includes(key)) throw new Error('UNKNOWN_PARAMETER:' + key);
  }
  const rawDirection = input.get('direction') ?? 'all';
  if (!VALID_DIRECTIONS.some((v) => v === rawDirection)) throw new Error('INVALID_DIRECTION');
  const rawType = input.get('type');
  if (rawType !== null && !RELATION_TYPE_CODE.test(rawType)) throw new Error('INVALID_TYPE');
  const rawLimit = input.get('limit') ?? '25';
  if (!/^[1-9][0-9]*$/.test(rawLimit)) throw new Error('INVALID_LIMIT');
  const limit = Number(rawLimit);
  if (!Number.isSafeInteger(limit) || limit > 50) throw new Error('LIMIT_OUT_OF_RANGE');
  return { direction: rawDirection as GraphNeighborDirection, relationTypeCode: rawType, limit };
}

export function selectGraphNeighborTypeCodesV1(
  registry: readonly GraphRelationTypeV1[],
  query: GraphNeighborQuery,
): string[] {
  const candidates = registry.filter((row) =>
    row.status === 'active' &&
    (row.directionality_code === 'directed' || row.directionality_code === 'symmetric') &&
    (!query.relationTypeCode || row.relation_type_code === query.relationTypeCode) &&
    (query.direction === 'all' ||
      (query.direction === 'symmetric' ? row.directionality_code === 'symmetric' : row.directionality_code === 'directed')),
  );
  return [...new Set(candidates.map((r) => r.relation_type_code))].sort();
}

/** Merge at most two independently index-backed query results. */
export function buildGraphNeighborViewV1(args: {
  anchorValueObjectId: string;
  query: GraphNeighborQuery;
  types: readonly GraphRelationTypeV1[];
  rows: readonly GraphRelationRowV1[];
  visibleNeighbors: readonly GraphNeighborNodeV1[];
}): GraphNeighborResultV1 {
  const { anchorValueObjectId: anchor, query, types, rows, visibleNeighbors } = args;
  const activeTypes = new Map(types
    .filter((t) => t.status === 'active' && (t.directionality_code === 'directed' || t.directionality_code === 'symmetric'))
    .map((t) => [t.relation_type_code, t.directionality_code] as const));
  const nodes = new Map(visibleNeighbors.map((n) => [n.id, n.title] as const));
  const seenIds = new Set<string>();
  const seenCanonical = new Set<string>();
  const result: GraphNeighborItemV1[] = [];
  for (const row of [...rows].sort((a, b) => b.updated_at.localeCompare(a.updated_at) || a.id.localeCompare(b.id))) {
    if (row.status !== 'active' || seenIds.has(row.id)) continue;
    seenIds.add(row.id);
    const dir = activeTypes.get(row.relation_type_code);
    if (!dir || (query.relationTypeCode && query.relationTypeCode !== row.relation_type_code)) continue;
    if (row.source_value_object_id !== anchor && row.target_value_object_id !== anchor) continue;
    let perspective: GraphDirectedPerspective;
    if (dir === 'symmetric') perspective = 'symmetric';
    else perspective = row.source_value_object_id === anchor ? 'outgoing' : 'incoming';
    if (query.direction !== 'all' && query.direction !== perspective) continue;
    const neighborId = row.source_value_object_id === anchor ? row.target_value_object_id : row.source_value_object_id;
    const title = nodes.get(neighborId);
    if (title === undefined) continue; // fail closed if neighbor not visible in authorized scope
    const canonical = dir === 'symmetric'
      ? [row.source_value_object_id, row.target_value_object_id].sort().join('|')
      : `${row.source_value_object_id}|${row.target_value_object_id}`;
    const fingerprint = `${row.relation_type_code}|${canonical}`;
    if (seenCanonical.has(fingerprint)) continue;
    seenCanonical.add(fingerprint);
    result.push({
      relationId: row.id,
      neighborValueObjectId: neighborId,
      neighborTitle: title,
      sourceValueObjectId: row.source_value_object_id,
      targetValueObjectId: row.target_value_object_id,
      relationTypeCode: row.relation_type_code,
      perspective,
      updatedAt: row.updated_at,
    });
  }
  return { items: result.slice(0, query.limit), truncated: result.length > query.limit };
}

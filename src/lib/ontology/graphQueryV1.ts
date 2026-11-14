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
  canonical_relation_type_code?: string | null;
  canonical_orientation_code?: 'same' | 'reverse' | 'symmetric' | null;
  canonical_write_policy_code?: string | null;
}>;
export type GraphRelationRowV1 = Readonly<{
  id: string;
  source_value_object_id: string;
  target_value_object_id: string;
  relation_type_code: string;
  status: string;
  updated_at: string;
  // Optional future time bounds: current SQL reads do NOT yet supply these fields.
  valid_from?: string | null;
  valid_to?: string | null;
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
  status: string;
  perspective: GraphDirectedPerspective;
  updatedAt: string;
  validFrom?: string | null;
  validTo?: string | null;
}>;
export type GraphNeighborResultV1 = Readonly<{
  items: GraphNeighborItemV1[];
  truncated: boolean;
}>;

const VALID_DIRECTIONS = ['all', 'outgoing', 'incoming', 'symmetric'] as const;
const RELATION_TYPE_CODE = /^[a-z][a-z0-9_]{1,79}$/;

/** Physical reads preserve historical canonical relation codes, even if their current
 * write policy is disabled. Only reverse alias rows must be excluded from storage. */
export function isCanonicalStoredGraphTypeX04(t: GraphRelationTypeV1): boolean {
  if (t.status !== 'active' || !['directed', 'symmetric'].includes(t.directionality_code)) return false;
  if (t.canonical_relation_type_code != null && t.canonical_relation_type_code !== t.relation_type_code) return false;
  if (t.canonical_orientation_code === 'reverse' || t.canonical_write_policy_code === 'reverse_alias') return false;
  if (t.canonical_orientation_code === 'symmetric' && t.directionality_code !== 'symmetric') return false;
  if (t.canonical_orientation_code === 'same' && t.directionality_code !== 'directed') return false;
  return true;
}

/** Resolve an explicitly requested reverse alias against the accepted P3 type registry.
 * Items still expose the real stored canonical code and physical direction. */
export function canonicalizeGraphReadQueryX04(types: readonly GraphRelationTypeV1[], q: GraphNeighborQuery): GraphNeighborQuery | null {
  if (q.relationTypeCode === null) return q;
  const requested = types.find(t => t.relation_type_code === q.relationTypeCode);
  if (!requested || requested.status !== 'active') return null;
  const code = requested.canonical_relation_type_code ?? requested.relation_type_code;
  const canonical = types.find(t => t.relation_type_code === code);
  if (!canonical || !isCanonicalStoredGraphTypeX04(canonical)) return null;
  const reverse = requested.canonical_orientation_code === 'reverse';
  if (reverse && requested.canonical_write_policy_code !== 'reverse_alias') return null;
  if (!reverse && code !== requested.relation_type_code) return null;
  const direction = reverse
    ? q.direction === 'outgoing' ? 'incoming' : q.direction === 'incoming' ? 'outgoing' : q.direction
    : q.direction;
  return { ...q, direction, relationTypeCode: code };
}

/** Same orientation principle as the existing DB candidate validator. Read-only helper. */
export function canonicalizeGraphCandidateX04(
  types: readonly GraphRelationTypeV1[], typeCode: string, sourceId: string, targetId: string,
): Readonly<{relationTypeCode: string; sourceId: string; targetId: string}> | null {
  const requested = types.find(t => t.relation_type_code === typeCode);
  const q = canonicalizeGraphReadQueryX04(types, {direction:'all',relationTypeCode:typeCode,limit:1});
  if (!requested || !q?.relationTypeCode) return null;
  let source=sourceId, target=targetId;
  if (requested.canonical_orientation_code === 'reverse') [source,target]=[target,source];
  else if (requested.canonical_orientation_code === 'symmetric' && source > target) [source,target]=[target,source];
  return {relationTypeCode:q.relationTypeCode,sourceId:source,targetId:target};
}

/** Time-aware identity for future interval-bearing rows. Does not infer missing dates or evidence. */
function graphTemporalBoundsValidX04(row: GraphRelationRowV1): boolean {
  const from=row.valid_from ?? null, to=row.valid_to ?? null;
  const valid=(t: string | null) => t === null ||
    (/^\d{4}-\d{2}-\d{2}T/.test(t) && /(?:Z|[+-]\d{2}:\d{2})$/.test(t) && Number.isFinite(Date.parse(t)));
  if (!valid(from) || !valid(to)) return false;
  return from === null || to === null || Date.parse(from) < Date.parse(to);
}

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
    isCanonicalStoredGraphTypeX04(row) &&
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
    .filter(isCanonicalStoredGraphTypeX04)
    .map((t) => [t.relation_type_code, t.directionality_code] as const));
  const nodes = new Map(visibleNeighbors.map((n) => [n.id, n.title] as const));
  const seenIds = new Set<string>();
  const seenCanonical = new Set<string>();
  const result: GraphNeighborItemV1[] = [];
  for (const row of [...rows].sort((a, b) => b.updated_at.localeCompare(a.updated_at) || a.id.localeCompare(b.id))) {
    if (row.status !== 'active' || seenIds.has(row.id) || !graphTemporalBoundsValidX04(row)) continue;
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
    const fingerprint = `${row.relation_type_code}|${canonical}|${JSON.stringify([row.valid_from ?? null, row.valid_to ?? null])}`;
    if (seenCanonical.has(fingerprint)) continue;
    seenCanonical.add(fingerprint);
    result.push({
      relationId: row.id,
      neighborValueObjectId: neighborId,
      neighborTitle: title,
      sourceValueObjectId: row.source_value_object_id,
      targetValueObjectId: row.target_value_object_id,
      relationTypeCode: row.relation_type_code,
      status: row.status,
      perspective,
      updatedAt: row.updated_at,
      ...(row.valid_from !== undefined ? { validFrom: row.valid_from } : {}),
      ...(row.valid_to !== undefined ? { validTo: row.valid_to } : {}),
    });
  }
  return { items: result.slice(0, query.limit), truncated: result.length > query.limit };
}

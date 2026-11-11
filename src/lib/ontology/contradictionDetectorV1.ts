/**
 * ARCTor ARI-04.06.01 / M-0187 — offline, pure, deterministic contradiction
 * candidate detector. It neither reads DB/API nor writes to the ontology.
 *
 * Only explicit negation of an identical, bounded, verified claim is a strict
 * logical contradiction. 'conflicts_with' and 'supports' can coexist in
 * different respects; their coexistence is a REVIEW signal, not a falsity.
 * Missing evidence, rejection, or stale review is NOT logical negation.
 */
export const CONTRADICTION_DETECTOR_VERSION_V1 =
  'ARCTOR_ARI_04_06_01_CONTRADICTION_DETECTOR_V1' as const;

export type ValueObjectNodeV1 = Readonly<{
  id: string;
  facetCode: string | null;
  scopeCode?: string | null;
}>;

/** Pass registry rows actually read at the caller's authorized scope. */
export type RelationTypeContractV1 = Readonly<{
  relationTypeCode: string;
  status: 'active' | 'inactive' | 'future';
  directionalityCode: 'directed' | 'symmetric';
  allowSelfLink: boolean;
  fromScopeCode: 'ordinary' | 'analysis' | 'both';
  toScopeCode: 'ordinary' | 'analysis' | 'both';
  allowedSourceFacetCodes: readonly string[];
  allowedTargetFacetCodes: readonly string[];
  canonicalRelationTypeCode?: string;
  canonicalOrientationCode?: 'same' | 'reverse' | 'symmetric';
}>;

export type RelationAssertionV1 = Readonly<{
  id: string;
  sourceValueObjectId: string;
  targetValueObjectId: string;
  relationTypeCode: string;
  /** Active is NOT verified: the evidence/review step is separate. */
  status: 'proposed' | 'active' | 'verified' | 'rejected' | 'inactive';
  /** An explicit denial of the claim, never inferred from missing evidence. */
  assertionPolarity?: 'affirm' | 'deny';
  /** A claimed effect sign, not equivalent to an assertion denial. */
  effectPolarity?: 'positive' | 'negative' | 'mixed' | 'unknown';
  /** Stable identifiers for an identical bounded factual claim and context. */
  claimKey?: string | null;
  contextKey?: string | null;
  evidenceRefs?: readonly string[];
  /** M-0189: UTC-offset-aware validity of this assertion (PostgreSQL timestamptz). */
  valid_from?: string | null;
  valid_to?: string | null;
}>;

export type ContradictionCodeV1 =
  | 'INVALID_INPUT' | 'INCOMPLETE_SCOPE' | 'UNKNOWN_OR_INACTIVE_TYPE'
  | 'FORBIDDEN_SELF_LINK' | 'FORBIDDEN_FACET' | 'FORBIDDEN_SCOPE'
  | 'EXPLICIT_CLAIM_NEGATION' | 'SUPPORT_CONFLICT_TENSION'
  | 'INCOMPATIBLE_EFFECT_POLARITY' | 'DEPENDENCY_CYCLE'
  | 'CLASSIFICATION_CYCLE' | 'CYCLE_CHECK_INCOMPLETE'
  | 'INVALID_TEMPORAL_RANGE';

export type ContradictionFindingV1 = Readonly<{
  code: ContradictionCodeV1;
  severity: 'BLOCK' | 'REVIEW';
  candidateId: string;
  relatedAssertionIds: readonly string[];
  evidenceRefs: readonly string[];
  /** Bounded human-readable explanation; never an automatic fact assertion. */
  explanation: string;
  witnessPath?: readonly string[];
}>;

export type ContradictionInputV1 = Readonly<{
  candidate: RelationAssertionV1;
  existing: readonly RelationAssertionV1[];
  nodes: readonly ValueObjectNodeV1[];
  relationTypes: readonly RelationTypeContractV1[];
  usageScope: 'ordinary' | 'analysis';
  /** Explicitly approved policies only. Not inferred from relation names. */
  strictAcyclicTypes?: readonly string[];
  strictSingleValuedEffectTypes?: readonly string[];
}>;

export type ContradictionResultV1 = Readonly<{
  version: typeof CONTRADICTION_DETECTOR_VERSION_V1;
  complete: boolean;
  /** Only this check's disposition, never permission to promote a relation. */
  disposition: 'BLOCKED' | 'REVIEW_REQUIRED' | 'NO_CONTRADICTION_DETECTED';
  findings: readonly ContradictionFindingV1[];
  writesPerformed: 0;
  approvesRelation: false;
  verifiesSource: false;
}>;

const SELECTED_ASSERTION_TYPES: ReadonlySet<string> = new Set([
  'related_to', 'same_subject_as', 'supports', 'depends_on',
  'conflicts_with', 'influences', 'classified_as',
]);
const TENSION_PAIR = new Set(['supports', 'conflicts_with']);
const CYCLE_TYPES = new Set(['depends_on', 'classified_as']);
const MAX_EXISTING = 5000;
const MAX_NODES = 5000;
const MAX_FINDINGS = 256;
const MAX_ID = 200;

function nonblank(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 &&
    value.length <= MAX_ID && value === value.trim();
}
function dedupSort(strings: readonly string[] | undefined): string[] {
  return [...new Set((strings ?? []).filter(nonblank))].sort();
}
function samePair(a: RelationAssertionV1, b: RelationAssertionV1,
  aSym: boolean, bSym: boolean): boolean {
  if (a.sourceValueObjectId === b.sourceValueObjectId &&
      a.targetValueObjectId === b.targetValueObjectId) return true;
  return aSym && bSym &&
    a.sourceValueObjectId === b.targetValueObjectId &&
    a.targetValueObjectId === b.sourceValueObjectId;
}
function explicitDifferentContext(a: RelationAssertionV1, b: RelationAssertionV1): boolean {
  return nonblank(a.contextKey) && nonblank(b.contextKey) &&
    a.contextKey !== b.contextKey;
}
function sameBoundedClaim(a: RelationAssertionV1, b: RelationAssertionV1): boolean {
  return nonblank(a.claimKey) && nonblank(b.claimKey) && a.claimKey === b.claimKey &&
    nonblank(a.contextKey) && nonblank(b.contextKey) && a.contextKey === b.contextKey;
}
/**
 * M-0189: an asserted validity interval is [valid_from, valid_to] (inclusive).
 * Null/omitted boundaries mean unknown or open in the caller's bounded view;
 * they NEVER prove the source timeless or currently verified.
 * Dates MUST be explicit RFC3339 instants, with 1..6 microsecond digits.
 * This is compatible with the existing SQL validity guard: valid_to >= valid_from.
 */
type TemporalRangeV1 = Readonly<{ start: bigint | null; end: bigint | null; hasExplicitBound: boolean }>;
const TEMPORAL_BOUNDARY = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|([+-])(\d{2}):(\d{2}))$/;
function leapYear(y: number): boolean { return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0); }
function parseTemporalInstant(value: string): bigint | null {
  const m = TEMPORAL_BOUNDARY.exec(value);
  if (!m) return null;
  const y = Number(m[1]), mon = Number(m[2]), d = Number(m[3]);
  const h = Number(m[4]), min = Number(m[5]), sec = Number(m[6]);
  if (y < 1 || mon < 1 || mon > 12 || h > 23 || min > 59 || sec > 59) return null;
  const days = [31, leapYear(y) ? 29 : 28, 31,30,31,30,31,31,30,31,30,31];
  if (d < 1 || d > days[mon - 1]) return null;
  let offsetMinutes = 0;
  if (m[8] !== 'Z') {
    const oh = Number(m[10]), om = Number(m[11]);
    if (oh > 14 || om > 59 || (oh === 14 && om !== 0)) return null;
    offsetMinutes = (m[9] === '-' ? -1 : 1) * (oh * 60 + om);
  }
  const utc = new Date(0);
  utc.setUTCFullYear(y, mon - 1, d);
  utc.setUTCHours(h, min, sec, 0);
  if (!Number.isFinite(utc.getTime()) || utc.getUTCFullYear() !== y ||
      utc.getUTCMonth() !== mon - 1 || utc.getUTCDate() !== d ||
      utc.getUTCHours() !== h || utc.getUTCMinutes() !== min || utc.getUTCSeconds() !== sec) return null;
  const micros = BigInt((m[7] ?? '').padEnd(6, '0') || '0');
  return BigInt(utc.getTime()) * BigInt(1000) + micros - BigInt(offsetMinutes) * BigInt(60000000);
}
function temporalRange(a: RelationAssertionV1): TemporalRangeV1 | null {
  const from = a.valid_from, to = a.valid_to;
  if ((from != null && (typeof from !== 'string' || !nonblank(from))) ||
      (to != null && (typeof to !== 'string' || !nonblank(to)))) return null;
  const start = from == null ? null : parseTemporalInstant(from);
  const end = to == null ? null : parseTemporalInstant(to);
  if ((from != null && start === null) || (to != null && end === null) ||
      (start !== null && end !== null && start > end)) return null;
  return {start, end, hasExplicitBound: from != null || to != null};
}
/** No invented duration. Equal boundary points overlap under inclusive validity. */
function temporalOverlaps(a: TemporalRangeV1, b: TemporalRangeV1): boolean {
  return !(a.end !== null && b.start !== null && a.end < b.start) &&
         !(b.end !== null && a.start !== null && b.end < a.start);
}
/** Legacy no-bound claims retain M-0187 behavior; mixed evidence is review-only. */
function temporalStrictlyComparable(a: TemporalRangeV1, b: TemporalRangeV1): boolean {
  return (!a.hasExplicitBound && !b.hasExplicitBound) ||
    (a.start !== null && a.end !== null && b.start !== null && b.end !== null);
}

function isClaimActive(a: RelationAssertionV1): boolean {
  return a.status === 'active' || a.status === 'verified' || a.status === 'proposed';
}
function isAffirmed(a: RelationAssertionV1): boolean {
  return a.assertionPolarity !== 'deny';
}
function findPath(start: string, end: string, edges: ReadonlyMap<string, readonly string[]>): string[] | null {
  const queue = [start];
  const previous = new Map<string, string | null>([[start, null]]);
  let pos = 0;
  while (pos < queue.length) {
    const at = queue[pos++];
    if (at === end) {
      const path: string[] = [];
      let cursor: string | null = end;
      while (cursor !== null) { path.push(cursor); cursor = previous.get(cursor) ?? null; }
      return path.reverse();
    }
    for (const next of edges.get(at) ?? []) {
      if (!previous.has(next)) { previous.set(next, at); queue.push(next); }
    }
  }
  return null;
}

export function detectContradictionsV1(input: ContradictionInputV1): ContradictionResultV1 {
  const candidate = input?.candidate;
  const findings: ContradictionFindingV1[] = [];
  const cid = nonblank(candidate?.id) ? candidate.id : '<invalid-candidate>';
  let complete = true;
  const add = (code: ContradictionCodeV1, severity: 'BLOCK' | 'REVIEW',
    explanation: string, related: readonly RelationAssertionV1[] = [], witnessPath?: string[]) => {
    if (findings.length >= MAX_FINDINGS) {
      complete = false;
      return;
    }
    const found: ContradictionFindingV1 = {
      code, severity, candidateId: cid,
      relatedAssertionIds: dedupSort(related.map(r => r.id)),
      evidenceRefs: dedupSort([
        ...(candidate?.evidenceRefs ?? []), ...related.flatMap(r => [...(r.evidenceRefs ?? [])]),
      ]),
      explanation,
      ...(witnessPath ? { witnessPath } : {}),
    };
    findings.push(found);
  };
  const result = (): ContradictionResultV1 => {
    if (!complete && !findings.some(f => f.code === 'CYCLE_CHECK_INCOMPLETE')) {
      // Fail closed; never silently truncate conflict explanations.
      if (findings.length < MAX_FINDINGS) {
        add('CYCLE_CHECK_INCOMPLETE', 'BLOCK', 'Input or result limit reached; scan incomplete.');
      } else {
        findings[MAX_FINDINGS - 1] = {
          code: 'CYCLE_CHECK_INCOMPLETE', severity: 'BLOCK', candidateId: cid,
          relatedAssertionIds: [], evidenceRefs: [],
          explanation: 'Result limit reached; scan incomplete.',
        };
      }
    }
    findings.sort((a, b) => a.code.localeCompare(b.code) ||
      a.relatedAssertionIds.join('|').localeCompare(b.relatedAssertionIds.join('|')));
    return {
      version: CONTRADICTION_DETECTOR_VERSION_V1, complete,
      disposition: findings.some(f => f.severity === 'BLOCK') || !complete ? 'BLOCKED' :
        findings.length ? 'REVIEW_REQUIRED' : 'NO_CONTRADICTION_DETECTED',
      findings, writesPerformed: 0, approvesRelation: false, verifiesSource: false,
    };
  };
  if (!candidate || !Array.isArray(input?.existing) || !Array.isArray(input?.nodes) ||
      !Array.isArray(input?.relationTypes) ||
      !['ordinary', 'analysis'].includes(input.usageScope) ||
      input.existing.length > MAX_EXISTING || input.nodes.length > MAX_NODES) {
    complete = false;
    add('INVALID_INPUT', 'BLOCK', 'Invalid or oversized bounded input.');
    return result();
  }
  const claims = [candidate, ...input.existing];
  const nodesById = new Map<string, ValueObjectNodeV1>();
  const typesByCode = new Map<string, RelationTypeContractV1>();
  for (const node of input.nodes) {
    if (!nonblank(node?.id) || nodesById.has(node.id)) {
      complete = false;
      add('INVALID_INPUT', 'BLOCK', 'Duplicate or malformed value-object identity.');
      return result();
    }
    nodesById.set(node.id, node);
  }
  for (const type of input.relationTypes) {
    if (!nonblank(type?.relationTypeCode) || typesByCode.has(type.relationTypeCode) ||
      !['active', 'inactive', 'future'].includes(type.status) ||
      !['directed','symmetric'].includes(type.directionalityCode) ||
      !['ordinary','analysis','both'].includes(type.fromScopeCode) ||
      !['ordinary','analysis','both'].includes(type.toScopeCode) ||
      typeof type.allowSelfLink !== 'boolean' ||
      !Array.isArray(type.allowedSourceFacetCodes) || !Array.isArray(type.allowedTargetFacetCodes) ||
      type.allowedSourceFacetCodes.length === 0 || type.allowedTargetFacetCodes.length === 0) {
      complete = false;
      add('INVALID_INPUT', 'BLOCK', 'Duplicate or malformed relation-type contract.');
      return result();
    }
    typesByCode.set(type.relationTypeCode, type);
  }
  const relationIds = new Set<string>();
  for (const r of claims) {
    if (!nonblank(r?.id) || relationIds.has(r.id) ||
      !nonblank(r.sourceValueObjectId) || !nonblank(r.targetValueObjectId) ||
      !nonblank(r.relationTypeCode) ||
      !['proposed', 'active', 'verified', 'rejected', 'inactive'].includes(r.status) ||
      (r.assertionPolarity !== undefined && !['affirm', 'deny'].includes(r.assertionPolarity)) ||
      (r.effectPolarity !== undefined && !['positive','negative','mixed','unknown'].includes(r.effectPolarity)) ||
      (r.evidenceRefs !== undefined && (!Array.isArray(r.evidenceRefs) ||
        r.evidenceRefs.some((ref: unknown) => !nonblank(ref))))) {
      complete = false;
      add('INVALID_INPUT', 'BLOCK', 'Malformed or duplicate relation assertion.');
      return result();
    }
    relationIds.add(r.id);
    if (!nodesById.has(r.sourceValueObjectId) || !nodesById.has(r.targetValueObjectId)) {
      complete = false;
      add('INCOMPLETE_SCOPE', 'BLOCK', `Missing endpoint in bounded node scope for ${r.id}.`, [r]);
    }
    if (!typesByCode.has(r.relationTypeCode)) {
      complete = false;
      add('UNKNOWN_OR_INACTIVE_TYPE', 'BLOCK', `Relation type missing from supplied registry: ${r.relationTypeCode}.`, [r]);
    }
  }
  if (!complete) return result();
  const ranges = new Map<string, TemporalRangeV1>();
  for (const relation of claims) {
    const temporal = temporalRange(relation);
    if (!temporal) {
      complete = false;
      add('INVALID_TEMPORAL_RANGE', 'BLOCK',
        'Invalid or inverted valid_from/valid_to; explicit RFC3339 offset and valid_to >= valid_from required.',
        relation.id === candidate.id ? [] : [relation]);
    } else {
      ranges.set(relation.id, temporal);
    }
  }
  if (!complete) return result();
  const candidateRange = ranges.get(candidate.id)!;

  const type = typesByCode.get(candidate.relationTypeCode)!;
  if (type.status !== 'active') {
    add('UNKNOWN_OR_INACTIVE_TYPE', 'BLOCK', 'Candidate relation type is not active.');
  }
  const source = nodesById.get(candidate.sourceValueObjectId)!;
  const target = nodesById.get(candidate.targetValueObjectId)!;
  if (candidate.sourceValueObjectId === candidate.targetValueObjectId && !type.allowSelfLink) {
    add('FORBIDDEN_SELF_LINK', 'BLOCK', 'Relation registry forbids a self-link.');
  }
  const sourceFacetOk = nonblank(source.facetCode) && type.allowedSourceFacetCodes.includes(source.facetCode);
  const targetFacetOk = nonblank(target.facetCode) && type.allowedTargetFacetCodes.includes(target.facetCode);
  if (!sourceFacetOk || !targetFacetOk) {
    add('FORBIDDEN_FACET', 'BLOCK', 'Relation type does not permit the source or target facet.');
  }
  if (!(type.fromScopeCode === 'both' || type.fromScopeCode === input.usageScope) ||
      !(type.toScopeCode === 'both' || type.toScopeCode === input.usageScope)) {
    add('FORBIDDEN_SCOPE', 'BLOCK', 'Relation registry forbids this usage scope.');
  }

  for (const other of input.existing) {
    if (!isClaimActive(other) || !isClaimActive(candidate)) continue;
    const otherType = typesByCode.get(other.relationTypeCode)!;
    if (otherType.status !== 'active' || explicitDifferentContext(candidate, other)) continue;
    const otherRange = ranges.get(other.id)!;
    // Non-coexistent assertions cannot be a current simultaneous contradiction.
    if (!temporalOverlaps(candidateRange, otherRange)) continue;
    const pairMatches = samePair(candidate, other,
      type.directionalityCode === 'symmetric', otherType.directionalityCode === 'symmetric');
    // A symmetric conflicts_with(B,A) is the same tension as conflicts_with(A,B)
    // even when the other (supports) relation is directed.
    const reversedEndpoints = candidate.sourceValueObjectId === other.targetValueObjectId &&
      candidate.targetValueObjectId === other.sourceValueObjectId;
    const isTensionPair = TENSION_PAIR.has(candidate.relationTypeCode) &&
      TENSION_PAIR.has(other.relationTypeCode) && candidate.relationTypeCode !== other.relationTypeCode;
    if (!pairMatches && !(isTensionPair && reversedEndpoints)) continue;
    const bothVerified = candidate.status === 'verified' && other.status === 'verified';
    const temporalStrict = temporalStrictlyComparable(candidateRange, otherRange);
    const bounded = sameBoundedClaim(candidate, other);
    const oppositeAssertions = candidate.relationTypeCode === other.relationTypeCode &&
      SELECTED_ASSERTION_TYPES.has(candidate.relationTypeCode) &&
      isAffirmed(candidate) !== isAffirmed(other);
    if (oppositeAssertions) {
      add('EXPLICIT_CLAIM_NEGATION', bothVerified && bounded && temporalStrict ? 'BLOCK' : 'REVIEW',
        bothVerified && bounded && temporalStrict ? 'Explicit verified assertion and denial of the identical bounded claim.' :
        'Opposite claim assertions require verified evidence and identical bounded context.', [other]);
    }
    if (isTensionPair && isAffirmed(candidate) && isAffirmed(other)) {
      add('SUPPORT_CONFLICT_TENSION', 'REVIEW',
        'Supports and conflicts_with may both be true; human examination of dimensions and context is required.', [other]);
    }
    const oppositeEffects = candidate.relationTypeCode === other.relationTypeCode &&
      candidate.relationTypeCode === 'influences' &&
      ((candidate.effectPolarity === 'positive' && other.effectPolarity === 'negative') ||
       (candidate.effectPolarity === 'negative' && other.effectPolarity === 'positive'));
    if (oppositeEffects) {
      const strict = input.strictSingleValuedEffectTypes?.includes('influences') === true && bothVerified && bounded && temporalStrict;
      add('INCOMPATIBLE_EFFECT_POLARITY', strict ? 'BLOCK' : 'REVIEW',
        strict ? 'Explicitly single-valued verified effect claims disagree in the identical bounded context.' :
          'Opposing effect signs may coexist; a reviewed single-valued model and matching scope are required.', [other]);
    }
  }
  if (isClaimActive(candidate) && isAffirmed(candidate) && CYCLE_TYPES.has(candidate.relationTypeCode) &&
      type.directionalityCode === 'directed') {
    const edges = new Map<string, string[]>();
    const establishedEdges = new Map<string, string[]>();
    for (const r of input.existing) {
      if (r.relationTypeCode !== candidate.relationTypeCode || !isClaimActive(r) || !isAffirmed(r) ||
        explicitDifferentContext(candidate, r) ||
        !temporalOverlaps(candidateRange, ranges.get(r.id)!)) continue;
      const list = edges.get(r.sourceValueObjectId) ?? [];
      list.push(r.targetValueObjectId);
      edges.set(r.sourceValueObjectId, list);
      // A proposed (not yet established) edge cannot create a hard contradiction.
      if (r.status === 'verified' || r.status === 'active') {
        const established = establishedEdges.get(r.sourceValueObjectId) ?? [];
        established.push(r.targetValueObjectId);
        establishedEdges.set(r.sourceValueObjectId, established);
      }
    }
    for (const values of edges.values()) values.sort();
    for (const values of establishedEdges.values()) values.sort();
    const path = findPath(candidate.targetValueObjectId, candidate.sourceValueObjectId, edges);
    if (path && path.length > 1) {
      const establishedPath = findPath(candidate.targetValueObjectId, candidate.sourceValueObjectId, establishedEdges);
      const strict = input.strictAcyclicTypes?.includes(candidate.relationTypeCode) === true &&
        establishedPath !== null && !claims.some(r => ranges.get(r.id)!.hasExplicitBound);
      // Dated cycle checks remain review-only until a shared interval across
      // the full witness path is computed; pairwise overlap is insufficient.
      add(candidate.relationTypeCode === 'depends_on' ? 'DEPENDENCY_CYCLE' : 'CLASSIFICATION_CYCLE',
        strict ? 'BLOCK' : 'REVIEW',
        strict ? 'A cycle violates explicitly approved acyclic relation policy.' :
          'A potential cycle requires review; existing edges may only be proposals.', [],
        [candidate.sourceValueObjectId, ...(strict ? establishedPath! : path)]);
    }
  }
  return result();
}

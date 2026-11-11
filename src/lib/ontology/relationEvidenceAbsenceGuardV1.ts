/**
 * ARCTor / M-0191 / ARI-04.06.05 — open-world, read-only epistemic guard.
 * Absence of a confirmation, an empty result, a rejected proposal or stale
 * review is NOT evidence that a semantic relation is false.
 *
 * This module classifies *records*, not the truth of reality. It deliberately
 * cannot grant verification, approval, or authorize mutations/promotion.
 */
import type { RelationAssertionV1 } from './contradictionDetectorV1';

export const RELATION_EVIDENCE_ABSENCE_GUARD_VERSION_V1 =
  'ARCTOR_ARI_04_06_05_EVIDENCE_ABSENCE_GUARD_V1' as const;

export type EvidenceAbsenceInputV1 = Readonly<{
  candidate: RelationAssertionV1;
  /** Search completeness is about a bounded query, not closed-world truth. */
  search: Readonly<{
    scopeKey: string;
    completed: boolean;
    returnedRelationCount: number;
  }>;
  evidence: Readonly<{
    supportingRefs: readonly string[];
    counterRefs: readonly string[];
    citationRefs: readonly string[];
    /** Merely a reported status; this function does not validate a source. */
    sourceReviewStatus: 'not_checked' | 'recorded_verified' | 'disputed' | 'failed';
  }>;
  review: Readonly<{
    decision: 'unreviewed' | 'verified' | 'rejected' | 'recheck_due';
    rejectionReason?: 'insufficient_evidence' | 'duplicate' | 'out_of_scope' |
      'conflicting_assertions' | 'other' | null;
  }>;
}>;

export type EvidenceAbsenceCodeV1 =
  | 'INVALID_BOUNDED_INPUT'
  | 'INCOMPLETE_SEARCH_NOT_ABSENCE'
  | 'EMPTY_SEARCH_NOT_NEGATION'
  | 'NO_SUPPORTING_EVIDENCE_NOT_FALSE'
  | 'CITATION_NOT_SOURCE_VERIFICATION'
  | 'UNVERIFIED_SUPPORTING_RECORD'
  | 'REPORTED_SOURCE_VERIFIED_NOT_TRUTH_PROOF'
  | 'SOURCE_REVIEW_FAILED_NOT_RELATION_FALSE'
  | 'COUNTEREVIDENCE_REQUIRES_ADJUDICATION'
  | 'EXPLICIT_DENIAL_IS_CLAIM_NOT_PROOF'
  | 'REJECTED_PROPOSAL_NOT_FALSE'
  | 'RECHECK_DUE_NOT_FALSE'
  | 'REVIEW_STATUS_NOT_TRUTH';

export type EvidenceAbsenceFindingV1 = Readonly<{
  code: EvidenceAbsenceCodeV1;
  severity: 'BLOCK' | 'REVIEW' | 'INFO';
  evidenceRefs: readonly string[];
  explanation: string;
}>;

export type EvidenceAbsenceResultV1 = Readonly<{
  version: typeof RELATION_EVIDENCE_ABSENCE_GUARD_VERSION_V1;
  complete: boolean;
  disposition: 'BLOCKED_INVALID_INPUT' | 'REVIEW_REQUIRED' |
    'EVIDENCE_MISSING' | 'NOT_EVALUATED_AS_FALSE';
  /** No closed-world inference is allowed even for a complete search. */
  claimTruth: 'UNDETERMINED';
  negativeInferenceAllowed: false;
  canAssertFalse: false;
  approvesRelation: false;
  verifiesSource: false;
  writesPerformed: 0;
  findings: readonly EvidenceAbsenceFindingV1[];
}>;

const MAX_REF = 200;
const MAX_REFS = 500;
function id(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= MAX_REF &&
    v === v.trim() && !/[\u0000-\u001f\u007f]/.test(v);
}
function cleanRefs(v: unknown): string[] | null {
  if (!Array.isArray(v) || v.length > MAX_REFS || !v.every(id)) return null;
  return [...new Set(v as string[])].sort();
}
const assertions = new Set(['affirm', 'deny']);
const statuses = new Set(['proposed', 'active', 'verified', 'rejected', 'inactive']);
const reviews = new Set(['unreviewed', 'verified', 'rejected', 'recheck_due']);
const reasons = new Set(['insufficient_evidence', 'duplicate', 'out_of_scope',
  'conflicting_assertions', 'other']);
const sourceReviews = new Set(['not_checked', 'recorded_verified', 'disputed', 'failed']);

/** Evaluates an immutable bounded snapshot. No database, API, or network I/O. */
export function assessRelationEvidenceAbsenceV1(input: EvidenceAbsenceInputV1): EvidenceAbsenceResultV1 {
  const findings: EvidenceAbsenceFindingV1[] = [];
  const add = (code: EvidenceAbsenceCodeV1, severity: EvidenceAbsenceFindingV1['severity'],
    explanation: string, refs: readonly string[] = []): void => {
    findings.push({code, severity, evidenceRefs: [...new Set(refs)].sort(), explanation});
  };
  const done = (valid: boolean, missing = false): EvidenceAbsenceResultV1 => ({
    version: RELATION_EVIDENCE_ABSENCE_GUARD_VERSION_V1,
    complete: valid,
    disposition: !valid ? 'BLOCKED_INVALID_INPUT' :
      findings.some(f => f.severity === 'REVIEW') ? 'REVIEW_REQUIRED' :
      missing ? 'EVIDENCE_MISSING' : 'NOT_EVALUATED_AS_FALSE',
    claimTruth: 'UNDETERMINED', negativeInferenceAllowed: false,
    canAssertFalse: false, approvesRelation: false, verifiesSource: false, writesPerformed: 0,
    findings: findings.sort((a,b) => a.code.localeCompare(b.code)),
  });
  const c = input?.candidate;
  const s = input?.search;
  const e = input?.evidence;
  const r = input?.review;
  const supports = cleanRefs(e?.supportingRefs);
  const counters = cleanRefs(e?.counterRefs);
  const citations = cleanRefs(e?.citationRefs);
  if (!c || !id(c.id) || !id(c.sourceValueObjectId) || !id(c.targetValueObjectId) ||
      !id(c.relationTypeCode) || !statuses.has(c.status) ||
      (c.assertionPolarity !== undefined && !assertions.has(c.assertionPolarity)) ||
      !s || !id(s.scopeKey) || typeof s.completed !== 'boolean' ||
      !Number.isSafeInteger(s.returnedRelationCount) || s.returnedRelationCount < 0 ||
      !e || supports === null || counters === null || citations === null ||
      !sourceReviews.has(e.sourceReviewStatus) || !r || !reviews.has(r.decision) ||
      (r.rejectionReason != null && !reasons.has(r.rejectionReason)) ||
      (r.decision !== 'rejected' && r.rejectionReason != null) ||
      (r.decision === 'rejected' && r.rejectionReason == null) ||
      (c.status === 'rejected' && r.decision === 'verified') ||
      (c.status === 'verified' && r.decision === 'rejected')) {
    add('INVALID_BOUNDED_INPUT', 'BLOCK',
      'Invalid or internally inconsistent bounded evidence/review input; do not infer truth or falsity.');
    return done(false);
  }
  if (!s.completed) {
    add('INCOMPLETE_SEARCH_NOT_ABSENCE', 'REVIEW',
      'The bounded search has not completed; absence has not even been established.');
  } else if (s.returnedRelationCount === 0) {
    add('EMPTY_SEARCH_NOT_NEGATION', 'INFO',
      'A completed search returning zero rows does not establish the relation is false.');
  }
  if (supports.length === 0) {
    add('NO_SUPPORTING_EVIDENCE_NOT_FALSE', 'INFO',
      'No recorded supporting evidence: unknown, not false.');
  } else if (e.sourceReviewStatus === 'not_checked') {
    add('UNVERIFIED_SUPPORTING_RECORD', 'REVIEW',
      'A source reference exists but has not been independently checked.', supports);
  }
  if (citations.length > 0 && e.sourceReviewStatus === 'not_checked') {
    add('CITATION_NOT_SOURCE_VERIFICATION', 'INFO',
      'A traceable citation is not independent validation of the claim.', citations);
  }
  if (e.sourceReviewStatus === 'recorded_verified') {
    add('REPORTED_SOURCE_VERIFIED_NOT_TRUTH_PROOF', 'INFO',
      'Reported source verification is not independent evaluation by this guard.', [...supports, ...citations]);
  } else if (e.sourceReviewStatus === 'failed') {
    add('SOURCE_REVIEW_FAILED_NOT_RELATION_FALSE', 'REVIEW',
      'Failed source verification does not prove the proposition false.', [...supports, ...citations]);
  } else if (e.sourceReviewStatus === 'disputed') {
    add('COUNTEREVIDENCE_REQUIRES_ADJUDICATION', 'REVIEW',
      'Disputed source status requires assessment, not a Boolean false inference.', [...counters, ...supports]);
  }
  if (counters.length > 0 && e.sourceReviewStatus !== 'disputed') {
    add('COUNTEREVIDENCE_REQUIRES_ADJUDICATION', 'REVIEW',
      'Counterevidence is an input for adjudication, not an automatic negation.', counters);
  }
  if (c.assertionPolarity === 'deny') {
    add('EXPLICIT_DENIAL_IS_CLAIM_NOT_PROOF', 'REVIEW',
      'An explicit negative assertion is still an assertion with its own evidence burden.');
  }
  if (r.decision === 'rejected' || c.status === 'rejected') {
    add('REJECTED_PROPOSAL_NOT_FALSE', 'INFO',
      'Rejection of a proposal records a workflow decision, not falsity of the relation.');
  }
  if (r.decision === 'recheck_due') {
    add('RECHECK_DUE_NOT_FALSE', 'REVIEW',
      'A stale or due review schedules reassessment; it does not negate the relation.');
  }
  if (r.decision === 'verified' || c.status === 'verified' || c.status === 'active') {
    add('REVIEW_STATUS_NOT_TRUTH', 'INFO',
      'Workflow and evidence-review statuses do not permit this guard to certify truth.');
  }
  return done(true, supports.length === 0 && counters.length === 0 &&
    r.decision !== 'recheck_due' && !findings.some(f => f.severity === 'REVIEW'));
}

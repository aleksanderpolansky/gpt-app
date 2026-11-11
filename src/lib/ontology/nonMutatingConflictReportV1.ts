/**
 * ARCTor M-0193 / ARI-04.06.07: deterministic, non-mutating conflict report.
 * Consumes only the caller-provided authorized bounded relation set. This module
 * cannot verify evidence, approve relations or assert absence of conflicts globally.
 */
import { detectContradictionsV1 } from './contradictionDetectorV1';
import type { ContradictionInputV1, ContradictionFindingV1 } from './contradictionDetectorV1';

export const CONFLICT_REPORT_VERSION_V1 = 'ARCTOR_ARI_04_06_07_NON_MUTATING_CONFLICT_REPORT_V1' as const;
export type EvidenceReferenceMetadataV1 = Readonly<{
  refId: string;
  /** Metadata supplied by authorized caller, NOT independently verified. */
  sourceUri?: string | null;
  sourceVersion?: string | null;
  author?: string | null;
  sourceDate?: string | null;
  claim?: string | null;
  locator?: string | null;
}>;
export type LinkedEvidenceV1 = Readonly<{
  refId: string;
  metadataStatus: 'CALLER_PROVIDED_UNVERIFIED' | 'UNRESOLVED_REF';
  sourceUri: string | null;
  sourceVersion: string | null;
  author: string | null;
  sourceDate: string | null;
  claim: string | null;
  locator: string | null;
  sourceVerified: false;
}>;
export type ConflictReportFindingV1 = Readonly<{
  code: ContradictionFindingV1['code'];
  severity: 'BLOCK' | 'REVIEW';
  candidateId: string;
  relatedAssertionIds: readonly string[];
  evidenceRefs: readonly string[];
  linkedEvidence: readonly LinkedEvidenceV1[];
  evidenceCoverage: 'NONE_DECLARED' | 'ALL_METADATA_PROVIDED' | 'SOME_UNRESOLVED';
  explanation: string;
  witnessPath: readonly string[];
}>;
export type ConflictReportInputV1 = Readonly<{
  scan: ContradictionInputV1;
  /** Must be unique. Metadata may be absent; it never implies verification. */
  evidenceMetadata?: readonly EvidenceReferenceMetadataV1[];
  /** Caller-owned snapshot marker, not a signature or proof of snapshot completeness. */
  snapshotId?: string | null;
}>;
export type NonMutatingConflictReportV1 = Readonly<{
  version: typeof CONFLICT_REPORT_VERSION_V1;
  snapshotId: string | null;
  scope: 'ordinary' | 'analysis' | 'invalid';
  boundedInput: Readonly<{ existingAssertions: number; nodes: number; relationTypes: number }>;
  complete: boolean;
  disposition: 'BLOCKED' | 'REVIEW_REQUIRED' | 'NO_CONTRADICTION_DETECTED';
  findings: readonly ConflictReportFindingV1[];
  summary: Readonly<{ blockFindings: number; reviewFindings: number; unresolvedEvidenceRefs: number }>;
  /** Absence of findings never means global absence of contradictory assertions. */
  globalAbsenceEstablished: false;
  writesPerformed: 0;
  approvesRelation: false;
  verifiesSource: false;
  runtimeIntegrated: false;
}>;
const MAX_META = 5000;
const MAX_FIELD = 8192;
const isRef = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 200 && value.trim() === value;
function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_FIELD ? value : null;
}
const unresolved = (refId: string): LinkedEvidenceV1 => ({
  refId, metadataStatus: 'UNRESOLVED_REF', sourceUri: null, sourceVersion: null,
  author: null, sourceDate: null, claim: null, locator: null, sourceVerified: false,
});
/** Fail closed on malformed or duplicate metadata. Never fabricate source fields. */
export function createNonMutatingConflictReportV1(input: ConflictReportInputV1): NonMutatingConflictReportV1 {
  const scan = detectContradictionsV1(input?.scan);
  const raw = input?.evidenceMetadata ?? [];
  let metaValid = Array.isArray(raw) && raw.length <= MAX_META;
  const byId = new Map<string, EvidenceReferenceMetadataV1>();
  if (metaValid) {
    for (const item of raw) {
      if (!isRef(item?.refId) || byId.has(item.refId) ||
          Object.entries(item).some(([key, value]) =>
            !['refId','sourceUri','sourceVersion','author','sourceDate','claim','locator'].includes(key) ||
            (value != null && (typeof value !== 'string' || value.length > MAX_FIELD)))) {
        metaValid = false;
        break;
      }
      byId.set(item.refId, item);
    }
  }
  if (!metaValid) byId.clear();
  const linked = (refId: string): LinkedEvidenceV1 => {
    const m = byId.get(refId);
    return m ? {
      refId, metadataStatus: 'CALLER_PROVIDED_UNVERIFIED',
      sourceUri: nullableText(m.sourceUri), sourceVersion: nullableText(m.sourceVersion),
      author: nullableText(m.author), sourceDate: nullableText(m.sourceDate),
      claim: nullableText(m.claim), locator: nullableText(m.locator), sourceVerified: false,
    } : unresolved(refId);
  };
  const findings = scan.findings.map(finding => {
    const refs = [...new Set(finding.evidenceRefs.filter(isRef))].sort();
    const attached = refs.map(linked);
    return {
      code: finding.code, severity: finding.severity, candidateId: finding.candidateId,
      relatedAssertionIds: [...new Set(finding.relatedAssertionIds)].sort(),
      evidenceRefs: refs, linkedEvidence: attached,
      evidenceCoverage: refs.length === 0 ? 'NONE_DECLARED' as const :
        attached.every(r => r.metadataStatus === 'CALLER_PROVIDED_UNVERIFIED') ?
        'ALL_METADATA_PROVIDED' as const : 'SOME_UNRESOLVED' as const,
      explanation: finding.explanation, witnessPath: [...(finding.witnessPath ?? [])],
    };
  });
  if (!metaValid) {
    findings.push({code:'INVALID_INPUT',severity:'BLOCK',candidateId:scan.findings[0]?.candidateId ?? input?.scan?.candidate?.id ?? '<invalid-candidate>',
      relatedAssertionIds:[],evidenceRefs:[],linkedEvidence:[],evidenceCoverage:'NONE_DECLARED',
      explanation:'Malformed or duplicate evidence metadata; report is incomplete.',witnessPath:[]});
  }
  findings.sort((a,b) => a.code.localeCompare(b.code) || a.relatedAssertionIds.join('|').localeCompare(b.relatedAssertionIds.join('|')));
  const complete = scan.complete && metaValid;
  const disposition = !complete || findings.some(f => f.severity === 'BLOCK') ? 'BLOCKED' :
    findings.length > 0 ? 'REVIEW_REQUIRED' : 'NO_CONTRADICTION_DETECTED';
  return {
    version:CONFLICT_REPORT_VERSION_V1,
    snapshotId:isRef(input?.snapshotId)?input.snapshotId:null,
    scope: input?.scan?.usageScope === 'ordinary' || input?.scan?.usageScope === 'analysis' ? input.scan.usageScope : 'invalid',
    boundedInput:{existingAssertions:Array.isArray(input?.scan?.existing)?input.scan.existing.length:0,
      nodes:Array.isArray(input?.scan?.nodes)?input.scan.nodes.length:0,
      relationTypes:Array.isArray(input?.scan?.relationTypes)?input.scan.relationTypes.length:0},
    complete,disposition,findings,
    summary:{blockFindings:findings.filter(f=>f.severity==='BLOCK').length,
      reviewFindings:findings.filter(f=>f.severity==='REVIEW').length,
      unresolvedEvidenceRefs:findings.reduce((n,f)=>n+f.linkedEvidence.filter(e=>e.metadataStatus==='UNRESOLVED_REF').length,0)},
    globalAbsenceEstablished:false,writesPerformed:0,approvesRelation:false,verifiesSource:false,runtimeIntegrated:false,
  };
}

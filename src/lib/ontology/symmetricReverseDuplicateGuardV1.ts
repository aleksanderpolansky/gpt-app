/**
 * ARCTor / M-0190 / ARI-04.06.04 — bounded read-only guard for A↔B reverse
 * duplicates of registry-declared symmetric relation types.
 *
 * Reuses M-0188 canonical orientation; does NOT infer symmetry from names.
 * Does not approve a relation, verify evidence, or mutate graph/API/DB.
 * Existing M-0188 remains the general duplicate detector. This guard only
 * refines REVERSED symmetric edges, honoring M-0189 time and review boundaries.
 */
import {
  detectCanonicalRelationDuplicatesV1,
  type CanonicalRelationTypeV1,
  type RelationIdentityV1,
} from './canonicalRelationDuplicatesV1';

export const SYMMETRIC_REVERSE_GUARD_VERSION_V1 =
  'ARCTOR_ARI_04_06_04_SYMMETRIC_REVERSE_GUARD_V1' as const;

export type SymmetricAssertionV1 = RelationIdentityV1 & Readonly<{
  assertionPolarity?: 'affirm' | 'deny';
  effectPolarity?: 'positive' | 'negative' | 'mixed' | 'unknown';
  valid_from?: string | null;
  valid_to?: string | null;
}>;

export type SymmetricReverseInputV1 = Readonly<{
  candidate: SymmetricAssertionV1;
  existing: readonly SymmetricAssertionV1[];
  relationTypes: readonly CanonicalRelationTypeV1[];
}>;

export type SymmetricReverseFindingV1 = Readonly<{
  code: 'SYMMETRIC_REVERSE_DUPLICATE' | 'SYMMETRIC_REVERSE_REVIEW' |
    'HISTORICAL_SYMMETRIC_REVIEW' | 'INVALID_BOUNDED_EVIDENCE';
  severity: 'BLOCK' | 'REVIEW';
  relatedRelationId: string | null;
  canonicalEdgeKey: string | null;
  evidenceRefs: readonly string[];
  explanation: string;
}>;
export type SymmetricReverseResultV1 = Readonly<{
  version: typeof SYMMETRIC_REVERSE_GUARD_VERSION_V1;
  complete: boolean;
  disposition: 'BLOCKED' | 'REVIEW_REQUIRED' | 'NO_REVERSE_DUPLICATE_DETECTED' | 'NOT_APPLICABLE';
  findings: readonly SymmetricReverseFindingV1[];
  writesPerformed: 0;
  approvesRelation: false;
  verifiesSource: false;
}>;

const bound = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\.([0-9]{1,6}))?(Z|([+-])([0-9]{2}):([0-9]{2}))$/;
const leap = (y: number): boolean => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
/** Preserve PostgreSQL microseconds, normalize explicit offset to UTC. */
function instant(raw: string): bigint | null {
  const m = bound.exec(raw);
  if (!m) return null;
  const y=Number(m[1]), mo=Number(m[2]), d=Number(m[3]),
    h=Number(m[4]), mi=Number(m[5]), s=Number(m[6]);
  const days=[31,leap(y)?29:28,31,30,31,30,31,31,30,31,30,31];
  if(y<1||mo<1||mo>12||d<1||d>days[mo-1]||h>23||mi>59||s>59) return null;
  const oh=m[8]==='Z'?0:Number(m[10]), om=m[8]==='Z'?0:Number(m[11]);
  if(oh>14||om>59||(oh===14&&om!==0)) return null;
  const date=new Date(0);
  date.setUTCFullYear(y,mo-1,d);date.setUTCHours(h,mi,s,0);
  if(!Number.isFinite(date.getTime())||date.getUTCFullYear()!==y||date.getUTCMonth()!==mo-1||
      date.getUTCDate()!==d||date.getUTCHours()!==h||date.getUTCMinutes()!==mi||date.getUTCSeconds()!==s) return null;
  const delta=m[8]==='Z'?0:(m[9]==='-'?-1:1)*(oh*60+om);
  return BigInt(date.getTime())*BigInt('1000')+BigInt((m[7]??'').padEnd(6,'0')||'0')-BigInt(delta)*BigInt('60000000');
}

type Interval = Readonly<{from: bigint|null; to: bigint|null; any: boolean}>;
function interval(r: SymmetricAssertionV1): Interval | null {
  const a=r.valid_from, b=r.valid_to;
  if((a!=null&&typeof a!=='string')||(b!=null&&typeof b!=='string')) return null;
  const from=a==null?null:instant(a),to=b==null?null:instant(b);
  if((a!=null&&from===null)||(b!=null&&to===null)||
     (from!==null&&to!==null&&from>to)) return null;
  return {from,to,any:a!=null||b!=null};
}
const sortedEvidence=(a: SymmetricAssertionV1,b?: SymmetricAssertionV1):string[] =>
  [...new Set([...(a.evidenceRefs??[]),...(b?.evidenceRefs??[])])].sort();
const reversed=(a:SymmetricAssertionV1,b:SymmetricAssertionV1):boolean =>
  a.sourceValueObjectId !== a.targetValueObjectId &&
  a.sourceValueObjectId===b.targetValueObjectId && a.targetValueObjectId===b.sourceValueObjectId;

export function detectSymmetricReverseDuplicatesV1(input: SymmetricReverseInputV1): SymmetricReverseResultV1 {
  const findings:SymmetricReverseFindingV1[]=[];
  const emit=(code:SymmetricReverseFindingV1['code'],severity:'BLOCK'|'REVIEW',msg:string,
      related:SymmetricAssertionV1|null,key:string|null)=>{
    findings.push({code,severity,relatedRelationId:related?.id??null,canonicalEdgeKey:key,
      evidenceRefs:sortedEvidence(input.candidate,related??undefined),explanation:msg});
  };
  const finish=(complete:boolean,notApplicable=false):SymmetricReverseResultV1=>({
    version:SYMMETRIC_REVERSE_GUARD_VERSION_V1, complete,
    disposition:!complete||findings.some(f=>f.severity==='BLOCK')?'BLOCKED':
      findings.length?'REVIEW_REQUIRED':notApplicable?'NOT_APPLICABLE':'NO_REVERSE_DUPLICATE_DETECTED',
    findings:findings.sort((a,b)=>a.code.localeCompare(b.code)||String(a.relatedRelationId).localeCompare(String(b.relatedRelationId))),
    writesPerformed:0,approvesRelation:false,verifiesSource:false,
  });
  const base=detectCanonicalRelationDuplicatesV1({
    candidate:input?.candidate,existing:input?.existing,relationTypes:input?.relationTypes,
  });
  if(!base.complete||!base.candidateCanonical){
    emit('INVALID_BOUNDED_EVIDENCE','BLOCK',
      'M-0188 canonical scan incomplete or invalid; cannot infer a safe reverse duplicate.',null,null);
    return finish(false);
  }
  const canonical=base.candidateCanonical;
  const registry=input.relationTypes.find(r=>r.relationTypeCode===canonical.relationTypeCode);
  if(!registry||registry.directionalityCode!=='symmetric') return finish(true,true);
  // Fail closed on invalid M-0189 timestamps, status/identity and unsupported polarity.
  const claims=[input.candidate,...input.existing];
  const ranges=new Map<string,Interval>();
  for(const r of claims){
    if((r.assertionPolarity!==undefined&&!['affirm','deny'].includes(r.assertionPolarity))||
       (r.effectPolarity!==undefined&&!['positive','negative','mixed','unknown'].includes(r.effectPolarity))){
      emit('INVALID_BOUNDED_EVIDENCE','BLOCK','Invalid explicit assertion/effect polarity.',r,canonical.key);
      return finish(false);
    }
    const parsed=interval(r);
    if(!parsed){
      emit('INVALID_BOUNDED_EVIDENCE','BLOCK','Invalid or inverted RFC3339 validity interval.',r,canonical.key);
      return finish(false);
    }
    ranges.set(r.id,parsed);
  }
  const indexed=new Map(input.existing.map(r=>[r.id,r]));
  for(const f of base.findings){
    if(!f.relatedRelationId) continue;
    const old=indexed.get(f.relatedRelationId);
    if(!old||!reversed(input.candidate,old)) continue;
    const ca=ranges.get(input.candidate.id)!,cb=ranges.get(old.id)!;
    // Explicit non-overlapping validity: distinct temporal records, no duplicate.
    if((ca.to!==null&&cb.from!==null&&ca.to<cb.from)||
       (cb.to!==null&&ca.from!==null&&cb.to<ca.from)) continue;
    if(old.status==='rejected'||old.status==='inactive'){
      emit('HISTORICAL_SYMMETRIC_REVIEW','REVIEW',
        'Historical or rejected edge is not current; preserve old decision and review reactivation.',old,canonical.key);
      continue;
    }
    if(f.code==='CONTEXT_COLLISION_REVIEW'){
      emit('SYMMETRIC_REVERSE_REVIEW','REVIEW',
        'Context is different or missing; reverse endpoints alone do not prove identity.',old,canonical.key);
      continue;
    }
    const sameAssertion=(input.candidate.assertionPolarity??'affirm')===(old.assertionPolarity??'affirm');
    const sameEffect=(input.candidate.effectPolarity??'unknown')===(old.effectPolarity??'unknown');
    if(!sameAssertion||!sameEffect){
      emit('SYMMETRIC_REVERSE_REVIEW','REVIEW',
        'Explicit polarity/effect differs; no automatic duplicate or equivalence.',old,canonical.key);
      continue;
    }
    if(ca.any||cb.any){
      if(ca.from===null||ca.to===null||cb.from===null||cb.to===null){
        emit('SYMMETRIC_REVERSE_REVIEW','REVIEW',
          'Open or partially specified validity; overlap is possible but not proven identical.',old,canonical.key);
        continue;
      }
      if(ca.from!==cb.from||ca.to!==cb.to){
        emit('SYMMETRIC_REVERSE_REVIEW','REVIEW',
          'Overlapping but different validity intervals; require human review.',old,canonical.key);
        continue;
      }
    }
    emit('SYMMETRIC_REVERSE_DUPLICATE','BLOCK',
      'Current registry-symmetric relation already has the same reversed pair, context and assertion scope.',old,canonical.key);
  }
  return finish(true);
}

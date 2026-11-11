/**
 * ARCTor M-0188 / ARI-04.06.02. Pure, offline canonical relation duplicate
 * detector. Extends M-0187 without changing its accepted file or API/DB.
 *
 * Canonical mapping MUST come from the caller's approved relation-type registry.
 * Reverse aliases are never inferred from English words or display labels.
 * Same normalized edge is a duplicate of a CURRENT edge; historical inactive
 * and rejected rows are review signals, not approval or verified absence.
 */
export const CANONICAL_DUPLICATES_VERSION_V1 =
  'ARCTOR_ARI_04_06_02_CANONICAL_DUPLICATES_V1' as const;

export type CanonicalRelationTypeV1 = Readonly<{
  relationTypeCode: string;
  status: 'active' | 'inactive' | 'future';
  directionalityCode: 'directed' | 'symmetric';
  canonicalRelationTypeCode?: string;
  canonicalOrientationCode?: 'same' | 'reverse' | 'symmetric';
  canonicalWritePolicyCode?: 'enabled' | 'reverse_alias' | 'disabled' | 'future';
}>;
export type RelationIdentityV1 = Readonly<{
  id: string;
  relationTypeCode: string;
  sourceValueObjectId: string;
  targetValueObjectId: string;
  status: 'proposed' | 'active' | 'verified' | 'rejected' | 'inactive';
  /** Optional context is not a second object identity. */
  contextKey?: string | null;
  evidenceRefs?: readonly string[];
}>;
export type CanonicalEdgeV1 = Readonly<{
  relationTypeCode: string;
  sourceValueObjectId: string;
  targetValueObjectId: string;
  key: string;
}>;
export type DuplicateFindingV1 = Readonly<{
  code: 'DUPLICATE_CANONICAL_EDGE' | 'DUPLICATE_REVERSE_ALIAS' |
    'CONTEXT_COLLISION_REVIEW' | 'HISTORICAL_EDGE_REVIEW' | 'INVALID_REGISTRY' |
    'UNKNOWN_RELATION_TYPE' | 'INCOMPLETE_BOUNDED_INPUT';
  severity: 'BLOCK' | 'REVIEW';
  candidateId: string;
  relatedRelationId: string | null;
  canonicalEdgeKey: string | null;
  evidenceRefs: readonly string[];
  explanation: string;
}>;
export type DuplicateInputV1 = Readonly<{
  candidate: RelationIdentityV1;
  existing: readonly RelationIdentityV1[];
  relationTypes: readonly CanonicalRelationTypeV1[];
}>;
export type DuplicateResultV1 = Readonly<{
  version: typeof CANONICAL_DUPLICATES_VERSION_V1;
  complete: boolean;
  disposition: 'BLOCKED' | 'REVIEW_REQUIRED' | 'NO_DUPLICATE_DETECTED';
  candidateCanonical: CanonicalEdgeV1 | null;
  findings: readonly DuplicateFindingV1[];
  writesPerformed: 0;
  approvesRelation: false;
  verifiesSource: false;
}>;

const MAX_RELATIONS = 5000;
const MAX_TYPES = 300;
const MAX_TEXT = 200;
const MAX_FINDINGS = 256;
const allowedStatuses = new Set(['proposed','active','verified','rejected','inactive']);
const allowedPolicies = new Set(['enabled','reverse_alias','disabled','future']);
const allowedOrientations = new Set(['same','reverse','symmetric']);
const allowedTypes = new Set(['active','inactive','future']);
const nonblank = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= MAX_TEXT &&
  value.trim() === value;
const refs = (values: readonly string[] | undefined): string[] =>
  [...new Set((values ?? []).filter(nonblank))].sort();
const validIdentity = (v: RelationIdentityV1): boolean =>
  !!v && nonblank(v.id) && nonblank(v.relationTypeCode) &&
  nonblank(v.sourceValueObjectId) && nonblank(v.targetValueObjectId) &&
  allowedStatuses.has(v.status) &&
  (v.contextKey == null || nonblank(v.contextKey)) &&
  (v.evidenceRefs === undefined ||
    (Array.isArray(v.evidenceRefs) && v.evidenceRefs.every(nonblank)));
// A length-prefixed key avoids delimiter collisions in object IDs and names.
function packed(parts: readonly string[]): string {
  return parts.map(p => `${p.length}:${p}`).join('');
}
function normalize(identity: RelationIdentityV1, byType: ReadonlyMap<string,CanonicalRelationTypeV1>): CanonicalEdgeV1 | null {
  const requested=byType.get(identity.relationTypeCode);
  if (!requested || requested.status !== 'active') return null;
  const canonicalCode=requested.canonicalRelationTypeCode ?? requested.relationTypeCode;
  const canonical=byType.get(canonicalCode);
  if (!canonical || canonical.status !== 'active' ||
      (canonical.canonicalRelationTypeCode ?? canonical.relationTypeCode) !== canonicalCode ||
      (canonical.canonicalOrientationCode ?? (canonical.directionalityCode === 'symmetric' ? 'symmetric' : 'same')) === 'reverse' ||
      canonical.canonicalWritePolicyCode === 'reverse_alias' ||
      canonical.canonicalWritePolicyCode === 'disabled' || canonical.canonicalWritePolicyCode === 'future') return null;
  const orientation=requested.canonicalOrientationCode ??
    (requested.directionalityCode === 'symmetric' ? 'symmetric' : 'same');
  const policy=requested.canonicalWritePolicyCode ?? (canonicalCode === identity.relationTypeCode ? 'enabled' : 'reverse_alias');
  if (!allowedPolicies.has(policy) || policy === 'disabled' || policy === 'future' ||
      (canonicalCode !== identity.relationTypeCode && (orientation !== 'reverse' || policy !== 'reverse_alias')) ||
      (canonicalCode === identity.relationTypeCode && (orientation === 'reverse' || policy !== 'enabled'))) return null;
  if (canonical.directionalityCode === 'symmetric' && orientation !== 'symmetric') return null;
  if (canonical.directionalityCode === 'directed' && orientation === 'symmetric') return null;
  let from=identity.sourceValueObjectId, to=identity.targetValueObjectId;
  if (orientation === 'reverse') [from,to]=[to,from];
  if (orientation === 'symmetric' && from > to) [from,to]=[to,from];
  return { relationTypeCode: canonicalCode, sourceValueObjectId: from,
    targetValueObjectId: to, key: packed([canonicalCode,from,to]) };
}

export function detectCanonicalRelationDuplicatesV1(input: DuplicateInputV1): DuplicateResultV1 {
  const candidate=input?.candidate;
  const cid=nonblank(candidate?.id) ? candidate.id : '<invalid-candidate>';
  const findings: DuplicateFindingV1[]=[];
  let complete=true;
  let candidateCanonical:CanonicalEdgeV1|null=null;
  const add=(code: DuplicateFindingV1['code'],severity:DuplicateFindingV1['severity'],
    explanation:string,related:RelationIdentityV1|null=null,key:string|null=null):void=>{
    if(findings.length>=MAX_FINDINGS){complete=false;return;}
    findings.push({code,severity,candidateId:cid,relatedRelationId:related?.id??null,
      canonicalEdgeKey:key,evidenceRefs:refs([...(candidate?.evidenceRefs ?? []),...(related?.evidenceRefs??[])]),
      explanation});
  };
  const finish=():DuplicateResultV1=>{
    if(!complete && !findings.some(x=>x.code==='INCOMPLETE_BOUNDED_INPUT'||x.code==='INVALID_REGISTRY')) {
      findings.splice(MAX_FINDINGS-1,1);
      add('INCOMPLETE_BOUNDED_INPUT','BLOCK','Bounded scan or finding limit exceeded.');
    }
    findings.sort((a,b)=>a.code.localeCompare(b.code)||
      String(a.relatedRelationId).localeCompare(String(b.relatedRelationId)));
    return {version:CANONICAL_DUPLICATES_VERSION_V1,complete,
      disposition:!complete||findings.some(f=>f.severity==='BLOCK')?'BLOCKED':
      findings.length?'REVIEW_REQUIRED':'NO_DUPLICATE_DETECTED',
      candidateCanonical,findings,writesPerformed:0,approvesRelation:false,verifiesSource:false};
  };
  if(!candidate || !Array.isArray(input?.existing)||!Array.isArray(input?.relationTypes)||
     input.existing.length>MAX_RELATIONS||input.relationTypes.length>MAX_TYPES ||
     !validIdentity(candidate)||candidate.status==='inactive'||candidate.status==='rejected'){
    complete=false;add('INCOMPLETE_BOUNDED_INPUT','BLOCK','Invalid candidate or bounded dataset.');return finish();
  }
  const types=new Map<string,CanonicalRelationTypeV1>();
  for(const t of input.relationTypes){
    if(!t || !nonblank(t.relationTypeCode)||types.has(t.relationTypeCode)||
      !allowedTypes.has(t.status)||!['directed','symmetric'].includes(t.directionalityCode)||
      (t.canonicalRelationTypeCode!==undefined && !nonblank(t.canonicalRelationTypeCode))||
      (t.canonicalOrientationCode!==undefined && !allowedOrientations.has(t.canonicalOrientationCode))||
      (t.canonicalWritePolicyCode!==undefined && !allowedPolicies.has(t.canonicalWritePolicyCode))){
      complete=false;add('INVALID_REGISTRY','BLOCK','Malformed or duplicate relation-type registry entry.');return finish();
    }
    types.set(t.relationTypeCode,t);
  }
  // Check the entire registry, including unused aliases, before drawing conclusions.
  for(const t of types.values()){
    if(t.status==='active' && !normalize({ ...candidate, relationTypeCode:t.relationTypeCode},types)){
      complete=false;add('INVALID_REGISTRY','BLOCK','Active relation-type canonical mapping is incomplete, ambiguous or cyclic.');return finish();
    }
  }
  candidateCanonical=normalize(candidate,types);
  if(!candidateCanonical){
    complete=false;add('UNKNOWN_RELATION_TYPE','BLOCK','Candidate relation type is missing, disabled or not canonicalizable.');return finish();
  }
  const ids=new Set([candidate.id]);
  for(const current of input.existing){
    if(!validIdentity(current)||ids.has(current.id)){
      complete=false;add('INCOMPLETE_BOUNDED_INPUT','BLOCK','Duplicate IDs or malformed existing relation.');return finish();
    }
    ids.add(current.id);
    const currentEdge=normalize(current,types);
    if(!currentEdge){
      complete=false;add('UNKNOWN_RELATION_TYPE','BLOCK','Existing relation type unavailable in bounded registry.',current);return finish();
    }
    if(currentEdge.key!==candidateCanonical.key) continue;
    if(current.status==='inactive'||current.status==='rejected'){
      add('HISTORICAL_EDGE_REVIEW','REVIEW',
        'Historical or rejected relation is not current; preserve lifecycle and review reactivation.',current,candidateCanonical.key);
      continue;
    }
    if(nonblank(current.contextKey) && nonblank(candidate.contextKey) &&
       current.contextKey !== candidate.contextKey){
      add('CONTEXT_COLLISION_REVIEW','REVIEW',
        'Same canonical edge but explicitly different contexts; no implicit equivalence.',current,candidateCanonical.key);
      continue;
    }
    if((current.contextKey == null)!==(candidate.contextKey == null)){
      add('CONTEXT_COLLISION_REVIEW','REVIEW',
        'Context on one assertion is missing; review before claiming an identical bounded assertion.',current,candidateCanonical.key);
      continue;
    }
    add(current.relationTypeCode===candidate.relationTypeCode ? 'DUPLICATE_CANONICAL_EDGE':'DUPLICATE_REVERSE_ALIAS',
      'BLOCK','A current relation already occupies this canonical edge; do not create another.',current,candidateCanonical.key);
  }
  return finish();
}

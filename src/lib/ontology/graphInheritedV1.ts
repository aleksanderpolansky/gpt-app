/**
 * M-0196 / ARI-04.07.03. Strict read-only projection of *pre-derived* rule candidates.
 * DOES NOT discover/apply inference rules. Rules and evidence must come from an
 * authorized, versioned upstream source. No DB/API/network/Graph writes.
 */
import type { GraphNeighborItemV1 } from './graphQueryV1';

export type InheritanceScopeV1 = 'system' | 'actor';
export type InheritanceApplicabilityV1 = 'applicable' | 'needs_review' | 'blocked';
export type InheritanceRuleV1 = Readonly<{
  rule_id: string;
  rule_version: string;
  relation_type_code: string;
  scope: InheritanceScopeV1;
  owner_user_id?: string;
  owner_actor_id?: string;
  status: 'approved' | 'draft' | 'retired';
  max_depth: 1 | 2;
  applicability_code: string;
}>;
export type InheritedCandidateV1 = Readonly<{
  candidate_id: string;
  source_value_object_id: string;
  target_value_object_id: string;
  relation_type_code: string;
  scope: InheritanceScopeV1;
  owner_user_id?: string;
  owner_actor_id?: string;
  rule_id: string;
  rule_version: string;
  depth: number;
  applicability: InheritanceApplicabilityV1;
  applicability_code: string;
  support_relation_ids: readonly string[];
  evidence_refs: readonly string[];
}>;
export type InheritedProjectionItemV1 = Readonly<{
  candidateId: string;
  sourceValueObjectId: string;
  targetValueObjectId: string;
  neighborValueObjectId: string;
  relationTypeCode: string;
  scope: InheritanceScopeV1;
  owner_user_id?: string;
  owner_actor_id?: string;
  rule_id: string;
  rule_version: string;
  depth: 1 | 2;
  applicability: InheritanceApplicabilityV1;
  applicability_code: string;
  supportRelationIds: string[];
  evidenceRefs: string[];
  epistemicStatus: 'DERIVED_CANDIDATE';
  verified: false;
}>;
export type InheritedGraphViewV1 = Readonly<{
  inheritedRelations: InheritedProjectionItemV1[];
  inheritanceReview: InheritedProjectionItemV1[];
  rejectedCandidateCount: number;
  truncated: boolean;
  runtimeRulesVerified: false;
}>;
const KEY=/^[a-z][a-z0-9_]{1,79}$/;
const VERSION=/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/;
const ID=/^[A-Za-z0-9][A-Za-z0-9:_-]{0,127}$/;
const APPLICABILITY=/^(?:[a-z][a-z0-9_]{0,79})$/;
const isId=(s:unknown):s is string=>typeof s==='string'&&ID.test(s);
const validList=(items:unknown):items is readonly string[]=>Array.isArray(items)&&items.length>0&&items.length<=16&&items.every(isId)&&new Set(items).size===items.length;
const evidenceRefOk=(s:unknown):s is string=>typeof s==='string'&&s.length<=512&&
  (ID.test(s)||(/^https:\/\/[^\s<>]+$/i.test(s)));
const validEvidenceRefs=(items:unknown):items is readonly string[]=>Array.isArray(items)&&items.length>0&&items.length<=16&&items.every(evidenceRefOk)&&new Set(items).size===items.length;
const candidateSort=(a:InheritedProjectionItemV1,b:InheritedProjectionItemV1)=>
  a.depth-b.depth||a.rule_id.localeCompare(b.rule_id)||a.neighborValueObjectId.localeCompare(b.neighborValueObjectId)||a.candidateId.localeCompare(b.candidateId);

/**
 * The permitted neighbor set MUST be constructed by an authorized query for the
 * same scope. A supplied candidate cannot make its target visible on its own.
 * This is a projection, not an inference engine or proof of rule applicability.
 */
export function projectInheritedRelationsV1(args: Readonly<{
  anchorValueObjectId: string;
  scope: InheritanceScopeV1;
  ownerUserId?: string;
  ownerActorId?: string;
  visibleValueObjectIds: readonly string[];
  approvedRules: readonly InheritanceRuleV1[];
  candidates: readonly InheritedCandidateV1[];
  limit: number;
}>): InheritedGraphViewV1 {
  if(!isId(args.anchorValueObjectId)||!['system','actor'].includes(args.scope)||
     (args.scope==='actor'&&(!isId(args.ownerUserId)||!isId(args.ownerActorId)))||
     !Number.isSafeInteger(args.limit)||args.limit<1||args.limit>50||
     args.visibleValueObjectIds.length>300||args.approvedRules.length>100||args.candidates.length>500)
    throw new Error('INVALID_INHERITANCE_QUERY');
  const visible=new Set(args.visibleValueObjectIds.filter(isId));
  const ruleMap=new Map<string,InheritanceRuleV1>();
  for(const rule of args.approvedRules){
    if(!KEY.test(rule.rule_id)||!VERSION.test(rule.rule_version)||!KEY.test(rule.relation_type_code)||
       !APPLICABILITY.test(rule.applicability_code)||![1,2].includes(rule.max_depth)||
       !['system','actor'].includes(rule.scope)||!['approved','draft','retired'].includes(rule.status)||
       (rule.scope==='actor'&&(!isId(rule.owner_user_id)||!isId(rule.owner_actor_id))))
      throw new Error('INVALID_RULE_CONTRACT');
    const key=rule.rule_id+'|'+rule.rule_version+'|'+rule.scope;
    if(ruleMap.has(key))throw new Error('DUPLICATE_RULE_ID_VERSION');
    ruleMap.set(key,rule);
  }
  const accepted:InheritedProjectionItemV1[]=[];
  const review:InheritedProjectionItemV1[]=[];
  let rejected=0;
  const fingerprints=new Set<string>();
  for(const row of args.candidates){
    const rule=ruleMap.get(row.rule_id+'|'+row.rule_version+'|'+row.scope);
    const neighborId=row.source_value_object_id===args.anchorValueObjectId
      ?row.target_value_object_id:row.target_value_object_id===args.anchorValueObjectId
      ?row.source_value_object_id:null;
    if(!rule||rule.status!=='approved'||rule.scope!==args.scope||row.scope!==args.scope||
       (args.scope==='actor'&&(
         rule.owner_user_id!==args.ownerUserId||rule.owner_actor_id!==args.ownerActorId||
         row.owner_user_id!==args.ownerUserId||row.owner_actor_id!==args.ownerActorId))||
       rule.relation_type_code!==row.relation_type_code||
       !Number.isSafeInteger(row.depth)||row.depth<1||row.depth>rule.max_depth||row.depth>2||
       !isId(row.candidate_id)||!isId(row.source_value_object_id)||!isId(row.target_value_object_id)||
       !neighborId||neighborId===args.anchorValueObjectId||!visible.has(neighborId)||
       !validList(row.support_relation_ids)||!validEvidenceRefs(row.evidence_refs)||
       !['applicable','needs_review','blocked'].includes(row.applicability)||
       !APPLICABILITY.test(row.applicability_code)||row.applicability_code!==rule.applicability_code){
      rejected++;continue;
    }
    const key=[row.rule_id,row.rule_version,row.source_value_object_id,
      row.target_value_object_id,row.relation_type_code,row.scope,
      row.owner_user_id??'',row.owner_actor_id??'',row.depth,row.applicability,
      [...row.support_relation_ids].sort().join(','),[...row.evidence_refs].sort().join(',')].join('|');
    if(fingerprints.has(key))continue;
    fingerprints.add(key);
    const item:InheritedProjectionItemV1={
      candidateId:row.candidate_id,sourceValueObjectId:row.source_value_object_id,
      targetValueObjectId:row.target_value_object_id,neighborValueObjectId:neighborId,
      relationTypeCode:row.relation_type_code,scope:row.scope,rule_id:row.rule_id,
      rule_version:row.rule_version,depth:row.depth as 1|2,applicability:row.applicability,
      applicability_code:row.applicability_code,supportRelationIds:[...row.support_relation_ids],
      evidenceRefs:[...row.evidence_refs],epistemicStatus:'DERIVED_CANDIDATE',verified:false,
    };
    if(row.applicability==='applicable')accepted.push(item);
    else review.push(item); // blocked is shown for inspection, never effective
  }
  accepted.sort(candidateSort);review.sort(candidateSort);
  return {inheritedRelations:accepted.slice(0,args.limit),
    inheritanceReview:review.slice(0,args.limit),rejectedCandidateCount:rejected,
    truncated:accepted.length>args.limit||review.length>args.limit,
    runtimeRulesVerified:false};
}

/** Response composition keeps asserted and inherited data in separate fields. */
export function composeGraphReadWithInheritanceV1(args:Readonly<{
  directRelations:readonly GraphNeighborItemV1[];
  derived:InheritedGraphViewV1;
}>):Readonly<{
  directRelations:readonly GraphNeighborItemV1[];
  inheritedRelations:InheritedProjectionItemV1[];
  inheritanceReview:InheritedProjectionItemV1[];
  inheritanceTruncated:boolean;
  inheritanceRuleRuntimeVerified:false;
}> {
  return {directRelations:[...args.directRelations],inheritedRelations:[...args.derived.inheritedRelations],
    inheritanceReview:[...args.derived.inheritanceReview],inheritanceTruncated:args.derived.truncated,
    inheritanceRuleRuntimeVerified:false};
}

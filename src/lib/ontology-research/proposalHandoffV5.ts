export const ONTO_HANDOFF_CONTRACT="ARCTOR_ONTO_AI_ON_DRAFT_HANDOFF_V5" as const;
export type ProposalAction="create"|"reuse"|"revise"|"investigate";
export type NodeRole="root"|"intermediate"|"leaf";
export type Relation="part_of"|"is_a"|"aspect_of"|"subprocess_of";
export type Candidate={
  draftKey:string;action:ProposalAction;role:NodeRole;
  titleRu:string;titleEn:string;definitionRu:string;definitionEn:string;
  parentExistingId:string|null;parentDraftKey:string|null;relationCode:Relation;
  rationale:string;evidenceOnIds:string[];confidence:"high"|"medium"|"low";
};
export type FormHandoff=Candidate&{contract:typeof ONTO_HANDOFF_CONTRACT;approvedAt:string};
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const roles:NodeRole[]=["root","intermediate","leaf"];
const actions:ProposalAction[]=["create","reuse","revise","investigate"];
const relations:Relation[]=["part_of","is_a","aspect_of","subprocess_of"];
const confidence=["high","medium","low"] as const;
const str=(value:unknown,max:number)=>typeof value==="string"?value.trim().slice(0,max):"";
export function parseCandidate(value:unknown):Candidate|null{
  if(!value||typeof value!=="object"||Array.isArray(value))return null;
  const x=value as Record<string,unknown>;
  if(!actions.includes(x.action as ProposalAction)||!roles.includes(x.role as NodeRole)||
    !relations.includes(x.relationCode as Relation)||!confidence.includes(x.confidence as typeof confidence[number]))return null;
  const draftKey=str(x.draftKey,90),titleRu=str(x.titleRu,180),titleEn=str(x.titleEn,180);
  if(!draftKey||!titleRu||!titleEn)return null;
  const parentExistingId=str(x.parentExistingId,48)||null;
  const parentDraftKey=str(x.parentDraftKey,90)||null;
  if(parentExistingId&&!UUID.test(parentExistingId))return null;
  return {
    draftKey,action:x.action as ProposalAction,role:x.role as NodeRole,
    titleRu,titleEn,definitionRu:str(x.definitionRu,4000),definitionEn:str(x.definitionEn,4000),
    parentExistingId,parentDraftKey,relationCode:x.relationCode as Relation,rationale:str(x.rationale,1500),
    evidenceOnIds:Array.isArray(x.evidenceOnIds)?x.evidenceOnIds.filter((id):id is string=>typeof id==="string"&&UUID.test(id)).slice(0,50):[],
    confidence:x.confidence as Candidate["confidence"],
  };
}
export function extractCandidateList(jsonText:string|undefined):Candidate[]{
  if(!jsonText)return[];
  try{const obj:unknown=JSON.parse(jsonText);if(!obj||typeof obj!=="object"||Array.isArray(obj))return[];
    const rows=(obj as Record<string,unknown>).onCandidates;
    if(!Array.isArray(rows))return[];
    const result:Candidate[]=[];const seen=new Set<string>();
    for(const row of rows.slice(0,100)){
      const candidate=parseCandidate(row);
      if(candidate&&!seen.has(candidate.draftKey)) {result.push(candidate);seen.add(candidate.draftKey);}
    }
    return result;
  }catch{return[];}
}
export type ParentEvidence={id:string;role:string};
export function proposalIssues(candidate:Candidate,availableParents:ParentEvidence[],hasCritique:boolean):string[]{
  const issues:string[]=[];
  if(candidate.action!=="create")issues.push("NOT_CREATE_ACTION");
  if(!hasCritique)issues.push("CRITIQUE_STAGE_NOT_ACCEPTED");
  if(!candidate.definitionRu||!candidate.definitionEn)issues.push("BILINGUAL_DEFINITIONS_REQUIRED");
  if(!candidate.rationale||candidate.rationale.length<12)issues.push("REASON_REQUIRED");
  if(candidate.confidence==="low")issues.push("LOW_CONFIDENCE_REVIEW_REQUIRED");
  if(candidate.role==="root"){
    if(candidate.parentExistingId||candidate.parentDraftKey)issues.push("ROOT_MUST_HAVE_NO_PARENT");
  }else{
    if(candidate.parentDraftKey)issues.push("CREATE_PARENT_FIRST_THEN_ENTER_REAL_UUID");
    if(!candidate.parentExistingId)issues.push("EXISTING_PARENT_UUID_REQUIRED");
    else {
      const p=availableParents.find(x=>x.id.toLowerCase()===candidate.parentExistingId?.toLowerCase());
      if(!p)issues.push("PARENT_NOT_VERIFIED_IN_CURRENT_CONTEXT");
      else if(candidate.role==="leaf"&&p.role!=="intermediate")issues.push("LEAF_REQUIRES_INTERMEDIATE_PARENT");
      else if(candidate.role==="intermediate"&&!(["root","intermediate"].includes(p.role)))issues.push("INVALID_INTERMEDIATE_PARENT");
    }
  }
  return issues;
}
export function serializeHandoff(candidate:Candidate):string{
  return JSON.stringify({...candidate,contract:ONTO_HANDOFF_CONTRACT,approvedAt:new Date().toISOString()});
}
export function readHandoffForForm(storage:Pick<Storage,"getItem"|"removeItem">,token:string):
  {ok:true;draft:Candidate}|{ok:false;error:string}{
  if(!UUID.test(token))return{ok:false,error:"INVALID_HANDOFF_TOKEN"};
  const key=`arctor:onto-ai:handoff:${token}`;
  const json=storage.getItem(key);if(!json)return{ok:false,error:"HANDOFF_EXPIRED_OR_MISSING"};
  storage.removeItem(key); // one-time draft handoff; form still requires separate manual submit
  try{
    const item:unknown=JSON.parse(json);
    if(!item||typeof item!=="object"||Array.isArray(item))return{ok:false,error:"INVALID_HANDOFF_DATA"};
    const obj=item as Record<string,unknown>;
    if(obj.contract!==ONTO_HANDOFF_CONTRACT||typeof obj.approvedAt!=="string"||
       Math.abs(Date.now()-Date.parse(obj.approvedAt))>30*60*1000)return{ok:false,error:"HANDOFF_EXPIRED"};
    const draft=parseCandidate(obj);
    if(!draft||draft.action!=="create")return{ok:false,error:"HANDOFF_NOT_CREATE_CANDIDATE"};
    if(draft.role!=="root"&&!draft.parentExistingId)return{ok:false,error:"HANDOFF_MISSING_PARENT"};
    return{ok:true,draft};
  }catch{return{ok:false,error:"INVALID_HANDOFF_JSON"};}
}
export function candidateTemplate():Candidate{return{
  draftKey:"new-observation-object",action:"investigate",role:"leaf",titleRu:"",titleEn:"",
  definitionRu:"",definitionEn:"",parentExistingId:null,parentDraftKey:null,relationCode:"aspect_of",
  rationale:"",evidenceOnIds:[],confidence:"low",
};}

/** Stage 4 is authoritative. An empty reviewed list must NEVER silently fall back to stage 3. */
export function selectReviewedCandidates(design:string|undefined,critique:string|undefined):
  {status:"draft_only"|"ready"|"reviewed_empty"|"invalid_review";candidates:Candidate[]}{
  if(!critique)return {status:"draft_only",candidates:extractCandidateList(design)};
  try{
    const obj:unknown=JSON.parse(critique);
    if(!obj||typeof obj!=="object"||Array.isArray(obj)||!Array.isArray((obj as Record<string,unknown>).onCandidates))
      return {status:"invalid_review",candidates:[]};
    const rows=(obj as {onCandidates:unknown[]}).onCandidates;
    if(rows.some(v=>parseCandidate(v)===null))return {status:"invalid_review",candidates:[]};
    const list=extractCandidateList(critique);
    if(list.length!==rows.length)return {status:"invalid_review",candidates:[]};
    return {status:list.length?"ready":"reviewed_empty",candidates:list};
  }catch{return {status:"invalid_review",candidates:[]};}
}

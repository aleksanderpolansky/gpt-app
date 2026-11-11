'use strict';
/** M-0121 offline-only evaluator: does not generate embeddings; rejects incomplete source. */
const fs=require('node:fs');
function ensure(c,m){if(!c)throw Error('M0121_SCORE_INVALID_'+m)}
const own=o=>o&&typeof o==='object'&&!Array.isArray(o);
const unique=a=>Array.isArray(a)&&new Set(a).size===a.length;
function vec(v){return Array.isArray(v)&&v.length>=2&&v.length<=8192&&v.every(Number.isFinite)&&v.some(x=>x!==0)}
function cosine(a,b){let dot=0,aa=0,bb=0;for(let i=0;i<a.length;i++){dot+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i]}return dot/Math.sqrt(aa*bb)}
function evaluate(data){
 ensure(own(data)&&data.contract==='ARCTOR_M0121_PRECOMPUTED_TWO_MODEL_EVAL_V1','CONTRACT');
 ensure(typeof data.goldSha256==='string'&&/^[A-Fa-f0-9]{64}$/.test(data.goldSha256),'GOLD_HASH');
 ensure(data.source==='OWNER_SUPPLIED_PRECOMPUTED_REAL_MODEL_OUTPUTS','PROVENANCE');
 ensure(Array.isArray(data.models)&&data.models.length===2&&data.models.every(x=>own(x)&&typeof x.id==='string'&&x.id.length>0&&typeof x.provenance==='string'&&x.provenance.length>=5)&&data.models[0].id!==data.models[1].id,'TWO_DISTINCT_MODELS');
 ensure(Array.isArray(data.queries)&&data.queries.length>0&&data.queries.length<=2000&&unique(data.queries.map(x=>x.id)),'QUERY_SET');
 ensure(Array.isArray(data.candidates)&&data.candidates.length>=2&&data.candidates.length<=100000&&unique(data.candidates.map(x=>x.id)),'CANDIDATE_SET');
 const candidateIds=data.candidates.map(x=>x.id),cset=new Set(candidateIds);
 ensure(candidateIds.every(x=>typeof x==='string'&&x.length>0),'CANDIDATE_IDS');
 const qids=data.queries.map(x=>x.id);
 ensure(data.queries.every(x=>own(x)&&typeof x.id==='string'&&x.id.length>0&&['en','pl','es','de','cs','uk','ru'].includes(x.locale)&&unique(x.relevantOnIds)&&x.relevantOnIds.length>0&&x.relevantOnIds.every(id=>cset.has(id))),'LABELS');
 ensure(own(data.embeddings)&&Object.keys(data.embeddings).length===2,'EMBEDDING_MODELS');
 const outcomes={};
 for(const model of data.models){
  const payload=data.embeddings[model.id];ensure(own(payload)&&own(payload.queries)&&own(payload.candidates),'EMBEDDING_PAYLOAD');
  ensure(Object.keys(payload.queries).length===qids.length&&qids.every(x=>Object.prototype.hasOwnProperty.call(payload.queries,x)),'QUERY_MATCH');
  ensure(Object.keys(payload.candidates).length===candidateIds.length&&candidateIds.every(x=>Object.prototype.hasOwnProperty.call(payload.candidates,x)),'CANDIDATE_MATCH');
  let dim=null;for(const v of [...Object.values(payload.queries),...Object.values(payload.candidates)]){ensure(vec(v),'VECTOR');dim??=v.length;ensure(v.length===dim,'VECTOR_DIMENSION')}
  const perLocale={};let agg={r1:0,r5:0,mrr5:0,ndcg5:0,n:0};
  for(const q of data.queries){const scores=candidateIds.map(id=>({id,score:cosine(payload.queries[q.id],payload.candidates[id])})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
   const set=new Set(q.relevantOnIds);const rank=scores.findIndex(x=>set.has(x.id))+1;
   const r1=rank===1?1:0,r5=rank>0&&rank<=5?1:0,mrr5=rank>0&&rank<=5?1/rank:0;
   const top=scores.slice(0,5);const dcg=top.reduce((acc,x,i)=>acc+(set.has(x.id)?1/Math.log2(i+2):0),0);
   const ideal=Math.min(set.size,5);let idcg=0;for(let i=0;i<ideal;i++)idcg+=1/Math.log2(i+2);
   const ndcg5=dcg/idcg;
   const sub=perLocale[q.locale]??={r1:0,r5:0,mrr5:0,ndcg5:0,n:0};for(const obj of [agg,sub]){obj.r1+=r1;obj.r5+=r5;obj.mrr5+=mrr5;obj.ndcg5+=ndcg5;obj.n++}
  }
  const rates=o=>({queries:o.n,recallAt1:o.r1/o.n,recallAt5:o.r5/o.n,mrrAt5:o.mrr5/o.n,ndcgAt5:o.ndcg5/o.n});
  outcomes[model.id]={dimensions:dim,...rates(agg),perLocale:Object.fromEntries(Object.entries(perLocale).map(([k,v])=>[k,rates(v)]))};
 }
 return {contract:'ARCTOR_M0121_OFFLINE_SCORER_RESULT_V1',goldSha256:data.goldSha256,sourceClaim:data.source,queryCount:qids.length,candidateCount:candidateIds.length,provenanceNotIndependentlyVerified:true,modelResults:outcomes,qualityCertified:false,acceptance:'PROVISIONAL_REQUIRES_OWNER_EVIDENCE_AND_GOLD_REVIEW'};
}
module.exports={evaluate,cosine};
if(require.main===module){
 try{const file=process.argv[2];ensure(file,'FILE');const data=JSON.parse(fs.readFileSync(file,'utf8'));console.log(JSON.stringify(evaluate(data),null,2));}
 catch(e){console.error('M0121_SCORE_STOP:',e.message);process.exitCode=1}
}

/** Execute after the reviewed SQL migration. Does NOT reveal env values. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import OpenAI from 'openai';

if(typeof process.loadEnvFile==='function'){
 const p=path.join(process.cwd(),'.env.local');if(fs.existsSync(p))process.loadEnvFile(p);
}
const execute=process.argv.includes('--execute');
const url=process.env.SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
const apiKey=process.env.OPENAI_API_KEY;
if(!url||!key||(!apiKey&&execute))throw Error('ENV_REQUIRED_SUPABASE_URL_SUPABASE_SERVICE_ROLE_KEY_OPENAI_API_KEY');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const model='text-embedding-3-small';
const sourceText=r=>[r.title?.trim(),r.description?.trim(),r.canonical_key?.trim()].filter(Boolean).join('\n').slice(0,12000);
const digest=r=>createHash('sha256').update('ARI03_CONTENT_V1\n'+sourceText(r),'utf8').digest('hex').toUpperCase();
async function readAll(table,select,filter,order,cap=5000){
 const out=[];for(let start=0;start<cap;start+=500){
  let q=db.from(table).select(select).order(order,{ascending:true}).range(start,start+499);
  q=filter(q);const {data,error}=await q;
  if(error)throw Error(table+'_READ_FAILED:'+error.code);
  out.push(...(data??[]));if((data??[]).length<500)return out;
 }throw Error(table+'_CAPACITY_EXCEEDED');
}
const rows=await readAll('value_objects','id,title,description,canonical_key',q=>q.eq('scope_code','global').eq('origin_type_code','system_model').eq('status','active'),'id');
if(rows.length<1)throw Error('EMPTY_SYSTEM_CATALOG');
const old=await readAll('ari03_on_embeddings_v1','on_id,source_sha256',q=>q.eq('locale','und').eq('model_id',model),'on_id');
const current=new Set(rows.map(x=>x.id.toLowerCase()));
const oldById=new Map(old.map(x=>[x.on_id.toLowerCase(),x]));
const stale=old.filter(x=>!current.has(x.on_id.toLowerCase()));
const pending=rows.filter(x=>oldById.get(x.id.toLowerCase())?.source_sha256!==digest(x));
const report={contract:'ARCTOR_ARI03_M0146_BACKFILL_V1',mode:execute?'execute':'dry_run',
  catalogCount:rows.length,existing:old.length,newOrUpdated:pending.length,obsolete:stale.length,
  performed:0,paidEmbeddingCalls:0,removed:0,errors:[]};
console.log(JSON.stringify(report));
if(!execute){console.log('NO WRITES. Pass --execute only after SQL migration and owner authorization.');process.exit(0);}
if(pending.length>2000)throw Error('PAID_EMBEDDING_COUNT_CAP_EXCEEDED');
const ai=new OpenAI({apiKey,maxRetries:2,timeout:30000});
for(let i=0;i<pending.length;i+=24){
 const batch=pending.slice(i,i+24);
 const texts=batch.map(sourceText);
 if(texts.some(x=>!x.trim()))throw Error('EMPTY_SOURCE_TEXT');
 const response=await ai.embeddings.create({model,input:texts,encoding_format:'float'});
 report.paidEmbeddingCalls++;
 const vectors=[...response.data].sort((a,b)=>a.index-b.index);
 if(vectors.length!==batch.length||vectors.some(x=>x.embedding.length!==1536))throw Error('EMBEDDING_DIMENSIONS_INVALID');
 const payload=batch.map((r,j)=>({on_id:r.id,locale:'und',model_id:model,
   source_sha256:digest(r),embedding:vectors[j].embedding,updated_at:new Date().toISOString()}));
 const {error}=await db.from('ari03_on_embeddings_v1').upsert(payload,{onConflict:'on_id,locale,model_id'});
 if(error)throw Error('VECTOR_UPSERT_FAILED:'+error.code);
 report.performed+=payload.length;
 console.log(`INDEXED=${report.performed}/${pending.length}`);
}
for(const s of stale){
 const {error}=await db.from('ari03_on_embeddings_v1').delete().eq('on_id',s.on_id).eq('locale','und').eq('model_id',model);
 if(error)throw Error('VECTOR_REMOVE_FAILED:'+error.code);
 report.removed++;
}
const after=await readAll('ari03_on_embeddings_v1','on_id,source_sha256',q=>q.eq('locale','und').eq('model_id',model),'on_id');
const index=new Map(after.map(x=>[x.on_id.toLowerCase(),x.source_sha256]));
if(after.length!==rows.length||rows.some(x=>index.get(x.id.toLowerCase())!==digest(x)))
 throw Error('INDEX_COVERAGE_OR_VERSION_INCOMPLETE');
report.ready=true;report.finalCount=after.length;
console.log('ARI03_INDEX_READY='+JSON.stringify(report));

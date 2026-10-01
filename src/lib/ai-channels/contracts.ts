import {
  ARCTOR_AI_MODEL_CATALOG,
  ARCTOR_AI_MODEL_ORDER,
  type ArctorAiBillingTierCode,
} from "../../../lib/ai/platformModelCatalog";

export type ChannelSearchDepth='quick'|'detailed';
export type ChannelFreshness='recent'|'current';
export type ChannelReasoningEffort='low'|'medium'|'high'|'max';
export type ChannelSearchContextSize='low'|'medium'|'high';
export type ChannelCoverageMode='ranked'|'diverse'|'exhaustive';
export type ChannelCategoryMode='open'|'strict';
export type ChannelBillingPolicy='creator'|'platform_owner';

export type ChannelSpec = {
 name:string; topic:string; geography:string; exclusions:string; domains:string[];
 language:string; intervalHours:number; lookbackDays:number; maxItems:number;
 searchDepth?:ChannelSearchDepth; freshness?:ChannelFreshness; timeZone?:string;
 model?:string; reasoningEffort?:ChannelReasoningEffort; maxToolCalls?:number;
 searchContextSize?:ChannelSearchContextSize; maxOutputTokens?:number;
 coverageMode?:ChannelCoverageMode; maxPerProvider?:number; minDistinctProviders?:number;
 categoryMode?:ChannelCategoryMode; allowedCategories?:string[]; feedPreviewCount?:number;
 objectIds:string[]; scope:'public'|'private'; revision?:number;
};
export type ChannelItem = {
 title:string; summary:string; url:string; source:string; author:string|null; publishedAt:string|null;
 findingKey?:string; validFrom?:string|null; validUntil?:string|null; objectIds:string[];
 providerKey?:string; category?:string|null;
};
export type ChannelRow = {id:string; name:string; scope:'public'|'private'; status:string; spec:ChannelSpec; revision:number;
 owner_user_id:string; creator_actor_id:string; billing_policy:ChannelBillingPolicy; billing_user_id:string;
 next_run_at:string; last_run_at:string|null; last_error:string|null; enabled?:boolean; canManage?:boolean; runningRunId?:string|null};
export type OntologyOption = {id:string;title:string};

export const CHANNEL_MODEL=ARCTOR_AI_MODEL_CATALOG.standard.modelName;
export const CHANNEL_MODEL_OPTIONS=ARCTOR_AI_MODEL_ORDER
 .map(tier=>ARCTOR_AI_MODEL_CATALOG[tier])
 .filter(model=>model.surfaces.aiChannels)
 .map(model=>({id:model.modelName,label:model.displayName,caption:model.caption,tierCode:model.tierCode}));
export const CHANNEL_ALLOWED_MODELS=new Set<string>(CHANNEL_MODEL_OPTIONS.map(x=>x.id));

export function channelBillingTierForModel(modelName:string):ArctorAiBillingTierCode|null{
 for(const tier of ARCTOR_AI_MODEL_ORDER){
  if(ARCTOR_AI_MODEL_CATALOG[tier].modelName===modelName)return tier;
 }
 return null;
}
export function channelReasoningForModel(modelName:string):ChannelReasoningEffort{
 const tier=channelBillingTierForModel(modelName);
 return tier?ARCTOR_AI_MODEL_CATALOG[tier].reasoningEffort:'medium';
}

export const CHANNEL_MODEL_MAX_LENGTH=80;

function finiteInteger(value:unknown,fallback:number,min:number,max:number,code:string){
 const n=value===undefined||value===null||value===''?fallback:Number(value);
 if(!Number.isInteger(n)||n<min||n>max)throw Error(code);
 return n;
}
function stringList(value:unknown,maxItems:number,maxLength:number,pattern:RegExp,code:string){
 if(value===undefined||value===null)return [];
 if(!Array.isArray(value)||value.length>maxItems)throw Error(code);
 const out=[...new Set(value.map(x=>String(x).trim().toLowerCase()).filter(Boolean))];
 if(out.some(x=>x.length>maxLength||!pattern.test(x)))throw Error(code);
 return out;
}

export function channelSpecWithDefaults(spec:ChannelSpec):ChannelSpec{
 const searchDepth:ChannelSearchDepth=spec.searchDepth==='detailed'?'detailed':'quick';
 const detailed=searchDepth==='detailed';
 const freshness:ChannelFreshness=spec.freshness==='current'?'current':'recent';
 const model=typeof spec.model==='string'&&CHANNEL_ALLOWED_MODELS.has(spec.model)?spec.model:CHANNEL_MODEL;
 const reasoningEffort:ChannelReasoningEffort=['low','medium','high','max'].includes(String(spec.reasoningEffort))?spec.reasoningEffort as ChannelReasoningEffort:channelReasoningForModel(model);
 const searchContextSize:ChannelSearchContextSize=['low','medium','high'].includes(String(spec.searchContextSize))?spec.searchContextSize as ChannelSearchContextSize:(detailed?'high':'medium');
 const coverageMode:ChannelCoverageMode=['ranked','diverse','exhaustive'].includes(String(spec.coverageMode))?spec.coverageMode as ChannelCoverageMode:'ranked';
 const safeInt=(value:unknown,fallback:number,min:number,max:number)=>{const n=Number(value);return Number.isInteger(n)&&n>=min&&n<=max?n:fallback;};
 const maxItems=safeInt(spec.maxItems,15,1,30);
 const maxToolCalls=safeInt(spec.maxToolCalls,detailed?10:4,1,20);
 const maxOutputTokens=safeInt(spec.maxOutputTokens,detailed?12000:6500,1000,20000);
 const maxPerProvider=safeInt(spec.maxPerProvider,3,1,10);
 const minDistinctRaw=safeInt(spec.minDistinctProviders,3,1,10);
 const minDistinctProviders=coverageMode==='ranked'?minDistinctRaw:Math.min(minDistinctRaw,maxItems);
 const allowedCategories=Array.isArray(spec.allowedCategories)?[...new Set(spec.allowedCategories.map(x=>String(x).trim().toLowerCase()).filter(x=>/^[a-z0-9][a-z0-9_-]*$/.test(x)).slice(0,12))]:[];
 const categoryMode:ChannelCategoryMode=spec.categoryMode==='strict'&&allowedCategories.length?'strict':'open';
 const feedPreviewCount=safeInt(spec.feedPreviewCount,1,1,5);
 let timeZone=typeof spec.timeZone==='string'&&spec.timeZone?spec.timeZone:'UTC';
 try{new Intl.DateTimeFormat('en',{timeZone}).format();}catch{timeZone='UTC';}
 return {...spec,searchDepth,freshness,timeZone,model,reasoningEffort,maxToolCalls,searchContextSize,maxOutputTokens,coverageMode,maxPerProvider,minDistinctProviders,categoryMode,allowedCategories,feedPreviewCount,maxItems};
}

export function canonicalSourceUrl(value:unknown):string|null {
 if(typeof value!=='string'||value.length>4000)return null;
 try {const u=new URL(value);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)return null;
 if(!u.hostname.includes('.')||/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(u.hostname)||u.hostname.includes(':'))return null;
 u.hash='';for(const key of [...u.searchParams.keys()])if(/^(utm_|fbclid$|gclid$)/i.test(key))u.searchParams.delete(key);
 u.searchParams.sort();return u.href;
 } catch{return null;}
}
export function parseChannelSpec(value:unknown):ChannelSpec {
 if(!value||typeof value!=='object')throw Error('CHANNEL_FORM_INVALID');
 const v=value as Record<string,unknown>;
 const text=(key:string,max:number,required=false)=>{const x=typeof v[key]==='string'?v[key].trim():'';if(x.length>max||(required&&!x))throw Error('CHANNEL_FORM_'+key);return x;};
 const name=text('name',120,true),topic=text('topic',2000,true),geography=text('geography',200),exclusions=text('exclusions',1000);
 if(!Array.isArray(v.domains)||v.domains.length>10)throw Error('CHANNEL_DOMAINS_INVALID');
 const domains=[...new Set(v.domains.map(x=>String(x).trim().toLowerCase()).filter(Boolean))];
 if(domains.some(x=>!/^([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(x)))throw Error('CHANNEL_DOMAINS_INVALID');
 if(!Array.isArray(v.objectIds)||v.objectIds.length<1||v.objectIds.length>8||v.objectIds.some(x=>typeof x!=='string'||! /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(x)))throw Error('CHANNEL_OBJECTS_REQUIRED');
 const intervalHours=Number(v.intervalHours),lookbackDays=Number(v.lookbackDays),maxItems=Number(v.maxItems);
 if(![1,6,24,168].includes(intervalHours)||!Number.isInteger(lookbackDays)||lookbackDays<1||lookbackDays>30||!Number.isInteger(maxItems)||maxItems<1||maxItems>30)throw Error('CHANNEL_LIMIT_INVALID');
 const searchDepth=(v.searchDepth??'quick') as ChannelSearchDepth,freshness=(v.freshness??'recent') as ChannelFreshness,timeZone=typeof v.timeZone==='string'?v.timeZone:'UTC';
 if(!['quick','detailed'].includes(String(searchDepth))||!['recent','current'].includes(String(freshness)))throw Error('CHANNEL_SEARCH_MODE_INVALID');
 try{new Intl.DateTimeFormat('en',{timeZone}).format();}catch{throw Error('CHANNEL_TIMEZONE_INVALID');}
 const language=text('language',5);if(!['ru','uk','pl','en','de','es','cs'].includes(language))throw Error('CHANNEL_LANGUAGE_INVALID');
 const model=(text('model',CHANNEL_MODEL_MAX_LENGTH)||CHANNEL_MODEL);
 if(!CHANNEL_ALLOWED_MODELS.has(model))throw Error('CHANNEL_MODEL_INVALID');
 const detailed=searchDepth==='detailed';
 const reasoningEffort=(v.reasoningEffort??channelReasoningForModel(model)) as ChannelReasoningEffort;
 if(!['low','medium','high','max'].includes(String(reasoningEffort)))throw Error('CHANNEL_REASONING_INVALID');
 const maxToolCalls=finiteInteger(v.maxToolCalls,detailed?10:4,1,20,'CHANNEL_TOOL_LIMIT_INVALID');
 const searchContextSize=(v.searchContextSize??(detailed?'high':'medium')) as ChannelSearchContextSize;
 if(!['low','medium','high'].includes(String(searchContextSize)))throw Error('CHANNEL_SEARCH_CONTEXT_INVALID');
 const maxOutputTokens=finiteInteger(v.maxOutputTokens,detailed?12000:6500,1000,20000,'CHANNEL_OUTPUT_TOKEN_LIMIT_INVALID');
 const coverageMode=(v.coverageMode??'ranked') as ChannelCoverageMode;
 if(!['ranked','diverse','exhaustive'].includes(String(coverageMode)))throw Error('CHANNEL_COVERAGE_MODE_INVALID');
 const maxPerProvider=finiteInteger(v.maxPerProvider,3,1,10,'CHANNEL_PROVIDER_LIMIT_INVALID');
 const minDistinctProviders=finiteInteger(v.minDistinctProviders,3,1,10,'CHANNEL_PROVIDER_MIN_INVALID');
 if(coverageMode!=='ranked'&&minDistinctProviders>maxItems)throw Error('CHANNEL_PROVIDER_MIN_INVALID');
 const categoryMode=(v.categoryMode??'open') as ChannelCategoryMode;
 if(!['open','strict'].includes(String(categoryMode)))throw Error('CHANNEL_CATEGORY_MODE_INVALID');
 const allowedCategories=stringList(v.allowedCategories,12,64,/^[a-z0-9][a-z0-9_-]*$/,'CHANNEL_CATEGORY_INVALID');
 if(categoryMode==='strict'&&!allowedCategories.length)throw Error('CHANNEL_CATEGORY_REQUIRED');
 const feedPreviewCount=finiteInteger(v.feedPreviewCount,1,1,5,'CHANNEL_FEED_PREVIEW_INVALID');
 return {searchDepth,freshness,timeZone,name,topic,geography,exclusions,domains,language,intervalHours,lookbackDays,maxItems,
  model,reasoningEffort,maxToolCalls,searchContextSize,maxOutputTokens,coverageMode,maxPerProvider,minDistinctProviders,categoryMode,allowedCategories,feedPreviewCount,
  objectIds:[...new Set(v.objectIds as string[])],scope:v.scope==='public'?'public':'private',revision:Number(v.revision)||1};
}
// Source evidence is independent of finding identity: one page can support many findings.
export function cleanSummary(text:string):string {
 return text.replace(/\[([^\]]*)\]\(https?:\/\/[^\s)]+\)/g,'')
  .replace(/https?:\/\/[^\s)]+/g,'').replace(/[（(]\s*[)）]/g,'').replace(/\s+/g,' ').trim();
}
export function normalizeFindingKey(value:string):string {
 return value.normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
}
export function channelDate(now:Date,timeZone='UTC'):string {
 const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const get=(type:string)=>parts.find(p=>p.type===type)?.value;
 return `${get('year')}-${get('month')}-${get('day')}`;
}
function dateOnly(value:unknown):string|null {
 if(value===null||value===undefined||value==='')return null;
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('date');
 const d=new Date(value+'T00:00:00Z');
 if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==value)throw Error('date');
 return value;
}
function coverageSelect(items:ChannelItem[],spec:ChannelSpec,rejected:Record<string,number>){
 const limit=spec.maxItems;
 if((spec.coverageMode??'ranked')==='ranked'){
  if(items.length>limit)rejected.result_limit=items.length-limit;
  return items.slice(0,limit);
 }
 const cap=spec.maxPerProvider??3;
 const queues=new Map<string,ChannelItem[]>();
 for(const item of items){const key=normalizeFindingKey(item.providerKey||item.source);const list=queues.get(key)??[];list.push(item);queues.set(key,list);}
 const eligibleByCap=[...queues.values()].reduce((sum,list)=>sum+Math.min(list.length,cap),0);
 const selected:ChannelItem[]=[];const used=new Map<string,number>();let progressed=true;
 while(selected.length<limit&&progressed){progressed=false;for(const [key,list] of queues){if(selected.length>=limit)break;const count=used.get(key)??0;if(count>=cap)continue;const item=list[count];if(!item)continue;selected.push(item);used.set(key,count+1);progressed=true;}}
 const capRejected=Math.max(0,items.length-eligibleByCap);if(capRejected)rejected.provider_cap=capRejected;
 const limitRejected=Math.max(0,eligibleByCap-selected.length);if(limitRejected)rejected.result_limit=limitRejected;
 return selected;
}
export function validateChannelResults(raw:unknown,inputSpec:ChannelSpec,sourceUrls:string[],now=new Date()) {
 if(!Array.isArray(raw)||raw.length>100)throw Error('CHANNEL_OUTPUT_INVALID');
 const spec=channelSpecWithDefaults(inputSpec);
 const allowed=new Set(sourceUrls.map(canonicalSourceUrl).filter(Boolean)),seen=new Set<string>();
 const items:ChannelItem[]=[],rejected:Record<string,number>={};
 const reject=(why:string)=>{rejected[why]=(rejected[why]??0)+1;};
 const today=channelDate(now,spec.timeZone);
 const allowedCategories=new Set(spec.allowedCategories??[]);
 for(const v of raw){
  if(!v||typeof v!=='object'){reject('shape');continue;}
  const x=v as Record<string,unknown>,url=canonicalSourceUrl(x.url);
  if(!url||!allowed.has(url)){reject('source_not_grounded');continue;}
  const host=new URL(url).hostname;
  if(spec.domains.length&&!spec.domains.some(d=>host===d||host.endsWith('.'+d))){reject('domain');continue;}
  if(typeof x.summary!=='string'||x.summary.length>1400||typeof x.title!=='string'||!x.title.trim()||x.title.length>240){reject('text');continue;}
  const summary=cleanSummary(x.summary);
  if(!summary||summary.length>700){reject('text');continue;}
  const objectIds=Array.isArray(x.objectIds)?[...new Set(x.objectIds.filter((id):id is string=>typeof id==='string'&&spec.objectIds.includes(id)))]:[];
  if(!objectIds.length){reject('ontology');continue;}
  const date=typeof x.publishedAt==='string'&&x.publishedAt?new Date(x.publishedAt):null;
  if(date&&(Number.isNaN(date.getTime())||date.getTime()>now.getTime()+86400000)){reject('publication_date');continue;}
  let validFrom:string|null,validUntil:string|null;
  try{validFrom=dateOnly(x.validFrom);validUntil=dateOnly(x.validUntil);}catch{reject('validity_date');continue;}
  if(validFrom&&validUntil&&validFrom>validUntil){reject('validity_date');continue;}
  if(validUntil&&validUntil<today){reject('expired');continue;}
  if(spec.freshness==='current'){
   if(!validUntil||(validFrom&&validFrom>today)){reject('not_confirmed_current');continue;}
  }else if(date&&date.getTime()<now.getTime()-spec.lookbackDays*86400000){reject('outside_window');continue;}
  const category=typeof x.category==='string'&&x.category.trim()?x.category.trim().toLowerCase():null;
  if(spec.categoryMode==='strict'&&(!category||!allowedCategories.has(category))){reject('category');continue;}
  const providerKey=typeof x.providerKey==='string'&&x.providerKey.trim()?normalizeFindingKey(x.providerKey).slice(0,120):normalizeFindingKey(host);
  if(!providerKey){reject('provider');continue;}
  // Legacy callers without findingKey remain valid; v3 requests require it in their JSON schema.
  const identity=typeof x.findingKey==='string'?normalizeFindingKey(x.findingKey):normalizeFindingKey(url+'|'+summary);
  if(!identity||identity.length>500){reject('identity');continue;}
  const findingKey='v3:'+identity;
  if(seen.has(findingKey)){reject('duplicate_finding');continue;}
  seen.add(findingKey);
  items.push({url,summary,title:x.title.trim(),source:host,findingKey,validFrom,validUntil,providerKey,category,
   author:typeof x.author==='string'?x.author.slice(0,200):null,publishedAt:date?.toISOString()??null,objectIds});
 }
 const selected=coverageSelect(items,spec,rejected);
 const providerCount=new Set(selected.map(x=>normalizeFindingKey(x.providerKey||x.source))).size;
 const categoryCount=new Set(selected.map(x=>x.category).filter(Boolean)).size;
 const minimum=spec.coverageMode==='ranked'?0:(spec.minDistinctProviders??3);
 return {items:selected,diagnostics:{received:raw.length,accepted:selected.length,rejected,sourceCount:allowed.size,providerCount,categoryCount,
  coverageMode:spec.coverageMode,minDistinctProviders:minimum,coverageShortfall:Math.max(0,minimum-providerCount)}};
}
export function validateChannelItems(raw:unknown,spec:ChannelSpec,sourceUrls:string[],now=new Date()):ChannelItem[]{
 return validateChannelResults(raw,spec,sourceUrls,now).items;
}

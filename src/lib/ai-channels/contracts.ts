export type ChannelSpec = {
 name:string; topic:string; geography:string; exclusions:string; domains:string[];
 language:string; intervalHours:number; lookbackDays:number; maxItems:number;
 searchDepth?:'quick'|'detailed'; freshness?:'recent'|'current'; timeZone?:string;
 objectIds:string[]; scope:'public'|'private'; revision?:number;
};
export type ChannelItem = {title:string; summary:string; url:string; source:string; author:string|null; publishedAt:string|null; findingKey?:string; validFrom?:string|null; validUntil?:string|null; objectIds:string[]};
export type ChannelRow = {id:string; name:string; scope:'public'|'private'; status:string; spec:ChannelSpec; revision:number;
 owner_user_id:string; creator_actor_id:string; next_run_at:string; last_run_at:string|null; last_error:string|null; enabled?:boolean; canManage?:boolean; runningRunId?:string|null};
export type OntologyOption = {id:string;title:string};
export const CHANNEL_MODEL = 'gpt-5.4-mini';
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
 const searchDepth=v.searchDepth??'quick',freshness=v.freshness??'recent',timeZone=typeof v.timeZone==='string'?v.timeZone:'UTC';
 if(!['quick','detailed'].includes(String(searchDepth))||!['recent','current'].includes(String(freshness)))throw Error('CHANNEL_SEARCH_MODE_INVALID');
 try{new Intl.DateTimeFormat('en',{timeZone}).format();}catch{throw Error('CHANNEL_TIMEZONE_INVALID');}
 const language=text('language',5);if(!['ru','uk','pl','en','de','es','cs'].includes(language))throw Error('CHANNEL_LANGUAGE_INVALID');
 return {searchDepth:searchDepth as 'quick'|'detailed',freshness:freshness as 'recent'|'current',timeZone,name,topic,geography,exclusions,domains,language,intervalHours,lookbackDays,maxItems,objectIds:[...new Set(v.objectIds as string[])],scope:v.scope==='public'?'public':'private',revision:Number(v.revision)||1};
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
export function validateChannelResults(raw:unknown,spec:ChannelSpec,sourceUrls:string[],now=new Date()) {
 if(!Array.isArray(raw)||raw.length>100)throw Error('CHANNEL_OUTPUT_INVALID');
 const allowed=new Set(sourceUrls.map(canonicalSourceUrl).filter(Boolean)),seen=new Set<string>();
 const items:ChannelItem[]=[],rejected:Record<string,number>={};
 const reject=(why:string)=>{rejected[why]=(rejected[why]??0)+1;};
 const today=channelDate(now,spec.timeZone);
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
  // Legacy callers without findingKey remain valid; v2 requests require it in their JSON schema.
  const identity=typeof x.findingKey==='string'?normalizeFindingKey(x.findingKey):normalizeFindingKey(url+'|'+summary);
  if(!identity||identity.length>500){reject('identity');continue;}
  const findingKey='v2:'+identity;
  if(seen.has(findingKey)){reject('duplicate_finding');continue;}
  seen.add(findingKey);
  items.push({url,summary,title:x.title.trim(),source:host,findingKey,validFrom,validUntil,
   author:typeof x.author==='string'?x.author.slice(0,200):null,publishedAt:date?.toISOString()??null,objectIds});
 }
 const limit=spec.maxItems;
 if(items.length>limit)rejected.result_limit=items.length-limit;
 return {items:items.slice(0,limit),diagnostics:{received:raw.length,accepted:Math.min(items.length,limit),rejected,sourceCount:allowed.size}};
}
export function validateChannelItems(raw:unknown,spec:ChannelSpec,sourceUrls:string[],now=new Date()):ChannelItem[]{
 return validateChannelResults(raw,spec,sourceUrls,now).items;
}

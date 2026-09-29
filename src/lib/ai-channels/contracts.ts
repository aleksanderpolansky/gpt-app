export type ChannelSpec = {
 name:string; topic:string; geography:string; exclusions:string; domains:string[];
 language:string; intervalHours:number; lookbackDays:number; maxItems:number;
 objectIds:string[]; scope:'public'|'private'; revision?:number;
};
export type ChannelItem = {title:string; summary:string; url:string; source:string; author:string|null; publishedAt:string|null; objectIds:string[]};
export type ChannelRow = {id:string; name:string; scope:'public'|'private'; status:string; spec:ChannelSpec; revision:number;
 owner_user_id:string; creator_actor_id:string; next_run_at:string; last_run_at:string|null; last_error:string|null; enabled?:boolean; canManage?:boolean};
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
 if(![1,6,24,168].includes(intervalHours)||!Number.isInteger(lookbackDays)||lookbackDays<1||lookbackDays>30||!Number.isInteger(maxItems)||maxItems<1||maxItems>10)throw Error('CHANNEL_LIMIT_INVALID');
 const language=text('language',5);if(!['ru','uk','pl','en','de','es','cs'].includes(language))throw Error('CHANNEL_LANGUAGE_INVALID');
 return {name,topic,geography,exclusions,domains,language,intervalHours,lookbackDays,maxItems,objectIds:[...new Set(v.objectIds as string[])],scope:v.scope==='public'?'public':'private',revision:Number(v.revision)||1};
}
// URLs must be present in provider citations/search sources, not just model-generated JSON.
export function validateChannelItems(raw:unknown,spec:ChannelSpec,sourceUrls:string[],now=new Date()):ChannelItem[] {
 if(!Array.isArray(raw)||raw.length>10)throw Error('CHANNEL_OUTPUT_INVALID');
 const allowed=new Set(sourceUrls.map(canonicalSourceUrl).filter(Boolean)); const seen=new Set<string>();
 const items:ChannelItem[]=[];
 for(const v of raw){
  if(!v||typeof v!=='object')continue;
  const x=v as Record<string,unknown>,url=canonicalSourceUrl(x.url);
  if(!url||!allowed.has(url)||seen.has(url))continue;
  const host=new URL(url).hostname;
  if(spec.domains.length&&!spec.domains.some(d=>host===d||host.endsWith('.'+d)))continue;
  if(typeof x.summary!=='string'||!x.summary.trim()||x.summary.length>700||typeof x.title!=='string'||x.title.length>240)continue;
  const objectIds=Array.isArray(x.objectIds)?[...new Set(x.objectIds.filter((id):id is string=>typeof id==='string'&&spec.objectIds.includes(id)))]:[];
  if(!objectIds.length)continue;
  const date=typeof x.publishedAt==='string'&&x.publishedAt?new Date(x.publishedAt):null;
  if(date&&(Number.isNaN(date.getTime())||date.getTime()>now.getTime()+86400000||date.getTime()<now.getTime()-spec.lookbackDays*86400000))continue;
  items.push({url,summary:x.summary.trim(),title:x.title.trim(),source:host,
   author:typeof x.author==='string'?x.author.slice(0,200):null,publishedAt:date?.toISOString()??null,objectIds});seen.add(url);
 }
 return items.slice(0,spec.maxItems);
}

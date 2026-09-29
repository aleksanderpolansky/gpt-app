import 'server-only';
import OpenAI from 'openai';
import { auth0 } from '../../../lib/auth0';
import { resolveActiveActorContext } from '../../../lib/actor-context';
import { supabase } from '../../../lib/supabase';
import { CHANNEL_MODEL, canonicalSourceUrl, channelSpecWithDefaults, cleanSummary, validateChannelResults, type ChannelRow, type ChannelSpec, type ChannelItem, type OntologyOption } from './contracts';
import { channelSearchRequest } from './search';
export type ChannelIdentity={user:string;actor:string;admin:boolean};
export async function channelIdentity():Promise<ChannelIdentity|null>{
 const session=await auth0.getSession();if(!session?.user?.sub)return null;
 const ctx=await resolveActiveActorContext(session.user.sub);
 const {data,error}=await supabase.from('platform_admins').select('id').eq('app_user_id',ctx.appUserId).eq('status','active').in('role',['owner','admin']).limit(1);
 if(error)throw Error('CHANNEL_IDENTITY_UNAVAILABLE');
 return {user:ctx.appUserId,actor:ctx.actorId,admin:Boolean(data?.length)};
}
export async function channelCommand(who:ChannelIdentity,action:string,id:string|null,body:unknown={}){
 const {data,error}=await supabase.rpc('ai_channel_command_v1',{p_user:who.user,p_actor:who.actor,p_action:action,p_id:id,p_body:body});
 if(error)throw Error(error.message);return data;
}
export async function listChannels(who:ChannelIdentity|null){
 let q=supabase.from('ai_channels_v1').select('*').neq('status','archived').order('created_at',{ascending:false});
 q=who?q.or(`scope.eq.public,owner_user_id.eq.${who.user}`):q.eq('scope','public');
 const {data,error}=await q.limit(500);if(error)throw Error('CHANNEL_SCHEMA_REQUIRED');
 const channels=(data??[]) as ChannelRow[];
 const preferences=new Map<string,boolean>();
 if(who){const r=await supabase.from('ai_channel_preferences_v1').select('channel_id,enabled').eq('owner_user_id',who.user);
 if(r.error)throw Error('CHANNEL_PREFERENCES_FAILED');for(const p of r.data??[])preferences.set(p.channel_id,p.enabled);}
 const result=channels.map(c=>({...c,spec:channelSpecWithDefaults(c.spec),enabled:preferences.get(c.id)??true,canManage:Boolean(who&&(c.scope==='public'?who.admin:c.owner_user_id===who.user)),runningRunId:null as string|null}));
 const managed=result.filter(c=>c.canManage).map(c=>c.id);
 if(managed.length){
  const {data:runs,error:runError}=await supabase.from('ai_channel_runs_v1').select('id,channel_id').in('channel_id',managed).eq('status','running');
  if(runError)throw Error('CHANNEL_HISTORY_FAILED');
  for(const r of runs??[]){const c=result.find(x=>x.id===r.channel_id);if(c)c.runningRunId=r.id;}
 }
 return result;
}
export async function ontologyOptions(search='',ids?:string[]):Promise<OntologyOption[]>{
 let q=supabase.from('value_objects').select('id,title').eq('scope_code','global').eq('status','active')
 .eq('visibility_code','public').eq('privacy_class_code','public_ontology').eq('ui_visibility','visible');
 if(ids)q=q.in('id',ids);else if(search)q=q.ilike('title',`%${search.replace(/[\\%_]/g,'')}%`);
 const {data,error}=await q.order('title').limit(ids?8:60);if(error)throw Error('CHANNEL_ONTOLOGY_FAILED');return data??[];
}
export async function managedChannel(who:ChannelIdentity,id:string){
 const {data,error}=await supabase.from('ai_channels_v1').select('*').eq('id',id).neq('status','archived').maybeSingle();
 const c=data as ChannelRow|null;
 if(error||!c||!(c.scope==='public'?who.admin:c.owner_user_id===who.user))throw Error('CHANNEL_ACCESS_DENIED');
 return {...c,spec:channelSpecWithDefaults(c.spec)} as ChannelRow;
}
function collectSourceUrls(output:unknown):string[]{
 const urls:string[]=[];
 function walk(v:unknown){if(!v||typeof v!=='object')return;
 if(Array.isArray(v)){v.forEach(walk);return;}
 const r=v as Record<string,unknown>;
 if(typeof r.url==='string'&&canonicalSourceUrl(r.url))urls.push(r.url);
 for(const [k,x] of Object.entries(r))if(k!=='text')walk(x);
 }
 walk(output);return urls;
}
type StoredRun={id:string;channel_id:string;kind:'test'|'scheduled';status:string;revision:number;spec_snapshot:ChannelSpec;items:ChannelItem[];usage:Record<string,unknown>;error_code:string|null;started_at:string;provider_response_id:string|null};
function provider(){
 if(!process.env.OPENAI_API_KEY)throw Error('CHANNEL_API_KEY_MISSING');
 return new OpenAI({apiKey:process.env.OPENAI_API_KEY,timeout:25000,maxRetries:0});
}
function errorCode(error:unknown){
 return error instanceof OpenAI.APIError?`OPENAI_${error.status??'NETWORK'}`:error instanceof Error&&/^CHANNEL_/.test(error.message)?error.message:'CHANNEL_COLLECTION_FAILED';
}
async function storedRun(id:string,runId:string):Promise<StoredRun>{
 const {data,error}=await supabase.from('ai_channel_runs_v1').select('*').eq('channel_id',id).eq('id',runId).maybeSingle();
 if(error||!data)throw Error('CHANNEL_RUN_NOT_FOUND');return data as StoredRun;
}
async function runResult(who:ChannelIdentity,id:string,runId:string){
 let r=await storedRun(id,runId);
 if(r.status==='ready'&&r.kind==='scheduled'){
  await channelCommand(who,'publish',id,{runId});r=await storedRun(id,runId);
 }
 return {runId:r.id,status:r.status,kind:r.kind,items:r.status==='running'?[]:r.items,usage:r.usage,error:r.error_code};
}
async function completeResponse(who:ChannelIdentity,id:string,r:StoredRun,response:OpenAI.Responses.Response){
 if(response.status==='queued'||response.status==='in_progress')return runResult(who,id,r.id);
 const searches=response.output.filter(x=>x.type==='web_search_call').length;
 const usage:Record<string,unknown>={...r.usage,responseId:response.id,model:response.model,tokens:response.usage,webSearchCalls:searches,providerStatus:response.status};
 let items:ChannelItem[]=[],failure:string|undefined;
 try{
  if(response.status!=='completed'||!searches)throw Error('CHANNEL_SEARCH_INCOMPLETE');
  // retrieve() output_text is SDK-dependent; reconstruct from output when necessary.
  const text=response.output_text||response.output.flatMap(x=>x.type==='message'?x.content.filter(t=>t.type==='output_text').map(t=>t.text):[]).join('');
  const parsed=JSON.parse(text) as {items:unknown;coverageSummary?:unknown};
  const validated=validateChannelResults(parsed.items,channelSpecWithDefaults(r.spec_snapshot),collectSourceUrls(response.output));
  items=validated.items;usage.validation=validated.diagnostics;
  usage.coverageSummary=typeof parsed.coverageSummary==='string'?cleanSummary(parsed.coverageSummary).slice(0,1200):'';
 }catch(error){failure=errorCode(error);}
 // Idempotent DB completion: concurrent browser/scheduler polls cannot overwrite terminal runs.
 await channelCommand(who,'finish',id,{runId:r.id,items,usage,...(failure?{error:failure}:{})});
 return runResult(who,id,r.id);
}
function providerRuntimeSpec(spec:ChannelSpec,admin:boolean):ChannelSpec{
 const full=channelSpecWithDefaults(spec),detailed=full.searchDepth==='detailed';
 if(admin)return full;
 // Public provider-cost knobs are administrator-only. Non-admin users can still narrow topic/coverage/category,
 // but cannot silently select a more expensive model or larger provider budget through a handcrafted request.
 return {...full,model:CHANNEL_MODEL,reasoningEffort:detailed?'medium':'low',maxToolCalls:detailed?10:4,
  searchContextSize:detailed?'high':'medium',maxOutputTokens:detailed?12000:6500};
}
export async function runChannel(who:ChannelIdentity,id:string,kind:'test'|'scheduled'){
 if(process.env.AI_ENABLED==='false')throw Error('CHANNEL_AI_DISABLED');
 const client=provider(),c=await managedChannel(who,id),requestSpec=providerRuntimeSpec(c.spec,who.admin);
 const capability=await channelCommand(who,'capabilities',null).catch(()=>{throw Error('CHANNEL_SCHEMA_V2_REQUIRED');});
 if(capability?.version!==2)throw Error('CHANNEL_SCHEMA_V2_REQUIRED');
 const objects=await ontologyOptions('',c.spec.objectIds);
 if(objects.length!==c.spec.objectIds.length)throw Error('CHANNEL_OBJECT_NOT_PUBLIC_ONTOLOGY');
 const started=await channelCommand(who,'start',id,{kind,revision:c.revision});const runId=String(started.runId);
 let response:OpenAI.Responses.Response|undefined;
 const usage:Record<string,unknown>={model:requestSpec.model??CHANNEL_MODEL,searchDepth:requestSpec.searchDepth??'quick',coverageMode:requestSpec.coverageMode??'ranked',
  walletDebited:false,billing:'platform_provider_account',providerAttempted:true,background:true,maxToolCalls:requestSpec.maxToolCalls,searchContextSize:requestSpec.searchContextSize};
 try{
  response=await client.responses.create(channelSearchRequest(requestSpec,objects));
  usage.responseId=response.id;
  await channelCommand(who,'attach_provider',id,{runId,responseId:response.id,usage});
 }catch(error){
  if(response)await client.responses.cancel(response.id).catch(()=>{});
  await channelCommand(who,'finish',id,{runId,error:errorCode(error),usage}).catch(()=>{});
  throw error;
 }
 // No long-lived server task. Provider ID is persisted before returning to the browser.
 return completeResponse(who,id,await storedRun(id,runId),response);
}
export async function pollChannel(who:ChannelIdentity,id:string,runId:string){
 await managedChannel(who,id);const r=await storedRun(id,runId);
 if(r.status!=='running')return runResult(who,id,runId);
 const client=provider();
 if(Date.now()-new Date(r.started_at).getTime()>30*60000){
  if(r.provider_response_id)await client.responses.cancel(r.provider_response_id).catch(()=>{});
  await channelCommand(who,'finish',id,{runId,error:'CHANNEL_RUN_EXPIRED',usage:r.usage});
  return runResult(who,id,runId);
 }
 if(!r.provider_response_id){
  // Another request may still be starting the background response.
  if(Date.now()-new Date(r.started_at).getTime()>120000){
   await channelCommand(who,'finish',id,{runId,error:'CHANNEL_START_INTERRUPTED',usage:r.usage});
  }
  return runResult(who,id,runId);
 }
 let response:OpenAI.Responses.Response;
 try{response=await client.responses.retrieve(r.provider_response_id,{include:['web_search_call.action.sources']});}
 catch(error){
  // A temporary provider/network failure must not lose a paid in-progress response.
  if(error instanceof OpenAI.APIError&&error.status===404){
   await channelCommand(who,'finish',id,{runId,error:'CHANNEL_PROVIDER_RESULT_EXPIRED',usage:r.usage});return runResult(who,id,runId);
  }
  throw error;
 }
 return completeResponse(who,id,r,response);
}
export async function cancelChannel(who:ChannelIdentity,id:string,runId:string){
 await managedChannel(who,id);const r=await storedRun(id,runId);
 if(r.status!=='running')return runResult(who,id,runId);
 // Do not cancel a create request before its provider ID has been durably bound.
 if(!r.provider_response_id)throw Error('CHANNEL_START_IN_PROGRESS');
 await provider().responses.cancel(r.provider_response_id);
 await channelCommand(who,'finish',id,{runId,error:'CHANNEL_CANCELLED',usage:r.usage});
 return runResult(who,id,runId);
}
export async function setChannelItemVisibility(who:ChannelIdentity,id:string,messageObjectId:string,hidden:boolean){
 await managedChannel(who,id);
 const {data:link,error:linkError}=await supabase.from('ai_channel_items_v1').select('message_object_id').eq('channel_id',id).eq('message_object_id',messageObjectId).maybeSingle();
 if(linkError||!link)throw Error('CHANNEL_ITEM_NOT_FOUND');
 const {data:message,error:messageError}=await supabase.from('message_objects').select('id,metadata_json,lifecycle_status').eq('id',messageObjectId).eq('origin_provider_code','arctor_ai_channel').maybeSingle();
 if(messageError||!message)throw Error('CHANNEL_ITEM_NOT_FOUND');
 const previous=message.metadata_json&&typeof message.metadata_json==='object'&&!Array.isArray(message.metadata_json)?message.metadata_json as Record<string,unknown>:{};
 const metadata={...previous,ai_channel_hidden:hidden,ai_channel_hidden_at:hidden?new Date().toISOString():null,ai_channel_hidden_by:hidden?who.user:null};
 const {error:updateError}=await supabase.from('message_objects').update({lifecycle_status:hidden?'withdrawn':'active',metadata_json:metadata}).eq('id',messageObjectId).eq('origin_provider_code','arctor_ai_channel');
 if(updateError)throw Error('CHANNEL_ITEM_VISIBILITY_FAILED');
 return {ok:true,hidden};
}
export type AiFeedItem={id:string;content_text:string;canonical_url:string;source_published_at:string|null;activated_at:string;author_display_name_snapshot:string|null;metadata_json:Record<string,unknown>;channelId:string;channelName:string;canManage:boolean;feedPreviewCount:number};
export async function readChannelFeed():Promise<AiFeedItem[]>{
 const who=await channelIdentity();const channels=(await listChannels(who)).filter(c=>c.enabled);
 if(!channels.length)return [];
 const {data:links,error:le}=await supabase.from('ai_channel_items_v1').select('message_object_id,channel_id').in('channel_id',channels.map(c=>c.id)).order('created_at',{ascending:false}).limit(500);
 if(le)throw Error('CHANNEL_FEED_FAILED');if(!links?.length)return [];
 const {data,error}=await supabase.from('message_objects').select('id,content_text,canonical_url,source_published_at,activated_at,author_display_name_snapshot,metadata_json')
 .in('id',links.map(x=>x.message_object_id)).eq('origin_provider_code','arctor_ai_channel').eq('lifecycle_status','active').order('activated_at',{ascending:false}).limit(60);
 if(error)throw Error('CHANNEL_FEED_FAILED');
 const channelById=new Map<string,ChannelRow>(channels.map(c=>[c.id,c] as const));
 const linkRows=(links??[]) as Array<{message_object_id:string;channel_id:string}>;
 const ids=new Map<string,string>(linkRows.map(x=>[x.message_object_id,x.channel_id] as const));
 type BaseFeedItem=Omit<AiFeedItem,'channelId'|'channelName'|'canManage'|'feedPreviewCount'>;
 return ((data??[]) as BaseFeedItem[]).filter(x=>Boolean(canonicalSourceUrl(x.canonical_url))).map(x=>{
  const channelId=ids.get(x.id)??'',channel=channelById.get(channelId);
  return {...x,channelId,channelName:channel?.name??'AI',canManage:Boolean(channel?.canManage),feedPreviewCount:channel?.spec.feedPreviewCount??1};
 });
}

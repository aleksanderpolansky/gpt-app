import 'server-only';
import { auth0 } from '../../../lib/auth0';
import { resolveActiveActorContext } from '../../../lib/actor-context';
import { supabase } from '../../../lib/supabase';
import { CHANNEL_MODEL, canonicalSourceUrl, channelBillingTierForModel, channelReasoningForModel, channelSpecWithDefaults, cleanSummary, validateChannelResults, type ChannelRow, type ChannelSpec, type ChannelItem, type OntologyOption } from './contracts';
import { channelSearchRequest } from './search';
import {
 AI_BACKGROUND_WEB_SEARCH_USD_PER_CALL,
 cancelBillableAiBackgroundProvider,
 pollBillableAiBackgroundResponse,
 startBillableAiBackgroundResponse,
 type AiBackgroundPollResult,
 type AiBackgroundReservationContext,
 type AiBackgroundStartResult,
} from '../ai-billing/backgroundGateway.server';
import {
 resolveAiChannelCreationBillingUser,
 resolveStoredAiChannelBillingUser,
} from './billingPolicy.server';
import type { ChannelBillingPolicy } from './contracts';
export type ChannelIdentity={user:string;actor:string;admin:boolean};
export async function channelIdentity():Promise<ChannelIdentity|null>{
 const session=await auth0.getSession();if(!session?.user?.sub)return null;
 const ctx=await resolveActiveActorContext(session.user.sub);
 const {data,error}=await supabase.from('platform_admins').select('id').eq('app_user_id',ctx.appUserId).eq('status','active').in('role',['owner','admin']).limit(1);
 if(error)throw Error('CHANNEL_IDENTITY_UNAVAILABLE');
 return {user:ctx.appUserId,actor:ctx.actorId,admin:Boolean(data?.length)};
}
export type ChannelCreationAccess={
 allowed:boolean;
 reason:'available'|'no_wallet'|'wallet_inactive'|'insufficient_balance'|'unavailable';
 availableEur:number|null;
 billingUserId:string|null;
 billingPolicy:ChannelBillingPolicy|null;
};
function walletNumber(value:unknown):number|null{
 const n=typeof value==='number'?value:typeof value==='string'&&value.trim()?Number(value):Number.NaN;
 return Number.isFinite(n)&&n>=0?n:null;
}
export async function channelCreationAccess(who:ChannelIdentity):Promise<ChannelCreationAccess>{
 let billing;
 try{billing=await resolveAiChannelCreationBillingUser(who);}
 catch{return {allowed:false,reason:'unavailable',availableEur:null,billingUserId:null,billingPolicy:null};}
 const {billingUserId,billingPolicy}=billing;
 const {data,error}=await supabase.from('ai_credit_wallets').select('balance_eur,reserved_eur,status').eq('app_user_id',billingUserId).maybeSingle();
 if(error)return {allowed:false,reason:'unavailable',availableEur:null,billingUserId,billingPolicy};
 if(!data)return {allowed:false,reason:'no_wallet',availableEur:0,billingUserId,billingPolicy};
 const balance=walletNumber(data.balance_eur),reserved=walletNumber(data.reserved_eur);
 if(balance===null||reserved===null||reserved>balance)return {allowed:false,reason:'unavailable',availableEur:null,billingUserId,billingPolicy};
 const availableEur=Math.max(balance-reserved,0);
 if(data.status!=='active')return {allowed:false,reason:'wallet_inactive',availableEur,billingUserId,billingPolicy};
 if(availableEur<=0)return {allowed:false,reason:'insufficient_balance',availableEur,billingUserId,billingPolicy};
 return {allowed:true,reason:'available',availableEur,billingUserId,billingPolicy};
}
export async function requireChannelCreationBalance(who:ChannelIdentity):Promise<ChannelCreationAccess>{
 const access=await channelCreationAccess(who);
 if(access.allowed)return access;
 if(access.reason==='unavailable')throw Error('CHANNEL_CREATE_BALANCE_UNAVAILABLE');
 throw Error('CHANNEL_CREATE_BALANCE_REQUIRED');
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
type StoredRun={id:string;channel_id:string;kind:'test'|'scheduled';status:string;revision:number;spec_snapshot:ChannelSpec;items:ChannelItem[];usage:Record<string,unknown>;error_code:string|null;started_at:string;provider_response_id:string|null;billing_user_id:string|null;ai_usage_event_id:string|null;billing_request_idempotency_key:string|null};

type BillingEventState={status:string;openaiResponseId:string|null;errorCode:string|null};

function errorCode(error:unknown){
 const message=error instanceof Error?error.message:String(error??'');
 const explicit=message.match(/^(CHANNEL_[A-Z0-9_]+|AI_BILLING_[A-Z0-9_]+|AI_PROVIDER_[A-Z0-9_]+|OPENAI_[A-Z0-9_]+)/)?.[0];
 if(explicit)return explicit;
 if(error&&typeof error==='object'){
  const status=Number((error as {status?:unknown}).status);
  if(Number.isInteger(status)&&status>=100&&status<=599)return `OPENAI_${status}`;
 }
 return 'CHANNEL_COLLECTION_FAILED';
}
async function storedRun(id:string,runId:string):Promise<StoredRun>{
 const {data,error}=await supabase.from('ai_channel_runs_v1').select('*').eq('channel_id',id).eq('id',runId).maybeSingle();
 if(error||!data)throw Error('CHANNEL_RUN_NOT_FOUND');return data as StoredRun;
}
async function billingEventState(r:StoredRun):Promise<BillingEventState|null>{
 if(!r.ai_usage_event_id)return null;
 const {data,error}=await supabase.from('ai_usage_events').select('status,openai_response_id,error_code').eq('id',r.ai_usage_event_id).eq('app_user_id',r.billing_user_id??'').maybeSingle();
 if(error)throw Error('CHANNEL_BILLING_STATE_UNAVAILABLE');
 if(!data)return null;
 return {status:String(data.status??''),openaiResponseId:typeof data.openai_response_id==='string'?data.openai_response_id:null,errorCode:typeof data.error_code==='string'?data.error_code:null};
}
async function runResult(who:ChannelIdentity,id:string,runId:string){
 let r=await storedRun(id,runId);
 if(r.status==='ready'&&r.kind==='scheduled'){
  await channelCommand(who,'publish',id,{runId});r=await storedRun(id,runId);
 }
 return {runId:r.id,status:r.status,kind:r.kind,items:r.status==='running'?[]:r.items,usage:r.usage,error:r.error_code};
}
function billedUsage(r:StoredRun,poll:AiBackgroundPollResult):Record<string,unknown>{
 return {...r.usage,responseId:poll.response.id,model:poll.response.model,tokens:poll.response.usage,webSearchCalls:poll.billing.webSearchCalls,providerStatus:poll.providerStatus,
  walletDebited:Boolean((poll.billing.walletDebitEur??0)>0),billing:'user_ai_eur',billingUserId:r.billing_user_id,
  usageEventId:poll.billing.usageEventId,actualCostEur:poll.billing.actualCostEur,tokenCostEur:poll.billing.tokenCostEur,
  toolCostEur:poll.billing.toolCostEur,walletDebitEur:poll.billing.walletDebitEur,reservationReleasedEur:poll.billing.reservationReleasedEur,
  billingStatus:poll.billing.usageStatus,billingPhase:poll.phase};
}
async function completeResponse(who:ChannelIdentity,id:string,r:StoredRun,poll:AiBackgroundPollResult,failureOverride?:string){
 if(poll.phase==='pending')return runResult(who,id,r.id);
 const response=poll.response;
 const usage=billedUsage(r,poll);
 let items:ChannelItem[]=[],failure:string|undefined=failureOverride;
 try{
  if(failure)throw Error(failure);
  if(response.status!=='completed'||!poll.billing.webSearchCalls)throw Error('CHANNEL_SEARCH_INCOMPLETE');
  const text=response.output_text||response.output.flatMap(x=>x.type==='message'?x.content.filter(t=>t.type==='output_text').map(t=>t.text):[]).join('');
  const parsed=JSON.parse(text) as {items:unknown;coverageSummary?:unknown};
  const validated=validateChannelResults(parsed.items,channelSpecWithDefaults(r.spec_snapshot),collectSourceUrls(response.output));
  items=validated.items;usage.validation=validated.diagnostics;
  usage.coverageSummary=typeof parsed.coverageSummary==='string'?cleanSummary(parsed.coverageSummary).slice(0,1200):'';
 }catch(error){failure=failure??errorCode(error);}
 await channelCommand(who,'finish',id,{runId:r.id,items,usage,...(failure?{error:failure}:{})});
 return runResult(who,id,r.id);
}
function providerRuntimeSpec(spec:ChannelSpec):ChannelSpec{
 const full=channelSpecWithDefaults(spec),detailed=full.searchDepth==='detailed';
 return {...full,model:full.model??CHANNEL_MODEL,reasoningEffort:full.reasoningEffort??channelReasoningForModel(full.model??CHANNEL_MODEL),
  maxToolCalls:Math.min(full.maxToolCalls??(detailed?10:4),20),searchContextSize:full.searchContextSize??(detailed?'high':'medium'),
  maxOutputTokens:Math.min(full.maxOutputTokens??(detailed?12000:6500),20000)};
}
function estimateProviderInputTokens(request:unknown){
 let serialized='';
 try{serialized=JSON.stringify(request);}catch{}
 return Math.max(256,Math.min(200000,Math.ceil(serialized.length/3)));
}
function requestIdempotencyKey(id:string,runId:string){return `ai-channel:${id}:${runId}`;}
async function bindRunBilling(c:ChannelRow,r:StoredRun,billingUserId:string,billing:AiBackgroundReservationContext){
 const {error}=await supabase.rpc('bind_ai_channel_run_billing_v1',{
  p_channel_id:c.id,p_run_id:r.id,p_billing_user_id:billingUserId,p_usage_event_id:billing.usageEventId,p_request_idempotency_key:billing.requestIdempotencyKey
 });
 if(error)throw Error('CHANNEL_BILLING_RUN_BIND_FAILED:'+error.message);
}
async function bindProviderBilling(c:ChannelRow,r:StoredRun,billingUserId:string,start:AiBackgroundStartResult,usage:Record<string,unknown>){
 const {error}=await supabase.rpc('bind_ai_channel_provider_response_v1',{
  p_channel_id:c.id,p_run_id:r.id,p_billing_user_id:billingUserId,p_usage_event_id:start.billing.usageEventId,p_response_id:start.response.id,p_usage:usage
 });
 if(error)throw Error('CHANNEL_BILLING_PROVIDER_BIND_FAILED:'+error.message);
}
async function extendRunLock(c:ChannelRow){
 try{await supabase.from('ai_channels_v1').update({lock_until:new Date(Date.now()+5*60000).toISOString()}).eq('id',c.id);}catch{}
}
async function startOrResumeBackground(c:ChannelRow,r:StoredRun){
 const channelBilling=await resolveStoredAiChannelBillingUser(c);
 if(r.billing_user_id&&r.billing_user_id!==channelBilling.billingUserId)throw Error('CHANNEL_BILLING_OWNER_MISMATCH');
 const requestSpec=providerRuntimeSpec(r.spec_snapshot),objects=await ontologyOptions('',requestSpec.objectIds);
 if(objects.length!==requestSpec.objectIds.length)throw Error('CHANNEL_OBJECT_NOT_PUBLIC_ONTOLOGY');
 const model=requestSpec.model??CHANNEL_MODEL,tier=channelBillingTierForModel(model);
 if(!tier)throw Error('CHANNEL_MODEL_INVALID');
 const request=channelSearchRequest(requestSpec,objects,new Date(r.started_at));
 const idempotencyKey=requestIdempotencyKey(c.id,r.id);
 const start=await startBillableAiBackgroundResponse({
  billingUserId:channelBilling.billingUserId,requestIdempotencyKey:idempotencyKey,
  routePath:r.kind==='scheduled'?'/api/maintenance/ai-channels':'/api/ai-channels',operationKind:'ai_channel',
  modelName:model,tierCode:tier,estimatedInputTokens:estimateProviderInputTokens(request),
  estimatedOutputTokens:requestSpec.maxOutputTokens??6500,
  estimatedAdditionalProviderCostUsd:(requestSpec.maxToolCalls??4)*AI_BACKGROUND_WEB_SEARCH_USD_PER_CALL,
  preflightSafetyMultiplier:1.25,providerRequest:request,requestTimeoutMs:25000,maxRetries:0,
  requestMetadata:{channelId:c.id,channelRunId:r.id,channelRunKind:r.kind,channelRevision:r.revision,channelOwnerUserId:c.owner_user_id,
   channelBillingUserId:channelBilling.billingUserId,channelBillingPolicy:channelBilling.billingPolicy},
  onReserved:async billing=>bindRunBilling(c,r,channelBilling.billingUserId,billing),
 });
 const usage:Record<string,unknown>={...r.usage,model,searchDepth:requestSpec.searchDepth??'quick',coverageMode:requestSpec.coverageMode??'ranked',
  walletDebited:false,billing:'user_ai_eur',billingUserId:channelBilling.billingUserId,billingPolicy:channelBilling.billingPolicy,
  usageEventId:start.billing.usageEventId,walletId:start.billing.walletId,
  reservationEur:start.billing.reservationEur,estimatedMaxCostEur:start.billing.estimatedMaxCostEur,providerAttempted:true,background:true,
  maxToolCalls:requestSpec.maxToolCalls,searchContextSize:requestSpec.searchContextSize,responseId:start.response.id};
 await bindProviderBilling(c,r,channelBilling.billingUserId,start,usage);
 return {start,requestSpec};
}
async function finishStartFailure(who:ChannelIdentity,c:ChannelRow,r:StoredRun,error:unknown){
 const latest=await storedRun(c.id,r.id);
 const billing=await billingEventState(latest).catch(()=>null);
 if(billing&&billing.status!=='openai_failed'){
  await extendRunLock(c);
  return runResult(who,c.id,r.id);
 }
 const code=billing?.errorCode??errorCode(error);
 await channelCommand(who,'finish',c.id,{runId:r.id,error:code,usage:{...latest.usage,billing:'user_ai_eur',billingUserId:latest.billing_user_id??c.billing_user_id,billingPolicy:c.billing_policy}}).catch(()=>{});
 throw error;
}
async function pollBilledRun(who:ChannelIdentity,c:ChannelRow,r:StoredRun,failureOverride?:string){
 let current=r;
 if(!current.ai_usage_event_id||!current.provider_response_id){
  const state=await billingEventState(current).catch(()=>null);
  if(state?.status==='openai_failed'&&!state.openaiResponseId){
   await channelCommand(who,'finish',c.id,{runId:current.id,error:state.errorCode??'CHANNEL_COLLECTION_FAILED',usage:current.usage}).catch(()=>{});
   return runResult(who,c.id,current.id);
  }
  try{await startOrResumeBackground(c,current);}catch(error){return finishStartFailure(who,c,current,error);}
  current=await storedRun(c.id,current.id);
 }
 if(!current.ai_usage_event_id||!current.billing_user_id)throw Error('CHANNEL_BILLING_LINK_MISSING');
 const poll=await pollBillableAiBackgroundResponse({
  billingUserId:current.billing_user_id,usageEventId:current.ai_usage_event_id,providerResponseId:current.provider_response_id,
  include:['web_search_call.action.sources']
 });
 return completeResponse(who,c.id,current,poll,failureOverride);
}
export async function runChannel(who:ChannelIdentity,id:string,kind:'test'|'scheduled'){
 if(process.env.AI_ENABLED==='false')throw Error('CHANNEL_AI_DISABLED');
 const c=await managedChannel(who,id);
 // Resolve before creating a run: unresolved payer means no run row, no reservation and no provider call.
 await resolveStoredAiChannelBillingUser(c);
 const capability=await channelCommand(who,'capabilities',null).catch(()=>{throw Error('CHANNEL_SCHEMA_V2_REQUIRED');});
 if(capability?.version!==2)throw Error('CHANNEL_SCHEMA_V2_REQUIRED');
 const started=await channelCommand(who,'start',id,{kind,revision:c.revision}),runId=String(started.runId);
 const r=await storedRun(id,runId);
 let start:AiBackgroundStartResult;
 try{({start}=await startOrResumeBackground(c,r));}
 catch(error){return finishStartFailure(who,c,r,error);}
 if(start.response.status==='queued'||start.response.status==='in_progress')return runResult(who,id,runId);
 return pollBilledRun(who,c,await storedRun(id,runId));
}
export async function pollChannel(who:ChannelIdentity,id:string,runId:string){
 const c=await managedChannel(who,id),r=await storedRun(id,runId);
 if(r.status!=='running')return runResult(who,id,runId);
 if(Date.now()-new Date(r.started_at).getTime()>30*60000){
  try{
   let current=r;
   if(!current.provider_response_id){
    await startOrResumeBackground(c,current);current=await storedRun(id,runId);
   }
   if(!current.ai_usage_event_id||!current.billing_user_id)throw Error('CHANNEL_BILLING_LINK_MISSING');
   await cancelBillableAiBackgroundProvider({billingUserId:current.billing_user_id,usageEventId:current.ai_usage_event_id,providerResponseId:current.provider_response_id});
   return pollBilledRun(who,c,current,'CHANNEL_RUN_EXPIRED');
  }catch(error){await extendRunLock(c);throw error;}
 }
 try{return await pollBilledRun(who,c,r);}
 catch(error){await extendRunLock(c);throw error;}
}
export async function cancelChannel(who:ChannelIdentity,id:string,runId:string){
 const c=await managedChannel(who,id),r=await storedRun(id,runId);
 if(r.status!=='running')return runResult(who,id,runId);
 if(!r.ai_usage_event_id||!r.billing_user_id||!r.provider_response_id)throw Error('CHANNEL_START_IN_PROGRESS');
 await cancelBillableAiBackgroundProvider({billingUserId:r.billing_user_id,usageEventId:r.ai_usage_event_id,providerResponseId:r.provider_response_id});
 try{return await pollBilledRun(who,c,r,'CHANNEL_CANCELLED');}
 catch(error){await extendRunLock(c);throw error;}
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

import { NextResponse } from 'next/server';
import { channelCommand,channelIdentity,channelCreationAccess,requireChannelCreationBalance,listChannels,managedChannel,ontologyOptions,runChannel,pollChannel,cancelChannel,setChannelItemVisibility } from '@/lib/ai-channels/server';
import { CHANNEL_MODEL, parseChannelSpec } from '@/lib/ai-channels/contracts';
import { supabase } from '../../../../lib/supabase';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
const headers={'Cache-Control':'private, no-store'};
const UUID=/^[0-9a-f]{8}-[0-9a-f-]{27}$/i;
function failure(error:unknown){
 const message=error instanceof Error?error.message:'';
 const code=message.match(/(?:CHANNEL_[A-Z0-9_]+|OPENAI_[A-Z0-9_]+)/)?.[0]??'CHANNEL_REQUEST_FAILED';
 return NextResponse.json({error:code},{status:code==='CHANNEL_CREATE_BALANCE_REQUIRED'?402:code==='CHANNEL_CREATE_BALANCE_UNAVAILABLE'?503:/ACCESS_DENIED|ADMIN_REQUIRED/.test(code)?403:/NOT_FOUND/.test(code)?404:/BUSY|CONFLICT|LIMIT/.test(code)?409:400,headers});
}
export async function GET(request:Request){try{
 const who=await channelIdentity(),url=new URL(request.url);
 if(url.searchParams.has('objects')){
  if(!who)return NextResponse.json({error:'CHANNEL_LOGIN_REQUIRED'},{status:401,headers});
  return NextResponse.json({objects:await ontologyOptions((url.searchParams.get('objects')??'').slice(0,100))},{headers});
 }
 const history=url.searchParams.get('history');
 if(history){if(!who)throw Error('CHANNEL_ACCESS_DENIED');await managedChannel(who,history);
  const {data,error}=await supabase.from('ai_channel_runs_v1').select('id,kind,status,usage,error_code,published_count,started_at,finished_at,items,revision').eq('channel_id',history).order('started_at',{ascending:false}).limit(10);
  if(error)throw Error('CHANNEL_HISTORY_FAILED');return NextResponse.json({runs:data},{headers});}
 const [channels,creationAccess]=await Promise.all([listChannels(who),who?channelCreationAccess(who):Promise.resolve(null)]);
 return NextResponse.json({signedIn:Boolean(who),admin:who?.admin??false,creationAccess,channels:channels.map(c=>({id:c.id,name:c.name,scope:c.scope,status:c.status,spec:c.spec,revision:c.revision,enabled:c.enabled,canManage:c.canManage,last_run_at:c.last_run_at,last_error:c.last_error,next_run_at:c.next_run_at,runningRunId:c.runningRunId}))},{headers});
 }catch(e){return failure(e);}}
export async function POST(request:Request){try{
 // JSON-only same-origin browser mutations; never trust client user/actor/admin values.
 if(!request.headers.get('content-type')?.startsWith('application/json')||request.headers.get('origin')!==new URL(request.url).origin)throw Error('CHANNEL_ACCESS_DENIED');
 const who=await channelIdentity();if(!who)return NextResponse.json({error:'CHANNEL_LOGIN_REQUIRED'},{status:401,headers});
 const text=await request.text();if(text.length>24000)throw Error('CHANNEL_FORM_TOO_LARGE');
 const body=JSON.parse(text) as Record<string,unknown>;
 const id=typeof body.id==='string'&&UUID.test(body.id)?body.id:null;
 if(body.action==='save'){
  if(!id)await requireChannelCreationBalance(who);
  const parsed=parseChannelSpec(body.spec);
  const safeSpec=who.admin?parsed:{...parsed,model:CHANNEL_MODEL,reasoningEffort:parsed.searchDepth==='detailed'?'medium':'low',maxToolCalls:parsed.searchDepth==='detailed'?10:4,searchContextSize:parsed.searchDepth==='detailed'?'high':'medium',maxOutputTokens:parsed.searchDepth==='detailed'?12000:6500};
  return NextResponse.json(await channelCommand(who,'save',id,safeSpec),{headers});
 }
 if(!id)throw Error('CHANNEL_NOT_FOUND');
 if(body.action==='preference'){
  if(typeof body.enabled!=='boolean')throw Error('CHANNEL_FORM_INVALID');
  return NextResponse.json(await channelCommand(who,'preference',id,{enabled:body.enabled}),{headers});}
 if(body.action==='item_visibility'){
  if(typeof body.messageObjectId!=='string'||!UUID.test(body.messageObjectId)||typeof body.hidden!=='boolean')throw Error('CHANNEL_FORM_INVALID');
  return NextResponse.json(await setChannelItemVisibility(who,id,body.messageObjectId,body.hidden),{headers});
 }
 await managedChannel(who,id);
 if(['poll','cancel'].includes(String(body.action))&&typeof body.runId==='string'&&UUID.test(body.runId)){
  return NextResponse.json(await (body.action==='poll'?pollChannel:cancelChannel)(who,id,body.runId),{headers});
 }
 if(body.action==='test')return NextResponse.json(await runChannel(who,id,'test'),{headers});
 if(body.action==='status'&&['active','paused','archived'].includes(String(body.status)))return NextResponse.json(await channelCommand(who,'status',id,{status:body.status}),{headers});
 if(body.action==='publish'&&typeof body.runId==='string'&&UUID.test(body.runId))return NextResponse.json(await channelCommand(who,'publish',id,{runId:body.runId}),{headers});
 throw Error('CHANNEL_ACTION_INVALID');
 }catch(e){return failure(e);}}

import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { runChannel,pollChannel } from '@/lib/ai-channels/server';
import type { ChannelRow } from '@/lib/ai-channels/contracts';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=180;
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET,auth=request.headers.get('authorization')??'';
 const expected=secret?`Bearer ${secret}`:'';
 if(!secret||Buffer.byteLength(auth)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(auth),Buffer.from(expected)))return NextResponse.json({error:'Unauthorized'},{status:401});
 if(process.env.AI_ENABLED==='false')return NextResponse.json({error:'AI_DISABLED'},{status:503});
 const now=new Date().toISOString();
 // Resume paid background requests before scheduling another batch.
 const {data:pending,error:pendingError}=await supabase.from('ai_channel_runs_v1').select('id,channel_id,revision,kind,status')
  .or('status.eq.running,and(status.eq.ready,kind.eq.scheduled)').gte('started_at',new Date(Date.now()-86400000).toISOString()).order('started_at').limit(20);
 if(pendingError)return NextResponse.json({error:'CHANNEL_SCHEDULER_DB_FAILED'},{status:503});
 const resumed=[];
 for(const r of pending??[]){
  if(resumed.length>=4)break;
  const {data:c}=await supabase.from('ai_channels_v1').select('*').eq('id',r.channel_id).maybeSingle();
  if(!c||c.status==='archived'||c.revision!==r.revision)continue;
  // Run these concurrently below: each only retrieves an existing provider response.
  resumed.push({r,c:c as ChannelRow});
 }
 const completed=await Promise.all(resumed.map(async({r,c})=>{
  try{const result=await pollChannel({user:c.owner_user_id,actor:c.creator_actor_id,admin:c.scope==='public'},c.id,r.id);
   return {id:c.id,runId:r.id,status:result.status};
  }catch{return {id:c.id,runId:r.id,status:'retry'};}
 }));
 const {data,error}=await supabase.from('ai_channels_v1').select('*').eq('status','active').lte('next_run_at',now)
 .or(`lock_until.is.null,lock_until.lt.${now}`).order('next_run_at').limit(4);
 if(error)return NextResponse.json({error:'CHANNEL_SCHEDULER_DB_FAILED'},{status:503});
 const results=await Promise.all(((data??[]) as ChannelRow[]).map(async c=>{
  const admin=c.scope==='public';
  try {const r=await runChannel({user:c.owner_user_id,actor:c.creator_actor_id,admin},c.id,'scheduled');return {id:c.id,ok:true,runId:r.runId};}
  catch{
   // Back off a permanently blocked/deleted owner too; avoid starving other due channels.
   await supabase.from('ai_channels_v1').update({next_run_at:new Date(Date.now()+3600000).toISOString(),last_error:'CHANNEL_SCHEDULED_RUN_FAILED'})
    .eq('id',c.id).eq('next_run_at',c.next_run_at);
   return {id:c.id,ok:false};
  }
 }));
 return NextResponse.json({results,completed,batchLimit:4},{headers:{'Cache-Control':'no-store'}});
}

import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { runChannel } from '@/lib/ai-channels/server';
import type { ChannelRow } from '@/lib/ai-channels/contracts';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=180;
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET,auth=request.headers.get('authorization')??'';
 const expected=secret?`Bearer ${secret}`:'';
 if(!secret||Buffer.byteLength(auth)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(auth),Buffer.from(expected)))return NextResponse.json({error:'Unauthorized'},{status:401});
 if(process.env.AI_ENABLED==='false')return NextResponse.json({error:'AI_DISABLED'},{status:503});
 const now=new Date().toISOString();
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
 return NextResponse.json({results,batchLimit:4},{headers:{'Cache-Control':'no-store'}});
}

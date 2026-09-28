import { NextResponse } from "next/server";
import { getActivityUserContext } from "../../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type RouteContext={params:Promise<{id:string}>};
type Row=Record<string,unknown>;
const rec=(v:unknown):Row=>v&&typeof v==="object"&&!Array.isArray(v)?v as Row:{};
const str=(v:unknown)=>typeof v==="string"&&v.trim()?v.trim():null;
const bad=(error:string,status=400)=>NextResponse.json({ok:false,error},{status,headers:{"Cache-Control":"no-store"}});

function statusFor(message:string){
  if(/STALE_VERSION|HAS_DERIVED_DEPENDENTS|HAS_SNAPSHOT_DEPENDENTS|DERIVED_RESULT_READ_ONLY|ALREADY_DELETED/.test(message)) return 409;
  if(/NOT_OWNED|MEASURE_NOT_FOUND/.test(message)) return 404;
  return 400;
}

async function base(request:Request){
  let body:unknown; try{body=await request.json();}catch{return {ok:false as const,response:bad("Request body must be valid JSON")};}
  const r=rec(body), mutationId=str(r.mutationId), reason=str(r.reason), expectedUpdatedAt=str(r.expectedUpdatedAt);
  if(!mutationId||mutationId.length<8) return {ok:false as const,response:bad("mutationId is required")};
  if(!reason||reason.length<3) return {ok:false as const,response:bad("reason must contain at least 3 characters")};
  if(!expectedUpdatedAt||Number.isNaN(Date.parse(expectedUpdatedAt))) return {ok:false as const,response:bad("expectedUpdatedAt must be valid")};
  return {ok:true as const,r,mutationId,reason,expectedUpdatedAt};
}

async function mutate(args:{factId:string;userId:string;actorId:string;action:"edit"|"soft_delete";mutationId:string;reason:string;expectedUpdatedAt:string;valueNumeric?:number|null;valueText?:string|null;valueBoolean?:boolean|null;unit?:string|null}){
  const {data,error}=await supabase.rpc("mutate_activity_fact_v1",{
    p_owner_user_id:args.userId,p_owner_actor_id:args.actorId,p_fact_id:args.factId,p_action:args.action,
    p_expected_updated_at:args.expectedUpdatedAt,p_idempotency_key:args.mutationId,p_reason:args.reason,
    p_value_numeric:args.valueNumeric??null,p_value_text:args.valueText??null,p_value_boolean:args.valueBoolean??null,p_unit:args.unit??null,
  });
  if(error) return {ok:false as const,response:bad(error.message,statusFor(error.message))};
  return {ok:true as const,result:data};
}

export async function PATCH(request:Request,ctx:RouteContext){
  const {appUser,personActor,errorResponse}=await getActivityUserContext(); if(errorResponse)return errorResponse; if(!appUser||!personActor)return bad("Active actor context not found",500);
  const {id}=await ctx.params; if(!UUID_RE.test(id))return bad("fact id must be a UUID");
  const b=await base(request); if(!b.ok)return b.response;
  const unit=str(b.r.unit); if(!unit)return bad("unit is required");
  const n=typeof b.r.valueNumeric==="number"&&Number.isFinite(b.r.valueNumeric), t=typeof b.r.valueText==="string", z=typeof b.r.valueBoolean==="boolean";
  if(Number(n)+Number(t)+Number(z)!==1)return bad("Exactly one edited value is required");
  const m=await mutate({factId:id,userId:appUser.id,actorId:personActor.id,action:"edit",mutationId:b.mutationId,reason:b.reason,expectedUpdatedAt:b.expectedUpdatedAt,valueNumeric:n?b.r.valueNumeric as number:null,valueText:t?b.r.valueText as string:null,valueBoolean:z?b.r.valueBoolean as boolean:null,unit});
  if(!m.ok)return m.response; return NextResponse.json({ok:true,mutation:m.result},{headers:{"Cache-Control":"no-store"}});
}

export async function DELETE(request:Request,ctx:RouteContext){
  const {appUser,personActor,errorResponse}=await getActivityUserContext(); if(errorResponse)return errorResponse; if(!appUser||!personActor)return bad("Active actor context not found",500);
  const {id}=await ctx.params; if(!UUID_RE.test(id))return bad("fact id must be a UUID");
  const b=await base(request); if(!b.ok)return b.response;
  const m=await mutate({factId:id,userId:appUser.id,actorId:personActor.id,action:"soft_delete",mutationId:b.mutationId,reason:b.reason,expectedUpdatedAt:b.expectedUpdatedAt});
  if(!m.ok)return m.response; return NextResponse.json({ok:true,mutation:m.result},{headers:{"Cache-Control":"no-store"}});
}

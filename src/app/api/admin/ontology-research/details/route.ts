import {NextResponse} from "next/server";
import {requirePlatformAdmin,platformAdminErrorResponse} from "@/lib/admin/require-platform-admin";
import {supabase} from "../../../../../../lib/supabase";
import {localizeGlobalSystemValueObject} from "@/lib/reality-core/global-system-value-object-localization";
import {resolveLocalizedContentFieldsStrict} from "@/lib/localization/contentLocalization";
import {validLocale,ONTO_AI_PILOT_CONTRACT,type OntoLocale} from "@/lib/ontology-research/ontologyResearchV1";
import {ARCTOR_TYPICAL_ACTIVITY_METADATA_V1} from "@/lib/activity/typical-activity-catalog.server";

export const dynamic="force-dynamic";
export const runtime="nodejs";
const H={"Cache-Control":"private, no-store, max-age=0",Vary:"Cookie","X-Content-Type-Options":"nosniff"};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const failure=(code:string,status=400)=>NextResponse.json({ok:false,errorCode:code,contract:ONTO_AI_PILOT_CONTRACT},{status,headers:H});
type ObjRow={id:string;title:string|null;description:string|null;metadata_json:unknown;ontology_node_role_code:string|null;parent_value_object_id:string|null;canonical_key:string|null;branch_type_code:string|null};
const asRec=(v:unknown):Record<string,unknown>=>v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:{};
const txt=(v:unknown)=>typeof v==="string"?v:"";
function publicMetadata(v:unknown,depth=0):unknown{
  if(depth>4)return "[STRUCTURE_DEPTH_LIMIT]";
  if(Array.isArray(v))return v.slice(0,60).map(i=>publicMetadata(i,depth+1));
  if(v&&typeof v==="object")return Object.fromEntries(Object.entries(v as Record<string,unknown>)
    .filter(([k])=>!/(password|access[_-]?token|secret|auth[_-]?key|email|phone|createdBy|creatorId|actorId|adminId|userId|billing|apiKey)/i.test(k))
    .slice(0,60).map(([k,value])=>[k,publicMetadata(value,depth+1)]));
  if(typeof v==="string")return v.length>1000 ? `${v.slice(0,1000)} [LONG_FIELD_LIMIT]`:v;
  return v===null||typeof v==="number"||typeof v==="boolean"?v:null;
}
function safeMetadata(v:unknown){
  const filtered=publicMetadata(v);
  const size=JSON.stringify(filtered).length;
  return {value:size<=18000?filtered:null,displayed:size<=18000,sourceSize:size,
    notice:size>18000?"METADATA_TOO_LARGE_NOT_INCLUDED_REQUEST_FOCUSED_REVIEW":"FILTERED_NON_AUTHORITATIVE_METADATA"};
}
async function systemOn(id:string):Promise<ObjRow|null>{
  const result=await supabase.from("value_objects")
    .select("id,title,description,metadata_json,ontology_node_role_code,parent_value_object_id,canonical_key,branch_type_code")
    .eq("id",id).eq("scope_code","global").eq("origin_type_code","system_model").eq("status","active").maybeSingle();
  if(result.error)throw new Error("ON_READ_FAILED");
  return result.data as ObjRow|null;
}
async function inspectOn(id:string,locale:OntoLocale){
  const target=await systemOn(id);
  if(!target)return null;
  const parents:Array<{id:string;title:string;role:string}>=[];
  const seen=new Set([id]);
  let parentId=target.parent_value_object_id;
  while(parentId&&parents.length<24&&!seen.has(parentId)){
    seen.add(parentId);
    const p=await systemOn(parentId);
    if(!p)break;
    const localized=localizeGlobalSystemValueObject(p,locale);
    parents.unshift({id:p.id,title:localized.title??p.title??"",role:p.ontology_node_role_code??"unknown"});
    parentId=p.parent_value_object_id;
  }
  const relations=await supabase.from("system_value_object_relations")
    .select("id,relation_type_code,source_value_object_id,target_value_object_id,status")
    .eq("status","active").or(`source_value_object_id.eq.${id},target_value_object_id.eq.${id}`).limit(40);
  const assignments=await supabase.from("value_object_parameter_assignments")
    .select("id,value_object_id,parameter_definition_id,status,scope_code")
    .eq("value_object_id",id).eq("status","active").eq("scope_code","system").limit(30);
  const translated=localizeGlobalSystemValueObject(target,locale);
  return {kind:"on",id,title:translated.title??target.title,definition:translated.description??target.description,
    role:target.ontology_node_role_code,branch:target.branch_type_code,canonicalKey:target.canonical_key,
    parentId:target.parent_value_object_id,path:[...parents.map(p=>p.title),translated.title??target.title].join(" › "),parents,
    relations:relations.error?{status:"unavailable",errorCode:"RELATIONS_UNAVAILABLE"}:{status:"read",items:relations.data},
    parameterAssignments:assignments.error?{status:"unavailable",errorCode:"ASSIGNMENTS_UNAVAILABLE"}:{status:"read",items:assignments.data},
    metadata:safeMetadata(target.metadata_json),
    limitations:["Only active global system ON are readable here.","Related nodes are listed by UUID and must be checked separately."]};
}
async function inspectTemplate(id:string,locale:OntoLocale){
  const query=await supabase.from("activity_templates")
    .select("id,title,short_title,description,template_group,default_metadata_json,status,is_active")
    .eq("id",id).eq("template_scope","system").is("owner_user_id",null).is("organization_id",null)
    .eq("status","active").eq("is_active",true)
    .contains("default_metadata_json",ARCTOR_TYPICAL_ACTIVITY_METADATA_V1).maybeSingle();
  if(query.error)throw new Error("TEMPLATE_READ_FAILED");
  const item=query.data;
  if(!item)return null;
  const meta=asRec(item.default_metadata_json);
  const locales=asRec(asRec(meta.curatorSystemMaterializationV1).localizations);
  const strict=resolveLocalizedContentFieldsStrict({metadata:item.default_metadata_json,locale,fieldCodes:["title","description"]});
  const title=txt(strict.title)||txt(asRec(locales[locale]).title)||txt(item.title);
  const profileQuery=await supabase.from("activity_template_impact_profiles_v1")
    .select("id,version_no,routing_contract_code,status,notes,metadata_json")
    .eq("template_id",id).eq("status","active").order("version_no",{ascending:false}).limit(1);
  const profile=profileQuery.error?null:profileQuery.data?.[0]??null;
  const warnings:string[]=[];
  if(profileQuery.error)warnings.push("PROFILE_UNAVAILABLE");
  if(!profile)warnings.push("NO_ACTIVE_PROFILE_CONFIRMED");
  let parameters:unknown={status:"unavailable",reason:"ACTIVE_PROFILE_NOT_LOADED"};
  if(profile){
    const par=await supabase.from("activity_template_profile_parameters_v2")
      .select("id,parameter_definition_id,capture_policy_code,is_required,display_order,metadata_json")
      .eq("profile_id",profile.id).order("display_order",{ascending:true}).limit(60);
    if(par.error){parameters={status:"unavailable",reason:"PROFILE_PARAMETERS_READ_FAILED"};warnings.push("PROFILE_PARAMETERS_UNAVAILABLE");}
    else{
      const ids=[...new Set((par.data??[]).map(r=>String(r.parameter_definition_id)).filter(Boolean))];
      const definitions=ids.length?await supabase.from("value_object_parameter_definitions")
        .select("id,parameter_code,title,value_type_code,canonical_unit_code,scope_code,status")
        .in("id",ids).eq("scope_code","system") : null;
      if(definitions?.error)warnings.push("PARAMETER_DEFINITIONS_UNAVAILABLE");
      const defs=new Map((definitions?.data??[]).map(d=>[String(d.id),d]));
      parameters={status:"read",rows:(par.data??[]).map(r=>({id:r.id,definitionId:r.parameter_definition_id,
        definition:defs.get(String(r.parameter_definition_id))??null,required:r.is_required,capturePolicy:r.capture_policy_code,
        order:r.display_order,metadata:safeMetadata(r.metadata_json)})),
        note:"Profile parameters do not alone prove a template-specific leaf ON binding; inspect routing profile metadata and ON assignments."};
    }
  }
  return {kind:"template",id,title,description:txt(strict.description)||txt(item.description),group:item.template_group,
    profile:profile?{id:profile.id,version:profile.version_no,routingContract:profile.routing_contract_code,
      notes:profile.notes,metadata:safeMetadata(profile.metadata_json)}:null,parameters,
    templateMetadata:safeMetadata(item.default_metadata_json),
    warnings,limitations:["Only existing system templates in the active typical-activity catalog are permitted.",
      "Parameter mappings and actual fact outputs cannot be declared verified unless explicitly shown in this response."]};
}
export async function GET(request:Request){
  const guard=await requirePlatformAdmin({allowedRoles:["owner","admin","viewer"]});
  if(!guard.ok)return platformAdminErrorResponse(guard,ONTO_AI_PILOT_CONTRACT);
  const q=new URL(request.url).searchParams;
  const onId=q.get("onId")?.trim()??"";
  const templateId=q.get("templateId")?.trim()??"";
  if(Boolean(onId)===Boolean(templateId))return failure("EXACTLY_ONE_ENTITY_ID_REQUIRED");
  const id=onId||templateId;
  if(!UUID.test(id))return failure("INVALID_UUID");
  const localeRaw=q.get("locale");const locale:OntoLocale=validLocale(localeRaw)?localeRaw:"ru";
  try{
    const detail=onId?await inspectOn(id,locale):await inspectTemplate(id,locale);
    if(!detail)return failure("ACTIVE_SYSTEM_ENTITY_NOT_FOUND",404);
    return NextResponse.json({ok:true,contract:ONTO_AI_PILOT_CONTRACT,detail,
      evidenceScope:"read_only_catalog_snapshot",dbWritesPerformed:false,aiCallsPerformed:false},{headers:H});
  }catch(error){
    console.error("ONTO_AI_DETAILS_READ_FAILED",error instanceof Error?error.message:"UNKNOWN");
    return failure("ONTO_AI_DETAILS_READ_FAILED",503);
  }
}

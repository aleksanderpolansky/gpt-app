import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { platformAdminErrorResponse, requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { localizeGlobalSystemValueObject } from "@/lib/reality-core/global-system-value-object-localization";
import { createPendingCanonicalSystemValueObjectLocalizationV1 } from "@/lib/reality-core/global-system-value-object-localization.server";
import { resolveActiveActorContext } from "../../../../../lib/actor-context";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const MARKER = "ADMIN_SYSTEM_OBSERVATION_OBJECT_CREATE_V1";
const LOCALES = ["en", "ru", "uk", "pl", "de", "es", "cs"] as const;
type Locale = (typeof LOCALES)[number];
type NodeRole = "root" | "intermediate" | "leaf";
type Input = {
  locale?: unknown;
  nodeRole?: unknown;
  parentId?: unknown;
  relationCode?: unknown;
  localizedTitle?: unknown;
  localizedDescription?: unknown;
  titleEn?: unknown;
  descriptionEn?: unknown;
  creationRequestId?: unknown;
  comment?: unknown;
};
type Parent = {
  id: string;
  title: string;
  description: string | null;
  canonical_key: string | null;
  facet_code: string | null;
  branch_type_code: string | null;
  root_value_object_id: string | null;
  parent_value_object_id: string | null;
  ontology_node_role_code: string | null;
  scope_code: string | null;
  owner_user_id: string | null;
  owner_actor_id: string | null;
  origin_type_code: string | null;
  status: string;
  metadata_json?: Record<string, unknown> | null;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RELATIONS = new Set(["part_of", "is_a", "aspect_of", "subprocess_of"]);
const KIND_BY_FACET: Readonly<Record<string, string>> = {
  ENTITY:"generic_entity", PROCESS:"generic_process", STATE:"generic_state",
  RELATIONSHIP:"generic_relationship", ROLE:"generic_role", KNOWLEDGE:"generic_knowledge",
  BEHAVIOR:"generic_behavior", CONTEXT:"generic_context",
};
const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";
const errorReply = (code: string, status: number) => NextResponse.json({ ok:false, marker:MARKER, errorCode:code }, {status});
function stableUuid(seed:string):string {
  const b = Buffer.from(createHash("sha256").update(seed,"utf8").digest().subarray(0,16));
  b[6] = (b[6] & 0x0f) | 0x50; b[8] = (b[8] & 0x3f) | 0x80;
  const s = b.toString("hex");return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;
}
function canonicalKey(role:NodeRole, parentId:string|null, titleEn:string) {
  const normalized = titleEn.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  let slug=normalized.replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"").replace(/_+/g,"_") || "object";
  const digest=createHash("sha256").update(`ARCTOR_CURATOR_CANONICAL_KEY_V1|${role}|${parentId ?? "ROOT"}|${titleEn.trim().toLowerCase()}`,"utf8").digest("hex").slice(0,10);
  slug=slug.slice(0,160-"system.".length-1-digest.length).replace(/_+$/g,"") || "object";
  return `system.${slug}.${digest}`;
}
function legacyRootFacet(root:Parent):string {
  const signature=`${clean(root.title)} ${clean(root.canonical_key)}`.toLowerCase();
  if (signature.includes("system") && signature.includes("structur")) return "ENTITY";
  if (signature.includes("state") && signature.includes("need")) return "STATE";
  if (signature.includes("action") && signature.includes("process")) return "PROCESS";
  throw new Error("ROOT_LEGACY_FACET_UNRESOLVED");
}
const parentFields="id,title,description,canonical_key,facet_code,branch_type_code,root_value_object_id,parent_value_object_id,ontology_node_role_code,scope_code,owner_user_id,owner_actor_id,origin_type_code,status,metadata_json";
async function readParent(id:string):Promise<Parent|null> {
  const {data,error}=await supabase.from("value_objects").select(parentFields)
    .eq("id",id).eq("scope_code","global").eq("origin_type_code","system_model")
    .is("owner_user_id",null).is("owner_actor_id",null).eq("status","active").limit(1);
  if(error) throw new Error("PARENT_READ_FAILED");
  return ((data ?? [])[0] ?? null) as Parent|null;
}
export async function GET(request:Request) {
  const guard=await requirePlatformAdmin();
  if(!guard.ok) return platformAdminErrorResponse(guard, MARKER);
  const localeRaw=new URL(request.url).searchParams.get("locale") || "en";
  const locale=(LOCALES as readonly string[]).includes(localeRaw) ? localeRaw : "en";
  const {data,error}=await supabase.from("value_objects").select(parentFields)
    .eq("scope_code","global").eq("origin_type_code","system_model")
    .is("owner_user_id",null).is("owner_actor_id",null).eq("status","active")
    .in("ontology_node_role_code",["root","intermediate"]).order("title").limit(2000);
  if(error) return errorReply("SYSTEM_PARENT_LIST_FAILED",500);
  const parents=((data ?? []) as Parent[]).map(row=>{
    const localized=localizeGlobalSystemValueObject(row,locale);
    return {id:row.id,title:localized.title,role:row.ontology_node_role_code,parentId:row.parent_value_object_id};
  });
  return NextResponse.json({ok:true,parents,roleAssignmentEnforced:false,allowedRoles:["owner","admin"]});
}
export async function POST(request:Request) {
  const guard=await requirePlatformAdmin();
  if(!guard.ok) return platformAdminErrorResponse(guard,MARKER);
  let body:Input;
  try { body=await request.json() as Input; } catch { return errorReply("INVALID_JSON",400); }
  const role=clean(body.nodeRole);
  if(role!=="root"&&role!=="intermediate"&&role!=="leaf") return errorReply("INVALID_NODE_ROLE",400);
  const locale=clean(body.locale) as Locale;
  if(!LOCALES.includes(locale)) return errorReply("INVALID_LOCALE",400);
  const parentId=clean(body.parentId);
  const relation=clean(body.relationCode);
  if(role==="root") {
    if(parentId||relation) return errorReply("ROOT_CANNOT_HAVE_PARENT",400);
  } else if(!UUID.test(parentId)||!RELATIONS.has(relation)) return errorReply("PARENT_OR_RELATION_INVALID",400);
  const localTitle=clean(body.localizedTitle), localDescription=clean(body.localizedDescription);
  const titleEn=clean(body.titleEn), descriptionEn=clean(body.descriptionEn);
  if(!localTitle||localTitle.length>180||!localDescription||localDescription.length>4000||
     !titleEn||titleEn.length>180||!descriptionEn||descriptionEn.length>4000) return errorReply("REQUIRED_TITLE_DESCRIPTION_INVALID",400);
  if(locale==="en" && (localTitle!==titleEn||localDescription!==descriptionEn)) return errorReply("EN_CANONICAL_MISMATCH",400);
  const comment=clean(body.comment);
  if(!comment||comment.length>1500) return errorReply("CREATION_REASON_REQUIRED",400);
  const creationRequestId=clean(body.creationRequestId);
  if(!UUID.test(creationRequestId)) return errorReply("REQUEST_ID_INVALID",400);
  try {
    const active=await resolveActiveActorContext(clean(guard.appUser.auth0_sub));
    if(active.appUserId!==guard.appUser.id) return errorReply("ACTIVE_ACTOR_MISMATCH",403);
    const parent=role==="root" ? null : await readParent(parentId);
    if(role!=="root"&&!parent) return errorReply("SYSTEM_PARENT_NOT_FOUND",404);
    if(role==="leaf"&&parent?.ontology_node_role_code!=="intermediate") return errorReply("LEAF_REQUIRES_INTERMEDIATE",409);
    if(role==="intermediate"&&!(["root","intermediate"].includes(parent?.ontology_node_role_code ?? ""))) return errorReply("INTERMEDIATE_PARENT_INVALID",409);
    let facetCode="DOMAIN", objectKindCode="domain_root", rootId="";
    if(parent) {
      facetCode=parent.ontology_node_role_code==="root" ? legacyRootFacet(parent) : clean(parent.facet_code);
      const candidate=KIND_BY_FACET[facetCode];
      if(!candidate) return errorReply("FACET_NOT_SUPPORTED",409);
      const {data:kind,error:kindError}=await supabase.from("value_object_kind_registry")
        .select("object_kind_code,allowed_node_roles_json,status,facet_code")
        .eq("object_kind_code",candidate).eq("facet_code",facetCode).eq("status","active").limit(1);
      if(kindError) return errorReply("KIND_REGISTRY_READ_FAILED",500);
      const kindRow=(kind ?? [])[0];
      const raw=kindRow?.allowed_node_roles_json;
      const allowed=Array.isArray(raw) ? raw.includes(role) : Boolean(raw&&typeof raw==="object"&&!Array.isArray(raw)&&(raw as Record<string,unknown>)[role]===true);
      if(!kindRow||!allowed) return errorReply("KIND_ROLE_NOT_AVAILABLE",409);
      objectKindCode=candidate;
      rootId=parent.ontology_node_role_code==="root" ? parent.id : clean(parent.root_value_object_id);
      if(!UUID.test(rootId)) return errorReply("ROOT_POINTER_INVALID",409);
    }
    const key=canonicalKey(role,parent?.id ?? null,titleEn);
    const id=stableUuid(`ARCTOR_CURATOR_SYSTEM_OBJECT_V1_3|${key}`);
    if(role==="root") rootId=id;
    const payload={role,canonicalKey:key,parentValueObjectId:parent?.id??null,rootValueObjectId:role==="root"?null:rootId,facetCode,objectKindCode,hierarchyRelationCode:role==="root"?null:relation,locale,localizedTitle:localTitle,localizedDescription:localDescription,titleEn,descriptionEn};
    const hash=createHash("sha256").update(JSON.stringify(payload),"utf8").digest("hex").toUpperCase();
    const {data:prior,error:priorError}=await supabase.from("value_objects")
      .select("id,status,scope_code,owner_user_id,owner_actor_id,parent_value_object_id,ontology_node_role_code,title,description,metadata_json")
      .eq("canonical_key",key).limit(1);
    if(priorError) return errorReply("DUPLICATE_CHECK_FAILED",500);
    if(prior?.length){
      const row=prior[0];
      const meta=row.metadata_json&&typeof row.metadata_json==="object"&&!Array.isArray(row.metadata_json) ? row.metadata_json as Record<string,unknown> : {};
      const draft=meta.curator_system_draft_v1&&typeof meta.curator_system_draft_v1==="object" ? meta.curator_system_draft_v1 as Record<string,unknown> : {};
      if(row.id===id&&row.status==="active"&&row.scope_code==="global"&&draft.requestHash===hash&&row.owner_user_id===null&&row.owner_actor_id===null&&row.parent_value_object_id===(parent?.id??null)&&row.ontology_node_role_code===role)
        return NextResponse.json({ok:true,id,canonicalKey:key,replay:true,localizationState:draft.localizationState??"unknown"});
      return errorReply("SYSTEM_ON_ALREADY_EXISTS",409);
    }
    const draftLocalizations:Record<string,{title:string;description:string}>={en:{title:titleEn,description:descriptionEn}};
    draftLocalizations[locale]={title:localTitle,description:localDescription};
    const localizedContent=createPendingCanonicalSystemValueObjectLocalizationV1({curatorLocale:locale,localizedTitle:localTitle,localizedDescription:localDescription,titleEn,descriptionEn});
    const now=new Date().toISOString();
    const metadata={
      localizedContent,
      contentLocalizationRuntime:"ARCTOR_CONTENT_LOCALIZATION_V1",
      systemValueObjectLocalizationRuntime:"ARCTOR_SYSTEM_VALUE_OBJECT_CANONICAL_ENGLISH_LOCALIZATION_V1",
      curator_system_draft_v1:{
        contract:"ARCTOR_REALITY_MODEL_CURATOR_ACTIVITY_TEMPLATE_BUILDER_V2_CANONICAL_ENGLISH_LOCALIZATION",
        requestHash:hash,rawSignalId:null,curatorAppUserId:guard.appUser.id,curatorAdminId:guard.platformAdmin.id,
        curatorRole:guard.platformAdmin.role,creationRequestId,creationReason:comment,createdAt:now,
        publicationState:"published_by_curator_confirmation",publishedAt:now,canonicalKeyMode:"server_generated_v1",
        canonicalLocale:"en",creationLocale:locale,localizationState:"blocked",localizationLocales:["en",locale],
        localizationMissingLocales:LOCALES.filter(l=>l!=="en"&&l!==locale),localizationAttemptCount:0,
        localizationQueuedAt:now,localizationLastAttemptAt:null,localizationNextAttemptAt:null,
        localizationLastError:"MANUAL_LOCALIZATION_APPROVAL_REQUIRED",localizationCompletedAt:null,
        localizationRequestedByUserId:guard.appUser.id,localizationRequestedByActorId:active.actorId,
        nodeRole:role,localizations:draftLocalizations,
      },
    };
    const {error:insertError}=await supabase.from("value_objects").insert({
      id,owner_actor_id:null,value_type:"other",title:titleEn,description:descriptionEn,organization_id:null,
      commercial_usage:"none",parent_value_object_id:parent?.id??null,actor_id:null,app_user_id:null,owner_user_id:null,
      visibility:"public",source:"manual",usage_scope:"private",created_by_actor_id:null,object_kind:"other",
      node_role_code:"structural",branch_type_code:"ontology_v1",root_value_object_id:rootId,
      instance_of_value_object_id:null,privacy_level:"public",sensitivity_level:"standard",status:"active",
      canonical_key:key,facet_code:facetCode,object_kind_code:objectKindCode,ontology_node_role_code:role,
      hierarchy_relation_code:role==="root"?null:relation,scope_code:"global",visibility_code:"public",
      privacy_class_code:"public_ontology",definition_version:1,origin_type_code:"system_model",
      metadata_json:metadata,identity_attributes_json:{},
    });
    if(insertError) return errorReply(insertError.code==="23505"?"DUPLICATE_ON_CONFLICT":"SYSTEM_ON_CREATE_FAILED",insertError.code==="23505"?409:500);
    const {data:after,error:afterError}=await supabase.from("value_objects")
      .select("id,scope_code,ontology_node_role_code,status,owner_user_id,owner_actor_id,root_value_object_id")
      .eq("id",id).limit(1);
    if(afterError||!after?.length||after[0].status!=="active"||after[0].scope_code!=="global"||after[0].ontology_node_role_code!==role||after[0].owner_user_id!==null||after[0].owner_actor_id!==null||after[0].root_value_object_id!==rootId)
      return errorReply("SYSTEM_ON_CREATED_POSTCHECK_FAILED",500);
    // Intentionally NO AI localization call: all other locales remain blocked until separately approved.
    return NextResponse.json({ok:true,id,canonicalKey:key,replay:false,localizationState:"blocked"},{status:201});
  } catch (error) {
    console.error("SYSTEM_ON_ADMIN_CREATE_UNEXPECTED",error instanceof Error?error.message:String(error));
    return errorReply("SYSTEM_ON_CREATE_UNEXPECTED",500);
  }
}

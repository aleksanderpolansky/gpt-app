import { NextResponse } from "next/server";
import { requirePlatformAdmin, platformAdminErrorResponse } from "@/lib/admin/require-platform-admin";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";
const MARKER = "ARCTOR_P259_FIRST_DIRECT_LEAF_REPRESENTATIVE_V1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function readState(parentId: string) {
  const [parentResult, ruleResult, childrenResult] = await Promise.all([
    supabase.from("value_objects")
      .select("id,title,scope_code,status,ontology_node_role_code")
      .eq("id", parentId).maybeSingle(),
    supabase.from("value_object_technical_representatives_v1")
      .select("parent_value_object_id,representative_leaf_id,enabled,updated_at")
      .eq("parent_value_object_id",parentId).maybeSingle(),
    supabase.from("value_objects")
      .select("id,title,created_at,ontology_node_role_code,status")
      .eq("parent_value_object_id",parentId).eq("ontology_node_role_code","leaf")
      .eq("status","active").eq("scope_code","global").order("created_at",{ ascending:true }).order("id",{ ascending:true }).limit(2),
  ]);
  if (parentResult.error || ruleResult.error || childrenResult.error) {
    throw new Error(`P259_READ_FAILED:${parentResult.error?.message ?? ruleResult.error?.message ?? childrenResult.error?.message}`);
  }
  const parent = parentResult.data;
  if (!parent || parent.ontology_node_role_code !== "intermediate" || parent.scope_code !== "global" || parent.status !== "active") {
    throw new Error("P259_PARENT_NOT_ACTIVE_GLOBAL_INTERMEDIATE");
  }
  const rule = ruleResult.data;
  const appointed = rule?.representative_leaf_id
    ? (childrenResult.data ?? []).find((item: { id: string }) => item.id === rule.representative_leaf_id)
    : null;
  let representativeTitle: string | null = appointed?.title ?? null;
  if (rule?.representative_leaf_id && !appointed) {
    const { data, error } = await supabase.from("value_objects")
      .select("id,title,parent_value_object_id,ontology_node_role_code,status")
      .eq("id",rule.representative_leaf_id).maybeSingle();
    if (error) throw new Error(`P259_REP_READ_FAILED:${error.message}`);
    if (data?.parent_value_object_id === parentId && data.ontology_node_role_code === "leaf" && data.status === "active") {
      representativeTitle = data.title;
    }
  }
  return {
    ok:true,contract:MARKER,parentId,
    enabled: rule?.enabled === true,
    representativeLeafId: rule?.representative_leaf_id ?? null,
    representativeTitle,
    hasAnyActiveDirectLeaf: Boolean(childrenResult.data?.length),
    firstLeafTitle: childrenResult.data?.[0]?.title ?? null,
    updatedAt: rule?.updated_at ?? null,
  };
}

export async function GET(request: Request) {
  const admin = await requirePlatformAdmin();
  if (!admin.ok) return platformAdminErrorResponse(admin,MARKER);
  const parentId = new URL(request.url).searchParams.get("parentId")?.trim() ?? "";
  if (!UUID.test(parentId)) return NextResponse.json({ok:false,error:"P259_BAD_PARENT_ID"},{status:400});
  try { return NextResponse.json(await readState(parentId)); }
  catch (error) { return NextResponse.json({ok:false,error: error instanceof Error ? error.message : "P259_READ_FAILED"},{status:409}); }
}

export async function POST(request: Request) {
  const admin = await requirePlatformAdmin();
  if (!admin.ok) return platformAdminErrorResponse(admin,MARKER);
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
    return NextResponse.json({ok:false,error:"P259_ORIGIN_INVALID"},{status:403});
  }
  let body: {parentId?:unknown;enabled?:unknown};
  try {body = (await request.json()) as typeof body;} catch {
    return NextResponse.json({ok:false,error:"P259_BAD_JSON"},{status:400});
  }
  const parentId = typeof body.parentId === "string" ? body.parentId.trim() : "";
  if (!UUID.test(parentId) || typeof body.enabled !== "boolean") {
    return NextResponse.json({ok:false,error:"P259_BAD_INPUT"},{status:400});
  }
  try {
    const { error } = await supabase.rpc("arctor_set_first_leaf_technical_rep_v1", {
      p_parent_id:parentId,
      p_enabled:body.enabled,
      p_admin_user_id:String(admin.appUser.id),
    });
    if(error) throw new Error(`P259_RPC_FAILED:${error.message}`);
    return NextResponse.json(await readState(parentId));
  } catch (error) {
    return NextResponse.json({ok:false,error:error instanceof Error ? error.message : "P259_SAVE_FAILED"},{status:409});
  }
}

import { NextResponse } from "next/server";
import { platformAdminErrorResponse, requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { supabase } from "../../../../../../lib/supabase";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const MARKER = "ARCTOR_ARI_01_1_PAIR_INSPECT_READ_ONLY";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function GET(request: Request) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return platformAdminErrorResponse(guard, MARKER);
  const params = new URL(request.url).searchParams;
  const sourceId = params.get("sourceId") ?? "";
  const targetId = params.get("targetId") ?? "";
  if (!UUID.test(sourceId) || !UUID.test(targetId) || sourceId === targetId)
    return NextResponse.json({ ok: false, error: "Invalid pair" }, { status: 400 });
  try {
    const [endpoints, links] = await Promise.all([
      supabase.from("value_objects")
        .select("id,parent_value_object_id,scope_code,origin_type_code,owner_user_id,owner_actor_id,status")
        .in("id", [sourceId, targetId]),
      supabase.from("system_value_object_relations")
        .select("id,relation_type_code,source_value_object_id,target_value_object_id,status")
        .or("and(source_value_object_id.eq." + sourceId + ",target_value_object_id.eq." + targetId + "),and(source_value_object_id.eq." + targetId + ",target_value_object_id.eq." + sourceId + ")")
        .limit(101),
    ]);
    if (endpoints.error || links.error) throw new Error(endpoints.error?.message ?? links.error?.message ?? "Read failed");
    const rows = endpoints.data ?? [];
    const globalOk = [sourceId, targetId].every((id) => rows.some((row) =>
      row.id === id && row.scope_code === "global" && row.origin_type_code === "system_model" &&
      row.owner_user_id === null && row.owner_actor_id === null && row.status === "active"));
    if (!globalOk) return NextResponse.json({ ok: false, error: "System ON not available" }, { status: 409 });
    const source = rows.find((row) => row.id === sourceId);
    const target = rows.find((row) => row.id === targetId);
    const structure = target?.parent_value_object_id === sourceId ? "source_parent_of_target" :
      source?.parent_value_object_id === targetId ? "target_parent_of_source" : "none";
    const matches = links.data ?? [];
    if (matches.length > 100) return NextResponse.json({ ok: false, error: "Preview exceeds 100 links; review manually" }, { status: 409 });
    return NextResponse.json({ ok: true, contract: MARKER, sourceId, targetId, structure,
      relations: matches.map((row) => ({ id: row.id, relationTypeCode: row.relation_type_code,
        sourceValueObjectId: row.source_value_object_id, targetValueObjectId: row.target_value_object_id,
        status: row.status })) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requirePlatformAdmin, platformAdminErrorResponse } from "@/lib/admin/require-platform-admin";
import { retryCommercialFeedActivityV1 } from "@/lib/activity/commercialFeedActivityBridge.server";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const MARKER = "ARCTOR_COMMERCIAL_ADMIN_RETRY_V1";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET() {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return platformAdminErrorResponse(guard, MARKER);
  const { data, error } = await supabase.from("activity_events")
    .select("id,title,input_text,created_at,commercial_processing_status,commercial_processing_error,activity_template_id,source_message_object_id")
    .eq("activity_context_code", "commercial")
    .in("commercial_processing_status", ["analysis_ready", "needs_review", "failed"])
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ok:false,error:error.message},{status:500});
  return NextResponse.json({ok:true,contract:MARKER,records:data??[]},
    {headers:{"Cache-Control":"no-store"}});
}

export async function POST(request: Request) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return platformAdminErrorResponse(guard, MARKER);
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ok:false,error:"INVALID_JSON"},{status:400}); }
  const eventId = body && typeof body==="object" && "activityEventId" in body
    ? (body as {activityEventId?:unknown}).activityEventId : null;
  if (typeof eventId!=="string" || !UUID_RE.test(eventId))
    return NextResponse.json({ok:false,error:"INVALID_EVENT_ID"},{status:400});
  try {
    const result = await retryCommercialFeedActivityV1(eventId);
    return NextResponse.json({ok:true,contract:MARKER,result});
  } catch(error) {
    return NextResponse.json({ok:false,contract:MARKER,
      error:error instanceof Error?error.message:"RETRY_FAILED"},{status:409});
  }
}

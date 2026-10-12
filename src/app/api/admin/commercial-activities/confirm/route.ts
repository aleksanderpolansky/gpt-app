import { NextResponse } from "next/server";
import { requirePlatformAdmin, platformAdminErrorResponse } from "@/lib/admin/require-platform-admin";
import { confirmCommercialFactsP257, ARCTOR_P257_COMMERCIAL_PUBLIC_FACT_V1 } from "@/lib/activity/commercialFactConfirmationP257.server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(request: Request) {
  const guard = await requirePlatformAdmin({allowedRoles:["owner","admin"]});
  if (!guard.ok) return platformAdminErrorResponse(guard, ARCTOR_P257_COMMERCIAL_PUBLIC_FACT_V1);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ok:false,error:"P257_ORIGIN_DENIED"},{status:403});
  const raw = await request.text();
  if (raw.length > 16000) return NextResponse.json({ok:false,error:"P257_PAYLOAD_TOO_LARGE"},{status:413});
  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ok:false,error:"P257_INVALID_JSON"},{status:400}); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ok:false,error:"P257_INVALID_PAYLOAD"},{status:400});
  }
  const value = payload as Record<string, unknown>;
  if (!UUID.test(String(value.activityEventId ?? "")) || !Array.isArray(value.acceptedTechnicalRootIds) ||
      !value.manualLeafByRoot || typeof value.manualLeafByRoot !== "object" || Array.isArray(value.manualLeafByRoot)) {
    return NextResponse.json({ok:false,error:"P257_INVALID_SELECTION"},{status:400});
  }
  try {
    const result = await confirmCommercialFactsP257({
      activityEventId: String(value.activityEventId),
      adminUserId: guard.appUser.id,
      manualLeafByRoot: value.manualLeafByRoot as Record<string,string>,
      acceptedTechnicalRootIds: value.acceptedTechnicalRootIds as string[],
    });
    return NextResponse.json({ok:true,result},{headers:{"Cache-Control":"no-store"}});
  } catch (error) {
    return NextResponse.json({ok:false,error:(error instanceof Error ? error.message:"P257_CONFIRM_FAILED").slice(0,500)},{status:409});
  }
}

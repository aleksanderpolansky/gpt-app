import { NextResponse } from "next/server";
import { requirePlatformAdmin, platformAdminErrorResponse } from "@/lib/admin/require-platform-admin";
import {
  changeCommercialAutoFactSettingV1,
  readCommercialAutoFactSettingV1,
} from "@/lib/activity/commercialAutoFactControlV1.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const MARKER = "ARCTOR_COMMERCIAL_AUTO_FACT_SETTINGS_ADMIN_P1_V1";
const ADMIN_ROLES = ["owner", "admin"] as const;

export async function GET() {
  const guard = await requirePlatformAdmin({ allowedRoles: ADMIN_ROLES });
  if (!guard.ok) return platformAdminErrorResponse(guard, MARKER);
  try {
    const setting = await readCommercialAutoFactSettingV1();
    return NextResponse.json({ ok:true, contract:MARKER, setting },
      { headers:{ "Cache-Control":"no-store" } });
  } catch (error) {
    return NextResponse.json({ ok:false, contract:MARKER,
      error:error instanceof Error ? error.message : "SETTINGS_READ_FAILED" },
      { status:503, headers:{ "Cache-Control":"no-store" } });
  }
}

export async function PATCH(request: Request) {
  const guard = await requirePlatformAdmin({ allowedRoles: ADMIN_ROLES });
  if (!guard.ok) return platformAdminErrorResponse(guard, MARKER);
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ ok:false, error:"CROSS_ORIGIN_UPDATE_DENIED" }, {status:403});
  }
  let payload: unknown;
  try { payload = await request.json(); } catch {
    return NextResponse.json({ ok:false, error:"INVALID_JSON" }, {status:400});
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ok:false,error:"INVALID_SETTINGS_PAYLOAD"},{status:400});
  }
  const body = payload as Record<string, unknown>;
  if (typeof body.enabled !== "boolean" || typeof body.expectedRevision !== "number" ||
      !Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0) {
    return NextResponse.json({ok:false,error:"INVALID_SETTINGS_PAYLOAD"},{status:400});
  }
  try {
    const setting = await changeCommercialAutoFactSettingV1({
      enabled:body.enabled,
      expectedRevision:body.expectedRevision,
      changedByAppUserId:guard.appUser.id,
    });
    return NextResponse.json({ ok:true, contract:MARKER, setting },
      { headers:{ "Cache-Control":"no-store" } });
  } catch (error) {
    return NextResponse.json({ ok:false, contract:MARKER,
      error:error instanceof Error ? error.message : "SETTINGS_WRITE_FAILED" },
      {status:409,headers:{"Cache-Control":"no-store"}});
  }
}

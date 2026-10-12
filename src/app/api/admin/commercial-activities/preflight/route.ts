import { NextResponse } from "next/server";
import { requirePlatformAdmin, platformAdminErrorResponse } from "@/lib/admin/require-platform-admin";
import { inspectCommercialFactRoutesP25, ARCTOR_P25_SHARED_PREFLIGHT_V1 } from "@/lib/activity/commercialSharedPreflightP25.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Read-only P2.5.1 endpoint. It cannot create, confirm or alter a fact. */
export async function GET(request: Request) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return platformAdminErrorResponse(guard, ARCTOR_P25_SHARED_PREFLIGHT_V1);
  const url = new URL(request.url);
  const id = url.searchParams.get("activityEventId") ?? "";
  const nominations = url.searchParams.getAll("nomination");
  if (nominations.length > 8) return NextResponse.json({ok:false,error:"TOO_MANY_NOMINATIONS"},{status:400});
  const manualLeafByRoot: Record<string,string> = Object.create(null);
  for (const entry of nominations) {
    const match = /^([0-9a-f-]{36}):([0-9a-f-]{36})$/i.exec(entry);
    if (!match || !UUID_RE.test(match[1]) || !UUID_RE.test(match[2]) ||
        manualLeafByRoot[match[1]]) {
      return NextResponse.json({ok:false,error:"INVALID_NOMINATION"},{status:400});
    }
    manualLeafByRoot[match[1]] = match[2];
  }
  if (!UUID_RE.test(id)) return NextResponse.json({ ok: false, error: "INVALID_EVENT_ID" }, { status: 400 });
  try {
    const preflight = await inspectCommercialFactRoutesP25(id, manualLeafByRoot);
    return NextResponse.json({ ok: true, preflight }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "P25_PREFLIGHT_FAILED";
    return NextResponse.json({ ok: false, error: reason.slice(0, 450) }, { status: 409 });
  }
}

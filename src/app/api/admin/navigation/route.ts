import { NextResponse } from "next/server";

import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER = "admin-navigation-visibility-v1" as const;

export async function GET() {
  const guard = await requirePlatformAdmin({
    allowedRoles: ["owner", "admin", "viewer"],
  });

  if (!guard.ok) {
    return platformAdminErrorResponse(guard, ROUTE_MARKER);
  }

  return NextResponse.json(
    {
      ok: true,
      routeMarker: ROUTE_MARKER,
      role: guard.platformAdmin.role,
      canEdit:
        guard.platformAdmin.role === "owner" ||
        guard.platformAdmin.role === "admin",
    },
    { status: 200 },
  );
}

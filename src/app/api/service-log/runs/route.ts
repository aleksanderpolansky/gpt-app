import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import {
  listServiceLogRunsFromRequest,
  toServiceLogApiErrorResponse,
} from "../../../../../lib/activity/serviceLog/readModel";

export async function GET(request: NextRequest) {
  const platformAdminGuard = await requirePlatformAdmin();

  if (!platformAdminGuard.ok) {
    return platformAdminErrorResponse(
      platformAdminGuard,
      "service-log-runs-admin-guard-v1",
    );
  }

  const result = await listServiceLogRunsFromRequest(request);

  if (!result.ok) {
    return NextResponse.json(toServiceLogApiErrorResponse(result), {
      status: result.status,
    });
  }

  return NextResponse.json(result.data);
}

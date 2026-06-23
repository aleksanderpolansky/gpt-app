import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import {
  getServiceLogRunDetailForCurrentUser,
  resolveServiceLogAuthenticatedUser,
  toServiceLogApiErrorResponse,
} from "../../../../../../lib/activity/serviceLog/readModel";

type ServiceLogRunDetailRouteContext = {
  readonly params: Promise<{
    readonly id: string;
  }>;
};

export async function GET(
  _request: NextRequest,
  context: ServiceLogRunDetailRouteContext,
) {
  const platformAdminGuard = await requirePlatformAdmin();

  if (!platformAdminGuard.ok) {
    return platformAdminErrorResponse(
      platformAdminGuard,
      "service-log-run-detail-admin-guard-v1",
    );
  }

  const actor = await resolveServiceLogAuthenticatedUser();

  if (!actor.ok) {
    return NextResponse.json(
      {
        error: actor.safeMessage,
        code: actor.code,
      },
      {
        status: actor.status,
      },
    );
  }

  const { id } = await context.params;

  const result = await getServiceLogRunDetailForCurrentUser({
    actorAppUserId: actor.appUserId,
    id,
  });

  if (!result.ok) {
    return NextResponse.json(toServiceLogApiErrorResponse(result), {
      status: result.status,
    });
  }

  return NextResponse.json(result.data);
}

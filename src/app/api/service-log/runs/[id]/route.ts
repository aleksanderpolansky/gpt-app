import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
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

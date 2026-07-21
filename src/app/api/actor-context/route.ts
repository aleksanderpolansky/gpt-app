import { NextResponse } from "next/server";

import {
  ACTIVE_PROFILE_COOKIE_NAME,
  ActorContextError,
  getActiveProfileCookieOptions,
  isValidProfileId,
  readRequestedProfileIdFromCookie,
  resolveActorContext,
} from "../../../../lib/actor-context";
import { auth0 } from "../../../../lib/auth0";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  if (error instanceof ActorContextError) {
    return NextResponse.json(
      { ok: false, error: error.code, errorMessage: error.message },
      { status: error.status },
    );
  }

  return NextResponse.json(
    {
      ok: false,
      error: "ACTOR_CONTEXT_FAILED",
      errorMessage:
        error instanceof Error ? error.message : "Could not resolve actor context.",
    },
    { status: 500 },
  );
}

function successResponse(
  context: Awaited<ReturnType<typeof resolveActorContext>>,
  persistProfileId: boolean,
) {
  const response = NextResponse.json(
    {
      ok: true,
      activeProfile: context.profile,
      profiles: context.profiles,
    },
    { status: 200 },
  );

  response.headers.set("Cache-Control", "no-store, private");

  if (persistProfileId) {
    response.cookies.set(
      ACTIVE_PROFILE_COOKIE_NAME,
      context.profile.profileId,
      getActiveProfileCookieOptions(),
    );
  }

  return response;
}

export async function GET() {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return NextResponse.json(
      { ok: false, error: "NOT_AUTHENTICATED" },
      { status: 401 },
    );
  }

  try {
    const requestedProfileId = await readRequestedProfileIdFromCookie();

    try {
      const context = await resolveActorContext(
        session.user.sub,
        requestedProfileId,
      );

      return successResponse(context, !requestedProfileId);
    } catch (error) {
      if (
        requestedProfileId &&
        error instanceof ActorContextError &&
        error.code === "PROFILE_NOT_OWNED"
      ) {
        const context = await resolveActorContext(session.user.sub, null);
        return successResponse(context, true);
      }

      throw error;
    }
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return NextResponse.json(
      { ok: false, error: "NOT_AUTHENTICATED" },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "INVALID_JSON" },
      { status: 400 },
    );
  }

  if (!isValidProfileId(body.profileId)) {
    return NextResponse.json(
      { ok: false, error: "INVALID_PROFILE_ID" },
      { status: 400 },
    );
  }

  try {
    const context = await resolveActorContext(
      session.user.sub,
      body.profileId,
    );

    return successResponse(context, true);
  } catch (error) {
    return errorResponse(error);
  }
}

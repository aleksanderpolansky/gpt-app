import { NextResponse } from "next/server";

import {
  ActorContextError,
  readRequestedProfileIdFromCookie,
  resolveActorContext,
} from "../../../../../lib/actor-context";
import { auth0 } from "../../../../../lib/auth0";
import {
  GoalWorldInputError,
  isGoalWorldUuid,
  normalizeGoalWorldRevisionWriteInput,
  readExpectedCurrentRevisionNumber,
} from "@/lib/goal-world/api/goalWorldApiTypes";
import {
  GoalWorldPersistenceError,
  readGoalWorldForActor,
  reviseGoalWorldForActor,
} from "@/lib/goal-world/api/goalWorldPersistence.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

async function requireActorContext() {
  const session =
    await auth0.getSession();

  if (!session?.user?.sub) {
    throw new GoalWorldInputError(
      "NOT_AUTHENTICATED",
      "Not authenticated.",
      401,
    );
  }

  const requestedProfileId =
    await readRequestedProfileIdFromCookie();

  try {
    return await resolveActorContext(
      session.user.sub,
      requestedProfileId,
    );
  } catch (error) {
    if (
      requestedProfileId &&
      error instanceof ActorContextError &&
      error.code === "PROFILE_NOT_OWNED"
    ) {
      return resolveActorContext(
        session.user.sub,
        null,
      );
    }

    throw error;
  }
}

function requireActorId(
  actorContext: Awaited<
    ReturnType<typeof resolveActorContext>
  >,
) {
  const actorId = (
    actorContext.profile as {
      actorId?: unknown;
    }
  ).actorId;

  if (
    typeof actorId !== "string" ||
    actorId.length === 0
  ) {
    throw new GoalWorldInputError(
      "ACTOR_CONTEXT_ACTOR_ID_MISSING",
      "Resolved active profile has no actor id.",
      500,
    );
  }

  return actorId;
}

function requireWorldId(
  value: string,
) {
  if (!isGoalWorldUuid(value)) {
    throw new GoalWorldInputError(
      "GOAL_WORLD_ID_INVALID",
      "Goal World id must be UUID.",
    );
  }

  return value;
}

function errorResponse(
  error: unknown,
) {
  if (
    error instanceof GoalWorldInputError ||
    error instanceof GoalWorldPersistenceError
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: error.code,
        errorMessage: error.message,
      },
      { status: error.status },
    );
  }

  if (error instanceof ActorContextError) {
    return NextResponse.json(
      {
        ok: false,
        error: error.code,
        errorMessage: error.message,
      },
      { status: error.status },
    );
  }

  return NextResponse.json(
    {
      ok: false,
      error: "GOAL_WORLD_API_FAILED",
      errorMessage:
        error instanceof Error
          ? error.message
          : "Goal World API failed.",
    },
    { status: 500 },
  );
}

export async function GET(
  _request: Request,
  { params }: RouteProps,
) {
  try {
    const [{ id }, actorContext] =
      await Promise.all([
        params,
        requireActorContext(),
      ]);

    const worldId =
      requireWorldId(id);

    const projection =
      await readGoalWorldForActor(
        requireActorId(actorContext),
        worldId,
      );

    const response =
      NextResponse.json({
        ok: true,
        goalWorld: projection,
        actingAs: {
          actorId:
            requireActorId(actorContext),
          profileId:
            actorContext.profile.profileId,
        },
      });

    response.headers.set(
      "Cache-Control",
      "no-store, private",
    );

    return response;
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: RouteProps,
) {
  try {
    const [{ id }, actorContext] =
      await Promise.all([
        params,
        requireActorContext(),
      ]);

    const worldId =
      requireWorldId(id);

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw new GoalWorldInputError(
        "INVALID_JSON",
        "Invalid JSON body.",
      );
    }

    const expectedCurrentRevisionNumber =
      readExpectedCurrentRevisionNumber(
        body,
      );

    const input =
      normalizeGoalWorldRevisionWriteInput(
        body,
        "revise",
      );

    const revised =
      await reviseGoalWorldForActor(
        requireActorId(actorContext),
        worldId,
        expectedCurrentRevisionNumber,
        input,
      );

    return NextResponse.json({
      ok: true,
      goalWorld: revised,
      actingAs: {
        actorId:
          requireActorId(actorContext),
        profileId:
          actorContext.profile.profileId,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { NextResponse, type NextRequest } from "next/server";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../lib/actor-context";
import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";
import { processValueObjectBridgeForActivityEvent } from "../../../../../lib/activity/valueObjectBridge";
import { resolveValueObjectMappingsFromRubricatorForActivityEvent } from "../../../../../lib/activity/rubricatorValueObjectMapper";

type RequestBody = {
  eventId?: unknown;
  allowNonCompletedEvent?: unknown;
  createMissingControlledValueObject?: unknown;
  allowControlledTextFallback?: unknown;
  dryRun?: unknown;
};

type AppUserRow = {
  id: string;
  auth0_sub: string | null;
  activeActorId: string;
};

type CurrentAppUserResult =
  | {
      ok: true;
      appUser: AppUserRow;
    }
  | {
      ok: false;
      errorResponse: NextResponse;
    };

type EventOwnershipResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      errorResponse: NextResponse;
    };

function getString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function getBoolean(value: unknown): boolean {
  return value === true;
}

async function getCurrentAppUser(): Promise<CurrentAppUserResult> {
  const session = await auth0.getSession();
  const auth0Sub =
    typeof session?.user?.sub === "string" ? session.user.sub : null;

  if (!auth0Sub) {
    return {
      ok: false,
      errorResponse: NextResponse.json(
        {
          ok: false,
          endpoint: "/api/activity/debug-rubricator-value-object-bridge",
          error: "Unauthorized.",
        },
        { status: 401 }
      ),
    };
  }

  try {
    const actorContext = await resolveActiveActorContext(auth0Sub);

    return {
      ok: true,
      appUser: {
        id: actorContext.appUserId,
        auth0_sub: auth0Sub,
        activeActorId: actorContext.actorId,
      },
    };
  } catch (error) {
    const status = error instanceof ActorContextError ? error.status : 500;
    const message =
      error instanceof Error
        ? error.message
        : "Could not resolve active actor context.";

    return {
      ok: false,
      errorResponse: NextResponse.json(
        {
          ok: false,
          endpoint: "/api/activity/debug-rubricator-value-object-bridge",
          error: message,
        },
        { status }
      ),
    };
  }
}

async function assertEventOwnership(
  eventId: string,
  userId: string,
  actorId: string
): Promise<EventOwnershipResult> {
  const { data, error } = await supabase
    .from("activity_events")
    .select("id, user_id")
    .eq("id", eventId)
    .eq("user_id", userId)
    .eq("acting_as_actor_id", actorId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      errorResponse: NextResponse.json(
        {
          ok: false,
          endpoint: "/api/activity/debug-rubricator-value-object-bridge",
          error: error.message,
        },
        { status: 500 }
      ),
    };
  }

  if (!data) {
    return {
      ok: false,
      errorResponse: NextResponse.json(
        {
          ok: false,
          endpoint: "/api/activity/debug-rubricator-value-object-bridge",
          error: "Activity event not found for current user.",
        },
        { status: 404 }
      ),
    };
  }

  return {
    ok: true,
  };
}

export async function POST(request: NextRequest) {
  const platformAdminGuard = await requirePlatformAdmin();

  if (!platformAdminGuard.ok) {
    return platformAdminErrorResponse(
      platformAdminGuard,
      "debug-api-platform-admin-guard-v1",
    );
  }

  const currentUser = await getCurrentAppUser();

  if (!currentUser.ok) {
    return currentUser.errorResponse;
  }

  const appUser = currentUser.appUser;

  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        endpoint: "/api/activity/debug-rubricator-value-object-bridge",
        error: "Invalid JSON body.",
      },
      { status: 400 }
    );
  }

  const eventId = getString(body.eventId);

  if (!eventId) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: "/api/activity/debug-rubricator-value-object-bridge",
        error: "eventId is required.",
      },
      { status: 400 }
    );
  }

  const ownership = await assertEventOwnership(
    eventId,
    appUser.id,
    appUser.activeActorId
  );

  if (!ownership.ok) {
    return ownership.errorResponse;
  }

  const allowNonCompletedEvent = getBoolean(body.allowNonCompletedEvent);
  const requestedCreateMissingControlledValueObject = getBoolean(
    body.createMissingControlledValueObject
  );
  const allowControlledTextFallback = getBoolean(
    body.allowControlledTextFallback
  );
  const dryRun = getBoolean(body.dryRun);

  const effectiveCreateMissingControlledValueObject = dryRun
    ? false
    : requestedCreateMissingControlledValueObject;

  const mappingResult =
    await resolveValueObjectMappingsFromRubricatorForActivityEvent({
      supabase,
      eventId,
      allowNonCompletedEvent,
      createMissingControlledValueObject:
        effectiveCreateMissingControlledValueObject,
      allowControlledTextFallback,
    });

  if (!mappingResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: "/api/activity/debug-rubricator-value-object-bridge",
        userId: appUser.id,
        dryRun,
        requestedCreateMissingControlledValueObject,
        effectiveCreateMissingControlledValueObject,
        stage: "rubricator_mapping",
        mappingResult,
      },
      { status: 500 }
    );
  }

  if (mappingResult.skipped || mappingResult.mappings.length === 0) {
    return NextResponse.json({
      ok: true,
      endpoint: "/api/activity/debug-rubricator-value-object-bridge",
      userId: appUser.id,
      dryRun,
      requestedCreateMissingControlledValueObject,
      effectiveCreateMissingControlledValueObject,
      stage: "rubricator_mapping",
      bridgeExecuted: false,
      mappingResult,
      bridgeResult: null,
    });
  }

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      endpoint: "/api/activity/debug-rubricator-value-object-bridge",
      userId: appUser.id,
      dryRun,
      requestedCreateMissingControlledValueObject,
      effectiveCreateMissingControlledValueObject,
      stage: "dry_run",
      bridgeExecuted: false,
      mappingResult,
      bridgeResult: null,
    });
  }

  const bridgeResult = await processValueObjectBridgeForActivityEvent({
    supabase,
    eventId,
    mappings: mappingResult.mappings,
    source: "rule",
    allowNonCompletedEvent,
    processorName: "debug_rubricator_value_object_bridge_p4_7_r",
  });

  return NextResponse.json({
    ok: mappingResult.ok && bridgeResult.ok,
    endpoint: "/api/activity/debug-rubricator-value-object-bridge",
    userId: appUser.id,
    dryRun,
    requestedCreateMissingControlledValueObject,
    effectiveCreateMissingControlledValueObject,
    stage: "bridge_executed",
    bridgeExecuted: true,
    mappingResult,
    bridgeResult,
  });
}

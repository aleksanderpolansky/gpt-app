import { NextResponse } from "next/server";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER =
  "value-object-target-standards-read-route-step15j-r1-v1" as const;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type AppUserRow = {
  id: string;
  auth0_sub?: string | null;
};

type ActorRow = {
  id: string;
  actor_type?: string | null;
};

type ValueObjectRow = {
  id: string;
  owner_actor_id?: string | null;
  created_by_actor_id?: string | null;
  actor_id?: string | null;
  app_user_id?: string | null;
  owner_user_id?: string | null;
  organization_id?: string | null;
  usage_scope?: string | null;
  title?: string | null;
  status?: string | null;
};

type CurrentUserContext =
  | {
      ok: true;
      appUser: AppUserRow;
      personActor: ActorRow;
    }
  | {
      ok: false;
      status: number;
      errorCode: string;
      errorMessage: string;
    };

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

async function resolveCurrentUserContext(): Promise<CurrentUserContext> {
  let session: Awaited<ReturnType<typeof auth0.getSession>> | null = null;

  try {
    session = await auth0.getSession();
  } catch {
    session = null;
  }

  const auth0Sub = asString(session?.user?.sub);

  if (!auth0Sub) {
    return {
      ok: false,
      status: 401,
      errorCode: "VALUE_OBJECT_TARGET_STANDARDS_READ_UNAUTHENTICATED",
      errorMessage: "Authentication is required to read target standards.",
    };
  }

  try {
    const actorContext = await resolveActiveActorContext(auth0Sub);

    return {
      ok: true,
      appUser: {
        id: actorContext.appUserId,
        auth0_sub: auth0Sub,
      },
      personActor: {
        id: actorContext.actorId,
        actor_type: actorContext.actorType,
      },
    };
  } catch (error) {
    if (error instanceof ActorContextError) {
      return {
        ok: false,
        status: error.status,
        errorCode: error.code,
        errorMessage: error.message,
      };
    }

    return {
      ok: false,
      status: 500,
      errorCode: "VALUE_OBJECT_TARGET_STANDARDS_READ_ACTOR_CONTEXT_FAILED",
      errorMessage: "Could not resolve active actor context.",
    };
  }
}

function isValueObjectOwnedByCurrentActor(params: {
  valueObject: ValueObjectRow;
  appUser: AppUserRow;
  personActor: ActorRow;
}) {
  return (
    params.valueObject.owner_user_id === params.appUser.id &&
    params.valueObject.owner_actor_id === params.personActor.id
  );
}

async function readOwnedValueObject(params: {
  valueObjectId: string;
  appUser: AppUserRow;
  personActor: ActorRow;
}) {
  const { data, error } = await supabase
    .from("value_objects")
    .select(
      `
      id,
      owner_actor_id,
      created_by_actor_id,
      actor_id,
      app_user_id,
      owner_user_id,
      organization_id,
      usage_scope,
      title,
      status
    `,
    )
    .eq("id", params.valueObjectId)
    .maybeSingle();

  if (error) {
    return {
      ok: false as const,
      status: 500,
      errorCode: "VALUE_OBJECT_TARGET_STANDARDS_READ_VALUE_OBJECT_LOOKUP_FAILED",
      errorMessage: error.message,
      valueObject: null,
    };
  }

  if (!data) {
    return {
      ok: false as const,
      status: 404,
      errorCode: "VALUE_OBJECT_TARGET_STANDARDS_READ_VALUE_OBJECT_NOT_FOUND",
      errorMessage: "Value Object not found.",
      valueObject: null,
    };
  }

  const valueObject = data as ValueObjectRow;

  if (
    !isValueObjectOwnedByCurrentActor({
      valueObject,
      appUser: params.appUser,
      personActor: params.personActor,
    })
  ) {
    return {
      ok: false as const,
      status: 403,
      errorCode: "VALUE_OBJECT_TARGET_STANDARDS_READ_ACCESS_DENIED",
      errorMessage: "Value Object access denied.",
      valueObject: null,
    };
  }

  return {
    ok: true as const,
    valueObject,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const routeValueObjectId = decodeURIComponent(id);

  const userContext = await resolveCurrentUserContext();

  if (!userContext.ok) {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        errorCode: userContext.errorCode,
        errorMessage: userContext.errorMessage,
        sideEffects: {
          dbReadExecuted: false,
          dbWriteExecuted: false,
          rowsActuallyWritten: 0,
        },
      },
      { status: userContext.status },
    );
  }

  const ownedValueObject = await readOwnedValueObject({
    valueObjectId: routeValueObjectId,
    appUser: userContext.appUser,
    personActor: userContext.personActor,
  });

  if (!ownedValueObject.ok) {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        errorCode: ownedValueObject.errorCode,
        errorMessage: ownedValueObject.errorMessage,
        sideEffects: {
          dbReadExecuted: true,
          dbWriteExecuted: false,
          rowsActuallyWritten: 0,
        },
      },
      { status: ownedValueObject.status },
    );
  }

  const { data: standards, error: standardsError } = await supabase
    .from("value_object_target_standards")
    .select(
      `
      id,
      value_object_id,
      user_id,
      owner_actor_id,
      metric_type,
      rule_type,
      target_value,
      target_min,
      target_max,
      unit,
      period,
      priority,
      source,
      status,
      label,
      description,
      safety_note,
      idempotency_key,
      created_at,
      updated_at,
      metadata
    `,
    )
    .eq("user_id", userContext.appUser.id)
    .eq("owner_actor_id", userContext.personActor.id)
    .eq("value_object_id", routeValueObjectId)
    .order("created_at", { ascending: false });

  if (standardsError) {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        errorCode: "VALUE_OBJECT_TARGET_STANDARDS_READ_LIST_FAILED",
        errorMessage: standardsError.message,
        sideEffects: {
          dbReadExecuted: true,
          dbWriteExecuted: false,
          rowsActuallyWritten: 0,
        },
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      routeMarker: ROUTE_MARKER,
      routeStatus: "server_mediated_read_completed",
      valueObjectId: routeValueObjectId,
      valueObject: ownedValueObject.valueObject,
      standards: standards ?? [],
      count: standards?.length ?? 0,
      sideEffects: {
        dbReadExecuted: true,
        dbWriteExecuted: false,
        rowsActuallyWritten: 0,
      },
      safety: {
        serverMediatedOnly: true,
        directBrowserSupabaseReadAllowed: false,
        clientProvidedOwnershipTrusted: false,
      },
    },
    { status: 200 },
  );
}

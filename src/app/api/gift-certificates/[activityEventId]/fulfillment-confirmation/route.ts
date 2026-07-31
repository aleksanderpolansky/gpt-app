import { NextResponse } from "next/server";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type RouteContext = {
  readonly params: Promise<{
    readonly activityEventId: string;
  }>;
};

type RequestBody = {
  readonly responseStatus?: unknown;
  readonly buyerMessage?: unknown;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeUuid(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return UUID_PATTERN.test(normalized) ? normalized : null;
}

function normalizeResponseStatus(
  value: unknown,
):
  | "confirmed_by_buyer"
  | "disputed"
  | "partial_problem"
  | null {
  return value === "confirmed_by_buyer" ||
    value === "disputed" ||
    value === "partial_problem"
    ? value
    : null;
}

function normalizeMessage(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized ? normalized.slice(0, 2000) : null;
}

function mapErrorStatus(errorCode: string): number {
  if (
    errorCode.includes("NOT_FOUND") ||
    errorCode.includes("CHECKIN_REQUIRED")
  ) {
    return 404;
  }

  if (
    errorCode.includes("NOT_AUTHORIZED") ||
    errorCode.includes("CONTEXT_NOT_AVAILABLE")
  ) {
    return 403;
  }

  if (
    errorCode.includes("CONFLICT") ||
    errorCode.includes("ALREADY_FINALIZED") ||
    errorCode.includes("STATE_INVALID")
  ) {
    return 409;
  }

  return 400;
}

async function resolveRecipientContext() {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return {
      response: NextResponse.json(
        {
          ok: false,
          error: "Not authenticated",
          errorCode: "PGC10F_NOT_AUTHENTICATED",
        },
        { status: 401 },
      ),
      actorContext: null,
    };
  }

  try {
    return {
      response: null,
      actorContext: await resolveActiveActorContext(
        session.user.sub,
      ),
    };
  } catch (error) {
    if (error instanceof ActorContextError) {
      return {
        response: NextResponse.json(
          {
            ok: false,
            error: error.message,
            errorCode: error.code,
          },
          { status: error.status },
        ),
        actorContext: null,
      };
    }

    return {
      response: NextResponse.json(
        {
          ok: false,
          error: "Could not resolve active actor context",
          errorCode: "PGC10F_ACTOR_CONTEXT_FAILED",
        },
        { status: 500 },
      ),
      actorContext: null,
    };
  }
}

export async function GET(
  _request: Request,
  routeContext: RouteContext,
) {
  const { activityEventId: rawActivityEventId } =
    await routeContext.params;
  const activityEventId = normalizeUuid(rawActivityEventId);

  if (!activityEventId) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid activity event id",
        errorCode: "PGC10F_ACTIVITY_EVENT_ID_INVALID",
      },
      { status: 400 },
    );
  }

  const resolved = await resolveRecipientContext();

  if (resolved.response || !resolved.actorContext) {
    return resolved.response;
  }

  const { actorContext } = resolved;
  const { data, error } = await supabase.rpc(
    "get_gift_certificate_fulfillment_confirmation_v1",
    {
      p_recipient_user_id: actorContext.appUserId,
      p_recipient_actor_id: actorContext.actorId,
      p_activity_event_id: activityEventId,
    },
  );

  if (error) {
    const errorCode =
      typeof error.message === "string" && error.message.trim()
        ? error.message.trim()
        : error.code ?? "PGC10F_CONFIRMATION_STATUS_FAILED";

    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        errorCode,
      },
      {
        status: mapErrorStatus(errorCode),
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(
  request: Request,
  routeContext: RouteContext,
) {
  const { activityEventId: rawActivityEventId } =
    await routeContext.params;
  const activityEventId = normalizeUuid(rawActivityEventId);

  if (!activityEventId) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid activity event id",
        errorCode: "PGC10F_ACTIVITY_EVENT_ID_INVALID",
      },
      { status: 400 },
    );
  }

  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON body",
        errorCode: "PGC10F_INVALID_JSON",
      },
      { status: 400 },
    );
  }

  const responseStatus = normalizeResponseStatus(
    body.responseStatus,
  );

  if (!responseStatus) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid response status",
        errorCode: "PGC10F_RESPONSE_STATUS_INVALID",
      },
      { status: 400 },
    );
  }

  const resolved = await resolveRecipientContext();

  if (resolved.response || !resolved.actorContext) {
    return resolved.response;
  }

  const { actorContext } = resolved;
  const { data, error } = await supabase.rpc(
    "respond_gift_certificate_fulfillment_v1",
    {
      p_recipient_user_id: actorContext.appUserId,
      p_recipient_actor_id: actorContext.actorId,
      p_activity_event_id: activityEventId,
      p_response_status: responseStatus,
      p_buyer_message: normalizeMessage(body.buyerMessage),
    },
  );

  if (error) {
    const errorCode =
      typeof error.message === "string" && error.message.trim()
        ? error.message.trim()
        : error.code ?? "PGC10F_CONFIRMATION_RESPONSE_FAILED";

    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        errorCode,
      },
      {
        status: mapErrorStatus(errorCode),
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

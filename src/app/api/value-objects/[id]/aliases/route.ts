import { NextResponse } from "next/server";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type AliasAction = "add" | "archive" | "restore";

function normalizeId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized && normalized.length <= 200 ? normalized : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function rpcStatus(message: string) {
  if (
    message.includes("ACCESS_DENIED") ||
    message.includes("ACTOR_NOT_OWNED")
  ) {
    return 403;
  }

  if (message.includes("NOT_FOUND")) {
    return 404;
  }

  if (
    message.includes("STATUS_NOT_MANAGEABLE") ||
    message.includes("ALIAS_EQUALS_PRIMARY_TITLE")
  ) {
    return 409;
  }

  return 400;
}

async function resolveContext() {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return {
      actorContext: null,
      errorResponse: NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 },
      ),
    };
  }

  try {
    return {
      actorContext: await resolveActiveActorContext(session.user.sub),
      errorResponse: null,
    };
  } catch (error) {
    if (error instanceof ActorContextError) {
      return {
        actorContext: null,
        errorResponse: NextResponse.json(
          {
            ok: false,
            error: error.message,
            errorCode: error.code,
          },
          { status: error.status },
        ),
      };
    }

    return {
      actorContext: null,
      errorResponse: NextResponse.json(
        { ok: false, error: "Could not resolve active actor context" },
        { status: 500 },
      ),
    };
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  const valueObjectId = normalizeId(rawId);

  if (!valueObjectId) {
    return NextResponse.json(
      { ok: false, error: "Valid Value Object id is required" },
      { status: 400 },
    );
  }

  const { actorContext, errorResponse } = await resolveContext();

  if (errorResponse || !actorContext) {
    return errorResponse;
  }

  const { data, error } = await supabase.rpc(
    "get_value_object_alias_profile_v1",
    {
      p_owner_user_id: actorContext.appUserId,
      p_owner_actor_id: actorContext.actorId,
      p_value_object_id: valueObjectId,
    },
  );

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: rpcStatus(error.message) },
    );
  }

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  const valueObjectId = normalizeId(rawId);

  if (!valueObjectId) {
    return NextResponse.json(
      { ok: false, error: "Valid Value Object id is required" },
      { status: 400 },
    );
  }

  const { actorContext, errorResponse } = await resolveContext();

  if (errorResponse || !actorContext) {
    return errorResponse;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!isRecord(body)) {
    return NextResponse.json(
      { ok: false, error: "P2D_BODY_MUST_BE_OBJECT" },
      { status: 400 },
    );
  }

  const action: AliasAction | null =
    body.action === "add" ||
    body.action === "archive" ||
    body.action === "restore"
      ? body.action
      : null;

  if (!action) {
    return NextResponse.json(
      { ok: false, error: "P2D_ALIAS_ACTION_INVALID" },
      { status: 400 },
    );
  }

  const payload: Record<string, unknown> = {};

  if (action === "add") {
    if (typeof body.aliasText !== "string") {
      return NextResponse.json(
        { ok: false, error: "P2D_ALIAS_TEXT_REQUIRED" },
        { status: 400 },
      );
    }

    const aliasText = body.aliasText.trim();

    if (!aliasText || aliasText.length > 180) {
      return NextResponse.json(
        { ok: false, error: "P2D_ALIAS_TEXT_INVALID" },
        { status: 400 },
      );
    }

    payload.aliasText = aliasText;

    if (
      body.locale !== undefined &&
      body.locale !== null &&
      typeof body.locale !== "string"
    ) {
      return NextResponse.json(
        { ok: false, error: "P2D_ALIAS_LOCALE_INVALID" },
        { status: 400 },
      );
    }

    payload.locale =
      typeof body.locale === "string" && body.locale.trim()
        ? body.locale.trim().toLowerCase()
        : null;
  } else {
    const aliasId = normalizeId(body.aliasId);

    if (!aliasId) {
      return NextResponse.json(
        { ok: false, error: "P2D_ALIAS_ID_REQUIRED" },
        { status: 400 },
      );
    }

    payload.aliasId = aliasId;
  }

  const { data, error } = await supabase.rpc(
    "manage_value_object_alias_v1",
    {
      p_owner_user_id: actorContext.appUserId,
      p_owner_actor_id: actorContext.actorId,
      p_created_by_actor_id: actorContext.actorId,
      p_value_object_id: valueObjectId,
      p_action: action,
      p_payload: payload,
    },
  );

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: rpcStatus(error.message) },
    );
  }

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

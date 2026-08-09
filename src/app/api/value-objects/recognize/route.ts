import { NextResponse } from "next/server";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../lib/actor-context";
import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

function rpcStatus(message: string) {
  if (
    message.includes("ACCESS_DENIED") ||
    message.includes("ACTOR_NOT_OWNED")
  ) {
    return 403;
  }

  return 400;
}

export async function GET(request: Request) {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  let actorContext;

  try {
    actorContext = await resolveActiveActorContext(session.user.sub);
  } catch (error) {
    if (error instanceof ActorContextError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          errorCode: error.code,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { ok: false, error: "Could not resolve active actor context" },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const text = url.searchParams.get("text")?.trim() ?? "";
  const locale = url.searchParams.get("locale")?.trim().toLowerCase() || null;

  if (!text || text.length > 180) {
    return NextResponse.json(
      { ok: false, error: "P2D_RECOGNITION_TEXT_INVALID" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.rpc(
    "recognize_value_object_text_v1",
    {
      p_owner_user_id: actorContext.appUserId,
      p_owner_actor_id: actorContext.actorId,
      p_query_text: text,
      p_locale: locale,
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

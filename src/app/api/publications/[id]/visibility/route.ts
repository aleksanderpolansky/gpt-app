import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{ id: string }>;
};

const MESSAGE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function rpcStatus(errorCode: string | undefined) {
  if (errorCode === "42501") return 403;
  if (errorCode === "22001" || errorCode === "22023" || errorCode === "23514") {
    return 400;
  }
  if (errorCode === "P0002") return 404;
  return 500;
}

async function getCurrentActorContext() {
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
          { ok: false, error: error.code, errorMessage: error.message },
          { status: error.status },
        ),
      };
    }

    return {
      actorContext: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Could not resolve active actor context",
        },
        { status: 500 },
      ),
    };
  }
}

export async function POST(request: Request, { params }: RouteProps) {
  const startedAt = performance.now();
  const { id } = await params;

  if (!MESSAGE_ID_PATTERN.test(id)) {
    return NextResponse.json(
      { ok: false, error: "PUBLICATION_ID_INVALID" },
      { status: 400 },
    );
  }

  const contextStartedAt = performance.now();
  const context = await getCurrentActorContext();
  const contextMs = performance.now() - contextStartedAt;

  if (!context.actorContext) {
    return context.errorResponse;
  }

  const body = (await request.json().catch(() => null)) as
    | { action?: unknown }
    | null;
  const action = body?.action;

  if (action !== "hide" && action !== "restore") {
    return NextResponse.json(
      { ok: false, error: "PUBLICATION_VISIBILITY_ACTION_INVALID" },
      { status: 400 },
    );
  }

  const rpcName =
    action === "hide"
      ? "hide_message_object_for_viewer_v1"
      : "restore_message_object_for_viewer_v1";

  const rpcStartedAt = performance.now();
  const { data, error } = await supabase.rpc(rpcName, {
    p_owner_user_id: context.actorContext.appUserId,
    p_viewer_actor_id: context.actorContext.actorId,
    p_message_object_id: id,
  });

  const rpcMs = performance.now() - rpcStartedAt;

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: rpcStatus(error.code) },
    );
  }

  const revalidateStartedAt = performance.now();
  revalidatePath("/feed");
  revalidatePath("/feed/hidden");
  const revalidateMs = performance.now() - revalidateStartedAt;
  const totalMs = performance.now() - startedAt;

  return NextResponse.json(
    {
      ok: true,
      action,
      result: data,
      timingsMs: {
        context: Math.round(contextMs),
        rpc: Math.round(rpcMs),
        revalidate: Math.round(revalidateMs),
        total: Math.round(totalMs),
      },
    },
    {
      headers: {
        "cache-control": "no-store",
        "server-timing": [
          `context;dur=${contextMs.toFixed(1)}`,
          `rpc;dur=${rpcMs.toFixed(1)}`,
          `revalidate;dur=${revalidateMs.toFixed(1)}`,
          `total;dur=${totalMs.toFixed(1)}`,
        ].join(", "),
      },
    },
  );
}

import { NextResponse } from "next/server";

import type { ValueObjectStructureCardV1 } from "@/types/reality-core/value-object-structure-card-v1";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../../lib/auth0";
import { supabase } from "../../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  const valueObjectId = decodeURIComponent(rawId).trim();

  if (!UUID_PATTERN.test(valueObjectId)) {
    return NextResponse.json(
      { ok: false, error: "Valid Value Object id is required" },
      { status: 400 },
    );
  }

  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  let actorContext: Awaited<ReturnType<typeof resolveActiveActorContext>>;

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

  const { data, error } = await supabase.rpc(
    "get_value_object_structure_card_v1",
    {
      p_owner_user_id: actorContext.appUserId,
      p_owner_actor_id: actorContext.actorId,
      p_value_object_id: valueObjectId,
    },
  );

  if (error) {
    const status =
      error.code === "42501"
        ? 403
        : error.code === "P0002"
          ? 404
          : 400;

    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        errorCode: error.code ?? null,
      },
      { status },
    );
  }

  return NextResponse.json({
    ok: true,
    card: data as ValueObjectStructureCardV1,
  });
}

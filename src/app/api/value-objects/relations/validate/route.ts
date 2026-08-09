import { NextResponse } from "next/server";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type RelationCandidateBody = {
  sourceValueObjectId?: unknown;
  targetValueObjectId?: unknown;
  relationTypeCode?: unknown;
};

function normalizeId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized && normalized.length <= 200 ? normalized : null;
}

function normalizeCode(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return /^[a-z][a-z0-9_]{1,79}$/.test(normalized)
    ? normalized
    : null;
}

export async function POST(request: Request) {
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

  let body: RelationCandidateBody;

  try {
    body = (await request.json()) as RelationCandidateBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const sourceValueObjectId = normalizeId(body.sourceValueObjectId);
  const targetValueObjectId = normalizeId(body.targetValueObjectId);
  const relationTypeCode = normalizeCode(body.relationTypeCode);

  if (!sourceValueObjectId || !targetValueObjectId || !relationTypeCode) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "sourceValueObjectId, targetValueObjectId and relationTypeCode are required",
      },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.rpc(
    "validate_value_object_relation_candidate_v1",
    {
      p_owner_user_id: actorContext.appUserId,
      p_owner_actor_id: actorContext.actorId,
      p_source_value_object_id: sourceValueObjectId,
      p_target_value_object_id: targetValueObjectId,
      p_relation_type_code: relationTypeCode,
    },
  );

  if (error) {
    const status =
      error.message.includes("ACCESS_DENIED") ||
      error.message.includes("ACTOR_NOT_OWNED")
        ? 403
        : 400;

    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status },
    );
  }

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

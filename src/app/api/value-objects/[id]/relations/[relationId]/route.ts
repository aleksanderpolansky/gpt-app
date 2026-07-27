import { NextResponse } from "next/server";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../../lib/auth0";
import { supabase } from "../../../../../../../lib/supabase";
import type { ValueObjectSemanticRelationMutationResponse } from "@/types/value-object-semantic-relation";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string; relationId: string }>;
};

type StatusBody = {
  status?: unknown;
  idempotencyKey?: unknown;
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

function normalizeIdempotencyKey(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length >= 8 && normalized.length <= 200
    ? normalized
    : null;
}

function normalizeStatus(value: unknown): "active" | "inactive" | null {
  return value === "active" || value === "inactive" ? value : null;
}

function mapRpcErrorStatus(message: string) {
  if (message.includes("P10_IDEMPOTENCY_CONFLICT")) {
    return 409;
  }

  if (
    message.includes("P10_RELATION_NOT_FOUND_OR_CONTEXT_MISMATCH") ||
    message.includes("P10_STATUS_ACTOR_MISMATCH")
  ) {
    return 403;
  }

  if (
    message.includes("P10_STATUS_INVALID") ||
    message.includes("P10_STATUS_ARGUMENT_REQUIRED") ||
    message.includes("P10_IDEMPOTENCY_KEY_INVALID") ||
    message.includes("P10_RELATION_TYPE_NOT_ACTIVE_ORDINARY")
  ) {
    return 400;
  }

  return 500;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id: rawId, relationId: rawRelationId } = await context.params;
  const valueObjectId = normalizeUuid(rawId);
  const relationId = normalizeUuid(rawRelationId);

  if (!valueObjectId || !relationId) {
    return NextResponse.json(
      { ok: false, error: "Invalid value object or relation id" },
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
        { ok: false, error: error.message, errorCode: error.code },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { ok: false, error: "Could not resolve active actor context" },
      { status: 500 },
    );
  }

  let body: StatusBody;

  try {
    body = (await request.json()) as StatusBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const status = normalizeStatus(body.status);
  const idempotencyKey = normalizeIdempotencyKey(body.idempotencyKey);

  if (!status || !idempotencyKey) {
    return NextResponse.json(
      { ok: false, error: "status and idempotencyKey are required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.rpc(
    "set_value_object_relation_status_v1",
    {
      p_owner_user_id: actorContext.appUserId,
      p_owner_actor_id: actorContext.actorId,
      p_created_by_actor_id: actorContext.actorId,
      p_context_value_object_id: valueObjectId,
      p_relation_id: relationId,
      p_status: status,
      p_idempotency_key: idempotencyKey,
    },
  );

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        errorCode: error.code ?? null,
      } satisfies ValueObjectSemanticRelationMutationResponse,
      { status: mapRpcErrorStatus(error.message) },
    );
  }

  return NextResponse.json(
    data as ValueObjectSemanticRelationMutationResponse,
    { headers: { "Cache-Control": "no-store" } },
  );
}

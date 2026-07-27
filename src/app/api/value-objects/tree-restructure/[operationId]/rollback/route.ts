import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import {
  ActorContextError,
  type ResolvedActorContext,
  resolveActiveActorContext,
} from "../../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../../lib/auth0";
import { supabase } from "../../../../../../../lib/supabase";
import type {
  ValueObjectTreeRestructureError,
  ValueObjectTreeRollbackResult,
} from "@/types/value-object-tree-restructure";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ operationId: string }>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeUuid(value: unknown): string | null {
  return typeof value === "string" && UUID_PATTERN.test(value.trim())
    ? value.trim()
    : null;
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

function mapDatabaseError(error: { message: string; code?: string | null }) {
  const status =
    error.code === "42501"
      ? 403
      : error.code === "P0002"
        ? 404
        : error.code === "40001" || error.code === "23505"
          ? 409
          : 400;

  return NextResponse.json(
    {
      error: error.message || "Tree restructure rollback failed",
      errorCode: error.code ?? null,
    } satisfies ValueObjectTreeRestructureError,
    { status },
  );
}

export async function POST(request: Request, routeContext: RouteContext) {
  const { operationId: rawOperationId } = await routeContext.params;
  const operationId = normalizeUuid(rawOperationId);

  if (!operationId) {
    return NextResponse.json(
      { error: "Valid operation id is required" } satisfies ValueObjectTreeRestructureError,
      { status: 400 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ValueObjectTreeRestructureError,
      { status: 400 },
    );
  }

  const idempotencyKey =
    body && typeof body === "object" && !Array.isArray(body)
      ? normalizeIdempotencyKey(
          (body as Record<string, unknown>).idempotencyKey,
        )
      : null;

  if (!idempotencyKey) {
    return NextResponse.json(
      { error: "idempotencyKey is required" } satisfies ValueObjectTreeRestructureError,
      { status: 400 },
    );
  }

  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return NextResponse.json(
      { error: "Not authenticated" } satisfies ValueObjectTreeRestructureError,
      { status: 401 },
    );
  }

  let actorContext: ResolvedActorContext;

  try {
    actorContext = await resolveActiveActorContext(session.user.sub);
  } catch (error) {
    if (error instanceof ActorContextError) {
      return NextResponse.json(
        {
          error: error.message,
          errorCode: error.code,
        } satisfies ValueObjectTreeRestructureError,
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: "Active actor context resolution failed" } satisfies ValueObjectTreeRestructureError,
      { status: 500 },
    );
  }

  const requestHash = createHash("sha256")
    .update(JSON.stringify({ action: "rollback", operationId }), "utf8")
    .digest("hex")
    .toUpperCase();

  const { data, error } = await supabase.rpc(
    "rollback_value_object_tree_restructure_v1",
    {
      p_owner_user_id: actorContext.appUserId,
      p_owner_actor_id: actorContext.actorId,
      p_created_by_actor_id: actorContext.actorId,
      p_operation_id: operationId,
      p_idempotency_key: idempotencyKey,
      p_request_hash: requestHash,
    },
  );

  if (error) {
    return mapDatabaseError(error);
  }

  return NextResponse.json(data as ValueObjectTreeRollbackResult);
}

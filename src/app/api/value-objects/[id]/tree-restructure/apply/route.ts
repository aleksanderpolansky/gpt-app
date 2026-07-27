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
  ValueObjectTreeRestructureApplyResult,
  ValueObjectTreeRestructureError,
  ValueObjectTreeRestructureMode,
} from "@/types/value-object-tree-restructure";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeUuid(value: unknown): string | null {
  return typeof value === "string" && UUID_PATTERN.test(value.trim())
    ? value.trim()
    : null;
}

function normalizeHash(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();

  return /^[A-F0-9]{64}$/.test(normalized) ? normalized : null;
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

function isMode(value: unknown): value is ValueObjectTreeRestructureMode {
  return value === "reparent" || value === "insert_intermediate";
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
      error: error.message || "Tree restructure apply failed",
      errorCode: error.code ?? null,
    } satisfies ValueObjectTreeRestructureError,
    { status },
  );
}

export async function POST(request: Request, routeContext: RouteContext) {
  const { id: rawId } = await routeContext.params;
  const valueObjectId = normalizeUuid(rawId);

  if (!valueObjectId) {
    return NextResponse.json(
      { error: "Valid Value Object id is required" } satisfies ValueObjectTreeRestructureError,
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

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "JSON object body is required" } satisfies ValueObjectTreeRestructureError,
      { status: 400 },
    );
  }

  const input = body as Record<string, unknown>;
  const previewHash = normalizeHash(input.previewHash);
  const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey);

  if (!isMode(input.mode)) {
    return NextResponse.json(
      { error: "mode must be reparent or insert_intermediate" } satisfies ValueObjectTreeRestructureError,
      { status: 400 },
    );
  }

  if (!input.payload || typeof input.payload !== "object" || Array.isArray(input.payload)) {
    return NextResponse.json(
      { error: "payload must be an object" } satisfies ValueObjectTreeRestructureError,
      { status: 400 },
    );
  }

  if (!previewHash || !idempotencyKey) {
    return NextResponse.json(
      { error: "previewHash and idempotencyKey are required" } satisfies ValueObjectTreeRestructureError,
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
    .update(
      JSON.stringify({
        targetValueObjectId: valueObjectId,
        mode: input.mode,
        payload: input.payload,
        previewHash,
      }),
      "utf8",
    )
    .digest("hex")
    .toUpperCase();

  const { data, error } = await supabase.rpc(
    "apply_value_object_tree_restructure_v1",
    {
      p_owner_user_id: actorContext.appUserId,
      p_owner_actor_id: actorContext.actorId,
      p_created_by_actor_id: actorContext.actorId,
      p_target_value_object_id: valueObjectId,
      p_mode: input.mode,
      p_payload: input.payload,
      p_preview_hash: previewHash,
      p_idempotency_key: idempotencyKey,
      p_request_hash: requestHash,
    },
  );

  if (error) {
    return mapDatabaseError(error);
  }

  return NextResponse.json(data as ValueObjectTreeRestructureApplyResult);
}

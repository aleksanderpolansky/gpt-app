import { createHash } from "node:crypto";
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

type EditKind = "rename" | "semantic_definition";

const HIERARCHY_RELATIONS = new Set([
  "is_a",
  "part_of",
  "aspect_of",
  "subprocess_of",
]);

const VISIBILITY_CODES = new Set(["private", "shared", "public"]);

const PRIVACY_CODES = new Set([
  "public_ontology",
  "standard",
  "sensitive",
  "restricted",
]);

function normalizeValueObjectId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized && normalized.length <= 200 ? normalized : null;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeEditRequest(body: unknown):
  | {
      editKind: EditKind;
      patch: Record<string, unknown>;
      idempotencyKey: string;
      error: null;
    }
  | {
      editKind: null;
      patch: null;
      idempotencyKey: null;
      error: string;
    } {
  if (!isRecord(body)) {
    return {
      editKind: null,
      patch: null,
      idempotencyKey: null,
      error: "P2C_BODY_MUST_BE_OBJECT",
    };
  }

  const editKind =
    body.editKind === "rename" || body.editKind === "semantic_definition"
      ? body.editKind
      : null;

  if (!editKind) {
    return {
      editKind: null,
      patch: null,
      idempotencyKey: null,
      error: "P2C_EDIT_KIND_INVALID",
    };
  }

  const idempotencyKey = normalizeIdempotencyKey(body.idempotencyKey);

  if (!idempotencyKey) {
    return {
      editKind: null,
      patch: null,
      idempotencyKey: null,
      error: "P2C_IDEMPOTENCY_KEY_INVALID",
    };
  }

  if (!isRecord(body.patch)) {
    return {
      editKind: null,
      patch: null,
      idempotencyKey: null,
      error: "P2C_PATCH_MUST_BE_OBJECT",
    };
  }

  const patch: Record<string, unknown> = {};

  if (editKind === "rename") {
    const keys = Object.keys(body.patch);

    if (keys.length !== 1 || keys[0] !== "title") {
      return {
        editKind: null,
        patch: null,
        idempotencyKey: null,
        error: "P2C_RENAME_ACCEPTS_TITLE_ONLY",
      };
    }

    if (typeof body.patch.title !== "string") {
      return {
        editKind: null,
        patch: null,
        idempotencyKey: null,
        error: "P2C_TITLE_MUST_BE_STRING",
      };
    }

    const title = body.patch.title.trim();

    if (!title || title.length > 180) {
      return {
        editKind: null,
        patch: null,
        idempotencyKey: null,
        error: "P2C_TITLE_INVALID",
      };
    }

    patch.title = title;
  } else {
    const allowedKeys = new Set([
      "description",
      "hierarchyRelationCode",
      "visibilityCode",
      "privacyClassCode",
    ]);

    const unknownKey = Object.keys(body.patch).find(
      (key) => !allowedKeys.has(key),
    );

    if (unknownKey) {
      return {
        editKind: null,
        patch: null,
        idempotencyKey: null,
        error: `P2C_SEMANTIC_PATCH_KEY_FORBIDDEN:${unknownKey}`,
      };
    }

    if (Object.keys(body.patch).length === 0) {
      return {
        editKind: null,
        patch: null,
        idempotencyKey: null,
        error: "P2C_SEMANTIC_PATCH_EMPTY",
      };
    }

    if (Object.prototype.hasOwnProperty.call(body.patch, "description")) {
      const description = body.patch.description;

      if (description !== null && typeof description !== "string") {
        return {
          editKind: null,
          patch: null,
          idempotencyKey: null,
          error: "P2C_DESCRIPTION_INVALID",
        };
      }

      const normalized =
        typeof description === "string" ? description.trim() : null;

      if (normalized && normalized.length > 4000) {
        return {
          editKind: null,
          patch: null,
          idempotencyKey: null,
          error: "P2C_DESCRIPTION_TOO_LONG",
        };
      }

      patch.description = normalized || null;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        body.patch,
        "hierarchyRelationCode",
      )
    ) {
      const relation = body.patch.hierarchyRelationCode;

      if (
        relation !== null &&
        (typeof relation !== "string" || !HIERARCHY_RELATIONS.has(relation))
      ) {
        return {
          editKind: null,
          patch: null,
          idempotencyKey: null,
          error: "P2C_HIERARCHY_RELATION_INVALID",
        };
      }

      patch.hierarchyRelationCode = relation;
    }

    if (Object.prototype.hasOwnProperty.call(body.patch, "visibilityCode")) {
      const visibility = body.patch.visibilityCode;

      if (
        typeof visibility !== "string" ||
        !VISIBILITY_CODES.has(visibility)
      ) {
        return {
          editKind: null,
          patch: null,
          idempotencyKey: null,
          error: "P2C_VISIBILITY_INVALID",
        };
      }

      patch.visibilityCode = visibility;
    }

    if (
      Object.prototype.hasOwnProperty.call(body.patch, "privacyClassCode")
    ) {
      const privacy = body.patch.privacyClassCode;

      if (typeof privacy !== "string" || !PRIVACY_CODES.has(privacy)) {
        return {
          editKind: null,
          patch: null,
          idempotencyKey: null,
          error: "P2C_PRIVACY_INVALID",
        };
      }

      patch.privacyClassCode = privacy;
    }
  }

  return {
    editKind,
    patch,
    idempotencyKey,
    error: null,
  };
}

function requestHash(
  valueObjectId: string,
  editKind: EditKind,
  patch: Record<string, unknown>,
) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        valueObjectId,
        editKind,
        patch,
      }),
      "utf8",
    )
    .digest("hex")
    .toUpperCase();
}

function rpcErrorStatus(message: string) {
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
    message.includes("IDEMPOTENCY_PAYLOAD_MISMATCH") ||
    message.includes("STATUS_NOT_EDITABLE")
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
  const valueObjectId = normalizeValueObjectId(rawId);

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
    "get_value_object_definition_editor_v1",
    {
      p_owner_user_id: actorContext.appUserId,
      p_owner_actor_id: actorContext.actorId,
      p_value_object_id: valueObjectId,
    },
  );

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: rpcErrorStatus(error.message) },
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
  const valueObjectId = normalizeValueObjectId(rawId);

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

  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const normalized = normalizeEditRequest(rawBody);

  if (
    normalized.error !== null ||
    normalized.editKind === null ||
    normalized.patch === null ||
    normalized.idempotencyKey === null
  ) {
    return NextResponse.json(
      { ok: false, error: normalized.error ?? "P2C_EDIT_REQUEST_INVALID" },
      { status: 400 },
    );
  }

  const hash = requestHash(
    valueObjectId,
    normalized.editKind,
    normalized.patch,
  );

  const { data, error } = await supabase.rpc(
    "edit_value_object_ontology_definition_v1",
    {
      p_owner_user_id: actorContext.appUserId,
      p_owner_actor_id: actorContext.actorId,
      p_created_by_actor_id: actorContext.actorId,
      p_value_object_id: valueObjectId,
      p_edit_kind: normalized.editKind,
      p_patch: normalized.patch,
      p_idempotency_key: normalized.idempotencyKey,
      p_request_hash: hash,
    },
  );

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: rpcErrorStatus(error.message) },
    );
  }

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

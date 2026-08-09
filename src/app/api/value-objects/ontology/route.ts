import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import {
  isValueObjectHierarchyRelationV1,
  isValueObjectOntologyFacetV1,
  isValueObjectOntologyNodeRoleV1,
  isValueObjectPrivacyClassCodeV1,
  isValueObjectVisibilityCodeV1,
  type ValueObjectOntologyCardV1,
} from "@/types/reality-core/value-object-ontology-runtime-v1";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../lib/actor-context";
import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CreateBody = {
  title?: unknown;
  description?: unknown;
  facetCode?: unknown;
  objectKindCode?: unknown;
  nodeRoleCode?: unknown;
  parentValueObjectId?: unknown;
  hierarchyRelationCode?: unknown;
  visibilityCode?: unknown;
  privacyClassCode?: unknown;
  idempotencyKey?: unknown;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const KIND_PATTERN = /^[a-z][a-z0-9_]{1,119}$/;

function requiredText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!normalized || normalized.length > maxLength) {
    return null;
  }

  return normalized;
}

function optionalUuid(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return UUID_PATTERN.test(normalized) ? normalized : null;
}

function idempotencyKey(value: unknown): string | null {
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
        : error.code === "23505" || error.code === "23514"
          ? 409
          : 400;

  return NextResponse.json(
    {
      ok: false,
      error: error.message || "Ontology Value Object creation failed.",
      errorCode: error.code ?? null,
    },
    { status },
  );
}

export async function POST(request: Request) {
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

  let body: CreateBody;

  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const title = requiredText(body.title, 180);
  const description = requiredText(body.description, 4000);
  const objectKindCode = requiredText(body.objectKindCode, 120);
  const key = idempotencyKey(body.idempotencyKey);

  if (!title) {
    return NextResponse.json(
      { ok: false, error: "title is required and must be 180 characters or fewer" },
      { status: 400 },
    );
  }

  if (!description) {
    return NextResponse.json(
      { ok: false, error: "description is required and must be 4000 characters or fewer" },
      { status: 400 },
    );
  }

  if (!objectKindCode || !KIND_PATTERN.test(objectKindCode)) {
    return NextResponse.json(
      { ok: false, error: "A valid objectKindCode is required" },
      { status: 400 },
    );
  }

  if (!isValueObjectOntologyFacetV1(body.facetCode)) {
    return NextResponse.json(
      { ok: false, error: "A valid facetCode is required" },
      { status: 400 },
    );
  }

  if (!isValueObjectOntologyNodeRoleV1(body.nodeRoleCode)) {
    return NextResponse.json(
      { ok: false, error: "A valid nodeRoleCode is required" },
      { status: 400 },
    );
  }

  const parentValueObjectId = optionalUuid(body.parentValueObjectId);

  if (
    body.parentValueObjectId !== null &&
    body.parentValueObjectId !== undefined &&
    body.parentValueObjectId !== "" &&
    !parentValueObjectId
  ) {
    return NextResponse.json(
      { ok: false, error: "parentValueObjectId must be a valid UUID" },
      { status: 400 },
    );
  }

  const hierarchyRelationCode =
    body.hierarchyRelationCode === null ||
    body.hierarchyRelationCode === undefined ||
    body.hierarchyRelationCode === ""
      ? null
      : isValueObjectHierarchyRelationV1(body.hierarchyRelationCode)
        ? body.hierarchyRelationCode
        : null;

  if (
    body.nodeRoleCode !== "root" &&
    !hierarchyRelationCode
  ) {
    return NextResponse.json(
      { ok: false, error: "Non-root objects require hierarchyRelationCode" },
      { status: 400 },
    );
  }

  if (body.nodeRoleCode === "root" && hierarchyRelationCode !== null) {
    return NextResponse.json(
      { ok: false, error: "Root objects cannot have hierarchyRelationCode" },
      { status: 400 },
    );
  }

  if (body.nodeRoleCode === "root" && parentValueObjectId !== null) {
    return NextResponse.json(
      { ok: false, error: "Root objects cannot have a parent" },
      { status: 400 },
    );
  }

  if (body.nodeRoleCode !== "root" && parentValueObjectId === null) {
    return NextResponse.json(
      { ok: false, error: "Non-root objects require parentValueObjectId" },
      { status: 400 },
    );
  }

  const visibilityCode =
    body.visibilityCode === undefined
      ? "private"
      : isValueObjectVisibilityCodeV1(body.visibilityCode)
        ? body.visibilityCode
        : null;

  if (!visibilityCode) {
    return NextResponse.json(
      { ok: false, error: "Invalid visibilityCode" },
      { status: 400 },
    );
  }

  const privacyClassCode =
    body.privacyClassCode === undefined
      ? "standard"
      : isValueObjectPrivacyClassCodeV1(body.privacyClassCode)
        ? body.privacyClassCode
        : null;

  if (!privacyClassCode) {
    return NextResponse.json(
      { ok: false, error: "Invalid privacyClassCode" },
      { status: 400 },
    );
  }

  if (!key) {
    return NextResponse.json(
      {
        ok: false,
        error: "idempotencyKey is required and must be 8-200 characters",
      },
      { status: 400 },
    );
  }

  const payload = {
    title,
    description,
    facetCode: body.facetCode,
    objectKindCode,
    nodeRoleCode: body.nodeRoleCode,
    parentValueObjectId,
    hierarchyRelationCode,
    visibilityCode,
    privacyClassCode,
  };

  const requestHash = createHash("sha256")
    .update(JSON.stringify(payload), "utf8")
    .digest("hex")
    .toUpperCase();

  const { data, error } = await supabase.rpc(
    "create_value_object_ontology_v1",
    {
      p_owner_user_id: actorContext.appUserId,
      p_owner_actor_id: actorContext.actorId,
      p_created_by_actor_id: actorContext.actorId,
      p_payload: payload,
      p_idempotency_key: key,
      p_request_hash: requestHash,
    },
  );

  if (error) {
    return mapDatabaseError(error);
  }

  return NextResponse.json({
    ok: true,
    card: data as ValueObjectOntologyCardV1,
  });
}

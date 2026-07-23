/**
 * GPT-APP / AI-NAVIGATOR
 * P4.10.0-C8-I-D4-F-B-D-C
 *
 * Controlled state fact persistence — target Value Object resolver helper.
 *
 * Status:
 * - TARGET VALUE OBJECT RESOLVER ONLY
 * - NO ROUTE
 * - NO STATE FACT WRITE
 * - NO STATE FACT STORAGE TABLE ACCESS
 * - NO STATE FACT CREATED
 *
 * Core rules preserved:
 * - valueObjectId alone is not enough for persistence permission.
 * - public/catalog visibility is not write permission.
 * - target Value Object must be loaded server-side.
 * - this helper does not create or update Value Objects.
 * - this helper does not persist state facts.
 */

import { supabase } from "../../../supabase";

import type {
  AuthenticatedStateFactActor,
  StateFactAccessMode,
  StateFactPersistenceErrorCode,
  StateFactTargetValueObject,
  UuidString,
} from "./types";

type ValueObjectRow = {
  id?: unknown;
  title?: unknown;
  owner_user_id?: unknown;
  owner_actor_id?: unknown;
  organization_id?: unknown;
  [key: string]: unknown;
};

export type ResolveStateFactTargetValueObjectInput = {
  valueObjectId: UuidString;
  authenticatedActor: AuthenticatedStateFactActor;
};

export type ResolveStateFactTargetValueObjectSuccess = {
  ok: true;
  targetValueObject: StateFactTargetValueObject;
  errorCode: null;
  safeMessage: null;
};

export type ResolveStateFactTargetValueObjectFailure = {
  ok: false;
  targetValueObject: null;
  errorCode: StateFactPersistenceErrorCode;
  safeMessage: string;
};

export type ResolveStateFactTargetValueObjectResult =
  | ResolveStateFactTargetValueObjectSuccess
  | ResolveStateFactTargetValueObjectFailure;

const PLACEHOLDER_UUIDS = new Set<string>([
  "00000000-0000-0000-0000-000000000000",
  "11111111-1111-1111-1111-111111111111",
]);

const PUBLIC_VISIBILITY_NOT_WRITE_PERMISSION: StateFactPersistenceErrorCode =
  "PUBLIC_VISIBILITY_IS_NOT_WRITE_PERMISSION";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function toNullableString(value: unknown): string | null {
  if (!isNonEmptyString(value)) {
    return null;
  }

  return value.trim();
}

function isPlaceholderUuid(value: string): boolean {
  return PLACEHOLDER_UUIDS.has(value.trim().toLowerCase());
}

function buildFailure(
  errorCode: StateFactPersistenceErrorCode,
  safeMessage: string
): ResolveStateFactTargetValueObjectFailure {
  return {
    ok: false,
    targetValueObject: null,
    errorCode,
    safeMessage,
  };
}

function buildSuccess(
  targetValueObject: StateFactTargetValueObject
): ResolveStateFactTargetValueObjectSuccess {
  return {
    ok: true,
    targetValueObject,
    errorCode: null,
    safeMessage: null,
  };
}

/**
 * Resolves a Value Object target for future controlled state fact persistence.
 *
 * This helper is intentionally read-only:
 * - reads value_objects by id;
 * - checks owner_user_id + owner_actor_id against authenticated context;
 * - treats public/catalog visibility as insufficient for write permission;
 * - does not create or update any row;
 * - does not touch the future state fact storage table.
 *
 * Organization access is deliberately conservative in this step:
 * if organization_id exists and owner_actor_id matches the authenticated actor,
 * access is marked as organization_actor. Broader organization role resolution
 * must be handled by a later dedicated helper/extension.
 */
export async function resolveStateFactTargetValueObject(
  input: ResolveStateFactTargetValueObjectInput
): Promise<ResolveStateFactTargetValueObjectResult> {
  const valueObjectId = toNullableString(input.valueObjectId);

  if (!valueObjectId) {
    return buildFailure(
      "TARGET_VALUE_OBJECT_MISSING",
      "Target Value Object identifier is required before controlled persistence can be considered."
    );
  }

  if (isPlaceholderUuid(valueObjectId)) {
    return buildFailure(
      "TARGET_VALUE_OBJECT_ACCESS_DENIED",
      "Placeholder Value Object identifiers cannot be used for controlled persistence."
    );
  }

  const { data: valueObjectData, error: valueObjectError } = await supabase
    .from("value_objects")
    .select("id, title, owner_user_id, owner_actor_id, organization_id")
    .eq("id", valueObjectId)
    .maybeSingle();

  if (valueObjectError) {
    return buildFailure(
      "UNKNOWN_ERROR",
      "Target Value Object could not be read for controlled persistence."
    );
  }

  const valueObject = valueObjectData as ValueObjectRow | null;

  if (!valueObject) {
    return buildFailure(
      "TARGET_VALUE_OBJECT_NOT_FOUND",
      "Target Value Object was not found."
    );
  }

  const resolvedValueObjectId = toNullableString(valueObject.id);
  const ownerUserId = toNullableString(valueObject.owner_user_id);
  const ownerActorId = toNullableString(valueObject.owner_actor_id);
  const organizationId = toNullableString(valueObject.organization_id);
  const title = toNullableString(valueObject.title);

  if (!resolvedValueObjectId || resolvedValueObjectId !== valueObjectId) {
    return buildFailure(
      "TARGET_VALUE_OBJECT_NOT_FOUND",
      "Target Value Object identity is incomplete or inconsistent."
    );
  }

  if (isPlaceholderUuid(resolvedValueObjectId)) {
    return buildFailure(
      "TARGET_VALUE_OBJECT_ACCESS_DENIED",
      "Placeholder Value Object identifiers cannot be used for controlled persistence."
    );
  }

  if (ownerActorId && isPlaceholderUuid(ownerActorId)) {
    return buildFailure(
      "TARGET_VALUE_OBJECT_ACCESS_DENIED",
      "Placeholder owner actor identifiers cannot grant controlled persistence permission."
    );
  }

  if (organizationId && isPlaceholderUuid(organizationId)) {
    return buildFailure(
      "TARGET_VALUE_OBJECT_ACCESS_DENIED",
      "Placeholder organization identifiers cannot grant controlled persistence permission."
    );
  }

  const authenticatedActorId = input.authenticatedActor.actorId;

  if (!authenticatedActorId) {
    return buildFailure(
      "TARGET_VALUE_OBJECT_ACCESS_DENIED",
      "Authenticated actor context is required for controlled persistence permission."
    );
  }

  if (isPlaceholderUuid(authenticatedActorId)) {
    return buildFailure(
      "TARGET_VALUE_OBJECT_ACCESS_DENIED",
      "Placeholder authenticated actor identifiers cannot be used for controlled persistence."
    );
  }

  if (
    !ownerUserId ||
    ownerUserId !== input.authenticatedActor.appUserId ||
    !ownerActorId ||
    ownerActorId !== authenticatedActorId
  ) {
    return buildFailure(
      PUBLIC_VISIBILITY_NOT_WRITE_PERMISSION,
      "Target Value Object is not owned by the authenticated actor. Public visibility is not write permission."
    );
  }

  const accessMode: StateFactAccessMode = organizationId
    ? "organization_actor"
    : "personal_owner";

  const targetValueObject: StateFactTargetValueObject = {
    valueObjectId: resolvedValueObjectId,
    ownerActorId,
    organizationId,
    accessMode,
    title,
  };

  return buildSuccess(targetValueObject);
}

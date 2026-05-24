/**
 * GPT-APP / AI-NAVIGATOR
 * P4.10.0-C8-I-D4-F-B-D-B
 *
 * Controlled state fact persistence — auth resolver helper.
 *
 * Status:
 * - AUTH RESOLVER ONLY
 * - NO ROUTE
 * - NO STATE FACT WRITE
 * - NO STATE FACT STORAGE TABLE ACCESS
 * - NO STATE FACT CREATED
 *
 * Core rules preserved:
 * - client-provided user_id must never become persisted user_id.
 * - auth identity must be resolved server-side.
 * - placeholder UUIDs must be rejected.
 * - this helper does not create users, persons, actors, state facts, or dimensions.
 */

import { auth0 } from "../../../auth0";
import { supabase } from "../../../supabase";

import type {
  AuthenticatedStateFactActor,
  StateFactPersistenceErrorCode,
  UuidString,
} from "./types";

type AuthSessionUserLike = {
  sub?: unknown;
  email?: unknown;
  [key: string]: unknown;
};

type AppUserRow = {
  id?: unknown;
  auth0_sub?: unknown;
  email?: unknown;
  [key: string]: unknown;
};

type PersonRow = {
  id?: unknown;
  user_id?: unknown;
  [key: string]: unknown;
};

type ActorRow = {
  id?: unknown;
  person_id?: unknown;
  actor_type?: unknown;
  [key: string]: unknown;
};

export type ResolveAuthenticatedStateFactActorSuccess = {
  ok: true;
  actor: AuthenticatedStateFactActor;
  errorCode: null;
  safeMessage: null;
};

export type ResolveAuthenticatedStateFactActorFailure = {
  ok: false;
  actor: null;
  errorCode: StateFactPersistenceErrorCode;
  safeMessage: string;
};

export type ResolveAuthenticatedStateFactActorResult =
  | ResolveAuthenticatedStateFactActorSuccess
  | ResolveAuthenticatedStateFactActorFailure;

const PLACEHOLDER_UUIDS = new Set<string>([
  "00000000-0000-0000-0000-000000000000",
  "11111111-1111-1111-1111-111111111111",
]);

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
): ResolveAuthenticatedStateFactActorFailure {
  return {
    ok: false,
    actor: null,
    errorCode,
    safeMessage,
  };
}

function buildSuccess(
  actor: AuthenticatedStateFactActor
): ResolveAuthenticatedStateFactActorSuccess {
  return {
    ok: true,
    actor,
    errorCode: null,
    safeMessage: null,
  };
}

/**
 * Resolves the authenticated application user for future controlled state fact persistence.
 *
 * This helper is intentionally read-only:
 * - reads Auth0 session;
 * - reads app_users by auth0_sub;
 * - optionally reads persons and actors;
 * - does not create or update any row;
 * - does not touch the future state fact storage table.
 */
export async function resolveAuthenticatedStateFactActor(): Promise<ResolveAuthenticatedStateFactActorResult> {
  const session = await auth0.getSession();

  if (!session?.user) {
    return buildFailure(
      "NOT_AUTHENTICATED",
      "Authentication is required before a state fact can be considered for controlled persistence."
    );
  }

  const sessionUser = session.user as AuthSessionUserLike;
  const authSubject = toNullableString(sessionUser.sub);

  if (!authSubject) {
    return buildFailure(
      "AMBIGUOUS_IDENTITY",
      "Authenticated session does not contain a stable subject identifier."
    );
  }

  const { data: appUserData, error: appUserError } = await supabase
    .from("app_users")
    .select("id, auth0_sub, email")
    .eq("auth0_sub", authSubject)
    .maybeSingle();

  if (appUserError) {
    return buildFailure(
      "APP_USER_NOT_FOUND",
      "Application user could not be resolved from authenticated identity."
    );
  }

  const appUser = appUserData as AppUserRow | null;

  if (!appUser) {
    return buildFailure(
      "APP_USER_NOT_FOUND",
      "Application user was not found for authenticated identity."
    );
  }

  const appUserId = toNullableString(appUser.id);
  const appUserAuthSubject = toNullableString(appUser.auth0_sub);

  if (!appUserId || !appUserAuthSubject || appUserAuthSubject !== authSubject) {
    return buildFailure(
      "AMBIGUOUS_IDENTITY",
      "Application user identity is incomplete or inconsistent."
    );
  }

  if (isPlaceholderUuid(appUserId)) {
    return buildFailure(
      "PLACEHOLDER_USER_BLOCKED",
      "Placeholder application user identifiers cannot be used for controlled persistence."
    );
  }

  const { data: personData, error: personError } = await supabase
    .from("persons")
    .select("id, user_id")
    .eq("user_id", appUserId)
    .maybeSingle();

  if (personError) {
    return buildFailure(
      "UNKNOWN_ERROR",
      "Person context could not be read for authenticated application user."
    );
  }

  const person = personData as PersonRow | null;
  const personId = person ? toNullableString(person.id) : null;

  if (personId && isPlaceholderUuid(personId)) {
    return buildFailure(
      "PLACEHOLDER_USER_BLOCKED",
      "Placeholder person identifiers cannot be used for controlled persistence."
    );
  }

  let actorId: UuidString | null = null;

  if (personId) {
    const { data: actorData, error: actorError } = await supabase
      .from("actors")
      .select("id, person_id, actor_type")
      .eq("person_id", personId)
      .eq("actor_type", "person")
      .maybeSingle();

    if (actorError) {
      return buildFailure(
        "UNKNOWN_ERROR",
        "Actor context could not be read for authenticated person."
      );
    }

    const actor = actorData as ActorRow | null;
    const resolvedActorId = actor ? toNullableString(actor.id) : null;

    if (resolvedActorId && isPlaceholderUuid(resolvedActorId)) {
      return buildFailure(
        "PLACEHOLDER_USER_BLOCKED",
        "Placeholder actor identifiers cannot be used for controlled persistence."
      );
    }

    actorId = resolvedActorId;
  }

  const actor: AuthenticatedStateFactActor = {
    appUserId,
    actorId,
    personId,
    authSubject,
    email: toNullableString(sessionUser.email) ?? toNullableString(appUser.email),
  };

  return buildSuccess(actor);
}

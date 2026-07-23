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

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../actor-context";
import { auth0 } from "../../../auth0";

import type {
  AuthenticatedStateFactActor,
  StateFactPersistenceErrorCode,
} from "./types";

type AuthSessionUserLike = {
  sub?: unknown;
  email?: unknown;
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
 * - resolves the server-selected active actor;
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

  try {
    const actorContext = await resolveActiveActorContext(authSubject);

    if (
      isPlaceholderUuid(actorContext.appUserId) ||
      isPlaceholderUuid(actorContext.actorId)
    ) {
      return buildFailure(
        "PLACEHOLDER_USER_BLOCKED",
        "Placeholder user or actor identifiers cannot be used for controlled persistence."
      );
    }

    const actor: AuthenticatedStateFactActor = {
      appUserId: actorContext.appUserId,
      actorId: actorContext.actorId,
      personId: null,
      authSubject,
      email: toNullableString(sessionUser.email),
    };

    return buildSuccess(actor);
  } catch (error) {
    if (
      error instanceof ActorContextError &&
      error.code === "APP_USER_NOT_FOUND"
    ) {
      return buildFailure(
        "APP_USER_NOT_FOUND",
        "Application user was not found for authenticated identity."
      );
    }

    return buildFailure(
      "UNKNOWN_ERROR",
      "Active actor context could not be resolved for controlled persistence."
    );
  }
}

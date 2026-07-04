import crypto from "crypto";
import { NextResponse } from "next/server";

import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER = "app-session-heartbeat-route-step19g-v1" as const;
const MIN_SESSION_ID_LENGTH = 16;
const MAX_SESSION_ID_LENGTH = 256;

type AppUserRow = {
  id: string;
  auth0_sub: string;
  access_status: string | null;
  access_blocked_at: string | null;
  access_block_reason: string | null;
};

type AppUserSessionRow = {
  id: string;
  request_count: number | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asTrimmedString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function isValidClientSessionId(value: string | null): value is string {
  return (
    typeof value === "string" &&
    value.length >= MIN_SESSION_ID_LENGTH &&
    value.length <= MAX_SESSION_ID_LENGTH
  );
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return asRecord(body) ?? {};
  } catch {
    return {};
  }
}

function unauthorizedResponse() {
  return NextResponse.json(
    {
      ok: false,
      routeMarker: ROUTE_MARKER,
      errorCode: "APP_SESSION_HEARTBEAT_UNAUTHENTICATED",
      errorMessage: "Authentication is required.",
      sideEffects: {
        dbReadExecuted: false,
        dbWriteExecuted: false,
        openAiCallExecuted: false,
        rowsActuallyWritten: 0,
      },
    },
    { status: 401 },
  );
}

export async function POST(request: Request) {
  const session = await auth0.getSession();
  const auth0Sub = asTrimmedString(session?.user?.sub);

  if (!auth0Sub) {
    return unauthorizedResponse();
  }

  const body = await readJsonBody(request);
  const clientSessionId = asTrimmedString(body.clientSessionId);

  if (!isValidClientSessionId(clientSessionId)) {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        errorCode: "APP_SESSION_HEARTBEAT_INVALID_CLIENT_SESSION_ID",
        errorMessage:
          "clientSessionId must be a non-empty string between 16 and 256 characters.",
        sideEffects: {
          dbReadExecuted: false,
          dbWriteExecuted: false,
          openAiCallExecuted: false,
          rowsActuallyWritten: 0,
        },
      },
      { status: 400 },
    );
  }

  const { data: appUsers, error: appUserError } = await supabase
    .from("app_users")
    .select("id, auth0_sub, access_status, access_blocked_at, access_block_reason")
    .eq("auth0_sub", auth0Sub)
    .limit(2);

  if (appUserError) {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        errorCode: "APP_SESSION_HEARTBEAT_APP_USER_READ_FAILED",
        errorMessage: appUserError.message,
        sideEffects: {
          dbReadExecuted: true,
          dbWriteExecuted: false,
          openAiCallExecuted: false,
          rowsActuallyWritten: 0,
        },
      },
      { status: 500 },
    );
  }

  const rows = ((appUsers ?? []) as unknown) as AppUserRow[];

  if (rows.length !== 1) {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        errorCode: "APP_SESSION_HEARTBEAT_APP_USER_MAPPING_NOT_FOUND",
        errorMessage: "Authenticated Auth0 user is not linked to exactly one app_users row.",
        auth0SubFound: Boolean(auth0Sub),
        appUserRowsFound: rows.length,
        sideEffects: {
          dbReadExecuted: true,
          dbWriteExecuted: false,
          openAiCallExecuted: false,
          rowsActuallyWritten: 0,
        },
      },
      { status: 409 },
    );
  }

  const appUser = rows[0];

  if (appUser.access_status === "blocked") {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        errorCode: "APP_SESSION_HEARTBEAT_USER_BLOCKED",
        errorMessage: "This account has been blocked by a platform administrator.",
        blockedAt: appUser.access_blocked_at,
        blockedReason: appUser.access_block_reason,
        sideEffects: {
          dbReadExecuted: true,
          dbWriteExecuted: false,
          openAiCallExecuted: false,
          rowsActuallyWritten: 0,
        },
      },
      { status: 403 },
    );
  }

  const now = new Date().toISOString();
  const userAgent = request.headers.get("user-agent") ?? "";
  const clientSessionIdHash = sha256(`${appUser.id}:${clientSessionId}`);
  const userAgentHash = userAgent ? sha256(userAgent.slice(0, 1024)) : null;

  const { data: existingSession, error: existingSessionError } = await supabase
    .from("app_user_sessions")
    .select("id, request_count")
    .eq("app_user_id", appUser.id)
    .eq("client_session_id_hash", clientSessionIdHash)
    .maybeSingle();

  if (existingSessionError) {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        errorCode: "APP_SESSION_HEARTBEAT_SESSION_READ_FAILED",
        errorMessage: existingSessionError.message,
        sideEffects: {
          dbReadExecuted: true,
          dbWriteExecuted: false,
          openAiCallExecuted: false,
          rowsActuallyWritten: 0,
        },
      },
      { status: 500 },
    );
  }

  let sessionWriteError: string | null = null;
  let sessionWriteMode: "insert" | "update" = "insert";

  if (existingSession?.id) {
    sessionWriteMode = "update";

    const existingRequestCount =
      typeof (existingSession as AppUserSessionRow).request_count === "number"
        ? ((existingSession as AppUserSessionRow).request_count ?? 0)
        : 0;

    const { error } = await supabase
      .from("app_user_sessions")
      .update({
        last_seen_at: now,
        request_count: existingRequestCount + 1,
        status: "active",
        user_agent_hash: userAgentHash,
        metadata: {
          routeMarker: ROUTE_MARKER,
          lastHeartbeatAt: now,
        },
      })
      .eq("id", existingSession.id);

    sessionWriteError = error?.message ?? null;
  } else {
    const { error } = await supabase
      .from("app_user_sessions")
      .insert({
        app_user_id: appUser.id,
        client_session_id_hash: clientSessionIdHash,
        user_agent_hash: userAgentHash,
        first_seen_at: now,
        last_seen_at: now,
        request_count: 1,
        status: "active",
        metadata: {
          routeMarker: ROUTE_MARKER,
          createdBy: "client_heartbeat",
          firstHeartbeatAt: now,
        },
      });

    sessionWriteError = error?.message ?? null;
  }

  if (sessionWriteError) {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        errorCode: "APP_SESSION_HEARTBEAT_SESSION_WRITE_FAILED",
        errorMessage: sessionWriteError,
        sessionWriteMode,
        sideEffects: {
          dbReadExecuted: true,
          dbWriteExecuted: true,
          openAiCallExecuted: false,
          rowsActuallyWritten: 0,
        },
      },
      { status: 500 },
    );
  }

  const { error: appUserUpdateError } = await supabase
    .from("app_users")
    .update({
      last_seen_at: now,
      updated_at: now,
    })
    .eq("id", appUser.id);

  if (appUserUpdateError) {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        errorCode: "APP_SESSION_HEARTBEAT_APP_USER_LAST_SEEN_UPDATE_FAILED",
        errorMessage: appUserUpdateError.message,
        sessionWriteMode,
        sideEffects: {
          dbReadExecuted: true,
          dbWriteExecuted: true,
          openAiCallExecuted: false,
          rowsActuallyWritten: 1,
        },
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    routeMarker: ROUTE_MARKER,
    heartbeatStatus: "recorded",
    sessionWriteMode,
    serverSeenAt: now,
    sideEffects: {
      dbReadExecuted: true,
      dbWriteExecuted: true,
      openAiCallExecuted: false,
      rowsActuallyWritten: 2,
    },
  });
}

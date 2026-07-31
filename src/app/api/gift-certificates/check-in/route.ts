import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../lib/actor-context";
import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type RequestBody = {
  readonly qrSessionId?: unknown;
  readonly token?: unknown;
  readonly locale?: unknown;
};

type CheckinPayload = {
  readonly ok?: boolean;
  readonly disposition?: string;
  readonly activityEventId?: string;
  readonly qrSessionId?: string;
  readonly checkinId?: string;
  readonly checkinStatus?: string;
  readonly checkedInAt?: string;
  readonly confirmationId?: string;
  readonly confirmationStatus?: string;
  readonly requestDueAt?: string;
  readonly certificateLifecycleStatus?: string;
  readonly pointsChanged?: boolean;
  readonly reputationChanged?: boolean;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RAW_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeUuid(value: unknown): string | null {
  const normalized = normalizeString(value);
  return normalized && UUID_PATTERN.test(normalized) ? normalized : null;
}

function normalizeToken(value: unknown): string | null {
  const normalized = normalizeString(value);
  return normalized && RAW_TOKEN_PATTERN.test(normalized) ? normalized : null;
}

function normalizeLocale(value: unknown): string {
  return value === "pl" || value === "ru" || value === "uk" ||
    value === "de" || value === "es" || value === "cs"
    ? value
    : "en";
}

function buildDetailsUrl(activityEventId: string, locale: string): string {
  const pathname = `/certificates/${activityEventId}`;
  return locale === "en"
    ? pathname
    : `${pathname}?locale=${encodeURIComponent(locale)}`;
}

function mapErrorStatus(errorCode: string): number {
  if (
    errorCode.includes("SESSION_NOT_FOUND") ||
    errorCode.includes("CERTIFICATE_NOT_FOUND")
  ) return 404;

  if (
    errorCode.includes("NOT_AUTHORIZED") ||
    errorCode.includes("CONTEXT_NOT_AVAILABLE") ||
    errorCode.includes("TOKEN_INVALID")
  ) return 403;

  if (
    errorCode.includes("QR_EXPIRED") ||
    errorCode.includes("QR_REVOKED") ||
    errorCode.includes("ONLY_ACTIVE") ||
    errorCode.includes("NOT_YET_VALID") ||
    errorCode.includes("VALIDITY_ENDED") ||
    errorCode.includes("ALREADY_CHECKED_IN")
  ) return 409;

  return 400;
}

export async function POST(request: Request) {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return NextResponse.json(
      {
        ok: false,
        error: "Not authenticated",
        errorCode: "PGC10D_NOT_AUTHENTICATED",
      },
      { status: 401 },
    );
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON body",
        errorCode: "PGC10D_INVALID_JSON",
      },
      { status: 400 },
    );
  }

  const qrSessionId = normalizeUuid(body.qrSessionId);
  const rawToken = normalizeToken(body.token);
  const locale = normalizeLocale(body.locale);

  if (!qrSessionId || !rawToken) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid check-in request",
        errorCode: "PGC10D_CHECKIN_INPUT_INVALID",
      },
      { status: 400 },
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
      {
        ok: false,
        error: "Could not resolve active actor context",
        errorCode: "PGC10D_ACTOR_CONTEXT_FAILED",
      },
      { status: 500 },
    );
  }

  const tokenHash = createHash("sha256")
    .update(rawToken, "utf8")
    .digest("hex");

  const { data, error } = await supabase.rpc(
    "register_gift_certificate_fulfillment_checkin_v1",
    {
      p_provider_owner_user_id: actorContext.appUserId,
      p_provider_manager_actor_id: actorContext.actorId,
      p_qr_session_id: qrSessionId,
      p_token_hash: tokenHash,
      p_token_version: "sha256-v1",
    },
  );

  if (error) {
    const errorCode =
      typeof error.message === "string" && error.message.trim()
        ? error.message.trim()
        : error.code ?? "PGC10D_CHECKIN_FAILED";

    return NextResponse.json(
      { ok: false, error: error.message, errorCode },
      {
        status: mapErrorStatus(errorCode),
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const payload = data as CheckinPayload | null;

  if (
    !payload?.ok ||
    payload.qrSessionId !== qrSessionId ||
    !payload.activityEventId ||
    !payload.checkinId ||
    payload.checkinStatus !== "registered" ||
    payload.certificateLifecycleStatus !== "active" ||
    payload.pointsChanged !== false ||
    payload.reputationChanged !== false
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Check-in returned an invalid result",
        errorCode: "PGC10D_CHECKIN_RESULT_INVALID",
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      disposition: payload.disposition ?? "registered",
      activityEventId: payload.activityEventId,
      qrSessionId,
      checkinId: payload.checkinId,
      checkinStatus: payload.checkinStatus,
      checkedInAt: payload.checkedInAt ?? null,
      confirmationId: payload.confirmationId ?? null,
      confirmationStatus: payload.confirmationStatus ?? "pending",
      requestDueAt: payload.requestDueAt ?? null,
      certificateLifecycleStatus: "active",
      pointsChanged: false,
      reputationChanged: false,
      redirectUrl: buildDetailsUrl(payload.activityEventId, locale),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../lib/actor-context";
import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type RedeemBody = {
  readonly activityEventId?: unknown;
  readonly publicCode?: unknown;
  readonly qrToken?: unknown;
  readonly locale?: unknown;
};

type RedeemPayload = {
  readonly ok?: boolean;
  readonly disposition?: string;
  readonly activityEventId?: string;
  readonly lifecycleStatus?: string;
  readonly publicCode?: string;
  readonly redeemedAt?: string;
  readonly pointsChanged?: boolean;
  readonly reputationChanged?: boolean;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PUBLIC_CODE_PATTERN = /^GC-[A-F0-9]{20}$/;
const RAW_QR_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const result = value.trim();

  return result.length > 0 ? result : null;
}

function normalizeUuid(value: unknown): string | null {
  const result = normalizeString(value);

  return result && UUID_PATTERN.test(result) ? result : null;
}

function normalizePublicCode(value: unknown): string | null {
  const result = normalizeString(value)?.toUpperCase() ?? null;

  return result && PUBLIC_CODE_PATTERN.test(result) ? result : null;
}

function normalizeQrToken(value: unknown): string | null {
  const result = normalizeString(value);

  return result && RAW_QR_TOKEN_PATTERN.test(result) ? result : null;
}

function normalizeLocale(value: unknown): string {
  return value === "pl" ||
    value === "ru" ||
    value === "uk" ||
    value === "de" ||
    value === "es" ||
    value === "cs"
    ? value
    : "en";
}

function buildDetailsUrl(
  activityEventId: string,
  locale: string,
): string {
  const pathname = `/certificates/${activityEventId}`;

  return locale === "en"
    ? pathname
    : `${pathname}?locale=${encodeURIComponent(locale)}`;
}

function mapRedeemErrorStatus(errorCode: string): number {
  if (errorCode.includes("CERTIFICATE_NOT_FOUND")) {
    return 404;
  }

  if (
    errorCode.includes("NOT_AUTHORIZED") ||
    errorCode.includes("CONTEXT_NOT_AVAILABLE") ||
    errorCode.includes("QR_CREDENTIALS_INVALID")
  ) {
    return 403;
  }

  if (
    errorCode.includes("ONLY_ACTIVE") ||
    errorCode.includes("NOT_YET_VALID") ||
    errorCode.includes("VALIDITY_ENDED") ||
    errorCode.includes("CONCURRENT_STATE_CHANGE") ||
    errorCode.includes("REDEEMED_STATE_INVALID")
  ) {
    return 409;
  }

  return 400;
}

export async function POST(request: Request) {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return NextResponse.json(
      {
        ok: false,
        error: "Not authenticated",
        errorCode: "PGC9B_NOT_AUTHENTICATED",
      },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  let body: RedeemBody;

  try {
    body = (await request.json()) as RedeemBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON body",
        errorCode: "PGC9B_INVALID_JSON",
      },
      { status: 400 },
    );
  }

  const activityEventId = normalizeUuid(body.activityEventId);
  const publicCode = normalizePublicCode(body.publicCode);
  const rawQrToken = normalizeQrToken(body.qrToken);
  const locale = normalizeLocale(body.locale);

  if (!activityEventId || !publicCode || !rawQrToken) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid QR redemption request",
        errorCode: "PGC9B_REDEMPTION_INPUT_INVALID",
      },
      { status: 400 },
    );
  }

  let actorContext: Awaited<
    ReturnType<typeof resolveActiveActorContext>
  >;

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
      {
        ok: false,
        error: "Could not resolve active actor context",
        errorCode: "PGC9B_ACTOR_CONTEXT_FAILED",
      },
      { status: 500 },
    );
  }

  const qrTokenHash = createHash("sha256")
    .update(rawQrToken, "utf8")
    .digest("hex");

  const { data, error } = await supabase.rpc(
    "redeem_gift_certificate_activity_v1",
    {
      p_provider_owner_user_id: actorContext.appUserId,
      p_provider_manager_actor_id: actorContext.actorId,
      p_activity_event_id: activityEventId,
      p_public_code: publicCode,
      p_qr_token_hash: qrTokenHash,
      p_qr_token_version: "hmac-sha256-v1",
    },
  );

  if (error) {
    const errorCode =
      typeof error.message === "string" && error.message.trim()
        ? error.message.trim()
        : error.code ?? "PGC9B_REDEMPTION_FAILED";

    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        errorCode,
      },
      {
        status: mapRedeemErrorStatus(errorCode),
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const payload = data as RedeemPayload | null;

  if (
    !payload?.ok ||
    payload.activityEventId !== activityEventId ||
    payload.publicCode !== publicCode ||
    payload.lifecycleStatus !== "redeemed" ||
    payload.pointsChanged !== false ||
    payload.reputationChanged !== false
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Redemption returned an invalid result",
        errorCode: "PGC9B_REDEMPTION_RESULT_INVALID",
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      disposition: payload.disposition ?? null,
      activityEventId,
      lifecycleStatus: payload.lifecycleStatus,
      publicCode: payload.publicCode,
      redeemedAt: payload.redeemedAt ?? null,
      pointsChanged: false,
      reputationChanged: false,
      redirectUrl: buildDetailsUrl(activityEventId, locale),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

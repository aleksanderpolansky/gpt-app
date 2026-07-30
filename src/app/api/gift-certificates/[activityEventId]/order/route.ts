import { NextResponse } from "next/server";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../lib/auth0";
import {
  buildGiftCertificateQrPayload,
  createGiftCertificateOrderSecurity,
  GiftCertificateOrderSecurityConfigurationError,
} from "../../../../../../lib/gift-certificate-order-security";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type RouteContext = {
  readonly params: Promise<{
    readonly activityEventId: string;
  }>;
};

type RequestBody = {
  readonly locale?: unknown;
};

type OrderPayload = {
  readonly ok?: boolean;
  readonly disposition?: string;
  readonly activityEventId?: string;
  readonly recipientUserId?: string;
  readonly recipientActorId?: string;
  readonly lifecycleStatus?: string;
  readonly pointsAmount?: number | string;
  readonly pointsTransactionId?: string;
  readonly walletBalanceAfter?: number | string;
  readonly walletAvailableAfter?: number | string;
  readonly walletSpentAfter?: number | string;
  readonly providerPointsAwarded?: number | string;
  readonly publicCode?: string;
  readonly qrTokenVersion?: string;
  readonly orderedAt?: string;
};

function normalizeUuid(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    normalized,
  )
    ? normalized
    : null;
}

function normalizeLocale(value: unknown): LocaleCode {
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
  locale: LocaleCode,
): string {
  const pathname = `/certificates/${activityEventId}`;

  return locale === "en"
    ? pathname
    : `${pathname}?locale=${encodeURIComponent(locale)}`;
}

function getOrderErrorStatus(errorCode: string): number {
  if (errorCode.includes("CERTIFICATE_NOT_FOUND")) {
    return 404;
  }

  if (
    errorCode.includes("PROVIDER_CANNOT_ORDER_OWN_CERTIFICATE") ||
    errorCode.includes("RECIPIENT_ACTOR_NOT_AVAILABLE") ||
    errorCode.includes("PROVIDER_NOT_AVAILABLE")
  ) {
    return 403;
  }

  if (
    errorCode.includes("INSUFFICIENT_AVAILABLE_POINTS") ||
    errorCode.includes("ACTIVE_POINTS_WALLET_NOT_FOUND") ||
    errorCode.includes("BUYER_ALREADY_HAS_ACTIVE_CERTIFICATE_FOR_PROVIDER") ||
    errorCode.includes("ONLY_AVAILABLE_CERTIFICATE_CAN_BE_ORDERED") ||
    errorCode.includes("CERTIFICATE_VALIDITY_ENDED") ||
    errorCode.includes("ORDER_IDEMPOTENCY_CONFLICT")
  ) {
    return 409;
  }

  return 400;
}

export async function POST(
  request: Request,
  routeContext: RouteContext,
) {
  const { activityEventId: rawActivityEventId } =
    await routeContext.params;
  const activityEventId = normalizeUuid(rawActivityEventId);

  if (!activityEventId) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid activity event id",
        errorCode: "PGC7D_ACTIVITY_EVENT_ID_INVALID",
      },
      { status: 400 },
    );
  }

  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return NextResponse.json(
      {
        ok: false,
        error: "Not authenticated",
        errorCode: "PGC7D_NOT_AUTHENTICATED",
      },
      { status: 401 },
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
        errorCode: "PGC7D_ACTOR_CONTEXT_FAILED",
      },
      { status: 500 },
    );
  }

  let locale: LocaleCode = "en";

  try {
    const body = (await request.json()) as RequestBody;
    locale = normalizeLocale(body.locale);
  } catch {
    locale = "en";
  }

  let security: ReturnType<
    typeof createGiftCertificateOrderSecurity
  >;

  try {
    security = createGiftCertificateOrderSecurity({
      activityEventId,
      buyerUserId: actorContext.appUserId,
      recipientActorId: actorContext.actorId,
    });
  } catch (error) {
    if (
      error instanceof
      GiftCertificateOrderSecurityConfigurationError
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          errorCode: error.code,
        },
        { status: 503 },
      );
    }

    throw error;
  }

  const { data, error } = await supabase.rpc(
    "request_gift_certificate_activity_v1",
    {
      p_buyer_user_id: actorContext.appUserId,
      p_recipient_actor_id: actorContext.actorId,
      p_activity_event_id: activityEventId,
      p_idempotency_key: security.idempotencyKey,
      p_public_code: security.publicCode,
      p_qr_token_hash: security.qrTokenHash,
      p_qr_token_version: security.qrTokenVersion,
    },
  );

  if (error) {
    const errorCode =
      typeof error.message === "string" && error.message.trim()
        ? error.message.trim()
        : error.code ?? "PGC7D_ORDER_FAILED";

    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        errorCode,
      },
      {
        status: getOrderErrorStatus(errorCode),
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const payload = data as OrderPayload | null;

  if (
    !payload?.ok ||
    payload.activityEventId !== activityEventId ||
    payload.recipientUserId !== actorContext.appUserId ||
    payload.recipientActorId !== actorContext.actorId ||
    payload.lifecycleStatus !== "active" ||
    payload.publicCode !== security.publicCode ||
    payload.qrTokenVersion !== security.qrTokenVersion
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Order returned an invalid result",
        errorCode: "PGC7D_ORDER_RESULT_INVALID",
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      disposition: payload.disposition ?? null,
      activityEventId,
      recipientUserId: actorContext.appUserId,
      recipientActorId: actorContext.actorId,
      lifecycleStatus: payload.lifecycleStatus,
      pointsAmount: payload.pointsAmount ?? null,
      pointsTransactionId: payload.pointsTransactionId ?? null,
      walletBalanceAfter: payload.walletBalanceAfter ?? null,
      walletAvailableAfter: payload.walletAvailableAfter ?? null,
      walletSpentAfter: payload.walletSpentAfter ?? null,
      providerPointsAwarded: payload.providerPointsAwarded ?? 0,
      publicCode: payload.publicCode,
      qrTokenVersion: payload.qrTokenVersion,
      orderedAt: payload.orderedAt ?? null,
      qrPayload: buildGiftCertificateQrPayload({
        activityEventId,
        publicCode: security.publicCode,
        rawQrToken: security.rawQrToken,
      }),
      redirectUrl: buildDetailsUrl(activityEventId, locale),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

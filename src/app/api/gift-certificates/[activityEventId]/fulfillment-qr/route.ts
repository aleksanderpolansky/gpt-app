import { NextResponse } from "next/server";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../lib/auth0";
import {
  buildGiftCertificateFulfillmentQrPayload,
  createGiftCertificateFulfillmentQrSecurity,
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

type IssuePayload = {
  readonly ok?: boolean;
  readonly disposition?: string;
  readonly qrSessionId?: string;
  readonly activityEventId?: string;
  readonly publicCode?: string;
  readonly expiresAt?: string;
  readonly ttlSeconds?: number;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

function normalizeLocale(value: unknown): LocaleCode {
  return value === "pl" || value === "ru" || value === "uk" ||
    value === "de" || value === "es" || value === "cs"
    ? value
    : "en";
}

function mapErrorStatus(errorCode: string): number {
  if (errorCode.includes("CERTIFICATE_NOT_FOUND")) return 404;

  if (
    errorCode.includes("NOT_AUTHORIZED") ||
    errorCode.includes("CONTEXT_NOT_AVAILABLE")
  ) return 403;

  if (
    errorCode.includes("NOT_YET_VALID") ||
    errorCode.includes("VALIDITY_ENDED") ||
    errorCode.includes("ALREADY_CHECKED_IN") ||
    errorCode.includes("ONLY_ACTIVE")
  ) return 409;

  return 400;
}

async function resolveBuyerContext() {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return {
      response: NextResponse.json(
        {
          ok: false,
          error: "Not authenticated",
          errorCode: "PGC10D_NOT_AUTHENTICATED",
        },
        { status: 401 },
      ),
      actorContext: null,
    };
  }

  try {
    return {
      response: null,
      actorContext: await resolveActiveActorContext(session.user.sub),
    };
  } catch (error) {
    if (error instanceof ActorContextError) {
      return {
        response: NextResponse.json(
          {
            ok: false,
            error: error.message,
            errorCode: error.code,
          },
          { status: error.status },
        ),
        actorContext: null,
      };
    }

    return {
      response: NextResponse.json(
        {
          ok: false,
          error: "Could not resolve active actor context",
          errorCode: "PGC10D_ACTOR_CONTEXT_FAILED",
        },
        { status: 500 },
      ),
      actorContext: null,
    };
  }
}

export async function GET(
  _request: Request,
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
        errorCode: "PGC10D_ACTIVITY_EVENT_ID_INVALID",
      },
      { status: 400 },
    );
  }

  const resolved = await resolveBuyerContext();

  if (resolved.response) {
    return resolved.response;
  }

  if (!resolved.actorContext) {
    return NextResponse.json(
      {
        ok: false,
        error: "Actor context is not available",
        errorCode: "PGC10D_ACTOR_CONTEXT_NOT_AVAILABLE",
      },
      { status: 500 },
    );
  }

  const { actorContext } = resolved;
  const [{ data: termsData, error: termsError }, { data: checkinData }] =
    await Promise.all([
      supabase
        .from("activity_gift_certificate_terms")
        .select(
          "activity_event_id,lifecycle_status,recipient_user_id,recipient_actor_id",
        )
        .eq("activity_event_id", activityEventId)
        .maybeSingle(),
      supabase
        .from("activity_fulfillment_checkins")
        .select("id,checked_in_at")
        .eq("planned_activity_event_id", activityEventId)
        .eq("status", "registered")
        .maybeSingle(),
    ]);

  if (termsError || !termsData) {
    return NextResponse.json(
      {
        ok: false,
        error: "Certificate not found",
        errorCode: "PGC10D_CERTIFICATE_NOT_FOUND",
      },
      { status: 404 },
    );
  }

  if (
    termsData.recipient_user_id !== actorContext.appUserId ||
    termsData.recipient_actor_id !== actorContext.actorId
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Recipient is not authorized",
        errorCode: "PGC10D_RECIPIENT_NOT_AUTHORIZED",
      },
      { status: 403 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      activityEventId,
      lifecycleStatus: termsData.lifecycle_status,
      checkedIn: Boolean(checkinData?.id),
      checkedInAt: checkinData?.checked_in_at ?? null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
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
        errorCode: "PGC10D_ACTIVITY_EVENT_ID_INVALID",
      },
      { status: 400 },
    );
  }

  const resolved = await resolveBuyerContext();

  if (resolved.response) {
    return resolved.response;
  }

  if (!resolved.actorContext) {
    return NextResponse.json(
      {
        ok: false,
        error: "Actor context is not available",
        errorCode: "PGC10D_ACTOR_CONTEXT_NOT_AVAILABLE",
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

  const security = createGiftCertificateFulfillmentQrSecurity();
  const { actorContext } = resolved;

  const { data, error } = await supabase.rpc(
    "issue_gift_certificate_fulfillment_qr_v1",
    {
      p_recipient_user_id: actorContext.appUserId,
      p_recipient_actor_id: actorContext.actorId,
      p_activity_event_id: activityEventId,
      p_token_hash: security.tokenHash,
      p_token_version: security.tokenVersion,
    },
  );

  if (error) {
    const errorCode =
      typeof error.message === "string" && error.message.trim()
        ? error.message.trim()
        : error.code ?? "PGC10D_QR_ISSUE_FAILED";

    return NextResponse.json(
      { ok: false, error: error.message, errorCode },
      {
        status: mapErrorStatus(errorCode),
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const payload = data as IssuePayload | null;

  if (
    !payload?.ok ||
    payload.activityEventId !== activityEventId ||
    !payload.qrSessionId ||
    !payload.publicCode ||
    !payload.expiresAt
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "QR issuance returned an invalid result",
        errorCode: "PGC10D_QR_ISSUE_RESULT_INVALID",
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      disposition: payload.disposition ?? "issued",
      activityEventId,
      qrSessionId: payload.qrSessionId,
      publicCode: payload.publicCode,
      expiresAt: payload.expiresAt,
      ttlSeconds: payload.ttlSeconds ?? 60,
      qrPayload: buildGiftCertificateFulfillmentQrPayload({
        qrSessionId: payload.qrSessionId,
        rawToken: security.rawToken,
        locale,
      }),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

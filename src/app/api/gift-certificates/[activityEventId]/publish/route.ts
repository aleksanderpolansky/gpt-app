import { NextResponse } from "next/server";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";
import {
  buildGiftCertificateProductImageSnapshotMetadata,
  readValueObjectPublicImageUrl,
} from "@/lib/value-object-public-image";

export const dynamic = "force-dynamic";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type RouteContext = {
  params: Promise<{
    activityEventId: string;
  }>;
};

type RequestBody = {
  locale?: unknown;
};


type PublicationTermsRow = {
  readonly value_object_id: string;
  readonly provider_owner_user_id: string;
  readonly provider_manager_actor_id: string;
  readonly lifecycle_status: string;
};

type PublicationValueObjectRow = {
  readonly id: string;
  readonly metadata_json: unknown;
};

type PublicationActivityRow = {
  readonly id: string;
  readonly metadata_json: unknown;
};

type PublicationPayload = {
  ok?: boolean;
  disposition?: string;
  activityEventId?: string;
  providerActorId?: string;
  lifecycleStatus?: string;
  activityStatus?: string;
  publishedAt?: string;
  availableFrom?: string;
  availableUntil?: string;
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
  const pathname = `/gift-certificates/${activityEventId}`;

  return locale === "en"
    ? pathname
    : `${pathname}?locale=${encodeURIComponent(locale)}`;
}

function getPublicationErrorStatus(errorCode: string): number {
  if (
    errorCode.includes("CERTIFICATE_NOT_FOUND") ||
    errorCode.includes("ACTIVITY_NOT_FOUND")
  ) {
    return 404;
  }

  if (
    errorCode.includes("OWNER_MISMATCH") ||
    errorCode.includes("OWNER_OR_TEMPLATE_INVALID") ||
    errorCode.includes("PROVIDER_NOT_AVAILABLE")
  ) {
    return 403;
  }

  if (
    errorCode.includes("AVAILABLE_CERTIFICATE_LIMIT_REACHED") ||
    errorCode.includes("ONLY_DRAFT_CAN_BE_PUBLISHED") ||
    errorCode.includes("VALIDITY_ALREADY_ENDED") ||
    errorCode.includes("AVAILABLE_STATE_INCONSISTENT")
  ) {
    return 409;
  }

  return 400;
}

export async function POST(
  request: Request,
  routeContext: RouteContext,
) {
  const { activityEventId: rawActivityEventId } = await routeContext.params;
  const activityEventId = normalizeUuid(rawActivityEventId);

  if (!activityEventId) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid activity event id",
        errorCode: "PGC6D_ACTIVITY_EVENT_ID_INVALID",
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
        errorCode: "PGC6D_NOT_AUTHENTICATED",
      },
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
      {
        ok: false,
        error: "Could not resolve active actor context",
        errorCode: "PGC6D_ACTOR_CONTEXT_FAILED",
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

  const { data: termsData, error: termsError } = await supabase
    .from("activity_gift_certificate_terms")
    .select(
      "value_object_id,provider_owner_user_id,provider_manager_actor_id,lifecycle_status",
    )
    .eq("activity_event_id", activityEventId)
    .maybeSingle();

  if (termsError) {
    return NextResponse.json(
      {
        ok: false,
        error: termsError.message,
        errorCode: "GCR3_PUBLICATION_TERMS_READ_FAILED",
      },
      { status: 500 },
    );
  }

  const terms = termsData as PublicationTermsRow | null;

  if (!terms) {
    return NextResponse.json(
      {
        ok: false,
        error: "Certificate not found",
        errorCode: "PGC6A_CERTIFICATE_NOT_FOUND",
      },
      { status: 404 },
    );
  }

  if (
    terms.provider_owner_user_id !== actorContext.appUserId ||
    terms.provider_manager_actor_id !== actorContext.actorId
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Certificate owner mismatch",
        errorCode: "PGC6A_CERTIFICATE_OWNER_MISMATCH",
      },
      { status: 403 },
    );
  }

  if (terms.lifecycle_status === "draft") {
    const [valueObjectResult, activityResult] = await Promise.all([
      supabase
        .from("value_objects")
        .select("id,metadata_json")
        .eq("id", terms.value_object_id)
        .eq("owner_user_id", actorContext.appUserId)
        .eq("owner_actor_id", actorContext.actorId)
        .maybeSingle(),
      supabase
        .from("activity_events")
        .select("id,metadata_json")
        .eq("id", activityEventId)
        .eq("user_id", actorContext.appUserId)
        .eq("acting_as_actor_id", actorContext.actorId)
        .maybeSingle(),
    ]);

    if (valueObjectResult.error || activityResult.error) {
      return NextResponse.json(
        {
          ok: false,
          error:
            valueObjectResult.error?.message ??
            activityResult.error?.message ??
            "Could not prepare the offer image snapshot",
          errorCode: "GCR3_MEDIA_SNAPSHOT_READ_FAILED",
        },
        { status: 500 },
      );
    }

    const valueObject =
      valueObjectResult.data as PublicationValueObjectRow | null;
    const activity = activityResult.data as PublicationActivityRow | null;

    if (!valueObject || !activity) {
      return NextResponse.json(
        {
          ok: false,
          error: "Could not prepare the offer image snapshot",
          errorCode: "GCR3_MEDIA_SNAPSHOT_SOURCE_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    const capturedAt = new Date().toISOString();
    const productImageUrl = readValueObjectPublicImageUrl(
      valueObject.metadata_json,
    );
    const nextMetadata = buildGiftCertificateProductImageSnapshotMetadata(
      activity.metadata_json,
      productImageUrl,
      capturedAt,
    );

    const { error: snapshotError } = await supabase
      .from("activity_events")
      .update({
        metadata_json: nextMetadata,
        updated_at: capturedAt,
      })
      .eq("id", activityEventId)
      .eq("user_id", actorContext.appUserId)
      .eq("acting_as_actor_id", actorContext.actorId);

    if (snapshotError) {
      return NextResponse.json(
        {
          ok: false,
          error: snapshotError.message,
          errorCode: "GCR3_MEDIA_SNAPSHOT_WRITE_FAILED",
        },
        { status: 500 },
      );
    }
  }

  const { data, error } = await supabase.rpc(
    "publish_gift_certificate_activity_v1",
    {
      p_owner_user_id: actorContext.appUserId,
      p_manager_actor_id: actorContext.actorId,
      p_activity_event_id: activityEventId,
    },
  );

  if (error) {
    const errorCode =
      typeof error.message === "string" && error.message.trim()
        ? error.message.trim()
        : error.code ?? "PGC6D_PUBLICATION_FAILED";

    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        errorCode,
      },
      {
        status: getPublicationErrorStatus(errorCode),
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const payload = data as PublicationPayload | null;

  if (
    !payload?.ok ||
    payload.activityEventId !== activityEventId ||
    payload.lifecycleStatus !== "available"
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Publication returned an invalid result",
        errorCode: "PGC6D_PUBLICATION_RESULT_INVALID",
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      disposition: payload.disposition ?? null,
      activityEventId,
      providerActorId: payload.providerActorId ?? null,
      lifecycleStatus: payload.lifecycleStatus,
      activityStatus: payload.activityStatus ?? "planned",
      publishedAt: payload.publishedAt ?? null,
      availableFrom: payload.availableFrom ?? null,
      availableUntil: payload.availableUntil ?? null,
      redirectUrl: buildDetailsUrl(activityEventId, locale),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

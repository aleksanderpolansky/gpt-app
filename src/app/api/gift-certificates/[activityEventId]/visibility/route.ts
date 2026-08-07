import { NextResponse } from "next/server";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    activityEventId: string;
  }>;
};

type RequestBody = {
  action?: unknown;
};

type TermsRow = {
  readonly provider_owner_user_id: string;
  readonly provider_manager_actor_id: string;
  readonly lifecycle_status: string;
};

type VisibilityPayload = {
  ok?: boolean;
  disposition?: string;
  activityEventId?: string;
  lifecycleStatus?: string;
  activityStatus?: string;
  hiddenAt?: string;
};

function normalizeUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    normalized,
  )
    ? normalized
    : null;
}

function getHideErrorStatus(errorCode: string): number {
  if (
    errorCode.includes("CERTIFICATE_NOT_FOUND") ||
    errorCode.includes("ACTIVITY_NOT_FOUND")
  ) {
    return 404;
  }

  if (
    errorCode.includes("OWNER_MISMATCH") ||
    errorCode.includes("OWNER_OR_TEMPLATE_INVALID")
  ) {
    return 403;
  }

  if (
    errorCode.includes("ONLY_AVAILABLE_CAN_BE_HIDDEN") ||
    errorCode.includes("RECIPIENT_ALREADY_ASSIGNED") ||
    errorCode.includes("HIDDEN_STATE_INCONSISTENT")
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
        errorCode: "GCR6F_ACTIVITY_EVENT_ID_INVALID",
      },
      { status: 400 },
    );
  }

  let body: RequestBody = {};
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    body = {};
  }

  if (body.action !== "hide") {
    return NextResponse.json(
      {
        ok: false,
        error: "Unsupported visibility action",
        errorCode: "GCR6F_VISIBILITY_ACTION_INVALID",
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
        errorCode: "GCR6F_NOT_AUTHENTICATED",
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
        errorCode: "GCR6F_ACTOR_CONTEXT_FAILED",
      },
      { status: 500 },
    );
  }

  const { data: termsData, error: termsError } = await supabase
    .from("activity_gift_certificate_terms")
    .select("provider_owner_user_id,provider_manager_actor_id,lifecycle_status")
    .eq("activity_event_id", activityEventId)
    .maybeSingle();

  if (termsError) {
    return NextResponse.json(
      {
        ok: false,
        error: termsError.message,
        errorCode: "GCR6F_VISIBILITY_TERMS_READ_FAILED",
      },
      { status: 500 },
    );
  }

  const terms = termsData as TermsRow | null;
  if (!terms) {
    return NextResponse.json(
      {
        ok: false,
        error: "Certificate not found",
        errorCode: "GCR6F_CERTIFICATE_NOT_FOUND",
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
        errorCode: "GCR6F_CERTIFICATE_OWNER_MISMATCH",
      },
      { status: 403 },
    );
  }

  const { data, error } = await supabase.rpc(
    "hide_gift_certificate_activity_v1",
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
        : error.code ?? "GCR6F_HIDE_FAILED";

    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        errorCode,
      },
      {
        status: getHideErrorStatus(errorCode),
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const payload = data as VisibilityPayload | null;
  if (
    !payload?.ok ||
    payload.activityEventId !== activityEventId ||
    payload.lifecycleStatus !== "draft" ||
    payload.activityStatus !== "draft"
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Visibility operation returned an invalid result",
        errorCode: "GCR6F_HIDE_RESULT_INVALID",
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
      activityStatus: payload.activityStatus,
      hiddenAt: payload.hiddenAt ?? null,
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}

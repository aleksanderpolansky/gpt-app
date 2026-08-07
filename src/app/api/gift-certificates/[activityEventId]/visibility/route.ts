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
  readonly public_visibility_status: "visible" | "hidden";
};

type VisibilityPayload = {
  ok?: boolean;
  disposition?: string;
  activityEventId?: string;
  lifecycleStatus?: string;
  publicVisibilityStatus?: string;
  visibilityChangedAt?: string;
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

function getVisibilityErrorStatus(errorCode: string): number {
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
    errorCode.includes("VISIBILITY_INVALID") ||
    errorCode.includes("LEGACY_DRAFT_REQUIRES_PUBLISH")
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
        errorCode: "GCR6H_ACTIVITY_EVENT_ID_INVALID",
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

  const action = body.action === "show" ? "show" : body.action === "hide" ? "hide" : null;
  if (!action) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unsupported visibility action",
        errorCode: "GCR6H_VISIBILITY_ACTION_INVALID",
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
        errorCode: "GCR6H_NOT_AUTHENTICATED",
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
        errorCode: "GCR6H_ACTOR_CONTEXT_FAILED",
      },
      { status: 500 },
    );
  }

  const { data: termsData, error: termsError } = await supabase
    .from("activity_gift_certificate_terms")
    .select(
      "provider_owner_user_id,provider_manager_actor_id,lifecycle_status,public_visibility_status",
    )
    .eq("activity_event_id", activityEventId)
    .maybeSingle();

  if (termsError) {
    return NextResponse.json(
      {
        ok: false,
        error: termsError.message,
        errorCode: "GCR6H_VISIBILITY_TERMS_READ_FAILED",
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
        errorCode: "GCR6H_CERTIFICATE_NOT_FOUND",
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
        errorCode: "GCR6H_CERTIFICATE_OWNER_MISMATCH",
      },
      { status: 403 },
    );
  }

  if (action === "show" && terms.lifecycle_status === "draft") {
    return NextResponse.json(
      {
        ok: false,
        error: "Legacy hidden draft must use the publication path",
        errorCode: "GCR6H_LEGACY_DRAFT_REQUIRES_PUBLISH",
      },
      { status: 409 },
    );
  }

  const targetVisibility = action === "show" ? "visible" : "hidden";
  const { data, error } = await supabase.rpc(
    "set_gift_certificate_public_visibility_v1",
    {
      p_owner_user_id: actorContext.appUserId,
      p_manager_actor_id: actorContext.actorId,
      p_activity_event_id: activityEventId,
      p_visibility_status: targetVisibility,
    },
  );

  if (error) {
    const errorCode =
      typeof error.message === "string" && error.message.trim()
        ? error.message.trim()
        : error.code ?? "GCR6H_VISIBILITY_FAILED";

    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        errorCode,
      },
      {
        status: getVisibilityErrorStatus(errorCode),
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const payload = data as VisibilityPayload | null;
  if (
    !payload?.ok ||
    payload.activityEventId !== activityEventId ||
    payload.publicVisibilityStatus !== targetVisibility
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Visibility operation returned an invalid result",
        errorCode: "GCR6H_VISIBILITY_RESULT_INVALID",
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      disposition: payload.disposition ?? null,
      activityEventId,
      lifecycleStatus: payload.lifecycleStatus ?? terms.lifecycle_status,
      publicVisibilityStatus: payload.publicVisibilityStatus,
      visibilityChangedAt: payload.visibilityChangedAt ?? null,
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}

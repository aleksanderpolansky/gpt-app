import { NextResponse } from "next/server";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type RouteContext = {
  readonly params: Promise<{
    readonly activityEventId: string;
  }>;
};

type RequestBody = {
  readonly termsText?: unknown;
};

type TermsRow = {
  readonly activity_event_id: string;
  readonly provider_owner_user_id: string;
  readonly provider_manager_actor_id: string;
  readonly lifecycle_status: string;
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

function normalizeTerms(value: unknown): string | null | undefined {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  if (normalized.length > 4000) {
    return undefined;
  }

  return normalized || null;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { activityEventId: rawActivityEventId } = await context.params;
  const activityEventId = normalizeUuid(rawActivityEventId);

  if (!activityEventId) {
    return NextResponse.json(
      { ok: false, error: "Invalid activity event id" },
      { status: 400 },
    );
  }

  const session = await auth0.getSession();
  if (!session?.user?.sub) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 },
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
      { ok: false, error: "Could not resolve active actor context" },
      { status: 500 },
    );
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const termsText = normalizeTerms(body.termsText);
  if (termsText === undefined) {
    return NextResponse.json(
      { ok: false, error: "termsText must be 4000 characters or fewer" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("activity_gift_certificate_terms")
    .select(
      "activity_event_id,provider_owner_user_id,provider_manager_actor_id,lifecycle_status",
    )
    .eq("activity_event_id", activityEventId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  const terms = data as TermsRow | null;
  if (!terms) {
    return NextResponse.json(
      { ok: false, error: "Offer not found" },
      { status: 404 },
    );
  }

  if (
    terms.provider_owner_user_id !== actorContext.appUserId ||
    terms.provider_manager_actor_id !== actorContext.actorId
  ) {
    return NextResponse.json(
      { ok: false, error: "Offer owner mismatch" },
      { status: 403 },
    );
  }

  if (!new Set(["draft", "available"]).has(terms.lifecycle_status)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Ordered or completed offer terms are locked",
        errorCode: "PGC12B_OFFER_TERMS_LOCKED",
      },
      { status: 409 },
    );
  }

  const { error: updateError } = await supabase
    .from("activity_gift_certificate_terms")
    .update({ terms_text: termsText })
    .eq("activity_event_id", activityEventId)
    .eq("provider_owner_user_id", actorContext.appUserId)
    .eq("provider_manager_actor_id", actorContext.actorId);

  if (updateError) {
    return NextResponse.json(
      { ok: false, error: updateError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, termsText });
}

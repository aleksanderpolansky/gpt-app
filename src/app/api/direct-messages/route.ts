import { NextResponse } from "next/server";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../lib/actor-context";
import { auth0 } from "../../../../lib/auth0";
import { toMediaDeliveryUrl } from "../../../../lib/media-egress";
import { supabase } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ACTOR_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SUPPORTED_LOCALES = new Set(["en", "pl", "uk", "ru", "de", "es", "cs"]);
const MAX_DIRECT_MESSAGE_LENGTH = 5000;

type DirectConversationRow = {
  counterpart_actor_id: string;
  counterpart_profile_id: string | null;
  counterpart_public_slug: string | null;
  counterpart_display_name: string | null;
  counterpart_image_url: string | null;
  counterpart_profile_updated_at: string | null;
  last_message_id: string;
  last_message_text: string | null;
  last_message_at: string;
  last_message_is_outgoing: boolean;
};

type DirectMessageRow = {
  message_object_id: string;
  author_actor_id: string;
  content_text: string | null;
  language_code: string | null;
  activated_at: string | null;
  created_at: string;
  is_outgoing: boolean;
};

type RecipientProfileRow = {
  id: string;
  actor_id: string;
  public_slug: string;
  display_name: string;
  image_url: string | null;
  updated_at: string;
};

type CreatedMessageRow = {
  id: string;
  author_actor_id: string | null;
  content_text: string | null;
  language_code: string | null;
  activated_at: string | null;
  created_at: string;
};

function parseLimit(value: string | null, fallback: number, maximum: number) {
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 1) return fallback;

  return Math.min(parsed, maximum);
}

function parseLocale(value: unknown) {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();

  return SUPPORTED_LOCALES.has(normalized) ? normalized : null;
}

function readRpcRows<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

function readRpcRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
  if (data && typeof data === "object") return data as T;
  return null;
}

function rpcStatus(errorCode: string | undefined) {
  if (errorCode === "42501") return 403;
  if (errorCode === "22001" || errorCode === "22023" || errorCode === "23514") {
    return 400;
  }
  return 500;
}

async function getCurrentActorContext() {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return {
      actorContext: null,
      errorResponse: NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 },
      ),
    };
  }

  try {
    return {
      actorContext: await resolveActiveActorContext(session.user.sub),
      errorResponse: null,
    };
  } catch (error) {
    if (error instanceof ActorContextError) {
      return {
        actorContext: null,
        errorResponse: NextResponse.json(
          { ok: false, error: error.code, errorMessage: error.message },
          { status: error.status },
        ),
      };
    }

    return {
      actorContext: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Could not resolve active actor context",
        },
        { status: 500 },
      ),
    };
  }
}

async function readCounterpartProfile(actorId: string) {
  const { data, error } = await supabase
    .from("actor_public_profiles")
    .select("id,actor_id,public_slug,display_name,image_url,updated_at")
    .eq("actor_id", actorId)
    .order("is_public", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`DIRECT_MESSAGE_COUNTERPART_PROFILE_READ_FAILED:${error.message}`);
  }

  return ((data ?? [])[0] as RecipientProfileRow | undefined) ?? null;
}

export async function GET(request: Request) {
  const context = await getCurrentActorContext();

  if (!context.actorContext) {
    return context.errorResponse;
  }

  const url = new URL(request.url);
  const counterpartActorId = url.searchParams.get("counterpartActorId");

  if (!counterpartActorId) {
    const limit = parseLimit(url.searchParams.get("limit"), 50, 100);

    const { data, error } = await supabase.rpc(
      "list_direct_message_conversations_v1",
      {
        p_owner_user_id: context.actorContext.appUserId,
        p_actor_id: context.actorContext.actorId,
        p_limit: limit,
      },
    );

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: rpcStatus(error.code) },
      );
    }

    const conversations = readRpcRows<DirectConversationRow>(data).map(
      (row) => ({
        ...row,
        counterpart_image_url: row.counterpart_profile_id
          ? toMediaDeliveryUrl(
              row.counterpart_image_url,
              `/api/profiles/${encodeURIComponent(row.counterpart_profile_id)}/image`,
              row.counterpart_profile_updated_at,
            )
          : null,
      }),
    );

    return NextResponse.json({
      ok: true,
      actor: {
        actorId: context.actorContext.actorId,
        profileId: context.actorContext.profile.profileId,
        displayName: context.actorContext.profile.displayName,
        imageUrl: context.actorContext.profile.imageUrl,
      },
      conversations,
    });
  }

  if (!ACTOR_ID_PATTERN.test(counterpartActorId)) {
    return NextResponse.json(
      { ok: false, error: "DIRECT_MESSAGE_COUNTERPART_INVALID" },
      { status: 400 },
    );
  }

  const limit = parseLimit(url.searchParams.get("limit"), 100, 200);

  const [{ data, error }, counterpart] = await Promise.all([
    supabase.rpc("list_direct_messages_v1", {
      p_owner_user_id: context.actorContext.appUserId,
      p_actor_id: context.actorContext.actorId,
      p_counterpart_actor_id: counterpartActorId,
      p_limit: limit,
    }),
    readCounterpartProfile(counterpartActorId),
  ]);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: rpcStatus(error.code) },
    );
  }

  if (!counterpart) {
    return NextResponse.json(
      { ok: false, error: "DIRECT_MESSAGE_COUNTERPART_PROFILE_MISSING" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    actor: {
      actorId: context.actorContext.actorId,
      profileId: context.actorContext.profile.profileId,
      displayName: context.actorContext.profile.displayName,
      imageUrl: context.actorContext.profile.imageUrl,
    },
    counterpart: {
      actorId: counterpart.actor_id,
      profileId: counterpart.id,
      publicSlug: counterpart.public_slug,
      displayName: counterpart.display_name,
      imageUrl: toMediaDeliveryUrl(
        counterpart.image_url,
        `/api/profiles/${encodeURIComponent(counterpart.id)}/image`,
        counterpart.updated_at,
      ),
      updatedAt: counterpart.updated_at,
    },
    messages: readRpcRows<DirectMessageRow>(data),
  });
}

export async function POST(request: Request) {
  const context = await getCurrentActorContext();

  if (!context.actorContext) {
    return context.errorResponse;
  }

  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  const recipientActorId =
    typeof body?.recipientActorId === "string"
      ? body.recipientActorId.trim()
      : "";
  const contentText =
    typeof body?.contentText === "string" ? body.contentText.trim() : "";
  const languageCode = parseLocale(body?.locale);

  if (!ACTOR_ID_PATTERN.test(recipientActorId)) {
    return NextResponse.json(
      { ok: false, error: "DIRECT_MESSAGE_RECIPIENT_INVALID" },
      { status: 400 },
    );
  }

  if (!contentText || contentText.length > MAX_DIRECT_MESSAGE_LENGTH) {
    return NextResponse.json(
      {
        ok: false,
        error: contentText
          ? "DIRECT_MESSAGE_TEXT_TOO_LONG"
          : "DIRECT_MESSAGE_TEXT_REQUIRED",
      },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.rpc(
    "create_direct_message_object_v1",
    {
      p_owner_user_id: context.actorContext.appUserId,
      p_sender_actor_id: context.actorContext.actorId,
      p_recipient_actor_id: recipientActorId,
      p_content_text: contentText,
      p_language_code: languageCode,
    },
  );

  const message = readRpcRow<CreatedMessageRow>(data);

  if (error || !message) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "DIRECT_MESSAGE_CREATE_FAILED",
      },
      { status: rpcStatus(error?.code) },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      message: {
        message_object_id: message.id,
        author_actor_id: message.author_actor_id,
        content_text: message.content_text,
        language_code: message.language_code,
        activated_at: message.activated_at,
        created_at: message.created_at,
        is_outgoing: true,
      },
    },
    { status: 201 },
  );
}

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../lib/auth0";
import { toMediaDeliveryUrl } from "../../../../../../lib/media-egress";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{ id: string }>;
};

const MESSAGE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SUPPORTED_LOCALES = new Set(["en", "pl", "uk", "ru", "de", "es", "cs"]);
const MAX_COMMENT_LENGTH = 3000;

type CommentRow = {
  comment_message_object_id: string;
  author_actor_id: string;
  author_profile_id: string | null;
  author_public_slug: string | null;
  author_display_name: string | null;
  author_image_url: string | null;
  author_profile_updated_at: string | null;
  content_text: string | null;
  language_code: string | null;
  activated_at: string | null;
  created_at: string;
};

type PublicProfileRow = {
  id: string;
  actor_id: string;
  public_slug: string;
  display_name: string;
  image_url: string | null;
  updated_at: string;
};

type CreatedCommentRow = {
  id: string;
  author_actor_id: string | null;
  content_text: string | null;
  language_code: string | null;
  activated_at: string | null;
  created_at: string;
};

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

async function publicProfilesByActorIds(actorIds: string[]) {
  if (actorIds.length === 0) {
    return new Map<string, PublicProfileRow>();
  }

  const { data, error } = await supabase
    .from("actor_public_profiles")
    .select("id,actor_id,public_slug,display_name,image_url,updated_at")
    .in("actor_id", actorIds)
    .eq("is_public", true);

  if (error) {
    throw new Error(`PUBLICATION_COMMENT_PROFILE_READ_FAILED:${error.message}`);
  }

  return new Map(
    ((data ?? []) as PublicProfileRow[]).map((row) => [row.actor_id, row]),
  );
}

export async function GET(_request: Request, { params }: RouteProps) {
  const { id } = await params;

  if (!MESSAGE_ID_PATTERN.test(id)) {
    return NextResponse.json(
      { ok: false, error: "PUBLICATION_ID_INVALID" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.rpc(
    "list_publication_comments_v1",
    {
      p_publication_message_object_id: id,
      p_limit: 100,
    },
  );

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: rpcStatus(error.code) },
    );
  }

  const rows = readRpcRows<CommentRow>(data);
  const publicProfileByActorId = await publicProfilesByActorIds(
    [...new Set(rows.map((row) => row.author_actor_id))],
  );

  return NextResponse.json({
    ok: true,
    comments: rows.map((row) => {
      const publicProfile = publicProfileByActorId.get(row.author_actor_id);

      return {
        messageObjectId: row.comment_message_object_id,
        authorActorId: row.author_actor_id,
        author: publicProfile
          ? {
              publicSlug: publicProfile.public_slug,
              displayName: publicProfile.display_name,
              imageUrl: toMediaDeliveryUrl(
                publicProfile.image_url,
                `/api/profiles/${encodeURIComponent(publicProfile.id)}/image`,
                publicProfile.updated_at,
              ),
              updatedAt: publicProfile.updated_at,
            }
          : {
              publicSlug: null,
              displayName: "ARCTor",
              imageUrl: null,
              updatedAt: null,
            },
        contentText: row.content_text,
        languageCode: row.language_code,
        activatedAt: row.activated_at,
        createdAt: row.created_at,
      };
    }),
  });
}

export async function POST(request: Request, { params }: RouteProps) {
  const { id } = await params;

  if (!MESSAGE_ID_PATTERN.test(id)) {
    return NextResponse.json(
      { ok: false, error: "PUBLICATION_ID_INVALID" },
      { status: 400 },
    );
  }

  const context = await getCurrentActorContext();

  if (!context.actorContext) {
    return context.errorResponse;
  }

  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  const contentText =
    typeof body?.contentText === "string" ? body.contentText.trim() : "";
  const languageCode = parseLocale(body?.locale);

  if (!contentText || contentText.length > MAX_COMMENT_LENGTH) {
    return NextResponse.json(
      {
        ok: false,
        error: contentText
          ? "PUBLICATION_COMMENT_TEXT_TOO_LONG"
          : "PUBLICATION_COMMENT_TEXT_REQUIRED",
      },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.rpc(
    "create_publication_comment_v1",
    {
      p_owner_user_id: context.actorContext.appUserId,
      p_author_actor_id: context.actorContext.actorId,
      p_publication_message_object_id: id,
      p_content_text: contentText,
      p_language_code: languageCode,
    },
  );

  const comment = readRpcRow<CreatedCommentRow>(data);

  if (error || !comment) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "PUBLICATION_COMMENT_CREATE_FAILED",
      },
      { status: rpcStatus(error?.code) },
    );
  }

  revalidatePath("/feed");

  return NextResponse.json(
    {
      ok: true,
      comment: {
        messageObjectId: comment.id,
        authorActorId: comment.author_actor_id,
        contentText: comment.content_text,
        languageCode: comment.language_code,
        activatedAt: comment.activated_at,
        createdAt: comment.created_at,
      },
    },
    { status: 201 },
  );
}

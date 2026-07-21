import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { auth0 } from "../../../../../lib/auth0";
import {
  ProfileOwnerContextError,
  resolveProfileOwnerContext,
} from "../../../../../lib/profile-owner-context";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{ id: string }>;
};

function parseText(value: unknown, maximumLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maximumLength) : null;
}

function parseImage(value: unknown) {
  const parsed = parseText(value, 3_000_000);

  if (!parsed) {
    return null;
  }

  if (
    /^https?:\/\//i.test(parsed) ||
    /^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(parsed)
  ) {
    return parsed;
  }

  throw new Error("Unsupported profile image format.");
}

function ownerContextErrorResponse(error: unknown) {
  if (error instanceof ProfileOwnerContextError) {
    return NextResponse.json(
      {
        ok: false,
        error: error.code,
        errorMessage: error.message,
      },
      { status: error.status },
    );
  }

  return NextResponse.json(
    {
      ok: false,
      error: "PROFILE_OWNER_CONTEXT_FAILED",
      errorMessage: "Could not verify profile ownership.",
    },
    { status: 500 },
  );
}

export async function PATCH(request: Request, { params }: RouteProps) {
  const [{ id }, session] = await Promise.all([params, auth0.getSession()]);

  if (!session?.user?.sub) {
    return NextResponse.json(
      { ok: false, error: "NOT_AUTHENTICATED" },
      { status: 401 },
    );
  }

  let ownerContext: Awaited<ReturnType<typeof resolveProfileOwnerContext>>;

  try {
    ownerContext = await resolveProfileOwnerContext(session.user.sub, id);
  } catch (error) {
    return ownerContextErrorResponse(error);
  }

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "INVALID_JSON" },
      { status: 400 },
    );
  }

  const displayName = parseText(body.displayName, 160);

  if (!displayName) {
    return NextResponse.json(
      { ok: false, error: "PROFILE_NAME_REQUIRED" },
      { status: 400 },
    );
  }

  let imageUrl: string | null;

  try {
    imageUrl = parseImage(body.imageUrl);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "INVALID_PROFILE_IMAGE",
        errorMessage:
          error instanceof Error ? error.message : "Invalid profile image.",
      },
      { status: 400 },
    );
  }

  const profile = ownerContext.profile;
  const now = new Date().toISOString();
  const { data: updatedData, error: updateError } = await supabase
    .from("actor_public_profiles")
    .update({
      display_name: displayName,
      bio: parseText(body.bio, 5_000),
      image_url: imageUrl,
      image_source: "custom",
      public_phone: parseText(body.publicPhone, 80),
      website_url: parseText(body.websiteUrl, 500),
      messenger_url: parseText(body.messengerUrl, 500),
      updated_at: now,
    })
    .eq("id", profile.profileId)
    .eq("owner_user_id", ownerContext.appUserId)
    .select(
      "id, profile_kind, public_slug, display_name, bio, image_url, image_source, category_label, public_phone, website_url, messenger_url, is_public, published_at, updated_at",
    )
    .single();

  if (updateError || !updatedData) {
    return NextResponse.json(
      {
        ok: false,
        error: "PROFILE_UPDATE_FAILED",
        errorMessage: "Profile was not updated.",
      },
      { status: 500 },
    );
  }

  const { error: actorSyncError } = await supabase
    .from("actors")
    .update({
      display_name: displayName,
      updated_at: now,
    })
    .eq("id", profile.actorId);

  revalidatePath("/people");
  revalidatePath(`/people/${profile.publicSlug}`);
  revalidatePath(`/profiles/${profile.profileId}/edit`);

  return NextResponse.json({
    ok: true,
    profile: updatedData,
    warning: actorSyncError ? "ACTOR_LABEL_SYNC_FAILED" : null,
  });
}

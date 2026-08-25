import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { auth0 } from "../../../../lib/auth0";
import { persistMediaImageValue } from "../../../../lib/media-storage";
import { supabase } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";

type AppUserRow = {
  id: string;
  access_status: string | null;
};

type CreatedAvatarProfileRow = {
  profile_id: string;
  public_slug: string;
  profile_kind: "avatar";
  display_name: string;
  is_public: false;
};

function parseDisplayName(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const displayName = value.trim();

  if (!displayName || displayName.length > 160) {
    return null;
  }

  return displayName;
}

function parseText(value: unknown, maximumLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maximumLength) : null;
}

async function persistProfileImage(value: unknown, ownerUserId: string) {
  return persistMediaImageValue({
    value,
    visibility: "private",
    namespace: `profiles/${ownerUserId}`,
    maxBytes: 256 * 1024,
  });
}

export async function POST(request: Request) {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const displayName = parseDisplayName(body.displayName);

  if (!displayName) {
    return NextResponse.json(
      {
        ok: false,
        error: "Avatar name is required and must not exceed 160 characters.",
      },
      { status: 400 },
    );
  }

  const { data: appUserData, error: appUserError } = await supabase
    .from("app_users")
    .select("id, access_status")
    .eq("auth0_sub", session.user.sub)
    .maybeSingle();

  if (appUserError || !appUserData) {
    return NextResponse.json(
      { ok: false, error: appUserError?.message ?? "App user not found" },
      { status: 500 },
    );
  }

  const appUser = appUserData as AppUserRow;

  if (appUser.access_status === "blocked") {
    return NextResponse.json(
      {
        ok: false,
        error: "USER_ACCESS_BLOCKED",
        errorMessage: "This account has been blocked by a platform administrator.",
      },
      { status: 403 },
    );
  }

  let imageUrl: string | null;

  try {
    imageUrl = await persistProfileImage(body.imageUrl, appUser.id);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Invalid profile image.",
      },
      { status: 400 },
    );
  }

  const { data: createdData, error: createError } = await supabase.rpc(
    "create_avatar_profile_v2",
    {
      p_owner_user_id: appUser.id,
      p_display_name: displayName,
      p_bio: parseText(body.bio, 5_000),
      p_image_url: imageUrl,
      p_public_phone: parseText(body.publicPhone, 80),
      p_website_url: parseText(body.websiteUrl, 500),
      p_messenger_url: parseText(body.messengerUrl, 500),
    },
  );

  if (createError) {
    return NextResponse.json(
      { ok: false, error: createError.message },
      { status: 500 },
    );
  }

  const profile = ((createdData ?? [])[0] as
    | CreatedAvatarProfileRow
    | undefined) ?? null;

  if (!profile) {
    return NextResponse.json(
      { ok: false, error: "Avatar profile was not created." },
      { status: 500 },
    );
  }

  revalidatePath("/people");
  revalidatePath(`/people/${profile.public_slug}`);
  revalidatePath(`/profiles/${profile.profile_id}/edit`);

  return NextResponse.json({ ok: true, profile }, { status: 201 });
}

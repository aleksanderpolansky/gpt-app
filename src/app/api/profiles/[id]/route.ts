import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{ id: string }>;
};

type AppUserRow = {
  id: string;
};

type OwnedProfileRow = {
  id: string;
  owner_user_id: string;
  actor_id: string;
  public_slug: string;
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

async function getCurrentAppUser() {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return { appUser: null, status: 401, error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("app_users")
    .select("id")
    .eq("auth0_sub", session.user.sub)
    .maybeSingle();

  if (error || !data) {
    return { appUser: null, status: 500, error: error?.message ?? "App user not found" };
  }

  return { appUser: data as AppUserRow, status: 200, error: null };
}

export async function PATCH(request: Request, { params }: RouteProps) {
  const { id } = await params;
  const auth = await getCurrentAppUser();

  if (!auth.appUser) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const { data: profileData, error: profileError } = await supabase
    .from("actor_public_profiles")
    .select("id, owner_user_id, actor_id, public_slug")
    .eq("id", id)
    .limit(1);

  if (profileError) {
    return NextResponse.json({ ok: false, error: profileError.message }, { status: 500 });
  }

  const profile = ((profileData ?? [])[0] as OwnedProfileRow | undefined) ?? null;

  if (!profile) {
    return NextResponse.json({ ok: false, error: "Profile not found." }, { status: 404 });
  }

  if (profile.owner_user_id !== auth.appUser.id) {
    return NextResponse.json({ ok: false, error: "You cannot edit this profile." }, { status: 403 });
  }

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const displayName = parseText(body.displayName, 160);

  if (!displayName) {
    return NextResponse.json({ ok: false, error: "Profile name is required." }, { status: 400 });
  }

  let imageUrl: string | null;

  try {
    imageUrl = parseImage(body.imageUrl);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Invalid profile image." },
      { status: 400 },
    );
  }

  const update = {
    display_name: displayName,
    bio: parseText(body.bio, 5_000),
    image_url: imageUrl,
    image_source: "custom",
    public_phone: parseText(body.publicPhone, 80),
    website_url: parseText(body.websiteUrl, 500),
    messenger_url: parseText(body.messengerUrl, 500),
    updated_at: new Date().toISOString(),
  };

  const { data: updatedData, error: updateError } = await supabase
    .from("actor_public_profiles")
    .update(update)
    .eq("id", profile.id)
    .eq("owner_user_id", auth.appUser.id)
    .select("id, owner_user_id, actor_id, profile_kind, public_slug, display_name, bio, image_url, image_source, category_label, public_phone, website_url, messenger_url, is_public, published_at, updated_at")
    .single();

  if (updateError || !updatedData) {
    return NextResponse.json(
      { ok: false, error: updateError?.message ?? "Profile was not updated." },
      { status: 500 },
    );
  }

  // Keep the actor display label aligned for future acting-as/profile flows.
  // The public profile save itself remains successful if this secondary sync fails.
  const { error: actorSyncError } = await supabase
    .from("actors")
    .update({
      display_name: displayName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.actor_id);

  revalidatePath(`/people/${profile.public_slug}`);
  revalidatePath(`/profiles/${profile.id}/edit`);

  return NextResponse.json({
    ok: true,
    profile: updatedData,
    actorSyncWarning: actorSyncError?.message ?? null,
  });
}

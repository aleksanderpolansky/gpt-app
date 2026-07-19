import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{ id: string }>;
};

type ProfileRow = {
  id: string;
  owner_user_id: string;
  public_slug: string;
  published_at: string | null;
};

export async function PATCH(request: Request, { params }: RouteProps) {
  const { id } = await params;
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("app_users")
    .select("id")
    .eq("auth0_sub", session.user.sub)
    .maybeSingle();

  if (appUserError || !appUser) {
    return NextResponse.json(
      { ok: false, error: appUserError?.message ?? "App user not found" },
      { status: 500 },
    );
  }

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body.isPublic !== "boolean") {
    return NextResponse.json(
      { ok: false, error: "isPublic must be a boolean." },
      { status: 400 },
    );
  }

  const { data: profileData, error: profileError } = await supabase
    .from("actor_public_profiles")
    .select("id, owner_user_id, public_slug, published_at")
    .eq("id", id)
    .limit(1);

  if (profileError) {
    return NextResponse.json({ ok: false, error: profileError.message }, { status: 500 });
  }

  const profile = ((profileData ?? [])[0] as ProfileRow | undefined) ?? null;

  if (!profile) {
    return NextResponse.json({ ok: false, error: "Profile not found." }, { status: 404 });
  }

  if (profile.owner_user_id !== appUser.id) {
    return NextResponse.json(
      { ok: false, error: "Only the profile owner can change visibility." },
      { status: 403 },
    );
  }

  const now = new Date().toISOString();
  const { data: updatedProfile, error: updateError } = await supabase
    .from("actor_public_profiles")
    .update({
      is_public: body.isPublic,
      published_at: body.isPublic ? profile.published_at ?? now : profile.published_at,
      updated_at: now,
    })
    .eq("id", profile.id)
    .eq("owner_user_id", appUser.id)
    .select("id, public_slug, is_public, published_at, updated_at")
    .single();

  if (updateError || !updatedProfile) {
    return NextResponse.json(
      { ok: false, error: updateError?.message ?? "Profile visibility was not updated." },
      { status: 500 },
    );
  }

  revalidatePath(`/people/${profile.public_slug}`);
  revalidatePath(`/profiles/${profile.id}/edit`);
  revalidatePath("/people");

  return NextResponse.json({ ok: true, profile: updatedProfile });
}

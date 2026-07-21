import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { auth0 } from "../../../../../../lib/auth0";
import {
  ProfileOwnerContextError,
  resolveProfileOwnerContext,
} from "../../../../../../lib/profile-owner-context";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{ id: string }>;
};

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

  if (typeof body.isPublic !== "boolean") {
    return NextResponse.json(
      { ok: false, error: "INVALID_VISIBILITY_VALUE" },
      { status: 400 },
    );
  }

  const profile = ownerContext.profile;
  const now = new Date().toISOString();
  const { data: updatedProfile, error: updateError } = await supabase
    .from("actor_public_profiles")
    .update({
      is_public: body.isPublic,
      published_at: body.isPublic
        ? profile.publishedAt ?? now
        : profile.publishedAt,
      updated_at: now,
    })
    .eq("id", profile.profileId)
    .eq("owner_user_id", ownerContext.appUserId)
    .select("id, public_slug, is_public, published_at, updated_at")
    .single();

  if (updateError || !updatedProfile) {
    return NextResponse.json(
      {
        ok: false,
        error: "PROFILE_VISIBILITY_UPDATE_FAILED",
        errorMessage: "Profile visibility was not updated.",
      },
      { status: 500 },
    );
  }

  revalidatePath("/people");
  revalidatePath(`/people/${profile.publicSlug}`);
  revalidatePath(`/profiles/${profile.profileId}/edit`);

  return NextResponse.json({ ok: true, profile: updatedProfile });
}

import { NextResponse } from "next/server";

import { auth0 } from "../../../../../../lib/auth0";
import {
  createPrivateMediaSignedUrl,
  isPrivateMediaToken,
} from "../../../../../../lib/media-storage";
import {
  getMediaCacheControl,
  getSignedMediaRedirectCacheControl,
} from "../../../../../../lib/media-egress";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{ id: string }>;
};

type ProfileImageRow = {
  owner_user_id: string;
  image_url: string | null;
  is_public: boolean;
};

async function getCurrentAppUserId() {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return null;
  }

  const { data, error } = await supabase
    .from("app_users")
    .select("id")
    .eq("auth0_sub", session.user.sub)
    .maybeSingle();

  if (error || !data || typeof data.id !== "string") {
    return null;
  }

  return data.id;
}

export async function GET(request: Request, { params }: RouteProps) {
  const { id } = await params;

  try {
    const { data, error } = await supabase
      .from("actor_public_profiles")
      .select("owner_user_id,image_url,is_public")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const row = data as ProfileImageRow | null;

    if (!row?.image_url) {
      return NextResponse.json(
        { ok: false, error: "PROFILE_IMAGE_NOT_FOUND" },
        { status: 404 },
      );
    }

    if (!row.is_public) {
      const appUserId = await getCurrentAppUserId();

      if (!appUserId) {
        return NextResponse.json(
          { ok: false, error: "NOT_AUTHENTICATED" },
          { status: 401 },
        );
      }

      if (appUserId !== row.owner_user_id) {
        return NextResponse.json(
          { ok: false, error: "PROFILE_IMAGE_NOT_FOUND" },
          { status: 404 },
        );
      }
    }

    const imageUrl = row.image_url.trim();
    const visibility = row.is_public ? "public" : "private";

    if (/^https?:\/\//i.test(imageUrl)) {
      const response = NextResponse.redirect(imageUrl, 307);
      response.headers.set(
        "Cache-Control",
        getMediaCacheControl(request.url, visibility),
      );
      return response;
    }

    if (!isPrivateMediaToken(imageUrl)) {
      return NextResponse.json(
        { ok: false, error: "PROFILE_IMAGE_INVALID" },
        { status: 422 },
      );
    }

    const signedUrl = await createPrivateMediaSignedUrl(imageUrl, 60);

    if (!signedUrl) {
      return NextResponse.json(
        { ok: false, error: "PROFILE_IMAGE_INVALID" },
        { status: 422 },
      );
    }

    const response = NextResponse.redirect(signedUrl, 307);
    response.headers.set(
      "Cache-Control",
      getSignedMediaRedirectCacheControl(),
    );
    response.headers.set(
      "X-ARCTor-Media-Delivery",
      "supabase-signed-redirect",
    );
    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "PROFILE_IMAGE_FAILED" },
      { status: 500 },
    );
  }
}

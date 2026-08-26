import { NextResponse } from "next/server";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../lib/auth0";
import { getMediaCacheControl } from "../../../../../../lib/media-egress";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{ id: string }>;
};

type OrganizationMediaRow = {
  logo_url: string | null;
  cover_image_url: string | null;
};

export async function GET(request: Request, { params }: RouteProps) {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return NextResponse.json(
      { ok: false, error: "NOT_AUTHENTICATED" },
      { status: 401 },
    );
  }

  const { id } = await params;

  try {
    const actorContext = await resolveActiveActorContext(session.user.sub);
    const { data: profileRows, error: profileError } = await supabase
      .from("actor_public_profiles")
      .select("actor_id")
      .eq("owner_user_id", actorContext.appUserId);

    if (profileError) {
      throw new Error(profileError.message);
    }

    const ownedActorIds = (profileRows ?? [])
      .map((row) =>
        typeof row.actor_id === "string" ? row.actor_id : null,
      )
      .filter((actorId): actorId is string => Boolean(actorId));

    if (!ownedActorIds.length) {
      return NextResponse.json(
        { ok: false, error: "ORGANIZATION_IMAGE_NOT_FOUND" },
        { status: 404 },
      );
    }

    const { data, error } = await supabase
      .from("organizations")
      .select("logo_url,cover_image_url")
      .eq("id", id)
      .in("owner_actor_id", ownedActorIds)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const row = data as OrganizationMediaRow | null;
    const imageUrl =
      row?.logo_url?.trim() || row?.cover_image_url?.trim() || "";

    if (!imageUrl) {
      return NextResponse.json(
        { ok: false, error: "ORGANIZATION_IMAGE_NOT_FOUND" },
        { status: 404 },
      );
    }

    if (!/^https?:\/\//i.test(imageUrl)) {
      return NextResponse.json(
        { ok: false, error: "ORGANIZATION_IMAGE_INVALID" },
        { status: 422 },
      );
    }

    const response = NextResponse.redirect(imageUrl, 307);
    response.headers.set(
      "Cache-Control",
      getMediaCacheControl(request.url, "private"),
    );
    return response;
  } catch (error) {
    if (error instanceof ActorContextError) {
      return NextResponse.json(
        { ok: false, error: error.code },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { ok: false, error: "ORGANIZATION_IMAGE_FAILED" },
      { status: 500 },
    );
  }
}

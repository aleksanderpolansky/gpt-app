import { NextResponse } from "next/server";

import { readValueObjectPublicImageUrl } from "@/lib/value-object-public-image";
import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../lib/auth0";
import {
  decodeInlineImageDataUrl,
  getMediaCacheControl,
  toResponseBody,
} from "../../../../../../lib/media-egress";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{ id: string }>;
};

type ValueObjectMediaRow = {
  metadata_json: unknown;
};

export async function GET(request: Request, { params }: RouteProps) {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return NextResponse.json({ ok: false, error: "NOT_AUTHENTICATED" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const actorContext = await resolveActiveActorContext(session.user.sub);
    const { data, error } = await supabase
      .from("value_objects")
      .select("metadata_json")
      .eq("id", id)
      .eq("owner_user_id", actorContext.appUserId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const row = data as ValueObjectMediaRow | null;
    const imageUrl = readValueObjectPublicImageUrl(row?.metadata_json)?.trim() ?? "";
    const cacheControl = getMediaCacheControl(request.url, "private");

    if (!imageUrl) {
      return NextResponse.json({ ok: false, error: "VALUE_OBJECT_IMAGE_NOT_FOUND" }, { status: 404 });
    }

    if (/^https?:\/\//i.test(imageUrl)) {
      const response = NextResponse.redirect(imageUrl, 307);
      response.headers.set("Cache-Control", cacheControl);
      return response;
    }

    const decoded = decodeInlineImageDataUrl(imageUrl);

    if (!decoded) {
      return NextResponse.json({ ok: false, error: "VALUE_OBJECT_IMAGE_INVALID" }, { status: 422 });
    }

    return new NextResponse(toResponseBody(decoded.bytes), {
      status: 200,
      headers: {
        "Content-Type": decoded.contentType,
        "Content-Length": String(decoded.bytes.byteLength),
        "Cache-Control": cacheControl,
      },
    });
  } catch (error) {
    if (error instanceof ActorContextError) {
      return NextResponse.json({ ok: false, error: error.code }, { status: error.status });
    }

    return NextResponse.json({ ok: false, error: "VALUE_OBJECT_IMAGE_FAILED" }, { status: 500 });
  }
}

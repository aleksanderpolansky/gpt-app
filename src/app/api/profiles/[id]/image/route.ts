import { NextResponse } from "next/server";

import {
  decodeInlineImageDataUrl,
  getMediaCacheControl,
  toResponseBody,
} from "../../../../../../lib/media-egress";
import {
  ProfileOwnerContextError,
  resolveProfileOwnerContext,
} from "../../../../../../lib/profile-owner-context";
import { auth0 } from "../../../../../../lib/auth0";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteProps) {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return NextResponse.json({ ok: false, error: "NOT_AUTHENTICATED" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const ownerContext = await resolveProfileOwnerContext(session.user.sub, id);
    const imageUrl = ownerContext.profile.imageUrl?.trim() ?? "";
    const cacheControl = getMediaCacheControl(request.url, "private");

    if (!imageUrl) {
      return NextResponse.json({ ok: false, error: "PROFILE_IMAGE_NOT_FOUND" }, { status: 404 });
    }

    if (/^https?:\/\//i.test(imageUrl)) {
      const response = NextResponse.redirect(imageUrl, 307);
      response.headers.set("Cache-Control", cacheControl);
      return response;
    }

    const decoded = decodeInlineImageDataUrl(imageUrl);

    if (!decoded) {
      return NextResponse.json({ ok: false, error: "PROFILE_IMAGE_INVALID" }, { status: 422 });
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
    if (error instanceof ProfileOwnerContextError) {
      return NextResponse.json(
        { ok: false, error: error.code },
        { status: error.status },
      );
    }

    return NextResponse.json({ ok: false, error: "PROFILE_IMAGE_FAILED" }, { status: 500 });
  }
}

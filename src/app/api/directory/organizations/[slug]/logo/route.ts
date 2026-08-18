import { NextResponse } from "next/server";
import { supabase } from "../../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

type OrganizationMediaRow = {
  logo_url: string | null;
  cover_image_url: string | null;
};

const CACHE_CONTROL = "private, no-store, max-age=0";
const DATA_URL_RE = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=\r\n]+)$/;

function placeholderResponse() {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">' +
    '<rect width="512" height="512" rx="48" fill="#eef2ff"/>' +
    '<text x="256" y="290" text-anchor="middle" font-family="Arial,sans-serif" font-size="150" font-weight="700" fill="#3b6ef8">AR</text>' +
    "</svg>";

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": CACHE_CONTROL,
    },
  });
}

export async function GET(_request: Request, { params }: RouteProps) {
  const { slug } = await params;

  const { data, error } = await supabase
    .from("organizations")
    .select("logo_url,cover_image_url")
    .eq("public_slug", slug)
    .eq("status", "active")
    .eq("directory_status", "published")
    .eq("is_public_profile_enabled", true)
    .eq("is_listed_in_directory", true)
    .limit(1);

  if (error) {
    return NextResponse.json(
      { ok: false, error: "Organization media is temporarily unavailable." },
      { status: 503 },
    );
  }

  const row = ((data ?? [])[0] as OrganizationMediaRow | undefined) ?? null;
  const mediaUrl = row?.logo_url?.trim() || row?.cover_image_url?.trim() || "";

  if (!mediaUrl) {
    return placeholderResponse();
  }

  if (/^https?:\/\//i.test(mediaUrl)) {
    const response = NextResponse.redirect(mediaUrl, 307);
    response.headers.set("Cache-Control", CACHE_CONTROL);
    return response;
  }

  const match = DATA_URL_RE.exec(mediaUrl);

  if (!match) {
    return placeholderResponse();
  }

  try {
    const contentType = match[1];
    const bytes = new Uint8Array(Buffer.from(match[2].replace(/\s+/g, ""), "base64"));

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": CACHE_CONTROL,
      },
    });
  } catch {
    return placeholderResponse();
  }
}

const PRIVATE_MEDIA_TOKEN_PREFIX = "arctor-private-media:";

export function toMediaDeliveryUrl(
  rawImageUrl: string | null | undefined,
  deliveryPath: string,
  version?: string | null,
): string | null {
  const normalized = rawImageUrl?.trim() ?? "";

  if (!normalized) {
    return null;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  if (!normalized.startsWith(PRIVATE_MEDIA_TOKEN_PREFIX)) {
    return null;
  }

  const normalizedVersion = version?.trim() ?? "";

  if (!normalizedVersion) {
    return deliveryPath;
  }

  const separator = deliveryPath.includes("?") ? "&" : "?";
  return `${deliveryPath}${separator}v=${encodeURIComponent(normalizedVersion)}`;
}

export function getMediaCacheControl(
  requestUrl: string,
  visibility: "private" | "public",
): string {
  const hasVersion = new URL(requestUrl).searchParams.has("v");

  if (hasVersion) {
    return visibility === "public"
      ? "public, max-age=31536000, immutable"
      : "private, max-age=31536000, immutable";
  }

  return visibility === "public"
    ? "public, max-age=300, stale-while-revalidate=3600"
    : "private, max-age=300";
}

export function getSignedMediaRedirectCacheControl(): string {
  // A signed Storage URL expires quickly. Never cache the redirect itself,
  // otherwise a browser/CDN could retain a Location header beyond its TTL.
  return "private, no-store, max-age=0";
}

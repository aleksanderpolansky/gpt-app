export type DecodedImageDataUrl = {
  contentType: string;
  bytes: Uint8Array;
};

const DATA_URL_RE =
  /^data:(image\/(?:jpeg|png|webp));base64,([a-zA-Z0-9+/=\r\n]+)$/i;

export function isInlineImageDataUrl(value: unknown): value is string {
  return typeof value === "string" && DATA_URL_RE.test(value.trim());
}

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

  if (!isInlineImageDataUrl(normalized)) {
    return null;
  }

  const normalizedVersion = version?.trim() ?? "";

  if (!normalizedVersion) {
    return deliveryPath;
  }

  const separator = deliveryPath.includes("?") ? "&" : "?";
  return `${deliveryPath}${separator}v=${encodeURIComponent(normalizedVersion)}`;
}

export function decodeInlineImageDataUrl(
  value: string | null | undefined,
): DecodedImageDataUrl | null {
  const normalized = value?.trim() ?? "";
  const match = DATA_URL_RE.exec(normalized);

  if (!match) {
    return null;
  }

  try {
    const bytes = new Uint8Array(
      Buffer.from(match[2].replace(/\s+/g, ""), "base64"),
    );

    return {
      contentType: match[1].toLowerCase(),
      bytes,
    };
  } catch {
    return null;
  }
}

export function toResponseBody(bytes: Uint8Array): ArrayBuffer {
  const body = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(body).set(bytes);
  return body;
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

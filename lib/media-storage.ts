import { createHash } from "node:crypto";

import { supabase } from "./supabase";

export const PUBLIC_MEDIA_BUCKET_ID = "arctor-public-media";
export const PRIVATE_MEDIA_BUCKET_ID = "arctor-private-media";
export const PRIVATE_MEDIA_TOKEN_PREFIX = "arctor-private-media:";

const MAX_BUCKET_FILE_BYTES = 512 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const DATA_URL_RE =
  /^data:(image\/(?:jpeg|png|webp));base64,([a-zA-Z0-9+/=\r\n]+)$/i;
const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type MediaVisibility = "public" | "private";

// New-write contract: Storage receives only already-optimized media. Raw user originals are never persisted.

function sanitizeNamespace(value: string) {
  const normalized = value
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => segment.trim().replace(/[^a-zA-Z0-9_-]+/g, "-"))
    .filter(Boolean)
    .join("/");

  if (!normalized || normalized.includes("..")) {
    throw new Error("MEDIA_NAMESPACE_INVALID");
  }

  return normalized;
}

function decodeInlineImage(value: string) {
  const match = DATA_URL_RE.exec(value.trim());

  if (!match) {
    throw new Error("MEDIA_IMAGE_DATA_URL_INVALID");
  }

  const contentType = match[1].toLowerCase();

  if (!SUPPORTED_IMAGE_TYPES.has(contentType)) {
    throw new Error("MEDIA_IMAGE_TYPE_UNSUPPORTED");
  }

  const bytes = Buffer.from(match[2].replace(/\s+/g, ""), "base64");

  if (bytes.byteLength <= 0) {
    throw new Error("MEDIA_IMAGE_EMPTY");
  }

  return { bytes, contentType };
}

async function ensureBucket(visibility: MediaVisibility) {
  const bucketId =
    visibility === "public"
      ? PUBLIC_MEDIA_BUCKET_ID
      : PRIVATE_MEDIA_BUCKET_ID;
  const { data: buckets, error: listError } =
    await supabase.storage.listBuckets();

  if (listError) {
    throw new Error(`MEDIA_BUCKET_LIST_FAILED:${listError.message}`);
  }

  if ((buckets ?? []).some((bucket) => bucket.id === bucketId)) {
    return bucketId;
  }

  const { error: createError } = await supabase.storage.createBucket(
    bucketId,
    {
      public: visibility === "public",
      allowedMimeTypes: [...SUPPORTED_IMAGE_TYPES],
      fileSizeLimit: MAX_BUCKET_FILE_BYTES,
    },
  );

  if (
    createError &&
    !/already exists|duplicate/i.test(createError.message)
  ) {
    throw new Error(
      `MEDIA_BUCKET_CREATE_FAILED:${createError.message}`,
    );
  }

  return bucketId;
}

function isHttpsOrHttpUrl(value: string) {
  return /^https?:\/\/[^\s]+$/i.test(value);
}

export function isPrivateMediaToken(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith(PRIVATE_MEDIA_TOKEN_PREFIX) &&
    value.length > PRIVATE_MEDIA_TOKEN_PREFIX.length
  );
}

export async function persistMediaImageValue(input: {
  value: unknown;
  visibility: MediaVisibility;
  namespace: string;
  maxBytes: number;
}): Promise<string | null> {
  if (
    input.value === undefined ||
    input.value === null ||
    input.value === ""
  ) {
    return null;
  }

  if (typeof input.value !== "string") {
    throw new Error("MEDIA_IMAGE_VALUE_INVALID");
  }

  const normalized = input.value.trim();

  if (!normalized) {
    return null;
  }

  if (isHttpsOrHttpUrl(normalized)) {
    return normalized;
  }

  if (
    input.visibility === "private" &&
    isPrivateMediaToken(normalized)
  ) {
    return normalized;
  }

  const { bytes, contentType } = decodeInlineImage(normalized);

  if (bytes.byteLength > input.maxBytes) {
    throw new Error(
      `MEDIA_IMAGE_TOO_LARGE:${bytes.byteLength}:${input.maxBytes}`,
    );
  }

  const namespace = sanitizeNamespace(input.namespace);
  const digest = createHash("sha256").update(bytes).digest("hex");
  const extension = EXTENSION_BY_CONTENT_TYPE[contentType];
  const objectPath = `${namespace}/${digest}.${extension}`;
  const bucketId = await ensureBucket(input.visibility);

  const { error: uploadError } = await supabase.storage
    .from(bucketId)
    .upload(objectPath, bytes, {
      contentType,
      cacheControl: "31536000",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`MEDIA_IMAGE_UPLOAD_FAILED:${uploadError.message}`);
  }

  if (input.visibility === "private") {
    return `${PRIVATE_MEDIA_TOKEN_PREFIX}${objectPath}`;
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucketId)
    .getPublicUrl(objectPath);
  const publicUrl = publicUrlData.publicUrl?.trim();

  if (!publicUrl) {
    throw new Error("MEDIA_IMAGE_PUBLIC_URL_MISSING");
  }

  return publicUrl;
}

function inferContentType(objectPath: string) {
  const lower = objectPath.toLowerCase();

  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  if (lower.endsWith(".png")) {
    return "image/png";
  }

  return "image/webp";
}

export async function readPrivateMediaObject(
  value: string | null | undefined,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  const normalized = value?.trim() ?? "";

  if (!isPrivateMediaToken(normalized)) {
    return null;
  }

  const objectPath = normalized.slice(PRIVATE_MEDIA_TOKEN_PREFIX.length);

  if (
    !objectPath ||
    objectPath.startsWith("/") ||
    objectPath.includes("..")
  ) {
    throw new Error("PRIVATE_MEDIA_TOKEN_INVALID");
  }

  const { data, error } = await supabase.storage
    .from(PRIVATE_MEDIA_BUCKET_ID)
    .download(objectPath);

  if (error || !data) {
    throw new Error(
      `PRIVATE_MEDIA_DOWNLOAD_FAILED:${error?.message ?? "missing blob"}`,
    );
  }

  const bytes = new Uint8Array(await data.arrayBuffer());

  return {
    bytes,
    contentType: data.type || inferContentType(objectPath),
  };
}

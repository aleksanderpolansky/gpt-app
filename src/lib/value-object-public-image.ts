export type GiftCertificateProductImageSnapshot = {
  readonly captured: boolean;
  readonly imageUrl: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeImageUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (
    /^data:image\/(?:jpeg|png|webp);base64,/i.test(normalized) ||
    /^https:\/\/[^\s]+$/i.test(normalized)
  ) {
    return normalized;
  }

  return null;
}

export function readValueObjectPublicImageUrl(metadata: unknown): string | null {
  if (!isRecord(metadata)) {
    return null;
  }

  const publicProfile = isRecord(metadata.public_profile)
    ? metadata.public_profile
    : isRecord(metadata.publicProfile)
      ? metadata.publicProfile
      : null;

  if (!publicProfile) {
    return null;
  }

  return normalizeImageUrl(
    publicProfile.image_url ?? publicProfile.imageUrl,
  );
}

export function readGiftCertificateProductImageSnapshot(
  metadata: unknown,
): GiftCertificateProductImageSnapshot {
  if (!isRecord(metadata)) {
    return { captured: false, imageUrl: null };
  }

  const version = metadata.giftCertificateProductImageSnapshotVersion;

  if (version !== "gcr3-media-v1") {
    return { captured: false, imageUrl: null };
  }

  return {
    captured: true,
    imageUrl: normalizeImageUrl(metadata.giftCertificateProductImageUrl),
  };
}

export function buildGiftCertificateProductImageSnapshotMetadata(
  currentMetadata: unknown,
  imageUrl: string | null,
  capturedAt: string,
): Record<string, unknown> {
  const base = isRecord(currentMetadata) ? currentMetadata : {};

  return {
    ...base,
    giftCertificateProductImageSnapshotVersion: "gcr3-media-v1",
    giftCertificateProductImageUrl: imageUrl,
    giftCertificateProductImageCapturedAt: capturedAt,
  };
}

import { createHash, createHmac } from "node:crypto";

export const GIFT_CERTIFICATE_QR_TOKEN_VERSION = "hmac-sha256-v1";

const MINIMUM_SECRET_LENGTH = 32;

export class GiftCertificateOrderSecurityConfigurationError extends Error {
  readonly code = "PGC7D_QR_SIGNING_SECRET_MISSING";

  constructor() {
    super(
      "GIFT_CERTIFICATE_QR_SIGNING_SECRET must contain at least 32 characters.",
    );
    this.name = "GiftCertificateOrderSecurityConfigurationError";
  }
}

type OrderIdentity = {
  readonly activityEventId: string;
  readonly buyerUserId: string;
  readonly recipientActorId: string;
};

type GiftCertificateOrderSecurity = {
  readonly idempotencyKey: string;
  readonly publicCode: string;
  readonly rawQrToken: string;
  readonly qrTokenHash: string;
  readonly qrTokenVersion: typeof GIFT_CERTIFICATE_QR_TOKEN_VERSION;
};

function getSigningSecret(): string {
  const value = process.env.GIFT_CERTIFICATE_QR_SIGNING_SECRET?.trim();

  if (!value || value.length < MINIMUM_SECRET_LENGTH) {
    throw new GiftCertificateOrderSecurityConfigurationError();
  }

  return value;
}

function buildIdentity(identity: OrderIdentity): string {
  return [
    "arctor-gift-certificate-order-v1",
    identity.activityEventId,
    identity.buyerUserId,
    identity.recipientActorId,
  ].join("|");
}

function createNamespacedHmac(
  namespace: string,
  identity: OrderIdentity,
): Buffer {
  return createHmac("sha256", getSigningSecret())
    .update(`${namespace}|${buildIdentity(identity)}`, "utf8")
    .digest();
}

export function createGiftCertificateOrderSecurity(
  identity: OrderIdentity,
): GiftCertificateOrderSecurity {
  const identityText = buildIdentity(identity);
  const identityHash = createHash("sha256")
    .update(identityText, "utf8")
    .digest("hex");
  const publicCodeDigest = createNamespacedHmac(
    "public-code",
    identity,
  ).toString("hex");
  const rawQrToken = createNamespacedHmac(
    "permanent-one-time-qr-token",
    identity,
  ).toString("base64url");

  return {
    idempotencyKey: `gift-order-v1:${identityHash}`,
    publicCode: `GC-${publicCodeDigest.slice(0, 20).toUpperCase()}`,
    rawQrToken,
    qrTokenHash: createHash("sha256")
      .update(rawQrToken, "utf8")
      .digest("hex"),
    qrTokenVersion: GIFT_CERTIFICATE_QR_TOKEN_VERSION,
  };
}

export function buildGiftCertificateQrPayload(params: {
  readonly activityEventId: string;
  readonly publicCode: string;
  readonly rawQrToken: string;
}): string {
  const configuredBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://arctor.app";
  const baseUrl = configuredBaseUrl.replace(/\/+$/, "");
  const url = new URL(`${baseUrl}/gift-certificates/scan`);

  url.searchParams.set("certificate", params.activityEventId);
  url.searchParams.set("code", params.publicCode);
  url.searchParams.set("token", params.rawQrToken);

  return url.toString();
}

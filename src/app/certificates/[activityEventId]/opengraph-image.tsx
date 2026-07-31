import { ImageResponse } from "next/og";

import { getGiftCertificateCatalogItem } from "../gift-certificate-data";

export const alt = "ARCTor offer";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export default async function OpenGraphImage({
  params,
}: {
  readonly params: Promise<{ readonly activityEventId: string }>;
}) {
  const { activityEventId } = await params;
  const loadedCertificate = await getGiftCertificateCatalogItem(activityEventId);
  const certificate =
    loadedCertificate &&
    loadedCertificate.activity.status === "planned" &&
    ["available", "active", "redeemed", "expired", "annulled"].includes(
      loadedCertificate.lifecycleStatus,
    )
      ? loadedCertificate
      : null;

  const title = certificate?.title ?? "ARCTor offer";
  const provider = certificate?.providerDisplayName ?? "ARCTor";
  const regularPrice = certificate
    ? formatMoney(certificate.regularPrice, certificate.providerCurrency)
    : "";
  const payment = certificate
    ? certificate.moneyRemainder > 0
      ? `${certificate.pointsPrice.toFixed(2)} · ${formatMoney(
          certificate.moneyRemainder,
          certificate.providerCurrency,
        )}`
      : certificate.pointsPrice.toFixed(2)
    : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background:
            "linear-gradient(135deg, #eef2ff 0%, #ffffff 52%, #ecfdf3 100%)",
          color: "#111827",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 34,
              fontWeight: 800,
              color: "#315bd0",
              letterSpacing: "-0.03em",
            }}
          >
            ARCTor
          </div>
          <div
            style={{
              display: "flex",
              padding: "12px 20px",
              borderRadius: 999,
              background: "#ffffff",
              border: "1px solid #dfe3f1",
              fontSize: 22,
              fontWeight: 700,
              color: "#5a5f7a",
            }}
          >
            Offer
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              display: "flex",
              maxWidth: 1000,
              fontSize: 64,
              lineHeight: 1.08,
              fontWeight: 850,
              letterSpacing: "-0.04em",
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              fontWeight: 700,
              color: "#5a5f7a",
            }}
          >
            {provider}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 32,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                display: "flex",
                fontSize: 22,
                fontWeight: 700,
                color: "#7c8099",
              }}
            >
              Regular price
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 46,
                fontWeight: 850,
                color: "#111827",
              }}
            >
              {regularPrice}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              padding: "20px 28px",
              borderRadius: 24,
              background: "#315bd0",
              color: "#ffffff",
              fontSize: 32,
              fontWeight: 800,
            }}
          >
            {payment}
          </div>
        </div>
      </div>
    ),
    size,
  );
}

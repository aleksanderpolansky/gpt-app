"use client";

import {
  getCertificatesMessages,
  getCertificateText,
} from "../../../i18n/messages/certificates";

import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

type ShowCertificateQrButtonProps = {
  certificateCode: string;
  publicCode: string | null;
  redeemCode: string | null;
  qrToken: string | null;
  status: string;
  pointsStatus: string;
  selectedLocale?: string;
};

function getBaseUrl() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.location.origin;
}

export default function ShowCertificateQrButton({
  certificateCode,
  publicCode,
  redeemCode,
  qrToken,
  status,
  pointsStatus,
  selectedLocale = "en",
}: ShowCertificateQrButtonProps) {
  const certificateMessages = getCertificatesMessages(selectedLocale);
  const commonMessages = certificateMessages.common;
  const actionsMessages = certificateMessages.actions;
  const [isOpen, setIsOpen] = useState(false);

  const canShow =
    status === "active" &&
    pointsStatus === "reserved" &&
    Boolean(publicCode) &&
    Boolean(redeemCode) &&
    Boolean(qrToken);

  const qrPayload = useMemo(() => {
    if (!qrToken) {
      return "";
    }

    return `${getBaseUrl()}/certificates/redeem?token=${encodeURIComponent(qrToken)}&locale=${encodeURIComponent(selectedLocale)}`;
  }, [qrToken]);

  if (!canShow) {
    return (
      <button
        type="button"
        disabled
        title={getCertificateText(actionsMessages, "qrUnavailable", "QR is available only for active reserved certificates")}
        style={{
          border: "1px solid #9ca3af",
          borderRadius: "8px",
          padding: "10px 12px",
          color: "#ffffff",
          background: "#9ca3af",
          fontWeight: 700,
          cursor: "not-allowed",
        }}
      >
        Show QR
      </button>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gap: "10px",
        minWidth: "260px",
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        style={{
          border: "1px solid #2563eb",
          borderRadius: "8px",
          padding: "10px 12px",
          color: "#ffffff",
          background: "#2563eb",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {isOpen ? getCertificateText(actionsMessages, "hideQr", "Hide QR") : getCertificateText(actionsMessages, "showQr", "Show QR")}
      </button>

      {isOpen ? (
        <section
          style={{
            border: "1px solid #bfdbfe",
            borderRadius: "12px",
            padding: "14px",
            background: "#eff6ff",
            display: "grid",
            gap: "12px",
            maxWidth: "360px",
          }}
        >
          <strong>{getCertificateText(actionsMessages, "certificateQrCode", "Certificate QR code")}</strong>

          <div
            style={{
              border: "1px solid #bfdbfe",
              borderRadius: "12px",
              padding: "18px",
              background: "#ffffff",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <QRCodeSVG
              value={qrPayload}
              size={220}
              level="M"
              includeMargin
            />
          </div>

          <div style={{ display: "grid", gap: "6px", fontSize: "14px" }}>
            <p style={{ margin: 0 }}>
              <strong>{getCertificateText(commonMessages, "certificateCode", "Certificate code")}:</strong>{" "}
              <span style={{ fontFamily: "monospace" }}>
                {certificateCode}
              </span>
            </p>

            <p style={{ margin: 0 }}>
              <strong>Public code:</strong>{" "}
              <span style={{ fontFamily: "monospace" }}>{publicCode}</span>
            </p>

            <p style={{ margin: 0 }}>
              <strong>{getCertificateText(commonMessages, "redeemCode", "Redeem code")}:</strong>{" "}
              <span style={{ fontFamily: "monospace" }}>{redeemCode}</span>
            </p>
          </div>

          <p
            style={{
              margin: 0,
              color: "#555555",
              fontSize: "13px",
              lineHeight: "1.45",
            }}
          >
            {getCertificateText(actionsMessages, "qrExplanation", "Show this QR code to the seller. After scanning, the seller will confirm certificate usage.")}
          </p>
        </section>
      ) : null}
    </div>
  );
}
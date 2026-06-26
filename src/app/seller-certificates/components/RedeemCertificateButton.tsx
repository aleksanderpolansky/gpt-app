"use client";

import { useState } from "react";
import {
  getCertificatesMessages,
  getCertificateText,
} from "../../../i18n/messages/certificates";

type RedeemCertificateButtonProps = {
  certificateId: string;
  certificateCode: string;
  status: string;
  pointsStatus: string;
  pointsReserved: number;
  pointsCurrencyCode: string;
  selectedLocale?: string;
};

type RedeemCertificateResponse = {
  ok: boolean;
  redeemedCertificate?: {
    certificate_id: string;
    certificate_code: string;
    status: string;
    points_status: string;
    points_charged: number;
    reserved_balance_after: number;
    spent_balance_after: number;
  } | null;
  error?: string;
};

function formatPoints(value: number | null | undefined, currency: string) {
  if (typeof value !== "number") {
    return `0 ${currency}`;
  }

  return `${value} ${currency}`.trim();
}

export default function RedeemCertificateButton({
  certificateId,
  certificateCode,
  status,
  pointsStatus,
  pointsReserved,
  pointsCurrencyCode,
  selectedLocale = "en",
}: RedeemCertificateButtonProps) {
  const certificateMessages = getCertificatesMessages(selectedLocale);
  const commonMessages = certificateMessages.common;
  const actionsMessages = certificateMessages.actions;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sellerComment, setSellerComment] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const canRedeem = status === "active" && pointsStatus === "reserved";

  async function handleRedeemCertificate() {
    setIsSubmitting(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/certificates/redeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          certificateId,
          sellerComment: sellerComment || null,
        }),
      });

      const json = (await response.json()) as RedeemCertificateResponse;

      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? getCertificateText(actionsMessages, "redeemError", "Could not confirm certificate usage."));
      }

      const redeemedCertificate = json.redeemedCertificate;

      if (!redeemedCertificate) {
        throw new Error(getCertificateText(actionsMessages, "redeemError", "Could not confirm certificate usage."));
      }

      setSuccessMessage(
        `Certificate used successfully. Charged for this certificate: ${formatPoints(
          redeemedCertificate.points_charged,
          pointsCurrencyCode
        )}.`
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : getCertificateText(actionsMessages, "redeemError", "Could not confirm certificate usage.")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!canRedeem) {
    return (
      <div
        style={{
          border: "1px solid #dddddd",
          borderRadius: "10px",
          padding: "12px",
          background: "#f9fafb",
          color: "#666666",
          display: "grid",
          gap: "6px",
        }}
      >
        <strong>{getCertificateText(actionsMessages, "redeemUnavailable", "Confirmation unavailable")}</strong>
        <span>
          {getCertificateText(commonMessages, "status", "Status")}: {status} / {getCertificateText(commonMessages, "points", "POINTS")}: {pointsStatus}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        border: "1px solid #bfe5c8",
        borderRadius: "10px",
        padding: "12px",
        background: "#edf8f0",
        display: "grid",
        gap: "10px",
        minWidth: "260px",
      }}
    >
      <strong>{getCertificateText(actionsMessages, "redeem", "Confirm usage")}</strong>

      <div style={{ color: "#176b2c", fontSize: "14px", lineHeight: "1.45" }}>
        {getCertificateText(commonMessages, "certificate", "Certificate")}:{" "}
        <span style={{ fontFamily: "monospace" }}>{certificateCode}</span>
        <br />
        {getCertificateText(actionsMessages, "reservedToCharge", "Reserved to charge")}: {formatPoints(pointsReserved, pointsCurrencyCode)}
      </div>

      <input
        value={sellerComment}
        onChange={(event) => setSellerComment(event.target.value)}
        placeholder={getCertificateText(commonMessages, "sellerComment", "Seller comment")}
        style={{
          border: "1px solid #bfe5c8",
          borderRadius: "8px",
          padding: "9px 10px",
          fontSize: "14px",
        }}
      />

      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => void handleRedeemCertificate()}
        style={{
          border: "1px solid #16a34a",
          borderRadius: "8px",
          padding: "10px 12px",
          color: "#ffffff",
          background: isSubmitting ? "#86efac" : "#16a34a",
          fontWeight: 700,
          cursor: isSubmitting ? "not-allowed" : "pointer",
        }}
      >
        {isSubmitting ? getCertificateText(actionsMessages, "redeemLoading", "Confirming...") : getCertificateText(actionsMessages, "redeem", "Confirm usage")}
      </button>

      {successMessage ? (
        <div
          style={{
            border: "1px solid #bfe5c8",
            borderRadius: "8px",
            padding: "10px",
            background: "#ffffff",
            color: "#176b2c",
            fontSize: "14px",
            lineHeight: "1.45",
          }}
        >
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div
          style={{
            border: "1px solid #f2b8b5",
            borderRadius: "8px",
            padding: "10px",
            background: "#fff5f5",
            color: "#a40000",
            fontSize: "14px",
            lineHeight: "1.45",
          }}
        >
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
}
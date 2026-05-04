"use client";

import { useState } from "react";

type CancelCertificateButtonProps = {
  certificateId: string;
  certificateCode: string;
  status: string;
  pointsStatus: string;
  pointsReserved: number;
  pointsCurrencyCode: string;
};

type CancelCertificateResponse = {
  ok: boolean;
  cancelledCertificate?: {
    certificate_id: string;
    certificate_code: string;
    status: string;
    points_status: string;
    points_released: number;
    available_balance_after: number;
    reserved_balance_after: number;
  } | null;
  error?: string;
};

function formatPoints(value: number | null | undefined, currency: string) {
  if (typeof value !== "number") {
    return `0 ${currency}`;
  }

  return `${value} ${currency}`.trim();
}

export default function CancelCertificateButton({
  certificateId,
  certificateCode,
  status,
  pointsStatus,
  pointsReserved,
  pointsCurrencyCode,
}: CancelCertificateButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [buyerComment, setBuyerComment] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const canCancel = status === "active" && pointsStatus === "reserved";

  async function handleCancelCertificate() {
    const confirmed = window.confirm(
      "Cancel this certificate? Reserved points will be released back to your available balance if cancellation is allowed."
    );

    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/certificates/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          certificateId,
          buyerComment: buyerComment || null,
        }),
      });

      const json = (await response.json()) as CancelCertificateResponse;

      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? "Cannot cancel certificate");
      }

      const cancelledCertificate = json.cancelledCertificate;

      if (!cancelledCertificate) {
        throw new Error("Certificate was cancelled, but response is empty");
      }

      setSuccessMessage(
        `Certificate cancelled successfully. Released for this certificate: ${formatPoints(
          cancelledCertificate.points_released,
          pointsCurrencyCode
        )}.`
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown cancellation error"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!canCancel) {
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
        <strong>Cancellation unavailable</strong>
        <span>
          Current status: {status} / points: {pointsStatus}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        border: "1px solid #f0d28a",
        borderRadius: "10px",
        padding: "12px",
        background: "#fff8e6",
        display: "grid",
        gap: "10px",
        minWidth: "260px",
      }}
    >
      <strong>Cancel certificate</strong>

      <div style={{ color: "#7a4b00", fontSize: "14px", lineHeight: "1.45" }}>
        Certificate:{" "}
        <span style={{ fontFamily: "monospace" }}>{certificateCode}</span>
        <br />
        Reserved to release: {formatPoints(pointsReserved, pointsCurrencyCode)}
      </div>

      <input
        value={buyerComment}
        onChange={(event) => setBuyerComment(event.target.value)}
        placeholder="Cancellation comment, optional"
        style={{
          border: "1px solid #f0d28a",
          borderRadius: "8px",
          padding: "9px 10px",
          fontSize: "14px",
        }}
      />

      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => void handleCancelCertificate()}
        style={{
          border: "1px solid #d97706",
          borderRadius: "8px",
          padding: "10px 12px",
          color: "#ffffff",
          background: isSubmitting ? "#fbbf24" : "#d97706",
          fontWeight: 700,
          cursor: isSubmitting ? "not-allowed" : "pointer",
        }}
      >
        {isSubmitting ? "Cancelling..." : "Cancel certificate"}
      </button>

      {successMessage ? (
        <div
          style={{
            border: "1px solid #f0d28a",
            borderRadius: "8px",
            padding: "10px",
            background: "#ffffff",
            color: "#7a4b00",
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
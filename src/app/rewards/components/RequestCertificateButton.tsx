"use client";

import { useState } from "react";

type RequestCertificateButtonProps = {
  offerId: string;
  pointsPrice: number | null;
  pointsCurrencyCode: string | null;
  moneyPrice: number | null;
  currency: string | null;
};

type CertificateRequestResponse = {
  ok: boolean;
  certificateRequest?: {
    certificate_id: string;
    certificate_code: string;
    status: string;
    points_status: string;
    points_reserved: number;
    available_balance_after: number;
    reserved_balance_after: number;
  } | null;
  error?: string;
};

function formatMoney(value: number | null | undefined, currency: string | null) {
  if (typeof value !== "number") {
    return "0";
  }

  return `${value} ${currency ?? ""}`.trim();
}

export default function RequestCertificateButton({
  offerId,
  pointsPrice,
  pointsCurrencyCode,
  moneyPrice,
  currency,
}: RequestCertificateButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleRequestCertificate() {
    setIsSubmitting(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/certificates/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          offerId,
          receiverPersonName: null,
          receiverEmail: null,
          message: null,
        }),
      });

      const json = (await response.json()) as CertificateRequestResponse;

      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? "Cannot request certificate");
      }

      const certificateRequest = json.certificateRequest;

      if (!certificateRequest) {
        throw new Error("Certificate request was created, but response is empty");
      }

      setSuccessMessage(
        `Certificate requested. Reserved: ${formatMoney(
          certificateRequest.points_reserved,
          pointsCurrencyCode ?? "POINT"
        )}. Available after: ${formatMoney(
          certificateRequest.available_balance_after,
          pointsCurrencyCode ?? "POINT"
        )}.`
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown certificate error"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "10px" }}>
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => void handleRequestCertificate()}
        title={`Request certificate. Points: ${formatMoney(
          pointsPrice ?? 0,
          pointsCurrencyCode ?? "POINT"
        )}. Money payment: ${formatMoney(moneyPrice ?? 0, currency)}.`}
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
        {isSubmitting ? "Requesting..." : "Request certificate"}
      </button>

      {successMessage ? (
        <div
          style={{
            border: "1px solid #bfe5c8",
            borderRadius: "8px",
            padding: "10px",
            background: "#edf8f0",
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
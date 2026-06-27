"use client";

import { FormEvent, useEffect, useState } from "react";

import { getPurchaseConfirmationText } from "@/i18n/messages/purchase-confirmations";

const purchaseText = (key: Parameters<typeof getPurchaseConfirmationText>[0]) => getPurchaseConfirmationText(key, "en");
type PurchaseConfirmationCreateResponse = {
  ok: boolean;
  purchaseConfirmation?: unknown;
  error?: string;
};

type MinimumPurchaseThreshold = {
  currency: string;
  amount: number;
};

type PurchaseConfirmationFormProps = {
  organizationId: string;
  organizationDefaultCurrency: string | null;
  myPurchaseConfirmationsHref: string;
  purchaseConfirmationsHref: string;
  publicPurchaseHistoryHref: string;
};

const MINIMUM_PURCHASE_THRESHOLDS: Record<string, MinimumPurchaseThreshold> = {
  EUR: {
    currency: "EUR",
    amount: 10,
  },
  PLN: {
    currency: "PLN",
    amount: 45,
  },
  USD: {
    currency: "USD",
    amount: 11,
  },
  GBP: {
    currency: "GBP",
    amount: 9,
  },
  UAH: {
    currency: "UAH",
    amount: 450,
  },
  CZK: {
    currency: "CZK",
    amount: 250,
  },
};

function normalizeCurrency(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.trim().toUpperCase();
}

function getMinimumPurchaseThreshold(
  currency: string | null | undefined
): MinimumPurchaseThreshold | null {
  const normalizedCurrency = normalizeCurrency(currency);

  if (!normalizedCurrency) {
    return null;
  }

  return MINIMUM_PURCHASE_THRESHOLDS[normalizedCurrency] ?? null;
}

export default function PurchaseConfirmationForm({
  organizationId,
  organizationDefaultCurrency,
  myPurchaseConfirmationsHref,
  purchaseConfirmationsHref,
  publicPurchaseHistoryHref,
}: PurchaseConfirmationFormProps) {
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [purchaseCurrency, setPurchaseCurrency] = useState("");
  const [userComment, setUserComment] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [isSubmittingPurchase, setIsSubmittingPurchase] = useState(false);
  const [purchaseSubmitMessage, setPurchaseSubmitMessage] = useState("");
  const [purchaseSubmitError, setPurchaseSubmitError] = useState("");

  const effectivePurchaseCurrency =
    normalizeCurrency(purchaseCurrency) ||
    normalizeCurrency(organizationDefaultCurrency) ||
    "PLN";

  const minimumPurchaseThreshold = getMinimumPurchaseThreshold(
    effectivePurchaseCurrency
  );

  async function handleSubmitPurchaseConfirmation(event: FormEvent) {
    event.preventDefault();

    setPurchaseSubmitMessage("");
    setPurchaseSubmitError("");

      const parsedPurchaseAmount = Number.parseFloat(purchaseAmount.replace(",", "."));

    if (Number.isNaN(parsedPurchaseAmount) || parsedPurchaseAmount <= 0) {
      setPurchaseSubmitError(purchaseText("purchaseConfirmations.entry.invalidAmount"));
      return;
    }

    setIsSubmittingPurchase(true);

    try {
      const response = await fetch("/api/purchase-confirmations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          organizationId,
          purchaseAmount: parsedPurchaseAmount,
          purchaseCurrency: effectivePurchaseCurrency,
          userComment: userComment.trim() || null,
          receiptUrl: receiptUrl.trim() || null,
        }),
      });

      const json =
        (await response.json()) as PurchaseConfirmationCreateResponse;

      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? "Failed to submit purchase confirmation");
      }

      setPurchaseAmount("");
        purchaseText("purchaseConfirmations.entry.submittedMessage"),
      setReceiptUrl("");
      setPurchaseSubmitMessage(
        purchaseText("purchaseConfirmations.entry.submittedMessage"),
      );
    } catch (error) {
      setPurchaseSubmitError(
        error instanceof Error ? error.message : "Unknown submit error"
      );
    } finally {
      setIsSubmittingPurchase(false);
    }
  }

  useEffect(() => {
    if (organizationDefaultCurrency && purchaseCurrency.trim() === "") {
      setPurchaseCurrency(organizationDefaultCurrency);
    }
  }, [organizationDefaultCurrency, purchaseCurrency]);

  return (
    <section
      style={{
        border: "1px solid #bfdbfe",
        borderRadius: "12px",
        padding: "20px",
        background: "#eff6ff",
      }}
    >
      <h2 style={{ margin: "0 0 10px", fontSize: "24px" }}>
        {purchaseText("purchaseConfirmations.entry.title")}
      </h2>

      <p style={{ margin: "0 0 12px", color: "#374151" }}>
        {purchaseText("purchaseConfirmations.entry.description")}
      </p>

      <p
        style={{
          margin: "0 0 16px",
          color: "#1e3a8a",
          fontSize: "13px",
          lineHeight: "1.5",
        }}
      >
        {purchaseText("purchaseConfirmations.entry.scopeNote")}
      </p>

      <form
        onSubmit={handleSubmitPurchaseConfirmation}
        style={{
          display: "grid",
          gap: "14px",
        }}
      >
        {minimumPurchaseThreshold ? (
          <div
            style={{
              border: "1px solid #bfdbfe",
              borderRadius: "10px",
              padding: "12px",
              background: "#ffffff",
              color: "#1d4ed8",
              fontSize: "13px",
              lineHeight: "1.5",
            }}
          >
            {purchaseText("purchaseConfirmations.entry.minimumThresholdPrefix")}{" "}
            <strong>
              {minimumPurchaseThreshold.amount}{" "}
              {minimumPurchaseThreshold.currency}
            </strong>
            .
          </div>
        ) : (
          <div
            style={{
              border: "1px solid #facc15",
              borderRadius: "10px",
              padding: "12px",
              background: "#fefce8",
              color: "#713f12",
              fontSize: "13px",
              lineHeight: "1.5",
            }}
          >
            {purchaseText("purchaseConfirmations.entry.thresholdMissing")}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
          }}
        >
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 600 }}>
              {purchaseText("purchaseConfirmations.common.amount")}
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={purchaseAmount}
              onChange={(event) => setPurchaseAmount(event.target.value)}
              placeholder={purchaseText("purchaseConfirmations.entry.amountPlaceholder")}
              required
              style={{
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                padding: "10px 12px",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 600 }}>
              {purchaseText("purchaseConfirmations.common.currency")}
            </span>
            <input
              type="text"
              value={purchaseCurrency}
              onChange={(event) => setPurchaseCurrency(event.target.value)}
              placeholder="PLN"
              required
              style={{
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                padding: "10px 12px",
              }}
            />
          </label>
        </div>

        <label style={{ display: "grid", gap: "6px" }}>
          <span style={{ fontWeight: 600 }}>
            {purchaseText("purchaseConfirmations.entry.buyerComment")}
          </span>
          <textarea
            value={userComment}
            onChange={(event) => setUserComment(event.target.value)}
            placeholder={purchaseText("purchaseConfirmations.entry.commentPlaceholder")}
            rows={3}
            style={{
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              padding: "10px 12px",
              resize: "vertical",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: "6px" }}>
          <span style={{ fontWeight: 600 }}>
            {purchaseText("purchaseConfirmations.entry.receiptUrl")}
          </span>
          <input
            type="url"
            value={receiptUrl}
            onChange={(event) => setReceiptUrl(event.target.value)}
            placeholder="https://"
            style={{
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              padding: "10px 12px",
            }}
          />
        </label>

        {purchaseSubmitError ? (
          <div
            style={{
              border: "1px solid #fecaca",
              borderRadius: "10px",
              padding: "12px",
              background: "#fef2f2",
              color: "#991b1b",
            }}
          >
            {purchaseSubmitError}
          </div>
        ) : null}

        {purchaseSubmitMessage ? (
          <div
            style={{
              border: "1px solid #bbf7d0",
              borderRadius: "10px",
              padding: "12px",
              background: "#f0fdf4",
              color: "#166534",
            }}
          >
            {purchaseSubmitMessage}
          </div>
        ) : null}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
          <button
            type="submit"
            disabled={isSubmittingPurchase}
            style={{
              border: 0,
              borderRadius: "999px",
              padding: "10px 16px",
              background: "#1d4ed8",
              color: "#ffffff",
              fontWeight: 700,
              cursor: isSubmittingPurchase ? "not-allowed" : "pointer",
              opacity: isSubmittingPurchase ? 0.65 : 1,
            }}
          >
            {isSubmittingPurchase
              ? purchaseText("purchaseConfirmations.entry.submitting")
              : purchaseText("purchaseConfirmations.entry.submit")}
          </button>

          <a
            href="/my-purchase-confirmations"
            style={{
              alignItems: "center",
              border: "1px solid #bfdbfe",
              borderRadius: "999px",
              color: "#1d4ed8",
              display: "inline-flex",
              fontWeight: 700,
              padding: "10px 16px",
              textDecoration: "none",
            }}
          >
            {purchaseText("purchaseConfirmations.entry.viewMyRequests")}
          </a>
        </div>
      </form>
    </section>
  );
}
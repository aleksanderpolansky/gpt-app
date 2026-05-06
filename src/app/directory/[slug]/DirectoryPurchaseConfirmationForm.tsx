"use client";

import { FormEvent, useEffect, useState } from "react";

type PurchaseConfirmationCreateResponse = {
  ok?: boolean;
  purchaseConfirmation?: unknown;
  error?: string;
};

type MinimumPurchaseThreshold = {
  currency: string;
  amount: number;
};

type DirectoryPurchaseConfirmationFormProps = {
  organizationId: string;
  organizationDefaultCurrency: string | null;
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

export default function DirectoryPurchaseConfirmationForm({
  organizationId,
  organizationDefaultCurrency,
}: DirectoryPurchaseConfirmationFormProps) {
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

    const parsedPurchaseAmount = Number(purchaseAmount);

    if (Number.isNaN(parsedPurchaseAmount) || parsedPurchaseAmount <= 0) {
      setPurchaseSubmitError("Введите положительную сумму покупки.");
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
      setUserComment("");
      setReceiptUrl("");
      setPurchaseSubmitMessage(
        "Заявка на подтверждение покупки создана. Продавец сможет подтвердить или отклонить её. После подтверждения система начислит POINTS по правилам предприятия."
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
      id="register-purchase"
      style={{
        border: "1px solid #bbf7d0",
        borderRadius: "16px",
        background: "#f0fdf4",
        padding: "20px 24px",
        marginBottom: "24px",
        color: "#166534",
      }}
    >
      <h2 style={{ margin: "0 0 8px", fontSize: "22px" }}>
        Зарегистрировать покупку
      </h2>

      <p style={{ margin: "0 0 16px", lineHeight: "1.5" }}>
        Если вы совершили покупку у этого предприятия, отправьте заявку на
        подтверждение. Продавец проверит покупку, а после подтверждения система
        начислит POINTS как бонусные единицы программы лояльности.
      </p>

      <form
        onSubmit={handleSubmitPurchaseConfirmation}
        style={{
          display: "grid",
          gap: "14px",
          padding: "16px",
          border: "1px solid #86efac",
          borderRadius: "12px",
          background: "#ffffff",
          color: "#111111",
        }}
      >
        {minimumPurchaseThreshold ? (
          <div
            style={{
              border: "1px solid #bfdbfe",
              borderRadius: "8px",
              padding: "10px 12px",
              background: "#eff6ff",
              color: "#1e3a8a",
              fontSize: "14px",
              lineHeight: "1.5",
            }}
          >
            Минимальная сумма для начисления 10 POINTS: больше{" "}
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
              borderRadius: "8px",
              padding: "10px 12px",
              background: "#fefce8",
              color: "#713f12",
              fontSize: "14px",
              lineHeight: "1.5",
            }}
          >
            Минимальный порог начисления POINTS пока не определён: проверьте
            страну и валюту предприятия.
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
            <span style={{ fontWeight: 700 }}>Сумма покупки</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={purchaseAmount}
              onChange={(event) => setPurchaseAmount(event.target.value)}
              placeholder="Например: 95"
              required
              style={{
                padding: "10px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                fontSize: "15px",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 700 }}>Валюта</span>
            <input
              type="text"
              value={purchaseCurrency}
              onChange={(event) =>
                setPurchaseCurrency(event.target.value.toUpperCase())
              }
              placeholder={organizationDefaultCurrency || "PLN"}
              style={{
                padding: "10px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                fontSize: "15px",
              }}
            />
          </label>
        </div>

        <label style={{ display: "grid", gap: "6px" }}>
          <span style={{ fontWeight: 700 }}>Комментарий покупателя</span>
          <textarea
            value={userComment}
            onChange={(event) => setUserComment(event.target.value)}
            placeholder="Например: покупка аксессуаров, чек приложен ссылкой."
            rows={3}
            style={{
              padding: "10px 12px",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              fontSize: "15px",
              resize: "vertical",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: "6px" }}>
          <span style={{ fontWeight: 700 }}>Ссылка на чек</span>
          <input
            type="url"
            value={receiptUrl}
            onChange={(event) => setReceiptUrl(event.target.value)}
            placeholder="https://..."
            style={{
              padding: "10px 12px",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              fontSize: "15px",
            }}
          />
        </label>

        {purchaseSubmitError ? (
          <div
            style={{
              border: "1px solid #f2b8b5",
              borderRadius: "8px",
              padding: "10px 12px",
              background: "#fff5f5",
              color: "#a40000",
            }}
          >
            {purchaseSubmitError}
          </div>
        ) : null}

        {purchaseSubmitMessage ? (
          <div
            style={{
              border: "1px solid #bfe5c8",
              borderRadius: "8px",
              padding: "12px",
              background: "#edf8f0",
              color: "#176b2c",
              display: "grid",
              gap: "10px",
            }}
          >
            <div>{purchaseSubmitMessage}</div>

            <a
              href="/my-purchase-confirmations"
              style={{
                display: "inline-block",
                width: "fit-content",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "#ffffff",
                color: "#176b2c",
                border: "1px solid #bfe5c8",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Посмотреть мои заявки
            </a>
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            alignItems: "center",
          }}
        >
          <button
            type="submit"
            disabled={isSubmittingPurchase}
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid #16a34a",
              background: isSubmittingPurchase ? "#86efac" : "#16a34a",
              color: "#ffffff",
              fontWeight: 800,
              cursor: isSubmittingPurchase ? "not-allowed" : "pointer",
            }}
          >
            {isSubmittingPurchase
              ? "Отправка..."
              : "Зарегистрировать покупку"}
          </button>

          <a
            href="/my-purchase-confirmations"
            style={{
              display: "inline-block",
              padding: "10px 14px",
              borderRadius: "8px",
              background: "#ffffff",
              color: "#16a34a",
              border: "1px solid #86efac",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Мои заявки
          </a>
        </div>
      </form>
    </section>
  );
}
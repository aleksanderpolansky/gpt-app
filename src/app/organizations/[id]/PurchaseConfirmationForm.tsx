"use client";

import { FormEvent, useEffect, useState } from "react";

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
        "Заявка на подтверждение покупки создана. Теперь продавец сможет подтвердить или отклонить её."
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
        Purchase confirmations & points
      </h2>

      <p style={{ margin: "0 0 12px", color: "#374151" }}>
        Здесь покупатель может зарегистрировать покупку у этого предприятия.
        Продавец позже подтвердит или отклонит заявку. После подтверждения
        система начислит points по правилам предприятия.
      </p>

      <p
        style={{
          margin: "0 0 16px",
          color: "#1e3a8a",
          fontSize: "14px",
          lineHeight: "1.5",
        }}
      >
        Seller purchase confirmations — это закрытая панель продавца. Она
        доступна только владельцу предприятия. Покупатели и другие пользователи
        видят только публичную историю подтверждённых покупок. My purchase
        confirmations — это личная страница покупателя со своими заявками.
      </p>

      <form
        onSubmit={handleSubmitPurchaseConfirmation}
        style={{
          display: "grid",
          gap: "14px",
          padding: "16px",
          border: "1px solid #93c5fd",
          borderRadius: "12px",
          background: "#ffffff",
          marginBottom: "16px",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "20px" }}>
          Зарегистрировать покупку
        </h3>

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
            Минимальная сумма для начисления 10 points: больше{" "}
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
            Минимальный порог начисления points пока не определён: проверьте
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
            <span style={{ fontWeight: 600 }}>Сумма покупки</span>
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
            <span style={{ fontWeight: 600 }}>Валюта</span>
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
          <span style={{ fontWeight: 600 }}>Комментарий покупателя</span>
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
          <span style={{ fontWeight: 600 }}>Ссылка на чек</span>
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
              href={myPurchaseConfirmationsHref}
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
              border: "1px solid #2563eb",
              background: isSubmittingPurchase ? "#93c5fd" : "#2563eb",
              color: "#ffffff",
              fontWeight: 600,
              cursor: isSubmittingPurchase ? "not-allowed" : "pointer",
            }}
          >
            {isSubmittingPurchase
              ? "Отправка..."
              : "Зарегистрировать покупку"}
          </button>

          <a
            href={myPurchaseConfirmationsHref}
            style={{
              display: "inline-block",
              padding: "10px 14px",
              borderRadius: "8px",
              background: "#ffffff",
              color: "#2563eb",
              border: "1px solid #93c5fd",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            My purchase confirmations
          </a>

          <a
            href={purchaseConfirmationsHref}
            style={{
              display: "inline-block",
              padding: "10px 14px",
              borderRadius: "8px",
              background: "#ffffff",
              color: "#2563eb",
              border: "1px solid #93c5fd",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Seller purchase confirmations
          </a>

          <a
            href={publicPurchaseHistoryHref}
            style={{
              display: "inline-block",
              padding: "10px 14px",
              borderRadius: "8px",
              background: "#ffffff",
              color: "#2563eb",
              border: "1px solid #93c5fd",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Public purchase history
          </a>
        </div>
      </form>
    </section>
  );
}
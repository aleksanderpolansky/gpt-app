"use client";

import { type FormEvent, useMemo, useState } from "react";

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
  currency: string | null | undefined,
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
  const [purchaseCurrency, setPurchaseCurrency] = useState(
    () => normalizeCurrency(organizationDefaultCurrency) || "PLN",
  );
  const [userComment, setUserComment] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [isSubmittingPurchase, setIsSubmittingPurchase] = useState(false);
  const [purchaseSubmitMessage, setPurchaseSubmitMessage] = useState("");
  const [purchaseSubmitError, setPurchaseSubmitError] = useState("");

  const effectivePurchaseCurrency =
    normalizeCurrency(purchaseCurrency) ||
    normalizeCurrency(organizationDefaultCurrency) ||
    "PLN";

  const minimumPurchaseThreshold = useMemo(
    () => getMinimumPurchaseThreshold(effectivePurchaseCurrency),
    [effectivePurchaseCurrency],
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
        "Заявка на подтверждение покупки создана. Продавец сможет подтвердить или отклонить её. После подтверждения система начислит POINTS по правилам предприятия.",
      );
    } catch (error) {
      setPurchaseSubmitError(
        error instanceof Error ? error.message : "Unknown submit error",
      );
    } finally {
      setIsSubmittingPurchase(false);
    }
  }

  return (
    <section
      id="register-purchase"
      className="rounded-[18px] border border-[#bbf7d0] bg-[#f0fdf4] p-6 text-[#14532d] shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
    >
      <div className="mb-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#15803d]">
          Purchase confirmation
        </div>

        <h2 className="mt-2 text-[24px] font-bold tracking-[-0.02em] text-[#14532d]">
          Зарегистрировать покупку
        </h2>

        <p className="mt-2 max-w-[820px] text-[14px] leading-6 text-[#166534]">
          Если покупка была совершена вне платформы, клиент может отправить
          заявку на подтверждение. Продавец проверит покупку, а после
          подтверждения система начислит POINTS как бонусные единицы программы
          лояльности.
        </p>
      </div>

      <form
        onSubmit={handleSubmitPurchaseConfirmation}
        className="grid gap-4 rounded-2xl border border-[#86efac] bg-white p-4 text-[#1a1d2e]"
      >
        {minimumPurchaseThreshold ? (
          <div className="rounded-xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-[13px] leading-5 text-[#1d4ed8]">
            Минимальная сумма для начисления 10 POINTS: больше{" "}
            <strong>
              {minimumPurchaseThreshold.amount}{" "}
              {minimumPurchaseThreshold.currency}
            </strong>
            .
          </div>
        ) : (
          <div className="rounded-xl border border-[#facc15] bg-[#fefce8] px-4 py-3 text-[13px] leading-5 text-[#713f12]">
            Минимальный порог начисления POINTS пока не определён: проверьте
            страну и валюту предприятия.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-[13px] font-semibold text-[#343854]">
              Сумма покупки
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={purchaseAmount}
              onChange={(event) => setPurchaseAmount(event.target.value)}
              placeholder="Например: 95"
              required
              className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-[13px] font-semibold text-[#343854]">
              Валюта
            </span>
            <input
              type="text"
              value={purchaseCurrency}
              onChange={(event) =>
                setPurchaseCurrency(event.target.value.toUpperCase())
              }
              placeholder={organizationDefaultCurrency || "PLN"}
              className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] uppercase text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
            />
          </label>
        </div>

        <label className="grid gap-2">
          <span className="text-[13px] font-semibold text-[#343854]">
            Комментарий
          </span>
          <textarea
            value={userComment}
            onChange={(event) => setUserComment(event.target.value)}
            placeholder="Например: покупка сертификата / услуга массажа / номер заказа"
            rows={3}
            className="w-full resize-y rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] leading-6 text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-[13px] font-semibold text-[#343854]">
            Ссылка на чек или подтверждение
          </span>
          <input
            type="url"
            value={receiptUrl}
            onChange={(event) => setReceiptUrl(event.target.value)}
            placeholder="https://..."
            className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
          />
        </label>

        {purchaseSubmitMessage ? (
          <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-[13px] font-medium text-[#166534]">
            {purchaseSubmitMessage}
          </div>
        ) : null}

        {purchaseSubmitError ? (
          <div className="rounded-xl border border-[#fecaca] bg-[#fff1f2] px-4 py-3 text-[13px] font-medium text-[#b42318]">
            {purchaseSubmitError}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmittingPurchase}
          className="rounded-xl bg-[#16a34a] px-5 py-3 text-[14px] font-bold text-white shadow-[0_10px_20px_rgba(22,163,74,0.22)] transition hover:bg-[#15803d] disabled:cursor-not-allowed disabled:bg-[#aeb6c8] disabled:shadow-none"
        >
          {isSubmittingPurchase
            ? "Отправляю заявку..."
            : "Зарегистрировать покупку"}
        </button>
      </form>
    </section>
  );
}

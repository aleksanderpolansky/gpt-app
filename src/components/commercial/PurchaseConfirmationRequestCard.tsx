"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, HelpCircle, Send } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";

import {
  getPurchaseConfirmationText,
  type PurchaseConfirmationMessageKey,
} from "@/i18n/messages/purchase-confirmations";

type MinimumPurchaseThreshold = {
  currency: string;
  amount: number;
};

type PurchaseConfirmationCreateResponse = {
  ok?: boolean;
  purchaseConfirmation?: unknown;
  error?: string;
};

type PurchaseConfirmationRequestCardProps = {
  organizationId: string;
  organizationDefaultCurrency: string | null;
  locale: string;
  className?: string;
};

type LocalCopy = {
  eyebrow: string;
  help: string;
  shortDescription: string;
  commentLabel: string;
  commentPlaceholder: string;
  rulesNote: string;
  requestCreated: string;
  authHint: string;
};

const LOCAL_COPY: Record<string, LocalCopy> = {
  en: {
    eyebrow: "POINTS",
    help: "How POINTS work",
    shortDescription:
      "Send a purchase confirmation request. The business checks it before POINTS are awarded.",
    commentLabel: "Short note",
    commentPlaceholder: "Service, receipt number, date or short explanation",
    rulesNote:
      "POINTS cannot be bought or transferred. They are awarded only after confirmation and burn when used for a certificate.",
    requestCreated: "Request created",
    authHint: "You need to be signed in to submit a purchase confirmation.",
  },
  pl: {
    eyebrow: "POINTS",
    help: "Jak działają POINTS",
    shortDescription:
      "Wyślij zgłoszenie potwierdzenia zakupu. Firma sprawdzi je przed naliczeniem POINTS.",
    commentLabel: "Krótka notatka",
    commentPlaceholder: "Usługa, numer paragonu, data albo krótki opis",
    rulesNote:
      "POINTS nie można kupować ani przekazywać. Są naliczane dopiero po potwierdzeniu i spalają się przy użyciu na certyfikat.",
    requestCreated: "Zgłoszenie utworzone",
    authHint: "Aby wysłać potwierdzenie zakupu, musisz być zalogowany.",
  },
  uk: {
    eyebrow: "POINTS",
    help: "Як працюють POINTS",
    shortDescription:
      "Надішліть заявку на підтвердження покупки. Підприємство перевірить її перед нарахуванням POINTS.",
    commentLabel: "Коротка примітка",
    commentPlaceholder: "Послуга, номер чека, дата або коротке пояснення",
    rulesNote:
      "POINTS не можна купувати або передавати. Вони нараховуються тільки після підтвердження і згорають при використанні на сертифікат.",
    requestCreated: "Заявку створено",
    authHint: "Щоб надіслати підтвердження покупки, потрібно увійти в акаунт.",
  },
  ru: {
    eyebrow: "POINTS",
    help: "Как работают POINTS",
    shortDescription:
      "Отправьте заявку на подтверждение покупки. Предприятие проверит её перед начислением POINTS.",
    commentLabel: "Короткая заметка",
    commentPlaceholder: "Услуга, номер чека, дата или короткое пояснение",
    rulesNote:
      "POINTS нельзя покупать или передавать. Они начисляются только после подтверждения и сгорают при использовании на сертификат.",
    requestCreated: "Заявка создана",
    authHint: "Чтобы отправить подтверждение покупки, нужно войти в аккаунт.",
  },
  de: {
    eyebrow: "POINTS",
    help: "Wie POINTS funktionieren",
    shortDescription:
      "Senden Sie eine Kaufbestätigungsanfrage. Das Unternehmen prüft sie, bevor POINTS gutgeschrieben werden.",
    commentLabel: "Kurze Notiz",
    commentPlaceholder: "Leistung, Belegnummer, Datum oder kurze Erklärung",
    rulesNote:
      "POINTS können nicht gekauft oder übertragen werden. Sie werden erst nach Bestätigung gutgeschrieben und beim Zertifikatverbrauch verbrannt.",
    requestCreated: "Anfrage erstellt",
    authHint: "Sie müssen angemeldet sein, um eine Kaufbestätigung zu senden.",
  },
  es: {
    eyebrow: "POINTS",
    help: "Cómo funcionan POINTS",
    shortDescription:
      "Envía una solicitud de confirmación de compra. La empresa la revisa antes de conceder POINTS.",
    commentLabel: "Nota breve",
    commentPlaceholder: "Servicio, número de recibo, fecha o explicación breve",
    rulesNote:
      "Los POINTS no se pueden comprar ni transferir. Se conceden solo tras la confirmación y se queman al usarlos para un certificado.",
    requestCreated: "Solicitud creada",
    authHint: "Debes iniciar sesión para enviar una confirmación de compra.",
  },
  cs: {
    eyebrow: "POINTS",
    help: "Jak fungují POINTS",
    shortDescription:
      "Pošlete žádost o potvrzení nákupu. Podnik ji zkontroluje před připsáním POINTS.",
    commentLabel: "Krátká poznámka",
    commentPlaceholder: "Služba, číslo účtenky, datum nebo krátké vysvětlení",
    rulesNote:
      "POINTS nelze kupovat ani převádět. Připisují se až po potvrzení a při použití na certifikát se spálí.",
    requestCreated: "Žádost vytvořena",
    authHint: "Pro odeslání potvrzení nákupu musíte být přihlášeni.",
  },
};

const MINIMUM_PURCHASE_THRESHOLDS: Record<string, MinimumPurchaseThreshold> = {
  EUR: { currency: "EUR", amount: 10 },
  PLN: { currency: "PLN", amount: 45 },
  USD: { currency: "USD", amount: 11 },
  GBP: { currency: "GBP", amount: 9 },
  UAH: { currency: "UAH", amount: 450 },
  CZK: { currency: "CZK", amount: 250 },
};

function normalizeLocale(locale: string | null | undefined) {
  if (
    locale === "pl" ||
    locale === "uk" ||
    locale === "ru" ||
    locale === "de" ||
    locale === "es" ||
    locale === "cs"
  ) {
    return locale;
  }

  return "en";
}

function normalizeCurrency(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase();
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

function pointsAboutHref(locale: string) {
  const searchParams = new URLSearchParams();
  searchParams.set("locale", locale);
  return `/points/about?${searchParams.toString()}`;
}

export default function PurchaseConfirmationRequestCard({
  organizationId,
  organizationDefaultCurrency,
  locale,
  className,
}: PurchaseConfirmationRequestCardProps) {
  const normalizedLocale = normalizeLocale(locale);
  const localCopy = LOCAL_COPY[normalizedLocale] ?? LOCAL_COPY.en;
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [purchaseCurrency, setPurchaseCurrency] = useState(
    () => normalizeCurrency(organizationDefaultCurrency) || "PLN",
  );
  const [userComment, setUserComment] = useState("");
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

  function t(key: PurchaseConfirmationMessageKey) {
    return getPurchaseConfirmationText(key, normalizedLocale);
  }

  async function handleSubmitPurchaseConfirmation(event: FormEvent) {
    event.preventDefault();

    setPurchaseSubmitMessage("");
    setPurchaseSubmitError("");

    const parsedPurchaseAmount = Number.parseFloat(
      purchaseAmount.replace(",", "."),
    );

    if (Number.isNaN(parsedPurchaseAmount) || parsedPurchaseAmount <= 0) {
      setPurchaseSubmitError(t("purchaseConfirmations.entry.invalidAmount"));
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
          receiptUrl: null,
        }),
      });

      const json =
        (await response.json()) as PurchaseConfirmationCreateResponse;

      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? "Failed to submit purchase confirmation");
      }

      setPurchaseAmount("");
      setUserComment("");
      setPurchaseSubmitMessage(t("purchaseConfirmations.entry.submittedMessage"));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown submit error";
      const isAuthError =
        message.toLowerCase().includes("not authenticated") ||
        message.toLowerCase().includes("unauthorized");

      setPurchaseSubmitError(isAuthError ? localCopy.authHint : message);
    } finally {
      setIsSubmittingPurchase(false);
    }
  }

  return (
    <section
      id="register-purchase"
      className={`flex h-full min-h-0 flex-col gap-3 overflow-hidden rounded-2xl border border-[#bbf7d0] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.08)] ${className ?? ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#15803d]">
            {localCopy.eyebrow}
          </div>
          <h3 className="mt-1 text-[18px] font-bold leading-tight text-[#111827]">
            {t("purchaseConfirmations.entry.title")}
          </h3>
          <p className="mt-1 text-[12px] leading-5 text-[#64748b]">
            {localCopy.shortDescription}
          </p>
        </div>

        <Link
          href={pointsAboutHref(normalizedLocale)}
          title={localCopy.help}
          aria-label={localCopy.help}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#dbeafe] bg-[#eff6ff] text-[#3b6ef8] transition hover:-translate-y-0.5 hover:bg-[#dbeafe]"
        >
          <HelpCircle size={16} />
        </Link>
      </div>

      {minimumPurchaseThreshold ? (
        <div className="rounded-xl border border-[#dbeafe] bg-[#eff6ff] px-3 py-2 text-[11px] leading-4 text-[#1d4ed8]">
          {t("purchaseConfirmations.entry.minimumThresholdPrefix")}{" "}
          <strong>
            {minimumPurchaseThreshold.amount} {minimumPurchaseThreshold.currency}
          </strong>
        </div>
      ) : (
        <div className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-[11px] leading-4 text-[#92400e]">
          {t("purchaseConfirmations.entry.thresholdMissing")}
        </div>
      )}

      <form noValidate onSubmit={handleSubmitPurchaseConfirmation} className="grid gap-2">
        <div className="grid grid-cols-[minmax(0,1fr)_82px] gap-2">
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold text-[#475569]">
              {t("purchaseConfirmations.common.amount")}
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={purchaseAmount}
              onChange={(event) => setPurchaseAmount(event.target.value)}
              placeholder={t("purchaseConfirmations.entry.amountPlaceholder")}
              className="h-10 w-full rounded-xl border border-[#dfe3f1] bg-[#f8fafc] px-3 text-[13px] font-semibold text-[#111827] outline-none transition focus:border-[#22c55e] focus:bg-white focus:ring-4 focus:ring-[#22c55e]/10"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-[11px] font-semibold text-[#475569]">
              {t("purchaseConfirmations.common.currency")}
            </span>
            <input
              type="text"
              value={purchaseCurrency}
              onChange={(event) => setPurchaseCurrency(event.target.value)}
              placeholder="PLN"
              className="h-10 w-full rounded-xl border border-[#dfe3f1] bg-[#f8fafc] px-3 text-[13px] font-semibold uppercase text-[#111827] outline-none transition focus:border-[#22c55e] focus:bg-white focus:ring-4 focus:ring-[#22c55e]/10"
            />
          </label>
        </div>

        <label className="grid gap-1">
          <span className="text-[11px] font-semibold text-[#475569]">
            {localCopy.commentLabel}
          </span>
          <input
            type="text"
            value={userComment}
            onChange={(event) => setUserComment(event.target.value)}
            placeholder={localCopy.commentPlaceholder}
            className="h-10 w-full rounded-xl border border-[#dfe3f1] bg-[#f8fafc] px-3 text-[13px] text-[#111827] outline-none transition focus:border-[#22c55e] focus:bg-white focus:ring-4 focus:ring-[#22c55e]/10"
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <p className="max-w-[260px] text-[10px] leading-4 text-[#64748b]">
            {localCopy.rulesNote}
          </p>

          <button
            type="submit"
            disabled={isSubmittingPurchase}
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full bg-[#16a34a] px-4 text-[12px] font-bold text-white shadow-[0_10px_22px_rgba(22,163,74,0.24)] transition hover:bg-[#15803d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmittingPurchase ? (
              t("purchaseConfirmations.entry.submitting")
            ) : (
              <>
                <Send size={13} />
                {t("purchaseConfirmations.entry.submit")}
              </>
            )}
          </button>
        </div>

        {purchaseSubmitError ? (
          <div className="flex items-start gap-2 rounded-xl border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-[11px] leading-4 text-[#991b1b]">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{purchaseSubmitError}</span>
          </div>
        ) : null}

        {purchaseSubmitMessage ? (
          <div className="flex items-start gap-2 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2 text-[11px] leading-4 text-[#166534]">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
            <span>{localCopy.requestCreated}</span>
          </div>
        ) : null}
      </form>
    </section>
  );
}

"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, HelpCircle, Send } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";

import {
  getPurchaseConfirmationText,
  type PurchaseConfirmationMessageKey,
} from "@/i18n/messages/purchase-confirmations";

export const UI_FIX_PURCHASE_REQUEST_MESSAGE_OVERFLOW_VISIBLE =
  "UI_FIX_PURCHASE_REQUEST_MESSAGE_OVERFLOW_VISIBLE" as const;
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
    help: "Jak dzia\u0142aj\u0105 POINTS",
    shortDescription:
      "Wy\u015blij zg\u0142oszenie potwierdzenia zakupu. Firma sprawdzi je przed naliczeniem POINTS.",
    commentLabel: "Kr\u00f3tka notatka",
    commentPlaceholder: "Us\u0142uga, numer paragonu, data albo kr\u00f3tki opis",
    rulesNote:
      "POINTS nie mo\u017cna kupowa\u0107 ani przekazywa\u0107. S\u0105 naliczane dopiero po potwierdzeniu i spalaj\u0105 si\u0119 przy u\u017cyciu na certyfikat.",
    requestCreated: "Zg\u0142oszenie utworzone",
    authHint: "Aby wys\u0142a\u0107 potwierdzenie zakupu, musisz by\u0107 zalogowany.",
  },
  uk: {
    eyebrow: "POINTS",
    help: "\u042f\u043a \u043f\u0440\u0430\u0446\u044e\u044e\u0442\u044c POINTS",
    shortDescription:
      "\u041d\u0430\u0434\u0456\u0448\u043b\u0456\u0442\u044c \u0437\u0430\u044f\u0432\u043a\u0443 \u043d\u0430 \u043f\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043d\u043d\u044f \u043f\u043e\u043a\u0443\u043f\u043a\u0438. \u041f\u0456\u0434\u043f\u0440\u0438\u0454\u043c\u0441\u0442\u0432\u043e \u043f\u0435\u0440\u0435\u0432\u0456\u0440\u0438\u0442\u044c \u0457\u0457 \u043f\u0435\u0440\u0435\u0434 \u043d\u0430\u0440\u0430\u0445\u0443\u0432\u0430\u043d\u043d\u044f\u043c POINTS.",
    commentLabel: "\u041a\u043e\u0440\u043e\u0442\u043a\u0430 \u043f\u0440\u0438\u043c\u0456\u0442\u043a\u0430",
    commentPlaceholder: "\u041f\u043e\u0441\u043b\u0443\u0433\u0430, \u043d\u043e\u043c\u0435\u0440 \u0447\u0435\u043a\u0430, \u0434\u0430\u0442\u0430 \u0430\u0431\u043e \u043a\u043e\u0440\u043e\u0442\u043a\u0435 \u043f\u043e\u044f\u0441\u043d\u0435\u043d\u043d\u044f",
    rulesNote:
      "POINTS \u043d\u0435 \u043c\u043e\u0436\u043d\u0430 \u043a\u0443\u043f\u0443\u0432\u0430\u0442\u0438 \u0430\u0431\u043e \u043f\u0435\u0440\u0435\u0434\u0430\u0432\u0430\u0442\u0438. \u0412\u043e\u043d\u0438 \u043d\u0430\u0440\u0430\u0445\u043e\u0432\u0443\u044e\u0442\u044c\u0441\u044f \u0442\u0456\u043b\u044c\u043a\u0438 \u043f\u0456\u0441\u043b\u044f \u043f\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043d\u043d\u044f \u0456 \u0437\u0433\u043e\u0440\u0430\u044e\u0442\u044c \u043f\u0440\u0438 \u0432\u0438\u043a\u043e\u0440\u0438\u0441\u0442\u0430\u043d\u043d\u0456 \u043d\u0430 \u0441\u0435\u0440\u0442\u0438\u0444\u0456\u043a\u0430\u0442.",
    requestCreated: "\u0417\u0430\u044f\u0432\u043a\u0443 \u0441\u0442\u0432\u043e\u0440\u0435\u043d\u043e",
    authHint: "\u0429\u043e\u0431 \u043d\u0430\u0434\u0456\u0441\u043b\u0430\u0442\u0438 \u043f\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043d\u043d\u044f \u043f\u043e\u043a\u0443\u043f\u043a\u0438, \u043f\u043e\u0442\u0440\u0456\u0431\u043d\u043e \u0443\u0432\u0456\u0439\u0442\u0438 \u0432 \u0430\u043a\u0430\u0443\u043d\u0442.",
  },
  ru: {
    eyebrow: "POINTS",
    help: "\u041a\u0430\u043a \u0440\u0430\u0431\u043e\u0442\u0430\u044e\u0442 POINTS",
    shortDescription:
      "\u041e\u0442\u043f\u0440\u0430\u0432\u044c\u0442\u0435 \u0437\u0430\u044f\u0432\u043a\u0443 \u043d\u0430 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435 \u043f\u043e\u043a\u0443\u043f\u043a\u0438. \u041f\u0440\u0435\u0434\u043f\u0440\u0438\u044f\u0442\u0438\u0435 \u043f\u0440\u043e\u0432\u0435\u0440\u0438\u0442 \u0435\u0451 \u043f\u0435\u0440\u0435\u0434 \u043d\u0430\u0447\u0438\u0441\u043b\u0435\u043d\u0438\u0435\u043c POINTS.",
    commentLabel: "\u041a\u043e\u0440\u043e\u0442\u043a\u0430\u044f \u0437\u0430\u043c\u0435\u0442\u043a\u0430",
    commentPlaceholder: "\u0423\u0441\u043b\u0443\u0433\u0430, \u043d\u043e\u043c\u0435\u0440 \u0447\u0435\u043a\u0430, \u0434\u0430\u0442\u0430 \u0438\u043b\u0438 \u043a\u043e\u0440\u043e\u0442\u043a\u043e\u0435 \u043f\u043e\u044f\u0441\u043d\u0435\u043d\u0438\u0435",
    rulesNote:
      "POINTS \u043d\u0435\u043b\u044c\u0437\u044f \u043f\u043e\u043a\u0443\u043f\u0430\u0442\u044c \u0438\u043b\u0438 \u043f\u0435\u0440\u0435\u0434\u0430\u0432\u0430\u0442\u044c. \u041e\u043d\u0438 \u043d\u0430\u0447\u0438\u0441\u043b\u044f\u044e\u0442\u0441\u044f \u0442\u043e\u043b\u044c\u043a\u043e \u043f\u043e\u0441\u043b\u0435 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f \u0438 \u0441\u0433\u043e\u0440\u0430\u044e\u0442 \u043f\u0440\u0438 \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u043d\u0438\u0438 \u043d\u0430 \u0441\u0435\u0440\u0442\u0438\u0444\u0438\u043a\u0430\u0442.",
    requestCreated: "\u0417\u0430\u044f\u0432\u043a\u0430 \u0441\u043e\u0437\u0434\u0430\u043d\u0430",
    authHint: "\u0427\u0442\u043e\u0431\u044b \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435 \u043f\u043e\u043a\u0443\u043f\u043a\u0438, \u043d\u0443\u0436\u043d\u043e \u0432\u043e\u0439\u0442\u0438 \u0432 \u0430\u043a\u043a\u0430\u0443\u043d\u0442.",
  },
  de: {
    eyebrow: "POINTS",
    help: "Wie POINTS funktionieren",
    shortDescription:
      "Senden Sie eine Kaufbest\u00e4tigungsanfrage. Das Unternehmen pr\u00fcft sie, bevor POINTS gutgeschrieben werden.",
    commentLabel: "Kurze Notiz",
    commentPlaceholder: "Leistung, Belegnummer, Datum oder kurze Erkl\u00e4rung",
    rulesNote:
      "POINTS k\u00f6nnen nicht gekauft oder \u00fcbertragen werden. Sie werden erst nach Best\u00e4tigung gutgeschrieben und beim Zertifikatverbrauch verbrannt.",
    requestCreated: "Anfrage erstellt",
    authHint: "Sie m\u00fcssen angemeldet sein, um eine Kaufbest\u00e4tigung zu senden.",
  },
  es: {
    eyebrow: "POINTS",
    help: "C\u00f3mo funcionan POINTS",
    shortDescription:
      "Env\u00eda una solicitud de confirmaci\u00f3n de compra. La empresa la revisa antes de conceder POINTS.",
    commentLabel: "Nota breve",
    commentPlaceholder: "Servicio, n\u00famero de recibo, fecha o explicaci\u00f3n breve",
    rulesNote:
      "Los POINTS no se pueden comprar ni transferir. Se conceden solo tras la confirmaci\u00f3n y se queman al usarlos para un certificado.",
    requestCreated: "Solicitud creada",
    authHint: "Debes iniciar sesi\u00f3n para enviar una confirmaci\u00f3n de compra.",
  },
  cs: {
    eyebrow: "POINTS",
    help: "Jak funguj\u00ed POINTS",
    shortDescription:
      "Po\u0161lete \u017e\u00e1dost o potvrzen\u00ed n\u00e1kupu. Podnik ji zkontroluje p\u0159ed p\u0159ips\u00e1n\u00edm POINTS.",
    commentLabel: "Kr\u00e1tk\u00e1 pozn\u00e1mka",
    commentPlaceholder: "Slu\u017eba, \u010d\u00edslo \u00fa\u010dtenky, datum nebo kr\u00e1tk\u00e9 vysv\u011btlen\u00ed",
    rulesNote:
      "POINTS nelze kupovat ani p\u0159ev\u00e1d\u011bt. P\u0159ipisuj\u00ed se a\u017e po potvrzen\u00ed a p\u0159i pou\u017eit\u00ed na certifik\u00e1t se sp\u00e1l\u00ed.",
    requestCreated: "\u017d\u00e1dost vytvo\u0159ena",
    authHint: "Pro odesl\u00e1n\u00ed potvrzen\u00ed n\u00e1kupu mus\u00edte b\u00fdt p\u0159ihl\u00e1\u0161eni.",
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


const PURCHASE_REQUEST_ERROR_MESSAGES = {
  en: {
    unknown: "The request could not be created.",
    ownerSelf: "Request not created. The business owner cannot register a purchase at their own business. The real buyer must send the request from their own account.",
    missingThreshold: "Request not created. This business does not yet have a minimum POINTS threshold. Set the country or currency in business settings.",
    minimumGeneric: "Request not created. The purchase amount is too low for awarding POINTS.",
    minimumWithAmount: "Request not created. To award 10 POINTS, the purchase amount must be greater than {amount} {currency}.",
  },
  pl: {
    unknown: "Nie udalo sie utworzyc zgloszenia.",
    ownerSelf: "Zgloszenie nie zostalo utworzone. Wlasciciel firmy nie moze rejestrowac zakupu we wlasnej firmie. Zakup powinien zglosic realny kupujacy ze swojego konta.",
    missingThreshold: "Zgloszenie nie zostalo utworzone. Dla tej firmy nie ustawiono jeszcze minimalnego progu naliczania POINTS. Ustaw kraj albo walute w ustawieniach firmy.",
    minimumGeneric: "Zgloszenie nie zostalo utworzone. Kwota zakupu jest za niska do naliczenia POINTS.",
    minimumWithAmount: "Zgloszenie nie zostalo utworzone. Aby naliczyc 10 POINTS, kwota zakupu musi byc wieksza niz {amount} {currency}.",
  },
  uk: {
    unknown: "\u0417\u0430\u044f\u0432\u043a\u0443 \u043d\u0435 \u0441\u0442\u0432\u043e\u0440\u0435\u043d\u043e.",
    ownerSelf: "\u0417\u0430\u044f\u0432\u043a\u0443 \u043d\u0435 \u0441\u0442\u0432\u043e\u0440\u0435\u043d\u043e. \u0412\u043b\u0430\u0441\u043d\u0438\u043a \u043f\u0456\u0434\u043f\u0440\u0438\u0454\u043c\u0441\u0442\u0432\u0430 \u043d\u0435 \u043c\u043e\u0436\u0435 \u0440\u0435\u0454\u0441\u0442\u0440\u0443\u0432\u0430\u0442\u0438 \u043f\u043e\u043a\u0443\u043f\u043a\u0443 \u0443 \u0432\u043b\u0430\u0441\u043d\u043e\u043c\u0443 \u043f\u0456\u0434\u043f\u0440\u0438\u0454\u043c\u0441\u0442\u0432\u0456. \u041f\u043e\u043a\u0443\u043f\u043a\u0443 \u043c\u0430\u0454 \u0437\u0430\u0440\u0435\u0454\u0441\u0442\u0440\u0443\u0432\u0430\u0442\u0438 \u0440\u0435\u0430\u043b\u044c\u043d\u0438\u0439 \u043f\u043e\u043a\u0443\u043f\u0435\u0446\u044c \u0437\u0456 \u0441\u0432\u043e\u0433\u043e \u0430\u043a\u0430\u0443\u043d\u0442\u0430.",
    missingThreshold: "\u0417\u0430\u044f\u0432\u043a\u0443 \u043d\u0435 \u0441\u0442\u0432\u043e\u0440\u0435\u043d\u043e. \u0414\u043b\u044f \u0446\u044c\u043e\u0433\u043e \u043f\u0456\u0434\u043f\u0440\u0438\u0454\u043c\u0441\u0442\u0432\u0430 \u0449\u0435 \u043d\u0435 \u0437\u0430\u0434\u0430\u043d\u043e \u043c\u0456\u043d\u0456\u043c\u0430\u043b\u044c\u043d\u0438\u0439 \u043f\u043e\u0440\u0456\u0433 \u043d\u0430\u0440\u0430\u0445\u0443\u0432\u0430\u043d\u043d\u044f POINTS. \u0412\u043a\u0430\u0436\u0456\u0442\u044c \u043a\u0440\u0430\u0457\u043d\u0443 \u0430\u0431\u043e \u0432\u0430\u043b\u044e\u0442\u0443 \u0432 \u043d\u0430\u043b\u0430\u0448\u0442\u0443\u0432\u0430\u043d\u043d\u044f\u0445 \u043f\u0456\u0434\u043f\u0440\u0438\u0454\u043c\u0441\u0442\u0432\u0430.",
    minimumGeneric: "\u0417\u0430\u044f\u0432\u043a\u0443 \u043d\u0435 \u0441\u0442\u0432\u043e\u0440\u0435\u043d\u043e. \u0421\u0443\u043c\u0430 \u043f\u043e\u043a\u0443\u043f\u043a\u0438 \u0437\u0430\u043c\u0430\u043b\u0430 \u0434\u043b\u044f \u043d\u0430\u0440\u0430\u0445\u0443\u0432\u0430\u043d\u043d\u044f POINTS.",
    minimumWithAmount: "\u0417\u0430\u044f\u0432\u043a\u0443 \u043d\u0435 \u0441\u0442\u0432\u043e\u0440\u0435\u043d\u043e. \u0429\u043e\u0431 \u043d\u0430\u0440\u0430\u0445\u0443\u0432\u0430\u0442\u0438 10 POINTS, \u0441\u0443\u043c\u0430 \u043f\u043e\u043a\u0443\u043f\u043a\u0438 \u043c\u0430\u0454 \u0431\u0443\u0442\u0438 \u0431\u0456\u043b\u044c\u0448\u043e\u044e \u0437\u0430 {amount} {currency}.",
  },
  ru: {
    unknown: "\u0417\u0430\u044f\u0432\u043a\u0430 \u043d\u0435 \u0441\u043e\u0437\u0434\u0430\u043d\u0430.",
    ownerSelf: "\u0417\u0430\u044f\u0432\u043a\u0430 \u043d\u0435 \u0441\u043e\u0437\u0434\u0430\u043d\u0430. \u0412\u043b\u0430\u0434\u0435\u043b\u0435\u0446 \u043f\u0440\u0435\u0434\u043f\u0440\u0438\u044f\u0442\u0438\u044f \u043d\u0435 \u043c\u043e\u0436\u0435\u0442 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043f\u043e\u043a\u0443\u043f\u043a\u0443 \u0443 \u0441\u0432\u043e\u0435\u0433\u043e \u043f\u0440\u0435\u0434\u043f\u0440\u0438\u044f\u0442\u0438\u044f. \u041f\u043e\u043a\u0443\u043f\u043a\u0443 \u0434\u043e\u043b\u0436\u0435\u043d \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0440\u0435\u0430\u043b\u044c\u043d\u044b\u0439 \u043f\u043e\u043a\u0443\u043f\u0430\u0442\u0435\u043b\u044c \u0441\u043e \u0441\u0432\u043e\u0435\u0433\u043e \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u0430.",
    missingThreshold: "\u0417\u0430\u044f\u0432\u043a\u0430 \u043d\u0435 \u0441\u043e\u0437\u0434\u0430\u043d\u0430. \u0414\u043b\u044f \u044d\u0442\u043e\u0433\u043e \u043f\u0440\u0435\u0434\u043f\u0440\u0438\u044f\u0442\u0438\u044f \u043f\u043e\u043a\u0430 \u043d\u0435 \u0437\u0430\u0434\u0430\u043d \u043c\u0438\u043d\u0438\u043c\u0430\u043b\u044c\u043d\u044b\u0439 \u043f\u043e\u0440\u043e\u0433 \u043d\u0430\u0447\u0438\u0441\u043b\u0435\u043d\u0438\u044f POINTS. \u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043d\u0443 \u0438\u043b\u0438 \u0432\u0430\u043b\u044e\u0442\u0443 \u0432 \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0430\u0445 \u043f\u0440\u0435\u0434\u043f\u0440\u0438\u044f\u0442\u0438\u044f.",
    minimumGeneric: "\u0417\u0430\u044f\u0432\u043a\u0430 \u043d\u0435 \u0441\u043e\u0437\u0434\u0430\u043d\u0430. \u0421\u0443\u043c\u043c\u0430 \u043f\u043e\u043a\u0443\u043f\u043a\u0438 \u0441\u043b\u0438\u0448\u043a\u043e\u043c \u043c\u0430\u043b\u0430 \u0434\u043b\u044f \u043d\u0430\u0447\u0438\u0441\u043b\u0435\u043d\u0438\u044f POINTS.",
    minimumWithAmount: "\u0417\u0430\u044f\u0432\u043a\u0430 \u043d\u0435 \u0441\u043e\u0437\u0434\u0430\u043d\u0430. \u0414\u043b\u044f \u043d\u0430\u0447\u0438\u0441\u043b\u0435\u043d\u0438\u044f 10 POINTS \u0441\u0443\u043c\u043c\u0430 \u043f\u043e\u043a\u0443\u043f\u043a\u0438 \u0434\u043e\u043b\u0436\u043d\u0430 \u0431\u044b\u0442\u044c \u0431\u043e\u043b\u044c\u0448\u0435 {amount} {currency}.",
  },
  es: {
    unknown: "No se pudo crear la solicitud.",
    ownerSelf: "Solicitud no creada. El propietario de la empresa no puede registrar una compra en su propia empresa. El comprador real debe enviar la solicitud desde su propia cuenta.",
    missingThreshold: "Solicitud no creada. Esta empresa todavia no tiene un umbral minimo para POINTS. Define el pais o la moneda en la configuracion de la empresa.",
    minimumGeneric: "Solicitud no creada. El importe de la compra es demasiado bajo para POINTS.",
    minimumWithAmount: "Solicitud no creada. Para conceder 10 POINTS, el importe de la compra debe ser superior a {amount} {currency}.",
  },
  de: {
    unknown: "Die Anfrage konnte nicht erstellt werden.",
    ownerSelf: "Anfrage nicht erstellt. Der Unternehmensinhaber kann keinen Kauf im eigenen Unternehmen registrieren. Der echte Kaeufer muss die Anfrage von seinem eigenen Konto senden.",
    missingThreshold: "Anfrage nicht erstellt. Fuer dieses Unternehmen ist noch kein Mindestbetrag fuer POINTS festgelegt. Land oder Waehrung in den Unternehmenseinstellungen setzen.",
    minimumGeneric: "Anfrage nicht erstellt. Der Kaufbetrag ist zu niedrig fuer POINTS.",
    minimumWithAmount: "Anfrage nicht erstellt. Fuer 10 POINTS muss der Kaufbetrag groesser als {amount} {currency} sein.",
  },
  cs: {
    unknown: "Zadost se nepodarilo vytvorit.",
    ownerSelf: "Zadost nebyla vytvorena. Vlastnik podniku nemuze registrovat nakup ve vlastnim podniku. Skutecny kupujici musi zadost odeslat ze sveho uctu.",
    missingThreshold: "Zadost nebyla vytvorena. Pro tento podnik jeste neni nastaven minimalni limit pro POINTS. Nastavte zemi nebo menu v nastaveni podniku.",
    minimumGeneric: "Zadost nebyla vytvorena. Castka nakupu je prilis nizka pro pripis POINTS.",
    minimumWithAmount: "Zadost nebyla vytvorena. Pro pripis 10 POINTS musi byt castka nakupu vyssi nez {amount} {currency}.",
  },
} as const;

function getPurchaseRequestErrorLocale(
  locale?: string | null,
): keyof typeof PURCHASE_REQUEST_ERROR_MESSAGES {
  const normalized = (locale ?? "").trim().toLowerCase();

  if (
    normalized === "pl" ||
    normalized === "uk" ||
    normalized === "ru" ||
    normalized === "es" ||
    normalized === "de" ||
    normalized === "cs"
  ) {
    return normalized;
  }

  return "en";
}

function containsCyrillic(value: string) {
  return /[\u0400-\u04FF]/.test(value);
}

function localizePurchaseRequestError(
  error: string | null | undefined,
  locale?: string | null,
) {
  const raw = (error ?? "").trim();
  const messages =
    PURCHASE_REQUEST_ERROR_MESSAGES[getPurchaseRequestErrorLocale(locale)];

  if (!raw) {
    return messages.unknown;
  }

  const normalized = raw.toLowerCase();

  if (
    normalized.includes("\u0432\u043b\u0430\u0434\u0435\u043b\u0435\u0446 \u043f\u0440\u0435\u0434\u043f\u0440\u0438\u044f\u0442\u0438\u044f") ||
    normalized.includes("\u0441\u0432\u043e\u0435\u0433\u043e \u0436\u0435 \u043f\u0440\u0435\u0434\u043f\u0440\u0438\u044f\u0442\u0438\u044f") ||
    normalized.includes("\u0432\u043b\u0430\u0441\u043d\u0438\u043a \u043f\u0456\u0434\u043f\u0440\u0438\u0454\u043c\u0441\u0442\u0432\u0430")
  ) {
    return messages.ownerSelf;
  }

  if (
    normalized.includes("\u043c\u0438\u043d\u0438\u043c\u0430\u043b\u044c\u043d\u044b\u0439 \u043f\u043e\u0440\u043e\u0433 \u043d\u0430\u0447\u0438\u0441\u043b\u0435\u043d\u0438\u044f points") ||
    normalized.includes("\u043c\u0456\u043d\u0456\u043c\u0430\u043b\u044c\u043d\u0438\u0439 \u043f\u043e\u0440\u0456\u0433 \u043d\u0430\u0440\u0430\u0445\u0443\u0432\u0430\u043d\u043d\u044f points")
  ) {
    return messages.missingThreshold;
  }

  if (
    normalized.includes("\u0434\u043b\u044f \u043d\u0430\u0447\u0438\u0441\u043b\u0435\u043d\u0438\u044f 10 points") ||
    normalized.includes("\u0449\u043e\u0431 \u043d\u0430\u0440\u0430\u0445\u0443\u0432\u0430\u0442\u0438 10 points")
  ) {
    const thresholdMatch = raw.match(/([0-9]+(?:[.,][0-9]+)?)\s+([A-Z]{3})/);

    if (thresholdMatch) {
      return messages.minimumWithAmount
        .replace("{amount}", thresholdMatch[1])
        .replace("{currency}", thresholdMatch[2]);
    }

    return messages.minimumGeneric;
  }

  if (getPurchaseRequestErrorLocale(locale) !== "ru" && containsCyrillic(raw)) {
    return messages.unknown;
  }

  return raw;
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

      setPurchaseSubmitError(
        isAuthError
          ? localCopy.authHint
          : localizePurchaseRequestError(message, normalizedLocale),
      );
    } finally {
      setIsSubmittingPurchase(false);
    }
  }

  return (
    <section
      id="register-purchase"
      className={`relative z-20 flex h-full min-h-[390px] flex-col gap-3 overflow-visible rounded-2xl border border-[#bbf7d0] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.08)] ${className ?? ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
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
          <div className="relative z-30 flex items-start gap-2 rounded-xl border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-[11px] leading-4 text-[#991b1b] shadow-[0_10px_24px_rgba(153,27,27,0.08)]">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{purchaseSubmitError}</span>
          </div>
        ) : null}

        {purchaseSubmitMessage ? (
          <div className="relative z-30 flex items-start gap-2 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2 text-[11px] leading-4 text-[#166534] shadow-[0_10px_24px_rgba(22,101,52,0.08)]">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
            <span>{localCopy.requestCreated}</span>
          </div>
        ) : null}
      </form>
    </section>
  );
}

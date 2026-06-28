"use client";

import { useState } from "react";

import {
  getMessage,
  normalizeLocale,
  type LocaleCode,
  type MessageParams,
} from "@/i18n";

type RequestCertificateButtonProps = {
  offerId: string;
  pointsPrice: number | null;
  pointsCurrencyCode: string | null;
  moneyPrice: number | null;
  currency: string | null;
  locale?: LocaleCode | string;
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

type CertificateMessageKey =
  | "certificate.availableAfter"
  | "certificate.emptyResponse"
  | "certificate.moneyPayment"
  | "certificate.points"
  | "certificate.request"
  | "certificate.requesting"
  | "certificate.requested"
  | "certificate.requestError"
  | "certificate.reserved"
  | "certificate.title"
  | "certificate.unknownError";

const certificateMessages: Record<CertificateMessageKey, Record<LocaleCode, string>> = {
  "certificate.request": {
    ru: "Запросить сертификат",
    pl: "Poproś o certyfikat",
    en: "Request certificate",
    es: "Solicitar certificado",
    uk: "Запросити сертифікат",
    de: "Zertifikat anfordern",
    cs: "Vyžádat certifikát",
  },
  "certificate.requesting": {
    ru: "Запрашиваю...",
    pl: "Wysyłam prośbę...",
    en: "Requesting...",
    es: "Solicitando...",
    uk: "Запитую...",
    de: "Wird angefordert...",
    cs: "Odesílám žádost...",
  },
  "certificate.title": {
    ru: "Запросить сертификат. POINTS: {points}. Оплата деньгами: {money}.",
    pl: "Poproś o certyfikat. POINTS: {points}. Płatność pieniędzmi: {money}.",
    en: "Request certificate. Points: {points}. Money payment: {money}.",
    es: "Solicitar certificado. POINTS: {points}. Pago con dinero: {money}.",
    uk: "Запросити сертифікат. POINTS: {points}. Оплата грошима: {money}.",
    de: "Zertifikat anfordern. POINTS: {points}. Geldzahlung: {money}.",
    cs: "Vyžádat certifikát. POINTS: {points}. Platba penězi: {money}.",
  },
  "certificate.requested": {
    ru: "Сертификат запрошен.",
    pl: "Certyfikat został zamówiony.",
    en: "Certificate requested.",
    es: "Certificado solicitado.",
    uk: "Сертифікат запитано.",
    de: "Zertifikat angefordert.",
    cs: "Certifikát byl vyžádán.",
  },
  "certificate.reserved": {
    ru: "Зарезервировано",
    pl: "Zarezerwowano",
    en: "Reserved",
    es: "Reservado",
    uk: "Зарезервовано",
    de: "Reserviert",
    cs: "Rezervováno",
  },
  "certificate.availableAfter": {
    ru: "Доступно после",
    pl: "Dostępne po",
    en: "Available after",
    es: "Disponible después",
    uk: "Доступно після",
    de: "Verfügbar danach",
    cs: "Dostupné po",
  },
  "certificate.requestError": {
    ru: "Не удалось запросить сертификат",
    pl: "Nie można poprosić o certyfikat",
    en: "Cannot request certificate",
    es: "No se puede solicitar el certificado",
    uk: "Не вдалося запросити сертифікат",
    de: "Zertifikat kann nicht angefordert werden",
    cs: "Certifikát nelze vyžádat",
  },
  "certificate.emptyResponse": {
    ru: "Запрос сертификата создан, но ответ пустой",
    pl: "Prośba o certyfikat została utworzona, ale odpowiedź jest pusta",
    en: "Certificate request was created, but response is empty",
    es: "La solicitud de certificado se creó, pero la respuesta está vacía",
    uk: "Запит сертифіката створено, але відповідь порожня",
    de: "Die Zertifikatsanforderung wurde erstellt, aber die Antwort ist leer",
    cs: "Žádost o certifikát byla vytvořena, ale odpověď je prázdná",
  },
  "certificate.unknownError": {
    ru: "Неизвестная ошибка сертификата",
    pl: "Nieznany błąd certyfikatu",
    en: "Unknown certificate error",
    es: "Error desconocido del certificado",
    uk: "Невідома помилка сертифіката",
    de: "Unbekannter Zertifikatsfehler",
    cs: "Neznámá chyba certifikátu",
  },
  "certificate.points": {
    ru: "POINTS",
    pl: "POINTS",
    en: "Points",
    es: "POINTS",
    uk: "POINTS",
    de: "POINTS",
    cs: "POINTS",
  },
  "certificate.moneyPayment": {
    ru: "Оплата деньгами",
    pl: "Płatność pieniędzmi",
    en: "Money payment",
    es: "Pago con dinero",
    uk: "Оплата грошима",
    de: "Geldzahlung",
    cs: "Platba penězi",
  },
};

function tCertificate(
  key: CertificateMessageKey,
  locale: LocaleCode,
  params?: MessageParams,
) {
  return getMessage(certificateMessages, key, locale, params);
}

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
  locale: rawLocale,
}: RequestCertificateButtonProps) {
  const locale = normalizeLocale(rawLocale);
  const t = (key: CertificateMessageKey, params?: MessageParams) =>
    tCertificate(key, locale, params);

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
        throw new Error(json.error ?? t("certificate.requestError"));
      }

      const certificateRequest = json.certificateRequest;

      if (!certificateRequest) {
        throw new Error(t("certificate.emptyResponse"));
      }

      setSuccessMessage(
        `${t("certificate.requested")} ${t("certificate.reserved")}: ${formatMoney(
          certificateRequest.points_reserved,
          pointsCurrencyCode ?? "POINT",
        )}. ${t("certificate.availableAfter")}: ${formatMoney(
          certificateRequest.available_balance_after,
          pointsCurrencyCode ?? "POINT",
        )}.`,
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("certificate.unknownError"));
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
        title={t("certificate.title", {
          points: formatMoney(pointsPrice ?? 0, pointsCurrencyCode ?? "POINT"),
          money: formatMoney(moneyPrice ?? 0, currency),
        })}
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
        {isSubmitting ? t("certificate.requesting") : t("certificate.request")}
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

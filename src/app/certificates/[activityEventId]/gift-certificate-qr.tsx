"use client";

import { QRCodeSVG } from "qrcode.react";
import { useEffect, useMemo, useState } from "react";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type Copy = {
  readonly title: string;
  readonly instruction: string;
  readonly create: string;
  readonly creating: string;
  readonly validFor: string;
  readonly seconds: string;
  readonly expired: string;
  readonly createNew: string;
  readonly checkedIn: string;
  readonly checking: string;
  readonly genericError: string;
  readonly notYetValid: string;
  readonly validityEnded: string;
  readonly wrongRecipient: string;
};

const COPY: Record<LocaleCode, Copy> = {
  en: {
    title: "Live QR for check-in",
    instruction:
      "Create this QR when you arrive. It identifies you and the certificate and works for only 60 seconds. Scanning registers arrival, not completion.",
    create: "Create live QR",
    creating: "Creating…",
    validFor: "QR is valid for",
    seconds: "seconds",
    expired: "This QR has expired.",
    createNew: "Create a new QR",
    checkedIn: "Your arrival has already been registered.",
    checking: "Checking fulfillment status…",
    genericError: "The live QR could not be created.",
    notYetValid: "The certificate validity period has not started.",
    validityEnded: "The certificate validity period has ended.",
    wrongRecipient: "Open the certificate under the profile that ordered it.",
  },
  pl: {
    title: "Żywy QR do rejestracji przybycia",
    instruction:
      "Utwórz QR po przybyciu. Identyfikuje Ciebie i bon i działa tylko 60 sekund. Skanowanie rejestruje przybycie, nie zakończenie.",
    create: "Utwórz żywy QR",
    creating: "Tworzenie…",
    validFor: "QR jest ważny przez",
    seconds: "sekund",
    expired: "Ten QR wygasł.",
    createNew: "Utwórz nowy QR",
    checkedIn: "Twoje przybycie zostało już zarejestrowane.",
    checking: "Sprawdzanie stanu realizacji…",
    genericError: "Nie udało się utworzyć żywego QR.",
    notYetValid: "Okres ważności bonu jeszcze się nie rozpoczął.",
    validityEnded: "Okres ważności bonu już się zakończył.",
    wrongRecipient: "Otwórz bon w profilu, który go zamówił.",
  },
  ru: {
    title: "Живой QR для регистрации прихода",
    instruction:
      "Создайте QR, когда придёте к предоставляющему. Он идентифицирует вас и сертификат и действует только 60 секунд. Сканирование регистрирует приход, но не подтверждает завершение услуги.",
    create: "Создать живой QR",
    creating: "Создание…",
    validFor: "QR действует ещё",
    seconds: "сек.",
    expired: "Срок действия этого QR закончился.",
    createNew: "Создать новый QR",
    checkedIn: "Ваш приход уже зарегистрирован.",
    checking: "Проверка состояния исполнения…",
    genericError: "Не удалось создать живой QR.",
    notYetValid: "Срок действия сертификата ещё не начался.",
    validityEnded: "Срок действия сертификата закончился.",
    wrongRecipient: "Откройте сертификат под профилем, который его заказал.",
  },
  uk: {
    title: "Живий QR для реєстрації прибуття",
    instruction:
      "Створіть QR після прибуття. Він ідентифікує вас і сертифікат та діє лише 60 секунд. Сканування реєструє прибуття, а не завершення.",
    create: "Створити живий QR",
    creating: "Створення…",
    validFor: "QR діє ще",
    seconds: "с",
    expired: "Строк дії цього QR завершився.",
    createNew: "Створити новий QR",
    checkedIn: "Ваше прибуття вже зареєстровано.",
    checking: "Перевірка стану виконання…",
    genericError: "Не вдалося створити живий QR.",
    notYetValid: "Строк дії сертифіката ще не почався.",
    validityEnded: "Строк дії сертифіката завершився.",
    wrongRecipient: "Відкрийте сертифікат у профілі, який його замовив.",
  },
  de: {
    title: "Live-QR für die Ankunft",
    instruction:
      "Erstellen Sie den QR bei Ihrer Ankunft. Er identifiziert Sie und den Gutschein und gilt nur 60 Sekunden. Der Scan registriert die Ankunft, nicht den Abschluss.",
    create: "Live-QR erstellen",
    creating: "Wird erstellt…",
    validFor: "QR gültig für",
    seconds: "Sek.",
    expired: "Dieser QR ist abgelaufen.",
    createNew: "Neuen QR erstellen",
    checkedIn: "Ihre Ankunft wurde bereits registriert.",
    checking: "Erfüllungsstatus wird geprüft…",
    genericError: "Der Live-QR konnte nicht erstellt werden.",
    notYetValid: "Die Gültigkeit hat noch nicht begonnen.",
    validityEnded: "Die Gültigkeit ist abgelaufen.",
    wrongRecipient: "Öffnen Sie den Gutschein mit dem bestellenden Profil.",
  },
  es: {
    title: "QR activo para registrar la llegada",
    instruction:
      "Crea el QR al llegar. Te identifica junto con el certificado y solo es válido durante 60 segundos. El escaneo registra la llegada, no la finalización.",
    create: "Crear QR activo",
    creating: "Creando…",
    validFor: "QR válido durante",
    seconds: "s",
    expired: "Este QR ha caducado.",
    createNew: "Crear un QR nuevo",
    checkedIn: "Tu llegada ya ha sido registrada.",
    checking: "Comprobando el estado…",
    genericError: "No se pudo crear el QR activo.",
    notYetValid: "El periodo de validez aún no ha comenzado.",
    validityEnded: "El periodo de validez ha terminado.",
    wrongRecipient: "Abre el certificado con el perfil que lo pidió.",
  },
  cs: {
    title: "Živý QR pro registraci příchodu",
    instruction:
      "Vytvořte QR při příchodu. Identifikuje vás i certifikát a platí pouze 60 sekund. Sken zaznamená příchod, ne dokončení.",
    create: "Vytvořit živý QR",
    creating: "Vytváření…",
    validFor: "QR platí ještě",
    seconds: "s",
    expired: "Platnost tohoto QR skončila.",
    createNew: "Vytvořit nový QR",
    checkedIn: "Váš příchod již byl zaregistrován.",
    checking: "Kontrola stavu plnění…",
    genericError: "Živý QR se nepodařilo vytvořit.",
    notYetValid: "Platnost certifikátu ještě nezačala.",
    validityEnded: "Platnost certifikátu skončila.",
    wrongRecipient: "Otevřete certifikát v profilu, který jej objednal.",
  },
};

type StatusResponse = {
  readonly ok?: boolean;
  readonly checkedIn?: boolean;
  readonly error?: string;
  readonly errorCode?: string;
};

type IssueResponse = StatusResponse & {
  readonly qrPayload?: string;
  readonly expiresAt?: string;
  readonly ttlSeconds?: number;
};

function normalizeLocale(value: string): LocaleCode {
  return value === "pl" || value === "ru" || value === "uk" ||
    value === "de" || value === "es" || value === "cs"
    ? value
    : "en";
}

function resolveError(payload: StatusResponse, copy: Copy): string {
  const code = payload.errorCode ?? "";

  if (code.includes("NOT_YET_VALID")) return copy.notYetValid;
  if (code.includes("VALIDITY_ENDED")) return copy.validityEnded;
  if (
    code.includes("RECIPIENT_NOT_AUTHORIZED") ||
    code.includes("CONTEXT_NOT_AVAILABLE")
  ) return copy.wrongRecipient;
  if (code.includes("ALREADY_CHECKED_IN")) return copy.checkedIn;

  return payload.error || copy.genericError;
}

export function GiftCertificateQr({
  activityEventId,
  publicCode,
  locale: rawLocale,
}: {
  readonly activityEventId: string;
  readonly publicCode: string;
  readonly locale: string;
}) {
  const locale = normalizeLocale(rawLocale);
  const copy = COPY[locale];
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [creating, setCreating] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [qrPayload, setQrPayload] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        const response = await fetch(
          `/api/gift-certificates/${activityEventId}/fulfillment-qr`,
          { method: "GET", cache: "no-store" },
        );
        const payload = (await response.json()) as StatusResponse;

        if (!cancelled) {
          if (response.ok && payload.ok) {
            setCheckedIn(payload.checkedIn === true);
          } else {
            setIsError(true);
            setMessage(resolveError(payload, copy));
          }
        }
      } catch {
        if (!cancelled) {
          setIsError(true);
          setMessage(copy.genericError);
        }
      } finally {
        if (!cancelled) setLoadingStatus(false);
      }
    }

    void loadStatus();
    return () => {
      cancelled = true;
    };
  }, [activityEventId, copy]);

  useEffect(() => {
    if (!expiresAt) return;

    function updateCountdown() {
      const milliseconds = new Date(expiresAt).getTime() - Date.now();
      setSecondsLeft(Math.max(0, Math.ceil(milliseconds / 1000)));
    }

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 250);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  const live = Boolean(qrPayload && secondsLeft > 0);
  const buttonLabel = useMemo(() => {
    if (creating) return copy.creating;
    if (qrPayload) return copy.createNew;
    return copy.create;
  }, [copy, creating, qrPayload]);

  async function createQr() {
    if (creating) return;

    setCreating(true);
    setMessage("");
    setIsError(false);

    try {
      const response = await fetch(
        `/api/gift-certificates/${activityEventId}/fulfillment-qr`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ locale }),
        },
      );
      const payload = (await response.json()) as IssueResponse;

      if (!response.ok || !payload.ok) {
        if (payload.errorCode?.includes("ALREADY_CHECKED_IN")) {
          setCheckedIn(true);
        } else {
          setIsError(true);
          setMessage(resolveError(payload, copy));
        }
        return;
      }

      if (!payload.qrPayload || !payload.expiresAt) {
        setIsError(true);
        setMessage(copy.genericError);
        return;
      }

      setQrPayload(payload.qrPayload);
      setExpiresAt(payload.expiresAt);
      setSecondsLeft(payload.ttlSeconds ?? 60);
    } catch {
      setIsError(true);
      setMessage(copy.genericError);
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="rounded-[24px] border border-[#c7d2fe] bg-white p-5 shadow-sm">
      <h2 className="text-[16px] font-bold text-[#1e3a8a]">
        {copy.title}
      </h2>
      <p className="mt-3 max-w-3xl text-[13px] leading-6 text-[#4a4f6a]">
        {copy.instruction}
      </p>

      {loadingStatus ? (
        <p className="mt-4 text-[13px] font-semibold text-[#6574a6]">
          {copy.checking}
        </p>
      ) : null}

      {checkedIn ? (
        <p className="mt-4 rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] p-4 text-[14px] font-bold text-[#166534]">
          {copy.checkedIn}
        </p>
      ) : null}

      {!loadingStatus && !checkedIn ? (
        <>
          {qrPayload ? (
            <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <div className={`rounded-2xl border border-[#dbe4ff] bg-white p-3 ${live ? "" : "opacity-35"}`}>
                <QRCodeSVG
                  value={qrPayload}
                  size={220}
                  level="M"
                  includeMargin
                  title={copy.title}
                />
              </div>
              <div className="max-w-md">
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                  {publicCode}
                </div>
                <p className={`mt-3 text-[14px] font-bold ${live ? "text-[#166534]" : "text-[#b91c1c]"}`}>
                  {live
                    ? `${copy.validFor} ${secondsLeft} ${copy.seconds}`
                    : copy.expired}
                </p>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={createQr}
            disabled={creating}
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#3b6ef8] px-5 py-3 text-[14px] font-bold text-white shadow-sm transition hover:bg-[#315ed6] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {buttonLabel}
          </button>
        </>
      ) : null}

      {message ? (
        <p className={`mt-4 text-[13px] font-semibold ${isError ? "text-[#b91c1c]" : "text-[#166534]"}`}>
          {message}
        </p>
      ) : null}
    </section>
  );
}

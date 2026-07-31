"use client";

import {
  Check,
  Copy,
  ExternalLink,
  Mail,
  MessageCircle,
  Share2,
  Smartphone,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { type LocaleCode } from "@/i18n";

import {
  formatCurrencyText,
  formatLocalizedPoints,
} from "./certificate-value-format";

type ShareCopy = {
  readonly share: string;
  readonly shareViaApps: string;
  readonly copyLink: string;
  readonly copied: string;
  readonly whatsapp: string;
  readonly telegram: string;
  readonly facebook: string;
  readonly linkedin: string;
  readonly email: string;
  readonly sms: string;
  readonly close: string;
  readonly surcharge: string;
  readonly dialogTitle: string;
  readonly dialogHint: string;
};

const COPY: Record<LocaleCode, ShareCopy> = {
  en: {
    share: "Share",
    shareViaApps: "Apps and contacts",
    copyLink: "Copy link",
    copied: "Copied",
    whatsapp: "WhatsApp",
    telegram: "Telegram",
    facebook: "Facebook",
    linkedin: "LinkedIn",
    email: "Email",
    sms: "Message",
    close: "Close",
    surcharge: "surcharge",
    dialogTitle: "Share this offer",
    dialogHint:
      "Choose the system share menu, copy the link, or open a selected service.",
  },
  pl: {
    share: "Udostępnij",
    shareViaApps: "Aplikacje i kontakty",
    copyLink: "Kopiuj link",
    copied: "Skopiowano",
    whatsapp: "WhatsApp",
    telegram: "Telegram",
    facebook: "Facebook",
    linkedin: "LinkedIn",
    email: "E-mail",
    sms: "Wiadomość",
    close: "Zamknij",
    surcharge: "dopłata",
    dialogTitle: "Udostępnij ofertę",
    dialogHint:
      "Wybierz systemowe menu, skopiuj link albo otwórz wybraną usługę.",
  },
  ru: {
    share: "Поделиться",
    shareViaApps: "Приложения и контакты",
    copyLink: "Скопировать ссылку",
    copied: "Скопировано",
    whatsapp: "WhatsApp",
    telegram: "Telegram",
    facebook: "Facebook",
    linkedin: "LinkedIn",
    email: "Электронная почта",
    sms: "Сообщение",
    close: "Закрыть",
    surcharge: "доплата",
    dialogTitle: "Поделиться предложением",
    dialogHint:
      "Откройте системное меню, скопируйте ссылку или выберите сервис.",
  },
  uk: {
    share: "Поділитися",
    shareViaApps: "Застосунки й контакти",
    copyLink: "Скопіювати посилання",
    copied: "Скопійовано",
    whatsapp: "WhatsApp",
    telegram: "Telegram",
    facebook: "Facebook",
    linkedin: "LinkedIn",
    email: "Електронна пошта",
    sms: "Повідомлення",
    close: "Закрити",
    surcharge: "доплата",
    dialogTitle: "Поділитися пропозицією",
    dialogHint:
      "Відкрийте системне меню, скопіюйте посилання або виберіть сервіс.",
  },
  de: {
    share: "Teilen",
    shareViaApps: "Apps und Kontakte",
    copyLink: "Link kopieren",
    copied: "Kopiert",
    whatsapp: "WhatsApp",
    telegram: "Telegram",
    facebook: "Facebook",
    linkedin: "LinkedIn",
    email: "E-Mail",
    sms: "Nachricht",
    close: "Schließen",
    surcharge: "Zuzahlung",
    dialogTitle: "Angebot teilen",
    dialogHint:
      "Systemmenü öffnen, Link kopieren oder einen Dienst auswählen.",
  },
  es: {
    share: "Compartir",
    shareViaApps: "Aplicaciones y contactos",
    copyLink: "Copiar enlace",
    copied: "Copiado",
    whatsapp: "WhatsApp",
    telegram: "Telegram",
    facebook: "Facebook",
    linkedin: "LinkedIn",
    email: "Correo",
    sms: "Mensaje",
    close: "Cerrar",
    surcharge: "pago adicional",
    dialogTitle: "Compartir oferta",
    dialogHint:
      "Abre el menú del sistema, copia el enlace o elige un servicio.",
  },
  cs: {
    share: "Sdílet",
    shareViaApps: "Aplikace a kontakty",
    copyLink: "Kopírovat odkaz",
    copied: "Zkopírováno",
    whatsapp: "WhatsApp",
    telegram: "Telegram",
    facebook: "Facebook",
    linkedin: "LinkedIn",
    email: "E-mail",
    sms: "Zpráva",
    close: "Zavřít",
    surcharge: "doplatek",
    dialogTitle: "Sdílet nabídku",
    dialogHint:
      "Otevřete systémovou nabídku, zkopírujte odkaz nebo vyberte službu.",
  },
};

function openExternal(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer,width=760,height=720");
}

function copyWithFallback(value: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  return copied;
}

export function CertificateShareButton({
  locale,
  title,
  description,
  href,
  providerName,
  pointsPrice,
  moneyRemainder,
  currency,
}: {
  readonly locale: LocaleCode;
  readonly title: string;
  readonly description: string | null;
  readonly href: string;
  readonly providerName: string;
  readonly pointsPrice: number;
  readonly moneyRemainder: number;
  readonly currency: string;
}) {
  const copy = COPY[locale];
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [systemShareAvailable, setSystemShareAvailable] = useState(false);

  const absoluteUrl = useMemo(() => {
    if (typeof window === "undefined") return href;
    return new URL(href, window.location.origin).toString();
  }, [href]);

  const shareText = useMemo(() => {
    const price = formatLocalizedPoints(pointsPrice, locale);
    const payment =
      moneyRemainder > 0
        ? `${price} + ${copy.surcharge} ${formatCurrencyText(
            moneyRemainder,
            currency,
            locale,
          )}`
        : price;

    return [title, providerName, payment, description?.trim()]
      .filter(Boolean)
      .join(" · ");
  }, [
    copy.surcharge,
    currency,
    description,
    locale,
    moneyRemainder,
    pointsPrice,
    providerName,
    title,
  ]);


  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.share) {
      setSystemShareAvailable(false);
      return;
    }

    try {
      const shareData = { title, text: shareText, url: absoluteUrl };
      setSystemShareAvailable(
        typeof navigator.canShare !== "function" || navigator.canShare(shareData),
      );
    } catch {
      setSystemShareAvailable(false);
    }
  }, [absoluteUrl, shareText, title]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function shareViaSystem(): Promise<void> {
    if (!systemShareAvailable || !navigator.share) return;

    try {
      await navigator.share({
        title,
        text: shareText,
        url: absoluteUrl,
      });
      setOpen(false);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
    }
  }

  async function copyLink(): Promise<void> {
    let success = false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(absoluteUrl);
        success = true;
      } else {
        success = copyWithFallback(absoluteUrl);
      }
    } catch {
      success = copyWithFallback(absoluteUrl);
    }

    if (success) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  }

  const encodedUrl = encodeURIComponent(absoluteUrl);
  const encodedText = encodeURIComponent(shareText);
  const encodedTitle = encodeURIComponent(title);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-[#3b6ef8] transition hover:bg-[#eef2ff]"
        aria-haspopup="dialog"
      >
        <Share2 size={12} />
        {copy.share}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/35 p-3 sm:items-center"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={copy.dialogTitle}
            className="w-full max-w-lg rounded-2xl border border-black/10 bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[17px] font-bold text-[#1a1d2e]">
                  {copy.dialogTitle}
                </h2>
                <p className="mt-1 text-[12px] leading-5 text-[#7c8099]">
                  {copy.dialogHint}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-[#7c8099] hover:bg-[#f5f6fb]"
                aria-label={copy.close}
              >
                <X size={17} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {systemShareAvailable ? (
                <button
                  type="button"
                  onClick={() => void shareViaSystem()}
                  className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#3b6ef8] px-3 text-[12px] font-bold text-white sm:col-span-3"
                >
                  <Smartphone size={16} />
                  {copy.shareViaApps}
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => void copyLink()}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#dfe3f1] bg-white px-3 text-[12px] font-bold text-[#4a4f6a] hover:bg-[#f8fafc]"
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? copy.copied : copy.copyLink}
              </button>

              <button
                type="button"
                onClick={() =>
                  openExternal(`https://wa.me/?text=${encodedText}%20${encodedUrl}`)
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#dfe3f1] bg-white px-3 text-[12px] font-bold text-[#4a4f6a] hover:bg-[#f8fafc]"
              >
                <MessageCircle size={15} />
                {copy.whatsapp}
              </button>

              <button
                type="button"
                onClick={() =>
                  openExternal(
                    `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
                  )
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#dfe3f1] bg-white px-3 text-[12px] font-bold text-[#4a4f6a] hover:bg-[#f8fafc]"
              >
                <ExternalLink size={15} />
                {copy.telegram}
              </button>

              <button
                type="button"
                onClick={() =>
                  openExternal(
                    `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
                  )
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#dfe3f1] bg-white px-3 text-[12px] font-bold text-[#4a4f6a] hover:bg-[#f8fafc]"
              >
                <ExternalLink size={15} />
                {copy.facebook}
              </button>

              <button
                type="button"
                onClick={() =>
                  openExternal(
                    `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
                  )
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#dfe3f1] bg-white px-3 text-[12px] font-bold text-[#4a4f6a] hover:bg-[#f8fafc]"
              >
                <ExternalLink size={15} />
                {copy.linkedin}
              </button>

              <a
                href={`mailto:?subject=${encodedTitle}&body=${encodedText}%0A%0A${encodedUrl}`}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#dfe3f1] bg-white px-3 text-[12px] font-bold text-[#4a4f6a] hover:bg-[#f8fafc]"
              >
                <Mail size={15} />
                {copy.email}
              </a>

              <a
                href={`sms:?&body=${encodedText}%20${encodedUrl}`}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#dfe3f1] bg-white px-3 text-[12px] font-bold text-[#4a4f6a] hover:bg-[#f8fafc]"
              >
                <MessageCircle size={15} />
                {copy.sms}
              </a>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

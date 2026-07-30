"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type PublishGiftCertificateButtonProps = {
  activityEventId: string;
  locale: LocaleCode;
};

type PublishResponse = {
  ok?: boolean;
  error?: string;
  errorCode?: string | null;
  lifecycleStatus?: string | null;
  redirectUrl?: string | null;
};

type Copy = {
  button: string;
  pending: string;
  confirmation: string;
  success: string;
  genericError: string;
  expiredError: string;
  limitError: string;
  stateError: string;
  forbiddenError: string;
};

const COPY: Record<LocaleCode, Copy> = {
  en: {
    button: "Publish certificate",
    pending: "Publishing…",
    confirmation:
      "After publication, the certificate will be marked as available. Publication does not debit POINTS, award reputation, assign a recipient, or generate a public code or QR. Publish now?",
    success: "The certificate has been published.",
    genericError: "The certificate could not be published.",
    expiredError: "The certificate validity period has already ended.",
    limitError:
      "This provider already has three available certificates with an overlapping validity period.",
    stateError: "Only a valid draft can be published.",
    forbiddenError:
      "The active profile is not allowed to publish this certificate.",
  },
  pl: {
    button: "Opublikuj bon",
    pending: "Publikowanie…",
    confirmation:
      "Po publikacji bon zostanie oznaczony jako dostępny. Publikacja nie pobiera POINTS, nie przyznaje reputacji, nie przypisuje odbiorcy i nie tworzy kodu publicznego ani QR. Opublikować teraz?",
    success: "Bon został opublikowany.",
    genericError: "Nie udało się opublikować bonu.",
    expiredError: "Okres ważności bonu już się zakończył.",
    limitError:
      "Ten dostawca ma już trzy dostępne bony z nakładającym się okresem ważności.",
    stateError: "Można opublikować tylko prawidłowy szkic.",
    forbiddenError:
      "Aktywny profil nie ma prawa opublikować tego bonu.",
  },
  ru: {
    button: "Опубликовать сертификат",
    pending: "Публикуется…",
    confirmation:
      "После публикации сертификат будет отмечен как доступный. Публикация не списывает POINTS, не начисляет репутацию, не назначает получателя и не создаёт публичный код или QR. Опубликовать сейчас?",
    success: "Сертификат опубликован.",
    genericError: "Не удалось опубликовать сертификат.",
    expiredError: "Срок действия сертификата уже закончился.",
    limitError:
      "У этого предоставляющего уже есть три доступных сертификата с пересекающимся сроком действия.",
    stateError: "Опубликовать можно только корректный черновик.",
    forbiddenError:
      "Активный профиль не имеет права публиковать этот сертификат.",
  },
  uk: {
    button: "Опублікувати сертифікат",
    pending: "Публікується…",
    confirmation:
      "Після публікації сертифікат буде позначено як доступний. Публікація не списує POINTS, не нараховує репутацію, не призначає отримувача й не створює публічний код або QR. Опублікувати зараз?",
    success: "Сертифікат опубліковано.",
    genericError: "Не вдалося опублікувати сертифікат.",
    expiredError: "Строк дії сертифіката вже завершився.",
    limitError:
      "У цього надавача вже є три доступні сертифікати з перехресним строком дії.",
    stateError: "Опублікувати можна лише коректну чернетку.",
    forbiddenError:
      "Активний профіль не має права публікувати цей сертифікат.",
  },
  de: {
    button: "Gutschein veröffentlichen",
    pending: "Wird veröffentlicht…",
    confirmation:
      "Nach der Veröffentlichung wird der Gutschein als verfügbar markiert. Dabei werden keine POINTS abgebucht, keine Reputation gutgeschrieben, kein Empfänger zugewiesen und kein öffentlicher Code oder QR erzeugt. Jetzt veröffentlichen?",
    success: "Der Gutschein wurde veröffentlicht.",
    genericError: "Der Gutschein konnte nicht veröffentlicht werden.",
    expiredError: "Der Gültigkeitszeitraum ist bereits beendet.",
    limitError:
      "Dieser Anbieter hat bereits drei verfügbare Gutscheine mit einem überlappenden Gültigkeitszeitraum.",
    stateError: "Nur ein gültiger Entwurf kann veröffentlicht werden.",
    forbiddenError:
      "Das aktive Profil darf diesen Gutschein nicht veröffentlichen.",
  },
  es: {
    button: "Publicar certificado",
    pending: "Publicando…",
    confirmation:
      "Después de la publicación, el certificado se marcará como disponible. La publicación no descuenta POINTS, no otorga reputación, no asigna destinatario y no genera código público ni QR. ¿Publicar ahora?",
    success: "El certificado ha sido publicado.",
    genericError: "No se pudo publicar el certificado.",
    expiredError: "El período de validez ya ha terminado.",
    limitError:
      "Este proveedor ya tiene tres certificados disponibles con un período de validez superpuesto.",
    stateError: "Solo se puede publicar un borrador válido.",
    forbiddenError:
      "El perfil activo no puede publicar este certificado.",
  },
  cs: {
    button: "Publikovat certifikát",
    pending: "Publikování…",
    confirmation:
      "Po publikování bude certifikát označen jako dostupný. Publikování neodečte POINTS, nepřipíše reputaci, nepřiřadí příjemce a nevytvoří veřejný kód ani QR. Publikovat nyní?",
    success: "Certifikát byl publikován.",
    genericError: "Certifikát se nepodařilo publikovat.",
    expiredError: "Doba platnosti certifikátu již skončila.",
    limitError:
      "Tento poskytovatel již má tři dostupné certifikáty s překrývající se dobou platnosti.",
    stateError: "Publikovat lze pouze platný koncept.",
    forbiddenError:
      "Aktivní profil nemá oprávnění tento certifikát publikovat.",
  },
};

function getErrorMessage(
  copy: Copy,
  errorCode: string | null | undefined,
): string {
  const code = errorCode ?? "";

  if (code.includes("VALIDITY_ALREADY_ENDED")) {
    return copy.expiredError;
  }

  if (code.includes("AVAILABLE_CERTIFICATE_LIMIT_REACHED")) {
    return copy.limitError;
  }

  if (
    code.includes("ONLY_DRAFT_CAN_BE_PUBLISHED") ||
    code.includes("DRAFT_STATE_INVALID") ||
    code.includes("AVAILABLE_STATE_INCONSISTENT")
  ) {
    return copy.stateError;
  }

  if (
    code.includes("OWNER_MISMATCH") ||
    code.includes("OWNER_OR_TEMPLATE_INVALID") ||
    code.includes("PROVIDER_NOT_AVAILABLE") ||
    code.includes("NOT_AUTHENTICATED")
  ) {
    return copy.forbiddenError;
  }

  return copy.genericError;
}

export function PublishGiftCertificateButton({
  activityEventId,
  locale,
}: PublishGiftCertificateButtonProps) {
  const router = useRouter();
  const copy = COPY[locale];
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function publishCertificate() {
    if (!window.confirm(copy.confirmation)) {
      return;
    }

    setPending(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `/api/gift-certificates/${activityEventId}/publish`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            locale,
          }),
        },
      );

      const data = (await response.json()) as PublishResponse;

      if (
        !response.ok ||
        !data.ok ||
        data.lifecycleStatus !== "available"
      ) {
        setErrorMessage(getErrorMessage(copy, data.errorCode));
        return;
      }

      setSuccessMessage(copy.success);
      router.refresh();
    } catch {
      setErrorMessage(copy.genericError);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={() => void publishCertificate()}
        disabled={pending}
        className="inline-flex min-h-11 w-fit items-center justify-center rounded-xl bg-[#166534] px-5 py-3 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#14532d] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? copy.pending : copy.button}
      </button>

      <div aria-live="polite">
        {errorMessage ? (
          <div className="rounded-xl border border-[#ffd5d5] bg-[#fff7f7] px-4 py-3 text-[13px] font-semibold text-[#b42318]">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-xl border border-[#b7e4c7] bg-[#f4fbf6] px-4 py-3 text-[13px] font-semibold text-[#166534]">
            {successMessage}
          </div>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type ConfirmationStatus =
  | "not_started"
  | "pending"
  | "confirmed_by_buyer"
  | "auto_confirmed"
  | "disputed"
  | "partial_problem";

type ApiPayload = {
  readonly ok?: boolean;
  readonly status?: ConfirmationStatus;
  readonly checkedIn?: boolean;
  readonly checkedInAt?: string | null;
  readonly requestedAt?: string | null;
  readonly responseDeadlineAt?: string | null;
  readonly finalizedAt?: string | null;
  readonly actualActivityEventId?: string | null;
  readonly lifecycleStatus?: string | null;
  readonly error?: string;
  readonly errorCode?: string;
};

type Copy = {
  readonly title: string;
  readonly checking: string;
  readonly question: string;
  readonly explanation: string;
  readonly deadline: string;
  readonly yes: string;
  readonly no: string;
  readonly partial: string;
  readonly messageLabel: string;
  readonly messagePlaceholder: string;
  readonly sending: string;
  readonly confirmed: string;
  readonly autoConfirmed: string;
  readonly disputed: string;
  readonly partialProblem: string;
  readonly genericError: string;
};

const COPY: Record<LocaleCode, Copy> = {
  en: {
    title: "Confirm fulfillment",
    checking: "Checking confirmation status…",
    question: "Was the product or service received?",
    explanation:
      "Your arrival was registered. Confirm the result or report a problem. If no response is received within 24 hours after check-in, fulfillment is confirmed automatically.",
    deadline: "Response deadline",
    yes: "Yes, received",
    no: "No, not received",
    partial: "Partly received / problem",
    messageLabel: "Optional comment",
    messagePlaceholder: "Describe the problem briefly.",
    sending: "Saving…",
    confirmed: "You confirmed that fulfillment was completed.",
    autoConfirmed:
      "Fulfillment was confirmed automatically because no response was received within 24 hours.",
    disputed:
      "You reported that fulfillment was not completed. The certificate requires review.",
    partialProblem:
      "You reported partial fulfillment or a problem. The certificate requires review.",
    genericError: "The confirmation could not be saved.",
  },
  pl: {
    title: "Potwierdź realizację",
    checking: "Sprawdzanie stanu potwierdzenia…",
    question: "Czy produkt lub usługa zostały otrzymane?",
    explanation:
      "Twoje przybycie zostało zarejestrowane. Potwierdź rezultat lub zgłoś problem. Jeśli w ciągu 24 godzin od rejestracji nie będzie odpowiedzi, realizacja zostanie potwierdzona automatycznie.",
    deadline: "Termin odpowiedzi",
    yes: "Tak, otrzymano",
    no: "Nie, nie otrzymano",
    partial: "Częściowo / wystąpił problem",
    messageLabel: "Opcjonalny komentarz",
    messagePlaceholder: "Krótko opisz problem.",
    sending: "Zapisywanie…",
    confirmed: "Potwierdzono prawidłową realizację.",
    autoConfirmed:
      "Realizacja została potwierdzona automatycznie z powodu braku odpowiedzi przez 24 godziny.",
    disputed:
      "Zgłoszono brak realizacji. Bon wymaga wyjaśnienia.",
    partialProblem:
      "Zgłoszono częściową realizację lub problem. Bon wymaga wyjaśnienia.",
    genericError: "Nie udało się zapisać potwierdzenia.",
  },
  ru: {
    title: "Подтверждение исполнения",
    checking: "Проверка состояния подтверждения…",
    question: "Товар или услуга были получены?",
    explanation:
      "Ваш приход зарегистрирован. Подтвердите результат или сообщите о проблеме. Если в течение 24 часов после регистрации прихода ответа не будет, исполнение подтвердится автоматически.",
    deadline: "Ответ можно дать до",
    yes: "Да, получено",
    no: "Нет, не получено",
    partial: "Получено частично / есть проблема",
    messageLabel: "Необязательный комментарий",
    messagePlaceholder: "Кратко опишите проблему.",
    sending: "Сохранение…",
    confirmed: "Вы подтвердили, что исполнение завершено.",
    autoConfirmed:
      "Исполнение подтверждено автоматически, потому что в течение 24 часов ответа не было.",
    disputed:
      "Вы сообщили, что исполнение не состоялось. Сертификат требует разбора.",
    partialProblem:
      "Вы сообщили о частичном исполнении или проблеме. Сертификат требует разбора.",
    genericError: "Не удалось сохранить подтверждение.",
  },
  uk: {
    title: "Підтвердження виконання",
    checking: "Перевірка стану підтвердження…",
    question: "Товар або послугу було отримано?",
    explanation:
      "Ваше прибуття зареєстровано. Підтвердьте результат або повідомте про проблему. Якщо протягом 24 годин після реєстрації відповіді не буде, виконання підтвердиться автоматично.",
    deadline: "Відповісти можна до",
    yes: "Так, отримано",
    no: "Ні, не отримано",
    partial: "Отримано частково / є проблема",
    messageLabel: "Необов’язковий коментар",
    messagePlaceholder: "Коротко опишіть проблему.",
    sending: "Збереження…",
    confirmed: "Ви підтвердили завершення виконання.",
    autoConfirmed:
      "Виконання підтверджено автоматично через відсутність відповіді протягом 24 годин.",
    disputed:
      "Ви повідомили, що виконання не відбулося. Сертифікат потребує розгляду.",
    partialProblem:
      "Ви повідомили про часткове виконання або проблему. Сертифікат потребує розгляду.",
    genericError: "Не вдалося зберегти підтвердження.",
  },
  de: {
    title: "Erfüllung bestätigen",
    checking: "Bestätigungsstatus wird geprüft…",
    question: "Wurde das Produkt oder die Dienstleistung erhalten?",
    explanation:
      "Ihre Ankunft wurde registriert. Bestätigen Sie das Ergebnis oder melden Sie ein Problem. Ohne Antwort innerhalb von 24 Stunden nach dem Check-in wird die Erfüllung automatisch bestätigt.",
    deadline: "Antwortfrist",
    yes: "Ja, erhalten",
    no: "Nein, nicht erhalten",
    partial: "Teilweise / Problem",
    messageLabel: "Optionaler Kommentar",
    messagePlaceholder: "Beschreiben Sie das Problem kurz.",
    sending: "Speichern…",
    confirmed: "Sie haben die vollständige Erfüllung bestätigt.",
    autoConfirmed:
      "Die Erfüllung wurde nach 24 Stunden ohne Antwort automatisch bestätigt.",
    disputed:
      "Sie haben gemeldet, dass keine Erfüllung stattgefunden hat. Der Gutschein muss geprüft werden.",
    partialProblem:
      "Sie haben eine teilweise Erfüllung oder ein Problem gemeldet. Der Gutschein muss geprüft werden.",
    genericError: "Die Bestätigung konnte nicht gespeichert werden.",
  },
  es: {
    title: "Confirmar el cumplimiento",
    checking: "Comprobando el estado…",
    question: "¿Se recibió el producto o servicio?",
    explanation:
      "Tu llegada fue registrada. Confirma el resultado o informa de un problema. Si no hay respuesta durante 24 horas después del registro, se confirmará automáticamente.",
    deadline: "Plazo de respuesta",
    yes: "Sí, recibido",
    no: "No, no recibido",
    partial: "Parcial / hay un problema",
    messageLabel: "Comentario opcional",
    messagePlaceholder: "Describe brevemente el problema.",
    sending: "Guardando…",
    confirmed: "Has confirmado que el cumplimiento terminó.",
    autoConfirmed:
      "El cumplimiento se confirmó automáticamente tras 24 horas sin respuesta.",
    disputed:
      "Informaste que no hubo cumplimiento. El certificado requiere revisión.",
    partialProblem:
      "Informaste de cumplimiento parcial o de un problema. El certificado requiere revisión.",
    genericError: "No se pudo guardar la confirmación.",
  },
  cs: {
    title: "Potvrzení plnění",
    checking: "Kontrola stavu potvrzení…",
    question: "Byl produkt nebo služba obdržena?",
    explanation:
      "Váš příchod byl zaregistrován. Potvrďte výsledek nebo nahlaste problém. Bez odpovědi do 24 hodin po registraci se plnění potvrdí automaticky.",
    deadline: "Lhůta pro odpověď",
    yes: "Ano, obdrženo",
    no: "Ne, neobdrženo",
    partial: "Částečně / problém",
    messageLabel: "Volitelný komentář",
    messagePlaceholder: "Stručně popište problém.",
    sending: "Ukládání…",
    confirmed: "Potvrdili jste dokončení plnění.",
    autoConfirmed:
      "Plnění bylo po 24 hodinách bez odpovědi potvrzeno automaticky.",
    disputed:
      "Nahlásili jste, že plnění neproběhlo. Certifikát vyžaduje posouzení.",
    partialProblem:
      "Nahlásili jste částečné plnění nebo problém. Certifikát vyžaduje posouzení.",
    genericError: "Potvrzení se nepodařilo uložit.",
  },
};

function normalizeLocale(value: string): LocaleCode {
  return value === "pl" ||
    value === "ru" ||
    value === "uk" ||
    value === "de" ||
    value === "es" ||
    value === "cs"
    ? value
    : "en";
}

function formatDateTime(
  value: string | null | undefined,
  locale: LocaleCode,
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    locale === "en" ? "en-US" : locale,
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

export function GiftCertificateFulfillmentConfirmation({
  activityEventId,
  locale: rawLocale,
}: {
  readonly activityEventId: string;
  readonly locale: string;
}) {
  const router = useRouter();
  const locale = normalizeLocale(rawLocale);
  const copy = COPY[locale];
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [payload, setPayload] = useState<ApiPayload | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(
          `/api/gift-certificates/${activityEventId}/fulfillment-confirmation`,
          {
            method: "GET",
            cache: "no-store",
          },
        );
        const result = (await response.json()) as ApiPayload;

        if (!cancelled) {
          if (response.ok && result.ok) {
            setPayload(result);
          } else {
            setErrorMessage(result.error || copy.genericError);
          }
        }
      } catch {
        if (!cancelled) {
          setErrorMessage(copy.genericError);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [activityEventId, copy]);

  async function respond(
    responseStatus:
      | "confirmed_by_buyer"
      | "disputed"
      | "partial_problem",
  ) {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/gift-certificates/${activityEventId}/fulfillment-confirmation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            responseStatus,
            buyerMessage: message.trim() || null,
          }),
        },
      );
      const result = (await response.json()) as ApiPayload;

      if (!response.ok || !result.ok) {
        setErrorMessage(result.error || copy.genericError);
        return;
      }

      setPayload(result);
      router.refresh();
    } catch {
      setErrorMessage(copy.genericError);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-[24px] border border-[#dbe3f1] bg-white p-5 shadow-sm">
        <h2 className="text-[16px] font-bold text-[#1e3a8a]">
          {copy.title}
        </h2>
        <p className="mt-3 text-[13px] font-semibold text-[#6574a6]">
          {copy.checking}
        </p>
      </section>
    );
  }

  if (!payload?.checkedIn || payload.status === "not_started") {
    return null;
  }

  const status = payload.status;

  if (
    status === "confirmed_by_buyer" ||
    status === "auto_confirmed" ||
    status === "disputed" ||
    status === "partial_problem"
  ) {
    const text =
      status === "confirmed_by_buyer"
        ? copy.confirmed
        : status === "auto_confirmed"
          ? copy.autoConfirmed
          : status === "disputed"
            ? copy.disputed
            : copy.partialProblem;
    const successful =
      status === "confirmed_by_buyer" ||
      status === "auto_confirmed";

    return (
      <section
        className={`rounded-[24px] border p-5 shadow-sm ${
          successful
            ? "border-[#bbf7d0] bg-[#f0fdf4]"
            : "border-[#fde68a] bg-[#fffbeb]"
        }`}
      >
        <h2
          className={`text-[16px] font-bold ${
            successful ? "text-[#166534]" : "text-[#92400e]"
          }`}
        >
          {copy.title}
        </h2>
        <p
          className={`mt-3 text-[14px] font-semibold leading-6 ${
            successful ? "text-[#166534]" : "text-[#92400e]"
          }`}
        >
          {text}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[24px] border border-[#c7d2fe] bg-white p-5 shadow-sm">
      <h2 className="text-[16px] font-bold text-[#1e3a8a]">
        {copy.title}
      </h2>
      <p className="mt-3 text-[17px] font-black text-[#111827]">
        {copy.question}
      </p>
      <p className="mt-2 max-w-3xl text-[13px] leading-6 text-[#4a4f6a]">
        {copy.explanation}
      </p>

      <div className="mt-4 rounded-2xl bg-[#f6f8fc] p-4 text-[13px] font-semibold text-[#42507a]">
        {copy.deadline}:{" "}
        {formatDateTime(payload.responseDeadlineAt, locale)}
      </div>

      <label className="mt-4 block">
        <span className="text-[12px] font-bold text-[#4a4f6a]">
          {copy.messageLabel}
        </span>
        <textarea
          value={message}
          onChange={(event) =>
            setMessage(event.target.value.slice(0, 2000))
          }
          placeholder={copy.messagePlaceholder}
          rows={3}
          className="mt-2 w-full rounded-2xl border border-[#dbe3f1] bg-white px-4 py-3 text-[14px] text-[#111827] outline-none transition focus:border-[#3b6ef8]"
        />
      </label>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={submitting}
          onClick={() => respond("confirmed_by_buyer")}
          className="min-h-11 rounded-2xl bg-[#16a34a] px-5 py-3 text-[14px] font-bold text-white disabled:opacity-60"
        >
          {submitting ? copy.sending : copy.yes}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => respond("disputed")}
          className="min-h-11 rounded-2xl border border-[#fecaca] bg-[#fef2f2] px-5 py-3 text-[14px] font-bold text-[#b91c1c] disabled:opacity-60"
        >
          {copy.no}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => respond("partial_problem")}
          className="min-h-11 rounded-2xl border border-[#fde68a] bg-[#fffbeb] px-5 py-3 text-[14px] font-bold text-[#92400e] disabled:opacity-60"
        >
          {copy.partial}
        </button>
      </div>

      {errorMessage ? (
        <p className="mt-4 text-[13px] font-semibold text-[#b91c1c]">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}

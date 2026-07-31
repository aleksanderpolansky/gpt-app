"use client";

import { useEffect, useState } from "react";

type Props = {
  readonly qrSessionId: string;
  readonly token: string;
  readonly locale: string;
  readonly expiresAt: string;
  readonly buttonLabel: string;
  readonly processingLabel: string;
  readonly confirmationText: string;
  readonly successText: string;
  readonly genericErrorText: string;
  readonly expiredText: string;
  readonly unauthorizedText: string;
  readonly inactiveText: string;
  readonly alreadyCheckedInText: string;
};

type ResponsePayload = {
  readonly ok?: boolean;
  readonly error?: string;
  readonly errorCode?: string;
};

function resolveError(payload: ResponsePayload, props: Props): string {
  const code = payload.errorCode ?? "";

  if (code.includes("QR_EXPIRED")) return props.expiredText;

  if (
    code.includes("NOT_AUTHORIZED") ||
    code.includes("CONTEXT_NOT_AVAILABLE") ||
    code.includes("TOKEN_INVALID")
  ) return props.unauthorizedText;

  if (
    code.includes("ONLY_ACTIVE") ||
    code.includes("NOT_YET_VALID") ||
    code.includes("VALIDITY_ENDED") ||
    code.includes("QR_REVOKED")
  ) return props.inactiveText;

  if (code.includes("ALREADY_CHECKED_IN")) {
    return props.alreadyCheckedInText;
  }

  return payload.error || props.genericErrorText;
}

export function RegisterGiftCertificateCheckinButton(props: Props) {
  const [processing, setProcessing] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    function updateCountdown() {
      const milliseconds =
        new Date(props.expiresAt).getTime() - Date.now();
      setSecondsLeft(Math.max(0, Math.ceil(milliseconds / 1000)));
    }

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 250);
    return () => window.clearInterval(timer);
  }, [props.expiresAt]);

  async function registerCheckin() {
    if (processing || secondsLeft <= 0) return;
    if (!window.confirm(props.confirmationText)) return;

    setProcessing(true);
    setMessage("");
    setIsError(false);

    try {
      const response = await fetch(
        "/api/gift-certificates/check-in",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            qrSessionId: props.qrSessionId,
            token: props.token,
            locale: props.locale,
          }),
        },
      );
      const payload = (await response.json()) as ResponsePayload;

      if (!response.ok || !payload.ok) {
        setIsError(true);
        setMessage(resolveError(payload, props));
        return;
      }

      setMessage(props.successText);
      window.setTimeout(() => window.location.reload(), 700);
    } catch {
      setIsError(true);
      setMessage(props.genericErrorText);
    } finally {
      setProcessing(false);
    }
  }

  const expired = secondsLeft <= 0;

  return (
    <div>
      <button
        type="button"
        onClick={registerCheckin}
        disabled={processing || expired}
        className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#3b6ef8] px-5 py-3 text-[14px] font-bold text-white shadow-sm transition hover:bg-[#315ed6] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {processing
          ? props.processingLabel
          : expired
            ? props.expiredText
            : `${props.buttonLabel} (${secondsLeft})`}
      </button>

      {message ? (
        <p className={`mt-3 text-[13px] font-semibold ${isError ? "text-[#b91c1c]" : "text-[#166534]"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}

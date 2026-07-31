"use client";

import { useState } from "react";

type RedeemGiftCertificateButtonProps = {
  readonly activityEventId: string;
  readonly publicCode: string;
  readonly qrToken: string;
  readonly locale: string;
  readonly buttonLabel: string;
  readonly submittingLabel: string;
  readonly confirmationText: string;
  readonly successText: string;
  readonly genericErrorText: string;
  readonly invalidQrText: string;
  readonly unauthorizedText: string;
  readonly inactiveText: string;
  readonly notYetValidText: string;
  readonly expiredText: string;
};

type RedeemResponse = {
  readonly ok?: boolean;
  readonly error?: string;
  readonly errorCode?: string;
  readonly redirectUrl?: string;
};

function resolveErrorMessage(
  response: RedeemResponse,
  props: RedeemGiftCertificateButtonProps,
): string {
  const errorCode = response.errorCode ?? "";

  if (errorCode.includes("QR_CREDENTIALS_INVALID")) {
    return props.invalidQrText;
  }

  if (
    errorCode.includes("NOT_AUTHORIZED") ||
    errorCode.includes("CONTEXT_NOT_AVAILABLE")
  ) {
    return props.unauthorizedText;
  }

  if (errorCode.includes("NOT_YET_VALID")) {
    return props.notYetValidText;
  }

  if (errorCode.includes("VALIDITY_ENDED")) {
    return props.expiredText;
  }

  if (
    errorCode.includes("ONLY_ACTIVE") ||
    errorCode.includes("CONCURRENT_STATE_CHANGE")
  ) {
    return props.inactiveText;
  }

  return response.error || props.genericErrorText;
}

export function RedeemGiftCertificateButton(
  props: RedeemGiftCertificateButtonProps,
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function redeem() {
    if (isSubmitting) {
      return;
    }

    if (!window.confirm(props.confirmationText)) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    setIsError(false);

    try {
      const response = await fetch(
        "/api/gift-certificates/redeem",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            activityEventId: props.activityEventId,
            publicCode: props.publicCode,
            qrToken: props.qrToken,
            locale: props.locale,
          }),
        },
      );

      const payload = (await response.json()) as RedeemResponse;

      if (!response.ok || !payload.ok) {
        setIsError(true);
        setMessage(resolveErrorMessage(payload, props));
        return;
      }

      setMessage(props.successText);

      if (payload.redirectUrl) {
        window.location.assign(payload.redirectUrl);
      }
    } catch {
      setIsError(true);
      setMessage(props.genericErrorText);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={redeem}
        disabled={isSubmitting}
        className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#ef4444] px-5 py-3 text-[14px] font-bold text-white shadow-sm transition hover:bg-[#dc2626] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? props.submittingLabel : props.buttonLabel}
      </button>

      {message ? (
        <p
          className={`mt-3 text-[13px] font-semibold ${
            isError ? "text-[#b91c1c]" : "text-[#166534]"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  GIFT_CERTIFICATE_CATALOG_COPY,
  type GiftCertificateCatalogCopy,
} from "../gift-certificate-copy";
import { type LocaleCode } from "@/i18n";

type OrderResponse = {
  readonly ok?: boolean;
  readonly error?: string;
  readonly errorCode?: string;
  readonly redirectUrl?: string;
};

function getOrderErrorMessage(
  errorCode: string | undefined,
  copy: GiftCertificateCatalogCopy,
): string {
  const value = errorCode ?? "";

  if (value.includes("INSUFFICIENT_AVAILABLE_POINTS")) {
    return copy.errorInsufficientPoints;
  }

  if (value.includes("PROVIDER_CANNOT_ORDER_OWN_CERTIFICATE")) {
    return copy.errorOwnCertificate;
  }

  if (value.includes("BUYER_ALREADY_HAS_ACTIVE_CERTIFICATE_FOR_PROVIDER")) {
    return copy.errorAlreadyActive;
  }

  if (value.includes("ACTIVE_POINTS_WALLET_NOT_FOUND")) {
    return copy.errorNoWallet;
  }

  if (value.includes("CERTIFICATE_VALIDITY_ENDED")) {
    return copy.errorExpired;
  }

  if (value.includes("ONLY_AVAILABLE_CERTIFICATE_CAN_BE_ORDERED")) {
    return copy.errorNotAvailable;
  }

  if (value.includes("RECIPIENT_ACTOR_NOT_AVAILABLE")) {
    return copy.errorProfile;
  }

  if (
    value.includes("QR_SIGNING_SECRET") ||
    value.includes("PGC7D_ORDERING_CONFIGURATION")
  ) {
    return copy.errorConfiguration;
  }

  return copy.errorGeneric;
}

export function OrderGiftCertificateButton({
  activityEventId,
  locale,
}: {
  readonly activityEventId: string;
  readonly locale: LocaleCode;
}) {
  const router = useRouter();
  const copy = GIFT_CERTIFICATE_CATALOG_COPY[locale];
  const [status, setStatus] = useState<
    "idle" | "ordering" | "error" | "success"
  >("idle");
  const [message, setMessage] = useState("");

  async function orderCertificate() {
    if (!window.confirm(copy.orderConfirm)) {
      return;
    }

    setStatus("ordering");
    setMessage("");

    try {
      const response = await fetch(
        `/api/gift-certificates/${encodeURIComponent(activityEventId)}/order`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ locale }),
          cache: "no-store",
        },
      );
      const payload = (await response.json()) as OrderResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(
          getOrderErrorMessage(payload.errorCode, copy),
        );
      }

      setStatus("success");
      setMessage(copy.orderSuccess);

      if (payload.redirectUrl) {
        router.replace(payload.redirectUrl);
      }

      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : copy.errorGeneric,
      );
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void orderCertificate()}
        disabled={status === "ordering" || status === "success"}
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#3b6ef8] px-5 py-3 text-[14px] font-bold text-white transition hover:bg-[#315ed6] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "ordering" ? copy.ordering : copy.orderButton}
      </button>
      {message ? (
        <p
          className={`mt-3 text-[13px] font-semibold ${
            status === "error" ? "text-[#b42318]" : "text-[#166534]"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

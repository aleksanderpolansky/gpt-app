"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

type OrganizationHideButtonLabels = {
  hide: string;
  hiding: string;
  confirm: string;
  error: string;
};

export default function OrganizationHideButton({
  organizationId,
  organizationName,
  redirectHref,
  labels,
}: {
  readonly organizationId: string;
  readonly organizationName: string;
  readonly redirectHref: string;
  readonly labels: OrganizationHideButtonLabels;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleHide() {
    const confirmMessage = labels.confirm.replace("{name}", organizationName);

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/organizations/${encodeURIComponent(organizationId)}/visibility`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ visibility: "hidden" }),
        }
      );

      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error ?? labels.error);
      }

      window.location.href = redirectHref;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : labels.error);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={handleHide}
        disabled={isSubmitting}
        className="inline-flex w-fit items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-[12px] font-semibold text-red-700 shadow-sm transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Trash2 size={14} strokeWidth={2.2} />
        {isSubmitting ? labels.hiding : labels.hide}
      </button>

      {errorMessage ? (
        <p className="max-w-[240px] text-[11px] font-semibold leading-4 text-red-700">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

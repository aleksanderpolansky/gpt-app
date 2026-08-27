"use client";

import { EyeOff, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { LocaleCode } from "@/i18n";
import { getFeedInteractionCopy } from "@/app/feed/feedInteractionCopy";

export default function HidePublicationButton({
  messageObjectId,
  locale,
  mode,
}: {
  messageObjectId: string;
  locale: LocaleCode;
  mode: "hide" | "restore";
}) {
  const router = useRouter();
  const copy = getFeedInteractionCopy(locale);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function submit() {
    if (busy) return;

    setBusy(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/publications/${encodeURIComponent(messageObjectId)}/visibility`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            action: mode,
          }),
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? `HTTP_${response.status}`);
      }

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "PUBLICATION_VISIBILITY_FAILED",
      );
    } finally {
      setBusy(false);
    }
  }

  const isRestore = mode === "restore";

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy}
        className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[10px] font-semibold text-[#7f879f] transition hover:bg-[#f5f6fb] hover:text-[#3b6ef8] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isRestore ? <RotateCcw size={12} /> : <EyeOff size={12} />}
        {busy
          ? isRestore
            ? copy.restoringPublication
            : copy.hidingPublication
          : isRestore
            ? copy.restorePublication
            : copy.hidePublication}
      </button>

      {errorMessage ? (
        <span className="mt-1 max-w-[220px] text-right text-[9px] leading-4 text-[#b42318]">
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
}

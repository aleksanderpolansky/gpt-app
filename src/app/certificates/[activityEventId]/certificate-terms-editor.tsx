"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { type LocaleCode } from "@/i18n";

type EditorCopy = {
  readonly save: string;
  readonly saving: string;
  readonly saved: string;
  readonly error: string;
  readonly placeholder: string;
};

const COPY: Record<LocaleCode, EditorCopy> = {
  en: {
    save: "Save conditions",
    saving: "Saving…",
    saved: "Saved",
    error: "The conditions could not be saved.",
    placeholder: "Offer conditions and comments",
  },
  pl: {
    save: "Zapisz warunki",
    saving: "Zapisywanie…",
    saved: "Zapisano",
    error: "Nie udało się zapisać warunków.",
    placeholder: "Warunki i komentarze do oferty",
  },
  ru: {
    save: "Сохранить условия",
    saving: "Сохраняется…",
    saved: "Сохранено",
    error: "Не удалось сохранить условия.",
    placeholder: "Условия и комментарии к предложению",
  },
  uk: {
    save: "Зберегти умови",
    saving: "Зберігається…",
    saved: "Збережено",
    error: "Не вдалося зберегти умови.",
    placeholder: "Умови й коментарі до пропозиції",
  },
  de: {
    save: "Bedingungen speichern",
    saving: "Wird gespeichert…",
    saved: "Gespeichert",
    error: "Die Bedingungen konnten nicht gespeichert werden.",
    placeholder: "Angebotsbedingungen und Kommentare",
  },
  es: {
    save: "Guardar condiciones",
    saving: "Guardando…",
    saved: "Guardado",
    error: "No se pudieron guardar las condiciones.",
    placeholder: "Condiciones y comentarios de la oferta",
  },
  cs: {
    save: "Uložit podmínky",
    saving: "Ukládání…",
    saved: "Uloženo",
    error: "Podmínky se nepodařilo uložit.",
    placeholder: "Podmínky a komentáře nabídky",
  },
};

export function CertificateTermsEditor({
  activityEventId,
  initialTerms,
  locale,
}: {
  readonly activityEventId: string;
  readonly initialTerms: string | null;
  readonly locale: LocaleCode;
}) {
  const copy = COPY[locale];
  const router = useRouter();
  const [value, setValue] = useState(initialTerms ?? "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save() {
    setPending(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/gift-certificates/${encodeURIComponent(activityEventId)}/terms`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ termsText: value }),
        },
      );

      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setError(data.error || copy.error);
        return;
      }

      setMessage(copy.saved);
      router.refresh();
    } catch {
      setError(copy.error);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-3">
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        maxLength={4000}
        placeholder={copy.placeholder}
        className="min-h-[140px] w-full resize-y rounded-xl border border-[#dfe3f1] bg-white px-3 py-3 text-[13px] leading-6 text-[#4a4f6a] outline-none transition focus:border-[#3b6ef8]/50 focus:ring-2 focus:ring-[#3b6ef8]/10"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={pending}
          className="rounded-lg bg-[#3b6ef8] px-4 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#2f5fe3] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? copy.saving : copy.save}
        </button>
        <span aria-live="polite" className="text-[12px] font-medium">
          {error ? <span className="text-[#b42318]">{error}</span> : null}
          {message ? <span className="text-[#15803d]">{message}</span> : null}
        </span>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Eye, EyeOff, Loader2, RotateCcw, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { type LocaleCode } from "@/i18n";

type ToolbarCopy = {
  view: string;
  hide: string;
  show: string;
  hiding: string;
  showing: string;
  reset: string;
  save: string;
  saveUnavailable: string;
  genericError: string;
};

const COPY: Record<LocaleCode, ToolbarCopy> = {
  en: {
    view: "View mode",
    hide: "Hide superoffer",
    show: "Show superoffer",
    hiding: "Hiding…",
    showing: "Showing…",
    reset: "Reset changes",
    save: "Save",
    saveUnavailable: "The editable form could not be found.",
    genericError: "The offer visibility could not be changed.",
  },
  pl: {
    view: "Tryb podglądu",
    hide: "Ukryj superofertę",
    show: "Pokaż superofertę",
    hiding: "Ukrywanie…",
    showing: "Publikowanie…",
    reset: "Cofnij zmiany",
    save: "Zapisz",
    saveUnavailable: "Nie znaleziono formularza edycji.",
    genericError: "Nie udało się zmienić widoczności oferty.",
  },
  ru: {
    view: "Режим просмотра",
    hide: "Скрыть суперпредложение",
    show: "Показать суперпредложение",
    hiding: "Скрываем…",
    showing: "Показываем…",
    reset: "Отменить изменения",
    save: "Сохранить",
    saveUnavailable: "Форма редактирования не найдена.",
    genericError: "Не удалось изменить видимость предложения.",
  },
  uk: {
    view: "Режим перегляду",
    hide: "Приховати суперпропозицію",
    show: "Показати суперпропозицію",
    hiding: "Приховуємо…",
    showing: "Показуємо…",
    reset: "Скасувати зміни",
    save: "Зберегти",
    saveUnavailable: "Форму редагування не знайдено.",
    genericError: "Не вдалося змінити видимість пропозиції.",
  },
  de: {
    view: "Ansichtsmodus",
    hide: "Superangebot ausblenden",
    show: "Superangebot anzeigen",
    hiding: "Wird ausgeblendet…",
    showing: "Wird angezeigt…",
    reset: "Änderungen zurücksetzen",
    save: "Speichern",
    saveUnavailable: "Das Bearbeitungsformular wurde nicht gefunden.",
    genericError: "Die Sichtbarkeit des Angebots konnte nicht geändert werden.",
  },
  es: {
    view: "Modo de vista",
    hide: "Ocultar superoferta",
    show: "Mostrar superoferta",
    hiding: "Ocultando…",
    showing: "Mostrando…",
    reset: "Restablecer cambios",
    save: "Guardar",
    saveUnavailable: "No se encontró el formulario de edición.",
    genericError: "No se pudo cambiar la visibilidad de la oferta.",
  },
  cs: {
    view: "Režim zobrazení",
    hide: "Skrýt supernabídku",
    show: "Zobrazit supernabídku",
    hiding: "Skrývání…",
    showing: "Zobrazování…",
    reset: "Vrátit změny",
    save: "Uložit",
    saveUnavailable: "Formulář úprav nebyl nalezen.",
    genericError: "Viditelnost nabídky se nepodařilo změnit.",
  },
};

function localeQuery(locale: LocaleCode): string {
  return locale === "en" ? "" : `?locale=${encodeURIComponent(locale)}`;
}

function providedListHref(locale: LocaleCode): string {
  const params = new URLSearchParams({
    scope: "mine",
    role: "provided",
  });

  if (locale !== "en") {
    params.set("locale", locale);
  }

  return `/certificates?${params.toString()}`;
}

export function CertificateVisibilityButton({
  activityEventId,
  locale,
  lifecycleStatus,
}: {
  readonly activityEventId: string;
  readonly locale: LocaleCode;
  readonly lifecycleStatus: "draft" | "available";
}) {
  const router = useRouter();
  const copy = COPY[locale];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isHidden = lifecycleStatus === "draft";

  async function changeVisibility() {
    if (busy) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(
        isHidden
          ? `/api/gift-certificates/${activityEventId}/publish`
          : `/api/gift-certificates/${activityEventId}/visibility`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isHidden ? { locale } : { locale, action: "hide" },
          ),
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; errorCode?: string }
        | null;

      if (!response.ok) {
        throw new Error(copy.genericError);
      }

      if (isHidden) {
        router.replace(`/certificates/${activityEventId}${localeQuery(locale)}`);
      } else {
        router.replace(providedListHref(locale));
      }
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={changeVisibility}
        disabled={busy}
        className={
          isHidden
            ? "inline-flex items-center gap-2 rounded-xl border border-[#22c55e]/35 bg-[#ecfdf3] px-4 py-2 text-[13px] font-semibold text-[#16a34a] shadow-sm transition hover:bg-[#dcfce7] disabled:cursor-wait disabled:opacity-60"
            : "inline-flex items-center gap-2 rounded-xl border border-[#ef4444]/30 bg-[#fff7f7] px-4 py-2 text-[13px] font-semibold text-[#dc2626] shadow-sm transition hover:bg-[#fee2e2] disabled:cursor-wait disabled:opacity-60"
        }
      >
        {busy ? (
          <Loader2 size={15} className="animate-spin" />
        ) : isHidden ? (
          <Eye size={15} />
        ) : (
          <EyeOff size={15} />
        )}
        {busy
          ? isHidden
            ? copy.showing
            : copy.hiding
          : isHidden
            ? copy.show
            : copy.hide}
      </button>
      {error ? (
        <p className="max-w-[34rem] text-[11px] font-medium text-[#dc2626]">{error}</p>
      ) : null}
    </div>
  );
}

export function CertificateEditToolbar({
  viewHref,
  activityEventId,
  locale,
  lifecycleStatus,
}: {
  readonly viewHref: string;
  readonly activityEventId: string;
  readonly locale: LocaleCode;
  readonly lifecycleStatus: "draft" | "available";
}) {
  const copy = COPY[locale];
  const [saveError, setSaveError] = useState<string | null>(null);

  function resetChanges() {
    window.location.reload();
  }

  function submitChanges() {
    setSaveError(null);
    const root = document.getElementById("offer-conditions");
    const submitButton = root?.querySelector<HTMLButtonElement>(
      'button[type="submit"], input[type="submit"]',
    );

    if (submitButton) {
      submitButton.click();
      return;
    }

    const form = root?.querySelector<HTMLFormElement>("form");
    if (form) {
      form.requestSubmit();
      return;
    }

    setSaveError(copy.saveUnavailable);
  }

  return (
    <div className="mb-5 flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={viewHref}
            className="inline-flex items-center rounded-xl border border-[#dfe3f1] bg-white px-4 py-2 text-[13px] font-semibold text-[#42507a] shadow-sm transition hover:bg-[#f8fafc]"
          >
            {copy.view}
          </Link>
          <CertificateVisibilityButton
            activityEventId={activityEventId}
            locale={locale}
            lifecycleStatus={lifecycleStatus}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetChanges}
            title={copy.reset}
            aria-label={copy.reset}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#dfe3f1] bg-white text-[#8b93aa] shadow-sm transition hover:bg-[#f8fafc]"
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            onClick={submitChanges}
            className="inline-flex items-center gap-2 rounded-xl border border-[#22c55e]/35 bg-[#ecfdf3] px-5 py-2 text-[13px] font-semibold text-[#16a34a] shadow-sm transition hover:bg-[#dcfce7]"
          >
            <Save size={15} />
            {copy.save}
          </button>
        </div>
      </div>
      {saveError ? (
        <p className="text-right text-[11px] font-medium text-[#dc2626]">{saveError}</p>
      ) : null}
    </div>
  );
}

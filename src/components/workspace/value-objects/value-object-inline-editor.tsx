"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type Copy = {
  title: string;
  description: string;
  ordinaryPrice: string;
  currency: string;
  currencyNotice: string;
  durationMinutes: string;
  save: string;
  saving: string;
  cancel: string;
  saveError: string;
  futureOffersNotice: string;
};

const COPY: Record<LocaleCode, Copy> = {
  en: {
    title: "Name",
    description: "Description",
    ordinaryPrice: "Ordinary price",
    currency: "Currency",
    currencyNotice: "Currency is determined by the provider context.",
    durationMinutes: "Ordinary duration, minutes",
    save: "Save changes",
    saving: "Saving...",
    cancel: "Cancel",
    saveError: "Could not save changes.",
    futureOffersNotice:
      "Changes to the source object apply only to future offers. Existing published, ordered and completed offer snapshots remain unchanged.",
  },
  pl: {
    title: "Nazwa",
    description: "Opis",
    ordinaryPrice: "Cena zwykła",
    currency: "Waluta",
    currencyNotice: "Waluta wynika z kontekstu dostawcy.",
    durationMinutes: "Zwykły czas trwania, minuty",
    save: "Zapisz zmiany",
    saving: "Zapisywanie...",
    cancel: "Anuluj",
    saveError: "Nie udało się zapisać zmian.",
    futureOffersNotice:
      "Zmiany obiektu źródłowego dotyczą tylko przyszłych ofert. Opublikowane, zamówione i zrealizowane migawki ofert pozostają bez zmian.",
  },
  ru: {
    title: "Название",
    description: "Описание",
    ordinaryPrice: "Обычная цена",
    currency: "Валюта",
    currencyNotice: "Валюта определяется контекстом предоставляющего.",
    durationMinutes: "Обычная продолжительность, минут",
    save: "Сохранить изменения",
    saving: "Сохраняем...",
    cancel: "Отмена",
    saveError: "Не удалось сохранить изменения.",
    futureOffersNotice:
      "Изменения исходного объекта относятся только к будущим предложениям. Снимки уже опубликованных, заказанных и реализованных предложений не меняются.",
  },
  uk: {
    title: "Назва",
    description: "Опис",
    ordinaryPrice: "Звичайна ціна",
    currency: "Валюта",
    currencyNotice: "Валюта визначається контекстом надавача.",
    durationMinutes: "Звичайна тривалість, хвилин",
    save: "Зберегти зміни",
    saving: "Зберігаємо...",
    cancel: "Скасувати",
    saveError: "Не вдалося зберегти зміни.",
    futureOffersNotice:
      "Зміни вихідного об’єкта стосуються лише майбутніх пропозицій. Знімки вже опублікованих, замовлених і реалізованих пропозицій не змінюються.",
  },
  de: {
    title: "Name",
    description: "Beschreibung",
    ordinaryPrice: "Normalpreis",
    currency: "Währung",
    currencyNotice: "Die Währung wird durch den Anbieter-Kontext bestimmt.",
    durationMinutes: "Übliche Dauer, Minuten",
    save: "Änderungen speichern",
    saving: "Speichern...",
    cancel: "Abbrechen",
    saveError: "Änderungen konnten nicht gespeichert werden.",
    futureOffersNotice:
      "Änderungen am Quellobjekt gelten nur für zukünftige Angebote. Bereits veröffentlichte, bestellte und abgeschlossene Angebotsschnappschüsse bleiben unverändert.",
  },
  es: {
    title: "Nombre",
    description: "Descripción",
    ordinaryPrice: "Precio habitual",
    currency: "Moneda",
    currencyNotice: "La moneda viene determinada por el contexto del proveedor.",
    durationMinutes: "Duración habitual, minutos",
    save: "Guardar cambios",
    saving: "Guardando...",
    cancel: "Cancelar",
    saveError: "No se pudieron guardar los cambios.",
    futureOffersNotice:
      "Los cambios del objeto de origen solo se aplican a ofertas futuras. Las instantáneas ya publicadas, pedidas y realizadas no cambian.",
  },
  cs: {
    title: "Název",
    description: "Popis",
    ordinaryPrice: "Běžná cena",
    currency: "Měna",
    currencyNotice: "Měna je určena kontextem poskytovatele.",
    durationMinutes: "Běžná délka, minuty",
    save: "Uložit změny",
    saving: "Ukládání...",
    cancel: "Zrušit",
    saveError: "Změny se nepodařilo uložit.",
    futureOffersNotice:
      "Změny zdrojového objektu platí jen pro budoucí nabídky. Již zveřejněné, objednané a dokončené snímky nabídek se nemění.",
  },
};

type PatchResponse = {
  readonly ok?: boolean;
  readonly error?: string;
};

type ValueObjectInlineEditorProps = {
  readonly valueObjectId: string;
  readonly locale: LocaleCode;
  readonly initialTitle: string;
  readonly initialDescription: string | null;
  readonly isProductOrService: boolean;
  readonly isService: boolean;
  readonly initialPrice: number | null;
  readonly currency: string | null;
  readonly initialDurationMinutes: number | null;
  readonly viewHref: string;
};

function parseOptionalNumber(value: string): number | null | undefined {
  const normalized = value.trim().replace(",", ".");

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }

  return parsed;
}

export function ValueObjectInlineEditor({
  valueObjectId,
  locale,
  initialTitle,
  initialDescription,
  isProductOrService,
  isService,
  initialPrice,
  currency,
  initialDurationMinutes,
  viewHref,
}: ValueObjectInlineEditorProps) {
  const copy = COPY[locale];
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [price, setPrice] = useState(
    initialPrice === null ? "" : String(initialPrice),
  );
  const [duration, setDuration] = useState(
    initialDurationMinutes === null ? "" : String(initialDurationMinutes),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const parsedPrice = useMemo(() => parseOptionalNumber(price), [price]);
  const parsedDuration = useMemo(
    () => parseOptionalNumber(duration),
    [duration],
  );

  const hasChanged = useMemo(() => {
    if (title.trim() !== initialTitle.trim()) {
      return true;
    }

    if (description.trim() !== (initialDescription ?? "").trim()) {
      return true;
    }

    if (isProductOrService) {
      const initialPriceText = initialPrice === null ? "" : String(initialPrice);

      if (price.trim().replace(",", ".") !== initialPriceText) {
        return true;
      }
    }

    if (isService) {
      const initialDurationText =
        initialDurationMinutes === null ? "" : String(initialDurationMinutes);

      if (duration.trim() !== initialDurationText) {
        return true;
      }
    }

    return false;
  }, [
    description,
    duration,
    initialDescription,
    initialDurationMinutes,
    initialPrice,
    initialTitle,
    isProductOrService,
    isService,
    price,
    title,
  ]);

  const isValid =
    title.trim().length > 0 &&
    parsedPrice !== undefined &&
    parsedDuration !== undefined &&
    (!isService || parsedDuration === null || Number.isInteger(parsedDuration));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasChanged || !isValid || isSaving) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    const body: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim() || null,
    };

    if (isProductOrService) {
      body.defaultPrice = parsedPrice;
    }

    if (isService) {
      body.defaultDurationMinutes = parsedDuration;
    }

    try {
      const response = await fetch(
        `/api/value-objects/${encodeURIComponent(valueObjectId)}`,
        {
          method: "PATCH",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );

      const payload = (await response.json().catch(() => ({}))) as PatchResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? `HTTP ${response.status}`);
      }

      router.push(viewHref);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `${copy.saveError} ${error.message}`
          : copy.saveError,
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="grid gap-4">
      <label className="grid gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#7c8099]">
        {copy.title}
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
          className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[24px] font-semibold normal-case tracking-[-0.025em] text-[#111827] outline-none transition focus:border-[#8aa6ff] focus:ring-4 focus:ring-[#dfe6ff]"
        />
      </label>

      <label className="grid gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#7c8099]">
        {copy.description}
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={4000}
          rows={4}
          className="w-full resize-y rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px] font-normal normal-case leading-5 tracking-normal text-[#1a1d2e] outline-none transition focus:border-[#8aa6ff] focus:ring-4 focus:ring-[#dfe6ff]"
        />
      </label>

      {isProductOrService ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#7c8099]">
            {copy.ordinaryPrice}
            <input
              value={price}
              inputMode="decimal"
              onChange={(event) => setPrice(event.target.value)}
              className="rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px] font-medium normal-case tracking-normal text-[#1a1d2e] outline-none transition focus:border-[#8aa6ff] focus:ring-4 focus:ring-[#dfe6ff]"
            />
          </label>

          <div className="grid gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#7c8099]">
            {copy.currency}
            <div className="rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3 text-[13px] font-medium normal-case tracking-normal text-[#4a4f6a]">
              {currency || "—"}
            </div>
            <p className="text-[11px] font-normal normal-case leading-4 tracking-normal text-[#7c8099]">
              {copy.currencyNotice}
            </p>
          </div>
        </div>
      ) : null}

      {isService ? (
        <label className="grid gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#7c8099] sm:max-w-[320px]">
          {copy.durationMinutes}
          <input
            value={duration}
            inputMode="numeric"
            onChange={(event) => setDuration(event.target.value)}
            className="rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px] font-medium normal-case tracking-normal text-[#1a1d2e] outline-none transition focus:border-[#8aa6ff] focus:ring-4 focus:ring-[#dfe6ff]"
          />
        </label>
      ) : null}

      {isProductOrService ? (
        <p className="rounded-xl border border-[#fed7aa] bg-[#fff7ed] px-4 py-3 text-[12px] leading-5 text-[#9a3412]">
          {copy.futureOffersNotice}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-xl border border-[#fecaca] bg-[#fff7f7] px-4 py-3 text-[12px] leading-5 text-[#b42318]">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={!hasChanged || !isValid || isSaving}
          className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#3b6ef8] px-4 py-2 text-[12px] font-medium text-white transition hover:bg-[#315bd0] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isSaving ? copy.saving : copy.save}
        </button>
        <button
          type="button"
          onClick={() => router.push(viewHref)}
          disabled={isSaving}
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#dfe3f1] bg-white px-4 py-2 text-[12px] font-medium text-[#4a4f6a] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {copy.cancel}
        </button>
      </div>
    </form>
  );
}

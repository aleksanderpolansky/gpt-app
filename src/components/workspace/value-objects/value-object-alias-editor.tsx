"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";

import type {
  ValueObjectAliasProfileV1,
  ValueObjectAliasV1,
} from "@/types/reality-core/value-object-alias-recognition-v1";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type Copy = {
  title: string;
  help: string;
  alias: string;
  language: string;
  languageIndependent: string;
  add: string;
  adding: string;
  archive: string;
  restore: string;
  empty: string;
  loading: string;
  versionRule: string;
  primaryRule: string;
  error: string;
};

const COPY: Record<LocaleCode, Copy> = {
  en: {
    title: "Alternative names",
    help: "Add synonyms and language variants that should resolve to this same object.",
    alias: "Alternative name",
    language: "Language",
    languageIndependent: "Any language",
    add: "Add name",
    adding: "Adding...",
    archive: "Remove",
    restore: "Restore",
    empty: "No alternative names yet.",
    loading: "Loading alternative names...",
    versionRule: "Alternative names do not create a new definition version.",
    primaryRule: "Change the primary name in the definition editor above.",
    error: "Could not update alternative names.",
  },
  pl: {
    title: "Nazwy alternatywne",
    help: "Dodaj synonimy i warianty jÄ™zykowe prowadzÄ…ce do tego samego obiektu.",
    alias: "Nazwa alternatywna",
    language: "JÄ™zyk",
    languageIndependent: "Dowolny jÄ™zyk",
    add: "Dodaj nazwÄ™",
    adding: "Dodawanie...",
    archive: "UsuÅ„",
    restore: "PrzywrÃ³Ä‡",
    empty: "Brak nazw alternatywnych.",
    loading: "Åadowanie nazw alternatywnych...",
    versionRule: "Nazwy alternatywne nie tworzÄ… nowej wersji definicji.",
    primaryRule: "NazwÄ™ gÅ‚Ã³wnÄ… zmieÅ„ w edytorze definicji powyÅ¼ej.",
    error: "Nie udaÅ‚o siÄ™ zmieniÄ‡ nazw alternatywnych.",
  },
  ru: {
    title: "ÐÐ»ÑŒÑ‚ÐµÑ€Ð½Ð°Ñ‚Ð¸Ð²Ð½Ñ‹Ðµ Ð½Ð°Ð·Ð²Ð°Ð½Ð¸Ñ",
    help: "Ð”Ð¾Ð±Ð°Ð²ÑŒÑ‚Ðµ ÑÐ¸Ð½Ð¾Ð½Ð¸Ð¼Ñ‹ Ð¸ ÑÐ·Ñ‹ÐºÐ¾Ð²Ñ‹Ðµ Ð²Ð°Ñ€Ð¸Ð°Ð½Ñ‚Ñ‹, ÐºÐ¾Ñ‚Ð¾Ñ€Ñ‹Ðµ Ð´Ð¾Ð»Ð¶Ð½Ñ‹ Ñ€Ð°ÑÐ¿Ð¾Ð·Ð½Ð°Ð²Ð°Ñ‚ÑŒÑÑ ÐºÐ°Ðº ÑÑ‚Ð¾Ñ‚ Ð¶Ðµ Ð¾Ð±ÑŠÐµÐºÑ‚.",
    alias: "ÐÐ»ÑŒÑ‚ÐµÑ€Ð½Ð°Ñ‚Ð¸Ð²Ð½Ð¾Ðµ Ð½Ð°Ð·Ð²Ð°Ð½Ð¸Ðµ",
    language: "Ð¯Ð·Ñ‹Ðº",
    languageIndependent: "Ð‘ÐµÐ· Ð¿Ñ€Ð¸Ð²ÑÐ·ÐºÐ¸ Ðº ÑÐ·Ñ‹ÐºÑƒ",
    add: "Ð”Ð¾Ð±Ð°Ð²Ð¸Ñ‚ÑŒ Ð½Ð°Ð·Ð²Ð°Ð½Ð¸Ðµ",
    adding: "Ð”Ð¾Ð±Ð°Ð²Ð»ÑÐµÐ¼...",
    archive: "Ð£Ð±Ñ€Ð°Ñ‚ÑŒ",
    restore: "Ð’ÐµÑ€Ð½ÑƒÑ‚ÑŒ",
    empty: "ÐÐ»ÑŒÑ‚ÐµÑ€Ð½Ð°Ñ‚Ð¸Ð²Ð½Ñ‹Ñ… Ð½Ð°Ð·Ð²Ð°Ð½Ð¸Ð¹ Ð¿Ð¾ÐºÐ° Ð½ÐµÑ‚.",
    loading: "Ð—Ð°Ð³Ñ€ÑƒÐ¶Ð°ÐµÐ¼ Ð°Ð»ÑŒÑ‚ÐµÑ€Ð½Ð°Ñ‚Ð¸Ð²Ð½Ñ‹Ðµ Ð½Ð°Ð·Ð²Ð°Ð½Ð¸Ñ...",
    versionRule: "ÐÐ»ÑŒÑ‚ÐµÑ€Ð½Ð°Ñ‚Ð¸Ð²Ð½Ñ‹Ðµ Ð½Ð°Ð·Ð²Ð°Ð½Ð¸Ñ Ð½Ðµ ÑÐ¾Ð·Ð´Ð°ÑŽÑ‚ Ð½Ð¾Ð²ÑƒÑŽ Ð²ÐµÑ€ÑÐ¸ÑŽ Ð¾Ð¿Ñ€ÐµÐ´ÐµÐ»ÐµÐ½Ð¸Ñ.",
    primaryRule: "ÐžÑÐ½Ð¾Ð²Ð½Ð¾Ðµ Ð½Ð°Ð·Ð²Ð°Ð½Ð¸Ðµ Ð¸Ð·Ð¼ÐµÐ½ÑÐµÑ‚ÑÑ Ð² Ñ€ÐµÐ´Ð°ÐºÑ‚Ð¾Ñ€Ðµ Ð¾Ð¿Ñ€ÐµÐ´ÐµÐ»ÐµÐ½Ð¸Ñ Ð²Ñ‹ÑˆÐµ.",
    error: "ÐÐµ ÑƒÐ´Ð°Ð»Ð¾ÑÑŒ Ð¸Ð·Ð¼ÐµÐ½Ð¸Ñ‚ÑŒ Ð°Ð»ÑŒÑ‚ÐµÑ€Ð½Ð°Ñ‚Ð¸Ð²Ð½Ñ‹Ðµ Ð½Ð°Ð·Ð²Ð°Ð½Ð¸Ñ.",
  },
  uk: {
    title: "ÐÐ»ÑŒÑ‚ÐµÑ€Ð½Ð°Ñ‚Ð¸Ð²Ð½Ñ– Ð½Ð°Ð·Ð²Ð¸",
    help: "Ð”Ð¾Ð´Ð°Ð¹Ñ‚Ðµ ÑÐ¸Ð½Ð¾Ð½Ñ–Ð¼Ð¸ Ñ‚Ð° Ð¼Ð¾Ð²Ð½Ñ– Ð²Ð°Ñ€Ñ–Ð°Ð½Ñ‚Ð¸, Ñ‰Ð¾ Ð¼Ð°ÑŽÑ‚ÑŒ Ñ€Ð¾Ð·Ð¿Ñ–Ð·Ð½Ð°Ð²Ð°Ñ‚Ð¸ÑÑ ÑÐº Ñ‚Ð¾Ð¹ ÑÐ°Ð¼Ð¸Ð¹ Ð¾Ð±â€™Ñ”ÐºÑ‚.",
    alias: "ÐÐ»ÑŒÑ‚ÐµÑ€Ð½Ð°Ñ‚Ð¸Ð²Ð½Ð° Ð½Ð°Ð·Ð²Ð°",
    language: "ÐœÐ¾Ð²Ð°",
    languageIndependent: "Ð‘ÐµÐ· Ð¿Ñ€Ð¸Ð²â€™ÑÐ·ÐºÐ¸ Ð´Ð¾ Ð¼Ð¾Ð²Ð¸",
    add: "Ð”Ð¾Ð´Ð°Ñ‚Ð¸ Ð½Ð°Ð·Ð²Ñƒ",
    adding: "Ð”Ð¾Ð´Ð°Ñ”Ð¼Ð¾...",
    archive: "ÐŸÑ€Ð¸Ð±Ñ€Ð°Ñ‚Ð¸",
    restore: "ÐŸÐ¾Ð²ÐµÑ€Ð½ÑƒÑ‚Ð¸",
    empty: "ÐÐ»ÑŒÑ‚ÐµÑ€Ð½Ð°Ñ‚Ð¸Ð²Ð½Ð¸Ñ… Ð½Ð°Ð·Ð² Ð¿Ð¾ÐºÐ¸ Ð½ÐµÐ¼Ð°Ñ”.",
    loading: "Ð—Ð°Ð²Ð°Ð½Ñ‚Ð°Ð¶ÑƒÑ”Ð¼Ð¾ Ð°Ð»ÑŒÑ‚ÐµÑ€Ð½Ð°Ñ‚Ð¸Ð²Ð½Ñ– Ð½Ð°Ð·Ð²Ð¸...",
    versionRule: "ÐÐ»ÑŒÑ‚ÐµÑ€Ð½Ð°Ñ‚Ð¸Ð²Ð½Ñ– Ð½Ð°Ð·Ð²Ð¸ Ð½Ðµ ÑÑ‚Ð²Ð¾Ñ€ÑŽÑŽÑ‚ÑŒ Ð½Ð¾Ð²Ñƒ Ð²ÐµÑ€ÑÑ–ÑŽ Ð²Ð¸Ð·Ð½Ð°Ñ‡ÐµÐ½Ð½Ñ.",
    primaryRule: "ÐžÑÐ½Ð¾Ð²Ð½Ð° Ð½Ð°Ð·Ð²Ð° Ð·Ð¼Ñ–Ð½ÑŽÑ”Ñ‚ÑŒÑÑ Ð² Ñ€ÐµÐ´Ð°ÐºÑ‚Ð¾Ñ€Ñ– Ð²Ð¸Ð·Ð½Ð°Ñ‡ÐµÐ½Ð½Ñ Ð²Ð¸Ñ‰Ðµ.",
    error: "ÐÐµ Ð²Ð´Ð°Ð»Ð¾ÑÑ Ð·Ð¼Ñ–Ð½Ð¸Ñ‚Ð¸ Ð°Ð»ÑŒÑ‚ÐµÑ€Ð½Ð°Ñ‚Ð¸Ð²Ð½Ñ– Ð½Ð°Ð·Ð²Ð¸.",
  },
  de: {
    title: "Alternative Namen",
    help: "FÃ¼gen Sie Synonyme und Sprachvarianten hinzu, die dasselbe Objekt erkennen sollen.",
    alias: "Alternativer Name",
    language: "Sprache",
    languageIndependent: "SprachunabhÃ¤ngig",
    add: "Namen hinzufÃ¼gen",
    adding: "HinzufÃ¼gen...",
    archive: "Entfernen",
    restore: "Wiederherstellen",
    empty: "Noch keine alternativen Namen.",
    loading: "Alternative Namen werden geladen...",
    versionRule: "Alternative Namen erzeugen keine neue Definitionsversion.",
    primaryRule: "Der primÃ¤re Name wird im Definitionseditor oben geÃ¤ndert.",
    error: "Alternative Namen konnten nicht geÃ¤ndert werden.",
  },
  es: {
    title: "Nombres alternativos",
    help: "AÃ±ade sinÃ³nimos y variantes de idioma que deben reconocer el mismo objeto.",
    alias: "Nombre alternativo",
    language: "Idioma",
    languageIndependent: "Sin idioma",
    add: "AÃ±adir nombre",
    adding: "AÃ±adiendo...",
    archive: "Quitar",
    restore: "Restaurar",
    empty: "TodavÃ­a no hay nombres alternativos.",
    loading: "Cargando nombres alternativos...",
    versionRule: "Los nombres alternativos no crean una nueva versiÃ³n de la definiciÃ³n.",
    primaryRule: "El nombre principal se cambia en el editor de definiciÃ³n superior.",
    error: "No se pudieron cambiar los nombres alternativos.",
  },
  cs: {
    title: "AlternativnÃ­ nÃ¡zvy",
    help: "PÅ™idejte synonyma a jazykovÃ© varianty, kterÃ© majÃ­ rozpoznat tentÃ½Å¾ objekt.",
    alias: "AlternativnÃ­ nÃ¡zev",
    language: "Jazyk",
    languageIndependent: "Bez jazyka",
    add: "PÅ™idat nÃ¡zev",
    adding: "PÅ™idÃ¡vÃ¡nÃ­...",
    archive: "Odebrat",
    restore: "Obnovit",
    empty: "ZatÃ­m nejsou Å¾Ã¡dnÃ© alternativnÃ­ nÃ¡zvy.",
    loading: "NaÄÃ­tÃ¡nÃ­ alternativnÃ­ch nÃ¡zvÅ¯...",
    versionRule: "AlternativnÃ­ nÃ¡zvy nevytvÃ¡Å™ejÃ­ novou verzi definice.",
    primaryRule: "HlavnÃ­ nÃ¡zev se mÄ›nÃ­ v editoru definice vÃ½Å¡e.",
    error: "AlternativnÃ­ nÃ¡zvy se nepodaÅ™ilo zmÄ›nit.",
  },
};

const LANGUAGE_OPTIONS = ["en", "pl", "ru", "uk", "de", "es", "cs"];

type Props = {
  readonly valueObjectId: string;
  readonly locale: LocaleCode;
};

type ErrorPayload = {
  readonly error?: string;
};

export function ValueObjectAliasEditor({
  valueObjectId,
  locale,
}: Props) {
  const copy = COPY[locale];

  const [profile, setProfile] = useState<ValueObjectAliasProfileV1 | null>(
    null,
  );
  const [aliasText, setAliasText] = useState("");
  const [aliasLocale, setAliasLocale] = useState<LocaleCode | "">(locale);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(
      `/api/value-objects/${encodeURIComponent(valueObjectId)}/aliases`,
      {
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      },
    );

    const payload = (await response.json().catch(() => ({}))) as
      | ValueObjectAliasProfileV1
      | ErrorPayload;

    if (!response.ok || !("ok" in payload) || payload.ok !== true) {
      throw new Error(
        "error" in payload && payload.error
          ? payload.error
          : `HTTP ${response.status}`,
      );
    }

    setProfile(payload);
  }, [valueObjectId]);

  useEffect(() => {
    let alive = true;

    void (async () => {
      try {
        await load();
      } catch (error) {
        if (alive) {
          setErrorMessage(
            error instanceof Error
              ? `${copy.error} ${error.message}`
              : copy.error,
          );
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [copy.error, load]);

  async function mutate(body: Record<string, unknown>, key: string) {
    setBusyKey(key);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/value-objects/${encodeURIComponent(valueObjectId)}/aliases`,
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

      const payload = (await response.json().catch(() => ({}))) as
        | {
            ok?: boolean;
            profile?: ValueObjectAliasProfileV1;
            error?: string;
          };

      if (!response.ok || payload.ok !== true || !payload.profile) {
        throw new Error(payload.error ?? `HTTP ${response.status}`);
      }

      setProfile(payload.profile);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `${copy.error} ${error.message}`
          : copy.error,
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function addAlias(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalized = aliasText.trim();

    if (!normalized || busyKey) {
      return;
    }

    await mutate(
      {
        action: "add",
        aliasText: normalized,
        locale: aliasLocale || null,
      },
      "add",
    );

    setAliasText("");
  }

  async function changeAlias(
    alias: ValueObjectAliasV1,
    action: "archive" | "restore",
  ) {
    if (busyKey) {
      return;
    }

    await mutate(
      {
        action,
        aliasId: alias.id,
      },
      `${action}:${alias.id}`,
    );
  }

  return (
    <section className="grid gap-4 rounded-2xl border border-[#dfe3f1] bg-white p-5">
      <div>
        <h2 className="text-[16px] font-bold text-[#1a1d2e]">
          {copy.title}
        </h2>
        <p className="mt-1 text-[12px] leading-5 text-[#7c8099]">
          {copy.help}
        </p>
      </div>

      <form
        onSubmit={addAlias}
        className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]"
      >
        <label className="grid gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#7c8099]">
          {copy.alias}
          <input
            value={aliasText}
            onChange={(event) => setAliasText(event.target.value)}
            maxLength={180}
            className="rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px] font-medium normal-case tracking-normal text-[#1a1d2e] outline-none transition focus:border-[#8aa6ff] focus:ring-4 focus:ring-[#dfe6ff]"
          />
        </label>

        <label className="grid gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#7c8099]">
          {copy.language}
          <select
            value={aliasLocale}
            onChange={(event) => setAliasLocale(event.target.value as LocaleCode | "")}
            className="rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px] font-medium normal-case tracking-normal text-[#1a1d2e] outline-none"
          >
            <option value="">{copy.languageIndependent}</option>
            {LANGUAGE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value.toUpperCase()}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={!aliasText.trim() || busyKey !== null}
          className="self-end rounded-xl bg-[#3b6ef8] px-4 py-3 text-[12px] font-medium text-white transition hover:bg-[#315bd0] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {busyKey === "add" ? copy.adding : copy.add}
        </button>
      </form>

      <div className="grid gap-2">
        {!profile ? (
          <p className="text-[12px] text-[#7c8099]">{copy.loading}</p>
        ) : profile.aliases.length === 0 ? (
          <p className="text-[12px] text-[#7c8099]">{copy.empty}</p>
        ) : (
          profile.aliases.map((alias) => {
            const archived = alias.status === "archived";
            const key = `${archived ? "restore" : "archive"}:${alias.id}`;

            return (
              <div
                key={alias.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#eef0f7] px-4 py-3"
              >
                <div>
                  <div className="text-[13px] font-semibold text-[#1a1d2e]">
                    {alias.aliasText}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#8b91aa]">
                    {(alias.locale ?? "â€”").toUpperCase()} Â· {alias.status}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={busyKey !== null}
                  onClick={() =>
                    void changeAlias(
                      alias,
                      archived ? "restore" : "archive",
                    )
                  }
                  className="rounded-lg border border-[#dfe3f1] bg-white px-3 py-2 text-[11px] font-medium text-[#4a4f6a] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {archived ? copy.restore : copy.archive}
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="grid gap-1 text-[11px] leading-4 text-[#7c8099]">
        <p>{copy.versionRule}</p>
        <p>{copy.primaryRule}</p>
      </div>

      {errorMessage ? (
        <p className="rounded-xl border border-[#fecaca] bg-[#fff7f7] px-4 py-3 text-[12px] leading-5 text-[#b42318]">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}

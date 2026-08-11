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
    help: "Dodaj synonimy i warianty językowe prowadzące do tego samego obiektu.",
    alias: "Nazwa alternatywna",
    language: "Język",
    languageIndependent: "Dowolny język",
    add: "Dodaj nazwę",
    adding: "Dodawanie...",
    archive: "Usuń",
    restore: "Przywróć",
    empty: "Brak nazw alternatywnych.",
    loading: "Ładowanie nazw alternatywnych...",
    versionRule: "Nazwy alternatywne nie tworzą nowej wersji definicji.",
    primaryRule: "Nazwę główną zmień w edytorze definicji powyżej.",
    error: "Nie udało się zmienić nazw alternatywnych.",
  },
  ru: {
    title: "Альтернативные названия",
    help: "Добавьте синонимы и языковые варианты, которые должны распознаваться как этот же объект.",
    alias: "Альтернативное название",
    language: "Язык",
    languageIndependent: "Без привязки к языку",
    add: "Добавить название",
    adding: "Добавляем...",
    archive: "Убрать",
    restore: "Вернуть",
    empty: "Альтернативных названий пока нет.",
    loading: "Загружаем альтернативные названия...",
    versionRule: "Альтернативные названия не создают новую версию определения.",
    primaryRule: "Основное название изменяется в редакторе определения выше.",
    error: "Не удалось изменить альтернативные названия.",
  },
  uk: {
    title: "Альтернативні назви",
    help: "Додайте синоніми та мовні варіанти, що мають розпізнаватися як той самий об’єкт.",
    alias: "Альтернативна назва",
    language: "Мова",
    languageIndependent: "Без прив’язки до мови",
    add: "Додати назву",
    adding: "Додаємо...",
    archive: "Прибрати",
    restore: "Повернути",
    empty: "Альтернативних назв поки немає.",
    loading: "Завантажуємо альтернативні назви...",
    versionRule: "Альтернативні назви не створюють нову версію визначення.",
    primaryRule: "Основна назва змінюється в редакторі визначення вище.",
    error: "Не вдалося змінити альтернативні назви.",
  },
  de: {
    title: "Alternative Namen",
    help: "Fügen Sie Synonyme und Sprachvarianten hinzu, die dasselbe Objekt erkennen sollen.",
    alias: "Alternativer Name",
    language: "Sprache",
    languageIndependent: "Sprachunabhängig",
    add: "Namen hinzufügen",
    adding: "Hinzufügen...",
    archive: "Entfernen",
    restore: "Wiederherstellen",
    empty: "Noch keine alternativen Namen.",
    loading: "Alternative Namen werden geladen...",
    versionRule: "Alternative Namen erzeugen keine neue Definitionsversion.",
    primaryRule: "Der primäre Name wird im Definitionseditor oben geändert.",
    error: "Alternative Namen konnten nicht geändert werden.",
  },
  es: {
    title: "Nombres alternativos",
    help: "Añade sinónimos y variantes de idioma que deben reconocer el mismo objeto.",
    alias: "Nombre alternativo",
    language: "Idioma",
    languageIndependent: "Sin idioma",
    add: "Añadir nombre",
    adding: "Añadiendo...",
    archive: "Quitar",
    restore: "Restaurar",
    empty: "Todavía no hay nombres alternativos.",
    loading: "Cargando nombres alternativos...",
    versionRule: "Los nombres alternativos no crean una nueva versión de la definición.",
    primaryRule: "El nombre principal se cambia en el editor de definición superior.",
    error: "No se pudieron cambiar los nombres alternativos.",
  },
  cs: {
    title: "Alternativní názvy",
    help: "Přidejte synonyma a jazykové varianty, které mají rozpoznat tentýž objekt.",
    alias: "Alternativní název",
    language: "Jazyk",
    languageIndependent: "Bez jazyka",
    add: "Přidat název",
    adding: "Přidávání...",
    archive: "Odebrat",
    restore: "Obnovit",
    empty: "Zatím nejsou žádné alternativní názvy.",
    loading: "Načítání alternativních názvů...",
    versionRule: "Alternativní názvy nevytvářejí novou verzi definice.",
    primaryRule: "Hlavní název se mění v editoru definice výše.",
    error: "Alternativní názvy se nepodařilo změnit.",
  },
};const LANGUAGE_OPTIONS = ["en", "pl", "ru", "uk", "de", "es", "cs"];

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

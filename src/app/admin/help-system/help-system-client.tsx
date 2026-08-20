"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Info,
  Loader2,
  Save,
  Search,
  Sparkles,
} from "lucide-react";

import { getLocaleSearchParam, type LocaleCode } from "@/i18n";
import type {
  HelpBlockKind,
  HelpContentRecord,
  HelpRegistryEntry,
} from "@/lib/help/helpTypes";

type AdminPayload = {
  ok?: boolean;
  error?: string;
  canEdit?: boolean;
  registry?: HelpRegistryEntry[];
  content?: HelpContentRecord[];
  translationModel?: {
    modelName?: string;
    displayName?: string;
    reasoningEffort?: string;
  };
};

const COPY: Record<LocaleCode, {
  title: string;
  subtitle: string;
  search: string;
  what: string;
  why: string;
  empty: string;
  save: string;
  saving: string;
  freshTranslation: string;
  model: string;
  page: string;
  navigation: string;
  noHelp: string;
  saved: string;
  loadError: string;
}> = {
  ru: { title: "Справочная система", subtitle: "Карта пользовательского интерфейса ARCTor. WHAT объясняет, что это такое; WHY — зачем это нужно пользователю.", search: "Поиск по маршруту, ключу или подсказке…", what: "Что это такое?", why: "Зачем это вам?", empty: "Текст не заполнен — значок пользователю не показывается.", save: "Сохранить", saving: "Переводим и сохраняем…", freshTranslation: "Каждое сохранение заново переводит этот блок на все 7 языков. Предыдущие переводы заменяются новой ревизией.", model: "Модель перевода", page: "Страница", navigation: "Глобальная навигация", noHelp: "Без текста", saved: "Сохранено", loadError: "Не удалось загрузить справочную систему." },
  pl: { title: "System pomocy", subtitle: "Mapa interfejsu użytkownika ARCTor. WHAT wyjaśnia, czym jest element; WHY — po co jest użytkownikowi.", search: "Szukaj po trasie, kluczu lub opisie…", what: "Co to jest?", why: "Po co Ci to?", empty: "Brak tekstu — ikona nie jest wyświetlana użytkownikowi.", save: "Zapisz", saving: "Tłumaczenie i zapis…", freshTranslation: "Każdy zapis ponownie tłumaczy ten blok na wszystkie 7 języków. Poprzednie tłumaczenia są zastępowane nową rewizją.", model: "Model tłumaczenia", page: "Strona", navigation: "Nawigacja globalna", noHelp: "Brak tekstu", saved: "Zapisano", loadError: "Nie udało się wczytać systemu pomocy." },
  en: { title: "Help system", subtitle: "The ARCTor user-interface map. WHAT explains what an element is; WHY explains why it is useful.", search: "Search route, key or hint…", what: "What is it?", why: "Why is it useful?", empty: "No text means no marker is shown to users.", save: "Save", saving: "Translating and saving…", freshTranslation: "Every save freshly translates this block into all 7 languages. Previous translations are replaced by a new revision.", model: "Translation model", page: "Page", navigation: "Global navigation", noHelp: "No text", saved: "Saved", loadError: "Could not load the help system." },
  es: { title: "Sistema de ayuda", subtitle: "Mapa de la interfaz de ARCTor. WHAT explica qué es cada elemento; WHY explica para qué sirve.", search: "Buscar por ruta, clave o pista…", what: "¿Qué es?", why: "¿Para qué te sirve?", empty: "Sin texto no se muestra ningún icono al usuario.", save: "Guardar", saving: "Traduciendo y guardando…", freshTranslation: "Cada guardado vuelve a traducir este bloque a los 7 idiomas y crea una nueva revisión.", model: "Modelo de traducción", page: "Página", navigation: "Navegación global", noHelp: "Sin texto", saved: "Guardado", loadError: "No se pudo cargar el sistema de ayuda." },
  uk: { title: "Довідкова система", subtitle: "Карта користувацького інтерфейсу ARCTor. WHAT пояснює, що це; WHY — навіщо це користувачеві.", search: "Пошук за маршрутом, ключем або підказкою…", what: "Що це таке?", why: "Навіщо це вам?", empty: "Якщо тексту немає, значок користувачеві не показується.", save: "Зберегти", saving: "Перекладаємо та зберігаємо…", freshTranslation: "Кожне збереження заново перекладає блок на всі 7 мов і створює нову ревізію.", model: "Модель перекладу", page: "Сторінка", navigation: "Глобальна навігація", noHelp: "Без тексту", saved: "Збережено", loadError: "Не вдалося завантажити довідкову систему." },
  de: { title: "Hilfesystem", subtitle: "Karte der ARCTor-Benutzeroberfläche. WHAT erklärt, was ein Element ist; WHY erklärt seinen Nutzen.", search: "Route, Schlüssel oder Hinweis suchen…", what: "Was ist das?", why: "Wozu ist das gut?", empty: "Ohne Text wird den Nutzern kein Symbol angezeigt.", save: "Speichern", saving: "Übersetzen und speichern…", freshTranslation: "Bei jedem Speichern wird der Block neu in alle 7 Sprachen übersetzt und als neue Revision gespeichert.", model: "Übersetzungsmodell", page: "Seite", navigation: "Globale Navigation", noHelp: "Kein Text", saved: "Gespeichert", loadError: "Das Hilfesystem konnte nicht geladen werden." },
  cs: { title: "Systém nápovědy", subtitle: "Mapa uživatelského rozhraní ARCTor. WHAT vysvětluje, co prvek je; WHY vysvětluje, k čemu je užitečný.", search: "Hledat podle trasy, klíče nebo popisu…", what: "Co to je?", why: "K čemu vám to je?", empty: "Bez textu se uživateli žádná ikona nezobrazí.", save: "Uložit", saving: "Překládáme a ukládáme…", freshTranslation: "Každé uložení znovu přeloží blok do všech 7 jazyků a vytvoří novou revizi.", model: "Překladový model", page: "Stránka", navigation: "Globální navigace", noHelp: "Bez textu", saved: "Uloženo", loadError: "Systém nápovědy se nepodařilo načíst." },
};

function localeFromWindow() {
  if (typeof window === "undefined") return "en" as LocaleCode;
  return getLocaleSearchParam(new URLSearchParams(window.location.search));
}

function recordKey(helpKey: string, blockKind: HelpBlockKind) {
  return `${helpKey}:${blockKind}`;
}

function draftKey(helpKey: string, blockKind: HelpBlockKind, locale: LocaleCode) {
  return `${helpKey}:${blockKind}:${locale}`;
}

export function HelpSystemClient() {
  const [locale, setLocale] = useState<LocaleCode>("en");
  const [payload, setPayload] = useState<AdminPayload | null>(null);
  const [search, setSearch] = useState("");
  const [openRoutes, setOpenRoutes] = useState<Set<string>>(new Set());
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function syncLocale() {
      setLocale(localeFromWindow());
    }
    const timer = window.setTimeout(syncLocale, 0);
    window.addEventListener("popstate", syncLocale);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("popstate", syncLocale);
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/admin/help-system", { cache: "no-store" });
        const data = (await response.json()) as AdminPayload;
        if (!response.ok || !data.ok) {
          throw new Error(data.error || `HTTP_${response.status}`);
        }
        if (active) setPayload(data);
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : "UNKNOWN");
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const contentByKey = useMemo(() => {
    const map = new Map<string, HelpContentRecord>();
    for (const item of payload?.content ?? []) {
      map.set(recordKey(item.helpKey, item.blockKind), item);
    }
    return map;
  }, [payload?.content]);

  const grouped = useMemo(() => {
    const entries = payload?.registry ?? [];
    const query = search.trim().toLowerCase();
    const filtered = query
      ? entries.filter((entry) =>
          [entry.route, entry.helpKey, entry.labelHint, entry.kind]
            .join(" ")
            .toLowerCase()
            .includes(query),
        )
      : entries;

    const nav = filtered.filter((entry) => entry.kind === "navigation");
    const routes = new Map<string, HelpRegistryEntry[]>();
    for (const entry of filtered) {
      if (entry.kind === "navigation") continue;
      const list = routes.get(entry.route) ?? [];
      list.push(entry);
      routes.set(entry.route, list);
    }

    return {
      nav,
      routes: [...routes.entries()].sort(([a], [b]) => a.localeCompare(b)),
    };
  }, [payload?.registry, search]);

  const copy = COPY[locale] ?? COPY.en;

  function currentText(entry: HelpRegistryEntry, kind: HelpBlockKind) {
    const key = recordKey(entry.helpKey, kind);
    const localeDraftKey = draftKey(entry.helpKey, kind, locale);
    if (Object.prototype.hasOwnProperty.call(drafts, localeDraftKey)) {
      return drafts[localeDraftKey] ?? "";
    }
    const record = contentByKey.get(key);
    return record?.translations?.[locale] ?? "";
  }

  async function save(entry: HelpRegistryEntry, kind: HelpBlockKind) {
    const key = recordKey(entry.helpKey, kind);
    const sourceText = currentText(entry, kind);
    setSavingKey(key);
    setStatus((current) => ({ ...current, [key]: "" }));
    try {
      const response = await fetch("/api/admin/help-system", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          helpKey: entry.helpKey,
          blockKind: kind,
          sourceLocale: locale,
          sourceText,
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        content?: HelpContentRecord;
      };
      if (!response.ok || !data.ok || !data.content) {
        throw new Error(data.error || `HTTP_${response.status}`);
      }
      setPayload((current) => current ? {
        ...current,
        content: [
          ...(current.content ?? []).filter(
            (item) => recordKey(item.helpKey, item.blockKind) !== key,
          ),
          data.content!,
        ],
      } : current);
      setDrafts((current) => {
        // A successful save has regenerated all seven locale variants, so any
        // unsaved draft for this same WHAT/WHY block is now stale. Remove all
        // locale drafts for the block rather than preserving obsolete text.
        const prefix = `${key}:`;
        return Object.fromEntries(
          Object.entries(current).filter(([draftEntryKey]) => !draftEntryKey.startsWith(prefix)),
        );
      });
      setStatus((current) => ({ ...current, [key]: copy.saved }));
    } catch (cause) {
      setStatus((current) => ({
        ...current,
        [key]: cause instanceof Error ? cause.message : "UNKNOWN",
      }));
    } finally {
      setSavingKey(null);
    }
  }

  function toggleRoute(route: string) {
    setOpenRoutes((current) => {
      const next = new Set(current);
      if (next.has(route)) next.delete(route);
      else next.add(route);
      return next;
    });
  }

  function renderEditor(entry: HelpRegistryEntry) {
    return (
      <div key={entry.helpKey} className="rounded-2xl border border-[#e5e7eb] bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9ca3b8]">
              {entry.kind} · {entry.helpKey}
            </div>
            <div className="mt-1 break-words text-sm font-bold text-[#1a1d2e]">
              {entry.labelHint || entry.route}
            </div>
          </div>
          <div className="rounded-lg bg-[#f5f6fb] px-2 py-1 text-[10px] text-[#7c8099]">
            {entry.sourceFile}
          </div>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {(["what", "why"] as const).map((kind) => {
            const key = recordKey(entry.helpKey, kind);
            const value = currentText(entry, kind);
            const exists = Boolean(contentByKey.get(key)?.translations?.[locale]?.trim());
            return (
              <section key={kind} className="rounded-xl border border-[#dbe4ff] bg-[#fbfcff] p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-[#38415d]">
                  {kind === "what" ? <Info size={14} className="text-[#3b6ef8]" /> : <CircleHelp size={14} className="text-[#7c4dff]" />}
                  {kind === "what" ? copy.what : copy.why}
                  {exists ? <CheckCircle2 size={13} className="ml-auto text-emerald-500" /> : <span className="ml-auto text-[10px] font-medium text-[#9ca3b8]">{copy.noHelp}</span>}
                </div>
                <textarea
                  value={value}
                  disabled={!payload?.canEdit || savingKey === key}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [draftKey(entry.helpKey, kind, locale)]: event.target.value,
                    }))
                  }
                  placeholder={copy.empty}
                  className="min-h-[130px] w-full resize-y rounded-xl border border-[#d8def0] bg-white px-3 py-2.5 text-sm leading-6 text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-2 focus:ring-[#3b6ef8]/10 disabled:opacity-60"
                />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-[10px] text-[#9ca3b8]">{status[key] ?? ""}</span>
                  {payload?.canEdit ? (
                    <button
                      type="button"
                      onClick={() => void save(entry, kind)}
                      disabled={savingKey !== null}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#3b6ef8] px-3 text-xs font-bold text-white shadow-sm hover:bg-[#315ed8] disabled:cursor-wait disabled:opacity-60"
                    >
                      {savingKey === key ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      {savingKey === key ? copy.saving : copy.save}
                    </button>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    );
  }

  if (!payload && !error) {
    return <div className="p-8 text-sm text-[#7c8099]"><Loader2 className="mr-2 inline animate-spin" size={16} />Loading…</div>;
  }

  if (error) {
    return <div className="m-7 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{copy.loadError}<div className="mt-2 font-mono text-xs">{error}</div></div>;
  }

  return (
    <div className="mx-auto w-full max-w-[1380px] space-y-5 p-5 lg:p-7">
      <section className="rounded-[22px] border border-[rgba(0,0,0,0.07)] bg-white p-6 shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold tracking-[0.22em] text-[#3b6ef8]">ARCTOR · HELP REGISTRY</div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-[#111827]">{copy.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#7c8099]">{copy.subtitle}</p>
          </div>
          <div className="rounded-2xl border border-[#dbe4ff] bg-[#eef2ff] px-4 py-3 text-xs text-[#4a4f6a]">
            <div className="flex items-center gap-2 font-bold text-[#3b6ef8]"><Sparkles size={14} />{copy.model}</div>
            <div className="mt-1 font-semibold">{payload?.translationModel?.displayName ?? payload?.translationModel?.modelName ?? "—"} · {payload?.translationModel?.reasoningEffort ?? "—"}</div>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
          {copy.freshTranslation}
        </div>
        <label className="mt-4 flex h-11 items-center gap-2 rounded-xl border border-[#d8def0] bg-white px-3">
          <Search size={16} className="text-[#9ca3b8]" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </label>
      </section>

      {grouped.nav.length > 0 ? (
        <section className="space-y-3 rounded-[22px] border border-[rgba(0,0,0,0.07)] bg-[#f8f9fc] p-4">
          <h2 className="px-1 text-base font-extrabold text-[#1a1d2e]">{copy.navigation}</h2>
          {grouped.nav.map(renderEditor)}
        </section>
      ) : null}

      <section className="space-y-3">
        {grouped.routes.map(([route, entries]) => {
          const open = openRoutes.has(route) || Boolean(search.trim());
          return (
            <div key={route} className="overflow-hidden rounded-[20px] border border-[rgba(0,0,0,0.07)] bg-[#f8f9fc]">
              <button type="button" onClick={() => toggleRoute(route)} className="flex w-full items-center gap-2 bg-white px-5 py-4 text-left">
                {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#3b6ef8]">{copy.page}</span>
                <span className="font-mono text-sm font-bold text-[#1a1d2e]">{route}</span>
                <span className="ml-auto rounded-full bg-[#eef2ff] px-2 py-1 text-[10px] font-bold text-[#3b6ef8]">{entries.length}</span>
              </button>
              {open ? <div className="space-y-3 p-4">{entries.map(renderEditor)}</div> : null}
            </div>
          );
        })}
      </section>
    </div>
  );
}

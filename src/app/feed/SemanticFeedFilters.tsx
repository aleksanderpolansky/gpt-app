"use client";

import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { LocaleCode } from "@/i18n";

type OntologyEntry = {
  id: string;
  title: string;
  parentId: string | null;
  role: string;
};

type IndexedEntry = OntologyEntry & {
  path: string;
  titleSearch: string;
  searchText: string;
};

type Copy = {
  prompt: string;
  placeholder: string;
  hint: string;
  loading: string;
  unavailable: string;
  choose: string;
  selected: string;
  apply: string;
  reset: string;
  collapse: string;
  limit: string;
  empty: string;
  metric: string;
};

const LABEL: Record<LocaleCode, Copy> = {
  ru: { prompt: "Что хотите найти?", placeholder: "Товар, место, организация…", hint: "Поиск по объектам наблюдения и их ветвям. Не по тексту публикаций. Все выбранные объекты обязательны (И).", loading: "Загружаем каталог объектов…", unavailable: "Каталог пока недоступен. Попробуйте позже.", choose: "Выберите объект", selected: "Выбраны", apply: "Показать публикации", reset: "Сбросить", collapse: "Свернуть поиск", limit: "Можно выбрать до 8 объектов", empty: "Совпадений нет", metric: "Ранее заданный числовой фильтр будет сброшен при новом поиске." },
  uk: { prompt: "Що хочете знайти?", placeholder: "Товар, місце, організація…", hint: "Пошук за об'єктами спостереження та їхніми гілками. Не за текстом публікацій. Усі обрані об’єкти обов’язкові (І).", loading: "Завантажуємо каталог об'єктів…", unavailable: "Каталог тимчасово недоступний. Спробуйте пізніше.", choose: "Оберіть об'єкт", selected: "Обрано", apply: "Показати публікації", reset: "Скинути", collapse: "Згорнути пошук", limit: "Можна обрати до 8 об'єктів", empty: "Збігів немає", metric: "Попередній числовий фільтр буде скинуто під час нового пошуку." },
  en: { prompt: "What are you looking for?", placeholder: "Product, place, organization…", hint: "Search observation objects and their branches, not publication text. All selections must match (AND).", loading: "Loading observation catalog…", unavailable: "The catalog is unavailable. Please try again.", choose: "Select an object", selected: "Selected", apply: "Show publications", reset: "Clear", collapse: "Close search", limit: "Select up to 8 objects", empty: "No matching objects", metric: "The existing numeric URL filter will be cleared when starting a new search." },
  pl: { prompt: "Czego szukasz?", placeholder: "Produkt, miejsce, organizacja…", hint: "Wyszukiwanie obiektów obserwacji i ich gałęzi, nie tekstów publikacji. Wszystkie wybrane obiekty muszą pasować (I).", loading: "Ładowanie katalogu…", unavailable: "Katalog jest niedostępny. Spróbuj później.", choose: "Wybierz obiekt", selected: "Wybrane", apply: "Pokaż publikacje", reset: "Wyczyść", collapse: "Zamknij wyszukiwanie", limit: "Wybierz maksymalnie 8 obiektów", empty: "Brak wyników", metric: "Obecny filtr liczbowy zostanie usunięty przy nowym wyszukiwaniu." },
  de: { prompt: "Was suchen Sie?", placeholder: "Produkt, Ort, Unternehmen…", hint: "Suche nach Beobachtungsobjekten und ihren Zweigen, nicht nach Beitragstexten. Alle ausgewählten Objekte müssen passen (UND).", loading: "Katalog wird geladen…", unavailable: "Katalog nicht verfügbar. Bitte erneut versuchen.", choose: "Objekt auswählen", selected: "Ausgewählt", apply: "Beiträge anzeigen", reset: "Zurücksetzen", collapse: "Suche schließen", limit: "Bis zu 8 Objekte auswählen", empty: "Keine Treffer", metric: "Der bestehende numerische Filter wird bei einer neuen Suche entfernt." },
  es: { prompt: "¿Qué quieres encontrar?", placeholder: "Producto, lugar, organización…", hint: "Busca objetos de observación y sus ramas, no textos de publicaciones. Deben coincidir todos los objetos seleccionados (Y).", loading: "Cargando catálogo…", unavailable: "El catálogo no está disponible. Vuelve a intentarlo.", choose: "Elige un objeto", selected: "Seleccionados", apply: "Mostrar publicaciones", reset: "Borrar", collapse: "Cerrar búsqueda", limit: "Elige hasta 8 objetos", empty: "Sin coincidencias", metric: "El filtro numérico anterior se quitará al buscar de nuevo." },
  cs: { prompt: "Co hledáte?", placeholder: "Produkt, místo, organizace…", hint: "Vyhledávání objektů pozorování a jejich větví, nikoli textů příspěvků. Musí odpovídat všechny vybrané objekty (A).", loading: "Načítání katalogu…", unavailable: "Katalog není dostupný. Zkuste to znovu.", choose: "Vyberte objekt", selected: "Vybráno", apply: "Zobrazit příspěvky", reset: "Vymazat", collapse: "Zavřít hledání", limit: "Vyberte až 8 objektů", empty: "Žádné shody", metric: "Původní číselný filtr bude při novém hledání odstraněn." },
};

const MAX_SELECTION = 8;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CACHE_TTL_MS = 5 * 60 * 1000;
const cachedCatalog = new Map<LocaleCode, { entries: OntologyEntry[]; at: number }>();

function extractIds(value: string): string[] {
  const ids = value.split(",").map((item) => item.trim()).filter(Boolean);
  return ids.length <= MAX_SELECTION && new Set(ids).size === ids.length && ids.every((id) => UUID_RE.test(id))
    ? ids : [];
}

export default function SemanticFeedFilters({
  locale,
  initialObjectIds,
  hasLegacyMetric,
}: {
  locale: LocaleCode;
  initialObjectIds: string;
  hasLegacyMetric: boolean;
}) {
  const router = useRouter();
  const copy = LABEL[locale];
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(() => extractIds(initialObjectIds));
  const [catalog, setCatalog] = useState<OntologyEntry[] | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function loadCatalog() {
    if (catalog || status === "loading") return;
    const known = cachedCatalog.get(locale);
    if (known && Date.now() - known.at < CACHE_TTL_MS) {
      setCatalog(known.entries);
      return;
    }

    setStatus("loading");
    try {
      const response = await fetch(`/api/feed/ontology-index?locale=${encodeURIComponent(locale)}`, {
        method: "GET", headers: { Accept: "application/json" },
      });
      const payload = (await response.json()) as { ok?: boolean; entries?: OntologyEntry[] };
      if (!response.ok || !payload.ok || !Array.isArray(payload.entries)) {
        throw new Error("CATALOG_LOAD_FAILED");
      }
      const entries = payload.entries.filter(
        (entry) => typeof entry.id === "string" && UUID_RE.test(entry.id) && typeof entry.title === "string",
      );
      cachedCatalog.set(locale, { entries, at: Date.now() });
      setCatalog(entries);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  const indexed = useMemo<IndexedEntry[]>(() => {
    if (!catalog) return [];
    const byId = new Map(catalog.map((entry) => [entry.id, entry]));
    return catalog.map((entry) => {
      const ancestors: string[] = [];
      let current = entry.parentId;
      const visited = new Set([entry.id]);
      for (let depth = 0; depth < 32 && current && !visited.has(current); depth += 1) {
        visited.add(current);
        const parent = byId.get(current);
        if (!parent) break;
        ancestors.unshift(parent.title);
        current = parent.parentId;
      }
      const path = ancestors.join(" › ");
      return {
        ...entry,
        path,
        titleSearch: entry.title.toLocaleLowerCase(locale),
        searchText: `${path} ${entry.title}`.toLocaleLowerCase(locale),
      };
    });
  }, [catalog, locale]);

  const selectedEntries = useMemo(() => {
    const byId = new Map(indexed.map((entry) => [entry.id, entry]));
    return selectedIds.map((id) => ({ id, title: byId.get(id)?.title ?? `${id.slice(0, 8)}…` }));
  }, [indexed, selectedIds]);

  const suggestions = useMemo(() => {
    const search = query.trim().toLocaleLowerCase(locale);
    if (!search) return [];
    return indexed.filter((entry) => entry.searchText.includes(search))
      .sort((a, b) => {
        const aScore = a.titleSearch.startsWith(search) ? 0 : a.titleSearch.includes(search) ? 1 : 2;
        const bScore = b.titleSearch.startsWith(search) ? 0 : b.titleSearch.includes(search) ? 1 : 2;
        return aScore - bScore || a.title.localeCompare(b.title, locale);
      }).slice(0, 12);
  }, [indexed, locale, query]);

  function updateSelection(id: string) {
    setSelectedIds((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : current.length < MAX_SELECTION ? [...current, id] : current);
  }

  function navigate(ids: string[]) {
    // Any manually supplied F3.1B numeric filter is cleared explicitly;
    // numeric controls are a separate upcoming stage, not a hidden condition.
    const url = new URL(window.location.href);
    url.pathname = "/feed";
    url.searchParams.set("locale", locale);
    for (const key of ["lang", "metric", "parameter", "min", "max", "unit", "on"]) {
      url.searchParams.delete(key);
    }
    if (ids.length > 0) url.searchParams.set("on", ids.join(","));
    setExpanded(false);
    router.push(`${url.pathname}${url.search}`);
  }

  return (
    <div className="mb-3 rounded-2xl border border-[#e2e6f0] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
      <button type="button" aria-expanded={expanded} aria-controls="arctor-feed-search-panel"
        onClick={() => {
          if (!expanded) void loadCatalog();
          setExpanded((value) => !value);
        }}
        className="flex w-full items-center gap-2 text-left focus-visible:outline-2 focus-visible:outline-[#3b6ef8]">
        <Search className="h-4 w-4 shrink-0 text-[#3b6ef8]" aria-hidden="true" />
        <span className="flex-1 text-[13px] text-[#565d74]">{copy.prompt}</span>
        {selectedIds.length > 0 ? <span className="rounded-full bg-[#eef2ff] px-2 py-0.5 text-[11px] text-[#365cce]">{selectedIds.length}</span> : null}
        <SlidersHorizontal className="h-4 w-4 text-[#7c879d]" aria-hidden="true" />
        <ChevronDown className={`h-4 w-4 text-[#7c879d] transition ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {expanded ? (
        <section id="arctor-feed-search-panel" className="mt-3 border-t border-[#edf0f5] pt-3" aria-label={copy.prompt}>
          <label htmlFor="arctor-feed-ontology-search" className="sr-only">{copy.prompt}</label>
          <input id="arctor-feed-ontology-search" value={query} onChange={(event) => setQuery(event.target.value)}
            autoComplete="off" placeholder={copy.placeholder}
            className="w-full rounded-xl border border-[#dfe3f1] px-3 py-2.5 text-[13px] text-[#252c43] outline-none focus:border-[#9db3ff] focus:ring-2 focus:ring-[#e7edff]" />
          <p className="mt-2 text-[11px] leading-4 text-[#798096]">{copy.hint}</p>
          {status === "loading" ? <p role="status" className="mt-3 text-[12px] text-[#7c8099]">{copy.loading}</p> : null}
          {status === "error" ? <p role="alert" className="mt-3 text-[12px] text-[#b42318]">{copy.unavailable}</p> : null}
          {status !== "error" && query.trim() && catalog ? (
            <div className="mt-2 max-h-[300px] overflow-y-auto rounded-xl border border-[#e2e6f0]" role="list" aria-label={copy.choose}>
              {suggestions.length ? suggestions.map((entry) => (
                <button key={entry.id} type="button" role="listitem" onClick={() => updateSelection(entry.id)}
                  disabled={!selectedIds.includes(entry.id) && selectedIds.length >= MAX_SELECTION}
                  className="flex w-full items-start gap-2 border-b border-[#f0f2f7] px-3 py-2.5 text-left hover:bg-[#f5f7ff] focus-visible:outline-2 focus-visible:outline-[#3b6ef8] disabled:opacity-40">
                  <span className="mt-0.5 text-[12px] text-[#3b6ef8]" aria-hidden="true">{selectedIds.includes(entry.id) ? "☑" : "□"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-medium text-[#262c43]">{entry.title}</span>
                    <span className="block truncate text-[10px] text-[#7c8099]">{entry.path}</span>
                  </span>
                  <span className="shrink-0 text-[10px] text-[#9aa1b2]">{entry.role === "leaf" ? "●" : "◇"}</span>
                </button>
              )) : <p className="px-3 py-3 text-[12px] text-[#7c8099]">{copy.empty}</p>}
            </div>
          ) : null}
          {selectedEntries.length ? (
            <div className="mt-3">
              <p className="mb-2 text-[11px] text-[#7c8099]">{copy.selected} ({selectedEntries.length}/{MAX_SELECTION})</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedEntries.map((entry) => (
                  <button type="button" key={entry.id} onClick={() => updateSelection(entry.id)}
                    className="inline-flex items-center gap-1 rounded-full border border-[#cbd7fa] bg-[#f6f8ff] px-2.5 py-1 text-[11px] text-[#3658b7] hover:bg-[#eef2ff]">
                    <span>{entry.title}</span><X className="h-3 w-3" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {selectedIds.length >= MAX_SELECTION ? <p className="mt-2 text-[11px] text-[#7c8099]">{copy.limit}</p> : null}
          {hasLegacyMetric ? <p className="mt-2 text-[11px] text-[#9a6a14]">{copy.metric}</p> : null}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <button type="button" onClick={() => navigate([])} className="text-[12px] text-[#667085] hover:underline">{copy.reset}</button>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setExpanded(false)} className="text-[12px] text-[#667085] hover:underline">{copy.collapse}</button>
              <button type="button" disabled={!selectedIds.length} onClick={() => navigate(selectedIds)}
                className="rounded-xl bg-[#3b6ef8] px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-[#315fd8] disabled:cursor-not-allowed disabled:opacity-40">{copy.apply}</button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

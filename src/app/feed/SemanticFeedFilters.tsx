"use client";

import { ChevronDown, Search, SlidersHorizontal, X, LoaderCircle, Globe2, Wallet, Route, Ruler } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import type { LocaleCode } from "@/i18n";

type OntologyEntry = {
  id: string;
  title: string;
  parentId: string | null;
  role: string;
  facet?: "geography" | null;
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

const EXTRA_LABEL: Record<LocaleCode, {
  geo: string; money: string; route: string; size: string; geoHint: string; pending: string; results: string;
  resetAll: string; unavailableTool: string; geoPick: string; remove: string;
}> = {
  ru: {geo:"Место",money:"Цена",route:"Маршрут",size:"Размер",geoHint:"Выберите страну, регион или город",pending:"Ищем публикации…",results:"Результаты поиска",resetAll:"Сбросить всё",unavailableTool:"Будет доступно после подключения параметров",geoPick:"Выбрать территорию",remove:"Убрать"},
  uk: {geo:"Місце",money:"Ціна",route:"Маршрут",size:"Розмір",geoHint:"Оберіть країну, регіон або місто",pending:"Шукаємо публікації…",results:"Результати пошуку",resetAll:"Скинути все",unavailableTool:"Буде доступно після підключення параметрів",geoPick:"Обрати територію",remove:"Прибрати"},
  en: {geo:"Place",money:"Price",route:"Route",size:"Size",geoHint:"Choose a country, region or city",pending:"Finding publications…",results:"Search results",resetAll:"Clear all",unavailableTool:"Available after parameter filters are connected",geoPick:"Choose a place",remove:"Remove"},
  pl: {geo:"Miejsce",money:"Cena",route:"Trasa",size:"Rozmiar",geoHint:"Wybierz kraj, region lub miasto",pending:"Szukamy publikacji…",results:"Wyniki wyszukiwania",resetAll:"Wyczyść wszystko",unavailableTool:"Dostępne po podłączeniu parametrów",geoPick:"Wybierz lokalizację",remove:"Usuń"},
  de: {geo:"Ort",money:"Preis",route:"Route",size:"Größe",geoHint:"Land, Region oder Stadt wählen",pending:"Beiträge werden gesucht…",results:"Suchergebnisse",resetAll:"Alles löschen",unavailableTool:"Nach Anschluss der Parameter verfügbar",geoPick:"Ort wählen",remove:"Entfernen"},
  es: {geo:"Lugar",money:"Precio",route:"Ruta",size:"Tamaño",geoHint:"Elige país, región o ciudad",pending:"Buscando publicaciones…",results:"Resultados de búsqueda",resetAll:"Borrar todo",unavailableTool:"Disponible al conectar los parámetros",geoPick:"Elegir lugar",remove:"Quitar"},
  cs: {geo:"Místo",money:"Cena",route:"Trasa",size:"Velikost",geoHint:"Vyberte zemi, region nebo město",pending:"Hledání příspěvků…",results:"Výsledky hledání",resetAll:"Vymazat vše",unavailableTool:"Dostupné po připojení parametrů",geoPick:"Vybrat místo",remove:"Odebrat"},
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
  initialMetric,
}: {
  locale: LocaleCode;
  initialObjectIds: string;
  hasLegacyMetric: boolean;
  initialMetric?: { min?: string; max?: string; unit?: string };
}) {
  const router = useRouter();
  const copy = LABEL[locale];
  const extras = EXTRA_LABEL[locale];
  const inputRef = useRef<HTMLInputElement | null>(null);
  const firstSuggestionRef = useRef<HTMLButtonElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const [geoStage, setGeoStage] = useState<0 | 1 | 2>(0);
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(() => extractIds(initialObjectIds));
  const [catalog, setCatalog] = useState<OntologyEntry[] | null>(() => {
    const known = cachedCatalog.get(locale);
    return known && Date.now() - known.at < CACHE_TTL_MS ? known.entries : null;
  });
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  // Resolve names of applied filters even when returning via a saved URL.
  // Load only when an active filter exists; regular feed stays lightweight.
  useEffect(() => {
    if (!initialObjectIds && !hasLegacyMetric) return;
    const known = cachedCatalog.get(locale);
    if (known && Date.now() - known.at < CACHE_TTL_MS) return;
    let cancelled = false;
    void fetch(`/api/feed/ontology-index?locale=${encodeURIComponent(locale)}`, {
      headers: { Accept: "application/json" },
    }).then(async response => {
      if (!response.ok) return null;
      const body = (await response.json()) as { ok?: boolean; entries?: OntologyEntry[] };
      return body.ok && Array.isArray(body.entries) ? body.entries : null;
    }).then(entries => {
      if (cancelled || !entries) return;
      cachedCatalog.set(locale, { entries, at: Date.now() });
      setCatalog(entries);
    }).catch(() => { /* Explicit on-demand retry remains available. */ });
    return () => { cancelled = true; };
  }, [initialObjectIds, hasLegacyMetric, locale]);

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

  const appliedIds = useMemo(() => extractIds(initialObjectIds), [initialObjectIds]);
  const geoAvailable = catalog === null || indexed.some(entry => entry.facet === "geography");

  const suggestions = useMemo(() => {
    const search = query.trim().toLocaleLowerCase(locale);
    if (!search && geoStage !== 2) return [];
    return indexed.filter((entry) => (geoStage !== 2 || entry.facet === "geography") && !selectedIds.includes(entry.id) && (!search || entry.searchText.includes(search)))
      .sort((a, b) => {
        const aScore = a.titleSearch.startsWith(search) ? 0 : a.titleSearch.includes(search) ? 1 : 2;
        const bScore = b.titleSearch.startsWith(search) ? 0 : b.titleSearch.includes(search) ? 1 : 2;
        return aScore - bScore || a.title.localeCompare(b.title, locale);
      }).slice(0, 12);
  }, [geoStage, indexed, locale, query, selectedIds]);

  function updateSelection(id: string) {
    setSelectedIds((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : current.length < MAX_SELECTION ? [...current, id] : current);
    setQuery("");
    inputRef.current?.focus();
  }

  function navigate(ids: string[], preserveMetric = false) {
    // Any manually supplied F3.1B numeric filter is cleared explicitly;
    // numeric controls are a separate upcoming stage, not a hidden condition.
    const url = new URL(window.location.href);
    url.pathname = "/feed";
    url.searchParams.set("locale", locale);
    for (const key of (preserveMetric ? ["lang", "on"] : ["lang", "metric", "parameter", "min", "max", "unit", "on"])) {
      url.searchParams.delete(key);
    }
    if (ids.length > 0) url.searchParams.set("on", ids.join(","));
    // Next App Router owns the request; keep the old results on screen until ready.
    startTransition(() => router.push(`${url.pathname}${url.search}`));
  }

  return (
    <div className="mb-3 space-y-2">
      <section className="rounded-2xl border border-[#e2e6f0] bg-white px-3 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.02)] sm:px-4">
        <button type="button" aria-expanded={expanded} aria-controls="arctor-feed-search-panel"
          onClick={() => { if (!expanded) void loadCatalog(); setExpanded(value => !value); }}
          className="flex w-full items-center gap-2 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-[#3b6ef8]">
          {isPending ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-[#3b6ef8]" aria-hidden="true" /> : <Search className="h-4 w-4 shrink-0 text-[#3b6ef8]" aria-hidden="true" />}
          <span className="flex-1 text-[13px] text-[#565d74]">{copy.prompt}</span>
          {appliedIds.length > 0 ? <span className="rounded-full bg-[#eef2ff] px-2 py-0.5 text-[11px] text-[#365cce]">{appliedIds.length}</span> : null}
          <SlidersHorizontal className="h-4 w-4 text-[#7c879d]" aria-hidden="true" />
          <ChevronDown className={`h-4 w-4 text-[#7c879d] transition ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>

        {expanded ? (
          <div id="arctor-feed-search-panel" className="mt-3 space-y-3 border-t border-[#edf0f5] pt-3">
            <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-xl border border-[#dfe3f1] p-1.5 focus-within:border-[#9db3ff] focus-within:ring-2 focus-within:ring-[#e7edff]">
              {selectedEntries.map(entry => (
                <span key={entry.id} className="inline-flex max-w-full items-center gap-1 rounded-full border border-[#cbd7fa] bg-[#f6f8ff] px-2 py-1 text-[12px] text-[#3658b7]">
                  <span className="max-w-[220px] truncate">{entry.title}</span>
                  <button type="button" aria-label={`${extras.remove}: ${entry.title}`} title={`${extras.remove}: ${entry.title}`}
                    onClick={() => updateSelection(entry.id)} className="rounded-full p-0.5 hover:bg-[#e3eaff] focus-visible:outline-2 focus-visible:outline-[#3b6ef8]">
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </span>
              ))}
              <label htmlFor="arctor-feed-ontology-search" className="sr-only">{copy.prompt}</label>
              <input ref={inputRef} id="arctor-feed-ontology-search" value={query}
                onChange={event => setQuery(event.target.value)}
                onKeyDown={event => {
                  if (event.key === "ArrowDown" && suggestions.length > 0) { event.preventDefault(); firstSuggestionRef.current?.focus(); }
                  if (event.key === "Enter" && suggestions.length > 0) { event.preventDefault(); updateSelection(suggestions[0].id); }
                  if (event.key === "Escape") { setQuery(""); setGeoStage(0); }
                  if (event.key === "Backspace" && !query && selectedIds.length) setSelectedIds(current => current.slice(0, -1));
                }}
                autoComplete="off" placeholder={selectedIds.length ? copy.choose : copy.prompt}
                className="min-w-[150px] flex-1 border-0 bg-transparent px-2 py-1.5 text-[13px] text-[#252c43] outline-none placeholder:text-[#9ca3b8]" />
            </div>

            {status === "loading" ? <p role="status" className="flex items-center gap-2 text-[12px] text-[#7c8099]"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />{copy.loading}</p> : null}
            {status === "error" ? <p role="alert" className="text-[12px] text-[#b42318]">{copy.unavailable}</p> : null}

            {status !== "error" && catalog && (query.trim() || geoStage === 2) ? (
              <div className="max-h-[260px] overflow-y-auto rounded-xl border border-[#e2e6f0]" aria-label={copy.choose}>
                {suggestions.length ? suggestions.map((entry, index) => (
                  <button key={entry.id} ref={index === 0 ? firstSuggestionRef : undefined} type="button"
                    onClick={() => updateSelection(entry.id)}
                    disabled={selectedIds.length >= MAX_SELECTION}
                    className="flex w-full items-start gap-2 border-b border-[#f0f2f7] px-3 py-2.5 text-left hover:bg-[#f5f7ff] focus-visible:outline-2 focus-visible:outline-[#3b6ef8] disabled:opacity-40">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-medium text-[#262c43]">{entry.title}</span>
                      <span className="block truncate text-[10px] text-[#7c8099]">{entry.path}</span>
                    </span>
                    <span className="shrink-0 text-[10px] text-[#9aa1b2]">{entry.role === "leaf" ? "●" : "◇"}</span>
                  </button>
                )) : <p className="px-3 py-3 text-[12px] text-[#7c8099]">{copy.empty}</p>}
              </div>
            ) : null}

            {/* Stage 1 reveals a caption, stage 2 opens actual ON-based geography choices. */}
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" aria-label={extras.geo} title={extras.geo}
                disabled={!geoAvailable}
                onClick={() => {
                  if (geoStage === 0) { setGeoStage(1); void loadCatalog(); }
                  else if (geoStage === 1) { setGeoStage(2); inputRef.current?.focus(); }
                  else { setGeoStage(1); }
                }}
                aria-expanded={geoStage === 2}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[12px] transition focus-visible:outline-2 focus-visible:outline-[#3b6ef8] disabled:opacity-35 ${geoStage ? "border-[#aebfe9] bg-[#f4f7ff] text-[#315fd8]" : "border-[#dfe3f1] text-[#47516b]"}`}>
                <Globe2 className="h-4 w-4" aria-hidden="true" />
                {geoStage > 0 ? <><span>{extras.geo}</span><ChevronDown className={`h-3 w-3 ${geoStage === 2 ? "rotate-180" : ""}`} aria-hidden="true" /></> : null}
              </button>
              {([
                { label: extras.money, Icon: Wallet },
                { label: extras.route, Icon: Route },
                { label: extras.size, Icon: Ruler },
              ] as const).map(({ label, Icon }) => (
                <button key={label} type="button" aria-label={`${label}: ${extras.unavailableTool}`}
                  title={`${label}: ${extras.unavailableTool}`} disabled
                  className="inline-flex min-h-9 items-center rounded-full border border-[#edf0f5] px-2.5 py-1.5 text-[#bdc3d0] opacity-60">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </button>
              ))}
            </div>
            {geoStage === 2 ? <p className="text-[11px] text-[#667085]">{extras.geoHint}</p> : null}
            {selectedIds.length >= MAX_SELECTION ? <p className="text-[11px] text-[#7c8099]">{copy.limit}</p> : null}
            {hasLegacyMetric ? <p className="text-[11px] text-[#9a6a14]">{copy.metric}</p> : null}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button type="button" disabled={isPending} onClick={() => navigate([])} className="text-[12px] text-[#667085] hover:underline disabled:opacity-50">{extras.resetAll}</button>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setExpanded(false)} className="text-[12px] text-[#667085] hover:underline">{copy.collapse}</button>
                <button type="button" disabled={!selectedIds.length || isPending} onClick={() => navigate(selectedIds)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#3b6ef8] px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-[#315fd8] disabled:cursor-not-allowed disabled:opacity-40">
                  {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />}
                  {isPending ? extras.pending : copy.apply}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {isPending ? (
        <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-xl border border-[#dbe5ff] bg-[#f6f8ff] px-3 py-2 text-[12px] text-[#3658b7]">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> {extras.pending}
        </div>
      ) : null}

      {(appliedIds.length > 0 || hasLegacyMetric) ? (
        <div className="rounded-xl border border-[#e2e6f0] bg-white px-3 py-2" aria-label={extras.results}>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[12px] font-semibold text-[#334155]">{extras.results}</span>
            <button type="button" disabled={isPending} className="text-[11px] text-[#3b6ef8] hover:underline disabled:opacity-50" onClick={() => navigate([])}>{extras.resetAll}</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {appliedIds.map(id => {
              const entry = indexed.find(item => item.id === id);
              return (
                <button key={id} type="button" disabled={isPending} title={entry?.path} aria-label={`${extras.remove}: ${entry?.title ?? id}`}
                  onClick={() => navigate(appliedIds.filter(current => current !== id), hasLegacyMetric)}
                  className="inline-flex items-center gap-1 rounded-full border border-[#cbd7fa] bg-[#f6f8ff] px-2 py-1 text-[11px] text-[#3658b7] disabled:opacity-50">
                  <span>{entry?.title ?? `${id.slice(0, 8)}…`}</span> <X className="h-3 w-3" aria-hidden="true" />
                </button>
              );
            })}
            {hasLegacyMetric ? <span className="rounded-full border border-[#dfe3f1] bg-[#f8faff] px-2 py-1 text-[11px] text-[#47516b]">
              {`${initialMetric?.min || "…"}–${initialMetric?.max || "…"} ${initialMetric?.unit?.toUpperCase() ?? ""}`}
            </span> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

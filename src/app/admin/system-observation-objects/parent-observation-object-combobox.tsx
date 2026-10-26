"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

type Locale = "ru" | "uk" | "pl" | "en" | "de" | "es" | "cs";
type Parent = { id: string; title: string; role: string; parentId: string | null };
type IndexedParent = Parent & { path: string; titleKey: string; searchKey: string };

const I18N: Record<Locale, { placeholder: string; empty: string; noMatches: string; loading: string; clear: string; selected: string; root: string; intermediate: string }> = {
  ru: {placeholder:"Начните вводить название ОН…",empty:"Нет доступных родительских ОН",noMatches:"Совпадений не найдено",loading:"Загружаем родительские ОН…",clear:"Очистить выбор",selected:"Выбранный родитель",root:"Корневой",intermediate:"Промежуточный"},
  uk: {placeholder:"Почніть вводити назву ОН…",empty:"Немає доступних батьківських ОН",noMatches:"Збігів не знайдено",loading:"Завантажуємо батьківські ОН…",clear:"Очистити вибір",selected:"Обраний батьківський об'єкт",root:"Кореневий",intermediate:"Проміжний"},
  pl: {placeholder:"Wpisz początek nazwy obiektu…",empty:"Brak dostępnych obiektów nadrzędnych",noMatches:"Brak wyników",loading:"Ładowanie obiektów nadrzędnych…",clear:"Wyczyść wybór",selected:"Wybrany obiekt nadrzędny",root:"Główny",intermediate:"Pośredni"},
  en: {placeholder:"Start typing an object name…",empty:"No eligible parent objects",noMatches:"No matches found",loading:"Loading parent objects…",clear:"Clear selection",selected:"Selected parent",root:"Root",intermediate:"Intermediate"},
  de: {placeholder:"Anfang des Objektnamens eingeben…",empty:"Keine passenden Elternobjekte",noMatches:"Keine Treffer",loading:"Elternobjekte werden geladen…",clear:"Auswahl löschen",selected:"Ausgewähltes Elternobjekt",root:"Wurzel",intermediate:"Zwischenknoten"},
  es: {placeholder:"Empiece a escribir el nombre del objeto…",empty:"No hay objetos padre disponibles",noMatches:"No se encontraron coincidencias",loading:"Cargando objetos padre…",clear:"Borrar selección",selected:"Objeto padre seleccionado",root:"Raíz",intermediate:"Intermedio"},
  cs: {placeholder:"Začněte psát název objektu…",empty:"Žádné dostupné nadřazené objekty",noMatches:"Žádné shody",loading:"Načítání nadřazených objektů…",clear:"Vymazat výběr",selected:"Vybraný nadřazený objekt",root:"Kořen",intermediate:"Mezilehlý"},
};

function normalizeSearch(value: string, locale: Locale) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase(locale);
}

export function ParentObservationObjectCombobox({
  inputId, locale, options, selectedId, onSelect, disabled, loading,
}: {
  inputId: string;
  locale: Locale;
  options: Parent[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled: boolean;
  loading: boolean;
}) {
  const copy = I18N[locale];
  const ref = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const indexed = useMemo<IndexedParent[]>(() => {
    const byId = new Map(options.map((item) => [item.id, item]));
    return options.map((item) => {
      const ancestorNames: string[] = [];
      let cursor = item.parentId;
      const visited = new Set([item.id]);
      for (let depth = 0; depth < 32 && cursor && !visited.has(cursor); depth += 1) {
        visited.add(cursor);
        const ancestor = byId.get(cursor);
        if (!ancestor) break;
        ancestorNames.unshift(ancestor.title);
        cursor = ancestor.parentId;
      }
      const path = ancestorNames.join(" › ");
      return { ...item, path, titleKey: normalizeSearch(item.title, locale), searchKey: normalizeSearch(`${path} ${item.title}`, locale) };
    });
  }, [options, locale]);

  const selected = indexed.find((item) => item.id === selectedId) ?? null;
  const suggestions = useMemo(() => {
    const term = normalizeSearch(query.trim(), locale);
    return indexed.filter((item) => item.searchKey.includes(term))
      .sort((a, b) => {
        const score = (item: IndexedParent) => !term ? 0 : item.titleKey.startsWith(term) ? 0 : item.titleKey.includes(term) ? 1 : 2;
        return score(a) - score(b) || a.title.localeCompare(b.title, locale);
      }).slice(0, 12);
  }, [indexed, locale, query]);

  useEffect(() => {
    if (!open) return;
    const outsideClick = (event: PointerEvent) => {
      if (ref.current && event.target instanceof Node && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", outsideClick);
    return () => document.removeEventListener("pointerdown", outsideClick);
  }, [open]);

  const select = (id: string) => {
    onSelect(id);
    setQuery("");
    setActiveIndex(0);
    setOpen(false);
    input.current?.focus();
  };

  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") { setOpen(false); setQuery(""); return; }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!open) { setOpen(true); setActiveIndex(0); event.preventDefault(); return; }
      if (!suggestions.length) return;
      event.preventDefault();
      setActiveIndex((current) => (current + (event.key === "ArrowDown" ? 1 : suggestions.length - 1)) % suggestions.length);
    }
    if (event.key === "Enter" && open && suggestions.length) {
      event.preventDefault();
      select(suggestions[Math.min(activeIndex, suggestions.length - 1)].id);
    }
  };

  return <div ref={ref} className="relative mt-1">
    <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2 py-1.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
      <Search className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
      {selected ? <span className="inline-flex max-w-full items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-xs text-blue-900">
        <span className="max-w-[220px] truncate" title={selected.title}>{selected.title}</span>
        <button type="button" disabled={disabled} onClick={() => { onSelect(""); setOpen(true); input.current?.focus(); }}
          className="rounded p-0.5 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-blue-600" aria-label={copy.clear} title={copy.clear}>
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </span> : null}
      <input ref={input} id={inputId} type="text" role="combobox" aria-autocomplete="list" aria-expanded={open && !loading && !disabled}
        aria-controls={listId} aria-activedescendant={open && suggestions.length ? `${listId}-item-${Math.min(activeIndex, suggestions.length - 1)}` : undefined}
        value={query} disabled={loading || disabled} autoComplete="off"
        placeholder={loading ? copy.loading : copy.placeholder}
        onFocus={() => { setOpen(true); setActiveIndex(0); }}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); setActiveIndex(0); }}
        onKeyDown={keyDown}
        className="min-w-[135px] flex-1 border-0 bg-transparent px-1 py-1.5 text-[13px] text-slate-900 outline-none placeholder:text-slate-400" />
      <button type="button" aria-label={copy.placeholder} disabled={loading || disabled} aria-expanded={open}
        onClick={() => { setOpen((current) => !current); setActiveIndex(0); input.current?.focus(); }}
        className="shrink-0 rounded-md p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50">
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
    {selected && !open ? <p className="mt-1 truncate text-[11px] text-slate-500" title={selected.path}>
      {copy.selected}: {selected.path ? `${selected.path} › ` : ""}{selected.title}
    </p> : null}
    {open && !loading && !disabled ? <div id={listId} role="listbox" aria-label={copy.placeholder}
      className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[290px] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
      {suggestions.length ? suggestions.map((entry, index) => (
        <button type="button" role="option" aria-selected={entry.id === selectedId} id={`${listId}-item-${index}`} key={entry.id}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => select(entry.id)}
          className={`block w-full border-b border-slate-100 px-3 py-2.5 text-left last:border-b-0 ${index === activeIndex ? "bg-blue-50" : "hover:bg-slate-50"}`}>
          <span className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-900">{entry.title}</span>
            {entry.id === selectedId ? <Check className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" /> : null}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-slate-500" title={entry.path}>
            {entry.path || (entry.role === "root" ? copy.root : copy.intermediate)}
          </span>
        </button>
      )) : <p className="px-3 py-3 text-xs text-slate-500">{options.length ? copy.noMatches : copy.empty}</p>}
    </div> : null}
  </div>;
}

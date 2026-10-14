"use client";

import { BookmarkPlus, LoaderCircle, Plus, X, Check, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import type { LocaleCode } from "@/i18n";

export type SavedSearchFilters = {
  on: string;
  metric: string;
  money?: string;
  parameter: string;
  min: string;
  max: string;
  unit: string;
};

type SavedTab = {
  id: string;
  title: string;
  filters: SavedSearchFilters;
  createdAt: string;
};

type Copy = {
  all: string; save: string; title: string; confirm: string; cancel: string;
  rename: string; remove: string; loading: string; error: string;
  signIn: string; max: string; saving: string;
};

const TEXT: Record<LocaleCode, Copy> = {
  ru: { all:"Все",save:"Сохранить поиск",title:"Название вкладки",confirm:"Сохранить",cancel:"Отмена",rename:"Переименовать",remove:"Удалить вкладку",loading:"Загружаем вкладки…",error:"Не удалось загрузить или сохранить вкладки",signIn:"Войдите, чтобы сохранять поиск",max:"Максимум 20 вкладок",saving:"Сохраняем…" },
  uk: { all:"Усі",save:"Зберегти пошук",title:"Назва вкладки",confirm:"Зберегти",cancel:"Скасувати",rename:"Перейменувати",remove:"Видалити вкладку",loading:"Завантажуємо вкладки…",error:"Не вдалося завантажити або зберегти вкладки",signIn:"Увійдіть, щоб зберігати пошук",max:"Не більше 20 вкладок",saving:"Зберігаємо…" },
  pl: { all:"Wszystkie",save:"Zapisz wyszukiwanie",title:"Nazwa karty",confirm:"Zapisz",cancel:"Anuluj",rename:"Zmień nazwę",remove:"Usuń kartę",loading:"Ładowanie kart…",error:"Nie udało się pobrać ani zapisać kart",signIn:"Zaloguj się, aby zapisać wyszukiwanie",max:"Maksymalnie 20 kart",saving:"Zapisywanie…" },
  en: { all:"All",save:"Save search",title:"Tab name",confirm:"Save",cancel:"Cancel",rename:"Rename",remove:"Remove tab",loading:"Loading tabs…",error:"Unable to load or save tabs",signIn:"Sign in to save searches",max:"Maximum 20 tabs",saving:"Saving…" },
  de: { all:"Alle",save:"Suche speichern",title:"Tab-Name",confirm:"Speichern",cancel:"Abbrechen",rename:"Umbenennen",remove:"Tab löschen",loading:"Tabs werden geladen…",error:"Tabs konnten nicht geladen oder gespeichert werden",signIn:"Zum Speichern anmelden",max:"Maximal 20 Tabs",saving:"Speichere…" },
  es: { all:"Todos",save:"Guardar búsqueda",title:"Nombre de pestaña",confirm:"Guardar",cancel:"Cancelar",rename:"Renombrar",remove:"Eliminar pestaña",loading:"Cargando pestañas…",error:"No se pudieron cargar o guardar pestañas",signIn:"Inicia sesión para guardar búsquedas",max:"Máximo 20 pestañas",saving:"Guardando…" },
  cs: { all:"Vše",save:"Uložit hledání",title:"Název karty",confirm:"Uložit",cancel:"Zrušit",rename:"Přejmenovat",remove:"Smazat kartu",loading:"Načítání karet…",error:"Karty nelze načíst ani uložit",signIn:"Pro uložení hledání se přihlaste",max:"Nejvýše 20 karet",saving:"Ukládání…" },
};

const FIELDS: Array<keyof SavedSearchFilters> = ["on", "metric", "parameter", "min", "max", "unit", "money"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function keyOf(value: SavedSearchFilters) {
  const ids = value.on.split(",").map(x => x.trim()).filter(x => UUID_RE.test(x));
  return JSON.stringify({
    on: [...new Set(ids)].sort().join(","),
    metric: value.metric || "", money: value.money || "", parameter: value.parameter || "",
    min: value.min || "", max: value.max || "", unit: (value.unit || "").toLowerCase(),
  });
}

function isFilterPresent(value: SavedSearchFilters) {
  return Boolean(value.on || value.metric || value.money);
}

export default function SavedFeedSearchTabs({
  locale, enabled, activeFilters,
}: {
  locale: LocaleCode;
  enabled: boolean;
  activeFilters: SavedSearchFilters;
}) {
  const copy = TEXT[locale];
  const router = useRouter();
  const [tabs, setTabs] = useState<SavedTab[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<"save" | "rename" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [isNavigating, startTransition] = useTransition();

  useEffect(() => {
    if (!enabled) return;
    const abort = new AbortController();
    let live = true;
    void fetch("/api/feed/saved-searches", {
      method:"GET", headers:{Accept:"application/json"},
      cache:"no-store", signal:abort.signal,
    }).then(async response => {
      const payload = await response.json() as {ok?:boolean;tabs?:SavedTab[]};
      if (!response.ok || !payload.ok || !Array.isArray(payload.tabs)) throw new Error("READ_ERROR");
      if (live) setTabs(payload.tabs);
    }).catch(() => { if(live) setError(copy.error); })
      .finally(() => { if (live) setLoading(false); });
    return () => {live=false;abort.abort();};
  }, [enabled, copy.error]);

  const currentKey = useMemo(() => keyOf(activeFilters), [activeFilters]);
  const activeTab = tabs.find(tab => keyOf(tab.filters) === currentKey);

  function navigate(filters: SavedSearchFilters | null) {
    const url = new URL(window.location.href);
    url.pathname = "/feed";
    for (const field of [...FIELDS, "lang"]) url.searchParams.delete(field);
    url.searchParams.set("locale", locale);
    if (filters) for (const field of FIELDS) {
      const value = filters[field];
      if (value) url.searchParams.set(field, value);
    }
    setError("");
    startTransition(() => router.push(`${url.pathname}${url.search}`));
  }

  async function send(method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>) {
    const response = await fetch("/api/feed/saved-searches", {
      method, headers:{"Content-Type":"application/json",Accept:"application/json"},
      body:JSON.stringify(body),cache:"no-store",
    });
    const payload = await response.json() as {ok?:boolean;tab?:SavedTab;error?:string};
    if (!response.ok || !payload.ok) throw new Error(payload.error || "WRITE_ERROR");
    return payload;
  }

  async function saveOrRename() {
    const title = name.trim();
    if (!title || title.length > 80 || busy) return;
    setBusy(true);
    setError("");
    try {
      if (editing === "save") {
        const result = await send("POST", {title,filters:activeFilters});
        if (!result.tab) throw new Error("MISSING_TAB");
        setTabs(old => [...old,result.tab as SavedTab]);
      } else if (editing === "rename" && editingId) {
        await send("PATCH",{id:editingId,title});
        setTabs(old => old.map(t=>t.id===editingId?{...t,title}:t));
      }
      setEditing(null);setEditingId(null);setName("");
    } catch {setError(copy.error);} finally {setBusy(false);}
  }

  async function deleteTab(id: string) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      await send("DELETE",{id});
      setTabs(old => old.filter(tab => tab.id !== id));
      setEditing(null);
    } catch {setError(copy.error);} finally {setBusy(false);}
  }

  if (!enabled) return null;
  return (
    <div className="mb-3 space-y-2 rounded-xl border border-[#e2e6f0] bg-white px-2 py-2 sm:px-3" aria-label={copy.save}>
      <div className="flex min-w-0 items-center gap-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5">
          <button type="button" onClick={()=>navigate(null)} disabled={isNavigating}
            className={`shrink-0 rounded-lg px-3 py-2 text-[12px] font-medium ${!isFilterPresent(activeFilters)?"bg-[#e9efff] text-[#315bd0]":"text-[#647087] hover:bg-[#f5f7fb]"}`}>
            {copy.all}
          </button>
          {tabs.map(tab=>(
            <div key={tab.id} className={`group flex shrink-0 items-center rounded-lg border ${activeTab?.id===tab.id?"border-[#9bb6ff] bg-[#edf2ff]":"border-[#e8eaf1] bg-[#fafbfe]"}`}>
              <button type="button" disabled={isNavigating} onClick={()=>navigate(tab.filters)}
                onDoubleClick={()=>{setEditing("rename");setEditingId(tab.id);setName(tab.title);}}
                title={tab.title}
                className="max-w-[170px] truncate py-2 pl-3 pr-1 text-[12px] text-[#334155] focus-visible:outline-2 focus-visible:outline-[#3b6ef8]">
                {tab.title}
              </button>
              <button type="button" onClick={()=>{setEditing("rename");setEditingId(tab.id);setName(tab.title);}}
                title={copy.rename} aria-label={`${copy.rename}: ${tab.title}`} className="p-1 text-[#8c95aa] hover:text-[#315bd0]">
                <Pencil className="h-3 w-3" aria-hidden="true" />
              </button>
              <button type="button" disabled={busy} onClick={()=>void deleteTab(tab.id)}
                title={copy.remove} aria-label={`${copy.remove}: ${tab.title}`} className="p-1 pr-2 text-[#8c95aa] hover:text-[#b42318]">
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
          ))}
          {loading ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-[#8c95aa]" aria-label={copy.loading}/> : null}
        </div>
        {isFilterPresent(activeFilters) && tabs.length < 20 ? (
          <button type="button" disabled={busy} title={copy.save} aria-label={copy.save}
            onClick={()=>{setEditing("save");setEditingId(null);setName("");}}
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-[#dbe3f7] px-2 text-[12px] text-[#3b6ef8] hover:bg-[#f4f7ff]">
            <BookmarkPlus className="h-4 w-4" aria-hidden="true" /> <Plus className="h-3 w-3" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {editing ? <form onSubmit={event=>{event.preventDefault();void saveOrRename();}} className="flex flex-wrap items-center gap-2 border-t border-[#eff1f6] pt-2">
        <input autoFocus maxLength={80} value={name} onChange={event=>setName(event.target.value)}
          placeholder={copy.title} aria-label={copy.title}
          className="min-w-[150px] flex-1 rounded-lg border border-[#dbe3f7] px-3 py-2 text-[12px] outline-none focus:border-[#9bb6ff]"/>
        <button type="submit" disabled={busy||!name.trim()} className="inline-flex items-center gap-1 rounded-lg bg-[#3b6ef8] px-3 py-2 text-[12px] text-white disabled:opacity-50">
          {busy?<LoaderCircle className="h-3.5 w-3.5 animate-spin"/>:<Check className="h-3.5 w-3.5"/>}{busy?copy.saving:copy.confirm}
        </button>
        <button type="button" onClick={()=>{setEditing(null);setName("");}} className="text-[12px] text-[#667085]">{copy.cancel}</button>
      </form> : null}
      {error ? <p role="alert" className="px-1 text-[11px] text-[#b42318]">{error}</p> : null}
      {tabs.length >= 20 ? <p className="px-1 text-[11px] text-[#8c95aa]">{copy.max}</p> : null}
      {isNavigating ? <p role="status" className="flex items-center gap-2 text-[11px] text-[#5067a5]"><LoaderCircle className="h-3.5 w-3.5 animate-spin"/>{copy.loading}</p>:null}
    </div>
  );
}

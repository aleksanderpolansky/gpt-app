"use client";
import { useCallback, useEffect, useState } from "react";
import type { GovernanceRuleDraftV1 } from "@/lib/ai/governanceRulePreviewV1";

type Entry = { code: string; locale: string; revision: number; updatedAt: string; status: string; rule: GovernanceRuleDraftV1 };
type Revision = { revision: number; action: string | null; createdAt: string; rule: GovernanceRuleDraftV1 };
type Payload = { ok?: boolean; errorCode?: string; drafts?: Entry[]; history?: Revision[]; canEdit?: boolean };
const API = "/api/admin/ai-governance/drafts";
const baseClass = "mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100";
export default function GovernanceDraftsClient({ draft, onLoad }: {draft: GovernanceRuleDraftV1; onLoad: (r: GovernanceRuleDraftV1) => void}) {
  const [code, setCode] = useState("activity_one");
  const [items, setItems] = useState<Entry[]>([]);
  const [history, setHistory] = useState<Revision[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Загрузка реестра черновиков...");

  const refresh = useCallback(async (selectedCode?: string, selectedLocale?: string) => {
    const query = selectedCode && selectedLocale ? `?code=${encodeURIComponent(selectedCode)}&locale=${encodeURIComponent(selectedLocale)}` : "";
    let res: Response;
    try {
      res = await fetch(API + query, {cache:"no-store", credentials:"same-origin"});
    } catch (error) {
      setMessage(`Ошибка связи: ${error instanceof Error ? error.name : "NETWORK_ERROR"}`);
      throw error;
    }
    const data: Payload = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      const error = new Error(data.errorCode || `HTTP_${res.status}`);
      setMessage(`Не удалось загрузить черновики: ${error.message}`);
      throw error;
    }
    if (query) setHistory(data.history ?? []);
    else { setItems(data.drafts ?? []); setMessage("Черновики загружены"); }
    setCanEdit(!!data.canEdit);
    return data;
  }, []);
  // Data loading is asynchronous; don't synchronously set state from the effect.
  // Fetch in an asynchronous callback; do not call a state-mutating helper
  // synchronously from an effect (react-hooks/set-state-in-effect).
  useEffect(() => {
    const controller = new AbortController();
    void fetch(API, {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data: Payload = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) {
          throw new Error(data.errorCode || `HTTP_${response.status}`);
        }
        return data;
      })
      .then(
        (data) => {
          if (controller.signal.aborted) return;
          setItems(data.drafts ?? []);
          setCanEdit(!!data.canEdit);
          setMessage("Черновики загружены");
        },
        (error: unknown) => {
          if (!controller.signal.aborted) setMessage(String(error));
        },
      );
    return () => controller.abort();
  }, []);

  async function openEntry(entry: Entry) {
    setCode(entry.code); onLoad(entry.rule); setMessage(`Черновик ${entry.code} · ревизия ${entry.revision}`);
    try { await refresh(entry.code, entry.locale); } catch(e) { setMessage(String(e)); }
  }
  async function save(rule: GovernanceRuleDraftV1, action: "save" | "restore") {
    if (!canEdit || busy) return;
    if (!/^[a-z][a-z0-9_]{2,48}$/.test(code)) { setMessage("Код: латинские строчные буквы, цифры, _, от 3 до 49 символов"); return; }
    setBusy(true);
    try {
      const exact = items.find(item => item.code === code && item.locale === rule.locale);
      const response = await fetch(API, { method:"PUT", credentials:"same-origin",
        headers:{"Content-Type":"application/json"}, body:JSON.stringify({code, rule, action, expectedRevision:exact?.revision ?? 0}) });
      const data: Payload & {revision?: number} = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.errorCode || `HTTP_${response.status}`);
      await refresh(); await refresh(code,rule.locale);
      setMessage(`Сохранено: ${code} · ревизия ${data.revision}. Только архивный черновик, не runtime.`);
    } catch(e) { setMessage(`Остановлено: ${e instanceof Error ? e.message : "UNKNOWN"}. Проверьте ревизию и обновите список.`); }
    finally { setBusy(false); }
  }
  async function restore(revision: Revision) {
    if (!window.confirm(`Восстановить ревизию ${revision.revision} как НОВУЮ версию черновика ${code}? Runtime не меняется.`)) return;
    onLoad(revision.rule);
    await save(revision.rule,"restore");
  }
  return <section className="rounded-2xl border border-violet-700 bg-slate-900/70 p-5" id="draft-storage">
    <h2 className="text-lg font-bold">4 · Сохранённые черновики правил и история (MVP 2)</h2>
    <p className="mt-2 text-sm text-slate-300">Хранилище только администратора. Значение «персональное» описывает шаблон для будущей настройки пользователя, а НЕ создаёт персональное правило конкретного человека. Ни один черновик не подключён к исполнению.</p>
    <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
      <label className="text-xs text-slate-300">Код черновика (уникален в пределах языка)
        <input className={baseClass} value={code} maxLength={49} onChange={e=>setCode(e.target.value)}/>
      </label>
      <button type="button" onClick={()=>void refresh().then(()=>setMessage("Список обновлён"),e=>setMessage(String(e)))} className="rounded-lg border border-slate-500 px-3 py-2 text-sm">Обновить</button>
    </div>
    <p className="mt-2 text-xs text-amber-200">Действующая форма симулятора выше — источник сохраняемого черновика. При сохранении выполняются контроль версии и атомарная запись истории.</p>
    <div className="mt-3 flex flex-wrap gap-2">
      <button disabled={!canEdit || busy} onClick={()=>void save(draft,"save")} className="rounded-lg bg-violet-700 px-3 py-2 text-sm text-white disabled:opacity-40">{busy?"Сохраняю...":"Сохранить новую ревизию (неактивно)"}</button>
    </div>
    <p role="status" aria-live="polite" className="mt-3 text-xs text-cyan-200">{message}</p>
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      <div className="rounded-lg border border-slate-700 p-3">
        <h3 className="font-semibold">Черновики</h3>
        {items.length===0 && <p className="mt-2 text-xs text-slate-400">Пока нет сохранённых черновиков.</p>}
        {items.map(item=><button key={`${item.code}_${item.locale}`} type="button" onClick={()=>void openEntry(item)} className="mt-2 block w-full rounded border border-slate-700 px-3 py-2 text-left text-xs hover:border-violet-400">
          <b>{item.code}</b> · {item.locale} · ревизия {item.revision} · НЕАКТИВНО
        </button>)}
      </div>
      <div className="rounded-lg border border-slate-700 p-3">
        <h3 className="font-semibold">История выбранного черновика</h3>
        <p className="mt-1 text-xs text-slate-400">Восстановление создаёт новую ревизию; история не перезаписывается.</p>
        {history.map(r=><div key={r.revision} className="mt-2 flex items-center justify-between gap-2 rounded border border-slate-700 px-2 py-2 text-xs">
          <span>v{r.revision} · {r.action || "save"}</span>
          <button type="button" onClick={()=>void restore(r)} disabled={!canEdit || busy} className="rounded border border-violet-500 px-2 py-1 disabled:opacity-40">Восстановить</button>
        </div>)}
      </div>
    </div>
    <p className="mt-3 text-xs text-amber-200">Не используется runtime; не изменяет activity_event, цены, пользовательские настройки, AI EUR и системные ограничения.</p>
  </section>;
}

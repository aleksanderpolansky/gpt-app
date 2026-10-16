"use client";

import { useEffect, useMemo, useState } from "react";

type SourceKind = "activity_template" | "public_message";
type Source = { id: string; kind: SourceKind; title: string };
type Case = {
  id: string; case_code: string; title: string; status: string;
  source_system: string; source_entity_kind: string | null; source_external_id: string | null;
};
type Reply = { ok: boolean; contract?: string; sources?: Source[]; errorCode?: string; alreadyLinked?: boolean };
const CONTRACT = "ARCTOR_ADM4A_SOURCE_LINK_V1";

export default function ArctorAdminSourceLinks({ cases, onChanged }: { cases: Case[]; onChanged: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [caseId, setCaseId] = useState("");
  const [sourceKind, setSourceKind] = useState<SourceKind>("activity_template");
  const [sourceId, setSourceId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!expanded) return;
    const controller = new AbortController();
    void fetch("/api/admin/management/sources", { cache: "no-store", credentials: "same-origin", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json() as Reply;
        if (!response.ok || !data.ok || data.contract !== CONTRACT || !Array.isArray(data.sources)) {
          throw new Error(`${data.errorCode ?? "SOURCE_DISCOVERY_FAILED"} (HTTP ${response.status})`);
        }
        if (!controller.signal.aborted) { setSources(data.sources); setError(""); }
      })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Не удалось загрузить источники"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [expanded]);

  const eligibleCases = useMemo(() => cases.filter((c) =>
    !["closed", "cancelled"].includes(c.status) && !c.source_entity_kind && !c.source_external_id
    && ["admin_console", "manual"].includes(c.source_system)), [cases]);
  const filtered = useMemo(() => sources.filter((s) => s.kind === sourceKind), [sources, sourceKind]);

  async function linkSource() {
    if (!caseId || !sourceId || busy) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      const response = await fetch("/api/admin/management/sources", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, sourceKind, sourceId }),
      });
      const data = await response.json() as Reply;
      if (!response.ok || data.ok !== true || data.contract !== CONTRACT) {
        throw new Error(`${data.errorCode ?? "BIND_FAILED"} (HTTP ${response.status})`);
      }
      setSuccess(data.alreadyLinked ? "Связь уже существовала; повторной записи нет." : "Источник проверен и привязан. Событие добавлено в историю дела.");
      setCaseId(""); setSourceId("");
      onChanged();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Ошибка связывания"); }
    finally { setBusy(false); }
  }

  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 md:p-4" data-arctor-adm4a="true">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h3 className="text-sm font-semibold">ADM-4A · Проверенные первоисточники</h3>
        <p className="text-xs text-slate-600">Привязка дела к исходной записи без копирования её содержания. Только публичные публикации и системные открытые типовые активности.</p>
      </div>
      <button type="button" className="rounded-lg border bg-white px-3 py-2 text-sm" onClick={() => {
        if (!expanded) { setLoading(true); setError(""); }
        setExpanded(!expanded);
      }}>
        {expanded ? "Скрыть" : "Привязать источник"}
      </button>
    </div>
    {expanded && <div className="mt-3 grid gap-3">
      <p className="text-xs text-amber-800">Это первый подэтап ADM-4, не полный импорт рабочих очередей. Личные записи и служебные журналы сюда не попадают. Источник можно привязать только к ранее созданному делу без другой связи.</p>
      <label className="text-sm">Дело
        <select className="mt-1 w-full rounded-lg border bg-white p-2" value={caseId} onChange={(e) => { setCaseId(e.target.value); setError(""); }}>
          <option value="">Выберите дело</option>
          {eligibleCases.map((c) => <option key={c.id} value={c.id}>{c.case_code} — {c.title}</option>)}
        </select>
      </label>
      <label className="text-sm">Категория первоисточника
        <select className="mt-1 w-full rounded-lg border bg-white p-2" value={sourceKind} onChange={(e) => { setSourceKind(e.target.value as SourceKind); setSourceId(""); }}>
          <option value="activity_template">Открытые системные типовые активности</option>
          <option value="public_message">Действующие публичные публикации</option>
        </select>
      </label>
      <label className="text-sm">Исходная запись
        <select className="mt-1 w-full rounded-lg border bg-white p-2" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
          <option value="">{loading ? "Загрузка..." : filtered.length ? "Выберите запись" : "Записи этой категории не найдены"}</option>
          {filtered.map((s) => <option key={s.id} value={s.id}>{s.title} ({s.id.slice(0, 8)})</option>)}
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy || loading || !caseId || !sourceId}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          onClick={() => void linkSource()}>{busy ? "Сохраняем…" : "Подтвердить привязку"}</button>
        <span className="text-xs text-slate-600">Не создаёт новое дело, не запускает ИИ и не изменяет исходную запись.</span>
      </div>
      {error && <p role="alert" className="rounded border border-red-200 p-2 text-sm text-red-700">{error}</p>}
      {success && <p role="status" className="rounded border border-emerald-200 p-2 text-sm text-emerald-800">{success}</p>}
    </div>}
  </div>;
}

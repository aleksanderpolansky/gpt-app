"use client";

import { useState } from "react";
import type { OntoLocale } from "@/lib/ontology-research/ontologyResearchV1";

type Evidence = { term: string; field: string; locale: string; score: number; excerpt: string };
type DiagnosticRow = {
  rank: number; id: string; title: string; path: string; role: string; score: number;
  bestEvidence: Evidence | null; topEvidence: Evidence[]; scoreParity: boolean;
};
type EnhancedRow = {
  rank:number; id:string; title:string; path:string; role:string;
  facet:string; score:number; matchClass:string; matchedComponent:string;
  matchedTitle:string; matchedLocale:string; reason:string; verifiedRelation:false;
};
type EnhancedReport = {
  version:string; disclaimer:string;
  queryComponents:Array<{token:string; concept:string|null;facet:string;resolved:boolean}>;
  facets:string[]; derivedQueries:Array<{term:string;reason:string;status:string}>;
  rows:EnhancedRow[]; unresolvedComponents:string[]; evaluated:number; totalMatched:number; executionMs:number;
};
type SearchResponse = {
  ok: boolean; errorCode?: string; query?: string; locale?: string;
  scanned?: { ontology: number; templates: number };
  searchDetails?: { terms: string[]; matchedOn: number; onTruncated: boolean };
  catalogTotals?: { ontology: number | null; templates: number | null };
  warnings?: string[];
  diagnostics?: {
    version: string; totalMs: number; catalogLoadMs: number; scoringMs: number;
    traceMs: number; results: DiagnosticRow[];
    experimental?: EnhancedReport;
    baselineComparison?: {oldMatched:number;newMatched:number;oldTopTitles:string[];newTopTitles:string[];oldTopWithoutNewTitleMatch:string[];note:string};
  };
};

function downloadJson(value: unknown, name: string) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DiagnosticsClient({ locale }: { locale: OntoLocale }) {
  const [query, setQuery] = useState("прогулка с ребёнком");
  const [extra, setExtra] = useState("");
  const [maxOn, setMaxOn] = useState("35");
  const [allLocales, setAllLocales] = useState(true);
  const [includePaths, setIncludePaths] = useState(true);
  const [includeDefinitions, setIncludeDefinitions] = useState(true);
  const [includeTemplates, setIncludeTemplates] = useState(true);
  const [experiment, setExperiment] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SearchResponse | null>(null);

  async function run() {
    if (loading) return;
    setError(""); setResult(null);
    const q = query.trim();
    if (q.length < 2 || q.length > 180) { setError("Длина запроса: 2–180 символов."); return; }
    const params = new URLSearchParams({
      q, locale, diagnostics: "1", onLimit: maxOn,
      allLocales: allLocales ? "1" : "0", paths: includePaths ? "1" : "0",
      definitions: includeDefinitions ? "1" : "0", templates: includeTemplates ? "1" : "0",
    });
    if (extra.trim()) params.set("terms", extra.trim());
    if (experiment) params.set("experimental", "ari02_2");
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/ontology-research/context?${params.toString()}`, {
        method: "GET", credentials: "same-origin", cache: "no-store",
      });
      const body: SearchResponse = await response.json();
      if (!response.ok || !body.ok || !body.diagnostics) {
        throw new Error(body.errorCode ?? `HTTP ${response.status}`);
      }
      setResult(body);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "SEARCH_DIAGNOSTICS_FAILED");
    } finally { setLoading(false); }
  }
  const trace = result?.diagnostics;
  const rows = trace?.results ?? [];
  return (
    <section className="space-y-5">
      <header className="rounded-2xl border bg-white p-5">
        <h1 className="text-xl font-bold">ARI-02.2 · Сравнение поиска ОН</h1>
        <a className="mt-2 inline-block rounded-lg border border-blue-300 px-3 py-2 text-sm text-blue-700" href={`/admin/ontology-research/gold-corpus?locale=${locale}`}>ARI-02.3 · Эталонный корпус и ручная разметка →</a>
        <p className="mt-2 text-sm text-slate-600">
          Использует действующий алгоритм и тот же системный каталог. Только чтение.
          Результаты — лексические совпадения, не доказательство полноты онтологии.
          Вызовов ИИ, записи в БД и создания ОН здесь нет. Новый экспериментальный режим не меняет поиск в конструкторе ОН.
        </p>
      </header>
      <section className="space-y-3 rounded-2xl border bg-white p-5">
        <label className="block text-sm font-semibold" htmlFor="ari02-q">Поисковый запрос</label>
        <input id="ari02-q" className="w-full rounded-lg border p-3" maxLength={180}
          value={query} onChange={e => setQuery(e.target.value)} />
        <label className="block text-sm font-semibold" htmlFor="ari02-extra">Дополнительные запросы (до 6; каждый с новой строки)</label>
        <textarea id="ari02-extra" className="w-full rounded-lg border p-3" rows={3}
          maxLength={650} value={extra} onChange={e => setExtra(e.target.value)} />
        <div className="flex flex-wrap gap-4 text-sm">
          <label><input type="checkbox" checked={allLocales} onChange={e => setAllLocales(e.target.checked)} /> Семь языков</label>
          <label><input type="checkbox" checked={includePaths} onChange={e => setIncludePaths(e.target.checked)} /> Пути и родители</label>
          <label><input type="checkbox" checked={includeDefinitions} onChange={e => setIncludeDefinitions(e.target.checked)} /> Определения</label>
          <label><input type="checkbox" checked={includeTemplates} onChange={e => setIncludeTemplates(e.target.checked)} /> Подсказки типовых активностей</label>
          <label>Лимит ОН: <select className="rounded border p-1" value={maxOn} onChange={e => setMaxOn(e.target.value)}>
            <option value="15">15</option><option value="35">35</option><option value="100">100</option>
          </select></label>
        </div>
        <label className="block rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          <input type="checkbox" checked={experiment} onChange={e => setExperiment(e.target.checked)} />{" "}
          Сравнить с ARI-02.2 (эксперимент, только собственные названия ОН; словарь правил ограничен)
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="rounded-lg bg-blue-600 px-5 py-2 text-white disabled:opacity-50"
            disabled={loading} onClick={run}>{loading ? "Проверка…" : "Выполнить read-only поиск"}</button>
          {trace && <button type="button" className="rounded-lg border px-4 py-2"
            onClick={() => downloadJson(result, `ARCTOR_ARI02_SEARCH_TRACE_${Date.now()}.json`)}>
            Скачать полный JSON-отчёт
          </button>}
        </div>
        {error && <p role="alert" className="text-sm text-red-700">Ошибка: {error}</p>}
      </section>
      {trace && result && <>
        <section className="rounded-xl border bg-white p-4 text-sm">
          <p><strong>Снимок ОН:</strong> {result.scanned?.ontology ?? "?"} из {result.catalogTotals?.ontology ?? "?"}.
            <strong> Совпадений:</strong> {result.searchDetails?.matchedOn ?? "?"}.
            <strong> Показано:</strong> {rows.length}.</p>
          <p><strong>Запросы:</strong> {result.searchDetails?.terms.join("; ")}</p>
          <p><strong>Время (мс):</strong> всего {trace.totalMs}; загрузка каталогов {trace.catalogLoadMs};
            ранжирование {trace.scoringMs}; объяснения {trace.traceMs}.</p>
          <p className="mt-2 text-amber-700">Ограниченная выдача и совпадение в пути не подтверждают релевантность.
            Для оценки Precision/Recall потребуется эталонная ручная разметка.</p>
          {result.warnings?.map((w, i) => <p key={i} className="text-slate-600">{w}</p>)}
        </section>
        {trace.experimental && <section className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm">
          <h2 className="text-lg font-bold">ARI-02.2 · Экспериментальная выдача (не применяется к созданию ОН)</h2>
          <p>{trace.experimental.disclaimer}</p>
          <p><strong>Разобранные части:</strong> {trace.experimental.queryComponents.map(c => `${c.token} [${c.facet}; ${c.resolved ? "своё название найдено" : "не найдено"}]`).join(" · ") || "нет"}</p>
          <p><strong>Перспективы запроса:</strong> {trace.experimental.facets.join(", ") || "не определены"}.</p>
          <p><strong>Неразрешённые части:</strong> {trace.experimental.unresolvedComponents.join(", ") || "нет в пределах словарных правил"}. Это не доказательство отсутствия ОН.</p>
          <p><strong>Сравнение:</strong> старый поиск {trace.baselineComparison?.oldMatched ?? "?"} совпадений; эксперимент {trace.experimental.totalMatched};
            обработано {trace.experimental.evaluated} ОН; экспериментальное ранжирование {trace.experimental.executionMs} мс.</p>
          {trace.baselineComparison?.oldTopWithoutNewTitleMatch.length ? <p><strong>Совпадения старого топ-10 без подтверждения в собственном названии:</strong> {trace.baselineComparison.oldTopWithoutNewTitleMatch.join("; ")}. Проверьте вручную, это не автоматически «ошибочные» ОН.</p> : null}
          {trace.experimental.derivedQueries.length>0 && <div><strong>Запросы для дополнительной проверки (гипотезы, не синонимы):</strong>
            {trace.experimental.derivedQueries.map((d,i)=><p key={i}>«{d.term}» — {d.reason}</p>)}
          </div>}
          <div className="overflow-x-auto rounded border bg-white"><table className="w-full min-w-[800px] text-left">
            <thead className="border-b bg-blue-100"><tr><th className="p-2"># / балл</th><th className="p-2">Название и ветвь</th><th className="p-2">Почему найден</th><th className="p-2">Достоверность</th></tr></thead>
            <tbody>{trace.experimental.rows.map(row=><tr key={row.id} className="border-b align-top">
              <td className="p-2">{row.rank} / {row.score}</td>
              <td className="p-2"><strong>{row.title}</strong><div className="text-xs">{row.facet} · {row.role}</div><div className="text-xs text-slate-500">{row.path}</div></td>
              <td className="p-2">{row.reason}<div className="text-xs text-slate-600">Часть запроса: «{row.matchedComponent}». Название: «{row.matchedTitle}» ({row.matchedLocale}).</div></td>
              <td className="p-2">{row.matchClass==="related_hypothesis"?"ГИПОТЕЗА":row.matchClass==="direct_title"?"Название / словарная форма":"Частичное название"}<div className="text-xs">Нет подтверждения связи</div></td>
            </tr>)}</tbody></table></div>
            {!trace.experimental.rows.length && <p className="font-medium">По собственным названиям и ограниченным правилам совпадений нет. Не делайте вывод об отсутствии ОН.</p>}
        </section>}
        <h2 className="text-base font-semibold">ARI-02.1 · Старая лексическая выдача (для сравнения)</h2>
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b bg-slate-50"><tr>
              <th className="p-3"># / Балл</th><th className="p-3">ОН и путь</th>
              <th className="p-3">Причина совпадения</th><th className="p-3">Контроль</th>
            </tr></thead>
            <tbody>{rows.map(row => <tr key={row.id} className="border-b align-top">
              <td className="p-3">{row.rank} / <strong>{row.score}</strong></td>
              <td className="p-3"><div className="font-semibold">{row.title}</div>
                <div className="text-xs text-slate-500">{row.role} · {row.id}</div>
                <div className="mt-1 text-xs text-slate-700">{row.path}</div></td>
              <td className="p-3">{row.bestEvidence ? <>
                <div><strong>{row.bestEvidence.field}</strong> · {row.bestEvidence.locale} ·
                  «{row.bestEvidence.term}»</div>
                <div className="mt-1 text-xs text-slate-600">{row.bestEvidence.excerpt}</div>
                <details className="mt-2"><summary>Ещё причины</summary>
                  {row.topEvidence.map((ev, i) => <p key={i} className="text-xs">
                    {ev.field} / {ev.locale}: {ev.score} — {ev.term}</p>)}
                </details></> : "Причина не определена"}</td>
              <td className={`p-3 font-semibold ${row.scoreParity ? "text-green-700" : "text-red-700"}`}>
                {row.scoreParity ? "Совпало" : "РАСХОЖДЕНИЕ"}
              </td>
            </tr>)}</tbody>
          </table>
        </div>
      </>}
    </section>
  );
}

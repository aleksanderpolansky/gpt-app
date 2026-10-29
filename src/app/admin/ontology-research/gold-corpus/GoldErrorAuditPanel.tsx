"use client";

import { useState } from "react";
import type { EngineKey, GoldCorpus } from "@/lib/ontology-research/ari02GoldCorpusV1";
import { auditIssueLabels, buildErrorAudit, errorKindBreakdown,
  type AuditIssue, type AuditIssueCode } from "@/lib/ontology-research/ari02ErrorAuditV1";

const engines: EngineKey[] = ["baseline", "experimental"];
const engineLabel: Record<EngineKey,string>={baseline:"Действующий поиск",experimental:"Эксперимент ARI-02.2"};
const kindLabel:Record<string,string>={false_positive:"Ложное совпадение",wrong_facet:"Другая ветвь",
  wrong_sense:"Другой смысл",translation:"Ошибка перевода",path_only:"Только путь",
  duplicate:"Дубликат",other:"Другое"};
const criticalCodes: AuditIssueCode[] = ["verified_not_returned","verified_missing_top20","candidate_from_other_engine",
  "unclassified_negative","contradictory_annotation","missing_explanation","reference_unverified","hypothesis_unresolved"];
function exportJson(data:unknown){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json;charset=utf-8"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");
  a.href=url;a.download=`ARCTOR_ARI02_4_ERROR_AUDIT_${Date.now()}.json`;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function countText(items: AuditIssue[],code: AuditIssueCode){return items.filter(item=>item.code===code).length;}
export default function GoldErrorAuditPanel({corpus,selectedCaseId,onSelectCase}:{
  corpus:GoldCorpus;selectedCaseId:string;onSelectCase:(id:string)=>void;
}){
  const [expanded,setExpanded]=useState(true);
  const [showUnreviewed,setShowUnreviewed]=useState(false);
  const audit=buildErrorAudit(corpus);
  const c=audit.cases.find(row=>row.caseId===selectedCaseId);
  const source=corpus.cases.find(row=>row.id===selectedCaseId);
  const counts=source?errorKindBreakdown(source):{};
  const urgent=c?.issues.filter(issue=>issue.code!=="unreviewed_result")??[];
  const unreviewed=c?.issues.filter(issue=>issue.code==="unreviewed_result")??[];
  const problemCases=audit.cases.filter(row=>row.issues.some(issue=>criticalCodes.includes(issue.code)));
  const seen=new Set<string>();
  const prioritized=urgent.filter(issue=>{
    const key=[issue.code,issue.engine??"",issue.onId??"",issue.title].join("|");
    if(seen.has(key))return false;seen.add(key);return true;
  });
  return <section className="space-y-4 rounded-xl border-2 border-sky-200 bg-white p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 className="font-bold text-lg">ARI-02.4 · Аудит ошибок и пропусков поиска</h2>
        <p className="text-sm text-slate-600">Анализирует только уже импортированную выдачу и ручные оценки ARI-02.3. Не обращается к AI или Supabase и ничего не утверждает об отсутствии ОН.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={()=>setExpanded(v=>!v)}>{expanded?"Свернуть аудит":"Развернуть аудит"}</button>
        <button type="button" className="rounded-lg border border-blue-500 px-3 py-2 text-sm text-blue-700" onClick={()=>exportJson(buildErrorAudit(corpus,new Date().toISOString()))}>Скачать аудит JSON</button>
      </div>
    </div>
    {expanded&&<>
      <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
        <div className="rounded-lg border p-3"><b>{audit.summary.annotatedCases}/{audit.summary.totalCases}</b><div>Сценариев с оценкой</div></div>
        <div className="rounded-lg border p-3"><b>{audit.summary.independentlyCheckedCases}</b><div>С независимым эталоном</div></div>
        <div className="rounded-lg border p-3"><b>{audit.summary.classificationBacklog}</b><div>Записей к уточнению</div></div>
        <div className="rounded-lg border p-3"><b>{audit.summary.crossEngineSuggestions}</b><div>Подсказок из другого режима</div></div>
      </div>
      <div className="space-y-2 rounded-lg border p-3 text-sm">
        <h3 className="font-semibold">Текущий запрос: {c?`«${c.query}»` : "не выбран"}</h3>
        {c&&<>
          <p>Независимый эталон: <b>{c.referenceUsable?"Проверен в заявленной ограниченной области":"Не подтверждён"}</b>. Записей UUID: {c.referenceCount}.</p>
          <div className="overflow-x-auto"><table className="min-w-[590px] w-full border-collapse text-left text-sm">
            <thead><tr className="border-b bg-slate-50"><th className="p-2">Режим</th><th className="p-2">Выдано</th><th className="p-2">Оценено</th><th className="p-2">0 / 1 / 2–3</th><th className="p-2">Вне топ-20*</th></tr></thead>
            <tbody>{engines.map(e=><tr className="border-b" key={e}><td className="p-2">{engineLabel[e]}</td><td className="p-2">{c.engines[e].returned}</td><td className="p-2">{c.engines[e].judged}</td><td className="p-2">{c.engines[e].notRelevant} / {c.engines[e].context} / {c.engines[e].relevant}</td><td className="p-2">{c.referenceUsable?c.engines[e].confirmedMissingTop20.length:"—"}</td></tr>)}</tbody>
          </table></div>
          <p className="text-xs text-slate-600">* Только подтверждённые модератором UUID в указанной области каталога; без независимой проверки показатель не рассчитывается. Оценка «1 · Контекст» не считается ложным совпадением автоматически.</p>
          <h3 className="font-semibold">Виды ошибок, вручную указанные модератором</h3>
          <p>{Object.entries(counts).length?Object.entries(counts).map(([code,n])=>`${kindLabel[code]??code}: ${n}`).join("; "):"Пока нет ошибок с присвоенной категорией. Это не означает, что ошибок нет."}</p>
          <h3 className="font-semibold">Что проверить дальше</h3>
          {!prioritized.length?<p>Подтверждённых пропусков или противоречий пока не выявлено. Вы можете дополнительно проверить понятия и синонимы без автоматического создания ОН.</p>:<ul className="space-y-2">{prioritized.map((issue,i)=><li key={`${issue.code}-${issue.engine}-${issue.onId??i}-${i}`} className="rounded-lg border p-2">
            <b>{auditIssueLabels[issue.code]}</b>{issue.engine&&<span className="text-slate-500"> · {engineLabel[issue.engine]}</span>}
            <div className="mt-1">{issue.title}{issue.onId&&<code className="ml-2 break-all text-xs text-slate-600">{issue.onId}</code>}</div>
            <p className="text-slate-600">{issue.detail}</p>
            {issue.onId&&<a href={`/value-objects/${encodeURIComponent(issue.onId)}?locale=ru`} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Открыть карточку ОН для проверки</a>}
          </li>)}</ul>}
          <button type="button" className="text-blue-700 underline" onClick={()=>setShowUnreviewed(v=>!v)}>{showUnreviewed?"Скрыть":"Показать"} неоценённые результаты ({unreviewed.length})</button>
          {showUnreviewed&&<div className="max-h-60 overflow-y-auto rounded-lg border p-2">{unreviewed.length?unreviewed.map((issue,i)=><p key={`${i}-${issue.onId}`} className="py-1 text-sm">{issue.engine?engineLabel[issue.engine]:""} · {issue.title}</p>):"Нет неоценённых результатов в импортированных выдачах."}</div>}
        </>}
      </div>
      <div className="space-y-2 rounded-lg border p-3 text-sm">
        <h3 className="font-semibold">Очередь дальнейших проверок по корпусу</h3>
        {!problemCases.length?<p>В корпусе пока нет классифицированных проблем. Импортируйте диагностику и продолжайте ручную разметку.</p>
        :<div className="max-h-64 space-y-1 overflow-auto">{problemCases.map(row=><button key={row.caseId} type="button" className={`block w-full rounded-lg border p-2 text-left hover:bg-slate-50 ${selectedCaseId===row.caseId?"border-blue-500":""}`} onClick={()=>{onSelectCase(row.caseId);setExpanded(true)}}>
          <b>{row.locale.toUpperCase()} · {row.query}</b> · требует проверки: {row.issues.filter(x=>criticalCodes.includes(x.code)).length}
          {countText(row.issues,"verified_not_returned")>0&&" · есть подтверждённые невыданные UUID"}
        </button>)}</div>}
        <p className="text-xs text-slate-600">Режимы поиска не изменяются. Ссылки открывают карточки для ручной сверки. Для исправления оценок используйте поля ARI-02.3 выше. Проверка качества агрегированных метрик относится к ARI-02.5.</p>
      </div>
    </>}
  </section>;
}

"use client";
import { useRef, useState } from "react";
import GoldErrorAuditPanel from "./GoldErrorAuditPanel";
import Ari02BenchmarkPanel from "./Ari02BenchmarkPanel";
import { ARI02_GOLD_VERSION, emptyCase, emptyCorpus, importDiagnosticReport, parseGoldCorpus,
  countJudged, precisionTen, recallTwenty, uuidRegex,
  type GoldCorpus, type GoldCase, type Relevance, type EngineKey, type ErrorKind } from "@/lib/ontology-research/ari02GoldCorpusV1";

const grades: Array<[string,Relevance|null]> = [
  ["Не оценён",null],["0 · Неверный",0],["1 · Контекст",1],["2 · Релевантный",2],["3 · Точный",3],
];
const errors: Array<[ErrorKind,string]> = [
  ["none","—"],["false_positive","Ложное совпадение"],["wrong_facet","Другая ветвь"],
  ["wrong_sense","Другой смысл"],["translation","Ошибка перевода"],
  ["path_only","Только совпадение в пути"],["duplicate","Дубликат"],["other","Другое"],
];
function download(data:unknown,name:string){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json;charset=utf-8"});
  const url=URL.createObjectURL(blob), a=document.createElement("a");a.href=url;a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function GoldCorpusClient(){
  const [corpus,setCorpus]=useState<GoldCorpus>(()=>emptyCorpus());
  const [selected,setSelected]=useState("pilot-01");
  const [engine,setEngine]=useState<EngineKey>("experimental");
  const [newQuery,setNewQuery]=useState("");
  const [newLocale,setNewLocale]=useState("ru");
  const [newGold,setNewGold]=useState("");
  const [newConcept,setNewConcept]=useState("");
  const [message,setMessage]=useState("");
  const reportRef=useRef<HTMLInputElement>(null);
  const corpusRef=useRef<HTMLInputElement>(null);
  const current=corpus.cases.find(c=>c.id===selected)??corpus.cases[0];
  function editCase(mutator:(c:GoldCase)=>GoldCase){
    setCorpus(prev=>({...prev,cases:prev.cases.map(c=>c.id===current.id?mutator(c):c)}));
  }
  function updateField<K extends keyof GoldCase>(key:K,value:GoldCase[K]){editCase(c=>({...c,[key]:value}));}
  function addCase(){
    const q=newQuery.trim();if(q.length<2||q.length>180){setMessage("Запрос: 2–180 символов.");return;}
    const c=emptyCase(q,newLocale);setCorpus(prev=>({...prev,cases:[...prev.cases,c]}));
    setSelected(c.id);setNewQuery("");setMessage("Запрос добавлен без разметки.");
  }
  function exportCorpus(){download({...corpus,exportedAt:new Date().toISOString()},`ARCTOR_ARI02_3_GOLD_${Date.now()}.json`);setMessage("Файл сохранён. Храните его для продолжения работы: данные не записываются на сервер.");}
  async function loadJson(file:File|undefined,mode:"report"|"corpus"){
    if(!file)return;if(file.size>4_000_000){setMessage("Файл превышает лимит 4 МБ.");return;}
    try {
      const parsed:unknown=JSON.parse(await file.text());
      if(mode==="corpus"){
        const loaded=parseGoldCorpus(parsed);setCorpus(loaded);setSelected(loaded.cases[0]?.id??"");
        setMessage(`Восстановлено ${loaded.cases.length} сценариев. Это локальная копия, БД не изменялась.`);
      } else {
        const incoming=importDiagnosticReport(parsed);
        const found=corpus.cases.find(c=>c.query.toLocaleLowerCase()===incoming.query.toLocaleLowerCase() && c.locale===incoming.locale);
        const target=found??emptyCase(incoming.query,incoming.locale);
        setCorpus(prev=>({...prev,cases:found
          ? prev.cases.map(c=>c.id===found.id?{...c,runs:incoming.runs}:c)
          : [...prev.cases,{...target,runs:incoming.runs}]}));
        setSelected(target.id);
        setEngine(incoming.runs.experimental.length>0?"experimental":"baseline");
        setMessage(`Импортирован диагностический отчёт «${incoming.query}». Старый поиск: ${incoming.runs.baseline.length}, эксперимент: ${incoming.runs.experimental.length}. Вся разметка остаётся ручной.`);
      }
    } catch(e){setMessage(`Ошибка импорта: ${e instanceof Error?e.message:"INVALID_JSON"}`);}
    if(mode==="report"&&reportRef.current)reportRef.current.value="";
    if(mode==="corpus"&&corpusRef.current)corpusRef.current.value="";
  }
  function grade(id:string,value:Relevance|null){
    editCase(c=>({...c,judgments:{...c.judgments,[id]:{grade:value,
      errorKind:c.judgments[id]?.errorKind??"none",note:c.judgments[id]?.note??""}}}));
  }
  function errorKind(id:string,value:ErrorKind){
    editCase(c=>({...c,judgments:{...c.judgments,[id]:{grade:c.judgments[id]?.grade??null,
      errorKind:value,note:c.judgments[id]?.note??""}}}));
  }
  function judgeNote(id:string,value:string){
    editCase(c=>({...c,judgments:{...c.judgments,[id]:{grade:c.judgments[id]?.grade??null,
      errorKind:c.judgments[id]?.errorKind??"none",note:value.slice(0,1000)}}}));
  }
  function addGold(){
    const id=newGold.trim().toLowerCase();if(!uuidRegex.test(id)){setMessage("Для эталона нужен реальный UUID существующего ОН.");return;}
    if(!current.knownRelevantIds.includes(id))updateField("knownRelevantIds",[...current.knownRelevantIds,id]);
    setNewGold("");setMessage("UUID добавлен как кандидат в эталон. Обязательно укажите проверенные доказательства.");
  }
  const listed=current?.runs[engine]??[];
  const checked=current?countJudged(current,engine):{total:0,judged:0};
  const p=current?precisionTen(current,engine):null;
  const r=current?recallTwenty(current,engine):null;
  const judgedCases=corpus.cases.filter(c=>Object.values(c.judgments).some(j=>j.grade!==null));
  return <div className="space-y-5">
    <header className="rounded-xl border bg-white p-5">
      <h1 className="text-xl font-bold">ARI-02.3 · Эталонный корпус поиска ОН</h1>
      <p className="mt-2 text-sm text-slate-600">Ручная разметка точности поиска. 24 стартовых сценария — <b>не готовые эталоны</b>.
        Данные остаются в памяти этой вкладки до экспорта; без загрузки JSON после перезагрузки разметка исчезнет.
        Никаких AI-вызовов, запросов к Supabase, записей в БД или изменений ОН.</p>
      <p className="mt-2 text-xs">Контракт: <code>{ARI02_GOLD_VERSION}</code></p>
    </header>
    <section className="rounded-xl border bg-white p-4 space-y-3">
      <div className="flex flex-wrap gap-3">
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-white" type="button" onClick={exportCorpus}>Скачать эталонный корпус JSON</button>
        <label className="cursor-pointer rounded-lg border px-4 py-2">Импортировать диагностический JSON
          <input className="hidden" ref={reportRef} type="file" accept=".json,application/json" onChange={e=>void loadJson(e.target.files?.[0],"report")} />
        </label>
        <label className="cursor-pointer rounded-lg border px-4 py-2">Восстановить корпус из JSON
          <input className="hidden" ref={corpusRef} type="file" accept=".json,application/json" onChange={e=>void loadJson(e.target.files?.[0],"corpus")} />
        </label>
      </div>
      <p className="text-sm text-slate-600">Сценариев: {corpus.cases.length}; с ручной оценкой: {judgedCases.length}. Импортируйте JSON через «Скачать полный JSON-отчёт» со страницы диагностики ARI-02.2.</p>
      {message&&<p role="status" className="rounded-lg border border-blue-200 p-2 text-sm">{message}</p>}
    </section>
    <section className="rounded-xl border bg-white p-4 space-y-3">
      <label className="block font-semibold" htmlFor="case">Выберите контрольный запрос</label>
      <select id="case" className="w-full rounded-lg border p-3" value={current?.id??""} onChange={e=>setSelected(e.target.value)}>
        {corpus.cases.map(c=><option key={c.id} value={c.id}>{c.locale.toUpperCase()} · {c.query} · {c.perspective}</option>)}
      </select>
      <div className="flex flex-wrap gap-2">
        <input value={newQuery} onChange={e=>setNewQuery(e.target.value)} maxLength={180} placeholder="Новый поисковый запрос" className="min-w-[240px] flex-1 rounded-lg border p-2" />
        <select value={newLocale} onChange={e=>setNewLocale(e.target.value)} className="rounded-lg border p-2">
          {["ru","en","pl","de","es","uk","cs"].map(l=><option key={l} value={l}>{l}</option>)}
        </select>
        <button type="button" className="rounded-lg border px-4 py-2" onClick={addCase}>Добавить сценарий</button>
      </div>
    </section>
    {current&&<>
      <section className="rounded-xl border bg-white p-4 space-y-3">
        <h2 className="font-bold">«{current.query}» · {current.perspective}</h2>
        <p className="text-sm text-slate-600">{current.purpose}</p>
        <label className="block text-sm">Заметки модератора (определение границ и смысла запроса)
          <textarea value={current.notes} onChange={e=>updateField("notes",e.target.value.slice(0,3000))} rows={2} className="mt-1 w-full rounded-lg border p-2" /></label>
        <div className="flex flex-wrap gap-3 text-sm">
          <button type="button" className={`rounded-lg border px-4 py-2 ${engine==="baseline"?"bg-blue-600 text-white":""}`} onClick={()=>setEngine("baseline")}>Действующий поиск ({current.runs.baseline.length})</button>
          <button type="button" className={`rounded-lg border px-4 py-2 ${engine==="experimental"?"bg-blue-600 text-white":""}`} onClick={()=>setEngine("experimental")}>Эксперимент ARI-02.2 ({current.runs.experimental.length})</button>
        </div>
        <p className="text-sm">Оценено {checked.judged} из {checked.total}. {p===null?"Precision@10: ещё не рассчитан (не все показанные топ-10 размечены).":`Предварительный Precision@10: ${(p*100).toFixed(1)}%.`} {r===null?"Recall@20: пока нельзя рассчитать без независимо подтверждённого списка релевантных UUID.":`Оценка Recall@20 в границах ручного эталона: ${(r*100).toFixed(1)}%.`}</p>
        {!listed.length?<p className="rounded-lg border border-amber-200 p-3 text-sm">Нет импортированной выдачи для этого режима. Это НЕ доказательство отсутствия ОН.</p>
        :<div className="overflow-x-auto"><table className="w-full min-w-[800px] border-collapse text-sm"><thead><tr className="border-b bg-slate-100"><th className="p-2 text-left">ОН и доказательство</th><th className="p-2 text-left">Релевантность</th><th className="p-2 text-left">Ошибка и пояснение</th></tr></thead>
        <tbody>{listed.map(row=><tr key={row.id} className="border-b align-top"><td className="p-2"><b>{row.rank}. {row.title}</b><div className="text-xs text-slate-500">{row.role} · {row.score} баллов</div><div className="text-xs">{row.path}</div><code className="text-xs">{row.id}</code></td>
          <td className="p-2"><select aria-label={`Релевантность ${row.title}`} className="w-full rounded border p-2" value={current.judgments[row.id]?.grade??""} onChange={e=>grade(row.id,e.target.value===""?null:Number(e.target.value) as Relevance)}>
            {grades.map(([name,value])=><option key={name} value={value??""}>{name}</option>)}</select></td>
          <td className="p-2"><select aria-label={`Ошибка ${row.title}`} className="w-full rounded border p-2" value={current.judgments[row.id]?.errorKind??"none"} onChange={e=>errorKind(row.id,e.target.value as ErrorKind)}>
            {errors.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
            <input aria-label={`Примечание ${row.title}`} className="mt-2 w-full rounded border p-2" placeholder="Почему релевантен / нерелевантен" value={current.judgments[row.id]?.note??""} onChange={e=>judgeNote(row.id,e.target.value)} /></td></tr>)}</tbody></table></div>}
      </section>
      <section className="rounded-xl border bg-white p-4 space-y-3">
        <h2 className="font-bold">Независимый эталон существующих ОН</h2>
        <p className="text-sm text-slate-600">Добавляйте сюда <b>только реальные, отдельно проверенные UUID каталога</b> — в том числе объекты, отсутствующие в поисковой выдаче. Это позволит измерить пропуски. Не утверждайте полноту всего каталога.</p>
        <div className="flex gap-2"><input className="min-w-0 flex-1 rounded-lg border p-2" placeholder="UUID подтверждённого ОН" value={newGold} onChange={e=>setNewGold(e.target.value)}/><button type="button" className="rounded-lg border px-4 py-2" onClick={addGold}>Добавить UUID</button></div>
        {current.knownRelevantIds.map(id=><div key={id} className="flex items-center gap-2 text-xs"><code className="break-all">{id}</code><button className="text-red-700 underline" type="button" onClick={()=>updateField("knownRelevantIds",current.knownRelevantIds.filter(x=>x!==id))}>Убрать</button></div>)}
        <label className="block text-sm">Основание независимой проверки (источник / путь / критерий)
          <textarea className="mt-1 w-full rounded-lg border p-2" rows={2} value={current.knownRelevantEvidence} onChange={e=>updateField("knownRelevantEvidence",e.target.value.slice(0,2000))}/></label>
        <label className="block text-sm">Проверка каталога
          <select className="mt-1 w-full rounded-lg border p-2" value={current.catalogCheck} onChange={e=>updateField("catalogCheck",e.target.value as GoldCase["catalogCheck"])}>
            <option value="not_checked">Не проверено отдельно</option><option value="scoped_checked">Проверено в ограниченной области с указанием основания</option>
          </select></label>
        <h3 className="font-semibold">Понятия для дальнейшего исследования — не утверждения об отсутствии ОН</h3>
        <div className="flex gap-2"><input className="min-w-0 flex-1 rounded-lg border p-2" value={newConcept} onChange={e=>setNewConcept(e.target.value)} placeholder="Например, ребёнок как возрастная категория" /><button type="button" className="rounded-lg border px-4 py-2" onClick={()=>{if(newConcept.trim()){updateField("unresolvedConcepts",[...current.unresolvedConcepts,newConcept.trim().slice(0,150)]);setNewConcept("");}}}>Добавить гипотезу</button></div>
        {current.unresolvedConcepts.map((v,i)=><p key={i} className="text-sm">{v} <button type="button" className="ml-2 text-red-700 underline" onClick={()=>updateField("unresolvedConcepts",current.unresolvedConcepts.filter((_,j)=>i!==j))}>Убрать</button></p>)}
      </section>
    </>}
    <GoldErrorAuditPanel corpus={corpus} selectedCaseId={current?.id??""} onSelectCase={setSelected} />
      <Ari02BenchmarkPanel corpus={corpus} />
    <p className="text-xs text-slate-600">Предварительные показатели не заменяют научную оценку: эталон может быть неполным, оценки выполняет человек, выборка не репрезентативна. ARI-02.5 добавит полноценные агрегаты, nDCG и p50/p95.</p>
  </div>;
}

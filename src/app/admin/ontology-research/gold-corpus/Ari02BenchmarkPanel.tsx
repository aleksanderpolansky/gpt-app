"use client";
import { useMemo, useState } from "react";
import type { GoldCorpus, EngineKey } from "@/lib/ontology-research/ari02GoldCorpusV1";
import { ARI02_BENCHMARK_VERSION, buildAri02Benchmark, parseAri02TimingReport, timingPercentiles,
  type TimingSample, type MetricAggregate } from "@/lib/ontology-research/ari02BenchmarkV1";

function percent(v:number|null){return v===null?"N/A":`${(v*100).toFixed(1)}%`;}
function score(m:MetricAggregate){return `${percent(m.mean)} (${m.eligible}/${m.total})`;}
function exportJson(data:unknown){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json;charset=utf-8"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=`ARCTOR_ARI02_5_BENCHMARK_${Date.now()}.json`;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function Ari02BenchmarkPanel({corpus}:{corpus:GoldCorpus}) {
  const [engine,setEngine]=useState<EngineKey>("experimental");
  const [expanded,setExpanded]=useState(false);
  const [batchId,setBatchId]=useState("ari02_5_local_repeat_01");
  const [samples,setSamples]=useState<TimingSample[]>([]);
  const [notice,setNotice]=useState("");
  const report=useMemo(()=>buildAri02Benchmark(corpus,engine),[corpus,engine]);
  const group=useMemo(()=>{
    if(!samples.length)return [] as TimingSample[];
    const latest=samples[samples.length-1];
    return samples.filter(s=>s.query===latest.query && s.locale===latest.locale &&
      s.batchId===latest.batchId && s.catalogKey===latest.catalogKey);
  },[samples]);
  const latency=timingPercentiles(group,"totalMs");
  const timingFields=["totalMs","catalogLoadMs","scoringMs","traceMs"] as const;
  async function importTimings(files:FileList|null){
    if(!files?.length)return;
    if(samples.length+files.length>200){setNotice("Лимит: 200 диагностических замеров за одну вкладку.");return;}
    const incoming:TimingSample[]=[];
    try{
      for(const file of Array.from(files)){
        if(file.size>4_000_000)throw new Error("FILE_TOO_LARGE");
        incoming.push(parseAri02TimingReport(JSON.parse(await file.text()),batchId.trim()));
      }
      setSamples(prev=>[...prev,...incoming]);
      setNotice(`Добавлено ${incoming.length} замеров; все результаты только в памяти вкладки.`);
    }catch(e){setNotice(`Импорт отменён: ${e instanceof Error?e.message:"INVALID_JSON"}`);}
  }
  function save(){
    exportJson({contract:ARI02_BENCHMARK_VERSION,createdAt:new Date().toISOString(),
      corpusContract:corpus.contract,annotationMethod:corpus.annotationMethod,
      definitions:{relevanceThreshold:2,pAt:10,recallAt:20,gradedNdcgAt:10,
        precisionShortResult:"N/A if fewer than ten returned (depth not recorded)",
        recallScope:"SCOPE_COMPLETE_V1: + 30 chars of independently checked scope/method, catalogCheck=scoped_checked",
        ndcgScope:"judged union of both engines top-10 plus known relevant UUID; NOT full catalog",
        latency:"full joint request, not separate engine; R-7; >=5 repeats per query/locale/batch/catalog count"},
      report, timings:{samples,selectedGroup:group,fields:Object.fromEntries(timingFields.map(field=>[field,timingPercentiles(group,field)]))}});
    setNotice("Отчёт сохранён локальным JSON. База данных не изменялась.");
  }
  return <section className="rounded-xl border border-slate-300 bg-white p-4 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h2 className="font-bold">ARI-02.5 · Проверяемый benchmark поиска</h2>
        <p className="text-xs text-slate-600">Только расчёты по ручной разметке. Ни запросов к базе, ни платного ИИ, ни сохранения на сервере.</p></div>
      <button className="rounded-lg border px-3 py-2 text-sm" type="button" onClick={()=>setExpanded(!expanded)}>
        {expanded?"Свернуть":"Показать метрики"}
      </button>
    </div>
    {expanded&&<>
      <div className="flex flex-wrap gap-2 text-sm">
        <button className={`rounded border px-3 py-2 ${engine==="baseline"?"bg-blue-600 text-white":""}`} type="button" onClick={()=>setEngine("baseline")}>Действующий поиск</button>
        <button className={`rounded border px-3 py-2 ${engine==="experimental"?"bg-blue-600 text-white":""}`} type="button" onClick={()=>setEngine("experimental")}>Эксперимент</button>
        <button className="rounded border px-3 py-2" type="button" onClick={save}>Скачать benchmark JSON</button>
      </div>
      <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-3"><b>{score(report.p10)}</b><div>Precision@10 · grade ≥2</div></div>
        <div className="rounded-lg border p-3"><b>{score(report.pooledNdcg10)}</b><div>Пуловый nDCG@10</div></div>
        <div className="rounded-lg border p-3"><b>{score(report.scopedRecall20)}</b><div>Scoped Recall@20</div></div>
        <div className="rounded-lg border p-3"><b>{score(report.exactRetention10)}</b><div>Exact title retention@10</div></div>
      </div>
      <p className="text-sm">Разметка top-10: <b>{report.top10Judgments.reviewed}/{report.top10Judgments.possible}</b> ({percent(report.top10Judgments.coverage)}). Сценариев: {report.cases}. Значение N/A не равно нулю; средние только по пригодным сценариям.</p>
      <p className="rounded-lg border border-amber-200 p-3 text-sm">Для Recall недостаточно списка UUID и переключателя «проверено». Модератор должен отдельно подтвердить полноту <i>ограниченной области</i> и указать метод проверки в поле «Основание независимой проверки», начиная текст с <code>SCOPE_COMPLETE_V1:</code> и добавив не менее 30 символов описания области и метода. Это аттестация человека, не автоматическая проверка БД. Если доказательств нет — Recall N/A.</p>
      <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs"><thead><tr className="border-b"><th className="p-2">Сценарий</th><th className="p-2">Оценено</th><th className="p-2">P@10</th><th className="p-2">Pool nDCG@10</th><th className="p-2">Scoped R@20</th></tr></thead>
        <tbody>{report.perCase.map(row=><tr className="border-b" key={row.caseId}><td className="p-2">{row.locale} · {row.query}</td><td className="p-2">{row.judgedTop10}/{row.top10Slots}</td><td className="p-2" title={row.p10.reason}>{percent(row.p10.value)}</td><td className="p-2" title={row.pooledNdcg10.reason}>{percent(row.pooledNdcg10.value)}</td><td className="p-2" title={row.scopedRecall20.reason}>{percent(row.scopedRecall20.value)}</td></tr>)}</tbody></table></div>
      <div className="space-y-2 rounded-lg border p-3 text-sm">
        <h3 className="font-semibold">Повторные замеры времени — без смешения разных запусков</h3>
        <p className="text-slate-600">Импортируйте несколько исходных диагностических JSON из ARI-02.1/02.2. Отчёт измеряет <b>общее время совместного запроса</b>, не разницу скоростей двух движков. Для p50/p95 нужно ≥5 повторов того же запроса, locale, серии и количества ОН; одинаковые количества не доказывают идентичность содержимого каталога.</p>
        <label className="block">Идентификатор серии замеров
          <input className="mt-1 w-full rounded border p-2" value={batchId} maxLength={100} onChange={e=>setBatchId(e.target.value)}/></label>
        <label className="block rounded border p-2">Импорт диагностических JSON (можно несколько)
          <input className="mt-1 block w-full" type="file" multiple accept=".json,application/json" onChange={e=>{void importTimings(e.target.files);e.target.value="";}}/></label>
        <p>Всего импортировано: {samples.length}; последняя сопоставимая группа: {group.length}; p50/p95: {latency.note}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{timingFields.map(field=>{
          const x=timingPercentiles(group,field);
          return <div className="rounded border p-2" key={field}><b>{field}</b>: {x.p50===null?"N/A":`${x.p50.toFixed(1)} / ${x.p95?.toFixed(1)} ms`}<div className="text-xs">p50 / p95 · n={x.n}</div></div>;
        })}</div>
      </div>
      {notice&&<p role="status" className="rounded border p-2 text-sm">{notice}</p>}
      <p className="text-xs text-slate-600">Методология: macro-mean по пригодным кейсам; unjudged ≠ grade 0; pooled nDCG не претендует на полноту каталога. Статус: локальная оценка, не production E2E.</p>
    </>}
  </section>;
}

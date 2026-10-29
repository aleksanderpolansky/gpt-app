/**
 * ARI-02.5: read-only, human-judged retrieval benchmark.
 * No Supabase access, network requests, LLM calls, or ontology mutations.
 * Source-of-truth for labels: the existing ARI02_GOLD_VERSION JSON corpus.
 */
import type { GoldCase, GoldCorpus, EngineKey, GoldCandidate } from "./ari02GoldCorpusV1";

export const ARI02_BENCHMARK_VERSION = "ARCTOR_ARI_02_5_BENCHMARK_V1" as const;
export type Metric = {
  value: number | null;
  reason: string;
  numerator: number | null;
  denominator: number | null;
};
export type CaseMetrics = {
  caseId: string; query: string; locale: string; engine: EngineKey;
  retrieved: number; judgedTop10: number; top10Slots: number;
  p10: Metric; pooledNdcg10: Metric; scopedRecall20: Metric; exactRetention10: Metric;
};
export type MetricAggregate = {mean: number | null; eligible: number; total: number};
export type BenchmarkSummary = {
  version: typeof ARI02_BENCHMARK_VERSION;
  engine: EngineKey;
  cases: number;
  p10: MetricAggregate;
  pooledNdcg10: MetricAggregate;
  scopedRecall20: MetricAggregate;
  exactRetention10: MetricAggregate;
  top10Judgments: {reviewed: number; possible: number; coverage: number | null};
  perCase: CaseMetrics[];
};
const na = (reason:string):Metric => ({value:null,reason,numerator:null,denominator:null});
const metric = (value:number,num:number,den:number,reason="OK"):Metric => ({value,reason,numerator:num,denominator:den});
const judged = (c:GoldCase,id:string):boolean => {
  const g=c.judgments[id]?.grade;
  return g===0 || g===1 || g===2 || g===3;
};
const grade = (c:GoldCase,id:string):number => c.judgments[id]?.grade ?? 0;
const dedupe = (rows:GoldCandidate[]):GoldCandidate[] => {
  const found=new Set<string>();
  return rows.filter(row=>{const key=row.id.toLowerCase(); if(found.has(key))return false;found.add(key);return true;});
};
const normalize = (s:string):string => s.normalize("NFKC").toLocaleLowerCase().replace(/ё/g,"е").trim();
const gain = (g:number):number => 2**g-1;
const dcg = (grades:number[]):number => grades.reduce((sum,g,i)=>sum+gain(g)/Math.log2(i+2),0);

/** Explicit human attestation. Merely setting catalogCheck is insufficient. */
const completenessAttested = (c:GoldCase):boolean =>
  c.catalogCheck==="scoped_checked" &&
  /^SCOPE_COMPLETE_V1:\s*\S[\s\S]{29,}/i.test(c.knownRelevantEvidence.trim());

export function assessAri02Case(c:GoldCase,engine:EngineKey):CaseMetrics {
  const rows=dedupe(c.runs[engine]??[]);
  const top=rows.slice(0,10);
  const reviewed=top.filter(x=>judged(c,x.id)).length;
  // Existing corpus does not capture ranking depth / whether a short result set was truncated.
  // Therefore less than 10 returned rows is not proof of exhaustive top-10 retrieval.
  let p10=na("N/A: меньше 10 результатов; полнота глубины выдачи неизвестна");
  if(top.length===10) {
    p10=reviewed===10
      ? metric(top.filter(x=>grade(c,x.id)>=2).length/10,top.filter(x=>grade(c,x.id)>=2).length,10)
      : na(`N/A: размечено ${reviewed}/10 первых результатов`);
  }
  let pooledNdcg10=na("N/A: требуется полная разметка объединённого пула top-10 обоих режимов");
  const poolIds=[...new Set(((["baseline","experimental"] as EngineKey[])
    .flatMap(key=>dedupe(c.runs[key]??[]).slice(0,10).map(x=>x.id))
    .concat(c.knownRelevantIds)).map(x=>x.toLowerCase()))];
  // All pooled candidates and all independent reference IDs must carry human relevance grades.
  if(top.length===10 && poolIds.length>0 && poolIds.every(id=>judged(c,id))){
    const ideal=poolIds.map(id=>grade(c,id)).sort((a,b)=>b-a).slice(0,10);
    const maxDcg=dcg(ideal);
    const actual=dcg(top.map(x=>grade(c,x.id)));
    pooledNdcg10=metric(maxDcg>0?Math.min(1,actual/maxDcg):0,actual,maxDcg,
      "Пуловый nDCG: идеал только внутри полностью размеченного пула; не full-catalog nDCG");
  }
  let scopedRecall20=na("N/A: нет независимо проверенного полного эталона в явно указанной области");
  const gold=[...new Set(c.knownRelevantIds.map(id=>id.toLowerCase()))];
  const contradictions=gold.some(id=>judged(c,id) && grade(c,id)<2);
  if(gold.length>0 && completenessAttested(c) && !contradictions){
    const found=new Set(dedupe(c.runs[engine]??[]).slice(0,20).map(row=>row.id.toLowerCase()));
    const hits=gold.filter(id=>found.has(id)).length;
    scopedRecall20=metric(hits/gold.length,hits,gold.length,"Только заявленная модератором полнота ограниченной области");
  }
  const exactIds=[...new Set(((["baseline","experimental"] as EngineKey[])
    .flatMap(key=>c.runs[key]??[])
    .filter(row=>normalize(row.title)===normalize(c.query) && judged(c,row.id) && grade(c,row.id)===3)
    .map(row=>row.id.toLowerCase())))];
  let exactRetention10=na("N/A: нет вручную подтверждённого точного совпадения названия");
  if(exactIds.length){
    const found=new Set(top.map(row=>row.id.toLowerCase()));
    const hits=exactIds.filter(id=>found.has(id)).length;
    exactRetention10=metric(hits/exactIds.length,hits,exactIds.length);
  }
  return {caseId:c.id,query:c.query,locale:c.locale,engine,retrieved:rows.length,
    judgedTop10:reviewed,top10Slots:top.length,p10,pooledNdcg10,scopedRecall20,exactRetention10};
}
const avg = (rows:CaseMetrics[],key:"p10"|"pooledNdcg10"|"scopedRecall20"|"exactRetention10"):MetricAggregate=>{
  const vals=rows.map(row=>row[key].value).filter((v):v is number=>v!==null);
  return {mean:vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null,eligible:vals.length,total:rows.length};
};
export function buildAri02Benchmark(corpus:GoldCorpus,engine:EngineKey):BenchmarkSummary{
  const perCase=corpus.cases.map(c=>assessAri02Case(c,engine));
  const reviewed=perCase.reduce((sum,c)=>sum+c.judgedTop10,0);
  const possible=perCase.reduce((sum,c)=>sum+c.top10Slots,0);
  return {version:ARI02_BENCHMARK_VERSION,engine,cases:perCase.length,
    p10:avg(perCase,"p10"),pooledNdcg10:avg(perCase,"pooledNdcg10"),
    scopedRecall20:avg(perCase,"scopedRecall20"),exactRetention10:avg(perCase,"exactRetention10"),
    top10Judgments:{reviewed,possible,coverage:possible?reviewed/possible:null},perCase};
}
export type TimingSample = {
  query:string;locale:string;batchId:string;catalogKey:string;
  totalMs:number;catalogLoadMs:number;scoringMs:number;traceMs:number;
};
const finite = (v:unknown):v is number=>typeof v==="number" && Number.isFinite(v) && v>=0 && v<600_000;
const o = (v:unknown):Record<string,unknown>=>v && typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:{};
/** Original ARI-02.1 diagnostics JSON. This measures the entire joint request, not per-engine latency. */
export function parseAri02TimingReport(input:unknown,batchId:string):TimingSample {
  const root=o(input),diag=o(root.diagnostics),totals=o(root.catalogTotals),scanned=o(root.scanned);
  const query=root.query,locale=root.locale;
  if(root.ok!==true || diag.version!=="ARCTOR_ARI_02_1_READ_ONLY_SEARCH_TRACE_V1" ||
    typeof query!=="string" || !query.trim() || typeof locale!=="string" ||
    ![diag.totalMs,diag.catalogLoadMs,diag.scoringMs,diag.traceMs].every(finite) ||
    !Number.isInteger(totals.ontology) || !Number.isInteger(scanned.ontology))
    throw new Error("TIMING_REPORT_INVALID_OR_INCOMPLETE");
  if(!batchId.trim())throw new Error("BATCH_ID_REQUIRED");
  return {query:query.slice(0,180),locale:locale.slice(0,8),batchId:batchId.slice(0,100),
    catalogKey:`${totals.ontology}/${scanned.ontology}`,
    totalMs:diag.totalMs as number,catalogLoadMs:diag.catalogLoadMs as number,
    scoringMs:diag.scoringMs as number,traceMs:diag.traceMs as number};
}
export type TimingStats = {n:number;p50:number|null;p95:number|null;note:string};
/** R-7 linear interpolation; at least five repeated observations of the same query/batch/catalog counts. */
export function timingPercentiles(samples:TimingSample[],field:keyof Pick<TimingSample,"totalMs"|"catalogLoadMs"|"scoringMs"|"traceMs">):TimingStats {
  if(!samples.length)return {n:0,p50:null,p95:null,note:"N/A: нет повторных замеров"};
  const one=samples[0];
  const same=samples.every(s=>s.query===one.query && s.locale===one.locale && s.batchId===one.batchId && s.catalogKey===one.catalogKey);
  if(!same)return {n:samples.length,p50:null,p95:null,note:"N/A: смешаны разные запросы, партии или размеры каталогов"};
  if(samples.length<5)return {n:samples.length,p50:null,p95:null,note:"N/A: требуется минимум 5 повторных замеров"};
  const sorted=samples.map(s=>s[field]).sort((a,b)=>a-b);
  const interp=(p:number):number=>{const pos=(sorted.length-1)*p,lo=Math.floor(pos),hi=Math.ceil(pos);return sorted[lo]+(sorted[hi]-sorted[lo])*(pos-lo);};
  return {n:samples.length,p50:interp(.5),p95:interp(.95),note:"R-7; одна партия/запрос/locale/число ОН; совпадение каталога по содержимому не доказано"};
}

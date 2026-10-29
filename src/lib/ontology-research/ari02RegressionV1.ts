/** ARI-02.6 v1: offline comparison of two independently exported Gold Corpus snapshots.
 * No search, API, DB or AI calls. A partial Gold Corpus is never a passing quality gate.
 * Comparisons use the same human assessments, language and query in both snapshots.
 */
import type { GoldCorpus, GoldCase, GoldCandidate, EngineKey } from "./ari02GoldCorpusV1";

export const ARI02_REGRESSION_VERSION = "ARCTOR_ARI_02_6_REGRESSION_V1" as const;
export type GateStatus = "PASS" | "FAIL" | "INCONCLUSIVE";
export type MetricDelta = { before: number | null; after: number | null; delta: number | null; comparable: boolean };
export type CaseComparison = {
  key: string; locale: string; query: string;
  beforeCount: number; afterCount: number;
  labeledBefore: number; labeledAfter: number;
  precision10: MetricDelta; scopedRecall20: MetricDelta;
  confirmedExactDropped: string[];
  notices: string[];
};
export type RegressionReport = {
  contract: typeof ARI02_REGRESSION_VERSION;
  engine: EngineKey; beforeCases: number; afterCases: number;
  locales: string[]; comparablePrecisionCases: number; comparableRecallCases: number;
  minComparableCases: number; cases: CaseComparison[];
  blockingIssues: string[]; warnings: string[];
  gate: GateStatus; gateExplanation: string;
};
const norm = (s: string) => s.normalize("NFKC").toLocaleLowerCase().replace(/ё/g,"е")
  .replace(/\s+/g," ").trim();
function mapCases(corpus: GoldCorpus, side: string): Map<string,GoldCase> {
  const m = new Map<string,GoldCase>();
  for (const c of corpus.cases) {
    const key = `${c.locale.toLowerCase()}::${norm(c.query)}`;
    if (m.has(key)) throw new Error(`${side}: DUPLICATE_CASE ${key}`);
    m.set(key,c);
  }
  return m;
}
function uniqueRows(c: GoldCase, engine: EngineKey): GoldCandidate[] {
  const seen = new Set<string>();
  return (c.runs[engine] ?? []).filter(row => {
    const id=row.id.toLowerCase(); if(seen.has(id)) return false; seen.add(id); return true;
  });
}
function knownGrade(c: GoldCase, id: string): number | null {
  const entry = Object.entries(c.judgments).find(([key]) => key.toLowerCase()===id.toLowerCase());
  const v=entry?.[1]?.grade;
  return v===0 || v===1 || v===2 || v===3 ? v : null;
}
function p10(c:GoldCase, engine:EngineKey):number|null {
  const rows=uniqueRows(c,engine).slice(0,10);
  if(rows.length!==10 || rows.some(r=>knownGrade(c,r.id)===null))return null;
  return rows.filter(r=>(knownGrade(c,r.id) ?? -1)>=2).length/10;
}
function hasScopedEvidence(c:GoldCase):boolean {
  return c.catalogCheck==="scoped_checked" && c.knownRelevantIds.length>0 &&
    /^SCOPE_COMPLETE_V1:\s*\S[\s\S]{29,}/i.test(c.knownRelevantEvidence.trim());
}
function r20(c:GoldCase,engine:EngineKey):number|null {
  if(!hasScopedEvidence(c))return null;
  const found=new Set(uniqueRows(c,engine).slice(0,20).map(row=>row.id.toLowerCase()));
  return c.knownRelevantIds.filter(id=>found.has(id.toLowerCase())).length / c.knownRelevantIds.length;
}
function delta(a:number|null,b:number|null):MetricDelta {
  return {before:a,after:b,delta:a===null||b===null?null:b-a,comparable:a!==null&&b!==null};
}
function judgedCount(c:GoldCase,engine:EngineKey):number {
  return uniqueRows(c,engine).slice(0,10).filter(r=>knownGrade(c,r.id)!==null).length;
}
function integrityIssues(a:GoldCase,b:GoldCase):string[] {
  const issues:string[]=[];
  const ids = new Set([...Object.keys(a.judgments).map(x=>x.toLowerCase()),...Object.keys(b.judgments).map(x=>x.toLowerCase())]);
  for(const id of ids) {
    const left=knownGrade(a,id),right=knownGrade(b,id);
    // Labels can be added, but already assessed labels must never disappear or change.
    if(left!==null && left!==right)issues.push(`GRADE_CHANGED_OR_REMOVED ${id}: ${left} -> ${right??"null"}`);
  }
  if(a.catalogCheck==="scoped_checked" && b.catalogCheck!=="scoped_checked")issues.push("SCOPED_ATTESTATION_REMOVED");
  if(hasScopedEvidence(a) && (
    !hasScopedEvidence(b) ||
    a.knownRelevantIds.map(x=>x.toLowerCase()).sort().join("|") !== b.knownRelevantIds.map(x=>x.toLowerCase()).sort().join("|") ||
    a.knownRelevantEvidence!==b.knownRelevantEvidence))issues.push("SCOPED_GOLD_CHANGED");
  return issues;
}
export function compareAri02GoldSnapshots(
  before:GoldCorpus,after:GoldCorpus,engine:EngineKey="experimental", minComparableCases=10,
):RegressionReport {
  if(before.contract!=="ARCTOR_ARI_02_3_GOLD_ANNOTATION_V1" || after.contract!==before.contract)
    throw new Error("GOLD_CONTRACT_MISMATCH");
  if(engine!=="baseline" && engine!=="experimental")throw new Error("INVALID_ENGINE");
  if(!Number.isInteger(minComparableCases) || minComparableCases<1 || minComparableCases>500)
    throw new Error("INVALID_MIN_CASES");
  const old=mapCases(before,"before"),next=mapCases(after,"after");
  const issues:string[]=[], warnings:string[]=[], out:CaseComparison[]=[];
  for(const key of old.keys())if(!next.has(key))issues.push(`MISSING_CASE ${key}`);
  for(const key of next.keys())if(!old.has(key))warnings.push(`NEW_CASE_NOT_COMPARABLE ${key}`);
  for(const [key,a] of old) {
    const b=next.get(key); if(!b)continue;
    const rowIssues=integrityIssues(a,b);
    for(const issue of rowIssues)issues.push(`${key}: ${issue}`);
    const beforeRows=uniqueRows(a,engine),afterRows=uniqueRows(b,engine);
    const beforeTop=beforeRows.slice(0,10),afterIds=new Set(afterRows.slice(0,10).map(x=>x.id.toLowerCase()));
    // Exact-match retention only when a human explicitly assigned grade 3 to a title identical to the query.
    const confirmedExactDropped=beforeTop.filter(row=>knownGrade(a,row.id)===3 && norm(row.title)===norm(a.query)
      && !afterIds.has(row.id.toLowerCase())).map(row=>row.id);
    for(const id of confirmedExactDropped)issues.push(`${key}: HUMAN_CONFIRMED_EXACT_DROPPED ${id}`);
    const precision10=delta(p10(a,engine),p10(b,engine));
    const scopedRecall20=delta(r20(a,engine),r20(b,engine));
    if(precision10.delta!==null && precision10.delta < -1e-10)
      issues.push(`${key}: PRECISION10_REGRESSION ${precision10.delta.toFixed(5)}`);
    if(scopedRecall20.delta!==null && scopedRecall20.delta < -1e-10)
      issues.push(`${key}: SCOPED_RECALL20_REGRESSION ${scopedRecall20.delta.toFixed(5)}`);
    const notices:string[]=[];
    if(!precision10.comparable)notices.push("P@10 N/A: less than ten graded results in one or both snapshots");
    if(!scopedRecall20.comparable)notices.push("R@20 N/A: human-attested scoped gold missing from one or both snapshots");
    out.push({key,locale:a.locale,query:a.query,beforeCount:beforeRows.length,afterCount:afterRows.length,
      labeledBefore:judgedCount(a,engine),labeledAfter:judgedCount(b,engine),
      precision10,scopedRecall20,confirmedExactDropped,notices});
  }
  const comparablePrecisionCases=out.filter(c=>c.precision10.comparable).length;
  const comparableRecallCases=out.filter(c=>c.scopedRecall20.comparable).length;
  const gate:GateStatus=issues.length>0?"FAIL":comparablePrecisionCases<minComparableCases?"INCONCLUSIVE":"PASS";
  const gateExplanation=gate==="FAIL"?`${issues.length} blocking regression/integrity issue(s)`:
    gate==="PASS"?`At least ${minComparableCases} fully judged comparable P@10 cases; no proven regressions`:
    `Only ${comparablePrecisionCases}/${minComparableCases} comparable fully judged P@10 cases; cannot certify quality`;
  return {contract:ARI02_REGRESSION_VERSION,engine,beforeCases:before.cases.length,afterCases:after.cases.length,
    locales:[...new Set(out.map(c=>c.locale))].sort(),comparablePrecisionCases,comparableRecallCases,
    minComparableCases,cases:out,blockingIssues:issues,warnings,gate,gateExplanation};
}

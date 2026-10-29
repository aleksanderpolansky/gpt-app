export const ARI02_GOLD_VERSION = "ARCTOR_ARI_02_3_GOLD_ANNOTATION_V1" as const;
export type Relevance = 0 | 1 | 2 | 3;
export type EngineKey = "baseline" | "experimental";
export type ErrorKind = "none" | "false_positive" | "wrong_facet" | "wrong_sense" |
  "translation" | "path_only" | "duplicate" | "other";
export type GoldCandidate = {
  id: string; title: string; path: string; role: string; rank: number; score: number;
};
export type GoldJudgment = { grade: Relevance | null; errorKind: ErrorKind; note: string };
export type GoldCase = {
  id: string; query: string; locale: string; perspective: string; purpose: string;
  notes: string; catalogCheck: "not_checked" | "scoped_checked";
  knownRelevantIds: string[]; knownRelevantEvidence: string;
  unresolvedConcepts: string[]; runs: Record<EngineKey, GoldCandidate[]>;
  judgments: Record<string, GoldJudgment>;
};
export type GoldCorpus = { contract: typeof ARI02_GOLD_VERSION; exportedAt: string;
  annotationMethod: string; cases: GoldCase[] };
const seeds: Array<[string,string,string,string]> = [
  ["прогулка с ребёнком","ru","mixed","Составная ситуация: не подменять понятие действием ходьбы"],
  ["ребёнок","ru","systems_structures","Возрастная категория, не человеческий организм"],
  ["дети","ru","systems_structures","Множественное число"],
  ["человек","ru","systems_structures","Человек и человеческий организм — разные смыслы"],
  ["child","en","systems_structures","Перевод и возрастная категория"],
  ["person","en","systems_structures","Person и organism не тождественны"],
  ["dziecko","pl","systems_structures","Польский поиск"],
  ["niño","es","systems_structures","Испанский поиск"],
  ["Kind","de","systems_structures","Немецкий поиск и омонимия"],
  ["дитина","uk","systems_structures","Украинская локализация"],
  ["dítě","cs","systems_structures","Чешский поиск"],
  ["ходьба","ru","actions_processes","Точное совпадение названия"],
  ["ходить пешком","ru","actions_processes","Морфология / перефразирование"],
  ["walking","en","actions_processes","Английское название"],
  ["прогулка","ru","actions_processes","Прогулка не равна ходьбе"],
  ["stroll","en","actions_processes","Синоним и отличие от walking"],
  ["сопровождение","ru","actions_processes","Процесс и отношение участия"],
  ["присмотр за ребёнком","ru","actions_processes","Социальный процесс или тип связи"],
  ["игра","ru","actions_processes","Омонимия / широкий процесс"],
  ["совместное пребывание","ru","actions_processes","Совместность как отношение или процесс"],
  ["состояние спокойствия","ru","states_needs","Полное название листового ОН"],
  ["усталость","ru","states_needs","Состояние без обязательной связи с ребёнком"],
  ["сон","ru","states_needs","Сон как процесс и состояние"],
  ["безопасность","ru","states_needs","Потребность, состояние и абстрактное свойство"],
];
export function emptyCase(query: string, locale = "ru", perspective = "mixed", purpose = ""): GoldCase {
  return { id: `case-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, query, locale,
    perspective, purpose, notes: "", catalogCheck: "not_checked", knownRelevantIds: [],
    knownRelevantEvidence: "", unresolvedConcepts: [], runs: {baseline: [], experimental: []}, judgments: {} };
}
export function starterCases(): GoldCase[] { return seeds.map(([q,l,f,p],i) => ({...emptyCase(q,l,f,p), id:`pilot-${String(i+1).padStart(2,"0")}`})); }
export function emptyCorpus(): GoldCorpus { return {contract:ARI02_GOLD_VERSION, exportedAt:"", annotationMethod:"human_review_not_db_proof",cases:starterCases()}; }
export const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const string = (v:unknown, cap=800):string => typeof v === "string" ? v.slice(0,cap) : "";
const obj = (v:unknown): Record<string,unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string,unknown> : {};
const arr = (v:unknown): unknown[] => Array.isArray(v) ? v : [];
function parseRows(input:unknown): GoldCandidate[] {
  const unique = new Set<string>();
  const out: GoldCandidate[] = [];
  for (const raw of arr(input).slice(0,500)) {
    const row=obj(raw), id=string(row.id,50);
    if (!uuidRegex.test(id) || unique.has(id)) continue;
    unique.add(id);
    out.push({id,title:string(row.title,250),path:string(row.path,1500),role:string(row.role,30),
      rank:out.length+1,score:typeof row.score === "number" && Number.isFinite(row.score) ? row.score : 0});
  }
  return out;
}
export function importDiagnosticReport(raw:unknown): {query:string;locale:string;runs:Record<EngineKey,GoldCandidate[]>} {
  const root=obj(raw), diag=obj(root.diagnostics), experiment=obj(diag.experimental);
  if (root.ok !== true || !string(root.query,180).trim() || !Array.isArray(diag.results)) throw new Error("NOT_ARI02_DIAGNOSTIC_REPORT");
  const baseline=parseRows(diag.results), enhanced=parseRows(experiment.rows);
  return {query:string(root.query,180).trim(),locale:string(root.locale,5)||"ru",runs:{baseline,experimental:enhanced}};
}
export function parseGoldCorpus(raw:unknown): GoldCorpus {
  const root=obj(raw);
  if (root.contract !== ARI02_GOLD_VERSION || !Array.isArray(root.cases) || root.cases.length>500) throw new Error("NOT_ARI02_GOLD_CORPUS");
  const cases: GoldCase[] = [];
  for (const item of root.cases) {
    const c=obj(item), run=obj(c.runs), judgments=obj(c.judgments);
    const q=string(c.query,180).trim(); if (q.length<2) continue;
    const j: Record<string,GoldJudgment>={};
    for (const [id,val] of Object.entries(judgments).slice(0,500)) {
      if (!uuidRegex.test(id)) continue;
      const v=obj(val), g=v.grade;
      j[id]={grade:g===0||g===1||g===2||g===3 ? g:null,
        errorKind:(["none","false_positive","wrong_facet","wrong_sense","translation","path_only","duplicate","other"].includes(string(v.errorKind)) ? v.errorKind : "none") as ErrorKind,
        note:string(v.note,1000)};
    }
    const gold=[...new Set(arr(c.knownRelevantIds).filter(v=>typeof v==="string" && uuidRegex.test(v)) as string[])].slice(0,100);
    cases.push({id:string(c.id,100)||`case-import-${cases.length}`,query:q,locale:string(c.locale,8)||"ru",
      perspective:string(c.perspective,50)||"mixed", purpose:string(c.purpose,250),notes:string(c.notes,3000),
      catalogCheck:c.catalogCheck==="scoped_checked"?"scoped_checked":"not_checked",knownRelevantIds:gold,
      knownRelevantEvidence:string(c.knownRelevantEvidence,2000),unresolvedConcepts:arr(c.unresolvedConcepts).filter(x=>typeof x==="string").slice(0,50).map(x=>string(x,150)),
      runs:{baseline:parseRows(run.baseline),experimental:parseRows(run.experimental)},judgments:j});
  }
  return {contract:ARI02_GOLD_VERSION,exportedAt:string(root.exportedAt,100),annotationMethod:"human_review_not_db_proof",cases};
}
/** Equivalent user spelling for import matching, not an ontology identity rule. */
export function normalizedGoldQuery(query: string): string {
  return query.normalize("NFKC").toLocaleLowerCase().replace(/ё/g,"е").replace(/\s+/g," ").trim();
}
export function countJudged(c:GoldCase,engine:EngineKey) {
  const items=c.runs[engine];return {total:items.length,judged:items.filter(x=>c.judgments[x.id]?.grade!==null && c.judgments[x.id]?.grade!==undefined).length};
}
export function precisionTen(c:GoldCase,engine:EngineKey):number|null {
  const top=c.runs[engine].slice(0,10);
  if (top.length!==10 || top.some(x=>c.judgments[x.id]?.grade===null || c.judgments[x.id]?.grade===undefined)) return null;
  return top.filter(x=>(c.judgments[x.id]?.grade??0)>=2).length/10;
}
export function recallTwenty(c:GoldCase,engine:EngineKey):number|null {
  if(c.catalogCheck!=="scoped_checked" || !/^SCOPE_COMPLETE_V1:\s*\S[\s\S]{29,}/i.test(c.knownRelevantEvidence.trim()) || !c.knownRelevantIds.length) return null;
  const found = new Set(c.runs[engine].slice(0,20).map(x=>x.id));
  return c.knownRelevantIds.filter(id=>found.has(id)).length/c.knownRelevantIds.length;
}

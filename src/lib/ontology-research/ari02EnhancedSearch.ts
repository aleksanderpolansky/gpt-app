/**
 * ARI-02.2 research-only deterministic alternative to ARI-02.1.
 * NOT an ontology truth engine, graph inference engine, synonym database or write path.
 * Experimental output must never be used to authorize ON creation.
 */

export type Ari02Facet = "systems_structures" | "actions_processes" | "states_needs" | "unknown";
export type Ari02MatchClass = "direct_title" | "partial_title" | "related_hypothesis";
export type Ari02Concept = "stroll" | "walking" | "child" | "person" | "accompany" | "care" | "calm";
export type Ari02EnhancedCandidate = {
  id: string;
  title: string;
  path: string;
  role: string;
  titleVariants: Array<{ locale: string; text: string }>;
};
export type Ari02EnhancedRow = {
  rank: number; id: string; title: string; path: string; role: string;
  facet: Ari02Facet; score: number; matchClass: Ari02MatchClass;
  matchedComponent: string; matchedTitle: string; matchedLocale: string;
  reason: string; verifiedRelation: false;
};
export type Ari02Component = { token: string; concept: Ari02Concept | null; facet: Ari02Facet; resolved: boolean };
export type Ari02EnhancedReport = {
  version: "ARI_02_2_EXPERIMENTAL_RULES_V1";
  disclaimer: string;
  queryComponents: Ari02Component[];
  facets: Ari02Facet[];
  derivedQueries: Array<{ term: string; reason: string; status: "hypothesis_only" }>;
  rows: Ari02EnhancedRow[];
  unresolvedComponents: string[];
  evaluated: number;
  totalMatched: number;
  executionMs: number;
};
const STOP = new Set(["с", "со", "и", "или", "в", "во", "на", "для", "по", "к", "из", "от", "у", "за", "при", "без", "a", "an", "the", "with", "and", "of", "in", "on", "to", "by", "de", "el", "la", "los", "las", "con", "und", "mit", "der", "die", "das", "den", "dem", "zum", "zur", "i", "z", "ze", "w", "we", "na", "oraz", "z", "do", "та", "із", "з", "у", "й", "і", "s", "se", "a", "en", "y"]);
const ALIAS: Record<Ari02Concept, string[]> = {
  stroll: ["прогулка", "прогулки", "прогулку", "прогулке", "прогулкою", "прогулянка", "прогулянки", "spacer", "spacery", "prochazka", "procházka", "paseo", "pasear", "stroll", "strolling", "leisure walk", "spaziergang"],
  walking: ["ходьба", "ходьбы", "ходьбу", "ходить", "хожу", "ходьбе", "ходiння", "ходіння", "хода", "ходьби", "walking", "walk", "walks", "gehen", "gehe", "caminar", "caminata", "chodzenie", "chodzić", "chodu", "chůze", "chuze"],
  child: ["ребенок", "ребенком", "ребенка", "ребенку", "ребенке", "ребенком", "ребенки", "ребёнок", "ребёнком", "ребёнка", "дети", "детей", "детям", "дитина", "дитини", "дитиною", "дитя", "child", "children", "kid", "kids", "dziecko", "dzieci", "kind", "kinder", "niño", "niña", "niños", "niñas", "dítě", "dite", "děti"],
  person: ["человек", "человека", "человеку", "человеком", "человеческий", "людина", "людини", "люди", "person", "people", "human", "menschen", "mensch", "persona", "personas", "osoba", "osoby", "człowiek", "clovek", "člověk"],
  accompany: ["сопровождение", "сопровождения", "сопровождать", "супровід", "супроводження", "accompany", "accompanying", "begleitung", "begleiten", "acompañar", "acompañamiento", "towarzyszenie", "doprovod"],
  care: ["присмотр", "присмотра", "нагляд", "supervision", "supervising", "aufsicht", "cuidado", "opiekа", "opieka", "dohled"],
  calm: ["спокойствие", "спокойствия", "спокій", "спокою", "calmness", "calm", "ruhe", "gelassenheit", "spokój", "spokoju", "calma", "klid", "klidu"],
};
const ALIASES: Array<{key: Ari02Concept; words: string[]}> = (Object.keys(ALIAS) as Ari02Concept[])
  .map(key => ({key, words: ALIAS[key].map(normalize)}));
export function normalize(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/ё/g, "е")
    .normalize("NFC").replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
}
export function tokenise(value: string): string[] {
  return normalize(value).split(" ").filter(word => word.length >= 2 && !STOP.has(word)).slice(0, 12);
}
function conceptOf(value: string): Ari02Concept | null {
  const n = normalize(value);
  for (const {key,words} of ALIASES) if (words.includes(n)) return key;
  return null;
}
function conceptFacet(c: Ari02Concept | null): Ari02Facet {
  if (c === "child" || c === "person") return "systems_structures";
  if (c === "stroll" || c === "walking" || c === "accompany" || c === "care") return "actions_processes";
  if (c === "calm") return "states_needs";
  return "unknown";
}
function facetFromPath(path: string): Ari02Facet {
  const root = normalize(path.split("›")[0] ?? "");
  if (/^(действия и процессы|actions and processes)/.test(root)) return "actions_processes";
  if (/^(состояния и потребности|states and needs)/.test(root)) return "states_needs";
  if (/^(системы и структуры|systems and structures)/.test(root)) return "systems_structures";
  return "unknown";
}
function normalizeTitleWords(title: string): string[] { return tokenise(title); }
function partsOf(query: string): Ari02Component[] {
  const n = normalize(query);
  const result: Ari02Component[] = [];
  // Recognise two-word aliases before single tokens; do not invent arbitrary entity parsing.
  let tokens = tokenise(n);
  for (let i=0; i<tokens.length; i++) {
    const phrase = i+1<tokens.length ? `${tokens[i]} ${tokens[i+1]}` : "";
    const bigram = phrase ? conceptOf(phrase) : null;
    const c = bigram ?? conceptOf(tokens[i]);
    const t = bigram ? phrase : tokens[i];
    result.push({token:t,concept:c,facet:conceptFacet(c),resolved:false});
    if (bigram) i++;
  }
  // Prevent duplicate concepts in one query from inflating ranking.
  const seen = new Set<string>();
  return result.filter(c => { const key=c.concept??c.token; if(seen.has(key))return false;seen.add(key);return true; });
}
function wordMatch(term: string, target: string): boolean {
  if (term === target) return true;
  // Prefix-only rule, not stemming; excludes unrelated short substrings.
  return term.length >= 6 && target.startsWith(term) && target.length - term.length <= 3;
}
function relationHint(from: Ari02Concept | null, to: Ari02Concept | null, facet: Ari02Facet): string | null {
  if (from === "stroll" && to === "walking" && facet === "actions_processes")
    return "Гипотеза: прогулка может включать ходьбу; это не синоним и не подтверждённая связь каталога.";
  if (from === "child" && to === "person" && facet === "systems_structures")
    return "Гипотеза более общего понятия: ребёнок — человек определённого возраста; нельзя подменять им запись о ребёнке.";
  return null;
}
function scoreCandidate(candidate: Ari02EnhancedCandidate, components: Ari02Component[]): Omit<Ari02EnhancedRow,"rank"> | null {
  const facet = facetFromPath(candidate.path);
  let best: Omit<Ari02EnhancedRow,"rank"> | null = null;
  for (const component of components) for (const variant of candidate.titleVariants) {
    // A generic request for a person/child must not match unrelated action/state titles
    // merely because their names say "of a person".
    if (components.length===1 && (component.concept==="person" || component.concept==="child")
        && facet!=="systems_structures") continue;
    const target = normalize(variant.text);
    if (!target) continue;
    const targetConcept=conceptOf(target);
    const targetWords=normalizeTitleWords(target);
    const containsConcept = !!component.concept && targetWords.some(w=>conceptOf(w)===component.concept);
    const queryWords=tokenise(component.token);
    const sameConcept = !!component.concept && targetConcept===component.concept;
    const exactTitle = target===normalize(component.token);
    const fullTitle = queryWords.length > 0 && queryWords.length===targetWords.length && queryWords.every((q,i)=>wordMatch(q,targetWords[i]));
    const overlap = queryWords.filter(q=>targetWords.some(w=>wordMatch(q,w))).length;
    const relatedHint=relationHint(component.concept,targetConcept,facet);
    let score=0; let matchClass:Ari02MatchClass="partial_title"; let reason="";
    if (exactTitle) { score=120;matchClass="direct_title";reason="Точное совпадение собственного названия ОН."; }
    else if (sameConcept && fullTitle) { score=110;matchClass="direct_title";reason="То же понятие в нормализованной форме собственного названия."; }
    else if (sameConcept) { score=95;matchClass="direct_title";reason="Известная словарная форма того же понятия; правило из ограниченного встроенного словаря."; }
    else if (fullTitle) { score=90;matchClass="partial_title";reason="Совпали слова собственного названия (не проверенная смысловая эквивалентность)."; }
    else if (containsConcept) { score=66;matchClass="partial_title";reason="В собственном названии есть словарная форма искомого понятия; это не идентичность объектов."; }
    else if (relatedHint) { score=42;matchClass="related_hypothesis";reason=relatedHint; }
    else if (overlap > 0) { score = 35 + 8 * overlap;matchClass="partial_title";reason="Частичное совпадение собственного названия; не подтверждает идентичность ОН."; }
    // IMPORTANT: no parent path match and no generic definition match for promotion.
    if (!score) continue;
    // A structural branch is an explanatory label, not statistical or causal weight.
    if (component.facet!=="unknown" && facet!=="unknown" && component.facet===facet)score+=2;
    const row:Omit<Ari02EnhancedRow,"rank">={id:candidate.id,title:candidate.title,path:candidate.path,
      role:candidate.role,facet,score,matchClass,matchedComponent:component.token,
      matchedTitle:variant.text,matchedLocale:variant.locale,reason,verifiedRelation:false};
    if(!best || row.score>best.score || (row.score===best.score && row.matchClass<best.matchClass))best=row;
  }
  return best;
}
export function evaluateAri02Enhanced(query:string, candidates:Ari02EnhancedCandidate[], limit:number, now:()=>number=()=>performance.now()):Ari02EnhancedReport {
  const start=now();
  const components=partsOf(query);
  const scored=candidates.map(c=>scoreCandidate(c,components)).filter((c):c is NonNullable<typeof c>=>c!==null)
    .sort((a,b)=>b.score-a.score || a.title.localeCompare(b.title,"ru") || a.id.localeCompare(b.id));
  for(const component of components)component.resolved=scored.some(s=>s.matchedComponent===component.token && s.matchClass==="direct_title");
  const derivedQueries:Array<{term:string;reason:string;status:"hypothesis_only"}>=[];
  if(components.some(c=>c.concept==="stroll"))derivedQueries.push({term:"ходьба",reason:"Проверить возможный процесс, входящий в прогулку; это не синоним.",status:"hypothesis_only"});
  if(components.some(c=>c.concept==="child"))derivedQueries.push({term:"человек",reason:"Проверить более широкий класс в ветви структур, не считать эквивалентным ребёнку.",status:"hypothesis_only"});
  const facets=[...new Set(components.map(c=>c.facet).filter(c=>c!=="unknown"))];
  return {version:"ARI_02_2_EXPERIMENTAL_RULES_V1",
    disclaimer:"Экспериментальные оценки отражают только собственные названия и ограниченные словарные правила. Гипотезы НЕ являются установленными отношениями; отсутствие совпадений НЕ доказывает отсутствия ОН. Никаких статистических весов, ML, Wikidata или морфологического анализатора здесь нет.",
    queryComponents:components,facets,derivedQueries,
    rows:scored.slice(0,Math.min(Math.max(limit,1),100)).map((row,i)=>({...row,rank:i+1})),
    unresolvedComponents:components.filter(c=>!c.resolved).map(c=>c.token),
    evaluated:candidates.length,totalMatched:scored.length,
    executionMs:Math.round((now()-start)*100)/100};
}

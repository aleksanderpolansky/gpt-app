export type ResearchStageAnswer = Record<string, unknown> & { summary: string };

export function parseResearchStageAnswer(value: string): {ok: true; result: ResearchStageAnswer} | {ok: false; error: string} {
  try {
    const parsed: unknown = JSON.parse(value.trim());
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {ok:false,error:"ANSWER_MUST_BE_JSON_OBJECT"};
    const row = parsed as Record<string, unknown>;
    if (typeof row.summary !== "string" || !row.summary.trim()) return {ok:false,error:"SUMMARY_STRING_REQUIRED"};
    for (const key of ["questions","existingOn","proposals","risks","nextSteps","uncertainties"]) {
      if (row[key] !== undefined && !Array.isArray(row[key])) return {ok:false,error:`${key}_MUST_BE_ARRAY`};
    }
    return {ok:true,result:row as ResearchStageAnswer};
  } catch {return {ok:false,error:"INVALID_JSON: check escaped line breaks and HTML entities"};}
}

export function readableResearchItem(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null) return "null";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(readableResearchItem).join("; ");
  if (!value || typeof value !== "object") return "Unknown item";
  const row=value as Record<string,unknown>;
  const lead=["title","name","label","id","uuid","status","role","path","parentId","description","reason","decision"]
    .filter(k=>row[k]!==undefined).map(k=>`${k}: ${readableResearchItem(row[k])}`);
  const remaining=Object.entries(row).filter(([k])=>!["title","name","label","id","uuid","status","role","path","parentId","description","reason","decision"].includes(k))
    .map(([k,v])=>`${k}: ${typeof v==="object" ? JSON.stringify(v) : readableResearchItem(v)}`);
  return [...lead,...remaining].join(" | ");
}

export function priorStagesAsStructuredData(prior: Partial<Record<string,string>>, order: readonly string[], active: string) {
  return order.filter(s=>order.indexOf(s)<order.indexOf(active)).map(stage=>{
    const raw=prior[stage]??"";
    const parsed=parseResearchStageAnswer(raw);
    return parsed.ok?{stage,answer:parsed.result,format:"structured_json"}:{stage,answer:raw,format:"unvalidated_text"};
  });
}

export function buildResearchSessionExport(input: {objective:string;search:string;answers:Partial<Record<string,string>>;drafts:Partial<Record<string,string>>}) {
  return JSON.stringify({contract:"ARCTOR_ONTO_AI_LOCAL_SESSION_EXPORT_V1",exportedAt:new Date().toISOString(),...input},null,2);
}

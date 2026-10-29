import type { EngineKey, ErrorKind, GoldCase, GoldCorpus, GoldCandidate, Relevance } from "./ari02GoldCorpusV1";

/** Read-only analysis of moderator annotations. Never infers absent ON from zero hits. */
export const ARI02_ERROR_AUDIT_VERSION = "ARCTOR_ARI_02_4_ERROR_AUDIT_V1" as const;

export type AuditIssueCode =
  | "unclassified_negative" | "contradictory_annotation" | "missing_explanation"
  | "unreviewed_result" | "verified_missing_top20" | "verified_not_returned"
  | "candidate_from_other_engine" | "reference_unverified" | "hypothesis_unresolved";
export type AuditIssue = {
  code: AuditIssueCode; caseId: string; engine: EngineKey | null;
  onId: string | null; title: string; detail: string;
  evidence: "manual_grade" | "scoped_catalog_reference" | "cross_engine_hint" | "incomplete_evidence";
};
export type EngineAudit = {
  engine: EngineKey; returned: number; judged: number; unjudged: number;
  relevant: number; context: number; notRelevant: number;
  confirmedMissingTop20: string[]; confirmedNotReturned: string[];
  otherEngineRelevantOnly: GoldCandidate[];
};
export type CaseErrorAudit = {
  caseId: string; query: string; locale: string;
  referenceUsable: boolean; referenceCount: number;
  engines: Record<EngineKey, EngineAudit>;
  issues: AuditIssue[];
};
export type ErrorAuditReport = {
  contract: typeof ARI02_ERROR_AUDIT_VERSION; generatedAt: string;
  sourceContract: string; scope: string;
  cases: CaseErrorAudit[]; summary: {
    totalCases: number; casesWithRuns: number; annotatedCases: number;
    independentlyCheckedCases: number; totalJudgedRows: number;
    confirmedMissingTop20: number; confirmedNotReturned: number;
    crossEngineSuggestions: number; classificationBacklog: number;
    issuesByCode: Record<AuditIssueCode, number>;
  };
};

const engineKeys: EngineKey[] = ["baseline", "experimental"];
const codes: AuditIssueCode[] = ["unclassified_negative", "contradictory_annotation", "missing_explanation",
  "unreviewed_result", "verified_missing_top20", "verified_not_returned",
  "candidate_from_other_engine", "reference_unverified", "hypothesis_unresolved"];
function usableReference(c: GoldCase) {
  // Scoped evidence is only as trustworthy as the moderator's independent review.
  return c.catalogCheck === "scoped_checked" && c.knownRelevantIds.length > 0 && c.knownRelevantEvidence.trim().length > 0;
}
function grade(c: GoldCase, id: string): Relevance | null {
  return c.judgments[id]?.grade ?? null;
}
function anyManualGrade(c: GoldCase): boolean {
  return Object.values(c.judgments).some(j => j.grade !== null);
}
function computeEngine(c: GoldCase, engine: EngineKey, referenceUsable: boolean): EngineAudit {
  const rows = c.runs[engine];
  const judged = rows.filter(row => grade(c, row.id) !== null).length;
  const other: EngineKey = engine === "baseline" ? "experimental" : "baseline";
  const ownIds = new Set(rows.map(row => row.id));
  const top20 = new Set(rows.slice(0,20).map(row => row.id));
  const confirmedIds = referenceUsable ? c.knownRelevantIds : [];
  const otherEngineRelevantOnly = c.runs[other].filter(row => !ownIds.has(row.id) && (grade(c, row.id) ?? -1) >= 2);
  return {
    engine, returned: rows.length, judged, unjudged: rows.length - judged,
    relevant: rows.filter(row => (grade(c, row.id) ?? -1) >= 2).length,
    context: rows.filter(row => grade(c, row.id) === 1).length,
    notRelevant: rows.filter(row => grade(c, row.id) === 0).length,
    confirmedMissingTop20: confirmedIds.filter(id => !top20.has(id)),
    confirmedNotReturned: confirmedIds.filter(id => !ownIds.has(id)),
    otherEngineRelevantOnly,
  };
}
export function auditGoldCase(c: GoldCase): CaseErrorAudit {
  const referenceUsable = usableReference(c);
  const engines: Record<EngineKey,EngineAudit> = {
    baseline: computeEngine(c,"baseline",referenceUsable),
    experimental: computeEngine(c,"experimental",referenceUsable),
  };
  const issues: AuditIssue[] = [];
  const add = (code: AuditIssueCode, engine: EngineKey|null, onId:string|null, title:string,detail:string,
    evidence:AuditIssue["evidence"]) => issues.push({code,caseId:c.id,engine,onId,title,detail,evidence});
  if (c.knownRelevantIds.length && !referenceUsable) {
    add("reference_unverified",null,null,"Незавершённый независимый эталон",
      "UUID внесены, но нет отметки ограниченной проверки каталога или документированного основания. Пропуски не подтверждены.","incomplete_evidence");
  }
  for (const concept of c.unresolvedConcepts) {
    add("hypothesis_unresolved",null,null,concept,"Гипотеза о понятии, а не доказанный отсутствующий ОН.","incomplete_evidence");
  }
  // A shared judgment is attributed to both engines only when the ON is returned by both.
  for (const engine of engineKeys) {
    const e = engines[engine];
    for (const row of c.runs[engine]) {
      const j = c.judgments[row.id];
      if (!j || j.grade === null) {
        add("unreviewed_result",engine,row.id,row.title,"Результат не размечен вручную; качество неизвестно.","incomplete_evidence");
        continue;
      }
      if (j.grade === 0 && (j.errorKind === "none" || !j.errorKind)) {
        add("unclassified_negative",engine,row.id,row.title,"ОН оценён как нерелевантный; укажите категорию причины.","manual_grade");
      }
      if (j.grade >= 2 && ["false_positive","wrong_facet","wrong_sense","path_only","duplicate"].includes(j.errorKind)) {
        add("contradictory_annotation",engine,row.id,row.title,"Оценка 2–3 противоречит выбранной категории ошибки; перепроверьте вручную.","manual_grade");
      }
      if (j.grade === 0 && !j.note.trim()) {
        add("missing_explanation",engine,row.id,row.title,"Для исключения из эталона рекомендуется записать причину.","incomplete_evidence");
      }
    }
    if (referenceUsable) {
      for (const id of e.confirmedMissingTop20) {
        add("verified_missing_top20",engine,id,id,
          "UUID независимо подтверждён в указанной области каталога, но отсутствует в топ-20 этой выдачи. Не утверждает полноту каталога.","scoped_catalog_reference");
      }
      for (const id of e.confirmedNotReturned) {
        add("verified_not_returned",engine,id,id,
          "UUID независимо подтверждён, но не возвращён данным режимом поиска (в пределах экспортированного списка).", "scoped_catalog_reference");
      }
    }
    for (const row of e.otherEngineRelevantOnly) {
      add("candidate_from_other_engine",engine,row.id,row.title,
        `В другом режиме этот ОН имеет ручную оценку >=2, но отсутствует в выдаче «${engine}». Проверьте отдельно; это ещё не подтверждённая ошибка полноты.`,"cross_engine_hint");
    }
  }
  return {caseId:c.id,query:c.query,locale:c.locale,referenceUsable,referenceCount:c.knownRelevantIds.length,engines,issues};
}
export function buildErrorAudit(corpus: GoldCorpus, generatedAt = ""): ErrorAuditReport {
  const cases=corpus.cases.map(auditGoldCase);
  const issuesByCode=Object.fromEntries(codes.map(code=>[code,0])) as Record<AuditIssueCode,number>;
  for (const c of cases) for (const issue of c.issues) issuesByCode[issue.code]++;
  const totalJudgedRows=cases.reduce((a,c)=>a+c.engines.baseline.judged+c.engines.experimental.judged,0);
  return {
    contract:ARI02_ERROR_AUDIT_VERSION,generatedAt,sourceContract:corpus.contract,
    scope:"Limited, manually annotated retrieval. No claim of complete ON catalog or causal/statistical relation.",
    cases, summary:{
      totalCases:cases.length,
      casesWithRuns:cases.filter(c=>c.engines.baseline.returned+c.engines.experimental.returned>0).length,
      annotatedCases:corpus.cases.filter(anyManualGrade).length,
      independentlyCheckedCases:cases.filter(c=>c.referenceUsable).length,
      totalJudgedRows,
      confirmedMissingTop20:issuesByCode.verified_missing_top20,
      confirmedNotReturned:issuesByCode.verified_not_returned,
      crossEngineSuggestions:issuesByCode.candidate_from_other_engine,
      classificationBacklog:issuesByCode.unclassified_negative+issuesByCode.contradictory_annotation+issuesByCode.missing_explanation,
      issuesByCode,
    }
  };
}
export const auditIssueLabels: Record<AuditIssueCode,string> = {
  unclassified_negative:"Неразмеченная причина нерелевантности",
  contradictory_annotation:"Противоречие между оценкой и типом ошибки",
  missing_explanation:"Нет объяснения отрицательной оценки",
  unreviewed_result:"Не оценён вручную",
  verified_missing_top20:"Подтверждённый ОН отсутствует в топ-20",
  verified_not_returned:"Подтверждённый ОН не выдан поиском",
  candidate_from_other_engine:"В другом режиме найден релевантный кандидат",
  reference_unverified:"Независимый эталон не подтверждён",
  hypothesis_unresolved:"Неисследованное понятие",
};
export function errorKindBreakdown(c:GoldCase): Partial<Record<ErrorKind,number>> {
  // UNIQUE ON IDs, not double-counting an ON seen in both engines.
  const ids=new Set([...c.runs.baseline,...c.runs.experimental].map(row=>row.id));
  const result: Partial<Record<ErrorKind,number>>={};
  for(const id of ids){const j=c.judgments[id];if(!j || j.grade!==0 || j.errorKind==="none")continue;
    result[j.errorKind]=(result[j.errorKind]??0)+1;}
  return result;
}

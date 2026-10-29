import { NextResponse } from "next/server";
import { requirePlatformAdmin, platformAdminErrorResponse } from "@/lib/admin/require-platform-admin";
import { supabase } from "../../../../../../lib/supabase";
import { localizeGlobalSystemValueObject } from "@/lib/reality-core/global-system-value-object-localization";
import { resolveLocalizedContentFieldsStrict } from "@/lib/localization/contentLocalization";
import { ARCTOR_TYPICAL_ACTIVITY_METADATA_V1 } from "@/lib/activity/typical-activity-catalog.server";
import { normalizeContextQuery } from "@/lib/ontology-research/contextSearchV2";
import { explainAri02LexicalMatch, type Ari02SearchField } from "@/lib/ontology-research/ari02SearchDiagnostics";
import { evaluateAri02Enhanced, type Ari02EnhancedCandidate } from "@/lib/ontology-research/ari02EnhancedSearch";
import { parseSearchOptions, scoreSearchCandidate } from "@/lib/ontology-research/researchSearchStrategyV3";
import {
  ONTO_AI_PILOT_CONTRACT, ONTO_LOCALES, validLocale,
  type OntoLocale, type OntoCandidate, type TypicalCandidate,
} from "@/lib/ontology-research/ontologyResearchV1";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const HEADERS = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" };
const MAX_ON_ROWS = 5000;
const PAGE_SIZE = 500;
const MAX_TEMPLATES = 500;
const MAX_MATCHED_TEMPLATES = 25;

type ValueObjectRow = {
  id: string;
  title: string | null;
  description: string | null;
  metadata_json: unknown;
  ontology_node_role_code: string | null;
  parent_value_object_id: string | null;
  canonical_key: string | null;
  branch_type_code: string | null;
};
type TemplateRow = {
  id: string;
  title: string | null;
  short_title: string | null;
  description: string | null;
  template_group: string | null;
  default_metadata_json: unknown;
};
function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}
function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function localizedTemplateTitle(row: TemplateRow, locale: OntoLocale): string {
  const meta = asRecord(row.default_metadata_json);
  const materialized = asRecord(meta?.curatorSystemMaterializationV1);
  const locales = asRecord(materialized?.localizations);
  const selected = asRecord(locales?.[locale]);
  const english = asRecord(locales?.en);
  const strict = resolveLocalizedContentFieldsStrict({
    metadata: row.default_metadata_json, locale, fieldCodes: ["title"],
  });
  return text(strict.title) ?? text(selected?.title) ?? text(english?.title) ?? text(row.title) ?? "";
}
function localizedOn(row: ValueObjectRow, locale: OntoLocale) {
  const localized = localizeGlobalSystemValueObject(row, locale);
  return { title: localized.title ?? row.title ?? "", description: localized.description ?? row.description ?? "" };
}
function fullPath(row: ValueObjectRow, byId: Map<string, ValueObjectRow>, locale: OntoLocale) {
  const visited = new Set<string>();
  const names: string[] = [];
  let current: ValueObjectRow | undefined = row;
  for (let i = 0; i < 48 && current && !visited.has(current.id); i++) {
    visited.add(current.id);
    names.unshift(localizedOn(current, locale).title || current.id);
    current = current.parent_value_object_id ? byId.get(current.parent_value_object_id) : undefined;
  }
  return names.join(" › ");
}
async function loadSystemOnSnapshot(): Promise<{ rows: ValueObjectRow[]; total: number | null }> {
  const rows: ValueObjectRow[] = [];
  let total: number | null = null;
  for (let start = 0; start < MAX_ON_ROWS; start += PAGE_SIZE) {
    const end = Math.min(start + PAGE_SIZE, MAX_ON_ROWS) - 1;
    const response = await supabase.from("value_objects")
      .select("id,title,description,metadata_json,ontology_node_role_code,parent_value_object_id,canonical_key,branch_type_code", { count: "exact" })
      .eq("scope_code", "global")
      .eq("origin_type_code", "system_model")
      .eq("status", "active")
      .order("id", { ascending: true }).range(start, end);
    if (response.error) throw new Error(`ONTO_CATALOG_QUERY_FAILED:${response.error.code ?? "DB"}`);
    if (total === null && typeof response.count === "number") total = response.count;
    const batch = (response.data ?? []) as ValueObjectRow[];
    rows.push(...batch);
    if (batch.length < end - start + 1) break;
  }
  return { rows, total };
}
function warningStrings(locale: OntoLocale, noMatch: boolean, incomplete: boolean, templateTruncated: boolean): string[] {
  const isRu = locale === "ru";
  const msgs = [isRu
    ? "Выданные совпадения — контекст для исследования, а не полная семантическая проверка онтологии."
    : "Matches are a research context, not a complete semantic verification of the ontology."];
  if (incomplete) msgs.push(isRu
    ? "Часть системных ОН не попала в снимок: нельзя делать вывод об отсутствии объекта."
    : "Some system ON records are outside this snapshot; absence cannot be established.");
  if (templateTruncated) msgs.push(isRu
    ? "Каталог типовых активностей ограничен по количеству строк."
    : "The typical-activity catalog was limited by row count.");
  if (noMatch) msgs.push(isRu
    ? "По этому запросу совпадений нет. Проверьте синонимы и английские термины; НЕ создавайте ОН на основании этой выдачи."
    : "No matching results. Check synonyms or English terms; do NOT infer that an ON is absent.");
  return msgs;
}
export async function GET(request: Request) {
  const guard = await requirePlatformAdmin({ allowedRoles: ["owner", "admin", "viewer"] });
  if (!guard.ok) return platformAdminErrorResponse(guard, ONTO_AI_PILOT_CONTRACT);
  const url = new URL(request.url);
  const term = url.searchParams.get("q")?.trim() ?? "";
  const localeRaw = url.searchParams.get("locale");
  const locale: OntoLocale = validLocale(localeRaw) ? localeRaw : "ru";
  let options;
  try { options = parseSearchOptions(url.searchParams); }
  catch { return NextResponse.json({ok:false,errorCode:"INVALID_SEARCH_OPTIONS"},{status:400,headers:HEADERS}); }
  if (term.length < 2 || term.length > 180) {
    return NextResponse.json({ok:false,errorCode:"SEARCH_TERM_2_TO_180_REQUIRED"},{status:400,headers:HEADERS});
  }
  const startedAt = performance.now();
  try {
    const catalogStartAt = performance.now();
    const [snapshot, templateResponse] = await Promise.all([
      loadSystemOnSnapshot(),
      supabase.from("activity_templates")
        .select("id,title,short_title,description,template_group,default_metadata_json", { count: "exact" })
        .eq("template_scope", "system")
        .is("owner_user_id", null).is("organization_id", null)
        .eq("status", "active").eq("is_active", true)
        .contains("default_metadata_json", ARCTOR_TYPICAL_ACTIVITY_METADATA_V1)
        .order("id", { ascending: true }).range(0, MAX_TEMPLATES - 1),
    ]);
    const catalogLoadedAt = performance.now();
    if (templateResponse.error) throw new Error(`TEMPLATE_CATALOG_QUERY_FAILED:${templateResponse.error.code ?? "DB"}`);
    const rows = snapshot.rows;
    const templates = (templateResponse.data ?? []) as TemplateRow[];
    const byId = new Map(rows.map(row => [row.id, row]));
    const terms = [term, ...options.extraTerms.filter(t => normalizeContextQuery(t) !== normalizeContextQuery(term))];
    const onScored = rows.map(row => {
      const localized = localizedOn(row, locale);
      const alternatives = (options.allLocales ? ONTO_LOCALES : [locale]).map(code => localizedOn(row, code));
      const paths = options.includePaths ? (options.allLocales ? ONTO_LOCALES : [locale]).map(code => fullPath(row, byId, code)) : [];
      const score = scoreSearchCandidate({
        terms,
        titles: [row.title ?? "", ...alternatives.map(x => x.title)],
        paths,
        extra: [row.canonical_key ?? "", ...(options.includeDefinitions ? [row.description ?? "", ...alternatives.map(x => x.description)] : [])],
      });
      return { id: row.id, title: localized.title, role: row.ontology_node_role_code ?? "unknown",
        path: fullPath(row, byId, locale), description: localized.description.slice(0, 300), score };
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score || a.id.localeCompare(b.id));
    const ontology: OntoCandidate[] = onScored.slice(0, options.maxOnMatches)
      .map(x=>({id:x.id,title:x.title,role:x.role,path:x.path,description:x.description}));
    const templateScored = (options.includeTemplates ? templates : []).map(row => {
      const localizedTitles = (options.allLocales ? ONTO_LOCALES : [locale]).map(code => localizedTemplateTitle(row, code));
      const title = localizedTemplateTitle(row, locale);
      const score = scoreSearchCandidate({
        terms,
        titles: [row.title ?? "", row.short_title ?? "", ...localizedTitles],
        extra: [row.description ?? "", row.template_group ?? ""],
      });
      return { id:row.id,title,group:row.template_group??"general",score };
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score || a.id.localeCompare(b.id));
    const selectedTemplates: TypicalCandidate[] = templateScored.slice(0, MAX_MATCHED_TEMPLATES)
      .map(x=>({id:x.id,title:x.title,group:x.group}));
    const scoredAt = performance.now();
    const diagnosticsRequested = url.searchParams.get("diagnostics") === "1";
    const diagnosticResults = diagnosticsRequested ? onScored.slice(0, options.maxOnMatches).map((candidate, index) => {
      const row = byId.get(candidate.id);
      if (!row) throw new Error("ARI02_ROW_NOT_IN_SNAPSHOT");
      const codes = options.allLocales ? ONTO_LOCALES : [locale];
      const fields: Ari02SearchField[] = [
        {field:"title",locale:"db",value:row.title ?? ""},
        ...codes.map(code => ({field:"title" as const,locale:code,value:localizedOn(row,code).title})),
        ...(options.includePaths ? codes.map(code => ({field:"path" as const,locale:code,value:fullPath(row,byId,code)})) : []),
        {field:"canonical_key",locale:"db",value:row.canonical_key ?? ""},
        ...(options.includeDefinitions ? [
          {field:"definition" as const,locale:"db",value:row.description ?? ""},
          ...codes.map(code => ({field:"definition" as const,locale:code,value:localizedOn(row,code).description})),
        ] : []),
      ];
      const explanation = explainAri02LexicalMatch(terms, fields);
      return {rank:index+1,id:candidate.id,title:candidate.title,path:candidate.path,
        role:candidate.role,score:candidate.score,bestEvidence:explanation.bestEvidence,
        topEvidence:explanation.topEvidence,scoreParity:explanation.score===candidate.score};
    }) : [];
    const enhancedRequested = diagnosticsRequested && url.searchParams.get("experimental") === "ari02_2";
    const experimental = enhancedRequested ? evaluateAri02Enhanced(term, rows.map((row): Ari02EnhancedCandidate => ({
      id: row.id,
      title: localizedOn(row, locale).title,
      path: fullPath(row, byId, "ru"),
      role: row.ontology_node_role_code ?? "unknown",
      titleVariants: [
        {locale:"db", text:row.title ?? ""},
        ...(options.allLocales ? ONTO_LOCALES : [locale]).map(code => ({locale:code, text:localizedOn(row,code).title})),
      ],
    })), options.maxOnMatches) : undefined;
    const baselineComparison = experimental ? {
      oldMatched: onScored.length,
      newMatched: experimental.totalMatched,
      oldTopTitles: onScored.slice(0, 10).map(x => x.title),
      newTopTitles: experimental.rows.slice(0, 10).map(x => x.title),
      oldTopWithoutNewTitleMatch: onScored.slice(0, 10)
        .filter(x => !experimental.rows.some(r => r.id === x.id)).map(x => x.title),
      note: "Different heuristics, not measured precision/recall; gold-label dataset required.",
    } : undefined;
    const tracedAt = performance.now();
    const ms = (n:number) => Math.round(n*100)/100;
    const diagnostics = diagnosticsRequested ? {
      version:"ARCTOR_ARI_02_1_READ_ONLY_SEARCH_TRACE_V1",
      totalMs:ms(tracedAt-startedAt), catalogLoadMs:ms(catalogLoadedAt-catalogStartAt),
      scoringMs:ms(scoredAt-catalogLoadedAt),traceMs:ms(tracedAt-scoredAt),
      results:diagnosticResults, experimental, baselineComparison,
    } : undefined;
    const incomplete = snapshot.total === null || snapshot.total > rows.length;
    const templateTruncated = templateResponse.count === null || templateResponse.count > templates.length;
    const noMatch = ontology.length === 0 && selectedTemplates.length === 0;
    return NextResponse.json({ok:true,contract:ONTO_AI_PILOT_CONTRACT,
      query:normalizeContextQuery(term),locale,ontology,templates:selectedTemplates,
      scanned:{ontology:rows.length,templates:templates.length},coverage:"partial",
      searchDetails: {terms,options:{allLocales:options.allLocales,includePaths:options.includePaths,
        includeDefinitions:options.includeDefinitions,includeTemplates:options.includeTemplates,
        maxOnMatches:options.maxOnMatches},matchedOn:onScored.length,
        matchedTemplates:templateScored.length,onTruncated:onScored.length>ontology.length,
        templateTruncated:templateScored.length>selectedTemplates.length},
      catalogTotals:{ontology:snapshot.total,templates:templateResponse.count},
      diagnostics,
      warnings:warningStrings(locale,noMatch,incomplete,templateTruncated),
      dbWritesPerformed:false,aiCallsPerformed:false},{headers:HEADERS});
  } catch (error) {
    console.error("ONTO_AI_CONTEXT_READ_FAILED", error instanceof Error ? error.message : "UNKNOWN");
    return NextResponse.json({ok:false,errorCode:"ONTO_AI_CONTEXT_READ_FAILED"},{status:503,headers:HEADERS});
  }
}

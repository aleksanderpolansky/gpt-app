import { supabase } from "../../../lib/supabase";
import {
  AI_CONTROL_LOCALES,
  DEFAULT_PROCESSING_RULES,
  PROCESSING_RULE_ACTIONS,
  PROCESSING_RULE_MATCHERS,
  SYSTEM_AI_GUARDS,
  AI_CONTROL_PRECEDENCE,
  detectProcessingRuleConflicts,
  parseProcessingRuleStoredText,
  serializeProcessingRule,
  validateProcessingRuleDraft,
  type AiControlLocale,
  type ProcessingRuleCatalogItem,
  type ProcessingRuleDraft,
} from "./processingRuleContract";

const STORAGE_PREFIX = "processing_rule__";
const MAX_HISTORY_PER_RULE = 20;

type InstructionSetRow = {
  id: string;
  instruction_code: string;
  locale_code: string;
  purpose_text: string | null;
  current_revision: number;
  current_instruction_text: string;
  status: "active" | "inactive";
  updated_by_app_user_id: string | null;
  created_at: string;
  updated_at: string;
};

type RevisionRow = {
  id: string;
  instruction_set_id: string;
  instruction_code: string;
  locale_code: string;
  revision: number;
  instruction_text: string;
  created_at: string;
};

function storageCode(ruleCode: string) {
  return `${STORAGE_PREFIX}${ruleCode}`;
}

function ruleCodeFromStorage(value: string) {
  return value.startsWith(STORAGE_PREFIX) ? value.slice(STORAGE_PREFIX.length) : null;
}

function normalizeLocale(value: unknown): AiControlLocale {
  return typeof value === "string" && (AI_CONTROL_LOCALES as readonly string[]).includes(value)
    ? (value as AiControlLocale)
    : "global";
}

function defaultFor(ruleCode: string) {
  return DEFAULT_PROCESSING_RULES.find((item) => item.ruleCode === ruleCode) ?? null;
}

function rowToDraft(row: InstructionSetRow): ProcessingRuleDraft | null {
  const parsed = parseProcessingRuleStoredText(row.current_instruction_text);
  if (!parsed) return null;
  const ruleCode = ruleCodeFromStorage(row.instruction_code);
  if (!ruleCode || ruleCode !== parsed.ruleCode) return null;
  return { ...parsed, localeCode: normalizeLocale(row.locale_code) };
}

async function readRuleRows(localeCode: AiControlLocale) {
  const locales = localeCode === "global" ? ["global"] : ["global", localeCode];
  const { data, error } = await supabase
    .from("ai_processing_instruction_sets")
    .select("id,instruction_code,locale_code,purpose_text,current_revision,current_instruction_text,status,updated_by_app_user_id,created_at,updated_at")
    .like("instruction_code", `${STORAGE_PREFIX}%`)
    .in("locale_code", locales)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`AI_PROCESSING_RULE_READ_FAILED: ${error.message}`);
  return (data ?? []) as InstructionSetRow[];
}

async function readRuleHistory(rows: InstructionSetRow[]) {
  const codes = [...new Set(rows.map((row) => row.instruction_code))];
  if (codes.length === 0) return new Map<string, RevisionRow[]>();
  const { data, error } = await supabase
    .from("ai_processing_instruction_revisions")
    .select("id,instruction_set_id,instruction_code,locale_code,revision,instruction_text,created_at")
    .in("instruction_code", codes)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`AI_PROCESSING_RULE_HISTORY_READ_FAILED: ${error.message}`);
  const result = new Map<string, RevisionRow[]>();
  for (const row of (data ?? []) as RevisionRow[]) {
    const key = `${row.instruction_code}::${row.locale_code}`;
    const current = result.get(key) ?? [];
    if (current.length < MAX_HISTORY_PER_RULE) current.push(row);
    result.set(key, current);
  }
  return result;
}

export async function readProcessingControlCatalog(localeInput: unknown) {
  const localeCode = normalizeLocale(localeInput);
  const rows = await readRuleRows(localeCode);
  const historyByKey = await readRuleHistory(rows);
  const rowByRuleLocale = new Map<string, InstructionSetRow>();

  for (const row of rows) {
    const ruleCode = ruleCodeFromStorage(row.instruction_code);
    if (!ruleCode) continue;
    rowByRuleLocale.set(`${ruleCode}::${row.locale_code}`, row);
  }

  const ruleCodes = new Set<string>(DEFAULT_PROCESSING_RULES.map((item) => item.ruleCode));
  for (const row of rows) {
    const code = ruleCodeFromStorage(row.instruction_code);
    if (code) ruleCodes.add(code);
  }

  const items: ProcessingRuleCatalogItem[] = [];
  for (const ruleCode of [...ruleCodes].sort()) {
    const localeRow = localeCode === "global" ? null : rowByRuleLocale.get(`${ruleCode}::${localeCode}`) ?? null;
    const globalRow = rowByRuleLocale.get(`${ruleCode}::global`) ?? null;
    const activeLocale = localeRow?.status === "active" ? localeRow : null;
    const activeGlobal = globalRow?.status === "active" ? globalRow : null;
    const selectedRow = activeLocale ?? activeGlobal;
    const selectedDraft = selectedRow ? rowToDraft(selectedRow) : null;
    const fallback = defaultFor(ruleCode);
    const inactiveCustom = !selectedDraft && !fallback ? localeRow ?? globalRow : null;
    const inactiveDraft = inactiveCustom ? rowToDraft(inactiveCustom) : null;
    const draft = selectedDraft ?? fallback ?? inactiveDraft;
    if (!draft) continue;

    const source = selectedRow
      ? selectedRow.locale_code === "global" && localeCode !== "global"
        ? "db_global"
        : "db_locale"
      : fallback
        ? "code_default"
        : "db_custom_inactive";
    const historyRow = localeRow ?? globalRow ?? selectedRow;
    const historyKey = historyRow ? `${historyRow.instruction_code}::${historyRow.locale_code}` : null;
    const history = historyKey ? historyByKey.get(historyKey) ?? [] : [];

    items.push({
      ...draft,
      localeCode: selectedRow ? normalizeLocale(selectedRow.locale_code) : draft.localeCode,
      status: selectedRow ? draft.status : fallback ? fallback.status : "inactive",
      source,
      instructionSetId: selectedRow?.id ?? inactiveCustom?.id ?? null,
      revision: selectedRow?.current_revision ?? inactiveCustom?.current_revision ?? null,
      updatedAt: selectedRow?.updated_at ?? inactiveCustom?.updated_at ?? null,
      isCodeDefault: Boolean(fallback),
      runtimeConsumption: draft.runtimeTargets.includes("activity_quick_capture")
        ? "runtime_wired"
        : "catalog_only_until_executor_wired",
      history: history.map((revision) => ({
        id: revision.id,
        revision: revision.revision,
        ruleSnapshot: parseProcessingRuleStoredText(revision.instruction_text),
        createdAt: revision.created_at,
      })),
      conflicts: [],
    });
  }

  return {
    localeCode,
    precedence: AI_CONTROL_PRECEDENCE,
    matchers: PROCESSING_RULE_MATCHERS,
    actions: PROCESSING_RULE_ACTIONS,
    processingRules: detectProcessingRuleConflicts(items),
    systemGuards: SYSTEM_AI_GUARDS,
    runtimeConsumptionNote:
      "Для activity_quick_capture универсальный executor подключен: активные безопасные правила читаются из этого каталога во время фоновой обработки. Другие runtimeTargets остаются catalog_only_until_executor_wired до отдельного подключения.",
    storageContract: {
      table: "public.ai_processing_instruction_sets",
      revisionTable: "public.ai_processing_instruction_revisions",
      storagePrefix: STORAGE_PREFIX,
      executableCodeInDatabase: false,
    },
  };
}

export async function saveProcessingRuleOverride(input: {
  rule: unknown;
  localeCode: unknown;
  updatedByAppUserId: string;
}) {
  const parsedRule = input.rule && typeof input.rule === "object" && !Array.isArray(input.rule)
    ? { ...(input.rule as Record<string, unknown>), localeCode: normalizeLocale(input.localeCode) }
    : input.rule;
  const validated = validateProcessingRuleDraft(parsedRule);
  if (!validated.ok) throw new Error(validated.error);
  const rule = validated.value;
  const instructionCode = storageCode(rule.ruleCode);

  const { data: existingData, error: existingError } = await supabase
    .from("ai_processing_instruction_sets")
    .select("id,current_revision")
    .eq("instruction_code", instructionCode)
    .eq("locale_code", rule.localeCode)
    .maybeSingle();
  if (existingError) throw new Error(`AI_PROCESSING_RULE_EXISTING_READ_FAILED: ${existingError.message}`);

  const nextRevision = (existingData?.current_revision ?? 0) + 1;
  const storedText = serializeProcessingRule(rule);
  const { data: upserted, error: upsertError } = await supabase
    .from("ai_processing_instruction_sets")
    .upsert(
      {
        instruction_code: instructionCode,
        locale_code: rule.localeCode,
        purpose_text: rule.purpose,
        current_revision: nextRevision,
        current_instruction_text: storedText,
        // The instruction-set row remains active as an override container.
        // rule.status inside current_instruction_text controls whether the rule itself runs.
        // This allows an administrator to disable a code-default rule without deleting history.
        status: "active",
        updated_by_app_user_id: input.updatedByAppUserId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "instruction_code,locale_code" },
    )
    .select("id")
    .single();
  if (upsertError || !upserted?.id) throw new Error(`AI_PROCESSING_RULE_UPSERT_FAILED: ${upsertError?.message ?? "missing id"}`);

  const { error: revisionError } = await supabase
    .from("ai_processing_instruction_revisions")
    .insert({
      instruction_set_id: upserted.id,
      instruction_code: instructionCode,
      locale_code: rule.localeCode,
      revision: nextRevision,
      instruction_text: storedText,
      change_note: "admin_processing_rule_save",
      changed_by_app_user_id: input.updatedByAppUserId,
    });
  if (revisionError) throw new Error(`AI_PROCESSING_RULE_REVISION_FAILED: ${revisionError.message}`);

  return readProcessingControlCatalog(rule.localeCode);
}

export async function deactivateProcessingRule(input: {
  ruleCode: unknown;
  localeCode: unknown;
  updatedByAppUserId: string;
}) {
  const localeCode = normalizeLocale(input.localeCode);
  const ruleCode = typeof input.ruleCode === "string" ? input.ruleCode.trim() : "";
  const fallback = defaultFor(ruleCode);
  const existingValidation = validateProcessingRuleDraft({
    ...(fallback ?? {
      ruleCode,
      title: "placeholder",
      purpose: "placeholder",
      runtimeTargets: ["activity_quick_capture"],
      matcherCode: "modifier_only_measurement",
      actionCode: "attach_to_adjacent_semantic_activity",
      priority: 0,
      status: "inactive",
      parameters: {},
      examples: [],
    }),
    ruleCode,
    localeCode,
  });
  if (!existingValidation.ok) throw new Error("PROCESSING_RULE_CODE_INVALID");
  const instructionCode = storageCode(ruleCode);

  const { data: existing, error: readError } = await supabase
    .from("ai_processing_instruction_sets")
    .select("id,current_revision,current_instruction_text")
    .eq("instruction_code", instructionCode)
    .eq("locale_code", localeCode)
    .maybeSingle();
  if (readError) throw new Error(`AI_PROCESSING_RULE_EXISTING_READ_FAILED: ${readError.message}`);
  if (!existing?.id) return readProcessingControlCatalog(localeCode);

  const nextRevision = (existing.current_revision ?? 0) + 1;
  const { error: updateError } = await supabase
    .from("ai_processing_instruction_sets")
    .update({
      status: "inactive",
      current_revision: nextRevision,
      updated_by_app_user_id: input.updatedByAppUserId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id);
  if (updateError) throw new Error(`AI_PROCESSING_RULE_DEACTIVATE_FAILED: ${updateError.message}`);

  const { error: revisionError } = await supabase
    .from("ai_processing_instruction_revisions")
    .insert({
      instruction_set_id: existing.id,
      instruction_code: instructionCode,
      locale_code: localeCode,
      revision: nextRevision,
      instruction_text: existing.current_instruction_text,
      change_note: fallback ? "admin_processing_rule_restore_code_default" : "admin_processing_rule_deactivate",
      changed_by_app_user_id: input.updatedByAppUserId,
    });
  if (revisionError) throw new Error(`AI_PROCESSING_RULE_REVISION_FAILED: ${revisionError.message}`);

  return readProcessingControlCatalog(localeCode);
}

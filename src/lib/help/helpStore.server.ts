import { supabase } from "../../../lib/supabase";
import type {
  HelpBlockKind,
  HelpContentRecord,
  HelpTranslations,
} from "./helpTypes";
import type { LocaleCode } from "@/i18n";

type Row = Record<string, unknown>;

function asRecord(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Row)
    : {};
}

function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asInt(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.trunc(value)
    : 0;
}

const LOCALES: LocaleCode[] = ["ru", "pl", "en", "es", "uk", "de", "cs"];

function normalizeTranslations(value: unknown): HelpTranslations {
  const record = asRecord(value);
  return Object.fromEntries(
    LOCALES.map((locale) => [locale, asText(record[locale])]),
  ) as HelpTranslations;
}

function normalizeRow(row: Row): HelpContentRecord {
  return {
    helpKey: asText(row.help_key),
    blockKind: (row.block_kind === "why" ? "why" : "what") as HelpBlockKind,
    sourceLocale: (LOCALES.includes(row.source_locale as LocaleCode)
      ? row.source_locale
      : "en") as LocaleCode,
    sourceText: asText(row.source_text),
    translations: normalizeTranslations(row.translations_json),
    revision: asInt(row.revision),
    provider: asText(row.provider) || "openai",
    modelName: asText(row.model_name) || null,
    reasoningEffort: asText(row.reasoning_effort) || null,
    responseId: asText(row.response_id) || null,
    updatedAt: asText(row.updated_at),
  };
}

export async function readHelpContentByKeys(helpKeys: string[]) {
  const unique = [...new Set(helpKeys.filter(Boolean))];
  if (unique.length === 0) return [] as HelpContentRecord[];

  const { data, error } = await supabase
    .from("platform_help_content_current")
    .select("*")
    .in("help_key", unique)
    .order("help_key", { ascending: true })
    .order("block_kind", { ascending: true });

  if (error) {
    if (/relation .*platform_help_content_current.* does not exist/i.test(error.message)) {
      throw new Error("HELP_SYSTEM_SCHEMA_NOT_READY");
    }
    throw new Error(`HELP_CONTENT_READ_FAILED:${error.message}`);
  }

  return ((data ?? []) as Row[]).map(normalizeRow);
}

export async function readAllHelpContent() {
  const { data, error } = await supabase
    .from("platform_help_content_current")
    .select("*")
    .order("help_key", { ascending: true })
    .order("block_kind", { ascending: true });

  if (error) {
    if (/relation .*platform_help_content_current.* does not exist/i.test(error.message)) {
      throw new Error("HELP_SYSTEM_SCHEMA_NOT_READY");
    }
    throw new Error(`HELP_CONTENT_READ_FAILED:${error.message}`);
  }

  return ((data ?? []) as Row[]).map(normalizeRow);
}

export async function writeHelpContentRevision(input: {
  helpKey: string;
  blockKind: HelpBlockKind;
  sourceLocale: LocaleCode;
  sourceText: string;
  translations: HelpTranslations;
  sourceHash: string;
  provider: string;
  modelName: string | null;
  reasoningEffort: string | null;
  responseId: string | null;
  usage: unknown;
  updatedByAppUserId: string;
}) {
  const { data, error } = await supabase.rpc("upsert_platform_help_content_v1", {
    p_help_key: input.helpKey,
    p_block_kind: input.blockKind,
    p_source_locale: input.sourceLocale,
    p_source_text: input.sourceText,
    p_translations_json: input.translations,
    p_source_hash: input.sourceHash,
    p_provider: input.provider,
    p_model_name: input.modelName,
    p_reasoning_effort: input.reasoningEffort,
    p_response_id: input.responseId,
    p_usage_json: input.usage ?? {},
    p_updated_by_app_user_id: input.updatedByAppUserId,
  });

  if (error) {
    throw new Error(`HELP_CONTENT_WRITE_FAILED:${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") {
    throw new Error("HELP_CONTENT_WRITE_EMPTY_RESULT");
  }

  return normalizeRow(row as Row);
}

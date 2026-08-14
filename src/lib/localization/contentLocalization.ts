export const ARCTOR_CONTENT_LOCALES = ["en", "pl", "ru", "uk", "de", "es", "cs"] as const;
export type ArctorContentLocale = (typeof ARCTOR_CONTENT_LOCALES)[number];

export const ARCTOR_LOCALIZED_CONTENT_SCHEMA_VERSION = 1 as const;

export type LocalizedContentFieldMap = Record<string, string | null>;

export type LocalizedContentEnvelope = {
  schemaVersion: typeof ARCTOR_LOCALIZED_CONTENT_SCHEMA_VERSION;
  detectedSourceLocale: ArctorContentLocale;
  sourceLocaleHint: ArctorContentLocale;
  sourceRevision: string;
  fieldCodes: string[];
  original: LocalizedContentFieldMap;
  variants: Record<ArctorContentLocale, LocalizedContentFieldMap>;
  generatedAt: string;
  provider: "openai";
  model: string | null;
  responseId: string | null;
  usage: {
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
};

type JsonRecord = Record<string, unknown>;

const localeSet = new Set<string>(ARCTOR_CONTENT_LOCALES);
const FIELD_CODE_RE = /^[a-z][a-zA-Z0-9_]{0,63}$/;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function cleanText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nonNegativeInteger(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.trunc(value)
    : 0;
}

export function normalizeContentLocale(value: unknown): ArctorContentLocale {
  if (typeof value !== "string") return "en";
  const normalized = value.trim().toLowerCase();
  return localeSet.has(normalized) ? (normalized as ArctorContentLocale) : "en";
}

export function normalizeLocalizedContentFields(value: unknown): LocalizedContentFieldMap {
  const row = asRecord(value);
  const out: LocalizedContentFieldMap = {};
  for (const [key, raw] of Object.entries(row)) {
    if (!FIELD_CODE_RE.test(key)) continue;
    out[key] = cleanText(raw);
  }
  return out;
}

export function readLocalizedContentEnvelope(metadata: unknown): LocalizedContentEnvelope | null {
  const root = asRecord(metadata);
  const raw = asRecord(root.localizedContent);
  if (raw.schemaVersion !== ARCTOR_LOCALIZED_CONTENT_SCHEMA_VERSION) return null;

  const detectedSourceLocale = normalizeContentLocale(raw.detectedSourceLocale);
  const sourceLocaleHint = normalizeContentLocale(raw.sourceLocaleHint);
  const sourceRevision = cleanText(raw.sourceRevision);
  const generatedAt = cleanText(raw.generatedAt);
  const provider = raw.provider === "openai" ? "openai" : null;
  const fieldCodes = Array.isArray(raw.fieldCodes)
    ? Array.from(new Set(raw.fieldCodes.filter((item): item is string => typeof item === "string" && FIELD_CODE_RE.test(item))))
    : [];
  if (!sourceRevision || !generatedAt || !provider || fieldCodes.length === 0) return null;

  const originalRaw = normalizeLocalizedContentFields(raw.original);
  const original: LocalizedContentFieldMap = Object.fromEntries(
    fieldCodes.map((fieldCode) => [fieldCode, originalRaw[fieldCode] ?? null]),
  );
  const variantsRaw = asRecord(raw.variants);
  const variants = {} as Record<ArctorContentLocale, LocalizedContentFieldMap>;
  for (const locale of ARCTOR_CONTENT_LOCALES) {
    const fields = normalizeLocalizedContentFields(variantsRaw[locale]);
    variants[locale] = Object.fromEntries(
      fieldCodes.map((fieldCode) => [fieldCode, fields[fieldCode] ?? null]),
    );
  }

  const usage = asRecord(raw.usage);
  return {
    schemaVersion: ARCTOR_LOCALIZED_CONTENT_SCHEMA_VERSION,
    detectedSourceLocale,
    sourceLocaleHint,
    sourceRevision,
    fieldCodes,
    original,
    variants,
    generatedAt,
    provider,
    model: cleanText(raw.model),
    responseId: cleanText(raw.responseId),
    usage: {
      inputTokens: nonNegativeInteger(usage.inputTokens),
      cachedInputTokens: nonNegativeInteger(usage.cachedInputTokens),
      outputTokens: nonNegativeInteger(usage.outputTokens),
      totalTokens: nonNegativeInteger(usage.totalTokens),
    },
  };
}

export function resolveLocalizedContentField(input: {
  metadata: unknown;
  locale: unknown;
  fieldCode: string;
  fallback: string | null;
}): string | null {
  if (!FIELD_CODE_RE.test(input.fieldCode)) return input.fallback;
  const envelope = readLocalizedContentEnvelope(input.metadata);
  if (!envelope) return input.fallback;
  const locale = normalizeContentLocale(input.locale);
  return envelope.variants[locale]?.[input.fieldCode] ?? input.fallback;
}

export function resolveLocalizedContentFields(input: {
  metadata: unknown;
  locale: unknown;
  fallback: LocalizedContentFieldMap;
}): LocalizedContentFieldMap {
  const envelope = readLocalizedContentEnvelope(input.metadata);
  if (!envelope) return { ...input.fallback };
  const locale = normalizeContentLocale(input.locale);
  const localized = envelope.variants[locale] ?? {};
  return Object.fromEntries(
    Object.entries(input.fallback).map(([fieldCode, fallback]) => [
      fieldCode,
      localized[fieldCode] ?? fallback,
    ]),
  );
}

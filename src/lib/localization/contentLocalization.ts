export const ARCTOR_CONTENT_LOCALES = ["en", "pl", "ru", "uk", "de", "es", "cs"] as const;
export type ArctorContentLocale = (typeof ARCTOR_CONTENT_LOCALES)[number];

export const ARCTOR_LOCALIZED_CONTENT_SCHEMA_VERSION = 2 as const;

export type LocalizedContentFieldMap = Record<string, string | null>;
export type LocalizedContentProvider = "openai" | "human";

export type LocalizedContentEnvelope = {
  schemaVersion: typeof ARCTOR_LOCALIZED_CONTENT_SCHEMA_VERSION;
  detectedSourceLocale: ArctorContentLocale;
  sourceLocaleHint: ArctorContentLocale;
  sourceRevision: string;
  fieldCodes: string[];
  original: LocalizedContentFieldMap;
  variants: Record<ArctorContentLocale, LocalizedContentFieldMap>;
  humanLocales: ArctorContentLocale[];
  lastEditedLocale: ArctorContentLocale | null;
  generatedAt: string;
  provider: LocalizedContentProvider;
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

function normalizeHumanLocales(value: unknown): ArctorContentLocale[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().toLowerCase())
        .filter((item): item is ArctorContentLocale => localeSet.has(item)),
    ),
  );
}

function buildEmptyVariants(fieldCodes: string[]) {
  return Object.fromEntries(
    ARCTOR_CONTENT_LOCALES.map((locale) => [
      locale,
      Object.fromEntries(fieldCodes.map((fieldCode) => [fieldCode, null])),
    ]),
  ) as Record<ArctorContentLocale, LocalizedContentFieldMap>;
}

export function normalizeContentLocale(value: unknown): ArctorContentLocale {
  if (typeof value !== "string") return "en";
  const normalized = value.trim().toLowerCase();
  return localeSet.has(normalized) ? (normalized as ArctorContentLocale) : "en";
}

export function isSupportedContentLocale(value: unknown): value is ArctorContentLocale {
  return typeof value === "string" && localeSet.has(value.trim().toLowerCase());
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

export function createEmptyLocalizedContentVariants(fieldCodes: string[]) {
  const normalizedCodes = Array.from(
    new Set(fieldCodes.filter((fieldCode) => FIELD_CODE_RE.test(fieldCode))),
  );
  return buildEmptyVariants(normalizedCodes);
}

export function readLocalizedContentEnvelope(metadata: unknown): LocalizedContentEnvelope | null {
  const root = asRecord(metadata);
  const raw = asRecord(root.localizedContent);
  const schemaVersion = raw.schemaVersion;
  if (schemaVersion !== 1 && schemaVersion !== ARCTOR_LOCALIZED_CONTENT_SCHEMA_VERSION) {
    return null;
  }

  const detectedSourceLocale = normalizeContentLocale(raw.detectedSourceLocale);
  const sourceLocaleHint = normalizeContentLocale(raw.sourceLocaleHint);
  const sourceRevision = cleanText(raw.sourceRevision);
  const generatedAt = cleanText(raw.generatedAt);
  const provider: LocalizedContentProvider | null =
    raw.provider === "openai" || raw.provider === "human" ? raw.provider : null;
  const fieldCodes = Array.isArray(raw.fieldCodes)
    ? Array.from(
        new Set(
          raw.fieldCodes.filter(
            (item): item is string => typeof item === "string" && FIELD_CODE_RE.test(item),
          ),
        ),
      )
    : [];
  if (!sourceRevision || !generatedAt || !provider || fieldCodes.length === 0) return null;

  const originalRaw = normalizeLocalizedContentFields(raw.original);
  const original: LocalizedContentFieldMap = Object.fromEntries(
    fieldCodes.map((fieldCode) => [fieldCode, originalRaw[fieldCode] ?? null]),
  );
  const variantsRaw = asRecord(raw.variants);
  const variants = buildEmptyVariants(fieldCodes);
  for (const locale of ARCTOR_CONTENT_LOCALES) {
    const fields = normalizeLocalizedContentFields(variantsRaw[locale]);
    variants[locale] = Object.fromEntries(
      fieldCodes.map((fieldCode) => [fieldCode, fields[fieldCode] ?? null]),
    );
  }

  const usage = asRecord(raw.usage);
  const humanLocales =
    schemaVersion === 1
      ? []
      : normalizeHumanLocales(raw.humanLocales);
  const lastEditedLocale =
    schemaVersion === 1 || raw.lastEditedLocale === null || raw.lastEditedLocale === undefined
      ? null
      : normalizeContentLocale(raw.lastEditedLocale);

  return {
    schemaVersion: ARCTOR_LOCALIZED_CONTENT_SCHEMA_VERSION,
    detectedSourceLocale,
    sourceLocaleHint,
    sourceRevision,
    fieldCodes,
    original,
    variants,
    humanLocales,
    lastEditedLocale,
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

export function resolveLocalizedContentFieldStrict(input: {
  metadata: unknown;
  locale: unknown;
  fieldCode: string;
}): string | null {
  if (!FIELD_CODE_RE.test(input.fieldCode)) return null;
  const envelope = readLocalizedContentEnvelope(input.metadata);
  if (!envelope) return null;
  const locale = normalizeContentLocale(input.locale);
  return envelope.variants[locale]?.[input.fieldCode] ?? null;
}

export function resolveLocalizedContentFieldsStrict(input: {
  metadata: unknown;
  locale: unknown;
  fieldCodes: string[];
}): LocalizedContentFieldMap {
  const normalizedCodes = Array.from(
    new Set(input.fieldCodes.filter((fieldCode) => FIELD_CODE_RE.test(fieldCode))),
  );
  const envelope = readLocalizedContentEnvelope(input.metadata);
  if (!envelope) {
    return Object.fromEntries(normalizedCodes.map((fieldCode) => [fieldCode, null]));
  }
  const locale = normalizeContentLocale(input.locale);
  const localized = envelope.variants[locale] ?? {};
  return Object.fromEntries(
    normalizedCodes.map((fieldCode) => [fieldCode, localized[fieldCode] ?? null]),
  );
}

export function hasCompleteLocalizedContent(input: {
  metadata: unknown;
  locale: unknown;
  requiredFieldCodes: string[];
}) {
  const fields = resolveLocalizedContentFieldsStrict({
    metadata: input.metadata,
    locale: input.locale,
    fieldCodes: input.requiredFieldCodes,
  });
  return input.requiredFieldCodes.every((fieldCode) => Boolean(fields[fieldCode]));
}

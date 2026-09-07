import localizationCatalog from "@/data/reality-core/global-system-reality-localizations-v2.json";
import { resolveLocalizedContentFieldsStrict } from "@/lib/localization/contentLocalization";

export const GLOBAL_SYSTEM_VALUE_OBJECT_LOCALES = [
  "en",
  "pl",
  "ru",
  "uk",
  "de",
  "es",
  "cs",
] as const;

export type GlobalSystemValueObjectLocale =
  (typeof GLOBAL_SYSTEM_VALUE_OBJECT_LOCALES)[number];

type LocalizableValueObject = {
  canonical_key?: string | null;
  title?: string | null;
  description?: string | null;
  metadata_json?: unknown;
};

type CatalogEntry = {
  title?: Partial<Record<GlobalSystemValueObjectLocale, string>>;
  description?: Partial<Record<GlobalSystemValueObjectLocale, string>>;
};

const supportedLocales = new Set<string>(GLOBAL_SYSTEM_VALUE_OBJECT_LOCALES);

export function normalizeGlobalSystemValueObjectLocale(
  value: unknown,
): GlobalSystemValueObjectLocale {
  if (typeof value !== "string") {
    return "en";
  }

  const normalized = value.trim().toLowerCase();
  return supportedLocales.has(normalized)
    ? (normalized as GlobalSystemValueObjectLocale)
    : "en";
}

function cleanText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function runtimeDraftEntry(valueObject: LocalizableValueObject): CatalogEntry | null {
  const metadata =
    valueObject.metadata_json &&
    typeof valueObject.metadata_json === "object" &&
    !Array.isArray(valueObject.metadata_json)
      ? (valueObject.metadata_json as Record<string, unknown>)
      : null;
  const draftRaw = metadata?.curator_system_draft_v1;
  const draft =
    draftRaw && typeof draftRaw === "object" && !Array.isArray(draftRaw)
      ? (draftRaw as Record<string, unknown>)
      : null;
  const localizationsRaw = draft?.localizations;
  const localizations =
    localizationsRaw &&
    typeof localizationsRaw === "object" &&
    !Array.isArray(localizationsRaw)
      ? (localizationsRaw as Record<string, unknown>)
      : null;
  if (!localizations) return null;

  const title: Partial<Record<GlobalSystemValueObjectLocale, string>> = {};
  const description: Partial<Record<GlobalSystemValueObjectLocale, string>> = {};
  for (const locale of GLOBAL_SYSTEM_VALUE_OBJECT_LOCALES) {
    const raw = localizations[locale];
    const item =
      raw && typeof raw === "object" && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : null;
    const localizedTitle = cleanText(item?.title);
    const localizedDescription = cleanText(item?.description);
    if (localizedTitle) title[locale] = localizedTitle;
    if (localizedDescription) description[locale] = localizedDescription;
  }
  return Object.keys(title).length || Object.keys(description).length
    ? { title, description }
    : null;
}

export function localizeGlobalSystemValueObject<T extends LocalizableValueObject>(
  valueObject: T,
  localeValue: unknown,
): T {
  const locale = normalizeGlobalSystemValueObjectLocale(localeValue);
  const localizedContent = resolveLocalizedContentFieldsStrict({
    metadata: valueObject.metadata_json,
    locale,
    fieldCodes: ["title", "description"],
  });
  const localizedContentTitle = cleanText(localizedContent.title);
  const localizedContentDescription = cleanText(localizedContent.description);

  const canonicalKey = cleanText(valueObject.canonical_key);
  const staticEntry = canonicalKey
    ? (
        localizationCatalog.objects as Record<string, CatalogEntry | undefined>
      )[canonicalKey]
    : undefined;
  const legacyEntry = staticEntry ?? runtimeDraftEntry(valueObject);

  const title =
    localizedContentTitle ??
    cleanText(legacyEntry?.title?.[locale]) ??
    cleanText(legacyEntry?.title?.en) ??
    cleanText(valueObject.title);
  const description =
    localizedContentDescription ??
    cleanText(legacyEntry?.description?.[locale]) ??
    cleanText(legacyEntry?.description?.en) ??
    cleanText(valueObject.description);

  if (!title && !description) {
    return valueObject;
  }

  return {
    ...valueObject,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
  } as T;
}

export function getGlobalSystemLocalizationCoverage() {
  const objects = localizationCatalog.objects as Record<string, CatalogEntry>;
  return {
    catalogId: localizationCatalog.catalogId,
    objectCount: Object.keys(objects).length,
    locales: [...localizationCatalog.locales],
  };
}

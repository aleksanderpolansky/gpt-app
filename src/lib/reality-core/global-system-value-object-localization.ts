import localizationCatalog from "@/data/reality-core/global-system-reality-localizations-v2.json";

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

export function localizeGlobalSystemValueObject<T extends LocalizableValueObject>(
  valueObject: T,
  localeValue: unknown,
): T {
  const canonicalKey = cleanText(valueObject.canonical_key);
  if (!canonicalKey) {
    return valueObject;
  }

  const entry = (
    localizationCatalog.objects as Record<string, CatalogEntry | undefined>
  )[canonicalKey];
  if (!entry) {
    return valueObject;
  }

  const locale = normalizeGlobalSystemValueObjectLocale(localeValue);
  const title =
    cleanText(entry.title?.[locale]) ??
    cleanText(entry.title?.en) ??
    cleanText(valueObject.title);
  const description =
    cleanText(entry.description?.[locale]) ??
    cleanText(entry.description?.en) ??
    cleanText(valueObject.description);

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

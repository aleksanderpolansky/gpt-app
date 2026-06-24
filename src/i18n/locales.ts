export const INTERFACE_LOCALES = [
  "ru",
  "pl",
  "en",
  "es",
  "uk",
  "de",
  "cs",
] as const;

export type InterfaceLocale = (typeof INTERFACE_LOCALES)[number];
export type LocaleCode = InterfaceLocale;

export const DEFAULT_INTERFACE_LOCALE: LocaleCode = "en";
export const DEFAULT_FALLBACK_LOCALE: LocaleCode = "en";

export type LocaleDirection = "ltr" | "rtl";

export type LocaleMeta = {
  code: LocaleCode;
  englishName: string;
  nativeName: string;
  direction: LocaleDirection;
};

export const LOCALE_META: Record<LocaleCode, LocaleMeta> = {
  ru: {
    code: "ru",
    englishName: "Russian",
    nativeName: "Русский",
    direction: "ltr",
  },
  pl: {
    code: "pl",
    englishName: "Polish",
    nativeName: "Polski",
    direction: "ltr",
  },
  en: {
    code: "en",
    englishName: "English",
    nativeName: "English",
    direction: "ltr",
  },
  es: {
    code: "es",
    englishName: "Spanish",
    nativeName: "Español",
    direction: "ltr",
  },
  uk: {
    code: "uk",
    englishName: "Ukrainian",
    nativeName: "Українська",
    direction: "ltr",
  },
  de: {
    code: "de",
    englishName: "German",
    nativeName: "Deutsch",
    direction: "ltr",
  },
  cs: {
    code: "cs",
    englishName: "Czech",
    nativeName: "Čeština",
    direction: "ltr",
  },
};

const LOCALE_SET: ReadonlySet<string> = new Set(INTERFACE_LOCALES);

export function isLocaleCode(value: unknown): value is LocaleCode {
  return typeof value === "string" && LOCALE_SET.has(value.toLowerCase());
}

export function normalizeLocale(
  value: unknown,
  fallback: LocaleCode = DEFAULT_INTERFACE_LOCALE,
): LocaleCode {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  if (isLocaleCode(normalized)) {
    return normalized;
  }

  return fallback;
}

export function getLocaleFallbackChain(
  locale: unknown,
  fallback: LocaleCode = DEFAULT_FALLBACK_LOCALE,
): LocaleCode[] {
  const normalizedLocale = normalizeLocale(locale, fallback);

  if (normalizedLocale === fallback) {
    return [fallback];
  }

  return [normalizedLocale, fallback];
}

export function getAllInterfaceLocales(): readonly LocaleCode[] {
  return INTERFACE_LOCALES;
}

export function getLocaleMeta(locale: unknown): LocaleMeta {
  return LOCALE_META[normalizeLocale(locale)];
}

export function getLocaleSearchParam(
  searchParams: URLSearchParams,
  fallback: LocaleCode = DEFAULT_INTERFACE_LOCALE,
): LocaleCode {
  return normalizeLocale(searchParams.get("locale") ?? searchParams.get("lang"), fallback);
}

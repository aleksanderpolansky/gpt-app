export const SUPPORTED_LOCALES = [
  "pl",
  "en",
  "de",
  "cs",
  "es",
  "uk",
  "ru",
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const SUPPORTED_COUNTRY_CODES = ["PL", "DE", "ES", "CZ"] as const;

export type SupportedCountryCode = (typeof SUPPORTED_COUNTRY_CODES)[number];

export type TextDirection = "ltr" | "rtl";

export type LocaleSource =
  | "default"
  | "cookie"
  | "profile"
  | "query"
  | "system"
  | "manual";

export type CountrySource =
  | "default"
  | "query"
  | "geo"
  | "profile"
  | "manual"
  | "system";

export type LocaleFallbackPolicy = "selected_en_original";

export type CurrencyCode = "PLN" | "EUR" | "CZK";

export type LocalizedTextResolutionStatus =
  | "resolved_selected_locale"
  | "resolved_default_fallback_locale"
  | "resolved_original_locale"
  | "missing";

export type LocalizedTextSource =
  | "manual"
  | "ai"
  | "import"
  | "system"
  | "original"
  | "fallback";

export type SupportedLocaleContract = {
  readonly locale: SupportedLocale;
  readonly labelNative: string;
  readonly labelEnglish: string;
  readonly textDirection: TextDirection;
  readonly isDefault: boolean;
  readonly status: "active";
};

export type SupportedCountryContract = {
  readonly countryCode: SupportedCountryCode;
  readonly labelNative: string;
  readonly labelEnglish: string;
  readonly defaultLocale: SupportedLocale;
  readonly currencyCode: CurrencyCode;
  readonly status: "active";
};

export type LocaleContext = {
  readonly interfaceLocale: SupportedLocale;
  readonly contentLocale: SupportedLocale;
  readonly fallbackLocale: SupportedLocale;
  readonly source: LocaleSource;
  readonly fallbackPolicy: LocaleFallbackPolicy;
};

export type ExistingGeoFilterContext = {
  readonly countryCode: SupportedCountryCode | null;
  readonly city: string | null;
  readonly district: string | null;
  readonly source: CountrySource;
};

export type LocalizationRuntimeContext = {
  readonly locale: LocaleContext;
  readonly existingGeoFilter: ExistingGeoFilterContext;
  readonly originalLocale: SupportedLocale | null;
  readonly localeFallbackChain: readonly SupportedLocale[];
};

export type LocaleContextInput = {
  readonly interfaceLocale?: unknown;
  readonly contentLocale?: unknown;
  readonly fallbackLocale?: unknown;
  readonly source?: LocaleSource;
};

export type ExistingGeoFilterContextInput = {
  readonly countryCode?: unknown;
  readonly city?: unknown;
  readonly district?: unknown;
  readonly source?: CountrySource;
};

export type LocalizationRuntimeContextInput = {
  readonly locale?: LocaleContextInput;
  readonly existingGeoFilter?: ExistingGeoFilterContextInput;
  readonly originalLocale?: unknown;
};

export type LocalizedTextMap = Partial<
  Record<SupportedLocale, string | null | undefined>
>;

export type LocalizedTextResolutionInput = {
  readonly values: LocalizedTextMap;
  readonly selectedLocale: SupportedLocale;
  readonly fallbackLocale?: SupportedLocale;
  readonly originalLocale?: SupportedLocale | null;
};

export type LocalizedTextResolution = {
  readonly text: string | null;
  readonly locale: SupportedLocale | null;
  readonly requestedLocale: SupportedLocale;
  readonly fallbackLocale: SupportedLocale;
  readonly originalLocale: SupportedLocale | null;
  readonly fallbackChain: readonly SupportedLocale[];
  readonly status: LocalizedTextResolutionStatus;
  readonly fallbackUsed: boolean;
};

export const DEFAULT_INTERFACE_LOCALE: SupportedLocale = "ru";
export const DEFAULT_CONTENT_LOCALE: SupportedLocale = "ru";
export const DEFAULT_FALLBACK_LOCALE: SupportedLocale = "en";
export const DEFAULT_COUNTRY_CODE: SupportedCountryCode = "PL";

export const LOCALE_FALLBACK_POLICY: LocaleFallbackPolicy =
  "selected_en_original";

export const SUPPORTED_LOCALE_CONTRACTS: readonly SupportedLocaleContract[] = [
  {
    locale: "pl",
    labelNative: "Polski",
    labelEnglish: "Polish",
    textDirection: "ltr",
    isDefault: false,
    status: "active",
  },
  {
    locale: "en",
    labelNative: "English",
    labelEnglish: "English",
    textDirection: "ltr",
    isDefault: false,
    status: "active",
  },
  {
    locale: "de",
    labelNative: "Deutsch",
    labelEnglish: "German",
    textDirection: "ltr",
    isDefault: false,
    status: "active",
  },
  {
    locale: "cs",
    labelNative: "Čeština",
    labelEnglish: "Czech",
    textDirection: "ltr",
    isDefault: false,
    status: "active",
  },
  {
    locale: "es",
    labelNative: "Español",
    labelEnglish: "Spanish",
    textDirection: "ltr",
    isDefault: false,
    status: "active",
  },
  {
    locale: "uk",
    labelNative: "Українська",
    labelEnglish: "Ukrainian",
    textDirection: "ltr",
    isDefault: false,
    status: "active",
  },
  {
    locale: "ru",
    labelNative: "Русский",
    labelEnglish: "Russian",
    textDirection: "ltr",
    isDefault: true,
    status: "active",
  },
] as const;

export const SUPPORTED_COUNTRY_CONTRACTS: readonly SupportedCountryContract[] = [
  {
    countryCode: "PL",
    labelNative: "Polska",
    labelEnglish: "Poland",
    defaultLocale: "pl",
    currencyCode: "PLN",
    status: "active",
  },
  {
    countryCode: "DE",
    labelNative: "Deutschland",
    labelEnglish: "Germany",
    defaultLocale: "de",
    currencyCode: "EUR",
    status: "active",
  },
  {
    countryCode: "ES",
    labelNative: "España",
    labelEnglish: "Spain",
    defaultLocale: "es",
    currencyCode: "EUR",
    status: "active",
  },
  {
    countryCode: "CZ",
    labelNative: "Česko",
    labelEnglish: "Czech Republic",
    defaultLocale: "cs",
    currencyCode: "CZK",
    status: "active",
  },
] as const;

const SUPPORTED_LOCALE_SET = new Set<string>(SUPPORTED_LOCALES);
const SUPPORTED_COUNTRY_CODE_SET = new Set<string>(SUPPORTED_COUNTRY_CODES);

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === "string" && SUPPORTED_LOCALE_SET.has(value);
}

export function isSupportedCountryCode(
  value: unknown
): value is SupportedCountryCode {
  return (
    typeof value === "string" &&
    SUPPORTED_COUNTRY_CODE_SET.has(value.toUpperCase())
  );
}

export function normalizeSupportedLocale(
  value: unknown,
  fallback: SupportedLocale = DEFAULT_INTERFACE_LOCALE
): SupportedLocale {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  if (isSupportedLocale(normalized)) {
    return normalized;
  }

  return fallback;
}

export function normalizeOptionalSupportedLocale(
  value: unknown
): SupportedLocale | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (isSupportedLocale(normalized)) {
    return normalized;
  }

  return null;
}

export function normalizeSupportedCountryCode(
  value: unknown,
  fallback: SupportedCountryCode = DEFAULT_COUNTRY_CODE
): SupportedCountryCode {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toUpperCase();

  if (isSupportedCountryCode(normalized)) {
    return normalized;
  }

  return fallback;
}

export function normalizeOptionalSupportedCountryCode(
  value: unknown
): SupportedCountryCode | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();

  if (isSupportedCountryCode(normalized)) {
    return normalized;
  }

  return null;
}

export function normalizeOptionalGeoText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
}

export function normalizeLocalizedText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
}

export function getSupportedLocaleContract(
  locale: SupportedLocale
): SupportedLocaleContract {
  return (
    SUPPORTED_LOCALE_CONTRACTS.find((item) => item.locale === locale) ??
    SUPPORTED_LOCALE_CONTRACTS.find(
      (item) => item.locale === DEFAULT_INTERFACE_LOCALE
    ) ??
    SUPPORTED_LOCALE_CONTRACTS[0]
  );
}

export function getSupportedCountryContract(
  countryCode: SupportedCountryCode
): SupportedCountryContract {
  return (
    SUPPORTED_COUNTRY_CONTRACTS.find(
      (item) => item.countryCode === countryCode
    ) ??
    SUPPORTED_COUNTRY_CONTRACTS.find(
      (item) => item.countryCode === DEFAULT_COUNTRY_CODE
    ) ??
    SUPPORTED_COUNTRY_CONTRACTS[0]
  );
}

export function createDefaultLocaleContext(
  source: LocaleSource = "default"
): LocaleContext {
  return {
    interfaceLocale: DEFAULT_INTERFACE_LOCALE,
    contentLocale: DEFAULT_CONTENT_LOCALE,
    fallbackLocale: DEFAULT_FALLBACK_LOCALE,
    source,
    fallbackPolicy: LOCALE_FALLBACK_POLICY,
  };
}

export function createLocaleContext(
  input?: LocaleContextInput
): LocaleContext {
  return {
    interfaceLocale: normalizeSupportedLocale(
      input?.interfaceLocale,
      DEFAULT_INTERFACE_LOCALE
    ),
    contentLocale: normalizeSupportedLocale(
      input?.contentLocale,
      DEFAULT_CONTENT_LOCALE
    ),
    fallbackLocale: normalizeSupportedLocale(
      input?.fallbackLocale,
      DEFAULT_FALLBACK_LOCALE
    ),
    source: input?.source ?? "default",
    fallbackPolicy: LOCALE_FALLBACK_POLICY,
  };
}

export function createDefaultExistingGeoFilterContext(
  source: CountrySource = "default"
): ExistingGeoFilterContext {
  return {
    countryCode: null,
    city: null,
    district: null,
    source,
  };
}

export function createExistingGeoFilterContext(
  input?: ExistingGeoFilterContextInput
): ExistingGeoFilterContext {
  return {
    countryCode: normalizeOptionalSupportedCountryCode(input?.countryCode),
    city: normalizeOptionalGeoText(input?.city),
    district: normalizeOptionalGeoText(input?.district),
    source: input?.source ?? "default",
  };
}

export function getLocaleFallbackChain(input: {
  readonly selectedLocale: SupportedLocale;
  readonly fallbackLocale?: SupportedLocale;
  readonly originalLocale?: SupportedLocale | null;
}): readonly SupportedLocale[] {
  const fallbackChain: SupportedLocale[] = [];
  const fallbackLocale = input.fallbackLocale ?? DEFAULT_FALLBACK_LOCALE;

  fallbackChain.push(input.selectedLocale);

  if (!fallbackChain.includes(fallbackLocale)) {
    fallbackChain.push(fallbackLocale);
  }

  if (input.originalLocale && !fallbackChain.includes(input.originalLocale)) {
    fallbackChain.push(input.originalLocale);
  }

  return fallbackChain;
}

export function resolveLocalizedText(
  input: LocalizedTextResolutionInput
): LocalizedTextResolution {
  const fallbackLocale = input.fallbackLocale ?? DEFAULT_FALLBACK_LOCALE;
  const originalLocale = input.originalLocale ?? null;
  const fallbackChain = getLocaleFallbackChain({
    selectedLocale: input.selectedLocale,
    fallbackLocale,
    originalLocale,
  });

  for (const locale of fallbackChain) {
    const text = normalizeLocalizedText(input.values[locale]);

    if (!text) {
      continue;
    }

    let status: LocalizedTextResolutionStatus = "resolved_original_locale";

    if (locale === input.selectedLocale) {
      status = "resolved_selected_locale";
    } else if (locale === fallbackLocale) {
      status = "resolved_default_fallback_locale";
    }

    return {
      text,
      locale,
      requestedLocale: input.selectedLocale,
      fallbackLocale,
      originalLocale,
      fallbackChain,
      status,
      fallbackUsed: locale !== input.selectedLocale,
    };
  }

  return {
    text: null,
    locale: null,
    requestedLocale: input.selectedLocale,
    fallbackLocale,
    originalLocale,
    fallbackChain,
    status: "missing",
    fallbackUsed: false,
  };
}

export function createLocalizationRuntimeContext(
  input?: LocalizationRuntimeContextInput
): LocalizationRuntimeContext {
  const locale = createLocaleContext(input?.locale);
  const existingGeoFilter = createExistingGeoFilterContext(
    input?.existingGeoFilter
  );
  const originalLocale = normalizeOptionalSupportedLocale(input?.originalLocale);

  return {
    locale,
    existingGeoFilter,
    originalLocale,
    localeFallbackChain: getLocaleFallbackChain({
      selectedLocale: locale.contentLocale,
      fallbackLocale: locale.fallbackLocale,
      originalLocale,
    }),
  };
}

export function hasExistingGeoFilter(
  context: ExistingGeoFilterContext
): boolean {
  return Boolean(context.countryCode || context.city || context.district);
}

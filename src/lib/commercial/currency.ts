export type SupportedCountryCode =
  | "PL"
  | "ES"
  | "DE"
  | "UA"
  | "US"
  | "GB"
  | "CZ";

export type SupportedCurrencyCode =
  | "PLN"
  | "EUR"
  | "UAH"
  | "USD"
  | "GBP"
  | "CZK";

export type OrganizationCurrencySource = {
  country_code?: string | null;
  default_currency?: string | null;
};

export type CertificatePointsCalculationInput = {
  amountCoveredByPointsInOrganizationCurrency: number;
  exchangeRateToOrganizationCurrency: number;
};

export type CertificatePointsCalculationResult = {
  rawPointsToSpend: number;
  pointsToSpend: number;
};

const COUNTRY_TO_DEFAULT_CURRENCY: Record<SupportedCountryCode, SupportedCurrencyCode> = {
  PL: "PLN",
  ES: "EUR",
  DE: "EUR",
  UA: "UAH",
  US: "USD",
  GB: "GBP",
  CZ: "CZK",
};

export function normalizeCountryCode(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();

  if (!normalized) {
    return null;
  }

  return normalized;
}

export function normalizeCurrencyCode(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();

  if (!normalized) {
    return null;
  }

  return normalized;
}

export function getDefaultCurrencyByCountryCode(
  countryCode: unknown
): SupportedCurrencyCode | null {
  const normalizedCountryCode = normalizeCountryCode(countryCode);

  if (!normalizedCountryCode) {
    return null;
  }

  if (isSupportedCountryCode(normalizedCountryCode)) {
    return COUNTRY_TO_DEFAULT_CURRENCY[normalizedCountryCode];
  }

  return null;
}

export function getOrganizationCurrency(
  organization: OrganizationCurrencySource | null | undefined
): SupportedCurrencyCode | null {
  if (!organization) {
    return null;
  }

  const normalizedStoredCurrency = normalizeCurrencyCode(
    organization.default_currency
  );

  const derivedCurrency = getDefaultCurrencyByCountryCode(
    organization.country_code
  );

  if (!derivedCurrency) {
    return null;
  }

  if (!normalizedStoredCurrency) {
    return derivedCurrency;
  }

  if (normalizedStoredCurrency === derivedCurrency) {
    return derivedCurrency;
  }

  return null;
}

export function isOrganizationCurrencyDerivedFromCountry(
  organization: OrganizationCurrencySource | null | undefined
): boolean {
  if (!organization) {
    return false;
  }

  const normalizedStoredCurrency = normalizeCurrencyCode(
    organization.default_currency
  );

  const derivedCurrency = getDefaultCurrencyByCountryCode(
    organization.country_code
  );

  return Boolean(
    normalizedStoredCurrency &&
      derivedCurrency &&
      normalizedStoredCurrency === derivedCurrency
  );
}

export function calculatePointsToSpendForCertificate(
  input: CertificatePointsCalculationInput
): CertificatePointsCalculationResult {
  const amount = input.amountCoveredByPointsInOrganizationCurrency;
  const exchangeRate = input.exchangeRateToOrganizationCurrency;

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("amountCoveredByPointsInOrganizationCurrency must be a non-negative finite number.");
  }

  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    throw new Error("exchangeRateToOrganizationCurrency must be a positive finite number.");
  }

  const rawPointsToSpend = amount / exchangeRate;
  const pointsToSpend = Math.ceil(rawPointsToSpend);

  return {
    rawPointsToSpend,
    pointsToSpend,
  };
}

export function getSupportedCountryCurrencyPairs(): Array<{
  countryCode: SupportedCountryCode;
  currencyCode: SupportedCurrencyCode;
}> {
  return Object.entries(COUNTRY_TO_DEFAULT_CURRENCY).map(
    ([countryCode, currencyCode]) => ({
      countryCode: countryCode as SupportedCountryCode,
      currencyCode,
    })
  );
}

function isSupportedCountryCode(value: string): value is SupportedCountryCode {
  return Object.prototype.hasOwnProperty.call(
    COUNTRY_TO_DEFAULT_CURRENCY,
    value
  );
}

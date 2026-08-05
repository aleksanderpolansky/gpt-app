import "server-only";

const ECB_DAILY_REFERENCE_RATES_URL =
  "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
const EUR_IDENTITY_SOURCE_URL = "urn:arctor:exchange-rate:eur-identity";

export const ECB_REFERENCE_RATE_MAX_FALLBACK_AGE_DAYS = 7;

export type EcbReferenceRate = {
  readonly baseCurrency: "EUR";
  readonly quoteCurrency: string;
  readonly providerCurrencyPerEuro: number;
  readonly referenceDate: string;
  readonly sourceCode: "ECB_EURO_REFERENCE_RATE" | "EUR_IDENTITY";
  readonly sourceUrl: string;
  readonly fetchedAt: string;
  readonly isFallback: boolean;
};

function normalizeCurrency(value: string): string {
  const currency = value.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("Currency code must contain exactly three Latin letters.");
  }

  return currency;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseEcbDailyXml(
  xml: string,
  currency: string,
  fetchedAt: string,
): EcbReferenceRate {
  const datedCube = xml.match(
    /<Cube\s+time=["']([^"']+)["']>([\s\S]*?)<\/Cube>/i,
  );

  if (!datedCube) {
    throw new Error("ECB response does not contain a reference date.");
  }

  const referenceDate = datedCube[1];
  const dailyRates = datedCube[2];
  const ratePattern = new RegExp(
    `<Cube\\s+currency=["']${escapeRegExp(currency)}["']\\s+rate=["']([^"']+)["']\\s*\\/>`,
    "i",
  );
  const rateMatch = dailyRates.match(ratePattern);

  if (!rateMatch) {
    throw new Error(
      `ECB does not publish a daily euro reference rate for ${currency}.`,
    );
  }

  const rate = Number(rateMatch[1]);

  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(`ECB returned an invalid ${currency} reference rate.`);
  }

  return {
    baseCurrency: "EUR",
    quoteCurrency: currency,
    providerCurrencyPerEuro: rate,
    referenceDate,
    sourceCode: "ECB_EURO_REFERENCE_RATE",
    sourceUrl: ECB_DAILY_REFERENCE_RATES_URL,
    fetchedAt,
    isFallback: false,
  };
}

export function getEurIdentityReferenceRate(
  now = new Date(),
): EcbReferenceRate {
  const fetchedAt = now.toISOString();

  return {
    baseCurrency: "EUR",
    quoteCurrency: "EUR",
    providerCurrencyPerEuro: 1,
    referenceDate: fetchedAt.slice(0, 10),
    sourceCode: "EUR_IDENTITY",
    sourceUrl: EUR_IDENTITY_SOURCE_URL,
    fetchedAt,
    isFallback: false,
  };
}

export async function getEcbReferenceRate(
  currencyCode: string,
): Promise<EcbReferenceRate> {
  const currency = normalizeCurrency(currencyCode);

  if (currency === "EUR") {
    return getEurIdentityReferenceRate();
  }

  const response = await fetch(ECB_DAILY_REFERENCE_RATES_URL, {
    headers: {
      Accept: "application/xml,text/xml;q=0.9,*/*;q=0.8",
      "User-Agent": "ARCTor.app exchange-rate service",
    },
    next: {
      revalidate: 21_600,
    },
  });

  if (!response.ok) {
    throw new Error(
      `ECB reference-rate request failed with HTTP ${response.status}.`,
    );
  }

  return parseEcbDailyXml(
    await response.text(),
    currency,
    new Date().toISOString(),
  );
}

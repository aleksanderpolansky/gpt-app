import "server-only";

// Reuses ARCTor's existing ECB official reference-rate resolver and its
// stored snapshot fallback. NBU supplies EUR/UAH, absent from the ECB feed.
import { resolveOfficialEurReferenceRate } from "./official-eur-reference-rate";
import type { EcbReferenceRate } from "./ecb-reference-rate";
import type { SupportedCurrencyCode } from "../../src/lib/commercial/currency";

export const FEED_CURRENCIES_F325 = ["EUR", "PLN", "UAH", "USD", "GBP", "CZK"] as const satisfies readonly SupportedCurrencyCode[];
export type FeedCurrencyF325 = (typeof FEED_CURRENCIES_F325)[number];

export type FeedRateSourceF325 = {
  code: FeedCurrencyF325;
  referenceDate: string;
  source: "ECB_EURO_REFERENCE_RATE" | "NBU_EUR_UAH_REFERENCE_RATE" | "EUR_IDENTITY";
  fallback: boolean;
};

export type FeedFxSnapshotF325 = {
  ratesPerEur: Record<FeedCurrencyF325, number>;
  sources: FeedRateSourceF325[];
};

const NBU_EUR_RATE_URL =
  "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchangeNew?json&valcode=EUR";
const MAX_REFERENCE_AGE_MS = 7 * 86_400_000;
const CACHE_MS = 20 * 60_000;
let cached: { until: number; snapshot: FeedFxSnapshotF325 } | null = null;
let pending: Promise<FeedFxSnapshotF325> | null = null;

function assertRecent(date: string, source: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`${source} invalid reference date`);
  const at = Date.parse(`${date}T00:00:00Z`);
  const age = Date.now() - at;
  // Some official rates are released for the next day: allow one day of lead.
  if (!Number.isFinite(at) || age > MAX_REFERENCE_AGE_MS || age < -86_400_000) {
    throw new Error(`${source} reference rate outside the allowed date window`);
  }
}

function checkRate(value: number, currency: string): number {
  if (!Number.isFinite(value) || value <= 0 || value > 1_000_000) {
    throw new Error(`${currency} invalid reference rate`);
  }
  return value;
}

async function nbuEurToUah(): Promise<{ rate: number; date: string }> {
  const response = await fetch(NBU_EUR_RATE_URL, {
    headers: { Accept: "application/json" },
    next: { revalidate: 21_600 },
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) throw new Error(`NBU rate unavailable: ${response.status}`);
  const data: unknown = await response.json();
  if (!Array.isArray(data) || data.length !== 1) throw new Error("NBU response shape invalid");
  const row = data[0] as Record<string, unknown>;
  if (row.cc !== "EUR" || typeof row.rate !== "number" ||
      typeof row.exchangedate !== "string") throw new Error("NBU EUR quote missing");
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(row.exchangedate);
  if (!match) throw new Error("NBU date format invalid");
  const date = `${match[3]}-${match[2]}-${match[1]}`;
  assertRecent(date, "NBU");
  return { rate: checkRate(row.rate, "UAH"), date };
}

async function resolveSnapshot(): Promise<FeedFxSnapshotF325> {
  const [pln, usd, gbp, czk, uah] = await Promise.all([
    resolveOfficialEurReferenceRate("PLN"),
    resolveOfficialEurReferenceRate("USD"),
    resolveOfficialEurReferenceRate("GBP"),
    resolveOfficialEurReferenceRate("CZK"),
    nbuEurToUah(),
  ]);
  const ecbRows: Array<[FeedCurrencyF325, EcbReferenceRate]> = [
    ["PLN", pln], ["USD", usd], ["GBP", gbp], ["CZK", czk],
  ];
  const sources: FeedRateSourceF325[] = [{
    code: "EUR", referenceDate: new Date().toISOString().slice(0, 10),
    source: "EUR_IDENTITY", fallback: false,
  }];
  const ratesPerEur = {} as Record<FeedCurrencyF325, number>;
  ratesPerEur.EUR = 1;
  ratesPerEur.UAH = uah.rate;
  sources.push({
    code: "UAH", referenceDate: uah.date,
    source: "NBU_EUR_UAH_REFERENCE_RATE", fallback: false,
  });
  for (const [code, rate] of ecbRows) {
    if (rate.baseCurrency !== "EUR" || rate.quoteCurrency !== code) {
      throw new Error(`ECB unexpected currency for ${code}`);
    }
    assertRecent(rate.referenceDate, "ECB");
    ratesPerEur[code] = checkRate(rate.providerCurrencyPerEuro, code);
    sources.push({ code, referenceDate: rate.referenceDate, source: rate.sourceCode, fallback: rate.isFallback });
  }
  return { ratesPerEur, sources };
}

export function isFeedCurrencyF325(value: string): value is FeedCurrencyF325 {
  return (FEED_CURRENCIES_F325 as readonly string[]).includes(value.toUpperCase());
}

export async function getFeedFxSnapshotF325(): Promise<FeedFxSnapshotF325> {
  if (cached && Date.now() < cached.until) return cached.snapshot;
  if (!pending) {
    pending = resolveSnapshot().then(snapshot => {
      cached = { snapshot, until: Date.now() + CACHE_MS };
      return snapshot;
    }).finally(() => { pending = null; });
  }
  return pending;
}

import "server-only";

// F3.2.6: resolve only the official rates that a particular read needs.
// NBU UAH is kept in the EXISTING reference snapshot table after SQL gate.
// A failed optional quote does not disable otherwise usable display currencies.
import { supabase } from "../supabase";
import { resolveOfficialEurReferenceRate } from "./official-eur-reference-rate";
import {
  FEED_CURRENCIES_F325,
  type FeedCurrencyF325,
  type FeedRateSourceF325,
} from "./feed-six-currency-f325";

const NBU_SOURCE = "NBU_EUR_UAH_REFERENCE_RATE" as const;
const NBU_URL = "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchangeNew?json&valcode=EUR";
const MAX_AGE_MS = 7 * 86_400_000;
const CACHE_MS = 20 * 60_000;
const known = new Set<string>(FEED_CURRENCIES_F325);

type Quote = { rate: number; source: FeedRateSourceF325 };
const cache = new Map<FeedCurrencyF325, { until: number; quote: Quote }>();
const pending = new Map<FeedCurrencyF325, Promise<Quote>>();

function checkDate(date: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("FX_REFERENCE_DATE_INVALID");
  const age = Date.now() - Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(age) || age > MAX_AGE_MS || age < -86_400_000) {
    throw new Error("FX_REFERENCE_DATE_STALE");
  }
}
function checkRate(value: number): number {
  if (!Number.isFinite(value) || value <= 0 || value > 1_000_000) {
    throw new Error("FX_REFERENCE_RATE_INVALID");
  }
  return value;
}

async function fetchNbu(): Promise<Quote> {
  const response = await fetch(NBU_URL, {
    headers: { Accept: "application/json" },
    next: { revalidate: 21_600 },
    signal: AbortSignal.timeout(3_500),
  });
  if (!response.ok) throw new Error(`NBU_REQUEST_${response.status}`);
  const raw: unknown = await response.json();
  if (!Array.isArray(raw) || raw.length !== 1) throw new Error("NBU_RESPONSE_SHAPE");
  const row = raw[0] as Record<string, unknown>;
  if (row.cc !== "EUR" || typeof row.rate !== "number" || typeof row.exchangedate !== "string") {
    throw new Error("NBU_RATE_MISSING");
  }
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(row.exchangedate);
  if (!match) throw new Error("NBU_DATE_FORMAT");
  const referenceDate = `${match[3]}-${match[2]}-${match[1]}`;
  checkDate(referenceDate);
  const rate = checkRate(row.rate);
  const { error } = await supabase.from("exchange_rate_reference_snapshots").upsert({
    base_currency: "EUR",
    quote_currency: "UAH",
    provider_currency_per_euro: rate,
    reference_date: referenceDate,
    source_code: NBU_SOURCE,
    source_url: NBU_URL,
    fetched_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "base_currency,quote_currency,reference_date,source_code" });
  if (error) throw new Error("NBU_SNAPSHOT_WRITE_FAILED");
  return { rate, source: { code: "UAH", referenceDate, source: NBU_SOURCE, fallback: false } };
}

async function cachedNbu(): Promise<Quote | null> {
  const cutoff = new Date(Date.now() - MAX_AGE_MS).toISOString();
  const { data, error } = await supabase.from("exchange_rate_reference_snapshots")
    .select("provider_currency_per_euro,reference_date,fetched_at,source_code")
    .eq("base_currency", "EUR")
    .eq("quote_currency", "UAH")
    .eq("source_code", NBU_SOURCE)
    .gte("reference_date", cutoff.slice(0, 10))
    .gte("fetched_at", cutoff)
    .order("reference_date", { ascending: false })
    .order("fetched_at", { ascending: false })
    .limit(1).maybeSingle();
  if (error) throw new Error("NBU_SNAPSHOT_READ_FAILED");
  if (!data || data.source_code !== NBU_SOURCE) return null;
  try {
    checkDate(String(data.reference_date));
    const fetchedAt = Date.parse(String(data.fetched_at));
    if (!Number.isFinite(fetchedAt) || fetchedAt > Date.now() + 5 * 60_000 ||
      Date.now() - fetchedAt > MAX_AGE_MS) return null;
    return { rate: checkRate(Number(data.provider_currency_per_euro)), source: {
      code: "UAH", referenceDate: String(data.reference_date), source: NBU_SOURCE, fallback: true,
    } };
  } catch { return null; }
}

async function resolveOne(code: FeedCurrencyF325): Promise<Quote> {
  if (code === "EUR") return { rate: 1, source: {
    code, referenceDate: new Date().toISOString().slice(0, 10), source: "EUR_IDENTITY", fallback: false,
  } };
  if (code === "UAH") {
    try { return await fetchNbu(); }
    catch (error) {
      const saved = await cachedNbu();
      if (saved) return saved;
      throw error;
    }
  }
  const official = await resolveOfficialEurReferenceRate(code);
  if (official.baseCurrency !== "EUR" || official.quoteCurrency !== code) {
    throw new Error("ECB_QUOTE_MISMATCH");
  }
  checkDate(official.referenceDate);
  return { rate: checkRate(official.providerCurrencyPerEuro), source: {
    code, referenceDate: official.referenceDate, source: official.sourceCode, fallback: official.isFallback,
  } };
}

async function memoizedOne(code: FeedCurrencyF325): Promise<Quote> {
  if (code === "EUR") return resolveOne(code);
  const previous = cache.get(code);
  if (previous && previous.until > Date.now()) return previous.quote;
  const running = pending.get(code);
  if (running) return running;
  const job = resolveOne(code).then(quote => {
    cache.set(code, { until: Date.now() + CACHE_MS, quote });
    return quote;
  }).finally(() => { pending.delete(code); });
  pending.set(code, job);
  return job;
}

export type FeedFxRatesF326 = {
  ratesPerEur: Partial<Record<FeedCurrencyF325, number>>;
  sources: FeedRateSourceF325[];
  unavailableCurrencies: FeedCurrencyF325[];
};

// Strict is used for search (do not silently omit facts); optional for UI choices.
export async function getFeedFxRatesF326(
  currencies: readonly FeedCurrencyF325[],
  mode: "strict" | "optional" = "strict",
): Promise<FeedFxRatesF326> {
  const selected = [...new Set<FeedCurrencyF325>(["EUR", ...currencies])];
  if (selected.some(code => !known.has(code))) throw new Error("FX_CURRENCY_UNSUPPORTED");
  const settled = await Promise.allSettled(selected.map(memoizedOne));
  const ratesPerEur: FeedFxRatesF326["ratesPerEur"] = {};
  const sources: FeedRateSourceF325[] = [];
  const unavailableCurrencies: FeedCurrencyF325[] = [];
  settled.forEach((item, index) => {
    const code = selected[index];
    if (item.status === "fulfilled") {
      ratesPerEur[code] = item.value.rate;
      sources.push(item.value.source);
    } else {
      unavailableCurrencies.push(code);
    }
  });
  if (mode === "strict" && unavailableCurrencies.length) {
    throw new Error(`FX_REQUIRED_CURRENCY_UNAVAILABLE:${unavailableCurrencies.join(",")}`);
  }
  return { ratesPerEur, sources, unavailableCurrencies };
}

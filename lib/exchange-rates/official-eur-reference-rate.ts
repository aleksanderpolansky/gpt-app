import "server-only";

import { supabase } from "../supabase";
import {
  ECB_REFERENCE_RATE_MAX_FALLBACK_AGE_DAYS,
  type EcbReferenceRate,
  getEcbReferenceRate,
} from "./ecb-reference-rate";

type StoredReferenceRateRow = {
  base_currency: string;
  quote_currency: string;
  provider_currency_per_euro: number | string;
  reference_date: string;
  source_code: string;
  source_url: string;
  fetched_at: string;
};

async function saveOfficialReferenceRate(
  rate: EcbReferenceRate,
): Promise<void> {
  const { error } = await supabase
    .from("exchange_rate_reference_snapshots")
    .upsert(
      {
        base_currency: rate.baseCurrency,
        quote_currency: rate.quoteCurrency,
        provider_currency_per_euro: rate.providerCurrencyPerEuro,
        reference_date: rate.referenceDate,
        source_code: rate.sourceCode,
        source_url: rate.sourceUrl,
        fetched_at: rate.fetchedAt,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict:
          "base_currency,quote_currency,reference_date,source_code",
      },
    );

  if (error) {
    throw new Error(
      `Could not persist the official exchange-rate snapshot: ${error.message}`,
    );
  }
}

async function loadRecentOfficialReferenceRate(
  currencyCode: string,
): Promise<EcbReferenceRate | null> {
  const cutoff = new Date(
    Date.now() -
      ECB_REFERENCE_RATE_MAX_FALLBACK_AGE_DAYS * 86_400_000,
  );
  const cutoffTimestamp = cutoff.toISOString();
  const cutoffDate = cutoffTimestamp.slice(0, 10);

  const { data, error } = await supabase
    .from("exchange_rate_reference_snapshots")
    .select(
      `
      base_currency,
      quote_currency,
      provider_currency_per_euro,
      reference_date,
      source_code,
      source_url,
      fetched_at
    `,
    )
    .eq("base_currency", "EUR")
    .eq("quote_currency", currencyCode)
    .eq("source_code", "ECB_EURO_REFERENCE_RATE")
    .gte("reference_date", cutoffDate)
    .gte("fetched_at", cutoffTimestamp)
    .order("reference_date", { ascending: false })
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Could not read the saved official exchange-rate snapshot: ${error.message}`,
    );
  }

  const row = data as StoredReferenceRateRow | null;

  if (!row) {
    return null;
  }

  const rate = Number(row.provider_currency_per_euro);

  if (
    row.base_currency !== "EUR" ||
    row.quote_currency !== currencyCode ||
    row.source_code !== "ECB_EURO_REFERENCE_RATE" ||
    !Number.isFinite(rate) ||
    rate <= 0 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(row.reference_date) ||
    Number.isNaN(Date.parse(row.fetched_at)) ||
    !row.source_url.trim()
  ) {
    return null;
  }

  return {
    baseCurrency: "EUR",
    quoteCurrency: currencyCode,
    providerCurrencyPerEuro: rate,
    referenceDate: row.reference_date,
    sourceCode: "ECB_EURO_REFERENCE_RATE",
    sourceUrl: row.source_url,
    fetchedAt: new Date(row.fetched_at).toISOString(),
    isFallback: true,
  };
}

export async function resolveOfficialEurReferenceRate(
  currencyCode: string,
): Promise<EcbReferenceRate> {
  const normalizedCurrency = currencyCode.trim().toUpperCase();

  try {
    const officialRate =
      await getEcbReferenceRate(normalizedCurrency);

    await saveOfficialReferenceRate(officialRate);

    return officialRate;
  } catch (primaryError) {
    if (normalizedCurrency === "EUR") {
      throw primaryError;
    }

    const fallbackRate =
      await loadRecentOfficialReferenceRate(normalizedCurrency);

    if (fallbackRate) {
      return fallbackRate;
    }

    throw primaryError;
  }
}

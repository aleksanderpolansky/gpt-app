import "server-only";

import { NextResponse } from "next/server";
import { supabase } from "../../../../../lib/supabase";
import {
  FEED_CURRENCIES_F325,
  isFeedCurrencyF325,
} from "../../../../../lib/exchange-rates/feed-six-currency-f325";
import { getFeedFxRatesF326 } from "../../../../../lib/exchange-rates/feed-six-currency-f326";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type DbFacet = { unit_code: string; min_value: number; max_value: number; publications: number };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get("on") ?? "";
  const ids = raw ? raw.split(",").map(id => id.trim()) : [];
  if (ids.length > 8 || new Set(ids).size !== ids.length || ids.some(id => !UUID_RE.test(id))) {
    return NextResponse.json({ ok: false, error: "INVALID_ON_FILTER" }, { status: 400 });
  }
  try {
    const { data, error } = await supabase.rpc("arctor_feed_money_facets_f324_v1", {
      p_object_ids: ids,
    });
    if (error || !Array.isArray(data)) throw new Error("F326_ORIGIN_FACETS_UNAVAILABLE");
    const origin = data as DbFacet[];
    if (origin.some(f => !isFeedCurrencyF325(String(f.unit_code).toUpperCase()) ||
       !Number.isFinite(Number(f.min_value)) || !Number.isFinite(Number(f.max_value)) ||
       !Number.isFinite(Number(f.publications)) || Number(f.publications) < 0)) {
      throw new Error("F326_UNSUPPORTED_SOURCE_FACT_UNIT");
    }
    if (!origin.length) {
      return NextResponse.json({ ok: true, facets: [], fxSources: [], ratesPerEur: {}, unavailableCurrencies: [] },
        { headers: { "Cache-Control": "private, no-store" } });
    }
    // All display choices are independently attempted. No UAH quote must not
    // prevent EUR/PLN from remaining available if origin facts are in EUR.
    const { ratesPerEur, sources, unavailableCurrencies } = await getFeedFxRatesF326(
      FEED_CURRENCIES_F325, "optional",
    );
    const originCurrencies = [...new Set(origin.map(row => row.unit_code.toUpperCase()))];
    if (originCurrencies.some(unit => !ratesPerEur[unit as keyof typeof ratesPerEur])) {
      throw new Error("F326_REQUIRED_ORIGIN_RATE_UNAVAILABLE");
    }
    const facets = FEED_CURRENCIES_F325.filter(target => ratesPerEur[target] !== undefined).map(target => {
      const displayed = origin.map(row => {
        const native = row.unit_code.toUpperCase();
        if (!isFeedCurrencyF325(native)) throw new Error("F326_UNSUPPORTED_NATIVE_CURRENCY");
        const factor = ratesPerEur[target]! / ratesPerEur[native]!;
        return { low: Number(row.min_value) * factor, high: Number(row.max_value) * factor };
      });
      return {
        unit: target.toLowerCase(),
        minValue: Math.min(...displayed.map(r => r.low)),
        maxValue: Math.max(...displayed.map(r => r.high)),
        publications: Math.max(...origin.map(f => Number(f.publications))),
      };
    });
    return NextResponse.json({ ok: true, facets, fxSources: sources, ratesPerEur, unavailableCurrencies }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("F326_MONEY_FACETS_FAILURE", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ ok: false, error: "MONEY_FACETS_OR_FX_UNAVAILABLE" }, {
      status: 503, headers: { "Cache-Control": "no-store" },
    });
  }
}

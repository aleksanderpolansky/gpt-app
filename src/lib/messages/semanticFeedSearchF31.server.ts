import "server-only";
import { supabase } from "../../../lib/supabase";
import { getFeedFxRatesF326 } from "../../../lib/exchange-rates/feed-six-currency-f326";
import { isFeedCurrencyF325, type FeedCurrencyF325 } from "../../../lib/exchange-rates/feed-six-currency-f325";

// F3.1A legacy filters remain supported. F326 adds partial-rate search only
// for money=1; no changes to source facts or publication authorization.
export type SemanticFeedQueryF31 = {
  objectIds?: string;
  metricObjectId?: string;
  parameterId?: string;
  money?: string;
  min?: string;
  max?: string;
  unit?: string;
};
type SearchRow = { message_object_id: string; published_at: string };
type SearchResult = { messageIds: string[]; error: "invalid" | "unavailable" | null };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NUMBER_RE = /^-?\d{1,10}(?:\.\d{1,6})?$/;
const UNIT_RE = /^[a-z][a-z0-9_]{0,15}$/;

function parseNumber(value: string | undefined): number | null | undefined {
  if (value === undefined || value === "") return null;
  if (!NUMBER_RE.test(value)) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

export async function searchSemanticFeedF31(input: SemanticFeedQueryF31): Promise<SearchResult> {
  const rawIds = input.objectIds?.trim() ?? "";
  const objectIds = rawIds ? rawIds.split(",").map(s => s.trim()) : [];
  if (objectIds.length > 8 || new Set(objectIds).size !== objectIds.length ||
      objectIds.some(id => !UUID_RE.test(id))) return { messageIds: [], error: "invalid" };

  const money = input.money ?? "";
  const metric = input.metricObjectId?.trim() ?? "";
  const parameter = input.parameterId?.trim() ?? "";
  const min = parseNumber(input.min);
  const max = parseNumber(input.max);
  const unit = input.unit?.trim().toLowerCase() ?? "";
  if (!["", "1"].includes(money) || min === undefined || max === undefined ||
    (min !== null && max !== null && min > max)) return { messageIds: [], error: "invalid" };

  const isMoney = money === "1";
  const hasLegacyMetric = metric.length > 0;
  if (isMoney ? (
    Boolean(metric || parameter) || !isFeedCurrencyF325(unit.toUpperCase()) || (min === null && max === null)
  ) : (
    (!objectIds.length && !hasLegacyMetric) ||
    (hasLegacyMetric && (!UUID_RE.test(metric) || !UUID_RE.test(parameter) || !UNIT_RE.test(unit) || (min === null && max === null))) ||
    (!hasLegacyMetric && (Boolean(parameter || unit) || min !== null || max !== null))
  )) return { messageIds: [], error: "invalid" };

  try {
    // First read eligible origin currencies for this exact ON selection.
    // A EUR-origin PLN search never contacts the NBU; if UAH facts are
    // present, UAH remains required and the search fails closed on outage.
    let rates: Partial<Record<FeedCurrencyF325, number>> | null = null;
    if (isMoney) {
      const { data: facets, error: facetsError } = await supabase.rpc(
        "arctor_feed_money_facets_f324_v1", { p_object_ids: objectIds },
      );
      if (facetsError || !Array.isArray(facets)) throw new Error("F326_ORIGIN_FACETS_FAILED");
      // No eligible monetary facts: avoid all remote FX requests and return no matches.
      if (facets.length === 0) return { messageIds: [], error: null };
      const sourceCurrencies: FeedCurrencyF325[] = [];
      for (const row of facets as Array<{ unit_code: string }>) {
        const code = String(row.unit_code).toUpperCase();
        if (!isFeedCurrencyF325(code)) throw new Error("F326_UNKNOWN_ORIGIN_UNIT");
        sourceCurrencies.push(code as FeedCurrencyF325);
      }
      const snapshot = await getFeedFxRatesF326(
        [unit.toUpperCase() as FeedCurrencyF325, ...sourceCurrencies], "strict",
      );
      rates = snapshot.ratesPerEur;
    }
    const { data, error } = isMoney ? await supabase.rpc(
      "arctor_feed_search_money_fx_f326_v1",
      { p_object_ids: objectIds, p_min_value: min, p_max_value: max,
        p_target_currency: unit.toUpperCase(), p_rates_per_eur: rates,
        p_limit: 20, p_before_published_at: null, p_before_message_id: null },
    ) : await supabase.rpc("arctor_feed_search_publications_f31_v1", {
      p_object_ids: objectIds, p_metric_object_id: hasLegacyMetric ? metric : null,
      p_parameter_definition_id: hasLegacyMetric ? parameter : null,
      p_min_value: min, p_max_value: max, p_unit_code: hasLegacyMetric ? unit : null,
      p_limit: 20, p_before_published_at: null, p_before_message_id: null,
    });
    if (error || !Array.isArray(data)) {
      console.error("F326_SEMANTIC_SEARCH_RPC_FAILURE", error?.code ?? "missing_data");
      return { messageIds: [], error: "unavailable" };
    }
    const rows = data as SearchRow[];
    if (rows.some(row => !UUID_RE.test(row.message_object_id))) {
      return { messageIds: [], error: "unavailable" };
    }
    return { messageIds: rows.map(row => row.message_object_id), error: null };
  } catch (error) {
    console.error("F326_SEMANTIC_SEARCH_FAILED", error instanceof Error ? error.message : "unknown");
    return { messageIds: [], error: "unavailable" };
  }
}

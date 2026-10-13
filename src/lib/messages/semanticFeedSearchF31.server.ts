import "server-only";

import { supabase } from "../../../lib/supabase";

// F3.1B: this is a server-only adapter for the already deployed F3.1A RPC.
// Never call the service_role RPC directly from the browser.
export type SemanticFeedQueryF31 = {
  objectIds?: string;
  metricObjectId?: string;
  parameterId?: string;
  min?: string;
  max?: string;
  unit?: string;
};

type SearchRow = {
  message_object_id: string;
  published_at: string;
};

type SearchResult = {
  messageIds: string[];
  error: "invalid" | "unavailable" | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NUMBER_RE = /^-?\d{1,10}(?:\.\d{1,6})?$/;
const UNIT_RE = /^[a-z][a-z0-9_]{0,15}$/;
const MAX_SELECTED_OBJECTS = 8;
const PAGE_LIMIT = 20;

function parseNumber(value: string | undefined): number | null | undefined {
  if (value === undefined) return null;
  if (!NUMBER_RE.test(value)) return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

export async function searchSemanticFeedF31(
  input: SemanticFeedQueryF31,
): Promise<SearchResult> {
  const rawIds = input.objectIds?.trim() ?? "";
  const objectIds = rawIds
    ? rawIds.split(",").map((id) => id.trim())
    : [];

  if (
    objectIds.length > MAX_SELECTED_OBJECTS ||
    new Set(objectIds).size !== objectIds.length ||
    objectIds.some((id) => !UUID_RE.test(id))
  ) {
    return { messageIds: [], error: "invalid" };
  }

  const metricObjectId = input.metricObjectId?.trim() ?? "";
  const parameterId = input.parameterId?.trim() ?? "";
  const unit = input.unit?.trim().toLowerCase() ?? "";
  const min = parseNumber(input.min);
  const max = parseNumber(input.max);
  const hasMetric = metricObjectId.length > 0;

  if (
    (objectIds.length === 0 && !hasMetric) ||
    (hasMetric && (
      !UUID_RE.test(metricObjectId) ||
      !UUID_RE.test(parameterId) ||
      !UNIT_RE.test(unit) ||
      (min === null && max === null) ||
      min === undefined || max === undefined ||
      (min !== null && max !== null && min > max)
    )) ||
    (!hasMetric && (
      parameterId !== "" || unit !== "" ||
      input.min !== undefined || input.max !== undefined
    ))
  ) {
    return { messageIds: [], error: "invalid" };
  }

  try {
    const { data, error } = await supabase.rpc(
      "arctor_feed_search_publications_f31_v1",
      {
        p_object_ids: objectIds,
        p_metric_object_id: hasMetric ? metricObjectId : null,
        p_parameter_definition_id: hasMetric ? parameterId : null,
        p_min_value: min,
        p_max_value: max,
        p_unit_code: hasMetric ? unit : null,
        p_limit: PAGE_LIMIT,
        p_before_published_at: null,
        p_before_message_id: null,
      },
    );

    if (error || !Array.isArray(data)) {
      console.error("F3.1B semantic feed RPC failed", error?.code ?? "missing_data");
      return { messageIds: [], error: "unavailable" };
    }

    const rows = data as SearchRow[];
    if (rows.some((row) => !UUID_RE.test(row.message_object_id))) {
      console.error("F3.1B semantic feed RPC returned invalid identifiers");
      return { messageIds: [], error: "unavailable" };
    }

    return { messageIds: rows.map((row) => row.message_object_id), error: null };
  } catch (error) {
    console.error(
      "F3.1B semantic feed read failed",
      error instanceof Error ? error.name : "unknown",
    );
    return { messageIds: [], error: "unavailable" };
  }
}

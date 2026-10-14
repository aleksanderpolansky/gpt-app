import "server-only";

import { NextResponse } from "next/server";

import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// F3.2.3: only curator-approved price aspects are eligible for the wallet.
// Values come from confirmed facts and are additionally checked through F3.1A
// for actual public visibility, same-event intersection and source provenance.
const PRICE_REGISTRY = "arctor_feed_price_leaf_registry_f323_v1";
const MAX_PRICE_LEAVES = 24;
const MAX_CANDIDATE_FACTS = 100;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UNIT_RE = /^[a-z][a-z0-9_]{0,15}$/;

type ApprovedPriceLeaf = {
  price_leaf_id: string;
  parameter_definition_id: string;
};

type MoneyFact = {
  value_object_id: string;
  parameter_definition_id: string;
  value_numeric: number;
  unit: string | null;
};

type ResultRow = { message_object_id: string };

type Facet = {
  metricObjectId: string;
  parameterId: string;
  unit: string;
  minValue: number;
  maxValue: number;
  publications: number;
};

function errorResponse(code: string, status = 503) {
  return NextResponse.json({ ok: false, error: code }, {
    status, headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get("on") ?? "";
  const selected = raw ? raw.split(",").map(id => id.trim()) : [];
  if (
    selected.length > 8 ||
    new Set(selected).size !== selected.length ||
    selected.some(id => !UUID_RE.test(id))
  ) return errorResponse("INVALID_ON_FILTER", 400);

  try {
    const { data: approved, error: registryError } = await supabase
      .from(PRICE_REGISTRY)
      .select("price_leaf_id,parameter_definition_id")
      .eq("enabled", true)
      .limit(MAX_PRICE_LEAVES + 1);
    if (registryError || !Array.isArray(approved)) return errorResponse("PRICE_REGISTRY_UNAVAILABLE");
    const leaves = approved as ApprovedPriceLeaf[];
    if (leaves.length > MAX_PRICE_LEAVES) return errorResponse("PRICE_REGISTRY_CAPACITY_REACHED");
    if (!leaves.length) return NextResponse.json({ ok: true, facets: [] }, { headers: { "Cache-Control": "private, max-age=20" } });

    const approvedIds = leaves.map(row => row.price_leaf_id);
    const pairs = new Set(leaves.map(row => `${row.price_leaf_id}:${row.parameter_definition_id}`));
    const { data: facts, error: factsError } = await supabase
      .from("activity_object_facts")
      .select("value_object_id,parameter_definition_id,value_numeric,unit")
      .in("value_object_id", approvedIds)
      .eq("fact_status", "confirmed")
      .eq("fact_role_code", "source")
      .not("value_numeric", "is", null)
      .limit(MAX_CANDIDATE_FACTS + 1);
    if (factsError || !Array.isArray(facts)) return errorResponse("PRICE_FACTS_UNAVAILABLE");
    if (facts.length > MAX_CANDIDATE_FACTS) return errorResponse("PRICE_FACTS_CAPACITY_REACHED");

    const candidates = new Map<string, { leaf: string; parameter: string; unit: string; amount: number }>();
    for (const rawFact of facts as MoneyFact[]) {
      const unit = String(rawFact.unit ?? "").trim().toLowerCase();
      const amount = Number(rawFact.value_numeric);
      if (!pairs.has(`${rawFact.value_object_id}:${rawFact.parameter_definition_id}`) ||
          !UNIT_RE.test(unit) || !Number.isFinite(amount)) continue;
      const key = JSON.stringify([rawFact.value_object_id, rawFact.parameter_definition_id, unit, amount]);
      candidates.set(key, { leaf: rawFact.value_object_id, parameter: rawFact.parameter_definition_id, unit, amount });
    }

    // A fact amount is NOT exposed unless the pre-existing service-only F3.1A
    // confirms a matching published record, including the selected ON filters.
    // This intentionally fails closed if the candidate set grows too large;
    // next scalability stage will replace this with indexed SQL faceting.
    const grouped = new Map<string, Facet & { messages: Set<string> }>();
    for (const candidate of candidates.values()) {
      const { data, error } = await supabase.rpc("arctor_feed_search_publications_f31_v1", {
        p_object_ids: selected,
        p_metric_object_id: candidate.leaf,
        p_parameter_definition_id: candidate.parameter,
        p_min_value: candidate.amount,
        p_max_value: candidate.amount,
        p_unit_code: candidate.unit,
        p_limit: 50,
        p_before_published_at: null,
        p_before_message_id: null,
      });
      if (error || !Array.isArray(data)) return errorResponse("PRICE_VISIBILITY_CHECK_FAILED");
      const found = (data as ResultRow[]).filter(row => UUID_RE.test(row.message_object_id));
      if (!found.length) continue;
      const groupKey = JSON.stringify([candidate.leaf, candidate.parameter, candidate.unit]);
      const previous = grouped.get(groupKey);
      if (previous) {
        previous.minValue = Math.min(previous.minValue, candidate.amount);
        previous.maxValue = Math.max(previous.maxValue, candidate.amount);
        for (const row of found) previous.messages.add(row.message_object_id);
      } else grouped.set(groupKey, {
        metricObjectId: candidate.leaf, parameterId: candidate.parameter,
        unit: candidate.unit, minValue: candidate.amount, maxValue: candidate.amount,
        publications: 0, messages: new Set(found.map(row => row.message_object_id)),
      });
    }
    const facets = [...grouped.values()].map(({ messages, ...f }) => ({ ...f, publications: messages.size }))
      .sort((a, b) => a.unit.localeCompare(b.unit) || a.metricObjectId.localeCompare(b.metricObjectId));
    return NextResponse.json({ ok: true, facets }, { headers: { "Cache-Control": "private, max-age=20" } });
  } catch (error) {
    console.error("F323_PRICE_FACET_ERROR", error instanceof Error ? error.name : "unknown");
    return errorResponse("PRICE_FACET_UNAVAILABLE");
  }
}

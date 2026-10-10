import "server-only";
import { supabase } from "../../../lib/supabase";

export const ARCTOR_COMMERCIAL_AUTO_FACT_PILOT_V1 = "ARCTOR_COMMERCIAL_AUTO_FACT_PILOT_V1" as const;
const TEMPLATE_ID = "9a30b134-8afd-4657-9665-a7d58c4029e4";
const GEO_INTERMEDIATE_ID = "4a1ca70f-1a7b-526e-8afe-f056d5a8ea45";
const FOOD_INTERMEDIATE_ID = "511536d4-b7d8-5ca9-86f9-b793cfcc5ef7";
const RETAIL_INTERMEDIATE_ID = "ef1423a8-0ab3-595f-8330-841eb32333a4";
const COUNT_ID = "957fadd7-47e3-474d-a156-ce09b4e2e063";
const MONEY_ID = "ad49cf87-95b5-4839-a86a-a9a7c5b3406e";

type JsonRecord = Record<string, unknown>;
type AutoFact = {
  valueObjectId: string;
  intermediateValueObjectId: string;
  parameterDefinitionId: string;
  valueNumeric: number;
  unit: string;
  rawFragment: string;
  reportedSeller: string;
  selectionRule: string;
};
type Result =
  | { status: "written" | "idempotent_replay"; count: number }
  | { status: "needs_review"; reason: string };

const CITY_PATTERNS = [
  { name: "Valencia", pattern: /валенси[а-я]*|\bvalencia\b/i },
  { name: "Szczecin", pattern: /щ[её]цин[а-я]*|\bszczecin\b/i },
  { name: "Berlin", pattern: /берлин[а-я]*|\bberlin\b/i },
  { name: "Brno", pattern: /брно|\bbrno\b/i },
] as const;

function row(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord : {};
}
function str(value: unknown) { return typeof value === "string" ? value.trim() : ""; }

export function parseCommercialFilletPilot(text: string):
  | { seller: "Lidl"; city: string; price: number; unit: "eur" | "pln"; fragment: string }
  | { reason: string } {
  // This pilot intentionally refuses ambiguous / unsupported offers.
  if (!/(?:\blidl\b|лидл)/i.test(text)) return { reason: "COMMERCIAL_SELLER_NOT_EXACT_LIDL" };
  const cities = CITY_PATTERNS.filter((city) => city.pattern.test(text));
  if (cities.length !== 1) return { reason: "COMMERCIAL_CITY_NOT_UNIQUE" };
  if (!/(?:1\s*(?:кг|kg)|за\s*(?:1\s*)?(?:кг|kg)|per\s*kg)/i.test(text)) {
    return { reason: "COMMERCIAL_PRICE_BASIS_1KG_UNVERIFIED" };
  }
  if (!/(?:курин\S*\s+филе|филе\s+курин\S*|chicken\s+(?:breast\s+)?fillet|filete\s+de\s+pollo)/i.test(text)) {
    return { reason: "COMMERCIAL_PRODUCT_NOT_EXACT_FILLET" };
  }
  const candidates = [...text.matchAll(/(?:за|по|for|at|a)\s*(\d+(?:[.,]\d{1,2})?)\s*(евро|eur|€|злот(?:ых|ый|ые)?|зл|zł|pln)(?=\s|[.,!?;:]|$)/gi)];
  if (candidates.length !== 1) return { reason: "COMMERCIAL_PRICE_NOT_UNIQUE" };
  const price = Number(candidates[0][1].replace(",", "."));
  if (!(price > 0 && Number.isFinite(price))) return { reason: "COMMERCIAL_PRICE_INVALID" };
  const token = candidates[0][2].toLocaleLowerCase();
  const unit: "eur" | "pln" = /^(?:евро|eur|€)$/.test(token) ? "eur" : "pln";
  return { seller: "Lidl", city: cities[0].name, price, unit, fragment: candidates[0][0] };
}

async function soleExactObject(input: { title: string; leaf: boolean }) {
  const query = supabase.from("value_objects")
    .select("id,title,canonical_key")
    .eq("scope_code", "global")
    .eq("origin_type_code", "system_model")
    .eq("status", "active")
    .eq("ontology_node_role_code", input.leaf ? "leaf" : "intermediate")
    .eq("title", input.title)
    .limit(2);
  const { data, error } = await query;
  if (error) throw new Error(`COMMERCIAL_EXACT_OBJECT_READ_FAILED:${error.message}`);
  return data?.length === 1 ? data[0] : null;
}

async function exactProductLeaf() {
  const { data, error } = await supabase.from("value_objects")
    .select("id,title,canonical_key")
    .eq("scope_code", "global")
    .eq("origin_type_code", "system_model")
    .eq("ontology_node_role_code", "leaf")
    .eq("status", "active")
    .ilike("title", "%chicken%")
    .limit(40);
  if (error) throw new Error(`COMMERCIAL_PRODUCT_READ_FAILED:${error.message}`);
  const matching = (data ?? []).filter((item) =>
    /(price|цена)/i.test(str(item.title)) &&
    /(chicken.*(?:breast|fillet)|курин)/i.test(str(item.title)) &&
    /(?:1\s*kg|1\s*кг)/i.test(str(item.title))
  );
  return matching.length === 1 ? matching[0] : null;
}

async function validates(input: {
  eventId: string; leafId: string; parameterId: string;
  intermediateId: string; unit: string;
}) {
  const { data, error } = await supabase.rpc("arctor_validate_commercial_fact_v1", {
    p_activity_event_id: input.eventId,
    p_value_object_id: input.leafId,
    p_parameter_definition_id: input.parameterId,
    p_intermediate_value_object_id: input.intermediateId,
    p_unit: input.unit,
  });
  if (error) throw new Error(`COMMERCIAL_FACT_BINDING_VALIDATE_FAILED:${error.message}`);
  return data === true;
}

export async function runCommercialAutoFactPilotV1(input: {
  activityEventId: string;
  templateId: string;
  sourceText: string;
}): Promise<Result> {
  if (process.env.ARCTOR_COMMERCIAL_AUTO_FACTS_V1 !== "enabled") {
    return { status: "needs_review", reason: "COMMERCIAL_AUTO_FACTS_FEATURE_DISABLED" };
  }
  // Never auto-route personal or other templates.
  if (input.templateId !== TEMPLATE_ID) {
    return { status: "needs_review", reason: "COMMERCIAL_TEMPLATE_UNSUPPORTED_IN_PILOT" };
  }
  const parsed = parseCommercialFilletPilot(input.sourceText);
  if ("reason" in parsed) return { status: "needs_review", reason: parsed.reason };

  const [cityLeaf, storeCityBranch, priceLeaf] = await Promise.all([
    soleExactObject({ title: parsed.city, leaf: true }),
    soleExactObject({ title: `Lidl in ${parsed.city}`, leaf: false }),
    exactProductLeaf(),
  ]);
  if (!cityLeaf || !storeCityBranch || !priceLeaf) {
    return { status: "needs_review", reason: "COMMERCIAL_GEO_STORE_OR_PRICE_LEAF_MISSING" };
  }

  // Deterministic first leaf via one bounded SQL query, not 50-70 per-store queries.
  const { data: representativeRaw, error: representativeError } = await supabase.rpc(
    "arctor_commercial_first_leaf_v1", { p_branch_id: storeCityBranch.id },
  );
  if (representativeError) throw new Error(`COMMERCIAL_FIRST_STORE_READ_FAILED:${representativeError.message}`);
  const representative = Array.isArray(representativeRaw) ? representativeRaw[0] : null;
  if (!representative || !str(representative.id)) {
    return { status: "needs_review", reason: "COMMERCIAL_NO_STORE_REPRESENTATIVE" };
  }

  const checks = await Promise.all([
    validates({ eventId: input.activityEventId, leafId: cityLeaf.id,
      parameterId: COUNT_ID, intermediateId: GEO_INTERMEDIATE_ID, unit: "count" }),
    validates({ eventId: input.activityEventId, leafId: representative.id,
      parameterId: COUNT_ID, intermediateId: RETAIL_INTERMEDIATE_ID, unit: "count" }),
    validates({ eventId: input.activityEventId, leafId: priceLeaf.id,
      parameterId: MONEY_ID, intermediateId: FOOD_INTERMEDIATE_ID, unit: parsed.unit }),
  ]);
  if (!checks.every(Boolean)) {
    return { status: "needs_review", reason: "COMMERCIAL_LEAF_OUTSIDE_PROFILE_BINDINGS" };
  }

  const facts: AutoFact[] = [
    { valueObjectId: cityLeaf.id, intermediateValueObjectId: GEO_INTERMEDIATE_ID,
      parameterDefinitionId: COUNT_ID, valueNumeric: 1, unit: "count",
      rawFragment: parsed.city, reportedSeller: parsed.seller, selectionRule: "exact_city" },
    { valueObjectId: representative.id, intermediateValueObjectId: RETAIL_INTERMEDIATE_ID,
      parameterDefinitionId: COUNT_ID, valueNumeric: 1, unit: "count",
      rawFragment: `Lidl in ${parsed.city}`, reportedSeller: parsed.seller,
      selectionRule: "deterministic_first_city_store_represents_chain_only" },
    { valueObjectId: priceLeaf.id, intermediateValueObjectId: FOOD_INTERMEDIATE_ID,
      parameterDefinitionId: MONEY_ID, valueNumeric: parsed.price, unit: parsed.unit,
      rawFragment: parsed.fragment, reportedSeller: parsed.seller,
      selectionRule: "exact_product_class_and_price_basis" },
  ];
  const { data, error } = await supabase.rpc("arctor_write_commercial_auto_facts_v1", {
    p_activity_event_id: input.activityEventId,
    p_facts: facts,
  });
  if (error) throw new Error(`COMMERCIAL_WRITE_FAILED:${error.message}`);
  const receipt = row(data);
  if (receipt.ok !== true) throw new Error("COMMERCIAL_WRITE_NOT_CONFIRMED");
  return { status: receipt.status === "idempotent_replay" ? "idempotent_replay" : "written",
    count: typeof receipt.factCount === "number" ? receipt.factCount : 3 };
}

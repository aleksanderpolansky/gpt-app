import { supabase } from "../../../lib/supabase";

type JsonRecord = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function materializePublishedFormulaRuleCalculationModelV1(input: {
  ruleVersionId: string;
  title?: string | null;
  description?: string | null;
  categoryCode?: string | null;
}) {
  const ruleVersionId = text(input.ruleVersionId);

  if (!ruleVersionId) {
    throw new Error("CALCULATION_MODEL_BRIDGE_RULE_VERSION_ID_REQUIRED");
  }

  const { data, error } = await supabase.rpc(
    "materialize_published_formula_rule_calculation_model_f1_v1",
    {
      p_rule_version_id: ruleVersionId,
      p_title: text(input.title) || null,
      p_description: text(input.description) || null,
      p_category_code: text(input.categoryCode) || "general",
    },
  );

  if (error) {
    throw new Error(
      `CALCULATION_MODEL_BRIDGE_RPC_FAILED:${error.message}`,
    );
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("CALCULATION_MODEL_BRIDGE_RESULT_INVALID");
  }

  return data as JsonRecord;
}
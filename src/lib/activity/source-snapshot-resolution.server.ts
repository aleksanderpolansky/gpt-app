import { supabase } from "../../../lib/supabase";
import { evaluate } from "../reality-curator/formula-expression-evaluator";
import { parseSourceResolution, snapshotExpression, type SourceBinding, type SourceResolution } from "./source-snapshot-resolution";

const STATE_ROOT = "6ba4ecf1-8a05-5eaa-b280-4eb7aff2a42a";
export async function validateSnapshotBindings(bindings: readonly SourceBinding[]) {
  for (const binding of bindings) {
    const resolution = parseSourceResolution(binding.sourceResolution);
    if (!resolution) continue;
    const [object, definition, assignment] = await Promise.all([
      supabase.from("value_objects").select("id").eq("id", resolution.snapshotValueObjectId!)
        .eq("root_value_object_id", STATE_ROOT).eq("scope_code", "global")
        .eq("origin_type_code", "system_model").eq("ontology_node_role_code", "leaf").eq("status", "active").maybeSingle(),
      supabase.from("value_object_parameter_definitions").select("id").eq("id", binding.parameterDefinitionId)
        .eq("scope_code", "system").eq("status", "active").eq("value_type_code", "numeric").maybeSingle(),
      supabase.from("value_object_parameter_assignments").select("id").eq("value_object_id", resolution.snapshotValueObjectId!)
        .eq("parameter_definition_id", binding.parameterDefinitionId).eq("scope_code", "system")
        .eq("assignment_scope_code", "system").eq("status", "active").is("owner_user_id", null).is("owner_actor_id", null).maybeSingle(),
    ]);
    for (const result of [object, definition, assignment]) {
      if (result.error) throw new Error(`SOURCE_SNAPSHOT_VALIDATION_FAILED:${result.error.message}`);
      if (!result.data) throw new Error("SOURCE_SNAPSHOT_ACTIVE_STATE_ASSIGNMENT_REQUIRED");
    }
  }
}

export async function resolveSnapshotValue(input: {
  appUserId: string; actorId: string; effectiveAt: string;
  parameterDefinitionId: string; resolution: SourceResolution;
}) {
  if (!input.effectiveAt || !Number.isFinite(Date.parse(input.effectiveAt))) throw new Error("SOURCE_SNAPSHOT_ACTIVITY_TIME_REQUIRED");
  const { data, error } = await supabase.from("activity_object_facts")
    .select("id,value_numeric,unit,effective_at,confidence,valid_from,valid_to")
    .eq("user_id", input.appUserId).eq("acting_as_actor_id", input.actorId)
    .eq("fact_role_code", "snapshot").eq("fact_status", "confirmed")
    .eq("value_object_id", input.resolution.snapshotValueObjectId!)
    .eq("parameter_definition_id", input.parameterDefinitionId)
    .lte("effective_at", input.effectiveAt)
    .order("effective_at", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false })
    .limit(1).maybeSingle();
  if (error) throw new Error(`SOURCE_SNAPSHOT_READ_FAILED:${error.message}`);
  if (!data) throw new Error("SOURCE_SNAPSHOT_NOT_FOUND:Запишите подходящее состояние на момент активности.");
  const at = Date.parse(input.effectiveAt);
  if ((data.valid_from && Date.parse(data.valid_from) > at) || (data.valid_to && Date.parse(data.valid_to) <= at)) {
    throw new Error("SOURCE_SNAPSHOT_EXPIRED");
  }
  // Keep the registered input unit: 35 gram * 1 is 35 gram, never 35 kilogram.
  // The existing writer validates the unit against the same parameter definition.
  if (typeof data.value_numeric !== "number" || !Number.isFinite(data.value_numeric) || !data.unit) throw new Error("SOURCE_SNAPSHOT_NUMERIC_VALUE_REQUIRED");
  const expression = snapshotExpression(input.resolution.multiplier!);
  const value = evaluate(expression, { snapshot: data.value_numeric });
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("SOURCE_SNAPSHOT_RESULT_NOT_FINITE");
  return { value, unit: String(data.unit), confidence: typeof data.confidence === "number" ? data.confidence : 1,
    provenance: { contract: "ARCTOR_SOURCE_FROM_SNAPSHOT_V1", snapshotFactId: data.id,
      snapshotValueObjectId: input.resolution.snapshotValueObjectId, parameterDefinitionId: input.parameterDefinitionId,
      snapshotEffectiveAt: data.effective_at, activityEffectiveAt: input.effectiveAt,
      inputValue: data.value_numeric, inputUnit: data.unit, multiplier: input.resolution.multiplier,
      expressionLanguage: "arctor_formula_v1", expression, selection: "latest_confirmed_at_activity_time",
      rationale: `Значение из факта-среза ${data.id}: ${data.value_numeric} ${data.unit} × ${input.resolution.multiplier}.` } };
}

import "server-only";
import { supabase } from "../../../lib/supabase";

/**
 * P2.5.1: read-only template-driven inspection of the existing basic analysis.
 * This module NEVER chooses a leaf without evidence and NEVER writes a fact.
 * It must not be confused with the production fact writer.
 */
export const ARCTOR_P25_SHARED_PREFLIGHT_V1 = "ARCTOR_P25_SHARED_PREFLIGHT_V1" as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type JsonMap = Record<string, unknown>;
function obj(value: unknown): JsonMap {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonMap) : {};
}
function str(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export type InspectedMeasurement = {
  parameterCode: string;
  valueNumeric: number | null;
  valueText: string | null;
  unit: string;
  qualifier: string | null;
  rawFragment: string;
};
export type InspectedBinding = {
  parameterDefinitionId: string;
  parameterCode: string;
  intermediateValueObjectId: string;
  intermediateTitle: string | null;
  measurements: InspectedMeasurement[];
  status: "explicit_candidate" | "unresolved";
  issue: string | null;
  selectedLeafValueObjectId: null;
};
export type CommercialPreflight = {
  contract: typeof ARCTOR_P25_SHARED_PREFLIGHT_V1;
  activityEventId: string;
  sourceMessageObjectId: string;
  rawSignalId: string;
  templateId: string;
  profileId: string;
  profileVersion: number;
  bindings: InspectedBinding[];
  factsPlanned: 0;
  readyForWrite: false;
  reason: string;
  /** Actual profile metadata keys, useful for checking defaults without fabricating them. */
  profileMetadataKeys: string[];
};

export async function inspectCommercialFactRoutesP25(activityEventId: string): Promise<CommercialPreflight> {
  if (!UUID_RE.test(activityEventId)) throw new Error("P25_INVALID_EVENT_ID");
  const { data: event, error: eventError } = await supabase.from("activity_events")
    .select("id,user_id,activity_context_code,source_message_object_id,activity_template_id")
    .eq("id", activityEventId).maybeSingle();
  if (eventError) throw new Error(`P25_EVENT_READ_FAILED:${eventError.message}`);
  if (!event || event.activity_context_code !== "commercial" ||
      !UUID_RE.test(str(event.source_message_object_id))) {
    throw new Error("P25_COMMERCIAL_FEED_EVENT_REQUIRED");
  }
  const templateId = str(event.activity_template_id);
  if (!UUID_RE.test(templateId)) throw new Error("P25_TEMPLATE_NOT_SELECTED");

  const { data: template, error: templateError } = await supabase.from("activity_templates")
    .select("id,status,is_active,template_scope,default_metadata_json")
    .eq("id", templateId).maybeSingle();
  if (templateError) throw new Error(`P25_TEMPLATE_READ_FAILED:${templateError.message}`);
  const authoring = obj(obj(template?.default_metadata_json).typicalActivityAuthoringV2);
  if (!template || template.status !== "active" || template.is_active !== true ||
      template.template_scope !== "system" ||
      !["commercial", "both"].includes(str(authoring.actorApplicability))) {
    throw new Error("P25_ACTIVE_COMMERCIAL_TEMPLATE_REQUIRED");
  }

  const { data: signal, error: signalError } = await supabase.from("raw_activity_signals")
    .select("id,normalized_preview_json")
    .eq("output_event_id", activityEventId)
    .eq("source_type", "system_event")
    .eq("user_id", event.user_id)
    .order("updated_at", { ascending: false })
    .limit(1).maybeSingle();
  if (signalError) throw new Error(`P25_SIGNAL_READ_FAILED:${signalError.message}`);
  if (!signal) throw new Error("P25_FEED_SIGNAL_NOT_FOUND");
  const analysis = obj(obj(signal.normalized_preview_json).basicIntakeAnalysisV1);
  if (analysis.status !== "completed" || !Array.isArray(analysis.templateCandidates) ||
      !analysis.templateCandidates.some((x: unknown) => {
        const row = obj(x);
        return str(row.templateId) === templateId && (num(row.confidence) ?? 0) >= 0.9;
      })) {
    throw new Error("P25_MATCHING_COMPLETED_ANALYSIS_REQUIRED");
  }
  const rawMeasurements: InspectedMeasurement[] = Array.isArray(analysis.measurements)
    ? analysis.measurements.flatMap((entry: unknown) => {
        const m = obj(entry);
        const vNum = num(m.valueNumeric);
        const vText = str(m.valueText);
        const rawFragment = str(m.rawFragment);
        return str(m.parameterCode) && str(m.unit) && rawFragment &&
          (vNum !== null || vText) ? [{
            parameterCode: str(m.parameterCode), unit: str(m.unit),
            valueNumeric: vNum, valueText: vNum === null ? vText : null,
            qualifier: str(m.qualifier) || null, rawFragment,
          }] : [];
      }) : [];

  const { data: profile, error: profileError } = await supabase.from("activity_template_impact_profiles_v1")
    .select("id,version_no,routing_contract_code,metadata_json")
    .eq("template_id", templateId).eq("status", "active")
    .order("version_no", { ascending: false }).limit(1).maybeSingle();
  if (profileError) throw new Error(`P25_PROFILE_READ_FAILED:${profileError.message}`);
  if (!profile || profile.routing_contract_code !== "parameter_registry_v2") {
    throw new Error("P25_ACTIVE_PARAMETER_REGISTRY_PROFILE_REQUIRED");
  }
  const metadata = obj(profile.metadata_json);
  const rawBindings = Array.isArray(metadata.parameterizedTargetBindingsV1)
    ? metadata.parameterizedTargetBindingsV1 : [];
  // The fixed personal profile is NOT rewritten and stays on its working path.
  if (!rawBindings.length) throw new Error("P25_PARAMETERIZED_BINDINGS_NOT_FOUND");
  const definitionsIds = [...new Set(rawBindings.map((b: unknown) => str(obj(b).parameterDefinitionId)))];
  const intermediateIds = [...new Set(rawBindings.map((b: unknown) => str(obj(b).intermediateValueObjectId)))];
  if (definitionsIds.some((id) => !UUID_RE.test(id)) || intermediateIds.some((id) => !UUID_RE.test(id))) {
    throw new Error("P25_BINDING_ID_INVALID");
  }
  const [parameterResponse, intermediateResponse, profileParameterResponse] = await Promise.all([
    supabase.from("value_object_parameter_definitions")
      .select("id,parameter_code,dimension_code,status,scope_code")
      .in("id", definitionsIds).eq("status", "active").eq("scope_code", "system"),
    supabase.from("value_objects")
      .select("id,title,status,ontology_node_role_code")
      .in("id", intermediateIds).eq("status", "active"),
    supabase.from("activity_template_profile_parameters_v2")
      .select("parameter_definition_id").eq("profile_id", profile.id),
  ]);
  for (const response of [parameterResponse, intermediateResponse, profileParameterResponse]) {
    if (response.error) throw new Error(`P25_PROFILE_BINDING_READ_FAILED:${response.error.message}`);
  }
  const params = new Map((parameterResponse.data ?? []).map((r) => [r.id, r]));
  const roots = new Map((intermediateResponse.data ?? []).map((r) => [r.id, r]));
  const permitted = new Set((profileParameterResponse.data ?? []).map((r) => r.parameter_definition_id));
  const seen = new Set<string>();
  const bindings: InspectedBinding[] = rawBindings.map((entry: unknown) => {
    const b = obj(entry);
    const parameterDefinitionId = str(b.parameterDefinitionId);
    const intermediateValueObjectId = str(b.intermediateValueObjectId);
    const k = `${parameterDefinitionId}:${intermediateValueObjectId}`;
    if (seen.has(k)) throw new Error("P25_DUPLICATE_BINDING");
    seen.add(k);
    const parameter = params.get(parameterDefinitionId);
    const root = roots.get(intermediateValueObjectId);
    if (!parameter || !permitted.has(parameterDefinitionId) || !root ||
        root.ontology_node_role_code !== "intermediate") {
      throw new Error("P25_PROFILE_BINDING_INVALID");
    }
    const code = str(parameter.parameter_code).toLowerCase();
    const dimension = str(parameter.dimension_code).toLowerCase();
    // Match only known parameter/dimension identity; never pick a product, store,
    // city or a default merely from the names used in this pilot.
    const matches = rawMeasurements.filter((m) => {
      const measured = m.parameterCode.toLowerCase();
      return measured === code || (dimension !== "" && measured === dimension);
    });
    return {
      parameterDefinitionId, parameterCode: code,
      intermediateValueObjectId, intermediateTitle: root.title,
      measurements: matches,
      status: matches.length > 0 ? "explicit_candidate" : "unresolved",
      issue: matches.length === 0
        ? "Значение не сопоставлено с параметром; проверить действующие правила значений по умолчанию"
        : "Для записи требуется доказанное соответствие листовому ОН этой ветви",
      selectedLeafValueObjectId: null,
    };
  });
  return {
    contract: ARCTOR_P25_SHARED_PREFLIGHT_V1, activityEventId,
    sourceMessageObjectId: event.source_message_object_id,
    rawSignalId: signal.id, templateId, profileId: profile.id,
    profileVersion: profile.version_no, bindings, factsPlanned: 0,
    readyForWrite: false,
    reason: "P25_1_LEAF_RESOLUTION_AND_SHARED_WRITER_NOT_YET_CONNECTED",
    profileMetadataKeys: Object.keys(metadata).sort(),
  };
}

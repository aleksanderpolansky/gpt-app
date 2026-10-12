import "server-only";
import crypto from "node:crypto";
import { supabase } from "../../../lib/supabase";
import { inspectCommercialFactRoutesP25 } from "@/lib/activity/commercialSharedPreflightP25.server";

export const ARCTOR_P257_COMMERCIAL_PUBLIC_FACT_V1 = "ARCTOR_P257_COMMERCIAL_PUBLIC_FACT_V1" as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type P257Confirmation = {
  activityEventId: string;
  manualLeafByRoot: Record<string,string>;
  acceptedTechnicalRootIds: string[];
  adminUserId: string;
};

export async function confirmCommercialFactsP257(input: P257Confirmation) {
  if (!UUID.test(input.activityEventId) || !UUID.test(input.adminUserId)) {
    throw new Error("P257_INVALID_EVENT_OR_ADMIN");
  }
  const nominationEntries = Object.entries(input.manualLeafByRoot);
  if (nominationEntries.length > 12 || input.acceptedTechnicalRootIds.length > 12 ||
      nominationEntries.some(([root, leaf]) => !UUID.test(root) || !UUID.test(leaf)) ||
      input.acceptedTechnicalRootIds.some(id => !UUID.test(id)) ||
      new Set(input.acceptedTechnicalRootIds).size !== input.acceptedTechnicalRootIds.length) {
    throw new Error("P257_INVALID_TARGET_SELECTION");
  }
  // Repeat the exact same server-side preflight for the write, including the
  // subtree check and the technical representative selection; never trust a
  // browser-supplied leaf ID for a technical store.
  const preflight = await inspectCommercialFactRoutesP25(
    input.activityEventId, input.manualLeafByRoot,
  );
  if (!preflight.bindings.length || preflight.bindings.length > 20) {
    throw new Error("P257_INVALID_FACT_COUNT");
  }
  const accepted = new Set(input.acceptedTechnicalRootIds);
  const validTechRoots = new Set(preflight.bindings
    .filter(b => b.technicalRepresentative?.status === "proposed")
    .map(b => b.intermediateValueObjectId));
  if ([...accepted].some(root => !validTechRoots.has(root))) {
    throw new Error("P257_TECH_REP_SELECTION_STALE");
  }
  const {data: event, error: eventError} = await supabase.from("activity_events")
    .select("id,user_id,acting_as_actor_id,activity_template_id,activity_context_code,source_message_object_id,commercial_processing_status")
    .eq("id", input.activityEventId).single();
  if (eventError || !event || event.activity_context_code !== "commercial" ||
      event.activity_template_id !== preflight.templateId ||
      event.source_message_object_id !== preflight.sourceMessageObjectId ||
      !UUID.test(String(event.acting_as_actor_id ?? "")) ||
      !UUID.test(String(event.user_id ?? ""))) {
    throw new Error("P257_COMMERCIAL_EVENT_CHANGED_OR_INVALID");
  }
  if (!["analysis_ready", "needs_review", "auto_processed"].includes(event.commercial_processing_status ?? "")) {
    throw new Error("P257_EVENT_NOT_READY");
  }
  // No facts, of any kind, may already exist for this event. Prevent accidental
  // mixing with the older specialized auto writer and its separate idempotency.
  const {data: existing, error: existingError} = await supabase.from("activity_object_facts")
    .select("id").eq("activity_event_id", input.activityEventId)
    .neq("fact_status", "deleted").limit(1);
  if (existingError) throw new Error(`P257_FACT_READ_FAILED:${existingError.message}`);
  if ((existing ?? []).length) throw new Error("P257_EVENT_ALREADY_HAS_FACTS");

  const objects = preflight.bindings.map(binding => {
    const prepared = binding.preparedValue;
    if (!prepared || !Number.isFinite(prepared.valueNumeric) ||
        !UUID.test(binding.parameterDefinitionId) ||
        !UUID.test(binding.intermediateValueObjectId)) {
      throw new Error(`P257_VALUE_NOT_READY:${binding.parameterCode}`);
    }
    const manualId = binding.adminNominatedLeafId;
    const tech = binding.technicalRepresentative;
    const useTech = !manualId && accepted.has(binding.intermediateValueObjectId) &&
      tech?.status === "proposed" && UUID.test(tech.leafId ?? "");
    const selectedId = manualId ?? (useTech ? (tech?.leafId ?? null) : binding.selectedLeafValueObjectId);
    if (!selectedId || !UUID.test(selectedId)) throw new Error(`P257_LEAF_NOT_CONFIRMED:${binding.parameterCode}`);
    return {binding, prepared, selectedId, useTech};
  });
  const selectedLeafIds = [...new Set(objects.map(o => o.selectedId))];
  const {data: targetRows,error: targetError} = await supabase.from("value_objects")
    .select("id,canonical_key,title,ontology_node_role_code,status,scope_code,origin_type_code")
    .in("id",selectedLeafIds);
  if (targetError) throw new Error(`P257_LEAF_LOOKUP_FAILED:${targetError.message}`);
  const targets = new Map((targetRows ?? []).map(row => [row.id,row]));
  const rows = objects.map(({binding,prepared,selectedId,useTech}) => {
    const target = targets.get(selectedId);
    if (!target || target.ontology_node_role_code !== "leaf" || target.status !== "active" ||
        target.scope_code !== "global" || target.origin_type_code !== "system_model" ||
        !target.canonical_key) throw new Error("P257_INACTIVE_OR_INVALID_LEAF");
    const provenance = {
      contract: ARCTOR_P257_COMMERCIAL_PUBLIC_FACT_V1,
      activityContext: "commercial",
      origin: "public_feed",
      evidenceType: "public_claim_not_independently_verified",
      confirmationMethod: "admin_manual",
      confirmedByAdminUserId: input.adminUserId,
      sourceMessageObjectId: preflight.sourceMessageObjectId,
      activityEventId: input.activityEventId,
      rawSignalId: preflight.rawSignalId,
      templateId: preflight.templateId,
      profileId: preflight.profileId,
      profileVersion: preflight.profileVersion,
      intermediateValueObjectId: binding.intermediateValueObjectId,
      targetValueObjectId: selectedId,
      parameterDefinitionId: binding.parameterDefinitionId,
      valueOrigin: prepared.origin,
      technicalRepresentative: useTech,
      actualStoreAddressConfirmed: useTech ? false : null,
      representativeSelectionReason: useTech ? binding.technicalRepresentative?.reason : null,
    };
    const sourceIsDefault = prepared.origin === "template_default";
    return {
      canonicalKey: target.canonical_key,
      parameterCode: binding.parameterCode,
      unit: prepared.unit,
      valueNumeric: prepared.valueNumeric,
      rawFragment: prepared.rawFragment ?? "Value specified in active typical-activity profile",
      normalizedFragment: prepared.rawFragment ?? "Value specified in active typical-activity profile",
      semanticMatchMethodCode: "manual",
      sourceType: sourceIsDefault ? "system_default" : "ai_extraction",
      confidence: 1,
      factStatus: "confirmed",
      isUserConfirmed: false,
      valueOriginCode: sourceIsDefault ? "system_default" : "user_explicit",
      sourceReliabilityCode: sourceIsDefault ? "deterministic" : "user_reported",
      sourceReference: preflight.sourceMessageObjectId,
      sourceSnapshotJson: {commercialPublicV257: provenance},
    };
  });
  // The shared GSR1D writer provides a single DB transaction and an
  // idempotency key. It must have the P257 validation extension installed.
  const requestHash = crypto.createHash("sha256")
    .update(JSON.stringify({version:ARCTOR_P257_COMMERCIAL_PUBLIC_FACT_V1,rows,activityEventId:input.activityEventId}))
    .digest("hex");
  const {data: result,error} = await supabase.rpc("attach_global_observation_facts_gsr1_v1",{
    p_owner_user_id: event.user_id,
    p_owner_actor_id: event.acting_as_actor_id,
    p_activity_event_id: input.activityEventId,
    p_idempotency_key: `P257_COMMERCIAL:${input.activityEventId}`,
    p_request_hash: requestHash,
    p_facts: rows,
  });
  if (error) throw new Error(`P257_SHARED_WRITER_FAILED:${error.message}`);
  return {contract:ARCTOR_P257_COMMERCIAL_PUBLIC_FACT_V1,writerResult:result,factsPrepared:rows.length};
}

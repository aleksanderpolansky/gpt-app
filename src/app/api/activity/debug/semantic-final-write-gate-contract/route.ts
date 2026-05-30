import { NextResponse } from "next/server";

import { buildSemanticActorResolutionDryRunV0 } from "../../../../../../lib/activity/categoryDerivation/semanticActorResolutionDryRunV0";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type FinalSemanticWriteGateBlockerV0 =
  | "selected_space_scope_required"
  | "auth0_session_required"
  | "app_user_mapping_required"
  | "single_actor_resolution_required"
  | "actor_id_required_for_future_write_gate"
  | "actor_resolution_must_remain_read_only"
  | "explicit_semantic_write_confirmation_required"
  | "semantic_persistence_write_route_not_enabled_yet";

type FinalSemanticWriteGateContractV0 = {
  policy: "semantic_final_write_gate_contract_v0";
  mode: "read_only_final_semantic_write_gate_contract_no_write";
  selectedSpaceIdSha256Prefix: string | null;
  canOpenSemanticWriteGateNow: boolean;
  readyForFirstSemanticPersistenceWriteAttempt: boolean;
  requiresExplicitSemanticWriteConfirmation: true;
  requiresSelectedSpaceScope: true;
  requiresResolvedSingleActor: true;
  requiresActorIdForFutureWriteGate: true;
  semanticWritesStillDisabledInThisStep: true;
  blockers: FinalSemanticWriteGateBlockerV0[];
  positiveSignals: string[];
};

function buildFinalSemanticWriteGateContract(params: {
  selectedSpaceIdSha256Prefix: string | null;
  actorResolutionResult: Awaited<ReturnType<typeof buildSemanticActorResolutionDryRunV0>>;
}): FinalSemanticWriteGateContractV0 {
  const blockers: FinalSemanticWriteGateBlockerV0[] = [];
  const positiveSignals: string[] = [];

  const selectedSpaceIdSha256Prefix = params.selectedSpaceIdSha256Prefix;
  const result = params.actorResolutionResult;

  if (!selectedSpaceIdSha256Prefix) {
    blockers.push("selected_space_scope_required");
  } else {
    positiveSignals.push("selected_space_scope_present");
  }

  if (result.auth0Session.sessionAvailable !== true) {
    blockers.push("auth0_session_required");
  } else {
    positiveSignals.push("browser_auth0_session_available");
  }

  if (result.appUserMapping.outcome !== "mapped") {
    blockers.push("app_user_mapping_required");
  } else {
    positiveSignals.push("auth0_subject_mapped_to_app_user");
  }

  if (
    result.actorResolution.outcome !== "resolved_single_actor" ||
    result.actorResolution.candidateActorCount !== 1
  ) {
    blockers.push("single_actor_resolution_required");
  } else {
    positiveSignals.push("single_actor_resolved_in_selected_space_scope");
  }

  if (result.actorResolution.actorIdAvailableForFutureWriteGate !== true) {
    blockers.push("actor_id_required_for_future_write_gate");
  } else {
    positiveSignals.push("actor_id_available_for_future_write_gate");
  }

  if (
    result.writes.dbWriteExecuted !== false ||
    result.writes.supabaseWriteExecuted !== false
  ) {
    blockers.push("actor_resolution_must_remain_read_only");
  } else {
    positiveSignals.push("actor_resolution_proof_remained_read_only");
  }

  blockers.push("explicit_semantic_write_confirmation_required");
  blockers.push("semantic_persistence_write_route_not_enabled_yet");

  const readinessSignalsPassed =
    Boolean(selectedSpaceIdSha256Prefix) &&
    result.auth0Session.sessionAvailable === true &&
    result.appUserMapping.outcome === "mapped" &&
    result.actorResolution.outcome === "resolved_single_actor" &&
    result.actorResolution.candidateActorCount === 1 &&
    result.actorResolution.actorIdAvailableForFutureWriteGate === true &&
    result.writes.dbWriteExecuted === false &&
    result.writes.supabaseWriteExecuted === false;

  return {
    policy: "semantic_final_write_gate_contract_v0",
    mode: "read_only_final_semantic_write_gate_contract_no_write",
    selectedSpaceIdSha256Prefix,
    canOpenSemanticWriteGateNow: false,
    readyForFirstSemanticPersistenceWriteAttempt: readinessSignalsPassed,
    requiresExplicitSemanticWriteConfirmation: true,
    requiresSelectedSpaceScope: true,
    requiresResolvedSingleActor: true,
    requiresActorIdForFutureWriteGate: true,
    semanticWritesStillDisabledInThisStep: true,
    blockers,
    positiveSignals,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const selectedSpaceIdSha256Prefix = url.searchParams.get(
    "selectedSpaceIdSha256Prefix"
  );

  const actorResolutionResult = await buildSemanticActorResolutionDryRunV0({
    selectedSpaceIdSha256Prefix,
  });

  const finalWriteGateContract = buildFinalSemanticWriteGateContract({
    selectedSpaceIdSha256Prefix,
    actorResolutionResult,
  });

  return NextResponse.json({
    ok: true,
    endpoint: "/api/activity/debug/semantic-final-write-gate-contract",
    policy: "semantic_final_write_gate_contract_v0",
    mode: "read_only_final_semantic_write_gate_contract_no_write",
    selectedSpaceIdSha256Prefix,
    finalWriteGateContract,
    actorResolutionProof: {
      policy: "semantic_actor_resolution_dry_run_v0",
      mode: actorResolutionResult.mode,
      auth0Session: actorResolutionResult.auth0Session,
      appUserMapping: actorResolutionResult.appUserMapping,
      actorResolution: actorResolutionResult.actorResolution,
      readinessDecision: actorResolutionResult.readinessDecision,
      writes: actorResolutionResult.writes,
    },
    writes: {
      sqlExecuted: false,
      dbReadExecuted: true,
      dbWriteExecuted: false,
      supabaseReadExecuted: true,
      supabaseWriteExecuted: false,
      activityEventInserted: false,
      valueObjectCreated: false,
      activityValueObjectLinkCreated: false,
      actorCreated: false,
      actorUpdated: false,
      userCreated: false,
      userUpdated: false,
      stateDeltaCreated: false,
      stateFactCreated: false,
      stateSnapshotCreated: false,
    },
    next: finalWriteGateContract.readyForFirstSemanticPersistenceWriteAttempt
      ? "Prepare explicit first semantic persistence write route in the next step."
      : "Do not prepare semantic persistence write route until final write-gate readiness is true in browser-authenticated scope.",
  });
}


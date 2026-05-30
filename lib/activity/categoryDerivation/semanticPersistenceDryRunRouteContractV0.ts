import {
  buildSemanticPersistenceRouteGateV0,
  type SemanticPersistenceRouteGateDecisionV0,
  type SemanticPersistenceRouteIntentV0,
} from "./semanticPersistenceRouteGateContractV0";
import type { SemanticPreviewPipelineResultV0 } from "./semanticPreviewPipelineV0";

export type SemanticPersistenceDryRunRoutePolicyV0 =
  "semantic_persistence_dry_run_route_skeleton_v0";

export type SemanticPersistenceDryRunRouteModeV0 =
  "non_debug_dry_run_no_write";

export type SemanticPersistenceDryRunRouteWritesV0 = {
  sqlExecuted: false;
  dbWriteExecuted: false;
  activityEventInserted: false;
  categoryResolutionPersisted: false;
  valueObjectCreated: false;
  activityValueObjectLinkCreated: false;
  reviewActionPersisted: false;
  stateFactCreated: false;
  stateDeltaCreated: false;
  stateSnapshotCreated: false;
};

export type SemanticPersistenceDryRunRouteRequestV0 = {
  requestedIntent: SemanticPersistenceRouteIntentV0;
  requestedTargetKey: string | null;
  requestedActionKey: string | null;
  userConfirmed: boolean;
  clientRequestedWriteExecution: boolean;
  serverAuthenticatedUserAvailable: false;
  serverActorAvailable: false;
  serverRlsVerificationAvailable: false;
};

export type SemanticPersistenceDryRunRouteResultV0 = {
  ok: true;
  policy: SemanticPersistenceDryRunRoutePolicyV0;
  mode: SemanticPersistenceDryRunRouteModeV0;
  dryRunOnly: true;
  requestAcceptedForDryRun: true;
  canWriteNow: false;
  wouldWriteNow: false;
  sqlAllowedNow: false;
  supabaseInsertAllowedNow: false;
  request: SemanticPersistenceDryRunRouteRequestV0;
  previewSummary: {
    ok: true;
    activityEventId: string;
    persistenceGatePolicy: string;
    previewCanPersistNow: false;
    resolvedCategories: number;
    valueObjectCandidates: number;
    exposureCandidates: number;
    stateDeltaCandidates: number;
    reviewActionCandidates: number;
  };
  routeGate: SemanticPersistenceRouteGateDecisionV0;
  writes: SemanticPersistenceDryRunRouteWritesV0;
  warnings: string[];
  safetyNotes: string[];
};

export type BuildSemanticPersistenceDryRunRouteV0Params = {
  preview: SemanticPreviewPipelineResultV0;
  requestedIntent: SemanticPersistenceRouteIntentV0;
  requestedTargetKey?: string | null;
  requestedActionKey?: string | null;
  userConfirmed?: boolean | null;
  clientRequestedWriteExecution?: boolean | null;
};

export function buildSemanticPersistenceDryRunRouteWritesV0(): SemanticPersistenceDryRunRouteWritesV0 {
  return {
    sqlExecuted: false,
    dbWriteExecuted: false,
    activityEventInserted: false,
    categoryResolutionPersisted: false,
    valueObjectCreated: false,
    activityValueObjectLinkCreated: false,
    reviewActionPersisted: false,
    stateFactCreated: false,
    stateDeltaCreated: false,
    stateSnapshotCreated: false,
  };
}

function trimOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();

  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export function buildSemanticPersistenceDryRunRouteV0(
  params: BuildSemanticPersistenceDryRunRouteV0Params
): SemanticPersistenceDryRunRouteResultV0 {
  const requestedTargetKey = trimOrNull(params.requestedTargetKey);
  const requestedActionKey = trimOrNull(params.requestedActionKey);
  const userConfirmed = params.userConfirmed === true;
  const clientRequestedWriteExecution =
    params.clientRequestedWriteExecution === true;

  const routeGate = buildSemanticPersistenceRouteGateV0({
    preview: params.preview,
    requestedIntent: params.requestedIntent,
    requestedTargetKey,
    requestedActionKey,
    authenticatedUserId: null,
    actorId: null,
    rlsVerificationToken: null,
    userConfirmed,
    explicitWriteExecutionEnabled: false,
    sandboxContractOnly: true,
  });

  const warnings: string[] = [];

  if (clientRequestedWriteExecution) {
    warnings.push(
      "Client requested write execution, but the dry-run route ignores it and keeps explicitWriteExecutionEnabled=false."
    );
  }

  if (!userConfirmed) {
    warnings.push(
      "User confirmation is missing; future real persistence must require explicit user confirmation."
    );
  }

  return {
    ok: true,
    policy: "semantic_persistence_dry_run_route_skeleton_v0",
    mode: "non_debug_dry_run_no_write",
    dryRunOnly: true,
    requestAcceptedForDryRun: true,
    canWriteNow: false,
    wouldWriteNow: false,
    sqlAllowedNow: false,
    supabaseInsertAllowedNow: false,
    request: {
      requestedIntent: params.requestedIntent,
      requestedTargetKey,
      requestedActionKey,
      userConfirmed,
      clientRequestedWriteExecution,
      serverAuthenticatedUserAvailable: false,
      serverActorAvailable: false,
      serverRlsVerificationAvailable: false,
    },
    previewSummary: {
      ok: params.preview.ok,
      activityEventId: params.preview.activityEventId,
      persistenceGatePolicy: params.preview.persistenceGatePolicy,
      previewCanPersistNow: params.preview.persistenceGate.canPersistNow,
      resolvedCategories:
        params.preview.semanticV3.resolvedCategoryCandidates.length,
      valueObjectCandidates: params.preview.valueObjectCandidates.length,
      exposureCandidates: params.preview.exposureCandidates.length,
      stateDeltaCandidates: params.preview.stateDeltaCandidates.length,
      reviewActionCandidates: params.preview.reviewActionCandidates.length,
    },
    routeGate,
    writes: buildSemanticPersistenceDryRunRouteWritesV0(),
    warnings,
    safetyNotes: [
      "This is a non-debug route skeleton, but it is still dry-run only.",
      "No SQL is executed.",
      "No Supabase insert/update/delete is executed.",
      "Client-supplied user IDs must not be trusted for future real persistence.",
      "The future real route must read authenticated user context server-side.",
      "State delta candidates must never become state facts or snapshots directly from preview.",
    ],
  };
}

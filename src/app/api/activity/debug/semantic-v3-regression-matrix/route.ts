import { NextResponse } from "next/server";

import { buildSemanticPersistenceDryRunRouteV0 } from "../../../../../../lib/activity/categoryDerivation/semanticPersistenceDryRunRouteContractV0";
import {
  runSemanticPreviewPipelineV0,
  type SemanticPreviewPipelineResultV0,
} from "../../../../../../lib/activity/categoryDerivation/semanticPreviewPipelineV0";

export const dynamic = "force-dynamic";

type RegressionCaseExpectedV0 = {
  minResolvedCategories: number;
  minValueObjects: number;
  minExposures: number;
  minStateDeltas: number;
  minReviewActions: number;
  valueObjectKeys?: string[];
  exposureTypes?: string[];
  dimensionKeys?: string[];
  actionKinds?: string[];
  requireNoWrites: true;
};

type RegressionCaseV0 = {
  caseKey: string;
  inputText: string;
  durationMinutes: number | null;
  inputLanguage: string;
  expected: RegressionCaseExpectedV0;
};

type RegressionCaseResultV0 = {
  caseKey: string;
  ok: boolean;
  failures: string[];
  actual: {
    resolvedCategories: number;
    valueObjects: number;
    exposures: number;
    stateDeltas: number;
    reviewActions: number;
    persistenceGatePolicy: string;
    persistenceGateCanPersistNow: false;
    valueObjectKeys: string[];
    exposureTypes: string[];
    dimensionKeys: string[];
    actionKinds: string[];
    writes: SemanticPreviewPipelineResultV0["writes"];
  };
};

type DryRunSmokeResultV0 = {
  ok: boolean;
  failures: string[];
  actual: {
    policy: string;
    dryRunOnly: boolean;
    canWriteNow: boolean;
    sqlAllowedNow: boolean;
    supabaseInsertAllowedNow: boolean;
    routeGateCanWriteNow: boolean;
    routeGateCanExecuteRouteNow: boolean;
    matchedPreviewTargetFound: boolean;
    warnings: number;`n    authenticatedContextPolicy: string;`n    authenticatedContextCanOpenWriteGate: boolean;`n    authenticatedContextCanTrustClientIdentity: boolean;`n    authenticatedContextBlockers: number;`n    writes: {
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
  };
};

const REGRESSION_CASES_V0: RegressionCaseV0[] = [
  {
    caseKey: "family_child_math_learning_ru",
    inputText: "учил ребёнка математике 30 минут",
    durationMinutes: 30,
    inputLanguage: "ru",
    expected: {
      minResolvedCategories: 5,
      minValueObjects: 3,
      minExposures: 6,
      minStateDeltas: 6,
      minReviewActions: 40,
      valueObjectKeys: [
        "vo:personal:child-learning-support",
        "vo:personal:mathematics-learning",
        "vo:personal:family-care-load",
      ],
      exposureTypes: [
        "supports",
        "contributes_to",
        "tracks_domain",
        "loads",
        "consumes_attention",
      ],
      dimensionKeys: [
        "child_development_support",
        "attention_load",
        "learning_exposure",
        "cognitive_load",
        "family_care_load",
        "care_attention_time",
      ],
      actionKinds: [
        "confirm_category",
        "reject_category",
        "correct_category",
        "confirm_value_object_candidate",
        "reject_value_object_candidate",
        "confirm_exposure_candidate",
        "suppress_exposure_candidate",
        "allow_future_state_delta_candidate",
        "block_future_state_delta_candidate",
        "open_raw_json",
      ],
      requireNoWrites: true,
    },
  },
  {
    caseKey: "cycling_commute_to_work_ru",
    inputText: "ехал на велосипеде 30 минут на работу",
    durationMinutes: 30,
    inputLanguage: "ru",
    expected: {
      minResolvedCategories: 4,
      minValueObjects: 2,
      minExposures: 3,
      minStateDeltas: 2,
      minReviewActions: 20,
      valueObjectKeys: [
        "vo:personal:cycling-activity",
        "vo:personal:commute-to-work",
      ],
      exposureTypes: ["contributes_to", "loads", "creates_context"],
      dimensionKeys: ["physical_load", "work_context_exposure"],
      actionKinds: [
        "confirm_category",
        "reject_category",
        "correct_category",
        "confirm_value_object_candidate",
        "reject_value_object_candidate",
        "confirm_exposure_candidate",
        "suppress_exposure_candidate",
        "allow_future_state_delta_candidate",
        "block_future_state_delta_candidate",
        "open_raw_json",
      ],
      requireNoWrites: true,
    },
  },
  {
    caseKey: "massage_client_service_ru",
    inputText: "делал массаж клиенту 60 минут",
    durationMinutes: 60,
    inputLanguage: "ru",
    expected: {
      minResolvedCategories: 2,
      minValueObjects: 1,
      minExposures: 1,
      minStateDeltas: 1,
      minReviewActions: 12,
      valueObjectKeys: ["vo:organization-or-personal:massage-service-work"],
      exposureTypes: ["needs_user_confirmation"],
      dimensionKeys: ["needs_user_confirmation"],
      actionKinds: [
        "confirm_category",
        "reject_category",
        "correct_category",
        "confirm_value_object_candidate",
        "reject_value_object_candidate",
        "request_value_object_context",
        "confirm_exposure_candidate",
        "suppress_exposure_candidate",
        "allow_future_state_delta_candidate",
        "block_future_state_delta_candidate",
        "open_raw_json",
      ],
      requireNoWrites: true,
    },
  },
  {
    caseKey: "unknown_general_activity_ru",
    inputText: "читал книгу 20 минут",
    durationMinutes: 20,
    inputLanguage: "ru",
    expected: {
      minResolvedCategories: 0,
      minValueObjects: 1,
      minExposures: 1,
      minStateDeltas: 1,
      minReviewActions: 8,
      valueObjectKeys: ["vo:personal:general-activity"],
      exposureTypes: ["needs_user_confirmation"],
      dimensionKeys: ["needs_user_confirmation"],
      actionKinds: [
        "confirm_value_object_candidate",
        "reject_value_object_candidate",
        "request_value_object_context",
        "confirm_exposure_candidate",
        "suppress_exposure_candidate",
        "allow_future_state_delta_candidate",
        "block_future_state_delta_candidate",
        "open_raw_json",
      ],
      requireNoWrites: true,
    },
  },
];

function assertIncludesAll(
  actual: string[],
  expected: string[] | undefined,
  failures: string[],
  label: string
): void {
  for (const item of expected ?? []) {
    if (!actual.includes(item)) {
      failures.push(`Missing ${label}: ${item}`);
    }
  }
}

function validateNoWrites(
  writes: SemanticPreviewPipelineResultV0["writes"],
  failures: string[]
): void {
  if (writes.sqlExecuted !== false) {
    failures.push("sqlExecuted must be false.");
  }

  if (writes.dbWriteExecuted !== false) {
    failures.push("dbWriteExecuted must be false.");
  }

  if (writes.activityEventInserted !== false) {
    failures.push("activityEventInserted must be false.");
  }

  if (writes.valueObjectCreated !== false) {
    failures.push("valueObjectCreated must be false.");
  }

  if (writes.activityValueObjectLinkCreated !== false) {
    failures.push("activityValueObjectLinkCreated must be false.");
  }

  if (writes.stateFactCreated !== false) {
    failures.push("stateFactCreated must be false.");
  }

  if (writes.stateDeltaCreated !== false) {
    failures.push("stateDeltaCreated must be false.");
  }

  if (writes.stateSnapshotCreated !== false) {
    failures.push("stateSnapshotCreated must be false.");
  }
}

function evaluateCase(testCase: RegressionCaseV0): RegressionCaseResultV0 {
  const preview = runSemanticPreviewPipelineV0({
    inputText: testCase.inputText,
    durationMinutes: testCase.durationMinutes,
    inputLanguage: testCase.inputLanguage,
    p4Step: "C8-I-IMPLEMENT-19-REGRESSION-MATRIX",
  });

  const valueObjectKeys = preview.valueObjectCandidates.map(
    (candidate) => candidate.candidateKey
  );

  const exposureTypes = preview.exposureCandidates.map(
    (candidate) => candidate.activityLinkType
  );

  const dimensionKeys = preview.stateDeltaCandidates.map(
    (candidate) => candidate.dimensionKey
  );

  const actionKinds = preview.reviewActionCandidates.map(
    (candidate) => candidate.actionKind
  );

  const failures: string[] = [];

  if (
    preview.semanticV3.resolvedCategoryCandidates.length <
    testCase.expected.minResolvedCategories
  ) {
    failures.push(
      `Expected at least ${testCase.expected.minResolvedCategories} resolved categories.`
    );
  }

  if (preview.valueObjectCandidates.length < testCase.expected.minValueObjects) {
    failures.push(
      `Expected at least ${testCase.expected.minValueObjects} value object candidates.`
    );
  }

  if (preview.exposureCandidates.length < testCase.expected.minExposures) {
    failures.push(
      `Expected at least ${testCase.expected.minExposures} exposure candidates.`
    );
  }

  if (preview.stateDeltaCandidates.length < testCase.expected.minStateDeltas) {
    failures.push(
      `Expected at least ${testCase.expected.minStateDeltas} state delta candidates.`
    );
  }

  if (
    preview.reviewActionCandidates.length <
    testCase.expected.minReviewActions
  ) {
    failures.push(
      `Expected at least ${testCase.expected.minReviewActions} review action candidates.`
    );
  }

  if (preview.persistenceGatePolicy !== "semantic_persistence_gate_design_v0") {
    failures.push("Missing semantic_persistence_gate_design_v0 policy.");
  }

  if (preview.persistenceGate.canPersistNow !== false) {
    failures.push("persistenceGate.canPersistNow must be false.");
  }

  if (preview.persistenceGate.canCreateStateFactNow !== false) {
    failures.push("persistenceGate.canCreateStateFactNow must be false.");
  }

  assertIncludesAll(
    valueObjectKeys,
    testCase.expected.valueObjectKeys,
    failures,
    "valueObjectKey"
  );

  assertIncludesAll(
    exposureTypes,
    testCase.expected.exposureTypes,
    failures,
    "exposureType"
  );

  assertIncludesAll(
    dimensionKeys,
    testCase.expected.dimensionKeys,
    failures,
    "dimensionKey"
  );

  assertIncludesAll(
    actionKinds,
    testCase.expected.actionKinds,
    failures,
    "actionKind"
  );

  if (testCase.expected.requireNoWrites) {
    validateNoWrites(preview.writes, failures);
  }

  return {
    caseKey: testCase.caseKey,
    ok: failures.length === 0,
    failures,
    actual: {
      resolvedCategories: preview.semanticV3.resolvedCategoryCandidates.length,
      valueObjects: preview.valueObjectCandidates.length,
      exposures: preview.exposureCandidates.length,
      stateDeltas: preview.stateDeltaCandidates.length,
      reviewActions: preview.reviewActionCandidates.length,
      persistenceGatePolicy: preview.persistenceGatePolicy,
      persistenceGateCanPersistNow: preview.persistenceGate.canPersistNow,
      valueObjectKeys,
      exposureTypes,
      dimensionKeys,
      actionKinds,
      writes: preview.writes,
    },
  };
}

function evaluateDryRunSmoke(): DryRunSmokeResultV0 {
  const failures: string[] = [];

  const preview = runSemanticPreviewPipelineV0({
    inputText: "учил ребёнка математике 30 минут",
    durationMinutes: 30,
    inputLanguage: "ru",
    p4Step: "C8-I-IMPLEMENT-19-DRY-RUN-SMOKE",
  });

  const dryRun = buildSemanticPersistenceDryRunRouteV0({
    preview,
    requestedIntent: "persist_value_object_candidate",
    requestedTargetKey: "vo:personal:child-learning-support",
    requestedActionKey: null,
    userConfirmed: true,
    clientRequestedWriteExecution: true,`n    clientProvidedAuthenticatedUserId: "client-user-untrusted",`n    clientProvidedActorId: "client-actor-untrusted",`n    clientProvidedRlsVerificationToken: "client-rls-token-untrusted",`n  });

  if (dryRun.policy !== "semantic_persistence_dry_run_route_skeleton_v0") {
    failures.push("Missing semantic_persistence_dry_run_route_skeleton_v0 policy.");
  }

  if (dryRun.dryRunOnly !== true) {
    failures.push("dryRunOnly must be true.");
  }

  if (dryRun.canWriteNow !== false) {
    failures.push("dryRun.canWriteNow must be false.");
  }

  if (dryRun.sqlAllowedNow !== false) {
    failures.push("dryRun.sqlAllowedNow must be false.");
  }

  if (dryRun.supabaseInsertAllowedNow !== false) {
    failures.push("dryRun.supabaseInsertAllowedNow must be false.");
  }

  if (dryRun.routeGate.policy !== "semantic_persistence_route_gate_contract_v0") {
    failures.push("Missing semantic_persistence_route_gate_contract_v0 policy.");
  }

  if (dryRun.routeGate.canWriteNow !== false) {
    failures.push("routeGate.canWriteNow must be false.");
  }

  if (dryRun.routeGate.canExecuteRouteNow !== false) {
    failures.push("routeGate.canExecuteRouteNow must be false.");
  }

  if (dryRun.routeGate.sqlAllowedNow !== false) {
    failures.push("routeGate.sqlAllowedNow must be false.");
  }

  if (dryRun.routeGate.supabaseInsertAllowedNow !== false) {
    failures.push("routeGate.supabaseInsertAllowedNow must be false.");
  }

  if (dryRun.routeGate.canCreateStateFactNow !== false) {
    failures.push("routeGate.canCreateStateFactNow must be false.");
  }

  if (dryRun.routeGate.matchedPreviewTarget.found !== true) {`n    failures.push("Expected dry-run requested target to match preview gate target.");`n  }`n`n  if (`n    dryRun.authenticatedContext.policy !==`n    "semantic_persistence_authenticated_context_contract_v0"`n  ) {`n    failures.push("Missing semantic_persistence_authenticated_context_contract_v0 policy.");`n  }`n`n  if (dryRun.authenticatedContext.canOpenWriteGate !== false) {`n    failures.push("authenticatedContext.canOpenWriteGate must be false.");`n  }`n`n  if (dryRun.authenticatedContext.canTrustClientIdentity !== false) {`n    failures.push("authenticatedContext.canTrustClientIdentity must be false.");`n  }

  if (dryRun.writes.sqlExecuted !== false) {
    failures.push("dryRun.writes.sqlExecuted must be false.");
  }

  if (dryRun.writes.dbWriteExecuted !== false) {
    failures.push("dryRun.writes.dbWriteExecuted must be false.");
  }

  if (dryRun.writes.activityEventInserted !== false) {
    failures.push("dryRun.writes.activityEventInserted must be false.");
  }

  if (dryRun.writes.valueObjectCreated !== false) {
    failures.push("dryRun.writes.valueObjectCreated must be false.");
  }

  if (dryRun.writes.activityValueObjectLinkCreated !== false) {
    failures.push("dryRun.writes.activityValueObjectLinkCreated must be false.");
  }

  if (dryRun.writes.reviewActionPersisted !== false) {
    failures.push("dryRun.writes.reviewActionPersisted must be false.");
  }

  if (dryRun.writes.stateFactCreated !== false) {
    failures.push("dryRun.writes.stateFactCreated must be false.");
  }

  if (dryRun.writes.stateDeltaCreated !== false) {
    failures.push("dryRun.writes.stateDeltaCreated must be false.");
  }

  if (dryRun.writes.stateSnapshotCreated !== false) {
    failures.push("dryRun.writes.stateSnapshotCreated must be false.");
  }

  return {
    ok: failures.length === 0,
    failures,
    actual: {
      policy: dryRun.policy,
      dryRunOnly: dryRun.dryRunOnly,
      canWriteNow: dryRun.canWriteNow,
      sqlAllowedNow: dryRun.sqlAllowedNow,
      supabaseInsertAllowedNow: dryRun.supabaseInsertAllowedNow,
      routeGateCanWriteNow: dryRun.routeGate.canWriteNow,
      routeGateCanExecuteRouteNow: dryRun.routeGate.canExecuteRouteNow,
      matchedPreviewTargetFound: dryRun.routeGate.matchedPreviewTarget.found,
      warnings: dryRun.warnings.length,`n      authenticatedContextPolicy: dryRun.authenticatedContext.policy,`n      authenticatedContextCanOpenWriteGate:`n        dryRun.authenticatedContext.canOpenWriteGate,`n      authenticatedContextCanTrustClientIdentity:`n        dryRun.authenticatedContext.canTrustClientIdentity,`n      authenticatedContextBlockers: dryRun.authenticatedContext.blockers.length,`n      writes: dryRun.writes,
    },
  };
}

function runRegressionMatrixV0() {
  const results = REGRESSION_CASES_V0.map(evaluateCase);
  const dryRunSmoke = evaluateDryRunSmoke();

  const failed = results.filter((result) => !result.ok);
  const dryRunSmokeFailed = !dryRunSmoke.ok;

  return {
    ok: failed.length === 0 && !dryRunSmokeFailed,
    matrix: "semantic_preview_regression_matrix_v0",
    mode: "read_only_regression",
    caseCount: results.length,
    passedCount: results.length - failed.length,
    failedCount: failed.length,
    dryRunSmoke,
    results,
    writes: {
      sqlExecuted: false,
      dbWriteExecuted: false,
      activityEventInserted: false,
      valueObjectCreated: false,
      activityValueObjectLinkCreated: false,
      stateFactCreated: false,
      stateDeltaCreated: false,
      stateSnapshotCreated: false,
      dryRunRouteDbWriteExecuted: false,
      dryRunRouteStateDeltaCreated: false,
      dryRunRouteStateFactCreated: false,
    },
  };
}

export async function GET() {
  return NextResponse.json(runRegressionMatrixV0());
}

export async function POST() {
  return NextResponse.json(runRegressionMatrixV0());
}


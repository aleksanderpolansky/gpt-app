import { NextResponse } from "next/server";

import {
  ALLOWED_MAPPING_STATUSES,
  ALLOWED_RESOLUTION_STATUSES,
  BRIDGE_SAFE_RESOLUTION_STATUSES,
  DEFAULT_FORBIDDEN_OVERCLAIMS,
  SEMANTIC_CONTRACT_V3_ADAPTER_VERSION,
  SEMANTIC_CONTRACT_V3_SCHEMA_VERSION,
  SEMANTIC_CONTRACT_V3_REQUIRED_INVARIANT_CODES,
  canEnterStableSemanticBundle,
  normalizeMappingStatus,
  normalizeResolutionStatus,
} from "../../../../../../lib/activity/categoryDerivation/semanticContractV3";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type InvariantCheck = {
  key: string;
  passed: boolean;
  severity: "hard" | "known_gap";
  details?: Record<string, unknown>;
};

type SafeInvocation<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      errorMessage: string;
    };

function safeInvoke<T>(callback: () => T): SafeInvocation<T> {
  try {
    return {
      ok: true,
      value: callback(),
    };
  } catch (error) {
    return {
      ok: false,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function asStringArray(value: readonly unknown[]): string[] {
  return value.filter((item): item is string => typeof item === "string");
}

function includesValue(values: readonly unknown[], expected: string): boolean {
  return asStringArray(values).includes(expected);
}

function buildCheck(params: {
  key: string;
  passed: boolean;
  severity?: "hard" | "known_gap";
  details?: Record<string, unknown>;
}): InvariantCheck {
  return {
    key: params.key,
    passed: params.passed,
    severity: params.severity ?? "hard",
    ...(params.details ? { details: params.details } : {}),
  };
}

function buildBooleanFunctionCheck(params: {
  key: string;
  input: Record<string, unknown>;
}): InvariantCheck {
  const invocation = safeInvoke(() =>
    canEnterStableSemanticBundle(params.input as never)
  );

  return buildCheck({
    key: params.key,
    passed: invocation.ok && typeof invocation.value === "boolean",
    details: {
      input: params.input,
      invocationOk: invocation.ok,
      value: invocation.ok ? invocation.value : null,
      errorMessage: invocation.ok ? null : invocation.errorMessage,
    },
  });
}

function buildNamedInvariantCodeCheck(params: {
  key: string;
  requiredCode: string;
}): InvariantCheck {
  const currentlyPresent = includesValue(
    SEMANTIC_CONTRACT_V3_REQUIRED_INVARIANT_CODES,
    params.requiredCode
  );

  return buildCheck({
    key: params.key,
    passed: currentlyPresent,
    severity: "hard",
    details: {
      requiredCode: params.requiredCode,
      currentlyPresent,
      meaning:
        "This invariant code must be exported by semanticContractV3 and visible to the debug proof route.",
    },
  });
}

export async function GET() {
  const normalizedUnknownResolution = safeInvoke(() =>
    normalizeResolutionStatus("totally_invalid_resolution_status", "unresolved")
  );

  const normalizedUnknownMapping = safeInvoke(() =>
    normalizeMappingStatus("totally_invalid_mapping_status", "none")
  );

  const hardChecks: InvariantCheck[] = [
    buildCheck({
      key: "schema_version_present",
      passed:
        typeof SEMANTIC_CONTRACT_V3_SCHEMA_VERSION === "string" &&
        SEMANTIC_CONTRACT_V3_SCHEMA_VERSION.length > 0,
      details: {
        schemaVersion: SEMANTIC_CONTRACT_V3_SCHEMA_VERSION,
      },
    }),
    buildCheck({
      key: "adapter_version_present",
      passed:
        typeof SEMANTIC_CONTRACT_V3_ADAPTER_VERSION === "string" &&
        SEMANTIC_CONTRACT_V3_ADAPTER_VERSION.length > 0,
      details: {
        adapterVersion: SEMANTIC_CONTRACT_V3_ADAPTER_VERSION,
      },
    }),
    buildCheck({
      key: "allowed_resolution_statuses_include_core_values",
      passed:
        includesValue(ALLOWED_RESOLUTION_STATUSES, "resolved_existing") &&
        includesValue(ALLOWED_RESOLUTION_STATUSES, "created_suggested") &&
        includesValue(ALLOWED_RESOLUTION_STATUSES, "suggested_new") &&
        includesValue(ALLOWED_RESOLUTION_STATUSES, "needs_review") &&
        includesValue(ALLOWED_RESOLUTION_STATUSES, "unresolved") &&
        includesValue(ALLOWED_RESOLUTION_STATUSES, "rejected") &&
        includesValue(ALLOWED_RESOLUTION_STATUSES, "merged"),
      details: {
        allowedResolutionStatuses: ALLOWED_RESOLUTION_STATUSES,
      },
    }),
    buildCheck({
      key: "allowed_mapping_statuses_include_core_values",
      passed:
        includesValue(ALLOWED_MAPPING_STATUSES, "none") &&
        includesValue(ALLOWED_MAPPING_STATUSES, "local_exact") &&
        includesValue(ALLOWED_MAPPING_STATUSES, "local_alias") &&
        includesValue(ALLOWED_MAPPING_STATUSES, "local_ambiguous") &&
        includesValue(ALLOWED_MAPPING_STATUSES, "external_suggested") &&
        includesValue(ALLOWED_MAPPING_STATUSES, "rejected"),
      details: {
        allowedMappingStatuses: ALLOWED_MAPPING_STATUSES,
      },
    }),
    buildCheck({
      key: "bridge_safe_statuses_are_explicit_subset",
      passed:
        BRIDGE_SAFE_RESOLUTION_STATUSES.length > 0 &&
        asStringArray(BRIDGE_SAFE_RESOLUTION_STATUSES).every((status) =>
          includesValue(ALLOWED_RESOLUTION_STATUSES, status)
        ),
      details: {
        bridgeSafeResolutionStatuses: BRIDGE_SAFE_RESOLUTION_STATUSES,
        allowedResolutionStatuses: ALLOWED_RESOLUTION_STATUSES,
      },
    }),
    buildCheck({
      key: "default_forbidden_overclaims_present",
      passed: DEFAULT_FORBIDDEN_OVERCLAIMS.length > 0,
      details: {
        forbiddenOverclaims: DEFAULT_FORBIDDEN_OVERCLAIMS,
      },
    }),
    buildCheck({
      key: "unknown_resolution_normalizes_to_unresolved",
      passed:
        normalizedUnknownResolution.ok &&
        normalizedUnknownResolution.value === "unresolved",
      details: {
        invocationOk: normalizedUnknownResolution.ok,
        value: normalizedUnknownResolution.ok
          ? normalizedUnknownResolution.value
          : null,
        errorMessage: normalizedUnknownResolution.ok
          ? null
          : normalizedUnknownResolution.errorMessage,
      },
    }),
    buildCheck({
      key: "unknown_mapping_normalizes_to_none",
      passed:
        normalizedUnknownMapping.ok && normalizedUnknownMapping.value === "none",
      details: {
        invocationOk: normalizedUnknownMapping.ok,
        value: normalizedUnknownMapping.ok ? normalizedUnknownMapping.value : null,
        errorMessage: normalizedUnknownMapping.ok
          ? null
          : normalizedUnknownMapping.errorMessage,
      },
    }),
    buildBooleanFunctionCheck({
      key: "can_enter_stable_semantic_bundle_returns_boolean_for_resolved_local_exact",
      input: {
        resolutionStatus: "resolved_existing",
        mappingStatus: "local_exact",
        needsUserConfirmation: false,
      },
    }),
    buildBooleanFunctionCheck({
      key: "can_enter_stable_semantic_bundle_returns_boolean_for_external_suggested",
      input: {
        resolutionStatus: "resolved_existing",
        mappingStatus: "external_suggested",
        needsUserConfirmation: true,
      },
    }),
    buildBooleanFunctionCheck({
      key: "can_enter_stable_semantic_bundle_returns_boolean_for_unresolved",
      input: {
        resolutionStatus: "unresolved",
        mappingStatus: "none",
        needsUserConfirmation: true,
      },
    }),
  ];
  const namedInvariantChecks: InvariantCheck[] = [
    buildNamedInvariantCodeCheck({
      key: "named_invariant_code_category_does_not_create_state_fact_present",
      requiredCode: "category_does_not_create_state_fact",
    }),
    buildNamedInvariantCodeCheck({
      key: "named_invariant_code_external_concept_is_not_internal_category_present",
      requiredCode: "external_concept_is_not_internal_category",
    }),
    buildNamedInvariantCodeCheck({
      key: "named_invariant_code_unresolved_category_cannot_enter_stable_bundle_present",
      requiredCode: "unresolved_category_cannot_enter_stable_bundle",
    }),
  ];

  const knownGapChecks: InvariantCheck[] = [];
  const hardAndNamedChecks = [...hardChecks, ...namedInvariantChecks];
  const checks = [...hardAndNamedChecks, ...knownGapChecks];

  const failedHardChecks = hardAndNamedChecks.filter((check) => !check.passed);
  const passedHardChecks = hardAndNamedChecks.filter((check) => check.passed);
  const passedKnownGapChecks = knownGapChecks.filter((check) => check.passed);

  const writes = {
    sqlExecuted: false,
    dbReadExecuted: false,
    dbWriteExecuted: false,
    supabaseReadExecuted: false,
    supabaseWriteExecuted: false,
    activityEventInserted: false,
    valueObjectCreated: false,
    activityValueObjectLinkCreated: false,
    stateDeltaCreated: false,
    stateFactCreated: false,
    stateSnapshotCreated: false,
  };

  return NextResponse.json({
    ok: failedHardChecks.length === 0,
    route: "/api/activity/debug/semantic-v3-contract-invariants",
    policy: "semantic_contract_v3_invariants_debug_proof_v0",
    mode: "contract_invariants_only_no_db_touch",
    schemaVersion: SEMANTIC_CONTRACT_V3_SCHEMA_VERSION,
    adapterVersion: SEMANTIC_CONTRACT_V3_ADAPTER_VERSION,
    summary: {
      hardCheckCount: hardAndNamedChecks.length,
      baseHardCheckCount: hardChecks.length,
      namedInvariantCheckCount: namedInvariantChecks.length,
      passedHardCheckCount: passedHardChecks.length,
      failedHardCheckCount: failedHardChecks.length,
      knownGapCheckCount: knownGapChecks.length,
      passedKnownGapCheckCount: passedKnownGapChecks.length,
      note:
        "Named invariant codes are now hard checks. Known gaps must remain zero for this proof route.",
    },
    checks,
    failedHardChecks,
    writes,
  });
}


/**
 * GPT-APP / AI-NAVIGATOR
 * P4.10.0-C8-I-D4-F-B-D-D
 *
 * Controlled state fact persistence — state dimension resolver helper.
 *
 * Status:
 * - STATE DIMENSION RESOLVER ONLY
 * - NO ROUTE
 * - NO STATE FACT WRITE
 * - NO STATE FACT STORAGE TABLE ACCESS
 * - NO STATE FACT CREATED
 *
 * Core rules preserved:
 * - dimensionKey must be resolved server-side.
 * - inactive dimensions cannot be used for controlled persistence.
 * - claim policy and privacy defaults must come from the stored dimension row.
 * - this helper does not create or update dimensions.
 * - this helper does not persist state facts.
 */

import { supabase } from "../../../supabase";

import type {
  StateFactClaimPolicy,
  StateFactDimensionContext,
  StateFactPersistenceErrorCode,
  StateFactPrivacyLevel,
  UuidString,
} from "./types";

type StateDimensionRow = {
  id?: unknown;
  dimension_key?: unknown;
  claim_policy?: unknown;
  default_privacy_level?: unknown;
  is_sensitive?: unknown;
  is_active?: unknown;
  [key: string]: unknown;
};

export type ResolveStateFactDimensionInput = {
  dimensionKey: string;
};

export type ResolveStateFactDimensionSuccess = {
  ok: true;
  dimension: StateFactDimensionContext;
  errorCode: null;
  safeMessage: null;
};

export type ResolveStateFactDimensionFailure = {
  ok: false;
  dimension: null;
  errorCode: StateFactPersistenceErrorCode;
  safeMessage: string;
};

export type ResolveStateFactDimensionResult =
  | ResolveStateFactDimensionSuccess
  | ResolveStateFactDimensionFailure;

const ALLOWED_CLAIM_POLICIES = new Set<StateFactClaimPolicy>([
  "manual",
  "user_confirmed",
  "rule",
  "system_estimate",
  "proxy_only",
]);

const ALLOWED_PRIVACY_LEVELS = new Set<StateFactPrivacyLevel>([
  "private",
  "shared_with_org",
  "public_masked",
  "public",
]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function toNullableString(value: unknown): string | null {
  if (!isNonEmptyString(value)) {
    return null;
  }

  return value.trim();
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value !== "boolean") {
    return null;
  }

  return value;
}

function toClaimPolicy(value: unknown): StateFactClaimPolicy | null {
  const normalized = toNullableString(value);

  if (!normalized) {
    return null;
  }

  if (!ALLOWED_CLAIM_POLICIES.has(normalized as StateFactClaimPolicy)) {
    return null;
  }

  return normalized as StateFactClaimPolicy;
}

function toPrivacyLevel(value: unknown): StateFactPrivacyLevel | null {
  const normalized = toNullableString(value);

  if (!normalized) {
    return null;
  }

  if (!ALLOWED_PRIVACY_LEVELS.has(normalized as StateFactPrivacyLevel)) {
    return null;
  }

  return normalized as StateFactPrivacyLevel;
}

function buildFailure(
  errorCode: StateFactPersistenceErrorCode,
  safeMessage: string
): ResolveStateFactDimensionFailure {
  return {
    ok: false,
    dimension: null,
    errorCode,
    safeMessage,
  };
}

function buildSuccess(
  dimension: StateFactDimensionContext
): ResolveStateFactDimensionSuccess {
  return {
    ok: true,
    dimension,
    errorCode: null,
    safeMessage: null,
  };
}

/**
 * Resolves a state dimension for future controlled state fact persistence.
 *
 * This helper is intentionally read-only:
 * - reads state_dimensions by dimension_key;
 * - validates claim_policy and default_privacy_level against allowed type values;
 * - rejects inactive dimensions;
 * - does not create or update any row;
 * - does not touch the future state fact storage table.
 */
export async function resolveStateFactDimension(
  input: ResolveStateFactDimensionInput
): Promise<ResolveStateFactDimensionResult> {
  const dimensionKey = toNullableString(input.dimensionKey);

  if (!dimensionKey) {
    return buildFailure(
      "DIMENSION_NOT_FOUND",
      "State dimension key is required before controlled persistence can be considered."
    );
  }

  const { data: dimensionData, error: dimensionError } = await supabase
    .from("state_dimensions")
    .select("id, dimension_key, claim_policy, default_privacy_level, is_sensitive, is_active")
    .eq("dimension_key", dimensionKey)
    .maybeSingle();

  if (dimensionError) {
    return buildFailure(
      "UNKNOWN_ERROR",
      "State dimension could not be read for controlled persistence."
    );
  }

  const dimension = dimensionData as StateDimensionRow | null;

  if (!dimension) {
    return buildFailure(
      "DIMENSION_NOT_FOUND",
      "State dimension was not found."
    );
  }

  const dimensionId = toNullableString(dimension.id);
  const resolvedDimensionKey = toNullableString(dimension.dimension_key);
  const claimPolicy = toClaimPolicy(dimension.claim_policy);
  const defaultPrivacyLevel = toPrivacyLevel(dimension.default_privacy_level);
  const isSensitive = toBoolean(dimension.is_sensitive);
  const isActive = toBoolean(dimension.is_active);

  if (!dimensionId || !resolvedDimensionKey || resolvedDimensionKey !== dimensionKey) {
    return buildFailure(
      "DIMENSION_NOT_FOUND",
      "State dimension identity is incomplete or inconsistent."
    );
  }

  if (!claimPolicy) {
    return buildFailure(
      "CLAIM_POLICY_VIOLATION",
      "State dimension claim policy is missing or unsupported."
    );
  }

  if (!defaultPrivacyLevel) {
    return buildFailure(
      "PRIVACY_POLICY_VIOLATION",
      "State dimension default privacy level is missing or unsupported."
    );
  }

  if (isSensitive === null) {
    return buildFailure(
      "PRIVACY_POLICY_VIOLATION",
      "State dimension sensitivity flag is missing or invalid."
    );
  }

  if (isActive !== true) {
    return buildFailure(
      "DIMENSION_INACTIVE",
      "Inactive state dimensions cannot be used for controlled persistence."
    );
  }

  const resolvedDimension: StateFactDimensionContext = {
    dimensionId: dimensionId as UuidString,
    dimensionKey: resolvedDimensionKey,
    claimPolicy,
    isSensitive,
    defaultPrivacyLevel,
    isActive,
  };

  return buildSuccess(resolvedDimension);
}

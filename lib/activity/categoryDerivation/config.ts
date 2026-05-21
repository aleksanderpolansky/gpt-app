export const CATEGORY_DERIVATION_ROUTE_RUNNER_MODE_ENV =
  "CATEGORY_DERIVATION_ROUTE_RUNNER_MODE";

export const CATEGORY_DERIVATION_ROUTE_RUNNER_INCLUDE_RESPONSE_DEBUG_ENV =
  "CATEGORY_DERIVATION_ROUTE_RUNNER_INCLUDE_RESPONSE_DEBUG";

export const CATEGORY_DERIVATION_ROUTE_RUNNER_FAILS_ACTIVITY_COMPLETE_ENV =
  "CATEGORY_DERIVATION_ROUTE_RUNNER_FAILS_ACTIVITY_COMPLETE";

export const CATEGORY_DERIVATION_ROUTE_RUNNER_MODES = [
  "disabled",
  "debug_only",
  "legacy_existing",
  "shadow_no_persist",
  "shadow_persist",
  "production_persist",
] as const;

export type CategoryDerivationRouteRunnerMode =
  (typeof CATEGORY_DERIVATION_ROUTE_RUNNER_MODES)[number];

export interface CategoryDerivationRouteRunnerRawConfig {
  mode: string | undefined;
  includeResponseDebug: string | undefined;
  failActivityComplete: string | undefined;
}

export interface CategoryDerivationRouteRunnerConfig {
  mode: CategoryDerivationRouteRunnerMode;
  includeResponseDebug: boolean;
  failActivityComplete: boolean;
  isDisabled: boolean;
  isDebugOnly: boolean;
  usesLegacyExistingCompleteRouteFlow: boolean;
  usesRouteRunnerInCompleteRoute: boolean;
  shouldPersist: boolean;
  shouldResolve: boolean;
  isShadowMode: boolean;
  isProductionPersistMode: boolean;
  raw: CategoryDerivationRouteRunnerRawConfig;
  warnings: string[];
}

function normalizeEnvText(value: string | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function isCategoryDerivationRouteRunnerMode(
  value: string,
): value is CategoryDerivationRouteRunnerMode {
  return CATEGORY_DERIVATION_ROUTE_RUNNER_MODES.includes(
    value as CategoryDerivationRouteRunnerMode,
  );
}

function readBooleanEnv(
  value: string | undefined,
  defaultValue: boolean,
  envName: string,
  warnings: string[],
): boolean {
  const normalized = normalizeEnvText(value)?.toLowerCase();

  if (normalized === null) {
    return defaultValue;
  }

  if (["true", "1", "yes", "y", "on"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "n", "off"].includes(normalized)) {
    return false;
  }

  warnings.push(
    `${envName} has unsupported boolean value "${value}". Falling back to ${String(
      defaultValue,
    )}.`,
  );

  return defaultValue;
}

function readModeEnv(
  value: string | undefined,
  warnings: string[],
): CategoryDerivationRouteRunnerMode {
  const normalized = normalizeEnvText(value)?.toLowerCase();

  if (normalized === null) {
    return "disabled";
  }

  if (isCategoryDerivationRouteRunnerMode(normalized)) {
    return normalized;
  }

  warnings.push(
    `${CATEGORY_DERIVATION_ROUTE_RUNNER_MODE_ENV} has unsupported value "${value}". Falling back to disabled.`,
  );

  return "disabled";
}

export function getCategoryDerivationRouteRunnerConfig(
  env: NodeJS.ProcessEnv = process.env,
): CategoryDerivationRouteRunnerConfig {
  const warnings: string[] = [];

  const raw: CategoryDerivationRouteRunnerRawConfig = {
    mode: env[CATEGORY_DERIVATION_ROUTE_RUNNER_MODE_ENV],
    includeResponseDebug:
      env[CATEGORY_DERIVATION_ROUTE_RUNNER_INCLUDE_RESPONSE_DEBUG_ENV],
    failActivityComplete:
      env[CATEGORY_DERIVATION_ROUTE_RUNNER_FAILS_ACTIVITY_COMPLETE_ENV],
  };

  const mode = readModeEnv(raw.mode, warnings);

  const includeResponseDebug = readBooleanEnv(
    raw.includeResponseDebug,
    false,
    CATEGORY_DERIVATION_ROUTE_RUNNER_INCLUDE_RESPONSE_DEBUG_ENV,
    warnings,
  );

  const failActivityComplete = readBooleanEnv(
    raw.failActivityComplete,
    false,
    CATEGORY_DERIVATION_ROUTE_RUNNER_FAILS_ACTIVITY_COMPLETE_ENV,
    warnings,
  );

  const isDisabled = mode === "disabled";
  const isDebugOnly = mode === "debug_only";
  const usesLegacyExistingCompleteRouteFlow = mode === "legacy_existing";
  const usesRouteRunnerInCompleteRoute =
    mode === "shadow_no_persist" ||
    mode === "shadow_persist" ||
    mode === "production_persist";

  const shouldPersist =
    mode === "shadow_persist" || mode === "production_persist";

  const shouldResolve = usesRouteRunnerInCompleteRoute;
  const isShadowMode =
    mode === "shadow_no_persist" || mode === "shadow_persist";
  const isProductionPersistMode = mode === "production_persist";

  return {
    mode,
    includeResponseDebug,
    failActivityComplete,
    isDisabled,
    isDebugOnly,
    usesLegacyExistingCompleteRouteFlow,
    usesRouteRunnerInCompleteRoute,
    shouldPersist,
    shouldResolve,
    isShadowMode,
    isProductionPersistMode,
    raw,
    warnings,
  };
}

export function getCategoryDerivationRouteRunnerConfigSummary(
  config: CategoryDerivationRouteRunnerConfig = getCategoryDerivationRouteRunnerConfig(),
) {
  return {
    mode: config.mode,
    includeResponseDebug: config.includeResponseDebug,
    failActivityComplete: config.failActivityComplete,
    isDisabled: config.isDisabled,
    isDebugOnly: config.isDebugOnly,
    usesLegacyExistingCompleteRouteFlow:
      config.usesLegacyExistingCompleteRouteFlow,
    usesRouteRunnerInCompleteRoute: config.usesRouteRunnerInCompleteRoute,
    shouldPersist: config.shouldPersist,
    shouldResolve: config.shouldResolve,
    isShadowMode: config.isShadowMode,
    isProductionPersistMode: config.isProductionPersistMode,
    warnings: config.warnings,
  };
}

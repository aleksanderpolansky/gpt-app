import type { MeasurementRollupDefinitionV1 } from "@/lib/reality-core/measurement-rollup-contract-v1";
import { MEASUREMENT_ROLLUP_CONTRACT_VERSION } from "@/lib/reality-core/measurement-rollup-contract-v1";

export const MEASUREMENT_ROLLUP_TARGET_METADATA_KEY =
  "measurementRollupV1" as const;

export const MEASUREMENT_ROLLUP_TARGET_METADATA_VERSION =
  "ARCTOR_MEASUREMENT_ROLLUP_TARGET_METADATA_V1" as const;

export type MeasurementRollupTargetMetadataV1 = {
  contractVersion: typeof MEASUREMENT_ROLLUP_TARGET_METADATA_VERSION;
  status: "active";

  parameterDefinitionId: string;
  parameterCode: string;
  canonicalUnitCode: string;

  operator: "sum";
  sourceValueObjectIds: string[];

  requiredComponentPolicy: "all";
  directValuePolicy: "prefer_direct";
  missingValuePolicy: "unknown";
  discrepancyPolicy: "flag";
  discrepancyToleranceAbsolute: number;

  configuredAt: string;
  configuredByAppUserId: string;
  configuredByAdminId: string;
};

type JsonRecord = Record<string, unknown>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PARAMETER_RE = /^[a-z][a-z0-9_]{0,79}$/;
const UNIT_RE = /^[a-z][a-z0-9_]{0,79}$/;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function finiteNumber(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(parsed) ? parsed : null;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

export function validateMeasurementRollupTargetMetadataV1(
  value: MeasurementRollupTargetMetadataV1,
): true {
  if (value.contractVersion !== MEASUREMENT_ROLLUP_TARGET_METADATA_VERSION) {
    throw new Error("MEASUREMENT_ROLLUP_TARGET_METADATA_VERSION_INVALID");
  }

  if (value.status !== "active") {
    throw new Error("MEASUREMENT_ROLLUP_TARGET_STATUS_INVALID");
  }

  if (!UUID_RE.test(value.parameterDefinitionId)) {
    throw new Error("MEASUREMENT_ROLLUP_TARGET_PARAMETER_DEFINITION_ID_INVALID");
  }

  if (!PARAMETER_RE.test(value.parameterCode)) {
    throw new Error("MEASUREMENT_ROLLUP_TARGET_PARAMETER_CODE_INVALID");
  }

  if (!UNIT_RE.test(value.canonicalUnitCode)) {
    throw new Error("MEASUREMENT_ROLLUP_TARGET_UNIT_CODE_INVALID");
  }

  if (value.operator !== "sum") {
    throw new Error("MEASUREMENT_ROLLUP_TARGET_OPERATOR_INVALID");
  }

  if (
    !Array.isArray(value.sourceValueObjectIds) ||
    value.sourceValueObjectIds.length < 2 ||
    value.sourceValueObjectIds.some((id) => !UUID_RE.test(id)) ||
    uniqueStrings(value.sourceValueObjectIds).length !==
      value.sourceValueObjectIds.length
  ) {
    throw new Error("MEASUREMENT_ROLLUP_TARGET_SOURCES_INVALID");
  }

  if (
    value.requiredComponentPolicy !== "all" ||
    value.directValuePolicy !== "prefer_direct" ||
    value.missingValuePolicy !== "unknown" ||
    value.discrepancyPolicy !== "flag"
  ) {
    throw new Error("MEASUREMENT_ROLLUP_TARGET_POLICY_INVALID");
  }

  if (
    !Number.isFinite(value.discrepancyToleranceAbsolute) ||
    value.discrepancyToleranceAbsolute < 0
  ) {
    throw new Error("MEASUREMENT_ROLLUP_TARGET_TOLERANCE_INVALID");
  }

  if (
    !text(value.configuredAt) ||
    !UUID_RE.test(value.configuredByAppUserId) ||
    !UUID_RE.test(value.configuredByAdminId)
  ) {
    throw new Error("MEASUREMENT_ROLLUP_TARGET_PROVENANCE_INVALID");
  }

  return true;
}

export function readMeasurementRollupTargetMetadataV1(
  metadata: unknown,
): MeasurementRollupTargetMetadataV1 | null {
  const root = asRecord(metadata);
  const raw = root[MEASUREMENT_ROLLUP_TARGET_METADATA_KEY];

  if (raw === undefined || raw === null) {
    return null;
  }

  const row = asRecord(raw);
  const tolerance = finiteNumber(row.discrepancyToleranceAbsolute);
  const sourceValueObjectIds = Array.isArray(row.sourceValueObjectIds)
    ? row.sourceValueObjectIds
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  const parsed: MeasurementRollupTargetMetadataV1 = {
    contractVersion: text(
      row.contractVersion,
    ) as MeasurementRollupTargetMetadataV1["contractVersion"],
    status: text(row.status) as MeasurementRollupTargetMetadataV1["status"],
    parameterDefinitionId: text(row.parameterDefinitionId),
    parameterCode: text(row.parameterCode).toLowerCase(),
    canonicalUnitCode: text(row.canonicalUnitCode).toLowerCase(),
    operator: text(
      row.operator,
    ) as MeasurementRollupTargetMetadataV1["operator"],
    sourceValueObjectIds,
    requiredComponentPolicy: text(
      row.requiredComponentPolicy,
    ) as MeasurementRollupTargetMetadataV1["requiredComponentPolicy"],
    directValuePolicy: text(
      row.directValuePolicy,
    ) as MeasurementRollupTargetMetadataV1["directValuePolicy"],
    missingValuePolicy: text(
      row.missingValuePolicy,
    ) as MeasurementRollupTargetMetadataV1["missingValuePolicy"],
    discrepancyPolicy: text(
      row.discrepancyPolicy,
    ) as MeasurementRollupTargetMetadataV1["discrepancyPolicy"],
    discrepancyToleranceAbsolute: tolerance ?? Number.NaN,
    configuredAt: text(row.configuredAt),
    configuredByAppUserId: text(row.configuredByAppUserId),
    configuredByAdminId: text(row.configuredByAdminId),
  };

  validateMeasurementRollupTargetMetadataV1(parsed);
  return parsed;
}

export function writeMeasurementRollupTargetMetadataV1(
  metadata: unknown,
  configuration: MeasurementRollupTargetMetadataV1 | null,
): JsonRecord {
  const root = { ...asRecord(metadata) };

  if (configuration === null) {
    delete root[MEASUREMENT_ROLLUP_TARGET_METADATA_KEY];
    return root;
  }

  validateMeasurementRollupTargetMetadataV1(configuration);
  root[MEASUREMENT_ROLLUP_TARGET_METADATA_KEY] = configuration;
  return root;
}

export function toMeasurementRollupDefinitionV1(
  targetValueObjectId: string,
  configuration: MeasurementRollupTargetMetadataV1,
): MeasurementRollupDefinitionV1 {
  validateMeasurementRollupTargetMetadataV1(configuration);

  if (!UUID_RE.test(targetValueObjectId)) {
    throw new Error("MEASUREMENT_ROLLUP_TARGET_VALUE_OBJECT_ID_INVALID");
  }

  if (configuration.sourceValueObjectIds.includes(targetValueObjectId)) {
    throw new Error("MEASUREMENT_ROLLUP_TARGET_CANNOT_SOURCE_ITSELF");
  }

  return {
    contractVersion: MEASUREMENT_ROLLUP_CONTRACT_VERSION,
    id: `stored-rollup:${targetValueObjectId}:${configuration.parameterDefinitionId}`,
    familyCode: `stored:${targetValueObjectId}:${configuration.parameterCode}`,
    status: "active",
    parameterCode: configuration.parameterCode,
    canonicalUnitCode: configuration.canonicalUnitCode,
    targetValueObjectId,
    targetSemanticRole: "rollup_target",
    componentValueObjectIds: [...configuration.sourceValueObjectIds],
    operator: configuration.operator,
    requiredComponentPolicy: configuration.requiredComponentPolicy,
    directValuePolicy: configuration.directValuePolicy,
    missingValuePolicy: configuration.missingValuePolicy,
    discrepancyPolicy: configuration.discrepancyPolicy,
    bundlePolicy: "explicit_or_single",
    sameActivityEventRequired: true,
    sameMeasurementBundleRequired: true,
    doubleCountProtection: true,
    discrepancyToleranceAbsolute:
      configuration.discrepancyToleranceAbsolute,
  };
}

export function runMeasurementRollupTargetMetadataSelfTestV1() {
  const target = "00000000-0000-5000-8000-000000000001";
  const sourceA = "00000000-0000-5000-8000-000000000002";
  const sourceB = "00000000-0000-5000-8000-000000000003";
  const parameterDefinitionId =
    "00000000-0000-5000-8000-000000000010";
  const appUserId = "00000000-0000-5000-8000-000000000020";
  const adminId = "00000000-0000-5000-8000-000000000030";

  const configuration: MeasurementRollupTargetMetadataV1 = {
    contractVersion: MEASUREMENT_ROLLUP_TARGET_METADATA_VERSION,
    status: "active",
    parameterDefinitionId,
    parameterCode: "duration",
    canonicalUnitCode: "minute",
    operator: "sum",
    sourceValueObjectIds: [sourceA, sourceB],
    requiredComponentPolicy: "all",
    directValuePolicy: "prefer_direct",
    missingValuePolicy: "unknown",
    discrepancyPolicy: "flag",
    discrepancyToleranceAbsolute: 1,
    configuredAt: "2026-09-25T00:00:00.000Z",
    configuredByAppUserId: appUserId,
    configuredByAdminId: adminId,
  };

  const checks: Array<[string, boolean]> = [];

  checks.push([
    "missing metadata means ordinary leaf",
    readMeasurementRollupTargetMetadataV1({ unrelated: true }) === null,
  ]);

  const stored = writeMeasurementRollupTargetMetadataV1(
    { unrelated: { keep: true } },
    configuration,
  );
  const readBack = readMeasurementRollupTargetMetadataV1(stored);
  checks.push([
    "round trip preserves target contract",
    readBack?.parameterCode === "duration" &&
      readBack.sourceValueObjectIds.length === 2,
  ]);

  const removed = writeMeasurementRollupTargetMetadataV1(stored, null);
  checks.push([
    "clear removes only rollup metadata",
    !(MEASUREMENT_ROLLUP_TARGET_METADATA_KEY in removed) &&
      JSON.stringify(removed.unrelated) === JSON.stringify({ keep: true }),
  ]);

  const definition = toMeasurementRollupDefinitionV1(target, configuration);
  checks.push([
    "stored metadata adapts to generic resolver definition",
    definition.targetSemanticRole === "rollup_target" &&
      definition.parameterCode === "duration" &&
      definition.componentValueObjectIds.length === 2 &&
      definition.doubleCountProtection === true,
  ]);

  let duplicateRejected = false;
  try {
    validateMeasurementRollupTargetMetadataV1({
      ...configuration,
      sourceValueObjectIds: [sourceA, sourceA],
    });
  } catch {
    duplicateRejected = true;
  }
  checks.push(["duplicate sources rejected", duplicateRejected]);

  let selfSourceRejected = false;
  try {
    toMeasurementRollupDefinitionV1(target, {
      ...configuration,
      sourceValueObjectIds: [target, sourceB],
    });
  } catch {
    selfSourceRejected = true;
  }
  checks.push(["target cannot source itself", selfSourceRejected]);

  const failed = checks.filter(([, ok]) => !ok);
  if (failed.length > 0) {
    throw new Error(
      `MEASUREMENT_ROLLUP_TARGET_METADATA_SELF_TEST_FAILED:${failed
        .map(([label]) => label)
        .join("|")}`,
    );
  }

  return {
    passed: checks.length,
    total: checks.length,
    checks: checks.map(([label]) => label),
  };
}

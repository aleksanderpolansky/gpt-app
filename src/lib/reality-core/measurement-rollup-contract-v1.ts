export const MEASUREMENT_ROLLUP_CONTRACT_VERSION =
  "ARCTOR_MEASUREMENT_ROLLUP_CONTRACT_V1" as const;

export type MeasurementRollupOperatorV1 = "sum";
export type MeasurementRollupRequiredComponentPolicyV1 = "all";
export type MeasurementRollupDirectValuePolicyV1 = "prefer_direct";
export type MeasurementRollupMissingValuePolicyV1 = "unknown";
export type MeasurementRollupDiscrepancyPolicyV1 = "flag";
export type MeasurementRollupBundlePolicyV1 = "explicit_or_single";

export type MeasurementRollupDefinitionV1 = {
  contractVersion: typeof MEASUREMENT_ROLLUP_CONTRACT_VERSION;
  id: string;
  familyCode: string;
  status: "draft" | "active" | "retired";

  /**
   * Universal parameter contract. Semantic meaning belongs to the ON pair,
   * not to a proliferation of semantic parameter codes.
   * Example: duration -> Night sleep duration / Light sleep duration / etc.
   */
  parameterCode: string;
  canonicalUnitCode: string;

  targetValueObjectId: string;
  targetSemanticRole: "rollup_target";
  componentValueObjectIds: string[];

  operator: MeasurementRollupOperatorV1;
  requiredComponentPolicy: MeasurementRollupRequiredComponentPolicyV1;
  directValuePolicy: MeasurementRollupDirectValuePolicyV1;
  missingValuePolicy: MeasurementRollupMissingValuePolicyV1;
  discrepancyPolicy: MeasurementRollupDiscrepancyPolicyV1;
  bundlePolicy: MeasurementRollupBundlePolicyV1;

  sameActivityEventRequired: true;
  sameMeasurementBundleRequired: true;
  doubleCountProtection: true;

  /**
   * Absolute tolerance in canonicalUnitCode used only when both a direct
   * target fact and a complete derived component sum exist.
   */
  discrepancyToleranceAbsolute: number;
};

export type MeasurementRollupFactV1 = {
  factId: string;
  activityEventId: string;
  measurementBundleId?: string | null;
  parameterCode: string;
  valueObjectId: string;
  valueNumber: number;
  unitCode: string;
};

export type MeasurementRollupResolutionStatusV1 =
  | "direct"
  | "derived"
  | "direct_verified"
  | "discrepancy"
  | "insufficient_data"
  | "ambiguous_bundle"
  | "ambiguous_direct"
  | "unit_mismatch";

export type MeasurementRollupComponentResolutionV1 = {
  valueObjectId: string;
  factIds: string[];
  valueNumber: number | null;
  unitCode: string | null;
  state: "present" | "missing" | "ambiguous";
};

export type MeasurementRollupResolutionV1 = {
  contractVersion: typeof MEASUREMENT_ROLLUP_CONTRACT_VERSION;
  definitionId: string;
  activityEventId: string;
  measurementBundleId: string | null;

  status: MeasurementRollupResolutionStatusV1;
  resolvedBy: "direct" | "derived" | null;

  effectiveValueNumber: number | null;
  effectiveUnitCode: string | null;

  directFactIds: string[];
  directValueNumber: number | null;
  derivedValueNumber: number | null;

  componentResolutions: MeasurementRollupComponentResolutionV1[];
  missingComponentValueObjectIds: string[];
  ambiguousComponentValueObjectIds: string[];

  discrepancyAbsolute: number | null;
  doubleCountPrevented: boolean;
  lineageFactIds: string[];
  warnings: string[];
};

export type ResolveMeasurementRollupInputV1 = {
  definition: MeasurementRollupDefinitionV1;
  facts: MeasurementRollupFactV1[];
  activityEventId: string;
  measurementBundleId?: string | null;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function assertFiniteNumber(value: number, code: string) {
  if (!Number.isFinite(value)) throw new Error(code);
}

function bundleKey(fact: MeasurementRollupFactV1): string {
  const explicit = text(fact.measurementBundleId);
  return explicit || `event:${fact.activityEventId}`;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

export function validateMeasurementRollupDefinitionV1(
  definition: MeasurementRollupDefinitionV1,
): true {
  if (definition.contractVersion !== MEASUREMENT_ROLLUP_CONTRACT_VERSION) {
    throw new Error("MEASUREMENT_ROLLUP_CONTRACT_VERSION_INVALID");
  }

  if (
    !text(definition.id) ||
    !text(definition.familyCode) ||
    !text(definition.parameterCode) ||
    !text(definition.canonicalUnitCode) ||
    !text(definition.targetValueObjectId)
  ) {
    throw new Error("MEASUREMENT_ROLLUP_REQUIRED_FIELD_MISSING");
  }

  if (definition.targetSemanticRole !== "rollup_target") {
    throw new Error("MEASUREMENT_ROLLUP_TARGET_ROLE_INVALID");
  }

  if (definition.operator !== "sum") {
    throw new Error("MEASUREMENT_ROLLUP_OPERATOR_UNSUPPORTED");
  }

  if (
    definition.requiredComponentPolicy !== "all" ||
    definition.directValuePolicy !== "prefer_direct" ||
    definition.missingValuePolicy !== "unknown" ||
    definition.discrepancyPolicy !== "flag" ||
    definition.bundlePolicy !== "explicit_or_single" ||
    definition.sameActivityEventRequired !== true ||
    definition.sameMeasurementBundleRequired !== true ||
    definition.doubleCountProtection !== true
  ) {
    throw new Error("MEASUREMENT_ROLLUP_POLICY_INVALID");
  }

  if (
    !Array.isArray(definition.componentValueObjectIds) ||
    definition.componentValueObjectIds.length < 2
  ) {
    throw new Error("MEASUREMENT_ROLLUP_COMPONENTS_INSUFFICIENT");
  }

  const components = definition.componentValueObjectIds.map(text);
  if (
    components.some((value) => !value) ||
    uniqueStrings(components).length !== components.length
  ) {
    throw new Error("MEASUREMENT_ROLLUP_COMPONENTS_INVALID_OR_DUPLICATE");
  }

  if (components.includes(definition.targetValueObjectId)) {
    throw new Error("MEASUREMENT_ROLLUP_TARGET_CANNOT_BE_COMPONENT");
  }

  assertFiniteNumber(
    definition.discrepancyToleranceAbsolute,
    "MEASUREMENT_ROLLUP_TOLERANCE_INVALID",
  );
  if (definition.discrepancyToleranceAbsolute < 0) {
    throw new Error("MEASUREMENT_ROLLUP_TOLERANCE_NEGATIVE");
  }

  return true;
}

function validateFactsV1(facts: MeasurementRollupFactV1[]) {
  const factIds = new Set<string>();

  for (const fact of facts) {
    if (
      !text(fact.factId) ||
      !text(fact.activityEventId) ||
      !text(fact.parameterCode) ||
      !text(fact.valueObjectId) ||
      !text(fact.unitCode)
    ) {
      throw new Error("MEASUREMENT_ROLLUP_FACT_REQUIRED_FIELD_MISSING");
    }

    if (factIds.has(fact.factId)) {
      throw new Error("MEASUREMENT_ROLLUP_FACT_ID_DUPLICATE");
    }
    factIds.add(fact.factId);

    assertFiniteNumber(
      fact.valueNumber,
      "MEASUREMENT_ROLLUP_FACT_VALUE_INVALID",
    );
  }
}

function baseResolution(
  definition: MeasurementRollupDefinitionV1,
  activityEventId: string,
  measurementBundleId: string | null,
): MeasurementRollupResolutionV1 {
  return {
    contractVersion: MEASUREMENT_ROLLUP_CONTRACT_VERSION,
    definitionId: definition.id,
    activityEventId,
    measurementBundleId,
    status: "insufficient_data",
    resolvedBy: null,
    effectiveValueNumber: null,
    effectiveUnitCode: null,
    directFactIds: [],
    directValueNumber: null,
    derivedValueNumber: null,
    componentResolutions: definition.componentValueObjectIds.map(
      (valueObjectId) => ({
        valueObjectId,
        factIds: [],
        valueNumber: null,
        unitCode: null,
        state: "missing" as const,
      }),
    ),
    missingComponentValueObjectIds: [...definition.componentValueObjectIds],
    ambiguousComponentValueObjectIds: [],
    discrepancyAbsolute: null,
    doubleCountPrevented: false,
    lineageFactIds: [],
    warnings: [],
  };
}

export function resolveMeasurementRollupV1(
  input: ResolveMeasurementRollupInputV1,
): MeasurementRollupResolutionV1 {
  validateMeasurementRollupDefinitionV1(input.definition);
  validateFactsV1(input.facts);

  const definition = input.definition;
  const requestedEventId = text(input.activityEventId);
  if (!requestedEventId) {
    throw new Error("MEASUREMENT_ROLLUP_ACTIVITY_EVENT_ID_REQUIRED");
  }

  const relevantObjectIds = new Set([
    definition.targetValueObjectId,
    ...definition.componentValueObjectIds,
  ]);

  const eventFacts = input.facts.filter(
    (fact) =>
      fact.activityEventId === requestedEventId &&
      fact.parameterCode === definition.parameterCode &&
      relevantObjectIds.has(fact.valueObjectId),
  );

  const requestedBundleId = text(input.measurementBundleId);
  let selectedFacts = eventFacts;
  let selectedBundleId: string | null = requestedBundleId || null;

  if (requestedBundleId) {
    selectedFacts = eventFacts.filter(
      (fact) => bundleKey(fact) === requestedBundleId,
    );
  } else {
    const bundleKeys = uniqueStrings(eventFacts.map(bundleKey));

    if (bundleKeys.length > 1) {
      const result = baseResolution(
        definition,
        requestedEventId,
        null,
      );
      result.status = "ambiguous_bundle";
      result.warnings.push("MULTIPLE_MEASUREMENT_BUNDLES_REQUIRE_EXPLICIT_SELECTION");
      return result;
    }

    if (bundleKeys.length === 1) {
      selectedBundleId = bundleKeys[0].startsWith("event:")
        ? null
        : bundleKeys[0];
    }
  }

  const result = baseResolution(
    definition,
    requestedEventId,
    selectedBundleId,
  );

  if (selectedFacts.length === 0) {
    return result;
  }

  const wrongUnitFacts = selectedFacts.filter(
    (fact) => fact.unitCode !== definition.canonicalUnitCode,
  );
  if (wrongUnitFacts.length > 0) {
    result.status = "unit_mismatch";
    result.warnings.push(
      `EXPECTED_CANONICAL_UNIT:${definition.canonicalUnitCode}`,
    );
    result.lineageFactIds = wrongUnitFacts.map((fact) => fact.factId);
    return result;
  }

  const directFacts = selectedFacts.filter(
    (fact) => fact.valueObjectId === definition.targetValueObjectId,
  );
  result.directFactIds = directFacts.map((fact) => fact.factId);

  if (directFacts.length > 1) {
    result.status = "ambiguous_direct";
    result.lineageFactIds = result.directFactIds;
    result.warnings.push("MULTIPLE_DIRECT_TARGET_FACTS");
    return result;
  }

  if (directFacts.length === 1) {
    result.directValueNumber = directFacts[0].valueNumber;
  }

  const componentResolutions =
    definition.componentValueObjectIds.map((valueObjectId) => {
      const facts = selectedFacts.filter(
        (fact) => fact.valueObjectId === valueObjectId,
      );

      if (facts.length === 0) {
        return {
          valueObjectId,
          factIds: [],
          valueNumber: null,
          unitCode: null,
          state: "missing" as const,
        };
      }

      if (facts.length > 1) {
        return {
          valueObjectId,
          factIds: facts.map((fact) => fact.factId),
          valueNumber: null,
          unitCode: definition.canonicalUnitCode,
          state: "ambiguous" as const,
        };
      }

      return {
        valueObjectId,
        factIds: [facts[0].factId],
        valueNumber: facts[0].valueNumber,
        unitCode: facts[0].unitCode,
        state: "present" as const,
      };
    });

  result.componentResolutions = componentResolutions;
  result.missingComponentValueObjectIds = componentResolutions
    .filter((item) => item.state === "missing")
    .map((item) => item.valueObjectId);
  result.ambiguousComponentValueObjectIds = componentResolutions
    .filter((item) => item.state === "ambiguous")
    .map((item) => item.valueObjectId);

  const allComponentsPresent = componentResolutions.every(
    (item) => item.state === "present",
  );

  if (allComponentsPresent) {
    result.derivedValueNumber = componentResolutions.reduce(
      (sum, item) => sum + (item.valueNumber ?? 0),
      0,
    );
  }

  const componentFactIds = componentResolutions.flatMap(
    (item) => item.factIds,
  );

  if (result.directValueNumber !== null) {
    result.effectiveValueNumber = result.directValueNumber;
    result.effectiveUnitCode = definition.canonicalUnitCode;
    result.resolvedBy = "direct";
    result.lineageFactIds = [
      ...result.directFactIds,
      ...componentFactIds,
    ];

    if (result.ambiguousComponentValueObjectIds.length > 0) {
      result.status = "direct";
      result.warnings.push("COMPONENT_AMBIGUITY_IGNORED_FOR_DIRECT_TARGET");
      return result;
    }

    if (!allComponentsPresent) {
      result.status = "direct";
      return result;
    }

    result.doubleCountPrevented = true;
    result.discrepancyAbsolute = Math.abs(
      result.directValueNumber - (result.derivedValueNumber ?? 0),
    );

    if (
      result.discrepancyAbsolute <=
      definition.discrepancyToleranceAbsolute
    ) {
      result.status = "direct_verified";
    } else {
      result.status = "discrepancy";
      result.warnings.push("DIRECT_AND_DERIVED_VALUES_DIFFER");
    }

    return result;
  }

  if (result.ambiguousComponentValueObjectIds.length > 0) {
    result.status = "insufficient_data";
    result.lineageFactIds = componentFactIds;
    result.warnings.push("AMBIGUOUS_COMPONENT_VALUES");
    return result;
  }

  if (!allComponentsPresent || result.derivedValueNumber === null) {
    result.status = "insufficient_data";
    result.lineageFactIds = componentFactIds;
    return result;
  }

  result.status = "derived";
  result.resolvedBy = "derived";
  result.effectiveValueNumber = result.derivedValueNumber;
  result.effectiveUnitCode = definition.canonicalUnitCode;
  result.lineageFactIds = componentFactIds;
  return result;
}

export function runMeasurementRollupSelfTestV1() {
  const target = "00000000-0000-5000-8000-000000000001";
  const light = "00000000-0000-5000-8000-000000000002";
  const deep = "00000000-0000-5000-8000-000000000003";
  const rem = "00000000-0000-5000-8000-000000000004";
  const event = "event-1";
  const bundle = "bundle-1";

  const definition: MeasurementRollupDefinitionV1 = {
    contractVersion: MEASUREMENT_ROLLUP_CONTRACT_VERSION,
    id: "self-test-rollup",
    familyCode: "sleep_duration",
    status: "active",
    parameterCode: "duration",
    canonicalUnitCode: "minute",
    targetValueObjectId: target,
    targetSemanticRole: "rollup_target",
    componentValueObjectIds: [light, deep, rem],
    operator: "sum",
    requiredComponentPolicy: "all",
    directValuePolicy: "prefer_direct",
    missingValuePolicy: "unknown",
    discrepancyPolicy: "flag",
    bundlePolicy: "explicit_or_single",
    sameActivityEventRequired: true,
    sameMeasurementBundleRequired: true,
    doubleCountProtection: true,
    discrepancyToleranceAbsolute: 1,
  };

  const fact = (
    factId: string,
    valueObjectId: string,
    valueNumber: number,
    measurementBundleId: string | null = bundle,
    activityEventId = event,
  ): MeasurementRollupFactV1 => ({
    factId,
    activityEventId,
    measurementBundleId,
    parameterCode: "duration",
    valueObjectId,
    valueNumber,
    unitCode: "minute",
  });

  const checks: Array<[string, boolean]> = [];

  const directOnly = resolveMeasurementRollupV1({
    definition,
    activityEventId: event,
    measurementBundleId: bundle,
    facts: [fact("d1", target, 496)],
  });
  checks.push([
    "direct only uses direct target",
    directOnly.status === "direct" &&
      directOnly.effectiveValueNumber === 496 &&
      directOnly.resolvedBy === "direct",
  ]);

  const derivedOnly = resolveMeasurementRollupV1({
    definition,
    activityEventId: event,
    measurementBundleId: bundle,
    facts: [
      fact("l1", light, 351),
      fact("g1", deep, 30),
      fact("r1", rem, 115),
    ],
  });
  checks.push([
    "complete components derive target",
    derivedOnly.status === "derived" &&
      derivedOnly.effectiveValueNumber === 496 &&
      derivedOnly.resolvedBy === "derived",
  ]);

  const verified = resolveMeasurementRollupV1({
    definition,
    activityEventId: event,
    measurementBundleId: bundle,
    facts: [
      fact("d2", target, 496),
      fact("l2", light, 351),
      fact("g2", deep, 30),
      fact("r2", rem, 115),
    ],
  });
  checks.push([
    "direct plus components verifies without double count",
    verified.status === "direct_verified" &&
      verified.effectiveValueNumber === 496 &&
      verified.derivedValueNumber === 496 &&
      verified.doubleCountPrevented === true,
  ]);

  const discrepancy = resolveMeasurementRollupV1({
    definition,
    activityEventId: event,
    measurementBundleId: bundle,
    facts: [
      fact("d3", target, 500),
      fact("l3", light, 351),
      fact("g3", deep, 30),
      fact("r3", rem, 115),
    ],
  });
  checks.push([
    "direct/derived mismatch is flagged and direct remains effective",
    discrepancy.status === "discrepancy" &&
      discrepancy.effectiveValueNumber === 500 &&
      discrepancy.derivedValueNumber === 496 &&
      discrepancy.discrepancyAbsolute === 4,
  ]);

  const partial = resolveMeasurementRollupV1({
    definition,
    activityEventId: event,
    measurementBundleId: bundle,
    facts: [
      fact("l4", light, 351),
      fact("g4", deep, 30),
    ],
  });
  checks.push([
    "partial components stay unknown rather than zero",
    partial.status === "insufficient_data" &&
      partial.effectiveValueNumber === null &&
      partial.missingComponentValueObjectIds.includes(rem),
  ]);

  const explicitZero = resolveMeasurementRollupV1({
    definition,
    activityEventId: event,
    measurementBundleId: bundle,
    facts: [
      fact("l5", light, 351),
      fact("g5", deep, 0),
      fact("r5", rem, 115),
    ],
  });
  checks.push([
    "explicit zero remains a real observed value",
    explicitZero.status === "derived" &&
      explicitZero.effectiveValueNumber === 466,
  ]);

  const directWithPartial = resolveMeasurementRollupV1({
    definition,
    activityEventId: event,
    measurementBundleId: bundle,
    facts: [
      fact("d6", target, 496),
      fact("g6", deep, 30),
    ],
  });
  checks.push([
    "direct target remains usable when detail is partial",
    directWithPartial.status === "direct" &&
      directWithPartial.effectiveValueNumber === 496 &&
      directWithPartial.missingComponentValueObjectIds.length === 2,
  ]);

  const multiBundle = resolveMeasurementRollupV1({
    definition,
    activityEventId: event,
    facts: [
      fact("d7", target, 496, "bundle-user"),
      fact("l7", light, 351, "bundle-watch"),
      fact("g7", deep, 30, "bundle-watch"),
      fact("r7", rem, 115, "bundle-watch"),
    ],
  });
  checks.push([
    "different measurement bundles are never mixed silently",
    multiBundle.status === "ambiguous_bundle" &&
      multiBundle.effectiveValueNumber === null,
  ]);

  const otherEventIgnored = resolveMeasurementRollupV1({
    definition,
    activityEventId: event,
    measurementBundleId: bundle,
    facts: [
      fact("l8", light, 351),
      fact("g8", deep, 30),
      fact("r8", rem, 115, bundle, "event-2"),
    ],
  });
  checks.push([
    "facts from another event are never mixed",
    otherEventIgnored.status === "insufficient_data" &&
      otherEventIgnored.missingComponentValueObjectIds.includes(rem),
  ]);

  const wrongUnit = resolveMeasurementRollupV1({
    definition,
    activityEventId: event,
    measurementBundleId: bundle,
    facts: [
      {
        ...fact("l9", light, 351),
        unitCode: "second",
      },
      fact("g9", deep, 30),
      fact("r9", rem, 115),
    ],
  });
  checks.push([
    "unit mismatch fails closed",
    wrongUnit.status === "unit_mismatch" &&
      wrongUnit.effectiveValueNumber === null,
  ]);

  const failed = checks.filter(([, ok]) => !ok);
  if (failed.length > 0) {
    throw new Error(
      `MEASUREMENT_ROLLUP_SELF_TEST_FAILED:${failed
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

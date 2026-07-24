import {
  deriveValueObjectDailyEquivalentV3,
  type ValueObjectDailyEquivalentResultV3,
  type ValueObjectTargetKindCodeV3,
  type ValueObjectTargetNormalizationPolicyCodeV3,
  type ValueObjectTargetPeriodUnitCodeV3,
} from "./reality-model-v3-field-lock";

export interface TargetNormalizationAcceptanceCaseV3 {
  readonly id: string;
  readonly sourceLabel: string;
  readonly targetKindCode: ValueObjectTargetKindCodeV3;
  readonly targetValueNumeric: number | null;
  readonly periodCount: number | null;
  readonly periodUnit: ValueObjectTargetPeriodUnitCodeV3 | null;
  readonly normalizationPolicyCode: ValueObjectTargetNormalizationPolicyCodeV3;
  readonly expectedMode: ValueObjectDailyEquivalentResultV3["mode"];
  readonly expectedDailyEquivalentNumeric: number | null;
  readonly tolerance: number;
}

export const TARGET_NORMALIZATION_ACCEPTANCE_CASES_V3 = [
  {
    id: "minutes-week-linear",
    sourceLabel: "700 minutes per week",
    targetKindCode: "amount_per_period",
    targetValueNumeric: 700,
    periodCount: 1,
    periodUnit: "week",
    normalizationPolicyCode: "linear_rate",
    expectedMode: "normalized_rate",
    expectedDailyEquivalentNumeric: 100,
    tolerance: 0.000001,
  },
  {
    id: "annual-count-cadence",
    sourceLabel: "1 action per year",
    targetKindCode: "count_per_period",
    targetValueNumeric: 1,
    periodCount: 1,
    periodUnit: "year",
    normalizationPolicyCode: "cadence_rate",
    expectedMode: "normalized_rate",
    expectedDailyEquivalentNumeric: 1 / 365.2425,
    tolerance: 0.000000001,
  },
  {
    id: "body-mass-point",
    sourceLabel: "Body mass target 80 kg",
    targetKindCode: "point_value",
    targetValueNumeric: 80,
    periodCount: null,
    periodUnit: null,
    normalizationPolicyCode: "no_daily_division",
    expectedMode: "repeat_unchanged",
    expectedDailyEquivalentNumeric: 80,
    tolerance: 0,
  },
  {
    id: "vitamin-c-day-linear",
    sourceLabel: "Vitamin C 90 mg per day",
    targetKindCode: "amount_per_period",
    targetValueNumeric: 90,
    periodCount: 1,
    periodUnit: "day",
    normalizationPolicyCode: "linear_rate",
    expectedMode: "normalized_rate",
    expectedDailyEquivalentNumeric: 90,
    tolerance: 0,
  },
  {
    id: "range-repeat-unchanged",
    sourceLabel: "Body mass range 78-82 kg",
    targetKindCode: "range",
    targetValueNumeric: null,
    periodCount: null,
    periodUnit: null,
    normalizationPolicyCode: "no_daily_division",
    expectedMode: "repeat_unchanged",
    expectedDailyEquivalentNumeric: null,
    tolerance: 0,
  },
  {
    id: "threshold-day-linear",
    sourceLabel: "At least 30 g fibre per day",
    targetKindCode: "threshold_min",
    targetValueNumeric: 30,
    periodCount: 1,
    periodUnit: "day",
    normalizationPolicyCode: "linear_rate",
    expectedMode: "normalized_rate",
    expectedDailyEquivalentNumeric: 30,
    tolerance: 0,
  },
  {
    id: "boolean-no-number",
    sourceLabel: "Certificate is valid",
    targetKindCode: "boolean_condition",
    targetValueNumeric: null,
    periodCount: null,
    periodUnit: null,
    normalizationPolicyCode: "no_daily_division",
    expectedMode: "not_applicable",
    expectedDailyEquivalentNumeric: null,
    tolerance: 0,
  },
  {
    id: "qualitative-no-number",
    sourceLabel: "Can greet confidently at an interview",
    targetKindCode: "qualitative_criterion",
    targetValueNumeric: null,
    periodCount: null,
    periodUnit: null,
    normalizationPolicyCode: "no_daily_division",
    expectedMode: "not_applicable",
    expectedDailyEquivalentNumeric: null,
    tolerance: 0,
  },
  {
    id: "custom-formula-deferred",
    sourceLabel: "Custom numeric target formula",
    targetKindCode: "point_value",
    targetValueNumeric: 80,
    periodCount: null,
    periodUnit: null,
    normalizationPolicyCode: "custom_formula",
    expectedMode: "custom_formula_required",
    expectedDailyEquivalentNumeric: null,
    tolerance: 0,
  },
] as const satisfies readonly TargetNormalizationAcceptanceCaseV3[];

export function verifyTargetNormalizationAcceptanceV3(): readonly string[] {
  const failures: string[] = [];

  for (const testCase of TARGET_NORMALIZATION_ACCEPTANCE_CASES_V3) {
    const actual = deriveValueObjectDailyEquivalentV3({
      targetKindCode: testCase.targetKindCode,
      targetValueNumeric: testCase.targetValueNumeric,
      periodCount: testCase.periodCount,
      periodUnit: testCase.periodUnit,
      normalizationPolicyCode: testCase.normalizationPolicyCode,
    });

    if (actual.mode !== testCase.expectedMode) {
      failures.push(
        `${testCase.id}: expected mode ${testCase.expectedMode}, got ${actual.mode}.`,
      );
      continue;
    }

    if (testCase.expectedDailyEquivalentNumeric === null) {
      if (actual.dailyEquivalentNumeric !== null) {
        failures.push(
          `${testCase.id}: expected null daily equivalent, got ${actual.dailyEquivalentNumeric}.`,
        );
      }
      continue;
    }

    if (actual.dailyEquivalentNumeric === null) {
      failures.push(`${testCase.id}: expected numeric daily equivalent.`);
      continue;
    }

    const difference = Math.abs(
      actual.dailyEquivalentNumeric - testCase.expectedDailyEquivalentNumeric,
    );

    if (difference > testCase.tolerance) {
      failures.push(
        `${testCase.id}: expected ${testCase.expectedDailyEquivalentNumeric}, got ${actual.dailyEquivalentNumeric}.`,
      );
    }
  }

  return failures;
}

export interface TargetNormalizationRejectionCaseV3 {
  readonly id: string;
  readonly targetKindCode: ValueObjectTargetKindCodeV3;
  readonly normalizationPolicyCode: ValueObjectTargetNormalizationPolicyCodeV3;
}

export const TARGET_NORMALIZATION_REJECTION_CASES_V3 = [
  {
    id: "point-value-must-not-be-linear",
    targetKindCode: "point_value",
    normalizationPolicyCode: "linear_rate",
  },
  {
    id: "count-must-use-cadence",
    targetKindCode: "count_per_period",
    normalizationPolicyCode: "linear_rate",
  },
  {
    id: "amount-must-not-skip-period-rate",
    targetKindCode: "amount_per_period",
    normalizationPolicyCode: "no_daily_division",
  },
] as const satisfies readonly TargetNormalizationRejectionCaseV3[];

export function verifyTargetNormalizationRejectionsV3(): readonly string[] {
  const failures: string[] = [];

  for (const testCase of TARGET_NORMALIZATION_REJECTION_CASES_V3) {
    let rejected = false;

    try {
      deriveValueObjectDailyEquivalentV3({
        targetKindCode: testCase.targetKindCode,
        targetValueNumeric: 1,
        periodCount: 1,
        periodUnit: "day",
        normalizationPolicyCode: testCase.normalizationPolicyCode,
      });
    } catch {
      rejected = true;
    }

    if (!rejected) {
      failures.push(`${testCase.id}: invalid policy combination was accepted.`);
    }
  }

  return failures;
}

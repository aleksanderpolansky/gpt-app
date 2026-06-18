import {
  VALUE_OBJECT_TARGET_STANDARD_SAFETY_NOTE,
  formatValueObjectTargetStandardSummary,
  validateValueObjectTargetStandard,
  type ValueObjectTargetStandard,
  type ValueObjectTargetStandardValidationResult,
} from "./value-object-standards";

export const VALUE_OBJECT_TARGET_STANDARD_FIXTURES = [
  {
    standardId: "fixture_standard_sleep_daily_duration_minimum",
    valueObjectId: "fixture_vo_organism_sleep",
    metricType: "duration",
    targetValue: 420,
    unit: "minutes",
    period: "day",
    ruleType: "desired_minimum",
    priority: "high",
    source: "system_default",
    status: "active",
    label: "Daily sleep duration",
    description:
      "Demo standard for comparing sleep-related duration facts against a daily minimum.",
    safetyNote: VALUE_OBJECT_TARGET_STANDARD_SAFETY_NOTE,
  },
  {
    standardId: "fixture_standard_hydration_daily_volume_minimum",
    valueObjectId: "fixture_vo_organism_hydration",
    metricType: "volume",
    targetValue: 2,
    unit: "liters",
    period: "day",
    ruleType: "desired_minimum",
    priority: "normal",
    source: "system_default",
    status: "active",
    label: "Daily hydration volume",
    description:
      "Demo standard for comparing water or hydration facts against a daily volume target.",
    safetyNote: VALUE_OBJECT_TARGET_STANDARD_SAFETY_NOTE,
  },
  {
    standardId: "fixture_standard_walking_daily_steps_minimum",
    valueObjectId: "fixture_vo_body_walking",
    metricType: "count",
    targetValue: 8000,
    unit: "steps",
    period: "day",
    ruleType: "desired_minimum",
    priority: "normal",
    source: "system_default",
    status: "active",
    label: "Daily walking steps",
    description:
      "Demo standard for comparing walking-related count facts against a daily steps target.",
    safetyNote: VALUE_OBJECT_TARGET_STANDARD_SAFETY_NOTE,
  },
  {
    standardId: "fixture_standard_focus_work_daily_duration_range",
    valueObjectId: "fixture_vo_focus_work",
    metricType: "duration",
    targetValue: 180,
    targetMin: 120,
    targetMax: 240,
    unit: "minutes",
    period: "day",
    ruleType: "desired_range",
    priority: "high",
    source: "user_defined",
    status: "active",
    label: "Daily focused work range",
    description:
      "Demo standard for comparing focused work duration facts against a practical daily range.",
    safetyNote: VALUE_OBJECT_TARGET_STANDARD_SAFETY_NOTE,
  },
  {
    standardId: "fixture_standard_language_learning_weekly_duration_minimum",
    valueObjectId: "fixture_vo_language_learning",
    metricType: "duration",
    targetValue: 300,
    unit: "minutes",
    period: "week",
    ruleType: "desired_minimum",
    priority: "normal",
    source: "user_defined",
    status: "active",
    label: "Weekly language learning duration",
    description:
      "Demo standard for comparing language-learning duration facts against a weekly minimum.",
    safetyNote: VALUE_OBJECT_TARGET_STANDARD_SAFETY_NOTE,
  },
] as const satisfies readonly ValueObjectTargetStandard[];

export type ValueObjectTargetStandardFixture =
  (typeof VALUE_OBJECT_TARGET_STANDARD_FIXTURES)[number];

export type ValueObjectTargetStandardFixtureValidation = {
  ok: boolean;
  results: readonly (ValueObjectTargetStandardValidationResult & {
    standardId: string;
  })[];
  errors: readonly string[];
};

export function getValueObjectTargetStandardFixtures():
  readonly ValueObjectTargetStandard[] {
  return VALUE_OBJECT_TARGET_STANDARD_FIXTURES;
}

export function getValueObjectTargetStandardFixturesByValueObjectId(
  valueObjectId: string
): readonly ValueObjectTargetStandard[] {
  return VALUE_OBJECT_TARGET_STANDARD_FIXTURES.filter(
    (standard) => standard.valueObjectId === valueObjectId
  );
}

export function getValueObjectTargetStandardFixtureSummaries():
  readonly string[] {
  return VALUE_OBJECT_TARGET_STANDARD_FIXTURES.map((standard) =>
    formatValueObjectTargetStandardSummary(standard)
  );
}

export function validateValueObjectTargetStandardFixtures():
  ValueObjectTargetStandardFixtureValidation {
  const results = VALUE_OBJECT_TARGET_STANDARD_FIXTURES.map((standard) => {
    const validation = validateValueObjectTargetStandard(standard);

    return {
      standardId: standard.standardId ?? standard.valueObjectId,
      ...validation,
    };
  });

  const errors = results.flatMap((result) =>
    result.errors.map((error) => `${result.standardId}: ${error}`)
  );

  return {
    ok: errors.length === 0,
    results,
    errors,
  };
}

import {
  GOAL_INTAKE_FIELD_REGISTRY,
  getGoalIntakeFieldRegistryEntry,
  resolveGoalIntakeFieldRequirements,
  type GoalIntakeRequirementCode,
} from "./goalIntakeRegistry";
import {
  goalIntakeFieldStatus,
  type GoalIntakeDefinitionV1,
  type GoalIntakeFieldCode,
  type GoalIntakeFieldStatusCode,
} from "./goalIntakeTypes";

export type GoalIntakeQuestionPlanItem = {
  readonly fieldCode: GoalIntakeFieldCode;
  readonly questionCode: string;
  readonly defaultQuestion: string;
  readonly requirementCode: GoalIntakeRequirementCode;
  readonly statusCode: GoalIntakeFieldStatusCode;
  readonly priorityCode:
    | "blocking"
    | "required"
    | "recommended";
};

export type GoalIntakeCompleteness = {
  readonly requiredTotal: number;
  readonly requiredKnown: number;
  readonly requiredPartial: number;
  readonly requiredUnknown: number;
  readonly requiredClarificationRequired: number;
  readonly requiredCompletenessPercent: number;
  readonly recommendedTotal: number;
  readonly recommendedKnown: number;
  readonly missingRequiredFieldCodes:
    readonly GoalIntakeFieldCode[];
  readonly clarificationRequiredFieldCodes:
    readonly GoalIntakeFieldCode[];
  readonly questionPlan:
    readonly GoalIntakeQuestionPlanItem[];
};

function priorityFor(params: {
  requirementCode: GoalIntakeRequirementCode;
  statusCode: GoalIntakeFieldStatusCode;
}): GoalIntakeQuestionPlanItem["priorityCode"] {
  if (params.statusCode === "clarification_required") {
    return "blocking";
  }

  if (params.requirementCode === "required") {
    return "required";
  }

  return "recommended";
}

function priorityOrder(
  priorityCode: GoalIntakeQuestionPlanItem["priorityCode"],
): number {
  switch (priorityCode) {
    case "blocking":
      return 0;
    case "required":
      return 1;
    case "recommended":
      return 2;
  }
}

export function evaluateGoalIntakeCompleteness(
  definition: GoalIntakeDefinitionV1,
): GoalIntakeCompleteness {
  const requirements =
    resolveGoalIntakeFieldRequirements(definition);

  let requiredTotal = 0;
  let requiredKnown = 0;
  let requiredPartial = 0;
  let requiredUnknown = 0;
  let requiredClarificationRequired = 0;
  let recommendedTotal = 0;
  let recommendedKnown = 0;

  const missingRequiredFieldCodes: GoalIntakeFieldCode[] = [];
  const clarificationRequiredFieldCodes: GoalIntakeFieldCode[] = [];
  const questionPlan: GoalIntakeQuestionPlanItem[] = [];

  for (const field of GOAL_INTAKE_FIELD_REGISTRY) {
    const fieldCode = field.fieldCode;
    const requirementCode = requirements[fieldCode];
    const statusCode =
      goalIntakeFieldStatus(definition, fieldCode);

    if (requirementCode === "required") {
      requiredTotal += 1;

      if (statusCode === "known") {
        requiredKnown += 1;
      } else {
        missingRequiredFieldCodes.push(fieldCode);

        if (statusCode === "partial") {
          requiredPartial += 1;
        } else if (statusCode === "unknown") {
          requiredUnknown += 1;
        } else {
          requiredClarificationRequired += 1;
        }
      }
    } else {
      recommendedTotal += 1;

      if (statusCode === "known") {
        recommendedKnown += 1;
      }
    }

    if (statusCode === "clarification_required") {
      clarificationRequiredFieldCodes.push(fieldCode);
    }

    if (statusCode !== "known") {
      const registryEntry =
        getGoalIntakeFieldRegistryEntry(fieldCode);

      questionPlan.push({
        fieldCode,
        questionCode: registryEntry.questionCode,
        defaultQuestion: registryEntry.defaultQuestion,
        requirementCode,
        statusCode,
        priorityCode: priorityFor({
          requirementCode,
          statusCode,
        }),
      });
    }
  }

  questionPlan.sort((left, right) => {
    const priorityDelta =
      priorityOrder(left.priorityCode) -
      priorityOrder(right.priorityCode);

    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return GOAL_INTAKE_FIELD_REGISTRY.findIndex(
      (item) => item.fieldCode === left.fieldCode,
    ) -
      GOAL_INTAKE_FIELD_REGISTRY.findIndex(
        (item) => item.fieldCode === right.fieldCode,
      );
  });

  return {
    requiredTotal,
    requiredKnown,
    requiredPartial,
    requiredUnknown,
    requiredClarificationRequired,
    requiredCompletenessPercent:
      requiredTotal === 0
        ? 100
        : Math.floor((100 * requiredKnown) / requiredTotal),
    recommendedTotal,
    recommendedKnown,
    missingRequiredFieldCodes,
    clarificationRequiredFieldCodes,
    questionPlan,
  };
}

export function validateGoalIntakeDefinitionSemantics(
  definition: GoalIntakeDefinitionV1,
): readonly string[] {
  const errors: string[] = [];

  if (!definition.sourceGoalText.trim()) {
    errors.push("GOAL_INTAKE_SOURCE_TEXT_REQUIRED");
  }

  if (
    definition.goal.statusCode === "known" &&
    !definition.goal.normalizedStatement?.trim()
  ) {
    errors.push(
      "GOAL_INTAKE_KNOWN_GOAL_REQUIRES_NORMALIZED_STATEMENT",
    );
  }

  const modules = [...definition.domainModuleCodes];
  if (new Set(modules).size !== modules.length) {
    errors.push("GOAL_INTAKE_DOMAIN_MODULES_MUST_BE_UNIQUE");
  }

  for (const field of GOAL_INTAKE_FIELD_REGISTRY) {
    const value = definition[field.fieldCode];
    const origins = value.evidenceOriginCodes;

    if (
      value.statusCode === "unknown" &&
      (origins.length !== 1 || origins[0] !== "none")
    ) {
      errors.push(
        `GOAL_INTAKE_UNKNOWN_FIELD_REQUIRES_NONE_ORIGIN:${field.fieldCode}`,
      );
    }

    if (
      value.statusCode !== "unknown" &&
      origins.includes("none")
    ) {
      errors.push(
        `GOAL_INTAKE_SUPPORTED_FIELD_CANNOT_USE_NONE_ORIGIN:${field.fieldCode}`,
      );
    }
  }

  return errors;
}

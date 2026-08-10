import type {
  GoalDomainModuleCode,
  GoalFormCode,
  GoalIntakeDefinitionV1,
  GoalIntakeFieldCode,
} from "./goalIntakeTypes";

export type GoalIntakeRequirementCode =
  | "required"
  | "recommended";

export type GoalIntakeFieldRegistryEntry = {
  readonly fieldCode: GoalIntakeFieldCode;
  readonly coreRequirement: GoalIntakeRequirementCode;
  readonly questionCode: string;
  readonly defaultQuestion: string;
};

export const GOAL_INTAKE_FIELD_REGISTRY:
  readonly GoalIntakeFieldRegistryEntry[] = [
  {
    fieldCode: "goal",
    coreRequirement: "required",
    questionCode: "goal_intake.goal",
    defaultQuestion: "What exactly do you want to achieve, change, maintain or avoid?",
  },
  {
    fieldCode: "successDefinition",
    coreRequirement: "required",
    questionCode: "goal_intake.success_definition",
    defaultQuestion: "What would make you say that this goal has been achieved well enough?",
  },
  {
    fieldCode: "currentState",
    coreRequirement: "required",
    questionCode: "goal_intake.current_state",
    defaultQuestion: "What is the relevant situation now?",
  },
  {
    fieldCode: "timeframe",
    coreRequirement: "required",
    questionCode: "goal_intake.timeframe",
    defaultQuestion: "By when, or over what period, should this goal be achieved or maintained?",
  },
  {
    fieldCode: "resources",
    coreRequirement: "recommended",
    questionCode: "goal_intake.resources",
    defaultQuestion: "What useful resources are already available, and what important resources are missing?",
  },
  {
    fieldCode: "constraints",
    coreRequirement: "recommended",
    questionCode: "goal_intake.constraints",
    defaultQuestion: "What limits, obstacles or conditions materially constrain this goal?",
  },
  {
    fieldCode: "motivation",
    coreRequirement: "recommended",
    questionCode: "goal_intake.motivation",
    defaultQuestion: "Why is this goal important to you?",
  },
  {
    fieldCode: "nonNegotiables",
    coreRequirement: "recommended",
    questionCode: "goal_intake.non_negotiables",
    defaultQuestion: "What conditions or boundaries must not be violated while pursuing this goal?",
  },
  {
    fieldCode: "context",
    coreRequirement: "recommended",
    questionCode: "goal_intake.context",
    defaultQuestion: "What other context could materially change how this goal should be understood or planned?",
  },
] as const;

type RequirementOverrides =
  Partial<Record<GoalIntakeFieldCode, GoalIntakeRequirementCode>>;

export const GOAL_FORM_REQUIREMENT_OVERRIDES:
  Readonly<Record<GoalFormCode, RequirementOverrides>> = {
  achieve_outcome: {},
  reach_state: {},
  maintain_state: {
    nonNegotiables: "required",
  },
  execute_project: {
    resources: "required",
    constraints: "required",
  },
  build_routine: {
    constraints: "required",
  },
  make_decision: {
    constraints: "required",
    context: "required",
  },
  explore: {
    context: "required",
  },
  avoid_outcome: {
    constraints: "required",
  },
  unknown: {},
} as const;

export const GOAL_DOMAIN_REQUIREMENT_OVERRIDES:
  Readonly<Record<GoalDomainModuleCode, RequirementOverrides>> = {
  learning: {
    resources: "required",
  },
  health: {
    constraints: "required",
  },
  relationship: {
    context: "required",
    nonNegotiables: "required",
  },
  career_business: {
    resources: "required",
    constraints: "required",
  },
  financial: {
    resources: "required",
    constraints: "required",
  },
  location_transition: {
    resources: "required",
    constraints: "required",
  },
  creative: {},
  other: {},
} as const;

function promoteRequirement(
  current: GoalIntakeRequirementCode,
  incoming: GoalIntakeRequirementCode | undefined,
): GoalIntakeRequirementCode {
  if (current === "required" || incoming !== "required") {
    return current;
  }

  return "required";
}

export function resolveGoalIntakeFieldRequirements(
  definition: Pick<
    GoalIntakeDefinitionV1,
    "goalFormCode" | "domainModuleCodes"
  >,
): Readonly<Record<GoalIntakeFieldCode, GoalIntakeRequirementCode>> {
  const requirements = Object.fromEntries(
    GOAL_INTAKE_FIELD_REGISTRY.map((field) => [
      field.fieldCode,
      field.coreRequirement,
    ]),
  ) as Record<GoalIntakeFieldCode, GoalIntakeRequirementCode>;

  const formOverrides =
    GOAL_FORM_REQUIREMENT_OVERRIDES[definition.goalFormCode];

  for (const field of GOAL_INTAKE_FIELD_REGISTRY) {
    requirements[field.fieldCode] = promoteRequirement(
      requirements[field.fieldCode],
      formOverrides[field.fieldCode],
    );
  }

  for (const moduleCode of definition.domainModuleCodes) {
    const overrides =
      GOAL_DOMAIN_REQUIREMENT_OVERRIDES[moduleCode];

    for (const field of GOAL_INTAKE_FIELD_REGISTRY) {
      requirements[field.fieldCode] = promoteRequirement(
        requirements[field.fieldCode],
        overrides[field.fieldCode],
      );
    }
  }

  return requirements;
}

export function getGoalIntakeFieldRegistryEntry(
  fieldCode: GoalIntakeFieldCode,
): GoalIntakeFieldRegistryEntry {
  const entry = GOAL_INTAKE_FIELD_REGISTRY.find(
    (item) => item.fieldCode === fieldCode,
  );

  if (!entry) {
    throw new Error(
      `GOAL_INTAKE_FIELD_NOT_REGISTERED: ${fieldCode}`,
    );
  }

  return entry;
}

import {
  runAiJsonWithUsageMetadata,
  type RunAiJsonUsageMetadata,
} from "../../../../lib/ai/openaiClient";
import {
  resolveRuntimeMethodologyContext,
  type PublicMethodologyTrace,
} from "../../ai/methodology/methodologyContext.server";
import {
  evaluateGoalIntakeCompleteness,
  validateGoalIntakeDefinitionSemantics,
  type GoalIntakeCompleteness,
} from "./goalIntakeCompleteness";
import type {
  GoalIntakeDefinitionV1,
} from "./goalIntakeTypes";
import type {
  RealityContextSnapshot,
} from "../context/realityContextTypes";

export type GoalIntakeRuntimeResult = {
  readonly definition: GoalIntakeDefinitionV1;
  readonly completeness: GoalIntakeCompleteness;
  readonly methodologyTrace: PublicMethodologyTrace;
  readonly usage: RunAiJsonUsageMetadata;
};

function assertTrustedGoalIntakeSnapshot(
  snapshot: RealityContextSnapshot,
) {
  if (snapshot.snapshotVersion !== 1) {
    throw new Error(
      "GOAL_INTAKE_REALITY_CONTEXT_VERSION_UNSUPPORTED",
    );
  }

  if (snapshot.runtimePurpose !== "goal_intake") {
    throw new Error(
      "GOAL_INTAKE_REALITY_CONTEXT_PURPOSE_MISMATCH",
    );
  }

  if (!snapshot.ownerActorId.trim()) {
    throw new Error(
      "GOAL_INTAKE_REALITY_CONTEXT_ACTOR_REQUIRED",
    );
  }

  if (!snapshot.asOf.trim()) {
    throw new Error(
      "GOAL_INTAKE_REALITY_CONTEXT_AS_OF_REQUIRED",
    );
  }
}

function assertGoalIntakeCanonicalUniqueness(
  definition: GoalIntakeDefinitionV1,
) {
  const unique = (
    code: string,
    values: readonly string[],
  ) => {
    if (new Set(values).size !== values.length) {
      throw new Error(
        `GOAL_INTAKE_CANONICAL_UNIQUENESS_FAILED:${code}`,
      );
    }
  };

  unique(
    "domainModuleCodes",
    definition.domainModuleCodes,
  );

  unique(
    "goal.evidenceOriginCodes",
    definition.goal.evidenceOriginCodes,
  );

  for (const fieldCode of [
    "successDefinition",
    "currentState",
    "timeframe",
    "resources",
    "constraints",
    "motivation",
    "nonNegotiables",
    "context",
  ] as const) {
    unique(
      `${fieldCode}.evidenceOriginCodes`,
      definition[fieldCode].evidenceOriginCodes,
    );
  }
}

function normalizeKnownFieldMissingAspects<
  T extends {
    readonly statusCode: string;
    readonly missingAspects: readonly string[];
  },
>(field: T): T {
  if (
    field.statusCode !== "known" ||
    field.missingAspects.length === 0
  ) {
    return field;
  }

  return {
    ...field,
    missingAspects: [],
  } as T;
}

function normalizeGoalIntakeDefinition(
  definition: GoalIntakeDefinitionV1,
): GoalIntakeDefinitionV1 {
  return {
    ...definition,
    goal: normalizeKnownFieldMissingAspects(
      definition.goal,
    ),
    successDefinition: normalizeKnownFieldMissingAspects(
      definition.successDefinition,
    ),
    currentState: normalizeKnownFieldMissingAspects(
      definition.currentState,
    ),
    timeframe: normalizeKnownFieldMissingAspects(
      definition.timeframe,
    ),
    resources: normalizeKnownFieldMissingAspects(
      definition.resources,
    ),
    constraints: normalizeKnownFieldMissingAspects(
      definition.constraints,
    ),
    motivation: normalizeKnownFieldMissingAspects(
      definition.motivation,
    ),
    nonNegotiables: normalizeKnownFieldMissingAspects(
      definition.nonNegotiables,
    ),
    context: normalizeKnownFieldMissingAspects(
      definition.context,
    ),
  };
}

export async function runGoalIntakeModelPreview(params: {
  sourceGoalText: string;
  locale?: unknown;
  trustedRealityContextSnapshot: RealityContextSnapshot;
  model?: string;
  maxOutputTokens?: number;
}): Promise<GoalIntakeRuntimeResult> {
  const sourceGoalText = params.sourceGoalText.trim();

  if (!sourceGoalText) {
    throw new Error("GOAL_INTAKE_SOURCE_TEXT_REQUIRED");
  }

  assertTrustedGoalIntakeSnapshot(
    params.trustedRealityContextSnapshot,
  );

  const methodology = await resolveRuntimeMethodologyContext({
    runtimeCode: "goal_intake",
    locale: params.locale,
    deterministicRules: [
      {
        registryCode: "goal_intake_registry",
        ruleCode: "goal_intake_v1",
        version: 1,
      },
      {
        registryCode: "reality_context_policy",
        ruleCode: "goal_intake",
        version: 1,
      },
    ],
  });

  const modelPayload = {
    task: "normalize_goal_intake",
    sourceGoalText,
    trustedRealityContextSnapshot:
      params.trustedRealityContextSnapshot,
    personalProcessingGuidance:
      methodology.actorInstructionText,
    fieldStatusSemantics: {
      known:
        "The intake field itself can be stated reliably from explicit current-message data or trusted context. Do not require every later planning refinement.",
      partial:
        "A material part of this intake field is missing, so the field itself cannot yet be stated adequately.",
      unknown:
        "No supported value is available for the field.",
      clarification_required:
        "Ambiguity prevents a reliable normalized value.",
    },
    missingAspectsPolicy:
      "List only material blockers for the intake field itself. Do not list optional downstream planning refinements as missingAspects.",
    dateResolutionPolicy:
      "If a day/month deadline has no year and the trusted snapshot asOf makes the next occurrence unambiguous and future-directed, resolve that upcoming occurrence deterministically and use deterministic_derivation evidence.",
    priority: [
      "runtime_invariants",
      "explicit_current_message",
      "trusted_reality_context_snapshot",
      "active_system_instructions",
      "personal_processing_guidance_for_missing_context_only",
    ],
    noWrite: true,
  };

  const result =
    await runAiJsonWithUsageMetadata<GoalIntakeDefinitionV1>({
      system: methodology.systemPrompt,
      user: modelPayload,
      model: params.model,
      maxOutputTokens: params.maxOutputTokens ?? 1600,
      structuredOutput: methodology.structuredOutput,
    });

  const normalizedDefinition =
    normalizeGoalIntakeDefinition(result.parsed);

  if (normalizedDefinition.sourceGoalText !== sourceGoalText) {
    throw new Error(
      "GOAL_INTAKE_SOURCE_TEXT_NOT_PRESERVED",
    );
  }

  assertGoalIntakeCanonicalUniqueness(
    normalizedDefinition,
  );

  const semanticErrors =
    validateGoalIntakeDefinitionSemantics(
      normalizedDefinition,
    );

  if (semanticErrors.length > 0) {
    throw new Error(
      `GOAL_INTAKE_SEMANTIC_VALIDATION_FAILED: ${semanticErrors.join(",")}`,
    );
  }

  return {
    definition: normalizedDefinition,
    completeness:
      evaluateGoalIntakeCompleteness(
        normalizedDefinition,
      ),
    methodologyTrace: methodology.methodologyTrace,
    usage: result.usage,
  };
}

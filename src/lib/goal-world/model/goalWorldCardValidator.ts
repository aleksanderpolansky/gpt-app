import type {
  GoalWorldCardV1,
  GoalWorldObjective,
} from "./goalWorldTypes";

function duplicates(values: readonly string[]) {
  const seen = new Set<string>();
  const duplicatesFound = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicatesFound.add(value);
    } else {
      seen.add(value);
    }
  }

  return [...duplicatesFound];
}

function hasObjectiveCycle(
  objectives: readonly GoalWorldObjective[],
) {
  const byId = new Map(
    objectives.map(
      (objective) =>
        [objective.objectiveId, objective] as const,
    ),
  );

  for (const objective of objectives) {
    const path = new Set<string>();
    let current:
      GoalWorldObjective | undefined = objective;

    while (current) {
      if (path.has(current.objectiveId)) {
        return true;
      }

      path.add(current.objectiveId);

      if (current.parentObjectiveId === null) {
        break;
      }

      current = byId.get(
        current.parentObjectiveId,
      );
    }
  }

  return false;
}

export function validateGoalWorldCardV1(
  card: GoalWorldCardV1,
): readonly string[] {
  const errors: string[] = [];

  if (card.schemaVersion !== 1) {
    errors.push("GOAL_WORLD_SCHEMA_VERSION_INVALID");
  }

  if (
    card.identity.worldId !== card.revision.worldId
  ) {
    errors.push("GOAL_WORLD_IDENTITY_REVISION_MISMATCH");
  }

  if (
    card.identity.currentRevisionId !==
    card.revision.revisionId
  ) {
    errors.push("GOAL_WORLD_CURRENT_REVISION_ID_MISMATCH");
  }

  if (
    card.identity.currentRevisionNumber !==
    card.revision.revisionNumber
  ) {
    errors.push(
      "GOAL_WORLD_CURRENT_REVISION_NUMBER_MISMATCH",
    );
  }

  if (card.revision.revisionNumber < 1) {
    errors.push("GOAL_WORLD_REVISION_NUMBER_INVALID");
  }

  if (
    card.revision.goalDefinitionRef
      .sourceGoalStatementId !==
    card.revision.sourceGoalStatement.statementId
  ) {
    errors.push(
      "GOAL_WORLD_DEFINITION_STATEMENT_MISMATCH",
    );
  }

  const objectiveIds =
    card.revision.objectives.map(
      (objective) => objective.objectiveId,
    );

  for (const duplicate of duplicates(objectiveIds)) {
    errors.push(
      `GOAL_WORLD_OBJECTIVE_ID_DUPLICATE:${duplicate}`,
    );
  }

  const objectiveById = new Map(
    card.revision.objectives.map(
      (objective) =>
        [objective.objectiveId, objective] as const,
    ),
  );

  const terminalObjectives =
    card.revision.objectives.filter(
      (objective) =>
        objective.objectiveRoleCode === "terminal",
    );

  if (terminalObjectives.length !== 1) {
    errors.push(
      "GOAL_WORLD_EXACTLY_ONE_TERMINAL_OBJECTIVE_REQUIRED",
    );
  }

  const terminal =
    terminalObjectives.length === 1
      ? terminalObjectives[0]
      : null;

  if (
    !terminal ||
    terminal.objectiveId !==
      card.revision.terminalObjectiveId
  ) {
    errors.push(
      "GOAL_WORLD_TERMINAL_OBJECTIVE_POINTER_INVALID",
    );
  }

  if (terminal) {
    if (terminal.parentObjectiveId !== null) {
      errors.push(
        "GOAL_WORLD_TERMINAL_OBJECTIVE_PARENT_MUST_BE_NULL",
      );
    }

    if (
      terminal.originCode !==
      "actor_declared_terminal"
    ) {
      errors.push(
        "GOAL_WORLD_TERMINAL_OBJECTIVE_MUST_BE_ACTOR_DECLARED",
      );
    }
  }

  for (const objective of card.revision.objectives) {
    if (
      objective.objectiveRoleCode !== "terminal" &&
      objective.parentObjectiveId === null
    ) {
      errors.push(
        `GOAL_WORLD_NON_TERMINAL_PARENT_REQUIRED:${objective.objectiveId}`,
      );
      continue;
    }

    if (
      objective.parentObjectiveId !== null &&
      !objectiveById.has(
        objective.parentObjectiveId,
      )
    ) {
      errors.push(
        `GOAL_WORLD_OBJECTIVE_PARENT_UNKNOWN:${objective.objectiveId}`,
      );
    }
  }

  if (
    hasObjectiveCycle(card.revision.objectives)
  ) {
    errors.push("GOAL_WORLD_OBJECTIVE_CYCLE");
  }

  for (
    const membership of
    card.revision.objectMemberships
  ) {
    if (membership.roleCodes.length === 0) {
      errors.push(
        `GOAL_WORLD_MEMBERSHIP_ROLE_REQUIRED:${membership.valueObjectId}`,
      );
    }

    for (
      const objectiveId of
      membership.objectiveIds
    ) {
      if (!objectiveById.has(objectiveId)) {
        errors.push(
          `GOAL_WORLD_MEMBERSHIP_OBJECTIVE_UNKNOWN:${membership.valueObjectId}:${objectiveId}`,
        );
      }
    }
  }

  const criterionIds =
    card.revision.targetCriteria.map(
      (criterion) => criterion.criterionId,
    );

  for (const duplicate of duplicates(criterionIds)) {
    errors.push(
      `GOAL_WORLD_CRITERION_ID_DUPLICATE:${duplicate}`,
    );
  }

  for (
    const criterion of
    card.revision.targetCriteria
  ) {
    if (
      !objectiveById.has(
        criterion.objectiveId,
      )
    ) {
      errors.push(
        `GOAL_WORLD_CRITERION_OBJECTIVE_UNKNOWN:${criterion.criterionId}`,
      );
    }

    if (
      criterion.comparatorCode === "range" &&
      criterion.targetValueUpper === null
    ) {
      errors.push(
        `GOAL_WORLD_RANGE_UPPER_REQUIRED:${criterion.criterionId}`,
      );
    }
  }

  for (
    const hypothesis of
    card.revision.goalHypotheses
  ) {
    if (
      hypothesis.statusCode !== "proposal_only"
    ) {
      errors.push(
        `GOAL_WORLD_HYPOTHESIS_MUST_BE_PROPOSAL_ONLY:${hypothesis.hypothesisId}`,
      );
    }
  }

  return errors;
}

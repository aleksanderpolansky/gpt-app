import { supabase } from "../../../../lib/supabase";

import type {
  GoalWorldNormalizedRevisionWriteV1,
} from "./goalWorldApiTypes";

type AnyRecord = Record<string, any>;

export class GoalWorldPersistenceError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(
    code: string,
    message: string,
    status = 500,
  ) {
    super(message);
    this.name = "GoalWorldPersistenceError";
    this.code = code;
    this.status = status;
  }
}

function asArray(
  value: unknown,
): AnyRecord[] {
  return Array.isArray(value)
    ? (value as AnyRecord[])
    : [];
}

function toDbPayload(
  input: GoalWorldNormalizedRevisionWriteV1,
) {
  return {
    sourceGoalText:
      input.sourceGoalText,
    goalDefinitionJson:
      input.goalDefinitionJson,
    methodologyTraceJson:
      input.methodologyTraceJson,
    completenessPercent:
      input.completenessPercent,
    lifecycleStatusCode:
      input.lifecycleStatusCode,
    revisionReasonCode:
      input.revisionReasonCode,
    unknownCodes:
      input.unknownCodes,
    protocolRefs:
      input.protocolRefs,
    objectives:
      input.objectives,
    objectMemberships:
      input.objectMemberships,
    targetCriteria:
      input.targetCriteria,
    goalHypotheses:
      input.goalHypotheses,
  };
}

function mapRpcError(
  error: AnyRecord,
): GoalWorldPersistenceError {
  const message =
    typeof error?.message === "string"
      ? error.message
      : "Goal World persistence failed.";

  if (
    message.includes(
      "P7_GOAL_WORLD_EXPECTED_REVISION_MISMATCH",
    )
  ) {
    return new GoalWorldPersistenceError(
      "GOAL_WORLD_REVISION_CONFLICT",
      message,
      409,
    );
  }

  if (
    message.includes(
      "P7_GOAL_WORLD_NOT_FOUND_OR_NOT_OWNED",
    )
  ) {
    return new GoalWorldPersistenceError(
      "GOAL_WORLD_NOT_FOUND",
      "Goal World not found.",
      404,
    );
  }

  if (
    message.includes(
      "P7_VALUE_OBJECT_NOT_ACCESSIBLE",
    )
  ) {
    return new GoalWorldPersistenceError(
      "GOAL_WORLD_VALUE_OBJECT_NOT_ACCESSIBLE",
      message,
      403,
    );
  }

  if (
    error?.code === "23514" ||
    error?.code === "23503" ||
    error?.code === "23505" ||
    error?.code === "22P02"
  ) {
    return new GoalWorldPersistenceError(
      "GOAL_WORLD_PERSISTENCE_REJECTED",
      message,
      400,
    );
  }

  return new GoalWorldPersistenceError(
    "GOAL_WORLD_PERSISTENCE_FAILED",
    message,
    500,
  );
}

export async function createGoalWorldForActor(
  actorId: string,
  input: GoalWorldNormalizedRevisionWriteV1,
) {
  const db = supabase as any;

  const { data, error } =
    await db.rpc(
      "create_goal_world_v1",
      {
        p_owner_actor_id: actorId,
        p_payload: toDbPayload(input),
      },
    );

  if (error) {
    throw mapRpcError(error);
  }

  return data as {
    worldId: string;
    revisionId: string;
    revisionNumber: number;
  };
}

export async function reviseGoalWorldForActor(
  actorId: string,
  worldId: string,
  expectedCurrentRevisionNumber: number,
  input: GoalWorldNormalizedRevisionWriteV1,
) {
  const db = supabase as any;

  const { data, error } =
    await db.rpc(
      "revise_goal_world_v1",
      {
        p_owner_actor_id: actorId,
        p_goal_world_id: worldId,
        p_expected_current_revision_number:
          expectedCurrentRevisionNumber,
        p_payload: toDbPayload(input),
      },
    );

  if (error) {
    throw mapRpcError(error);
  }

  return data as {
    worldId: string;
    revisionId: string;
    revisionNumber: number;
  };
}

export async function listGoalWorldsForActor(
  actorId: string,
) {
  const db = supabase as any;

  const { data, error } = await db
    .from("goal_worlds")
    .select(
      [
        "id",
        "lifecycle_status_code",
        "current_revision_id",
        "current_revision_number",
        "created_at",
        "updated_at",
      ].join(","),
    )
    .eq("owner_actor_id", actorId)
    .order("updated_at", {
      ascending: false,
    })
    .limit(100);

  if (error) {
    throw mapRpcError(error);
  }

  return asArray(data).map((row) => ({
    worldId: row.id,
    lifecycleStatusCode:
      row.lifecycle_status_code,
    currentRevisionId:
      row.current_revision_id,
    currentRevisionNumber:
      row.current_revision_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

async function requireOwnedWorld(
  actorId: string,
  worldId: string,
): Promise<AnyRecord> {
  const db = supabase as any;

  const { data, error } = await db
    .from("goal_worlds")
    .select(
      [
        "id",
        "owner_actor_id",
        "lifecycle_status_code",
        "current_revision_id",
        "current_revision_number",
        "created_at",
        "updated_at",
      ].join(","),
    )
    .eq("id", worldId)
    .eq("owner_actor_id", actorId)
    .maybeSingle();

  if (error) {
    throw mapRpcError(error);
  }

  if (!data) {
    throw new GoalWorldPersistenceError(
      "GOAL_WORLD_NOT_FOUND",
      "Goal World not found.",
      404,
    );
  }

  return data as AnyRecord;
}

export async function readGoalWorldForActor(
  actorId: string,
  worldId: string,
) {
  const db = supabase as any;
  const world =
    await requireOwnedWorld(
      actorId,
      worldId,
    );

  if (!world.current_revision_id) {
    return {
      projectionVersion: 1,
      identity: {
        worldId: world.id,
        actorId,
        lifecycleStatusCode:
          world.lifecycle_status_code,
        currentRevisionId: null,
        currentRevisionNumber: 0,
        createdAt: world.created_at,
        updatedAt: world.updated_at,
      },
      revision: null,
      currentRealityProjectionIncluded:
        false,
    };
  }

  const [
    revisionResult,
    objectivesResult,
    membershipsResult,
    criteriaResult,
    hypothesesResult,
  ] = await Promise.all([
    db
      .from("goal_world_revisions")
      .select(
        [
          "id",
          "goal_world_id",
          "revision_number",
          "previous_revision_id",
          "source_goal_statement_id",
          "goal_definition_revision_id",
          "revision_reason_code",
          "unknown_codes",
          "protocol_refs_json",
          "created_at",
        ].join(","),
      )
      .eq(
        "id",
        world.current_revision_id,
      )
      .eq(
        "owner_actor_id",
        actorId,
      )
      .maybeSingle(),

    db
      .from("goal_world_objectives")
      .select(
        [
          "id",
          "objective_role_code",
          "parent_objective_id",
          "primary_target_value_object_id",
          "label",
          "origin_code",
          "created_at",
        ].join(","),
      )
      .eq(
        "goal_world_revision_id",
        world.current_revision_id,
      )
      .eq("owner_actor_id", actorId)
      .order("created_at", {
        ascending: true,
      }),

    db
      .from("goal_world_object_memberships")
      .select(
        [
          "id",
          "value_object_id",
          "role_codes",
          "orientation_code",
          "objective_ids",
          "note",
          "created_at",
        ].join(","),
      )
      .eq(
        "goal_world_revision_id",
        world.current_revision_id,
      )
      .eq("owner_actor_id", actorId)
      .order("created_at", {
        ascending: true,
      }),

    db
      .from("goal_world_target_criteria")
      .select(
        [
          "id",
          "objective_id",
          "value_object_id",
          "parameter_code",
          "comparator_code",
          "target_value_json",
          "target_value_upper_json",
          "unit_code",
          "definition_text",
          "rule_ref_json",
          "created_at",
        ].join(","),
      )
      .eq(
        "goal_world_revision_id",
        world.current_revision_id,
      )
      .eq("owner_actor_id", actorId)
      .order("created_at", {
        ascending: true,
      }),

    db
      .from("goal_world_goal_hypotheses")
      .select(
        [
          "id",
          "summary",
          "status_code",
          "evidence_refs_json",
          "proposed_at",
        ].join(","),
      )
      .eq(
        "goal_world_revision_id",
        world.current_revision_id,
      )
      .eq("owner_actor_id", actorId)
      .order("proposed_at", {
        ascending: true,
      }),
  ]);

  for (const result of [
    revisionResult,
    objectivesResult,
    membershipsResult,
    criteriaResult,
    hypothesesResult,
  ]) {
    if (result.error) {
      throw mapRpcError(
        result.error,
      );
    }
  }

  const revision =
    revisionResult.data as
      | AnyRecord
      | null;

  if (!revision) {
    throw new GoalWorldPersistenceError(
      "GOAL_WORLD_CURRENT_REVISION_MISSING",
      "Current Goal World revision is missing.",
      500,
    );
  }

  const [
    statementResult,
    definitionResult,
  ] = await Promise.all([
    db
      .from("goal_world_goal_statements")
      .select(
        "id, exact_text, recorded_at",
      )
      .eq(
        "id",
        revision.source_goal_statement_id,
      )
      .eq("owner_actor_id", actorId)
      .maybeSingle(),

    db
      .from("goal_world_goal_definitions")
      .select(
        [
          "id",
          "source_goal_statement_id",
          "schema_version",
          "definition_json",
          "completeness_percent",
          "methodology_trace_json",
          "created_at",
        ].join(","),
      )
      .eq(
        "id",
        revision.goal_definition_revision_id,
      )
      .eq("owner_actor_id", actorId)
      .maybeSingle(),
  ]);

  if (statementResult.error) {
    throw mapRpcError(
      statementResult.error,
    );
  }

  if (definitionResult.error) {
    throw mapRpcError(
      definitionResult.error,
    );
  }

  if (
    !statementResult.data ||
    !definitionResult.data
  ) {
    throw new GoalWorldPersistenceError(
      "GOAL_WORLD_REVISION_COMPONENT_MISSING",
      "Current Goal World revision statement/definition is missing.",
      500,
    );
  }

  const objectives =
    asArray(objectivesResult.data);

  const terminal =
    objectives.find(
      (item) =>
        item.objective_role_code ===
        "terminal",
    );

  if (!terminal) {
    throw new GoalWorldPersistenceError(
      "GOAL_WORLD_TERMINAL_OBJECTIVE_MISSING",
      "Current Goal World revision has no terminal objective.",
      500,
    );
  }

  return {
    projectionVersion: 1,
    identity: {
      worldId: world.id,
      actorId,
      lifecycleStatusCode:
        world.lifecycle_status_code,
      currentRevisionId:
        world.current_revision_id,
      currentRevisionNumber:
        world.current_revision_number,
      createdAt: world.created_at,
      updatedAt: world.updated_at,
    },
    revision: {
      revisionId: revision.id,
      worldId: revision.goal_world_id,
      revisionNumber:
        revision.revision_number,
      previousRevisionId:
        revision.previous_revision_id,
      revisionReasonCode:
        revision.revision_reason_code,
      sourceGoalStatement: {
        statementId:
          statementResult.data.id,
        exactText:
          statementResult.data.exact_text,
        recordedAt:
          statementResult.data.recorded_at,
      },
      goalDefinition: {
        goalDefinitionRevisionId:
          definitionResult.data.id,
        sourceGoalStatementId:
          definitionResult.data
            .source_goal_statement_id,
        schemaVersion:
          definitionResult.data
            .schema_version,
        completenessPercent:
          definitionResult.data
            .completeness_percent,
        definitionJson:
          definitionResult.data
            .definition_json,
        methodologyTraceJson:
          definitionResult.data
            .methodology_trace_json,
        createdAt:
          definitionResult.data
            .created_at,
      },
      terminalObjectiveId:
        terminal.id,
      objectives: objectives.map(
        (item) => ({
          objectiveId: item.id,
          objectiveRoleCode:
            item.objective_role_code,
          parentObjectiveId:
            item.parent_objective_id,
          primaryTargetValueObjectId:
            item.primary_target_value_object_id,
          label: item.label,
          originCode:
            item.origin_code,
        }),
      ),
      objectMemberships:
        asArray(
          membershipsResult.data,
        ).map((item) => ({
          membershipId: item.id,
          valueObjectId:
            item.value_object_id,
          roleCodes:
            item.role_codes ?? [],
          orientationCode:
            item.orientation_code,
          objectiveIds:
            item.objective_ids ?? [],
          note: item.note,
        })),
      targetCriteria:
        asArray(
          criteriaResult.data,
        ).map((item) => ({
          criterionId: item.id,
          objectiveId:
            item.objective_id,
          valueObjectId:
            item.value_object_id,
          parameterCode:
            item.parameter_code,
          comparatorCode:
            item.comparator_code,
          targetValue:
            item.target_value_json,
          targetValueUpper:
            item.target_value_upper_json,
          unitCode:
            item.unit_code,
          definitionText:
            item.definition_text,
          ruleRef:
            item.rule_ref_json,
        })),
      goalHypotheses:
        asArray(
          hypothesesResult.data,
        ).map((item) => ({
          hypothesisId: item.id,
          summary: item.summary,
          statusCode:
            item.status_code,
          evidenceRefs:
            item.evidence_refs_json ?? [],
          proposedAt:
            item.proposed_at,
        })),
      unknownCodes:
        revision.unknown_codes ?? [],
      protocolRefs:
        revision.protocol_refs_json ?? [],
      createdAt:
        revision.created_at,
    },
    currentRealityProjectionIncluded:
      false,
  };
}

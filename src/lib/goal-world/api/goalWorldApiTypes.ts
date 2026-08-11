import { randomUUID } from "node:crypto";

import {
  GOAL_WORLD_LIFECYCLE_STATUS_CODES,
  GOAL_WORLD_OBJECTIVE_ORIGIN_CODES,
  GOAL_WORLD_OBJECTIVE_ROLE_CODES,
  GOAL_WORLD_OBJECT_ROLE_CODES,
  GOAL_WORLD_ORIENTATION_CODES,
  GOAL_WORLD_REVISION_REASON_CODES,
  GOAL_WORLD_TARGET_COMPARATOR_CODES,
  type GoalWorldLifecycleStatusCode,
  type GoalWorldObjectiveOriginCode,
  type GoalWorldObjectiveRoleCode,
  type GoalWorldObjectRoleCode,
  type GoalWorldOrientationCode,
  type GoalWorldRevisionReasonCode,
  type GoalWorldTargetComparatorCode,
  type GoalWorldTargetValue,
} from "../model/goalWorldTypes";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_OBJECTIVES = 250;
const MAX_MEMBERSHIPS = 500;
const MAX_TARGET_CRITERIA = 500;
const MAX_HYPOTHESES = 100;
const MAX_UNKNOWN_CODES = 200;
const MAX_PROTOCOL_REFS = 100;

export class GoalWorldInputError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(
    code: string,
    message: string,
    status = 400,
  ) {
    super(message);
    this.name = "GoalWorldInputError";
    this.code = code;
    this.status = status;
  }
}

type JsonRecord = Record<string, unknown>;

export type GoalWorldNormalizedObjectiveV1 = {
  readonly objectiveId: string;
  readonly objectiveRoleCode: GoalWorldObjectiveRoleCode;
  readonly parentObjectiveId: string | null;
  readonly primaryTargetValueObjectId: string | null;
  readonly label: string;
  readonly originCode: GoalWorldObjectiveOriginCode;
};

export type GoalWorldNormalizedMembershipV1 = {
  readonly valueObjectId: string;
  readonly roleCodes: readonly GoalWorldObjectRoleCode[];
  readonly orientationCode: GoalWorldOrientationCode;
  readonly objectiveIds: readonly string[];
  readonly note: string | null;
};

export type GoalWorldNormalizedTargetCriterionV1 = {
  readonly criterionId: string;
  readonly objectiveId: string;
  readonly valueObjectId: string;
  readonly parameterCode: string | null;
  readonly comparatorCode: GoalWorldTargetComparatorCode;
  readonly targetValue: GoalWorldTargetValue;
  readonly targetValueUpper: GoalWorldTargetValue;
  readonly unitCode: string | null;
  readonly definitionText: string;
  readonly ruleRef: {
    readonly entityType: string;
    readonly entityId: string;
  } | null;
};

export type GoalWorldNormalizedHypothesisV1 = {
  readonly hypothesisId: string;
  readonly summary: string;
  readonly statusCode: "proposal_only";
  readonly evidenceRefs: readonly {
    readonly entityType: string;
    readonly entityId: string;
  }[];
};

export type GoalWorldNormalizedProtocolRefV1 = {
  readonly protocolCode: string;
  readonly version: number;
  readonly contentHash: string | null;
};

export type GoalWorldNormalizedRevisionWriteV1 = {
  readonly sourceGoalText: string;
  readonly goalDefinitionJson: JsonRecord;
  readonly methodologyTraceJson: JsonRecord | null;
  readonly completenessPercent: number;
  readonly lifecycleStatusCode: GoalWorldLifecycleStatusCode | null;
  readonly revisionReasonCode: GoalWorldRevisionReasonCode;
  readonly unknownCodes: readonly string[];
  readonly protocolRefs: readonly GoalWorldNormalizedProtocolRefV1[];
  readonly objectives: readonly GoalWorldNormalizedObjectiveV1[];
  readonly objectMemberships:
    readonly GoalWorldNormalizedMembershipV1[];
  readonly targetCriteria:
    readonly GoalWorldNormalizedTargetCriterionV1[];
  readonly goalHypotheses:
    readonly GoalWorldNormalizedHypothesisV1[];
};

function isRecord(value: unknown): value is JsonRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function requireRecord(
  value: unknown,
  code: string,
): JsonRecord {
  if (!isRecord(value)) {
    throw new GoalWorldInputError(
      code,
      "Expected an object.",
    );
  }

  return value;
}

function requireArray(
  value: unknown,
  code: string,
  maximumLength: number,
): unknown[] {
  if (!Array.isArray(value)) {
    throw new GoalWorldInputError(
      code,
      "Expected an array.",
    );
  }

  if (value.length > maximumLength) {
    throw new GoalWorldInputError(
      `${code}_TOO_LARGE`,
      `Array exceeds maximum length ${maximumLength}.`,
    );
  }

  return value;
}

function requireText(
  value: unknown,
  code: string,
  maximumLength: number,
): string {
  if (typeof value !== "string") {
    throw new GoalWorldInputError(
      code,
      "Expected text.",
    );
  }

  const result = value.trim();

  if (!result || result.length > maximumLength) {
    throw new GoalWorldInputError(
      code,
      `Text must contain 1..${maximumLength} characters.`,
    );
  }

  return result;
}

function optionalText(
  value: unknown,
  code: string,
  maximumLength: number,
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return requireText(
    value,
    code,
    maximumLength,
  );
}

function requireInteger(
  value: unknown,
  code: string,
  minimum: number,
  maximum: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new GoalWorldInputError(
      code,
      `Expected integer ${minimum}..${maximum}.`,
    );
  }

  return value;
}

function requireEnum<T extends string>(
  value: unknown,
  values: readonly T[],
  code: string,
): T {
  if (
    typeof value !== "string" ||
    !(values as readonly string[]).includes(value)
  ) {
    throw new GoalWorldInputError(
      code,
      `Unsupported code: ${String(value)}`,
    );
  }

  return value as T;
}

function optionalEnum<T extends string>(
  value: unknown,
  values: readonly T[],
  code: string,
): T | null {
  if (value === null || value === undefined) {
    return null;
  }

  return requireEnum(
    value,
    values,
    code,
  );
}

function requireUuid(
  value: unknown,
  code: string,
): string {
  const result = requireText(
    value,
    code,
    80,
  );

  if (!UUID_RE.test(result)) {
    throw new GoalWorldInputError(
      code,
      "Expected UUID.",
    );
  }

  return result;
}

export function isGoalWorldUuid(
  value: string,
): boolean {
  return UUID_RE.test(value);
}

function requireTargetValue(
  value: unknown,
  code: string,
): GoalWorldTargetValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    if (
      typeof value === "number" &&
      !Number.isFinite(value)
    ) {
      throw new GoalWorldInputError(
        code,
        "Numeric target must be finite.",
      );
    }

    return value;
  }

  throw new GoalWorldInputError(
    code,
    "Target value must be string, number, boolean or null.",
  );
}

function uniqueStrings(
  values: readonly string[],
  code: string,
): readonly string[] {
  if (new Set(values).size !== values.length) {
    throw new GoalWorldInputError(
      code,
      "Duplicate values are not allowed.",
    );
  }

  return values;
}

function parseEntityRef(
  value: unknown,
  code: string,
): {
  readonly entityType: string;
  readonly entityId: string;
} {
  const record = requireRecord(
    value,
    code,
  );

  return {
    entityType: requireText(
      record.entityType,
      `${code}_ENTITY_TYPE`,
      120,
    ),
    entityId: requireText(
      record.entityId,
      `${code}_ENTITY_ID`,
      240,
    ),
  };
}

function assertObjectiveTree(
  objectives: readonly {
    readonly clientId: string;
    readonly objectiveRoleCode:
      GoalWorldObjectiveRoleCode;
    readonly parentClientId: string | null;
    readonly originCode:
      GoalWorldObjectiveOriginCode;
  }[],
) {
  const byId = new Map(
    objectives.map((item) => [
      item.clientId,
      item,
    ]),
  );

  const terminals = objectives.filter(
    (item) =>
      item.objectiveRoleCode === "terminal",
  );

  if (terminals.length !== 1) {
    throw new GoalWorldInputError(
      "GOAL_WORLD_EXACTLY_ONE_TERMINAL_REQUIRED",
      "Exactly one terminal objective is required.",
    );
  }

  const terminal = terminals[0];

  if (
    terminal.parentClientId !== null ||
    terminal.originCode !==
      "actor_declared_terminal"
  ) {
    throw new GoalWorldInputError(
      "GOAL_WORLD_TERMINAL_MUST_BE_ACTOR_DECLARED",
      "Terminal objective must be actor-declared and have no parent.",
    );
  }

  for (const item of objectives) {
    if (item.objectiveRoleCode === "terminal") {
      continue;
    }

    if (
      item.originCode ===
        "actor_declared_terminal"
    ) {
      throw new GoalWorldInputError(
        "GOAL_WORLD_NONTERMINAL_ACTOR_DECLARED_TERMINAL_FORBIDDEN",
        "Only the terminal objective may use actor_declared_terminal.",
      );
    }

    if (
      !item.parentClientId ||
      !byId.has(item.parentClientId)
    ) {
      throw new GoalWorldInputError(
        "GOAL_WORLD_OBJECTIVE_PARENT_REQUIRED",
        `Unknown parent for objective ${item.clientId}.`,
      );
    }
  }

  for (const start of objectives) {
    const seen = new Set<string>();
    let cursor:
      | typeof start
      | undefined = start;

    while (cursor?.parentClientId) {
      if (seen.has(cursor.clientId)) {
        throw new GoalWorldInputError(
          "GOAL_WORLD_OBJECTIVE_CYCLE",
          "Objective hierarchy contains a cycle.",
        );
      }

      seen.add(cursor.clientId);
      cursor = byId.get(
        cursor.parentClientId,
      );

      if (!cursor) {
        break;
      }
    }
  }
}

function parseLifecycle(
  body: JsonRecord,
): GoalWorldLifecycleStatusCode | null {
  return optionalEnum(
    body.lifecycleStatusCode,
    GOAL_WORLD_LIFECYCLE_STATUS_CODES,
    "GOAL_WORLD_LIFECYCLE_STATUS_INVALID",
  );
}

function parseUnknownCodes(
  value: unknown,
): readonly string[] {
  if (value === null || value === undefined) {
    return [];
  }

  const raw = requireArray(
    value,
    "GOAL_WORLD_UNKNOWN_CODES_INVALID",
    MAX_UNKNOWN_CODES,
  );

  return uniqueStrings(
    raw.map((item) =>
      requireText(
        item,
        "GOAL_WORLD_UNKNOWN_CODE_INVALID",
        160,
      ),
    ),
    "GOAL_WORLD_UNKNOWN_CODES_DUPLICATE",
  );
}

function parseProtocolRefs(
  value: unknown,
): readonly GoalWorldNormalizedProtocolRefV1[] {
  if (value === null || value === undefined) {
    return [];
  }

  return requireArray(
    value,
    "GOAL_WORLD_PROTOCOL_REFS_INVALID",
    MAX_PROTOCOL_REFS,
  ).map((item) => {
    const record = requireRecord(
      item,
      "GOAL_WORLD_PROTOCOL_REF_INVALID",
    );

    return {
      protocolCode: requireText(
        record.protocolCode,
        "GOAL_WORLD_PROTOCOL_CODE_INVALID",
        160,
      ),
      version: requireInteger(
        record.version,
        "GOAL_WORLD_PROTOCOL_VERSION_INVALID",
        1,
        1_000_000,
      ),
      contentHash: optionalText(
        record.contentHash,
        "GOAL_WORLD_PROTOCOL_HASH_INVALID",
        512,
      ),
    };
  });
}

export function normalizeGoalWorldRevisionWriteInput(
  bodyValue: unknown,
  mode: "create" | "revise",
): GoalWorldNormalizedRevisionWriteV1 {
  const body = requireRecord(
    bodyValue,
    "GOAL_WORLD_BODY_INVALID",
  );

  const sourceGoalText = requireText(
    body.sourceGoalText,
    "GOAL_WORLD_SOURCE_TEXT_REQUIRED",
    8_000,
  );

  const goalDefinitionJson =
    requireRecord(
      body.goalDefinitionJson,
      "GOAL_WORLD_GOAL_DEFINITION_REQUIRED",
    );

  if (
    goalDefinitionJson.sourceGoalText !==
      sourceGoalText
  ) {
    throw new GoalWorldInputError(
      "GOAL_WORLD_GOAL_DEFINITION_SOURCE_TEXT_MISMATCH",
      "goalDefinitionJson.sourceGoalText must exactly match sourceGoalText.",
    );
  }

  const methodologyTraceJson =
    body.methodologyTraceJson === null ||
    body.methodologyTraceJson === undefined
      ? null
      : requireRecord(
          body.methodologyTraceJson,
          "GOAL_WORLD_METHODOLOGY_TRACE_INVALID",
        );

  const completenessPercent =
    requireInteger(
      body.completenessPercent,
      "GOAL_WORLD_COMPLETENESS_INVALID",
      0,
      100,
    );

  const revisionReasonCode =
    mode === "create"
      ? "initial_definition"
      : requireEnum(
          body.revisionReasonCode,
          GOAL_WORLD_REVISION_REASON_CODES.filter(
            (code) =>
              code !== "initial_definition",
          ),
          "GOAL_WORLD_REVISION_REASON_INVALID",
        );

  const rawObjectives = requireArray(
    body.objectives,
    "GOAL_WORLD_OBJECTIVES_INVALID",
    MAX_OBJECTIVES,
  );

  if (rawObjectives.length === 0) {
    throw new GoalWorldInputError(
      "GOAL_WORLD_OBJECTIVES_REQUIRED",
      "At least one objective is required.",
    );
  }

  const parsedObjectives = rawObjectives.map(
    (item) => {
      const record = requireRecord(
        item,
        "GOAL_WORLD_OBJECTIVE_INVALID",
      );

      return {
        clientId: requireText(
          record.clientId,
          "GOAL_WORLD_OBJECTIVE_CLIENT_ID_INVALID",
          120,
        ),
        objectiveRoleCode: requireEnum(
          record.objectiveRoleCode,
          GOAL_WORLD_OBJECTIVE_ROLE_CODES,
          "GOAL_WORLD_OBJECTIVE_ROLE_INVALID",
        ),
        parentClientId: optionalText(
          record.parentClientId,
          "GOAL_WORLD_OBJECTIVE_PARENT_CLIENT_ID_INVALID",
          120,
        ),
        primaryTargetValueObjectId:
          record.primaryTargetValueObjectId === null ||
          record.primaryTargetValueObjectId === undefined
            ? null
            : requireUuid(
                record.primaryTargetValueObjectId,
                "GOAL_WORLD_OBJECTIVE_PRIMARY_TARGET_INVALID",
              ),
        label: requireText(
          record.label,
          "GOAL_WORLD_OBJECTIVE_LABEL_INVALID",
          1_000,
        ),
        originCode: requireEnum(
          record.originCode,
          GOAL_WORLD_OBJECTIVE_ORIGIN_CODES,
          "GOAL_WORLD_OBJECTIVE_ORIGIN_INVALID",
        ),
      };
    },
  );

  uniqueStrings(
    parsedObjectives.map(
      (item) => item.clientId,
    ),
    "GOAL_WORLD_OBJECTIVE_CLIENT_ID_DUPLICATE",
  );

  assertObjectiveTree(parsedObjectives);

  const parsedObjectiveByClientId =
    new Map(
      parsedObjectives.map((item) => [
        item.clientId,
        item,
      ]),
    );

  const depthMemo =
    new Map<string, number>();

  const objectiveDepth = (
    clientId: string,
  ): number => {
    const cached =
      depthMemo.get(clientId);

    if (cached !== undefined) {
      return cached;
    }

    const item =
      parsedObjectiveByClientId.get(
        clientId,
      );

    if (!item?.parentClientId) {
      depthMemo.set(clientId, 0);
      return 0;
    }

    const depth =
      objectiveDepth(
        item.parentClientId,
      ) + 1;

    depthMemo.set(clientId, depth);
    return depth;
  };

  const orderedParsedObjectives =
    [...parsedObjectives].sort(
      (left, right) =>
        objectiveDepth(left.clientId) -
        objectiveDepth(right.clientId),
    );

  const objectiveIdByClientId =
    new Map<string, string>();

  for (const objective of parsedObjectives) {
    objectiveIdByClientId.set(
      objective.clientId,
      randomUUID(),
    );
  }

  const objectives:
    GoalWorldNormalizedObjectiveV1[] =
    orderedParsedObjectives.map((item) => ({
      objectiveId:
        objectiveIdByClientId.get(
          item.clientId,
        )!,
      objectiveRoleCode:
        item.objectiveRoleCode,
      parentObjectiveId:
        item.parentClientId
          ? objectiveIdByClientId.get(
              item.parentClientId,
            ) ?? null
          : null,
      primaryTargetValueObjectId:
        item.primaryTargetValueObjectId,
      label: item.label,
      originCode: item.originCode,
    }));

  const membershipRows = requireArray(
    body.objectMemberships ?? [],
    "GOAL_WORLD_MEMBERSHIPS_INVALID",
    MAX_MEMBERSHIPS,
  ).map((item) => {
    const record = requireRecord(
      item,
      "GOAL_WORLD_MEMBERSHIP_INVALID",
    );

    const roleCodes =
      uniqueStrings(
        requireArray(
          record.roleCodes,
          "GOAL_WORLD_MEMBERSHIP_ROLES_INVALID",
          GOAL_WORLD_OBJECT_ROLE_CODES.length,
        ).map((role) =>
          requireEnum(
            role,
            GOAL_WORLD_OBJECT_ROLE_CODES,
            "GOAL_WORLD_MEMBERSHIP_ROLE_INVALID",
          ),
        ),
        "GOAL_WORLD_MEMBERSHIP_ROLE_DUPLICATE",
      );

    if (roleCodes.length === 0) {
      throw new GoalWorldInputError(
        "GOAL_WORLD_MEMBERSHIP_ROLE_REQUIRED",
        "Membership must contain at least one role.",
      );
    }

    const objectiveClientIds =
      uniqueStrings(
        requireArray(
          record.objectiveClientIds ?? [],
          "GOAL_WORLD_MEMBERSHIP_OBJECTIVES_INVALID",
          MAX_OBJECTIVES,
        ).map((clientId) =>
          requireText(
            clientId,
            "GOAL_WORLD_MEMBERSHIP_OBJECTIVE_CLIENT_ID_INVALID",
            120,
          ),
        ),
        "GOAL_WORLD_MEMBERSHIP_OBJECTIVE_DUPLICATE",
      );

    const objectiveIds =
      objectiveClientIds.map(
        (clientId) => {
          const id =
            objectiveIdByClientId.get(
              clientId,
            );

          if (!id) {
            throw new GoalWorldInputError(
              "GOAL_WORLD_MEMBERSHIP_OBJECTIVE_UNKNOWN",
              `Unknown objective client id: ${clientId}`,
            );
          }

          return id;
        },
      );

    return {
      valueObjectId: requireUuid(
        record.valueObjectId,
        "GOAL_WORLD_MEMBERSHIP_VALUE_OBJECT_INVALID",
      ),
      roleCodes:
        roleCodes as
          readonly GoalWorldObjectRoleCode[],
      orientationCode: requireEnum(
        record.orientationCode ?? "neutral",
        GOAL_WORLD_ORIENTATION_CODES,
        "GOAL_WORLD_MEMBERSHIP_ORIENTATION_INVALID",
      ),
      objectiveIds,
      note: optionalText(
        record.note,
        "GOAL_WORLD_MEMBERSHIP_NOTE_INVALID",
        2_000,
      ),
    };
  });

  uniqueStrings(
    membershipRows.map(
      (item) => item.valueObjectId,
    ),
    "GOAL_WORLD_MEMBERSHIP_VALUE_OBJECT_DUPLICATE",
  );

  const membershipValueObjectIds =
    new Set(
      membershipRows.map(
        (item) => item.valueObjectId,
      ),
    );

  for (const objective of objectives) {
    if (
      objective.primaryTargetValueObjectId &&
      !membershipValueObjectIds.has(
        objective.primaryTargetValueObjectId,
      )
    ) {
      throw new GoalWorldInputError(
        "GOAL_WORLD_PRIMARY_TARGET_MEMBERSHIP_REQUIRED",
        "Every primary target Value Object must also have a world membership.",
      );
    }
  }

  const targetCriteria =
    requireArray(
      body.targetCriteria ?? [],
      "GOAL_WORLD_TARGET_CRITERIA_INVALID",
      MAX_TARGET_CRITERIA,
    ).map((item) => {
      const record = requireRecord(
        item,
        "GOAL_WORLD_TARGET_CRITERION_INVALID",
      );

      const objectiveClientId =
        requireText(
          record.objectiveClientId,
          "GOAL_WORLD_TARGET_OBJECTIVE_CLIENT_ID_INVALID",
          120,
        );

      const objectiveId =
        objectiveIdByClientId.get(
          objectiveClientId,
        );

      if (!objectiveId) {
        throw new GoalWorldInputError(
          "GOAL_WORLD_TARGET_OBJECTIVE_UNKNOWN",
          `Unknown objective client id: ${objectiveClientId}`,
        );
      }

      const valueObjectId =
        requireUuid(
          record.valueObjectId,
          "GOAL_WORLD_TARGET_VALUE_OBJECT_INVALID",
        );

      if (
        !membershipValueObjectIds.has(
          valueObjectId,
        )
      ) {
        throw new GoalWorldInputError(
          "GOAL_WORLD_TARGET_MEMBERSHIP_REQUIRED",
          "Every target criterion Value Object must also have a world membership.",
        );
      }

      const comparatorCode =
        requireEnum(
          record.comparatorCode,
          GOAL_WORLD_TARGET_COMPARATOR_CODES,
          "GOAL_WORLD_TARGET_COMPARATOR_INVALID",
        );

      const targetValueUpper =
        requireTargetValue(
          record.targetValueUpper ?? null,
          "GOAL_WORLD_TARGET_UPPER_INVALID",
        );

      if (
        comparatorCode === "range" &&
        targetValueUpper === null
      ) {
        throw new GoalWorldInputError(
          "GOAL_WORLD_TARGET_RANGE_UPPER_REQUIRED",
          "Range comparator requires targetValueUpper.",
        );
      }

      return {
        criterionId: randomUUID(),
        objectiveId,
        valueObjectId,
        parameterCode: optionalText(
          record.parameterCode,
          "GOAL_WORLD_TARGET_PARAMETER_INVALID",
          240,
        ),
        comparatorCode,
        targetValue: requireTargetValue(
          record.targetValue ?? null,
          "GOAL_WORLD_TARGET_VALUE_INVALID",
        ),
        targetValueUpper,
        unitCode: optionalText(
          record.unitCode,
          "GOAL_WORLD_TARGET_UNIT_INVALID",
          120,
        ),
        definitionText:
          optionalText(
            record.definitionText,
            "GOAL_WORLD_TARGET_DEFINITION_INVALID",
            2_000,
          ) ?? "",
        ruleRef:
          record.ruleRef === null ||
          record.ruleRef === undefined
            ? null
            : parseEntityRef(
                record.ruleRef,
                "GOAL_WORLD_TARGET_RULE_REF_INVALID",
              ),
      };
    });

  const goalHypotheses =
    requireArray(
      body.goalHypotheses ?? [],
      "GOAL_WORLD_HYPOTHESES_INVALID",
      MAX_HYPOTHESES,
    ).map((item) => {
      const record = requireRecord(
        item,
        "GOAL_WORLD_HYPOTHESIS_INVALID",
      );

      if (
        record.statusCode !== undefined &&
        record.statusCode !==
          "proposal_only"
      ) {
        throw new GoalWorldInputError(
          "GOAL_WORLD_HYPOTHESIS_STATUS_INVALID",
          "P7 hypotheses must remain proposal_only.",
        );
      }

      return {
        hypothesisId: randomUUID(),
        summary: requireText(
          record.summary,
          "GOAL_WORLD_HYPOTHESIS_SUMMARY_INVALID",
          4_000,
        ),
        statusCode:
          "proposal_only" as const,
        evidenceRefs: requireArray(
          record.evidenceRefs ?? [],
          "GOAL_WORLD_HYPOTHESIS_EVIDENCE_INVALID",
          500,
        ).map((evidence) =>
          parseEntityRef(
            evidence,
            "GOAL_WORLD_HYPOTHESIS_EVIDENCE_REF_INVALID",
          ),
        ),
      };
    });

  return {
    sourceGoalText,
    goalDefinitionJson,
    methodologyTraceJson,
    completenessPercent,
    lifecycleStatusCode:
      parseLifecycle(body),
    revisionReasonCode,
    unknownCodes:
      parseUnknownCodes(
        body.unknownCodes,
      ),
    protocolRefs:
      parseProtocolRefs(
        body.protocolRefs,
      ),
    objectives,
    objectMemberships: membershipRows,
    targetCriteria,
    goalHypotheses,
  };
}

export function readExpectedCurrentRevisionNumber(
  bodyValue: unknown,
): number {
  const body = requireRecord(
    bodyValue,
    "GOAL_WORLD_BODY_INVALID",
  );

  return requireInteger(
    body.expectedCurrentRevisionNumber,
    "GOAL_WORLD_EXPECTED_REVISION_INVALID",
    1,
    2_147_483_647,
  );
}

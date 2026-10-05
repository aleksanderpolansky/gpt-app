export const PROJECT_PLANNING_NODE_KIND_TIME_CONTAINER_V1 =
  "time_container" as const;

export const PROJECT_PLANNING_WINDOW_KINDS_V1 = [
  "date_range",
  "time_of_day",
] as const;

export type ProjectPlanningWindowKindV1 =
  (typeof PROJECT_PLANNING_WINDOW_KINDS_V1)[number];

export type ProjectPlanningTimeContainerV1 = {
  nodeKind: typeof PROJECT_PLANNING_NODE_KIND_TIME_CONTAINER_V1;
  windowKind: ProjectPlanningWindowKindV1;
  timeStart: string | null;
  timeEnd: string | null;
  timeZone: string | null;
};

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

export function readProjectPlanningTimeContainerV1(
  metadata: unknown,
): ProjectPlanningTimeContainerV1 | null {
  const root = asRecord(metadata);
  const value = asRecord(root.projectPlanningV1);

  if (
    value.nodeKind !== PROJECT_PLANNING_NODE_KIND_TIME_CONTAINER_V1 ||
    !PROJECT_PLANNING_WINDOW_KINDS_V1.includes(
      value.windowKind as ProjectPlanningWindowKindV1,
    )
  ) {
    return null;
  }

  return {
    nodeKind: PROJECT_PLANNING_NODE_KIND_TIME_CONTAINER_V1,
    windowKind: value.windowKind as ProjectPlanningWindowKindV1,
    timeStart: asString(value.timeStart),
    timeEnd: asString(value.timeEnd),
    timeZone: asString(value.timeZone),
  };
}

export function writeProjectPlanningTimeContainerV1(
  metadata: unknown,
  input: {
    windowKind: ProjectPlanningWindowKindV1;
    timeStart?: string | null;
    timeEnd?: string | null;
    timeZone?: string | null;
  },
): JsonRecord {
  const root = { ...asRecord(metadata) };

  root.projectPlanningV1 = {
    ...asRecord(root.projectPlanningV1),
    contract: "ARCTOR_PROJECT_PLANNING_TIME_CONTAINER_V1",
    nodeKind: PROJECT_PLANNING_NODE_KIND_TIME_CONTAINER_V1,
    windowKind: input.windowKind,
    timeStart: input.timeStart ?? null,
    timeEnd: input.timeEnd ?? null,
    timeZone: input.timeZone ?? null,
  };

  return root;
}

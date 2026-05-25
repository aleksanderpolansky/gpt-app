import type { ControlledActivityIntakePayload } from "./types";
import type {
  ControlledActivityIntakeIdempotencyResult,
  ControlledActivityIntakeTrustedContext,
} from "./idempotency";

export const CONTROLLED_ACTIVITY_INTAKE_PERSIST_LAYER =
  "controlled-activity-intake-static-insert-row-builder-v1" as const;

export const CONTROLLED_ACTIVITY_INTAKE_ACTIVITY_EVENTS_TABLE =
  "activity_events" as const;

export const CONTROLLED_ACTIVITY_INTAKE_METADATA_COLUMN = "metadata" as const;
export const CONTROLLED_ACTIVITY_INTAKE_OWNER_COLUMN = "user_id" as const;
export const CONTROLLED_ACTIVITY_INTAKE_STATUS_COLUMN = "status" as const;

export const CONTROLLED_ACTIVITY_INTAKE_STATIC_STATUS =
  "raw_intake_pending_semantic_processing" as const;

export type ControlledActivityIntakePersistJsonPrimitive =
  | string
  | number
  | boolean
  | null;

export type ControlledActivityIntakePersistJsonValue =
  | ControlledActivityIntakePersistJsonPrimitive
  | ControlledActivityIntakePersistJsonObject
  | ControlledActivityIntakePersistJsonArray;

export type ControlledActivityIntakePersistJsonObject = {
  readonly [key: string]: ControlledActivityIntakePersistJsonValue;
};

export type ControlledActivityIntakePersistJsonArray =
  readonly ControlledActivityIntakePersistJsonValue[];

export type ControlledActivityIntakeActivityEventsStaticRow = {
  readonly user_id: string;
  readonly status: typeof CONTROLLED_ACTIVITY_INTAKE_STATIC_STATUS;
  readonly metadata: ControlledActivityIntakePersistJsonObject;
};

export type ControlledActivityIntakeStaticRowBuilderInput = {
  readonly payload: ControlledActivityIntakePayload;
  readonly idempotency: ControlledActivityIntakeIdempotencyResult;
  readonly trustedContext: ControlledActivityIntakeTrustedContext;
  readonly generatedAt?: string;
};

export type ControlledActivityIntakeStaticRowBuilderResult = {
  readonly table: typeof CONTROLLED_ACTIVITY_INTAKE_ACTIVITY_EVENTS_TABLE;
  readonly row: ControlledActivityIntakeActivityEventsStaticRow;
  readonly guardrails: {
    readonly staticBuilderOnly: true;
    readonly routeCreated: false;
    readonly dbWriteExecuted: false;
    readonly sqlExecuted: false;
    readonly aiCallExecuted: false;
    readonly semanticCandidatesPersisted: false;
    readonly valueObjectsCreated: false;
    readonly stateFactsCreated: false;
    readonly stateDeltasCreated: false;
    readonly stateSnapshotsCreated: false;
  };
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

function readString(record: UnknownRecord, key: string): string | undefined {
  const value = record[key];

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readNumber(record: UnknownRecord, key: string): number | undefined {
  const value = record[key];

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return value;
}

function toPersistJsonValue(
  value: unknown,
): ControlledActivityIntakePersistJsonValue {
  if (value === null) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toPersistJsonValue(item));
  }

  if (isRecord(value)) {
    const output: Record<string, ControlledActivityIntakePersistJsonValue> = {};

    for (const key of Object.keys(value).sort()) {
      const nestedValue = value[key];

      if (typeof nestedValue === "undefined") {
        continue;
      }

      output[key] = toPersistJsonValue(nestedValue);
    }

    return output;
  }

  return null;
}

function toPersistJsonObject(
  value: unknown,
): ControlledActivityIntakePersistJsonObject {
  const jsonValue = toPersistJsonValue(value);

  if (isRecord(jsonValue)) {
    return jsonValue as ControlledActivityIntakePersistJsonObject;
  }

  return {};
}

function compactObject(
  value: Record<string, ControlledActivityIntakePersistJsonValue | undefined>,
): ControlledActivityIntakePersistJsonObject {
  const output: Record<string, ControlledActivityIntakePersistJsonValue> = {};

  for (const key of Object.keys(value).sort()) {
    const nestedValue = value[key];

    if (typeof nestedValue === "undefined") {
      continue;
    }

    output[key] = nestedValue;
  }

  return output;
}

export function buildControlledActivityIntakeMetadata(
  input: ControlledActivityIntakeStaticRowBuilderInput,
): ControlledActivityIntakePersistJsonObject {
  const payloadRecord = asRecord(input.payload);
  const idempotencyRecord = asRecord(input.idempotency);
  const trustedContextRecord = asRecord(input.trustedContext);

  const draftRecord = asRecord(
    payloadRecord.activityEventDraft ?? payloadRecord.draft,
  );

  const generatedAt =
    input.generatedAt ??
    readString(payloadRecord, "generatedAt") ??
    new Date(0).toISOString();

  return compactObject({
    controlledIntake: compactObject({
      layer: CONTROLLED_ACTIVITY_INTAKE_PERSIST_LAYER,
      table: CONTROLLED_ACTIVITY_INTAKE_ACTIVITY_EVENTS_TABLE,
      generatedAt,
      activity: compactObject({
        title: readString(draftRecord, "title"),
        inputText: readString(draftRecord, "inputText"),
        source: readString(draftRecord, "source"),
        status:
          readString(draftRecord, "status") ??
          CONTROLLED_ACTIVITY_INTAKE_STATIC_STATUS,
        durationMinutes: readNumber(draftRecord, "durationMinutes"),
        startedAt: readString(draftRecord, "startedAt"),
        endedAt: readString(draftRecord, "endedAt"),
        occurredAt: readString(draftRecord, "occurredAt"),
        timezone: readString(draftRecord, "timezone"),
        context: toPersistJsonValue(draftRecord.context),
        metadata: toPersistJsonValue(draftRecord.metadata),
      }),
      payload: toPersistJsonObject(payloadRecord),
      idempotency: toPersistJsonObject(idempotencyRecord),
      trustedContext: compactObject({
        appUserId: readString(trustedContextRecord, "appUserId"),
        actorId: readString(trustedContextRecord, "actorId"),
        organizationId: readString(trustedContextRecord, "organizationId"),
        spaceId: readString(trustedContextRecord, "spaceId"),
        requestSource: readString(trustedContextRecord, "requestSource"),
      }),
      guardrails: compactObject({
        staticBuilderOnly: true,
        routeCreated: false,
        dbWriteExecuted: false,
        sqlExecuted: false,
        aiCallExecuted: false,
        semanticCandidatesPersisted: false,
        valueObjectsCreated: false,
        stateFactsCreated: false,
        stateDeltasCreated: false,
        stateSnapshotsCreated: false,
      }),
    }),
  });
}

export function buildControlledActivityIntakeActivityEventsStaticRow(
  input: ControlledActivityIntakeStaticRowBuilderInput,
): ControlledActivityIntakeStaticRowBuilderResult {
  const trustedContextRecord = asRecord(input.trustedContext);
  const appUserId = readString(trustedContextRecord, "appUserId");

  if (!appUserId) {
    throw new Error(
      "Controlled activity intake static row builder requires trustedContext.appUserId.",
    );
  }

  return {
    table: CONTROLLED_ACTIVITY_INTAKE_ACTIVITY_EVENTS_TABLE,
    row: {
      user_id: appUserId,
      status: CONTROLLED_ACTIVITY_INTAKE_STATIC_STATUS,
      metadata: buildControlledActivityIntakeMetadata(input),
    },
    guardrails: {
      staticBuilderOnly: true,
      routeCreated: false,
      dbWriteExecuted: false,
      sqlExecuted: false,
      aiCallExecuted: false,
      semanticCandidatesPersisted: false,
      valueObjectsCreated: false,
      stateFactsCreated: false,
      stateDeltasCreated: false,
      stateSnapshotsCreated: false,
    },
  };
}
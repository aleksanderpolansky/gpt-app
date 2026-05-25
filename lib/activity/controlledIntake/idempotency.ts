import { createHash } from "node:crypto";
import {
  CONTROLLED_ACTIVITY_INTAKE_HELPER_LAYER,
  CONTROLLED_ACTIVITY_INTAKE_SCHEMA_VERSION,
} from "./types";
import type { ControlledActivityIntakePayload } from "./types";

export const CONTROLLED_ACTIVITY_INTAKE_IDEMPOTENCY_KEY_PREFIX =
  "controlled-intake-v1" as const;

export const CONTROLLED_ACTIVITY_INTAKE_IDEMPOTENCY_MATERIAL_VERSION =
  "controlled-intake-idempotency-v1" as const;

export type ControlledActivityIntakeIdempotencyKey =
  `${typeof CONTROLLED_ACTIVITY_INTAKE_IDEMPOTENCY_KEY_PREFIX}:${string}`;

export interface ControlledActivityIntakeTrustedContext {
  appUserId?: string | null;
  actorId?: string | null;
  organizationId?: string | null;
  spaceId?: string | null;
  requestSource?: string | null;
}

export interface ControlledActivityIntakeIdempotencyMaterial {
  materialVersion: typeof CONTROLLED_ACTIVITY_INTAKE_IDEMPOTENCY_MATERIAL_VERSION;
  schemaVersion: typeof CONTROLLED_ACTIVITY_INTAKE_SCHEMA_VERSION;
  helperLayer: typeof CONTROLLED_ACTIVITY_INTAKE_HELPER_LAYER;
  activity: {
    inputText: string;
    title: string;
    source: string;
    durationMinutes?: number;
    startedAt?: string;
    endedAt?: string;
    occurredAt?: string;
    timezone?: string;
  };
  trustedContext: {
    appUserId?: string;
    actorId?: string;
    organizationId?: string;
    spaceId?: string;
    requestSource?: string;
  };
}

export interface ControlledActivityIntakeIdempotencyTrace {
  controlledIntakeSchemaVersion: typeof CONTROLLED_ACTIVITY_INTAKE_SCHEMA_VERSION;
  controlledIntakeHelperLayer: typeof CONTROLLED_ACTIVITY_INTAKE_HELPER_LAYER;
  idempotencyMaterialVersion: typeof CONTROLLED_ACTIVITY_INTAKE_IDEMPOTENCY_MATERIAL_VERSION;
  idempotencyKey: ControlledActivityIntakeIdempotencyKey;
  idempotencyHash: string;
  semanticProcessingNotStartedYet: true;
  categoryCandidatesCreated: false;
  valueObjectsCreated: false;
  stateFactsCreated: false;
  deltasCreated: false;
  snapshotsCreated: false;
  source: "controlled_activity_intake";
}

export interface ControlledActivityIntakeIdempotencyResult {
  material: ControlledActivityIntakeIdempotencyMaterial;
  canonicalJson: string;
  hash: string;
  idempotencyKey: ControlledActivityIntakeIdempotencyKey;
  trace: ControlledActivityIntakeIdempotencyTrace;
}

type CanonicalJsonValue =
  | string
  | number
  | boolean
  | null
  | CanonicalJsonValue[]
  | { [key: string]: CanonicalJsonValue };

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeOptionalText(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeOptionalNumber(value: number | null | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return value;
}

function removeUndefinedValues<T extends Record<string, unknown>>(input: T): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      output[key] = value;
    }
  }

  return output;
}

function canonicalizeValue(value: unknown): CanonicalJsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeValue(item));
  }

  if (typeof value === "object" && value !== null) {
    const input = value as Record<string, unknown>;
    const output: Record<string, CanonicalJsonValue> = {};

    for (const key of Object.keys(input).sort()) {
      const childValue = input[key];

      if (childValue !== undefined) {
        output[key] = canonicalizeValue(childValue);
      }
    }

    return output;
  }

  return null;
}

export function toControlledActivityIntakeCanonicalJson(value: unknown): string {
  return JSON.stringify(canonicalizeValue(value));
}

export function hashControlledActivityIntakeCanonicalJson(canonicalJson: string): string {
  return createHash("sha256").update(canonicalJson, "utf8").digest("hex");
}

export function buildControlledActivityIntakeIdempotencyMaterial(
  payload: ControlledActivityIntakePayload,
  trustedContext: ControlledActivityIntakeTrustedContext = {},
): ControlledActivityIntakeIdempotencyMaterial {
  const draft = payload.activityEventDraft;

  return {
    materialVersion: CONTROLLED_ACTIVITY_INTAKE_IDEMPOTENCY_MATERIAL_VERSION,
    schemaVersion: CONTROLLED_ACTIVITY_INTAKE_SCHEMA_VERSION,
    helperLayer: CONTROLLED_ACTIVITY_INTAKE_HELPER_LAYER,
    activity: removeUndefinedValues({
      inputText: normalizeText(draft.inputText),
      title: normalizeText(draft.title),
      source: draft.source,
      durationMinutes: normalizeOptionalNumber(draft.durationMinutes),
      startedAt: normalizeOptionalText(draft.startedAt),
      endedAt: normalizeOptionalText(draft.endedAt),
      occurredAt: normalizeOptionalText(draft.occurredAt),
      timezone: normalizeOptionalText(draft.timezone),
    }) as ControlledActivityIntakeIdempotencyMaterial["activity"],
    trustedContext: removeUndefinedValues({
      appUserId: normalizeOptionalText(trustedContext.appUserId),
      actorId: normalizeOptionalText(trustedContext.actorId),
      organizationId: normalizeOptionalText(trustedContext.organizationId),
      spaceId: normalizeOptionalText(trustedContext.spaceId),
      requestSource: normalizeOptionalText(trustedContext.requestSource),
    }) as ControlledActivityIntakeIdempotencyMaterial["trustedContext"],
  };
}

export function buildControlledActivityIntakeIdempotency(
  payload: ControlledActivityIntakePayload,
  trustedContext: ControlledActivityIntakeTrustedContext = {},
): ControlledActivityIntakeIdempotencyResult {
  const material = buildControlledActivityIntakeIdempotencyMaterial(
    payload,
    trustedContext,
  );

  const canonicalJson = toControlledActivityIntakeCanonicalJson(material);
  const hash = hashControlledActivityIntakeCanonicalJson(canonicalJson);
  const idempotencyKey =
    `${CONTROLLED_ACTIVITY_INTAKE_IDEMPOTENCY_KEY_PREFIX}:${hash}` as ControlledActivityIntakeIdempotencyKey;

  return {
    material,
    canonicalJson,
    hash,
    idempotencyKey,
    trace: {
      controlledIntakeSchemaVersion: CONTROLLED_ACTIVITY_INTAKE_SCHEMA_VERSION,
      controlledIntakeHelperLayer: CONTROLLED_ACTIVITY_INTAKE_HELPER_LAYER,
      idempotencyMaterialVersion:
        CONTROLLED_ACTIVITY_INTAKE_IDEMPOTENCY_MATERIAL_VERSION,
      idempotencyKey,
      idempotencyHash: hash,
      semanticProcessingNotStartedYet: true,
      categoryCandidatesCreated: false,
      valueObjectsCreated: false,
      stateFactsCreated: false,
      deltasCreated: false,
      snapshotsCreated: false,
      source: "controlled_activity_intake",
    },
  };
}
import { Buffer } from "node:buffer";
import crypto from "node:crypto";

import { supabase } from "../../../lib/supabase";

export const ARCTOR_REALITY_CURATOR_JOURNEY_V1 =
  "ARCTOR_REALITY_CURATOR_JOURNEY_V1" as const;

const PROCESSOR_NAME = "reality_curator_journey";
const PROCESSOR_VERSION = "1";
const CHECKLIST_VERSION = "2.0";

export type RealityCuratorJourneyEventCode =
  | "candidate_signal_registered"
  | "activity_event_saved"
  | "background_analysis_completed"
  | "missing_typical_activity_detected"
  | "curator_queue_registered";

export type RealityCuratorJourneyEvent = {
  eventCode: RealityCuratorJourneyEventCode;
  occurredAt: string;
  stageCode: string;
  checklistVersion: string;
  checklistStepCode: string | null;
  checklistStepNameSnapshotRu: string | null;
  labelRu: string;
  labelEn: string;
  provenance: string;
};

type JsonRecord = Record<string, unknown>;

type EventDefinition = {
  eventCode: RealityCuratorJourneyEventCode;
  processingStage:
    | "ingest"
    | "create_event"
    | "finalize"
    | "validate";
  severity: "info" | "notice";
  stageCode: string;
  checklistStepCode: string | null;
  checklistStepNameSnapshotRu: string | null;
  labelRu: string;
  labelEn: string;
};

const EVENT_DEFINITIONS: readonly EventDefinition[] = [
  {
    eventCode: "candidate_signal_registered",
    processingStage: "ingest",
    severity: "info",
    stageCode: "signal_capture",
    checklistStepCode: null,
    checklistStepNameSnapshotRu: null,
    labelRu: "Исходный сигнал надёжно зарегистрирован",
    labelEn: "Source signal durably registered",
  },
  {
    eventCode: "activity_event_saved",
    processingStage: "create_event",
    severity: "info",
    stageCode: "activity_capture",
    checklistStepCode: null,
    checklistStepNameSnapshotRu: null,
    labelRu: "Активность пользователя сохранена",
    labelEn: "User activity saved",
  },
  {
    eventCode: "background_analysis_completed",
    processingStage: "finalize",
    severity: "info",
    stageCode: "background_intake_analysis",
    checklistStepCode: null,
    checklistStepNameSnapshotRu: null,
    labelRu: "Фоновый анализ успешно завершён",
    labelEn: "Background analysis completed successfully",
  },
  {
    eventCode: "missing_typical_activity_detected",
    processingStage: "validate",
    severity: "notice",
    stageCode: "signal_qualification",
    checklistStepCode: null,
    checklistStepNameSnapshotRu: null,
    labelRu: "Подтверждено отсутствие подходящей типовой активности",
    labelEn: "Missing suitable typical activity confirmed",
  },
  {
    eventCode: "curator_queue_registered",
    processingStage: "finalize",
    severity: "notice",
    stageCode: "curator_inbox",
    checklistStepCode: "1",
    checklistStepNameSnapshotRu:
      "Зарегистрировать СИГНАЛ/КАНДИДАТ и передать его в рабочую очередь куратора",
    labelRu: "Сигнал передан в рабочую очередь куратора",
    labelEn: "Signal entered the curator work queue",
  },
] as const;

const EVENT_DEFINITION_BY_CODE = new Map(
  EVENT_DEFINITIONS.map((item) => [item.eventCode, item] as const),
);

const EVENT_SEQUENCE = new Map(
  EVENT_DEFINITIONS.map((item, index) => [item.eventCode, index] as const),
);

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isoOrFallback(value: unknown, fallback: string): string {
  const raw = text(value);
  if (!raw) return fallback;
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? date.toISOString() : fallback;
}

function deterministicJourneyEventId(
  rawSignalId: string,
  eventCode: RealityCuratorJourneyEventCode,
): string {
  const bytes = Buffer.from(
    crypto
      .createHash("sha256")
      .update(`${ARCTOR_REALITY_CURATOR_JOURNEY_V1}:${rawSignalId}:${eventCode}`)
      .digest()
      .subarray(0, 16),
  );
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

export async function appendRealityCuratorJourneyEvent(input: {
  userId: string;
  rawSignalId: string;
  activityEventId: string | null;
  eventCode: RealityCuratorJourneyEventCode;
  occurredAt: string;
  actorKind?: "system" | "curator" | "reviewer" | "admin";
  provenance?: string;
  extraMetadata?: JsonRecord;
}) {
  const definition = EVENT_DEFINITION_BY_CODE.get(input.eventCode);
  if (!definition) {
    throw new Error(`REALITY_CURATOR_JOURNEY_EVENT_UNKNOWN:${input.eventCode}`);
  }

  const eventId = deterministicJourneyEventId(input.rawSignalId, input.eventCode);
  const occurredAt = isoOrFallback(input.occurredAt, new Date().toISOString());

  const { error } = await supabase.from("activity_processing_logs").insert({
    id: eventId,
    user_id: input.userId,
    raw_signal_id: input.rawSignalId,
    activity_event_id: input.activityEventId,
    processor_name: PROCESSOR_NAME,
    processor_version: PROCESSOR_VERSION,
    processing_stage: definition.processingStage,
    processing_status: "completed",
    severity: definition.severity,
    message: definition.labelEn,
    input_json: {},
    output_json: {},
    error_json: {},
    metadata_json: {
      journeyContract: ARCTOR_REALITY_CURATOR_JOURNEY_V1,
      eventCode: definition.eventCode,
      stageCode: definition.stageCode,
      resultCode: "success",
      actorKind: input.actorKind ?? "system",
      checklistVersion: CHECKLIST_VERSION,
      checklistStepCode: definition.checklistStepCode,
      checklistStepNameSnapshotRu: definition.checklistStepNameSnapshotRu,
      labelRu: definition.labelRu,
      labelEn: definition.labelEn,
      provenance: input.provenance ?? "runtime_durable_evidence",
      ...input.extraMetadata,
    },
    started_at: occurredAt,
    finished_at: occurredAt,
  });

  if (error && error.code !== "23505") {
    throw new Error(
      `REALITY_CURATOR_JOURNEY_APPEND_FAILED:${definition.eventCode}:${error.message}`,
    );
  }

  return {
    eventId,
    eventCode: definition.eventCode,
    duplicate: error?.code === "23505",
  };
}

export async function ensureMissingTypicalActivityJourney(input: {
  userId: string;
  rawSignalId: string;
  activityEventId: string;
  analysis: JsonRecord;
  provenance?: string;
}) {
  const templateCandidates = Array.isArray(input.analysis.templateCandidates)
    ? input.analysis.templateCandidates
    : [];

  if (
    input.analysis.status !== "completed" ||
    input.analysis.noSuitableTypicalActivity !== true ||
    templateCandidates.length !== 0
  ) {
    return { eligible: false, appended: 0, duplicates: 0 };
  }

  const analyzedAt = isoOrFallback(
    input.analysis.analyzedAt,
    new Date().toISOString(),
  );

  const [{ data: signalRow, error: signalError }, { data: eventRow, error: eventError }] =
    await Promise.all([
      supabase
        .from("raw_activity_signals")
        .select("received_at,created_at")
        .eq("id", input.rawSignalId)
        .eq("user_id", input.userId)
        .maybeSingle(),
      supabase
        .from("activity_events")
        .select("created_at")
        .eq("id", input.activityEventId)
        .eq("user_id", input.userId)
        .maybeSingle(),
    ]);

  if (signalError || !signalRow) {
    throw new Error(
      `REALITY_CURATOR_JOURNEY_SIGNAL_EVIDENCE_FAILED:${signalError?.message ?? "missing"}`,
    );
  }
  if (eventError || !eventRow) {
    throw new Error(
      `REALITY_CURATOR_JOURNEY_EVENT_EVIDENCE_FAILED:${eventError?.message ?? "missing"}`,
    );
  }

  const signalAt = isoOrFallback(
    signalRow.received_at ?? signalRow.created_at,
    analyzedAt,
  );
  const eventAt = isoOrFallback(eventRow.created_at, analyzedAt);

  const timestamps: Record<RealityCuratorJourneyEventCode, string> = {
    candidate_signal_registered: signalAt,
    activity_event_saved: eventAt,
    background_analysis_completed: analyzedAt,
    missing_typical_activity_detected: analyzedAt,
    curator_queue_registered: analyzedAt,
  };

  let appended = 0;
  let duplicates = 0;

  for (const definition of EVENT_DEFINITIONS) {
    const result = await appendRealityCuratorJourneyEvent({
      userId: input.userId,
      rawSignalId: input.rawSignalId,
      activityEventId: input.activityEventId,
      eventCode: definition.eventCode,
      occurredAt: timestamps[definition.eventCode],
      provenance: input.provenance,
      extraMetadata: {
        sourceContract: "ARCTOR_BASIC_ACTIVITY_INTAKE_ANALYSIS_V1",
      },
    });
    if (result.duplicate) duplicates += 1;
    else appended += 1;
  }

  return { eligible: true, appended, duplicates };
}

export async function readRealityCuratorJourneysBySignalIds(
  signalIds: readonly string[],
) {
  const uniqueIds = [...new Set(signalIds.filter(Boolean))];
  const output: Record<string, RealityCuratorJourneyEvent[]> = {};
  for (const signalId of uniqueIds) output[signalId] = [];
  if (uniqueIds.length === 0) return output;

  const { data, error } = await supabase
    .from("activity_processing_logs")
    .select(
      "raw_signal_id,processing_status,metadata_json,started_at,created_at",
    )
    .eq("processor_name", PROCESSOR_NAME)
    .eq("processor_version", PROCESSOR_VERSION)
    .in("raw_signal_id", uniqueIds)
    .order("started_at", { ascending: true });

  if (error) {
    throw new Error(`REALITY_CURATOR_JOURNEY_READ_FAILED:${error.message}`);
  }

  const seenBySignal = new Map<string, Set<string>>();

  for (const row of data ?? []) {
    const signalId = text(row.raw_signal_id);
    if (!signalId || !output[signalId] || row.processing_status !== "completed") {
      continue;
    }

    const metadata = asRecord(row.metadata_json);
    if (metadata.journeyContract !== ARCTOR_REALITY_CURATOR_JOURNEY_V1) {
      continue;
    }

    const eventCode = text(metadata.eventCode) as RealityCuratorJourneyEventCode;
    const definition = EVENT_DEFINITION_BY_CODE.get(eventCode);
    if (!definition) continue;

    const seen = seenBySignal.get(signalId) ?? new Set<string>();
    if (seen.has(eventCode)) continue;
    seen.add(eventCode);
    seenBySignal.set(signalId, seen);

    output[signalId].push({
      eventCode,
      occurredAt: isoOrFallback(row.started_at ?? row.created_at, ""),
      stageCode: text(metadata.stageCode) || definition.stageCode,
      checklistVersion: text(metadata.checklistVersion) || CHECKLIST_VERSION,
      checklistStepCode: text(metadata.checklistStepCode) || null,
      checklistStepNameSnapshotRu:
        text(metadata.checklistStepNameSnapshotRu) || null,
      labelRu: text(metadata.labelRu) || definition.labelRu,
      labelEn: text(metadata.labelEn) || definition.labelEn,
      provenance: text(metadata.provenance) || "unknown",
    });
  }

  for (const signalId of uniqueIds) {
    output[signalId].sort(
      (left, right) =>
        (EVENT_SEQUENCE.get(left.eventCode) ?? 999) -
          (EVENT_SEQUENCE.get(right.eventCode) ?? 999) ||
        left.occurredAt.localeCompare(right.occurredAt),
    );
  }

  return output;
}

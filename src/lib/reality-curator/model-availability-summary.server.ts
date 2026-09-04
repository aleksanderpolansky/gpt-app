import { Buffer } from "node:buffer";
import crypto from "node:crypto";

import {
  BASIC_INTAKE_MODEL_AVAILABILITY_PROCESSOR,
  BASIC_INTAKE_MODEL_AVAILABILITY_PROCESSOR_VERSION,
  isOutstandingModelUnavailableAnalysis,
} from "@/lib/activity/basic-intake-analysis-state";
import { supabase } from "../../../lib/supabase";

const CURATOR_VISIT_PROCESSOR = "reality_curator_visit";
const CURATOR_VISIT_PROCESSOR_VERSION = "1";
const RAW_SIGNAL_PAGE_SIZE = 500;

type JsonRecord = Record<string, unknown>;

type VisitRow = {
  id: string;
  started_at: string;
  metadata_json: unknown;
};

type RawSignalRow = {
  id: string;
  output_event_id: string | null;
  normalized_preview_json: unknown;
};

export type CuratorModelAvailabilitySummary = {
  visitId: string;
  previousVisitAt: string | null;
  currentVisitAt: string;
  unavailableSincePreviousVisit: number;
  outstandingActivityCount: number;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stableUuid(seed: string): string {
  const bytes = Buffer.from(
    crypto.createHash("sha256").update(seed, "utf8").digest().subarray(0, 16),
  );
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function visitLogId(curatorAppUserId: string, visitId: string): string {
  return stableUuid(
    `ARCTOR_REALITY_CURATOR_VISIT_V1|${curatorAppUserId}|${visitId}`,
  );
}

async function readExistingVisit(input: {
  curatorAppUserId: string;
  visitId: string;
}): Promise<VisitRow | null> {
  const { data, error } = await supabase
    .from("activity_processing_logs")
    .select("id,started_at,metadata_json")
    .eq("id", visitLogId(input.curatorAppUserId, input.visitId))
    .eq("user_id", input.curatorAppUserId)
    .eq("processor_name", CURATOR_VISIT_PROCESSOR)
    .eq("processor_version", CURATOR_VISIT_PROCESSOR_VERSION)
    .maybeSingle();

  if (error) {
    throw new Error(`CURATOR_VISIT_READ_FAILED:${error.message}`);
  }

  return data ? (data as VisitRow) : null;
}

async function readPreviousVisit(input: {
  curatorAppUserId: string;
  visitId: string;
}): Promise<string | null> {
  const { data, error } = await supabase
    .from("activity_processing_logs")
    .select("started_at")
    .eq("user_id", input.curatorAppUserId)
    .eq("processor_name", CURATOR_VISIT_PROCESSOR)
    .eq("processor_version", CURATOR_VISIT_PROCESSOR_VERSION)
    .neq("id", visitLogId(input.curatorAppUserId, input.visitId))
    .order("started_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`CURATOR_PREVIOUS_VISIT_READ_FAILED:${error.message}`);
  }

  return text(data?.[0]?.started_at) || null;
}

async function countUnavailableSince(
  previousVisitAt: string | null,
  snapshotAt: string,
): Promise<number> {
  if (!previousVisitAt) return 0;

  const { count, error } = await supabase
    .from("activity_processing_logs")
    .select("id", { count: "exact", head: true })
    .eq("processor_name", BASIC_INTAKE_MODEL_AVAILABILITY_PROCESSOR)
    .eq(
      "processor_version",
      BASIC_INTAKE_MODEL_AVAILABILITY_PROCESSOR_VERSION,
    )
    .eq("processing_status", "failed")
    .gt("started_at", previousVisitAt)
    .lte("started_at", snapshotAt);

  if (error) {
    throw new Error(`CURATOR_MODEL_UNAVAILABLE_COUNT_FAILED:${error.message}`);
  }

  return count ?? 0;
}

async function countOutstandingActivities(): Promise<number> {
  const activityEventIds = new Set<string>();
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("raw_activity_signals")
      .select("id,output_event_id,normalized_preview_json")
      .eq("source_type", "manual_chat")
      .like("idempotency_key", "activity_ai_lab_quick_capture:%")
      .order("updated_at", { ascending: false })
      .range(from, from + RAW_SIGNAL_PAGE_SIZE - 1);

    if (error) {
      throw new Error(
        `CURATOR_MODEL_UNAVAILABLE_OUTSTANDING_READ_FAILED:${error.message}`,
      );
    }

    const rows = (data ?? []) as RawSignalRow[];
    for (const row of rows) {
      const analysis = asRecord(
        asRecord(row.normalized_preview_json).basicIntakeAnalysisV1,
      );
      if (!isOutstandingModelUnavailableAnalysis(analysis)) continue;
      const activityEventId =
        text(analysis.activityEventId) || text(row.output_event_id);
      if (activityEventId) activityEventIds.add(activityEventId);
    }

    if (rows.length < RAW_SIGNAL_PAGE_SIZE) break;
    from += RAW_SIGNAL_PAGE_SIZE;
  }

  return activityEventIds.size;
}

async function appendVisit(input: {
  curatorAppUserId: string;
  visitId: string;
  previousVisitAt: string | null;
  snapshotAt: string;
}) {
  const { error } = await supabase.from("activity_processing_logs").insert({
    id: visitLogId(input.curatorAppUserId, input.visitId),
    user_id: input.curatorAppUserId,
    raw_signal_id: null,
    activity_event_id: null,
    processor_name: CURATOR_VISIT_PROCESSOR,
    processor_version: CURATOR_VISIT_PROCESSOR_VERSION,
    processing_stage: "debug",
    processing_status: "completed",
    severity: "info",
    message: "Reality curator signals page visited",
    input_json: {},
    output_json: {},
    error_json: {},
    metadata_json: {
      contract: "ARCTOR_REALITY_CURATOR_VISIT_V1",
      eventCode: "curator_page_visited",
      visitId: input.visitId,
      previousVisitAt: input.previousVisitAt,
    },
    started_at: input.snapshotAt,
    finished_at: input.snapshotAt,
    duration_ms: 0,
  });

  if (error && error.code !== "23505") {
    throw new Error(`CURATOR_VISIT_APPEND_FAILED:${error.message}`);
  }
}

export async function readCuratorModelAvailabilitySummary(input: {
  curatorAppUserId: string;
  visitId?: string | null;
}): Promise<CuratorModelAvailabilitySummary> {
  const visitId = text(input.visitId) || crypto.randomUUID();
  const visitInput = {
    curatorAppUserId: input.curatorAppUserId,
    visitId,
  };
  const existingVisit = await readExistingVisit(visitInput);

  if (existingVisit) {
    const metadata = asRecord(existingVisit.metadata_json);
    const previousVisitAt = text(metadata.previousVisitAt) || null;
    const snapshotAt = new Date().toISOString();
    const [unavailableSincePreviousVisit, outstandingActivityCount] =
      await Promise.all([
        countUnavailableSince(previousVisitAt, snapshotAt),
        countOutstandingActivities(),
      ]);

    return {
      visitId,
      previousVisitAt,
      currentVisitAt: existingVisit.started_at,
      unavailableSincePreviousVisit,
      outstandingActivityCount,
    };
  }

  const previousVisitAt = await readPreviousVisit(visitInput);
  const snapshotAt = new Date().toISOString();

  const [unavailableSincePreviousVisit, outstandingActivityCount] =
    await Promise.all([
      countUnavailableSince(previousVisitAt, snapshotAt),
      countOutstandingActivities(),
    ]);

  // Important: the previous visit is read and the statistics are calculated
  // before the current visit marker is appended.
  await appendVisit({
    curatorAppUserId: input.curatorAppUserId,
    visitId,
    previousVisitAt,
    snapshotAt,
  });

  return {
    visitId,
    previousVisitAt,
    currentVisitAt: snapshotAt,
    unavailableSincePreviousVisit,
    outstandingActivityCount,
  };
}

import { Buffer } from "node:buffer";
import crypto from "node:crypto";
import path from "node:path";
import { createRequire } from "node:module";

const JOURNEY_CONTRACT = "ARCTOR_REALITY_CURATOR_JOURNEY_V1";
const PROCESSOR_NAME = "reality_curator_journey";
const PROCESSOR_VERSION = "1";
const CHECKLIST_VERSION = "2.0";
const BASIC_ANALYSIS_CONTRACT = "ARCTOR_BASIC_ACTIVITY_INTAKE_ANALYSIS_V1";
const LIMIT = 500;

const DEFINITIONS = [
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
];

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isoOrFallback(value, fallback) {
  const raw = text(value);
  if (!raw) return fallback;
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? date.toISOString() : fallback;
}

function eventId(signalId, eventCode) {
  const bytes = Buffer.from(
    crypto
      .createHash("sha256")
      .update(`${JOURNEY_CONTRACT}:${signalId}:${eventCode}`)
      .digest()
      .subarray(0, 16),
  );
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function isEligible(row) {
  const normalized = asRecord(row.normalized_preview_json);
  const analysis = asRecord(normalized.basicIntakeAnalysisV1);
  const candidates = Array.isArray(analysis.templateCandidates)
    ? analysis.templateCandidates
    : [];
  return (
    analysis.contract === BASIC_ANALYSIS_CONTRACT &&
    analysis.status === "completed" &&
    analysis.noSuitableTypicalActivity === true &&
    candidates.length === 0 &&
    Boolean(text(analysis.activityEventId) || text(row.output_event_id))
  );
}

function buildRows(signal, eventCreatedAt) {
  const normalized = asRecord(signal.normalized_preview_json);
  const analysis = asRecord(normalized.basicIntakeAnalysisV1);
  const activityEventId = text(analysis.activityEventId) || text(signal.output_event_id);
  const analyzedAt = isoOrFallback(analysis.analyzedAt, signal.updated_at);
  const signalAt = isoOrFallback(
    signal.received_at || signal.created_at,
    analyzedAt,
  );
  const eventAt = isoOrFallback(eventCreatedAt, analyzedAt);

  const timestamps = {
    candidate_signal_registered: signalAt,
    activity_event_saved: eventAt,
    background_analysis_completed: analyzedAt,
    missing_typical_activity_detected: analyzedAt,
    curator_queue_registered: analyzedAt,
  };

  return DEFINITIONS.map((definition) => {
    const occurredAt = timestamps[definition.eventCode];
    return {
      id: eventId(signal.id, definition.eventCode),
      user_id: signal.user_id,
      raw_signal_id: signal.id,
      activity_event_id: activityEventId,
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
        journeyContract: JOURNEY_CONTRACT,
        eventCode: definition.eventCode,
        stageCode: definition.stageCode,
        resultCode: "success",
        actorKind: "system",
        checklistVersion: CHECKLIST_VERSION,
        checklistStepCode: definition.checklistStepCode,
        checklistStepNameSnapshotRu: definition.checklistStepNameSnapshotRu,
        labelRu: definition.labelRu,
        labelEn: definition.labelEn,
        provenance: "release_backfill_durable_evidence",
        sourceContract: BASIC_ANALYSIS_CONTRACT,
      },
      started_at: occurredAt,
      finished_at: occurredAt,
    };
  });
}

function resolveClient() {
  const url = text(process.env.SUPABASE_URL);
  const key = text(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) {
    throw new Error("BACKFILL_SUPABASE_ENV_MISSING");
  }
  const requireFromRepo = createRequire(path.join(process.cwd(), "package.json"));
  const { createClient } = requireFromRepo("@supabase/supabase-js");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function loadEligibleSignals(supabase) {
  const { data, error } = await supabase
    .from("raw_activity_signals")
    .select(
      "id,user_id,idempotency_key,normalized_preview_json,output_event_id,received_at,created_at,updated_at",
    )
    .eq("source_type", "manual_chat")
    .like("idempotency_key", "activity_ai_lab_quick_capture:%")
    .order("updated_at", { ascending: false })
    .limit(LIMIT);
  if (error) throw new Error(`BACKFILL_SIGNAL_READ_FAILED:${error.message}`);
  return (data ?? []).filter(isEligible);
}

async function preflight() {
  const supabase = resolveClient();
  const checks = [
    supabase.from("raw_activity_signals").select("id").limit(1),
    supabase.from("activity_events").select("id").limit(1),
    supabase.from("activity_processing_logs").select("id").limit(1),
  ];
  const results = await Promise.all(checks);
  for (const result of results) {
    if (result.error) throw new Error(`BACKFILL_SCHEMA_PREFLIGHT_FAILED:${result.error.message}`);
  }
  console.log("JOURNEY_DB_PREFLIGHT: PASS");
}

async function apply() {
  const supabase = resolveClient();
  const signals = await loadEligibleSignals(supabase);
  const eventIds = [...new Set(signals.map((row) => {
    const analysis = asRecord(asRecord(row.normalized_preview_json).basicIntakeAnalysisV1);
    return text(analysis.activityEventId) || text(row.output_event_id);
  }).filter(Boolean))];

  const eventCreatedAt = new Map();
  if (eventIds.length > 0) {
    const { data, error } = await supabase
      .from("activity_events")
      .select("id,created_at")
      .in("id", eventIds);
    if (error) throw new Error(`BACKFILL_EVENT_READ_FAILED:${error.message}`);
    for (const row of data ?? []) eventCreatedAt.set(row.id, row.created_at);
  }

  let inserted = 0;
  let duplicates = 0;

  for (const signal of signals) {
    const analysis = asRecord(asRecord(signal.normalized_preview_json).basicIntakeAnalysisV1);
    const activityEventId = text(analysis.activityEventId) || text(signal.output_event_id);
    if (!activityEventId || !eventCreatedAt.has(activityEventId)) {
      throw new Error(`BACKFILL_EVENT_EVIDENCE_MISSING_FOR_SIGNAL:${signal.id}`);
    }

    for (const row of buildRows(signal, eventCreatedAt.get(activityEventId))) {
      const { error } = await supabase.from("activity_processing_logs").insert(row);
      if (!error) {
        inserted += 1;
      } else if (error.code === "23505") {
        duplicates += 1;
      } else {
        throw new Error(`BACKFILL_INSERT_FAILED:${row.metadata_json.eventCode}:${error.message}`);
      }
    }
  }

  const signalIds = signals.map((row) => row.id);
  let logs = [];
  if (signalIds.length > 0) {
    const { data, error } = await supabase
      .from("activity_processing_logs")
      .select("raw_signal_id,processing_status,metadata_json")
      .eq("processor_name", PROCESSOR_NAME)
      .eq("processor_version", PROCESSOR_VERSION)
      .in("raw_signal_id", signalIds);
    if (error) throw new Error(`BACKFILL_VERIFY_READ_FAILED:${error.message}`);
    logs = data ?? [];
  }

  const expectedCodes = new Set(DEFINITIONS.map((item) => item.eventCode));
  const codesBySignal = new Map();
  for (const row of logs) {
    if (row.processing_status !== "completed") continue;
    const metadata = asRecord(row.metadata_json);
    if (metadata.journeyContract !== JOURNEY_CONTRACT) continue;
    const signalId = text(row.raw_signal_id);
    const code = text(metadata.eventCode);
    if (!signalId || !expectedCodes.has(code)) continue;
    const set = codesBySignal.get(signalId) ?? new Set();
    set.add(code);
    codesBySignal.set(signalId, set);
  }

  const incomplete = signalIds.filter(
    (signalId) => (codesBySignal.get(signalId)?.size ?? 0) !== expectedCodes.size,
  );
  if (incomplete.length > 0) {
    throw new Error(`BACKFILL_VERIFICATION_INCOMPLETE:${incomplete.length}`);
  }

  console.log(`JOURNEY_BACKFILL_SIGNALS: ${signals.length}`);
  console.log(`JOURNEY_BACKFILL_ROWS_INSERTED: ${inserted}`);
  console.log(`JOURNEY_BACKFILL_DUPLICATES: ${duplicates}`);
  console.log("JOURNEY_BACKFILL_VERIFICATION: PASS");
}

function selfTest() {
  const signalId = "11111111-1111-4111-8111-111111111111";
  const ids = DEFINITIONS.map((item) => eventId(signalId, item.eventCode));
  if (new Set(ids).size !== DEFINITIONS.length) {
    throw new Error("SELFTEST_EVENT_ID_COLLISION");
  }
  if (!ids.every((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id))) {
    throw new Error("SELFTEST_EVENT_ID_FORMAT");
  }
  const fixture = {
    id: signalId,
    user_id: "22222222-2222-4222-8222-222222222222",
    output_event_id: "33333333-3333-4333-8333-333333333333",
    received_at: "2026-09-02T17:00:00.000Z",
    created_at: "2026-09-02T17:00:00.000Z",
    updated_at: "2026-09-02T17:01:00.000Z",
    normalized_preview_json: {
      basicIntakeAnalysisV1: {
        contract: BASIC_ANALYSIS_CONTRACT,
        status: "completed",
        activityEventId: "33333333-3333-4333-8333-333333333333",
        analyzedAt: "2026-09-02T17:01:00.000Z",
        templateCandidates: [],
        noSuitableTypicalActivity: true,
      },
    },
  };
  if (!isEligible(fixture)) throw new Error("SELFTEST_ELIGIBLE_FIXTURE_FAILED");
  const rows = buildRows(fixture, "2026-09-02T17:00:01.000Z");
  if (rows.length !== 5 || rows[4].metadata_json.checklistVersion !== "2.0") {
    throw new Error("SELFTEST_BUILD_ROWS_FAILED");
  }
  if (rows.some((row) => "sourceText" in row.metadata_json || "inputText" in row.metadata_json)) {
    throw new Error("SELFTEST_PII_TEXT_LEAK");
  }
  console.log("ARCTOR_REALITY_CURATOR_JOURNEY_BACKFILL_V1_SELF_TEST: PASS");
}

const args = new Set(process.argv.slice(2));
if (args.has("--self-test")) {
  selfTest();
} else if (args.has("--preflight")) {
  await preflight();
} else if (args.has("--apply")) {
  await apply();
} else {
  throw new Error("Use --self-test, --preflight or --apply");
}

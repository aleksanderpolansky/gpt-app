import crypto from "node:crypto";

import { supabase } from "../../../lib/supabase";

export const CONSEQUENCE_CONSTRUCTOR_CONTRACT =
  "ARCTOR_REALITY_CURATOR_CONSEQUENCE_TASK_V1" as const;
export const CONSEQUENCE_CONSTRUCTOR_PROCESSOR =
  "reality_curator_consequence_constructor" as const;
export const CONSEQUENCE_CONSTRUCTOR_PROCESSOR_VERSION = "1" as const;
export const CONSEQUENCE_TASK_CREATED_EVENT =
  "consequence_constructor_task_created" as const;
export const CONSEQUENCE_TEMPLATE_BOUND_EVENT =
  "consequence_constructor_template_bound" as const;
export const CONSEQUENCE_TASK_STATE = "awaiting_relations" as const;
export const CONSEQUENCE_CONTEXTUAL_PAIR_POLICY =
  "activity_specific_only" as const;

const JOURNEY_PROCESSOR = "reality_curator_journey" as const;
const JOURNEY_VERSION = "1" as const;
const EXISTING_LEAF_EVENT = "measurable_object_decision_recorded" as const;
const CREATED_OBJECT_EVENT = "observation_object_created" as const;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type JsonRecord = Record<string, unknown>;

type ConsequenceTaskEnsureInput = {
  signalId: string;
  userId: string;
  activityEventId: string;
  parameterDefinitionId: string;
  parameterCode?: string | null;
  parameterTitle?: string | null;
  sourceValueObjectId: string;
  sourceValueObjectTitle?: string | null;
  curatorMetadata?: JsonRecord;
};

type ConsequenceTaskRow = {
  id: string;
  user_id: string;
  raw_signal_id: string | null;
  activity_event_id: string | null;
  metadata_json: unknown;
  started_at: string | null;
  created_at: string;
};

type TemplateBindingRow = {
  id: string;
  metadata_json: unknown;
  started_at: string | null;
  created_at: string;
};

export type ConsequenceConstructorTaskView = {
  id: string;
  rawSignalId: string;
  activityEventId: string;
  activityKind: "typical" | "raw";
  activityTitle: string;
  activityTemplateId: string | null;
  activityTemplateTitle: string | null;
  rawActivityTitle: string;
  parameterDefinitionId: string;
  parameterCode: string;
  parameterTitle: string;
  sourceValueObjectId: string;
  sourceValueObjectTitle: string;
  targetValueObjectId: null;
  targetSelectionState: "locked_pending_relations";
  state: "awaiting_template" | "awaiting_relations";
  createdAt: string;
};

export type ConsequenceTemplateOption = {
  id: string;
  title: string;
  shortTitle: string | null;
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

function taskId(input: {
  signalId: string;
  parameterDefinitionId: string;
  sourceValueObjectId: string;
}) {
  return stableUuid(
    `${CONSEQUENCE_CONSTRUCTOR_CONTRACT}|task|raw:${input.signalId}|parameter:${input.parameterDefinitionId}|source_leaf:${input.sourceValueObjectId}`,
  );
}

async function readDefaultTemplateContext(signalId: string) {
  const { data, error } = await supabase
    .from("activity_processing_logs")
    .select("metadata_json,started_at,created_at")
    .eq("raw_signal_id", signalId)
    .eq("processor_name", JOURNEY_PROCESSOR)
    .eq("processor_version", JOURNEY_VERSION)
    .order("started_at", { ascending: false })
    .limit(200);
  if (error) {
    throw new Error(
      `CONSEQUENCE_ACTIVITY_CONTEXT_READ_FAILED:${error.message}`,
    );
  }

  for (const row of data ?? []) {
    const metadata = asRecord(row.metadata_json);
    const selectedTemplateId =
      text(metadata.selectedTemplateId) ||
      text(metadata.createdTemplateId) ||
      text(metadata.activityTemplateId) ||
      text(metadata.typicalActivityTemplateId);
    if (!UUID_RE.test(selectedTemplateId)) continue;
    return {
      activityTemplateId: selectedTemplateId,
      activityTemplateTitle:
        text(metadata.selectedTemplateTitle) ||
        text(metadata.createdTemplateTitle) ||
        text(metadata.activityTemplateTitle) ||
        text(metadata.typicalActivityTemplateTitle) ||
        selectedTemplateId,
    };
  }

  return {
    activityTemplateId: null,
    activityTemplateTitle: null,
  };
}

async function readRawActivityTitle(activityEventId: string) {
  const { data, error } = await supabase
    .from("activity_events")
    .select("id,title")
    .eq("id", activityEventId)
    .limit(1);
  if (error) {
    throw new Error(`CONSEQUENCE_RAW_ACTIVITY_READ_FAILED:${error.message}`);
  }
  return text(data?.[0]?.title) || "Сырая активность";
}

export async function ensureConsequenceConstructorTaskV1(
  input: ConsequenceTaskEnsureInput,
) {
  if (!UUID_RE.test(input.signalId)) {
    throw new Error("CONSEQUENCE_SIGNAL_ID_INVALID");
  }
  if (!UUID_RE.test(input.activityEventId)) {
    throw new Error("CONSEQUENCE_ACTIVITY_EVENT_ID_INVALID");
  }
  if (!UUID_RE.test(input.parameterDefinitionId)) {
    throw new Error("CONSEQUENCE_PARAMETER_ID_INVALID");
  }
  if (!UUID_RE.test(input.sourceValueObjectId)) {
    throw new Error("CONSEQUENCE_SOURCE_VALUE_OBJECT_ID_INVALID");
  }

  const id = taskId(input);
  const { data: existingRows, error: existingError } = await supabase
    .from("activity_processing_logs")
    .select("id")
    .eq("id", id)
    .limit(1);
  if (existingError) {
    throw new Error(`CONSEQUENCE_TASK_READ_FAILED:${existingError.message}`);
  }
  if (existingRows?.[0]) return { id, duplicate: true };

  const [activityContext, rawActivityTitle] = await Promise.all([
    readDefaultTemplateContext(input.signalId),
    readRawActivityTitle(input.activityEventId),
  ]);

  const now = new Date().toISOString();
  const { error } = await supabase.from("activity_processing_logs").insert({
    id,
    user_id: input.userId,
    raw_signal_id: input.signalId,
    activity_event_id: input.activityEventId,
    processor_name: CONSEQUENCE_CONSTRUCTOR_PROCESSOR,
    processor_version: CONSEQUENCE_CONSTRUCTOR_PROCESSOR_VERSION,
    processing_stage: "validate",
    processing_status: "completed",
    severity: "notice",
    message: "Consequence-constructor task created",
    input_json: {},
    output_json: {},
    error_json: {},
    metadata_json: {
      contract: CONSEQUENCE_CONSTRUCTOR_CONTRACT,
      eventCode: CONSEQUENCE_TASK_CREATED_EVENT,
      taskId: id,
      taskState: CONSEQUENCE_TASK_STATE,
      contextualPairPolicy: CONSEQUENCE_CONTEXTUAL_PAIR_POLICY,
      generalObservationObjectRelationCreated: false,
      rawSignalId: input.signalId,
      activityEventId: input.activityEventId,
      rawActivityTitleSnapshot: rawActivityTitle,
      activityTemplateId: activityContext.activityTemplateId,
      activityTemplateTitleSnapshot: activityContext.activityTemplateTitle,
      activityBindingState: activityContext.activityTemplateId
        ? "typical_activity_bound"
        : "raw_activity_pending_template",
      parameterDefinitionId: input.parameterDefinitionId,
      parameterCode: text(input.parameterCode),
      parameterTitleSnapshot: text(input.parameterTitle),
      sourceValueObjectId: input.sourceValueObjectId,
      sourceValueObjectTitleSnapshot: text(input.sourceValueObjectTitle),
      sourceValueObjectRole: "leaf",
      targetSelectionState: "locked_pending_relations",
      targetValueObjectId: null,
      createdAt: now,
      provenance: "curator_parameter_leaf_assignment",
      ...(input.curatorMetadata ?? {}),
    },
    started_at: now,
    finished_at: now,
    duration_ms: 0,
  });

  if (error && error.code !== "23505") {
    throw new Error(`CONSEQUENCE_TASK_INSERT_FAILED:${error.message}`);
  }
  return { id, duplicate: error?.code === "23505" };
}

export async function reconcileConsequenceConstructorTasksV1(input?: {
  limit?: number;
}) {
  const limit = Math.min(Math.max(input?.limit ?? 500, 1), 2000);
  const [decisionResult, creationResult] = await Promise.all([
    supabase
      .from("activity_processing_logs")
      .select(
        "user_id,raw_signal_id,activity_event_id,metadata_json,started_at,created_at",
      )
      .eq("processor_name", JOURNEY_PROCESSOR)
      .eq("processor_version", JOURNEY_VERSION)
      .contains("metadata_json", {
        eventCode: EXISTING_LEAF_EVENT,
        objectDecisionResult: "existing_leaf_found",
      })
      .order("started_at", { ascending: false })
      .limit(limit),
    supabase
      .from("activity_processing_logs")
      .select(
        "user_id,raw_signal_id,activity_event_id,metadata_json,started_at,created_at",
      )
      .eq("processor_name", JOURNEY_PROCESSOR)
      .eq("processor_version", JOURNEY_VERSION)
      .contains("metadata_json", {
        eventCode: CREATED_OBJECT_EVENT,
        completedTargetLeaf: true,
      })
      .order("started_at", { ascending: false })
      .limit(limit),
  ]);

  if (decisionResult.error) {
    throw new Error(
      `CONSEQUENCE_RECONCILE_DECISION_READ_FAILED:${decisionResult.error.message}`,
    );
  }
  if (creationResult.error) {
    throw new Error(
      `CONSEQUENCE_RECONCILE_CREATION_READ_FAILED:${creationResult.error.message}`,
    );
  }

  const candidates: ConsequenceTaskEnsureInput[] = [];
  const seen = new Set<string>();

  const appendCandidate = (row: {
    user_id?: unknown;
    raw_signal_id?: unknown;
    activity_event_id?: unknown;
    metadata_json?: unknown;
  }) => {
    const metadata = asRecord(row.metadata_json);
    const signalId = text(row.raw_signal_id);
    const userId = text(row.user_id);
    const activityEventId = text(row.activity_event_id);
    const parameterDefinitionId = text(metadata.parameterDefinitionId);
    const sourceValueObjectId =
      text(metadata.selectedValueObjectId) || text(metadata.createdValueObjectId);
    if (
      !UUID_RE.test(signalId) ||
      !UUID_RE.test(activityEventId) ||
      !UUID_RE.test(parameterDefinitionId) ||
      !UUID_RE.test(sourceValueObjectId)
    ) {
      return;
    }
    const key = `${signalId}|${parameterDefinitionId}|${sourceValueObjectId}`;
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push({
      signalId,
      userId,
      activityEventId,
      parameterDefinitionId,
      parameterCode: text(metadata.parameterCode),
      parameterTitle: text(metadata.parameterTitle),
      sourceValueObjectId,
      sourceValueObjectTitle:
        text(metadata.selectedValueObjectTitle) || text(metadata.createdTitle),
      curatorMetadata: {
        reconciliationSource: "existing_curator_mapping_log",
      },
    });
  };

  for (const row of decisionResult.data ?? []) appendCandidate(row);
  for (const row of creationResult.data ?? []) appendCandidate(row);

  let created = 0;
  let existing = 0;
  for (const candidate of candidates) {
    const result = await ensureConsequenceConstructorTaskV1(candidate);
    if (result.duplicate) existing += 1;
    else created += 1;
  }

  return { scanned: candidates.length, created, existing };
}

export async function countConsequenceConstructorTasksV1() {
  const { count, error } = await supabase
    .from("activity_processing_logs")
    .select("id", { count: "exact", head: true })
    .eq("processor_name", CONSEQUENCE_CONSTRUCTOR_PROCESSOR)
    .eq("processor_version", CONSEQUENCE_CONSTRUCTOR_PROCESSOR_VERSION)
    .contains("metadata_json", { eventCode: CONSEQUENCE_TASK_CREATED_EVENT });
  if (error) {
    throw new Error(`CONSEQUENCE_TASK_COUNT_FAILED:${error.message}`);
  }
  return count ?? 0;
}

async function readTaskRows(): Promise<ConsequenceTaskRow[]> {
  const { data, error } = await supabase
    .from("activity_processing_logs")
    .select(
      "id,user_id,raw_signal_id,activity_event_id,metadata_json,started_at,created_at",
    )
    .eq("processor_name", CONSEQUENCE_CONSTRUCTOR_PROCESSOR)
    .eq("processor_version", CONSEQUENCE_CONSTRUCTOR_PROCESSOR_VERSION)
    .contains("metadata_json", { eventCode: CONSEQUENCE_TASK_CREATED_EVENT })
    .order("started_at", { ascending: false })
    .limit(2000);
  if (error) {
    throw new Error(`CONSEQUENCE_TASK_LIST_READ_FAILED:${error.message}`);
  }
  return (data ?? []) as unknown as ConsequenceTaskRow[];
}

async function readTemplateBindings(): Promise<TemplateBindingRow[]> {
  const { data, error } = await supabase
    .from("activity_processing_logs")
    .select("id,metadata_json,started_at,created_at")
    .eq("processor_name", CONSEQUENCE_CONSTRUCTOR_PROCESSOR)
    .eq("processor_version", CONSEQUENCE_CONSTRUCTOR_PROCESSOR_VERSION)
    .contains("metadata_json", { eventCode: CONSEQUENCE_TEMPLATE_BOUND_EVENT })
    .order("started_at", { ascending: true })
    .limit(5000);
  if (error) {
    throw new Error(`CONSEQUENCE_BINDING_LIST_READ_FAILED:${error.message}`);
  }
  return (data ?? []) as unknown as TemplateBindingRow[];
}

export async function listConsequenceConstructorTasksV1() {
  const [taskRows, bindingRows] = await Promise.all([
    readTaskRows(),
    readTemplateBindings(),
  ]);

  const latestBindingByTaskId = new Map<
    string,
    { templateId: string; templateTitle: string }
  >();
  for (const row of bindingRows) {
    const metadata = asRecord(row.metadata_json);
    const consequenceTaskId = text(metadata.consequenceTaskId);
    const selectedTemplateId = text(metadata.selectedTemplateId);
    if (!UUID_RE.test(consequenceTaskId) || !UUID_RE.test(selectedTemplateId)) {
      continue;
    }
    latestBindingByTaskId.set(consequenceTaskId, {
      templateId: selectedTemplateId,
      templateTitle:
        text(metadata.selectedTemplateTitle) || selectedTemplateId,
    });
  }

  const rawSignalIds = [...new Set(
    taskRows
      .map((row) => text(asRecord(row.metadata_json).rawSignalId) || text(row.raw_signal_id))
      .filter((value) => UUID_RE.test(value)),
  )];
  const dynamicContextBySignal = new Map<
    string,
    { activityTemplateId: string | null; activityTemplateTitle: string | null }
  >();
  await Promise.all(
    rawSignalIds.map(async (signalId) => {
      dynamicContextBySignal.set(
        signalId,
        await readDefaultTemplateContext(signalId),
      );
    }),
  );

  const tasksByContextKey = new Map<string, ConsequenceConstructorTaskView>();
  for (const row of taskRows) {
    const metadata = asRecord(row.metadata_json);
    const rawSignalId = text(metadata.rawSignalId) || text(row.raw_signal_id);
    const activityEventId =
      text(metadata.activityEventId) || text(row.activity_event_id);
    const parameterDefinitionId = text(metadata.parameterDefinitionId);
    const sourceValueObjectId = text(metadata.sourceValueObjectId);
    if (
      !UUID_RE.test(rawSignalId) ||
      !UUID_RE.test(activityEventId) ||
      !UUID_RE.test(parameterDefinitionId) ||
      !UUID_RE.test(sourceValueObjectId)
    ) {
      continue;
    }

    const binding = latestBindingByTaskId.get(row.id) ?? null;
    const dynamicContext = dynamicContextBySignal.get(rawSignalId) ?? null;
    const initialTemplateId = text(metadata.activityTemplateId);
    const activityTemplateId =
      binding?.templateId ??
      dynamicContext?.activityTemplateId ??
      (UUID_RE.test(initialTemplateId) ? initialTemplateId : null);
    const activityTemplateTitle = activityTemplateId
      ? binding?.templateTitle ||
        dynamicContext?.activityTemplateTitle ||
        text(metadata.activityTemplateTitleSnapshot) ||
        activityTemplateId
      : null;
    const rawActivityTitle =
      text(metadata.rawActivityTitleSnapshot) || "Сырая активность";

    const contextKey = activityTemplateId
      ? `template:${activityTemplateId}|parameter:${parameterDefinitionId}|source:${sourceValueObjectId}`
      : `raw:${rawSignalId}|parameter:${parameterDefinitionId}|source:${sourceValueObjectId}`;
    if (tasksByContextKey.has(contextKey)) continue;

    tasksByContextKey.set(contextKey, {
      id: row.id,
      rawSignalId,
      activityEventId,
      activityKind: activityTemplateId ? "typical" : "raw",
      activityTitle: activityTemplateTitle || rawActivityTitle,
      activityTemplateId,
      activityTemplateTitle,
      rawActivityTitle,
      parameterDefinitionId,
      parameterCode: text(metadata.parameterCode),
      parameterTitle:
        text(metadata.parameterTitleSnapshot) ||
        text(metadata.parameterCode) ||
        parameterDefinitionId,
      sourceValueObjectId,
      sourceValueObjectTitle:
        text(metadata.sourceValueObjectTitleSnapshot) || sourceValueObjectId,
      targetValueObjectId: null,
      targetSelectionState: "locked_pending_relations",
      state: activityTemplateId ? "awaiting_relations" : "awaiting_template",
      createdAt: row.started_at || row.created_at,
    });
  }

  return [...tasksByContextKey.values()];
}

export async function listConsequenceTemplateOptionsV1(): Promise<
  ConsequenceTemplateOption[]
> {
  const { data, error } = await supabase
    .from("activity_templates")
    .select("id,title,short_title")
    .eq("template_scope", "system")
    .eq("status", "active")
    .eq("is_active", true)
    .order("title", { ascending: true })
    .limit(1000);
  if (error) {
    throw new Error(`CONSEQUENCE_TEMPLATE_OPTIONS_READ_FAILED:${error.message}`);
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    title: text(row.title) || row.id,
    shortTitle: text(row.short_title) || null,
  }));
}

export async function bindConsequenceTaskToTemplateV1(input: {
  taskId: string;
  templateId: string;
  curatorMetadata?: JsonRecord;
}) {
  if (!UUID_RE.test(input.taskId)) throw new Error("CONSEQUENCE_TASK_ID_INVALID");
  if (!UUID_RE.test(input.templateId)) {
    throw new Error("CONSEQUENCE_TEMPLATE_ID_INVALID");
  }

  const { data: taskRows, error: taskError } = await supabase
    .from("activity_processing_logs")
    .select("id,user_id,raw_signal_id,activity_event_id,metadata_json")
    .eq("id", input.taskId)
    .eq("processor_name", CONSEQUENCE_CONSTRUCTOR_PROCESSOR)
    .eq("processor_version", CONSEQUENCE_CONSTRUCTOR_PROCESSOR_VERSION)
    .contains("metadata_json", { eventCode: CONSEQUENCE_TASK_CREATED_EVENT })
    .limit(1);
  if (taskError) {
    throw new Error(`CONSEQUENCE_BIND_TASK_READ_FAILED:${taskError.message}`);
  }
  const task = taskRows?.[0];
  if (!task) throw new Error("CONSEQUENCE_TASK_NOT_FOUND");

  const { data: templateRows, error: templateError } = await supabase
    .from("activity_templates")
    .select("id,title,short_title")
    .eq("id", input.templateId)
    .eq("template_scope", "system")
    .eq("status", "active")
    .eq("is_active", true)
    .limit(1);
  if (templateError) {
    throw new Error(
      `CONSEQUENCE_BIND_TEMPLATE_READ_FAILED:${templateError.message}`,
    );
  }
  const template = templateRows?.[0];
  if (!template) throw new Error("CONSEQUENCE_TEMPLATE_NOT_AVAILABLE");

  const rawSignalId = text(task.raw_signal_id);
  if (!UUID_RE.test(rawSignalId)) {
    throw new Error("CONSEQUENCE_TASK_RAW_SIGNAL_MISSING");
  }

  const { data: siblingRows, error: siblingError } = await supabase
    .from("activity_processing_logs")
    .select("id,user_id,raw_signal_id,activity_event_id,metadata_json")
    .eq("raw_signal_id", rawSignalId)
    .eq("processor_name", CONSEQUENCE_CONSTRUCTOR_PROCESSOR)
    .eq("processor_version", CONSEQUENCE_CONSTRUCTOR_PROCESSOR_VERSION)
    .contains("metadata_json", { eventCode: CONSEQUENCE_TASK_CREATED_EVENT })
    .limit(500);
  if (siblingError) {
    throw new Error(
      `CONSEQUENCE_BIND_SIBLINGS_READ_FAILED:${siblingError.message}`,
    );
  }

  const now = new Date().toISOString();
  let updatedTaskCount = 0;
  for (const sibling of siblingRows ?? []) {
    const consequenceTaskId = text(sibling.id);
    if (!UUID_RE.test(consequenceTaskId)) continue;
    const { error } = await supabase.from("activity_processing_logs").insert({
      id: crypto.randomUUID(),
      user_id: sibling.user_id,
      raw_signal_id: sibling.raw_signal_id,
      activity_event_id: sibling.activity_event_id,
      processor_name: CONSEQUENCE_CONSTRUCTOR_PROCESSOR,
      processor_version: CONSEQUENCE_CONSTRUCTOR_PROCESSOR_VERSION,
      processing_stage: "validate",
      processing_status: "completed",
      severity: "notice",
      message: "Consequence task bound to typical activity",
      input_json: {},
      output_json: {},
      error_json: {},
      metadata_json: {
        contract: CONSEQUENCE_CONSTRUCTOR_CONTRACT,
        eventCode: CONSEQUENCE_TEMPLATE_BOUND_EVENT,
        consequenceTaskId,
        selectedTemplateId: template.id,
        selectedTemplateTitle: text(template.title) || template.id,
        selectedTemplateShortTitle: text(template.short_title) || null,
        bindingScope: "all_consequence_tasks_of_raw_signal",
        contextualPairPolicy: CONSEQUENCE_CONTEXTUAL_PAIR_POLICY,
        generalObservationObjectRelationCreated: false,
        boundAt: now,
        ...(input.curatorMetadata ?? {}),
      },
      started_at: now,
      finished_at: now,
      duration_ms: 0,
    });
    if (error) {
      throw new Error(`CONSEQUENCE_TEMPLATE_BIND_FAILED:${error.message}`);
    }
    updatedTaskCount += 1;
  }

  return {
    templateId: template.id,
    templateTitle: text(template.title) || template.id,
    rawSignalId,
    updatedTaskCount,
  };
}

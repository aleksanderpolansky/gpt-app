import { supabase } from "../../../lib/supabase";

const PROCESSOR_NAME = "reality_curator_journey";
const PROCESSOR_VERSION = "1";

type JsonRecord = Record<string, unknown>;

export type CuratorProcessingLogInput = {
  signalId: string;
  userId: string;
  sourceText: string;
  sourceType: string;
  idempotencyKey: string | null;
};

export type CuratorProcessingLogEvent = {
  id: string;
  eventCode: string;
  occurredAt: string;
  checklistVersion: string | null;
  checklistStepCode: string | null;
  checklistStepNameSnapshotRu: string | null;
  labelRu: string | null;
  labelEn: string | null;
  resultSummaryRu: string | null;
  resultSummaryEn: string | null;
  actorAppUserId: string | null;
  actorDisplayName: string | null;
  actorRole: string | null;
  curatorComment: string | null;
  selectedTemplateId: string | null;
  selectedTemplateTitle: string | null;
  activityCheckResult: string | null;
  parameterCheckResult: string | null;
};

export type CuratorProcessingLogBlock = {
  code: "activity_intake" | "work_acceptance" | "typical_activity" | "parameter_check" | "object_definition" | "other";
  titleRu: string;
  titleEn: string;
  latestAt: string;
  summaryRu: string;
  summaryEn: string;
  comment: string | null;
  events: CuratorProcessingLogEvent[];
};

export type CuratorProcessingLog = {
  currentStageRu: string;
  currentStageEn: string;
  currentResponsible: string | null;
  lastActionAt: string | null;
  lastActionRu: string | null;
  lastActionEn: string | null;
  sourceUserDisplayName: string;
  sourceChannelRu: string;
  sourceChannelEn: string;
  blocks: CuratorProcessingLogBlock[];
};

type JourneyRow = {
  id: string;
  raw_signal_id: string | null;
  processing_status: string;
  metadata_json: unknown;
  started_at: string | null;
  created_at: string;
};

type AppUserRow = {
  id: string;
  name: string | null;
  email: string | null;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function iso(value: unknown): string {
  const raw = text(value);
  if (!raw) return "";
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? date.toISOString() : "";
}

function displayName(row: AppUserRow | undefined, fallback: string): string {
  return text(row?.name) || text(row?.email) || fallback;
}

function sourceChannel(input: CuratorProcessingLogInput) {
  if (
    input.sourceType === "manual_chat" &&
    text(input.idempotencyKey).startsWith("activity_ai_lab_quick_capture:")
  ) {
    return {
      ru: "ручной ввод через правую панель ИИ",
      en: "manual entry through the right AI panel",
    };
  }
  if (input.sourceType === "manual_chat") {
    return { ru: "ручной ввод", en: "manual entry" };
  }
  if (input.sourceType === "api") {
    return { ru: "внешний программный интерфейс", en: "external API" };
  }
  if (input.sourceType === "watch") {
    return { ru: "часы или носимое устройство", en: "watch or wearable device" };
  }
  return {
    ru: input.sourceType ? `источник: ${input.sourceType}` : "источник не указан",
    en: input.sourceType ? `source: ${input.sourceType}` : "source not specified",
  };
}

function blockCode(eventCode: string): CuratorProcessingLogBlock["code"] {
  if (
    eventCode === "candidate_signal_registered" ||
    eventCode === "activity_event_saved" ||
    eventCode === "background_analysis_completed" ||
    eventCode === "missing_typical_activity_detected" ||
    eventCode === "curator_queue_registered"
  ) {
    return "activity_intake";
  }
  if (eventCode === "curator_work_started" || eventCode === "curator_work_transferred") {
    return "work_acceptance";
  }
  if (eventCode === "existing_typical_activity_checked") {
    return "typical_activity";
  }
  if (eventCode === "related_parameter_catalog_checked") {
    return "parameter_check";
  }
  if (
    eventCode === "measurable_object_decision_recorded" ||
    eventCode === "observation_object_created"
  ) {
    return "object_definition";
  }
  return "other";
}

function blockTitle(code: CuratorProcessingLogBlock["code"]) {
  if (code === "activity_intake") {
    return { ru: "Добавление активности", en: "Activity added" };
  }
  if (code === "work_acceptance") {
    return { ru: "Приём в работу", en: "Taken into work" };
  }
  if (code === "typical_activity") {
    return { ru: "Определение типовой активности", en: "Typical activity determination" };
  }
  if (code === "parameter_check") {
    return { ru: "Проверка параметров и измерений", en: "Parameter and measurement check" };
  }
  if (code === "object_definition") {
    return { ru: "Определение измеримого объекта", en: "Measurable object determination" };
  }
  return { ru: "Дальнейшая обработка", en: "Further processing" };
}

function summarizeBlock(input: {
  code: CuratorProcessingLogBlock["code"];
  signal: CuratorProcessingLogInput;
  sourceUserDisplayName: string;
  sourceChannelRu: string;
  sourceChannelEn: string;
  events: CuratorProcessingLogEvent[];
}) {
  const newest = input.events[0];
  const actor = newest?.actorDisplayName || "Куратор";
  const actorEn = newest?.actorDisplayName || "Curator";

  if (input.code === "activity_intake") {
    const missing = input.events.some(
      (event) => event.eventCode === "missing_typical_activity_detected",
    );
    const queued = input.events.some(
      (event) => event.eventCode === "curator_queue_registered",
    );
    const suffixRu = missing
      ? " Подходящая типовая активность автоматически не найдена."
      : "";
    const queueRu = queued ? " Сигнал передан куратору модели." : "";
    const suffixEn = missing
      ? " No suitable typical activity was found automatically."
      : "";
    const queueEn = queued ? " The signal was sent to the model curator." : "";
    return {
      ru: `Пользователь ${input.sourceUserDisplayName} добавил активность: «${input.signal.sourceText}». Способ добавления — ${input.sourceChannelRu}.${suffixRu}${queueRu}`,
      en: `User ${input.sourceUserDisplayName} added an activity: “${input.signal.sourceText}”. Source — ${input.sourceChannelEn}.${suffixEn}${queueEn}`,
      comment: null,
    };
  }

  if (input.code === "work_acceptance") {
    const transfer = input.events.find(
      (event) => event.eventCode === "curator_work_transferred",
    );
    if (transfer) {
      return {
        ru: transfer.resultSummaryRu || `${actor} передал сигнал другому куратору.`,
        en: transfer.resultSummaryEn || `${actorEn} transferred the signal to another curator.`,
        comment: transfer.curatorComment,
      };
    }
    return {
      ru: newest?.resultSummaryRu || `${actor} принял сигнал в работу.`,
      en: newest?.resultSummaryEn || `${actorEn} took the signal into work.`,
      comment: newest?.curatorComment || null,
    };
  }

  if (input.code === "typical_activity") {
    const event = input.events.find(
      (item) => item.eventCode === "existing_typical_activity_checked",
    );
    if (!event) {
      return {
        ru: "Определение типовой активности ещё не завершено.",
        en: "Typical activity determination has not been completed yet.",
        comment: null,
      };
    }
    const activityTitle = event.selectedTemplateTitle || event.selectedTemplateId;
    if (event.activityCheckResult === "found") {
      return {
        ru:
          event.resultSummaryRu ||
          `${event.actorDisplayName || "Куратор"} определил типовую активность${activityTitle ? `: «${activityTitle}»` : ""}.`,
        en:
          event.resultSummaryEn ||
          `${event.actorDisplayName || "Curator"} determined the typical activity${activityTitle ? `: “${activityTitle}”` : ""}.`,
        comment: event.curatorComment,
      };
    }
    return {
      ru:
        event.resultSummaryRu ||
        `${event.actorDisplayName || "Куратор"} подтвердил, что подходящей типовой активности не найдено.`,
      en:
        event.resultSummaryEn ||
        `${event.actorDisplayName || "Curator"} confirmed that no suitable typical activity was found.`,
      comment: event.curatorComment,
    };
  }

  if (input.code === "parameter_check") {
    const event = input.events.find(
      (item) => item.eventCode === "related_parameter_catalog_checked",
    );
    return {
      ru: event?.resultSummaryRu || "Проверка системного каталога параметров и измерений завершена.",
      en: event?.resultSummaryEn || "The system parameter and measurement catalog check was completed.",
      comment: event?.curatorComment || null,
    };
  }

  if (input.code === "object_definition") {
    const created = input.events.find(
      (item) => item.eventCode === "observation_object_created",
    );
    const decision = input.events.find(
      (item) => item.eventCode === "measurable_object_decision_recorded",
    );
    const event = created || decision || input.events[0];
    return {
      ru: event?.resultSummaryRu || "Решение по измеримому объекту зафиксировано.",
      en: event?.resultSummaryEn || "The measurable-object decision was recorded.",
      comment: event?.curatorComment || null,
    };
  }

  return {
    ru: newest?.resultSummaryRu || newest?.labelRu || "Выполнено действие по обработке сигнала.",
    en: newest?.resultSummaryEn || newest?.labelEn || "A signal-processing action was completed.",
    comment: newest?.curatorComment || null,
  };
}


function normalizeResultSummary(eventCode: string, value: unknown, locale: "ru" | "en") {
  const raw = text(value);
  if (eventCode !== "existing_typical_activity_checked") return raw;
  if (locale === "ru" && raw === "Подходящей типовой активности в текущем профиле не найдено.") {
    return "Подходящей системной типовой активности на платформе не найдено.";
  }
  if (locale === "en" && raw === "No suitable typical activity was found in the current profile.") {
    return "No suitable system typical activity was found on the platform.";
  }
  return raw;
}

export async function readCuratorProcessingLogs(
  signals: readonly CuratorProcessingLogInput[],
): Promise<Record<string, CuratorProcessingLog>> {
  const uniqueSignals = [...new Map(signals.map((item) => [item.signalId, item])).values()];
  const output: Record<string, CuratorProcessingLog> = {};
  if (uniqueSignals.length === 0) return output;

  const signalIds = uniqueSignals.map((item) => item.signalId);
  const { data: rowsRaw, error } = await supabase
    .from("activity_processing_logs")
    .select("id,raw_signal_id,processing_status,metadata_json,started_at,created_at")
    .eq("processor_name", PROCESSOR_NAME)
    .eq("processor_version", PROCESSOR_VERSION)
    .in("raw_signal_id", signalIds)
    .order("started_at", { ascending: false });

  if (error) {
    throw new Error(`CURATOR_PROCESSING_LOG_READ_FAILED:${error.message}`);
  }

  const rows = (rowsRaw ?? []) as JourneyRow[];
  const metadataByRow = rows.map((row) => ({ row, metadata: asRecord(row.metadata_json) }));
  const appUserIds = new Set<string>();
  for (const signal of uniqueSignals) appUserIds.add(signal.userId);
  for (const item of metadataByRow) {
    const curatorId = text(item.metadata.curatorAppUserId);
    const targetId = text(item.metadata.targetCuratorAppUserId);
    if (curatorId) appUserIds.add(curatorId);
    if (targetId) appUserIds.add(targetId);
  }

  const userMap = new Map<string, AppUserRow>();
  if (appUserIds.size > 0) {
    const { data: usersRaw, error: usersError } = await supabase
      .from("app_users")
      .select("id,name,email")
      .in("id", [...appUserIds]);
    if (usersError) {
      throw new Error(`CURATOR_PROCESSING_LOG_USER_READ_FAILED:${usersError.message}`);
    }
    for (const row of (usersRaw ?? []) as AppUserRow[]) userMap.set(row.id, row);
  }

  const rowsBySignal = new Map<string, CuratorProcessingLogEvent[]>();
  for (const { row, metadata } of metadataByRow) {
    if (row.processing_status !== "completed") continue;
    const signalId = text(row.raw_signal_id);
    if (!signalId) continue;
    const eventCode = text(metadata.eventCode);
    if (!eventCode) continue;
    const actorAppUserId = text(metadata.curatorAppUserId) || null;
    const actorDisplayName =
      text(metadata.curatorNameSnapshot) ||
      (actorAppUserId
        ? displayName(userMap.get(actorAppUserId), actorAppUserId)
        : null);
    const event: CuratorProcessingLogEvent = {
      id: row.id,
      eventCode,
      occurredAt: iso(row.started_at || row.created_at) || row.created_at,
      checklistVersion: text(metadata.checklistVersion) || null,
      checklistStepCode: text(metadata.checklistStepCode) || null,
      checklistStepNameSnapshotRu: text(metadata.checklistStepNameSnapshotRu) || null,
      labelRu: text(metadata.labelRu) || null,
      labelEn: text(metadata.labelEn) || null,
      resultSummaryRu: normalizeResultSummary(eventCode, metadata.resultSummaryRu, "ru") || null,
      resultSummaryEn: normalizeResultSummary(eventCode, metadata.resultSummaryEn, "en") || null,
      actorAppUserId,
      actorDisplayName,
      actorRole: text(metadata.curatorRole) || null,
      curatorComment: text(metadata.curatorComment) || null,
      selectedTemplateId: text(metadata.selectedTemplateId) || null,
      selectedTemplateTitle: text(metadata.selectedTemplateTitle) || null,
      activityCheckResult: text(metadata.activityCheckResult) || null,
      parameterCheckResult: text(metadata.parameterCheckResult) || null,
    };
    const list = rowsBySignal.get(signalId) ?? [];
    list.push(event);
    rowsBySignal.set(signalId, list);
  }

  for (const signal of uniqueSignals) {
    const events = [...(rowsBySignal.get(signal.signalId) ?? [])].sort(
      (left, right) => right.occurredAt.localeCompare(left.occurredAt),
    );
    const sourceUserDisplayName = displayName(
      userMap.get(signal.userId),
      signal.userId,
    );
    const channel = sourceChannel(signal);
    const grouped = new Map<CuratorProcessingLogBlock["code"], CuratorProcessingLogEvent[]>();
    for (const event of events) {
      const code = blockCode(event.eventCode);
      const list = grouped.get(code) ?? [];
      list.push(event);
      grouped.set(code, list);
    }

    const blocks: CuratorProcessingLogBlock[] = [];
    for (const [code, blockEvents] of grouped.entries()) {
      const title = blockTitle(code);
      const summary = summarizeBlock({
        code,
        signal,
        sourceUserDisplayName,
        sourceChannelRu: channel.ru,
        sourceChannelEn: channel.en,
        events: blockEvents,
      });
      blocks.push({
        code,
        titleRu: title.ru,
        titleEn: title.en,
        latestAt: blockEvents[0]?.occurredAt || "",
        summaryRu: summary.ru,
        summaryEn: summary.en,
        comment: summary.comment,
        events: blockEvents,
      });
    }
    blocks.sort((left, right) => right.latestAt.localeCompare(left.latestAt));

    const workEvent = events.find(
      (event) =>
        event.eventCode === "curator_work_transferred" ||
        event.eventCode === "curator_work_started",
    );
    const typicalEvent = events.find(
      (event) => event.eventCode === "existing_typical_activity_checked",
    );
    const parameterEvent = events.find(
      (event) => event.eventCode === "related_parameter_catalog_checked",
    );
    const objectDecisionEvent = events.find(
      (event) => event.eventCode === "measurable_object_decision_recorded",
    );
    const objectCreatedEvent = events.find(
      (event) => event.eventCode === "observation_object_created",
    );
    const currentStageRu = objectCreatedEvent
      ? "Построение измеримого объекта"
      : objectDecisionEvent
        ? "Определение измеримого объекта завершено"
        : parameterEvent
          ? "Определение измеримого объекта"
          : typicalEvent
            ? "Проверка параметров и измерений"
            : workEvent
              ? "Определение типовой активности"
              : "Ожидает принятия в работу";
    const currentStageEn = objectCreatedEvent
      ? "Measurable object path construction"
      : objectDecisionEvent
        ? "Measurable object determination completed"
        : parameterEvent
          ? "Measurable object determination"
          : typicalEvent
            ? "Parameter and measurement check"
            : workEvent
              ? "Typical activity determination"
              : "Waiting to be taken into work";
    const last = events[0] ?? null;

    output[signal.signalId] = {
      currentStageRu,
      currentStageEn,
      currentResponsible: workEvent?.actorDisplayName || null,
      lastActionAt: last?.occurredAt || null,
      lastActionRu: last?.resultSummaryRu || last?.labelRu || null,
      lastActionEn: last?.resultSummaryEn || last?.labelEn || null,
      sourceUserDisplayName,
      sourceChannelRu: channel.ru,
      sourceChannelEn: channel.en,
      blocks,
    };
  }

  return output;
}

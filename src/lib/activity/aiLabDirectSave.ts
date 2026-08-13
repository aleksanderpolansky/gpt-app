export type AiLabSaveTemporalDirection = "past" | "future";

export type AiLabSelectedRowForTitle = {
  sourceFragment?: string | null;
  selected?: {
    title?: string | null;
    canonicalKey?: string | null;
  } | null;
};

export type AiLabDirectSaveRequestInput = {
  idempotencyKey: string;
  temporalDirection: AiLabSaveTemporalDirection;
  rawText: string;
  title: string;
  locale: string;
  timingLabel: string;
  analysisOperationId: string | null;
  manualFeedbackIds: string[];
  durationMinutes: number | null;
  observedDate: string | null;
  startedAt: string | null;
  endedAt: string | null;
  scheduleModeCode: "unscheduled" | "date_only" | "date_range" | "deadline" | "exact";
  scheduledDate: string | null;
  scheduleStartDate: string | null;
  scheduleEndDate: string | null;
  deadlineAt: string | null;
  plannedTargetValueObjectIds: string[];
};

const MAX_ACTIVITY_TITLE_CHARS = 180;

function compactText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
}

export function deriveAiLabActivityTitle(
  rawText: string,
  _rows: AiLabSelectedRowForTitle[] | null | undefined,
) {
  return compactText(rawText, MAX_ACTIVITY_TITLE_CHARS);
}

export function buildAiLabDirectActivityRequest(
  input: AiLabDirectSaveRequestInput,
): Record<string, unknown> {
  const rawText = input.rawText.trim();
  const title = compactText(input.title || rawText, MAX_ACTIVITY_TITLE_CHARS);
  const manualFeedbackIds = Array.from(new Set(input.manualFeedbackIds.filter(Boolean)));
  const plannedTargetValueObjectIds = Array.from(
    new Set(input.plannedTargetValueObjectIds.filter(Boolean)),
  );

  const common: Record<string, unknown> = {
    idempotencyKey: input.idempotencyKey,
    activityRoleCode: input.temporalDirection === "future" ? "planned" : "actual",
    title,
    rawText,
    inputText: rawText,
    description: `Source: activity_ai_lab_direct_save\nTiming: ${input.timingLabel}`,
    durationMinutes: input.durationMinutes,
    status: input.temporalDirection === "future" ? "planned" : "completed",
    source: "manual_form",
    privacyScope: "private",
    metadata: {
      sourceSurface: "activity_ai_lab",
      directSaveContract: "AI_A3_P5A_ACTIVITY_FACT_MATERIALIZATION_V1",
      locale: input.locale,
      aiAnalysisOperationId: input.analysisOperationId,
      manualLeafFeedbackIntentCount: manualFeedbackIds.length,
      observedDate: input.temporalDirection === "past" ? input.observedDate : null,
      factMaterializationPolicy: "server_validated_explicit_facts_on_save_p5a",
    },
  };

  if (input.temporalDirection === "past") {
    return {
      ...common,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      fulfillsPlannedActivityEventId: null,
    };
  }

  const future: Record<string, unknown> = {
    ...common,
    scheduleModeCode: input.scheduleModeCode,
    plannedTargetValueObjectIds,
  };

  if (input.scheduleModeCode === "date_only") {
    future.scheduledDate = input.scheduledDate;
  }

  if (input.scheduleModeCode === "date_range") {
    future.scheduleStartDate = input.scheduleStartDate;
    future.scheduleEndDate = input.scheduleEndDate;
  }

  if (input.scheduleModeCode === "deadline") {
    future.deadlineAt = input.deadlineAt;
  }

  if (input.scheduleModeCode === "exact") {
    future.startedAt = input.startedAt;
    future.endedAt = input.endedAt;
    future.createCalendarProjection = true;
  }

  return future;
}

export function buildAiLabDirectSaveReturnUrl(params: {
  temporalDirection: AiLabSaveTemporalDirection;
  locale: string;
  focusDate?: string | null;
}) {
  if (params.temporalDirection === "past") {
    return `/activity-today?${new URLSearchParams({ locale: params.locale }).toString()}`;
  }

  const query = new URLSearchParams({ locale: params.locale });

  if (params.focusDate) {
    query.set("focusDate", params.focusDate);
  }

  return `/calendar?${query.toString()}`;
}

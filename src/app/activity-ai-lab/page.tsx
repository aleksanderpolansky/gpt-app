"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { ActivityTimingEditorPp1 } from "@/components/activity/pp1/activity-timing-editor";
import { PlannedTargetSelectorPp1 } from "@/components/activity/pp1/planned-target-selector";
import {
  buildAiLabDirectActivityRequest,
  buildAiLabDirectSaveReturnUrl,
  deriveAiLabActivityTitle,
  type AiLabSaveTemporalDirection,
} from "@/lib/activity/aiLabDirectSave";
import {
  buildAiLabFactMaterializationCandidates,
} from "@/lib/activity/aiLabFactMaterialization";
import {
  AI_A3_P5C_QUICK_CAPTURE_REVIEW_CONTRACT,
  buildAiLabQuickCaptureReviewHref,
  buildAiLabQuickCaptureReviewSnapshot,
  buildAiLabQuickCaptureSequentialTimings,
  deriveAiLabQuickCaptureIdempotencyKey,
} from "@/lib/activity/aiLabQuickCapture";
import {
  datetimeLocalToIsoPp1,
  formatActivityTimingDraftPp1,
  getTimingFocusDatePp1,
  inferActivityTimingDraftPp1,
  parsePositiveDurationMinutesPp1,
  validateActivityTimingDraftPp1,
  type ActivityTimingDraftPp1,
} from "@/lib/activity/pp1/activityTiming";

type Locale = "ru" | "en" | "pl" | "uk" | "de" | "es" | "cs";

type TraceKind =
  | "system"
  | "model"
  | "check"
  | "fact"
  | "meaning"
  | "unresolved"
  | "fallback";

type FeedbackTargetKind =
  | "primary_selection"
  | "fact"
  | "semantic_projection"
  | "unresolved";

type FeedbackDescriptor = {
  targetKind: FeedbackTargetKind;
  targetKey: string;
  targetValueObjectId?: string | null;
  sourceContractCode?: string | null;
  proposalSnapshot: Record<string, unknown>;
  rationale: string;
};

type TraceLine = {
  kind: TraceKind;
  text: string;
  feedback?: FeedbackDescriptor;
};

type FeedbackStatus = {
  phase: "saving" | "saved" | "error";
  verdict?: "confirmed" | "rejected" | "commented";
  message?: string;
};

type SelectorItem = {
  id: string;
  title: string;
  canonicalKey?: string | null;
  scopeCode?: string | null;
  level?: string;
  pathText?: string;
};

type SelectorResponse = {
  ok?: boolean;
  valueObjects?: SelectorItem[];
  error?: string;
};

type ManualLinkIntent = {
  feedbackEventId: string;
  valueObjectId: string;
  title: string;
  canonicalKey?: string | null;
  pathText?: string;
  scopeCode?: string | null;
};

type DirectSaveStatus = "idle" | "saving" | "error";

type DirectSaveCheckpoint = {
  temporalDirection: AiLabSaveTemporalDirection;
  requestBodyHash: string;
  activityEventId: string;
  calendarEventId: string | null;
  manualFeedbackIds: string[];
};

type QuickCaptureStatus = "idle" | "saving" | "saved" | "error";

type QuickCaptureCreatedActivity = {
  activityEventId: string;
  temporalDirection: AiLabSaveTemporalDirection;
  factMaterializationWarning: string | null;
};

type ReviewQueueDetailResponse = {
  ok?: boolean;
  error?: string;
  activity?: {
    id?: string | null;
    title?: string | null;
    inputText?: string | null;
    reviewLocale?: string | null;
  } | null;
  reviewSnapshot?: {
    sourceFragment?: string | null;
    locale?: string | null;
    globalPreview?: GlobalPreview | null;
  } | null;
};


type GlobalFact = {
  parameterCode?: string;
  unit?: string;
  valueType?: string;
  valueNumeric?: number | null;
  valueText?: string | null;
  valueBoolean?: boolean | null;
  rawFragment?: string;
  factStatus?: string;
};

type SemanticProjection = {
  contractVersion?: string;
  projectionCode?: string;
  epistemicStatus?: string;
  targetCanonicalKey?: string;
  targetValueObjectId?: string;
  targetTitle?: string;
  targetNodeRoleCode?: string;
  targetFacetCode?: string;
  basisCode?: string;
  evidenceFragments?: string[];
  writeAllowed?: boolean;
  primaryClassificationChanged?: boolean;
};

type GlobalRow = {
  segmentId?: string;
  sourceFragment?: string;
  selected?: {
    valueObjectId?: string;
    canonicalKey?: string;
    title?: string;
    facetCode?: string;
    objectKindCode?: string | null;
    semanticMatchMethodCode?: string;
  } | null;
  confidence?: number;
  facts?: GlobalFact[];
  semanticProjections?: SemanticProjection[];
  temporal?: {
    occurredAtIso?: string | null;
    occurredAtRaw?: string | null;
    temporalPrecision?: string;
  };
};

type RoutingTraceRow = {
  segmentId?: string;
  sourceFragment?: string;
  lookupText?: string;
  rootCanonicalKey?: string;
  facetCode?: string;
  occurredAtIso?: string | null;
  occurredAtRaw?: string | null;
  temporalPrecision?: string;
};

type CandidateTrace = {
  valueObjectId?: string;
  canonicalKey?: string;
  title?: string;
  description?: string | null;
  facetCode?: string;
  objectKindCode?: string | null;
  allowedParameterCodes?: string[];
};

type CandidateGroupTrace = {
  segmentId?: string;
  resolutionMode?: "exact" | "bounded_candidates" | string;
  exactMatchKind?: string | null;
  candidates?: CandidateTrace[];
};

type GlobalPreview = {
  ok?: boolean;
  contractVersion?: string;
  previewOnly?: boolean;
  dbFactWriteExecuted?: boolean;
  operationId?: string;
  analysisExecutionId?: string;
  modelTier?: string;
  model?: string;
  reportedAt?: string;
  timeZone?: string;
  locale?: string;
  rows?: GlobalRow[];
  analysisTrace?: {
    routing?: RoutingTraceRow[];
    candidateGroups?: CandidateGroupTrace[];
  };
  safety?: {
    hardCapUsd?: number;
    providerCallsUsed?: number;
    automaticProviderRetries?: number;
    actualProviderCostUsd?: number | null;
    reservedMaximumProviderCostUsd?: number;
  };
  warnings?: string[];
  code?: string;
  error?: string;
  details?: unknown;
};

type SemanticPackage = {
  recognition?: {
    status?: string;
    detectedActivityTitle?: string;
  };
  measures?: Array<Record<string, unknown>>;
  semanticCategories?: Array<Record<string, unknown>>;
};

type SemanticPreview = {
  ok?: boolean;
  activityProcessingPackage?: SemanticPackage | null;
  error?: string;
  errors?: string[];
};

type AnalysisResult =
  | {
      mode: "global";
      payload: GlobalPreview;
      trace: TraceLine[];
    }
  | {
      mode: "fallback";
      payload: SemanticPreview;
      trace: TraceLine[];
      globalError: string;
    };

const LOCALES: Array<{ code: Locale; label: string }> = [
  { code: "ru", label: "Русский" },
  { code: "en", label: "English" },
  { code: "pl", label: "Polski" },
  { code: "uk", label: "Українська" },
  { code: "de", label: "Deutsch" },
  { code: "es", label: "Español" },
  { code: "cs", label: "Čeština" },
];

function createOperationId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `activity-ai-lab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createClientFeedbackId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);

  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function compactCandidateSnapshot(candidates: CandidateTrace[]) {
  return candidates.map((candidate) => ({
    valueObjectId: candidate.valueObjectId ?? null,
    canonicalKey: candidate.canonicalKey ?? null,
    title: candidate.title ?? null,
    facetCode: candidate.facetCode ?? null,
  }));
}

function formatModelConfidence(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${Math.round(value * 100)}%`
    : "не указана";
}

function formatUnknown(value: unknown) {
  if (value === null || typeof value === "undefined") {
    return null;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatFactValue(fact: GlobalFact) {
  if (typeof fact.valueNumeric === "number") {
    return `${fact.valueNumeric}${fact.unit ? ` ${fact.unit}` : ""}`;
  }

  if (typeof fact.valueText === "string") {
    return `${fact.valueText}${fact.unit ? ` ${fact.unit}` : ""}`;
  }

  if (typeof fact.valueBoolean === "boolean") {
    return `${fact.valueBoolean}${fact.unit ? ` ${fact.unit}` : ""}`;
  }

  return "значение не распознано";
}

const SEMANTIC_PROJECTION_LABELS: Record<string, string> = {
  purchase_contains_food_goods: "Покупка содержит пищевые товары",
  relevant_to_nutrition: "Связь с питанием и физиологическими потребностями",
  possible_household_provisioning: "Возможный бытовой контекст обеспечения",
  possible_family_benefit: "Возможная связь с обеспечением семьи",
};

const EPISTEMIC_STATUS_LABELS: Record<string, string> = {
  OBSERVED: "наблюдаемое",
  DECLARED: "явно сообщено пользователем",
  DERIVED: "выведено детерминированным правилом",
  INFERRED: "предположение по контексту",
  MODEL_HYPOTHESIS: "гипотеза модели",
};

function formatSemanticProjection(projection: SemanticProjection) {
  const label =
    SEMANTIC_PROJECTION_LABELS[projection.projectionCode ?? ""] ??
    projection.projectionCode ??
    "Дополнительный смысл";
  const status =
    EPISTEMIC_STATUS_LABELS[projection.epistemicStatus ?? ""] ??
    projection.epistemicStatus ??
    "статус не указан";
  const target = projection.targetCanonicalKey
    ? ` ЦО/область: ${projection.targetTitle ?? projection.targetCanonicalKey}` +
      ` [${projection.targetCanonicalKey}].`
    : "";
  const evidence = (projection.evidenceFragments ?? []).filter(Boolean);
  const evidenceText =
    evidence.length > 0
      ? ` Основание в тексте: ${evidence.map((item) => `«${item}»`).join(", ")}.`
      : "";
  const writeBoundary =
    projection.writeAllowed === false
      ? " Это только preview-связь и она не записывается в Reality Graph."
      : "";

  return `${label}. Статус: ${status}.${target}${evidenceText}${writeBoundary}`;
}

function buildGlobalTrace(inputText: string, payload: GlobalPreview): TraceLine[] {
  const rows = payload.rows ?? [];
  const routing = payload.analysisTrace?.routing ?? [];
  const candidateGroups = payload.analysisTrace?.candidateGroups ?? [];
  const groupBySegment = new Map(
    candidateGroups.map((group) => [group.segmentId ?? "", group]),
  );
  const routingBySegment = new Map(
    routing.map((segment) => [segment.segmentId ?? "", segment]),
  );

  const trace: TraceLine[] = [
    {
      kind: "system",
      text: `Получено сообщение: «${inputText}»`,
    },
    {
      kind: "system",
      text:
        `Запущен полный анализ Global Reality. Модель: ${payload.model ?? "не указана"}; ` +
        `уровень: ${payload.modelTier ?? "не указан"}.`,
    },
  ];

  rows.forEach((row, index) => {
    const segmentId = row.segmentId ?? "";
    const route = routingBySegment.get(segmentId);
    const group = groupBySegment.get(segmentId);
    const fragment =
      row.sourceFragment?.trim() ||
      route?.sourceFragment?.trim() ||
      "(фрагмент не указан)";

    trace.push({
      kind: "model",
      text:
        `Наблюдение ${index + 1}: модель выделила фрагмент «${fragment}». ` +
        `Для поиска сформулировано «${route?.lookupText ?? "не указано"}». ` +
        `Предварительная область: ${route?.rootCanonicalKey ?? "не указана"}; ` +
        `грань: ${route?.facetCode ?? "не указана"}.`,
    });

    const candidates = group?.candidates ?? [];

    if (group) {
      if (group.resolutionMode === "exact" && candidates.length === 1) {
        trace.push({
          kind: "check",
          text:
            `Проверка ЦО: сервер нашёл точное совпадение в живом глобальном реестре: ` +
            `«${candidates[0]?.title ?? candidates[0]?.canonicalKey ?? "без названия"}». ` +
            `Тип совпадения: ${group.exactMatchKind ?? "точное"}.`,
        });
      } else {
        const candidateText =
          candidates.length > 0
            ? candidates
                .map(
                  (candidate) =>
                    `«${candidate.title ?? candidate.canonicalKey ?? "без названия"}»` +
                    (candidate.canonicalKey
                      ? ` [${candidate.canonicalKey}]`
                      : ""),
                )
                .join("; ")
            : "кандидатов нет";

        trace.push({
          kind: "check",
          text:
            `Проверка ЦО: сервер реально прочитал глобальную онтологию и сформировал ` +
            `ограниченный список из ${candidates.length} кандидатов. ${candidateText}.`,
        });
      }
    } else {
      trace.push({
        kind: "unresolved",
        text:
          "Список серверных кандидатов в ответе отсутствует. Такой результат нельзя считать прозрачным.",
      });
    }

    if (row.selected) {
      trace.push({
        kind: "model",
        text:
          `Выбор модели: «${row.selected.title ?? row.selected.canonicalKey ?? "без названия"}» ` +
          `(${row.selected.canonicalKey ?? "canonical key не указан"}). ` +
          `Указанная моделью уверенность выбора среди разрешённых кандидатов: ` +
          `${formatModelConfidence(row.confidence)}. Это не вероятность истинности факта.`,
        feedback: {
          targetKind: "primary_selection",
          targetKey: `segment:${segmentId || index + 1}:primary_selection`,
          targetValueObjectId: row.selected.valueObjectId ?? null,
          sourceContractCode: payload.contractVersion ?? null,
          proposalSnapshot: {
            segmentId: segmentId || null,
            sourceFragment: fragment,
            selected: {
              valueObjectId: row.selected.valueObjectId ?? null,
              canonicalKey: row.selected.canonicalKey ?? null,
              title: row.selected.title ?? null,
              semanticMatchMethodCode:
                row.selected.semanticMatchMethodCode ?? null,
            },
            confidence: row.confidence ?? null,
            candidates: compactCandidateSnapshot(candidates),
          },
          rationale:
            `Модель выбирала только из ${candidates.length} серверных кандидатов. ` +
            `Её самооценка выбора: ${formatModelConfidence(row.confidence)}.`,
        },
      });

      trace.push({
        kind: "check",
        text:
          `Сервер подтвердил, что выбранный ЦО был внутри разрешённого набора. ` +
          `Способ сопоставления: ${row.selected.semanticMatchMethodCode ?? "не указан"}.`,
      });
    } else {
      trace.push({
        kind: "unresolved",
        text:
          `Для фрагмента «${fragment}» модель не выбрала листовой ЦО. ` +
          `Это сохраняется как неопределённость, а не заменяется выдуманным объектом.`,
        feedback: {
          targetKind: "unresolved",
          targetKey: `segment:${segmentId || index + 1}:unresolved`,
          targetValueObjectId: null,
          sourceContractCode: payload.contractVersion ?? null,
          proposalSnapshot: {
            segmentId: segmentId || null,
            sourceFragment: fragment,
            candidates: compactCandidateSnapshot(candidates),
          },
          rationale:
            candidates.length > 0
              ? `Сервер допустил ${candidates.length} вариантов, но модель не нашла достаточного основания выбрать один.`
              : "Сервер не нашёл допустимого листового кандидата для уверенного выбора.",
        },
      });
    }

    if (row.temporal?.occurredAtRaw || row.temporal?.occurredAtIso) {
      trace.push({
        kind: "check",
        text:
          `Время: исходный фрагмент «${row.temporal.occurredAtRaw ?? "нет"}»; ` +
          `точность ${row.temporal.temporalPrecision ?? "unknown"}; ` +
          `нормализованное время ${row.temporal.occurredAtIso ?? "не вычислено"}.`,
      });
    }

    const facts = row.facts ?? [];

    if (facts.length === 0) {
      trace.push({
        kind: "check",
        text:
          `Для наблюдения ${index + 1} нет явных фактов, которые одновременно присутствуют ` +
          `в тексте и разрешены параметрами выбранного ЦО.`,
      });
    }

    facts.forEach((fact, factIndex) => {
      const parameterCode = fact.parameterCode ?? `fact_${factIndex + 1}`;

      trace.push({
        kind: "fact",
        text:
          `${fact.parameterCode ?? "параметр"} = ${formatFactValue(fact)}. ` +
          `Основание: «${fact.rawFragment ?? "не указано"}». ` +
          `Статус: ${fact.factStatus ?? "proposed"}.`,
        feedback: {
          targetKind: "fact",
          targetKey: `segment:${segmentId || index + 1}:fact:${parameterCode}:${factIndex + 1}`,
          targetValueObjectId: row.selected?.valueObjectId ?? null,
          sourceContractCode: payload.contractVersion ?? null,
          proposalSnapshot: {
            segmentId: segmentId || null,
            parameterCode: fact.parameterCode ?? null,
            unit: fact.unit ?? null,
            valueType: fact.valueType ?? null,
            valueNumeric: fact.valueNumeric ?? null,
            valueText: fact.valueText ?? null,
            valueBoolean: fact.valueBoolean ?? null,
            rawFragment: fact.rawFragment ?? null,
            factStatus: fact.factStatus ?? "proposed",
            selectedCanonicalKey: row.selected?.canonicalKey ?? null,
          },
          rationale:
            `Факт предложен только из явного фрагмента «${fact.rawFragment ?? "не указано"}» ` +
            `и параметров выбранного ЦО.`,
        },
      });
    });

    (row.semanticProjections ?? []).forEach((projection, projectionIndex) => {
      const projectionCode =
        projection.projectionCode ?? `projection_${projectionIndex + 1}`;

      trace.push({
        kind: "meaning",
        text: formatSemanticProjection(projection),
        feedback: {
          targetKind: "semantic_projection",
          targetKey: `segment:${segmentId || index + 1}:projection:${projectionCode}`,
          targetValueObjectId: projection.targetValueObjectId ?? null,
          sourceContractCode:
            projection.contractVersion ?? payload.contractVersion ?? null,
          proposalSnapshot: {
            segmentId: segmentId || null,
            projectionCode: projection.projectionCode ?? null,
            epistemicStatus: projection.epistemicStatus ?? null,
            targetCanonicalKey: projection.targetCanonicalKey ?? null,
            targetValueObjectId: projection.targetValueObjectId ?? null,
            targetTitle: projection.targetTitle ?? null,
            targetNodeRoleCode: projection.targetNodeRoleCode ?? null,
            basisCode: projection.basisCode ?? null,
            evidenceFragments: projection.evidenceFragments ?? [],
            writeAllowed: projection.writeAllowed ?? false,
          },
          rationale:
            `Статус: ${EPISTEMIC_STATUS_LABELS[projection.epistemicStatus ?? ""] ?? projection.epistemicStatus ?? "не указан"}. ` +
            `Основание: ${(projection.evidenceFragments ?? []).filter(Boolean).map((item) => `«${item}»`).join(", ") || "не указано"}.`,
        },
      });
    });
  });

  const actualCost = payload.safety?.actualProviderCostUsd;
  trace.push({
    kind: "check",
    text:
      `Безопасность операции: вызовов модели ${payload.safety?.providerCallsUsed ?? "?"}; ` +
      `автоповторов ${payload.safety?.automaticProviderRetries ?? 0}; ` +
      `стоимость ${
        typeof actualCost === "number"
          ? `$${actualCost.toFixed(6)}`
          : "не определена"
      }; жёсткий предел $${payload.safety?.hardCapUsd ?? 0.1}.`,
  });

  trace.push({
    kind: "system",
    text:
      payload.dbFactWriteExecuted === true
        ? "ВНИМАНИЕ: ответ сообщает о записи факта."
        : "Анализатор сам не пишет факты. В P5C после успешной серверной валидации самостоятельные activity_event сохраняются автоматически, а допустимые явные факты материализуются отдельным guarded-шагом.",
  });

  (payload.warnings ?? []).forEach((warning) => {
    trace.push({ kind: "unresolved", text: warning });
  });

  return trace;
}

function buildFallbackTrace(
  inputText: string,
  payload: SemanticPreview,
  globalError: string,
): TraceLine[] {
  const pkg = payload.activityProcessingPackage;
  const categories = pkg?.semanticCategories ?? [];
  const measures = pkg?.measures ?? [];

  const trace: TraceLine[] = [
    {
      kind: "system",
      text: `Получено сообщение: «${inputText}»`,
    },
    {
      kind: "fallback",
      text:
        `Полный Global Reality анализ не выполнился: ${globalError}. ` +
        `Включён резервный технический разбор.`,
    },
    {
      kind: "fallback",
      text:
        "Важно: в резервном режиме OpenAI-модель НЕ вызывается и база ЦО НЕ читается. " +
        "Поэтому здесь нет настоящего сопоставления с ценными объектами и нельзя показывать проценты как уверенность AI.",
    },
  ];

  if (pkg?.recognition?.detectedActivityTitle) {
    trace.push({
      kind: "fallback",
      text:
        `Старый программный разбор сохранил текст активности как: ` +
        `«${pkg.recognition.detectedActivityTitle}».`,
    });
  }

  categories.forEach((category, index) => {
    const label =
      formatUnknown(category.labelRu) ??
      formatUnknown(category.label) ??
      formatUnknown(category.semanticObjectKey) ??
      `категория ${index + 1}`;

    trace.push({
      kind: "fallback",
      text:
        `Программное правило ${index + 1} заметило категорию «${label}». ` +
        "Это только словарное правило старого конвейера, не результат AI и не найденный ЦО.",
    });
  });

  measures.forEach((measure, index) => {
    trace.push({
      kind: "fact",
      text:
        `Простое правило извлечения величин ${index + 1}: ` +
        `${formatUnknown(measure.measureType) ?? "параметр"} = ` +
        `${formatUnknown(measure.numericValue) ?? formatUnknown(measure.textValue) ?? "не указано"} ` +
        `${formatUnknown(measure.unit) ?? ""}`.trim(),
    });
  });

  trace.push({
    kind: "unresolved",
    text:
      "ЦО в живой базе не искались. Сохранение этой активности с данного экрана заблокировано до успешного полного анализа.",
  });

  return trace;
}

function TracePanel({
  lines,
  loading,
  operationId,
}: {
  lines: TraceLine[];
  loading: boolean;
  operationId: string | null;
}) {
  const [feedbackState, setFeedbackState] = useState<Record<string, FeedbackStatus>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [whyOpen, setWhyOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setFeedbackState({});
    setEditingKey(null);
    setCommentDraft("");
    setWhyOpen({});
  }, [operationId]);

  const label: Record<TraceKind, string> = {
    system: "СИСТЕМА",
    model: "МОДЕЛЬ",
    check: "ПРОВЕРКА",
    fact: "ФАКТ",
    meaning: "СМЫСЛ",
    unresolved: "НЕОПР.",
    fallback: "РЕЗЕРВ",
  };

  const style: Record<TraceKind, string> = {
    system: "text-zinc-500",
    model: "text-fuchsia-300",
    check: "text-emerald-400",
    fact: "text-sky-400",
    meaning: "text-cyan-300",
    unresolved: "text-amber-400",
    fallback: "text-orange-400",
  };

  async function submitFeedback(
    feedback: FeedbackDescriptor,
    verdictCode: "confirmed" | "rejected" | "commented",
    explanationText?: string,
  ) {
    if (!operationId) {
      return;
    }

    const targetKey = feedback.targetKey;
    setFeedbackState((current) => ({
      ...current,
      [targetKey]: { phase: "saving", verdict: verdictCode },
    }));

    try {
      const response = await fetch("/api/ai/reality/feedback", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          operationId,
          clientFeedbackId: createClientFeedbackId(),
          targetKind: feedback.targetKind,
          targetKey: feedback.targetKey,
          targetValueObjectId: feedback.targetValueObjectId ?? null,
          verdictCode,
          sourceContractCode: feedback.sourceContractCode ?? null,
          proposalSnapshot: feedback.proposalSnapshot,
          explanationText: explanationText?.trim() || null,
          metadata: {
            interaction: "activity_ai_lab_trace_review",
          },
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || payload?.ok !== true) {
        throw new Error(payload?.error || `Feedback save failed: ${response.status}`);
      }

      setFeedbackState((current) => ({
        ...current,
        [targetKey]: {
          phase: "saved",
          verdict: verdictCode,
          message:
            verdictCode === "confirmed"
              ? "подтверждено"
              : verdictCode === "rejected"
                ? "отклонено"
                : "комментарий сохранён",
        },
      }));
      setEditingKey(null);
      setCommentDraft("");
    } catch (caught) {
      setFeedbackState((current) => ({
        ...current,
        [targetKey]: {
          phase: "error",
          verdict: verdictCode,
          message:
            caught instanceof Error ? caught.message : "Не удалось сохранить обратную связь",
        },
      }));
    }
  }

  return (
    <div className="rounded-3xl border border-emerald-900/70 bg-black p-5 shadow-2xl shadow-emerald-950/20">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">
            Журнал анализа
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Здесь показано, что модель предложила и что затем проверил сервер. Проценты
            показываются только там, где это действительно самооценка выбора модели.
          </p>
        </div>
        <span className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-500">
          {loading ? "обработка" : "готово"}
        </span>
      </div>

      <div className="max-h-[650px] space-y-2 overflow-auto font-mono text-xs leading-6">
        {lines.length === 0 ? (
          <p className="text-zinc-600">
            &gt; Введите сообщение и нажмите «Разобрать сообщение».
          </p>
        ) : null}

        {lines.map((line, index) => {
          const feedback = line.feedback;
          const state = feedback ? feedbackState[feedback.targetKey] : undefined;
          const isEditing = feedback ? editingKey === feedback.targetKey : false;
          const isWhyOpen = feedback ? whyOpen[feedback.targetKey] === true : false;
          const locked = state?.phase === "saving" || state?.phase === "saved";

          return (
            <div
              className="grid grid-cols-[82px_1fr] gap-3"
              key={`${index}-${line.text}`}
            >
              <span className={style[line.kind]}>{label[line.kind]}</span>
              <div className="min-w-0">
                <span className="whitespace-pre-wrap break-words text-zinc-200">
                  {line.text}
                </span>

                {feedback && operationId ? (
                  <div className="mt-1.5">
                    <div className="flex flex-wrap items-center gap-1.5 font-sans">
                      <button
                        aria-label="Подтвердить"
                        className="rounded-lg border border-emerald-900 px-2 py-0.5 text-xs font-semibold text-emerald-300 hover:border-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={locked}
                        onClick={() => void submitFeedback(feedback, "confirmed")}
                        title="Подтвердить"
                        type="button"
                      >
                        ✓
                      </button>
                      <button
                        aria-label="Отклонить"
                        className="rounded-lg border border-red-900 px-2 py-0.5 text-xs font-semibold text-red-300 hover:border-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={locked}
                        onClick={() => void submitFeedback(feedback, "rejected")}
                        title="Отклонить"
                        type="button"
                      >
                        ✕
                      </button>
                      <button
                        aria-label="Добавить объяснение"
                        className="rounded-lg border border-sky-900 px-2 py-0.5 text-xs font-semibold text-sky-300 hover:border-sky-600 disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={locked}
                        onClick={() => {
                          setEditingKey(isEditing ? null : feedback.targetKey);
                          setCommentDraft("");
                        }}
                        title="Добавить объяснение"
                        type="button"
                      >
                        ✎
                      </button>
                      <button
                        aria-label="Почему система так решила"
                        className="rounded-lg border border-zinc-700 px-2 py-0.5 text-xs font-semibold text-zinc-300 hover:border-zinc-500"
                        onClick={() =>
                          setWhyOpen((current) => ({
                            ...current,
                            [feedback.targetKey]: !isWhyOpen,
                          }))
                        }
                        title="Почему?"
                        type="button"
                      >
                        ?
                      </button>
                      {state?.phase === "saving" ? (
                        <span className="text-zinc-500">сохраняю…</span>
                      ) : null}
                      {state?.phase === "saved" ? (
                        <span className="text-emerald-400">{state.message}</span>
                      ) : null}
                      {state?.phase === "error" ? (
                        <span className="text-red-400">{state.message}</span>
                      ) : null}
                    </div>

                    {isWhyOpen ? (
                      <div className="mt-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 font-sans text-xs leading-5 text-zinc-400">
                        {feedback.rationale}
                      </div>
                    ) : null}

                    {isEditing ? (
                      <div className="mt-2 flex flex-col gap-2 font-sans">
                        <textarea
                          className="min-h-20 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs leading-5 text-zinc-200 outline-none focus:border-sky-600"
                          maxLength={4000}
                          onChange={(event) => setCommentDraft(event.target.value)}
                          placeholder="Что именно система поняла правильно или неправильно?"
                          value={commentDraft}
                        />
                        <div className="flex gap-2">
                          <button
                            className="rounded-lg border border-sky-800 px-3 py-1 text-xs font-semibold text-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
                            disabled={!commentDraft.trim() || state?.phase === "saving"}
                            onClick={() =>
                              void submitFeedback(feedback, "commented", commentDraft)
                            }
                            type="button"
                          >
                            Сохранить комментарий
                          </button>
                          <button
                            className="rounded-lg border border-zinc-800 px-3 py-1 text-xs text-zinc-400"
                            onClick={() => {
                              setEditingKey(null);
                              setCommentDraft("");
                            }}
                            type="button"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}

        {loading ? (
          <div className="grid grid-cols-[82px_1fr] gap-3">
            <span className="text-zinc-500">СИСТЕМА</span>
            <span className="animate-pulse text-zinc-400">
              Выполняется полный анализ…
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ManualLeafLinkPicker({
  operationId,
  links,
  onLinksChange,
  disabled = false,
}: {
  operationId: string;
  links: ManualLinkIntent[];
  onLinksChange: (links: ManualLinkIntent[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SelectorItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          q: query.trim(),
          level: "leaf",
          limit: "24",
          includeGlobal: "1",
        });
        const response = await fetch(`/api/value-objects/selector?${params.toString()}`, {
          credentials: "include",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => null)) as SelectorResponse | null;

        if (!response.ok || payload?.ok !== true) {
          throw new Error(payload?.error || `VO search failed: ${response.status}`);
        }

        setResults((payload.valueObjects ?? []).filter((item) => item.level === "leaf"));
      } catch (caught) {
        if (controller.signal.aborted) {
          return;
        }
        setError(caught instanceof Error ? caught.message : "Не удалось выполнить поиск ЦО");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

  async function addManualLink(item: SelectorItem) {
    if (disabled || links.some((link) => link.valueObjectId === item.id)) {
      return;
    }

    setAddingId(item.id);
    setError(null);

    try {
      const response = await fetch("/api/ai/reality/feedback", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          operationId,
          clientFeedbackId: createClientFeedbackId(),
          targetKind: "manual_leaf_link",
          targetKey: `manual_leaf_link:${item.id}`,
          targetValueObjectId: item.id,
          verdictCode: "manual_link_added",
          sourceContractCode: "AI_A3_P2_FEEDBACK_REVIEW_UX_V1",
          proposalSnapshot: {
            valueObjectId: item.id,
            canonicalKey: item.canonicalKey ?? null,
            title: item.title,
            pathText: item.pathText ?? null,
            scopeCode: item.scopeCode ?? null,
            source: "manual_leaf_search",
          },
          metadata: {
            interaction: "activity_ai_lab_manual_leaf_link",
          },
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
            feedbackEvent?: { id?: string };
          }
        | null;

      if (!response.ok || payload?.ok !== true || !payload.feedbackEvent?.id) {
        throw new Error(payload?.error || `Manual link save failed: ${response.status}`);
      }

      onLinksChange([
        ...links,
        {
          feedbackEventId: payload.feedbackEvent.id,
          valueObjectId: item.id,
          title: item.title,
          canonicalKey: item.canonicalKey ?? null,
          pathText: item.pathText,
          scopeCode: item.scopeCode ?? null,
        },
      ]);
      setQuery("");
      setResults([]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось добавить связь");
    } finally {
      setAddingId(null);
    }
  }

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4">
      <button
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-zinc-700 bg-black/40 px-4 py-3 text-left text-sm font-semibold text-zinc-200 hover:border-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>+ Добавить связь с ЦО</span>
        <span className="text-xs font-normal text-zinc-500">
          только листовой объект
        </span>
      </button>

      {links.length > 0 ? (
        <div className="mt-3 space-y-2">
          {links.map((link) => (
            <div
              className="rounded-xl border border-emerald-900/70 bg-emerald-950/20 px-3 py-2 text-xs leading-5"
              key={link.feedbackEventId}
            >
              <span className="font-semibold text-emerald-300">✓ {link.title}</span>
              {link.canonicalKey ? (
                <span className="ml-2 text-zinc-500">[{link.canonicalKey}]</span>
              ) : null}
              {link.pathText ? (
                <div className="text-zinc-500">{link.pathText}</div>
              ) : null}
            </div>
          ))}
          <p className="text-xs leading-5 text-zinc-500">
            Эти ручные связи уже сохранены как намерения Data Capital и будут
            материализованы как semantic_exposure после создания активности.
          </p>
        </div>
      ) : null}

      {open ? (
        <div className="mt-3 space-y-3">
          <input
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={disabled}
            onChange={(event) => {
              const nextQuery = event.target.value;
              setQuery(nextQuery);
              if (nextQuery.trim().length < 2) {
                setResults([]);
                setLoading(false);
                setError(null);
              }
            }}
            placeholder="Начни вводить название ЦО…"
            value={query}
          />

          {query.trim().length < 2 ? (
            <p className="text-xs text-zinc-600">Введи минимум 2 символа.</p>
          ) : null}
          {loading ? <p className="text-xs text-zinc-500">Ищу…</p> : null}
          {error ? <p className="text-xs text-red-400">{error}</p> : null}

          {results.length > 0 ? (
            <div className="max-h-72 space-y-1 overflow-auto rounded-2xl border border-zinc-800 bg-black p-2">
              {results.map((item) => {
                const selected = links.some((link) => link.valueObjectId === item.id);
                return (
                  <button
                    className="w-full rounded-xl px-3 py-2 text-left hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={disabled || selected || addingId === item.id}
                    key={item.id}
                    onClick={() => void addManualLink(item)}
                    type="button"
                  >
                    <div className="text-sm font-semibold text-zinc-200">
                      {selected ? "✓ " : ""}{item.title}
                    </div>
                    <div className="text-xs leading-5 text-zinc-600">
                      {item.pathText || item.canonicalKey || item.id}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function ActivityAiLabPage() {
  const router = useRouter();
  const [inputText, setInputText] = useState("");
  const [locale, setLocale] = useState<Locale>("ru");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trace, setTrace] = useState<TraceLine[]>([]);
  const [manualLinks, setManualLinks] = useState<ManualLinkIntent[]>([]);
  const [analyzedText, setAnalyzedText] = useState<string | null>(null);
  const [analyzedLocale, setAnalyzedLocale] = useState<Locale | null>(null);
  const [saveMode, setSaveMode] = useState<AiLabSaveTemporalDirection | null>(null);
  const [saveTitle, setSaveTitle] = useState("");
  const [timingDraft, setTimingDraft] = useState<ActivityTimingDraftPp1>(() =>
    inferActivityTimingDraftPp1("", "past"),
  );
  const [plannedTargetValueObjectIds, setPlannedTargetValueObjectIds] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<DirectSaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveCheckpoint, setSaveCheckpoint] = useState<DirectSaveCheckpoint | null>(null);
  const [reviewActivityEventId, setReviewActivityEventId] = useState<string | null>(null);
  const [reviewModeInitialized, setReviewModeInitialized] = useState(false);
  const [reviewEditing, setReviewEditing] = useState(false);
  const [quickCaptureStatus, setQuickCaptureStatus] = useState<QuickCaptureStatus>("idle");
  const [quickCaptureMessage, setQuickCaptureMessage] = useState<string | null>(null);
  const saveRequestIds = useRef<Record<AiLabSaveTemporalDirection, string>>({
    past: createOperationId(),
    future: createOperationId(),
  });

  const timeZone =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
      : "UTC";

  const analysisOperationId =
    result?.mode === "global" ? result.payload.operationId?.trim() ?? "" : "";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const activityEventId = params.get("reviewActivityEventId")?.trim() || null;
    const reviewInitTimer = window.setTimeout(() => {
      setReviewActivityEventId(activityEventId);
      setReviewModeInitialized(true);
    }, 0);

    return () => {
      window.clearTimeout(reviewInitTimer);
    };
  }, []);

  useEffect(() => {
    if (!reviewModeInitialized || !reviewActivityEventId) {
      return;
    }

    let cancelled = false;
    const targetActivityEventId = reviewActivityEventId;

    async function loadReviewActivity() {
      setLoading(true);
      setError(null);
      setReviewEditing(false);

      try {
        const query = new URLSearchParams({ activityEventId: targetActivityEventId });
        const response = await fetch(`/api/activity/review-queue?${query.toString()}`, {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const payload = (await response.json().catch(() => null)) as
          | ReviewQueueDetailResponse
          | null;

        if (!response.ok || payload?.ok !== true) {
          throw new Error(payload?.error || `Review activity request failed: ${response.status}`);
        }

        const preview = payload.reviewSnapshot?.globalPreview ?? null;
        const sourceText =
          payload.reviewSnapshot?.sourceFragment?.trim() ||
          payload.activity?.inputText?.trim() ||
          "";
        const nextLocale = payload.reviewSnapshot?.locale;
        const normalizedLocale = LOCALES.some((item) => item.code === nextLocale)
          ? (nextLocale as Locale)
          : locale;

        if (!preview || preview.ok !== true || !sourceText) {
          throw new Error("Stored P5C review snapshot is incomplete.");
        }

        if (cancelled) {
          return;
        }

        const nextTrace = buildGlobalTrace(sourceText, preview);
        setInputText(sourceText);
        setLocale(normalizedLocale);
        setResult({ mode: "global", payload: preview, trace: nextTrace });
        setTrace(nextTrace);
        setAnalyzedText(sourceText);
        setAnalyzedLocale(normalizedLocale);
        setManualLinks([]);
        setQuickCaptureStatus("saved");
        setQuickCaptureMessage("Активность уже сохранена и ожидает проверки.");
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Не удалось загрузить активность для проверки.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadReviewActivity();

    return () => {
      cancelled = true;
    };
  }, [locale, reviewActivityEventId, reviewModeInitialized]);

  const factMaterializationCandidates = useMemo(
    () =>
      result?.mode === "global"
        ? buildAiLabFactMaterializationCandidates(
            result.payload.rows,
            result.payload.contractVersion ?? null,
          )
        : [],
    [result],
  );

  const fullAnalysisSucceeded =
    result?.mode === "global" &&
    result.payload.ok === true &&
    analyzedText === inputText.trim() &&
    analyzedLocale === locale;

  const timingValidation = useMemo(
    () =>
      saveMode
        ? validateActivityTimingDraftPp1(timingDraft, saveMode)
        : { ok: true, errors: [] },
    [saveMode, timingDraft],
  );

  const timingLabel = useMemo(
    () =>
      saveMode
        ? formatActivityTimingDraftPp1(timingDraft, saveMode, locale)
        : "",
    [locale, saveMode, timingDraft],
  );

  const timingFocusDate = useMemo(
    () => (saveMode ? getTimingFocusDatePp1(timingDraft, saveMode) : null),
    [saveMode, timingDraft],
  );

  function resetSaveState() {
    setSaveMode(null);
    setSaveTitle("");
    setPlannedTargetValueObjectIds([]);
    setSaveStatus("idle");
    setSaveError(null);
    setSaveCheckpoint(null);
    setQuickCaptureStatus("idle");
    setQuickCaptureMessage(null);
    saveRequestIds.current = {
      past: createOperationId(),
      future: createOperationId(),
    };
  }

  function invalidateAnalysisArtifacts() {
    setResult(null);
    setTrace([]);
    setManualLinks([]);
    setAnalyzedText(null);
    setAnalyzedLocale(null);
    setError(null);
    resetSaveState();
  }

  async function persistQuickCapture(
    payload: GlobalPreview,
    sourceMessageText: string,
  ) {
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    const operationId = payload.operationId?.trim() || "";

    if (rows.length === 0) {
      throw new Error("Полный анализ не вернул ни одной самостоятельной активности/наблюдения.");
    }

    if (!operationId) {
      throw new Error("Полный анализ не вернул operationId для безопасного сохранения.");
    }

    setQuickCaptureStatus("saving");
    setQuickCaptureMessage(
      rows.length === 1
        ? "Анализ завершён. Сохраняю активность и добавляю её в «Требуют проверки»…"
        : `Анализ завершён. Сохраняю ${rows.length} самостоятельных активностей и добавляю их в «Требуют проверки»…`,
    );
    const createdActivities: QuickCaptureCreatedActivity[] = [];
    const sourceFragments = rows.map(
      (row) => row.sourceFragment?.trim() || sourceMessageText,
    );
    const sequentialTimings = buildAiLabQuickCaptureSequentialTimings({
      rows,
      sourceTexts: sourceFragments,
      locale,
      reportedAt: payload.reportedAt ?? null,
    });

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const sourceFragment = sourceFragments[index];
      const timing = sequentialTimings[index];
      const title = deriveAiLabActivityTitle(sourceFragment, [row]);
      const baseRequestBody = buildAiLabDirectActivityRequest({
        idempotencyKey: deriveAiLabQuickCaptureIdempotencyKey({
          operationId,
          segmentId: row.segmentId ?? null,
          index,
        }),
        temporalDirection: timing.temporalDirection,
        rawText: sourceFragment,
        title,
        locale,
        timingLabel: timing.timingLabel,
        analysisOperationId: operationId,
        manualFeedbackIds: [],
        durationMinutes: timing.durationMinutes,
        observedDate: timing.observedDate,
        startedAt: timing.startedAt,
        endedAt: timing.endedAt,
        scheduleModeCode: timing.draft.scheduleModeCode,
        scheduledDate: timing.draft.scheduledDate || null,
        scheduleStartDate: timing.draft.scheduleStartDate || null,
        scheduleEndDate: timing.draft.scheduleEndDate || null,
        deadlineAt: timing.deadlineAt,
        plannedTargetValueObjectIds: [],
      });
      const baseMetadata =
        baseRequestBody.metadata &&
        typeof baseRequestBody.metadata === "object" &&
        !Array.isArray(baseRequestBody.metadata)
          ? (baseRequestBody.metadata as Record<string, unknown>)
          : {};
      const requestBody = {
        ...baseRequestBody,
        metadata: {
          ...baseMetadata,
        quickCaptureContract: AI_A3_P5C_QUICK_CAPTURE_REVIEW_CONTRACT,
        quickCaptureReviewRequired: true,
        quickCaptureReviewStatus: "pending",
        quickCaptureSourceMessageText: sourceMessageText,
        quickCaptureSourceSegmentId: row.segmentId ?? `segment-${index + 1}`,
        quickCaptureSourceSegmentOrdinal: index + 1,
        quickCaptureSourceSegmentCount: rows.length,
        quickCaptureTemporalSequencePolicy:
          "independent_events_named_order_no_invented_breaks",
          quickCaptureReviewSnapshot: buildAiLabQuickCaptureReviewSnapshot({
            preview: payload,
            row,
            sourceMessageText,
            sourceFragment,
            locale,
            temporalDirection: timing.temporalDirection,
          }),
        },
      };

      const response = await fetch("/api/activity/events", {
        credentials: "include",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      const eventPayload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
            event?: { id?: string | null };
            activityEvent?: { id?: string | null };
          }
        | null;

      if (!response.ok || eventPayload?.ok === false) {
        throw new Error(
          eventPayload?.error ||
            `Не удалось автоматически сохранить активность ${index + 1}: HTTP ${response.status}`,
        );
      }

      const activityEventId =
        eventPayload?.activityEvent?.id ?? eventPayload?.event?.id ?? null;

      if (!activityEventId) {
        throw new Error(`Сервер не вернул id активности ${index + 1}.`);
      }

      let factMaterializationWarning: string | null = null;
      const candidates = buildAiLabFactMaterializationCandidates(
        [row],
        payload.contractVersion ?? null,
      );

      if (candidates.length > 0) {
        const factResponse = await fetch("/api/ai/reality/fact-materialize", {
          credentials: "include",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            activityEventId,
            operationId,
            candidates,
          }),
        });
        const factPayload = (await factResponse.json().catch(() => null)) as
          | { ok?: boolean; error?: string }
          | null;

        if (!factResponse.ok || factPayload?.ok !== true) {
          factMaterializationWarning =
            factPayload?.error ||
            `Явные факты не материализованы: HTTP ${factResponse.status}`;
        }
      }

      createdActivities.push({
        activityEventId,
        temporalDirection: timing.temporalDirection,
        factMaterializationWarning,
      });
    }

    setQuickCaptureStatus("saved");
    const warnings = createdActivities
      .map((item) => item.factMaterializationWarning)
      .filter((item): item is string => Boolean(item));
    setQuickCaptureMessage(
      warnings.length > 0
        ? `Активности сохранены. ${warnings.length} запись(и) требуют проверки материализации фактов.`
        : "Активности сохранены и добавлены в «Требуют проверки».",
    );

    if (createdActivities.length === 1) {
      router.push(
        buildAiLabQuickCaptureReviewHref({
          locale,
          activityEventId: createdActivities[0].activityEventId,
        }),
      );
      return;
    }

    router.push(buildAiLabQuickCaptureReviewHref({ locale }));
  }

  async function analyze() {
    const text = inputText.trim();

    if (!text) {
      setError("Сначала напиши, что произошло.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setManualLinks([]);
    setAnalyzedText(null);
    setAnalyzedLocale(null);
    resetSaveState();
    setQuickCaptureStatus("idle");
    setQuickCaptureMessage(null);
    setTrace([
      { kind: "system", text: `Получено сообщение: «${text}»` },
      {
        kind: "system",
        text:
          "Запускаю полный анализ: выделение наблюдений → реальные кандидаты ЦО → выбор модели → проверка фактов сервером.",
      },
    ]);

    try {
      const globalResponse = await fetch(
        "/api/ai/reality/global-observation-preview",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            inputText: text,
            locale,
            timeZone,
            operationId: createOperationId(),
          }),
        },
      );

      const globalPayload = (await globalResponse
        .json()
        .catch(() => null)) as GlobalPreview | null;

      if (globalResponse.ok && globalPayload?.ok === true) {
        const nextTrace = buildGlobalTrace(text, globalPayload);
        setResult({ mode: "global", payload: globalPayload, trace: nextTrace });
        setTrace(nextTrace);
        setAnalyzedText(text);
        setAnalyzedLocale(locale);
        await persistQuickCapture(globalPayload, text);
        return;
      }

      const globalError =
        globalPayload?.error ||
        globalPayload?.code ||
        `HTTP ${globalResponse.status}`;

      const fallbackResponse = await fetch(
        "/api/activity/semantic-orchestration-preview",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            rawText: text,
            inputLanguage: locale === "uk" ? "ru" : locale,
            source: "manual",
            mode: "preview_only",
          }),
        },
      );

      const fallbackPayload = (await fallbackResponse
        .json()
        .catch(() => null)) as SemanticPreview | null;

      if (!fallbackPayload) {
        throw new Error(
          `${globalError}; резервный разбор также не вернул корректный ответ.`,
        );
      }

      const nextTrace = buildFallbackTrace(text, fallbackPayload, globalError);
      setResult({
        mode: "fallback",
        payload: fallbackPayload,
        trace: nextTrace,
        globalError,
      });
      setTrace(nextTrace);
      setAnalyzedText(text);
      setAnalyzedLocale(locale);
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Неизвестная ошибка анализа.";
      setError(message);
      setQuickCaptureStatus((current) => current === "saving" ? "error" : current);
      setQuickCaptureMessage((current) => current || message);
      setTrace((current) => [
        ...current,
        { kind: "unresolved", text: `Анализ остановлен: ${message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDirectSave() {
    if (
      !saveMode ||
      !fullAnalysisSucceeded ||
      result?.mode !== "global" ||
      saveStatus === "saving"
    ) {
      return;
    }

    const rawText = inputText.trim();
    const title = saveTitle.trim();

    if (!rawText || !title) {
      setSaveStatus("error");
      setSaveError("Нужно указать название активности.");
      return;
    }

    if (!timingValidation.ok) {
      setSaveStatus("error");
      setSaveError(`Проверь время: ${timingValidation.errors.join(", ")}`);
      return;
    }

    const manualFeedbackIds = manualLinks.map((link) => link.feedbackEventId);

    if (manualFeedbackIds.length > 0 && !analysisOperationId) {
      setSaveStatus("error");
      setSaveError("Ручные связи с ЦО требуют идентификатор завершённого анализа.");
      return;
    }

    const startedAt = datetimeLocalToIsoPp1(timingDraft.startedAtLocal);
    const endedAt = datetimeLocalToIsoPp1(timingDraft.endedAtLocal);
    const deadlineAt = datetimeLocalToIsoPp1(timingDraft.deadlineLocal);
    const durationMinutes = parsePositiveDurationMinutesPp1(
      timingDraft.durationMinutes,
    );

    const requestBody = buildAiLabDirectActivityRequest({
      idempotencyKey: saveRequestIds.current[saveMode],
      temporalDirection: saveMode,
      rawText,
      title,
      locale,
      timingLabel,
      analysisOperationId: analysisOperationId || null,
      manualFeedbackIds,
      durationMinutes,
      observedDate: timingDraft.observedDate || null,
      startedAt,
      endedAt,
      scheduleModeCode: timingDraft.scheduleModeCode,
      scheduledDate: timingDraft.scheduledDate || null,
      scheduleStartDate: timingDraft.scheduleStartDate || null,
      scheduleEndDate: timingDraft.scheduleEndDate || null,
      deadlineAt,
      plannedTargetValueObjectIds,
    });

    const requestBodyHash = JSON.stringify(requestBody);

    if (
      saveCheckpoint &&
      (saveCheckpoint.temporalDirection !== saveMode ||
        saveCheckpoint.requestBodyHash !== requestBodyHash)
    ) {
      setSaveStatus("error");
      setSaveError(
        "Активность уже создана, поэтому параметры сохранения зафиксированы. Повтори завершение сохранения без изменения полей.",
      );
      return;
    }

    setSaveStatus("saving");
    setSaveError(null);

    let checkpoint = saveCheckpoint;

    try {
      if (!checkpoint) {
        const response = await fetch("/api/activity/events", {
          credentials: "include",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        const payload = (await response.json().catch(() => null)) as
          | {
              ok?: boolean;
              error?: string;
              event?: { id?: string | null };
              activityEvent?: { id?: string | null };
              calendarEvent?: { id?: string | null } | null;
            }
          | null;

        if (!response.ok || payload?.ok === false) {
          throw new Error(
            payload?.error || `Не удалось создать активность: HTTP ${response.status}`,
          );
        }

        const activityEventId =
          payload?.activityEvent?.id ?? payload?.event?.id ?? null;

        if (!activityEventId) {
          throw new Error("Сервер не вернул id созданной активности.");
        }

        checkpoint = {
          temporalDirection: saveMode,
          requestBodyHash,
          activityEventId,
          calendarEventId: payload?.calendarEvent?.id ?? null,
          manualFeedbackIds,
        };
        setSaveCheckpoint(checkpoint);
      }

      if (factMaterializationCandidates.length > 0) {
        if (!analysisOperationId) {
          throw new Error(
            "Явные факты требуют идентификатор завершённого анализа.",
          );
        }

        const factMaterializeResponse = await fetch(
          "/api/ai/reality/fact-materialize",
          {
            credentials: "include",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              activityEventId: checkpoint.activityEventId,
              operationId: analysisOperationId,
              candidates: factMaterializationCandidates,
            }),
          },
        );

        const factMaterializePayload = (await factMaterializeResponse
          .json()
          .catch(() => null)) as
          | {
              ok?: boolean;
              error?: string;
              materializedFactCount?: number;
            }
          | null;

        if (!factMaterializeResponse.ok || factMaterializePayload?.ok !== true) {
          throw new Error(
            factMaterializePayload?.error ||
              `Активность создана, но явные факты не материализованы: HTTP ${factMaterializeResponse.status}`,
          );
        }
      }

      if (checkpoint.manualFeedbackIds.length > 0) {
        const materializeResponse = await fetch(
          "/api/ai/reality/manual-link-materialize",
          {
            credentials: "include",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              activityEventId: checkpoint.activityEventId,
              operationId: analysisOperationId,
              feedbackEventIds: checkpoint.manualFeedbackIds,
            }),
          },
        );

        const materializePayload = (await materializeResponse
          .json()
          .catch(() => null)) as
          | {
              ok?: boolean;
              error?: string;
            }
          | null;

        if (!materializeResponse.ok || materializePayload?.ok !== true) {
          throw new Error(
            materializePayload?.error ||
              `Активность создана, но ручные связи с ЦО не завершены: HTTP ${materializeResponse.status}`,
          );
        }
      }

      setSaveStatus("idle");
      router.push(
        buildAiLabDirectSaveReturnUrl({
          temporalDirection: saveMode,
          locale,
          focusDate: timingFocusDate,
        }),
      );
    } catch (caught) {
      setSaveStatus("error");
      setSaveError(
        caught instanceof Error ? caught.message : "Не удалось сохранить активность.",
      );
    }
  }

  const rawPayload = result?.payload ?? null;

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 text-zinc-100 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">
            ARCTor · реальный журнал активности
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
            Сообщить, что произошло
          </h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-zinc-400">
            Лучше описывать один основной эпизод за сообщение. В том же сообщении можно
            указать параллельные действия, мысли, чувства, участников и измеренные величины.
          </p>
          <div className="mt-4 rounded-2xl border border-amber-900/60 bg-amber-950/20 p-4 text-xs leading-5 text-amber-100">
            Журнал не показывает скрытые внутренние рассуждения модели. Он показывает
            проверяемый результат обработки: что выделила модель, какие реальные ЦО
            сервер дал ей на выбор, что она выбрала, какие факты извлечены и что сервер
            подтвердил или оставил неопределённым, а также какие вторичные смысловые
            проекции сервер вывел отдельно от основного ЦО.
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5">
            <label
              className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
              htmlFor="activity-ai-input"
            >
              Сообщение
            </label>

            <textarea
              className="mt-3 min-h-52 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-4 text-base leading-7 text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={Boolean(saveCheckpoint?.activityEventId) || Boolean(reviewActivityEventId)}
              id="activity-ai-input"
              onChange={(event) => {
                const nextValue = event.target.value;

                if (analyzedText !== null && nextValue.trim() !== analyzedText) {
                  invalidateAnalysisArtifacts();
                }

                setInputText(nextValue);
              }}
              placeholder="Например: сходил в магазин, купил две консервы тунца и макароны, заплатил 20 злотых."
              value={inputText}
            />

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-zinc-500" htmlFor="activity-ai-locale">
                  Язык сообщения
                </label>
                <select
                  className="mt-2 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-sm outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={Boolean(saveCheckpoint?.activityEventId) || Boolean(reviewActivityEventId)}
                  id="activity-ai-locale"
                  onChange={(event) => {
                    const nextLocale = event.target.value as Locale;

                    if (analyzedLocale !== null && nextLocale !== analyzedLocale) {
                      invalidateAnalysisArtifacts();
                    }

                    setLocale(nextLocale);
                  }}
                  value={locale}
                >
                  {LOCALES.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-black/50 p-4">
                <p className="text-xs text-zinc-500">Часовой пояс</p>
                <p className="mt-2 break-all text-sm text-zinc-200">{timeZone}</p>
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={loading || !inputText.trim() || Boolean(saveCheckpoint?.activityEventId) || Boolean(reviewActivityEventId)}
                onClick={() => void analyze()}
                type="button"
              >
                {loading ? "Разбираю…" : "Разобрать активность"}
              </button>

              <button
                className="rounded-2xl border border-zinc-700 px-4 py-3 text-sm text-zinc-300 hover:border-zinc-500"
                disabled={loading || Boolean(saveCheckpoint?.activityEventId) || Boolean(reviewActivityEventId)}
                onClick={() => {
                  setInputText("");
                  invalidateAnalysisArtifacts();
                }}
                type="button"
              >
                Очистить
              </button>
            </div>

            <div className="mt-6 border-t border-zinc-800 pt-5">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                После проверки
              </p>

              {fullAnalysisSucceeded ? (
                <div className="mt-3 space-y-3">
                  {reviewActivityEventId ? (
                    <button
                      className="w-full rounded-2xl bg-blue-500 px-4 py-3 text-center text-sm font-semibold text-black hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={reviewEditing}
                      onClick={() => setReviewEditing(true)}
                      type="button"
                    >
                      Внести изменения
                    </button>
                  ) : (
                    <div className="rounded-2xl border border-emerald-900/70 bg-emerald-950/20 p-4 text-sm leading-6 text-emerald-200">
                      {quickCaptureStatus === "saving"
                        ? quickCaptureMessage || "Сохраняю активность…"
                        : quickCaptureStatus === "saved"
                          ? quickCaptureMessage || "Активность сохранена и добавлена в «Требуют проверки»."
                          : quickCaptureStatus === "error"
                            ? quickCaptureMessage || "Автоматическое сохранение не завершено."
                            : "После успешного полного анализа активность сохраняется автоматически."}
                    </div>
                  )}

                  {saveMode ? (
                    <div className="rounded-2xl border border-zinc-700 bg-black/40 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-zinc-100">
                            {saveMode === "past"
                              ? "Прошедшая активность → журнал"
                              : "Будущая активность → календарь"}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-zinc-500">
                            Промежуточный «Контейнер активности» для этого маршрута больше
                            не используется. Сохраняется каноническая activity_event.
                          </p>
                        </div>
                        <span className="rounded-full border border-zinc-700 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                          direct save
                        </span>
                      </div>

                      {saveCheckpoint?.activityEventId ? (
                        <div className="mt-3 rounded-xl border border-amber-800 bg-amber-950/30 px-3 py-2 text-xs leading-5 text-amber-200">
                          Активность уже создана. Поля зафиксированы; повторный запуск
                          завершит только оставшиеся ручные связи с ЦО и не создаст дубль.
                        </div>
                      ) : null}

                      <fieldset
                        className="mt-4 space-y-4"
                        disabled={Boolean(saveCheckpoint?.activityEventId)}
                      >
                        <label className="block text-xs font-semibold text-zinc-400">
                          Название активности
                          <input
                            className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                            maxLength={180}
                            onChange={(event) => setSaveTitle(event.target.value)}
                            value={saveTitle}
                          />
                        </label>

                        <ActivityTimingEditorPp1
                          draft={timingDraft}
                          locale={locale}
                          onChange={setTimingDraft}
                          temporalDirection={saveMode}
                          valid={timingValidation.ok}
                        />

                        {saveMode === "future" ? (
                          <PlannedTargetSelectorPp1
                            locale={locale}
                            onChange={setPlannedTargetValueObjectIds}
                            selectedIds={plannedTargetValueObjectIds}
                          />
                        ) : null}
                      </fieldset>

                      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs leading-5 text-zinc-500">
                        <div>Время: {timingLabel}</div>
                        <div>Ручных semantic_exposure связей: {manualLinks.length}</div>
                        <div>Явных фактов к материализации: {factMaterializationCandidates.length}</div>
                        {saveMode === "future" ? (
                          <div>Целей плановой активности: {plannedTargetValueObjectIds.length}</div>
                        ) : null}
                        <div>
                          Явные факты из полного анализа материализуются при сохранении активности.
                          Подтверждённые факты получают статус confirmed; отклонённые не записываются;
                          неподтверждённые остаются proposed. Смысловые догадки пока остаются только
                          append-only Data Capital.
                        </div>
                      </div>

                      {saveError ? (
                        <div className="mt-3 rounded-xl border border-red-900 bg-red-950/30 px-3 py-2 text-xs leading-5 text-red-200">
                          {saveError}
                        </div>
                      ) : null}

                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <button
                          className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={
                            saveStatus === "saving" ||
                            !saveTitle.trim() ||
                            !timingValidation.ok
                          }
                          onClick={() => void handleDirectSave()}
                          type="button"
                        >
                          {saveStatus === "saving"
                            ? "Сохраняю…"
                            : saveCheckpoint?.activityEventId
                              ? "Завершить сохранение"
                              : saveMode === "past"
                                ? "Сохранить в журнал"
                                : "Сохранить и открыть календарь"}
                        </button>
                        <button
                          className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={saveStatus === "saving" || Boolean(saveCheckpoint?.activityEventId)}
                          onClick={resetSaveState}
                          type="button"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border border-zinc-800 bg-black/40 p-4 text-sm leading-6 text-zinc-500">
                  Сохранение станет доступно только после успешного полного анализа с
                  реальным поиском по ЦО. Резервный разбор недостаточен.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <TracePanel
              lines={trace}
              loading={loading}
              operationId={
                reviewActivityEventId && !reviewEditing
                  ? null
                  : analysisOperationId || null
              }
            />
            {fullAnalysisSucceeded &&
            analysisOperationId &&
            (!reviewActivityEventId || reviewEditing) ? (
              <ManualLeafLinkPicker
                disabled={Boolean(saveCheckpoint?.activityEventId)}
                links={manualLinks}
                onLinksChange={setManualLinks}
                operationId={analysisOperationId}
              />
            ) : null}
          </div>
        </section>

        {rawPayload ? (
          <details className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5">
            <summary className="cursor-pointer text-sm font-semibold text-zinc-300">
              Технический JSON результата
            </summary>
            <pre className="mt-4 max-h-[720px] overflow-auto rounded-2xl border border-zinc-800 bg-black p-4 text-xs leading-6 text-zinc-300">
              {JSON.stringify(rawPayload, null, 2)}
            </pre>
          </details>
        ) : null}

        <footer className="flex flex-wrap gap-3 text-sm">
          <Link
            className="rounded-full border border-zinc-800 px-4 py-2 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
            href="/activity-today?locale=ru"
          >
            Мой журнал активностей
          </Link>
        </footer>
      </div>
    </main>
  );
}

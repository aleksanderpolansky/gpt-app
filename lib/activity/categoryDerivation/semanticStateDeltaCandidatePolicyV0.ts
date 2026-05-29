import type {
  MetricCandidateV3,
  SemanticDerivationV3Result,
} from "./semanticContractV3";
import type {
  ActivityValueObjectExposureCandidateV0,
} from "./semanticActivityValueObjectExposureV0";

export type StateDeltaCandidateKindV0 =
  | "care_load_delta"
  | "attention_load_delta"
  | "cognitive_load_delta"
  | "learning_exposure_delta"
  | "support_exposure_delta"
  | "context_exposure_delta"
  | "physical_load_delta"
  | "needs_user_confirmation";

export type StateDeltaCandidateDirectionV0 =
  | "increase"
  | "decrease"
  | "neutral"
  | "unknown";

export type StateDeltaCandidateV0 = {
  deltaKey: string;
  dimensionKey: string;
  kind: StateDeltaCandidateKindV0;
  targetValueObjectCandidateKey: string;
  targetValueObjectSuggestedTitle: string;
  expectedDirection: StateDeltaCandidateDirectionV0;
  magnitudeEstimate: {
    value: number | null;
    unit: string | null;
    basis: "duration_minutes" | "exposure_confidence" | "unknown";
  };
  confidence: number;
  sourceExposureKeys: string[];
  sourceActivityLinkTypes: string[];
  sourceStateHookKeys: string[];
  sourceMetricKeys: string[];
  notAStateFactYet: true;
  notAStateSnapshotYet: true;
  shouldPersistNow: false;
  eligibleForFutureStateDelta: boolean;
  needsUserConfirmation: boolean;
  reasoning: string;
  safetyNotes: string[];
};

export type BuildStateDeltaCandidatesV0Params = {
  semanticV3: SemanticDerivationV3Result;
  exposureCandidates: ActivityValueObjectExposureCandidateV0[];
};

function clamp(value: number): number {
  if (!Number.isFinite(value)) {
    return 0.5;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

function getMetricValue(
  metrics: MetricCandidateV3[],
  metricKey: string
): number | null {
  const metric = metrics.find((item) => item.metricKey === metricKey);

  if (!metric) {
    return null;
  }

  if (typeof metric.value === "number" && Number.isFinite(metric.value)) {
    return metric.value;
  }

  if (typeof metric.value === "string") {
    const parsed = Number.parseFloat(metric.value.replace(",", "."));

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function addDeltaIfMissing(
  result: StateDeltaCandidateV0[],
  delta: StateDeltaCandidateV0
): void {
  if (result.some((item) => item.deltaKey === delta.deltaKey)) {
    return;
  }

  result.push(delta);
}

function buildMagnitude(params: {
  durationMinutes: number | null;
  fallbackConfidence: number;
}): StateDeltaCandidateV0["magnitudeEstimate"] {
  if (params.durationMinutes !== null) {
    return {
      value: params.durationMinutes,
      unit: "minutes",
      basis: "duration_minutes",
    };
  }

  return {
    value: clamp(params.fallbackConfidence),
    unit: "confidence",
    basis: "exposure_confidence",
  };
}

function buildDelta(params: {
  deltaKey: string;
  dimensionKey: string;
  kind: StateDeltaCandidateKindV0;
  exposure: ActivityValueObjectExposureCandidateV0;
  expectedDirection?: StateDeltaCandidateDirectionV0;
  durationMinutes: number | null;
  confidence?: number;
  eligibleForFutureStateDelta?: boolean;
  needsUserConfirmation?: boolean;
  reasoning: string;
  safetyNotes?: string[];
}): StateDeltaCandidateV0 {
  return {
    deltaKey: params.deltaKey,
    dimensionKey: params.dimensionKey,
    kind: params.kind,
    targetValueObjectCandidateKey: params.exposure.valueObjectCandidateKey,
    targetValueObjectSuggestedTitle: params.exposure.valueObjectSuggestedTitle,
    expectedDirection:
      params.expectedDirection ?? params.exposure.expectedEffectDirection,
    magnitudeEstimate: buildMagnitude({
      durationMinutes: params.durationMinutes,
      fallbackConfidence: params.exposure.confidence,
    }),
    confidence: clamp(params.confidence ?? params.exposure.confidence),
    sourceExposureKeys: [params.exposure.exposureKey],
    sourceActivityLinkTypes: [params.exposure.activityLinkType],
    sourceStateHookKeys: params.exposure.sourceStateHookKeys,
    sourceMetricKeys: params.exposure.sourceMetricKeys,
    notAStateFactYet: true,
    notAStateSnapshotYet: true,
    shouldPersistNow: false,
    eligibleForFutureStateDelta: params.eligibleForFutureStateDelta ?? true,
    needsUserConfirmation:
      params.needsUserConfirmation ?? params.exposure.needsUserConfirmation,
    reasoning: params.reasoning,
    safetyNotes: params.safetyNotes ?? [],
  };
}

export function buildStateDeltaCandidatesV0(
  params: BuildStateDeltaCandidatesV0Params
): StateDeltaCandidateV0[] {
  const result: StateDeltaCandidateV0[] = [];
  const durationMinutes = getMetricValue(
    params.semanticV3.metricCandidates,
    "duration_minutes"
  );

  for (const exposure of params.exposureCandidates) {
    if (
      exposure.exposureKey === "exposure:child-learning-support:supports"
    ) {
      addDeltaIfMissing(
        result,
        buildDelta({
          deltaKey: "delta:child-learning-support:support-exposure",
          dimensionKey: "child_development_support",
          kind: "support_exposure_delta",
          exposure,
          durationMinutes,
          confidence: Math.min(exposure.confidence, 0.84),
          reasoning:
            "The activity creates a candidate support exposure for the child learning support object.",
          safetyNotes: [
            "This is not proof of child development progress.",
            "Persist only after state policy gate and user/account context are available.",
          ],
        })
      );
    }

    if (
      exposure.exposureKey ===
      "exposure:child-learning-support:consumes-attention"
    ) {
      addDeltaIfMissing(
        result,
        buildDelta({
          deltaKey: "delta:child-learning-support:attention-load",
          dimensionKey: "attention_load",
          kind: "attention_load_delta",
          exposure,
          durationMinutes,
          confidence: Math.min(exposure.confidence, 0.8),
          reasoning:
            "The activity consumes attention in a family/care context.",
          safetyNotes: [
            "Attention load is a proxy candidate, not a psychological diagnosis.",
          ],
        })
      );
    }

    if (
      exposure.exposureKey ===
      "exposure:mathematics-learning:contributes-to"
    ) {
      addDeltaIfMissing(
        result,
        buildDelta({
          deltaKey: "delta:mathematics-learning:learning-exposure",
          dimensionKey: "learning_exposure",
          kind: "learning_exposure_delta",
          exposure,
          durationMinutes,
          confidence: Math.min(exposure.confidence, 0.84),
          reasoning:
            "The activity contributes duration/exposure to the mathematics learning object.",
          safetyNotes: [
            "Learning exposure is not the same as measured skill improvement.",
          ],
        })
      );
    }

    if (
      exposure.exposureKey ===
      "exposure:mathematics-learning:tracks-domain"
    ) {
      addDeltaIfMissing(
        result,
        buildDelta({
          deltaKey: "delta:mathematics-learning:cognitive-load",
          dimensionKey: "cognitive_load",
          kind: "cognitive_load_delta",
          exposure,
          durationMinutes,
          confidence: Math.min(exposure.confidence, 0.72),
          reasoning:
            "Mathematics learning can create cognitive-load exposure for the activity window.",
          safetyNotes: [
            "Cognitive load is a proxy estimate, not a clinical state fact.",
          ],
        })
      );
    }

    if (exposure.exposureKey === "exposure:family-care-load:loads") {
      addDeltaIfMissing(
        result,
        buildDelta({
          deltaKey: "delta:family-care-load:care-load",
          dimensionKey: "family_care_load",
          kind: "care_load_delta",
          exposure,
          durationMinutes,
          confidence: Math.min(exposure.confidence, 0.82),
          reasoning:
            "The activity increases care-load exposure in the family/care dimension.",
          safetyNotes: [
            "Care load does not automatically mean stress or negative emotion.",
          ],
        })
      );
    }

    if (
      exposure.exposureKey ===
      "exposure:family-care-load:duration-attention"
    ) {
      addDeltaIfMissing(
        result,
        buildDelta({
          deltaKey: "delta:family-care-load:duration-attention",
          dimensionKey: "care_attention_time",
          kind: "attention_load_delta",
          exposure,
          durationMinutes,
          confidence: Math.min(exposure.confidence, 0.78),
          reasoning:
            "The duration metric can quantify time spent in care-related attention.",
          safetyNotes: [
            "Duration is metric evidence only; it is not a Value Object and not a state fact.",
          ],
        })
      );
    }

    if (
      exposure.exposureKey === "exposure:cycling-activity:loads"
    ) {
      addDeltaIfMissing(
        result,
        buildDelta({
          deltaKey: "delta:cycling-activity:physical-load",
          dimensionKey: "physical_load",
          kind: "physical_load_delta",
          exposure,
          durationMinutes,
          confidence: Math.min(exposure.confidence, 0.76),
          reasoning:
            "The activity can create physical-load exposure for later state processing.",
          safetyNotes: [
            "Do not claim health improvement, fatigue reduction or muscle growth automatically.",
          ],
        })
      );
    }

    if (
      exposure.exposureKey === "exposure:commute-to-work:creates-context"
    ) {
      addDeltaIfMissing(
        result,
        buildDelta({
          deltaKey: "delta:commute-to-work:context-exposure",
          dimensionKey: "work_context_exposure",
          kind: "context_exposure_delta",
          exposure,
          durationMinutes,
          confidence: Math.min(exposure.confidence, 0.72),
          reasoning:
            "Commute creates a context that can be relevant to work readiness and time accounting.",
          safetyNotes: [
            "Context exposure is not itself a performance or health claim.",
          ],
        })
      );
    }

    if (
      exposure.activityLinkType === "needs_user_confirmation"
    ) {
      addDeltaIfMissing(
        result,
        buildDelta({
          deltaKey: `delta:${exposure.valueObjectCandidateKey}:needs-confirmation`,
          dimensionKey: "needs_user_confirmation",
          kind: "needs_user_confirmation",
          exposure,
          durationMinutes: null,
          confidence: Math.min(exposure.confidence, 0.5),
          eligibleForFutureStateDelta: false,
          needsUserConfirmation: true,
          reasoning:
            "The exposure requires user or actor-context confirmation before any state delta can be proposed.",
          safetyNotes: [
            "Do not persist a state delta from ambiguous exposure.",
          ],
        })
      );
    }
  }

  return result;
}

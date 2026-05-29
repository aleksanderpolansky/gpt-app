import type {
  SemanticDerivationV3Result,
} from "./semanticContractV3";
import type {
  ValueObjectCandidateV0,
} from "./semanticValueObjectCandidatePolicyV0";

export type ActivityValueObjectExposureRelationV0 =
  | "contributes_to"
  | "supports"
  | "loads"
  | "consumes_attention"
  | "tracks_domain"
  | "creates_context"
  | "uses_context"
  | "needs_user_confirmation";

export type ActivityValueObjectExposureCandidateV0 = {
  exposureKey: string;
  activityLinkType: ActivityValueObjectExposureRelationV0;
  valueObjectCandidateKey: string;
  valueObjectSuggestedTitle: string;
  confidence: number;
  sourceCategorySlugs: string[];
  sourceStateHookKeys: string[];
  sourceMetricKeys: string[];
  expectedEffectDirection: "increase" | "decrease" | "neutral" | "unknown";
  shouldCreateActivityLink: boolean;
  shouldCreateStateDelta: boolean;
  shouldCreateStateFact: boolean;
  shouldCreateStateSnapshot: boolean;
  needsUserConfirmation: boolean;
  reasoning: string;
  safetyNotes: string[];
};

export type BuildActivityValueObjectExposureCandidatesV0Params = {
  semanticV3: SemanticDerivationV3Result;
  valueObjectCandidates: ValueObjectCandidateV0[];
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

function addExposureIfMissing(
  result: ActivityValueObjectExposureCandidateV0[],
  exposure: ActivityValueObjectExposureCandidateV0
): void {
  if (result.some((item) => item.exposureKey === exposure.exposureKey)) {
    return;
  }

  result.push(exposure);
}

function buildExposure(params: {
  exposureKey: string;
  activityLinkType: ActivityValueObjectExposureRelationV0;
  vo: ValueObjectCandidateV0;
  confidence?: number;
  expectedEffectDirection?: "increase" | "decrease" | "neutral" | "unknown";
  shouldCreateActivityLink?: boolean;
  shouldCreateStateDelta?: boolean;
  shouldCreateStateFact?: boolean;
  shouldCreateStateSnapshot?: boolean;
  needsUserConfirmation?: boolean;
  reasoning: string;
  safetyNotes?: string[];
}): ActivityValueObjectExposureCandidateV0 {
  return {
    exposureKey: params.exposureKey,
    activityLinkType: params.activityLinkType,
    valueObjectCandidateKey: params.vo.candidateKey,
    valueObjectSuggestedTitle: params.vo.suggestedTitle,
    confidence: clamp(params.confidence ?? params.vo.confidence),
    sourceCategorySlugs: params.vo.sourceCategorySlugs,
    sourceStateHookKeys: params.vo.sourceStateHookKeys,
    sourceMetricKeys: params.vo.sourceMetricKeys,
    expectedEffectDirection: params.expectedEffectDirection ?? "increase",
    shouldCreateActivityLink: params.shouldCreateActivityLink ?? true,
    shouldCreateStateDelta: params.shouldCreateStateDelta ?? false,
    shouldCreateStateFact: params.shouldCreateStateFact ?? false,
    shouldCreateStateSnapshot: params.shouldCreateStateSnapshot ?? false,
    needsUserConfirmation:
      params.needsUserConfirmation ?? params.vo.needsUserConfirmation,
    reasoning: params.reasoning,
    safetyNotes: params.safetyNotes ?? [],
  };
}

function hasHook(vo: ValueObjectCandidateV0, hookKey: string): boolean {
  return vo.sourceStateHookKeys.includes(hookKey);
}

function hasMetric(vo: ValueObjectCandidateV0, metricKey: string): boolean {
  return vo.sourceMetricKeys.includes(metricKey);
}

export function buildActivityValueObjectExposureCandidatesV0(
  params: BuildActivityValueObjectExposureCandidatesV0Params
): ActivityValueObjectExposureCandidateV0[] {
  const result: ActivityValueObjectExposureCandidateV0[] = [];

  for (const vo of params.valueObjectCandidates) {
    if (vo.candidateKey === "vo:personal:child-learning-support") {
      addExposureIfMissing(
        result,
        buildExposure({
          exposureKey: "exposure:child-learning-support:supports",
          activityLinkType: "supports",
          vo,
          confidence: Math.min(vo.confidence, 0.88),
          reasoning:
            "The activity supports the child's learning/development context.",
          safetyNotes: [
            "Create activity link only; do not claim measurable child progress yet.",
          ],
        })
      );

      if (hasHook(vo, "family_care_load")) {
        addExposureIfMissing(
          result,
          buildExposure({
            exposureKey: "exposure:child-learning-support:consumes-attention",
            activityLinkType: "consumes_attention",
            vo,
            confidence: Math.min(vo.confidence, 0.82),
            reasoning:
              "The activity consumes family/care attention and should be visible in care-load analytics.",
            safetyNotes: [
              "This is care-load exposure, not emotional or medical diagnosis.",
            ],
          })
        );
      }
    }

    if (vo.candidateKey === "vo:personal:mathematics-learning") {
      addExposureIfMissing(
        result,
        buildExposure({
          exposureKey: "exposure:mathematics-learning:contributes-to",
          activityLinkType: "contributes_to",
          vo,
          confidence: Math.min(vo.confidence, 0.86),
          reasoning:
            "The activity contributes time/exposure to the mathematics learning object.",
          safetyNotes: [
            "This does not prove skill improvement; it records learning exposure.",
          ],
        })
      );

      addExposureIfMissing(
        result,
        buildExposure({
          exposureKey: "exposure:mathematics-learning:tracks-domain",
          activityLinkType: "tracks_domain",
          vo,
          confidence: Math.min(vo.confidence, 0.84),
          reasoning:
            "The activity should be counted in the mathematics/domain learning slice.",
          safetyNotes: [
            "Domain tracking is separate from performance assessment.",
          ],
        })
      );
    }

    if (vo.candidateKey === "vo:personal:family-care-load") {
      addExposureIfMissing(
        result,
        buildExposure({
          exposureKey: "exposure:family-care-load:loads",
          activityLinkType: "loads",
          vo,
          confidence: Math.min(vo.confidence, 0.82),
          expectedEffectDirection: "increase",
          reasoning:
            "The activity increases family/care load exposure for the current time window.",
          safetyNotes: [
            "State delta is not created here; this is only a link/exposure candidate.",
          ],
        })
      );

      if (hasMetric(vo, "duration_minutes")) {
        addExposureIfMissing(
          result,
          buildExposure({
            exposureKey: "exposure:family-care-load:duration-attention",
            activityLinkType: "consumes_attention",
            vo,
            confidence: Math.min(vo.confidence, 0.8),
            expectedEffectDirection: "increase",
            reasoning:
              "The duration metric can later quantify how much time was spent in the care dimension.",
            safetyNotes: [
              "Duration is metric context, not a Value Object by itself.",
            ],
          })
        );
      }
    }

    if (vo.candidateKey === "vo:personal:cycling-activity") {
      addExposureIfMissing(
        result,
        buildExposure({
          exposureKey: "exposure:cycling-activity:contributes-to",
          activityLinkType: "contributes_to",
          vo,
          confidence: Math.min(vo.confidence, 0.84),
          reasoning:
            "The activity contributes to the cycling/physical activity object.",
          safetyNotes: [
            "Do not claim health improvement or muscle growth automatically.",
          ],
        })
      );

      if (hasHook(vo, "physical_load")) {
        addExposureIfMissing(
          result,
          buildExposure({
            exposureKey: "exposure:cycling-activity:loads",
            activityLinkType: "loads",
            vo,
            confidence: Math.min(vo.confidence, 0.78),
            reasoning:
              "The activity creates physical-load exposure for later state processing.",
            safetyNotes: [
              "Physical-load hook is not a state fact yet.",
            ],
          })
        );
      }
    }

    if (vo.candidateKey === "vo:personal:commute-to-work") {
      addExposureIfMissing(
        result,
        buildExposure({
          exposureKey: "exposure:commute-to-work:creates-context",
          activityLinkType: "creates_context",
          vo,
          confidence: Math.min(vo.confidence, 0.82),
          reasoning:
            "The activity creates a commute/work context that can influence time, fatigue and work readiness.",
          safetyNotes: [
            "Commute is contextual exposure, not necessarily a goal object.",
          ],
        })
      );
    }

    if (vo.candidateKey === "vo:organization-or-personal:massage-service-work") {
      addExposureIfMissing(
        result,
        buildExposure({
          exposureKey: "exposure:massage-service-work:needs-confirmation",
          activityLinkType: "needs_user_confirmation",
          vo,
          confidence: Math.min(vo.confidence, 0.76),
          shouldCreateActivityLink: false,
          needsUserConfirmation: true,
          reasoning:
            "Massage work may belong to personal analytics or organization/service analytics; actor context is needed.",
          safetyNotes: [
            "Do not create commercial/organization link without confirmed actor context.",
          ],
        })
      );
    }

    if (vo.candidateKey === "vo:personal:general-activity") {
      addExposureIfMissing(
        result,
        buildExposure({
          exposureKey: "exposure:general-activity:needs-confirmation",
          activityLinkType: "needs_user_confirmation",
          vo,
          confidence: 0.5,
          shouldCreateActivityLink: false,
          shouldCreateStateDelta: false,
          shouldCreateStateFact: false,
          shouldCreateStateSnapshot: false,
          needsUserConfirmation: true,
          reasoning:
            "The activity is not semantically specific enough for a safe VO exposure link.",
          safetyNotes: [
            "Ask the user what this should be connected to.",
          ],
        })
      );
    }
  }

  return result;
}

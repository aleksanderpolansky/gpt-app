import type {
  MetricCandidateV3,
  ResolvedCategoryCandidateV3,
  SemanticDerivationV3Result,
  StateHookCandidateV3,
} from "./semanticContractV3";

export type ValueObjectCandidateActionV0 =
  | "find_existing"
  | "find_or_create_suggested"
  | "link_only"
  | "needs_user_confirmation";

export type ValueObjectCandidateScopeV0 =
  | "personal"
  | "organization"
  | "shared"
  | "unknown";

export type ValueObjectCandidateRoleV0 =
  | "activity_object"
  | "domain_object"
  | "care_object"
  | "learning_object"
  | "commercial_object"
  | "context_object"
  | "metric_context"
  | "unknown";

export type ValueObjectCandidateV0 = {
  candidateKey: string;
  suggestedTitle: string;
  role: ValueObjectCandidateRoleV0;
  scope: ValueObjectCandidateScopeV0;
  action: ValueObjectCandidateActionV0;
  confidence: number;
  sourceCategorySlugs: string[];
  sourceStateHookKeys: string[];
  sourceMetricKeys: string[];
  shouldCreateIfMissing: boolean;
  shouldLinkActivity: boolean;
  shouldTrackState: boolean;
  needsUserConfirmation: boolean;
  reasoning: string;
  safetyNotes: string[];
};

export type BuildValueObjectCandidatesV0Params = {
  semanticV3: SemanticDerivationV3Result;
  inputText: string;
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

function findCategory(
  categories: ResolvedCategoryCandidateV3[],
  slug: string
): ResolvedCategoryCandidateV3 | null {
  return categories.find((category) => category.candidateSlug === slug) ?? null;
}

function hasCategory(
  categories: ResolvedCategoryCandidateV3[],
  slug: string
): boolean {
  return findCategory(categories, slug) !== null;
}

function hasAnyCategory(
  categories: ResolvedCategoryCandidateV3[],
  slugs: string[]
): boolean {
  return slugs.some((slug) => hasCategory(categories, slug));
}

function getHookKeys(hooks: StateHookCandidateV3[]): string[] {
  return hooks.map((hook) => hook.hookKey);
}

function getMetricKeys(metrics: MetricCandidateV3[]): string[] {
  return metrics.map((metric) => metric.metricKey);
}

function confidenceFromCategories(
  categories: ResolvedCategoryCandidateV3[],
  slugs: string[],
  fallback = 0.72
): number {
  const values = categories
    .filter((category) => slugs.includes(category.candidateSlug))
    .map((category) => category.confidence);

  if (values.length === 0) {
    return fallback;
  }

  return clamp(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function addCandidateIfMissing(
  result: ValueObjectCandidateV0[],
  candidate: ValueObjectCandidateV0
): void {
  if (result.some((item) => item.candidateKey === candidate.candidateKey)) {
    return;
  }

  result.push(candidate);
}

function buildCandidate(params: {
  candidateKey: string;
  suggestedTitle: string;
  role: ValueObjectCandidateRoleV0;
  scope?: ValueObjectCandidateScopeV0;
  action?: ValueObjectCandidateActionV0;
  confidence: number;
  sourceCategorySlugs: string[];
  sourceStateHookKeys: string[];
  sourceMetricKeys: string[];
  shouldCreateIfMissing?: boolean;
  shouldLinkActivity?: boolean;
  shouldTrackState?: boolean;
  needsUserConfirmation?: boolean;
  reasoning: string;
  safetyNotes?: string[];
}): ValueObjectCandidateV0 {
  return {
    candidateKey: params.candidateKey,
    suggestedTitle: params.suggestedTitle,
    role: params.role,
    scope: params.scope ?? "personal",
    action: params.action ?? "find_or_create_suggested",
    confidence: clamp(params.confidence),
    sourceCategorySlugs: params.sourceCategorySlugs,
    sourceStateHookKeys: params.sourceStateHookKeys,
    sourceMetricKeys: params.sourceMetricKeys,
    shouldCreateIfMissing: params.shouldCreateIfMissing ?? true,
    shouldLinkActivity: params.shouldLinkActivity ?? true,
    shouldTrackState: params.shouldTrackState ?? true,
    needsUserConfirmation: params.needsUserConfirmation ?? false,
    reasoning: params.reasoning,
    safetyNotes: params.safetyNotes ?? [],
  };
}

export function buildValueObjectCandidatesV0(
  params: BuildValueObjectCandidatesV0Params
): ValueObjectCandidateV0[] {
  const categories = params.semanticV3.resolvedCategoryCandidates;
  const hooks = params.semanticV3.stateHookCandidates;
  const metrics = params.semanticV3.metricCandidates;

  const hookKeys = getHookKeys(hooks);
  const metricKeys = getMetricKeys(metrics);
  const result: ValueObjectCandidateV0[] = [];

  const hasLearningChildMath =
    hasAnyCategory(categories, ["learning-activity", "helping-child-learn"]) &&
    hasCategory(categories, "child-participant") &&
    hasCategory(categories, "mathematics");

  if (hasLearningChildMath) {
    addCandidateIfMissing(
      result,
      buildCandidate({
        candidateKey: "vo:personal:child-learning-support",
        suggestedTitle: "Child learning support",
        role: "care_object",
        confidence: confidenceFromCategories(categories, [
          "helping-child-learn",
          "child-participant",
          "parental-care",
        ]),
        sourceCategorySlugs: [
          "helping-child-learn",
          "child-participant",
          "parental-care",
        ],
        sourceStateHookKeys: hookKeys.filter((hookKey) =>
          ["family_care_load", "child_development_support"].includes(hookKey)
        ),
        sourceMetricKeys: metricKeys,
        reasoning:
          "The activity is not only learning; it also represents care/responsibility toward a child.",
        safetyNotes: [
          "This is a Value Object candidate only; no DB object is created here.",
          "Do not claim family climate improvement without feedback.",
        ],
      })
    );

    addCandidateIfMissing(
      result,
      buildCandidate({
        candidateKey: "vo:personal:mathematics-learning",
        suggestedTitle: "Mathematics learning",
        role: "learning_object",
        confidence: confidenceFromCategories(categories, [
          "mathematics",
          "learning-activity",
        ]),
        sourceCategorySlugs: ["mathematics", "learning-activity"],
        sourceStateHookKeys: hookKeys.filter((hookKey) =>
          ["cognitive_load", "child_development_support"].includes(hookKey)
        ),
        sourceMetricKeys: metricKeys,
        reasoning:
          "The activity contributes to a learning/domain object connected with mathematics.",
        safetyNotes: [
          "This does not prove learning progress yet; it only records exposure/support.",
        ],
      })
    );

    addCandidateIfMissing(
      result,
      buildCandidate({
        candidateKey: "vo:personal:family-care-load",
        suggestedTitle: "Family care load",
        role: "care_object",
        confidence: confidenceFromCategories(categories, [
          "parental-care",
          "child-participant",
        ]),
        sourceCategorySlugs: ["parental-care", "child-participant"],
        sourceStateHookKeys: hookKeys.filter((hookKey) =>
          ["family_care_load"].includes(hookKey)
        ),
        sourceMetricKeys: metricKeys,
        reasoning:
          "The activity consumes attention and time in the family/care dimension.",
        safetyNotes: [
          "Track as care load / attention, not as a medical or emotional fact.",
        ],
      })
    );
  }

  if (hasAnyCategory(categories, ["bicycle", "cycling"])) {
    addCandidateIfMissing(
      result,
      buildCandidate({
        candidateKey: "vo:personal:cycling-activity",
        suggestedTitle: "Cycling activity",
        role: "activity_object",
        confidence: confidenceFromCategories(categories, ["cycling", "bicycle"]),
        sourceCategorySlugs: ["cycling", "bicycle"],
        sourceStateHookKeys: hookKeys.filter((hookKey) =>
          ["physical_load"].includes(hookKey)
        ),
        sourceMetricKeys: metricKeys,
        reasoning:
          "Cycling should be trackable as a physical activity / transport activity object.",
        safetyNotes: [
          "Do not claim health improvement or muscle growth automatically.",
        ],
      })
    );
  }

  if (hasAnyCategory(categories, ["commute-to-work", "work-context"])) {
    addCandidateIfMissing(
      result,
      buildCandidate({
        candidateKey: "vo:personal:commute-to-work",
        suggestedTitle: "Commute to work",
        role: "context_object",
        confidence: confidenceFromCategories(categories, [
          "commute-to-work",
          "work-context",
        ]),
        sourceCategorySlugs: ["commute-to-work", "work-context"],
        sourceStateHookKeys: hookKeys,
        sourceMetricKeys: metricKeys,
        reasoning:
          "Commute context can influence time, fatigue, work readiness and physical load.",
        safetyNotes: [
          "Commute is context/relevance, not necessarily a goal by itself.",
        ],
      })
    );
  }

  if (hasAnyCategory(categories, ["massage-service", "client-service-work"])) {
    addCandidateIfMissing(
      result,
      buildCandidate({
        candidateKey: "vo:organization-or-personal:massage-service-work",
        suggestedTitle: "Massage service work",
        role: "commercial_object",
        scope: "unknown",
        action: "needs_user_confirmation",
        confidence: confidenceFromCategories(categories, [
          "massage-service",
          "client-service-work",
        ]),
        sourceCategorySlugs: ["massage-service", "client-service-work"],
        sourceStateHookKeys: hookKeys.filter((hookKey) =>
          ["physical_load", "income_action_attention"].includes(hookKey)
        ),
        sourceMetricKeys: metricKeys,
        shouldCreateIfMissing: false,
        needsUserConfirmation: true,
        reasoning:
          "Massage can belong to a personal activity log or to an organization/service offer; actor context is needed.",
        safetyNotes: [
          "Do not create organization/commercial VO without actor/organization context.",
        ],
      })
    );
  }

  if (result.length === 0) {
    addCandidateIfMissing(
      result,
      buildCandidate({
        candidateKey: "vo:personal:general-activity",
        suggestedTitle: "General activity",
        role: "unknown",
        action: "needs_user_confirmation",
        confidence: 0.5,
        sourceCategorySlugs: categories.map((category) => category.candidateSlug),
        sourceStateHookKeys: hookKeys,
        sourceMetricKeys: metricKeys,
        shouldCreateIfMissing: false,
        shouldTrackState: false,
        needsUserConfirmation: true,
        reasoning:
          "The semantic bundle is not specific enough to safely suggest a Value Object.",
        safetyNotes: [
          "Ask the user what this activity should be connected to before creating a VO.",
        ],
      })
    );
  }

  return result;
}

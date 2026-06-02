import type { ReviewActionAvailability } from "../activity-review";

import type {
  SemanticExternalConceptHint,
  SemanticLocalMatch,
  SemanticReviewAllowedAction,
  SemanticReviewConfidence,
  SemanticReviewEmptyState,
  SemanticReviewItem,
  SemanticReviewPanelState,
  SemanticReviewQueue,
  SemanticReviewSafetyBoundary,
} from "./semantic-review-types";

export const SEMANTIC_REVIEW_FIXTURES_CREATED = true as const;

const localOnlyAvailability = "local_only" as ReviewActionAvailability;
const disabledAvailability = "disabled" as ReviewActionAvailability;

const highConfidence: SemanticReviewConfidence = {
  value: 0.88,
  level: "high",
  label: "High confidence",
  reason: "Several local semantic signals point to the same meaning.",
};

const mediumConfidence: SemanticReviewConfidence = {
  value: 0.64,
  level: "medium",
  label: "Medium confidence",
  reason: "The meaning is likely, but the user should confirm the final category.",
};

const lowConfidence: SemanticReviewConfidence = {
  value: 0.41,
  level: "low",
  label: "Low confidence",
  reason: "The phrase may belong to several different semantic contexts.",
};

function createLocalOnlyAction(
  id: string,
  kind: SemanticReviewAllowedAction["kind"],
  label: string,
  description: string,
): SemanticReviewAllowedAction {
  return {
    id,
    kind,
    label,
    description,
    availability: localOnlyAvailability,
    isWriteAction: false,
    isLocalOnly: true,
  };
}

function createDisabledAction(
  id: string,
  kind: SemanticReviewAllowedAction["kind"],
  label: string,
  description: string,
  disabledReason: string,
): SemanticReviewAllowedAction {
  return {
    id,
    kind,
    label,
    description,
    availability: disabledAvailability,
    disabledReason,
    isWriteAction: false,
    isLocalOnly: false,
  };
}

const defaultActions: ReadonlyArray<SemanticReviewAllowedAction> = [
  createDisabledAction(
    "confirm-local-candidate",
    "confirm_local_candidate",
    "Confirm candidate",
    "Preview the decision that would connect this meaning with the local candidate.",
    "Confirmation stays disabled until a separate feedback/write gate is implemented.",
  ),
  createDisabledAction(
    "merge-later",
    "merge_later",
    "Merge later",
    "Preview a possible merge between similar local meanings.",
    "Merge is not available in this UI-only block.",
  ),
  createLocalOnlyAction(
    "ask-later",
    "ask_later",
    "Ask later",
    "Keep the item in the local review queue without changing any records.",
  ),
  createLocalOnlyAction(
    "reject-candidate",
    "reject_candidate",
    "Reject preview",
    "Mark this candidate as not useful inside the local UI preview only.",
  ),
];

const exerciseLocalMatches: ReadonlyArray<SemanticLocalMatch> = [
  {
    id: "local-match-bulgarian-split-squat",
    label: "Bulgarian split squat",
    kind: "value_object",
    domain: "health",
    similarity: 0.86,
    relevance: 0.93,
    reason:
      "The phrase describes a known single-leg strength movement, but the local object still needs user confirmation.",
    currentStatus: "draft",
    sourceLabel: "Local activity vocabulary",
    alreadyExists: false,
  },
  {
    id: "local-match-unilateral-leg-strength",
    label: "Unilateral leg strength",
    kind: "category",
    domain: "health",
    similarity: 0.72,
    relevance: 0.78,
    reason:
      "The activity can also be grouped under a broader category for one-leg strength work.",
    currentStatus: "active",
    sourceLabel: "Local training categories",
    alreadyExists: true,
  },
];

const childcareLocalMatches: ReadonlyArray<SemanticLocalMatch> = [
  {
    id: "local-match-parental-care",
    label: "Parental care",
    kind: "role",
    domain: "relationship",
    similarity: 0.79,
    relevance: 0.91,
    reason:
      "Teaching a child is not only learning; it also serves a parental care and supervision function.",
    currentStatus: "active",
    sourceLabel: "Local role categories",
    alreadyExists: true,
  },
  {
    id: "local-match-child-learning-support",
    label: "Child learning support",
    kind: "category",
    domain: "learning",
    similarity: 0.83,
    relevance: 0.88,
    reason:
      "The phrase clearly includes an educational support function for the child.",
    currentStatus: "draft",
    sourceLabel: "Local learning categories",
    alreadyExists: false,
  },
];

const commercialLocalMatches: ReadonlyArray<SemanticLocalMatch> = [
  {
    id: "local-match-purchase-confirmation",
    label: "External purchase confirmation",
    kind: "context",
    domain: "money",
    similarity: 0.81,
    relevance: 0.9,
    reason:
      "The wording points to a confirmation request for a purchase made outside the platform.",
    currentStatus: "active",
    sourceLabel: "Commercial core vocabulary",
    alreadyExists: true,
  },
  {
    id: "local-match-points-earning",
    label: "Points earning condition",
    kind: "metric",
    domain: "money",
    similarity: 0.68,
    relevance: 0.74,
    reason:
      "The phrase can affect points calculation, but it must not create commercial records from the UI.",
    currentStatus: "draft",
    sourceLabel: "Local points logic",
    alreadyExists: false,
  },
];

const exerciseExternalHints: ReadonlyArray<SemanticExternalConceptHint> = [
  {
    id: "external-hint-exercise-taxonomy",
    sourceName: "Exercise taxonomy fixture",
    sourceType: "manual_reference",
    label: "Bulgarian split squat",
    description:
      "A single-leg squat variation often used for leg strength, balance, and hypertrophy training.",
    confidence: mediumConfidence,
    note:
      "This is only an external hint. It is not an internal category and cannot be auto-confirmed.",
    isInternalCategory: false,
  },
];

const childcareExternalHints: ReadonlyArray<SemanticExternalConceptHint> = [
  {
    id: "external-hint-caregiving-role",
    sourceName: "Role taxonomy fixture",
    sourceType: "manual_reference",
    label: "Caregiving / parental support",
    description:
      "A role-based meaning where the action serves care, supervision, and support for another person.",
    confidence: highConfidence,
    note:
      "The hint helps explain the role layer, but the platform must keep local categories separate.",
    isInternalCategory: false,
  },
];

const commercialExternalHints: ReadonlyArray<SemanticExternalConceptHint> = [
  {
    id: "external-hint-commercial-confirmation",
    sourceName: "Commercial vocabulary fixture",
    sourceType: "business_taxonomy",
    label: "Purchase confirmation",
    description:
      "A confirmation process that validates an external commercial action without turning the platform into a checkout flow.",
    confidence: mediumConfidence,
    note:
      "This hint must not create an order, cart, item row, or points transaction from the review UI.",
    isInternalCategory: false,
  },
];

export const semanticReviewFixtures: ReadonlyArray<SemanticReviewItem> = [
  {
    id: "semantic-review-bulgarian-split-squat",
    title: "Unknown exercise term",
    subtitle: "Needs review before it becomes a local training concept.",
    kind: "unknown_term",
    status: "needs_review",
    resolverStatus: "new_concept_candidate",
    priority: "high",
    domain: "health",
    source: "activity_capture",
    rawText: "Сделал 8 повторений болгарских приседаний на каждую ногу.",
    highlightedTerm: "болгарские приседания",
    confidence: mediumConfidence,
    summaryChips: [
      {
        id: "chip-domain-health",
        label: "Domain",
        value: "Health",
        tone: "emerald",
      },
      {
        id: "chip-review-new",
        label: "Resolver",
        value: "New concept",
        tone: "amber",
      },
      {
        id: "chip-source-capture",
        label: "Source",
        value: "Activity Capture",
        tone: "indigo",
      },
    ],
    newConcept: {
      id: "new-concept-bulgarian-split-squat",
      term: "болгарские приседания",
      suggestedLabel: "Bulgarian split squat",
      description:
        "A candidate training value object for a single-leg squat movement.",
      reason:
        "The phrase appears as a concrete exercise and should be reviewed as a possible reusable health concept.",
      proposedKind: "value_object",
      domain: "health",
      attributes: [
        "single-leg movement",
        "quadriceps load",
        "balance demand",
        "strength training",
      ],
      riskNotes: [
        "Do not create a new Value Object automatically.",
        "Do not merge with a broader leg-training category without user review.",
      ],
    },
    conceptCandidates: [
      {
        id: "concept-candidate-bulgarian-split-squat",
        label: "Bulgarian split squat",
        kind: "value_object",
        domain: "health",
        status: "candidate",
        confidence: mediumConfidence,
        reason: "The phrase maps to a known exercise name.",
        source: "local_fixture",
        synonyms: ["split squat", "rear-foot elevated split squat"],
        attributes: ["legs", "balance", "strength"],
      },
      {
        id: "concept-candidate-quadriceps-work",
        label: "Quadriceps work",
        kind: "category",
        domain: "health",
        status: "needs_review",
        confidence: lowConfidence,
        reason:
          "The exercise involves the quadriceps, but the exact training goal is not certain.",
        source: "local_fixture",
        attributes: ["muscle group", "training load"],
      },
    ],
    localMatches: exerciseLocalMatches,
    externalHints: exerciseExternalHints,
    actions: defaultActions,
    safetyNotes: [],
    decisionPreview: {
      selectedActionId: "ask-later",
      label: "Keep in review queue",
      description:
        "The item remains visible for semantic review without changing local records.",
      safetyNote: "No records will be created by this preview.",
      willCreateRecords: false,
    },
  },
  {
    id: "semantic-review-parental-care-math",
    title: "Role/category resolution",
    subtitle: "The action includes learning, math, child, and parental care.",
    kind: "category_resolution",
    status: "needs_review",
    resolverStatus: "merge_candidate",
    priority: "medium",
    domain: "learning",
    source: "activity_review",
    rawText: "Учил математику с ребёнком после работы.",
    highlightedTerm: "учил математику с ребёнком",
    confidence: highConfidence,
    summaryChips: [
      {
        id: "chip-domain-learning",
        label: "Domain",
        value: "Learning",
        tone: "violet",
      },
      {
        id: "chip-role-care",
        label: "Role layer",
        value: "Parental care",
        tone: "emerald",
      },
      {
        id: "chip-review-merge",
        label: "Resolver",
        value: "Merge candidate",
        tone: "amber",
      },
    ],
    newConcept: {
      id: "new-concept-parental-learning-support",
      term: "учил математику с ребёнком",
      suggestedLabel: "Parental learning support",
      description:
        "A role-aware category for helping a child learn while acting as a parent or caregiver.",
      reason:
        "The same external action can have different value meaning depending on role, responsibility, and purpose.",
      proposedKind: "role",
      domain: "relationship",
      attributes: [
        "parental care",
        "child supervision",
        "learning support",
        "family responsibility",
      ],
      riskNotes: [
        "Do not reduce the action to math learning only.",
        "Do not merge role and subject categories without showing the user the difference.",
      ],
    },
    conceptCandidates: [
      {
        id: "concept-candidate-math-learning",
        label: "Math learning",
        kind: "category",
        domain: "learning",
        status: "candidate",
        confidence: mediumConfidence,
        reason: "The object of the action is math learning.",
        source: "local_fixture",
        attributes: ["education", "subject", "child"],
      },
      {
        id: "concept-candidate-parental-care",
        label: "Parental care",
        kind: "role",
        domain: "relationship",
        status: "candidate",
        confidence: highConfidence,
        reason:
          "The phrase indicates the user is acting in a care and responsibility role.",
        source: "local_fixture",
        synonyms: ["childcare", "caregiving", "parental support"],
        attributes: ["role", "responsibility", "family"],
      },
    ],
    localMatches: childcareLocalMatches,
    externalHints: childcareExternalHints,
    actions: defaultActions,
    safetyNotes: [],
    decisionPreview: {
      selectedActionId: "merge-later",
      label: "Preview role-aware merge",
      description:
        "The UI can show how learning and parental care would be connected later.",
      safetyNote: "Merge stays disabled until a separate gate exists.",
      willCreateRecords: false,
    },
  },
  {
    id: "semantic-review-purchase-confirmation",
    title: "Commercial meaning boundary",
    subtitle: "External purchase confirmation must stay separate from checkout logic.",
    kind: "external_concept_hint",
    status: "blocked",
    resolverStatus: "blocked_no_write_gate",
    priority: "medium",
    domain: "money",
    source: "external_hint",
    rawText:
      "Покупатель просит подтвердить внешнюю покупку для начисления points.",
    highlightedTerm: "подтвердить внешнюю покупку",
    confidence: mediumConfidence,
    summaryChips: [
      {
        id: "chip-domain-money",
        label: "Domain",
        value: "Money",
        tone: "amber",
      },
      {
        id: "chip-boundary",
        label: "Boundary",
        value: "No checkout",
        tone: "indigo",
      },
      {
        id: "chip-status-blocked",
        label: "Status",
        value: "Blocked",
        tone: "slate",
      },
    ],
    newConcept: {
      id: "new-concept-external-purchase-confirmation",
      term: "подтвердить внешнюю покупку",
      suggestedLabel: "External purchase confirmation",
      description:
        "A commercial context where the platform only records a confirmation request after an outside purchase.",
      reason:
        "The phrase is important for points logic but must not be treated as cart, order, or item creation.",
      proposedKind: "context",
      domain: "money",
      attributes: [
        "external purchase",
        "seller confirmation",
        "points eligibility",
        "commercial boundary",
      ],
      riskNotes: [
        "Do not create cart or order flows.",
        "Do not create points transactions from the semantic review UI.",
      ],
    },
    conceptCandidates: [
      {
        id: "concept-candidate-external-purchase",
        label: "External purchase",
        kind: "context",
        domain: "money",
        status: "candidate",
        confidence: mediumConfidence,
        reason:
          "The purchase happens outside the platform and is only referenced by the confirmation process.",
        source: "local_fixture",
        attributes: ["commercial context", "external action"],
      },
      {
        id: "concept-candidate-points-threshold",
        label: "Points threshold",
        kind: "metric",
        domain: "money",
        status: "needs_review",
        confidence: lowConfidence,
        reason:
          "The text may influence points calculation, but threshold logic is not part of this UI block.",
        source: "local_fixture",
        attributes: ["points", "threshold", "calculation"],
      },
    ],
    localMatches: commercialLocalMatches,
    externalHints: commercialExternalHints,
    actions: defaultActions,
    safetyNotes: [],
    decisionPreview: {
      selectedActionId: "open-source-review",
      label: "Open source review preview",
      description:
        "The UI can explain the source meaning without creating commercial records.",
      safetyNote:
        "Commercial writes must stay behind a separate explicit implementation gate.",
      willCreateRecords: false,
    },
  },
];

export const defaultSemanticReviewQueue: SemanticReviewQueue = {
  id: "semantic-review-default-queue",
  title: "Semantic review queue",
  description:
    "Local fixture queue for concepts, categories, role meanings, and external hints that need user review.",
  items: semanticReviewFixtures,
  summary: {
    total: semanticReviewFixtures.length,
    highPriority: semanticReviewFixtures.filter(
      (item) => item.priority === "high",
    ).length,
    mediumPriority: semanticReviewFixtures.filter(
      (item) => item.priority === "medium",
    ).length,
    lowPriority: semanticReviewFixtures.filter(
      (item) => item.priority === "low",
    ).length,
    blocked: semanticReviewFixtures.filter((item) => item.status === "blocked")
      .length,
    localOnly: semanticReviewFixtures.filter(
      (item) =>
        item.status === "local_only" ||
        item.actions.some((action) => action.isLocalOnly),
    ).length,
  },
};

export const defaultSemanticReviewPanelState: SemanticReviewPanelState = {
  mode: "selected_item",
  queue: defaultSemanticReviewQueue,
  selectedItemId: semanticReviewFixtures[0]?.id,
  message:
    "Fixture-only semantic review panel. Candidate, not truth. No hidden writes.",
};

export const semanticReviewEmptyState: SemanticReviewEmptyState = {
  title: "No semantic items need review",
  description:
    "When local parsing finds unknown terms, merge candidates, or external hints, they will appear here for review.",
  actionLabel: "Return to workspace",
};

export const semanticReviewLoadingState: SemanticReviewEmptyState = {
  title: "Loading semantic review",
  description:
    "The future connected version may load review items, but this UI block stays fixture-only.",
};

export const semanticReviewErrorState: SemanticReviewEmptyState = {
  title: "Semantic review is unavailable",
  description:
    "The UI can show an error state without retry loops, hidden writes, or background persistence.",
};

export const semanticReviewNoRightsState: SemanticReviewEmptyState = {
  title: "No rights to review this semantic item",
  description:
    "Permission-sensitive review is shown as a UI state only. No access-sensitive data is written here.",
};

export const semanticReviewSafetyBoundary: SemanticReviewSafetyBoundary = {
  title: "Semantic review safety boundary",
  points: [
    "AI output is a candidate, not truth.",
    "External concept is a hint, not an internal category.",
    "Category is not a state fact.",
    "Confirm, reject, merge, and ask-later actions are local-only or disabled preview actions.",
    "This UI must not create Activity Events, Value Objects, global categories, or points records.",
  ],
};

export function getDefaultSemanticReviewItem(): SemanticReviewItem {
  return semanticReviewFixtures[0];
}

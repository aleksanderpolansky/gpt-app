import type {
  ReviewActionAvailability,
  ReviewPackage,
  ReviewSafetyNote,
} from "../activity-review";

export const SEMANTIC_REVIEW_TYPES_CREATED = true as const;

export type SemanticReviewItemKind =
  | "unknown_term"
  | "category_resolution"
  | "value_object_candidate"
  | "external_concept_hint";

export type SemanticReviewStatus =
  | "needs_review"
  | "candidate"
  | "local_only"
  | "blocked"
  | "resolved_preview";

export type SemanticReviewPriority = "low" | "medium" | "high";

export type SemanticReviewSource =
  | "activity_capture"
  | "activity_review"
  | "local_fixture"
  | "external_hint";

export type SemanticReviewDomain =
  | "time"
  | "money"
  | "health"
  | "learning"
  | "relationship"
  | "work"
  | "sales"
  | "system"
  | "mixed";

export type SemanticResolverStatus =
  | "new_concept_candidate"
  | "local_match_candidate"
  | "external_hint_only"
  | "merge_candidate"
  | "needs_clarification"
  | "blocked_no_write_gate";

export type SemanticConceptCandidateKind =
  | "category"
  | "value_object"
  | "metric"
  | "state_dimension"
  | "context"
  | "role"
  | "unknown_term";

export interface SemanticReviewConfidence {
  value: number;
  level: "low" | "medium" | "high";
  label: string;
  reason: string;
}

export interface SemanticSummaryChip {
  id: string;
  label: string;
  value?: string;
  tone: "slate" | "indigo" | "violet" | "emerald" | "amber";
}

export interface SemanticConceptCandidate {
  id: string;
  label: string;
  kind: SemanticConceptCandidateKind;
  domain: SemanticReviewDomain;
  status: SemanticReviewStatus;
  confidence: SemanticReviewConfidence;
  reason: string;
  source: SemanticReviewSource;
  synonyms?: ReadonlyArray<string>;
  attributes?: ReadonlyArray<string>;
}

export interface SemanticLocalMatch {
  id: string;
  label: string;
  kind: SemanticConceptCandidateKind;
  domain: SemanticReviewDomain;
  similarity: number;
  relevance: number;
  reason: string;
  currentStatus: "active" | "draft" | "archived";
  sourceLabel: string;
  alreadyExists: boolean;
}

export interface SemanticExternalConceptHint {
  id: string;
  sourceName: string;
  sourceType:
    | "external_ontology"
    | "dictionary"
    | "business_taxonomy"
    | "manual_reference";
  label: string;
  description: string;
  confidence: SemanticReviewConfidence;
  note: string;
  isInternalCategory: false;
}

export interface SemanticNewConcept {
  id: string;
  term: string;
  suggestedLabel: string;
  description: string;
  reason: string;
  proposedKind: SemanticConceptCandidateKind;
  domain: SemanticReviewDomain;
  attributes: ReadonlyArray<string>;
  riskNotes: ReadonlyArray<string>;
}

export type SemanticReviewActionKind =
  | "confirm_local_candidate"
  | "reject_candidate"
  | "merge_later"
  | "ask_later"
  | "open_source_review";

export interface SemanticReviewAllowedAction {
  id: string;
  kind: SemanticReviewActionKind;
  label: string;
  description: string;
  availability: ReviewActionAvailability;
  disabledReason?: string;
  isWriteAction: false;
  isLocalOnly: boolean;
}

export interface SemanticReviewDecisionPreview {
  selectedActionId: string;
  label: string;
  description: string;
  safetyNote: string;
  willCreateRecords: false;
}

export interface SemanticReviewItem {
  id: string;
  title: string;
  subtitle: string;
  kind: SemanticReviewItemKind;
  status: SemanticReviewStatus;
  resolverStatus: SemanticResolverStatus;
  priority: SemanticReviewPriority;
  domain: SemanticReviewDomain;
  source: SemanticReviewSource;
  rawText: string;
  highlightedTerm?: string;
  reviewPackageId?: string;
  reviewPackage?: ReviewPackage;
  confidence: SemanticReviewConfidence;
  summaryChips: ReadonlyArray<SemanticSummaryChip>;
  newConcept?: SemanticNewConcept;
  conceptCandidates: ReadonlyArray<SemanticConceptCandidate>;
  localMatches: ReadonlyArray<SemanticLocalMatch>;
  externalHints: ReadonlyArray<SemanticExternalConceptHint>;
  actions: ReadonlyArray<SemanticReviewAllowedAction>;
  safetyNotes: ReadonlyArray<ReviewSafetyNote>;
  decisionPreview?: SemanticReviewDecisionPreview;
}

export interface SemanticReviewQueueSummary {
  total: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  blocked: number;
  localOnly: number;
}

export interface SemanticReviewQueue {
  id: string;
  title: string;
  description: string;
  items: ReadonlyArray<SemanticReviewItem>;
  summary: SemanticReviewQueueSummary;
}

export type SemanticReviewPanelMode =
  | "queue"
  | "selected_item"
  | "empty"
  | "loading"
  | "error"
  | "no_rights";

export interface SemanticReviewPanelState {
  mode: SemanticReviewPanelMode;
  queue: SemanticReviewQueue;
  selectedItemId?: string;
  message?: string;
}

export interface SemanticReviewEmptyState {
  title: string;
  description: string;
  actionLabel?: string;
}

export interface SemanticReviewSafetyBoundary {
  title: string;
  points: ReadonlyArray<string>;
}

import type {
  ActivityDomain,
  CategoryCandidateStatus,
  LocalActivitySource,
  LocalActivityStatus,
  PrivacyLevel,
  ValueObjectCandidateStatus,
} from "../activity-capture/activity-capture-types";

export const ACTIVITY_REVIEW_TYPES_CREATED =
  "ACTIVITY_REVIEW_TYPES_CREATED" as const;

export type ReviewPackageStatus = "candidate";

export type ReviewDomain = ActivityDomain;

export type ReviewConfidenceLevel = "high" | "medium" | "low";

export type ReviewChipKind =
  | "action"
  | "domain"
  | "context"
  | "role"
  | "privacy"
  | "status"
  | "unknown";

export type ReviewChipStatus =
  | CategoryCandidateStatus
  | ValueObjectCandidateStatus
  | "candidate";

export type ReviewMetricKind =
  | "duration"
  | "count"
  | "distance"
  | "floors"
  | "learning_items"
  | "general";

export type ReviewQuestionKind =
  | "duration_missing"
  | "context_ambiguous"
  | "privacy_caution"
  | "unknown_term"
  | "general";

export type ReviewActionKind =
  | "confirm_locally"
  | "correct"
  | "merge_later"
  | "reject"
  | "ask_later";

export type ReviewActionAvailability = "disabled" | "local_only";

export interface ReviewRawActivity {
  id: string;
  rawText: string;
  localCreatedAt: string;
  source: LocalActivitySource;
  status: LocalActivityStatus;
}

export interface ReviewNormalizedActivity {
  title: string;
  summary: string;
  domain: ReviewDomain;
  domainLabel: string;
  contextLabel?: string;
  durationMinutes?: number;
  statusLabel: string;
}

export interface ReviewChip {
  id: string;
  label: string;
  kind: ReviewChipKind;
  domain?: ReviewDomain;
  confidence?: number;
  status: ReviewChipStatus;
  privacyLevel?: PrivacyLevel;
  reason: string;
  sourceRule: string;
}

export interface ReviewMetric {
  id: string;
  label: string;
  value: string;
  kind: ReviewMetricKind;
  numericValue?: number;
  unitLabel?: string;
  reason: string;
  sourceRule: string;
}

export interface ReviewConfidence {
  level: ReviewConfidenceLevel;
  score: number;
  label: string;
  explanation: string;
  sourceRule: string;
}

export interface ReviewQuestion {
  id: string;
  kind: ReviewQuestionKind;
  question: string;
  reason: string;
  required: false;
}

export interface LinkedValueObjectCandidate {
  id: string;
  label: string;
  domain: ReviewDomain;
  domainLabel: string;
  relevance: number;
  reason: string;
  status: ReviewChipStatus;
}

export interface ReviewAction {
  id: string;
  kind: ReviewActionKind;
  label: string;
  description: string;
  availability: ReviewActionAvailability;
  disabledReason?: string;
}

export interface ReviewSafetyNote {
  id: string;
  label: string;
  description: string;
}

export interface ReviewPackage {
  id: string;
  status: ReviewPackageStatus;
  rawActivity: ReviewRawActivity;
  normalizedActivity: ReviewNormalizedActivity;
  semanticChips: ReviewChip[];
  metrics: ReviewMetric[];
  confidence: ReviewConfidence;
  clarifyingQuestions: ReviewQuestion[];
  linkedValueObjectCandidates: LinkedValueObjectCandidate[];
  actions: ReviewAction[];
  safetyNotes: ReviewSafetyNote[];
}

export interface ReviewActionFeedback {
  selectedActionId: string;
  selectedActionLabel: string;
  message: string;
}

export interface ActivityReviewCardProps {
  reviewPackage: ReviewPackage;
  actionFeedback?: ReviewActionFeedback;
  onLocalAction?: (action: ReviewAction) => void;
}

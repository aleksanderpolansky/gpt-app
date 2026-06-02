export const ACTIVITY_CAPTURE_TYPES_CREATED =
  "ACTIVITY_CAPTURE_TYPES_CREATED" as const;

export type LocalActivityStatus = "draft" | "preview";

export type LocalActivitySource = "local";

export type ActivityDomain =
  | "language"
  | "health"
  | "fitness"
  | "nutrition"
  | "work"
  | "family"
  | "money"
  | "purchase"
  | "time"
  | "mobility"
  | "recovery"
  | "unknown"
  | "general";

export type CategoryCandidateStatus = "suggested" | "needs_review";

export type ValueObjectCandidateStatus = "candidate";

export type PrivacyLevel =
  | "private"
  | "sensitive"
  | "organization"
  | "public-safe";

export type UnknownTermSuggestedAction = "ask_later" | "needs_review";

export interface LocalActivityDraft {
  id: string;
  rawText: string;
  localCreatedAt: string;
  durationMinutes?: number;
  contextLabel?: string;
  status: LocalActivityStatus;
  source: LocalActivitySource;
}

export interface LocalDurationHint {
  id: string;
  label: string;
  minutes: number;
  reason: string;
  sourceRule: string;
}

export interface LocalMetricHint {
  id: string;
  label: string;
  value: string;
  reason: string;
  sourceRule: string;
}

export interface LocalCategoryCandidate {
  id: string;
  label: string;
  domain: ActivityDomain;
  confidence: number;
  status: CategoryCandidateStatus;
  reason: string;
  sourceRule: string;
}

export interface ValueObjectCandidate {
  id: string;
  label: string;
  domain: ActivityDomain;
  relevance: number;
  reason: string;
  status: ValueObjectCandidateStatus;
}

export interface PrivacyHint {
  id: string;
  domain: ActivityDomain;
  privacyLevel: PrivacyLevel;
  reason: string;
}

export interface UnknownTermCandidate {
  term: string;
  reason: string;
  suggestedAction: UnknownTermSuggestedAction;
}

export interface LocalParserResult {
  draft: LocalActivityDraft;
  normalizedTitle: string;
  durationHints: LocalDurationHint[];
  metricHints: LocalMetricHint[];
  categoryCandidates: LocalCategoryCandidate[];
  valueObjectCandidates: ValueObjectCandidate[];
  privacyHints: PrivacyHint[];
  unknownTermCandidates: UnknownTermCandidate[];
  explanation: string[];
}

export const VALUE_OBJECT_DOMAINS = [
  "time",
  "money",
  "health",
  "world",
  "learning",
  "career",
  "family",
  "operations",
  "semantic",
  "commercial",
  "recovery",
] as const;

export type ValueObjectDomain = (typeof VALUE_OBJECT_DOMAINS)[number];

export const VALUE_OBJECT_PRIVACY_LEVELS = [
  "private",
  "shared",
  "organization",
  "public",
] as const;

export type ValueObjectPrivacyLevel =
  (typeof VALUE_OBJECT_PRIVACY_LEVELS)[number];

export const VALUE_OBJECT_LIFECYCLE_STATUSES = [
  "active",
  "draft",
  "paused",
  "needs_review",
  "archived_preview",
] as const;

export type ValueObjectLifecycleStatus =
  (typeof VALUE_OBJECT_LIFECYCLE_STATUSES)[number];

export const VALUE_OBJECT_ATTENTION_STATUSES = [
  "balanced",
  "under_attention",
  "over_attention",
  "needs_review",
  "not_started",
] as const;

export type ValueObjectAttentionStatus =
  (typeof VALUE_OBJECT_ATTENTION_STATUSES)[number];

export const VALUE_OBJECT_VIEW_MODES = ["tree", "cloud", "list"] as const;

export type ValueObjectViewMode = (typeof VALUE_OBJECT_VIEW_MODES)[number];

export const VALUE_OBJECT_SIGNAL_TONES = [
  "slate",
  "indigo",
  "emerald",
  "violet",
  "amber",
  "rose",
  "cyan",
] as const;

export type ValueObjectSignalTone = (typeof VALUE_OBJECT_SIGNAL_TONES)[number];

export interface ValueObjectUiMetric {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly helper?: string;
  readonly tone: ValueObjectSignalTone;
}

export interface ValueObjectRelatedActivityCounter {
  readonly id: string;
  readonly label: string;
  readonly count: number;
  readonly helper?: string;
  readonly tone: ValueObjectSignalTone;
}

export interface ValueObjectReviewSignal {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly tone: ValueObjectSignalTone;
}

export interface ValueObjectProtocolFeature {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly helper?: string;
}

export interface ValueObjectUiNode {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly domain: ValueObjectDomain;
  readonly privacyLevel: ValueObjectPrivacyLevel;
  readonly lifecycleStatus: ValueObjectLifecycleStatus;
  readonly attentionStatus: ValueObjectAttentionStatus;
  readonly progressPercent: number;
  readonly confidencePercent: number;
  readonly activityCount: number;
  readonly lastActivityAt?: string;
  readonly parentId?: string;
  readonly childIds: readonly string[];
  readonly relatedObjectIds: readonly string[];
  readonly categoryLabels: readonly string[];
  readonly sourceLabels: readonly string[];
  readonly protocolFeatures: readonly ValueObjectProtocolFeature[];
  readonly relatedActivityCounters: readonly ValueObjectRelatedActivityCounter[];
  readonly metrics: readonly ValueObjectUiMetric[];
  readonly reviewSignals: readonly ValueObjectReviewSignal[];
  readonly tags: readonly string[];
  readonly notes: readonly string[];
}

export interface ValueObjectDomainGroup {
  readonly domain: ValueObjectDomain;
  readonly label: string;
  readonly description: string;
  readonly tone: ValueObjectSignalTone;
  readonly objectIds: readonly string[];
}

export interface ValueObjectFilterState {
  readonly searchQuery: string;
  readonly selectedDomains: readonly ValueObjectDomain[];
  readonly selectedPrivacyLevels: readonly ValueObjectPrivacyLevel[];
  readonly selectedStatuses: readonly ValueObjectLifecycleStatus[];
  readonly showOnlyNeedsReview: boolean;
}

export interface ValueObjectSelectionState {
  readonly selectedObjectId: string;
  readonly viewMode: ValueObjectViewMode;
}

export interface ValueObjectUiSummary {
  readonly totalObjects: number;
  readonly activeObjects: number;
  readonly needsReviewObjects: number;
  readonly privateObjects: number;
  readonly sharedObjects: number;
  readonly averageProgressPercent: number;
}

export interface ValueObjectNormalizedModel {
  readonly objects: readonly ValueObjectUiNode[];
  readonly domainGroups: readonly ValueObjectDomainGroup[];
  readonly summary: ValueObjectUiSummary;
}

export const DEFAULT_VALUE_OBJECT_FILTER_STATE: ValueObjectFilterState = {
  searchQuery: "",
  selectedDomains: [],
  selectedPrivacyLevels: [],
  selectedStatuses: [],
  showOnlyNeedsReview: false,
};

export const DEFAULT_VALUE_OBJECT_SELECTION_STATE: ValueObjectSelectionState = {
  selectedObjectId: "",
  viewMode: "tree",
};

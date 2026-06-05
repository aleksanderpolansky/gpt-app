export type PrivacyAuditTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger";

export type PrivacyAuditDomain =
  | "health"
  | "toilet"
  | "money"
  | "family"
  | "work"
  | "learning"
  | "commerce"
  | "system"
  | "other";

export type PrivacyAuditVisibility =
  | "private"
  | "restricted"
  | "internal"
  | "public-safe"
  | "hidden";

export type PrivacyLevelKind =
  | "low"
  | "medium"
  | "high"
  | "sensitive"
  | "restricted";

export type PrivacyAuditEventStatus =
  | "inferred"
  | "confirmed"
  | "rejected"
  | "corrected";

export type PrivacyAuditSourceType =
  | "activity-event"
  | "semantic-candidate"
  | "user-confirmation"
  | "user-correction"
  | "feedback"
  | "system-preview"
  | "policy";

export type SensitiveControlState =
  | "disabled"
  | "local-only"
  | "future-gated"
  | "read-only";

export type CorrectionHistoryMode =
  | "additive"
  | "preview"
  | "applied";

export type FeedbackTraceStatus =
  | "preview-only"
  | "not-applied"
  | "queued-for-review"
  | "future-gated";

export type PrivacyAuditNavigationTarget =
  | "workspace"
  | "today"
  | "analytics"
  | "next"
  | "objects"
  | "settings";

export interface PrivacyAuditBadge {
  readonly id: string;
  readonly label: string;
  readonly tone: PrivacyAuditTone;
}

export interface PrivacyAuditHeader {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly badges: readonly PrivacyAuditBadge[];
}

export interface PrivacyLevel {
  readonly id: string;
  readonly label: string;
  readonly domain: PrivacyAuditDomain;
  readonly level: PrivacyLevelKind;
  readonly examples: readonly string[];
  readonly visibility: PrivacyAuditVisibility;
  readonly riskTone: PrivacyAuditTone;
  readonly colorToken: string;
}

export interface PrivacySettingItem {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly domain: PrivacyAuditDomain;
  readonly currentPolicy: string;
  readonly visibility: PrivacyAuditVisibility;
  readonly controlState: SensitiveControlState;
  readonly futureGateLabel: string;
  readonly helperText: string;
}

export interface SensitiveCategoryControl {
  readonly id: string;
  readonly categoryLabel: string;
  readonly domain: PrivacyAuditDomain;
  readonly currentPolicy: string;
  readonly controlState: SensitiveControlState;
  readonly futureGateLabel: string;
  readonly warning: string;
}

export interface AuditEvent {
  readonly id: string;
  readonly sourceType: PrivacyAuditSourceType;
  readonly sourceLabel: string;
  readonly status: PrivacyAuditEventStatus;
  readonly previousValue?: string;
  readonly inferredValue: string;
  readonly reason: string;
  readonly confidence: number;
  readonly createdAtLabel: string;
  readonly actorLabel: string;
  readonly privacyLevelId: string;
}

export interface CorrectionHistoryItem {
  readonly id: string;
  readonly targetLabel: string;
  readonly before: string;
  readonly after: string;
  readonly reason: string;
  readonly mode: CorrectionHistoryMode;
  readonly additiveNote: string;
  readonly createdAtLabel: string;
}

export interface FeedbackTrace {
  readonly id: string;
  readonly feedbackLabel: string;
  readonly affectedPreview: string;
  readonly status: FeedbackTraceStatus;
  readonly limitation: string;
}

export interface NoRightsState {
  readonly title: string;
  readonly description: string;
  readonly visibleWhen: string;
  readonly safeActionLabel: string;
}

export interface PrivacyAuditReadOnlyBoundary {
  readonly title: string;
  readonly description: string;
  readonly rules: readonly string[];
}

export interface PrivacyAuditNavigationLink {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly target: PrivacyAuditNavigationTarget;
  readonly description: string;
}

export interface PrivacyAuditSettingsPanel {
  readonly title: string;
  readonly description: string;
  readonly items: readonly PrivacySettingItem[];
}

export interface PrivacyAuditViewModel {
  readonly header: PrivacyAuditHeader;
  readonly privacyLevels: readonly PrivacyLevel[];
  readonly settings: PrivacyAuditSettingsPanel;
  readonly sensitiveControls: readonly SensitiveCategoryControl[];
  readonly auditEvents: readonly AuditEvent[];
  readonly correctionHistory: readonly CorrectionHistoryItem[];
  readonly feedbackTraces: readonly FeedbackTrace[];
  readonly noRightsState: NoRightsState;
  readonly readOnlyBoundary: PrivacyAuditReadOnlyBoundary;
  readonly navigationLinks: readonly PrivacyAuditNavigationLink[];
}

import type {
  AuditEvent,
  FeedbackTraceStatus,
  PrivacyAuditEventStatus,
  PrivacyAuditTone,
  PrivacyAuditVisibility,
  PrivacyLevel,
  PrivacyLevelKind,
  SensitiveControlState,
} from "./privacy-audit.types";

const toneClassNames: Record<PrivacyAuditTone, string> = {
  neutral: "border-border bg-card text-foreground",
  info: "border-primary/30 bg-primary/10 text-primary",
  success: "border-chart-2/30 bg-chart-2/10 text-chart-2",
  warning: "border-chart-4/30 bg-chart-4/10 text-chart-4",
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
};

const levelClassNames: Record<PrivacyLevelKind, string> = {
  low: "border-border bg-card text-muted-foreground",
  medium: "border-primary/30 bg-primary/10 text-primary",
  high: "border-chart-4/30 bg-chart-4/10 text-chart-4",
  sensitive: "border-destructive/30 bg-destructive/10 text-destructive",
  restricted: "border-chart-5/30 bg-chart-5/10 text-chart-5",
};

const statusClassNames: Record<PrivacyAuditEventStatus, string> = {
  inferred: "border-primary/30 bg-primary/10 text-primary",
  confirmed: "border-chart-2/30 bg-chart-2/10 text-chart-2",
  rejected: "border-destructive/30 bg-destructive/10 text-destructive",
  corrected: "border-chart-3/30 bg-chart-3/10 text-chart-3",
};

const visibilityLabels: Record<PrivacyAuditVisibility, string> = {
  private: "Private",
  restricted: "Restricted",
  internal: "Internal",
  "public-safe": "Public-safe",
  hidden: "Hidden",
};

const visibilityClassNames: Record<PrivacyAuditVisibility, string> = {
  private: "border-chart-3/30 bg-chart-3/10 text-chart-3",
  restricted: "border-chart-5/30 bg-chart-5/10 text-chart-5",
  internal: "border-primary/30 bg-primary/10 text-primary",
  "public-safe": "border-chart-2/30 bg-chart-2/10 text-chart-2",
  hidden: "border-destructive/30 bg-destructive/10 text-destructive",
};

const controlStateLabels: Record<SensitiveControlState, string> = {
  disabled: "Disabled",
  "local-only": "Local only",
  "future-gated": "Future-gated",
  "read-only": "Read-only",
};

const controlStateClassNames: Record<SensitiveControlState, string> = {
  disabled: "border-destructive/30 bg-destructive/10 text-destructive",
  "local-only": "border-chart-3/30 bg-chart-3/10 text-chart-3",
  "future-gated": "border-chart-4/30 bg-chart-4/10 text-chart-4",
  "read-only": "border-primary/30 bg-primary/10 text-primary",
};

const feedbackTraceLabels: Record<FeedbackTraceStatus, string> = {
  "preview-only": "Preview only",
  "not-applied": "Not applied",
  "queued-for-review": "Queued for review",
  "future-gated": "Future-gated",
};

const feedbackTraceClassNames: Record<FeedbackTraceStatus, string> = {
  "preview-only": "border-primary/30 bg-primary/10 text-primary",
  "not-applied": "border-muted bg-card text-muted-foreground",
  "queued-for-review": "border-chart-4/30 bg-chart-4/10 text-chart-4",
  "future-gated": "border-chart-5/30 bg-chart-5/10 text-chart-5",
};

export function getToneClassName(tone: PrivacyAuditTone): string {
  return toneClassNames[tone];
}

export function getPrivacyLevelClassName(level: PrivacyLevelKind): string {
  return levelClassNames[level];
}

export function getAuditStatusClassName(status: PrivacyAuditEventStatus): string {
  return statusClassNames[status];
}

export function getVisibilityLabel(visibility: PrivacyAuditVisibility): string {
  return visibilityLabels[visibility];
}

export function getVisibilityClassName(visibility: PrivacyAuditVisibility): string {
  return visibilityClassNames[visibility];
}

export function getControlStateLabel(controlState: SensitiveControlState): string {
  return controlStateLabels[controlState];
}

export function getControlStateClassName(controlState: SensitiveControlState): string {
  return controlStateClassNames[controlState];
}

export function getFeedbackTraceLabel(status: FeedbackTraceStatus): string {
  return feedbackTraceLabels[status];
}

export function getFeedbackTraceClassName(status: FeedbackTraceStatus): string {
  return feedbackTraceClassNames[status];
}

export function formatConfidencePercent(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

export function getAuditEventStatusLabel(status: PrivacyAuditEventStatus): string {
  if (status === "inferred") {
    return "Inferred";
  }

  if (status === "confirmed") {
    return "Confirmed";
  }

  if (status === "rejected") {
    return "Rejected";
  }

  return "Corrected";
}

export function getAuditEventTone(status: PrivacyAuditEventStatus): PrivacyAuditTone {
  if (status === "confirmed") {
    return "success";
  }

  if (status === "rejected") {
    return "danger";
  }

  if (status === "corrected") {
    return "warning";
  }

  return "info";
}

export function getPrivacyLevelSummary(level: PrivacyLevel): string {
  return `${level.label} · ${getVisibilityLabel(level.visibility)} · ${level.examples.length} examples`;
}

export function getAuditEventSummary(event: AuditEvent): string {
  return `${getAuditEventStatusLabel(event.status)} · ${formatConfidencePercent(event.confidence)} · ${event.sourceLabel}`;
}

export function isSensitivePrivacyLevel(level: PrivacyLevel): boolean {
  return level.level === "sensitive" || level.level === "restricted" || level.level === "high";
}

export function isLockedControlState(controlState: SensitiveControlState): boolean {
  return controlState === "disabled" || controlState === "future-gated" || controlState === "read-only";
}

export function getReadOnlyBoundaryBadgeLabel(): string {
  return "Read-only · no hidden writes";
}

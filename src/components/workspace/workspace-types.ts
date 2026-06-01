/**
 * UI-3.5 — type definitions for Master Workspace Shell context.
 *
 * These types are local to the fixture-only UI-3 shell.
 * They do not call network, database, auth, environment variables or server routes.
 *
 * Result marker: WORKSPACE_TYPES_CREATED
 */

export const WORKSPACE_TYPES_VERSION = "UI-3.5_WORKSPACE_TYPES_V1" as const;

export type WorkspaceTone =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "muted"
  | "neutral";

export type WorkspaceCandidateStatus =
  | "fixture"
  | "draft"
  | "candidate"
  | "needs_review"
  | "confirmed"
  | "rejected"
  | "disabled"
  | "preview_only";

export type WorkspaceProfile = {
  readonly displayName: string;
  readonly roleLabel: string;
  readonly timezoneLabel: string;
  readonly currentMode: string;
  readonly syncLabel: string;
  readonly privacyLabel: string;
};

export type WorkspaceContext = {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly activeObjectLabel: string;
  readonly activeDirectionLabel: string;
  readonly statusLabel: string;
  readonly confidenceLabel: string;
};

export type WorkspaceNavigationItem = {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly badge: string;
  readonly description: string;
};

export type WorkspaceNavigationGroup = {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly items: readonly WorkspaceNavigationItem[];
};

export type WorkspaceKpi = {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly helper: string;
  readonly trend: string;
  readonly tone: WorkspaceTone | string;
};

export type WorkspaceOverviewCard = {
  readonly id: string;
  readonly title: string;
  readonly eyebrow: string;
  readonly description: string;
  readonly status: string;
  readonly actionLabel: string;
};

export type WorkspaceActivityPreview = {
  readonly id: string;
  readonly title: string;
  readonly rawText: string;
  readonly normalizedText: string;
  readonly status: string;
  readonly semanticChips: readonly string[];
  readonly valueObjectCandidates: readonly string[];
  readonly privacyHints: readonly string[];
};

export type WorkspaceTimelineItem = {
  readonly id: string;
  readonly time: string;
  readonly title: string;
  readonly description: string;
  readonly meta: string;
};

export type WorkspaceAiMessage = {
  readonly id: string;
  readonly role: "assistant" | "user" | "system";
  readonly title: string;
  readonly message: string;
  readonly tone: WorkspaceTone | string;
};

export type WorkspaceAiInsight = {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly description: string;
};

export type WorkspaceQuickAction = {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly shortcut: string;
};

export type WorkspaceMobileTab = {
  readonly id: "workspace" | "ai" | "objects" | "calendar" | "actions" | string;
  readonly label: string;
  readonly description: string;
};

export type WorkspaceStatePlaceholder = {
  readonly title: string;
  readonly description: string;
};

export type WorkspaceStatePlaceholders = {
  readonly empty: WorkspaceStatePlaceholder;
  readonly loading: WorkspaceStatePlaceholder;
  readonly noRights: WorkspaceStatePlaceholder;
  readonly error: WorkspaceStatePlaceholder;
};

export type WorkspaceShellFixtures = {
  readonly profile: WorkspaceProfile;
  readonly context: WorkspaceContext;
  readonly navigation: readonly WorkspaceNavigationGroup[];
  readonly kpis: readonly WorkspaceKpi[];
  readonly overviewCards: readonly WorkspaceOverviewCard[];
  readonly activityPreview: WorkspaceActivityPreview;
  readonly timeline: readonly WorkspaceTimelineItem[];
  readonly aiMessages: readonly WorkspaceAiMessage[];
  readonly aiInsights: readonly WorkspaceAiInsight[];
  readonly quickActions: readonly WorkspaceQuickAction[];
  readonly mobileTabs: readonly WorkspaceMobileTab[];
  readonly states: WorkspaceStatePlaceholders;
};

export type WorkspacePanelKey =
  | "workspace"
  | "activity-review"
  | "semantic-review"
  | "objects"
  | "calendar"
  | "analytics"
  | "next"
  | "commercial"
  | "ai"
  | "actions";

export type WorkspaceShellMode = "desktop" | "mobile";

export type WorkspaceShellProps = {
  readonly mode?: WorkspaceShellMode;
  readonly activePanel?: WorkspacePanelKey;
};

export type WorkspaceActionIntent =
  | "record_activity"
  | "review_weak_direction"
  | "open_objects"
  | "open_analytics"
  | "ask_ai"
  | "open_calendar"
  | "open_semantic_review"
  | "open_commercial_core";

export type WorkspaceUiBoundary = {
  readonly noApi: true;
  readonly noDb: true;
  readonly noSupabase: true;
  readonly noHiddenWrites: true;
  readonly fixtureOnly: true;
};

export const WORKSPACE_UI3_BOUNDARY: WorkspaceUiBoundary = {
  noApi: true,
  noDb: true,
  noSupabase: true,
  noHiddenWrites: true,
  fixtureOnly: true,
} as const;

export const WORKSPACE_TYPES_RESULT = "WORKSPACE_TYPES_CREATED" as const;

/**
 * UI-3.4 — static fixtures for Master Workspace Shell.
 *
 * These fixtures are intentionally local, deterministic and read-only.
 * They do not call network, database, auth, environment variables or server routes.
 *
 * Result marker: WORKSPACE_FIXTURES_CREATED
 */

export const WORKSPACE_FIXTURES_VERSION = "UI-3.4_STATIC_WORKSPACE_FIXTURES_V1" as const;

export const workspaceProfileFixture = {
  displayName: "Aleksander",
  roleLabel: "AI-NAVIGATOR workspace",
  timezoneLabel: "Europe/Warsaw",
  currentMode: "Planning mode",
  syncLabel: "Local preview only",
  privacyLabel: "Private by default",
} as const;

export const workspaceContextFixture = {
  id: "today-main-context",
  title: "Today workspace",
  subtitle: "Review activity, objects, signals and next candidates in one shell.",
  activeObjectLabel: "German language and B2B work",
  activeDirectionLabel: "Language / Career / Business",
  statusLabel: "Fixture-only shell",
  confidenceLabel: "No persistence",
} as const;

export const workspaceNavigationFixture = [
  {
    id: "personal",
    label: "Personal workspace",
    description: "Daily activities, time, health, learning and family contexts.",
    items: [
      {
        id: "today",
        label: "Today",
        href: "/today",
        badge: "timeline",
        description: "Daily activity stream and local review placeholders.",
      },
      {
        id: "activity-review",
        label: "Activity Review",
        href: "/activity/review",
        badge: "draft",
        description: "Candidate understanding before any write gate.",
      },
      {
        id: "calendar",
        label: "Calendar",
        href: "/calendar",
        badge: "windows",
        description: "Free windows and time constraints for future actions.",
      },
    ],
  },
  {
    id: "semantic",
    label: "Semantic map",
    description: "Objects, categories, needs review and semantic candidates.",
    items: [
      {
        id: "objects",
        label: "Value Objects",
        href: "/objects",
        badge: "map",
        description: "Unified value object map without hard subtypes.",
      },
      {
        id: "semantic-review",
        label: "Needs Review",
        href: "/semantic/review",
        badge: "review",
        description: "New concepts and candidate category resolution.",
      },
      {
        id: "analytics",
        label: "Analytics",
        href: "/analytics",
        badge: "signals",
        description: "Balance rings, weak directions and progress signals.",
      },
      {
        id: "next",
        label: "Next Best Action",
        href: "/next",
        badge: "candidate",
        description: "Weak direction selection and action candidates.",
      },
    ],
  },
  {
    id: "commercial",
    label: "Commercial core",
    description: "Organizations, offers, certificates, points and confirmations.",
    items: [
      {
        id: "organizations",
        label: "Organizations",
        href: "/organizations",
        badge: "org",
        description: "Enterprise context and public/private profiles.",
      },
      {
        id: "offers",
        label: "Offers",
        href: "/offers",
        badge: "offers",
        description: "Commercial offers and certificate base.",
      },
      {
        id: "points",
        label: "Points",
        href: "/points",
        badge: "wallet",
        description: "Points balance and operation history placeholders.",
      },
      {
        id: "purchase-confirmations",
        label: "Purchase Confirmations",
        href: "/purchase-confirmations",
        badge: "seller",
        description: "External purchase confirmation flow.",
      },
    ],
  },
] as const;

export const workspaceKpiFixture = [
  {
    id: "balance",
    label: "Balance",
    value: "72%",
    helper: "Preview signal",
    trend: "+4%",
    tone: "primary",
  },
  {
    id: "weak-direction",
    label: "Weak direction",
    value: "Career",
    helper: "Candidate only",
    trend: "needs action",
    tone: "warning",
  },
  {
    id: "learning",
    label: "Learning focus",
    value: "DE / EN",
    helper: "Language objects",
    trend: "active",
    tone: "success",
  },
  {
    id: "privacy",
    label: "Privacy",
    value: "Private",
    helper: "Default shell state",
    trend: "locked",
    tone: "muted",
  },
] as const;

export const workspaceOverviewCardsFixture = [
  {
    id: "activity-capture",
    title: "Activity Capture",
    eyebrow: "Local draft",
    description:
      "Record an activity and show raw text, normalized understanding, semantic chips and candidate objects.",
    status: "Next block after shell",
    actionLabel: "Prepare review card",
  },
  {
    id: "semantic-review",
    title: "Semantic Review",
    eyebrow: "Candidate queue",
    description:
      "New words, uncertain categories and external concept hints stay in review until explicit confirmation.",
    status: "No auto-approval",
    actionLabel: "Open needs review",
  },
  {
    id: "value-objects",
    title: "Value Objects",
    eyebrow: "Unified map",
    description:
      "Objects represent personally meaningful directions and responsibilities without hard subtype hierarchy.",
    status: "Read-only fixture",
    actionLabel: "Inspect map",
  },
  {
    id: "next-action",
    title: "Next Best Action",
    eyebrow: "Candidate engine",
    description:
      "Weak directions are shown first; the user chooses a direction before action candidates are presented.",
    status: "No auto-execute",
    actionLabel: "Review candidates",
  },
] as const;

export const workspaceActivityPreviewFixture = {
  id: "activity-preview-placeholder",
  title: "Activity Review placeholder",
  rawText: "German 40 minutes: Babbel, client email, wrote down 5 useful phrases.",
  normalizedText:
    "Language learning session connected with German, business correspondence and B2B communication.",
  status: "Local fixture only",
  semanticChips: [
    "German",
    "active learning",
    "business correspondence",
    "B2B sales",
    "career",
  ],
  valueObjectCandidates: [
    "German language",
    "Business communication",
    "Remote work readiness",
    "B2B sales",
  ],
  privacyHints: ["private by default", "candidate data", "no hidden writes"],
} as const;

export const workspaceTimelineFixture = [
  {
    id: "timeline-1",
    time: "08:30",
    title: "Language learning",
    description: "German phrases and client-email practice.",
    meta: "40 min · candidate links",
  },
  {
    id: "timeline-2",
    time: "10:15",
    title: "Work focus",
    description: "Back-office work context with learning window.",
    meta: "fixture · no persisted event",
  },
  {
    id: "timeline-3",
    time: "12:00",
    title: "Next action window",
    description: "Short 20-minute window for a focused activity candidate.",
    meta: "preview signal",
  },
] as const;

export const workspaceAiMessagesFixture = [
  {
    id: "ai-1",
    role: "assistant",
    title: "Context understood",
    message:
      "This shell is scoped to the selected workspace context. I can explain candidate objects and next actions, but I do not write anything automatically.",
    tone: "info",
  },
  {
    id: "ai-2",
    role: "assistant",
    title: "Important boundary",
    message:
      "Activity events remain the source of truth. Categories, state signals and recommendations are candidates until confirmation.",
    tone: "warning",
  },
  {
    id: "ai-3",
    role: "assistant",
    title: "Suggested focus",
    message:
      "After the shell is ready, the next useful product value is Activity Capture local MVP inside the center workspace.",
    tone: "success",
  },
] as const;

export const workspaceAiInsightsFixture = [
  {
    id: "insight-1",
    label: "No hidden writes",
    value: "confirmed",
    description: "Buttons in UI-3 are local, disabled, or preview-only.",
  },
  {
    id: "insight-2",
    label: "Similarity vs relevance",
    value: "separated",
    description: "Similar objects are not treated as final next actions.",
  },
  {
    id: "insight-3",
    label: "State facts",
    value: "not created",
    description: "Health, focus and energy are displayed only as signals.",
  },
] as const;

export const workspaceQuickActionsFixture = [
  {
    id: "record-activity",
    label: "Record activity",
    description: "Open local activity draft placeholder.",
    shortcut: "A",
  },
  {
    id: "review-weak-direction",
    label: "Weak direction",
    description: "Show candidate direction list.",
    shortcut: "W",
  },
  {
    id: "open-objects",
    label: "Objects",
    description: "Inspect value object map.",
    shortcut: "O",
  },
  {
    id: "open-analytics",
    label: "Analytics",
    description: "Preview balance and progress signals.",
    shortcut: "P",
  },
  {
    id: "ask-ai",
    label: "Ask AI",
    description: "Focus contextual AI column.",
    shortcut: "I",
  },
] as const;

export const workspaceMobileTabsFixture = [
  {
    id: "workspace",
    label: "Workspace",
    description: "Center panel and current context.",
  },
  {
    id: "ai",
    label: "AI",
    description: "Contextual assistant and candidate explanations.",
  },
  {
    id: "objects",
    label: "Objects",
    description: "Semantic map and value objects.",
  },
  {
    id: "calendar",
    label: "Calendar",
    description: "Free windows and time constraints.",
  },
  {
    id: "actions",
    label: "Actions",
    description: "Quick commands and next candidates.",
  },
] as const;

export const workspaceStatePlaceholdersFixture = {
  empty: {
    title: "No selected object yet",
    description: "Select a navigation item or record an activity draft.",
  },
  loading: {
    title: "Preparing local preview",
    description: "This state is visual only in UI-3.",
  },
  noRights: {
    title: "Private area",
    description: "Sensitive information stays hidden until an explicit permission model is implemented.",
  },
  error: {
    title: "Preview unavailable",
    description: "The shell can still render static fallback content.",
  },
} as const;

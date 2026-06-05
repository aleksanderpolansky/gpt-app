import type { PrivacyAuditViewModel } from "./privacy-audit.types";

export const privacyAuditFixture = {
  header: {
    eyebrow: "Privacy / Audit / Corrections",
    title: "Privacy audit trail",
    description:
      "Fixture-first read-only preview of what was inferred, confirmed, rejected, or corrected, with visible reasons and privacy boundaries.",
    badges: [
      {
        id: "fixture-first",
        label: "Fixture-first",
        tone: "info",
      },
      {
        id: "read-only",
        label: "Read-only",
        tone: "success",
      },
      {
        id: "no-hidden-writes",
        label: "No hidden writes",
        tone: "warning",
      },
    ],
  },
  privacyLevels: [
    {
      id: "level-low",
      label: "Low sensitivity",
      domain: "work",
      level: "low",
      examples: ["Work block labels", "non-sensitive productivity notes"],
      visibility: "internal",
      riskTone: "neutral",
      colorToken: "border-muted",
    },
    {
      id: "level-medium",
      label: "Medium sensitivity",
      domain: "learning",
      level: "medium",
      examples: ["Learning progress", "language practice direction"],
      visibility: "private",
      riskTone: "info",
      colorToken: "border-chart-1",
    },
    {
      id: "level-high-health",
      label: "Health signal",
      domain: "health",
      level: "high",
      examples: ["Fatigue note", "recovery signal", "sleep-related context"],
      visibility: "restricted",
      riskTone: "warning",
      colorToken: "border-chart-4",
    },
    {
      id: "level-sensitive-toilet",
      label: "Toilet / intimate routine signal",
      domain: "toilet",
      level: "sensitive",
      examples: ["Toilet-related routine note", "private body-function context"],
      visibility: "hidden",
      riskTone: "danger",
      colorToken: "border-destructive",
    },
    {
      id: "level-sensitive-money",
      label: "Money / purchase signal",
      domain: "money",
      level: "sensitive",
      examples: ["External purchase confirmation", "points-related context"],
      visibility: "restricted",
      riskTone: "warning",
      colorToken: "border-chart-5",
    },
    {
      id: "level-sensitive-family",
      label: "Family care signal",
      domain: "family",
      level: "sensitive",
      examples: ["Childcare role", "family duty", "caregiving responsibility"],
      visibility: "private",
      riskTone: "warning",
      colorToken: "border-chart-3",
    },
  ],
  settings: {
    title: "Privacy settings preview",
    description:
      "Controls are displayed as disabled/local-only/future-gated until a separate write gate is implemented.",
    items: [
      {
        id: "setting-health",
        label: "Health signals",
        description:
          "Show health-related activity history as signals only, never as diagnosis or medical truth.",
        domain: "health",
        currentPolicy: "Restricted preview",
        visibility: "restricted",
        controlState: "future-gated",
        futureGateLabel: "Requires explicit privacy write gate",
        helperText:
          "Health labels describe user-provided or inferred context and must remain correctable.",
      },
      {
        id: "setting-toilet",
        label: "Toilet / intimate routine signals",
        description:
          "Keep intimate body-function context hidden by default and visible only in privacy/audit review.",
        domain: "toilet",
        currentPolicy: "Hidden by default",
        visibility: "hidden",
        controlState: "disabled",
        futureGateLabel: "Write disabled in UI-13",
        helperText:
          "This category is included to make sensitive inference visible and correctable, not to expose it elsewhere.",
      },
      {
        id: "setting-money",
        label: "Money and purchase context",
        description:
          "Show purchase/points-related traces as audit history, not as a public financial profile.",
        domain: "money",
        currentPolicy: "Restricted preview",
        visibility: "restricted",
        controlState: "future-gated",
        futureGateLabel: "Requires commercial privacy policy gate",
        helperText:
          "Money signals are linked to external-purchase confirmations and certificate/points audit logic.",
      },
      {
        id: "setting-family",
        label: "Family and care roles",
        description:
          "Show family-care meaning when it explains an activity, while preserving private visibility.",
        domain: "family",
        currentPolicy: "Private preview",
        visibility: "private",
        controlState: "local-only",
        futureGateLabel: "Local preview only",
        helperText:
          "Family role categories clarify responsibility and care function without publishing family details.",
      },
    ],
  },
  sensitiveControls: [
    {
      id: "control-health",
      categoryLabel: "Health",
      domain: "health",
      currentPolicy: "Restricted preview",
      controlState: "future-gated",
      futureGateLabel: "No write in UI-13",
      warning:
        "Health-related records are signals/history and must not be treated as diagnosis or verified medical truth.",
    },
    {
      id: "control-toilet",
      categoryLabel: "Toilet / intimate routines",
      domain: "toilet",
      currentPolicy: "Hidden by default",
      controlState: "disabled",
      futureGateLabel: "No write in UI-13",
      warning:
        "Intimate routine context is highly sensitive and appears here only to support user correction and transparency.",
    },
    {
      id: "control-money",
      categoryLabel: "Money / purchases",
      domain: "money",
      currentPolicy: "Restricted preview",
      controlState: "future-gated",
      futureGateLabel: "No write in UI-13",
      warning:
        "Purchase and points traces must not become public financial profiling without explicit policy and consent.",
    },
    {
      id: "control-family",
      categoryLabel: "Family / care responsibility",
      domain: "family",
      currentPolicy: "Private preview",
      controlState: "local-only",
      futureGateLabel: "No write in UI-13",
      warning:
        "Family care labels explain role and responsibility, not private family identity or public status.",
    },
  ],
  auditEvents: [
    {
      id: "audit-001",
      sourceType: "activity-event",
      sourceLabel: "Activity input: learned math with child",
      status: "inferred",
      inferredValue: "family care + learning support",
      reason:
        "The action includes a child and an educational task, so the role layer should include parental/care responsibility.",
      confidence: 0.86,
      createdAtLabel: "Demo timestamp · read-only",
      actorLabel: "System preview",
      privacyLevelId: "level-sensitive-family",
    },
    {
      id: "audit-002",
      sourceType: "semantic-candidate",
      sourceLabel: "Sensitive category resolver",
      status: "confirmed",
      previousValue: "generic learning",
      inferredValue: "learning + family duty",
      reason:
        "User correction confirmed that activity meaning depends on role, duty, responsibility, and care function.",
      confidence: 0.92,
      createdAtLabel: "Demo timestamp · read-only",
      actorLabel: "User confirmation preview",
      privacyLevelId: "level-sensitive-family",
    },
    {
      id: "audit-003",
      sourceType: "user-correction",
      sourceLabel: "Rejected overreach",
      status: "rejected",
      previousValue: "health problem",
      inferredValue: "fatigue signal",
      reason:
        "The record should remain a contextual signal and must not be promoted to diagnosis or medical truth.",
      confidence: 0.74,
      createdAtLabel: "Demo timestamp · read-only",
      actorLabel: "User correction preview",
      privacyLevelId: "level-high-health",
    },
    {
      id: "audit-004",
      sourceType: "feedback",
      sourceLabel: "Money context visibility",
      status: "corrected",
      previousValue: "public purchase proof",
      inferredValue: "restricted purchase confirmation trace",
      reason:
        "Purchase history can support points/certificate audit, but buyer identity and financial detail must stay restricted.",
      confidence: 0.81,
      createdAtLabel: "Demo timestamp · read-only",
      actorLabel: "Feedback preview",
      privacyLevelId: "level-sensitive-money",
    },
  ],
  correctionHistory: [
    {
      id: "correction-001",
      targetLabel: "Activity category",
      before: "learning",
      after: "learning + family care",
      reason:
        "The activity was not only about study content; it also represented care/responsibility for a child.",
      mode: "additive",
      additiveNote:
        "Original event remains in history; correction is appended as a separate audit row.",
      createdAtLabel: "Demo timestamp · read-only",
    },
    {
      id: "correction-002",
      targetLabel: "Health wording",
      before: "health problem",
      after: "fatigue signal",
      reason:
        "UI must avoid diagnostic wording and keep health-related labels as user-correctable signals/history.",
      mode: "preview",
      additiveNote:
        "No destructive update is performed in UI-13; this is a preview of correction history.",
      createdAtLabel: "Demo timestamp · read-only",
    },
    {
      id: "correction-003",
      targetLabel: "Purchase visibility",
      before: "public purchase proof",
      after: "restricted purchase confirmation trace",
      reason:
        "The platform needs auditability without exposing private buyer/financial details publicly.",
      mode: "additive",
      additiveNote:
        "Visibility correction is shown as additive history and does not change records in this UI block.",
      createdAtLabel: "Demo timestamp · read-only",
    },
  ],
  feedbackTraces: [
    {
      id: "trace-001",
      feedbackLabel: "User said the category was too broad",
      affectedPreview: "Activity role changed from generic learning to family-care learning support.",
      status: "preview-only",
      limitation:
        "The fixture shows how feedback will be explained, but it does not train or mutate the resolver.",
    },
    {
      id: "trace-002",
      feedbackLabel: "User rejected health overreach",
      affectedPreview: "Diagnostic-sounding wording replaced with signal/history wording.",
      status: "not-applied",
      limitation:
        "No model update or database write happens in UI-13; only the read-only trace is shown.",
    },
    {
      id: "trace-003",
      feedbackLabel: "Future similarity learning",
      affectedPreview:
        "Similar users/contexts may later use weighted feedback, but only after explicit learning governance.",
      status: "future-gated",
      limitation:
        "No cross-user learning, demographic profiling, or automatic personalization is executed here.",
    },
  ],
  noRightsState: {
    title: "No rights to change privacy policy here",
    description:
      "This page is a read-only transparency/audit preview. Editing privacy policy, correction application, or resolver learning requires a separate explicit write gate.",
    visibleWhen:
      "User can view audit explanations but cannot apply writes from the UI-13 fixture-first page.",
    safeActionLabel: "Review only",
  },
  readOnlyBoundary: {
    title: "Read-only boundary",
    description:
      "UI-13 displays privacy, audit, and correction history without executing writes, saving feedback, or changing resolver behavior.",
    rules: [
      "No DB/API writes.",
      "No hidden persistence.",
      "No destructive update.",
      "Corrections are additive history.",
      "Sensitive controls are disabled/local-only/future-gated.",
      "Health/toilet/money/family categories are signals/history, not diagnosis, truth, or public profiling.",
    ],
  },
  navigationLinks: [
    {
      id: "nav-workspace",
      label: "Workspace",
      href: "/workspace",
      target: "workspace",
      description: "Return to main workspace.",
    },
    {
      id: "nav-today",
      label: "Today",
      href: "/today",
      target: "today",
      description: "Open today timeline preview.",
    },
    {
      id: "nav-analytics",
      label: "Analytics",
      href: "/analytics",
      target: "analytics",
      description: "Open read-only analytics dashboard.",
    },
    {
      id: "nav-next",
      label: "Next Best Action",
      href: "/next",
      target: "next",
      description: "Open read-only next best action preview.",
    },
  ],
} satisfies PrivacyAuditViewModel;

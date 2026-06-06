import type { ContextualAIContext } from "./contextual-ai.types";

export const contextualAIContexts = [
  {
    pageKey: "workspace",
    route: "/workspace",
    title: "Workspace AI context",
    description: "Explains the current operational workspace, quick actions, and last visible activity.",
    entity: {
      type: "none",
      title: "Workspace overview",
      subtitle: "General operational cockpit context",
    },
    confidence: "medium",
    sources: [
      {
        kind: "fixture",
        label: "Fixture baseline",
        description: "Static UI-15 fixture package.",
      },
      {
        kind: "route_context",
        label: "/workspace",
        description: "Workspace route context.",
      },
    ],
    messages: [
      {
        id: "workspace-message-1",
        role: "assistant",
        title: "Workspace explanation",
        body: "I can explain what is currently visible in the workspace and why it matters for the user flow.",
        sourceKind: "route_context",
      },
    ],
    warnings: [
      {
        id: "workspace-warning-1",
        level: "boundary",
        title: "Preview only",
        message: "This column explains the workspace context and does not save, edit, or execute actions.",
      },
    ],
    actions: [
      {
        id: "workspace-action-1",
        title: "Explain current workspace",
        description: "Describe the visible workspace structure and next safe UI step.",
        rationale: "The user needs orientation without hidden writes.",
        constraints: ["Read-only fixture data", "No automatic execution"],
        status: "preview_only",
        riskLabel: "low",
      },
    ],
    quickPrompts: [
      {
        id: "workspace-prompt-1",
        label: "Explain this page",
        prompt: "Explain the current workspace page.",
        status: "disabled",
      },
    ],
    writesAllowed: false,
  },
  {
    pageKey: "activity",
    route: "/activity/review",
    title: "Activity review AI context",
    description: "Explains raw activity text, normalized meaning, semantic chips, confidence, and questions.",
    entity: {
      type: "activity",
      id: "fixture-activity-001",
      title: "Selected activity",
      subtitle: "Raw and normalized activity preview",
    },
    confidence: "medium",
    sources: [
      {
        kind: "fixture",
        label: "Activity fixture",
        description: "Static activity review package.",
      },
      {
        kind: "selected_activity",
        label: "Selected activity",
        description: "The currently visible activity card.",
      },
    ],
    messages: [
      {
        id: "activity-message-1",
        role: "assistant",
        title: "Activity explanation",
        body: "I can explain how the activity was understood, which semantic chips are candidates, and what still needs review.",
        sourceKind: "selected_activity",
      },
    ],
    warnings: [
      {
        id: "activity-warning-1",
        level: "boundary",
        title: "Candidate, not truth",
        message: "Semantic chips and normalized activity text are candidates until the user confirms them.",
      },
    ],
    actions: [
      {
        id: "activity-action-1",
        title: "Prepare review questions",
        description: "Show candidate clarification questions for this activity.",
        rationale: "Questions help resolve uncertainty without creating facts.",
        constraints: ["No persistence", "No automatic confirmation"],
        status: "future_gated",
        riskLabel: "requires_confirmation",
      },
    ],
    quickPrompts: [
      {
        id: "activity-prompt-1",
        label: "Why this category?",
        prompt: "Explain why these categories were suggested.",
        status: "disabled",
      },
    ],
    writesAllowed: false,
  },
  {
    pageKey: "semantic_review",
    route: "/semantic/review",
    title: "Semantic review AI context",
    description: "Explains new terms, similar categories, external concepts as hints, and review boundaries.",
    entity: {
      type: "semantic_candidate",
      id: "fixture-semantic-001",
      title: "Semantic candidate",
      subtitle: "Needs review item",
    },
    confidence: "medium",
    sources: [
      {
        kind: "fixture",
        label: "Semantic fixture",
        description: "Static semantic review package.",
      },
      {
        kind: "route_context",
        label: "/semantic/review",
        description: "Semantic review route context.",
      },
    ],
    messages: [
      {
        id: "semantic-message-1",
        role: "assistant",
        title: "Semantic review explanation",
        body: "I can explain whether a term is a new candidate, a similar existing category, or only an external hint.",
        sourceKind: "route_context",
      },
    ],
    warnings: [
      {
        id: "semantic-warning-1",
        level: "boundary",
        title: "External concept boundary",
        message: "An external concept is a hint and is not automatically an internal active category.",
      },
    ],
    actions: [
      {
        id: "semantic-action-1",
        title: "Compare with existing categories",
        description: "Preview how the candidate could be compared with existing objects.",
        rationale: "Comparison supports review without auto-creating categories.",
        constraints: ["No global category creation", "User confirmation required later"],
        status: "future_gated",
        riskLabel: "medium",
      },
    ],
    quickPrompts: [
      {
        id: "semantic-prompt-1",
        label: "Show similar concepts",
        prompt: "Explain similar semantic candidates.",
        status: "disabled",
      },
    ],
    writesAllowed: false,
  },
  {
    pageKey: "object_collection",
    route: "/objects",
    title: "Objects map AI context",
    description: "Explains the object map, filters, needs-review markers, and progress signals.",
    entity: {
      type: "value_object",
      title: "Object collection",
      subtitle: "List, tree, and cloud overview",
    },
    confidence: "medium",
    sources: [
      {
        kind: "fixture",
        label: "Object collection fixture",
        description: "Static object collection package.",
      },
      {
        kind: "selected_object",
        label: "Object map",
        description: "Object collection context.",
      },
    ],
    messages: [
      {
        id: "objects-message-1",
        role: "assistant",
        title: "Object map explanation",
        body: "I can explain which objects are visible, which filters matter, and which objects may need review.",
        sourceKind: "selected_object",
      },
    ],
    warnings: [
      {
        id: "objects-warning-1",
        level: "info",
        title: "Signals only",
        message: "Progress markers are interface signals and not a final evaluation of the user.",
      },
    ],
    actions: [
      {
        id: "objects-action-1",
        title: "Explain object map",
        description: "Preview an explanation of visible object groups and review markers.",
        rationale: "The user needs orientation inside the object map.",
        constraints: ["No object creation", "No merge action"],
        status: "preview_only",
        riskLabel: "low",
      },
    ],
    quickPrompts: [
      {
        id: "objects-prompt-1",
        label: "What needs review?",
        prompt: "Explain needs-review object markers.",
        status: "disabled",
      },
    ],
    writesAllowed: false,
  },
  {
    pageKey: "value_object",
    route: "/objects/[id]",
    title: "Value object AI context",
    description: "Explains the selected value object, history, related activities, and next candidates.",
    entity: {
      type: "value_object",
      id: "fixture-value-object-001",
      title: "Selected value object",
      subtitle: "Object detail context",
    },
    confidence: "medium",
    sources: [
      {
        kind: "fixture",
        label: "Value object fixture",
        description: "Static value object detail package.",
      },
      {
        kind: "selected_object",
        label: "Selected object",
        description: "Current object detail page.",
      },
    ],
    messages: [
      {
        id: "value-object-message-1",
        role: "assistant",
        title: "Selected object explanation",
        body: "I can explain this selected object, its related activities, and possible next candidates without changing it.",
        sourceKind: "selected_object",
      },
    ],
    warnings: [
      {
        id: "value-object-warning-1",
        level: "boundary",
        title: "No object mutation",
        message: "This AI context does not rename, merge, delete, or update the selected object.",
      },
    ],
    actions: [
      {
        id: "value-object-action-1",
        title: "Suggest next candidate",
        description: "Preview a possible next step connected to the selected object.",
        rationale: "The suggestion must remain a candidate until a later gate.",
        constraints: ["No final NBA", "No auto-execute"],
        status: "future_gated",
        riskLabel: "requires_confirmation",
      },
    ],
    quickPrompts: [
      {
        id: "value-object-prompt-1",
        label: "Explain this object",
        prompt: "Explain the selected value object.",
        status: "disabled",
      },
    ],
    writesAllowed: false,
  },
  {
    pageKey: "timeline",
    route: "/today",
    title: "Today timeline AI context",
    description: "Explains day events, timeline conflicts, and corrections as preview.",
    entity: {
      type: "timeline_day",
      id: "fixture-timeline-day",
      title: "Today",
      subtitle: "Timeline and correction preview",
    },
    confidence: "medium",
    sources: [
      {
        kind: "fixture",
        label: "Timeline fixture",
        description: "Static today timeline package.",
      },
      {
        kind: "timeline_preview",
        label: "Timeline preview",
        description: "Current day timeline context.",
      },
    ],
    messages: [
      {
        id: "timeline-message-1",
        role: "assistant",
        title: "Timeline explanation",
        body: "I can explain the sequence of events, possible conflicts, and correction previews for the selected day.",
        sourceKind: "timeline_preview",
      },
    ],
    warnings: [
      {
        id: "timeline-warning-1",
        level: "boundary",
        title: "Correction preview only",
        message: "Timeline correction suggestions do not change activity times without a later write gate.",
      },
    ],
    actions: [
      {
        id: "timeline-action-1",
        title: "Explain conflicts",
        description: "Preview the reason a timeline conflict may need user attention.",
        rationale: "Conflict explanation helps the user decide later.",
        constraints: ["No correction applied", "No time recalculation"],
        status: "preview_only",
        riskLabel: "medium",
      },
    ],
    quickPrompts: [
      {
        id: "timeline-prompt-1",
        label: "What changed today?",
        prompt: "Explain today timeline signals.",
        status: "disabled",
      },
    ],
    writesAllowed: false,
  },
  {
    pageKey: "calendar",
    route: "/calendar",
    title: "Calendar AI context",
    description: "Explains free windows, constraints, and duration buckets.",
    entity: {
      type: "calendar_window",
      id: "fixture-calendar-window",
      title: "Calendar window",
      subtitle: "Free-window preview",
    },
    confidence: "medium",
    sources: [
      {
        kind: "fixture",
        label: "Calendar fixture",
        description: "Static free-window package.",
      },
      {
        kind: "calendar_preview",
        label: "Calendar preview",
        description: "Calendar context without external writes.",
      },
    ],
    messages: [
      {
        id: "calendar-message-1",
        role: "assistant",
        title: "Free-window explanation",
        body: "I can explain free windows and duration buckets as planning signals.",
        sourceKind: "calendar_preview",
      },
    ],
    warnings: [
      {
        id: "calendar-warning-1",
        level: "boundary",
        title: "No calendar write",
        message: "This panel does not create, update, or delete calendar events.",
      },
    ],
    actions: [
      {
        id: "calendar-action-1",
        title: "Match action to window",
        description: "Preview what kind of action could fit the selected time window.",
        rationale: "Duration and energy constraints can guide the next choice.",
        constraints: ["No event creation", "User choice required"],
        status: "future_gated",
        riskLabel: "requires_confirmation",
      },
    ],
    quickPrompts: [
      {
        id: "calendar-prompt-1",
        label: "What fits this window?",
        prompt: "Explain what could fit the selected calendar window.",
        status: "disabled",
      },
    ],
    writesAllowed: false,
  },
  {
    pageKey: "analytics",
    route: "/analytics",
    title: "Analytics AI context",
    description: "Explains rings, heatmap, weak directions, and warnings as signals, not truth.",
    entity: {
      type: "analytics_signal",
      id: "fixture-analytics-signal",
      title: "Analytics signal",
      subtitle: "Read-only analytics preview",
    },
    confidence: "low",
    sources: [
      {
        kind: "fixture",
        label: "Analytics fixture",
        description: "Static analytics package.",
      },
      {
        kind: "analytics_preview",
        label: "Analytics preview",
        description: "Read-only analytics signal context.",
      },
    ],
    messages: [
      {
        id: "analytics-message-1",
        role: "assistant",
        title: "Analytics explanation",
        body: "I can explain balance rings, heatmap signals, and weak directions as provisional indicators.",
        sourceKind: "analytics_preview",
      },
    ],
    warnings: [
      {
        id: "analytics-warning-1",
        level: "risk",
        title: "No productivity truth",
        message: "Analytics blocks are signals and cannot be treated as a final truth about health, productivity, or value.",
      },
    ],
    actions: [
      {
        id: "analytics-action-1",
        title: "Explain weak direction",
        description: "Preview why a direction may look weak in the current analytics view.",
        rationale: "Explanation helps avoid overreacting to a metric.",
        constraints: ["No diagnosis", "No final productivity judgement"],
        status: "preview_only",
        riskLabel: "medium",
      },
    ],
    quickPrompts: [
      {
        id: "analytics-prompt-1",
        label: "Why this signal?",
        prompt: "Explain the selected analytics signal.",
        status: "disabled",
      },
    ],
    writesAllowed: false,
  },
  {
    pageKey: "next_best_action",
    route: "/next",
    title: "Next action AI context",
    description: "Explains weak direction, user choice, and candidate action package without auto-execution.",
    entity: {
      type: "next_action_candidate",
      id: "fixture-next-action",
      title: "Candidate next action",
      subtitle: "Preview-only next action context",
    },
    confidence: "low",
    sources: [
      {
        kind: "fixture",
        label: "Next action fixture",
        description: "Static next action package.",
      },
      {
        kind: "next_best_action_preview",
        label: "Next action preview",
        description: "Candidate action context.",
      },
    ],
    messages: [
      {
        id: "next-message-1",
        role: "assistant",
        title: "Candidate action explanation",
        body: "I can explain why an action is only a candidate and which constraints should be checked before choosing it.",
        sourceKind: "next_best_action_preview",
      },
    ],
    warnings: [
      {
        id: "next-warning-1",
        level: "boundary",
        title: "No auto-execute",
        message: "A candidate next action is not automatically started, scheduled, or recorded.",
      },
    ],
    actions: [
      {
        id: "next-action-1",
        title: "Review candidate constraints",
        description: "Preview time, energy, place, and priority constraints.",
        rationale: "The user must choose before any future execution flow.",
        constraints: ["User choice required", "No final NBA"],
        status: "future_gated",
        riskLabel: "requires_confirmation",
      },
    ],
    quickPrompts: [
      {
        id: "next-prompt-1",
        label: "Why this next?",
        prompt: "Explain why this action is a candidate.",
        status: "disabled",
      },
    ],
    writesAllowed: false,
  },
  {
    pageKey: "privacy_audit",
    route: "/privacy-audit",
    title: "Privacy audit AI context",
    description: "Explains inferred, confirmed, rejected, corrected, and privacy boundaries.",
    entity: {
      type: "privacy_audit_item",
      id: "fixture-privacy-audit",
      title: "Privacy audit item",
      subtitle: "Audit and correction context",
    },
    confidence: "medium",
    sources: [
      {
        kind: "fixture",
        label: "Privacy fixture",
        description: "Static privacy audit package.",
      },
      {
        kind: "privacy_audit",
        label: "Privacy audit",
        description: "Privacy and correction route context.",
      },
    ],
    messages: [
      {
        id: "privacy-message-1",
        role: "assistant",
        title: "Privacy explanation",
        body: "I can explain what was inferred, confirmed, rejected, or corrected and where privacy boundaries apply.",
        sourceKind: "privacy_audit",
      },
    ],
    warnings: [
      {
        id: "privacy-warning-1",
        level: "boundary",
        title: "No destructive update",
        message: "This AI context does not delete or rewrite audit history.",
      },
    ],
    actions: [
      {
        id: "privacy-action-1",
        title: "Explain audit row",
        description: "Preview why an audit row appears and what status it has.",
        rationale: "Audit explanations must be clear and non-destructive.",
        constraints: ["No deletion", "No hidden correction"],
        status: "preview_only",
        riskLabel: "medium",
      },
    ],
    quickPrompts: [
      {
        id: "privacy-prompt-1",
        label: "What is private here?",
        prompt: "Explain privacy boundaries on this page.",
        status: "disabled",
      },
    ],
    writesAllowed: false,
  },
  {
    pageKey: "commercial_organization",
    route: "/organizations",
    title: "Organization AI context",
    description: "Explains organization role, country, currency boundary, and read-only commercial context.",
    entity: {
      type: "organization",
      id: "fixture-organization",
      title: "Selected organization",
      subtitle: "Commercial organization context",
    },
    confidence: "medium",
    sources: [
      {
        kind: "fixture",
        label: "Organization fixture",
        description: "Static organization package.",
      },
      {
        kind: "commercial_entity",
        label: "Commercial entity",
        description: "Organization commercial context.",
      },
    ],
    messages: [
      {
        id: "organization-message-1",
        role: "assistant",
        title: "Organization explanation",
        body: "I can explain the organization role, country-derived currency boundary, and why edits remain outside UI-15.",
        sourceKind: "commercial_entity",
      },
    ],
    warnings: [
      {
        id: "organization-warning-1",
        level: "boundary",
        title: "Commercial read-only",
        message: "Commercial context is explained without changing organization data.",
      },
    ],
    actions: [
      {
        id: "organization-action-1",
        title: "Explain organization role",
        description: "Preview how the organization participates in the commercial model.",
        rationale: "The user needs business logic orientation without writes.",
        constraints: ["No organization edit", "No currency change"],
        status: "preview_only",
        riskLabel: "low",
      },
    ],
    quickPrompts: [
      {
        id: "organization-prompt-1",
        label: "Explain organization",
        prompt: "Explain this organization context.",
        status: "disabled",
      },
    ],
    writesAllowed: false,
  },
  {
    pageKey: "commercial_offer",
    route: "/offers",
    title: "Offer AI context",
    description: "Explains offer and certificate base without checkout or order flow.",
    entity: {
      type: "offer",
      id: "fixture-offer",
      title: "Selected offer",
      subtitle: "Commercial offer context",
    },
    confidence: "medium",
    sources: [
      {
        kind: "fixture",
        label: "Offer fixture",
        description: "Static offer package.",
      },
      {
        kind: "commercial_entity",
        label: "Commercial entity",
        description: "Offer context.",
      },
    ],
    messages: [
      {
        id: "offer-message-1",
        role: "assistant",
        title: "Offer explanation",
        body: "I can explain how the offer acts as a base for certificates while avoiding checkout or order logic.",
        sourceKind: "commercial_entity",
      },
    ],
    warnings: [
      {
        id: "offer-warning-1",
        level: "boundary",
        title: "No checkout flow",
        message: "UI-15 does not introduce checkout, order, cart, or payment execution.",
      },
    ],
    actions: [
      {
        id: "offer-action-1",
        title: "Explain offer base",
        description: "Preview how the offer may support certificate logic.",
        rationale: "Offer explanation must not change commercial state.",
        constraints: ["No offer edit", "No checkout"],
        status: "preview_only",
        riskLabel: "low",
      },
    ],
    quickPrompts: [
      {
        id: "offer-prompt-1",
        label: "Explain offer",
        prompt: "Explain this offer context.",
        status: "disabled",
      },
    ],
    writesAllowed: false,
  },
  {
    pageKey: "commercial_certificate",
    route: "/certificates",
    title: "Certificate AI context",
    description: "Explains face value, points spend, money part, and seller payout preview.",
    entity: {
      type: "certificate",
      id: "fixture-certificate",
      title: "Selected certificate",
      subtitle: "Commercial certificate context",
    },
    confidence: "medium",
    sources: [
      {
        kind: "fixture",
        label: "Certificate fixture",
        description: "Static certificate package.",
      },
      {
        kind: "commercial_entity",
        label: "Commercial entity",
        description: "Certificate context.",
      },
    ],
    messages: [
      {
        id: "certificate-message-1",
        role: "assistant",
        title: "Certificate explanation",
        body: "I can explain face value, points spend, money part, and seller payout as a preview.",
        sourceKind: "commercial_entity",
      },
    ],
    warnings: [
      {
        id: "certificate-warning-1",
        level: "risk",
        title: "No financial decision",
        message: "This is an explanatory preview and not final financial advice or payment execution.",
      },
    ],
    actions: [
      {
        id: "certificate-action-1",
        title: "Explain certificate split",
        description: "Preview how points and money parts are shown.",
        rationale: "The user needs transparent commercial logic.",
        constraints: ["No payment", "No points burn"],
        status: "preview_only",
        riskLabel: "medium",
      },
    ],
    quickPrompts: [
      {
        id: "certificate-prompt-1",
        label: "Explain split",
        prompt: "Explain certificate points and money split.",
        status: "disabled",
      },
    ],
    writesAllowed: false,
  },
  {
    pageKey: "commercial_points",
    route: "/points",
    title: "Points AI context",
    description: "Explains balance, history, rules, and points burn logic.",
    entity: {
      type: "points_wallet",
      id: "fixture-points-wallet",
      title: "Points wallet",
      subtitle: "Commercial points context",
    },
    confidence: "medium",
    sources: [
      {
        kind: "fixture",
        label: "Points fixture",
        description: "Static points package.",
      },
      {
        kind: "commercial_entity",
        label: "Commercial entity",
        description: "Points wallet context.",
      },
    ],
    messages: [
      {
        id: "points-message-1",
        role: "assistant",
        title: "Points explanation",
        body: "I can explain balance, history, earning rules, and why spent points are burned rather than transferred to the seller.",
        sourceKind: "commercial_entity",
      },
    ],
    warnings: [
      {
        id: "points-warning-1",
        level: "boundary",
        title: "No balance mutation",
        message: "UI-15 does not add, remove, transfer, or burn points.",
      },
    ],
    actions: [
      {
        id: "points-action-1",
        title: "Explain points rule",
        description: "Preview the logic behind balance and points history.",
        rationale: "Commercial transparency needs clear read-only explanations.",
        constraints: ["No points transaction", "No seller payout change"],
        status: "preview_only",
        riskLabel: "medium",
      },
    ],
    quickPrompts: [
      {
        id: "points-prompt-1",
        label: "Explain points",
        prompt: "Explain this points wallet.",
        status: "disabled",
      },
    ],
    writesAllowed: false,
  },
  {
    pageKey: "buyer_confirmation",
    route: "/purchase-confirmations",
    title: "Buyer confirmation AI context",
    description: "Explains external purchase request, proof, comment, status, and points impact.",
    entity: {
      type: "purchase_confirmation",
      id: "fixture-buyer-confirmation",
      title: "Buyer confirmation request",
      subtitle: "External purchase confirmation context",
    },
    confidence: "medium",
    sources: [
      {
        kind: "fixture",
        label: "Buyer confirmation fixture",
        description: "Static buyer confirmation package.",
      },
      {
        kind: "commercial_entity",
        label: "Commercial entity",
        description: "Purchase confirmation context.",
      },
    ],
    messages: [
      {
        id: "buyer-confirmation-message-1",
        role: "assistant",
        title: "Buyer request explanation",
        body: "I can explain the external purchase confirmation request, proof or comment, status, and possible points impact.",
        sourceKind: "commercial_entity",
      },
    ],
    warnings: [
      {
        id: "buyer-confirmation-warning-1",
        level: "boundary",
        title: "External purchase only",
        message: "The platform confirms a purchase that happened outside the platform and does not create a cart or order.",
      },
    ],
    actions: [
      {
        id: "buyer-confirmation-action-1",
        title: "Explain confirmation status",
        description: "Preview why the request has its current status.",
        rationale: "Status explanation helps the buyer understand the flow.",
        constraints: ["No request submit", "No points award"],
        status: "preview_only",
        riskLabel: "medium",
      },
    ],
    quickPrompts: [
      {
        id: "buyer-confirmation-prompt-1",
        label: "Explain request",
        prompt: "Explain this purchase confirmation request.",
        status: "disabled",
      },
    ],
    writesAllowed: false,
  },
  {
    pageKey: "seller_confirmation",
    route: "/seller/purchase-confirmations",
    title: "Seller confirmation AI context",
    description: "Explains seller queue and future-gated approve or reject controls.",
    entity: {
      type: "purchase_confirmation",
      id: "fixture-seller-confirmation",
      title: "Seller confirmation queue item",
      subtitle: "Seller review context",
    },
    confidence: "medium",
    sources: [
      {
        kind: "fixture",
        label: "Seller confirmation fixture",
        description: "Static seller confirmation package.",
      },
      {
        kind: "commercial_entity",
        label: "Commercial entity",
        description: "Seller queue context.",
      },
    ],
    messages: [
      {
        id: "seller-confirmation-message-1",
        role: "assistant",
        title: "Seller queue explanation",
        body: "I can explain the seller queue item and why approve or reject controls remain future-gated.",
        sourceKind: "commercial_entity",
      },
    ],
    warnings: [
      {
        id: "seller-confirmation-warning-1",
        level: "boundary",
        title: "No seller decision",
        message: "UI-15 does not approve, reject, or later confirm a purchase request.",
      },
    ],
    actions: [
      {
        id: "seller-confirmation-action-1",
        title: "Explain seller decision options",
        description: "Preview what each future seller control would mean.",
        rationale: "Seller decisions need explicit gated workflows.",
        constraints: ["No approve", "No reject", "No points impact"],
        status: "future_gated",
        riskLabel: "requires_confirmation",
      },
    ],
    quickPrompts: [
      {
        id: "seller-confirmation-prompt-1",
        label: "Explain queue",
        prompt: "Explain this seller queue item.",
        status: "disabled",
      },
    ],
    writesAllowed: false,
  },
  {
    pageKey: "public_history",
    route: "/public/purchases",
    title: "Public purchase history AI context",
    description: "Explains masked buyers and open company names in public history.",
    entity: {
      type: "public_purchase_history",
      id: "fixture-public-history",
      title: "Public purchase history item",
      subtitle: "Masked buyer and open company context",
    },
    confidence: "medium",
    sources: [
      {
        kind: "fixture",
        label: "Public history fixture",
        description: "Static public purchase history package.",
      },
      {
        kind: "commercial_entity",
        label: "Commercial entity",
        description: "Public history context.",
      },
    ],
    messages: [
      {
        id: "public-history-message-1",
        role: "assistant",
        title: "Public history explanation",
        body: "I can explain why buyer names are masked while company names remain visible.",
        sourceKind: "commercial_entity",
      },
    ],
    warnings: [
      {
        id: "public-history-warning-1",
        level: "boundary",
        title: "Privacy boundary",
        message: "Public history explanation must preserve buyer masking and must not reveal private buyer identity.",
      },
    ],
    actions: [
      {
        id: "public-history-action-1",
        title: "Explain masking rule",
        description: "Preview the privacy logic of masked buyers and open company names.",
        rationale: "Public trust requires visible privacy rules.",
        constraints: ["No identity reveal", "No history mutation"],
        status: "preview_only",
        riskLabel: "medium",
      },
    ],
    quickPrompts: [
      {
        id: "public-history-prompt-1",
        label: "Explain masking",
        prompt: "Explain buyer masking in public history.",
        status: "disabled",
      },
    ],
    writesAllowed: false,
  },
] satisfies readonly ContextualAIContext[];

export const fallbackContextualAIContext: ContextualAIContext = {
  pageKey: "unknown",
  route: "*",
  title: "Unknown context",
  description: "Fallback context for routes that are not mapped yet.",
  entity: {
    type: "none",
    title: "Unknown selected context",
    subtitle: "Fallback preview",
  },
  confidence: "unknown",
  sources: [
    {
      kind: "fixture",
      label: "Fallback fixture",
      description: "Safe fallback for unmapped routes.",
    },
  ],
  messages: [
    {
      id: "fallback-message-1",
      role: "assistant",
      title: "Context not mapped",
      body: "I can explain that this route does not have a specific AI context fixture yet.",
      sourceKind: "fixture",
    },
  ],
  warnings: [
    {
      id: "fallback-warning-1",
      level: "boundary",
      title: "No mapped context",
      message: "No action should be inferred from an unmapped fallback context.",
    },
  ],
  actions: [
    {
      id: "fallback-action-1",
      title: "Map this route later",
      description: "Preview that this route needs an explicit context fixture.",
      rationale: "Fallback should be visible and safe.",
      constraints: ["No implicit context", "No write authority"],
      status: "disabled",
      riskLabel: "requires_confirmation",
    },
  ],
  quickPrompts: [
    {
      id: "fallback-prompt-1",
      label: "Explain fallback",
      prompt: "Explain why this route is unmapped.",
      status: "disabled",
    },
  ],
  writesAllowed: false,
};

export const contextualAIContextByRoute = {
  "/workspace": contextualAIContexts[0],
  "/activity/review": contextualAIContexts[1],
  "/semantic/review": contextualAIContexts[2],
  "/objects": contextualAIContexts[3],
  "/objects/[id]": contextualAIContexts[4],
  "/today": contextualAIContexts[5],
  "/calendar": contextualAIContexts[6],
  "/analytics": contextualAIContexts[7],
  "/next": contextualAIContexts[8],
  "/privacy-audit": contextualAIContexts[9],
  "/organizations": contextualAIContexts[10],
  "/offers": contextualAIContexts[11],
  "/certificates": contextualAIContexts[12],
  "/points": contextualAIContexts[13],
  "/purchase-confirmations": contextualAIContexts[14],
  "/seller/purchase-confirmations": contextualAIContexts[15],
  "/public/purchases": contextualAIContexts[16],
} as const;

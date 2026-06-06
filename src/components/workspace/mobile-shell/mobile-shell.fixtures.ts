import type {
  MobileActionCandidate,
  MobileBadge,
  MobileHeaderContext,
  MobilePanelPreview,
  MobileShellPreviewState,
  MobileTabItem,
  MobileTabKey,
} from "./mobile-shell.types";

export const mobileShellTabs = [
  {
    key: "ai",
    label: "AI",
    shortLabel: "AI",
    ariaLabel: "Open mobile AI context tab",
    description: "Contextual assistant view for the active mobile workspace.",
    status: "preview_only",
  },
  {
    key: "workspace",
    label: "Workspace",
    shortLabel: "Work",
    ariaLabel: "Open mobile workspace tab",
    description: "Compact activity capture and review preview.",
    status: "preview_only",
    routeTarget: {
      href: "/workspace",
      label: "Open desktop workspace",
      description: "Existing read-only workspace route.",
    },
  },
  {
    key: "objects",
    label: "Objects",
    shortLabel: "Obj",
    ariaLabel: "Open mobile objects tab",
    description: "Compact object cloud and selected object preview.",
    status: "preview_only",
    routeTarget: {
      href: "/value-objects",
      label: "Open objects",
      description: "Existing object route.",
    },
  },
  {
    key: "calendar",
    label: "Calendar",
    shortLabel: "Cal",
    ariaLabel: "Open mobile calendar tab",
    description: "Today blocks, free windows, and action slot candidates.",
    status: "preview_only",
    routeTarget: {
      href: "/calendar",
      label: "Open calendar",
      description: "Existing calendar route.",
    },
  },
  {
    key: "actions",
    label: "Actions",
    shortLabel: "Act",
    ariaLabel: "Open mobile actions tab",
    description: "Preview-only quick actions for activity, food, workout, purchase, and next best action.",
    status: "future_gated",
    routeTarget: {
      href: "/next",
      label: "Open next action",
      description: "Existing next best action route.",
    },
  },
] as const satisfies readonly MobileTabItem[];

export const mobileShellReadOnlyBadge: MobileBadge = {
  label: "Preview only",
  tone: "muted",
  status: "preview_only",
};

export const mobileShellNoRightsBadge: MobileBadge = {
  label: "No hidden writes",
  tone: "warning",
  status: "no_rights",
};

export const mobileShellSignalBadge: MobileBadge = {
  label: "Signal",
  tone: "primary",
  status: "signal",
};

export const mobileShellHeaderFixture: MobileHeaderContext = {
  activeTabKey: "ai",
  title: "Mobile Shell",
  contextBadge: mobileShellReadOnlyBadge,
  readOnlyLabel: "Read-only mobile preview",
};

export const mobileShellPanelFixtures: Record<MobileTabKey, MobilePanelPreview> = {
  ai: {
    tabKey: "ai",
    title: "Contextual AI",
    subtitle: "Scoped to the selected mobile tab, not a generic chat.",
    contextLabel: "Active context: mobile shell preview",
    status: "preview_only",
    source: "ui15_contextual_ai",
    helperText: "The assistant can explain signals and prepare preview actions, but cannot write or execute anything in UI-16.",
    sections: [
      {
        title: "Current signal",
        body: "The mobile shell is prepared for one focused task at a time. The AI panel explains context, warnings, and next candidate actions.",
        badges: [
          mobileShellSignalBadge,
          mobileShellNoRightsBadge,
        ],
      },
      {
        title: "Boundary",
        body: "No database, calendar, points, purchase, or object changes are performed from this mobile fixture.",
        badges: [
          {
            label: "Candidate language only",
            tone: "warning",
            status: "future_gated",
          },
        ],
      },
    ],
    primaryRoute: {
      href: "/workspace",
      label: "Open workspace context",
      description: "Existing route used only as navigation.",
    },
  },
  workspace: {
    tabKey: "workspace",
    title: "Activity review preview",
    subtitle: "Example: German learning session, 40 minutes.",
    contextLabel: "Workspace activity capture",
    status: "needs_review",
    source: "ui16_fixture",
    helperText: "This preview shows how a future activity card may look before any gated write flow.",
    sections: [
      {
        title: "Raw text",
        body: "I studied German for 40 minutes and watched a work-related conversation fragment.",
        badges: [
          {
            label: "Raw input",
            tone: "default",
            status: "read_only",
          },
        ],
      },
      {
        title: "Candidate normalization",
        body: "Possible activity: German learning. Possible value objects: German, listening practice, work vocabulary.",
        badges: [
          {
            label: "Needs review",
            tone: "warning",
            status: "needs_review",
          },
        ],
        metrics: [
          {
            label: "Duration",
            value: "40 min",
            helperText: "Fixture value only.",
            status: "signal",
          },
          {
            label: "Mode",
            value: "Active learning",
            helperText: "Candidate label.",
            status: "signal",
          },
        ],
      },
    ],
    primaryRoute: {
      href: "/workspace",
      label: "Open workspace",
      description: "Existing route, no mobile write.",
    },
  },
  objects: {
    tabKey: "objects",
    title: "Object cloud preview",
    subtitle: "Selected object: German listening practice.",
    contextLabel: "Objects and value signals",
    status: "preview_only",
    source: "ui16_fixture",
    helperText: "Object relations are shown as signals and candidates, not as confirmed results.",
    sections: [
      {
        title: "Selected object",
        body: "German listening practice appears as a candidate focus object connected to language learning and work communication.",
        badges: [
          {
            label: "Selected",
            tone: "primary",
            status: "signal",
          },
          {
            label: "Read-only",
            tone: "muted",
            status: "read_only",
          },
        ],
      },
      {
        title: "Possible next link",
        body: "Open object detail only as navigation. Creating or changing objects is outside UI-16.",
        badges: [
          mobileShellNoRightsBadge,
        ],
      },
    ],
    primaryRoute: {
      href: "/value-objects",
      label: "Open objects",
      description: "Existing object route.",
    },
  },
  calendar: {
    tabKey: "calendar",
    title: "Free window preview",
    subtitle: "Example: 20-minute window between work blocks.",
    contextLabel: "Calendar and action slots",
    status: "preview_only",
    source: "ui16_fixture",
    helperText: "Calendar windows are displayed as read-only signals. UI-16 does not create events.",
    sections: [
      {
        title: "Detected window",
        body: "A possible 20-minute slot may be enough for a short workout, language repetition, or activity review.",
        badges: [
          {
            label: "20 min",
            tone: "primary",
            status: "signal",
          },
          {
            label: "Calendar read-only",
            tone: "muted",
            status: "read_only",
          },
        ],
      },
      {
        title: "Constraint",
        body: "The slot candidate should consider energy, location, family context, and no-write boundaries.",
        badges: [
          {
            label: "Candidate",
            tone: "warning",
            status: "preview_only",
          },
        ],
      },
    ],
    primaryRoute: {
      href: "/calendar",
      label: "Open calendar",
      description: "Existing calendar route.",
    },
  },
  actions: {
    tabKey: "actions",
    title: "Quick actions preview",
    subtitle: "All cards are future-gated until explicit write flows exist.",
    contextLabel: "Preview-only action menu",
    status: "future_gated",
    source: "ui16_fixture",
    helperText: "Action cards are visible to explain intended flows, but they do not execute anything in UI-16.",
    sections: [
      {
        title: "Available previews",
        body: "Record activity, food, workout, purchase, free window, and next best action are represented as disabled or preview-only candidates.",
        badges: [
          {
            label: "Future gate",
            tone: "warning",
            status: "future_gated",
          },
          mobileShellNoRightsBadge,
        ],
      },
      {
        title: "Safe behavior",
        body: "Tapping a future action can only explain the candidate or navigate to an existing read-only route.",
        badges: [
          {
            label: "No execution",
            tone: "muted",
            status: "no_rights",
          },
        ],
      },
    ],
    primaryRoute: {
      href: "/next",
      label: "Open next action",
      description: "Existing next route.",
    },
  },
};

export const mobileShellActionFixtures = [
  {
    id: "record-activity-preview",
    tabKey: "actions",
    title: "Record activity",
    description: "Prepare an activity card preview. Actual activity recording is outside UI-16.",
    kind: "future_gate",
    status: "future_gated",
    durationLabel: "1 min",
    energyLabel: "Low",
    placeLabel: "Any",
    routeTarget: {
      href: "/workspace",
      label: "Open workspace",
      description: "Existing workspace route.",
    },
    badges: [
      {
        label: "Preview",
        tone: "muted",
        status: "preview_only",
      },
    ],
    disabledReason: "Write flow is gated after UI-16.",
  },
  {
    id: "food-preview",
    tabKey: "actions",
    title: "Food note",
    description: "Show how a food note candidate could be prepared without saving nutrition data.",
    kind: "future_gate",
    status: "future_gated",
    durationLabel: "2 min",
    energyLabel: "Low",
    placeLabel: "Home or work",
    badges: [
      {
        label: "No storage",
        tone: "warning",
        status: "no_rights",
      },
    ],
    disabledReason: "Nutrition logging requires a separate explicit gate.",
  },
  {
    id: "workout-preview",
    tabKey: "actions",
    title: "Short workout",
    description: "Candidate for a short movement block during a free window.",
    kind: "preview",
    status: "preview_only",
    durationLabel: "5-10 min",
    energyLabel: "Medium",
    placeLabel: "Home",
    routeTarget: {
      href: "/next",
      label: "Open next action",
      description: "Existing route used only as navigation.",
    },
    badges: [
      {
        label: "Candidate",
        tone: "primary",
        status: "signal",
      },
    ],
  },
  {
    id: "purchase-preview",
    tabKey: "actions",
    title: "Purchase confirmation",
    description: "Read-only commercial reminder. Confirmation and points are not available in UI-16.",
    kind: "disabled",
    status: "no_rights",
    durationLabel: "Future flow",
    energyLabel: "Low",
    placeLabel: "Seller page",
    routeTarget: {
      href: "/purchase-confirmations",
      label: "Open confirmations",
      description: "Existing commercial route.",
    },
    badges: [
      {
        label: "Commercial read-only",
        tone: "warning",
        status: "read_only",
      },
    ],
    disabledReason: "Commercial mutation is outside UI-16.",
  },
  {
    id: "free-window-preview",
    tabKey: "calendar",
    title: "Use 20-minute free window",
    description: "Candidate slot for language repetition, activity review, or short workout.",
    kind: "preview",
    status: "preview_only",
    durationLabel: "20 min",
    energyLabel: "Depends on context",
    placeLabel: "Calendar slot",
    routeTarget: {
      href: "/calendar",
      label: "Open calendar",
      description: "Existing calendar route.",
    },
    badges: [
      {
        label: "Window signal",
        tone: "primary",
        status: "signal",
      },
    ],
  },
  {
    id: "next-best-action-preview",
    tabKey: "actions",
    title: "Next best action",
    description: "Show a candidate action explanation without ranking it as a confirmed result.",
    kind: "open_route",
    status: "preview_only",
    durationLabel: "5-20 min",
    energyLabel: "Contextual",
    placeLabel: "Current context",
    routeTarget: {
      href: "/next",
      label: "Open next action",
      description: "Existing route.",
    },
    badges: [
      {
        label: "Candidate, not command",
        tone: "warning",
        status: "preview_only",
      },
    ],
  },
] as const satisfies readonly MobileActionCandidate[];

export const mobileShellPreviewFixture: MobileShellPreviewState = {
  tabs: mobileShellTabs,
  activeTabKey: "ai",
  header: mobileShellHeaderFixture,
  panels: mobileShellPanelFixtures,
  actions: mobileShellActionFixtures,
};

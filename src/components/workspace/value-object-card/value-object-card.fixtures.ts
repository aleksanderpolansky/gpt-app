import type { ValueObjectCardModel } from "./value-object-card.types";

export const valueObjectCardFixtures: ValueObjectCardModel[] = [
  {
    id: "learning-business-german",
    title: "Business German communication",
    subtitle: "Language learning value object",
    statusLabel: "Observed as active",
    description:
      "A read-only example of a value object focused on German business communication, office replies, negotiation phrases, and practical B2B vocabulary.",
    ownerLabel: "Personal workspace",
    visibilityLabel: "Private fixture",
    updatedLabel: "Fixture snapshot",
    goals: [
      {
        id: "goal-1",
        title: "Use German in B2B conversations",
        description:
          "Practice native-like business phrases for calls, follow-ups, objections, and internal coordination.",
        status: "active",
      },
      {
        id: "goal-2",
        title: "Convert passive knowledge into speech",
        description:
          "Move from understanding German content to producing short, confident replies in work situations.",
        status: "active",
      },
      {
        id: "goal-3",
        title: "Keep learning connected to sales work",
        description:
          "Prioritize vocabulary that can support client search, outreach, and sales management tasks.",
        status: "observed",
      },
    ],
    history: [
      {
        id: "activity-1",
        title: "Reviewed office phrases",
        timestampLabel: "Recent learning activity",
        description:
          "Practiced short German replies for workplace communication and B2B context switching.",
        impactLabel: "Language production signal",
      },
      {
        id: "activity-2",
        title: "Listened to German business content",
        timestampLabel: "Background learning",
        description:
          "Used passive listening as a low-friction way to keep German active during routine work.",
        impactLabel: "Comprehension signal",
      },
      {
        id: "activity-3",
        title: "Mapped phrases to sales scenarios",
        timestampLabel: "Planning activity",
        description:
          "Connected language practice with future outreach, discovery calls, and objection handling.",
        impactLabel: "Business relevance signal",
      },
    ],
    relatedCategories: [
      { id: "category-1", label: "German", kind: "domain" },
      { id: "category-2", label: "B2B sales", kind: "domain" },
      { id: "category-3", label: "Business communication", kind: "purpose" },
      { id: "category-4", label: "Job search", kind: "context" },
      { id: "category-5", label: "Negotiation readiness", kind: "signal" },
    ],
    stateSignals: [
      {
        id: "signal-1",
        label: "Consistency",
        value: "Visible",
        tone: "success",
        note: "Repeated practice appears in the fixture history.",
      },
      {
        id: "signal-2",
        label: "Activation gap",
        value: "Needs attention",
        tone: "attention",
        note: "Understanding may be stronger than spontaneous production.",
      },
      {
        id: "signal-3",
        label: "Growth path",
        value: "Practical speech",
        tone: "growth",
        note: "The next useful direction is short spoken output.",
      },
      {
        id: "signal-4",
        label: "Data quality",
        value: "Fixture only",
        tone: "data",
        note: "This card is not connected to live analytics yet.",
      },
    ],
    candidateNextAction: {
      title: "Practice one short discovery-call answer",
      description:
        "Prepare a 30-second German answer explaining what problem the product or service solves for a business client.",
      reason:
        "This is a candidate action because it links language production with future B2B sales work.",
      safetyLabel: "Candidate only, not final NBA",
    },
  },
  {
    id: "default",
    title: "Value Object Card",
    subtitle: "Read-only fixture detail",
    statusLabel: "Fixture fallback",
    description:
      "This fallback card is used when the requested fixture id is not found. It keeps the UI-8 detail route stable without loading live data.",
    ownerLabel: "Personal workspace",
    visibilityLabel: "Private fixture",
    updatedLabel: "Fixture snapshot",
    goals: [
      {
        id: "fallback-goal-1",
        title: "Show stable read-only structure",
        description:
          "Render the planned Value Object Card sections without DB reads or writes.",
        status: "active",
      },
    ],
    history: [
      {
        id: "fallback-history-1",
        title: "Opened fixture detail card",
        timestampLabel: "Current UI preview",
        description:
          "The page displays a static model for layout and routing verification.",
        impactLabel: "UI skeleton signal",
      },
    ],
    relatedCategories: [
      { id: "fallback-category-1", label: "Value object", kind: "domain" },
      { id: "fallback-category-2", label: "Read-only preview", kind: "context" },
    ],
    stateSignals: [
      {
        id: "fallback-signal-1",
        label: "Live data",
        value: "Disabled",
        tone: "data",
        note: "UI-8 skeleton intentionally uses fixtures only.",
      },
    ],
    candidateNextAction: {
      title: "Continue UI-8 implementation",
      description:
        "Use this skeleton as the base for the full read-only card layout.",
      reason:
        "The next implementation step should enrich the UI without adding writes.",
      safetyLabel: "Candidate only, not final NBA",
    },
  },
];

import type { NextBestActionViewModel } from "./next-best-action.types";

export const nextBestActionFixture: NextBestActionViewModel = {
  header: {
    title: "Next Best Action",
    subtitle: "Weak directions are signals. Choose a direction first, then review action candidates.",
    routeLabel: "/next",
    modeLabel: "Fixture-first read-only preview",
    decisionWindowLabel: "Current decision window: 20 minutes",
    sourceContextLabel: "Source context: analytics, calendar windows, and object signals",
    badges: [
      "Signals only",
      "User choice required",
      "Candidates, not commands",
      "No hidden persistence",
    ],
  },
  weakDirections: [
    {
      id: "weak-direction-learning-debt",
      title: "Learning debt",
      domain: "learning",
      score: 74,
      scoreLabel: "High attention gap",
      signalStrength: "high",
      reason:
        "Language and professional learning signals are below the planned balance for the current week.",
      riskOfIgnoring:
        "The gap can reduce momentum for remote work positioning and B2B communication practice.",
      evidenceLabels: ["weekly balance", "language practice", "career positioning"],
      colorToken: "chart-4",
      isSelectedPreview: true,
    },
    {
      id: "weak-direction-recovery",
      title: "Recovery and energy",
      domain: "health",
      score: 61,
      scoreLabel: "Medium recovery gap",
      signalStrength: "medium",
      reason:
        "Recent workload signals suggest a need for a low-energy reset before choosing a demanding task.",
      riskOfIgnoring:
        "Pushing a complex task during a low-energy window can lower quality and increase fatigue.",
      evidenceLabels: ["energy constraint", "load signal", "short reset"],
      colorToken: "chart-2",
      isSelectedPreview: false,
    },
    {
      id: "weak-direction-client-pipeline",
      title: "Client pipeline",
      domain: "work",
      score: 56,
      scoreLabel: "Medium opportunity gap",
      signalStrength: "medium",
      reason:
        "The current free window can support a short B2B outreach preparation task without opening a live sales workflow.",
      riskOfIgnoring:
        "Small preparation windows can disappear without producing reusable sales material.",
      evidenceLabels: ["career", "B2B sales", "free window"],
      colorToken: "chart-1",
      isSelectedPreview: false,
    },
  ],
  selectedDirectionId: "weak-direction-learning-debt",
  constraints: {
    timeWindowMinutes: 20,
    energyLevel: "medium",
    place: "home",
    privacyLevel: "private",
    availableTools: ["notes", "language material", "workspace preview"],
    blockedContexts: ["external calendar change", "email sending", "database persistence"],
    preferredMode: "short focused preparation",
  },
  actionCandidates: [
    {
      id: "candidate-language-sales-phrases",
      title: "Prepare five B2B sales phrases in German and Spanish",
      domain: "learning",
      fitGroup: "best-fit",
      durationMinutes: 15,
      energyCost: "medium",
      placeFit: "home",
      expectedBenefit:
        "Creates reusable language material for remote work positioning and sales conversations.",
      whyNow:
        "The selected weak direction is learning debt, and the current time window is enough for a small focused task.",
      steps: [
        {
          id: "candidate-language-sales-phrases-step-1",
          label: "Choose one sales situation",
          detail: "Use a narrow context such as first contact, follow-up, or objection handling.",
        },
        {
          id: "candidate-language-sales-phrases-step-2",
          label: "Write five phrases",
          detail: "Keep each phrase short enough to reuse in a real conversation.",
        },
        {
          id: "candidate-language-sales-phrases-step-3",
          label: "Mark two phrases for repetition",
          detail: "Select the phrases that are hardest to produce spontaneously.",
        },
      ],
      limitations: [
        {
          id: "candidate-language-sales-phrases-limit-1",
          label: "This is a candidate, not a final instruction.",
        },
        {
          id: "candidate-language-sales-phrases-limit-2",
          label: "No live message is sent from this preview.",
        },
      ],
      confidenceLabel: "medium confidence",
      status: "candidate",
      constraintMatchLabels: ["fits 20 minutes", "home friendly", "medium energy"],
    },
    {
      id: "candidate-low-energy-review",
      title: "Review one weak direction and write one correction note",
      domain: "personal",
      fitGroup: "low-energy",
      durationMinutes: 10,
      energyCost: "low",
      placeFit: "anywhere",
      expectedBenefit:
        "Improves the quality of future suggestions without requiring a demanding work session.",
      whyNow:
        "The constraint context allows a short review task and does not require external integrations.",
      steps: [
        {
          id: "candidate-low-energy-review-step-1",
          label: "Pick one signal",
          detail: "Choose the weak direction that feels least accurate.",
        },
        {
          id: "candidate-low-energy-review-step-2",
          label: "Write one correction",
          detail: "Describe what the system should consider next time.",
        },
      ],
      limitations: [
        {
          id: "candidate-low-energy-review-limit-1",
          label: "Feedback is preview-only in UI-12.",
        },
        {
          id: "candidate-low-energy-review-limit-2",
          label: "No correction is saved until a future gate exists.",
        },
      ],
      confidenceLabel: "low confidence",
      status: "candidate",
      constraintMatchLabels: ["low energy", "private", "no persistence"],
    },
    {
      id: "candidate-client-outline",
      title: "Outline one micro-offer for a German-speaking client",
      domain: "work",
      fitGroup: "later",
      durationMinutes: 20,
      energyCost: "medium",
      placeFit: "home",
      expectedBenefit:
        "Turns career positioning into a small concrete offer that can be refined later.",
      whyNow:
        "The current window can support outline work, but this is less aligned than the selected learning direction.",
      steps: [
        {
          id: "candidate-client-outline-step-1",
          label: "Name the target client type",
          detail: "Pick one realistic buyer profile.",
        },
        {
          id: "candidate-client-outline-step-2",
          label: "Write one outcome",
          detail: "Describe the practical result the client would get.",
        },
        {
          id: "candidate-client-outline-step-3",
          label: "Add one proof point",
          detail: "Connect the offer to language, negotiation, or sales experience.",
        },
      ],
      limitations: [
        {
          id: "candidate-client-outline-limit-1",
          label: "No outreach is started from this UI block.",
        },
        {
          id: "candidate-client-outline-limit-2",
          label: "This option should be rechecked against energy and calendar constraints.",
        },
      ],
      confidenceLabel: "medium confidence",
      status: "candidate",
      constraintMatchLabels: ["work domain", "fits 20 minutes", "later fit"],
    },
  ],
  explanation: [
    {
      id: "explain-learning-debt",
      sourceSignal: "Learning debt is the selected weak direction.",
      reasoning:
        "Candidates are filtered toward short learning or preparation tasks rather than broad planning.",
      similarityNote:
        "Similar tasks can look like career work, but this preview keeps language practice separate from client execution.",
      relevanceNote:
        "Relevance depends on the current time, energy, place, privacy, and available tools.",
      constraintMatch:
        "The best-fit candidate fits the 20-minute window, medium energy, and home context.",
      noTruthClaim:
        "This is not a productivity truth claim. It is a transparent preview of candidate reasoning.",
    },
    {
      id: "explain-recovery",
      sourceSignal: "Recovery has a medium signal.",
      reasoning:
        "A low-energy review option is kept available because the user may reject the selected learning direction.",
      similarityNote:
        "Recovery tasks can resemble passive rest, but this candidate is framed as a short review.",
      relevanceNote:
        "It becomes more relevant if the user confirms low energy.",
      constraintMatch:
        "The low-energy candidate is private and does not require external tools.",
      noTruthClaim:
        "No medical conclusion is made from this signal.",
    },
  ],
  feedbackActions: [
    {
      id: "feedback-useful",
      label: "Useful",
      meaning: "The candidate direction looked useful in this preview.",
      gateStatus: "previewOnly",
      warningText: "Preview only: this feedback is not persisted in UI-12.",
    },
    {
      id: "feedback-not-useful",
      label: "Not useful",
      meaning: "The candidate direction did not match the current context.",
      gateStatus: "previewOnly",
      warningText: "Preview only: no correction is written in this block.",
    },
    {
      id: "feedback-later",
      label: "Later",
      meaning: "The candidate may fit another time window.",
      gateStatus: "disabled",
      warningText: "Disabled until a future scheduling or feedback gate exists.",
    },
    {
      id: "feedback-done",
      label: "Done outside platform",
      meaning: "The user may have completed the action manually outside this preview.",
      gateStatus: "disabled",
      warningText: "Disabled: UI-12 does not record completed actions.",
    },
  ],
  readOnlyBoundary: {
    title: "Read-only preview boundary",
    summary:
      "UI-12 shows weak directions and action candidates, but it does not decide, execute, or persist actions.",
    allowed: [
      "Show weak direction signals.",
      "Show selected direction preview.",
      "Show time, energy, place, privacy, and tool constraints.",
      "Show explainable action candidates.",
      "Show preview-only feedback controls.",
    ],
    forbidden: [
      "No final Next Best Action.",
      "No action execution.",
      "No hidden persistence.",
      "No database write.",
      "No external calendar, email, purchase, points, or certificate action.",
      "No medical, financial, or productivity truth claim.",
    ],
    futureGateNotes: [
      "Live analytics bridge belongs to a future gated block.",
      "Persistent feedback belongs to a future gated block.",
      "AI-generated candidate ranking belongs to a future gated block.",
    ],
  },
  navigationLinks: [
    {
      href: "/analytics",
      label: "Analytics",
      description: "Return to weak direction signals and balance overview.",
    },
    {
      href: "/calendar",
      label: "Calendar",
      description: "Review free windows and time constraints.",
    },
    {
      href: "/today",
      label: "Today",
      description: "Review the current day timeline.",
    },
    {
      href: "/workspace",
      label: "Workspace",
      description: "Return to the main operational workspace.",
    },
  ],
};

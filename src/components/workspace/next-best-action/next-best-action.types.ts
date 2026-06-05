export type NextBestActionDomain =
  | "work"
  | "health"
  | "learning"
  | "family"
  | "personal"
  | "calendar"
  | "recovery";

export type NextBestActionColorToken =
  | "chart-1"
  | "chart-2"
  | "chart-3"
  | "chart-4"
  | "chart-5"
  | "primary"
  | "muted";

export type SignalStrength = "low" | "medium" | "high";

export type EnergyLevel = "low" | "medium" | "high";

export type PrivacyLevel = "private" | "sensitive" | "shared" | "public-preview";

export type PlaceFit =
  | "home"
  | "workplace"
  | "commute"
  | "outside"
  | "calendar-window"
  | "anywhere";

export type CandidateStatus = "candidate";

export type CandidateFitGroup = "best-fit" | "low-energy" | "later";

export type CandidateConfidenceLabel = "low confidence" | "medium confidence" | "high confidence";

export type FeedbackGateStatus = "previewOnly" | "disabled" | "localOnly";

export interface NextBestActionHeader {
  readonly title: string;
  readonly subtitle: string;
  readonly routeLabel: string;
  readonly modeLabel: string;
  readonly decisionWindowLabel: string;
  readonly sourceContextLabel: string;
  readonly badges: readonly string[];
}

export interface WeakDirection {
  readonly id: string;
  readonly title: string;
  readonly domain: NextBestActionDomain;
  readonly score: number;
  readonly scoreLabel: string;
  readonly signalStrength: SignalStrength;
  readonly reason: string;
  readonly riskOfIgnoring: string;
  readonly evidenceLabels: readonly string[];
  readonly colorToken: NextBestActionColorToken;
  readonly isSelectedPreview: boolean;
}

export interface ConstraintState {
  readonly timeWindowMinutes: number;
  readonly energyLevel: EnergyLevel;
  readonly place: PlaceFit;
  readonly privacyLevel: PrivacyLevel;
  readonly availableTools: readonly string[];
  readonly blockedContexts: readonly string[];
  readonly preferredMode: string;
}

export interface ActionCandidateStep {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
}

export interface ActionCandidateLimit {
  readonly id: string;
  readonly label: string;
}

export interface ActionCandidate {
  readonly id: string;
  readonly title: string;
  readonly domain: NextBestActionDomain;
  readonly fitGroup: CandidateFitGroup;
  readonly durationMinutes: number;
  readonly energyCost: EnergyLevel;
  readonly placeFit: PlaceFit;
  readonly expectedBenefit: string;
  readonly whyNow: string;
  readonly steps: readonly ActionCandidateStep[];
  readonly limitations: readonly ActionCandidateLimit[];
  readonly confidenceLabel: CandidateConfidenceLabel;
  readonly status: CandidateStatus;
  readonly constraintMatchLabels: readonly string[];
}

export interface ExplainabilityItem {
  readonly id: string;
  readonly sourceSignal: string;
  readonly reasoning: string;
  readonly similarityNote: string;
  readonly relevanceNote: string;
  readonly constraintMatch: string;
  readonly noTruthClaim: string;
}

export interface FeedbackAction {
  readonly id: string;
  readonly label: string;
  readonly meaning: string;
  readonly gateStatus: FeedbackGateStatus;
  readonly warningText: string;
}

export interface ReadOnlyBoundary {
  readonly title: string;
  readonly summary: string;
  readonly allowed: readonly string[];
  readonly forbidden: readonly string[];
  readonly futureGateNotes: readonly string[];
}

export interface NavigationLink {
  readonly href: string;
  readonly label: string;
  readonly description: string;
}

export interface NextBestActionViewModel {
  readonly header: NextBestActionHeader;
  readonly weakDirections: readonly WeakDirection[];
  readonly selectedDirectionId: string;
  readonly constraints: ConstraintState;
  readonly actionCandidates: readonly ActionCandidate[];
  readonly explanation: readonly ExplainabilityItem[];
  readonly feedbackActions: readonly FeedbackAction[];
  readonly readOnlyBoundary: ReadOnlyBoundary;
  readonly navigationLinks: readonly NavigationLink[];
}

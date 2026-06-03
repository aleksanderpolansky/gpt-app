export type ValueObjectCardStateSignalTone =
  | "success"
  | "attention"
  | "growth"
  | "data";

export type ValueObjectCardStateSignal = {
  id: string;
  label: string;
  value: string;
  tone: ValueObjectCardStateSignalTone;
  note: string;
};

export type ValueObjectCardGoal = {
  id: string;
  title: string;
  description: string;
  status: "active" | "paused" | "observed";
};

export type ValueObjectCardActivity = {
  id: string;
  title: string;
  timestampLabel: string;
  description: string;
  impactLabel: string;
};

export type ValueObjectCardCategory = {
  id: string;
  label: string;
  kind: "domain" | "role" | "purpose" | "context" | "signal";
};

export type ValueObjectCardCandidateNextAction = {
  title: string;
  description: string;
  reason: string;
  safetyLabel: string;
};

export type ValueObjectCardModel = {
  id: string;
  title: string;
  subtitle: string;
  statusLabel: string;
  description: string;
  ownerLabel: string;
  visibilityLabel: string;
  updatedLabel: string;
  goals: ValueObjectCardGoal[];
  history: ValueObjectCardActivity[];
  relatedCategories: ValueObjectCardCategory[];
  stateSignals: ValueObjectCardStateSignal[];
  candidateNextAction: ValueObjectCardCandidateNextAction;
};

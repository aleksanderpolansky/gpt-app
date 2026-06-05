import type {
  ActionCandidate,
  CandidateFitGroup,
  ConstraintState,
  NextBestActionColorToken,
  NextBestActionDomain,
  NextBestActionViewModel,
  WeakDirection,
} from "./next-best-action.types";

export interface VisibleConstraint {
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

export interface CandidateFitBucket {
  readonly fitGroup: CandidateFitGroup;
  readonly title: string;
  readonly candidates: readonly ActionCandidate[];
}

export interface NextBestActionSelectors {
  readonly weakDirections: readonly WeakDirection[];
  readonly selectedWeakDirection: WeakDirection | undefined;
  readonly visibleConstraints: readonly VisibleConstraint[];
  readonly candidateBuckets: readonly CandidateFitBucket[];
  readonly primaryCandidate: ActionCandidate | undefined;
}

export function formatScore(score: number): string {
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));

  return `${normalizedScore}/100`;
}

export function getScoreToneLabel(score: number): string {
  if (score >= 70) {
    return "High signal";
  }

  if (score >= 45) {
    return "Medium signal";
  }

  return "Low signal";
}

export function getWeakDirectionsSorted(
  viewModel: NextBestActionViewModel,
): readonly WeakDirection[] {
  return [...viewModel.weakDirections].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return left.title.localeCompare(right.title);
  });
}

export function getSelectedWeakDirection(
  viewModel: NextBestActionViewModel,
): WeakDirection | undefined {
  return viewModel.weakDirections.find(
    (direction) => direction.id === viewModel.selectedDirectionId,
  );
}

export function getVisibleConstraints(
  constraints: ConstraintState,
): readonly VisibleConstraint[] {
  return [
    {
      id: "time-window",
      label: "Time window",
      value: `${constraints.timeWindowMinutes} minutes`,
    },
    {
      id: "energy-level",
      label: "Energy",
      value: constraints.energyLevel,
    },
    {
      id: "place-fit",
      label: "Place",
      value: constraints.place,
    },
    {
      id: "privacy-level",
      label: "Privacy",
      value: constraints.privacyLevel,
    },
    {
      id: "preferred-mode",
      label: "Mode",
      value: constraints.preferredMode,
    },
    {
      id: "available-tools",
      label: "Available tools",
      value: constraints.availableTools.join(", "),
    },
    {
      id: "blocked-contexts",
      label: "Blocked contexts",
      value: constraints.blockedContexts.join(", "),
    },
  ];
}

export function getCandidateDurationLabel(candidate: ActionCandidate): string {
  return `${candidate.durationMinutes} min`;
}

export function getCandidateFitLabel(fitGroup: CandidateFitGroup): string {
  if (fitGroup === "best-fit") {
    return "Best fit";
  }

  if (fitGroup === "low-energy") {
    return "Low energy";
  }

  return "Later";
}

export function getCandidateFitGroupSortValue(fitGroup: CandidateFitGroup): number {
  if (fitGroup === "best-fit") {
    return 1;
  }

  if (fitGroup === "low-energy") {
    return 2;
  }

  return 3;
}

export function getActionCandidatesSorted(
  viewModel: NextBestActionViewModel,
): readonly ActionCandidate[] {
  return [...viewModel.actionCandidates].sort((left, right) => {
    const fitDifference =
      getCandidateFitGroupSortValue(left.fitGroup) -
      getCandidateFitGroupSortValue(right.fitGroup);

    if (fitDifference !== 0) {
      return fitDifference;
    }

    if (left.durationMinutes !== right.durationMinutes) {
      return left.durationMinutes - right.durationMinutes;
    }

    return left.title.localeCompare(right.title);
  });
}

export function getCandidateBuckets(
  viewModel: NextBestActionViewModel,
): readonly CandidateFitBucket[] {
  const sortedCandidates = getActionCandidatesSorted(viewModel);

  const bucketDefinitions: readonly {
    readonly fitGroup: CandidateFitGroup;
    readonly title: string;
  }[] = [
    {
      fitGroup: "best-fit",
      title: "Best fit for this window",
    },
    {
      fitGroup: "low-energy",
      title: "Low-energy alternative",
    },
    {
      fitGroup: "later",
      title: "Later or needs review",
    },
  ];

  return bucketDefinitions
    .map((bucket) => ({
      ...bucket,
      candidates: sortedCandidates.filter(
        (candidate) => candidate.fitGroup === bucket.fitGroup,
      ),
    }))
    .filter((bucket) => bucket.candidates.length > 0);
}

export function getPrimaryActionCandidate(
  viewModel: NextBestActionViewModel,
): ActionCandidate | undefined {
  return getActionCandidatesSorted(viewModel)[0];
}

export function getConstraintMatchLabel(candidate: ActionCandidate): string {
  if (candidate.constraintMatchLabels.length === 0) {
    return "No explicit constraint match";
  }

  return candidate.constraintMatchLabels.join(" · ");
}

export function getDomainLabel(domain: NextBestActionDomain): string {
  const labels: Record<NextBestActionDomain, string> = {
    calendar: "Calendar",
    family: "Family",
    health: "Health",
    learning: "Learning",
    personal: "Personal",
    recovery: "Recovery",
    work: "Work",
  };

  return labels[domain];
}

export function getColorTokenClassName(colorToken: NextBestActionColorToken): string {
  const classes: Record<NextBestActionColorToken, string> = {
    "chart-1": "border-chart-1 text-chart-1",
    "chart-2": "border-chart-2 text-chart-2",
    "chart-3": "border-chart-3 text-chart-3",
    "chart-4": "border-chart-4 text-chart-4",
    "chart-5": "border-chart-5 text-chart-5",
    muted: "border-border text-muted-foreground",
    primary: "border-primary text-primary",
  };

  return classes[colorToken];
}

export function getDomainAccentClassName(domain: NextBestActionDomain): string {
  const classes: Record<NextBestActionDomain, string> = {
    calendar: "border-chart-5 text-chart-5",
    family: "border-chart-3 text-chart-3",
    health: "border-chart-2 text-chart-2",
    learning: "border-chart-4 text-chart-4",
    personal: "border-chart-3 text-chart-3",
    recovery: "border-chart-2 text-chart-2",
    work: "border-chart-1 text-chart-1",
  };

  return classes[domain];
}

export function buildNextBestActionSelectors(
  viewModel: NextBestActionViewModel,
): NextBestActionSelectors {
  return {
    weakDirections: getWeakDirectionsSorted(viewModel),
    selectedWeakDirection: getSelectedWeakDirection(viewModel),
    visibleConstraints: getVisibleConstraints(viewModel.constraints),
    candidateBuckets: getCandidateBuckets(viewModel),
    primaryCandidate: getPrimaryActionCandidate(viewModel),
  };
}

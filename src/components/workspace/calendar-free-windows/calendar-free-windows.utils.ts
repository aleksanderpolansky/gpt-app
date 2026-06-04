import type {
  CalendarFreeWindow,
  CalendarFreeWindowsDay,
  CalendarFreeWindowsDurationBucket,
  CalendarFreeWindowsFitState,
  CalendarFreeWindowsViewModel,
  CalendarSuggestedActionForWindow,
} from "./calendar-free-windows.types";

const TIME_PARTS_COUNT = 2;
const MINUTES_PER_HOUR = 60;

const fitStateOrder: Record<CalendarFreeWindowsFitState, number> = {
  fits: 0,
  tight: 1,
  too_short: 2,
  blocked_by_context: 3,
};

export function parseCalendarFreeWindowsTime(value: string): number {
  const parts = value.split(":");

  if (parts.length !== TIME_PARTS_COUNT) {
    return 0;
  }

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 0;
  }

  return hours * MINUTES_PER_HOUR + minutes;
}

export function formatCalendarFreeWindowsDuration(minutes: number): string {
  if (minutes < MINUTES_PER_HOUR) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const rest = minutes % MINUTES_PER_HOUR;

  if (rest === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${rest} min`;
}

export function getCalendarFreeWindowsBucketLabel(
  bucket: CalendarFreeWindowsDurationBucket,
): string {
  if (bucket === 5) {
    return "5 min micro-window";
  }

  if (bucket === 10) {
    return "10 min quick action";
  }

  if (bucket === 20) {
    return "20 min useful block";
  }

  return "45 min focused block";
}

export function sortCalendarFreeWindowsByStart(
  windows: readonly CalendarFreeWindow[],
): CalendarFreeWindow[] {
  return [...windows].sort((left, right) => {
    return (
      parseCalendarFreeWindowsTime(left.range.start) -
      parseCalendarFreeWindowsTime(right.range.start)
    );
  });
}

export function sortCalendarCandidatesByFit(
  candidates: readonly CalendarSuggestedActionForWindow[],
): CalendarSuggestedActionForWindow[] {
  return [...candidates].sort((left, right) => {
    const fitDifference =
      fitStateOrder[left.fitState] - fitStateOrder[right.fitState];

    if (fitDifference !== 0) {
      return fitDifference;
    }

    return left.durationBucket - right.durationBucket;
  });
}

export function getCalendarFreeWindowsActiveDay(
  viewModel: CalendarFreeWindowsViewModel,
): CalendarFreeWindowsDay {
  return (
    viewModel.days.find((day) => day.isToday) ??
    viewModel.days[0]
  );
}

export function isCalendarFreeWindowLongEnough(
  freeWindow: CalendarFreeWindow,
  bucket: CalendarFreeWindowsDurationBucket,
): boolean {
  return freeWindow.range.durationMinutes >= bucket;
}

export function getCalendarFreeWindowsForBucket(
  viewModel: CalendarFreeWindowsViewModel,
  bucket: CalendarFreeWindowsDurationBucket,
): CalendarFreeWindow[] {
  const windows = viewModel.days.flatMap((day) => day.freeWindows);

  return sortCalendarFreeWindowsByStart(
    windows.filter((freeWindow) => {
      return (
        freeWindow.availableBuckets.includes(bucket) ||
        isCalendarFreeWindowLongEnough(freeWindow, bucket)
      );
    }),
  );
}

export function getCalendarFreeWindowsForSelectedBucket(
  viewModel: CalendarFreeWindowsViewModel,
): CalendarFreeWindow[] {
  return getCalendarFreeWindowsForBucket(
    viewModel,
    viewModel.selectedDurationBucket,
  );
}

export function getCalendarCandidatesForWindow(
  viewModel: CalendarFreeWindowsViewModel,
  windowId: string,
): CalendarSuggestedActionForWindow[] {
  const freeWindow = viewModel.days
    .flatMap((day) => day.freeWindows)
    .find((item) => item.id === windowId);

  const candidateIds = freeWindow?.suggestedCandidateIds ?? [];

  return sortCalendarCandidatesByFit(
    viewModel.suggestedCandidates.filter((candidate) => {
      return (
        candidate.windowId === windowId ||
        candidateIds.includes(candidate.id)
      );
    }),
  );
}

export function getCalendarFittingCandidatesForWindow(
  viewModel: CalendarFreeWindowsViewModel,
  windowId: string,
): CalendarSuggestedActionForWindow[] {
  return getCalendarCandidatesForWindow(viewModel, windowId).filter(
    (candidate) => {
      return candidate.fitState === "fits" || candidate.fitState === "tight";
    },
  );
}

export function getCalendarFreeWindowsDayCandidateCount(
  viewModel: CalendarFreeWindowsViewModel,
  dayId: string,
): number {
  const day = viewModel.days.find((item) => item.id === dayId);

  if (!day) {
    return 0;
  }

  const windowIds = day.freeWindows.map((freeWindow) => freeWindow.id);

  return viewModel.suggestedCandidates.filter((candidate) => {
    return windowIds.includes(candidate.windowId);
  }).length;
}

export function getCalendarFreeWindowsLargestWindow(
  viewModel: CalendarFreeWindowsViewModel,
): CalendarFreeWindow | null {
  const windows = viewModel.days.flatMap((day) => day.freeWindows);

  if (windows.length === 0) {
    return null;
  }

  return [...windows].sort((left, right) => {
    return right.range.durationMinutes - left.range.durationMinutes;
  })[0];
}

export function getCalendarFreeWindowsByAttention(
  viewModel: CalendarFreeWindowsViewModel,
  attentionLevel: CalendarFreeWindow["attentionLevel"],
): CalendarFreeWindow[] {
  const windows = viewModel.days.flatMap((day) => day.freeWindows);

  return sortCalendarFreeWindowsByStart(
    windows.filter((freeWindow) => {
      return freeWindow.attentionLevel === attentionLevel;
    }),
  );
}

export function getCalendarFreeWindowsByEnergy(
  viewModel: CalendarFreeWindowsViewModel,
  energyLevel: CalendarFreeWindow["energyLevel"],
): CalendarFreeWindow[] {
  const windows = viewModel.days.flatMap((day) => day.freeWindows);

  return sortCalendarFreeWindowsByStart(
    windows.filter((freeWindow) => {
      return freeWindow.energyLevel === energyLevel;
    }),
  );
}

export function getCalendarFreeWindowsSummaryCards(
  viewModel: CalendarFreeWindowsViewModel,
): readonly {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly description: string;
}[] {
  const allWindows = viewModel.days.flatMap((day) => day.freeWindows);
  const selectedWindows = getCalendarFreeWindowsForSelectedBucket(viewModel);
  const largestWindow = getCalendarFreeWindowsLargestWindow(viewModel);
  const fittingCandidates = viewModel.suggestedCandidates.filter(
    (candidate) => {
      return candidate.fitState === "fits" || candidate.fitState === "tight";
    },
  );

  const totalFreeMinutes = allWindows.reduce((total, freeWindow) => {
    return total + freeWindow.range.durationMinutes;
  }, 0);

  return [
    {
      id: "free-windows",
      label: "Free windows",
      value: String(allWindows.length),
      description: "Detected free calendar windows in the current fixture.",
    },
    {
      id: "selected-bucket",
      label: "Selected bucket",
      value: getCalendarFreeWindowsBucketLabel(
        viewModel.selectedDurationBucket,
      ),
      description: "Current duration filter for candidate-friendly windows.",
    },
    {
      id: "matching-windows",
      label: "Matching windows",
      value: String(selectedWindows.length),
      description: "Free windows that can fit the selected duration bucket.",
    },
    {
      id: "total-free-time",
      label: "Total free time",
      value: formatCalendarFreeWindowsDuration(totalFreeMinutes),
      description: "Total visible free time across all fixture days.",
    },
    {
      id: "largest-window",
      label: "Largest window",
      value: largestWindow
        ? formatCalendarFreeWindowsDuration(largestWindow.range.durationMinutes)
        : "0 min",
      description: "Longest uninterrupted free window in the visible range.",
    },
    {
      id: "candidate-actions",
      label: "Candidate actions",
      value: String(fittingCandidates.length),
      description: "Candidate actions that currently fit or nearly fit.",
    },
  ];
}

import {
  defaultSemanticReviewPanelState,
  defaultSemanticReviewQueue,
  semanticReviewEmptyState,
  semanticReviewErrorState,
  semanticReviewFixtures,
  semanticReviewLoadingState,
  semanticReviewNoRightsState,
} from "./semantic-review-fixtures";

import type {
  SemanticReviewConfidence,
  SemanticReviewDomain,
  SemanticReviewEmptyState,
  SemanticReviewItem,
  SemanticReviewPanelMode,
  SemanticReviewPanelState,
  SemanticReviewPriority,
  SemanticReviewQueue,
  SemanticReviewQueueSummary,
  SemanticReviewStatus,
  SemanticResolverStatus,
} from "./semantic-review-types";

export const SEMANTIC_REVIEW_NORMALIZER_CREATED = true as const;

export const semanticReviewPriorityRank: Record<SemanticReviewPriority, number> =
  {
    high: 0,
    medium: 1,
    low: 2,
  };

export const semanticReviewStatusRank: Record<SemanticReviewStatus, number> = {
  needs_review: 0,
  candidate: 1,
  blocked: 2,
  local_only: 3,
  resolved_preview: 4,
};

export interface SemanticReviewFilter {
  domain?: SemanticReviewDomain | "all";
  status?: SemanticReviewStatus | "all";
  priority?: SemanticReviewPriority | "all";
  query?: string;
  includeBlocked?: boolean;
}

export interface SemanticReviewQueueOptions {
  id?: string;
  title?: string;
  description?: string;
  items?: ReadonlyArray<SemanticReviewItem>;
  filter?: SemanticReviewFilter;
}

export interface SemanticReviewPanelOptions {
  mode?: SemanticReviewPanelMode;
  queue?: SemanticReviewQueue;
  selectedItemId?: string;
  message?: string;
  filter?: SemanticReviewFilter;
}

export function clampSemanticScore(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return Number(value.toFixed(2));
}

export function normalizeSemanticReviewConfidence(
  value: number,
  reason: string,
): SemanticReviewConfidence {
  const score = clampSemanticScore(value);

  if (score >= 0.75) {
    return {
      value: score,
      level: "high",
      label: "High confidence",
      reason,
    };
  }

  if (score >= 0.5) {
    return {
      value: score,
      level: "medium",
      label: "Medium confidence",
      reason,
    };
  }

  return {
    value: score,
    level: "low",
    label: "Low confidence",
    reason,
  };
}

export function buildSemanticReviewSearchText(
  item: SemanticReviewItem,
): string {
  const conceptLabels = item.conceptCandidates
    .map((candidate) => candidate.label)
    .join(" ");

  const localMatchLabels = item.localMatches
    .map((match) => match.label)
    .join(" ");

  const externalHintLabels = item.externalHints
    .map((hint) => `${hint.sourceName} ${hint.label}`)
    .join(" ");

  const summaryChips = item.summaryChips
    .map((chip) => `${chip.label} ${chip.value ?? ""}`)
    .join(" ");

  return [
    item.title,
    item.subtitle,
    item.rawText,
    item.highlightedTerm ?? "",
    item.domain,
    item.kind,
    item.status,
    item.resolverStatus,
    conceptLabels,
    localMatchLabels,
    externalHintLabels,
    summaryChips,
  ]
    .join(" ")
    .toLowerCase();
}

export function sortSemanticReviewItems(
  items: ReadonlyArray<SemanticReviewItem>,
): SemanticReviewItem[] {
  return [...items].sort((firstItem, secondItem) => {
    const priorityDiff =
      semanticReviewPriorityRank[firstItem.priority] -
      semanticReviewPriorityRank[secondItem.priority];

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    const statusDiff =
      semanticReviewStatusRank[firstItem.status] -
      semanticReviewStatusRank[secondItem.status];

    if (statusDiff !== 0) {
      return statusDiff;
    }

    return firstItem.title.localeCompare(secondItem.title);
  });
}

export function filterSemanticReviewItems(
  items: ReadonlyArray<SemanticReviewItem>,
  filter: SemanticReviewFilter = {},
): SemanticReviewItem[] {
  const normalizedQuery = filter.query?.trim().toLowerCase();

  return items.filter((item) => {
    if (!filter.includeBlocked && item.status === "blocked") {
      return false;
    }

    if (filter.domain && filter.domain !== "all" && item.domain !== filter.domain) {
      return false;
    }

    if (filter.status && filter.status !== "all" && item.status !== filter.status) {
      return false;
    }

    if (
      filter.priority &&
      filter.priority !== "all" &&
      item.priority !== filter.priority
    ) {
      return false;
    }

    if (normalizedQuery && !buildSemanticReviewSearchText(item).includes(normalizedQuery)) {
      return false;
    }

    return true;
  });
}

export function createSemanticReviewQueueSummary(
  items: ReadonlyArray<SemanticReviewItem>,
): SemanticReviewQueueSummary {
  return {
    total: items.length,
    highPriority: items.filter((item) => item.priority === "high").length,
    mediumPriority: items.filter((item) => item.priority === "medium").length,
    lowPriority: items.filter((item) => item.priority === "low").length,
    blocked: items.filter((item) => item.status === "blocked").length,
    localOnly: items.filter((item) =>
      item.actions.some((action) => action.isLocalOnly),
    ).length,
  };
}

export function normalizeSemanticReviewQueue(
  options: SemanticReviewQueueOptions = {},
): SemanticReviewQueue {
  const sourceItems = options.items ?? semanticReviewFixtures;
  const filteredItems = filterSemanticReviewItems(sourceItems, options.filter);
  const sortedItems = sortSemanticReviewItems(filteredItems);

  return {
    id: options.id ?? defaultSemanticReviewQueue.id,
    title: options.title ?? defaultSemanticReviewQueue.title,
    description: options.description ?? defaultSemanticReviewQueue.description,
    items: sortedItems,
    summary: createSemanticReviewQueueSummary(sortedItems),
  };
}

export function findSemanticReviewItem(
  queue: SemanticReviewQueue,
  itemId: string,
): SemanticReviewItem | undefined {
  return queue.items.find((item) => item.id === itemId);
}

export function getSelectedSemanticReviewItem(
  queue: SemanticReviewQueue,
  selectedItemId?: string,
): SemanticReviewItem | undefined {
  if (selectedItemId) {
    const selectedItem = findSemanticReviewItem(queue, selectedItemId);

    if (selectedItem) {
      return selectedItem;
    }
  }

  return queue.items[0];
}

export function normalizeSemanticReviewPanelState(
  options: SemanticReviewPanelOptions = {},
): SemanticReviewPanelState {
  const queue =
    options.queue ??
    normalizeSemanticReviewQueue({
      filter: options.filter,
    });

  const selectedItem = getSelectedSemanticReviewItem(
    queue,
    options.selectedItemId ?? defaultSemanticReviewPanelState.selectedItemId,
  );

  const mode =
    options.mode ??
    (queue.items.length === 0
      ? "empty"
      : selectedItem
        ? "selected_item"
        : "queue");

  const panelState: SemanticReviewPanelState = {
    mode,
    queue,
  };

  if (selectedItem) {
    panelState.selectedItemId = selectedItem.id;
  }

  if (options.message) {
    panelState.message = options.message;
  } else if (defaultSemanticReviewPanelState.message) {
    panelState.message = defaultSemanticReviewPanelState.message;
  }

  return panelState;
}

export function getSemanticReviewStateCopy(
  mode: SemanticReviewPanelMode,
): SemanticReviewEmptyState {
  if (mode === "loading") {
    return semanticReviewLoadingState;
  }

  if (mode === "error") {
    return semanticReviewErrorState;
  }

  if (mode === "no_rights") {
    return semanticReviewNoRightsState;
  }

  return semanticReviewEmptyState;
}

export function getSemanticReviewQueueProgressLabel(
  queue: SemanticReviewQueue,
): string {
  const needsAttention = queue.summary.highPriority + queue.summary.mediumPriority;

  if (queue.summary.total === 0) {
    return "No semantic items need review.";
  }

  return `${needsAttention} of ${queue.summary.total} semantic items need active review.`;
}

export function getSemanticReviewActionSafetyLabel(
  item: SemanticReviewItem,
): string {
  const localOnlyCount = item.actions.filter((action) => action.isLocalOnly).length;
  const disabledCount = item.actions.filter(
    (action) => action.availability === "disabled",
  ).length;

  return `${localOnlyCount} local-only actions, ${disabledCount} disabled preview actions.`;
}

export function hasSemanticReviewItems(queue: SemanticReviewQueue): boolean {
  return queue.items.length > 0;
}

export function countSemanticReviewItemsByResolver(
  items: ReadonlyArray<SemanticReviewItem>,
): Record<SemanticResolverStatus, number> {
  const initialCounts: Record<SemanticResolverStatus, number> = {
    new_concept_candidate: 0,
    local_match_candidate: 0,
    external_hint_only: 0,
    merge_candidate: 0,
    needs_clarification: 0,
    blocked_no_write_gate: 0,
  };

  return items.reduce<Record<SemanticResolverStatus, number>>(
    (counts, item) => {
      counts[item.resolverStatus] += 1;
      return counts;
    },
    initialCounts,
  );
}

export function getSemanticReviewDomains(
  items: ReadonlyArray<SemanticReviewItem>,
): SemanticReviewDomain[] {
  return Array.from(new Set(items.map((item) => item.domain))).sort();
}

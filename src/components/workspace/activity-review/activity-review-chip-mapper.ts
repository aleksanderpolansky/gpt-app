import type {
  ReviewChip,
  ReviewChipKind,
  ReviewChipStatus,
} from "./activity-review-types";

export const ACTIVITY_REVIEW_CHIP_MAPPER_CREATED =
  "ACTIVITY_REVIEW_CHIP_MAPPER_CREATED" as const;

export type ReviewChipTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "muted";

export interface ReviewChipViewModel {
  id: string;
  label: string;
  kind: ReviewChipKind;
  kindLabel: string;
  status: ReviewChipStatus;
  statusLabel: string;
  tone: ReviewChipTone;
  confidenceLabel: string;
  reason: string;
  sourceRule: string;
  ariaLabel: string;
}

export interface ReviewChipGroup {
  kind: ReviewChipKind;
  kindLabel: string;
  chips: ReviewChipViewModel[];
}

const CHIP_KIND_ORDER: ReviewChipKind[] = [
  "status",
  "domain",
  "context",
  "role",
  "privacy",
  "action",
  "unknown",
];

const CHIP_KIND_LABELS: Record<ReviewChipKind, string> = {
  action: "Действие",
  domain: "Домен",
  context: "Контекст",
  role: "Роль",
  privacy: "Приватность",
  status: "Статус",
  unknown: "Неизвестный термин",
};

const CHIP_STATUS_LABELS: Record<ReviewChipStatus, string> = {
  suggested: "Предложено",
  needs_review: "Требует проверки",
  candidate: "Кандидат",
};

function normalizeConfidence(confidence: number | undefined): number | undefined {
  if (confidence === undefined || !Number.isFinite(confidence)) {
    return undefined;
  }

  return Math.max(0, Math.min(1, confidence));
}

export function getReviewChipKindLabel(kind: ReviewChipKind): string {
  return CHIP_KIND_LABELS[kind];
}

export function getReviewChipStatusLabel(status: ReviewChipStatus): string {
  return CHIP_STATUS_LABELS[status];
}

export function getReviewChipTone(chip: ReviewChip): ReviewChipTone {
  if (chip.kind === "privacy") {
    return "warning";
  }

  if (chip.kind === "unknown") {
    return "danger";
  }

  if (chip.kind === "status") {
    return "muted";
  }

  if (chip.status === "needs_review") {
    return "warning";
  }

  if (chip.status === "suggested") {
    return "success";
  }

  if (chip.kind === "domain" || chip.kind === "context" || chip.kind === "role") {
    return "accent";
  }

  return "neutral";
}

export function getReviewChipConfidenceLabel(chip: ReviewChip): string {
  const confidence = normalizeConfidence(chip.confidence);

  if (confidence === undefined) {
    return "Уверенность не указана";
  }

  const percent = Math.round(confidence * 100);

  if (percent >= 80) {
    return `Высокая уверенность: ${percent}%`;
  }

  if (percent >= 55) {
    return `Средняя уверенность: ${percent}%`;
  }

  return `Низкая уверенность: ${percent}%`;
}

export function mapReviewChipToViewModel(chip: ReviewChip): ReviewChipViewModel {
  const kindLabel = getReviewChipKindLabel(chip.kind);
  const statusLabel = getReviewChipStatusLabel(chip.status);
  const confidenceLabel = getReviewChipConfidenceLabel(chip);

  return {
    id: chip.id,
    label: chip.label,
    kind: chip.kind,
    kindLabel,
    status: chip.status,
    statusLabel,
    tone: getReviewChipTone(chip),
    confidenceLabel,
    reason: chip.reason,
    sourceRule: chip.sourceRule,
    ariaLabel: `${kindLabel}: ${chip.label}. ${statusLabel}. ${confidenceLabel}.`,
  };
}

function getChipKindRank(kind: ReviewChipKind): number {
  const index = CHIP_KIND_ORDER.indexOf(kind);
  return index === -1 ? CHIP_KIND_ORDER.length : index;
}

export function sortReviewChips(chips: ReviewChip[]): ReviewChip[] {
  return [...chips].sort((firstChip, secondChip) => {
    const kindDifference =
      getChipKindRank(firstChip.kind) - getChipKindRank(secondChip.kind);

    if (kindDifference !== 0) {
      return kindDifference;
    }

    const firstConfidence = normalizeConfidence(firstChip.confidence) ?? 0;
    const secondConfidence = normalizeConfidence(secondChip.confidence) ?? 0;

    if (firstConfidence !== secondConfidence) {
      return secondConfidence - firstConfidence;
    }

    return firstChip.label.localeCompare(secondChip.label);
  });
}

export function mapReviewChipsToViewModels(
  chips: ReviewChip[],
): ReviewChipViewModel[] {
  return sortReviewChips(chips).map(mapReviewChipToViewModel);
}

export function groupReviewChipsByKind(chips: ReviewChip[]): ReviewChipGroup[] {
  const mappedChips = mapReviewChipsToViewModels(chips);

  return CHIP_KIND_ORDER.map((kind) => ({
    kind,
    kindLabel: getReviewChipKindLabel(kind),
    chips: mappedChips.filter((chip) => chip.kind === kind),
  })).filter((group) => group.chips.length > 0);
}

export function getReviewChipSummary(chips: ReviewChip[]): string {
  if (chips.length === 0) {
    return "Нет semantic chips.";
  }

  const needsReviewCount = chips.filter(
    (chip) => chip.status === "needs_review",
  ).length;

  const privacyCount = chips.filter((chip) => chip.kind === "privacy").length;
  const unknownCount = chips.filter((chip) => chip.kind === "unknown").length;

  if (needsReviewCount > 0 || privacyCount > 0 || unknownCount > 0) {
    return `Semantic chips: ${chips.length}. Требуют внимания: ${needsReviewCount}. Privacy: ${privacyCount}. Unknown: ${unknownCount}.`;
  }

  return `Semantic chips: ${chips.length}. Все chips выглядят как локальные кандидаты без критических предупреждений.`;
}

export function limitReviewChipViewModels(
  chips: ReviewChipViewModel[],
  maxVisibleChips: number,
): ReviewChipViewModel[] {
  if (maxVisibleChips <= 0) {
    return [];
  }

  return chips.slice(0, maxVisibleChips);
}

export function countHiddenReviewChips(
  chips: ReviewChipViewModel[],
  maxVisibleChips: number,
): number {
  if (maxVisibleChips <= 0) {
    return chips.length;
  }

  return Math.max(0, chips.length - maxVisibleChips);
}

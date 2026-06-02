import type { LinkedValueObjectCandidate } from "./activity-review-types";

export const LINKED_VALUE_OBJECTS_SECTION_CREATED =
  "LINKED_VALUE_OBJECTS_SECTION_CREATED" as const;

type LinkedValueObjectTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "muted";

interface LinkedValueObjectsSectionProps {
  candidates: LinkedValueObjectCandidate[];
  title?: string;
  description?: string;
  maxVisibleCandidates?: number;
  className?: string;
}

interface LinkedValueObjectCardProps {
  candidate: LinkedValueObjectViewModel;
}

interface LinkedValueObjectViewModel {
  id: string;
  label: string;
  domainLabel: string;
  relevancePercent: number;
  relevanceLabel: string;
  statusLabel: string;
  tone: LinkedValueObjectTone;
  reason: string;
  ariaLabel: string;
}

interface LinkedValueObjectsSummary {
  totalCount: number;
  suggestedCount: number;
  needsReviewCount: number;
  highRelevanceCount: number;
  hasCandidates: boolean;
  hasNeedsReviewCandidates: boolean;
  summaryText: string;
}

const VALUE_OBJECT_TONE_CLASS_NAMES: Record<LinkedValueObjectTone, string> = {
  neutral:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200",
  accent:
    "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-200",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  danger:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200",
  muted:
    "border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400",
};

function clampRelevance(relevance: number): number {
  if (!Number.isFinite(relevance)) {
    return 0;
  }

  return Math.max(0, Math.min(1, relevance));
}

function getValueObjectToneClassName(tone: LinkedValueObjectTone): string {
  return VALUE_OBJECT_TONE_CLASS_NAMES[tone];
}

function getValueObjectStatusLabel(
  status: LinkedValueObjectCandidate["status"],
): string {
  if (status === "suggested") {
    return "Suggested";
  }

  if (status === "needs_review") {
    return "Needs review";
  }

  return "Candidate";
}

function isNeedsReviewValueObjectCandidate(
  candidate: LinkedValueObjectCandidate,
): boolean {
  return candidate.status === "needs_review";
}

function isSuggestedValueObjectCandidate(
  candidate: LinkedValueObjectCandidate,
): boolean {
  return candidate.status === "suggested";
}

function getValueObjectTone(
  candidate: LinkedValueObjectCandidate,
): LinkedValueObjectTone {
  if (isNeedsReviewValueObjectCandidate(candidate)) {
    return "warning";
  }

  if (candidate.relevance >= 0.8) {
    return "success";
  }

  if (candidate.relevance >= 0.55) {
    return "accent";
  }

  return "neutral";
}

function getValueObjectRelevanceLabel(relevance: number): string {
  const normalizedRelevance = clampRelevance(relevance);
  const percent = Math.round(normalizedRelevance * 100);

  if (percent >= 80) {
    return `High relevance: ${percent}%`;
  }

  if (percent >= 55) {
    return `Medium relevance: ${percent}%`;
  }

  return `Low relevance: ${percent}%`;
}

function mapLinkedValueObjectToViewModel(
  candidate: LinkedValueObjectCandidate,
): LinkedValueObjectViewModel {
  const relevancePercent = Math.round(clampRelevance(candidate.relevance) * 100);
  const statusLabel = getValueObjectStatusLabel(candidate.status);
  const relevanceLabel = getValueObjectRelevanceLabel(candidate.relevance);
  const tone = getValueObjectTone(candidate);

  return {
    id: candidate.id,
    label: candidate.label,
    domainLabel: candidate.domainLabel,
    relevancePercent,
    relevanceLabel,
    statusLabel,
    tone,
    reason: candidate.reason,
    ariaLabel: `${candidate.label}. ${candidate.domainLabel}. ${statusLabel}. ${relevanceLabel}.`,
  };
}

function sortLinkedValueObjectCandidates(
  candidates: LinkedValueObjectCandidate[],
): LinkedValueObjectCandidate[] {
  return [...candidates].sort((firstCandidate, secondCandidate) => {
    const statusDifference =
      Number(isNeedsReviewValueObjectCandidate(firstCandidate)) -
      Number(isNeedsReviewValueObjectCandidate(secondCandidate));

    if (statusDifference !== 0) {
      return statusDifference;
    }

    if (firstCandidate.relevance !== secondCandidate.relevance) {
      return secondCandidate.relevance - firstCandidate.relevance;
    }

    return firstCandidate.label.localeCompare(secondCandidate.label);
  });
}

function mapLinkedValueObjectsToViewModels(
  candidates: LinkedValueObjectCandidate[],
): LinkedValueObjectViewModel[] {
  return sortLinkedValueObjectCandidates(candidates).map(
    mapLinkedValueObjectToViewModel,
  );
}

function summarizeLinkedValueObjects(
  candidates: LinkedValueObjectCandidate[],
): LinkedValueObjectsSummary {
  const suggestedCount = candidates.filter(
    isSuggestedValueObjectCandidate,
  ).length;

  const needsReviewCount = candidates.filter(
    isNeedsReviewValueObjectCandidate,
  ).length;

  const highRelevanceCount = candidates.filter(
    (candidate) => candidate.relevance >= 0.8,
  ).length;

  const hasCandidates = candidates.length > 0;
  const hasNeedsReviewCandidates = needsReviewCount > 0;

  const summaryText = hasCandidates
    ? `Value Object candidates: ${candidates.length}. Suggested: ${suggestedCount}. Needs review: ${needsReviewCount}. High relevance: ${highRelevanceCount}.`
    : "Value Object candidates are not available yet.";

  return {
    totalCount: candidates.length,
    suggestedCount,
    needsReviewCount,
    highRelevanceCount,
    hasCandidates,
    hasNeedsReviewCandidates,
    summaryText,
  };
}

function getVisibleLinkedValueObjects(
  candidates: LinkedValueObjectViewModel[],
  maxVisibleCandidates: number | undefined,
): LinkedValueObjectViewModel[] {
  if (maxVisibleCandidates === undefined) {
    return candidates;
  }

  if (maxVisibleCandidates <= 0) {
    return [];
  }

  return candidates.slice(0, maxVisibleCandidates);
}

function countHiddenLinkedValueObjects(
  candidates: LinkedValueObjectViewModel[],
  maxVisibleCandidates: number | undefined,
): number {
  if (maxVisibleCandidates === undefined) {
    return 0;
  }

  if (maxVisibleCandidates <= 0) {
    return candidates.length;
  }

  return Math.max(0, candidates.length - maxVisibleCandidates);
}

function buildLinkedValueObjectsAriaSummary(
  candidates: LinkedValueObjectViewModel[],
  hiddenCount: number,
): string {
  const visibleCount = candidates.length;

  if (visibleCount === 0 && hiddenCount === 0) {
    return "Linked Value Object candidates are not available for this local review package.";
  }

  if (hiddenCount > 0) {
    return `Linked Value Object candidates visible: ${visibleCount}. Hidden candidates: ${hiddenCount}.`;
  }

  return `Linked Value Object candidates visible: ${visibleCount}.`;
}

function LinkedValueObjectCard({ candidate }: LinkedValueObjectCardProps) {
  return (
    <li
      className={[
        "rounded-2xl border px-4 py-3",
        getValueObjectToneClassName(candidate.tone),
      ].join(" ")}
      aria-label={candidate.ariaLabel}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-75">
            {candidate.domainLabel}
          </p>
          <p className="mt-2 text-sm font-semibold leading-6">
            {candidate.label}
          </p>
          <p className="mt-2 text-xs leading-5 opacity-80">
            {candidate.reason}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {candidate.statusLabel}
          </span>
          <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {candidate.relevancePercent}%
          </span>
        </div>
      </div>
    </li>
  );
}

export function LinkedValueObjectsSection({
  candidates,
  title = "Linked Value Object candidates",
  description = "Эта секция показывает локальные кандидаты Value Objects, которые parser связал с активностью. Это не создание объектов и не merge.",
  maxVisibleCandidates,
  className,
}: LinkedValueObjectsSectionProps) {
  const mappedCandidates = mapLinkedValueObjectsToViewModels(candidates);
  const visibleCandidates = getVisibleLinkedValueObjects(
    mappedCandidates,
    maxVisibleCandidates,
  );
  const hiddenCount = countHiddenLinkedValueObjects(
    mappedCandidates,
    maxVisibleCandidates,
  );
  const summary = summarizeLinkedValueObjects(candidates);
  const ariaSummary = buildLinkedValueObjectsAriaSummary(
    visibleCandidates,
    hiddenCount,
  );

  return (
    <section
      className={[
        "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm",
        "dark:border-slate-800 dark:bg-slate-950",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby="linked-value-objects-section-title"
      aria-describedby="linked-value-objects-section-summary"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Value Object review
          </p>
          <h2
            id="linked-value-objects-section-title"
            className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50"
          >
            {title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {description}
          </p>
        </div>

        <span className="inline-flex shrink-0 items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-200">
          {mappedCandidates.length} candidates
        </span>
      </div>

      <p
        id="linked-value-objects-section-summary"
        className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
      >
        {summary.summaryText}
      </p>

      {summary.hasNeedsReviewCandidates ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <strong className="font-semibold">Needs review:</strong>{" "}
          one or more Value Object candidates should be checked before future
          semantic merge or write gate.
        </div>
      ) : null}

      <div className="mt-4" aria-label={ariaSummary}>
        {visibleCandidates.length > 0 ? (
          <ul className="grid gap-3">
            {visibleCandidates.map((candidate) => (
              <LinkedValueObjectCard
                key={candidate.id}
                candidate={candidate}
              />
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Linked Value Object candidates are not available yet.
          </div>
        )}
      </div>

      {hiddenCount > 0 ? (
        <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
          +{hiddenCount} hidden Value Object candidates in this local-only review
          preview.
        </p>
      ) : null}

      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:text-slate-300">
        <strong className="font-semibold text-slate-900 dark:text-slate-100">
          Candidate note:
        </strong>{" "}
        Value Object links are explanatory candidates only. This component does
        not create Value Objects, does not perform merge and does not perform DB write.
      </div>
    </section>
  );
}

import type { ReviewChip } from "./activity-review-types";
import {
  countHiddenReviewChips,
  getReviewChipSummary,
  limitReviewChipViewModels,
  mapReviewChipsToViewModels,
} from "./activity-review-chip-mapper";
import type {
  ReviewChipTone,
  ReviewChipViewModel,
} from "./activity-review-chip-mapper";

export const SEMANTIC_CHIPS_SECTION_CREATED =
  "SEMANTIC_CHIPS_SECTION_CREATED" as const;

interface SemanticChipsSectionProps {
  chips: ReviewChip[];
  title?: string;
  description?: string;
  maxVisibleChips?: number;
  className?: string;
}

interface SemanticChipPillProps {
  chip: ReviewChipViewModel;
}

const CHIP_TONE_CLASS_NAMES: Record<ReviewChipTone, string> = {
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

function getChipToneClassName(tone: ReviewChipTone): string {
  return CHIP_TONE_CLASS_NAMES[tone];
}

function buildSemanticChipsAriaSummary(
  chips: ReviewChipViewModel[],
  hiddenCount: number,
): string {
  const visibleCount = chips.length;

  if (visibleCount === 0 && hiddenCount === 0) {
    return "Semantic chips are not available for this local review package.";
  }

  if (hiddenCount > 0) {
    return `Semantic chips visible: ${visibleCount}. Hidden chips: ${hiddenCount}.`;
  }

  return `Semantic chips visible: ${visibleCount}.`;
}

function SemanticChipPill({ chip }: SemanticChipPillProps) {
  return (
    <li>
      <span
        className={[
          "inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
          getChipToneClassName(chip.tone),
        ].join(" ")}
        aria-label={chip.ariaLabel}
        title={`${chip.reason} Source rule: ${chip.sourceRule}`}
      >
        <span className="truncate">{chip.label}</span>
        <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-900 dark:text-slate-300">
          {chip.kindLabel}
        </span>
      </span>
    </li>
  );
}

export function SemanticChipsSection({
  chips,
  title = "Semantic chips",
  description = "Локальные semantic chips объясняют, какие смыслы parser увидел в активности. Это candidates, not truth.",
  maxVisibleChips,
  className,
}: SemanticChipsSectionProps) {
  const mappedChips = mapReviewChipsToViewModels(chips);
  const visibleChips =
    maxVisibleChips === undefined
      ? mappedChips
      : limitReviewChipViewModels(mappedChips, maxVisibleChips);
  const hiddenCount =
    maxVisibleChips === undefined
      ? 0
      : countHiddenReviewChips(mappedChips, maxVisibleChips);
  const summary = getReviewChipSummary(chips);
  const ariaSummary = buildSemanticChipsAriaSummary(
    visibleChips,
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
      aria-labelledby="semantic-chips-section-title"
      aria-describedby="semantic-chips-section-summary"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Semantic review
          </p>
          <h2
            id="semantic-chips-section-title"
            className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50"
          >
            {title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {description}
          </p>
        </div>

        <span className="inline-flex shrink-0 items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-200">
          {mappedChips.length} chips
        </span>
      </div>

      <p
        id="semantic-chips-section-summary"
        className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
      >
        {summary}
      </p>

      <div className="mt-4" aria-label={ariaSummary}>
        {visibleChips.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {visibleChips.map((chip) => (
              <SemanticChipPill key={chip.id} chip={chip} />
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Semantic chips are not available yet.
          </div>
        )}
      </div>

      {hiddenCount > 0 ? (
        <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
          +{hiddenCount} hidden chips in this local-only review preview.
        </p>
      ) : null}

      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:text-slate-300">
        <strong className="font-semibold text-slate-900 dark:text-slate-100">
          Candidate note:
        </strong>{" "}
        semantic chips are explanatory candidates only. This component does not
        create Value Objects, does not confirm truth and does not perform DB write.
      </div>

      <div
        className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-xs leading-5 text-slate-600 break-words dark:border-slate-700 dark:text-slate-300"
        data-ui5-mobile-390-boundary="semantic-chips"
      >
        <strong className="font-semibold text-slate-900 dark:text-slate-100">
          Mobile boundary:
        </strong>{" "}
        semantic chips can wrap on 390px mobile width. This section does not
        create Activity Event and does not perform DB write.
      </div></section>
  );
}

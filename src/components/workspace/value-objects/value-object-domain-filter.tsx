"use client";

import type {
  ValueObjectDomain,
  ValueObjectDomainGroup,
  ValueObjectFilterState,
  ValueObjectSignalTone,
} from "./value-object-types";

export interface ValueObjectDomainFilterProps {
  readonly domainGroups: readonly ValueObjectDomainGroup[];
  readonly filterState: ValueObjectFilterState;
  readonly totalCount: number;
  readonly visibleCount: number;
  readonly onDomainToggle: (domain: ValueObjectDomain) => void;
  readonly onReviewToggle: () => void;
  readonly onResetFilters: () => void;
}

const PANEL_CLASSES =
  "rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur";

const HEADER_LABEL_CLASSES =
  "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";

const HEADER_TITLE_CLASSES =
  "text-lg font-semibold tracking-tight text-slate-950";

const HEADER_TEXT_CLASSES = "text-sm leading-6 text-slate-600";

const DOMAIN_BUTTON_CLASSES =
  "group inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition";

const DOMAIN_COUNT_CLASSES =
  "rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold shadow-sm";

const REVIEW_BUTTON_BASE_CLASSES =
  "inline-flex items-center justify-center rounded-2xl border px-3 py-2 text-sm font-semibold transition";

const RESET_BUTTON_CLASSES =
  "inline-flex items-center justify-center rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

const TONE_SELECTED_CLASS_NAMES: Record<ValueObjectSignalTone, string> = {
  slate: "border-slate-300 bg-slate-100 text-slate-800",
  indigo: "border-indigo-200 bg-indigo-50 text-indigo-800",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
  violet: "border-violet-200 bg-violet-50 text-violet-800",
  amber: "border-amber-200 bg-amber-50 text-amber-900",
  rose: "border-rose-200 bg-rose-50 text-rose-800",
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-800",
};

const TONE_DOT_CLASS_NAMES: Record<ValueObjectSignalTone, string> = {
  slate: "bg-slate-400",
  indigo: "bg-indigo-500",
  emerald: "bg-emerald-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  cyan: "bg-cyan-500",
};

const UNSELECTED_DOMAIN_CLASSES =
  "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50";

const REVIEW_ACTIVE_CLASSES = "border-amber-200 bg-amber-50 text-amber-900";

const REVIEW_INACTIVE_CLASSES =
  "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50";

const getDomainObjectCountLabel = (count: number): string =>
  count === 1 ? "1 object" : `${count} objects`;

const getSelectedDomainCountLabel = (count: number): string =>
  count === 1 ? "1 domain selected" : `${count} domains selected`;

const getDomainButtonClassName = (
  domainGroup: ValueObjectDomainGroup,
  isSelected: boolean,
): string =>
  [
    DOMAIN_BUTTON_CLASSES,
    isSelected
      ? TONE_SELECTED_CLASS_NAMES[domainGroup.tone]
      : UNSELECTED_DOMAIN_CLASSES,
  ]
    .filter(Boolean)
    .join(" ");

export function ValueObjectDomainFilter({
  domainGroups,
  filterState,
  totalCount,
  visibleCount,
  onDomainToggle,
  onReviewToggle,
  onResetFilters,
}: ValueObjectDomainFilterProps) {
  const selectedDomainCount = filterState.selectedDomains.length;
  const isReviewModeActive = filterState.showOnlyNeedsReview;
  const hasAnyFilter =
    selectedDomainCount > 0 ||
    isReviewModeActive ||
    filterState.searchQuery.trim().length > 0 ||
    filterState.selectedPrivacyLevels.length > 0 ||
    filterState.selectedStatuses.length > 0;

  return (
    <section className={PANEL_CLASSES} aria-label="Value Object domain filters">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <p className={HEADER_LABEL_CLASSES}>Value Objects</p>
            <h2 className={HEADER_TITLE_CLASSES}>Domain filter</h2>
            <p className={HEADER_TEXT_CLASSES}>
              Fixture-first filter for the read-only Value Object tree, cloud,
              and list views.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
              Visible
            </p>
            <p className="text-lg font-semibold text-slate-950">
              {visibleCount} / {totalCount}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {domainGroups.map((domainGroup) => {
            const isSelected = filterState.selectedDomains.includes(
              domainGroup.domain,
            );

            return (
              <button
                key={domainGroup.domain}
                type="button"
                aria-pressed={isSelected}
                className={getDomainButtonClassName(domainGroup, isSelected)}
                onClick={() => onDomainToggle(domainGroup.domain)}
              >
                <span
                  className={[
                    "h-2.5 w-2.5 rounded-full",
                    TONE_DOT_CLASS_NAMES[domainGroup.tone],
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-hidden="true"
                />
                <span>{domainGroup.label}</span>
                <span className={DOMAIN_COUNT_CLASSES}>
                  {getDomainObjectCountLabel(domainGroup.objectIds.length)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-slate-600">
            {selectedDomainCount > 0
              ? getSelectedDomainCountLabel(selectedDomainCount)
              : "All domains are visible."}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={isReviewModeActive}
              className={[
                REVIEW_BUTTON_BASE_CLASSES,
                isReviewModeActive
                  ? REVIEW_ACTIVE_CLASSES
                  : REVIEW_INACTIVE_CLASSES,
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={onReviewToggle}
            >
              Review signals only
            </button>

            <button
              type="button"
              className={RESET_BUTTON_CLASSES}
              onClick={onResetFilters}
              disabled={!hasAnyFilter}
            >
              Reset filters
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

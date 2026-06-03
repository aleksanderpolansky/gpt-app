"use client";

import type { ValueObjectSignalTone } from "./value-object-types";

export const VALUE_OBJECT_VIEW_MODES = ["list", "tree", "cloud"] as const;

export type ValueObjectViewMode = (typeof VALUE_OBJECT_VIEW_MODES)[number];

export interface ValueObjectViewSwitcherProps {
  readonly activeView: ValueObjectViewMode;
  readonly visibleCount: number;
  readonly totalCount: number;
  readonly onViewChange: (viewMode: ValueObjectViewMode) => void;
}

interface ValueObjectViewModeConfig {
  readonly id: ValueObjectViewMode;
  readonly label: string;
  readonly description: string;
  readonly tone: ValueObjectSignalTone;
}

const VIEW_MODE_CONFIGS: readonly ValueObjectViewModeConfig[] = [
  {
    id: "list",
    label: "List",
    description: "Card-based inspection of fixture Value Objects.",
    tone: "indigo",
  },
  {
    id: "tree",
    label: "Tree",
    description: "Hierarchy preview without treating grouping as ontology truth.",
    tone: "violet",
  },
  {
    id: "cloud",
    label: "Cloud",
    description: "Density preview using UI-only size and tone signals.",
    tone: "cyan",
  },
];

const SWITCHER_CLASSES =
  "rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur";

const HEADER_LABEL_CLASSES =
  "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";

const HEADER_TITLE_CLASSES =
  "text-lg font-semibold tracking-tight text-slate-950";

const HEADER_TEXT_CLASSES = "text-sm leading-6 text-slate-600";

const BUTTON_BASE_CLASSES =
  "group flex min-w-0 flex-1 flex-col items-start gap-1 rounded-2xl border px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm";

const SELECTED_RING_CLASSES = "ring-2 ring-indigo-100";

const TONE_SELECTED_CLASS_NAMES: Record<ValueObjectSignalTone, string> = {
  slate: "border-slate-300 bg-slate-100 text-slate-900",
  indigo: "border-indigo-200 bg-indigo-50 text-indigo-900",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
  violet: "border-violet-200 bg-violet-50 text-violet-900",
  amber: "border-amber-200 bg-amber-50 text-amber-950",
  rose: "border-rose-200 bg-rose-50 text-rose-900",
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-900",
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

const UNSELECTED_BUTTON_CLASSES =
  "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50";

const getVisibleCountLabel = (visibleCount: number, totalCount: number): string =>
  `${visibleCount} / ${totalCount} visible`;

const getButtonClassName = (
  config: ValueObjectViewModeConfig,
  isSelected: boolean,
): string =>
  [
    BUTTON_BASE_CLASSES,
    isSelected
      ? TONE_SELECTED_CLASS_NAMES[config.tone]
      : UNSELECTED_BUTTON_CLASSES,
    isSelected ? SELECTED_RING_CLASSES : "",
  ]
    .filter(Boolean)
    .join(" ");

export function ValueObjectViewSwitcher({
  activeView,
  visibleCount,
  totalCount,
  onViewChange,
}: ValueObjectViewSwitcherProps) {
  return (
    <section className={SWITCHER_CLASSES} aria-label="Value Object view switcher">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <p className={HEADER_LABEL_CLASSES}>View mode</p>
            <h2 className={HEADER_TITLE_CLASSES}>List, tree, or cloud</h2>
            <p className={HEADER_TEXT_CLASSES}>
              Switch between read-only fixture views without changing stored
              Value Object data.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
              Filtered
            </p>
            <p className="text-lg font-semibold text-slate-950">
              {getVisibleCountLabel(visibleCount, totalCount)}
            </p>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-3" role="tablist" aria-label="Value Object display modes">
          {VIEW_MODE_CONFIGS.map((config) => {
            const isSelected = activeView === config.id;

            return (
              <button
                key={config.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={getButtonClassName(config, isSelected)}
                onClick={() => onViewChange(config.id)}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={[
                      "h-2.5 w-2.5 rounded-full",
                      TONE_DOT_CLASS_NAMES[config.tone],
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-semibold">{config.label}</span>
                </span>

                <span className="text-xs leading-5 text-slate-600">
                  {config.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

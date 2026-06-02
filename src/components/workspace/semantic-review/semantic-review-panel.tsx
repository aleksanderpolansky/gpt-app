import { NeedsReviewQueue } from "./needs-review-queue";
import {
  SemanticReviewBlockedState,
  SemanticReviewEmptyState,
  SemanticReviewErrorState,
  SemanticReviewLoadingState,
  SemanticReviewNoRightsState,
} from "./semantic-review-states";

import type { SemanticReviewQueue } from "./semantic-review-types";

export const SEMANTIC_REVIEW_PANEL_CREATED = true as const;

export type SemanticReviewPanelMode =
  | "queue"
  | "loading"
  | "empty"
  | "error"
  | "no_rights"
  | "blocked";

export interface SemanticReviewPanelProps {
  queue?: SemanticReviewQueue;
  selectedItemId?: string;
  mode?: SemanticReviewPanelMode;
  compact?: boolean;
  title?: string;
  description?: string;
}

const semanticReviewPanelSafetyStatements = [
  "Semantic Review panel is fixture-only and local UI only.",
  "No category, Value Object, Activity Event, state fact, points, commercial record, or ontology record is created.",
  "AI output is a candidate, not truth.",
  "External concept remains a hint, not an internal category.",
  "Confirm, reject, merge, and ask-later actions stay disabled or preview-only until a separate feedback gate exists.",
] as const;

function getModeLabel(mode: SemanticReviewPanelMode): string {
  return mode.replaceAll("_", " ");
}

function getModeClasses(mode: SemanticReviewPanelMode): string {
  if (mode === "queue") {
    return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300";
  }

  if (mode === "loading") {
    return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300";
  }

  if (mode === "empty") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
  }

  if (mode === "no_rights") {
    return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300";
  }

  if (mode === "blocked") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";
  }

  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";
}

function PanelStatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "indigo" | "violet" | "emerald" | "amber";
}) {
  const toneClasses = {
    slate:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200",
    indigo:
      "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200",
    violet:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200",
    emerald:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200",
    amber:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200",
  } satisfies Record<string, string>;

  return (
    <div className={`rounded-2xl border p-3 ${toneClasses[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function PanelModeContent({
  mode,
  queue,
  selectedItemId,
  compact,
}: {
  mode: SemanticReviewPanelMode;
  queue?: SemanticReviewQueue;
  selectedItemId?: string;
  compact: boolean;
}) {
  if (mode === "loading") {
    return <SemanticReviewLoadingState compact={compact} />;
  }

  if (mode === "empty") {
    return <SemanticReviewEmptyState compact={compact} />;
  }

  if (mode === "error") {
    return <SemanticReviewErrorState compact={compact} />;
  }

  if (mode === "no_rights") {
    return <SemanticReviewNoRightsState compact={compact} />;
  }

  if (mode === "blocked") {
    return <SemanticReviewBlockedState compact={compact} />;
  }

  if (!queue) {
    return (
      <SemanticReviewEmptyState
        compact={compact}
        title="No queue fixture is attached"
        description="The panel can render safely without queue data. It still does not create or write records."
      />
    );
  }

  return (
    <NeedsReviewQueue
      queue={queue}
      selectedItemId={selectedItemId}
      compact={compact}
    />
  );
}

export function SemanticReviewPanel({
  queue,
  selectedItemId,
  mode = queue ? "queue" : "empty",
  compact = false,
  title = "Semantic Review",
  description = "Review AI semantic candidates before any future feedback or write gate exists.",
}: SemanticReviewPanelProps) {
  const totalItems = queue?.summary.total ?? 0;
  const highPriorityItems = queue?.summary.highPriority ?? 0;
  const blockedItems = queue?.summary.blocked ?? 0;
  const localOnlyItems = queue?.summary.localOnly ?? 0;

  return (
    <section className="space-y-5 rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              UI-6 · Needs Review · Semantic layer
            </p>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">
                {title}
              </h1>
              <p className="max-w-4xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                {description}
              </p>
            </div>
          </div>

          <span
            className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${getModeClasses(mode)}`}
          >
            {getModeLabel(mode)}
          </span>
        </div>

        {!compact ? (
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <PanelStatCard label="Total" value={totalItems} tone="slate" />
            <PanelStatCard label="High priority" value={highPriorityItems} tone="amber" />
            <PanelStatCard label="Local only" value={localOnlyItems} tone="emerald" />
            <PanelStatCard label="Blocked" value={blockedItems} tone="violet" />
          </div>
        ) : null}

        <div className="mt-5 space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          {semanticReviewPanelSafetyStatements.map((statement) => (
            <p key={statement}>{statement}</p>
          ))}
        </div>
      </div>

      <PanelModeContent
        mode={mode}
        queue={queue}
        selectedItemId={selectedItemId}
        compact={compact}
      />
    </section>
  );
}

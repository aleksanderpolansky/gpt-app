import { CategoryResolutionCard } from "./category-resolution-card";
import { ExternalConceptHintCard } from "./external-concept-hint-card";
import { LocalMatchesList } from "./local-matches-list";
import { MergeDialog } from "./merge-dialog";
import { NewConceptCard } from "./new-concept-card";
import { ReviewActionBar } from "./review-action-bar";
import {
  getSelectedSemanticReviewItem,
  getSemanticReviewActionSafetyLabel,
  getSemanticReviewQueueProgressLabel,
} from "./semantic-review-normalizer";

import type {
  SemanticReviewItem,
  SemanticReviewPriority,
  SemanticReviewQueue,
  SemanticReviewStatus,
} from "./semantic-review-types";

export const NEEDS_REVIEW_QUEUE_CREATED = true as const;

export interface NeedsReviewQueueProps {
  queue: SemanticReviewQueue;
  selectedItemId?: string;
  compact?: boolean;
}

function getPriorityClasses(priority: SemanticReviewPriority): string {
  if (priority === "high") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";
  }

  if (priority === "medium") {
    return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300";
  }

  return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300";
}

function getStatusClasses(status: SemanticReviewStatus): string {
  if (status === "needs_review") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";
  }

  if (status === "candidate") {
    return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300";
  }

  if (status === "local_only" || status === "resolved_preview") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
  }

  return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300";
}

function formatStatusLabel(status: SemanticReviewStatus): string {
  return status.replaceAll("_", " ");
}

function QueueSummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "indigo" | "emerald" | "amber";
}) {
  const toneClasses = {
    slate:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200",
    indigo:
      "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200",
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

function QueueItemCard({
  item,
  selected,
}: {
  item: SemanticReviewItem;
  selected: boolean;
}) {
  const selectedClasses = selected
    ? "border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/40"
    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950";

  return (
    <article className={`space-y-3 rounded-2xl border p-4 shadow-sm ${selectedClasses}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-950 dark:text-slate-50">
            {item.title}
          </h3>
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            {item.subtitle}
          </p>
        </div>

        <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          {item.domain}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <span
          className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${getPriorityClasses(item.priority)}`}
        >
          {item.priority} priority
        </span>
        <span
          className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${getStatusClasses(item.status)}`}
        >
          {formatStatusLabel(item.status)}
        </span>
      </div>

      <p className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        {getSemanticReviewActionSafetyLabel(item)}
      </p>
    </article>
  );
}

function SelectedItemReview({
  item,
  compact,
}: {
  item: SemanticReviewItem;
  compact: boolean;
}) {
  return (
    <div className="space-y-4">
      <NewConceptCard item={item} compact={compact} />
      <CategoryResolutionCard item={item} compact={compact} />
      <LocalMatchesList matches={item.localMatches} compact={compact} />
      <ExternalConceptHintCard hints={item.externalHints} compact={compact} />
      <MergeDialog item={item} compact={compact} />
      <ReviewActionBar item={item} compact={compact} />
    </div>
  );
}

export function NeedsReviewQueue({
  queue,
  selectedItemId,
  compact = false,
}: NeedsReviewQueueProps) {
  const selectedItem = getSelectedSemanticReviewItem(queue, selectedItemId);
  const progressLabel = getSemanticReviewQueueProgressLabel(queue);

  if (!selectedItem) {
    return (
      <section
        aria-labelledby="needs-review-queue-empty"
        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
          Needs review queue
        </p>
        <h2
          id="needs-review-queue-empty"
          className="mt-2 text-xl font-semibold text-slate-950 dark:text-slate-50"
        >
          No semantic items need review
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Empty state is local UI only. It does not create categories, Value Objects,
          Activity Events, state facts, points, commercial records, or ontology records.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby={`needs-review-queue-${queue.id}`}
      className="space-y-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Semantic review queue · fixture-only
          </p>
          <div className="space-y-1">
            <h2
              id={`needs-review-queue-${queue.id}`}
              className="text-xl font-semibold text-slate-950 dark:text-slate-50"
            >
              {queue.title}
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              {queue.description}
            </p>
          </div>
        </div>

        <span className="inline-flex w-fit items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300">
          {queue.summary.total} items
        </span>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        {progressLabel} AI output is a candidate, not truth. Queue selection is a static
        preview and cannot write records.
      </div>

      {!compact ? (
        <div className="grid gap-3 md:grid-cols-4">
          <QueueSummaryCard label="High" value={queue.summary.highPriority} tone="amber" />
          <QueueSummaryCard label="Medium" value={queue.summary.mediumPriority} tone="indigo" />
          <QueueSummaryCard label="Local only" value={queue.summary.localOnly} tone="emerald" />
          <QueueSummaryCard label="Blocked" value={queue.summary.blocked} tone="slate" />
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
        <aside className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <p className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Review items
          </p>

          <div className="space-y-3">
            {queue.items.map((item) => (
              <QueueItemCard
                key={item.id}
                item={item}
                selected={item.id === selectedItem.id}
              />
            ))}
          </div>
        </aside>

        <div className="min-w-0">
          <SelectedItemReview item={selectedItem} compact={compact} />
        </div>
      </div>

      <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
        <p>Needs Review queue is fixture-only and local UI only.</p>
        <p>No category, Value Object, Activity Event, state fact, points, commercial record, or ontology record is created.</p>
        <p>External concept remains a hint, not an internal category.</p>
        <p>Merge and confirm actions stay disabled or preview-only until a separate feedback gate exists.</p>
      </div>
    </section>
  );
}

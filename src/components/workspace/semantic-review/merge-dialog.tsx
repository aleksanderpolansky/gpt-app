import {
  buildSemanticReviewActionPolicy,
  getSemanticReviewActionPolicyReason,
} from "./semantic-review-action-policy";

import type {
  SemanticLocalMatch,
  SemanticReviewItem,
} from "./semantic-review-types";

export const MERGE_DIALOG_SHELL_CREATED = true as const;

export interface MergeDialogProps {
  item: SemanticReviewItem;
  open?: boolean;
  compact?: boolean;
  title?: string;
  description?: string;
}

const mergeDialogSafetyStatements = [
  "Merge is disabled preview only.",
  "Merge stays disabled until a separate feedback gate exists.",
  "No category, Value Object, Activity Event, state fact, points, commercial record, or ontology record is created.",
  "Candidate, not truth.",
  "The dialog shell shows possible relationships but cannot apply them.",
] as const;

function formatMatchPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function getMatchStatusClasses(match: SemanticLocalMatch): string {
  if (match.alreadyExists && match.currentStatus === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
  }

  if (match.currentStatus === "draft") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";
  }

  return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300";
}

function getMergeCandidateTitle(item: SemanticReviewItem): string {
  if (item.newConcept?.suggestedLabel) {
    return item.newConcept.suggestedLabel;
  }

  if (item.highlightedTerm) {
    return item.highlightedTerm;
  }

  return item.title;
}

function MergeCandidatePanel({ item }: { item: SemanticReviewItem }) {
  return (
    <div className="space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/40">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">
        Candidate source
      </p>
      <h3 className="text-base font-semibold text-indigo-950 dark:text-indigo-100">
        {getMergeCandidateTitle(item)}
      </h3>
      <p className="text-sm leading-6 text-indigo-800 dark:text-indigo-200">
        {item.rawText}
      </p>
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950 dark:text-indigo-300">
          {item.resolverStatus.replaceAll("_", " ")}
        </span>
        <span className="inline-flex rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950 dark:text-indigo-300">
          {item.domain}
        </span>
      </div>
    </div>
  );
}

function LocalMergeTargetPanel({ match }: { match: SemanticLocalMatch }) {
  return (
    <article className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">
            {match.label}
          </h3>
          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
            {match.reason}
          </p>
        </div>

        <span
          className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${getMatchStatusClasses(match)}`}
        >
          {match.alreadyExists ? "Existing local item" : "Draft local item"}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Kind
          </p>
          <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            {match.kind.replaceAll("_", " ")}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Similarity
          </p>
          <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            {formatMatchPercent(match.similarity)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Relevance
          </p>
          <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            {formatMatchPercent(match.relevance)}
          </p>
        </div>
      </div>
    </article>
  );
}

export function MergeDialog({
  item,
  open = true,
  compact = false,
  title = "Merge preview",
  description = "Possible merge relationships are visible, but applying merge is blocked in UI-6.",
}: MergeDialogProps) {
  const mergeAction = item.actions.find((action) => action.kind === "merge_later");
  const policy = buildSemanticReviewActionPolicy({
    item,
    requestedActionKind: "merge_later",
    mode: "blocked_until_feedback_gate",
  });

  if (!open) {
    return null;
  }

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby={`merge-dialog-${item.id}`}
      className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Merge dialog shell · disabled preview
          </p>
          <div className="space-y-1">
            <h2
              id={`merge-dialog-${item.id}`}
              className="text-xl font-semibold text-slate-950 dark:text-slate-50"
            >
              {title}
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>
        </div>

        <span className="inline-flex w-fit items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300">
          {policy.policyMode.replaceAll("_", " ")}
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <MergeCandidatePanel item={item} />

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Possible local merge targets
          </p>

          {item.localMatches.length > 0 ? (
            <div className={compact ? "space-y-3" : "grid gap-3"}>
              {item.localMatches.map((match) => (
                <LocalMergeTargetPanel key={match.id} match={match} />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
              No local merge targets are attached. The review item remains in the queue.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/40">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-300">
          Merge action status
        </p>
        <h3 className="mt-2 text-base font-semibold text-amber-900 dark:text-amber-100">
          {mergeAction?.label ?? "Merge is unavailable"}
        </h3>
        <p className="mt-2 text-sm leading-6 text-amber-800 dark:text-amber-200">
          {mergeAction
            ? getSemanticReviewActionPolicyReason(mergeAction)
            : "Merge stays disabled until a separate feedback gate exists."}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          disabled
          aria-disabled={true}
          title="Merge is disabled preview only."
          className="cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500"
        >
          Cancel preview
        </button>

        <button
          type="button"
          disabled
          aria-disabled={true}
          title="Merge cannot be applied in UI-6."
          className="cursor-not-allowed rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-left text-sm font-semibold text-violet-400 shadow-sm dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-500"
        >
          Apply merge disabled
        </button>
      </div>

      <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        {mergeDialogSafetyStatements.map((statement) => (
          <p key={statement}>{statement}</p>
        ))}
      </div>
    </section>
  );
}

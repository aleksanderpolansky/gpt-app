import {
  buildSemanticReviewActionPolicy,
  getPrimarySemanticReviewAction,
  getSecondarySemanticReviewActions,
  getSemanticReviewActionPolicyReason,
} from "./semantic-review-action-policy";

import type {
  SemanticReviewAllowedAction,
  SemanticReviewItem,
} from "./semantic-review-types";

export const SEMANTIC_REVIEW_ACTION_BAR_CREATED = true as const;


export const SEMANTIC_REVIEW_ACTION_BOUNDARY_LABELS = [
  "Confirm",
  "Reject",
  "Merge",
  "Ask later",
] as const;
export interface ReviewActionBarProps {
  item: SemanticReviewItem;
  title?: string;
  description?: string;
  compact?: boolean;
}

const reviewActionSafetyStatements = [
  "Confirm, reject, merge, and ask-later actions are local-only or disabled preview actions.",
  "No Activity Events, Value Objects, global categories, state facts, points, or commercial records are created.",
  "Actions are UI preview only and cannot change records.",
  "Buttons are intentionally disabled and no onClick handlers are attached.",
  "Merge stays disabled until a separate feedback gate exists.",
] as const;

function getAvailabilityLabel(action: SemanticReviewAllowedAction): string {
  if (action.availability === "disabled") {
    return "Disabled preview";
  }

  if (action.isLocalOnly) {
    return "Local only";
  }

  return String(action.availability).replaceAll("_", " ");
}

function getActionToneClasses(
  action: SemanticReviewAllowedAction,
  primary: boolean,
): string {
  if (action.availability === "disabled") {
    return "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500";
  }

  if (action.kind === "ask_later") {
    return "cursor-not-allowed border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
  }

  if (action.kind === "reject_candidate") {
    return "cursor-not-allowed border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";
  }

  if (action.kind === "merge_later") {
    return "cursor-not-allowed border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300";
  }

  if (primary) {
    return "cursor-not-allowed border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300";
  }

  return "cursor-not-allowed border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300";
}

function ActionButton({
  action,
  primary = false,
}: {
  action: SemanticReviewAllowedAction;
  primary?: boolean;
}) {
  const reason = getSemanticReviewActionPolicyReason(action);

  return (
    <button
      type="button"
      disabled
      aria-disabled={true}
      title={reason}
      className={`rounded-2xl border px-4 py-3 text-left shadow-sm transition ${getActionToneClasses(action, primary)}`}
    >
      <span className="block text-sm font-semibold">{action.label}</span>
      <span className="mt-1 block text-xs leading-5 opacity-80">
        {getAvailabilityLabel(action)}
      </span>
    </button>
  );
}

function ActionReasonCard({
  action,
}: {
  action: SemanticReviewAllowedAction;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
        {action.label}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {getSemanticReviewActionPolicyReason(action)}
      </p>
    </div>
  );
}

export function ReviewActionBar({
  item,
  title = "Review actions",
  description = "Actions are shown as safe UI previews only.",
  compact = false,
}: ReviewActionBarProps) {
  const primaryAction = getPrimarySemanticReviewAction(item);
  const secondaryActions = getSecondarySemanticReviewActions(item);
  const policy = buildSemanticReviewActionPolicy({
    item,
    requestedActionKind: primaryAction?.kind,
    mode: "ui_preview_only",
  });

  return (
    <section
      aria-labelledby={`review-action-bar-${item.id}`}
      className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Action policy · UI preview only
          </p>
          <div className="space-y-1">
            <h2
              id={`review-action-bar-${item.id}`}
              className="text-xl font-semibold text-slate-950 dark:text-slate-50"
            >
              {title}
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>
        </div>

        <span className="inline-flex w-fit items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300">
          {policy.policyMode.replaceAll("_", " ")}
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/40">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
            Current preview
          </p>
          <h3 className="mt-2 text-base font-semibold text-emerald-900 dark:text-emerald-100">
            {policy.decisionPreview.label}
          </h3>
          <p className="mt-2 text-sm leading-6 text-emerald-800 dark:text-emerald-200">
            {policy.decisionPreview.description}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Safety note
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {policy.decisionPreview.safetyNote}
          </p>
        </div>
      </div>

      {primaryAction ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Primary action
          </p>
          <ActionButton action={primaryAction} primary />
        </div>
      ) : null}

      {secondaryActions.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Other actions
          </p>
          <div className={compact ? "grid gap-3" : "grid gap-3 md:grid-cols-2"}>
            {secondaryActions.map((action) => (
              <ActionButton key={action.id} action={action} />
            ))}
          </div>
        </div>
      ) : null}

      {!compact ? (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Allowed
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">
              {policy.allowedActions.length}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/40">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
              Local only
            </p>
            <p className="mt-2 text-2xl font-semibold text-emerald-800 dark:text-emerald-100">
              {policy.localOnlyActions.length}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/40">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-300">
              Disabled
            </p>
            <p className="mt-2 text-2xl font-semibold text-amber-800 dark:text-amber-100">
              {policy.disabledActions.length}
            </p>
          </div>
        </div>
      ) : null}

      {!compact && item.actions.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {item.actions.map((action) => (
            <ActionReasonCard key={action.id} action={action} />
          ))}
        </div>
      ) : null}

      <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
        {reviewActionSafetyStatements.map((statement) => (
          <p key={statement}>{statement}</p>
        ))}
      </div>
    </section>
  );
}


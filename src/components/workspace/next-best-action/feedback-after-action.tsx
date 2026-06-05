import type { FeedbackAction } from "./next-best-action.types";

export interface FeedbackAfterActionProps {
  readonly feedbackActions: readonly FeedbackAction[];
}

export function FeedbackAfterAction({ feedbackActions }: FeedbackAfterActionProps) {
  return (
    <section
      aria-labelledby="feedback-after-action-title"
      className="rounded-xl border border-border bg-card p-6 shadow-sm"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Feedback after action
          </p>
          <h2 id="feedback-after-action-title" className="mt-2 text-xl font-semibold text-foreground">
            Preview-only feedback controls
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            These feedback buttons are shown only as a future interaction model: useful, not useful,
            later, and done. UI-12 does not save feedback or change candidate ranking.
          </p>
        </div>

        <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
          Disabled / local-only preview
        </span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {feedbackActions.map((action) => (
          <FeedbackPreviewCard key={action.id} action={action} />
        ))}
      </div>

      <p className="mt-6 rounded-lg border border-border bg-background/60 px-4 py-3 text-xs leading-5 text-muted-foreground">
        Disabled preview only: no database write, no API write, no analytics mutation, no local
        storage, and no hidden persistence. Real feedback is a future gated block.
      </p>
    </section>
  );
}

interface FeedbackPreviewCardProps {
  readonly action: FeedbackAction;
}

function FeedbackPreviewCard({ action }: FeedbackPreviewCardProps) {
  return (
    <article className="rounded-xl border border-border bg-background/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {getFeedbackGateLabel(action.gateStatus)}
          </p>
          <h3 className="mt-2 text-base font-semibold text-foreground">{action.label}</h3>
        </div>

        <span className="rounded-full border border-border bg-card px-2 py-1 text-xs font-semibold text-muted-foreground">
          Preview
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-muted-foreground">{action.meaning}</p>

      <button
        type="button"
        disabled
        aria-disabled="true"
        className="mt-4 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-muted-foreground"
      >
        {action.label}
      </button>

      <p className="mt-3 text-xs leading-5 text-muted-foreground">{action.warningText}</p>
    </article>
  );
}

function getFeedbackGateLabel(gateStatus: FeedbackAction["gateStatus"]) {
  if (gateStatus === "previewOnly") {
    return "Preview only";
  }

  if (gateStatus === "localOnly") {
    return "Local-only later";
  }

  return "Disabled";
}

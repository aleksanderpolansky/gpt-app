import type {
  FeedbackTrace,
  FeedbackTraceStatus,
} from "./privacy-audit.types";
import {
  getFeedbackTraceClassName,
  getFeedbackTraceLabel,
} from "./privacy-audit.utils";

interface FeedbackTracePanelProps {
  readonly feedbackTraces: readonly FeedbackTrace[];
}

const feedbackTraceStatuses: readonly FeedbackTraceStatus[] = [
  "preview-only",
  "not-applied",
  "queued-for-review",
  "future-gated",
];

export function FeedbackTracePanel({
  feedbackTraces,
}: FeedbackTracePanelProps) {
  const statusCounts = feedbackTraceStatuses.map((status) => ({
    status,
    count: feedbackTraces.filter((trace) => trace.status === status).length,
  }));

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-2 border-b border-border pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">
            Feedback trace
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Feedback is shown as read-only trace evidence. UI-13 does not train
            a resolver, persist feedback, or apply cross-user learning.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {feedbackTraces.length}
          </span>{" "}
          feedback traces
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-4">
        {statusCounts.map(({ status, count }) => (
          <div
            key={status}
            className={`rounded-lg border px-3 py-2 ${getFeedbackTraceClassName(
              status,
            )}`}
          >
            <p className="text-xs font-medium uppercase tracking-wide opacity-80">
              {getFeedbackTraceLabel(status)}
            </p>
            <p className="mt-1 text-lg font-semibold">{count}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {feedbackTraces.map((trace) => (
          <article
            key={trace.id}
            className="rounded-lg border border-border bg-background/60 p-4"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Feedback label
                </p>
                <h3 className="text-base font-semibold text-foreground">
                  {trace.feedbackLabel}
                </h3>
              </div>

              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getFeedbackTraceClassName(
                  trace.status,
                )}`}
              >
                {getFeedbackTraceLabel(trace.status)}
              </span>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-md border border-border bg-card px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Affected preview
                </p>
                <p className="mt-1 text-sm leading-6 text-foreground">
                  {trace.affectedPreview}
                </p>
              </div>

              <div className="rounded-md border border-dashed border-border bg-muted px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Limitation
                </p>
                <p className="mt-1 text-sm leading-6 text-foreground">
                  {trace.limitation}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-dashed border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
        Feedback trace is display-only in UI-13. It does not create training
        data, update resolver state, save user feedback, or apply automatic
        personalization.
      </div>
    </section>
  );
}

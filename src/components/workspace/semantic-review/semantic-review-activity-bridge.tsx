export const SEMANTIC_REVIEW_ACTIVITY_BRIDGE_CREATED = true as const;

export interface SemanticReviewActivityBridgeProps {
  href?: string;
  compact?: boolean;
}

const activityBridgeSafetyStatements = [
  "Activity bridge is navigation-only and local UI only.",
  "Activity Capture and Activity Review can open Semantic Review without creating category, Value Object, Activity Event, state fact, points, commercial record, or ontology record.",
  "AI output remains candidate, not truth.",
  "External concept remains a hint, not an internal category.",
  "No data is fetched or written by this bridge component.",
] as const;

export function SemanticReviewActivityBridge({
  href = "/semantic/review",
  compact = false,
}: SemanticReviewActivityBridgeProps) {
  return (
    <section
      aria-labelledby="semantic-review-activity-bridge-title"
      className="rounded-3xl border border-indigo-200 bg-white p-4 shadow-sm dark:border-indigo-900/60 dark:bg-slate-950"
      data-ui6-semantic-review-activity-bridge="navigation-only"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">
            UI-6 · Activity Review bridge
          </p>

          <div className="space-y-1">
            <h2
              id="semantic-review-activity-bridge-title"
              className="text-lg font-semibold text-slate-950 dark:text-slate-50"
            >
              Send reviewed activity candidates to Semantic Review
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Activity Capture and Activity Review stay local. This bridge only opens the Semantic Review route for checking semantic candidates.
            </p>
          </div>
        </div>

        <a
          href={href}
          className="inline-flex w-fit items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200 dark:hover:bg-violet-950"
        >
          Open linked review
        </a>
      </div>

      {!compact ? (
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-3 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
              Source
            </p>
            <p className="mt-2 text-sm leading-6">Activity Review</p>
          </div>

          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
              Target
            </p>
            <p className="mt-2 text-sm leading-6">Semantic Review</p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
              Mode
            </p>
            <p className="mt-2 text-sm leading-6">Navigation only</p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
              No hidden writes
            </p>
            <p className="mt-2 text-sm leading-6">Feedback gate required</p>
          </div>
        </div>
      ) : null}

      {!compact ? (
        <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          {activityBridgeSafetyStatements.map((statement) => (
            <p key={statement}>{statement}</p>
          ))}
        </div>
      ) : null}
    </section>
  );
}

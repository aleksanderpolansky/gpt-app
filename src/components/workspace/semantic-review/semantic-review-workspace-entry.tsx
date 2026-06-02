export const SEMANTIC_REVIEW_WORKSPACE_ENTRY_CREATED = true as const;

export interface SemanticReviewWorkspaceEntryProps {
  href?: string;
  compact?: boolean;
}

const workspaceEntrySafetyStatements = [
  "Workspace entry is navigation-only and local UI only.",
  "Navigation opens the Semantic Review route and does not create category, Value Object, Activity Event, state fact, points, commercial record, or ontology record.",
  "AI output remains candidate, not truth.",
  "External concept remains a hint, not an internal category.",
  "No data is fetched or written by this entry component.",
] as const;

export function SemanticReviewWorkspaceEntry({
  href = "/semantic/review",
  compact = false,
}: SemanticReviewWorkspaceEntryProps) {
  return (
    <section
      aria-labelledby="semantic-review-workspace-entry-title"
      className="rounded-3xl border border-violet-200 bg-white p-4 shadow-sm dark:border-violet-900/60 dark:bg-slate-950"
      data-ui6-semantic-review-workspace-entry="navigation-only"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">
            UI-6 · Semantic Review
          </p>

          <div className="space-y-1">
            <h2
              id="semantic-review-workspace-entry-title"
              className="text-lg font-semibold text-slate-950 dark:text-slate-50"
            >
              Needs Review queue
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Open the local Semantic Review route to inspect AI semantic candidates before any future feedback or write gate exists.
            </p>
          </div>
        </div>

        <a
          href={href}
          className="inline-flex w-fit items-center justify-center rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200 dark:hover:bg-indigo-950"
        >
          Open Semantic Review
        </a>
      </div>

      {!compact ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
              Route
            </p>
            <p className="mt-2 text-sm leading-6">/semantic/review</p>
          </div>

          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
              Source
            </p>
            <p className="mt-2 text-sm leading-6">Fixture queue only</p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
              Writes
            </p>
            <p className="mt-2 text-sm leading-6">Blocked</p>
          </div>
        </div>
      ) : null}

      {!compact ? (
        <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          {workspaceEntrySafetyStatements.map((statement) => (
            <p key={statement}>{statement}</p>
          ))}
        </div>
      ) : null}
    </section>
  );
}

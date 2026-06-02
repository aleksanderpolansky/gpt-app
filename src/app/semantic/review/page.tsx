import {
  SemanticReviewPanel,
  defaultSemanticReviewQueue,
} from "../../../components/workspace/semantic-review";

export const UI6_SEMANTIC_REVIEW_ROUTE_CREATED = true as const;
export const UI6_SEMANTIC_REVIEW_ROUTE_FIXTURE_WIRED = true as const;

const routeSafetyStatements = [
  "Route uses fixture queue only and local UI only.",
  "No category, Value Object, Activity Event, state fact, points, commercial record, or ontology record is created.",
  "AI output is a candidate, not truth.",
  "External concept remains a hint, not an internal category.",
  "No data is fetched or written by this route.",
] as const;

export default function SemanticReviewRoutePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 dark:bg-slate-900 dark:text-slate-50 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            UI-6 route · Semantic Review · Fixture smoke gate
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">
            Semantic Review
          </h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            This route mounts the Semantic Review panel with a local fixture queue. It is a visual smoke gate only.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-3 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
                Review
              </p>
              <p className="mt-2 text-sm leading-6">Candidate only</p>
            </div>

            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
                Fixture
              </p>
              <p className="mt-2 text-sm leading-6">Local queue</p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
                Smoke
              </p>
              <p className="mt-2 text-sm leading-6">Visual only</p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
                Writes
              </p>
              <p className="mt-2 text-sm leading-6">Blocked</p>
            </div>
          </div>

          <div className="mt-5 space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            {routeSafetyStatements.map((statement) => (
              <p key={statement}>{statement}</p>
            ))}
          </div>
        </section>

        <SemanticReviewPanel
          queue={defaultSemanticReviewQueue}
          mode="queue"
          title="Semantic Review"
          description="The route is wired to a local fixture queue. No feedback or write gate is active."
        />
      </div>
    </main>
  );
}

import { resolveDemoFamilyTimeAnalytics } from "@/lib/value-objects/value-object-analytics-resolver";

const pageMarker = "value-object-analytics-preview-page-step62-v1";

function formatSignedNumber(value: number | null): string {
  if (value === null) {
    return "n/a";
  }

  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}

export default function ValueObjectAnalyticsPreviewPage() {
  const result = resolveDemoFamilyTimeAnalytics();
  const target = result.targetValue ?? result.targetMin ?? result.targetMax;
  const progressText =
    result.progressPercent === null ? "n/a" : `${result.progressPercent}%`;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <section className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="rounded-3xl border border-cyan-400/30 bg-cyan-400/10 p-6 shadow-2xl shadow-cyan-950/40">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
            {pageMarker}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
            Value Object analytics preview
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            This page exposes the Step 62 pure no-write analytics resolver demo.
            It compares accepted user-owned facts with a structured target
            standard and returns a safe progress signal.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
              Object
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">
              Family Time
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Demo Value Object: fixture_vo_family_time
            </p>
          </article>

          <article className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
              Result
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">
              {result.actualValue}/{target} {result.unit}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Family Time 30/60 demo
            </p>
          </article>

          <article className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
              Delta
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">
              {formatSignedNumber(result.delta)} {result.unit}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              status: {result.status}
            </p>
          </article>
        </div>

        <section className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold text-white">
            Human-readable signal
          </h2>
          <p className="mt-3 rounded-2xl border border-slate-700 bg-slate-950 p-4 text-sm leading-6 text-slate-200">
            {result.recommendationCopy}
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                Progress
              </p>
              <p className="mt-2 text-2xl font-bold text-white">
                {progressText}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                Resolver marker
              </p>
              <p className="mt-2 break-all text-sm font-semibold text-cyan-200">
                {result.resolverMarker}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold text-white">
            Raw resolver output
          </h2>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-slate-700 bg-slate-950 p-4 text-xs leading-5 text-slate-300">
            {JSON.stringify(result, null, 2)}
          </pre>
        </section>

        <section className="rounded-3xl border border-amber-300/30 bg-amber-300/10 p-6">
          <h2 className="text-xl font-semibold text-amber-100">
            Safety boundary
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-amber-50/90">
            <li>No database writes are executed by this preview page.</li>
            <li>No database reads are executed by this preview page.</li>
            <li>No SQL execution is performed.</li>
            <li>No external model calls are performed.</li>
            <li>The copy is a progress signal, not a diagnosis or absolute judgment.</li>
          </ul>
        </section>
      </section>
    </main>
  );
}

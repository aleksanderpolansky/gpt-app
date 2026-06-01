/**
 * UI-3.6 — /workspace safe entrypoint.
 *
 * This route is intentionally static at this step.
 * It does not call network, database, auth, environment variables or server routes.
 *
 * Result marker: WORKSPACE_ROUTE_CREATED
 */

export default function WorkspacePage() {
  return (
    <main className="min-h-screen bg-[#f0f2f7] text-[#1a1d2e]">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 rounded-xl border border-black/10 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7c8099]">
            UI-3.6 / Safe entrypoint
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#1a1d2e]">
            Master Workspace Shell
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#7c8099]">
            This route is ready for the UI-3 shell assembly. The current page is
            static, fixture-only and contains no hidden writes. The desktop and
            mobile shell components will be attached in the next implementation
            steps.
          </p>
        </div>

        <div className="grid flex-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)_292px]">
          <aside className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7c8099]">
              Left navigation
            </p>
            <p className="mt-2 text-sm text-[#1a1d2e]">
              Placeholder for semantic navigation, value objects, review queues
              and commercial sections.
            </p>
          </aside>

          <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7c8099]">
              Center workspace
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[#1a1d2e]">
              Activity Review and operational dashboard placeholder
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#7c8099]">
              Future UI-3 steps will connect local fixtures, KPI cards,
              overview cards and an Activity Review placeholder here.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-black/10 bg-[#eef2ff] p-4">
                <p className="text-sm font-semibold text-[#1a1d2e]">
                  No hidden writes
                </p>
                <p className="mt-1 text-sm text-[#7c8099]">
                  Buttons and recommendations remain local or disabled until a
                  future explicit gate.
                </p>
              </div>

              <div className="rounded-xl border border-black/10 bg-white p-4">
                <p className="text-sm font-semibold text-[#1a1d2e]">
                  Fixture-only shell
                </p>
                <p className="mt-1 text-sm text-[#7c8099]">
                  The shell can render static workspace data without persistence.
                </p>
              </div>
            </div>
          </section>

          <aside className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7c8099]">
              Right AI column
            </p>
            <p className="mt-2 text-sm text-[#1a1d2e]">
              Placeholder for contextual AI messages, boundary warnings and
              candidate next-action cards.
            </p>
          </aside>
        </div>

        <div className="mt-4 rounded-xl border border-black/10 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7c8099]">
            Bottom quick actions
          </p>
          <p className="mt-2 text-sm text-[#1a1d2e]">
            Record activity · Weak direction · Objects · Analytics · Ask AI
          </p>
        </div>

        <p className="mt-4 text-xs text-[#7c8099]">
          WORKSPACE_ROUTE_CREATED · done 6/32 · left 26
        </p>
      </section>
    </main>
  );
}

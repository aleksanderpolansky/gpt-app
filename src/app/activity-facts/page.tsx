import Link from "next/link";

import { ActivityFactsTable } from "@/components/workspace/activity-facts/activity-facts-table";

export default function ActivityFactsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Activity Facts · Step 54 / 76
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Таблица фактов активности
              </h1>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
                Эта страница теперь подключена к read-only endpoint
                <code> GET /api/activity/facts</code>. Она показывает только
                факты текущего authenticated user и не выполняет запись.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/activity-capture"
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Activity Capture
              </Link>
              <Link
                href="/value-objects/tree"
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Value Objects Tree
              </Link>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <div className="font-semibold">No-write contract</div>
            <p className="mt-1">
              UI делает только browser-side <code>fetch</code> методом
              <code> GET</code>. DB writes, SQL execution и OpenAI calls в
              Step 54 не включены.
            </p>
          </div>
        </section>

        <ActivityFactsTable />

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Что считается выполнением Step 54
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
            <li>
              Таблица показывает колонки: fact_id, activity_id, VO,
              semantic_key, measure, status, source, created_at.
            </li>
            <li>
              Empty state корректно объясняет <code>count: 0</code> без
              ложного вывода, что система не работает.
            </li>
            <li>
              Ошибки Auth/API отображаются в UI, а не ломают страницу.
            </li>
            <li>
              Correction actions и links to Activity/VO остаются для Step 56 и
              Step 57.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}

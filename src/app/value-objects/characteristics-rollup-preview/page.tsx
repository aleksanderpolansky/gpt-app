// GPT-APP / AI-NAVIGATOR
// Value Object Characteristics / Relations / Measures / Rollup preview route
// Runtime status: read-only route; no DB writes, no SQL execution, no OpenAI calls.

import { ValueObjectCharacteristicsRollupPreview } from "../../../components/workspace/value-objects/value-object-characteristics-rollup-preview";

export const dynamic = "force-static";

export default function ValueObjectCharacteristicsRollupPreviewPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">
            Internal preview / no-write route
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Value Object Characteristics & Rollup
          </h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            Эта страница показывает черновую архитектуру характеристик ценного объекта, мер события,
            связей влияния и производной rollup-аналитики. Страница работает только с read-only fixtures.
            Она не сохраняет данные, не вызывает OpenAI, не выполняет SQL и не создаёт Activity Event.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-800">
              <div className="font-bold">DB writes</div>
              <div className="mt-1">false</div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-800">
              <div className="font-bold">SQL execution</div>
              <div className="mt-1">false</div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-800">
              <div className="font-bold">OpenAI calls</div>
              <div className="mt-1">false</div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-800">
              <div className="font-bold">Persistence</div>
              <div className="mt-1">preview only</div>
            </div>
          </div>
        </section>

        <ValueObjectCharacteristicsRollupPreview />
      </div>
    </main>
  );
}

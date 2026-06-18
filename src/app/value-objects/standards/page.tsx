import Link from "next/link";

import { ValueObjectStandardsPanel } from "@/components/workspace/value-objects/value-object-standards-panel";

export default function ValueObjectStandardsIndexPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <nav className="flex flex-wrap items-center gap-3 text-sm">
          <Link
            href="/value-objects"
            className="rounded-full border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            ← Back to Value Objects
          </Link>
          <Link
            href="/activity-facts"
            className="rounded-full border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Activity Facts
          </Link>
        </nav>

        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Step 60 / 76
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Value Object target standards
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Read-only standards UI powered by Step 59 fixtures. This route is
            intentionally no-write: no database mutation, no SQL execution, and no
            external model call.
          </p>
        </header>

        <ValueObjectStandardsPanel includeDemoFallback />
      </div>
    </main>
  );
}


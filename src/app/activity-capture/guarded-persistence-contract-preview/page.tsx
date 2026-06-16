import { GuardedPersistenceContractPreview } from "@/components/activity-to-value-objects/guarded-persistence-contract-preview";

export default function GuardedPersistenceContractPreviewPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            GPT-APP / AI-NAVIGATOR
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Activity Facts Guarded Persistence Contract
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Read-only preview of the future server-mediated persistence contract.
            This page does not create, update, delete, confirm or save anything.
            It only displays the no-write execution plan returned by the save-gate route.
          </p>
          <p className="mt-3 max-w-3xl text-xs leading-5 text-slate-500">
            Encoding note: UI shell labels are ASCII-stable; route payload can
            include multilingual source data inside JSON preview blocks.
          </p>
        </header>

        <GuardedPersistenceContractPreview />
      </div>
    </main>
  );
}

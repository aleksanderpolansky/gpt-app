const saveGateRequestFields = [
  "routeMode",
  "futurePersistenceMode",
  "sourcePackageId",
  "idempotencyKey",
  "clientSafetyConfirmation",
  "userReviewedPreview",
  "userConfirmedFactWrite",
  "userConfirmedMissingValueObjectCreation",
  "factDecisions",
  "editedFactDecisions",
  "valueObjectCandidateDecisions",
] as const;

const saveGateContexts = [
  "partialSaveContext",
  "ownershipContext",
  "idempotencyContext",
] as const;

export function RightAiSaveIntentCard() {
  return (
    <section
      aria-label="Save intent card"
      className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm text-slate-800"
      data-testid="right-ai-save-intent-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Save intent card · right AI column · contextual-ai-column ·
            workspace-right-ai-column
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-950">
            Записать активность
          </h3>
        </div>
        <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
          blocked no-write preview
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-700">
        Этот блок показывает будущий server-mediated save flow через{" "}
        <code>/api/activity/facts/save-gate</code>. Реальная запись ещё
        заблокирована: <code>ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED</code>.
      </p>

      <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
        <div className="rounded-xl bg-white p-3">
          <dt className="font-semibold text-slate-500">routeMode</dt>
          <dd className="mt-1 font-mono text-slate-900">
            future_server_mediated_write
          </dd>
        </div>
        <div className="rounded-xl bg-white p-3">
          <dt className="font-semibold text-slate-500">futurePersistenceMode</dt>
          <dd className="mt-1 font-mono text-slate-900">confirm_save</dd>
        </div>
        <div className="rounded-xl bg-white p-3">
          <dt className="font-semibold text-slate-500">productionWriteEnabled</dt>
          <dd className="mt-1 font-mono text-slate-900">
            productionWriteEnabled=false
          </dd>
        </div>
        <div className="rounded-xl bg-white p-3">
          <dt className="font-semibold text-slate-500">safety</dt>
          <dd className="mt-1 font-mono text-slate-900">
            no direct browser Supabase write
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        <p className="text-xs font-semibold text-slate-500">
          Required request fields
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {saveGateRequestFields.map((field) => (
            <span
              key={field}
              className="rounded-full bg-white px-2 py-1 font-mono text-xs text-slate-700"
            >
              {field}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold text-slate-500">
          Visible guarded contexts
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {saveGateContexts.map((context) => (
            <span
              key={context}
              className="rounded-full bg-white px-2 py-1 font-mono text-xs text-slate-700"
            >
              {context}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-600">
        No DB writes · No SQL execution · No OpenAI. The right AI column only
        exposes the save intent and guarded route contract.
      </p>
    </section>
  );
}
import Link from "next/link";

const plannedFactsColumns = [
  "activity_id",
  "fact_id",
  "semantic_object_key",
  "value_object_id",
  "metric",
  "status",
  "source",
  "created_at",
  "correction actions",
];

const previewRows = [
  {
    label: "Family time",
    activityId: "act_preview_child_football_30m",
    factId: "fact_family_time_preview",
    valueObjectId: "vo_family_time_preview",
    metric: "30 min",
    status: "preview",
  },
  {
    label: "Physical activity",
    activityId: "act_preview_child_football_30m",
    factId: "fact_physical_activity_preview",
    valueObjectId: "vo_physical_activity_preview",
    metric: "30 min",
    status: "preview",
  },
  {
    label: "Play with child",
    activityId: "act_preview_child_football_30m",
    factId: "fact_child_play_preview",
    valueObjectId: "vo_child_play_preview",
    metric: "30 min",
    status: "preview",
  },
];

export default function ActivityFactsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-950">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Step 52 / 76 · canonical route placeholder
          </div>

          <h1 className="mt-2 text-2xl font-semibold">
            Activity Facts
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            This is the canonical read-only route for the future saved facts table.
            It prevents the post-save success card from linking to a missing page while
            the real activity_object_facts read model is still being aligned.
          </p>

          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            <strong>No-write contract:</strong> this page does not read or write the database.
            It does not create Activity Events, measures, facts, review items, or recalculation queue rows.
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold">
            Planned facts table columns
          </h2>

          <div className="mt-4 flex flex-wrap gap-2">
            {plannedFactsColumns.map((column) => (
              <code
                key={column}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700"
              >
                {column}
              </code>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold">
            Preview rows only
          </h2>

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Meaning</th>
                  <th className="px-4 py-3">Activity</th>
                  <th className="px-4 py-3">Fact</th>
                  <th className="px-4 py-3">Value Object</th>
                  <th className="px-4 py-3">Metric</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {previewRows.map((row) => (
                  <tr key={row.factId}>
                    <td className="px-4 py-3 font-medium text-slate-900">{row.label}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.activityId}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.factId}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.valueObjectId}</td>
                    <td className="px-4 py-3 text-slate-700">{row.metric}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <Link
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            href="/activity-capture/facts-preview"
          >
            Open facts preview →
          </Link>

          <Link
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            href="/activity-capture"
          >
            Open activity capture →
          </Link>

          <Link
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            href="/workspace"
          >
            Back to workspace →
          </Link>
        </section>
      </div>
    </main>
  );
}

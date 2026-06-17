import Link from "next/link";

const treeRoots = [
  {
    title: "Организм",
    description: "System-created physiological branch; reference object only.",
  },
  {
    title: "Семья",
    description: "Private or user-owned family goals, care duties, and time exposure.",
  },
  {
    title: "Интеллектуальная деятельность",
    description: "Learning, languages, professional development, and cognitive work.",
  },
  {
    title: "Работа / бизнес",
    description: "Current jobs, B2B sales, process work, and business projects.",
  },
  {
    title: "Отдых",
    description: "Recovery, passive rest, sleep, and decompression.",
  },
];

export default function ValueObjectsTreePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-950">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Step 52 / 76 · canonical route placeholder
          </div>

          <h1 className="mt-2 text-2xl font-semibold">
            Value Objects Tree
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            This is the canonical read-only route for the future Value Objects tree.
            It prevents the post-save success card from linking to a missing page while
            the final tree read model is still being aligned with parent_value_object_id.
          </p>

          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            <strong>No-write contract:</strong> this page does not create, update, delete,
            or re-parent Value Objects. It is a navigation-safe placeholder only.
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold">
            Planned top-level roots
          </h2>

          <div className="mt-4 grid gap-3">
            {treeRoots.map((root) => (
              <article
                key={root.title}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <h3 className="text-sm font-semibold text-slate-900">{root.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{root.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold">
            Source-of-truth rule
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            The tree must be derived from <code>value_objects.parent_value_object_id</code>.
            Child lists are not a second source of truth. Shared/system Value Objects are
            common reference objects, but user activity facts linked to them remain user-owned.
          </p>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <Link
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            href="/value-objects/tree-preview"
          >
            Open tree preview →
          </Link>

          <Link
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            href="/value-objects"
          >
            Open Value Objects list →
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

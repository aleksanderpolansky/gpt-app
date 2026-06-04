type TodayTimelineReadOnlyBoundaryProps = {
  readonly placement?: "header" | "aside";
};

const boundaryItems = [
  "Fixture-first Activity Events",
  "No DB writes",
  "No API mutations",
  "Corrections visible, not applied",
] as const;

export function TodayTimelineReadOnlyBoundary({
  placement = "header",
}: TodayTimelineReadOnlyBoundaryProps) {
  const containerClassName =
    placement === "header"
      ? "rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900"
      : "rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700";

  const titleClassName =
    placement === "header"
      ? "font-semibold text-indigo-950"
      : "font-semibold text-slate-900";

  const itemClassName =
    placement === "header"
      ? "rounded-full bg-white px-2 py-1 text-xs font-semibold text-indigo-800 ring-1 ring-indigo-100"
      : "rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200";

  return (
    <section aria-label="TodayTimelineReadOnlyBoundary" className={containerClassName}>
      <p className={titleClassName}>Fixture-first / read-only</p>
      <p className="mt-1 leading-6">
        UI-9 shows timeline state, conflicts, and correction candidates without changing data.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {boundaryItems.map((item) => (
          <span key={item} className={itemClassName}>
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
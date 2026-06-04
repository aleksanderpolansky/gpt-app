import type { CalendarFreeWindowsViewModel } from "./calendar-free-windows.types";

interface CalendarReadOnlyBoundaryProps {
  readonly viewModel: CalendarFreeWindowsViewModel;
  readonly compact?: boolean;
}

export function CalendarReadOnlyBoundary({
  viewModel,
  compact = false,
}: CalendarReadOnlyBoundaryProps) {
  return (
    <section className="rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">
            Read-only boundary
          </p>

          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            {viewModel.readOnlyBoundary.title}
          </h2>

          <p className="mt-2 text-[13px] leading-6 text-amber-900">
            {viewModel.readOnlyBoundary.description}
          </p>
        </div>

        <span className="rounded-full border border-amber-100 bg-white px-3 py-1 text-[12px] font-semibold text-amber-700">
          No external calendar writes
        </span>
      </div>

      {compact ? null : (
        <div className="mt-4 grid gap-2">
          {viewModel.readOnlyBoundary.items.map((item) => (
            <p
              key={item}
              className="rounded-xl border border-amber-100 bg-white px-3 py-2 text-[12px] leading-5 text-slate-700"
            >
              {item}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}

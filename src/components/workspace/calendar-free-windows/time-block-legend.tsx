import type { CalendarFreeWindowsLegendItem } from "./calendar-free-windows.types";

interface TimeBlockLegendProps {
  readonly items: readonly CalendarFreeWindowsLegendItem[];
}

const kindClasses: Record<CalendarFreeWindowsLegendItem["kind"], string> = {
  busy: "border-slate-200 bg-slate-100 text-slate-700",
  free: "border-cyan-100 bg-cyan-50 text-cyan-700",
  blocked: "border-rose-100 bg-rose-50 text-rose-700",
};

const domainDotClasses: Record<CalendarFreeWindowsLegendItem["domain"], string> = {
  admin: "bg-slate-500",
  business: "bg-violet-500",
  errand: "bg-orange-500",
  family: "bg-rose-500",
  health: "bg-emerald-500",
  language: "bg-indigo-500",
  learning: "bg-amber-500",
  mixed: "bg-cyan-500",
  recovery: "bg-teal-500",
  work: "bg-slate-700",
};

export function TimeBlockLegend({ items }: TimeBlockLegendProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Time block legend
        </p>
        <h2 className="text-lg font-semibold text-slate-950">
          Busy, free and protected windows
        </h2>
        <p className="text-[13px] leading-6 text-slate-600">
          Semantic colors explain the calendar state without creating or editing
          any external calendar event.
        </p>
      </div>

      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-xl border border-slate-200 bg-slate-50 p-3"
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className={`mt-1 h-2.5 w-2.5 rounded-full ${domainDotClasses[item.domain]}`}
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[13px] font-semibold text-slate-950">
                    {item.label}
                  </h3>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${kindClasses[item.kind]}`}
                  >
                    {item.kind}
                  </span>
                </div>

                <p className="mt-1 text-[12px] leading-5 text-slate-600">
                  {item.description}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

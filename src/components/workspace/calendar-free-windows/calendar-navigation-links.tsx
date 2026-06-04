import Link from "next/link";

import type {
  CalendarFreeWindowsNavigationLink,
  CalendarFreeWindowsViewModel,
} from "./calendar-free-windows.types";

interface CalendarNavigationLinksProps {
  readonly viewModel: CalendarFreeWindowsViewModel;
  readonly compact?: boolean;
}

function NavigationLinkCard({
  link,
  compact,
}: {
  readonly link: CalendarFreeWindowsNavigationLink;
  readonly compact: boolean;
}) {
  return (
    <Link
      href={link.href}
      className={
        compact
          ? "rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
          : "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50"
      }
    >
      <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Navigation link
      </span>

      <span className="mt-1 block text-sm font-semibold text-slate-950">
        {link.label}
      </span>

      {compact ? null : (
        <span className="mt-2 block text-[12px] leading-5 text-slate-600">
          {link.description}
        </span>
      )}

      <span className="mt-3 inline-flex rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-700">
        {link.href}
      </span>
    </Link>
  );
}

export function CalendarNavigationLinks({
  viewModel,
  compact = false,
}: CalendarNavigationLinksProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Calendar navigation links
          </p>

          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            Move between related read-only screens
          </h2>

          <p className="mt-1 max-w-2xl text-[13px] leading-6 text-slate-600">
            UI-10 links to nearby workspace routes, but it does not write to
            external calendars or choose the final Next Best Action.
          </p>
        </div>

        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[12px] font-semibold text-slate-600">
          {viewModel.navigationLinks.length} links
        </span>
      </div>

      <div
        className={
          compact
            ? "mt-4 flex flex-wrap gap-2"
            : "mt-4 grid gap-3 md:grid-cols-3"
        }
      >
        {viewModel.navigationLinks.map((link) => (
          <NavigationLinkCard
            key={link.id}
            link={link}
            compact={compact}
          />
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">
          UI-10 boundary
        </p>

        <p className="mt-2 text-[12px] leading-5 text-amber-800">
          These links are simple navigation affordances. They do not mutate
          calendar data and do not submit any action request.
        </p>
      </div>
    </section>
  );
}

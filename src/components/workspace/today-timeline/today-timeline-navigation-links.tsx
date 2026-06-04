import Link from "next/link";

type TodayTimelineNavigationLink = {
  readonly href: string;
  readonly label: string;
  readonly description: string;
};

const navigationLinks: readonly TodayTimelineNavigationLink[] = [
  {
    href: "/workspace",
    label: "Workspace",
    description: "Return to the main LifeOS workspace.",
  },
  {
    href: "/activity-today",
    label: "Activity Today",
    description: "Compare with the older activity-today view.",
  },
  {
    href: "/semantic/review",
    label: "Semantic Review",
    description: "Review semantic candidates and source decisions.",
  },
  {
    href: "/value-objects",
    label: "Value Objects",
    description: "Open the value object directory.",
  },
];

export function TodayTimelineNavigationLinks() {
  return (
    <nav
      aria-label="TodayTimelineNavigationLinks"
      className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
    >
      {navigationLinks.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50"
        >
          <span className="text-sm font-semibold text-indigo-700">{item.label}</span>
          <span className="mt-1 block text-sm leading-6 text-slate-600">
            {item.description}
          </span>
        </Link>
      ))}
    </nav>
  );
}
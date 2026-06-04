import type { AnalyticsNavigationLink } from "./analytics-dashboard.types";

export interface AnalyticsNavigationLinksProps {
  readonly links: readonly AnalyticsNavigationLink[];
  readonly currentHref?: string;
}

interface AnalyticsNavigationLinkCardProps {
  readonly link: AnalyticsNavigationLink;
  readonly currentHref?: string;
}

function AnalyticsNavigationLinkCard({
  link,
  currentHref,
}: AnalyticsNavigationLinkCardProps) {
  const isCurrent = currentHref === link.href;

  return (
    <a
      href={link.href}
      aria-current={isCurrent ? "page" : undefined}
      className={[
        "rounded-xl border bg-background p-4 text-sm transition-colors hover:bg-muted",
        isCurrent ? "border-primary/20 bg-secondary text-secondary-foreground" : "",
      ].join(" ")}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block font-semibold">{link.label}</span>
          <span className="mt-2 block leading-6 text-muted-foreground">
            {link.description}
          </span>
        </span>

        <span className="shrink-0 rounded-full border bg-card px-2 py-1 text-xs text-muted-foreground">
          {isCurrent ? "Current" : "Open"}
        </span>
      </span>
    </a>
  );
}

export function AnalyticsNavigationLinks({
  links,
  currentHref,
}: AnalyticsNavigationLinksProps) {
  return (
    <nav
      aria-label="Analytics navigation links"
      className="rounded-xl border bg-card p-6 shadow-sm"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Navigation
          </p>
          <h2 className="text-xl font-semibold">Related workspace pages</h2>
        </div>

        <p className="max-w-md text-sm leading-6 text-muted-foreground">
          These links help users inspect related context. This widget does not write data, does not execute actions, and does not select the final Next Best Action.
        </p>
      </div>

      {links.length > 0 ? (
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {links.map((link) => (
            <AnalyticsNavigationLinkCard
              key={`${link.href}-${link.label}`}
              link={link}
              currentHref={currentHref}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border bg-background p-5">
          <p className="font-medium">No navigation links available.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            The fixture does not contain related workspace links for this preview.
          </p>
        </div>
      )}

      <p className="mt-5 rounded-lg border bg-background p-3 text-xs leading-5 text-muted-foreground">
        Navigation is read-only. Route links may open existing pages, but UI-11 does not create records, persist analytics, or perform workflow decisions.
      </p>
    </nav>
  );
}

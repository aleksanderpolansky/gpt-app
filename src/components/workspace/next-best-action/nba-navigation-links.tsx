import Link from "next/link";

import type { NavigationLink } from "./next-best-action.types";

export interface NbaNavigationLinksProps {
  readonly links: readonly NavigationLink[];
  readonly currentHref?: string;
}

export function NbaNavigationLinks({ links, currentHref = "/next" }: NbaNavigationLinksProps) {
  return (
    <nav
      aria-labelledby="nba-navigation-links-title"
      className="rounded-xl border border-border bg-card p-6 shadow-sm"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Related pages
          </p>
          <h2 id="nba-navigation-links-title" className="mt-2 text-xl font-semibold text-foreground">
            Continue in connected read-only areas
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            These links connect the Next Best Action preview with analytics, calendar, today, and
            workspace pages. Navigation does not execute an action or write feedback.
          </p>
        </div>

        <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
          /next is current
        </span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {links.map((link) => (
          <NavigationLinkCard
            key={link.href}
            link={link}
            isCurrent={link.href === currentHref}
          />
        ))}
      </div>
    </nav>
  );
}

interface NavigationLinkCardProps {
  readonly link: NavigationLink;
  readonly isCurrent: boolean;
}

function NavigationLinkCard({ link, isCurrent }: NavigationLinkCardProps) {
  const activeClassName = isCurrent
    ? "border-primary/30 bg-secondary text-primary"
    : "border-border bg-background/60 text-muted-foreground";

  return (
    <Link
      href={link.href}
      aria-current={isCurrent ? "page" : undefined}
      className={`rounded-xl border p-4 transition-colors ${activeClassName}`}
    >
      <span className="text-xs font-semibold uppercase tracking-wide">
        {isCurrent ? "Current page" : "Open related page"}
      </span>
      <span className="mt-2 block text-base font-semibold text-foreground">{link.label}</span>
      <span className="mt-2 block text-sm leading-6 text-muted-foreground">
        {link.description}
      </span>
      <span className="mt-4 inline-flex rounded-full border border-border bg-card px-2 py-1 text-xs font-semibold text-muted-foreground">
        {link.href}
      </span>
    </Link>
  );
}

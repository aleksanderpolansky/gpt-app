import Link from "next/link";

import type {
  CommercialCoreNavigationLink,
  CommercialCoreRouteKey,
} from "./commercial-core.types";

type CommercialNavigationLinksProps = {
  readonly links: readonly CommercialCoreNavigationLink[];
  readonly activeRoute: CommercialCoreRouteKey;
  readonly title?: string;
  readonly description?: string;
};

const defaultCommercialNavigationDescription =
  "Seven fixture-first commercial routes. Links are safe navigation only.";

function getCommercialNavigationLinkClassName(isActive: boolean): string {
  const baseClassName = "block rounded-xl border p-4 text-sm transition-colors";

  if (isActive) {
    return (
      baseClassName +
      " border-primary/20 bg-primary/10 text-primary shadow-sm"
    );
  }

  return (
    baseClassName +
    " border-border bg-card text-foreground hover:bg-secondary/60"
  );
}

export function CommercialNavigationLinks({
  links,
  activeRoute,
  title = "Commercial navigation",
  description = defaultCommercialNavigationDescription,
}: CommercialNavigationLinksProps) {
  return (
    <nav
      aria-label={title}
      className="rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <p className="text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {links.map((link) => {
          const isActive = link.routeKey === activeRoute;

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={getCommercialNavigationLinkClassName(isActive)}
              href={link.href}
              key={link.routeKey}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block font-medium">{link.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {link.description}
                  </span>
                </span>
                {link.badge ? (
                  <span className="shrink-0 rounded-full border border-border bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                    {link.badge}
                  </span>
                ) : null}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

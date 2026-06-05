import Link from "next/link";

import type {
  PrivacyAuditNavigationLink,
  PrivacyAuditNavigationTarget,
} from "./privacy-audit.types";

interface PrivacyAuditNavigationLinksProps {
  readonly navigationLinks: readonly PrivacyAuditNavigationLink[];
}

const navigationTargetClassNames: Record<PrivacyAuditNavigationTarget, string> = {
  workspace: "border-primary/30 bg-primary/10 text-primary",
  today: "border-chart-1/30 bg-chart-1/10 text-chart-1",
  analytics: "border-chart-4/30 bg-chart-4/10 text-chart-4",
  next: "border-chart-2/30 bg-chart-2/10 text-chart-2",
  objects: "border-chart-5/30 bg-chart-5/10 text-chart-5",
  settings: "border-border bg-muted text-muted-foreground",
};

export function PrivacyAuditNavigationLinks({
  navigationLinks,
}: PrivacyAuditNavigationLinksProps) {
  return (
    <nav
      aria-label="Privacy audit safe navigation"
      className="rounded-xl border border-border bg-card p-5 shadow-sm"
    >
      <div className="flex flex-col gap-2 border-b border-border pb-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          Safe navigation
        </p>
        <h2 className="text-lg font-semibold text-foreground">
          Related read-only areas
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Links help the user move between workspace, timeline, analytics, and
          next-best-action pages. They do not trigger writes, resolver mutation,
          feedback persistence, or privacy policy changes.
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {navigationLinks.map((link) => (
          <Link
            key={link.id}
            href={link.href}
            className="group rounded-lg border border-border bg-background/60 p-4 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground group-hover:text-primary">
                  {link.label}
                </h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  {link.description}
                </p>
              </div>

              <span
                className={`w-fit rounded-full border px-2.5 py-1 text-xs font-medium ${navigationTargetClassNames[link.target]}`}
              >
                {link.target}
              </span>
            </div>

            <p className="mt-3 text-xs font-medium text-muted-foreground">
              Destination: {link.href}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-dashed border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
        Links only: no write action, no DB/API writes, no hidden persistence,
        no destructive update, and no automatic learning are executed from this
        component.
      </div>
    </nav>
  );
}

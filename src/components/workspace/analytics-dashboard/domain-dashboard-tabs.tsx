import type {
  AnalyticsNavigationLink,
  AnalyticsSignalStatus,
  DomainDashboardTab,
} from "./analytics-dashboard.types";
import {
  formatAnalyticsScore,
  getAnalyticsStatusDescription,
  getAnalyticsStatusLabel,
} from "./analytics-dashboard.utils";

const statusClassNameByStatus: Record<AnalyticsSignalStatus, string> = {
  low: "border-border bg-background text-foreground",
  optimal: "border-primary/20 bg-secondary text-secondary-foreground",
  excess: "border-border bg-background text-foreground",
  blocked: "border-border bg-muted text-muted-foreground",
  unknown: "border-border bg-muted text-muted-foreground",
};

export interface DomainDashboardTabsProps {
  readonly tabs: readonly DomainDashboardTab[];
}

interface DomainTabCardProps {
  readonly tab: DomainDashboardTab;
}

interface RelatedRoutesListProps {
  readonly links: readonly AnalyticsNavigationLink[];
}

function RelatedRoutesList({ links }: RelatedRoutesListProps) {
  if (links.length === 0) {
    return (
      <p className="mt-4 rounded-lg border bg-background p-3 text-sm text-muted-foreground">
        No related route is configured for this domain preview.
      </p>
    );
  }

  return (
    <div className="mt-4 grid gap-2">
      {links.map((link) => (
        <a
          key={`${link.href}-${link.label}`}
          href={link.href}
          className="rounded-lg border bg-background p-3 text-sm transition-colors hover:bg-muted"
        >
          <span className="block font-medium">{link.label}</span>
          <span className="mt-1 block leading-6 text-muted-foreground">
            {link.description}
          </span>
        </a>
      ))}
    </div>
  );
}

function DomainTabCard({ tab }: DomainTabCardProps) {
  const statusLabel = getAnalyticsStatusLabel(tab.status);
  const statusDescription = getAnalyticsStatusDescription(tab.status);

  return (
    <article
      className="rounded-xl border bg-card p-5 shadow-sm"
      aria-label={`${tab.label}: ${formatAnalyticsScore(
        tab.score,
      )}. ${statusLabel}. ${statusDescription}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">
            Domain preview
          </p>
          <h3 className="mt-1 text-lg font-semibold">{tab.label}</h3>
        </div>

        <div className="shrink-0 rounded-xl border bg-background px-4 py-3 text-right">
          <p className="text-lg font-semibold">{formatAnalyticsScore(tab.score)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{statusLabel}</p>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        {tab.summary}
      </p>

      <p
        className={[
          "mt-4 rounded-lg border px-3 py-2 text-xs leading-5",
          statusClassNameByStatus[tab.status],
        ].join(" ")}
      >
        {statusDescription}
      </p>

      <RelatedRoutesList links={tab.relatedRoutes} />
    </article>
  );
}

export function DomainDashboardTabs({ tabs }: DomainDashboardTabsProps) {
  return (
    <section
      aria-label="Domain dashboard tabs"
      className="rounded-xl border bg-card p-6 shadow-sm"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Domain dashboard
          </p>
          <h2 className="text-xl font-semibold">Domain-specific analytics</h2>
        </div>

        <p className="max-w-md text-sm leading-6 text-muted-foreground">
          These cards behave like static tabs for the first UI-11 iteration.
          They explain domain signals and link to related pages without writing
          data or choosing a final action.
        </p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {tabs.map((tab) => (
          <DomainTabCard key={tab.id} tab={tab} />
        ))}
      </div>

      <p className="mt-5 rounded-lg border bg-background p-3 text-xs leading-5 text-muted-foreground">
        UI-11 only displays analytics signals. Any Next Best Action decision
        remains outside this block and belongs to UI-12.
      </p>
    </section>
  );
}

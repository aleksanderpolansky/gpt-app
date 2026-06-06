import {
  mobileShellNoRightsBadge,
  mobileShellPreviewFixture,
  mobileShellReadOnlyBadge,
} from "./mobile-shell.fixtures";
import {
  getMobileTabByKey,
  getMobileTabHref,
  mobileShellDefaultTabKey,
} from "./mobile-route-registry";
import type {
  MobileActionCandidate,
  MobileBadge,
  MobilePanelMetric,
  MobilePanelPreview,
  MobilePanelSection,
  MobilePreviewStatus,
  MobileTabItem,
  MobileTabKey,
} from "./mobile-shell.types";

export type MobileShellProps = {
  readonly activeTabKey?: MobileTabKey;
};

function getStatusLabel(status: MobilePreviewStatus): string {
  switch (status) {
    case "read_only":
      return "Read-only";
    case "preview_only":
      return "Preview only";
    case "signal":
      return "Signal";
    case "needs_review":
      return "Needs review";
    case "no_rights":
      return "No rights";
    case "future_gated":
      return "Future gate";
    default:
      return "Preview";
  }
}

function getBadgeClassName(badge: MobileBadge): string {
  const baseClassName =
    "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium";

  switch (badge.tone) {
    case "primary":
      return `${baseClassName} border-border bg-secondary text-secondary-foreground`;
    case "warning":
      return `${baseClassName} border-border bg-card text-foreground`;
    case "success":
      return `${baseClassName} border-border bg-secondary text-secondary-foreground`;
    case "muted":
      return `${baseClassName} border-border bg-muted text-muted-foreground`;
    case "default":
    default:
      return `${baseClassName} border-border bg-card text-card-foreground`;
  }
}

function getTabClassName(tab: MobileTabItem, activeTabKey: MobileTabKey): string {
  const baseClassName =
    "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-center text-xs font-medium transition";

  if (tab.key === activeTabKey) {
    return `${baseClassName} bg-secondary text-primary`;
  }

  return `${baseClassName} text-muted-foreground`;
}

function getPanelActions(
  activeTabKey: MobileTabKey,
  actions: readonly MobileActionCandidate[],
): readonly MobileActionCandidate[] {
  const matchingActions = actions.filter((action) => action.tabKey === activeTabKey);

  if (matchingActions.length > 0) {
    return matchingActions.slice(0, 3);
  }

  return actions.slice(0, 3);
}

function MobileBadgeList({
  badges,
}: {
  readonly badges?: readonly MobileBadge[];
}) {
  if (!badges || badges.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <span
          key={`${badge.label}-${badge.status ?? "status"}`}
          className={getBadgeClassName(badge)}
          title={badge.status ? getStatusLabel(badge.status) : undefined}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}

function MobileMetricList({
  metrics,
}: {
  readonly metrics?: readonly MobilePanelMetric[];
}) {
  if (!metrics || metrics.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-2">
      {metrics.map((metric) => (
        <div
          key={`${metric.label}-${metric.value}`}
          className="rounded-xl border border-border bg-background px-3 py-2"
        >
          <div className="text-xs font-medium text-muted-foreground">{metric.label}</div>
          <div className="mt-1 text-sm font-semibold text-foreground">{metric.value}</div>
          {metric.helperText ? (
            <div className="mt-1 text-xs text-muted-foreground">{metric.helperText}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function MobilePanelSectionCard({
  section,
}: {
  readonly section: MobilePanelSection;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
        <p className="text-sm leading-6 text-muted-foreground">{section.body}</p>
      </div>

      <div className="mt-3 space-y-3">
        <MobileBadgeList badges={section.badges} />
        <MobileMetricList metrics={section.metrics} />
      </div>
    </section>
  );
}

function MobileHeader({
  activeTab,
  panel,
}: {
  readonly activeTab: MobileTabItem;
  readonly panel: MobilePanelPreview;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-4 backdrop-blur">
      <div className="mx-auto flex w-full max-w-md items-start justify-between gap-3 pb-24">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            AI-NAVIGATOR / Mobile
          </p>
          <h1 className="mt-1 truncate text-xl font-semibold text-foreground">
            {activeTab.label}
          </h1>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {panel.contextLabel}
          </p>
        </div>

        <div className="shrink-0">
          <MobileBadgeList badges={[mobileShellReadOnlyBadge]} />
        </div>
      </div>
    </header>
  );
}

function MobilePanel({
  panel,
}: {
  readonly panel: MobilePanelPreview;
}) {
  return (
    <main className="mx-auto w-full max-w-md px-4 pb-28 pt-4 pb-24">
      <div className="rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground">{panel.title}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{panel.subtitle}</p>
          </div>

          <MobileBadgeList
            badges={[
              {
                label: getStatusLabel(panel.status),
                tone: panel.status === "needs_review" ? "warning" : "muted",
                status: panel.status,
              },
            ]}
          />
        </div>

        {panel.helperText ? (
          <p className="mt-4 rounded-xl border border-border bg-background px-3 py-2 text-sm leading-6 text-muted-foreground">
            {panel.helperText}
          </p>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        {panel.sections.map((section) => (
          <MobilePanelSectionCard key={section.title} section={section} />
        ))}
      </div>

      {panel.primaryRoute ? (
        <a
          href={panel.primaryRoute.href}
          className="mt-4 block rounded-2xl border border-border bg-card p-4 text-sm font-medium text-primary shadow-sm"
          aria-label={panel.primaryRoute.label}
        >
          <span>{panel.primaryRoute.label}</span>
          {panel.primaryRoute.description ? (
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              {panel.primaryRoute.description}
            </span>
          ) : null}
        </a>
      ) : null}
    </main>
  );
}

function MobileActionPreviewList({
  actions,
}: {
  readonly actions: readonly MobileActionCandidate[];
}) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <aside className="mx-auto w-full max-w-md px-4 pb-28 pb-24">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Preview actions</h2>
          <MobileBadgeList badges={[mobileShellNoRightsBadge]} />
        </div>

        {actions.map((action) => (
          <article
            key={action.id}
            className="rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{action.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {action.description}
                </p>
              </div>

              <MobileBadgeList
                badges={[
                  {
                    label: getStatusLabel(action.status),
                    tone: action.status === "future_gated" ? "warning" : "muted",
                    status: action.status,
                  },
                ]}
              />
            </div>

            <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
              {action.durationLabel ? <span>Duration: {action.durationLabel}</span> : null}
              {action.energyLabel ? <span>Energy: {action.energyLabel}</span> : null}
              {action.placeLabel ? <span>Place: {action.placeLabel}</span> : null}
            </div>

            <MobileBadgeList badges={action.badges} />

            {action.disabledReason ? (
              <p className="mt-3 rounded-xl border border-border bg-background px-3 py-2 text-xs leading-5 text-muted-foreground">
                {action.disabledReason}
              </p>
            ) : null}

            {action.routeTarget ? (
              <a
                href={action.routeTarget.href}
                className="mt-3 block text-sm font-medium text-primary"
                aria-label={action.routeTarget.label}
              >
                {action.routeTarget.label}
              </a>
            ) : null}
          </article>
        ))}
      </div>
    </aside>
  );
}

function MobileBottomTabs({
  activeTabKey,
  tabs,
}: {
  readonly activeTabKey: MobileTabKey;
  readonly tabs: readonly MobileTabItem[];
}) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-3 pb-4 pt-2 backdrop-blur"
      aria-label="Mobile shell tab navigation"
    >
      <div className="mx-auto flex w-full max-w-md gap-1 rounded-2xl border border-border bg-card p-1 shadow-sm pb-24">
        {tabs.map((tab) => (
          <a
            key={tab.key}
            href={getMobileTabHref(tab.key)}
            className={getTabClassName(tab, activeTabKey)}
            aria-label={tab.ariaLabel}
            aria-current={tab.key === activeTabKey ? "page" : undefined}
          >
            <span className="truncate">{tab.shortLabel}</span>
            <span className="text-xs font-normal">{getStatusLabel(tab.status)}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}

export function MobileShell({ activeTabKey = mobileShellDefaultTabKey }: MobileShellProps) {
  const activeTab = getMobileTabByKey(activeTabKey);
  const activePanel = mobileShellPreviewFixture.panels[activeTab.key];
  const panelActions = getPanelActions(activeTab.key, mobileShellPreviewFixture.actions);

  return (
    <div className="min-h-dvh overflow-x-hidden bg-background text-foreground">
      <MobileHeader activeTab={activeTab} panel={activePanel} />
      <MobilePanel panel={activePanel} />
      <MobileActionPreviewList actions={panelActions} />
      <MobileBottomTabs activeTabKey={activeTab.key} tabs={mobileShellPreviewFixture.tabs} />
    </div>
  );
}

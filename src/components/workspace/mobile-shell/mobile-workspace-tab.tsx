import type {
  MobileActionCandidate,
  MobileBadge,
  MobilePanelMetric,
  MobilePanelPreview,
  MobilePanelSection,
  MobilePreviewStatus,
} from "./mobile-shell.types";

export type MobileWorkspaceTabProps = {
  readonly panel: MobilePanelPreview;
  readonly candidates: readonly MobileActionCandidate[];
  readonly noRightsBadge: MobileBadge;
};

const workspaceReviewChips = [
  "Raw input",
  "Candidate normalization",
  "Needs review",
  "Value Object candidates",
] as const;

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

function getMobileWorkspaceBadgeClassName(badge: MobileBadge): string {
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

function MobileWorkspaceBadgeList({
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
          className={getMobileWorkspaceBadgeClassName(badge)}
          title={badge.status ? getStatusLabel(badge.status) : undefined}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}

function MobileWorkspaceMetricList({
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
          <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{metric.value}</p>
          {metric.helperText ? (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {metric.helperText}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function MobileWorkspaceSectionCard({
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
        <MobileWorkspaceBadgeList badges={section.badges} />
        <MobileWorkspaceMetricList metrics={section.metrics} />
      </div>
    </section>
  );
}

function MobileWorkspaceCandidateCard({
  candidate,
}: {
  readonly candidate: MobileActionCandidate;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{candidate.title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {candidate.description}
          </p>
        </div>

        <MobileWorkspaceBadgeList
          badges={[
            {
              label: getStatusLabel(candidate.status),
              tone: candidate.status === "future_gated" ? "warning" : "muted",
              status: candidate.status,
            },
          ]}
        />
      </div>

      <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
        {candidate.durationLabel ? <span>Duration: {candidate.durationLabel}</span> : null}
        {candidate.energyLabel ? <span>Energy: {candidate.energyLabel}</span> : null}
        {candidate.placeLabel ? <span>Place: {candidate.placeLabel}</span> : null}
      </div>

      <div className="mt-3">
        <MobileWorkspaceBadgeList badges={candidate.badges} />
      </div>

      {candidate.disabledReason ? (
        <p className="mt-3 rounded-xl border border-border bg-background px-3 py-2 text-xs leading-5 text-muted-foreground">
          {candidate.disabledReason}
        </p>
      ) : null}

      {candidate.routeTarget ? (
        <a
          href={candidate.routeTarget.href}
          className="mt-3 block text-sm font-medium text-primary"
          aria-label={candidate.routeTarget.label}
        >
          {candidate.routeTarget.label}
        </a>
      ) : null}
    </article>
  );
}

export function MobileWorkspaceTab({
  panel,
  candidates,
  noRightsBadge,
}: MobileWorkspaceTabProps) {
  return (
    <main className="mx-auto w-full max-w-md px-4 pb-28 pt-4">
      <section className="rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Workspace / Activity review preview
          </p>

          <h2 className="text-lg font-semibold text-foreground">{panel.title}</h2>

          <p className="text-sm leading-6 text-muted-foreground">{panel.subtitle}</p>
        </div>

        <div className="mt-4 rounded-xl border border-border bg-background px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Active workspace context
          </p>
          <p className="mt-1 text-sm leading-6 text-foreground">{panel.contextLabel}</p>
        </div>

        {panel.helperText ? (
          <p className="mt-4 rounded-xl border border-border bg-background px-3 py-2 text-sm leading-6 text-muted-foreground">
            {panel.helperText}
          </p>
        ) : null}

        <div className="mt-4">
          <MobileWorkspaceBadgeList
            badges={[
              noRightsBadge,
              {
                label: getStatusLabel(panel.status),
                tone: panel.status === "needs_review" ? "warning" : "muted",
                status: panel.status,
              },
            ]}
          />
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm">
        <h3 className="text-sm font-semibold text-foreground">Activity capture preview</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          This card shows raw input, candidate normalization, and Value Object candidates. It is a review preview only and does not save an activity event in UI-16.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {workspaceReviewChips.map((chip) => (
            <span
              key={chip}
              className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
            >
              {chip}
            </span>
          ))}
        </div>
      </section>

      <div className="mt-4 space-y-3">
        {panel.sections.map((section) => (
          <MobileWorkspaceSectionCard key={section.title} section={section} />
        ))}
      </div>

      <section className="mt-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">Workspace candidates</h3>
          <MobileWorkspaceBadgeList badges={[noRightsBadge]} />
        </div>

        {candidates.slice(0, 3).map((candidate) => (
          <MobileWorkspaceCandidateCard key={candidate.id} candidate={candidate} />
        ))}
      </section>

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

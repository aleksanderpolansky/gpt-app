import type {
  MobileActionCandidate,
  MobileBadge,
  MobilePanelPreview,
  MobilePanelSection,
  MobilePreviewStatus,
} from "./mobile-shell.types";

export type MobileActionsTabProps = {
  readonly panel: MobilePanelPreview;
  readonly candidates: readonly MobileActionCandidate[];
  readonly noRightsBadge: MobileBadge;
};

const mobileActionGroups = [
  {
    title: "Record activity",
    description: "Prepare an activity preview card without saving an activity event.",
    statusLabel: "Preview only",
  },
  {
    title: "Food note",
    description: "Prepare a food note candidate without storing nutrition data.",
    statusLabel: "Future gate",
  },
  {
    title: "Short workout",
    description: "Show a movement candidate for a short free window.",
    statusLabel: "Signal",
  },
  {
    title: "Purchase confirmation",
    description: "Show a commercial reminder without submitting a confirmation request.",
    statusLabel: "Read-only",
  },
  {
    title: "Next best action",
    description: "Explain a candidate action without treating it as a command.",
    statusLabel: "Candidate",
  },
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

function getMobileActionsBadgeClassName(badge: MobileBadge): string {
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

function MobileActionsBadgeList({
  badges,
}: {
  readonly badges?: readonly MobileBadge[];
}) {
  if (!badges || badges.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 w-full">
      {badges.map((badge) => (
        <span
          key={`${badge.label}-${badge.status ?? "status"}`}
          className={getMobileActionsBadgeClassName(badge)}
          title={badge.status ? getStatusLabel(badge.status) : undefined}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}

function MobileActionsSectionCard({
  section,
}: {
  readonly section: MobilePanelSection;
}) {
  return (
    <section className="rounded-2xl overflow-hidden border border-border bg-card p-4 text-card-foreground shadow-sm break-words w-full">
      <div className="space-y-2 w-full">
        <h3 className="text-sm font-semibold text-foreground w-full">{section.title}</h3>
        <p className="text-sm leading-6 text-muted-foreground w-full">{section.body}</p>
      </div>

      <div className="mt-3 w-full">
        <MobileActionsBadgeList badges={section.badges} />
      </div>
    </section>
  );
}

function MobileActionGroupCard({
  group,
}: {
  readonly group: (typeof mobileActionGroups)[number];
}) {
  return (
    <article className="rounded-2xl overflow-hidden border border-border bg-card p-4 text-card-foreground shadow-sm break-words w-full">
      <div className="flex items-start justify-between gap-3 w-full">
        <div className="min-w-0 w-full">
          <h3 className="text-sm font-semibold text-foreground w-full">{group.title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground w-full">
            {group.description}
          </p>
        </div>

        <MobileActionsBadgeList
          badges={[
            {
              label: group.statusLabel,
              tone: group.statusLabel === "Signal" ? "primary" : "muted",
              status: group.statusLabel === "Signal" ? "signal" : "preview_only",
            },
          ]}
        />
      </div>
    </article>
  );
}

function MobileActionCandidateCard({
  candidate,
}: {
  readonly candidate: MobileActionCandidate;
}) {
  return (
    <article className="rounded-2xl overflow-hidden border border-border bg-card p-4 text-card-foreground shadow-sm break-words w-full">
      <div className="flex items-start justify-between gap-3 w-full">
        <div className="min-w-0 w-full">
          <h3 className="text-sm font-semibold text-foreground w-full">{candidate.title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground w-full">
            {candidate.description}
          </p>
        </div>

        <MobileActionsBadgeList
          badges={[
            {
              label: getStatusLabel(candidate.status),
              tone: candidate.status === "future_gated" ? "warning" : "muted",
              status: candidate.status,
            },
          ]}
        />
      </div>

      <div className="mt-3 grid gap-1 text-xs text-muted-foreground w-full">
        {candidate.durationLabel ? <span>Duration: {candidate.durationLabel}</span> : null}
        {candidate.energyLabel ? <span>Energy: {candidate.energyLabel}</span> : null}
        {candidate.placeLabel ? <span>Place: {candidate.placeLabel}</span> : null}
      </div>

      <div className="mt-3 w-full">
        <MobileActionsBadgeList badges={candidate.badges} />
      </div>

      {candidate.disabledReason ? (
        <p className="mt-3 rounded-xl border border-border bg-background px-3 py-2 text-xs leading-5 text-muted-foreground break-words w-full">
          {candidate.disabledReason}
        </p>
      ) : null}

      {candidate.routeTarget ? (
        <a
          href={candidate.routeTarget.href}
          className="mt-3 block text-sm font-medium text-primary w-full"
          aria-label={candidate.routeTarget.label}
        >
          {candidate.routeTarget.label}
        </a>
      ) : null}
    </article>
  );
}

export function MobileActionsTab({
  panel,
  candidates,
  noRightsBadge,
}: MobileActionsTabProps) {
  return (
    <main className="mx-auto w-full max-w-md px-4 pb-28 pt-4">
      <section className="rounded-2xl overflow-hidden border border-border bg-card p-4 text-card-foreground shadow-sm break-words w-full">
        <div className="space-y-2 w-full">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground w-full">
            Actions / Preview-only quick actions
          </p>

          <h2 className="text-lg font-semibold text-foreground w-full">{panel.title}</h2>

          <p className="text-sm leading-6 text-muted-foreground w-full">{panel.subtitle}</p>
        </div>

        <div className="mt-4 rounded-xl border border-border bg-background px-3 py-2 break-words w-full">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground w-full">
            Action menu context
          </p>
          <p className="mt-1 text-sm leading-6 text-foreground w-full">{panel.contextLabel}</p>
        </div>

        {panel.helperText ? (
          <p className="mt-4 rounded-xl border border-border bg-background px-3 py-2 text-sm leading-6 text-muted-foreground break-words w-full">
            {panel.helperText}
          </p>
        ) : null}

        <div className="mt-4 w-full">
          <MobileActionsBadgeList
            badges={[
              noRightsBadge,
              {
                label: getStatusLabel(panel.status),
                tone: panel.status === "future_gated" ? "warning" : "muted",
                status: panel.status,
              },
            ]}
          />
        </div>
      </section>

      <section className="mt-4 rounded-2xl overflow-hidden border border-border bg-card p-4 text-card-foreground shadow-sm break-words w-full">
        <h3 className="text-sm font-semibold text-foreground w-full">Quick action boundary</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground w-full">
          These quick actions are visible as preview-only cards. They do not record activity, food, workout, purchase confirmation, calendar events, points, or next-best-action results in UI-16.
        </p>

        <div className="mt-3 w-full">
          <MobileActionsBadgeList
            badges={[
              {
                label: "No hidden writes",
                tone: "warning",
                status: "no_rights",
              },
              {
                label: "Future gated",
                tone: "muted",
                status: "future_gated",
              },
            ]}
          />
        </div>
      </section>

      <section className="mt-4 space-y-3 w-full">
        <div className="flex items-center justify-between gap-3 w-full">
          <h3 className="text-sm font-semibold text-foreground w-full">Quick action types</h3>
          <MobileActionsBadgeList badges={[noRightsBadge]} />
        </div>

        {mobileActionGroups.map((group) => (
          <MobileActionGroupCard key={group.title} group={group} />
        ))}
      </section>

      <div className="mt-4 space-y-3 w-full">
        {panel.sections.map((section) => (
          <MobileActionsSectionCard key={section.title} section={section} />
        ))}
      </div>

      <section className="mt-4 space-y-3 w-full">
        <div className="flex items-center justify-between gap-3 w-full">
          <h3 className="text-sm font-semibold text-foreground w-full">Action candidates</h3>
          <MobileActionsBadgeList badges={[noRightsBadge]} />
        </div>

        {candidates.slice(0, 6).map((candidate) => (
          <MobileActionCandidateCard key={candidate.id} candidate={candidate} />
        ))}
      </section>

      {panel.primaryRoute ? (
        <a
          href={panel.primaryRoute.href}
          className="mt-4 block rounded-2xl overflow-hidden border border-border bg-card p-4 text-sm font-medium text-primary shadow-sm break-words w-full"
          aria-label={panel.primaryRoute.label}
        >
          <span>{panel.primaryRoute.label}</span>
          {panel.primaryRoute.description ? (
            <span className="mt-1 block text-xs font-normal text-muted-foreground w-full">
              {panel.primaryRoute.description}
            </span>
          ) : null}
        </a>
      ) : null}
    </main>
  );
}

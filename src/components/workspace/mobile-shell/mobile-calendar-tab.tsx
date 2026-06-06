import type {
  MobileActionCandidate,
  MobileBadge,
  MobilePanelPreview,
  MobilePanelSection,
  MobilePreviewStatus,
} from "./mobile-shell.types";

export type MobileCalendarTabProps = {
  readonly panel: MobilePanelPreview;
  readonly candidates: readonly MobileActionCandidate[];
  readonly noRightsBadge: MobileBadge;
};

const calendarWindowCards = [
  {
    title: "Morning work block",
    timeLabel: "06:30-11:30",
    description: "Busy signal for focused work. Calendar data is shown as a static mobile preview.",
    statusLabel: "Busy",
  },
  {
    title: "20-minute free window",
    timeLabel: "11:30-11:50",
    description: "Candidate slot for language repetition, activity review, or a short workout.",
    statusLabel: "Free window",
  },
  {
    title: "Family context block",
    timeLabel: "17:00-18:00",
    description: "Constraint signal for family time and low-noise actions.",
    statusLabel: "Constraint",
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

function getMobileCalendarBadgeClassName(badge: MobileBadge): string {
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

function MobileCalendarBadgeList({
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
          className={getMobileCalendarBadgeClassName(badge)}
          title={badge.status ? getStatusLabel(badge.status) : undefined}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}

function MobileCalendarSectionCard({
  section,
}: {
  readonly section: MobilePanelSection;
}) {
  return (
    <section className="rounded-2xl overflow-hidden border border-border bg-card p-4 text-card-foreground shadow-sm break-words">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
        <p className="text-sm leading-6 text-muted-foreground">{section.body}</p>
      </div>

      <div className="mt-3">
        <MobileCalendarBadgeList badges={section.badges} />
      </div>
    </section>
  );
}

function MobileCalendarWindowCard({
  windowCard,
}: {
  readonly windowCard: (typeof calendarWindowCards)[number];
}) {
  return (
    <article className="rounded-2xl overflow-hidden border border-border bg-card p-4 text-card-foreground shadow-sm break-words">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{windowCard.title}</h3>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            {windowCard.timeLabel}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {windowCard.description}
          </p>
        </div>

        <MobileCalendarBadgeList
          badges={[
            {
              label: windowCard.statusLabel,
              tone: windowCard.statusLabel === "Free window" ? "primary" : "muted",
              status: windowCard.statusLabel === "Free window" ? "signal" : "read_only",
            },
          ]}
        />
      </div>
    </article>
  );
}

function MobileCalendarCandidateCard({
  candidate,
}: {
  readonly candidate: MobileActionCandidate;
}) {
  return (
    <article className="rounded-2xl overflow-hidden border border-border bg-card p-4 text-card-foreground shadow-sm break-words">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{candidate.title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {candidate.description}
          </p>
        </div>

        <MobileCalendarBadgeList
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
        <MobileCalendarBadgeList badges={candidate.badges} />
      </div>

      {candidate.disabledReason ? (
        <p className="mt-3 rounded-xl border border-border bg-background px-3 py-2 text-xs leading-5 text-muted-foreground break-words">
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

export function MobileCalendarTab({
  panel,
  candidates,
  noRightsBadge,
}: MobileCalendarTabProps) {
  return (
    <main className="mx-auto w-full max-w-md px-4 pb-28 pt-4">
      <section className="rounded-2xl overflow-hidden border border-border bg-card p-4 text-card-foreground shadow-sm break-words">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Calendar / Free window preview
          </p>

          <h2 className="text-lg font-semibold text-foreground">{panel.title}</h2>

          <p className="text-sm leading-6 text-muted-foreground">{panel.subtitle}</p>
        </div>

        <div className="mt-4 rounded-xl border border-border bg-background px-3 py-2 break-words">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Today blocks
          </p>
          <p className="mt-1 text-sm leading-6 text-foreground">{panel.contextLabel}</p>
        </div>

        {panel.helperText ? (
          <p className="mt-4 rounded-xl border border-border bg-background px-3 py-2 text-sm leading-6 text-muted-foreground break-words">
            {panel.helperText}
          </p>
        ) : null}

        <div className="mt-4">
          <MobileCalendarBadgeList
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

      <section className="mt-4 rounded-2xl overflow-hidden border border-border bg-card p-4 text-card-foreground shadow-sm break-words">
        <h3 className="text-sm font-semibold text-foreground">Free window and suggested action slots</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Calendar blocks are displayed as read-only signals. This tab can show a 20-minute free window and suggested action slots, but it does not create calendar events in UI-16.
        </p>

        <div className="mt-3">
          <MobileCalendarBadgeList
            badges={[
              {
                label: "Calendar read-only",
                tone: "muted",
                status: "read_only",
              },
              {
                label: "Suggested action slots",
                tone: "primary",
                status: "signal",
              },
            ]}
          />
        </div>
      </section>

      <section className="mt-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">Today blocks</h3>
          <MobileCalendarBadgeList badges={[noRightsBadge]} />
        </div>

        {calendarWindowCards.map((windowCard) => (
          <MobileCalendarWindowCard key={`${windowCard.title}-${windowCard.timeLabel}`} windowCard={windowCard} />
        ))}
      </section>

      <div className="mt-4 space-y-3">
        {panel.sections.map((section) => (
          <MobileCalendarSectionCard key={section.title} section={section} />
        ))}
      </div>

      <section className="mt-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">Calendar candidates</h3>
          <MobileCalendarBadgeList badges={[noRightsBadge]} />
        </div>

        {candidates.slice(0, 3).map((candidate) => (
          <MobileCalendarCandidateCard key={candidate.id} candidate={candidate} />
        ))}
      </section>

      {panel.primaryRoute ? (
        <a
          href={panel.primaryRoute.href}
          className="mt-4 block rounded-2xl overflow-hidden border border-border bg-card p-4 text-sm font-medium text-primary shadow-sm break-words"
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

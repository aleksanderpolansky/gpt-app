import type {
  MobileActionCandidate,
  MobileBadge,
  MobilePanelPreview,
  MobilePanelSection,
  MobilePreviewStatus,
} from "./mobile-shell.types";

export type MobileAiTabProps = {
  readonly panel: MobilePanelPreview;
  readonly actions: readonly MobileActionCandidate[];
  readonly noRightsBadge: MobileBadge;
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

function getMobileAiBadgeClassName(badge: MobileBadge): string {
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

function MobileAiBadgeList({
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
          className={getMobileAiBadgeClassName(badge)}
          title={badge.status ? getStatusLabel(badge.status) : undefined}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}

function MobileAiSectionCard({
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
        <MobileAiBadgeList badges={section.badges} />
      </div>
    </section>
  );
}

function MobileAiActionCard({
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

        <MobileAiBadgeList
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
        <MobileAiBadgeList badges={candidate.badges} />
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

export function MobileAiTab({ panel, actions, noRightsBadge }: MobileAiTabProps) {
  return (
    <main className="mx-auto w-full max-w-md px-4 pb-28 pt-4">
      <section className="rounded-2xl overflow-hidden border border-border bg-card p-4 text-card-foreground shadow-sm break-words">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Contextual AI / Mobile tab
          </p>

          <h2 className="text-lg font-semibold text-foreground">{panel.title}</h2>

          <p className="text-sm leading-6 text-muted-foreground">{panel.subtitle}</p>
        </div>

        <div className="mt-4 rounded-xl border border-border bg-background px-3 py-2 break-words">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Active context
          </p>
          <p className="mt-1 text-sm leading-6 text-foreground">{panel.contextLabel}</p>
        </div>

        {panel.helperText ? (
          <p className="mt-4 rounded-xl border border-border bg-background px-3 py-2 text-sm leading-6 text-muted-foreground break-words">
            {panel.helperText}
          </p>
        ) : null}

        <div className="mt-4">
          <MobileAiBadgeList
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
        <h3 className="text-sm font-semibold text-foreground">AI scope boundary</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          This panel is scoped to the active mobile tab and selected context. It can explain
          signals, warnings, and preview actions. It is not a generic chat. This panel does not execute writes in UI-16.
        </p>
        <div className="mt-3">
          <MobileAiBadgeList
            badges={[
              {
                label: "No hidden writes",
                tone: "warning",
                status: "no_rights",
              },
              {
                label: "Preview only",
                tone: "muted",
                status: "preview_only",
              },
            ]}
          />
        </div>
      </section>

      <div className="mt-4 space-y-3">
        {panel.sections.map((section) => (
          <MobileAiSectionCard key={section.title} section={section} />
        ))}
      </div>

      <section className="mt-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">Preview actions</h3>
          <MobileAiBadgeList badges={[noRightsBadge]} />
        </div>

        {actions.slice(0, 3).map((candidate) => (
          <MobileAiActionCard key={candidate.id} candidate={candidate} />
        ))}
      </section>
    </main>
  );
}

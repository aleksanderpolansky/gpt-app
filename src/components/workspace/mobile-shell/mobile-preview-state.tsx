import type {
  MobileBadge,
  MobilePreviewStatus,
  MobileRouteTarget,
} from "./mobile-shell.types";

export type MobilePreviewStateVariant = "preview_only" | "no_rights" | "future_gated";

export type MobilePreviewStateProps = {
  readonly title: string;
  readonly description: string;
  readonly variant?: MobilePreviewStateVariant;
  readonly badges?: readonly MobileBadge[];
  readonly routeTarget?: MobileRouteTarget;
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

function getDefaultBadge(variant: MobilePreviewStateVariant): MobileBadge {
  switch (variant) {
    case "no_rights":
      return {
        label: "No hidden writes",
        tone: "warning",
        status: "no_rights",
      };
    case "future_gated":
      return {
        label: "Future gated",
        tone: "warning",
        status: "future_gated",
      };
    case "preview_only":
    default:
      return {
        label: "Preview only",
        tone: "muted",
        status: "preview_only",
      };
  }
}

function getMobilePreviewStateBadgeClassName(badge: MobileBadge): string {
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

function MobilePreviewStateBadgeList({
  badges,
}: {
  readonly badges: readonly MobileBadge[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <span
          key={`${badge.label}-${badge.status ?? "status"}`}
          className={getMobilePreviewStateBadgeClassName(badge)}
          title={badge.status ? getStatusLabel(badge.status) : undefined}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}

export function MobilePreviewState({
  title,
  description,
  variant = "preview_only",
  badges = [],
  routeTarget,
}: MobilePreviewStateProps) {
  const defaultBadge = getDefaultBadge(variant);
  const visibleBadges = [defaultBadge, ...badges];

  return (
    <section
      className="rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm"
      aria-label="NoRights/PreviewOnly state"
    >
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Preview-only boundary
        </p>

        <h3 className="text-sm font-semibold text-foreground">{title}</h3>

        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      <p className="mt-4 rounded-xl border border-border bg-background px-3 py-2 text-xs leading-5 text-muted-foreground">
        This mobile state is visible information only. It does not run, save, submit, sync, or mutate data in UI-16.
      </p>

      <div className="mt-3">
        <MobilePreviewStateBadgeList badges={visibleBadges} />
      </div>

      {routeTarget ? (
        <a
          href={routeTarget.href}
          className="mt-3 block text-sm font-medium text-primary"
          aria-label={routeTarget.label}
        >
          {routeTarget.label}
          {routeTarget.description ? (
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              {routeTarget.description}
            </span>
          ) : null}
        </a>
      ) : null}
    </section>
  );
}

export function MobileNoRightsState({
  title = "No hidden writes",
  description = "This area explains a disabled or read-only mobile state without executing any backend or client mutation.",
  badges,
  routeTarget,
}: Partial<MobilePreviewStateProps>) {
  return (
    <MobilePreviewState
      title={title}
      description={description}
      variant="no_rights"
      badges={badges}
      routeTarget={routeTarget}
    />
  );
}

export function MobilePreviewOnlyState({
  title = "Preview only",
  description = "This area is available for reading and review only. Saving or submitting requires a later explicit gate.",
  badges,
  routeTarget,
}: Partial<MobilePreviewStateProps>) {
  return (
    <MobilePreviewState
      title={title}
      description={description}
      variant="preview_only"
      badges={badges}
      routeTarget={routeTarget}
    />
  );
}

export function MobileFutureGateState({
  title = "Future gated",
  description = "This action is visible as a planned flow, but execution is outside the UI-16 mobile shell.",
  badges,
  routeTarget,
}: Partial<MobilePreviewStateProps>) {
  return (
    <MobilePreviewState
      title={title}
      description={description}
      variant="future_gated"
      badges={badges}
      routeTarget={routeTarget}
    />
  );
}

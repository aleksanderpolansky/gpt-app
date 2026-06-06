import type {
  MobileBadge,
  MobilePreviewStatus,
  MobileRouteTarget,
} from "./mobile-shell.types";

export type MobileFeedbackStateVariant = "empty" | "loading" | "error";

export type MobileFeedbackStateProps = {
  readonly variant?: MobileFeedbackStateVariant;
  readonly title?: string;
  readonly description?: string;
  readonly badges?: readonly MobileBadge[];
  readonly routeTarget?: MobileRouteTarget;
};

type MobileFeedbackStatePreset = {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly badge: MobileBadge;
};

const mobileFeedbackStatePresets: Readonly<
  Record<MobileFeedbackStateVariant, MobileFeedbackStatePreset>
> = {
  empty: {
    eyebrow: "Empty state",
    title: "No data available",
    description:
      "No preview data is shown for this mobile panel yet. The shell stays readable at 390px and waits for a later data source.",
    badge: {
      label: "Empty",
      tone: "muted",
      status: "preview_only",
    },
  },
  loading: {
    eyebrow: "Loading state",
    title: "Loading mobile preview",
    description:
      "The mobile shell can show a loading placeholder without calling a backend from this component.",
    badge: {
      label: "Loading",
      tone: "primary",
      status: "signal",
    },
  },
  error: {
    eyebrow: "Error state",
    title: "Preview error",
    description:
      "The mobile shell can show a readable error card without retry handlers or hidden writes.",
    badge: {
      label: "Needs review",
      tone: "warning",
      status: "needs_review",
    },
  },
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

function getMobileFeedbackBadgeClassName(badge: MobileBadge): string {
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

function MobileFeedbackBadgeList({
  badges,
}: {
  readonly badges: readonly MobileBadge[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <span
          key={`${badge.label}-${badge.status ?? "status"}`}
          className={getMobileFeedbackBadgeClassName(badge)}
          title={badge.status ? getStatusLabel(badge.status) : undefined}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}

export function MobileFeedbackState({
  variant = "empty",
  title,
  description,
  badges = [],
  routeTarget,
}: MobileFeedbackStateProps) {
  const preset = mobileFeedbackStatePresets[variant];
  const visibleBadges = [preset.badge, ...badges];

  return (
    <section
      className="rounded-2xl overflow-hidden border border-border bg-card p-4 text-card-foreground shadow-sm break-words"
      aria-label={`${preset.eyebrow} / mobile shell feedback`}
      role={variant === "error" ? "alert" : undefined}
    >
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {preset.eyebrow}
        </p>

        <h3 className="text-sm font-semibold text-foreground">{title ?? preset.title}</h3>

        <p className="text-sm leading-6 text-muted-foreground">
          {description ?? preset.description}
        </p>
      </div>

      {variant === "loading" ? (
        <div
          className="mt-4 rounded-xl border border-border bg-background px-3 py-2 text-xs leading-5 text-muted-foreground break-words"
          role="status"
          aria-live="polite"
        >
          Loading mobile preview
        </div>
      ) : null}

      {variant === "error" ? (
        <p className="mt-4 rounded-xl border border-border bg-background px-3 py-2 text-xs leading-5 text-muted-foreground break-words">
          Preview error
        </p>
      ) : null}

      <p className="mt-4 rounded-xl border border-border bg-background px-3 py-2 text-xs leading-5 text-muted-foreground break-words">
        This feedback state is presentational only. It does not fetch, retry, save, submit, sync, or mutate data in UI-16.
      </p>

      <div className="mt-3">
        <MobileFeedbackBadgeList badges={visibleBadges} />
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

export function MobileEmptyState(props: Omit<MobileFeedbackStateProps, "variant">) {
  return <MobileFeedbackState {...props} variant="empty" />;
}

export function MobileLoadingState(props: Omit<MobileFeedbackStateProps, "variant">) {
  return <MobileFeedbackState {...props} variant="loading" />;
}

export function MobileErrorState(props: Omit<MobileFeedbackStateProps, "variant">) {
  return <MobileFeedbackState {...props} variant="error" />;
}

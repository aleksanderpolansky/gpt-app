/* UI-16 mobile safe area is presentational only; it adds layout clearance without runtime writes. */
import type { MobileBadge, MobilePreviewStatus } from "./mobile-shell.types";

export type MobileSafeAreaFrameProps = {
  readonly children: React.ReactNode;
  readonly label?: string;
};

export type MobileSafeAreaContentProps = {
  readonly children: React.ReactNode;
  readonly label?: string;
};

export type MobileSafeAreaNoticeProps = {
  readonly title?: string;
  readonly description?: string;
  readonly badge?: MobileBadge;
};

const defaultSafeAreaBadge: MobileBadge = {
  label: "390px ready",
  tone: "primary",
  status: "signal",
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

function getMobileSafeAreaBadgeClassName(badge: MobileBadge): string {
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

function MobileSafeAreaBadge({ badge }: { readonly badge: MobileBadge }) {
  return (
    <span
      className={getMobileSafeAreaBadgeClassName(badge)}
      title={badge.status ? getStatusLabel(badge.status) : undefined}
    >
      {badge.label}
    </span>
  );
}

export function MobileSafeAreaFrame({
  children,
  label = "Mobile safe area frame",
}: MobileSafeAreaFrameProps) {
  return (
    <div
      className="min-h-dvh overflow-x-hidden bg-background text-foreground"
      aria-label={label}
    >
      {children}
    </div>
  );
}

export function MobileSafeAreaContent({
  children,
  label = "Mobile safe area content",
}: MobileSafeAreaContentProps) {
  return (
    <main
      className="mx-auto w-full max-w-md px-4 pb-28 pt-4"
      aria-label={label}
    >
      {children}
    </main>
  );
}

export function MobileSafeAreaBottomSpacer() {
  return (
    <div
      className="h-28 shrink-0"
      aria-hidden="true"
      data-mobile-safe-area="bottom-tabs-spacer"
    />
  );
}

export function MobileSafeAreaBottomTabsFrame({
  children,
  label = "Mobile safe area bottom tabs frame",
}: MobileSafeAreaFrameProps) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background px-4 pb-4 pt-3"
      aria-label={label}
    >
      <div className="mx-auto w-full max-w-md">{children}</div>
    </div>
  );
}

export function MobileSafeAreaNotice({
  title = "Mobile safe area",
  description = "This mobile shell keeps a 390px readable frame, bottom tab spacing, and no horizontal overflow without inline styles or arbitrary Tailwind colors.",
  badge = defaultSafeAreaBadge,
}: MobileSafeAreaNoticeProps) {
  return (
    <section
      className="rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm"
      aria-label="Mobile safe area notice"
    >
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Safe area boundary
        </p>

        <h3 className="text-sm font-semibold text-foreground">{title}</h3>

        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      <p className="mt-4 rounded-xl border border-border bg-background px-3 py-2 text-xs leading-5 text-muted-foreground">
        This safe area helper does not write, save, submit, sync, mutate data, or call runtime APIs in UI-16.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <MobileSafeAreaBadge badge={badge} />
        <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          No horizontal overflow
        </span>
        <span className="inline-flex items-center rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-primary">
          Bottom tabs spacing
        </span>
      </div>
    </section>
  );
}

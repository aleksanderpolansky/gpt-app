import type {
  MobileBadge,
  MobileHeaderContext,
  MobilePanelPreview,
  MobilePreviewStatus,
  MobileTabItem,
} from "./mobile-shell.types";

export type MobileHeaderProps = {
  readonly activeTab: MobileTabItem;
  readonly panel: MobilePanelPreview;
  readonly headerContext: MobileHeaderContext;
  readonly previewBadge: MobileBadge;
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

function getMobileHeaderBadgeClassName(badge: MobileBadge): string {
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

function MobileHeaderBadgeList({
  badges,
}: {
  readonly badges: readonly MobileBadge[];
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {badges.map((badge) => (
        <span
          key={`${badge.label}-${badge.status ?? "status"}`}
          className={getMobileHeaderBadgeClassName(badge)}
          title={badge.status ? getStatusLabel(badge.status) : undefined}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}

export function MobileHeader({
  activeTab,
  panel,
  headerContext,
  previewBadge,
}: MobileHeaderProps) {
  return (
    <header aria-label="Mobile shell header" className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-4 text-foreground backdrop-blur">
      <div className="mx-auto flex w-full max-w-md items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            AI-NAVIGATOR / Mobile
          </p>

          <h1 className="mt-1 truncate text-xl font-semibold text-foreground">
            {activeTab.label}
          </h1>

          <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
            {panel.contextLabel}
          </p>

          <p className="mt-2 text-xs text-muted-foreground">
            {headerContext.readOnlyLabel}
          </p>
        </div>

        <div className="shrink-0">
          <MobileHeaderBadgeList
            badges={[
              previewBadge,
              headerContext.contextBadge,
              {
                label: getStatusLabel(panel.status),
                tone: panel.status === "needs_review" ? "warning" : "muted",
                status: panel.status,
              },
            ]}
          />
        </div>
      </div>
    </header>
  );
}

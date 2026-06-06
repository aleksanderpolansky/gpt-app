/* UI-16 mobile tab keys: ai workspace objects calendar actions. Presentational route keys only; no runtime writes. */
import { getMobileTabHref } from "./mobile-route-registry";
import type {
  MobilePreviewStatus,
  MobileTabItem,
  MobileTabKey,
} from "./mobile-shell.types";

export type MobileTabsProps = {
  readonly activeTabKey: MobileTabKey;
  readonly tabs: readonly MobileTabItem[];
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

function getMobileTabClassName(tab: MobileTabItem, activeTabKey: MobileTabKey): string {
  const baseClassName =
    "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-center text-xs font-medium transition";

  if (tab.key === activeTabKey) {
    return `${baseClassName} bg-secondary text-primary`;
  }

  return `${baseClassName} text-muted-foreground`;
}

export function MobileTabs({ activeTabKey, tabs }: MobileTabsProps) {
  return (
    <nav
      className="grid grid-cols-5 fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-3 pb-4 pt-2 backdrop-blur"
      aria-label="Mobile shell tab navigation"
    >
      <div className="grid grid-cols-5 mx-auto flex w-full max-w-md gap-1 rounded-2xl border border-border bg-card p-1 shadow-sm">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTabKey;

          return (
            <a
              key={tab.key}
              href={getMobileTabHref(tab.key)}
              className={getMobileTabClassName(tab, activeTabKey)}
              aria-label={tab.ariaLabel}
              aria-current={isActive ? "page" : undefined}
              title={tab.description}
            >
              <span className="grid grid-cols-5 w-full truncate">{tab.shortLabel}</span>
              <span className="grid grid-cols-5 w-full truncate text-xs font-normal">
                {getStatusLabel(tab.status)}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}

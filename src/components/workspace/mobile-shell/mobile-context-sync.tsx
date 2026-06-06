import {
  mobileShellRoutePath,
  mobileShellRouteTargets,
} from "./mobile-route-registry";
import type {
  MobileBadge,
  MobilePreviewStatus,
  MobileTabKey,
} from "./mobile-shell.types";

export type MobileContextSyncScope =
  | "active_tab"
  | "header"
  | "ai_context"
  | "preview_boundary"
  | "navigation_link";

export type MobileContextSyncItem = {
  readonly id: string;
  readonly tabKey: MobileTabKey;
  readonly scope: MobileContextSyncScope;
  readonly title: string;
  readonly contextLabel: string;
  readonly description: string;
  readonly href: string;
  readonly badge: MobileBadge;
};

export type MobileContextSyncProps = {
  readonly title?: string;
  readonly description?: string;
  readonly items?: readonly MobileContextSyncItem[];
};

export const mobileContextSyncItems = [
  {
    id: "ai-context-sync",
    tabKey: "ai",
    scope: "ai_context",
    title: "AI context sync",
    contextLabel: "Active tab: AI",
    description:
      "The AI tab receives contextual mobile scope from the selected tab, not a generic chat context.",
    href: mobileShellRouteTargets.ai.href,
    badge: {
      label: "Contextual AI",
      tone: "primary",
      status: "signal",
    },
  },
  {
    id: "workspace-context-sync",
    tabKey: "workspace",
    scope: "active_tab",
    title: "Workspace context sync",
    contextLabel: "Active tab: Workspace",
    description:
      "Workspace context points to activity capture and review preview without saving an activity event.",
    href: mobileShellRouteTargets.workspace.href,
    badge: {
      label: "Preview only",
      tone: "muted",
      status: "preview_only",
    },
  },
  {
    id: "objects-context-sync",
    tabKey: "objects",
    scope: "active_tab",
    title: "Objects context sync",
    contextLabel: "Active tab: Objects",
    description:
      "Objects context points to read-only Value Object candidates and relation hints.",
    href: mobileShellRouteTargets.objects.href,
    badge: {
      label: "Read-only",
      tone: "muted",
      status: "read_only",
    },
  },
  {
    id: "calendar-context-sync",
    tabKey: "calendar",
    scope: "active_tab",
    title: "Calendar context sync",
    contextLabel: "Active tab: Calendar",
    description:
      "Calendar context points to today blocks, free window signals, and suggested action slots.",
    href: mobileShellRouteTargets.calendar.href,
    badge: {
      label: "Signal",
      tone: "primary",
      status: "signal",
    },
  },
  {
    id: "actions-context-sync",
    tabKey: "actions",
    scope: "preview_boundary",
    title: "Actions context sync",
    contextLabel: "Active tab: Actions",
    description:
      "Actions context points to quick action candidates without executing activity, food, workout, purchase, calendar, points, or next-best-action flows.",
    href: mobileShellRouteTargets.actions.href,
    badge: {
      label: "Future gated",
      tone: "warning",
      status: "future_gated",
    },
  },
] as const satisfies readonly MobileContextSyncItem[];

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

function getMobileContextSyncBadgeClassName(badge: MobileBadge): string {
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

function MobileContextSyncBadge({ badge }: { readonly badge: MobileBadge }) {
  return (
    <span
      className={getMobileContextSyncBadgeClassName(badge)}
      title={badge.status ? getStatusLabel(badge.status) : undefined}
    >
      {badge.label}
    </span>
  );
}

export function MobileContextSync({
  title = "Mobile context sync",
  description = "Context sync keeps the active mobile tab, header, AI context, preview boundary, and navigation links aligned with visible text.",
  items = mobileContextSyncItems,
}: MobileContextSyncProps) {
  return (
    <section
      className="rounded-2xl overflow-hidden border border-border bg-card p-4 text-card-foreground shadow-sm break-words"
      aria-label="Mobile context sync"
    >
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Context sync contract
        </p>

        <h3 className="text-sm font-semibold text-foreground">{title}</h3>

        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      <p className="mt-4 rounded-xl border border-border bg-background px-3 py-2 text-xs leading-5 text-muted-foreground break-words">
        Mobile context sync is presentational only. It does not write, save, submit, sync, mutate data, or attach runtime handlers in UI-16.
      </p>

      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        Mobile route base: <span className="font-medium text-primary">{mobileShellRoutePath}</span>
      </p>

      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl overflow-hidden border border-border bg-background p-3 text-card-foreground break-words"
            aria-label={`${item.title} contract`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-primary">
                  {item.scope}
                </p>

                <h4 className="mt-1 text-sm font-semibold text-foreground">
                  {item.title}
                </h4>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {item.contextLabel}
                </p>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {item.description}
                </p>

                <a
                  href={item.href}
                  className="mt-2 block rounded-xl border border-border bg-muted px-3 py-2 text-xs font-medium text-primary break-words"
                  aria-label={`Open ${item.title}`}
                >
                  Open mobile context preview
                </a>
              </div>

              <MobileContextSyncBadge badge={item.badge} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

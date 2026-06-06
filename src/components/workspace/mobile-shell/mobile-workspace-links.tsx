import {
  mobileShellRoutePath,
  mobileShellRouteTargets,
} from "./mobile-route-registry";
import type {
  MobileBadge,
  MobilePreviewStatus,
  MobileTabKey,
} from "./mobile-shell.types";

export type MobileWorkspaceLinkKind =
  | "mobile_tab"
  | "workspace_bridge"
  | "preview_anchor";

export type MobileWorkspaceLinkItem = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly href: string;
  readonly ariaLabel: string;
  readonly kind: MobileWorkspaceLinkKind;
  readonly tabKey?: MobileTabKey;
  readonly badge: MobileBadge;
};

export type MobileWorkspaceLinksProps = {
  readonly title?: string;
  readonly description?: string;
  readonly links?: readonly MobileWorkspaceLinkItem[];
};

export const mobileWorkspaceLinks = [
  {
    id: "activity-capture",
    title: "Activity capture",
    description: "Open the mobile Workspace preview for raw input and activity capture review.",
    href: mobileShellRouteTargets.workspace.href,
    ariaLabel: "Open mobile Workspace activity capture preview",
    kind: "mobile_tab",
    tabKey: "workspace",
    badge: {
      label: "Preview only",
      tone: "muted",
      status: "preview_only",
    },
  },
  {
    id: "review-card",
    title: "Review card",
    description: "Inspect the mobile review card before any later save gate exists.",
    href: mobileShellRouteTargets.workspace.href,
    ariaLabel: "Open mobile Workspace review card preview",
    kind: "preview_anchor",
    tabKey: "workspace",
    badge: {
      label: "Needs review",
      tone: "warning",
      status: "needs_review",
    },
  },
  {
    id: "ai-context-review",
    title: "AI context review",
    description: "Open contextual AI for the active mobile tab without using generic chat.",
    href: mobileShellRouteTargets.ai.href,
    ariaLabel: "Open mobile AI context review",
    kind: "mobile_tab",
    tabKey: "ai",
    badge: {
      label: "Signal",
      tone: "primary",
      status: "signal",
    },
  },
  {
    id: "objects-preview",
    title: "Objects preview",
    description: "Open the read-only Value Object candidate and relation hint preview.",
    href: mobileShellRouteTargets.objects.href,
    ariaLabel: "Open mobile Objects preview",
    kind: "mobile_tab",
    tabKey: "objects",
    badge: {
      label: "Read-only",
      tone: "muted",
      status: "read_only",
    },
  },
  {
    id: "calendar-free-window",
    title: "Calendar free window",
    description: "Open the mobile Calendar preview for today blocks and free window signals.",
    href: mobileShellRouteTargets.calendar.href,
    ariaLabel: "Open mobile Calendar free window preview",
    kind: "mobile_tab",
    tabKey: "calendar",
    badge: {
      label: "Signal",
      tone: "primary",
      status: "signal",
    },
  },
  {
    id: "actions-preview",
    title: "Actions preview",
    description: "Open preview-only quick actions without executing activity, food, workout, or purchase flows.",
    href: mobileShellRouteTargets.actions.href,
    ariaLabel: "Open mobile Actions preview",
    kind: "mobile_tab",
    tabKey: "actions",
    badge: {
      label: "Future gated",
      tone: "warning",
      status: "future_gated",
    },
  },
  {
    id: "desktop-workspace-bridge",
    title: "Desktop workspace bridge",
    description: "Return to the desktop workspace shell without changing mobile state.",
    href: "/workspace",
    ariaLabel: "Open desktop Workspace bridge",
    kind: "workspace_bridge",
    badge: {
      label: "Bridge",
      tone: "muted",
      status: "read_only",
    },
  },
] as const satisfies readonly MobileWorkspaceLinkItem[];

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

function getMobileWorkspaceLinkBadgeClassName(badge: MobileBadge): string {
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

function MobileWorkspaceLinkBadge({ badge }: { readonly badge: MobileBadge }) {
  return (
    <span
      className={getMobileWorkspaceLinkBadgeClassName(badge)}
      title={badge.status ? getStatusLabel(badge.status) : undefined}
    >
      {badge.label}
    </span>
  );
}

export function MobileWorkspaceLinks({
  title = "Mobile workspace links",
  description = "Workspace links connect the mobile shell tabs and the desktop workspace bridge without executing any workflow.",
  links = mobileWorkspaceLinks,
}: MobileWorkspaceLinksProps) {
  return (
    <section
      className="rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm"
      aria-label="Mobile workspace links"
    >
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Mobile route base: {mobileShellRoutePath}
        </p>

        <h3 className="text-sm font-semibold text-foreground">{title}</h3>

        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      <p className="mt-4 rounded-xl border border-border bg-background px-3 py-2 text-xs leading-5 text-muted-foreground">
        These links navigate only. They do not write, save, submit, sync, or mutate data in UI-16.
      </p>

      <div className="mt-4 grid gap-3">
        {links.map((link) => (
          <a
            key={link.id}
            href={link.href}
            className="block rounded-2xl border border-border bg-background p-3 text-card-foreground"
            aria-label={link.ariaLabel}
          >
            <span className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">
                  {link.title}
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {link.description}
                </span>
                <span className="mt-2 block text-xs font-medium text-primary">
                  Open preview link
                </span>
              </span>

              <MobileWorkspaceLinkBadge badge={link.badge} />
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

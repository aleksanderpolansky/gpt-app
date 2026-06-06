import type {
  MobileBadge,
  MobilePreviewStatus,
  MobileTabKey,
} from "./mobile-shell.types";

export type MobileAccessibilityLabelKind =
  | "landmark"
  | "tab"
  | "link"
  | "preview_boundary"
  | "status";

export type MobileAccessibilityLabelItem = {
  readonly id: string;
  readonly kind: MobileAccessibilityLabelKind;
  readonly title: string;
  readonly ariaLabel: string;
  readonly description: string;
  readonly tabKey?: MobileTabKey;
  readonly badge: MobileBadge;
};

export type MobileAccessibilityLabelsProps = {
  readonly title?: string;
  readonly description?: string;
  readonly labels?: readonly MobileAccessibilityLabelItem[];
};

export const mobileAccessibilityLabelItems = [
  {
    id: "mobile-shell-landmark",
    kind: "landmark",
    title: "Mobile shell landmark",
    ariaLabel: "AI-NAVIGATOR mobile shell main landmark",
    description: "The mobile shell exposes a named main region for screen readers.",
    badge: {
      label: "Landmark",
      tone: "primary",
      status: "signal",
    },
  },
  {
    id: "mobile-header-label",
    kind: "landmark",
    title: "Mobile header label",
    ariaLabel: "Mobile shell context header",
    description: "The header label explains active context, selected tab, and preview-only scope.",
    badge: {
      label: "Header",
      tone: "muted",
      status: "read_only",
    },
  },
  {
    id: "ai-tab-label",
    kind: "tab",
    title: "AI tab label",
    ariaLabel: "Open AI mobile tab",
    description: "The AI tab label must describe contextual AI help, not generic chat.",
    tabKey: "ai",
    badge: {
      label: "AI",
      tone: "primary",
      status: "signal",
    },
  },
  {
    id: "workspace-tab-label",
    kind: "tab",
    title: "Workspace tab label",
    ariaLabel: "Open Workspace mobile tab",
    description: "The Workspace tab label points to activity capture and review preview.",
    tabKey: "workspace",
    badge: {
      label: "Workspace",
      tone: "muted",
      status: "preview_only",
    },
  },
  {
    id: "objects-tab-label",
    kind: "tab",
    title: "Objects tab label",
    ariaLabel: "Open Objects mobile tab",
    description: "The Objects tab label points to read-only Value Object candidates and relation hints.",
    tabKey: "objects",
    badge: {
      label: "Objects",
      tone: "muted",
      status: "read_only",
    },
  },
  {
    id: "calendar-tab-label",
    kind: "tab",
    title: "Calendar tab label",
    ariaLabel: "Open Calendar mobile tab",
    description: "The Calendar tab label points to today blocks and free window signals.",
    tabKey: "calendar",
    badge: {
      label: "Calendar",
      tone: "primary",
      status: "signal",
    },
  },
  {
    id: "actions-tab-label",
    kind: "tab",
    title: "Actions tab label",
    ariaLabel: "Open Actions mobile tab",
    description: "The Actions tab label points to preview-only quick actions without execution.",
    tabKey: "actions",
    badge: {
      label: "Actions",
      tone: "warning",
      status: "future_gated",
    },
  },
  {
    id: "bottom-navigation-label",
    kind: "landmark",
    title: "Bottom navigation label",
    ariaLabel: "Mobile bottom tab navigation",
    description: "The bottom navigation label explains tab switching and keeps the control discoverable.",
    badge: {
      label: "Bottom tabs",
      tone: "primary",
      status: "signal",
    },
  },
  {
    id: "preview-boundary-label",
    kind: "preview_boundary",
    title: "Preview boundary label",
    ariaLabel: "Preview-only mobile boundary",
    description: "Preview boundaries must say that nothing is saved, submitted, synced, or mutated.",
    badge: {
      label: "No hidden writes",
      tone: "warning",
      status: "no_rights",
    },
  },
  {
    id: "desktop-bridge-label",
    kind: "link",
    title: "Desktop bridge label",
    ariaLabel: "Open desktop workspace bridge",
    description: "The desktop bridge link must be named clearly and remain href-only.",
    badge: {
      label: "Desktop bridge",
      tone: "muted",
      status: "read_only",
    },
  },
] as const satisfies readonly MobileAccessibilityLabelItem[];

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

function getMobileAccessibilityBadgeClassName(badge: MobileBadge): string {
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

function MobileAccessibilityBadge({ badge }: { readonly badge: MobileBadge }) {
  return (
    <span
      className={getMobileAccessibilityBadgeClassName(badge)}
      title={badge.status ? getStatusLabel(badge.status) : undefined}
    >
      {badge.label}
    </span>
  );
}

export function MobileAccessibilityLabels({
  title = "Mobile accessibility labels",
  description = "Accessibility labels give every mobile shell tab, landmark, link, and preview boundary a readable screen-reader name.",
  labels = mobileAccessibilityLabelItems,
}: MobileAccessibilityLabelsProps) {
  return (
    <section
      className="rounded-2xl overflow-hidden border border-border bg-card p-4 text-card-foreground shadow-sm break-words w-full"
      aria-label="Mobile accessibility labels"
    >
      <div className="space-y-2 w-full">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground w-full">
          Accessibility label audit
        </p>

        <h3 className="text-sm font-semibold text-foreground w-full">{title}</h3>

        <p className="text-sm leading-6 text-muted-foreground w-full">{description}</p>
      </div>

      <p className="mt-4 rounded-xl border border-border bg-background px-3 py-2 text-xs leading-5 text-muted-foreground break-words w-full">
        These accessibility labels are presentational only. They do not write, save, submit, sync, mutate data, or attach runtime handlers in UI-16.
      </p>

      <div className="mt-4 grid gap-3 w-full">
        {labels.map((label) => (
          <article
            key={label.id}
            className="rounded-2xl overflow-hidden border border-border bg-background p-3 text-card-foreground break-words w-full"
            aria-label={label.ariaLabel}
          >
            <div className="flex items-start justify-between gap-3 w-full">
              <div className="min-w-0 w-full">
                <p className="text-xs font-medium uppercase tracking-wide text-primary w-full">
                  {label.kind}
                </p>

                <h4 className="mt-1 text-sm font-semibold text-foreground w-full">
                  {label.title}
                </h4>

                <p className="mt-1 text-xs leading-5 text-muted-foreground w-full">
                  {label.description}
                </p>

                <p className="mt-2 rounded-xl border border-border bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground break-words w-full">
                  aria-label: {label.ariaLabel}
                </p>
              </div>

              <MobileAccessibilityBadge badge={label.badge} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

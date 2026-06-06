import type {
  MobileBadge,
  MobilePreviewStatus,
} from "./mobile-shell.types";

export type MobileBadgeMeaningItem = {
  readonly id: string;
  readonly label: string;
  readonly status: MobilePreviewStatus;
  readonly badge: MobileBadge;
  readonly meaning: string;
  readonly userVisibleRule: string;
};

export type MobileBadgeMeaningProps = {
  readonly title?: string;
  readonly description?: string;
  readonly items?: readonly MobileBadgeMeaningItem[];
};

export const mobileBadgeMeaningItems = [
  {
    id: "signal-badge",
    label: "Signal",
    status: "signal",
    badge: {
      label: "Signal",
      tone: "primary",
      status: "signal",
    },
    meaning: "A signal explains useful context or a candidate direction.",
    userVisibleRule: "Signal badges must show readable text and never rely on color alone.",
  },
  {
    id: "preview-only-badge",
    label: "Preview only",
    status: "preview_only",
    badge: {
      label: "Preview only",
      tone: "muted",
      status: "preview_only",
    },
    meaning: "Preview only means the user can inspect information without execution.",
    userVisibleRule: "Preview only badges must clearly say that no save or submit action runs.",
  },
  {
    id: "read-only-badge",
    label: "Read-only",
    status: "read_only",
    badge: {
      label: "Read-only",
      tone: "muted",
      status: "read_only",
    },
    meaning: "Read-only means the panel is visible but does not change data.",
    userVisibleRule: "Read-only badges must keep status text visible next to the visual treatment.",
  },
  {
    id: "needs-review-badge",
    label: "Needs review",
    status: "needs_review",
    badge: {
      label: "Needs review",
      tone: "warning",
      status: "needs_review",
    },
    meaning: "Needs review marks a candidate that requires human checking.",
    userVisibleRule: "Needs review badges must explain the review need with text, not color only.",
  },
  {
    id: "no-rights-badge",
    label: "No rights",
    status: "no_rights",
    badge: {
      label: "No hidden writes",
      tone: "warning",
      status: "no_rights",
    },
    meaning: "No rights means this mobile state cannot write, submit, sync, or mutate data.",
    userVisibleRule: "No rights badges must expose the disabled boundary in visible words.",
  },
  {
    id: "future-gate-badge",
    label: "Future gate",
    status: "future_gated",
    badge: {
      label: "Future gated",
      tone: "warning",
      status: "future_gated",
    },
    meaning: "Future gate means the flow is planned but execution belongs to a later step.",
    userVisibleRule: "Future gate badges must not look like an enabled command.",
  },
] as const satisfies readonly MobileBadgeMeaningItem[];

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

function getMobileBadgeMeaningClassName(badge: MobileBadge): string {
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

function MobileBadgeMeaningBadge({ badge }: { readonly badge: MobileBadge }) {
  return (
    <span
      className={getMobileBadgeMeaningClassName(badge)}
      title={badge.status ? getStatusLabel(badge.status) : undefined}
    >
      {badge.label}
    </span>
  );
}

export function MobileBadgeMeaning({
  title = "Mobile badge meaning",
  description = "Badges are not color-only: every mobile shell badge must expose text, status meaning, and a readable user-visible rule.",
  items = mobileBadgeMeaningItems,
}: MobileBadgeMeaningProps) {
  return (
    <section
      className="rounded-2xl overflow-hidden border border-border bg-card p-4 text-card-foreground shadow-sm break-words"
      aria-label="Mobile badge meaning"
    >
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Badge meaning audit
        </p>

        <h3 className="text-sm font-semibold text-foreground">{title}</h3>

        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      <p className="mt-4 rounded-xl border border-border bg-background px-3 py-2 text-xs leading-5 text-muted-foreground break-words">
        Status text is visible for every badge. This component does not write, save, submit, sync, mutate data, or attach runtime handlers in UI-16.
      </p>

      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl overflow-hidden border border-border bg-background p-3 text-card-foreground break-words"
            aria-label={`${item.label} badge meaning`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-primary">
                  {getStatusLabel(item.status)}
                </p>

                <h4 className="mt-1 text-sm font-semibold text-foreground">
                  {item.label}
                </h4>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {item.meaning}
                </p>

                <p className="mt-2 rounded-xl border border-border bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground break-words">
                  {item.userVisibleRule}
                </p>
              </div>

              <MobileBadgeMeaningBadge badge={item.badge} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

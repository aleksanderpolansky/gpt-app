import { mobileShellRouteTargets } from "./mobile-route-registry";
import type {
  MobileBadge,
  MobilePreviewStatus,
} from "./mobile-shell.types";

export type MobileObjectScenarioStage =
  | "category_cloud"
  | "selected_object_preview"
  | "relation_hints"
  | "activity_evidence"
  | "read_only_aggregate_state"
  | "future_object_edit_gate";

export type MobileObjectScenarioItem = {
  readonly id: string;
  readonly stage: MobileObjectScenarioStage;
  readonly title: string;
  readonly description: string;
  readonly boundary: string;
  readonly href: string;
  readonly badge: MobileBadge;
};

export type MobileObjectScenarioProps = {
  readonly title?: string;
  readonly description?: string;
  readonly items?: readonly MobileObjectScenarioItem[];
};

export const mobileObjectScenarioItems = [
  {
    id: "category-cloud",
    stage: "category_cloud",
    title: "Category cloud",
    description:
      "The mobile object scenario can show frequently used semantic categories as a readable category cloud.",
    boundary:
      "Category cloud is a preview only; no category is created, merged, renamed, or moderated in UI-16.",
    href: mobileShellRouteTargets.objects.href,
    badge: {
      label: "Read-only",
      tone: "muted",
      status: "read_only",
    },
  },
  {
    id: "selected-object-preview",
    stage: "selected_object_preview",
    title: "Selected object preview",
    description:
      "A selected Value Object can show its name, meaning, current context, and preview description.",
    boundary:
      "Selected object preview is read-only; no Value Object is created, edited, published, or moved.",
    href: mobileShellRouteTargets.objects.href,
    badge: {
      label: "Object preview",
      tone: "primary",
      status: "signal",
    },
  },
  {
    id: "relation-hints",
    stage: "relation_hints",
    title: "Relation hints",
    description:
      "Relation hints can show possible parent, child, purpose, role, care, or context links.",
    boundary:
      "Relation hints are candidate explanations only; no relation is created, updated, deleted, or synced.",
    href: mobileShellRouteTargets.ai.href,
    badge: {
      label: "Candidate",
      tone: "primary",
      status: "signal",
    },
  },
  {
    id: "activity-evidence",
    stage: "activity_evidence",
    title: "Activity evidence",
    description:
      "Activity evidence can show which activity preview explains why an object or category is visible.",
    boundary:
      "Activity evidence is a visible explanation only; no activity_event is inserted or recalculated.",
    href: mobileShellRouteTargets.workspace.href,
    badge: {
      label: "Evidence",
      tone: "muted",
      status: "preview_only",
    },
  },
  {
    id: "read-only-aggregate-state",
    stage: "read_only_aggregate_state",
    title: "Read-only aggregate state",
    description:
      "Read-only aggregate state can show lightweight counters, recency hints, and attention signals.",
    boundary:
      "Aggregate state is display-only here; no aggregate or state snapshot is recalculated.",
    href: mobileShellRouteTargets.objects.href,
    badge: {
      label: "Read-only",
      tone: "muted",
      status: "read_only",
    },
  },
  {
    id: "future-object-edit-gate",
    stage: "future_object_edit_gate",
    title: "Future object edit gate",
    description:
      "Object editing, confirming, merging, publishing, or changing visibility belongs to a later explicit gate.",
    boundary:
      "Future object edit gate is disabled here; it must not look like an enabled edit command.",
    href: mobileShellRouteTargets.actions.href,
    badge: {
      label: "Future gated",
      tone: "warning",
      status: "future_gated",
    },
  },
] as const satisfies readonly MobileObjectScenarioItem[];

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

function getMobileObjectScenarioBadgeClassName(badge: MobileBadge): string {
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

function MobileObjectScenarioBadge({ badge }: { readonly badge: MobileBadge }) {
  return (
    <span
      className={getMobileObjectScenarioBadgeClassName(badge)}
      title={badge.status ? getStatusLabel(badge.status) : undefined}
    >
      {badge.label}
    </span>
  );
}

export function MobileObjectScenario({
  title = "Mobile object scenario",
  description = "This presentational object scenario shows category cloud, selected object preview, relation hints, activity evidence, read-only aggregate state, and a future object edit gate.",
  items = mobileObjectScenarioItems,
}: MobileObjectScenarioProps) {
  return (
    <section
      className="rounded-2xl overflow-hidden border border-border bg-card p-4 text-card-foreground shadow-sm break-words"
      aria-label="Mobile object scenario"
    >
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Object scenario audit
        </p>

        <h3 className="text-sm font-semibold text-foreground">{title}</h3>

        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      <p className="mt-4 rounded-xl border border-border bg-background px-3 py-2 text-xs leading-5 text-muted-foreground break-words">
        This presentational object scenario does not write, save, submit, sync, mutate data, create Value Objects, create categories, change relations, or recalculate aggregates in UI-16.
      </p>

      <div className="mt-4 grid gap-3">
        {items.map((item, index) => (
          <article
            key={item.id}
            className="rounded-2xl overflow-hidden border border-border bg-background p-3 text-card-foreground break-words"
            aria-label={`${item.title} object scenario step`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-primary">
                  Step {index + 1}: {item.stage}
                </p>

                <h4 className="mt-1 text-sm font-semibold text-foreground">
                  {item.title}
                </h4>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {item.description}
                </p>

                <p className="mt-2 rounded-xl border border-border bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground break-words">
                  {item.boundary}
                </p>

                <a
                  href={item.href}
                  className="mt-2 block rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-primary break-words"
                  aria-label={`Open ${item.title} preview context`}
                >
                  Open object scenario context
                </a>
              </div>

              <MobileObjectScenarioBadge badge={item.badge} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

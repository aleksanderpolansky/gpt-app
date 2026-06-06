import { mobileShellRouteTargets } from "./mobile-route-registry";
import type {
  MobileBadge,
  MobilePreviewStatus,
} from "./mobile-shell.types";

export type MobileActivityScenarioStage =
  | "raw_input"
  | "ai_parsing_candidate"
  | "review_card"
  | "value_object_hints"
  | "calendar_context"
  | "future_save_gate";

export type MobileActivityScenarioItem = {
  readonly id: string;
  readonly stage: MobileActivityScenarioStage;
  readonly title: string;
  readonly description: string;
  readonly boundary: string;
  readonly href: string;
  readonly badge: MobileBadge;
};

export type MobileActivityScenarioProps = {
  readonly title?: string;
  readonly description?: string;
  readonly items?: readonly MobileActivityScenarioItem[];
};

export const mobileActivityScenarioItems = [
  {
    id: "raw-input",
    stage: "raw_input",
    title: "Raw input",
    description:
      "The user can see a mobile activity capture draft as text, voice-note summary, or short note preview.",
    boundary:
      "Raw input stays local to the preview card here; no activity_event is inserted.",
    href: mobileShellRouteTargets.workspace.href,
    badge: {
      label: "Draft",
      tone: "muted",
      status: "preview_only",
    },
  },
  {
    id: "ai-parsing-candidate",
    stage: "ai_parsing_candidate",
    title: "AI parsing candidate",
    description:
      "AI may propose categories, role/purpose hints, time context, and confidence signals.",
    boundary:
      "AI parsing is a candidate explanation only; human review remains required.",
    href: mobileShellRouteTargets.ai.href,
    badge: {
      label: "Candidate",
      tone: "primary",
      status: "signal",
    },
  },
  {
    id: "review-card",
    stage: "review_card",
    title: "Review card",
    description:
      "The mobile review card shows what would be checked before any later save gate exists.",
    boundary:
      "Review card is preview-only; no activity is saved or submitted in UI-16.",
    href: mobileShellRouteTargets.workspace.href,
    badge: {
      label: "Needs review",
      tone: "warning",
      status: "needs_review",
    },
  },
  {
    id: "value-object-hints",
    stage: "value_object_hints",
    title: "Value Object hints",
    description:
      "The activity scenario can show possible Value Object hints, category links, and relation hints.",
    boundary:
      "Value Object hints are read-only; no object, category, relation, or aggregate is changed.",
    href: mobileShellRouteTargets.objects.href,
    badge: {
      label: "Read-only",
      tone: "muted",
      status: "read_only",
    },
  },
  {
    id: "calendar-context",
    stage: "calendar_context",
    title: "Calendar context",
    description:
      "Calendar context can show today blocks, free window signals, and suggested timing context.",
    boundary:
      "Calendar context is only a signal; no event is created, updated, deleted, or synced.",
    href: mobileShellRouteTargets.calendar.href,
    badge: {
      label: "Signal",
      tone: "primary",
      status: "signal",
    },
  },
  {
    id: "future-save-gate",
    stage: "future_save_gate",
    title: "Future save gate",
    description:
      "A real activity_event write belongs to a later explicit gate outside this UI-16 mobile shell scenario.",
    boundary:
      "Future save gate is disabled here; it must not look like an enabled command.",
    href: mobileShellRouteTargets.actions.href,
    badge: {
      label: "Future gated",
      tone: "warning",
      status: "future_gated",
    },
  },
] as const satisfies readonly MobileActivityScenarioItem[];

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

function getMobileActivityScenarioBadgeClassName(badge: MobileBadge): string {
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

function MobileActivityScenarioBadge({ badge }: { readonly badge: MobileBadge }) {
  return (
    <span
      className={getMobileActivityScenarioBadgeClassName(badge)}
      title={badge.status ? getStatusLabel(badge.status) : undefined}
    >
      {badge.label}
    </span>
  );
}

export function MobileActivityScenario({
  title = "Mobile activity scenario",
  description = "This presentational activity scenario shows raw input, AI parsing candidate, review card, Value Object hints, calendar context, and a future save gate.",
  items = mobileActivityScenarioItems,
}: MobileActivityScenarioProps) {
  return (
    <section
      className="rounded-2xl overflow-hidden border border-border bg-card p-4 text-card-foreground shadow-sm break-words"
      aria-label="Mobile activity scenario"
    >
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Activity scenario audit
        </p>

        <h3 className="text-sm font-semibold text-foreground">{title}</h3>

        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      <p className="mt-4 rounded-xl border border-border bg-background px-3 py-2 text-xs leading-5 text-muted-foreground break-words">
        This presentational activity scenario does not write, save, submit, sync, mutate data, or insert activity_events in UI-16.
      </p>

      <div className="mt-4 grid gap-3">
        {items.map((item, index) => (
          <article
            key={item.id}
            className="rounded-2xl overflow-hidden border border-border bg-background p-3 text-card-foreground break-words"
            aria-label={`${item.title} activity scenario step`}
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
                  Open activity scenario context
                </a>
              </div>

              <MobileActivityScenarioBadge badge={item.badge} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

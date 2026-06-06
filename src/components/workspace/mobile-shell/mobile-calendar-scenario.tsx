import { mobileShellRouteTargets } from "./mobile-route-registry";
import type {
  MobileBadge,
  MobilePreviewStatus,
} from "./mobile-shell.types";

export type MobileCalendarScenarioStage =
  | "today_blocks"
  | "free_window_signals"
  | "suggested_action_slot"
  | "ai_explanation"
  | "calendar_write_boundary"
  | "future_calendar_gate";

export type MobileCalendarScenarioItem = {
  readonly id: string;
  readonly stage: MobileCalendarScenarioStage;
  readonly title: string;
  readonly description: string;
  readonly boundary: string;
  readonly href: string;
  readonly badge: MobileBadge;
};

export type MobileCalendarScenarioProps = {
  readonly title?: string;
  readonly description?: string;
  readonly items?: readonly MobileCalendarScenarioItem[];
};

export const mobileCalendarScenarioItems = [
  {
    id: "today-blocks",
    stage: "today_blocks",
    title: "Today blocks",
    description:
      "The mobile calendar scenario can show today blocks as a compact read-only daily structure.",
    boundary:
      "Today blocks are preview-only; no event is created, updated, deleted, or synced in UI-16.",
    href: mobileShellRouteTargets.calendar.href,
    badge: {
      label: "Read-only",
      tone: "muted",
      status: "read_only",
    },
  },
  {
    id: "free-window-signals",
    stage: "free_window_signals",
    title: "Free window signals",
    description:
      "Free window signals can show possible time gaps for learning, recovery, activity review, or family context.",
    boundary:
      "Free window signals are explanations only; no scheduling decision is executed.",
    href: mobileShellRouteTargets.calendar.href,
    badge: {
      label: "Signal",
      tone: "primary",
      status: "signal",
    },
  },
  {
    id: "suggested-action-slot",
    stage: "suggested_action_slot",
    title: "Suggested action slot",
    description:
      "A suggested action slot can connect a free window with an activity, object, learning, recovery, or next-best-action candidate.",
    boundary:
      "Suggested action slot is a candidate only; no next-best-action flow is executed.",
    href: mobileShellRouteTargets.actions.href,
    badge: {
      label: "Candidate",
      tone: "primary",
      status: "signal",
    },
  },
  {
    id: "ai-explanation",
    stage: "ai_explanation",
    title: "AI explanation",
    description:
      "AI explanation can describe why a calendar slot may fit the current mobile context.",
    boundary:
      "AI explanation remains a signal; it does not create a task, event, reminder, or workflow.",
    href: mobileShellRouteTargets.ai.href,
    badge: {
      label: "Contextual AI",
      tone: "primary",
      status: "signal",
    },
  },
  {
    id: "calendar-write-boundary",
    stage: "calendar_write_boundary",
    title: "Calendar write boundary",
    description:
      "The calendar write boundary makes it clear that UI-16 does not run calendar mutation flows.",
    boundary:
      "This calendar write boundary blocks hidden create, update, delete, and sync operations.",
    href: mobileShellRouteTargets.calendar.href,
    badge: {
      label: "No hidden writes",
      tone: "warning",
      status: "no_rights",
    },
  },
  {
    id: "future-calendar-gate",
    stage: "future_calendar_gate",
    title: "Future calendar gate",
    description:
      "Calendar event creation, updates, deletion, sync, and reminders belong to a later explicit gate.",
    boundary:
      "Future calendar gate is disabled here; it must not look like an enabled calendar command.",
    href: mobileShellRouteTargets.workspace.href,
    badge: {
      label: "Future gated",
      tone: "warning",
      status: "future_gated",
    },
  },
] as const satisfies readonly MobileCalendarScenarioItem[];

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

function getMobileCalendarScenarioBadgeClassName(badge: MobileBadge): string {
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

function MobileCalendarScenarioBadge({ badge }: { readonly badge: MobileBadge }) {
  return (
    <span
      className={getMobileCalendarScenarioBadgeClassName(badge)}
      title={badge.status ? getStatusLabel(badge.status) : undefined}
    >
      {badge.label}
    </span>
  );
}

export function MobileCalendarScenario({
  title = "Mobile calendar scenario",
  description = "This presentational calendar scenario shows today blocks, free window signals, suggested action slot, AI explanation, calendar write boundary, and a future calendar gate.",
  items = mobileCalendarScenarioItems,
}: MobileCalendarScenarioProps) {
  return (
    <section
      className="rounded-2xl overflow-hidden border border-border bg-card p-4 text-card-foreground shadow-sm break-words"
      aria-label="Mobile calendar scenario"
    >
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Calendar scenario audit
        </p>

        <h3 className="text-sm font-semibold text-foreground">{title}</h3>

        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      <p className="mt-4 rounded-xl border border-border bg-background px-3 py-2 text-xs leading-5 text-muted-foreground break-words">
        This presentational calendar scenario does not write, save, submit, sync, mutate data, create calendar events, update calendar events, delete calendar events, or execute scheduling flows in UI-16.
      </p>

      <div className="mt-4 grid gap-3">
        {items.map((item, index) => (
          <article
            key={item.id}
            className="rounded-2xl overflow-hidden border border-border bg-background p-3 text-card-foreground break-words"
            aria-label={`${item.title} calendar scenario step`}
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
                  Open calendar scenario context
                </a>
              </div>

              <MobileCalendarScenarioBadge badge={item.badge} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

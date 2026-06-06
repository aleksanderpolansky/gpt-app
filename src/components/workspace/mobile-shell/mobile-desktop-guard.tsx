import { mobileShellRoutePath } from "./mobile-route-registry";
import type {
  MobileBadge,
  MobilePreviewStatus,
  MobileRouteTarget,
} from "./mobile-shell.types";

export type MobileDesktopGuardItem = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly badge: MobileBadge;
};

export type MobileDesktopGuardProps = {
  readonly title?: string;
  readonly description?: string;
  readonly items?: readonly MobileDesktopGuardItem[];
  readonly desktopRoute?: MobileRouteTarget;
  readonly mobileRoute?: MobileRouteTarget;
};

export const mobileDesktopGuardItems = [
  {
    id: "mobile-route-isolated",
    title: "Mobile route guard",
    description:
      "The /m shell is a separate mobile operational shell and not a compressed copy of the desktop workspace.",
    badge: {
      label: "Mobile isolated",
      tone: "primary",
      status: "signal",
    },
  },
  {
    id: "desktop-regression-boundary",
    title: "No desktop regression",
    description:
      "Desktop UI-15 remains the reference for the contextual right AI column and desktop workspace layout.",
    badge: {
      label: "Desktop safe",
      tone: "muted",
      status: "read_only",
    },
  },
  {
    id: "read-only-crossing",
    title: "Read-only crossing",
    description:
      "Moving between mobile and desktop uses links only and does not transfer hidden state or run workflow effects.",
    badge: {
      label: "No hidden writes",
      tone: "warning",
      status: "no_rights",
    },
  },
] as const satisfies readonly MobileDesktopGuardItem[];

const defaultDesktopRoute: MobileRouteTarget = {
  href: "/workspace",
  label: "Open desktop workspace",
  description: "Desktop workspace bridge.",
};

const defaultMobileRoute: MobileRouteTarget = {
  href: mobileShellRoutePath,
  label: "Open mobile shell",
  description: "Mobile /m shell bridge.",
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

function getMobileDesktopGuardBadgeClassName(badge: MobileBadge): string {
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

function MobileDesktopGuardBadge({ badge }: { readonly badge: MobileBadge }) {
  return (
    <span
      className={getMobileDesktopGuardBadgeClassName(badge)}
      title={badge.status ? getStatusLabel(badge.status) : undefined}
    >
      {badge.label}
    </span>
  );
}

function MobileDesktopGuardRouteLink({
  route,
}: {
  readonly route: MobileRouteTarget;
}) {
  return (
    <a
      href={route.href}
      className="block rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-primary break-words"
      aria-label={route.label}
    >
      {route.label}
      {route.description ? (
        <span className="mt-1 block text-xs font-normal text-muted-foreground">
          {route.description}
        </span>
      ) : null}
    </a>
  );
}

export function MobileDesktopGuard({
  title = "Mobile desktop guard",
  description = "This guard keeps the /m mobile shell separate from the desktop workspace and protects desktop UI-15 from accidental mobile coupling.",
  items = mobileDesktopGuardItems,
  desktopRoute = defaultDesktopRoute,
  mobileRoute = defaultMobileRoute,
}: MobileDesktopGuardProps) {
  return (
    <section
      className="rounded-2xl overflow-hidden border border-border bg-card p-4 text-card-foreground shadow-sm break-words"
      aria-label="Mobile desktop guard"
    >
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Desktop boundary guard
        </p>

        <h3 className="text-sm font-semibold text-foreground">{title}</h3>

        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      <p className="mt-4 rounded-xl border border-border bg-background px-3 py-2 text-xs leading-5 text-muted-foreground break-words">
        The guard is presentational only. It does not write, save, submit, sync, mutate data, or change desktop workspace state in UI-16.
      </p>

      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl overflow-hidden border border-border bg-background p-3 text-card-foreground break-words"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-foreground">{item.title}</h4>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {item.description}
                </p>
              </div>

              <MobileDesktopGuardBadge badge={item.badge} />
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-3">
        <MobileDesktopGuardRouteLink route={mobileRoute} />
        <MobileDesktopGuardRouteLink route={desktopRoute} />
      </div>
    </section>
  );
}

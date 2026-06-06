import { mobileShellRouteTargets } from "./mobile-route-registry";
import type {
  MobileBadge,
  MobilePreviewStatus,
} from "./mobile-shell.types";

export type MobileCommercialLinkStage =
  | "external_purchase_context"
  | "purchase_confirmation_preview"
  | "points_preview"
  | "certificate_preview"
  | "seller_boundary"
  | "future_commercial_gate";

export type MobileCommercialLinkItem = {
  readonly id: string;
  readonly stage: MobileCommercialLinkStage;
  readonly title: string;
  readonly description: string;
  readonly boundary: string;
  readonly href: string;
  readonly badge: MobileBadge;
};

export type MobileCommercialLinkProps = {
  readonly title?: string;
  readonly description?: string;
  readonly items?: readonly MobileCommercialLinkItem[];
};

export const mobileCommercialLinkItems = [
  {
    id: "external-purchase-context",
    stage: "external_purchase_context",
    title: "External purchase context",
    description:
      "The mobile commercial link can explain that the real purchase happens outside the platform, offline or on the seller site.",
    boundary:
      "External purchase context is informational only; no order, cart, checkout, item list, payment, or invoice is created in UI-16.",
    href: mobileShellRouteTargets.actions.href,
    badge: {
      label: "External",
      tone: "muted",
      status: "read_only",
    },
  },
  {
    id: "purchase-confirmation-preview",
    stage: "purchase_confirmation_preview",
    title: "Purchase confirmation preview",
    description:
      "The user may preview how a buyer requests confirmation of an already completed external purchase.",
    boundary:
      "Purchase confirmation preview does not create a purchase_confirmation request, seller notification, approval, rejection, or audit row.",
    href: mobileShellRouteTargets.workspace.href,
    badge: {
      label: "Preview only",
      tone: "muted",
      status: "preview_only",
    },
  },
  {
    id: "points-preview",
    stage: "points_preview",
    title: "Points preview",
    description:
      "Points preview can show possible points logic after seller confirmation without issuing points.",
    boundary:
      "Points preview does not issue, spend, burn, transfer, recalculate, or persist points.",
    href: mobileShellRouteTargets.ai.href,
    badge: {
      label: "Signal",
      tone: "primary",
      status: "signal",
    },
  },
  {
    id: "certificate-preview",
    stage: "certificate_preview",
    title: "Certificate preview",
    description:
      "Certificate preview can explain that certificates are separate from normal product or service purchases.",
    boundary:
      "Certificate preview does not generate, reserve, pay for, redeem, cancel, or modify certificates.",
    href: mobileShellRouteTargets.objects.href,
    badge: {
      label: "Read-only",
      tone: "muted",
      status: "read_only",
    },
  },
  {
    id: "seller-boundary",
    stage: "seller_boundary",
    title: "Seller boundary",
    description:
      "Seller boundary explains that seller confirmation is a later controlled flow and not an automatic mobile action.",
    boundary:
      "Seller boundary does not approve, reject, notify, settle, payout, or change seller commercial state.",
    href: mobileShellRouteTargets.actions.href,
    badge: {
      label: "No hidden writes",
      tone: "warning",
      status: "no_rights",
    },
  },
  {
    id: "future-commercial-gate",
    stage: "future_commercial_gate",
    title: "Future commercial gate",
    description:
      "Commercial writes, confirmations, point issuance, point burning, certificate flows, and seller state changes belong to later explicit gates.",
    boundary:
      "Future commercial gate is disabled here; it must not look like an enabled purchase, confirmation, points, certificate, or seller command.",
    href: mobileShellRouteTargets.actions.href,
    badge: {
      label: "Future gated",
      tone: "warning",
      status: "future_gated",
    },
  },
] as const satisfies readonly MobileCommercialLinkItem[];

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

function getMobileCommercialLinkBadgeClassName(badge: MobileBadge): string {
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

function MobileCommercialLinkBadge({ badge }: { readonly badge: MobileBadge }) {
  return (
    <span
      className={getMobileCommercialLinkBadgeClassName(badge)}
      title={badge.status ? getStatusLabel(badge.status) : undefined}
    >
      {badge.label}
    </span>
  );
}

export function MobileCommercialLink({
  title = "Mobile commercial link",
  description = "This presentational commercial link scenario shows external purchase context, purchase confirmation preview, points preview, certificate preview, seller boundary, and a future commercial gate.",
  items = mobileCommercialLinkItems,
}: MobileCommercialLinkProps) {
  return (
    <section
      className="rounded-2xl overflow-hidden border border-border bg-card p-4 text-card-foreground shadow-sm break-words"
      aria-label="Mobile commercial link"
    >
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Commercial link audit
        </p>

        <h3 className="text-sm font-semibold text-foreground">{title}</h3>

        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      <p className="mt-4 rounded-xl border border-border bg-background px-3 py-2 text-xs leading-5 text-muted-foreground break-words">
        This presentational commercial link does not write, save, submit, sync, mutate data, create purchase confirmations, create orders, create carts, create points, create certificates, or execute payments in UI-16.
      </p>

      <div className="mt-4 grid gap-3">
        {items.map((item, index) => (
          <article
            key={item.id}
            className="rounded-2xl overflow-hidden border border-border bg-background p-3 text-card-foreground break-words"
            aria-label={`${item.title} commercial link step`}
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
                  Open commercial link context
                </a>
              </div>

              <MobileCommercialLinkBadge badge={item.badge} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

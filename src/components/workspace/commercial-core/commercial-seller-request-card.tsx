import type { SellerConfirmationRequestPreview } from "./commercial-core.types";
import {
  formatCommercialMoneyPreview,
  formatCommercialPointsPreview,
} from "./commercial-core.utils";

type CommercialSellerRequestCardProps = {
  readonly request: SellerConfirmationRequestPreview;
  readonly footerNote?: string;
};

const sellerRequestStatusLabelByStatus: Record<
  SellerConfirmationRequestPreview["status"],
  string
> = {
  "draft-preview": "Draft preview",
  "pending-seller-review": "Pending seller review",
  "confirmed-by-seller": "Confirmed by seller",
  "rejected-by-seller": "Rejected by seller",
  "needs-buyer-clarification": "Needs buyer clarification",
  "cancelled-preview": "Cancelled preview",
};

const sellerDecisionLabelByDecision: Record<
  SellerConfirmationRequestPreview["availableDecisions"][number],
  string
> = {
  "confirm-disabled": "Confirm disabled",
  "reject-disabled": "Reject disabled",
  "confirm-later-disabled": "Confirm later disabled",
};

function getSignedSellerPointsImpactLabel(pointsImpactPreview: number): string {
  const normalizedImpact = Math.round(pointsImpactPreview);
  const absoluteLabel = formatCommercialPointsPreview(Math.abs(normalizedImpact));

  if (normalizedImpact > 0) {
    return "+" + absoluteLabel;
  }

  if (normalizedImpact < 0) {
    return "-" + absoluteLabel;
  }

  return absoluteLabel;
}

function getSellerDecisionSummary(
  request: SellerConfirmationRequestPreview,
): string {
  return (
    request.availableDecisions.length.toLocaleString("en-US") +
    " disabled seller decision previews · " +
    request.decisionDisabledReason
  );
}

export function CommercialSellerRequestCard({
  request,
  footerNote = "Seller decisions are fixture-first and disabled until a future commercial write gate.",
}: CommercialSellerRequestCardProps) {
  const externalPurchaseAmountLabel = formatCommercialMoneyPreview(
    request.externalPurchaseAmount,
    request.derivedCurrency,
  );
  const pointsImpactLabel = getSignedSellerPointsImpactLabel(
    request.pointsImpactPreview,
  );

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Seller confirmation request card
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
            {request.publicCode} · {request.sellerOrganizationTitle}
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Buyer identity is masked: {request.buyerMaskedName}
          </p>
        </div>
        <div className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          {sellerRequestStatusLabelByStatus[request.status]}
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-secondary/40 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            External purchase amount
          </p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {externalPurchaseAmountLabel}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            External purchase only; the platform records confirmation request status.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-secondary/40 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Points impact
          </p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {pointsImpactLabel}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Points are awarded only after seller confirmation.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-secondary/40 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Decision boundary
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            Disabled seller decision preview
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {request.decisionDisabledReason}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Proof label
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground">
            {request.proofLabel}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Buyer comment
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground">
            {request.buyerComment}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Available seller decisions
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {getSellerDecisionSummary(request)}
            </p>
          </div>
          <div className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            No hidden write
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {request.availableDecisions.map((decision) => (
            <div
              className="rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-sm font-medium text-muted-foreground"
              key={decision}
            >
              {sellerDecisionLabelByDecision[decision]}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-sm leading-6 text-muted-foreground">
        {footerNote}
      </div>
    </article>
  );
}


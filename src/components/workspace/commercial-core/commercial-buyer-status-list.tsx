import type { PurchaseConfirmationPreview } from "./commercial-core.types";
import {
  buildReadOnlyCommercialActionNotice,
  formatCommercialMoneyPreview,
  formatCommercialPointsPreview,
  getCommercialActionStateLabel,
  isCommercialActionDisabled,
} from "./commercial-core.utils";

type CommercialBuyerStatusListProps = {
  readonly confirmations: readonly PurchaseConfirmationPreview[];
  readonly title?: string;
  readonly description?: string;
  readonly emptyMessage?: string;
};

const confirmationStatusLabelByStatus: Record<
  PurchaseConfirmationPreview["status"],
  string
> = {
  "draft-preview": "Draft preview",
  "pending-seller-review": "Pending seller review",
  "confirmed-by-seller": "Confirmed by seller",
  "rejected-by-seller": "Rejected by seller",
  "needs-buyer-clarification": "Needs buyer clarification",
  "cancelled-preview": "Cancelled preview",
};

function getSignedPointsImpactLabel(pointsImpactPreview: number): string {
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

function getBuyerConfirmationStatusSummary(
  confirmations: readonly PurchaseConfirmationPreview[],
): string {
  const confirmationCount = confirmations.length;
  const pendingCount = confirmations.filter(
    (confirmation) => confirmation.status === "pending-seller-review",
  ).length;
  const confirmedCount = confirmations.filter(
    (confirmation) => confirmation.status === "confirmed-by-seller",
  ).length;
  const rejectedCount = confirmations.filter(
    (confirmation) => confirmation.status === "rejected-by-seller",
  ).length;
  const cancelledCount = confirmations.filter(
    (confirmation) => confirmation.status === "cancelled-preview",
  ).length;

  return (
    confirmationCount.toLocaleString("en-US") +
    " confirmations · " +
    pendingCount.toLocaleString("en-US") +
    " pending · " +
    confirmedCount.toLocaleString("en-US") +
    " confirmed · " +
    rejectedCount.toLocaleString("en-US") +
    " rejected · " +
    cancelledCount.toLocaleString("en-US") +
    " cancelled-preview"
  );
}

function getReviewTimelineLabel(
  confirmation: PurchaseConfirmationPreview,
): string {
  return confirmation.reviewedAtLabel
    ? "Submitted: " + confirmation.submittedAtLabel + " · Reviewed: " + confirmation.reviewedAtLabel
    : "Submitted: " + confirmation.submittedAtLabel + " · Seller review pending";
}

export function CommercialBuyerStatusList({
  confirmations,
  title = "Buyer confirmation statuses",
  description = "Read-only buyer view of external purchase confirmations, proof/comment/status and points impact.",
  emptyMessage = "No buyer confirmation fixtures are available for this read-only preview.",
}: CommercialBuyerStatusListProps) {
  const hasConfirmations = confirmations.length > 0;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Buyer confirmation status list
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          Read-only
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-sm leading-6 text-muted-foreground">
        {getBuyerConfirmationStatusSummary(confirmations)}
      </div>

      {hasConfirmations ? (
        <div className="mt-5 flex flex-col gap-4">
          {confirmations.map((confirmation) => {
            const actionDisabled = isCommercialActionDisabled(confirmation.actionState);
            const actionLabel = getCommercialActionStateLabel(confirmation.actionState);
            const actionNotice = buildReadOnlyCommercialActionNotice(
              confirmation.actionState,
            );
            const externalPurchaseAmountLabel = formatCommercialMoneyPreview(
              confirmation.externalPurchaseAmount,
              confirmation.derivedCurrency,
            );
            const pointsImpactLabel = getSignedPointsImpactLabel(
              confirmation.pointsImpactPreview,
            );

            return (
              <article
                className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                key={confirmation.id}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {confirmation.publicCode} · {confirmationStatusLabelByStatus[confirmation.status]}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-foreground">
                      {confirmation.sellerOrganizationTitle}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Buyer identity: {confirmation.buyerMaskedName}
                    </p>
                  </div>
                  <div className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                    {actionLabel}
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
                  </div>
                  <div className="rounded-xl border border-border bg-secondary/40 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Points impact
                    </p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {pointsImpactLabel}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-secondary/40 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Action state
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {actionDisabled ? "Disabled preview control" : "Preview state only"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-xl border border-border bg-card p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Proof label
                    </p>
                    <p className="mt-2 text-sm leading-6 text-foreground">
                      {confirmation.proofLabel}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Buyer comment
                    </p>
                    <p className="mt-2 text-sm leading-6 text-foreground">
                      {confirmation.buyerComment}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-sm leading-6 text-muted-foreground">
                  {getReviewTimelineLabel(confirmation)}
                </div>

                <div className="mt-3 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-sm leading-6 text-muted-foreground">
                  {actionNotice}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-border bg-secondary/40 p-5 text-sm leading-6 text-muted-foreground">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}


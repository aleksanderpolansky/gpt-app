import type { OfferSummary } from "./commercial-core.types";
import {
  buildReadOnlyCommercialActionNotice,
  formatCommercialMoneyPreview,
  formatCommercialPointsPreview,
  getCommercialActionStateLabel,
  isCommercialActionDisabled,
} from "./commercial-core.utils";

type CommercialOfferCardProps = {
  readonly offer: OfferSummary;
  readonly footerNote?: string;
};

function getCertificateReadinessLabel(isReady: boolean): string {
  return isReady ? "Certificate-ready preview" : "Certificate setup pending";
}

function getOfferAccessLabel(offer: OfferSummary): string {
  return offer.accessState === "read-only"
    ? "Read-only offer"
    : "Future gate required";
}

export function CommercialOfferCard({
  offer,
  footerNote = "Offer data is fixture-first. Creating or editing offers requires a future commercial write gate.",
}: CommercialOfferCardProps) {
  const actionDisabled = isCommercialActionDisabled(offer.actionState);
  const actionLabel = getCommercialActionStateLabel(offer.actionState);
  const actionNotice = buildReadOnlyCommercialActionNotice(offer.actionState);
  const referenceAmountLabel = formatCommercialMoneyPreview(
    offer.referenceAmount,
    offer.derivedCurrency,
  );
  const pointsPreviewLabel = formatCommercialPointsPreview(offer.pointsPreview);

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {offer.organizationTitle}
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
            {offer.title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {offer.description}
          </p>
        </div>
        <div className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          {getOfferAccessLabel(offer)}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-secondary/40 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Category
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {offer.categoryLabel}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-secondary/40 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Certificate readiness
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {getCertificateReadinessLabel(offer.certificateReady)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Reference amount
          </p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {referenceAmountLabel}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Points preview
          </p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {pointsPreviewLabel}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Action state
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {actionLabel}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {actionDisabled ? "Disabled preview control" : "Preview state only"}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-sm leading-6 text-muted-foreground">
        {actionNotice}
      </div>

      <div className="mt-3 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-sm leading-6 text-muted-foreground">
        {footerNote}
      </div>
    </article>
  );
}


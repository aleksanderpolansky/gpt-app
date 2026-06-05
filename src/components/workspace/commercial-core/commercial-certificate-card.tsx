import type { CertificateSummary } from "./commercial-core.types";
import {
  buildReadOnlyCommercialActionNotice,
  calculateCertificateMoneyPreview,
  formatCommercialMoneyPreview,
  formatCommercialPointsPreview,
  getCommercialActionStateLabel,
  isCommercialActionDisabled,
} from "./commercial-core.utils";

type CommercialCertificateCardProps = {
  readonly certificate: CertificateSummary;
  readonly footerNote?: string;
};

const availabilityLabelByStatus: Record<
  CertificateSummary["availabilityStatus"],
  string
> = {
  "available-preview": "Available preview",
  "not-enough-points-preview": "Not enough points preview",
  "future-gated": "Future gate required",
  "blocked-no-rights": "Blocked because rights are missing",
};

function getCertificateAvailabilityLabel(
  certificate: CertificateSummary,
): string {
  return availabilityLabelByStatus[certificate.availabilityStatus];
}

export function CommercialCertificateCard({
  certificate,
  footerNote = "Certificate data is fixture-first. Spending points requires a future commercial write gate.",
}: CommercialCertificateCardProps) {
  const actionDisabled = isCommercialActionDisabled(certificate.actionState);
  const actionLabel = getCommercialActionStateLabel(certificate.actionState);
  const actionNotice = buildReadOnlyCommercialActionNotice(
    certificate.actionState,
  );
  const calculatedMoneyPreview = calculateCertificateMoneyPreview(certificate);
  const faceValueLabel = formatCommercialMoneyPreview(
    certificate.faceValue,
    certificate.derivedCurrency,
  );
  const buyerDiscountLabel = formatCommercialMoneyPreview(
    certificate.buyerDiscountPreview,
    certificate.derivedCurrency,
  );
  const buyerMoneyPartLabel = formatCommercialMoneyPreview(
    calculatedMoneyPreview.buyerMoneyPartPreview,
    certificate.derivedCurrency,
  );
  const sellerMoneyPartLabel = formatCommercialMoneyPreview(
    certificate.sellerMoneyPartPreview,
    certificate.derivedCurrency,
  );
  const pointsRequiredLabel = formatCommercialPointsPreview(
    certificate.pointsRequired,
  );
  const pointsBurnedLabel = formatCommercialPointsPreview(
    calculatedMoneyPreview.pointsBurnedPreview,
  );

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {certificate.organizationTitle}
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
            {certificate.title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Certificate preview with buyer money part, seller money part and points burn calculation.
          </p>
        </div>
        <div className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          {getCertificateAvailabilityLabel(certificate)}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Face value
          </p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {faceValueLabel}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Buyer discount
          </p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {buyerDiscountLabel}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Points required
          </p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {pointsRequiredLabel}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Points burned
          </p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {pointsBurnedLabel}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-secondary/40 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Buyer money part
          </p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {buyerMoneyPartLabel}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-secondary/40 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Seller money part
          </p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {sellerMoneyPartLabel}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-secondary/40 p-3">
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
        Points are burned in this preview and are not seller revenue.
      </div>

      <div className="mt-3 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-sm leading-6 text-muted-foreground">
        {certificate.sellerPayoutNote}
      </div>

      <div className="mt-3 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-sm leading-6 text-muted-foreground">
        {actionNotice}
      </div>

      <div className="mt-3 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-sm leading-6 text-muted-foreground">
        {footerNote}
      </div>
    </article>
  );
}


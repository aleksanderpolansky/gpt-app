import type { PublicPurchaseHistoryEntry } from "./commercial-core.types";
import { formatCommercialMoneyPreview } from "./commercial-core.utils";

type CommercialPublicHistoryItemProps = {
  readonly entry: PublicPurchaseHistoryEntry;
  readonly footerNote?: string;
};

const publicConfirmationStatusLabelByStatus: Record<
  PublicPurchaseHistoryEntry["confirmationStatus"],
  string
> = {
  "draft-preview": "Draft preview",
  "pending-seller-review": "Pending seller review",
  "confirmed-by-seller": "Confirmed by seller",
  "rejected-by-seller": "Rejected by seller",
  "needs-buyer-clarification": "Needs buyer clarification",
  "cancelled-preview": "Cancelled preview",
};

function getPublicHistoryStatusLabel(
  entry: PublicPurchaseHistoryEntry,
): string {
  return publicConfirmationStatusLabelByStatus[entry.confirmationStatus];
}

export function CommercialPublicHistoryItem({
  entry,
  footerNote = "Public history is fixture-first and read-only. Buyer names stay masked while company names remain open.",
}: CommercialPublicHistoryItemProps) {
  const externalPurchaseAmountLabel = formatCommercialMoneyPreview(
    entry.externalPurchaseAmount,
    entry.derivedCurrency,
  );

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Public purchase history item
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
            {entry.sellerOrganizationTitle}
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Company name remains open · {entry.sellerCity}
          </p>
        </div>
        <div className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          {getPublicHistoryStatusLabel(entry)}
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-secondary/40 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Masked buyer
          </p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {entry.buyerMaskedName}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Buyer identity is masked for public display.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-secondary/40 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            External purchase amount
          </p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {externalPurchaseAmountLabel}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Public amount preview uses derived currency.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-secondary/40 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Confirmation date
          </p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {entry.confirmationDateLabel}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Status: {entry.confirmationStatus}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-sm leading-6 text-muted-foreground">
        {entry.publicSafetyNote}
      </div>

      <div className="mt-3 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-sm leading-6 text-muted-foreground">
        {footerNote}
      </div>
    </article>
  );
}


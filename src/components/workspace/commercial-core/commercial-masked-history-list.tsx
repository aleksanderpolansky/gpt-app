import type { PublicPurchaseHistoryEntry } from "./commercial-core.types";
import { CommercialPublicHistoryItem } from "./commercial-public-history-item";

type CommercialMaskedHistoryListProps = {
  readonly entries: readonly PublicPurchaseHistoryEntry[];
  readonly title?: string;
  readonly description?: string;
  readonly emptyMessage?: string;
  readonly footerNote?: string;
};

function getMaskedHistorySummary(
  entries: readonly PublicPurchaseHistoryEntry[],
): string {
  const entryCount = entries.length;
  const confirmedCount = entries.filter(
    (entry) => entry.confirmationStatus === "confirmed-by-seller",
  ).length;
  const pendingCount = entries.filter(
    (entry) => entry.confirmationStatus === "pending-seller-review",
  ).length;
  const rejectedCount = entries.filter(
    (entry) => entry.confirmationStatus === "rejected-by-seller",
  ).length;
  const maskedBuyerCount = entries.filter(
    (entry) => entry.buyerMaskedName.includes("*"),
  ).length;
  const companyCount = new Set(
    entries.map((entry) => entry.sellerOrganizationTitle),
  ).size;
  const cityCount = new Set(
    entries.map((entry) => entry.sellerCity),
  ).size;

  return (
    entryCount.toLocaleString("en-US") +
    " public entries · " +
    confirmedCount.toLocaleString("en-US") +
    " confirmed purchases · " +
    pendingCount.toLocaleString("en-US") +
    " pending · " +
    rejectedCount.toLocaleString("en-US") +
    " rejected · " +
    maskedBuyerCount.toLocaleString("en-US") +
    " masked buyers · " +
    companyCount.toLocaleString("en-US") +
    " open company names · " +
    cityCount.toLocaleString("en-US") +
    " cities"
  );
}

export function CommercialMaskedHistoryList({
  entries,
  title = "Masked public purchase history",
  description = "Read-only public history where buyer names are masked and company names remain open.",
  emptyMessage = "No public purchase history fixtures are available for this read-only preview.",
  footerNote = "Public history records are fixture-first. Buyer names are masked while seller company names remain open.",
}: CommercialMaskedHistoryListProps) {
  const hasEntries = entries.length > 0;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Commercial masked history list
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
        {getMaskedHistorySummary(entries)}
      </div>

      <div className="mt-3 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-sm leading-6 text-muted-foreground">
        This public safety preview keeps buyer names masked, keeps company names remain open, and exposes only fixture-first confirmation history.
      </div>

      {hasEntries ? (
        <div className="mt-5 flex flex-col gap-4">
          {entries.map((entry) => (
            <CommercialPublicHistoryItem
              entry={entry}
              footerNote={footerNote}
              key={entry.id}
            />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-border bg-secondary/40 p-5 text-sm leading-6 text-muted-foreground">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}


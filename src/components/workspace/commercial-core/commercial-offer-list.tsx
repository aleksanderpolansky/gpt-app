import type { OfferSummary } from "./commercial-core.types";
import { CommercialOfferCard } from "./commercial-offer-card";

type CommercialOfferListProps = {
  readonly offers: readonly OfferSummary[];
  readonly title?: string;
  readonly description?: string;
  readonly emptyMessage?: string;
  readonly footerNote?: string;
};

function getOfferListSummary(offers: readonly OfferSummary[]): string {
  const offerCount = offers.length;
  const certificateReadyCount = offers.filter(
    (offer) => offer.certificateReady,
  ).length;
  const futureGatedCount = offers.filter(
    (offer) => offer.accessState === "future-gated" || offer.actionState === "future-gated",
  ).length;

  return (
    offerCount.toLocaleString("en-US") +
    " offers · " +
    certificateReadyCount.toLocaleString("en-US") +
    " certificate-ready · " +
    futureGatedCount.toLocaleString("en-US") +
    " future-gated"
  );
}

export function CommercialOfferList({
  offers,
  title = "Offers",
  description = "Read-only commercial offer catalog with reference amount, points preview and certificate readiness.",
  emptyMessage = "No offer fixtures are available for this read-only preview.",
  footerNote = "Offer records are fixture-first. Creating or editing offers requires a future commercial write gate.",
}: CommercialOfferListProps) {
  const hasOffers = offers.length > 0;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Commercial offer catalog
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
        {getOfferListSummary(offers)}
      </div>

      {hasOffers ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {offers.map((offer) => (
            <CommercialOfferCard
              footerNote={footerNote}
              key={offer.id}
              offer={offer}
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


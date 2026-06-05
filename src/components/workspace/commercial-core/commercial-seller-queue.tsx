import type { SellerConfirmationRequestPreview } from "./commercial-core.types";
import { CommercialSellerRequestCard } from "./commercial-seller-request-card";

type CommercialSellerQueueProps = {
  readonly requests: readonly SellerConfirmationRequestPreview[];
  readonly title?: string;
  readonly description?: string;
  readonly emptyMessage?: string;
  readonly footerNote?: string;
};

function getSellerQueueSummary(
  requests: readonly SellerConfirmationRequestPreview[],
): string {
  const requestCount = requests.length;
  const pendingCount = requests.filter(
    (request) => request.status === "pending-seller-review",
  ).length;
  const confirmedCount = requests.filter(
    (request) => request.status === "confirmed-by-seller",
  ).length;
  const rejectedCount = requests.filter(
    (request) => request.status === "rejected-by-seller",
  ).length;
  const clarificationCount = requests.filter(
    (request) => request.status === "needs-buyer-clarification",
  ).length;
  const disabledDecisionCount = requests.reduce(
    (sum, request) => sum + request.availableDecisions.length,
    0,
  );

  return (
    requestCount.toLocaleString("en-US") +
    " seller requests · " +
    pendingCount.toLocaleString("en-US") +
    " pending · " +
    confirmedCount.toLocaleString("en-US") +
    " confirmed · " +
    rejectedCount.toLocaleString("en-US") +
    " rejected · " +
    clarificationCount.toLocaleString("en-US") +
    " clarification · " +
    disabledDecisionCount.toLocaleString("en-US") +
    " disabled decisions"
  );
}

export function CommercialSellerQueue({
  requests,
  title = "Seller confirmation queue",
  description = "Read-only seller queue for pending, rejected and confirmed external purchase confirmation requests.",
  emptyMessage = "No seller confirmation request fixtures are available for this read-only preview.",
  footerNote = "Seller queue records are fixture-first. confirm, reject and confirm-later controls stay disabled until a future commercial write gate.",
}: CommercialSellerQueueProps) {
  const hasRequests = requests.length > 0;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Commercial seller queue
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
        {getSellerQueueSummary(requests)}
      </div>

      <div className="mt-3 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-sm leading-6 text-muted-foreground">
        The queue shows seller review states only. It does not confirm, reject or schedule a later confirmation.
      </div>

      {hasRequests ? (
        <div className="mt-5 flex flex-col gap-4">
          {requests.map((request) => (
            <CommercialSellerRequestCard
              footerNote={footerNote}
              key={request.id}
              request={request}
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


import type {
  CommercialCoreStatusTone,
  PointOperationPreview,
} from "./commercial-core.types";
import { formatCommercialPointsPreview } from "./commercial-core.utils";

type CommercialPointsHistoryProps = {
  readonly operations: readonly PointOperationPreview[];
  readonly title?: string;
  readonly description?: string;
  readonly emptyMessage?: string;
};

const operationKindLabelByKind: Record<PointOperationPreview["kind"], string> = {
  "earned-preview": "Earned preview",
  "spent-preview": "Spent preview",
  "burned-preview": "Burned preview",
  "adjustment-preview": "Adjustment preview",
  "expired-preview": "Expired preview",
};

const toneClassNameByTone: Record<CommercialCoreStatusTone, string> = {
  neutral: "border-border bg-card text-foreground",
  primary: "border-primary/20 bg-primary/10 text-primary",
  secondary: "border-border bg-secondary text-secondary-foreground",
  success: "border-border bg-card text-foreground",
  warning: "border-border bg-secondary text-secondary-foreground",
  destructive: "border-destructive/20 bg-destructive/10 text-destructive",
  muted: "border-border bg-muted text-muted-foreground",
};

function getSignedPointsLabel(amount: number): string {
  const normalizedAmount = Math.round(amount);
  const absoluteLabel = formatCommercialPointsPreview(Math.abs(normalizedAmount));

  if (normalizedAmount > 0) {
    return "+" + absoluteLabel;
  }

  if (normalizedAmount < 0) {
    return "-" + absoluteLabel;
  }

  return absoluteLabel;
}

function getPointsHistorySummary(
  operations: readonly PointOperationPreview[],
): string {
  const operationCount = operations.length;
  const earnedCount = operations.filter(
    (operation) => operation.kind === "earned-preview",
  ).length;
  const burnedCount = operations.filter(
    (operation) => operation.kind === "burned-preview",
  ).length;
  const readOnlyCount = operations.filter(
    (operation) => operation.readOnlyNote.length > 0,
  ).length;

  return (
    operationCount.toLocaleString("en-US") +
    " operations · " +
    earnedCount.toLocaleString("en-US") +
    " earned · " +
    burnedCount.toLocaleString("en-US") +
    " burned · " +
    readOnlyCount.toLocaleString("en-US") +
    " read-only notes"
  );
}

function getRelatedContextLabel(operation: PointOperationPreview): string {
  const certificateLabel = operation.relatedCertificateTitle
    ? " · Certificate: " + operation.relatedCertificateTitle
    : "";
  const confirmationLabel = operation.relatedConfirmationCode
    ? " · Confirmation: " + operation.relatedConfirmationCode
    : "";

  return operation.relatedOrganizationTitle + certificateLabel + confirmationLabel;
}

export function CommercialPointsHistory({
  operations,
  title = "Points history",
  description = "Read-only point operations history with earned, spent, burned, adjustment and expired previews.",
  emptyMessage = "No point operation fixtures are available for this read-only preview.",
}: CommercialPointsHistoryProps) {
  const hasOperations = operations.length > 0;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Commercial points operations
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
        {getPointsHistorySummary(operations)}
      </div>

      {hasOperations ? (
        <div className="mt-5 flex flex-col gap-3">
          {operations.map((operation) => (
            <article
              className={
                "rounded-xl border p-4 shadow-sm " +
                toneClassNameByTone[operation.statusTone]
              }
              key={operation.id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {operationKindLabelByKind[operation.kind]} · {operation.createdAtLabel}
                  </p>
                  <h3 className="mt-2 text-base font-semibold text-foreground">
                    {operation.label}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {getRelatedContextLabel(operation)}
                  </p>
                </div>
                <div className="rounded-full border border-border bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
                  {getSignedPointsLabel(operation.amount)}
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-sm leading-6 text-muted-foreground">
                {operation.readOnlyNote}
              </div>
            </article>
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


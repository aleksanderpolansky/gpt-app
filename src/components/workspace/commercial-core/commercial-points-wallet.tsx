import type { PointsWalletSummary } from "./commercial-core.types";
import { formatCommercialPointsPreview } from "./commercial-core.utils";

type CommercialPointsWalletProps = {
  readonly wallet: PointsWalletSummary;
  readonly title?: string;
  readonly footerNote?: string;
};

function getWalletRatioLabel(availablePreview: number, balancePreview: number): string {
  if (balancePreview <= 0) {
    return "No available ratio in this preview";
  }

  const ratio = Math.max(0, Math.min(100, Math.round((availablePreview / balancePreview) * 100)));

  return ratio.toLocaleString("en-US") + "% available";
}

function getPointsMetricLabel(value: number): string {
  return formatCommercialPointsPreview(Math.max(0, Math.round(value)));
}

export function CommercialPointsWallet({
  wallet,
  title = "Points wallet",
  footerNote = "Points wallet data is fixture-first. Points changes require a future commercial write gate.",
}: CommercialPointsWalletProps) {
  const balanceLabel = getPointsMetricLabel(wallet.balancePreview);
  const availableLabel = getPointsMetricLabel(wallet.availablePreview);
  const lockedLabel = getPointsMetricLabel(wallet.lockedPreview);
  const earnedAfterSellerConfirmationLabel = getPointsMetricLabel(
    wallet.earnedAfterSellerConfirmationPreview,
  );
  const burnedOnCertificatesLabel = getPointsMetricLabel(
    wallet.burnedOnCertificatesPreview,
  );
  const availableRatioLabel = getWalletRatioLabel(
    wallet.availablePreview,
    wallet.balancePreview,
  );

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {wallet.ownerLabel}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Read-only points wallet summary with balance, available points, locked points and burn preview.
          </p>
        </div>
        <div className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          Read-only
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Balance
          </p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {balanceLabel}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Available
          </p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {availableLabel}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Locked
          </p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {lockedLabel}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Earned after seller confirmation
          </p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {earnedAfterSellerConfirmationLabel}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Burned on certificates
          </p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {burnedOnCertificatesLabel}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-secondary/40 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Available ratio
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {availableRatioLabel}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-secondary/40 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Currency context
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {wallet.derivedCurrencyContext}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-secondary/40 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Seller money boundary
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            Points are not seller money.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-sm leading-6 text-muted-foreground">
        Points are earned only after seller confirmation and are burned when certificates use them.
      </div>

      <div className="mt-3 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-sm leading-6 text-muted-foreground">
        {wallet.readOnlyNotice}
      </div>

      <div className="mt-3 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-sm leading-6 text-muted-foreground">
        {footerNote}
      </div>
    </section>
  );
}


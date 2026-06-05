import type {
  CommercialCoreStatusTone,
  CommercialCoreViewModel,
} from "./commercial-core.types";
import { CommercialBuyerConfirmationFormPreview } from "./commercial-buyer-confirmation-form-preview";
import { CommercialBuyerStatusList } from "./commercial-buyer-status-list";
import { CommercialCertificateList } from "./commercial-certificate-list";
import { CommercialCoreShell } from "./commercial-core-shell";
import { CommercialMaskedHistoryList } from "./commercial-masked-history-list";
import { CommercialNavigationLinks } from "./commercial-navigation-links";
import { CommercialNoRightsStatePanel } from "./commercial-no-rights-state";
import { CommercialOfferList } from "./commercial-offer-list";
import { CommercialOrganizationList } from "./commercial-organization-list";
import { CommercialPointsHistory } from "./commercial-points-history";
import { CommercialPointsWallet } from "./commercial-points-wallet";
import { CommercialReadOnlyBoundaryPanel } from "./commercial-read-only-boundary";
import { CommercialSellerQueue } from "./commercial-seller-queue";
import { CommercialSummaryHeader } from "./commercial-summary-header";

type CommercialDashboardComposerProps = {
  readonly viewModel: CommercialCoreViewModel;
};

type CommercialDashboardMetric = {
  readonly label: string;
  readonly value: string;
  readonly description: string;
  readonly tone: CommercialCoreStatusTone;
};

function getCountLabel(count: number): string {
  return count.toLocaleString("en-US");
}

function buildDashboardMetrics(
  viewModel: CommercialCoreViewModel,
): readonly CommercialDashboardMetric[] {
  return [
    {
      label: "Organizations",
      value: getCountLabel(viewModel.organizations.length),
      description: "Read-only organization records with derived currency context.",
      tone: "primary",
    },
    {
      label: "Offers",
      value: getCountLabel(viewModel.offers.length),
      description: "Commercial offer fixtures without platform purchase flow.",
      tone: "secondary",
    },
    {
      label: "Certificates",
      value: getCountLabel(viewModel.certificates.length),
      description: "Certificate previews with points burn and money boundary.",
      tone: "success",
    },
    {
      label: "Public history",
      value: getCountLabel(viewModel.publicHistory.length),
      description: "Masked buyer history with open seller company names.",
      tone: "muted",
    },
  ];
}

export function CommercialDashboardComposer({
  viewModel,
}: CommercialDashboardComposerProps) {
  const dashboardMetrics = buildDashboardMetrics(viewModel);

  return (
    <CommercialCoreShell
      accessState={viewModel.header.accessState}
      aside={
        <div className="flex flex-col gap-4">
          <CommercialNavigationLinks
            activeRoute={viewModel.header.activeRoute}
            links={viewModel.navigationLinks}
            title="Commercial navigation"
          />
          <CommercialReadOnlyBoundaryPanel
            boundary={viewModel.readOnlyBoundary}
            title="Read-only boundary"
          />
          <CommercialNoRightsStatePanel
            state={viewModel.noRightsState}
            title="No rights fallback"
          />
        </div>
      }
      description={viewModel.header.description}
      eyebrow={viewModel.header.eyebrow}
      title={viewModel.header.title}
    >
      <div className="flex flex-col gap-6">
        <CommercialSummaryHeader
          header={viewModel.header}
          metrics={dashboardMetrics}
          notice="Dashboard composer is fixture-first, read-only and contains no hidden writes."
        />

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Commercial dashboard composer
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Fixture-first commercial overview
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            This read-only dashboard composer assembles organizations, offers, certificates, points, buyer confirmations, seller queue and public masked history.
          </p>
        </section>

        <CommercialOrganizationList organizations={viewModel.organizations} />
        <CommercialOfferList offers={viewModel.offers} />
        <CommercialCertificateList certificates={viewModel.certificates} />

        <div className="grid gap-6 xl:grid-cols-2">
          <CommercialPointsWallet wallet={viewModel.pointsWallet} />
          <CommercialPointsHistory operations={viewModel.pointOperations} />
        </div>

        <CommercialBuyerConfirmationFormPreview
          form={viewModel.buyerConfirmationForm}
        />
        <CommercialBuyerStatusList confirmations={viewModel.buyerConfirmations} />
        <CommercialSellerQueue requests={viewModel.sellerQueue} />
        <CommercialMaskedHistoryList entries={viewModel.publicHistory} />
      </div>
    </CommercialCoreShell>
  );
}


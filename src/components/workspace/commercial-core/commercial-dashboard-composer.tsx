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

type CommercialDashboardComposerText = {
  readonly metricOrganizationsLabel: string;
  readonly metricOrganizationsDescription: string;
  readonly metricOffersLabel: string;
  readonly metricOffersDescription: string;
  readonly metricCertificatesLabel: string;
  readonly metricCertificatesDescription: string;
  readonly metricPublicHistoryLabel: string;
  readonly metricPublicHistoryDescription: string;
  readonly navigationTitle: string;
  readonly navigationDescription: string;
  readonly readOnlyBoundaryTitle: string;
  readonly shellNotice: string;
  readonly notice: string;
  readonly sectionEyebrow: string;
  readonly sectionTitle: string;
  readonly sectionDescription: string;
  readonly accessStateLabel: string;
};

const defaultCommercialDashboardComposerText: CommercialDashboardComposerText = {
  metricOrganizationsLabel: "Organizations",
  metricOrganizationsDescription:
    "Read-only organization records with derived currency context.",
  metricOffersLabel: "Offers",
  metricOffersDescription:
    "Commercial offer fixtures without platform purchase flow.",
  metricCertificatesLabel: "Certificates",
  metricCertificatesDescription:
    "Certificate previews with points burn and money boundary.",
  metricPublicHistoryLabel: "Public history",
  metricPublicHistoryDescription:
    "Masked buyer history with open seller company names.",
  navigationTitle: "Commercial navigation",
  navigationDescription:
    "Seven fixture-first commercial routes. Links are safe navigation only.",
  readOnlyBoundaryTitle: "Read-only boundary",
  shellNotice:
    "UI-14 commercial core is fixture-first and read-only. Commercial write actions remain disabled until a future approved gate.",
  notice: "Dashboard composer is fixture-first, read-only and contains no hidden writes.",
  sectionEyebrow: "Commercial dashboard composer",
  sectionTitle: "Fixture-first commercial overview",
  sectionDescription:
    "This read-only dashboard composer assembles organizations, offers, certificates, points, buyer confirmations, seller queue and public masked history.",
  accessStateLabel: "Read-only",
};

type CommercialDashboardComposerViewModel = CommercialCoreViewModel & {
  readonly composerText?: Partial<CommercialDashboardComposerText>;
};

type CommercialDashboardMetric = {
  readonly label: string;
  readonly value: string;
  readonly description: string;
  readonly tone: CommercialCoreStatusTone;
};

function getCommercialDashboardComposerText(
  viewModel: CommercialCoreViewModel,
): CommercialDashboardComposerText {
  return {
    ...defaultCommercialDashboardComposerText,
    ...((viewModel as CommercialDashboardComposerViewModel).composerText ?? {}),
  };
}

function getCountLabel(count: number): string {
  return count.toLocaleString("en-US");
}

function buildDashboardMetrics(
  viewModel: CommercialCoreViewModel,
  composerText: CommercialDashboardComposerText,
): readonly CommercialDashboardMetric[] {
  return [
    {
      label: composerText.metricOrganizationsLabel,
      value: getCountLabel(viewModel.organizations.length),
      description: composerText.metricOrganizationsDescription,
      tone: "primary",
    },
    {
      label: composerText.metricOffersLabel,
      value: getCountLabel(viewModel.offers.length),
      description: composerText.metricOffersDescription,
      tone: "secondary",
    },
    {
      label: composerText.metricCertificatesLabel,
      value: getCountLabel(viewModel.certificates.length),
      description: composerText.metricCertificatesDescription,
      tone: "success",
    },
    {
      label: composerText.metricPublicHistoryLabel,
      value: getCountLabel(viewModel.publicHistory.length),
      description: composerText.metricPublicHistoryDescription,
      tone: "muted",
    },
  ];
}

export function CommercialDashboardComposer({
  viewModel,
}: CommercialDashboardComposerProps) {
  const composerText = getCommercialDashboardComposerText(viewModel);
  const dashboardMetrics = buildDashboardMetrics(viewModel, composerText);

  return (
    <CommercialCoreShell
      accessState={viewModel.header.accessState}
      accessStateLabel={composerText.accessStateLabel}
      aside={
        <div className="flex flex-col gap-4">
          <CommercialNavigationLinks
            activeRoute={viewModel.header.activeRoute}
            description={composerText.navigationDescription}
            links={viewModel.navigationLinks}
            title={composerText.navigationTitle}
          />
          <CommercialReadOnlyBoundaryPanel
            boundary={viewModel.readOnlyBoundary}
            title={composerText.readOnlyBoundaryTitle}
          />
          <CommercialNoRightsStatePanel
            state={viewModel.noRightsState}
            title="No rights fallback"
          />
        </div>
      }
      description={viewModel.header.description}
      eyebrow={viewModel.header.eyebrow}
      notice={composerText.shellNotice}
      title={viewModel.header.title}
    >
      <div className="flex flex-col gap-6">
        <CommercialSummaryHeader
          accessStateLabel={composerText.accessStateLabel}
          header={viewModel.header}
          metrics={dashboardMetrics}
          notice={composerText.notice}
        />

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {composerText.sectionEyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {composerText.sectionTitle}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {composerText.sectionDescription}
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

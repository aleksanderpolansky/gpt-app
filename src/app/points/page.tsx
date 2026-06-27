import type { Metadata } from "next";

import {
  CommercialDashboardComposer,
  commercialCoreFixture,
  type CommercialCoreViewModel,
} from "../../components/workspace/commercial-core";
import { getPointsText } from "../../i18n/messages";

type PointsSearchParams = Record<string, string | string[] | undefined>;
type PointsLocale = NonNullable<Parameters<typeof getPointsText>[1]>;
type PointsMessageKey = Parameters<typeof getPointsText>[0];
type PointsTextGetter = (key: PointsMessageKey) => string;

type PointsComposerText = ReturnType<typeof buildPointsComposerText>;
type PointsCommercialCoreViewModel = CommercialCoreViewModel & {
  readonly composerText: PointsComposerText;
};

const pointsSupportedLocales = [
  "ru",
  "pl",
  "en",
  "es",
  "uk",
  "de",
  "cs",
] as const;

function normalizePointsLocale(value: string | string[] | undefined): PointsLocale {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (pointsSupportedLocales.includes(candidate as PointsLocale)) {
    return candidate as PointsLocale;
  }

  return "en";
}

async function resolvePointsSearchParams(
  searchParams: Promise<PointsSearchParams> | PointsSearchParams | undefined,
): Promise<PointsSearchParams> {
  if (!searchParams) {
    return {};
  }

  return await searchParams;
}

const pointsMetadataText = (key: PointsMessageKey) => getPointsText(key, "en");

export const metadata: Metadata = {
  title: pointsMetadataText("points.page.metadataTitle"),
  description: pointsMetadataText("points.page.metadataDescription"),
};

function buildPointsComposerText(pointsText: PointsTextGetter) {
  return {
    metricOrganizationsLabel: pointsText("points.composer.metricOrganizationsLabel"),
    metricOrganizationsDescription: pointsText(
      "points.composer.metricOrganizationsDescription",
    ),
    metricOffersLabel: pointsText("points.composer.metricOffersLabel"),
    metricOffersDescription: pointsText("points.composer.metricOffersDescription"),
    metricCertificatesLabel: pointsText("points.composer.metricCertificatesLabel"),
    metricCertificatesDescription: pointsText(
      "points.composer.metricCertificatesDescription",
    ),
    metricPublicHistoryLabel: pointsText("points.composer.metricPublicHistoryLabel"),
    metricPublicHistoryDescription: pointsText(
      "points.composer.metricPublicHistoryDescription",
    ),
    navigationTitle: pointsText("points.composer.navigationTitle"),
    navigationDescription: pointsText("points.composer.navigationDescription"),
    readOnlyBoundaryTitle: pointsText("points.composer.readOnlyBoundaryTitle"),
    shellNotice: pointsText("points.composer.shellNotice"),
    notice: pointsText("points.composer.notice"),
    sectionEyebrow: pointsText("points.composer.sectionEyebrow"),
    sectionTitle: pointsText("points.composer.sectionTitle"),
    sectionDescription: pointsText("points.composer.sectionDescription"),
    accessStateLabel: pointsText("points.composer.badgeReadOnly"),
  };
}

function buildPointsNavigationLinks(
  pointsText: PointsTextGetter,
): CommercialCoreViewModel["navigationLinks"] {
  return commercialCoreFixture.navigationLinks.map((link) => {
    switch (link.routeKey) {
      case "organizations":
        return {
          ...link,
          label: pointsText("points.composer.navOrganizationsTitle"),
          description: pointsText("points.composer.navOrganizationsDescription"),
          badge: pointsText("points.composer.badgeReadOnly"),
        };
      case "offers":
        return {
          ...link,
          label: pointsText("points.composer.navOffersTitle"),
          description: pointsText("points.composer.navOffersDescription"),
          badge: pointsText("points.composer.badgeFixture"),
        };
      case "certificates":
        return {
          ...link,
          label: pointsText("points.composer.navCertificatesTitle"),
          description: pointsText("points.composer.navCertificatesDescription"),
          badge: pointsText("points.composer.badgeFutureGate"),
        };
      case "points":
        return {
          ...link,
          label: pointsText("points.composer.navPointsTitle"),
          description: pointsText("points.composer.navPointsDescription"),
          badge: pointsText("points.composer.badgePreviewOnly"),
        };
      default:
        return link;
    }
  });
}

function buildPointsCommercialViewModel(
  pointsText: PointsTextGetter,
): PointsCommercialCoreViewModel {
  return {
    ...commercialCoreFixture,
    composerText: buildPointsComposerText(pointsText),
    navigationLinks: buildPointsNavigationLinks(pointsText),
    header: {
      ...commercialCoreFixture.header,
      activeRoute: "points",
      accessState: "read-only",
      eyebrow: pointsText("points.page.eyebrow"),
      title: pointsText("points.page.title"),
      description: pointsText("points.page.description"),
    },
  };
}

export default async function PointsPage({
  searchParams,
}: {
  readonly searchParams?: Promise<PointsSearchParams> | PointsSearchParams;
}) {
  const resolvedSearchParams = await resolvePointsSearchParams(searchParams);
  const locale = normalizePointsLocale(
    resolvedSearchParams.locale ?? resolvedSearchParams.lang,
  );
  const pointsText = (key: PointsMessageKey) => getPointsText(key, locale);

  return (
    <main>
      <CommercialDashboardComposer
        viewModel={buildPointsCommercialViewModel(pointsText)}
      />
    </main>
  );
}

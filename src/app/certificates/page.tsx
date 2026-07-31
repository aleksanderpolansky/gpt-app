import {
  CertificatesDashboardContent,
  type CertificateDashboardItem,
} from "../../components/figma-dashboard/certificates-dashboard";
import {
  buildGiftCertificateLocaleHref,
  normalizeGiftCertificateLocale,
} from "./gift-certificate-copy";
import { listAvailableGiftCertificates } from "./gift-certificate-data";

export const dynamic = "force-dynamic";

type CertificatesPageProps = {
  readonly searchParams?: Promise<{
    readonly locale?: string | string[];
    readonly lang?: string | string[];
  }>;
};

export default async function CertificatesPage({
  searchParams,
}: CertificatesPageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = normalizeGiftCertificateLocale(
    resolvedSearchParams?.locale ?? resolvedSearchParams?.lang,
  );
  const certificates = await listAvailableGiftCertificates();

  const items: CertificateDashboardItem[] = certificates.map(
    (certificate) => ({
      id: certificate.activityEventId,
      title: certificate.title,
      description: certificate.description,
      objectKind: certificate.objectKind,
      providerName: certificate.providerDisplayName,
      providerHref: certificate.providerPublicHref,
      recipientName: certificate.recipientDisplayName,
      recipientHref: certificate.recipientPublicHref,
      providerReputation: certificate.providerReputation,
      state: certificate.flowState,
      regularPrice: certificate.regularPrice,
      pointsPrice: certificate.pointsPrice,
      moneyRemainder: certificate.moneyRemainder,
      currency: certificate.providerCurrency,
      availableFrom: certificate.availableFrom,
      availableUntil: certificate.availableUntil,
      publicCode: certificate.publicCode,
      publishedAt: certificate.publishedAt,
      orderedAt: certificate.orderedAt,
      finalizedAt: certificate.confirmation?.finalized_at ?? null,
      href: buildGiftCertificateLocaleHref(
        `/certificates/${certificate.activityEventId}`,
        locale,
      ),
      shareHref: buildGiftCertificateLocaleHref(
        `/certificates/${certificate.activityEventId}`,
        locale,
      ),
    }),
  );

  return (
    <CertificatesDashboardContent
      initialLocale={locale}
      mode="catalog"
      items={items}
    />
  );
}

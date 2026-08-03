import { auth0 } from "../../../lib/auth0";
import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../lib/actor-context";
import {
  CertificatesDashboardContent,
  type CertificateDashboardItem,
} from "../../components/figma-dashboard/certificates-dashboard";
import {
  buildGiftCertificateLocaleHref,
  normalizeGiftCertificateLocale,
} from "../certificates/gift-certificate-copy";
import { listProviderGiftCertificates } from "../certificates/gift-certificate-data";

export const dynamic = "force-dynamic";

type SellerCertificatesPageProps = {
  readonly searchParams?: Promise<{
    readonly locale?: string | string[];
    readonly lang?: string | string[];
  }>;
};

function getAuthenticationMessage(locale: string): string {
  if (locale === "ru") {
    return "Войдите в учётную запись, чтобы увидеть предоставленные сертификаты.";
  }

  if (locale === "pl") {
    return "Zaloguj się, aby zobaczyć udostępnione bony.";
  }

  if (locale === "uk") {
    return "Увійдіть, щоб побачити надані сертифікати.";
  }

  if (locale === "de") {
    return "Melden Sie sich an, um bereitgestellte Gutscheine zu sehen.";
  }

  if (locale === "es") {
    return "Inicia sesión para ver los certificados ofrecidos.";
  }

  if (locale === "cs") {
    return "Přihlaste se, abyste viděli poskytnuté certifikáty.";
  }

  return "Sign in to see provided certificates.";
}

export default async function SellerCertificatesPage({
  searchParams,
}: SellerCertificatesPageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = normalizeGiftCertificateLocale(
    resolvedSearchParams?.locale ?? resolvedSearchParams?.lang,
  );
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return (
      <CertificatesDashboardContent
        initialLocale={locale}
        mode="provider"
        items={[]}
        errorMessage={getAuthenticationMessage(locale)}
      />
    );
  }

  try {
    const actorContext = await resolveActiveActorContext(
      session.user.sub,
    );
    const certificates = await listProviderGiftCertificates(
      actorContext.appUserId,
    );

    const items: CertificateDashboardItem[] = certificates.map(
      (certificate) => ({
        id: certificate.activityEventId,
        title: certificate.title,
        description: certificate.description,
        objectKind: certificate.objectKind,
        providerName: certificate.providerDisplayName,
        providerHref: certificate.providerPublicHref,
        providerImageUrl: certificate.providerImageUrl,
        productImageUrl: certificate.productImageUrl,
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
          `/gift-certificates/${certificate.activityEventId}`,
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
        mode="provider"
        items={items}
      />
    );
  } catch (error) {
    const message =
      error instanceof ActorContextError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Could not load provided certificates.";

    return (
      <CertificatesDashboardContent
        initialLocale={locale}
        mode="provider"
        items={[]}
        errorMessage={message}
      />
    );
  }
}

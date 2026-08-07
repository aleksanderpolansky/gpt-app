import { auth0 } from "../../../lib/auth0";
import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../lib/actor-context";
import {
  CertificatesDashboardContent,
  type CertificateDashboardItem,
  type CertificateDashboardMode,
} from "../../components/figma-dashboard/certificates-dashboard";
import {
  buildGiftCertificateLocaleHref,
  normalizeGiftCertificateLocale,
} from "./gift-certificate-copy";
import {
  listPublicGiftCertificates,
  listBuyerGiftCertificates,
  listProviderGiftCertificates,
  type GiftCertificateCatalogItem,
} from "./gift-certificate-data";

export const dynamic = "force-dynamic";

type CertificatesPageProps = {
  readonly searchParams?: Promise<{
    readonly locale?: string | string[];
    readonly lang?: string | string[];
    readonly scope?: string | string[];
    readonly role?: string | string[];
    readonly view?: string | string[];
  }>;
};

const ARCHIVE_STATES = new Set([
  "confirmed_by_buyer",
  "auto_confirmed",
  "redeemed",
  "expired",
  "annulled",
]);

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeView(
  scopeValue: string | string[] | undefined,
  roleValue: string | string[] | undefined,
  legacyViewValue: string | string[] | undefined,
): CertificateDashboardMode {
  const scope = firstParam(scopeValue)?.trim().toLowerCase();
  const role = firstParam(roleValue)?.trim().toLowerCase();
  const legacyView = firstParam(legacyViewValue)?.trim().toLowerCase();

  if (scope === "all") return "participants";

  if (scope === "mine") {
    if (role === "received" || role === "buyer") return "received";
    if (role === "provided" || role === "provider") return "provided";
    return "mine";
  }

  if (legacyView === "received" || legacyView === "buyer") return "received";
  if (legacyView === "provided" || legacyView === "provider") return "provided";
  if (legacyView === "archive" || legacyView === "archived") return "archive";
  if (legacyView === "mine") return "mine";
  return "participants";
}

function getAuthenticationMessage(
  locale: string,
  view: Exclude<CertificateDashboardMode, "participants">,
): string {
  const messages: Record<
    string,
    Record<Exclude<CertificateDashboardMode, "participants">, string>
  > = {
    en: {
      mine: "Sign in to see all certificates connected with your account.",
      received: "Sign in to see your received certificates.",
      provided: "Sign in to see your provided certificates.",
      archive: "Sign in to see your offer archive.",
    },
    ru: {
      mine: "Войдите в учётную запись, чтобы увидеть все свои сертификаты.",
      received: "Войдите в учётную запись, чтобы увидеть полученные сертификаты.",
      provided: "Войдите в учётную запись, чтобы увидеть предоставленные сертификаты.",
      archive: "Войдите в учётную запись, чтобы открыть архив предложений.",
    },
    pl: {
      mine: "Zaloguj się, aby zobaczyć wszystkie certyfikaty powiązane z Twoim kontem.",
      received: "Zaloguj się, aby zobaczyć otrzymane certyfikaty.",
      provided: "Zaloguj się, aby zobaczyć wydane certyfikaty.",
      archive: "Zaloguj się, aby zobaczyć archiwum ofert.",
    },
    uk: {
      mine: "Увійдіть, щоб побачити всі сертифікати, пов’язані з вашим обліковим записом.",
      received: "Увійдіть, щоб побачити отримані сертифікати.",
      provided: "Увійдіть, щоб побачити надані сертифікати.",
      archive: "Увійдіть, щоб відкрити архів пропозицій.",
    },
    de: {
      mine: "Melden Sie sich an, um alle mit Ihrem Konto verbundenen Gutscheine zu sehen.",
      received: "Melden Sie sich an, um erhaltene Gutscheine zu sehen.",
      provided: "Melden Sie sich an, um bereitgestellte Gutscheine zu sehen.",
      archive: "Melden Sie sich an, um das Angebotsarchiv zu sehen.",
    },
    es: {
      mine: "Inicia sesión para ver todos los certificados vinculados a tu cuenta.",
      received: "Inicia sesión para ver los certificados recibidos.",
      provided: "Inicia sesión para ver los certificados proporcionados.",
      archive: "Inicia sesión para ver el archivo de ofertas.",
    },
    cs: {
      mine: "Přihlaste se, abyste viděli všechny certifikáty spojené s vaším účtem.",
      received: "Přihlaste se, abyste viděli přijaté certifikáty.",
      provided: "Přihlaste se, abyste viděli poskytnuté certifikáty.",
      archive: "Přihlaste se, abyste viděli archiv nabídek.",
    },
  };

  return (messages[locale] ?? messages.en)[view];
}

type GiftCertificateLocale = ReturnType<typeof normalizeGiftCertificateLocale>;

function toDashboardItem(
  certificate: GiftCertificateCatalogItem,
  locale: GiftCertificateLocale,
): CertificateDashboardItem {
  const href = buildGiftCertificateLocaleHref(
    `/certificates/${certificate.activityEventId}`,
    locale,
  );

  return {
    id: certificate.activityEventId,
    title: certificate.title,
    description: certificate.description,
    objectKind: certificate.objectKind,
    providerName: certificate.providerDisplayName,
    providerType: certificate.providerType,
    providerHref: certificate.providerPublicHref,
    providerImageUrl: certificate.providerImageUrl,
    productImageUrl: certificate.productImageUrl,
    recipientName: certificate.recipientDisplayName,
    recipientHref: certificate.recipientPublicHref,
    providerReputation: certificate.providerReputation,
    state: certificate.flowState,
    publicVisibilityStatus: certificate.publicVisibilityStatus,
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
    redeemedAt: certificate.redeemedAt,
    href,
    shareHref: href,
  };
}

function deduplicateCertificates(
  certificates: readonly GiftCertificateCatalogItem[],
): GiftCertificateCatalogItem[] {
  const result = new Map<string, GiftCertificateCatalogItem>();

  for (const certificate of certificates) {
    result.set(certificate.activityEventId, certificate);
  }

  return [...result.values()].sort((left, right) =>
    String(
      right.redeemedAt ?? right.orderedAt ?? right.publishedAt ?? right.updatedAt,
    ).localeCompare(
      String(
        left.redeemedAt ?? left.orderedAt ?? left.publishedAt ?? left.updatedAt,
      ),
    ),
  );
}

export default async function CertificatesPage({
  searchParams,
}: CertificatesPageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = normalizeGiftCertificateLocale(
    resolvedSearchParams?.locale ?? resolvedSearchParams?.lang,
  );
  const view = normalizeView(
    resolvedSearchParams?.scope,
    resolvedSearchParams?.role,
    resolvedSearchParams?.view,
  );

  if (view === "participants") {
    const certificates = await listPublicGiftCertificates();
    return (
      <CertificatesDashboardContent
        initialLocale={locale}
        mode={view}
        items={certificates.map((certificate) => toDashboardItem(certificate, locale))}
      />
    );
  }

  const session = await auth0.getSession();
  if (!session?.user?.sub) {
    return (
      <CertificatesDashboardContent
        initialLocale={locale}
        mode={view}
        items={[]}
        errorMessage={getAuthenticationMessage(locale, view)}
      />
    );
  }

  try {
    const actorContext = await resolveActiveActorContext(session.user.sub);
    let certificates: GiftCertificateCatalogItem[];

    if (view === "received") {
      certificates = await listBuyerGiftCertificates(actorContext.appUserId);
    } else if (view === "provided") {
      certificates = await listProviderGiftCertificates(actorContext.appUserId);
    } else {
      const [received, provided] = await Promise.all([
        listBuyerGiftCertificates(actorContext.appUserId),
        listProviderGiftCertificates(actorContext.appUserId),
      ]);
      const combined = deduplicateCertificates([...received, ...provided]);
      certificates =
        view === "archive"
          ? combined.filter((certificate) =>
              ARCHIVE_STATES.has(certificate.flowState),
            )
          : combined;
    }

    return (
      <CertificatesDashboardContent
        initialLocale={locale}
        mode={view}
        items={certificates.map((certificate) => toDashboardItem(certificate, locale))}
      />
    );
  } catch (error) {
    const message =
      error instanceof ActorContextError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Could not load certificates.";

    return (
      <CertificatesDashboardContent
        initialLocale={locale}
        mode={view}
        items={[]}
        errorMessage={message}
      />
    );
  }
}

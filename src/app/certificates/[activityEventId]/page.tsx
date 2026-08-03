import Link from "next/link";
import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { Gift, MapPin, Package, Star } from "lucide-react";

import {
  ActorContextError,
  resolveActiveActorContext,
  type ResolvedActorContext,
} from "../../../../lib/actor-context";
import { auth0 } from "../../../../lib/auth0";
import OrganizationLocationMapPreview from "@/components/commercial/OrganizationLocationMapPreview";
import { CertificateCommercialPrice } from "@/components/figma-dashboard/certificate-commercial-price";
import { CertificateShareButton } from "@/components/figma-dashboard/certificate-share-button";
import { type LocaleCode } from "@/i18n";
import { ActivityScheduleDisplay } from "../../value-objects/[id]/activity-schedule-display";
import {
  buildGiftCertificateLocaleHref,
  formatGiftCertificateDate,
  formatGiftCertificateMoney,
  formatGiftCertificatePoints,
  getGiftCertificateDeliveryLabel,
  getGiftCertificateStatusLabel,
  GIFT_CERTIFICATE_CATALOG_COPY,
  normalizeGiftCertificateLocale,
} from "../gift-certificate-copy";
import {
  getGiftCertificateCatalogItem,
  type GiftCertificateCatalogItem,
} from "../gift-certificate-data";
import { GiftCertificateFulfillmentConfirmation } from "./gift-certificate-fulfillment-confirmation";
import { GiftCertificateLocalDateTime } from "./gift-certificate-local-date-time";
import { GiftCertificateQr } from "./gift-certificate-qr";
import { OrderGiftCertificateButton } from "./order-gift-certificate-button";

export const dynamic = "force-dynamic";

type CertificatePageProps = {
  readonly params: Promise<{
    readonly activityEventId: string;
  }>;
  readonly searchParams?: Promise<{
    readonly locale?: string | string[];
  }>;
};

type OfferDetailCopy = {
  readonly eyebrow: string;
  readonly title: string;
  readonly back: string;
  readonly address: string;
  readonly locationMissing: string;
  readonly provider: string;
  readonly providerKind: string;
  readonly personal: string;
  readonly avatar: string;
  readonly organization: string;
  readonly offer: string;
  readonly commercialTerms: string;
  readonly reputation: string;
  readonly share: string;
};

const OFFER_DETAIL_COPY: Record<LocaleCode, OfferDetailCopy> = {
  en: {
    eyebrow: "ARCTor offer",
    title: "Offer details",
    back: "Back to offers",
    address: "Address",
    locationMissing: "Public provider location has not been added yet.",
    provider: "Provider",
    providerKind: "Provider type",
    personal: "Personal profile",
    avatar: "Avatar",
    organization: "Business",
    offer: "Offer",
    commercialTerms: "Offer terms",
    reputation: "Reputation",
    share: "Share offer",
  },
  pl: {
    eyebrow: "Oferta ARCTor",
    title: "Szczegóły oferty",
    back: "Wróć do ofert",
    address: "Adres",
    locationMissing: "Publiczna lokalizacja dostawcy nie została jeszcze dodana.",
    provider: "Dostawca",
    providerKind: "Typ dostawcy",
    personal: "Profil osobisty",
    avatar: "Awatar",
    organization: "Firma",
    offer: "Oferta",
    commercialTerms: "Warunki oferty",
    reputation: "Reputacja",
    share: "Udostępnij ofertę",
  },
  ru: {
    eyebrow: "Предложение ARCTor",
    title: "Подробнее о предложении",
    back: "Назад к предложениям",
    address: "Адрес",
    locationMissing: "Публичная геолокация предоставляющего пока не добавлена.",
    provider: "Предоставляющий",
    providerKind: "Вид предоставляющего",
    personal: "Личный профиль",
    avatar: "Аватар",
    organization: "Предприятие",
    offer: "Предложение",
    commercialTerms: "Условия предложения",
    reputation: "Репутация",
    share: "Поделиться предложением",
  },
  uk: {
    eyebrow: "Пропозиція ARCTor",
    title: "Докладніше про пропозицію",
    back: "Назад до пропозицій",
    address: "Адреса",
    locationMissing: "Публічну геолокацію надавача ще не додано.",
    provider: "Надавач",
    providerKind: "Вид надавача",
    personal: "Особистий профіль",
    avatar: "Аватар",
    organization: "Підприємство",
    offer: "Пропозиція",
    commercialTerms: "Умови пропозиції",
    reputation: "Репутація",
    share: "Поділитися пропозицією",
  },
  de: {
    eyebrow: "ARCTor-Angebot",
    title: "Angebotsdetails",
    back: "Zurück zu den Angeboten",
    address: "Adresse",
    locationMissing: "Der öffentliche Standort des Anbieters wurde noch nicht hinzugefügt.",
    provider: "Anbieter",
    providerKind: "Anbietertyp",
    personal: "Persönliches Profil",
    avatar: "Avatar",
    organization: "Unternehmen",
    offer: "Angebot",
    commercialTerms: "Angebotsbedingungen",
    reputation: "Reputation",
    share: "Angebot teilen",
  },
  es: {
    eyebrow: "Oferta ARCTor",
    title: "Detalles de la oferta",
    back: "Volver a las ofertas",
    address: "Dirección",
    locationMissing: "La ubicación pública del proveedor aún no se ha añadido.",
    provider: "Proveedor",
    providerKind: "Tipo de proveedor",
    personal: "Perfil personal",
    avatar: "Avatar",
    organization: "Empresa",
    offer: "Oferta",
    commercialTerms: "Condiciones de la oferta",
    reputation: "Reputación",
    share: "Compartir oferta",
  },
  cs: {
    eyebrow: "Nabídka ARCTor",
    title: "Podrobnosti nabídky",
    back: "Zpět k nabídkám",
    address: "Adresa",
    locationMissing: "Veřejná poloha poskytovatele zatím nebyla přidána.",
    provider: "Poskytovatel",
    providerKind: "Typ poskytovatele",
    personal: "Osobní profil",
    avatar: "Avatar",
    organization: "Podnik",
    offer: "Nabídka",
    commercialTerms: "Podmínky nabídky",
    reputation: "Reputace",
    share: "Sdílet nabídku",
  },
};

function isPubliclyShareableLifecycle(status: string): boolean {
  return ["available", "active", "redeemed", "expired", "annulled"].includes(
    status,
  );
}

export async function generateMetadata({
  params,
  searchParams,
}: CertificatePageProps): Promise<Metadata> {
  const { activityEventId } = await params;
  const resolvedSearchParams = await searchParams;
  const locale = normalizeGiftCertificateLocale(resolvedSearchParams?.locale);
  const certificate = await getGiftCertificateCatalogItem(activityEventId);

  if (
    !certificate ||
    certificate.activity.status !== "planned" ||
    !isPubliclyShareableLifecycle(certificate.lifecycleStatus)
  ) {
    return {
      title: "ARCTor",
      robots: { index: false, follow: false },
    };
  }

  const points = formatGiftCertificatePoints(certificate.pointsPrice, locale);
  const remainder =
    certificate.moneyRemainder > 0
      ? formatGiftCertificateMoney(
          certificate.moneyRemainder,
          certificate.providerCurrency,
          locale,
        )
      : null;
  const description = [
    certificate.providerDisplayName,
    remainder,
    points,
    certificate.description,
  ]
    .filter(Boolean)
    .join(" · ");
  const title = `${certificate.title} — ARCTor`;

  return {
    title,
    description,
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      title,
      description,
      siteName: "ARCTor",
      images: certificate.productImageUrl
        ? [{ url: certificate.productImageUrl }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: certificate.productImageUrl
        ? [certificate.productImageUrl]
        : undefined,
    },
  };
}

async function resolveOptionalViewer(): Promise<ResolvedActorContext | null> {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return null;
  }

  try {
    return await resolveActiveActorContext(session.user.sub);
  } catch (error) {
    if (error instanceof ActorContextError) {
      return null;
    }

    throw error;
  }
}

function DetailCard({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="rounded-[20px] border border-black/[0.07] bg-white p-4 shadow-sm">
      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#7c8099]">
        {label}
      </div>
      <div className="mt-2 text-[14px] font-bold leading-6 text-[#111827]">
        {children}
      </div>
    </div>
  );
}

function formatProviderLocation(
  location: GiftCertificateCatalogItem["providerLocation"],
): string | null {
  if (!location) return null;

  const parts = [
    location.streetAddress,
    location.postalCode,
    location.city,
    location.district,
    location.region,
    location.countryCode,
  ].filter((value): value is string => Boolean(value?.trim()));

  return parts.length > 0 ? parts.join(", ") : location.label;
}

export default async function CertificateCatalogDetailPage({
  params,
  searchParams,
}: CertificatePageProps) {
  const { activityEventId } = await params;
  const resolvedSearchParams = await searchParams;
  const locale = normalizeGiftCertificateLocale(resolvedSearchParams?.locale);
  const copy = GIFT_CERTIFICATE_CATALOG_COPY[locale];
  const offerCopy = OFFER_DETAIL_COPY[locale];
  const [certificate, viewer] = await Promise.all([
    getGiftCertificateCatalogItem(activityEventId),
    resolveOptionalViewer(),
  ]);

  if (!certificate) {
    notFound();
  }

  const isAccountProvider = viewer?.appUserId === certificate.providerOwnerUserId;
  const isProviderManager =
    isAccountProvider && viewer?.actorId === certificate.providerManagerActorId;
  const isRecipient =
    viewer?.appUserId === certificate.recipientUserId &&
    viewer?.actorId === certificate.recipientActorId;
  const isPubliclyShareable =
    isPubliclyShareableLifecycle(certificate.lifecycleStatus) &&
    certificate.activity.status === "planned";

  if (!isPubliclyShareable && !isProviderManager && !isRecipient) {
    notFound();
  }

  const providerKindLabel =
    certificate.providerType === "organization"
      ? offerCopy.organization
      : certificate.providerType === "avatar"
        ? offerCopy.avatar
        : offerCopy.personal;
  const providerLocationText = formatProviderLocation(certificate.providerLocation);
  const shareHref = buildGiftCertificateLocaleHref(
    `/certificates/${certificate.activityEventId}`,
    locale,
  );

  return (
    <main className="min-h-screen bg-[#f0f2f7] p-4 text-[#1a1d2e] sm:p-5">
      <div className="mx-auto max-w-[1320px]">
        <Link
          href={buildGiftCertificateLocaleHref("/certificates", locale)}
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#dfe3f1] bg-white px-4 py-2 text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50"
        >
          ← {offerCopy.back}
        </Link>

        <header className="mt-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7c8099]">
            {offerCopy.eyebrow}
          </p>
          <h1 className="mt-1 text-[27px] font-bold tracking-[-0.03em]">
            {certificate.title}
          </h1>
          {certificate.description ? (
            <p className="mt-1 max-w-4xl text-[14px] leading-6 text-[#7c8099]">
              {certificate.description}
            </p>
          ) : null}
        </header>

        <section className="mt-5 grid gap-3 lg:grid-cols-4">
          <article className="relative min-h-[360px] overflow-hidden rounded-[20px] border border-black/[0.07] bg-white p-4 shadow-sm">
            <div className="h-[270px] overflow-hidden rounded-2xl bg-[#eef2ff]">
              {certificate.productImageUrl ? (
                <img
                  src={certificate.productImageUrl}
                  alt={certificate.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-[#3b6ef8]">
                  {certificate.objectKind === "service_type" ? (
                    <Gift size={44} />
                  ) : (
                    <Package size={44} />
                  )}
                  <span className="mt-3 text-[12px] font-semibold text-[#5a5f7a]">
                    {certificate.objectKind === "service_type"
                      ? copy.service
                      : copy.product}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-[14px] font-bold">
                  {certificate.title}
                </div>
                <div className="mt-1 text-[11px] text-[#9aa0ba]">
                  {offerCopy.offer}
                </div>
              </div>
              <CertificateShareButton
                locale={locale}
                title={certificate.title}
                description={certificate.description}
                href={shareHref}
                providerName={certificate.providerDisplayName}
                pointsPrice={certificate.pointsPrice}
                moneyRemainder={certificate.moneyRemainder}
                currency={certificate.providerCurrency}
              />
            </div>
          </article>

          <article className="flex min-h-[360px] flex-col rounded-[20px] border border-black/[0.07] bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#7c8099]">
                  {offerCopy.address}
                </div>
                <div className="mt-2 text-[16px] font-bold leading-6 text-[#111827]">
                  {providerLocationText ?? offerCopy.locationMissing}
                </div>
              </div>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#fff3e7] text-[#ff8a35]">
                <MapPin size={15} />
              </span>
            </div>
            <div className="mt-4 min-h-[250px] flex-1">
              <OrganizationLocationMapPreview
                location={certificate.providerLocation}
                organizationName={
                  certificate.providerLocation
                    ? certificate.providerDisplayName
                    : undefined
                }
                locale={locale}
                className="min-h-[250px]"
              />
            </div>
          </article>

          <article className="relative min-h-[360px] overflow-hidden rounded-[20px] border border-black/[0.07] bg-white p-4 shadow-sm">
            <div className="h-[270px] overflow-hidden rounded-2xl bg-[#f5f6fb]">
              {certificate.providerImageUrl ? (
                <img
                  src={certificate.providerImageUrl}
                  alt={certificate.providerDisplayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[56px] font-bold text-[#8da2ff]">
                  {certificate.providerDisplayName.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                {certificate.providerPublicHref ? (
                  <Link
                    href={buildGiftCertificateLocaleHref(
                      certificate.providerPublicHref,
                      locale,
                    )}
                    className="line-clamp-2 text-[14px] font-bold text-[#315bd0] hover:underline"
                  >
                    {certificate.providerDisplayName}
                  </Link>
                ) : (
                  <div className="line-clamp-2 text-[14px] font-bold">
                    {certificate.providerDisplayName}
                  </div>
                )}
                <div className="mt-1 text-[11px] text-[#9aa0ba]">
                  {providerKindLabel}
                </div>
              </div>
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eef2ff] text-[#3b6ef8]"
                title={`${offerCopy.reputation}: ${certificate.providerReputation}`}
              >
                <Star size={15} />
              </span>
            </div>
          </article>

          <article className="flex min-h-[360px] flex-col rounded-[20px] border border-[#c8f0d3] bg-white p-5 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#7c8099]">
              {offerCopy.commercialTerms}
            </div>
            <div className="mt-4">
              <CertificateCommercialPrice
                regularPrice={certificate.regularPrice}
                moneyRemainder={certificate.moneyRemainder}
                pointsPrice={certificate.pointsPrice}
                currency={certificate.providerCurrency}
                locale={locale}
              />
            </div>
            <div className="mt-5 rounded-xl bg-[#f5f7ff] px-3 py-2 text-[12px] font-semibold text-[#42507a]">
              {copy.status}: {getGiftCertificateStatusLabel(certificate.lifecycleStatus, copy)}
            </div>
            <div className="mt-3 text-[12px] leading-5 text-[#7c8099]">
              {getGiftCertificateDeliveryLabel(certificate.deliveryMode, copy)}
            </div>

            <div className="mt-auto pt-5">
              {certificate.lifecycleStatus === "available" ? (
                viewer && !isAccountProvider ? (
                  <OrderGiftCertificateButton
                    activityEventId={certificate.activityEventId}
                    locale={locale}
                  />
                ) : (
                  <p className="text-[13px] font-semibold text-[#42507a]">
                    {isAccountProvider ? copy.ownCertificate : copy.signInToOrder}
                  </p>
                )
              ) : (
                <div className="text-[13px] font-bold text-[#42507a]">
                  {getGiftCertificateStatusLabel(certificate.lifecycleStatus, copy)}
                </div>
              )}
            </div>
          </article>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="grid gap-3">
            <DetailCard label={copy.delivery}>
              {getGiftCertificateDeliveryLabel(certificate.deliveryMode, copy)}
            </DetailCard>
            <DetailCard label={copy.validity}>
              {formatGiftCertificateDate(certificate.availableFrom, locale)} —{" "}
              {formatGiftCertificateDate(certificate.availableUntil, locale)}
            </DetailCard>
            {certificate.objectKind === "service_type" ? (
              <DetailCard label={copy.service}>
                <ActivityScheduleDisplay
                  locale={locale}
                  scheduleModeCode={certificate.activity.schedule_mode_code}
                  scheduledDate={certificate.activity.scheduled_date}
                  scheduleStartDate={certificate.activity.schedule_start_date}
                  scheduleEndDate={certificate.activity.schedule_end_date}
                  deadlineAt={certificate.activity.deadline_at}
                  startedAt={certificate.activity.started_at}
                  endedAt={certificate.activity.ended_at}
                />
              </DetailCard>
            ) : null}
          </div>

          <section className="rounded-[20px] border border-black/[0.07] bg-white p-5 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#7c8099]">
              {copy.conditions}
            </div>
            <p className="mt-3 whitespace-pre-wrap text-[14px] leading-6 text-[#4a4f6a]">
              {certificate.termsText?.trim() || copy.noConditions}
            </p>
          </section>
        </section>

        {isProviderManager ? (
          <div className="mt-4">
            <Link
              href={buildGiftCertificateLocaleHref(
                `/gift-certificates/${certificate.activityEventId}`,
                locale,
              )}
              className="text-[13px] font-bold text-[#3b6ef8] hover:underline"
            >
              {copy.ownerDetails}
            </Link>
          </div>
        ) : null}

        {(isProviderManager || isRecipient) &&
        certificate.lifecycleStatus === "active" &&
        certificate.publicCode ? (
          <section className="mt-5 grid gap-3 sm:grid-cols-2">
            <DetailCard label={copy.publicCode}>{certificate.publicCode}</DetailCard>
            <DetailCard label={copy.orderedAt}>
              {certificate.orderedAt ? (
                <GiftCertificateLocalDateTime
                  value={certificate.orderedAt}
                  locale={locale}
                />
              ) : (
                "—"
              )}
            </DetailCard>
          </section>
        ) : null}

        {isRecipient &&
        certificate.lifecycleStatus === "active" &&
        certificate.publicCode ? (
          <div className="mt-5">
            <GiftCertificateQr
              activityEventId={certificate.activityEventId}
              publicCode={certificate.publicCode}
              locale={locale}
            />
          </div>
        ) : null}

        {isRecipient &&
        (certificate.lifecycleStatus === "active" ||
          certificate.lifecycleStatus === "redeemed") ? (
          <div className="mt-5">
            <GiftCertificateFulfillmentConfirmation
              activityEventId={certificate.activityEventId}
              locale={locale}
            />
          </div>
        ) : null}

        <section className="mt-5 grid gap-2 rounded-[22px] border border-[#d9e2ff] bg-[#f4f7ff] p-5 text-[13px] leading-6 text-[#42507a]">
          <p>{copy.pointsBurnNotice}</p>
          <p>{copy.moneyOutsideNotice}</p>
          <p>{copy.noRefundNotice}</p>
        </section>
      </div>
    </main>
  );
}

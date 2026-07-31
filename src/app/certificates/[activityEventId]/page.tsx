import Link from "next/link";
import { type Metadata } from "next";
import { notFound } from "next/navigation";

import {
  ActorContextError,
  resolveActiveActorContext,
  type ResolvedActorContext,
} from "../../../../lib/actor-context";
import { auth0 } from "../../../../lib/auth0";
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
import { getGiftCertificateCatalogItem } from "../gift-certificate-data";
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


function isPubliclyShareableLifecycle(status: string): boolean {
  return [
    "available",
    "active",
    "redeemed",
    "expired",
    "annulled",
  ].includes(status);
}

export async function generateMetadata({
  params,
  searchParams,
}: CertificatePageProps): Promise<Metadata> {
  const { activityEventId } = await params;
  const resolvedSearchParams = await searchParams;
  const locale = normalizeGiftCertificateLocale(
    resolvedSearchParams?.locale,
  );
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

  const points = formatGiftCertificatePoints(
    certificate.pointsPrice,
    locale,
  );
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
    points,
    remainder,
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
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
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

export default async function CertificateCatalogDetailPage({
  params,
  searchParams,
}: CertificatePageProps) {
  const { activityEventId } = await params;
  const resolvedSearchParams = await searchParams;
  const locale = normalizeGiftCertificateLocale(
    resolvedSearchParams?.locale,
  );
  const copy = GIFT_CERTIFICATE_CATALOG_COPY[locale];
  const [certificate, viewer] = await Promise.all([
    getGiftCertificateCatalogItem(activityEventId),
    resolveOptionalViewer(),
  ]);

  if (!certificate) {
    notFound();
  }

  const isAccountProvider =
    viewer?.appUserId === certificate.providerOwnerUserId;
  const isProviderManager =
    isAccountProvider &&
    viewer?.actorId === certificate.providerManagerActorId;
  const isRecipient =
    viewer?.appUserId === certificate.recipientUserId &&
    viewer?.actorId === certificate.recipientActorId;
  const isPubliclyShareable =
    isPubliclyShareableLifecycle(certificate.lifecycleStatus) &&
    certificate.activity.status === "planned";

  if (!isPubliclyShareable && !isProviderManager && !isRecipient) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f0f2f7] p-5 text-[#1a1d2e]">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-[24px] border border-black/[0.06] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#3b6ef8]">
                {copy.detailEyebrow}
              </p>
              <h1 className="mt-3 text-[28px] font-bold tracking-[-0.03em]">
                {copy.detailTitle}
              </h1>
              <h2 className="mt-2 text-[21px] font-bold">
                {certificate.title}
              </h2>
              {certificate.description ? (
                <p className="mt-2 max-w-3xl text-[14px] leading-6 text-[#5a5f7a]">
                  {certificate.description}
                </p>
              ) : null}
            </div>
            <Link
              href={buildGiftCertificateLocaleHref(
                "/certificates",
                locale,
              )}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#dfe3f1] bg-white px-4 py-2 text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50"
            >
              {copy.backToCatalog}
            </Link>
          </div>
        </header>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailCard label={copy.status}>
            {getGiftCertificateStatusLabel(
              certificate.lifecycleStatus,
              copy,
            )}
          </DetailCard>
          <DetailCard label={copy.provider}>
            {certificate.providerPublicHref ? (
              <Link
                href={buildGiftCertificateLocaleHref(
                  certificate.providerPublicHref,
                  locale,
                )}
                className="text-[#315bd0] hover:underline"
              >
                {certificate.providerDisplayName}
              </Link>
            ) : (
              certificate.providerDisplayName
            )}
          </DetailCard>
          <DetailCard label={copy.reputation}>
            {new Intl.NumberFormat(locale === "en" ? "en-US" : locale, {
              maximumFractionDigits: 0,
            }).format(certificate.providerReputation)}
          </DetailCard>
          <DetailCard
            label={
              certificate.objectKind === "service_type"
                ? copy.service
                : copy.product
            }
          >
            {certificate.title}
          </DetailCard>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="grid gap-3">
            <DetailCard label={copy.delivery}>
              {getGiftCertificateDeliveryLabel(
                certificate.deliveryMode,
                copy,
              )}
            </DetailCard>
            <DetailCard label={copy.validity}>
              {formatGiftCertificateDate(
                certificate.availableFrom,
                locale,
              )}{" "}
              —{" "}
              {formatGiftCertificateDate(
                certificate.availableUntil,
                locale,
              )}
            </DetailCard>
            {certificate.objectKind === "service_type" ? (
              <DetailCard label={copy.service}>
                <ActivityScheduleDisplay
                  locale={locale}
                  scheduleModeCode={
                    certificate.activity.schedule_mode_code
                  }
                  scheduledDate={certificate.activity.scheduled_date}
                  scheduleStartDate={
                    certificate.activity.schedule_start_date
                  }
                  scheduleEndDate={
                    certificate.activity.schedule_end_date
                  }
                  deadlineAt={certificate.activity.deadline_at}
                  startedAt={certificate.activity.started_at}
                  endedAt={certificate.activity.ended_at}
                />
              </DetailCard>
            ) : null}
            <section className="rounded-[20px] border border-black/[0.07] bg-white p-5 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#7c8099]">
                {copy.conditions}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-[14px] leading-6 text-[#4a4f6a]">
                {certificate.termsText?.trim() || copy.noConditions}
              </p>
            </section>
          </div>

          <div className="grid gap-3">
            <DetailCard label={copy.ordinaryPrice}>
              {formatGiftCertificateMoney(
                certificate.regularPrice,
                certificate.providerCurrency,
                locale,
              )}
            </DetailCard>
            <DetailCard label={copy.coveredByPoints}>
              {formatGiftCertificateMoney(
                certificate.providerCurrencyCoveredAmount,
                certificate.providerCurrency,
                locale,
              )}
            </DetailCard>
            <DetailCard label={copy.pointsPrice}>
              {formatGiftCertificatePoints(
                certificate.pointsPrice,
                locale,
              )}
            </DetailCard>
            <DetailCard label={copy.moneyRemainder}>
              {formatGiftCertificateMoney(
                certificate.moneyRemainder,
                certificate.providerCurrency,
                locale,
              )}
            </DetailCard>
          </div>
        </section>

        {certificate.lifecycleStatus === "available" ? (
          <section className="mt-5 rounded-[24px] border border-[#c7d2fe] bg-[#f5f7ff] p-5">
            {viewer && !isAccountProvider ? (
              <>
                <div className="text-[12px] font-bold uppercase tracking-[0.15em] text-[#6574a6]">
                  {copy.activeProfile}
                </div>
                <div className="mt-1 text-[16px] font-bold">
                  {viewer.profile.displayName}
                </div>
                <div className="mt-4">
                  <OrderGiftCertificateButton
                    activityEventId={certificate.activityEventId}
                    locale={locale}
                  />
                </div>
              </>
            ) : (
              <p className="text-[14px] font-semibold text-[#42507a]">
                {isAccountProvider
                  ? copy.ownCertificate
                  : copy.signInToOrder}
              </p>
            )}
          </section>
        ) : null}

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
            <DetailCard label={copy.publicCode}>
              {certificate.publicCode}
            </DetailCard>
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

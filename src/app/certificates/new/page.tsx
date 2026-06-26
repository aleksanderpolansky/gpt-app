import Link from "next/link";

import { supabase } from "../../../../lib/supabase";

import {
  getCertificatesMessages,
  getCertificateText,
} from "../../../i18n/messages/certificates";
import {
  getOfferTypeLabel as getSharedOfferTypeLabel,
  getOrganizationTypeLabel as getSharedOrganizationTypeLabel,
} from "../../../i18n/messages/system-labels";
import CertificateOrderForm from "./CertificateOrderForm";

export const dynamic = "force-dynamic";

type CertificateNewPageProps = {
  searchParams?: Promise<{
    offerId?: string | string[];
    locale?: string | string[];
    lang?: string | string[];
  }>;
};

type OfferRow = {
  id: string;
  organization_id: string | null;
  offer_type: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  is_paid: boolean;
  is_free: boolean;
  certificate_available: boolean;
  certificate_payment_mode: string;
  certificate_points_price: number;
  certificate_money_price: number | null;
  certificate_currency: string | null;
  certificate_terms: string | null;
  certificate_validity_days: number | null;
  requires_seller_confirmation: boolean;
  is_transferable: boolean;
  is_cancellable: boolean;
  points_refund_policy: string;
  max_certificates_total: number | null;
  status: string;
  created_at: string;
  updated_at: string | null;
};

type OrganizationRow = {
  id: string;
  organization_name: string;
  organization_type: string;
  public_slug: string | null;
  directory_status: string | null;
  is_public_profile_enabled: boolean | null;
  is_listed_in_directory: boolean | null;
  status: string | null;
  country_code: string | null;
  default_currency: string | null;
};

type CertificateOrderPageData = {
  offer: OfferRow | null;
  organization: OrganizationRow | null;
  errorMessage: string | null;
};

function getFirstSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

async function getCertificateOrderPageData(
  offerId: string | null,
): Promise<CertificateOrderPageData> {
  if (!offerId) {
    return {
      offer: null,
      organization: null,
      errorMessage: "Offer id is missing",
    };
  }

  const { data: offerData, error: offerError } = await supabase
    .from("offers")
    .select(
      `
      id,
      organization_id,
      offer_type,
      title,
      description,
      price,
      currency,
      is_paid,
      is_free,
      certificate_available,
      certificate_payment_mode,
      certificate_points_price,
      certificate_money_price,
      certificate_currency,
      certificate_terms,
      certificate_validity_days,
      requires_seller_confirmation,
      is_transferable,
      is_cancellable,
      points_refund_policy,
      max_certificates_total,
      status,
      created_at,
      updated_at
    `,
    )
    .eq("id", offerId)
    .eq("status", "active")
    .single();

  if (offerError || !offerData) {
    return {
      offer: null,
      organization: null,
      errorMessage: offerError?.message ?? "Offer not found",
    };
  }

  const offer = offerData as OfferRow;

  if (!offer.organization_id) {
    return {
      offer,
      organization: null,
      errorMessage: null,
    };
  }

  const { data: organizationData, error: organizationError } = await supabase
    .from("organizations")
    .select(
      `
      id,
      organization_name,
      organization_type,
      public_slug,
      directory_status,
      is_public_profile_enabled,
      is_listed_in_directory,
      status,
      country_code,
      default_currency
    `,
    )
    .eq("id", offer.organization_id)
    .eq("status", "active")
    .single();

  if (organizationError || !organizationData) {
    return {
      offer,
      organization: null,
      errorMessage: null,
    };
  }

  return {
    offer,
    organization: organizationData as OrganizationRow,
    errorMessage: null,
  };
}


function appendLocaleToHref(href: string, locale: string) {
  const separator = href.includes("?") ? "&" : "?";
  return href + separator + "locale=" + encodeURIComponent(locale);
}
function formatMoney(
  amount: number | null | undefined,
  currency: string | null | undefined,
) {
  if (typeof amount !== "number") {
    return "—";
  }

  return `${new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: 2,
  }).format(amount)} ${currency ?? ""}`.trim();
}

function formatPoints(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "0";
  }

  return new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: 2,
  }).format(value);
}

function getOfferTypeLabel(
  type: string | null | undefined,
  locale: string
) {
  return getSharedOfferTypeLabel(type ?? "", locale);
}

function getCertificatePaymentLabel(
  offer: OfferRow | null,
  messages: Record<string, string>,
  commonMessages: Record<string, string>
) {
  if (!offer) {
    return getCertificateText(commonMessages, "unavailable", "Unavailable");
  }

  if (!offer.certificate_available) {
    return getCertificateText(messages, "certificateUnavailable", "Certificate unavailable");
  }

  if (offer.certificate_payment_mode === "points_only") {
    return `${formatPoints(offer.certificate_points_price)} POINTS`;
  }

  if (offer.certificate_payment_mode === "money_only") {
    return formatMoney(
      offer.certificate_money_price ?? offer.price,
      offer.certificate_currency ?? offer.currency,
    );
  }

  if (offer.certificate_money_price !== null) {
    return `${formatMoney(
      offer.certificate_money_price,
      offer.certificate_currency ?? offer.currency,
    )} + ${formatPoints(offer.certificate_points_price)} POINTS`;
  }

  return getCertificateText(messages, "certificateAvailable", "Certificate available");
}

function getDirectoryHref(organization: OrganizationRow | null) {
  if (
    organization?.public_slug &&
    organization.directory_status === "published" &&
    organization.is_public_profile_enabled &&
    organization.is_listed_in_directory
  ) {
    return `/directory/${organization.public_slug}`;
  }

  return "/directory";
}

function getOfferHref(offer: OfferRow | null) {
  if (!offer?.id) {
    return "/offers";
  }

  return `/offers/${offer.id}`;
}

function getPolicyLabel(
  policy: string | null | undefined,
  messages: Record<string, string>
) {
  switch (policy) {
    case "refund_until_seller_confirmation":
      return getCertificateText(messages, "refundUntilSellerConfirmation", "Refund until seller confirmation");
    case "refund_until_delivery":
      return getCertificateText(messages, "refundUntilDelivery", "Refund until delivery");
    case "manual_review":
      return getCertificateText(messages, "manualReview", "Manual review");
    case "no_refund":
      return getCertificateText(messages, "noRefund", "No refund");
    default:
      return policy ?? getCertificateText(messages, "policyNotSpecified", "not specified");
  }
}

function getOrganizationTypeLabel(
  type: string | null | undefined,
  locale: string
) {
  return getSharedOrganizationTypeLabel(type ?? "", locale);
}

export default async function NewCertificatePage({
  searchParams,
}: CertificateNewPageProps) {
  const resolvedSearchParams = await searchParams;
  const offerId = getFirstSearchParam(resolvedSearchParams?.offerId);
  const selectedLocale =
    getFirstSearchParam(resolvedSearchParams?.locale) ??
    getFirstSearchParam(resolvedSearchParams?.lang) ??
    "en";
  const certificateMessages = getCertificatesMessages(selectedLocale);
  const commonMessages = certificateMessages.common;
  const newPageMessages = certificateMessages.newPage;
  const { offer, organization, errorMessage } =
    await getCertificateOrderPageData(offerId);

  const canOrderCertificate = Boolean(
    offer?.certificate_available && offer.status === "active",
  );

  const organizationName = organization?.organization_name ?? getCertificateText(newPageMessages, "organizationNotFound", "Business not found");
  const offerTitle = offer?.title ?? getCertificateText(newPageMessages, "offerNotFound", "Offer not found");
  const directoryHref = getDirectoryHref(organization);
  const offerHref = getOfferHref(offer);

  return (
    <main className="min-h-full bg-[#f5f6fb] px-4 py-8 text-[#1a1d2e]">
      <div className="mx-auto grid w-full max-w-[1120px] gap-5">
        <Link
          href={appendLocaleToHref(offerHref, selectedLocale)}
          className="w-fit rounded-full border border-[#dfe3f1] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4f6a] transition hover:bg-gray-50"
        >
          {getCertificateText(newPageMessages, "backToOffer", "Back to offer")}
        </Link>

        <header className="rounded-[22px] border border-[rgba(0,0,0,0.07)] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7c8099]">
            Commercial core / Certificate order
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
            <div>
              <h1 className="text-[32px] font-bold tracking-[-0.035em] text-[#111827]">
                {getCertificateText(newPageMessages, "title", "Get a gift certificate")}
              </h1>

              <p className="mt-3 max-w-[820px] text-[14px] leading-6 text-[#5a5f7a]">
                {getCertificateText(
                  newPageMessages,
                  "description",
                  "The certificate is created from a specific business offer. It will be added to the list of ordered certificates in the personal account. Email notification will be connected later."
                )}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href={appendLocaleToHref(offerHref, selectedLocale)}
                  className="rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50"
                >
                  {getCertificateText(newPageMessages, "offerDetails", "Offer details")}
                </Link>

                <Link
                  href={appendLocaleToHref(directoryHref, selectedLocale)}
                  className="rounded-xl border border-[#dfe4ff] bg-[#eef2ff] px-4 py-3 text-[13px] font-bold text-[#3b6ef8] transition hover:bg-[#e4eaff]"
                >
                  {getCertificateText(newPageMessages, "publicOrganizationCard", "Public business card")}
                </Link>

                <Link
                  href={appendLocaleToHref("/my-certificates", selectedLocale)}
                  className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-[13px] font-bold text-[#15803d] transition hover:bg-[#dcfce7]"
                >
                  {getCertificateText(newPageMessages, "myCertificates", "My certificates")}
                </Link>
              </div>
            </div>

            <aside className="grid content-start gap-3 rounded-[18px] border border-[#dbeafe] bg-[#eff6ff] p-5 text-[#1e3a8a]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                {getCertificateText(newPageMessages, "certificateCost", "Certificate cost")}
              </div>

              <div className="text-[28px] font-bold tracking-[-0.03em]">
                {getCertificatePaymentLabel(offer, newPageMessages, commonMessages)}
              </div>

              <p className="text-[12px] leading-5">
                {getCertificateText(
                  newPageMessages,
                  "pointsDisclaimer",
                  "POINTS are loyalty bonus units, not money, currency, or a payment instrument."
                )}
              </p>
            </aside>
          </div>
        </header>

        {errorMessage ? (
          <section className="rounded-[18px] border border-[#fecaca] bg-[#fff1f2] p-5 text-[#b42318] shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em]">
              {getCertificateText(commonMessages, "error", "Error")}
            </div>
            <h2 className="mt-2 text-[22px] font-bold">
              {getCertificateText(newPageMessages, "loadErrorTitle", "Could not load certificate")}
            </h2>
            <p className="mt-2 text-[14px] leading-6">{errorMessage}</p>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[16px] border border-[rgba(0,0,0,0.07)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
              {getCertificateText(commonMessages, "organization", "Business")}
            </div>
            <div className="mt-2 text-[20px] font-bold text-[#111827]">
              {organizationName}
            </div>
            <div className="mt-1 text-[12px] text-[#7c8099]">
              {getOrganizationTypeLabel(organization?.organization_type, selectedLocale)}
            </div>
          </article>

          <article className="rounded-[16px] border border-[rgba(0,0,0,0.07)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
              {getCertificateText(commonMessages, "offer", "Offer")}
            </div>
            <div className="mt-2 text-[20px] font-bold text-[#111827]">
              {offerTitle}
            </div>
            <div className="mt-1 text-[12px] text-[#7c8099]">
              {getOfferTypeLabel(offer?.offer_type, selectedLocale)}
            </div>
          </article>

          <article className="rounded-[16px] border border-[rgba(0,0,0,0.07)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
              {getCertificateText(commonMessages, "status", "Status")}
            </div>
            <div className="mt-2 text-[20px] font-bold text-[#111827]">
              {canOrderCertificate
                ? getCertificateText(commonMessages, "available", "Available")
                : getCertificateText(commonMessages, "unavailable", "Unavailable")}
            </div>
            <div className="mt-1 text-[12px] text-[#7c8099]">
              {offer?.certificate_validity_days
                ? `${offer.certificate_validity_days} ${getCertificateText(commonMessages, "days", "days")}`
                : getCertificateText(commonMessages, "notSpecified", "not specified")}
            </div>
          </article>
        </section>

        <section className="rounded-[18px] border border-[#dbeafe] bg-[#eff6ff] p-6 text-[#1e3a8a] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em]">
            POINTS / email / availability
          </div>

          <h2 className="mt-2 text-[22px] font-bold">
            {getCertificateText(newPageMessages, "afterOrderTitle", "What happens after getting the certificate")}
          </h2>

          <div className="mt-3 grid gap-2 text-[13px] leading-6">
            <p className="m-0">
              <strong>{getCertificateText(commonMessages, "certificate", "Certificate")}:</strong>{" "}
              {getCertificateText(
                newPageMessages,
                "afterOrderCertificate",
                "The certificate will be created through the standard API and should appear in the personal account under My certificates."
              )}
            </p>
            <p className="m-0">
              <strong>{getCertificateText(commonMessages, "email", "Email")}:</strong>{" "}{getCertificateText(newPageMessages, "afterOrderEmail", "Email is not sent yet. Add email notification to the certificate recipient later.")}
            </p>
            <p className="m-0">
              <strong>{getCertificateText(commonMessages, "available", "Available")}:</strong>{" "}{getCertificateText(newPageMessages, "afterOrderQuantity", "Available quantity should be shown on the public business card in the next step: limit minus already ordered active certificates.")}
            </p>
          </div>
        </section>

        {offer ? (
          <section className="rounded-[18px] border border-[rgba(0,0,0,0.07)] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <div className="mb-4 border-b border-[#edf0f7] pb-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7c8099]">
                {getCertificateText(newPageMessages, "certificateData", "Certificate data")}
              </div>

              <h2 className="mt-2 text-[24px] font-bold text-[#111827]">
                {offer.title}
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[#edf0f7] bg-[#f8f9fd] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
                  {getCertificateText(commonMessages, "payment", "Payment")}
                </div>
                <div className="mt-2 text-[20px] font-bold text-[#111827]">
                  {getCertificatePaymentLabel(offer, newPageMessages, commonMessages)}
                </div>
                <div className="mt-1 text-[12px] text-[#7c8099]">
                  {getCertificateText(newPageMessages, "offerPrice", "Offer price")}: {formatMoney(offer.price, offer.currency)}
                </div>
              </div>

              <div className="rounded-2xl border border-[#edf0f7] bg-[#f8f9fd] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
                  {getCertificateText(commonMessages, "conditions", "Terms")}
                </div>
                <div className="mt-2 grid gap-1 text-[13px] leading-5 text-[#5a5f7a]">
                  <p className="m-0">
                    {getCertificateText(newPageMessages, "sellerConfirms", "Seller confirms")}:{" "}
                    <strong className="text-[#343854]">
                      {offer.requires_seller_confirmation ? getCertificateText(commonMessages, "yes", "yes") : getCertificateText(commonMessages, "no", "no")}
                    </strong>
                  </p>
                  <p className="m-0">
                    {getCertificateText(newPageMessages, "transferable", "Can be transferred")}:{" "}
                    <strong className="text-[#343854]">
                      {offer.is_transferable ? getCertificateText(commonMessages, "yes", "yes") : getCertificateText(commonMessages, "no", "no")}
                    </strong>
                  </p>
                  <p className="m-0">
                    {getCertificateText(newPageMessages, "cancellable", "Can be cancelled")}:{" "}
                    <strong className="text-[#343854]">
                      {offer.is_cancellable ? getCertificateText(commonMessages, "yes", "yes") : getCertificateText(commonMessages, "no", "no")}
                    </strong>
                  </p>
                  <p className="m-0">
                    {getCertificateText(newPageMessages, "refund", "Refund")}:{" "}
                    <strong className="text-[#343854]">
                      {getPolicyLabel(offer.points_refund_policy, newPageMessages)}
                    </strong>
                  </p>
                  {offer.max_certificates_total ? (
                    <p className="m-0">
                      {getCertificateText(newPageMessages, "certificateLimit", "Certificate limit")}:{" "}
                      <strong className="text-[#343854]">
                        {offer.max_certificates_total}
                      </strong>
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            {offer.certificate_terms ? (
              <div className="mt-4 rounded-2xl border border-[#dbeafe] bg-[#eff6ff] p-4 text-[#1e3a8a]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                  {getCertificateText(newPageMessages, "certificateTerms", "Certificate terms")}
                </div>
                <p className="mt-2 text-[13px] leading-6">
                  {offer.certificate_terms}
                </p>
              </div>
            ) : null}
          </section>
        ) : null}

        {offer ? (
          <CertificateOrderForm
            offerId={offer.id}
            offerTitle={offer.title}
            organizationName={organizationName}
            canOrderCertificate={canOrderCertificate}
            selectedLocale={selectedLocale}
          />
        ) : null}

        <section className="flex flex-wrap gap-2">
          <Link
            href={appendLocaleToHref(offerHref, selectedLocale)}
            className="rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50"
          >
            {getCertificateText(newPageMessages, "backToOfferBottom", "Back to offer")}
          </Link>

          <Link
            href={appendLocaleToHref(directoryHref, selectedLocale)}
            className="rounded-xl border border-[#dfe4ff] bg-[#eef2ff] px-4 py-3 text-[13px] font-bold text-[#3b6ef8] transition hover:bg-[#e4eaff]"
          >
            {getCertificateText(newPageMessages, "publicOrganizationCard", "Public business card")}
          </Link>

          <Link
            href={appendLocaleToHref("/my-certificates", selectedLocale)}
            className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-[13px] font-bold text-[#15803d] transition hover:bg-[#dcfce7]"
          >
            {getCertificateText(newPageMessages, "myCertificates", "My certificates")}
          </Link>
        </section>
      </div>
    </main>
  );
}

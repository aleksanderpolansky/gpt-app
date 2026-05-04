import { NextResponse } from "next/server";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type RelatedOrganization =
  | {
      id: string;
      organization_name: string | null;
      organization_type: string | null;
      country_code: string | null;
      default_currency: string | null;
      status: string | null;
    }
  | {
      id: string;
      organization_name: string | null;
      organization_type: string | null;
      country_code: string | null;
      default_currency: string | null;
      status: string | null;
    }[]
  | null;

type RewardOfferRecord = {
  id: string;
  organization_id: string | null;
  offer_type: string | null;
  title: string | null;
  description: string | null;

  price: number | null;
  regular_price: number | null;
  currency: string | null;

  certificate_available: boolean | null;
  certificate_payment_mode: string | null;
  certificate_points_covered_amount: number | null;
  certificate_points_price: number | null;
  certificate_money_price: number | null;
  certificate_currency: string | null;
  certificate_terms: string | null;
  certificate_validity_days: number | null;
  requires_seller_confirmation: boolean | null;
  is_transferable: boolean | null;
  is_cancellable: boolean | null;
  points_refund_policy: string | null;
  max_certificates_total: number | null;
  max_certificates_per_user: number | null;
  is_public_reward: boolean | null;

  points_currency_code: string | null;
  reference_currency: string | null;
  reference_value_per_point: number | null;
  reference_exchange_rate: number | null;
  reference_exchange_rate_source: string | null;
  reference_exchange_rate_date: string | null;

  requires_booking: boolean | null;
  booking_mode: string | null;
  default_duration_minutes: number | null;
  quantity_limit: number | null;

  status: string | null;
  created_at: string | null;

  organizations: RelatedOrganization;
};

function getFirstRelatedItem<T>(value: T | T[] | null | undefined) {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export async function GET() {
  const { data: rewardOffers, error: rewardOffersError } = await supabase
    .from("offers")
    .select(
      `
      id,
      organization_id,
      offer_type,
      title,
      description,

      price,
      regular_price,
      currency,

      certificate_available,
      certificate_payment_mode,
      certificate_points_covered_amount,
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
      max_certificates_per_user,
      is_public_reward,

      points_currency_code,
      reference_currency,
      reference_value_per_point,
      reference_exchange_rate,
      reference_exchange_rate_source,
      reference_exchange_rate_date,

      requires_booking,
      booking_mode,
      default_duration_minutes,
      quantity_limit,

      status,
      created_at,

      organizations (
        id,
        organization_name,
        organization_type,
        country_code,
        default_currency,
        status
      )
    `
    )
    .eq("certificate_available", true)
    .eq("is_public_reward", true)
    .eq("status", "active")
    .in("certificate_payment_mode", ["points_only", "mixed"])
    .gt("certificate_points_covered_amount", 0)
    .gt("certificate_points_price", 0)
    .order("created_at", { ascending: false });

  if (rewardOffersError) {
    return NextResponse.json(
      { ok: false, error: rewardOffersError.message },
      { status: 500 }
    );
  }

  const publicRewardOffers = ((rewardOffers as RewardOfferRecord[] | null) ?? [])
    .map((offer) => {
      const organization = getFirstRelatedItem(offer.organizations);

      return {
        id: offer.id,
        organizationId: offer.organization_id,
        organizationName: organization?.organization_name ?? null,
        organizationType: organization?.organization_type ?? null,
        organizationCountryCode: organization?.country_code ?? null,

        offerType: offer.offer_type,
        title: offer.title,
        description: offer.description,

        price: offer.price,
        regularPrice: offer.regular_price,
        currency: offer.currency,

        certificatePaymentMode: offer.certificate_payment_mode,
        certificatePointsCoveredAmount:
          offer.certificate_points_covered_amount,
        certificatePointsPrice: offer.certificate_points_price,
        certificateMoneyPrice: offer.certificate_money_price,
        certificateCurrency: offer.certificate_currency,
        certificateTerms: offer.certificate_terms,
        certificateValidityDays: offer.certificate_validity_days,
        requiresSellerConfirmation: offer.requires_seller_confirmation,
        isTransferable: offer.is_transferable,
        isCancellable: offer.is_cancellable,
        pointsRefundPolicy: offer.points_refund_policy,

        pointsCurrencyCode: offer.points_currency_code,
        referenceCurrency: offer.reference_currency,
        referenceValuePerPoint: offer.reference_value_per_point,
        referenceExchangeRate: offer.reference_exchange_rate,
        referenceExchangeRateDate: offer.reference_exchange_rate_date,

        requiresBooking: offer.requires_booking,
        bookingMode: offer.booking_mode,
        defaultDurationMinutes: offer.default_duration_minutes,
        quantityLimit: offer.quantity_limit,

        status: offer.status,
        createdAt: offer.created_at,
      };
    });

  return NextResponse.json({
    ok: true,
    rewardOffers: publicRewardOffers,
  });
}
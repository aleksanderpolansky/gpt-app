import { NextRequest, NextResponse } from "next/server";
import { createLocalizationRuntimeContext } from "../../../../../../types/localization";
import { resolveLocalizedContentFieldsStrict } from "@/lib/localization/contentLocalization";
import { supabase } from "../../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

type PublicOfferRow = {
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
  requires_booking: boolean;
  booking_mode: string;
  default_duration_minutes: number | null;
  min_duration_minutes: number | null;
  max_duration_minutes: number | null;
  quantity_limit: number | null;
  valid_from: string | null;
  valid_until: string | null;
  status: string;
  regular_price: number | null;
  is_discount_active: boolean;
  discount_type: string | null;
  discount_value: number | null;
  discount_starts_at: string | null;
  discount_ends_at: string | null;
  lowest_price_30_days: number | null;
  lowest_price_30_days_currency: string | null;
  discount_legal_note: string | null;
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
  created_at: string;
  updated_at: string | null;
  metadata_json: unknown;
};

type DirectoryOrganizationLookupRow = {
  id: string;
  organization_name: string;
  public_slug: string | null;
  status: string;
  directory_status: string;
  is_public_profile_enabled: boolean;
  is_listed_in_directory: boolean;
  metadata_json: unknown;
};

function mapPublicOffer(row: PublicOfferRow, locale: string) {
  const localized = resolveLocalizedContentFieldsStrict({
    metadata: row.metadata_json,
    locale,
    fieldCodes: ["title", "description", "discountLegalNote", "certificateTerms"],
  });
  return {
    id: row.id,
    organizationId: row.organization_id,
    offerType: row.offer_type,
    title: localized.title ?? "—",
    description: localized.description,
    price: row.price,
    currency: row.currency,
    isPaid: row.is_paid,
    isFree: row.is_free,
    certificateAvailable: row.certificate_available,
    requiresBooking: row.requires_booking,
    bookingMode: row.booking_mode,
    defaultDurationMinutes: row.default_duration_minutes,
    minDurationMinutes: row.min_duration_minutes,
    maxDurationMinutes: row.max_duration_minutes,
    quantityLimit: row.quantity_limit,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    status: row.status,
    regularPrice: row.regular_price,
    isDiscountActive: row.is_discount_active,
    discountType: row.discount_type,
    discountValue: row.discount_value,
    discountStartsAt: row.discount_starts_at,
    discountEndsAt: row.discount_ends_at,
    lowestPrice30Days: row.lowest_price_30_days,
    lowestPrice30DaysCurrency: row.lowest_price_30_days_currency,
    discountLegalNote: localized.discountLegalNote,
    certificate: {
      available: row.certificate_available,
      paymentMode: row.certificate_payment_mode,
      pointsPrice: row.certificate_points_price,
      moneyPrice: row.certificate_money_price,
      currency: row.certificate_currency,
      terms: localized.certificateTerms,
      validityDays: row.certificate_validity_days,
      requiresSellerConfirmation: row.requires_seller_confirmation,
      isTransferable: row.is_transferable,
      isCancellable: row.is_cancellable,
      pointsRefundPolicy: row.points_refund_policy,
      maxCertificatesTotal: row.max_certificates_total,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getNowIso() {
  return new Date().toISOString();
}

export async function GET(request: NextRequest, { params }: RouteProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug?.trim();

  if (!slug) {
    return NextResponse.json(
      {
        ok: false,
        error: "Directory organization slug is required",
      },
      { status: 400 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const requestedLocale =
    searchParams.get("locale") ?? searchParams.get("lang") ?? undefined;
  const localizationRuntimeContext = createLocalizationRuntimeContext({
    locale: {
      contentLocale: requestedLocale,
      interfaceLocale: requestedLocale,
      source: requestedLocale ? "query" : "default",
    },
  });
  const contentLocale = localizationRuntimeContext.locale.contentLocale;

  const certificateOnly = searchParams.get("certificateOnly") === "true";
  const limitParam = Number(searchParams.get("limit") ?? "50");

  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(Math.trunc(limitParam), 1), 100)
    : 50;

  const {
    data: organization,
    error: organizationError,
  } = await supabase
    .from("organizations")
    .select(
      `
      id,
      organization_name,
      public_slug,
      status,
      directory_status,
      is_public_profile_enabled,
      is_listed_in_directory,
      metadata_json
    `
    )
    .eq("public_slug", slug)
    .eq("status", "active")
    .eq("directory_status", "published")
    .eq("is_public_profile_enabled", true)
    .eq("is_listed_in_directory", true)
    .single();

  if (organizationError || !organization) {
    return NextResponse.json(
      {
        ok: false,
        error: organizationError?.message ?? "Directory organization not found",
      },
      { status: 404 }
    );
  }

  const organizationRow =
    organization as unknown as DirectoryOrganizationLookupRow;

  const nowIso = getNowIso();

  let offersQuery = supabase
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
      requires_booking,
      booking_mode,
      default_duration_minutes,
      min_duration_minutes,
      max_duration_minutes,
      quantity_limit,
      valid_from,
      valid_until,
      status,
      regular_price,
      is_discount_active,
      discount_type,
      discount_value,
      discount_starts_at,
      discount_ends_at,
      lowest_price_30_days,
      lowest_price_30_days_currency,
      discount_legal_note,
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
      created_at,
      updated_at,
      metadata_json
    `
    )
    .eq("organization_id", organizationRow.id)
    .eq("status", "active")
    .or(`valid_from.is.null,valid_from.lte.${nowIso}`)
    .or(`valid_until.is.null,valid_until.gte.${nowIso}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (certificateOnly) {
    offersQuery = offersQuery.eq("certificate_available", true);
  }

  const { data: offers, error: offersError } = await offersQuery;

  if (offersError) {
    return NextResponse.json(
      {
        ok: false,
        error: offersError.message,
      },
      { status: 500 }
    );
  }

  const offerRows = (offers as unknown as PublicOfferRow[] | null) ?? [];

  const localizedOrganization = resolveLocalizedContentFieldsStrict({
    metadata: organizationRow.metadata_json,
    locale: contentLocale,
    fieldCodes: ["organizationName"],
  });

  return NextResponse.json({
    ok: true,
    locale: contentLocale,
    organization: {
      id: organizationRow.id,
      name: localizedOrganization.organizationName ?? "—",
      publicSlug: organizationRow.public_slug,
      contentLocalizationStatus: localizedOrganization.organizationName ? "ready" : "missing",
    },
    offers: offerRows.map((row) => mapPublicOffer(row, contentLocale)),
    count: offerRows.length,
    filters: {
      certificateOnly,
      limit,
    },
  });
}

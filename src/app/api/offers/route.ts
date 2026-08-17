import { NextResponse } from "next/server";
import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../lib/actor-context";
import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";
import { localizeEntityContent } from "@/lib/localization/contentLocalization.server";

type OfferItemInput = {
  valueObjectId?: string | null;
  quantity?: unknown;
  unitPrice?: unknown;
  currency?: string | null;
  sortOrder?: unknown;
  isRequired?: boolean;
};

type CertificatePricingCalculation = {
  certificatePaymentMode: "money_only" | "points_only" | "mixed";
  certificatePointsCoveredAmount: number;
  certificatePointsPrice: number;
  certificateMoneyPrice: number;
  referenceValuePerPoint: number;
  referenceExchangeRate: number | null;
};

async function getCurrentUserContext() {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return {
      appUser: null,
      person: null,
      personActor: null,
      errorResponse: NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      ),
    };
  }

  try {
    const actorContext = await resolveActiveActorContext(session.user.sub);

    return {
      appUser: {
        id: actorContext.appUserId,
        auth0_sub: session.user.sub,
      },
      person: null,
      personActor: {
        id: actorContext.actorId,
        actor_type: actorContext.actorType,
      },
      errorResponse: null,
    };
  } catch (error) {
    const status = error instanceof ActorContextError ? error.status : 500;
    const message =
      error instanceof Error
        ? error.message
        : "Could not resolve active actor context.";

    return {
      appUser: null,
      person: null,
      personActor: null,
      errorResponse: NextResponse.json(
        { error: message },
        { status }
      ),
    };
  }
}

function parseOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    return null;
  }

  return trimmedValue;
}

function parseOptionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue = Number(value);

  if (Number.isNaN(parsedValue)) {
    return null;
  }

  return parsedValue;
}

function parseOptionalInteger(value: unknown) {
  const parsedValue = parseOptionalNumber(value);

  if (parsedValue === null) {
    return null;
  }

  return Math.trunc(parsedValue);
}

function parseIntegerWithFallback(value: unknown, fallbackValue = 0) {
  const parsedValue = parseOptionalNumber(value);

  if (parsedValue === null) {
    return fallbackValue;
  }

  return Math.trunc(parsedValue);
}

function parseRequiredPositiveNumber(value: unknown, fallbackValue = 1) {
  const parsedValue = parseOptionalNumber(value);

  if (parsedValue === null || parsedValue <= 0) {
    return fallbackValue;
  }

  return parsedValue;
}

function parseOptionalBoolean(value: unknown, fallbackValue = false) {
  if (typeof value === "boolean") {
    return value;
  }

  return fallbackValue;
}

function normalizeCurrency(value: unknown) {
  const parsedValue = parseOptionalText(value);

  if (!parsedValue) {
    return null;
  }

  return parsedValue.toUpperCase();
}

function parseOptionalDateTime(value: unknown) {
  const parsedValue = parseOptionalText(value);

  if (!parsedValue) {
    return null;
  }

  return parsedValue;
}

function validateDiscountType(value: string | null) {
  if (!value) {
    return null;
  }

  if (["percent", "fixed_amount", "manual_price"].includes(value)) {
    return value;
  }

  return null;
}

function validatePointsRefundPolicy(value: string | null) {
  if (!value) {
    return "refund_until_seller_confirmation";
  }

  if (
    [
      "no_refund",
      "refund_until_seller_confirmation",
      "refund_until_delivery",
      "manual_review",
    ].includes(value)
  ) {
    return value;
  }

  return "refund_until_seller_confirmation";
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function roundPoints(value: number) {
  return Math.round(value * 100) / 100;
}

function calculateCertificatePricing(params: {
  certificateAvailable: boolean;
  offerPrice: number | null;
  certificatePointsCoveredAmountInput: number | null;
  referenceValuePerPointInput: number | null;
  referenceExchangeRateInput: number | null;
}): {
  calculation: CertificatePricingCalculation | null;
  errorMessage: string | null;
} {
  const {
    certificateAvailable,
    offerPrice,
    certificatePointsCoveredAmountInput,
    referenceValuePerPointInput,
    referenceExchangeRateInput,
  } = params;

  const referenceValuePerPoint = referenceValuePerPointInput ?? 1;
  const referenceExchangeRate = referenceExchangeRateInput;
  const effectiveOfferPrice = typeof offerPrice === "number" ? offerPrice : null;
  const coveredAmountInput = certificatePointsCoveredAmountInput ?? 0;

  if (!certificateAvailable) {
    return {
      calculation: {
        certificatePaymentMode: "money_only",
        certificatePointsCoveredAmount: 0,
        certificatePointsPrice: 0,
        certificateMoneyPrice:
          effectiveOfferPrice !== null && effectiveOfferPrice > 0
            ? roundMoney(effectiveOfferPrice)
            : 0,
        referenceValuePerPoint,
        referenceExchangeRate,
      },
      errorMessage: null,
    };
  }

  if (effectiveOfferPrice === null || effectiveOfferPrice <= 0) {
    return {
      calculation: null,
      errorMessage:
        "For certificate/reward offer, current offer price must be greater than 0.",
    };
  }

  if (coveredAmountInput < 0) {
    return {
      calculation: null,
      errorMessage: "Covered by points amount cannot be negative.",
    };
  }

  if (coveredAmountInput > effectiveOfferPrice) {
    return {
      calculation: null,
      errorMessage:
        "Covered by points amount cannot be greater than the current offer price.",
    };
  }

  if (coveredAmountInput === 0) {
    return {
      calculation: {
        certificatePaymentMode: "money_only",
        certificatePointsCoveredAmount: 0,
        certificatePointsPrice: 0,
        certificateMoneyPrice: roundMoney(effectiveOfferPrice),
        referenceValuePerPoint,
        referenceExchangeRate,
      },
      errorMessage: null,
    };
  }

  if (referenceValuePerPoint <= 0) {
    return {
      calculation: null,
      errorMessage: "referenceValuePerPoint must be greater than 0.",
    };
  }

  if (!referenceExchangeRate || referenceExchangeRate <= 0) {
    return {
      calculation: null,
      errorMessage:
        "For points calculation, referenceExchangeRate must be greater than 0. Example: if 1 EUR = 4.30 PLN, enter 4.30.",
    };
  }

  const certificatePointsPrice = roundPoints(
    coveredAmountInput / referenceExchangeRate / referenceValuePerPoint
  );

  if (certificatePointsPrice <= 0) {
    return {
      calculation: null,
      errorMessage: "Calculated points price must be greater than 0.",
    };
  }

  const certificateMoneyPrice = roundMoney(effectiveOfferPrice - coveredAmountInput);

  const certificatePaymentMode =
    certificateMoneyPrice === 0 ? "points_only" : "mixed";

  return {
    calculation: {
      certificatePaymentMode,
      certificatePointsCoveredAmount: roundMoney(coveredAmountInput),
      certificatePointsPrice,
      certificateMoneyPrice,
      referenceValuePerPoint,
      referenceExchangeRate,
    },
    errorMessage: null,
  };
}

async function verifyOrganizationAccess(
  appUserId: string,
  actorId: string,
  organizationId: string
) {
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select(
      "id, organization_name, organization_type, status, created_by_user_id, owner_actor_id"
    )
    .eq("id", organizationId)
    .eq("created_by_user_id", appUserId)
    .eq("owner_actor_id", actorId)
    .single();

  if (organizationError || !organization) {
    return {
      organization: null,
      errorResponse: NextResponse.json(
        { error: "Organization not found or access denied" },
        { status: 403 }
      ),
    };
  }

  return {
    organization,
    errorResponse: null,
  };
}

async function verifyValueObjectAccess(
  appUserId: string,
  personActorId: string,
  organizationId: string,
  valueObjectId: string
) {
  const { data: valueObject, error: valueObjectError } = await supabase
    .from("value_objects")
    .select("id, title, value_type, organization_id, owner_actor_id")
    .eq("id", valueObjectId)
    .eq("owner_user_id", appUserId)
    .eq("owner_actor_id", personActorId)
    .eq("organization_id", organizationId)
    .single();

  if (valueObjectError || !valueObject) {
    return {
      valueObject: null,
      errorResponse: NextResponse.json(
        {
          error:
            "Value object not found, not connected to this organization, or access denied",
        },
        { status: 403 }
      ),
    };
  }

  return {
    valueObject,
    errorResponse: null,
  };
}

async function verifyOfferItemsAccess(
  appUserId: string,
  personActorId: string,
  organizationId: string,
  items: OfferItemInput[]
) {
  for (const item of items) {
    if (!item.valueObjectId) {
      return {
        errorResponse: NextResponse.json(
          { error: "Each offer item must have valueObjectId" },
          { status: 400 }
        ),
      };
    }

    const { errorResponse } = await verifyValueObjectAccess(
      appUserId,
      personActorId,
      organizationId,
      item.valueObjectId
    );

    if (errorResponse) {
      return { errorResponse };
    }
  }

  return {
    errorResponse: null,
  };
}

export async function GET() {
  const { personActor, errorResponse } = await getCurrentUserContext();

  if (errorResponse) {
    return errorResponse;
  }

  if (!personActor) {
    return NextResponse.json(
      { error: "User context not found" },
      { status: 500 }
    );
  }

  const { data: offers, error: offersError } = await supabase
    .from("offers")
    .select(
      `
      *,
      value_objects (*),
      organizations (
        id,
        organization_name,
        organization_type,
        status
      ),
      offer_items (
        id,
        offer_id,
        organization_id,
        value_object_id,
        quantity,
        unit_price,
        total_price,
        currency,
        sort_order,
        is_required,
        status,
        value_objects (
          id,
          title,
          value_type,
          default_price,
          default_currency
        )
      )
    `
    )
    .eq("provider_actor_id", personActor.id)
    .order("created_at", { ascending: false });

  if (offersError) {
    return NextResponse.json({ error: offersError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    offers,
  });
}

export async function POST(request: Request) {
  const { appUser, personActor, errorResponse } = await getCurrentUserContext();

  if (errorResponse) {
    return errorResponse;
  }

  if (!appUser || !personActor) {
    return NextResponse.json(
      { error: "User context not found" },
      { status: 500 }
    );
  }

  const body = await request.json();

  const sourceLocale = parseOptionalText(body.locale) ?? "en";
  const organizationId = parseOptionalText(body.organizationId);
  const valueObjectId = parseOptionalText(body.valueObjectId);
  const offerType = parseOptionalText(body.offerType);
  const title = parseOptionalText(body.title);
  const description = parseOptionalText(body.description);
  const price = parseOptionalNumber(body.price);
  const currency = normalizeCurrency(body.currency);
  const isPaid = parseOptionalBoolean(body.isPaid, true);
  const isFree = parseOptionalBoolean(body.isFree, false);
  const certificateAvailable = parseOptionalBoolean(
    body.certificateAvailable,
    false
  );
  const requiresBooking = parseOptionalBoolean(body.requiresBooking, false);
  const bookingMode = parseOptionalText(body.bookingMode) ?? "not_required";
  const defaultDurationMinutes = parseOptionalInteger(
    body.defaultDurationMinutes
  );
  const minDurationMinutes = parseOptionalInteger(body.minDurationMinutes);
  const maxDurationMinutes = parseOptionalInteger(body.maxDurationMinutes);
  const quantityLimit = parseOptionalInteger(body.quantityLimit);
  const validFrom = parseOptionalDateTime(body.validFrom);
  const validUntil = parseOptionalDateTime(body.validUntil);
  const targetReceiverType = parseOptionalText(body.targetReceiverType);
  const spaceId = parseOptionalText(body.spaceId);

  const regularPrice = parseOptionalNumber(body.regularPrice);
  const isDiscountActive = parseOptionalBoolean(body.isDiscountActive, false);
  const discountType = validateDiscountType(parseOptionalText(body.discountType));
  const discountValue = parseOptionalNumber(body.discountValue);
  const discountStartsAt = parseOptionalDateTime(body.discountStartsAt);
  const discountEndsAt = parseOptionalDateTime(body.discountEndsAt);
  const lowestPrice30Days = parseOptionalNumber(body.lowestPrice30Days);
  const lowestPrice30DaysCurrency = normalizeCurrency(
    body.lowestPrice30DaysCurrency
  );
  const lowestPrice30DaysPeriodStart = parseOptionalDateTime(
    body.lowestPrice30DaysPeriodStart
  );
  const lowestPrice30DaysPeriodEnd = parseOptionalDateTime(
    body.lowestPrice30DaysPeriodEnd
  );
  const discountLegalNote = parseOptionalText(body.discountLegalNote);

  const certificatePointsCoveredAmount = parseOptionalNumber(
    body.certificatePointsCoveredAmount
  );
  const certificateCurrency = normalizeCurrency(body.certificateCurrency);
  const certificateTerms = parseOptionalText(body.certificateTerms);
  const certificateValidityDays = parseOptionalInteger(
    body.certificateValidityDays
  );
  const requiresSellerConfirmation = parseOptionalBoolean(
    body.requiresSellerConfirmation,
    true
  );
  const isTransferable = parseOptionalBoolean(body.isTransferable, true);
  const isCancellable = parseOptionalBoolean(body.isCancellable, true);
  const pointsRefundPolicy = validatePointsRefundPolicy(
    parseOptionalText(body.pointsRefundPolicy)
  );
  const maxCertificatesTotal = parseOptionalInteger(body.maxCertificatesTotal);
  const maxCertificatesPerUser = parseOptionalInteger(
    body.maxCertificatesPerUser
  );
  const isPublicReward = parseOptionalBoolean(body.isPublicReward, true);

  const pointsCurrencyCode = normalizeCurrency(body.pointsCurrencyCode) ?? "POINT";
  const referenceCurrency = normalizeCurrency(body.referenceCurrency) ?? "EUR";
  const referenceValuePerPoint = parseOptionalNumber(
    body.referenceValuePerPoint
  );
  const referenceExchangeRate = parseOptionalNumber(body.referenceExchangeRate);
  const referenceExchangeRateSource =
    parseOptionalText(body.referenceExchangeRateSource) ?? "manual";
  const referenceExchangeRateDate = parseOptionalText(
    body.referenceExchangeRateDate
  );

  const rawItems: unknown[] = Array.isArray(body.items) ? body.items : [];
  const items: OfferItemInput[] = rawItems.filter(
    (item: unknown): item is OfferItemInput =>
      item !== null && typeof item === "object"
  );

  if (!organizationId || !offerType || !title) {
    return NextResponse.json(
      { error: "organizationId, offerType and title are required" },
      { status: 400 }
    );
  }

  if (isDiscountActive && !lowestPrice30Days) {
    return NextResponse.json(
      {
        error:
          "For active discount, lowestPrice30Days is required for Polish/EU price reduction compliance.",
      },
      { status: 400 }
    );
  }

  const { calculation, errorMessage: certificatePricingErrorMessage } =
    calculateCertificatePricing({
      certificateAvailable,
      offerPrice: price,
      certificatePointsCoveredAmountInput: certificatePointsCoveredAmount,
      referenceValuePerPointInput: referenceValuePerPoint,
      referenceExchangeRateInput: referenceExchangeRate,
    });

  if (certificatePricingErrorMessage || !calculation) {
    return NextResponse.json(
      { error: certificatePricingErrorMessage ?? "Certificate pricing error" },
      { status: 400 }
    );
  }

  const { organization, errorResponse: organizationAccessErrorResponse } =
    await verifyOrganizationAccess(
      appUser.id,
      personActor.id,
      organizationId
    );

  if (organizationAccessErrorResponse) {
    return organizationAccessErrorResponse;
  }

  if (!organization) {
    return NextResponse.json(
      { error: "Organization context not found" },
      { status: 500 }
    );
  }

  if (valueObjectId) {
    const { errorResponse: valueObjectAccessErrorResponse } =
      await verifyValueObjectAccess(
        appUser.id,
        personActor.id,
        organization.id,
        valueObjectId
      );

    if (valueObjectAccessErrorResponse) {
      return valueObjectAccessErrorResponse;
    }
  }

  if (items.length > 0) {
    const { errorResponse: offerItemsAccessErrorResponse } =
      await verifyOfferItemsAccess(
        appUser.id,
        personActor.id,
        organization.id,
        items
      );

    if (offerItemsAccessErrorResponse) {
      return offerItemsAccessErrorResponse;
    }
  }

  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .insert({
      provider_actor_id: personActor.id,
      organization_id: organization.id,
      space_id: spaceId,
      value_object_id: valueObjectId,
      offer_type: offerType,
      title,
      description,
      price,
      currency,
      is_paid: isPaid,
      is_free: isFree,
      certificate_available: certificateAvailable,
      requires_booking: requiresBooking,
      booking_mode: bookingMode,
      default_duration_minutes: defaultDurationMinutes,
      min_duration_minutes: minDurationMinutes,
      max_duration_minutes: maxDurationMinutes,
      quantity_limit: quantityLimit,
      valid_from: validFrom,
      valid_until: validUntil,
      target_receiver_type: targetReceiverType,
      status: "active",

      regular_price: regularPrice,
      is_discount_active: isDiscountActive,
      discount_type: discountType,
      discount_value: discountValue,
      discount_starts_at: discountStartsAt,
      discount_ends_at: discountEndsAt,
      lowest_price_30_days: lowestPrice30Days,
      lowest_price_30_days_currency: lowestPrice30DaysCurrency ?? currency,
      lowest_price_30_days_period_start: lowestPrice30DaysPeriodStart,
      lowest_price_30_days_period_end: lowestPrice30DaysPeriodEnd,
      discount_legal_note: discountLegalNote,

      certificate_payment_mode: calculation.certificatePaymentMode,
      certificate_points_covered_amount:
        calculation.certificatePointsCoveredAmount,
      certificate_points_price: calculation.certificatePointsPrice,
      certificate_money_price: calculation.certificateMoneyPrice,
      certificate_currency: certificateCurrency ?? currency,
      certificate_terms: certificateTerms,
      certificate_validity_days: certificateValidityDays,
      requires_seller_confirmation: requiresSellerConfirmation,
      is_transferable: isTransferable,
      is_cancellable: isCancellable,
      points_refund_policy: pointsRefundPolicy,
      max_certificates_total: maxCertificatesTotal,
      max_certificates_per_user: maxCertificatesPerUser,
      is_public_reward: isPublicReward,

      points_currency_code: pointsCurrencyCode,
      reference_currency: referenceCurrency,
      reference_value_per_point: calculation.referenceValuePerPoint,
      reference_exchange_rate: calculation.referenceExchangeRate,
      reference_exchange_rate_source: referenceExchangeRateSource,
      reference_exchange_rate_date: referenceExchangeRateDate,
    })
    .select(
      `
      *,
      value_objects (*),
      organizations (
        id,
        organization_name,
        organization_type,
        status
      )
    `
    )
    .single();

  if (offerError) {
    return NextResponse.json({ error: offerError.message }, { status: 500 });
  }

  let offerItems = [];

  if (items.length > 0) {
    const offerItemsToInsert = items.map((item, index) => {
      const quantity = parseRequiredPositiveNumber(item.quantity, 1);
      const unitPrice = parseOptionalNumber(item.unitPrice);
      const totalPrice = unitPrice === null ? null : quantity * unitPrice;

      return {
        offer_id: offer.id,
        organization_id: organization.id,
        value_object_id: item.valueObjectId,
        quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        currency: item.currency ?? currency,
        sort_order: parseIntegerWithFallback(item.sortOrder, index),
        is_required: item.isRequired ?? true,
        status: "active",
      };
    });

    const { data: insertedOfferItems, error: offerItemsError } = await supabase
      .from("offer_items")
      .insert(offerItemsToInsert)
      .select(
        `
        *,
        value_objects (
          id,
          title,
          value_type,
          default_price,
          default_currency
        )
      `
      );

    if (offerItemsError) {
      await supabase.from("offers").delete().eq("id", offer.id);

      return NextResponse.json(
        { error: offerItemsError.message },
        { status: 500 }
      );
    }

    offerItems = insertedOfferItems ?? [];
  }

  const contentLocalization = await localizeEntityContent({
    userId: appUser.id,
    actorId: personActor.id,
    table: "offers",
    entityId: offer.id,
    sourceLocaleHint: sourceLocale,
    fields: {
      title,
      description,
      discountLegalNote,
      certificateTerms,
    },
  });

  return NextResponse.json({
    ok: true,
    contentLocalization,
    offer: {
      ...offer,
      offer_items: offerItems,
    },
  });
}

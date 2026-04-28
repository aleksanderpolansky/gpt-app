import { NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";

type OfferItemInput = {
  valueObjectId?: string | null;
  quantity?: unknown;
  unitPrice?: unknown;
  currency?: string | null;
  sortOrder?: unknown;
  isRequired?: boolean;
};

async function getCurrentUserContext() {
  const session = await auth0.getSession();

  if (!session?.user) {
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

  const { data: appUser, error: appUserError } = await supabase
    .from("app_users")
    .select("*")
    .eq("auth0_sub", session.user.sub)
    .single();

  if (appUserError) {
    return {
      appUser: null,
      person: null,
      personActor: null,
      errorResponse: NextResponse.json(
        { error: appUserError.message },
        { status: 500 }
      ),
    };
  }

  const { data: person, error: personError } = await supabase
    .from("persons")
    .select("*")
    .eq("user_id", appUser.id)
    .single();

  if (personError) {
    return {
      appUser: null,
      person: null,
      personActor: null,
      errorResponse: NextResponse.json(
        { error: personError.message },
        { status: 500 }
      ),
    };
  }

  const { data: personActor, error: personActorError } = await supabase
    .from("actors")
    .select("*")
    .eq("person_id", person.id)
    .eq("actor_type", "person")
    .single();

  if (personActorError) {
    return {
      appUser: null,
      person: null,
      personActor: null,
      errorResponse: NextResponse.json(
        { error: personActorError.message },
        { status: 500 }
      ),
    };
  }

  return {
    appUser,
    person,
    personActor,
    errorResponse: null,
  };
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

function parseRequiredPositiveNumber(value: unknown, fallbackValue = 1) {
  const parsedValue = parseOptionalNumber(value);

  if (parsedValue === null || parsedValue <= 0) {
    return fallbackValue;
  }

  return parsedValue;
}

function parseOptionalInteger(value: unknown, fallbackValue = 0) {
  const parsedValue = parseOptionalNumber(value);

  if (parsedValue === null) {
    return fallbackValue;
  }

  return Math.trunc(parsedValue);
}

async function verifyOrganizationAccess(
  appUserId: string,
  organizationId: string
) {
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, organization_name, organization_type, status, created_by_user_id")
    .eq("id", organizationId)
    .eq("created_by_user_id", appUserId)
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
  personActorId: string,
  organizationId: string,
  valueObjectId: string
) {
  const { data: valueObject, error: valueObjectError } = await supabase
    .from("value_objects")
    .select("id, title, value_type, organization_id, owner_actor_id")
    .eq("id", valueObjectId)
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

  const organizationId = body.organizationId;
  const valueObjectId = body.valueObjectId ?? null;
  const offerType = body.offerType;
  const title = body.title;
  const description = body.description ?? null;
  const price = parseOptionalNumber(body.price);
  const currency = body.currency ?? null;
  const isPaid = body.isPaid ?? true;
  const isFree = body.isFree ?? false;
  const certificateAvailable = body.certificateAvailable ?? false;
  const requiresBooking = body.requiresBooking ?? false;
  const bookingMode = body.bookingMode ?? "not_required";
  const defaultDurationMinutes = parseOptionalNumber(
    body.defaultDurationMinutes
  );
  const minDurationMinutes = parseOptionalNumber(body.minDurationMinutes);
  const maxDurationMinutes = parseOptionalNumber(body.maxDurationMinutes);
  const quantityLimit = parseOptionalNumber(body.quantityLimit);
  const validFrom = body.validFrom || null;
  const validUntil = body.validUntil || null;
  const targetReceiverType = body.targetReceiverType ?? null;
  const spaceId = body.spaceId ?? null;

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

  const { organization, errorResponse: organizationAccessErrorResponse } =
    await verifyOrganizationAccess(appUser.id, organizationId);

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
      await verifyOfferItemsAccess(personActor.id, organization.id, items);

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
        sort_order: parseOptionalInteger(item.sortOrder, index),
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

  return NextResponse.json({
    ok: true,
    offer: {
      ...offer,
      offer_items: offerItems,
    },
  });
}
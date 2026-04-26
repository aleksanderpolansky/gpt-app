import { NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";

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
      value_objects (*)
    `
    )
    .eq("provider_actor_id", personActor.id)
    .order("created_at", { ascending: false });

  if (offersError) {
    return NextResponse.json(
      { error: offersError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    offers,
  });
}

export async function POST(request: Request) {
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

  const body = await request.json();

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

  if (!offerType || !title) {
    return NextResponse.json(
      { error: "offerType and title are required" },
      { status: 400 }
    );
  }

  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .insert({
      provider_actor_id: personActor.id,
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
    .select()
    .single();

  if (offerError) {
    return NextResponse.json(
      { error: offerError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    offer,
  });
}
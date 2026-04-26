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

  const { data: availabilityRules, error: availabilityRulesError } =
    await supabase
      .from("availability_rules")
      .select(
        `
        *,
        offers (*),
        locations (*)
      `
      )
      .eq("provider_actor_id", personActor.id)
      .order("created_at", { ascending: false });

  if (availabilityRulesError) {
    return NextResponse.json(
      { error: availabilityRulesError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    availabilityRules,
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

  const offerId = body.offerId;
  const weekday = body.weekday;
  const startTime = body.startTime;
  const endTime = body.endTime;
  const slotDurationMinutes = parseOptionalNumber(body.slotDurationMinutes) ?? 30;
  const bufferBeforeMinutes = parseOptionalNumber(body.bufferBeforeMinutes) ?? 0;
  const bufferAfterMinutes = parseOptionalNumber(body.bufferAfterMinutes) ?? 0;
  const locationId = body.locationId || null;
  const validFrom = body.validFrom || null;
  const validUntil = body.validUntil || null;
  const isActive = body.isActive ?? true;

  if (!offerId || !weekday || !startTime || !endTime) {
    return NextResponse.json(
      { error: "offerId, weekday, startTime and endTime are required" },
      { status: 400 }
    );
  }

  const { data: availabilityRule, error: availabilityRuleError } =
    await supabase
      .from("availability_rules")
      .insert({
        provider_actor_id: personActor.id,
        offer_id: offerId,
        weekday,
        start_time: startTime,
        end_time: endTime,
        slot_duration_minutes: slotDurationMinutes,
        buffer_before_minutes: bufferBeforeMinutes,
        buffer_after_minutes: bufferAfterMinutes,
        location_id: locationId,
        valid_from: validFrom,
        valid_until: validUntil,
        is_active: isActive,
      })
      .select()
      .single();

  if (availabilityRuleError) {
    return NextResponse.json(
      { error: availabilityRuleError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    availabilityRule,
  });
}
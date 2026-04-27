import { NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";
import { checkBookingConflictByOffer } from "../../../../lib/booking-conflicts";
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

function calculateDurationMinutes(startTime: string, endTime: string) {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return null;
  }

  const duration = Math.round((end - start) / 60000);

  if (duration <= 0) {
    return null;
  }

  return duration;
}

function doIntervalsOverlap(
  firstStart: Date,
  firstEnd: Date,
  secondStart: Date,
  secondEnd: Date
) {
  return firstStart < secondEnd && secondStart < firstEnd;
}

async function isProviderBusy(
  providerActorId: string,
  startTime: string,
  endTime: string
) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  const { data: calendarEvents, error: calendarEventsError } = await supabase
    .from("calendar_events")
    .select("id,start_time,end_time")
    .eq("actor_id", providerActorId)
    .in("status", ["planned", "confirmed", "completed"])
    .lt("start_time", end.toISOString())
    .gt("end_time", start.toISOString());

  if (calendarEventsError) {
    return {
      busy: true,
      errorMessage: calendarEventsError.message,
    };
  }

  const hasOverlap = (calendarEvents ?? []).some((calendarEvent) => {
    return doIntervalsOverlap(
      start,
      end,
      new Date(calendarEvent.start_time),
      new Date(calendarEvent.end_time)
    );
  });

  return {
    busy: hasOverlap,
    errorMessage: null,
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

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select(
      `
      *,
      offers (*),
      calendar_events (*)
    `
    )
    .or(
      `provider_actor_id.eq.${personActor.id},receiver_actor_id.eq.${personActor.id}`
    )
    .order("start_time", { ascending: true });

  if (bookingsError) {
    return NextResponse.json(
      { error: bookingsError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    bookings,
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

  const offerId = body.offerId;
  const startTime = body.startTime;
  const endTime = body.endTime;
  const certificateId = body.certificateId ?? null;
  const locationId = body.locationId ?? null;

  if (!offerId || !startTime || !endTime) {
    return NextResponse.json(
      { error: "offerId, startTime and endTime are required" },
      { status: 400 }
    );
  }

  const durationMinutes = calculateDurationMinutes(startTime, endTime);

  if (durationMinutes === null) {
    return NextResponse.json(
      { error: "Invalid startTime or endTime" },
      { status: 400 }
    );
  }

  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .select("*")
    .eq("id", offerId)
    .single();

  if (offerError || !offer) {
    return NextResponse.json(
      { error: offerError?.message ?? "Offer not found" },
      { status: 500 }
    );
  }

  const providerActorId = offer.provider_actor_id;

  if (!providerActorId) {
    return NextResponse.json(
      { error: "Offer provider actor not found" },
      { status: 500 }
    );
  }

  const bookingConflictCheck = await checkBookingConflictByOffer({
    offerId,
    startTime,
    endTime,
  });

  if (bookingConflictCheck.errorMessage) {
    return NextResponse.json(
      { error: bookingConflictCheck.errorMessage },
      { status: 500 }
    );
  }

  if (bookingConflictCheck.hasConflict) {
    return NextResponse.json(
      { error: "This time slot is already booked for this offer" },
      { status: 409 }
    );
  }

  const busyCheck = await isProviderBusy(providerActorId, startTime, endTime);

  if (busyCheck.errorMessage) {
    return NextResponse.json(
      { error: busyCheck.errorMessage },
      { status: 500 }
    );
  }

  if (busyCheck.busy) {
    return NextResponse.json(
      { error: "Selected slot is already busy" },
      { status: 409 }
    );
  }

  const bookingStatus =
    offer.booking_mode === "auto_confirm" ? "confirmed" : "requested";

  const activityStatus =
    bookingStatus === "confirmed" ? "confirmed" : "planned";

  const { data: plannedActivity, error: plannedActivityError } = await supabase
    .from("activities")
    .insert({
      user_id: appUser.id,
      primary_actor_id: personActor.id,
      primary_space_id: offer.space_id,
      activity_type: "booking_created",
      title: `Booking: ${offer.title}`,
      description: `Booking created for offer: ${offer.title}`,
      raw_input: body.rawInput ?? null,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: durationMinutes,
      location_id: locationId,
      status: activityStatus,
      source: "booking",
    })
    .select()
    .single();

  if (plannedActivityError) {
    return NextResponse.json(
      { error: plannedActivityError.message },
      { status: 500 }
    );
  }

  const { data: activityParticipants, error: participantsError } =
    await supabase
      .from("activity_participants")
      .insert([
        {
          activity_id: plannedActivity.id,
          actor_id: providerActorId,
          space_id: offer.space_id,
          participant_role: "service_provider",
          is_primary: false,
          status: "active",
        },
        {
          activity_id: plannedActivity.id,
          actor_id: personActor.id,
          space_id: offer.space_id,
          participant_role: "service_receiver",
          is_primary: true,
          status: "active",
        },
      ])
      .select();

  if (participantsError) {
    return NextResponse.json(
      { error: participantsError.message },
      { status: 500 }
    );
  }

  const { data: calendarEvent, error: calendarEventError } = await supabase
    .from("calendar_events")
    .insert({
      user_id: appUser.id,
      actor_id: providerActorId,
      space_id: offer.space_id,
      event_type: "service_booking",
      title: `Booking: ${offer.title}`,
      description: `Booking created for offer: ${offer.title}`,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: durationMinutes,
      location_id: locationId,
      status: activityStatus,
      source: "booking",
      related_activity_id: plannedActivity.id,
      related_offer_id: offer.id,
      related_certificate_id: certificateId,
    })
    .select()
    .single();

  if (calendarEventError) {
    return NextResponse.json(
      { error: calendarEventError.message },
      { status: 500 }
    );
  }

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      offer_id: offer.id,
      certificate_id: certificateId,
      provider_actor_id: providerActorId,
      receiver_actor_id: personActor.id,
      calendar_event_id: calendarEvent.id,
      planned_activity_id: plannedActivity.id,
      booking_status: bookingStatus,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: durationMinutes,
      location_id: locationId,
    })
    .select()
    .single();

  if (bookingError) {
    return NextResponse.json(
      { error: bookingError.message },
      { status: 500 }
    );
  }

  const { data: activityLinks, error: activityLinksError } = await supabase
    .from("activity_links")
    .insert([
      {
        activity_id: plannedActivity.id,
        linked_entity_type: "calendar_event",
        linked_entity_id: calendarEvent.id,
        link_type: "creates",
      },
      {
        activity_id: plannedActivity.id,
        linked_entity_type: "booking",
        linked_entity_id: booking.id,
        link_type: "creates",
      },
      {
        activity_id: plannedActivity.id,
        linked_entity_type: "offer",
        linked_entity_id: offer.id,
        link_type: "scheduled_by",
      },
    ])
    .select();

  if (activityLinksError) {
    return NextResponse.json(
      { error: activityLinksError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    booking,
    plannedActivity,
    activityParticipants,
    calendarEvent,
    activityLinks,
  });
}
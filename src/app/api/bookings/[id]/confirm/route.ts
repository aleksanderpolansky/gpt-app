import { NextResponse } from "next/server";
import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
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

export async function POST(request: Request, context: RouteContext) {
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

  const { id: bookingId } = await context.params;

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    return NextResponse.json(
      { error: bookingError?.message ?? "Booking not found" },
      { status: 404 }
    );
  }

  if (booking.provider_actor_id !== personActor.id) {
    return NextResponse.json(
      { error: "Only provider can confirm this booking" },
      { status: 403 }
    );
  }

  if (booking.booking_status !== "requested") {
    return NextResponse.json(
      { error: "Only requested bookings can be confirmed" },
      { status: 400 }
    );
  }

  const { data: updatedBooking, error: updateBookingError } = await supabase
    .from("bookings")
    .update({
      booking_status: "confirmed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", booking.id)
    .select()
    .single();

  if (updateBookingError) {
    return NextResponse.json(
      { error: updateBookingError.message },
      { status: 500 }
    );
  }

  let updatedCalendarEvent = null;

  if (booking.calendar_event_id) {
    const { data: calendarEvent, error: calendarEventError } = await supabase
      .from("calendar_events")
      .update({
        status: "confirmed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking.calendar_event_id)
      .select()
      .single();

    if (calendarEventError) {
      return NextResponse.json(
        { error: calendarEventError.message },
        { status: 500 }
      );
    }

    updatedCalendarEvent = calendarEvent;
  }

  let updatedPlannedActivity = null;

  if (booking.planned_activity_id) {
    const { data: plannedActivity, error: plannedActivityError } =
      await supabase
        .from("activities")
        .update({
          status: "confirmed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.planned_activity_id)
        .select()
        .single();

    if (plannedActivityError) {
      return NextResponse.json(
        { error: plannedActivityError.message },
        { status: 500 }
      );
    }

    updatedPlannedActivity = plannedActivity;
  }

  return NextResponse.json({
    ok: true,
    booking: updatedBooking,
    calendarEvent: updatedCalendarEvent,
    plannedActivity: updatedPlannedActivity,
  });
}
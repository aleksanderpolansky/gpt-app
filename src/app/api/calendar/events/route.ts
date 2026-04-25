import { NextResponse } from "next/server";
import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";

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

  if (duration < 0) {
    return null;
  }

  return duration;
}

export async function GET() {
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

  const { data: calendarEvents, error: calendarEventsError } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("user_id", appUser.id)
    .order("start_time", { ascending: true });

  if (calendarEventsError) {
    return NextResponse.json(
      { error: calendarEventsError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    calendarEvents,
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

  const eventType = body.eventType;
  const title = body.title;
  const description = body.description ?? null;
  const startTime = body.startTime;
  const endTime = body.endTime;
  const locationId = body.locationId ?? null;
  const spaceId = body.spaceId ?? null;
  const status = body.status ?? "planned";
  const source = body.source ?? "manual";

  if (!eventType || !title || !startTime || !endTime) {
    return NextResponse.json(
      { error: "eventType, title, startTime and endTime are required" },
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

  const { data: calendarEvent, error: calendarEventError } = await supabase
    .from("calendar_events")
    .insert({
      user_id: appUser.id,
      actor_id: personActor.id,
      space_id: spaceId,
      event_type: eventType,
      title,
      description,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: durationMinutes,
      location_id: locationId,
      status,
      source,
    })
    .select()
    .single();

  if (calendarEventError) {
    return NextResponse.json(
      { error: calendarEventError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    calendarEvent,
  });
}
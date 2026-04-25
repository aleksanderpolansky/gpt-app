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

  const { data: timeBlocks, error: timeBlocksError } = await supabase
    .from("time_blocks")
    .select("*")
    .eq("user_id", appUser.id)
    .order("start_time", { ascending: true });

  if (timeBlocksError) {
    return NextResponse.json(
      { error: timeBlocksError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    timeBlocks,
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

  const blockType = body.blockType;
  const startTime = body.startTime;
  const endTime = body.endTime;
  const availabilityStatus = body.availabilityStatus ?? "busy";
  const energyExpectation = body.energyExpectation ?? null;
  const attentionRequirement = body.attentionRequirement ?? null;
  const canMultitask = body.canMultitask ?? false;
  const source = body.source ?? "manual";
  const spaceId = body.spaceId ?? null;
  const relatedCalendarEventId = body.relatedCalendarEventId ?? null;

  if (!blockType || !startTime || !endTime) {
    return NextResponse.json(
      { error: "blockType, startTime and endTime are required" },
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

  const { data: timeBlock, error: timeBlockError } = await supabase
    .from("time_blocks")
    .insert({
      user_id: appUser.id,
      actor_id: personActor.id,
      space_id: spaceId,
      block_type: blockType,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: durationMinutes,
      availability_status: availabilityStatus,
      energy_expectation: energyExpectation,
      attention_requirement: attentionRequirement,
      can_multitask: canMultitask,
      source,
      related_calendar_event_id: relatedCalendarEventId,
    })
    .select()
    .single();

  if (timeBlockError) {
    return NextResponse.json(
      { error: timeBlockError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    timeBlock,
  });
}
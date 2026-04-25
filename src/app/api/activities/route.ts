import { NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";

type ParticipantInput = {
  actorId?: string;
  spaceId?: string;
  participantRole: string;
  isPrimary?: boolean;
  status?: string;
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

function calculateDurationMinutes(startTime: string | null, endTime: string | null) {
  if (!startTime || !endTime) {
    return null;
  }

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

  const { data: activities, error: activitiesError } = await supabase
    .from("activities")
    .select(
      `
      *,
      activity_participants (*)
    `
    )
    .eq("user_id", appUser.id)
    .order("created_at", { ascending: false });

  if (activitiesError) {
    return NextResponse.json(
      { error: activitiesError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    activities,
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

  const activityType = body.activityType;
  const title = body.title;
  const description = body.description ?? null;
  const rawInput = body.rawInput ?? null;
  const startTime = body.startTime ?? null;
  const endTime = body.endTime ?? null;
  const locationId = body.locationId ?? null;
  const primarySpaceId = body.primarySpaceId ?? null;
  const status = body.status ?? "completed";
  const source = body.source ?? "manual";
  const aiConfidence = body.aiConfidence ?? null;
  const participants: ParticipantInput[] = body.participants ?? [];

  if (!activityType || !title) {
    return NextResponse.json(
      { error: "activityType and title are required" },
      { status: 400 }
    );
  }

  const durationMinutes = calculateDurationMinutes(startTime, endTime);

  if (startTime && endTime && durationMinutes === null) {
    return NextResponse.json(
      { error: "Invalid startTime or endTime" },
      { status: 400 }
    );
  }

  const { data: activity, error: activityError } = await supabase
    .from("activities")
    .insert({
      user_id: appUser.id,
      primary_actor_id: personActor.id,
      primary_space_id: primarySpaceId,
      activity_type: activityType,
      title,
      description,
      raw_input: rawInput,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: durationMinutes,
      location_id: locationId,
      status,
      source,
      ai_confidence: aiConfidence,
    })
    .select()
    .single();

  if (activityError) {
    return NextResponse.json(
      { error: activityError.message },
      { status: 500 }
    );
  }

  const participantRows =
    participants.length > 0
      ? participants.map((participant) => ({
          activity_id: activity.id,
          actor_id: participant.actorId ?? personActor.id,
          space_id: participant.spaceId ?? primarySpaceId,
          participant_role: participant.participantRole,
          is_primary: participant.isPrimary ?? false,
          status: participant.status ?? "active",
        }))
      : [
          {
            activity_id: activity.id,
            actor_id: personActor.id,
            space_id: primarySpaceId,
            participant_role: "self",
            is_primary: true,
            status: "active",
          },
        ];

  const { data: activityParticipants, error: participantsError } = await supabase
    .from("activity_participants")
    .insert(participantRows)
    .select();

  if (participantsError) {
    return NextResponse.json(
      { error: participantsError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    activity,
    activityParticipants,
  });
}
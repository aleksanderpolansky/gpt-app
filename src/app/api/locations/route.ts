import { NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";

async function getCurrentPersonActor() {
  const session = await auth0.getSession();

  if (!session?.user) {
    return {
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
      personActor: null,
      errorResponse: NextResponse.json(
        { error: personActorError.message },
        { status: 500 }
      ),
    };
  }

  return {
    personActor,
    errorResponse: null,
  };
}

export async function GET() {
  const { personActor, errorResponse } = await getCurrentPersonActor();

  if (errorResponse || !personActor) {
    return errorResponse;
  }

  const { data: locations, error: locationsError } = await supabase
    .from("locations")
    .select("*")
    .eq("owner_actor_id", personActor.id)
    .order("created_at", { ascending: false });

  if (locationsError) {
    return NextResponse.json(
      { error: locationsError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    locations,
  });
}

export async function POST(request: Request) {
  const { personActor, errorResponse } = await getCurrentPersonActor();

  if (errorResponse || !personActor) {
    return errorResponse;
  }

  const body = await request.json();

  const title = body.title;
  const locationType = body.locationType;
  const address = body.address ?? null;
  const city = body.city ?? null;
  const country = body.country ?? null;
  const latitude = body.latitude ?? null;
  const longitude = body.longitude ?? null;

  if (!title || !locationType) {
    return NextResponse.json(
      { error: "title and locationType are required" },
      { status: 400 }
    );
  }

  const { data: location, error: locationError } = await supabase
    .from("locations")
    .insert({
      title,
      location_type: locationType,
      address,
      city,
      country,
      latitude,
      longitude,
      owner_actor_id: personActor.id,
      status: "active",
    })
    .select()
    .single();

  if (locationError) {
    return NextResponse.json(
      { error: locationError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    location,
  });
}
import { NextResponse } from "next/server";
import { auth0 } from "../auth0";
import { supabase } from "../supabase";

export type ActivityAppUser = {
  id: string;
  auth0_sub?: string | null;
  [key: string]: unknown;
};

export type ActivityPerson = {
  id: string;
  user_id: string;
  [key: string]: unknown;
};

export type ActivityActor = {
  id: string;
  person_id?: string | null;
  actor_type?: string | null;
  [key: string]: unknown;
};

export type ActivityUserContext = {
  appUser: ActivityAppUser | null;
  person: ActivityPerson | null;
  personActor: ActivityActor | null;
  errorResponse: NextResponse | null;
};

export async function getActivityUserContext(): Promise<ActivityUserContext> {
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

  if (appUserError || !appUser) {
    return {
      appUser: null,
      person: null,
      personActor: null,
      errorResponse: NextResponse.json(
        { error: appUserError?.message ?? "App user not found" },
        { status: 500 }
      ),
    };
  }

  const typedAppUser = appUser as ActivityAppUser;

  const { data: person, error: personError } = await supabase
    .from("persons")
    .select("*")
    .eq("user_id", typedAppUser.id)
    .single();

  if (personError || !person) {
    return {
      appUser: null,
      person: null,
      personActor: null,
      errorResponse: NextResponse.json(
        { error: personError?.message ?? "Person not found" },
        { status: 500 }
      ),
    };
  }

  const typedPerson = person as ActivityPerson;

  const { data: personActor, error: personActorError } = await supabase
    .from("actors")
    .select("*")
    .eq("person_id", typedPerson.id)
    .eq("actor_type", "person")
    .single();

  if (personActorError || !personActor) {
    return {
      appUser: null,
      person: null,
      personActor: null,
      errorResponse: NextResponse.json(
        { error: personActorError?.message ?? "Person actor not found" },
        { status: 500 }
      ),
    };
  }

  return {
    appUser: typedAppUser,
    person: typedPerson,
    personActor: personActor as ActivityActor,
    errorResponse: null,
  };
}

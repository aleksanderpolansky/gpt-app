import { NextResponse } from "next/server";
import { auth0 } from "../auth0";
import {
  ActorContextError,
  resolveActiveActorContext,
} from "../actor-context";
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
  /**
   * Compatibility name retained for existing activity routes.
   * Since Reality Model v2 P4 this is the server-resolved active profile
   * actor (person or avatar), not necessarily the account's person actor.
   */
  personActor: ActivityActor | null;
  errorResponse: NextResponse | null;
};

export async function getActivityUserContext(): Promise<ActivityUserContext> {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
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

  let resolvedActorContext: Awaited<
    ReturnType<typeof resolveActiveActorContext>
  >;

  try {
    resolvedActorContext = await resolveActiveActorContext(session.user.sub);
  } catch (error) {
    if (error instanceof ActorContextError) {
      return {
        appUser: null,
        person: null,
        personActor: null,
        errorResponse: NextResponse.json(
          {
            error: error.message,
            errorCode: error.code,
          },
          { status: error.status }
        ),
      };
    }

    return {
      appUser: null,
      person: null,
      personActor: null,
      errorResponse: NextResponse.json(
        { error: "Could not resolve active actor context" },
        { status: 500 }
      ),
    };
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("app_users")
    .select("*")
    .eq("id", resolvedActorContext.appUserId)
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

  const { data: activeActor, error: activeActorError } = await supabase
    .from("actors")
    .select("*")
    .eq("id", resolvedActorContext.actorId)
    .in("actor_type", ["person", "avatar"])
    .eq("status", "active")
    .single();

  if (activeActorError || !activeActor) {
    return {
      appUser: null,
      person: null,
      personActor: null,
      errorResponse: NextResponse.json(
        { error: activeActorError?.message ?? "Active actor not found" },
        { status: 500 }
      ),
    };
  }

  return {
    appUser: typedAppUser,
    person: typedPerson,
    personActor: activeActor as ActivityActor,
    errorResponse: null,
  };
}

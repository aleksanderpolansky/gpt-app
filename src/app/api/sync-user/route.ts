import { NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";

export async function POST() {
  const session = await auth0.getSession();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  const user = session.user;

  const { data: appUser, error: appUserError } = await supabase
    .from("app_users")
    .upsert(
      {
        auth0_sub: user.sub,
        email: user.email,
        name: user.name,
        picture: user.picture,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "auth0_sub",
      }
    )
    .select()
    .single();

  if (appUserError) {
    return NextResponse.json(
      { error: appUserError.message },
      { status: 500 }
    );
  }

  const { data: existingPerson, error: existingPersonError } = await supabase
    .from("persons")
    .select("*")
    .eq("user_id", appUser.id)
    .maybeSingle();

  if (existingPersonError) {
    return NextResponse.json(
      { error: existingPersonError.message },
      { status: 500 }
    );
  }

  let person = existingPerson;

  if (!person) {
    const { data: createdPerson, error: createdPersonError } = await supabase
      .from("persons")
      .insert({
        user_id: appUser.id,
        full_name: user.name ?? appUser.email ?? "Unnamed user",
        short_name: user.name ?? appUser.email ?? "User",
        status: "active",
      })
      .select()
      .single();

    if (createdPersonError) {
      return NextResponse.json(
        { error: createdPersonError.message },
        { status: 500 }
      );
    }

    person = createdPerson;
  }

  const { data: existingActor, error: existingActorError } = await supabase
    .from("actors")
    .select("*")
    .eq("person_id", person.id)
    .eq("actor_type", "person")
    .maybeSingle();

  if (existingActorError) {
    return NextResponse.json(
      { error: existingActorError.message },
      { status: 500 }
    );
  }

  let actor = existingActor;

  if (!actor) {
    const { data: createdActor, error: createdActorError } = await supabase
      .from("actors")
      .insert({
        actor_type: "person",
        person_id: person.id,
        display_name: person.full_name ?? person.short_name ?? appUser.email ?? "User",
        status: "active",
      })
      .select()
      .single();

    if (createdActorError) {
      return NextResponse.json(
        { error: createdActorError.message },
        { status: 500 }
      );
    }

    actor = createdActor;
  }

  return NextResponse.json({
    ok: true,
    user: appUser,
    person,
    actor,
  });
}
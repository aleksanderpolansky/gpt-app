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

  const { data, error } = await supabase
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

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    user: data,
  });
}
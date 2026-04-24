import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";

export async function GET() {
  const session = await auth0.getSession();

  if (!session?.user) {
    return Response.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  let { data: appUser } = await supabase
    .from("app_users")
    .select("id")
    .eq("auth0_sub", session.user.sub)
    .single();

  if (!appUser) {
    const { data: newUser, error: insertError } = await supabase
      .from("app_users")
      .insert({
        auth0_sub: session.user.sub,
        email: session.user.email,
        name: session.user.name,
        picture: session.user.picture,
      })
      .select("id")
      .single();

    if (insertError) {
      return Response.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    appUser = newUser;
  }

  const { data: messages, error: messagesError } = await supabase
    .from("chat_messages")
    .select("id, role, content, created_at")
    .eq("user_id", appUser.id)
    .order("created_at", { ascending: true })
    .limit(20);

  if (messagesError) {
    return Response.json(
      { success: false, error: messagesError.message },
      { status: 500 }
    );
  }

  return Response.json({
    success: true,
    messages,
  });
}
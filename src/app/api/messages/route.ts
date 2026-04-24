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

  const { data: appUser, error: userError } = await supabase
    .from("app_users")
    .select("id")
    .eq("auth0_sub", session.user.sub)
    .single();

  if (userError) {
    return Response.json(
      { success: false, error: userError.message },
      { status: 500 }
    );
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
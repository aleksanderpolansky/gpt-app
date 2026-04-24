import OpenAI from "openai";
import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const session = await auth0.getSession();

    if (!session?.user) {
      return Response.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const userMessage = body.message;

    const { data: appUser, error: userError } = await supabase
      .from("app_users")
      .upsert(
        {
          auth0_sub: session.user.sub,
          email: session.user.email,
          name: session.user.name,
          picture: session.user.picture,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "auth0_sub",
        }
      )
      .select()
      .single();

    if (userError) {
      return Response.json(
        { success: false, error: userError.message },
        { status: 500 }
      );
    }

    await supabase.from("chat_messages").insert({
      user_id: appUser.id,
      role: "user",
      content: userMessage,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: userMessage }],
    });

    const reply = completion.choices[0]?.message?.content ?? "Пустой ответ";

    await supabase.from("chat_messages").insert({
      user_id: appUser.id,
      role: "assistant",
      content: reply,
    });

    return Response.json({
      success: true,
      reply,
    });
  } catch (error) {
    console.error("OPENAI_ERROR:", error);

    return Response.json(
      {
        success: false,
        reply: "Ошибка на сервере",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
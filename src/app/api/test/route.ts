import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";
import { OPENAI_DEFAULT_MODEL } from "../../../../lib/ai/openaiConfig";
import { runAiJson } from "../../../../lib/ai/openaiClient";

export const dynamic = "force-dynamic";

type ChatAiResponse = {
  reply: string;
};

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
    const userMessage =
      typeof body.message === "string" ? body.message.trim() : "";

    if (!userMessage) {
      return Response.json(
        { success: false, error: "Message is required" },
        { status: 400 }
      );
    }

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

    const aiResult = await runAiJson<ChatAiResponse>({
      system:
        "You are a simple AI assistant inside a web platform that is currently in development. Return only valid compact JSON in this exact shape: {\"reply\":\"string\"}. Keep the reply short and practical.",
      user: {
        message: userMessage,
      },
      maxOutputTokens: 200,
    });

    const reply =
      typeof aiResult.reply === "string" && aiResult.reply.trim()
        ? aiResult.reply.trim()
        : "Пустой ответ";

    await supabase.from("chat_messages").insert({
      user_id: appUser.id,
      role: "assistant",
      content: reply,
    });

    return Response.json({
      success: true,
      model: OPENAI_DEFAULT_MODEL,
      reply,
    });
  } catch (error) {
    console.error("OPENAI_ERROR:", error);

    return Response.json(
      {
        success: false,
        model: OPENAI_DEFAULT_MODEL,
        reply: "Ошибка на сервере",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
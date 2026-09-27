import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const cookieName = "arctor_admin_assist_v1";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const reply = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "private, no-store, max-age=0", "Vary": "Cookie", "Referrer-Policy": "no-referrer" },
});
const actions = new Set(["lookup", "start", "stop", "organization", "message", "template", "create-template"]);

export async function GET() {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return reply({ error: "Требуются права администратора." }, guard.status);
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return reply({ active: false });
  const { data, error } = await supabase.rpc("admin_assist_v1", {
    p_admin: guard.appUser.id, p_action: "list", p_token: hash(token), p_body: {},
  });
  if (error) return reply({ error: "Сессия помощи недоступна или истекла. Начните новую сессию." }, 403);
  return reply({ active: true, ...data });
}

export async function POST(request: Request) {
  // Origin comes from the browser; compare to the URL seen by Next, never a caller-supplied forwarded host.
  if (request.headers.get("origin") !== new URL(request.url).origin ||
      !request.headers.get("content-type")?.startsWith("application/json")) {
    return reply({ error: "Недопустимый источник запроса." }, 403);
  }
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return reply({ error: "Требуются права администратора." }, guard.status);
  let body: Record<string, unknown>;
  try {
    // Bound the streamed request before parsing, including chunked requests.
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: "Пустой запрос." }, 400);
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 250000) { await reader.cancel(); return reply({ error: "Слишком большой запрос." }, 413); }
      chunks.push(value);
    }
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid JSON");
    body = parsed as Record<string, unknown>;
  } catch { return reply({ error: "Некорректный JSON." }, 400); }
  const action = typeof body.action === "string" ? body.action : "";
  if (!actions.has(action)) return reply({ error: "Неизвестная операция." }, 400);
  const jar = await cookies();
  const token = action === "start" ? randomBytes(32).toString("hex") : jar.get(cookieName)?.value;
  if (!token && action !== "lookup") return reply({ error: "Начните сессию помощи." }, 403);
  const { data, error } = await supabase.rpc("admin_assist_v1", {
    p_admin: guard.appUser.id, p_action: action, p_token: token ? hash(token) : "", p_body: body,
  });
  if (error) {
    const message = error.message.includes("CHANGED_OR_NOT_OWNED") ? "Материал изменился или недоступен. Обновите список перед редактированием."
      : error.message.includes("SESSION_CHANGED") ? "Сессия изменена в другой вкладке. Обновите страницу."
      : error.message.includes("RICH_CONTENT") ? "Этот материал содержит структурированное содержимое. Используйте его штатный редактор."
      : "Операция отклонена. Проверьте выбранного пользователя, профиль, срок сессии и введённые данные. Если это первый запуск — проверьте применение SQL-миграции.";
    return reply({ error: message }, error.code === "42501" ? 403 : 409);
  }
  if (action === "organization") {
    revalidatePath("/directory", "layout");
    revalidatePath("/organizations", "layout");
  }
  const response = reply(data);
  if (action === "start" && token) response.cookies.set(cookieName, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/api/admin/assist", maxAge: 1800,
  });
  if (action === "stop") response.cookies.set(cookieName, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/api/admin/assist", maxAge: 0 });
  return response;
}

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { realAuth0 } from "../../../../lib/auth0-real";
import { ASSIST_COOKIE, assistCookieOptions, assistRpc } from "../../../../lib/assist-full-core";
import { ACTIVE_PROFILE_COOKIE_NAME, getActiveProfileCookieOptions } from "../../../../lib/actor-context";
import { requirePlatformAdmin } from "@/lib/admin/require-assist-admin";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
export async function GET() {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return reply({ error: "Нужен вход администратора." }, guard.status);
  const token = (await cookies()).get(ASSIST_COOKIE)?.value;
  if (!token) return reply({ active: false });
  try { return reply({ active: true, ...await assistRpc(guard.appUser.auth0_sub!, "context", token) }); }
  catch { return reply({ active: false, expired: true }); }
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin || !request.headers.get("content-type")?.startsWith("application/json")) return reply({ error: "Недопустимый источник запроса." }, 403);
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  if (reader) {
    try {
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > 6000) { await reader.cancel(); return reply({ error: "Слишком большой запрос." }, 413); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
  }
  const text = Buffer.concat(chunks).toString("utf8");
  let body: Record<string, unknown>;
  try { body = JSON.parse(text); if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error(); }
  catch { return reply({ error: "Некорректный запрос." }, 400); }
  const jar = await cookies(); const oldToken = jar.get(ASSIST_COOKIE)?.value;
  if (body.action === "stop") {
    let restore: string | null = null;
    const actual = await realAuth0.getSession();
    if (oldToken && actual?.user?.sub) {
      try { restore = (await assistRpc(actual.user.sub, "stop", oldToken)).restoreProfileId; } catch { /* Clearing a local mode must remain possible after role/session revocation. */ }
    }
    const response = reply({ ok: true });
    response.cookies.set(ASSIST_COOKIE, "", { ...assistCookieOptions, maxAge: 0 });
    response.cookies.set(ACTIVE_PROFILE_COOKIE_NAME, restore ?? "", { ...getActiveProfileCookieOptions(), ...(!restore ? { maxAge: 0 } : {}) });
    return response;
  }
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return reply({ error: "Нужен вход администратора." }, guard.status);
  if (body.action !== "lookup" && body.action !== "start") return reply({ error: "Неизвестная операция." }, 400);
  try {
    if (body.action === "lookup") return reply(await assistRpc(guard.appUser.auth0_sub!, "lookup", "", { user: body.user }));
    if (body.fullAccessAcknowledged !== true) return reply({ error: "Подтвердите работу с полными правами пользователя." }, 400);
    let restoreProfileId = jar.get(ACTIVE_PROFILE_COOKIE_NAME)?.value;
    if (oldToken) { try { restoreProfileId = (await assistRpc(guard.appUser.auth0_sub!, "stop", oldToken)).restoreProfileId; } catch { restoreProfileId = undefined; } }
    const token = randomBytes(32).toString("hex");
    const context = await assistRpc(guard.appUser.auth0_sub!, "start", token, { user: body.user, profileId: body.profileId, restoreProfileId });
    const response = reply({ ok: true, ...context });
    response.cookies.set(ASSIST_COOKIE, token, assistCookieOptions);
    response.cookies.set(ACTIVE_PROFILE_COOKIE_NAME, context.initialProfileId, getActiveProfileCookieOptions());
    return response;
  } catch { return reply({ error: "Не удалось начать помощь. Проверьте SQL V2, права администратора и профиль пользователя." }, 409); }
}

import { cookies } from "next/headers";
import { realAuth0 } from "./auth0-real";
import { ASSIST_COOKIE, assistRpc, type AssistContext } from "./assist-full-core";
import type { SessionData } from "@auth0/nextjs-auth0/types";

export async function getFullAssistContext(): Promise<AssistContext | null> {
  const token = (await cookies()).get(ASSIST_COOKIE)?.value;
  if (!token) return null;
  const actual = await realAuth0.getSession();
  if (!actual?.user?.sub) throw new Error("ASSIST_REAL_LOGIN_REQUIRED");
  return await assistRpc(actual.user.sub, "context", token) as AssistContext;
}
async function getEffectiveSession(): Promise<SessionData | null> {
  const actual = await realAuth0.getSession();
  const token = (await cookies()).get(ASSIST_COOKIE)?.value;
  if (!token) return actual;
  if (!actual?.user?.sub) throw new Error("ASSIST_REAL_LOGIN_REQUIRED");
  const context = await assistRpc(actual.user.sub, "context", token) as AssistContext;
  // Never copy administrator claims, access tokens or refresh tokens into the effective session.
  return { user: context.user, tokenSet: { accessToken: "", expiresAt: 0 },
    internal: { sid: "assist:" + context.sessionId, createdAt: 0 } };
}
export const auth0 = { getSession: getEffectiveSession, middleware: realAuth0.middleware.bind(realAuth0) };

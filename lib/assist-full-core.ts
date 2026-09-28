import { createHash } from "node:crypto";
import { supabase } from "./supabase";
export const ASSIST_COOKIE = "arctor_full_assist_v2";
export const ASSIST_HEADER = "x-arctor-assist-context";
export type AssistContext = {
  sessionId: string; adminUserId: string; targetUserId: string; initialProfileId: string; expiresAt: string;
  user: { sub: string; name?: string; email?: string; picture?: string };
};
export function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
export async function assistRpc(sub: string, action: string, token: string, body: Record<string, unknown> = {}) {
  const { data, error } = await supabase.rpc("admin_assist_full_v2", { p_sub: sub, p_action: action, p_token: token ? tokenHash(token) : "", p_body: body });
  if (error) throw new Error("ASSIST_UNAVAILABLE");
  return data;
}
export const assistCookieOptions = {
  httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const,
  path: "/", // Keep the cookie after expiration so an old form can never silently fall back to the administrator.
};

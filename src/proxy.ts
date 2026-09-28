import { NextResponse, type NextRequest } from "next/server";
import { realAuth0 } from "../lib/auth0-real";
import { ASSIST_COOKIE, ASSIST_HEADER, assistRpc, type AssistContext } from "../lib/assist-full-core";
import { ACTIVE_PROFILE_COOKIE_NAME } from "../lib/actor-context";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const token = request.cookies.get(ASSIST_COOKIE)?.value;
  const suppliedContext = request.headers.get(ASSIST_HEADER);
  const control = pathname === "/assist" || pathname === "/api/assist-control";
  const protocol = pathname === "/auth" || pathname.startsWith("/auth/");
  const unsafe = !["GET", "HEAD", "OPTIONS"].includes(request.method);
  const isApi = pathname.startsWith("/api/");
  const failure = () => isApi || unsafe
    ? NextResponse.json({ error: "Контекст помощи изменился или истёк. Откройте /assist и войдите заново.", code: "ASSIST_CONTEXT_INVALID" }, { status: 409, headers: { "Cache-Control": "private, no-store" } })
    : NextResponse.redirect(new URL("/assist", request.url));
  if (!control && !protocol) {
    if (token) {
      try {
        const actual = await realAuth0.getSession(request);
        if (!actual?.user?.sub) return failure();
        const context = await assistRpc(actual.user.sub, "context", token) as AssistContext;
        if (suppliedContext && suppliedContext !== context.sessionId) return failure();
        if (unsafe) {
          if (suppliedContext !== context.sessionId || request.headers.get("origin") !== request.nextUrl.origin) return failure();
          // Durable admission log. This records an attempted request, not a successful data change.
          await assistRpc(actual.user.sub, "request", token, { method: request.method, pathname,
            profileId: request.cookies.get(ACTIVE_PROFILE_COOKIE_NAME)?.value ?? context.initialProfileId });
        }
        // Do not manufacture the target user's online presence or modify their account during automatic synchronization.
        if (pathname === "/api/app/session-heartbeat" || pathname === "/api/sync-user") {
          return NextResponse.json({ ok: true, assistance: true }, { headers: { "Cache-Control": "private, no-store" } });
        }
      } catch { return failure(); }
    } else if (suppliedContext && suppliedContext !== "none") return failure();
  }
  // OAuth always uses the original authenticated administrator, never the effective user.
  const response = await realAuth0.middleware(request);
  if (token || control) response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"] };

import { auth0 } from "../../../../lib/auth0";

export async function GET() {
  const session = await auth0.getSession();

  return Response.json({
    isAuthenticated: Boolean(session?.user),
    user: session?.user ?? null,
  });
}
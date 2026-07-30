import { NextResponse } from "next/server";
import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";

async function getCurrentAppUserId() {
  const session = await auth0.getSession();

  if (!session?.user) {
    return {
      appUserId: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          error: "Not authenticated",
        },
        { status: 401 },
      ),
    };
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("app_users")
    .select("id")
    .eq("auth0_sub", session.user.sub)
    .single();

  if (appUserError || !appUser) {
    return {
      appUserId: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          error: appUserError?.message ?? "App user not found",
        },
        { status: 500 },
      ),
    };
  }

  return {
    appUserId: appUser.id as string,
    errorResponse: null,
  };
}

function parseInteger(
  value: string | null,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(minimum, Math.min(maximum, parsed));
}

export async function GET(request: Request) {
  const { appUserId, errorResponse } = await getCurrentAppUserId();

  if (errorResponse) {
    return errorResponse;
  }

  if (!appUserId) {
    return NextResponse.json(
      {
        ok: false,
        error: "User context not found",
      },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const limit = parseInteger(url.searchParams.get("limit"), 100, 1, 200);
  const offset = parseInteger(url.searchParams.get("offset"), 0, 0, 1_000_000);

  const { data: history, error: historyError } = await supabase.rpc(
    "get_reputation_history_v1",
    {
      p_owner_user_id: appUserId,
      p_limit: limit,
      p_offset: offset,
    },
  );

  if (historyError) {
    return NextResponse.json(
      {
        ok: false,
        error: historyError.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      history: Array.isArray(history) ? history : [],
      limit,
      offset,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

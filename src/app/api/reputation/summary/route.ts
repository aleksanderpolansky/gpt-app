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

export async function GET() {
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

  const { data: summary, error: summaryError } = await supabase.rpc(
    "get_reputation_summary_v1",
    {
      p_owner_user_id: appUserId,
    },
  );

  if (summaryError) {
    return NextResponse.json(
      {
        ok: false,
        error: summaryError.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      summary: summary ?? {
        ownerUserId: appUserId,
        totalReputation: 0,
        accountCount: 0,
        ledgerEntryCount: 0,
        accounts: [],
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

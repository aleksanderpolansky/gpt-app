import { NextResponse } from "next/server";
import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";

async function getCurrentAppUser() {
  const session = await auth0.getSession();

  if (!session?.user) {
    return {
      appUser: null,
      errorResponse: NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      ),
    };
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("app_users")
    .select("*")
    .eq("auth0_sub", session.user.sub)
    .single();

  if (appUserError || !appUser) {
    return {
      appUser: null,
      errorResponse: NextResponse.json(
        { error: appUserError?.message ?? "App user not found" },
        { status: 500 }
      ),
    };
  }

  return {
    appUser,
    errorResponse: null,
  };
}

export async function GET() {
  const { appUser, errorResponse } = await getCurrentAppUser();

  if (errorResponse) {
    return errorResponse;
  }

  if (!appUser) {
    return NextResponse.json(
      { error: "User context not found" },
      { status: 500 }
    );
  }

  const { data: transactions, error: transactionsError } = await supabase
    .from("points_transactions")
    .select(
      `
      *,
      organizations (
        id,
        organization_name,
        organization_type,
        country_code,
        default_currency,
        status
      )
    `
    )
    .eq("user_id", appUser.id)
    .order("created_at", { ascending: false });

  if (transactionsError) {
    return NextResponse.json(
      { error: transactionsError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    transactions,
  });
}
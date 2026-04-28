import { NextResponse } from "next/server";
import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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

function parseOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    return null;
  }

  return trimmedValue;
}

export async function POST(request: Request, context: RouteContext) {
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

  const params = await context.params;
  const purchaseConfirmationId = params.id;

  const body = await request.json().catch(() => ({}));
  const sellerComment = parseOptionalText(body.sellerComment);

  const { data: result, error } = await supabase.rpc(
    "confirm_purchase_and_award_points",
    {
      p_purchase_confirmation_id: purchaseConfirmationId,
      p_confirmed_by_user_id: appUser.id,
      p_seller_comment: sellerComment,
    }
  );

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    result: result?.[0] ?? null,
  });
}
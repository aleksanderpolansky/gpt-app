import { NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";

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

function parseRequiredNumber(value: unknown) {
  const parsedValue = Number(value);

  if (Number.isNaN(parsedValue)) {
    return null;
  }

  return parsedValue;
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

  const { data: purchaseConfirmations, error: purchaseConfirmationsError } =
    await supabase
      .from("purchase_confirmations")
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
      .or(`buyer_user_id.eq.${appUser.id},confirmed_by_user_id.eq.${appUser.id}`)
      .order("created_at", { ascending: false });

  if (purchaseConfirmationsError) {
    return NextResponse.json(
      { error: purchaseConfirmationsError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    purchaseConfirmations,
  });
}

export async function POST(request: Request) {
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

  const body = await request.json();

  const organizationId = parseOptionalText(body.organizationId);
  const purchaseAmount = parseRequiredNumber(body.purchaseAmount);
  const purchaseCurrency = parseOptionalText(body.purchaseCurrency);
  const userComment = parseOptionalText(body.userComment);
  const receiptUrl = parseOptionalText(body.receiptUrl);

  if (!organizationId || purchaseAmount === null || purchaseAmount <= 0) {
    return NextResponse.json(
      { error: "organizationId and positive purchaseAmount are required" },
      { status: 400 }
    );
  }

  const { data: purchaseConfirmationResult, error: purchaseConfirmationError } =
    await supabase.rpc("submit_purchase_confirmation", {
      p_buyer_user_id: appUser.id,
      p_organization_id: organizationId,
      p_purchase_amount: purchaseAmount,
      p_purchase_currency: purchaseCurrency,
      p_user_comment: userComment,
      p_receipt_url: receiptUrl,
    });

  if (purchaseConfirmationError) {
    return NextResponse.json(
      { error: purchaseConfirmationError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    purchaseConfirmation: purchaseConfirmationResult?.[0] ?? null,
  });
}
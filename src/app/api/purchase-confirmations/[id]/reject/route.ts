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

async function checkSellerAccessToPurchaseConfirmation(
  purchaseConfirmationId: string,
  appUserId: string
) {
  const { data: purchaseConfirmation, error: purchaseConfirmationError } =
    await supabase
      .from("purchase_confirmations")
      .select("id, organization_id")
      .eq("id", purchaseConfirmationId)
      .single();

  if (purchaseConfirmationError || !purchaseConfirmation) {
    return {
      hasAccess: false,
      errorResponse: NextResponse.json(
        {
          error:
            purchaseConfirmationError?.message ??
            "Purchase confirmation not found",
        },
        { status: 404 }
      ),
    };
  }

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, created_by_user_id")
    .eq("id", purchaseConfirmation.organization_id)
    .single();

  if (organizationError || !organization) {
    return {
      hasAccess: false,
      errorResponse: NextResponse.json(
        { error: organizationError?.message ?? "Organization not found" },
        { status: 404 }
      ),
    };
  }

  if (organization.created_by_user_id !== appUserId) {
    return {
      hasAccess: false,
      errorResponse: NextResponse.json(
        {
          error:
            "Access denied. Only the organization owner can reject this purchase.",
        },
        { status: 403 }
      ),
    };
  }

  return {
    hasAccess: true,
    errorResponse: null,
  };
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

  const accessCheck = await checkSellerAccessToPurchaseConfirmation(
    purchaseConfirmationId,
    appUser.id
  );

  if (accessCheck.errorResponse) {
    return accessCheck.errorResponse;
  }

  const body = await request.json().catch(() => ({}));
  const sellerComment = parseOptionalText(body.sellerComment);

  const { data: result, error } = await supabase.rpc(
    "reject_purchase_confirmation",
    {
      p_purchase_confirmation_id: purchaseConfirmationId,
      p_rejected_by_user_id: appUser.id,
      p_seller_comment: sellerComment,
    }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    result: result?.[0] ?? null,
  });
}
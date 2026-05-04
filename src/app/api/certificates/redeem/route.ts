import { NextResponse } from "next/server";
import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";

type RedeemCertificateBody = {
  certificateId?: unknown;
  sellerComment?: unknown;
};

type RedeemCertificateResult = {
  certificate_id: string;
  certificate_code: string;
  status: string;
  points_status: string;
  points_charged: number;
  reserved_balance_after: number;
  spent_balance_after: number;
};

async function getCurrentAppUser() {
  const session = await auth0.getSession();

  if (!session?.user) {
    return {
      appUser: null,
      errorResponse: NextResponse.json(
        { ok: false, error: "Not authenticated" },
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
        {
          ok: false,
          error: appUserError?.message ?? "App user not found",
        },
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

function parseRequiredText(value: unknown) {
  return parseOptionalText(value);
}

export async function POST(request: Request) {
  const { appUser, errorResponse } = await getCurrentAppUser();

  if (errorResponse) {
    return errorResponse;
  }

  if (!appUser) {
    return NextResponse.json(
      { ok: false, error: "User context not found" },
      { status: 500 }
    );
  }

  let body: RedeemCertificateBody;

  try {
    body = (await request.json()) as RedeemCertificateBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const certificateId = parseRequiredText(body.certificateId);
  const sellerComment = parseOptionalText(body.sellerComment);

  if (!certificateId) {
    return NextResponse.json(
      { ok: false, error: "certificateId is required" },
      { status: 400 }
    );
  }

  const { data: redeemResult, error: redeemError } = await supabase.rpc(
    "seller_redeem_certificate",
    {
      p_seller_user_id: appUser.id,
      p_certificate_id: certificateId,
      p_seller_comment: sellerComment,
    }
  );

  if (redeemError) {
    return NextResponse.json(
      {
        ok: false,
        error: redeemError.message,
      },
      { status: 400 }
    );
  }

  const redeemedCertificate =
    ((redeemResult as RedeemCertificateResult[] | null) ?? [])[0] ?? null;

  return NextResponse.json({
    ok: true,
    redeemedCertificate,
  });
}
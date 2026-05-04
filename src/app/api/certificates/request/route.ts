import { NextResponse } from "next/server";
import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";

type RequestCertificateBody = {
  offerId?: unknown;
  receiverPersonName?: unknown;
  receiverEmail?: unknown;
  message?: unknown;
};

type RequestCertificateResult = {
  certificate_id: string;
  certificate_code: string;
  status: string;
  points_status: string;
  points_reserved: number;
  available_balance_after: number;
  reserved_balance_after: number;
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
  const parsedValue = parseOptionalText(value);

  if (!parsedValue) {
    return null;
  }

  return parsedValue;
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

  let body: RequestCertificateBody;

  try {
    body = (await request.json()) as RequestCertificateBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const offerId = parseRequiredText(body.offerId);
  const receiverPersonName = parseOptionalText(body.receiverPersonName);
  const receiverEmail = parseOptionalText(body.receiverEmail);
  const message = parseOptionalText(body.message);

  if (!offerId) {
    return NextResponse.json(
      { ok: false, error: "offerId is required" },
      { status: 400 }
    );
  }

  const { data: requestResult, error: requestError } = await supabase.rpc(
    "request_certificate_from_offer",
    {
      p_buyer_user_id: appUser.id,
      p_offer_id: offerId,
      p_receiver_person_name: receiverPersonName,
      p_receiver_email: receiverEmail,
      p_message: message,
    }
  );

  if (requestError) {
    return NextResponse.json(
      {
        ok: false,
        error: requestError.message,
      },
      { status: 400 }
    );
  }

  const certificateRequest =
    ((requestResult as RequestCertificateResult[] | null) ?? [])[0] ?? null;

  return NextResponse.json({
    ok: true,
    certificateRequest,
  });
}
import { NextResponse } from "next/server";
import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";

type AppUser = {
  id: string;
  auth0_sub: string;
  email?: string | null;
  name?: string | null;
};

type RelatedOrganization = {
  id: string;
  created_by_user_id: string | null;
  organization_name?: string | null;
};

type PurchaseConfirmationAccessRecord = {
  id: string;
  organization_id: string;
  buyer_user_id: string;
  organizations?: RelatedOrganization | RelatedOrganization[] | null;
};

type PurchaseConfirmationEvent = {
  id: string;
  purchase_confirmation_id: string;
  organization_id: string;
  buyer_user_id: string;
  actor_user_id: string | null;
  event_type: string;
  status_before: string | null;
  status_after: string;
  purchase_amount: number | null;
  purchase_currency: string | null;
  points_awarded: number | null;
  buyer_public_code: string | null;
  user_comment: string | null;
  seller_comment: string | null;
  previous_hash: string | null;
  record_hash: string | null;
  created_at: string;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getFirstRelatedItem<T>(value: T | T[] | null | undefined) {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

async function getCurrentAppUser(): Promise<{
  appUser: AppUser | null;
  errorResponse: NextResponse | null;
}> {
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
    appUser: appUser as AppUser,
    errorResponse: null,
  };
}

function isValidId(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

export async function GET(_request: Request, context: RouteContext) {
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

  const resolvedParams = await context.params;
  const purchaseConfirmationId = resolvedParams.id;

  if (!isValidId(purchaseConfirmationId)) {
    return NextResponse.json(
      { ok: false, error: "Purchase confirmation id is required" },
      { status: 400 }
    );
  }

  const {
    data: purchaseConfirmation,
    error: purchaseConfirmationError,
  } = await supabase
    .from("purchase_confirmations")
    .select(
      `
      id,
      organization_id,
      buyer_user_id,
      organizations (
        id,
        created_by_user_id,
        organization_name
      )
    `
    )
    .eq("id", purchaseConfirmationId)
    .single();

  if (purchaseConfirmationError || !purchaseConfirmation) {
    return NextResponse.json(
      {
        ok: false,
        error:
          purchaseConfirmationError?.message ??
          "Purchase confirmation not found",
      },
      { status: 404 }
    );
  }

  const accessRecord =
    purchaseConfirmation as unknown as PurchaseConfirmationAccessRecord;

  const relatedOrganization = getFirstRelatedItem(accessRecord.organizations);

  const isBuyer = accessRecord.buyer_user_id === appUser.id;
  const isSeller =
    relatedOrganization?.created_by_user_id === appUser.id &&
    accessRecord.organization_id === relatedOrganization.id;

  if (!isBuyer && !isSeller) {
    return NextResponse.json(
      {
        ok: false,
        error: "Access denied",
      },
      { status: 403 }
    );
  }

  const { data: events, error: eventsError } = await supabase
    .from("purchase_confirmation_events")
    .select(
      `
      id,
      purchase_confirmation_id,
      organization_id,
      buyer_user_id,
      actor_user_id,
      event_type,
      status_before,
      status_after,
      purchase_amount,
      purchase_currency,
      points_awarded,
      buyer_public_code,
      user_comment,
      seller_comment,
      previous_hash,
      record_hash,
      created_at
    `
    )
    .eq("purchase_confirmation_id", purchaseConfirmationId)
    .order("created_at", { ascending: true });

  if (eventsError) {
    return NextResponse.json(
      {
        ok: false,
        error: eventsError.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    purchaseConfirmation: {
      id: accessRecord.id,
      organizationId: accessRecord.organization_id,
      buyerUserId: accessRecord.buyer_user_id,
      organizationName: relatedOrganization?.organization_name ?? null,
      accessRole: isSeller ? "seller" : "buyer",
    },
    events: (events as PurchaseConfirmationEvent[] | null) ?? [],
  });
}
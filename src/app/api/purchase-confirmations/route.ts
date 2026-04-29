import { NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";

type OrganizationMinimumThreshold = {
  currency: string;
  amount: number;
};

const MINIMUM_PURCHASE_THRESHOLDS: Record<string, OrganizationMinimumThreshold> =
  {
    EUR: {
      currency: "EUR",
      amount: 10,
    },
    PLN: {
      currency: "PLN",
      amount: 45,
    },
    USD: {
      currency: "USD",
      amount: 11,
    },
    GBP: {
      currency: "GBP",
      amount: 9,
    },
    UAH: {
      currency: "UAH",
      amount: 450,
    },
    CZK: {
      currency: "CZK",
      amount: 250,
    },
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

function parseRequiredNumber(value: unknown) {
  const parsedValue = Number(value);

  if (Number.isNaN(parsedValue)) {
    return null;
  }

  return parsedValue;
}

function normalizeCurrency(value: string | null) {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim().toUpperCase();

  if (normalizedValue.length === 0) {
    return null;
  }

  return normalizedValue;
}

function getMinimumPurchaseThreshold(currency: string | null) {
  if (!currency) {
    return null;
  }

  return MINIMUM_PURCHASE_THRESHOLDS[currency] ?? null;
}

function createMinimumPurchaseErrorMessage(
  threshold: OrganizationMinimumThreshold | null
) {
  if (!threshold) {
    return "Заявка не создана. Для этого предприятия пока не задан минимальный порог начисления points: в настройках предприятия не указана страна или валюта.";
  }

  return `Заявка не создана. Для начисления 10 points сумма покупки должна быть больше ${threshold.amount} ${threshold.currency}.`;
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

  const { data: sellerOrganizations, error: sellerOrganizationsError } =
    await supabase
      .from("organizations")
      .select("id")
      .eq("created_by_user_id", appUser.id);

  if (sellerOrganizationsError) {
    return NextResponse.json(
      { error: sellerOrganizationsError.message },
      { status: 500 }
    );
  }

  const sellerOrganizationIds =
    sellerOrganizations?.map((organization) => organization.id) ?? [];

  if (sellerOrganizationIds.length === 0) {
    return NextResponse.json({
      ok: true,
      purchaseConfirmations: [],
    });
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
      .in("organization_id", sellerOrganizationIds)
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
  const purchaseCurrencyFromRequest = normalizeCurrency(
    parseOptionalText(body.purchaseCurrency)
  );
  const userComment = parseOptionalText(body.userComment);
  const receiptUrl = parseOptionalText(body.receiptUrl);

  if (!organizationId || purchaseAmount === null || purchaseAmount <= 0) {
    return NextResponse.json(
      { error: "organizationId and positive purchaseAmount are required" },
      { status: 400 }
    );
  }

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, country_code, default_currency")
    .eq("id", organizationId)
    .single();

  if (organizationError || !organization) {
    return NextResponse.json(
      { error: organizationError?.message ?? "Organization not found" },
      { status: 500 }
    );
  }

  const effectivePurchaseCurrency =
    purchaseCurrencyFromRequest ??
    normalizeCurrency(organization.default_currency ?? null);

  const minimumThreshold = getMinimumPurchaseThreshold(
    effectivePurchaseCurrency
  );

  if (!minimumThreshold) {
    return NextResponse.json(
      {
        error: createMinimumPurchaseErrorMessage(null),
      },
      { status: 400 }
    );
  }

  if (purchaseAmount <= minimumThreshold.amount) {
    return NextResponse.json(
      {
        error: createMinimumPurchaseErrorMessage(minimumThreshold),
      },
      { status: 400 }
    );
  }

  const { data: purchaseConfirmationResult, error: purchaseConfirmationError } =
    await supabase.rpc("submit_purchase_confirmation", {
      p_buyer_user_id: appUser.id,
      p_organization_id: organizationId,
      p_purchase_amount: purchaseAmount,
      p_purchase_currency: effectivePurchaseCurrency,
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
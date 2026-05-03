import { auth0 } from "../../../lib/auth0";
import { supabase } from "../../../lib/supabase";
import SellerPurchaseConfirmationsClient from "./SellerPurchaseConfirmationsClient";

export const dynamic = "force-dynamic";

type Organization = {
  id: string;
  organization_name: string | null;
  organization_type: string | null;
  country_code: string | null;
  default_currency: string | null;
  status: string | null;
};

type PurchaseConfirmation = {
  id: string;
  organization_id: string;
  buyer_user_id: string;
  buyer_public_code: string | null;
  confirmed_by_user_id: string | null;
  purchase_amount: number;
  purchase_currency: string | null;
  user_comment: string | null;
  seller_comment: string | null;
  receipt_url: string | null;
  points_awarded: number | null;
  status: string;
  requested_at: string | null;
  confirmed_at: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;
  last_decision_at: string | null;
  created_at: string;
  updated_at: string | null;
  organizations?: Organization | Organization[] | null;
};

type AppUser = {
  id: string;
  auth0_sub: string;
  email?: string | null;
  name?: string | null;
};

type PageData = {
  purchaseConfirmations: PurchaseConfirmation[];
  errorMessage: string | null;
};

type PurchaseConfirmationsPageProps = {
  searchParams?: Promise<{
    organizationId?: string | string[];
  }>;
};

async function getCurrentAppUser(): Promise<{
  appUser: AppUser | null;
  errorMessage: string | null;
}> {
  const session = await auth0.getSession();

  if (!session?.user) {
    return {
      appUser: null,
      errorMessage: "Not authenticated",
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
      errorMessage: appUserError?.message ?? "App user not found",
    };
  }

  return {
    appUser: appUser as AppUser,
    errorMessage: null,
  };
}

async function getSellerPurchaseConfirmations(): Promise<PageData> {
  const { appUser, errorMessage } = await getCurrentAppUser();

  if (errorMessage) {
    return {
      purchaseConfirmations: [],
      errorMessage,
    };
  }

  if (!appUser) {
    return {
      purchaseConfirmations: [],
      errorMessage: "User context not found",
    };
  }

  const { data: sellerOrganizations, error: sellerOrganizationsError } =
    await supabase
      .from("organizations")
      .select("id")
      .eq("created_by_user_id", appUser.id);

  if (sellerOrganizationsError) {
    return {
      purchaseConfirmations: [],
      errorMessage: sellerOrganizationsError.message,
    };
  }

  const sellerOrganizationIds =
    sellerOrganizations?.map((organization) => organization.id) ?? [];

  if (sellerOrganizationIds.length === 0) {
    return {
      purchaseConfirmations: [],
      errorMessage: null,
    };
  }

  const { data: purchaseConfirmations, error: purchaseConfirmationsError } =
    await supabase
      .from("purchase_confirmations")
      .select(
        `
        id,
        organization_id,
        buyer_user_id,
        buyer_public_code,
        confirmed_by_user_id,
        purchase_amount,
        purchase_currency,
        user_comment,
        seller_comment,
        receipt_url,
        points_awarded,
        status,
        requested_at,
        confirmed_at,
        rejected_at,
        cancelled_at,
        last_decision_at,
        created_at,
        updated_at,
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
    return {
      purchaseConfirmations: [],
      errorMessage: purchaseConfirmationsError.message,
    };
  }

  return {
    purchaseConfirmations:
      (purchaseConfirmations as unknown as PurchaseConfirmation[] | null) ?? [],
    errorMessage: null,
  };
}

function getOrganizationIdFilter(
  resolvedSearchParams:
    | {
        organizationId?: string | string[];
      }
    | undefined
) {
  const rawValue = resolvedSearchParams?.organizationId;

  if (Array.isArray(rawValue)) {
    return rawValue[0] ?? null;
  }

  return rawValue ?? null;
}

export default async function PurchaseConfirmationsPage({
  searchParams,
}: PurchaseConfirmationsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const organizationIdFilter = getOrganizationIdFilter(resolvedSearchParams);

  const { purchaseConfirmations, errorMessage } =
    await getSellerPurchaseConfirmations();

  return (
    <SellerPurchaseConfirmationsClient
      initialPurchaseConfirmations={purchaseConfirmations}
      initialOrganizationIdFilter={organizationIdFilter}
      initialErrorMessage={errorMessage}
    />
  );
}
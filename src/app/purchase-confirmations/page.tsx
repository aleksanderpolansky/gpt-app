import type { Metadata } from "next";

import { auth0 } from "../../../lib/auth0";
import { supabase } from "../../../lib/supabase";
import SellerPurchaseConfirmationsClient from "./SellerPurchaseConfirmationsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Purchase confirmations | ARCTor.app",
  description:
    "Seller purchase confirmation queue for buyer purchase requests, review status, POINTS impact, confirm and reject actions.",
};

type AppUser = {
  id: string;
  auth0_sub: string;
};

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

type SearchParamsInput = Record<string, string | string[] | undefined>;

type PurchaseConfirmationsPageProps = {
  searchParams?: Promise<SearchParamsInput>;
};

type PageData = {
  purchaseConfirmations: PurchaseConfirmation[];
  initialOrganizationIdFilter: string | null;
  errorMessage: string | null;
};

function getSearchParamValue(
  searchParams: SearchParamsInput,
  key: string,
): string | undefined {
  const value = searchParams[key];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

async function getCurrentAppUser(): Promise<{
  appUser: AppUser | null;
  errorMessage: string | null;
}> {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return {
      appUser: null,
      errorMessage: "Not authenticated",
    };
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("app_users")
    .select("id, auth0_sub")
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

async function getSellerPurchaseConfirmations(
  requestedOrganizationIdFilter: string | null,
): Promise<PageData> {
  const { appUser, errorMessage } = await getCurrentAppUser();

  if (errorMessage) {
    return {
      purchaseConfirmations: [],
      initialOrganizationIdFilter: null,
      errorMessage,
    };
  }

  if (!appUser) {
    return {
      purchaseConfirmations: [],
      initialOrganizationIdFilter: null,
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
      initialOrganizationIdFilter: null,
      errorMessage: sellerOrganizationsError.message,
    };
  }

  const sellerOrganizationIds =
    sellerOrganizations?.map((organization) => organization.id) ?? [];

  if (sellerOrganizationIds.length === 0) {
    return {
      purchaseConfirmations: [],
      initialOrganizationIdFilter: null,
      errorMessage: null,
    };
  }

  const safeOrganizationIdFilter =
    requestedOrganizationIdFilter &&
    sellerOrganizationIds.includes(requestedOrganizationIdFilter)
      ? requestedOrganizationIdFilter
      : null;

  const queryOrganizationIds = safeOrganizationIdFilter
    ? [safeOrganizationIdFilter]
    : sellerOrganizationIds;

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
      `,
      )
      .in("organization_id", queryOrganizationIds)
      .order("created_at", { ascending: false });

  if (purchaseConfirmationsError) {
    return {
      purchaseConfirmations: [],
      initialOrganizationIdFilter: safeOrganizationIdFilter,
      errorMessage: purchaseConfirmationsError.message,
    };
  }

  return {
    purchaseConfirmations:
      (purchaseConfirmations as PurchaseConfirmation[] | null) ?? [],
    initialOrganizationIdFilter: safeOrganizationIdFilter,
    errorMessage: null,
  };
}

export default async function PurchaseConfirmationsPage({
  searchParams,
}: PurchaseConfirmationsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const selectedLocale =
    getSearchParamValue(resolvedSearchParams, "locale") ??
    getSearchParamValue(resolvedSearchParams, "lang") ??
    "en";
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const requestedOrganizationIdFilter =
    getSearchParamValue(resolvedSearchParams, "organizationId") ??
    getSearchParamValue(resolvedSearchParams, "organization");

  const {
    purchaseConfirmations,
    initialOrganizationIdFilter,
    errorMessage,
  } = await getSellerPurchaseConfirmations(
    requestedOrganizationIdFilter ?? null,
  );

  return (
    <SellerPurchaseConfirmationsClient
      initialPurchaseConfirmations={purchaseConfirmations}
      initialOrganizationIdFilter={initialOrganizationIdFilter}
      initialErrorMessage={errorMessage}
      initialLocale={selectedLocale}
      initialCurrentMonthKey={currentMonthKey}
    />
  );
}

import { NextResponse } from "next/server";

import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

type AppUserRow = {
  id: string;
  auth0_sub: string;
};

type OrganizationRow = {
  id: string;
  organization_name: string;
  created_by_user_id: string | null;
};

type VisibilityUpdate = {
  status?: string;
  directory_status?: string;
  is_public_profile_enabled?: boolean;
  is_listed_in_directory?: boolean;
  updated_at: string;
};

async function getCurrentAppUser(): Promise<{
  appUser: AppUserRow | null;
  errorResponse: NextResponse | null;
}> {
  const session = await auth0.getSession();

  if (!session?.user) {
    return {
      appUser: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          error: "Not authenticated",
        },
        { status: 401 }
      ),
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
    appUser: appUser as AppUserRow,
    errorResponse: null,
  };
}

async function getOwnedOrganization(input: {
  organizationId: string;
  appUserId: string;
}): Promise<{
  organization: OrganizationRow | null;
  errorResponse: NextResponse | null;
}> {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, organization_name, created_by_user_id")
    .eq("id", input.organizationId)
    .limit(1);

  if (error) {
    return {
      organization: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 }
      ),
    };
  }

  const rows = (data as OrganizationRow[] | null) ?? [];
  const organization = rows[0] ?? null;

  if (!organization) {
    return {
      organization: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          error: "Organization not found.",
        },
        { status: 404 }
      ),
    };
  }

  if (organization.created_by_user_id !== input.appUserId) {
    return {
      organization: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          error: "Only the organization owner can update visibility.",
        },
        { status: 403 }
      ),
    };
  }

  return {
    organization,
    errorResponse: null,
  };
}

async function tryUpdateVisibility(input: {
  organizationId: string;
  appUserId: string;
  update: VisibilityUpdate;
}) {
  const { data, error } = await supabase
    .from("organizations")
    .update(input.update)
    .eq("id", input.organizationId)
    .eq("created_by_user_id", input.appUserId)
    .select(
      "id, organization_name, status, directory_status, is_public_profile_enabled, is_listed_in_directory, updated_at"
    )
    .limit(1);

  if (error) {
    return {
      ok: false,
      error,
      organization: null,
    };
  }

  const rows = (data as unknown[] | null) ?? [];

  return {
    ok: rows.length > 0,
    error: null,
    organization: rows[0] ?? null,
  };
}

export async function PATCH(_request: Request, { params }: RouteProps) {
  const resolvedParams = await params;
  const organizationId = resolvedParams.id;

  const { appUser, errorResponse } = await getCurrentAppUser();

  if (errorResponse) {
    return errorResponse;
  }

  if (!appUser) {
    return NextResponse.json(
      {
        ok: false,
        error: "App user not found",
      },
      { status: 500 }
    );
  }

  const { errorResponse: ownershipError } = await getOwnedOrganization({
    organizationId,
    appUserId: appUser.id,
  });

  if (ownershipError) {
    return ownershipError;
  }

  const hiddenAt = new Date().toISOString();

  const updateAttempts: VisibilityUpdate[] = [
    {
      status: "archived",
      directory_status: "hidden",
      is_public_profile_enabled: false,
      is_listed_in_directory: false,
      updated_at: hiddenAt,
    },
    {
      directory_status: "hidden",
      is_public_profile_enabled: false,
      is_listed_in_directory: false,
      updated_at: hiddenAt,
    },
    {
      is_public_profile_enabled: false,
      is_listed_in_directory: false,
      updated_at: hiddenAt,
    },
  ];

  const errors: string[] = [];

  for (const update of updateAttempts) {
    const result = await tryUpdateVisibility({
      organizationId,
      appUserId: appUser.id,
      update,
    });

    if (result.ok) {
      return NextResponse.json({
        ok: true,
        organization: result.organization,
        appliedUpdate: Object.keys(update),
      });
    }

    if (result.error) {
      errors.push(result.error.message);
    }
  }

  return NextResponse.json(
    {
      ok: false,
      error:
        errors[0] ??
        "Organization visibility could not be changed. No matching row was updated.",
      attemptedFallbacks: errors,
    },
    { status: 500 }
  );
}

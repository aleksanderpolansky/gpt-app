import { NextResponse } from "next/server";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

type OrganizationRow = {
  id: string;
  organization_name: string;
  owner_actor_id: string | null;
};

type VisibilityUpdate = {
  status?: string;
  directory_status?: string;
  is_public_profile_enabled?: boolean;
  is_listed_in_directory?: boolean;
  updated_at: string;
};

async function getCurrentActorContext() {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return {
      actorContext: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          error: "Not authenticated",
        },
        { status: 401 },
      ),
    };
  }

  try {
    return {
      actorContext: await resolveActiveActorContext(session.user.sub),
      errorResponse: null,
    };
  } catch (error) {
    if (error instanceof ActorContextError) {
      return {
        actorContext: null,
        errorResponse: NextResponse.json(
          {
            ok: false,
            error: error.code,
            errorMessage: error.message,
          },
          { status: error.status },
        ),
      };
    }

    return {
      actorContext: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Could not resolve active actor context",
        },
        { status: 500 },
      ),
    };
  }
}

async function getOwnedOrganization(input: {
  organizationId: string;
  actorId: string;
}): Promise<{
  organization: OrganizationRow | null;
  errorResponse: NextResponse | null;
}> {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, organization_name, owner_actor_id")
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
        { status: 500 },
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
        { status: 404 },
      ),
    };
  }

  if (organization.owner_actor_id !== input.actorId) {
    return {
      organization: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          error: "Only the active organization owner can update visibility.",
        },
        { status: 403 },
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
  actorId: string;
  update: VisibilityUpdate;
}) {
  const { data, error } = await supabase
    .from("organizations")
    .update(input.update)
    .eq("id", input.organizationId)
    .eq("owner_actor_id", input.actorId)
    .select(
      "id, organization_name, status, directory_status, is_public_profile_enabled, is_listed_in_directory, updated_at",
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

  const { actorContext, errorResponse } = await getCurrentActorContext();

  if (errorResponse) {
    return errorResponse;
  }

  if (!actorContext) {
    return NextResponse.json(
      {
        ok: false,
        error: "Actor context not found",
      },
      { status: 500 },
    );
  }

  const { errorResponse: ownershipError } = await getOwnedOrganization({
    organizationId,
    actorId: actorContext.actorId,
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
      actorId: actorContext.actorId,
      update,
    });

    if (result.ok) {
      return NextResponse.json({
        ok: true,
        organization: result.organization,
        actingAs: {
          actorId: actorContext.actorId,
          actorType: actorContext.actorType,
          profileId: actorContext.profile.profileId,
        },
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
    { status: 500 },
  );
}

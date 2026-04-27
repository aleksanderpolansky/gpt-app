import { NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";

async function getCurrentUserContext() {
  const session = await auth0.getSession();

  if (!session?.user) {
    return {
      appUser: null,
      person: null,
      personActor: null,
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

  if (appUserError) {
    return {
      appUser: null,
      person: null,
      personActor: null,
      errorResponse: NextResponse.json(
        { error: appUserError.message },
        { status: 500 }
      ),
    };
  }

  const { data: person, error: personError } = await supabase
    .from("persons")
    .select("*")
    .eq("user_id", appUser.id)
    .single();

  if (personError) {
    return {
      appUser: null,
      person: null,
      personActor: null,
      errorResponse: NextResponse.json(
        { error: personError.message },
        { status: 500 }
      ),
    };
  }

  const { data: personActor, error: personActorError } = await supabase
    .from("actors")
    .select("*")
    .eq("person_id", person.id)
    .eq("actor_type", "person")
    .single();

  if (personActorError) {
    return {
      appUser: null,
      person: null,
      personActor: null,
      errorResponse: NextResponse.json(
        { error: personActorError.message },
        { status: 500 }
      ),
    };
  }

  return {
    appUser,
    person,
    personActor,
    errorResponse: null,
  };
}

async function verifyOrganizationAccess(
  appUserId: string,
  organizationId: string
) {
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, organization_name, organization_type, status, created_by_user_id")
    .eq("id", organizationId)
    .eq("created_by_user_id", appUserId)
    .single();

  if (organizationError || !organization) {
    return {
      organization: null,
      errorResponse: NextResponse.json(
        { error: "Organization not found or access denied" },
        { status: 403 }
      ),
    };
  }

  return {
    organization,
    errorResponse: null,
  };
}

export async function GET() {
  const { personActor, errorResponse } = await getCurrentUserContext();

  if (errorResponse) {
    return errorResponse;
  }

  if (!personActor) {
    return NextResponse.json(
      { error: "User context not found" },
      { status: 500 }
    );
  }

  const { data: valueObjects, error: valueObjectsError } = await supabase
    .from("value_objects")
    .select(
      `
      *,
      organizations (
        id,
        organization_name,
        organization_type,
        status
      )
    `
    )
    .eq("owner_actor_id", personActor.id)
    .order("created_at", { ascending: false });

  if (valueObjectsError) {
    return NextResponse.json(
      { error: valueObjectsError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    valueObjects,
  });
}

export async function POST(request: Request) {
  const { appUser, personActor, errorResponse } = await getCurrentUserContext();

  if (errorResponse) {
    return errorResponse;
  }

  if (!appUser || !personActor) {
    return NextResponse.json(
      { error: "User context not found" },
      { status: 500 }
    );
  }

  const body = await request.json();

  const organizationId = body.organizationId;
  const valueType = body.valueType;
  const title = body.title;
  const description = body.description ?? null;
  const unitType = body.unitType ?? null;
  const defaultPrice = body.defaultPrice === "" ? null : body.defaultPrice ?? null;
  const defaultCurrency = body.defaultCurrency ?? null;
  const defaultDurationMinutes =
    body.defaultDurationMinutes === ""
      ? null
      : body.defaultDurationMinutes ?? null;
  const isMarketplaceSellable = body.isMarketplaceSellable ?? false;
  const isFreePossible = body.isFreePossible ?? false;

  if (!organizationId || !valueType || !title) {
    return NextResponse.json(
      { error: "organizationId, valueType and title are required" },
      { status: 400 }
    );
  }

  const { organization, errorResponse: organizationAccessErrorResponse } =
    await verifyOrganizationAccess(appUser.id, organizationId);

  if (organizationAccessErrorResponse) {
    return organizationAccessErrorResponse;
  }

  if (!organization) {
    return NextResponse.json(
      { error: "Organization context not found" },
      { status: 500 }
    );
  }

  const { data: valueObject, error: valueObjectError } = await supabase
    .from("value_objects")
    .insert({
      owner_actor_id: personActor.id,
      organization_id: organization.id,
      value_type: valueType,
      title,
      description,
      unit_type: unitType,
      default_price: defaultPrice,
      default_currency: defaultCurrency,
      default_duration_minutes: defaultDurationMinutes,
      is_marketplace_sellable: isMarketplaceSellable,
      is_free_possible: isFreePossible,
      status: "active",
    })
    .select(
      `
      *,
      organizations (
        id,
        organization_name,
        organization_type,
        status
      )
    `
    )
    .single();

  if (valueObjectError) {
    return NextResponse.json(
      { error: valueObjectError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    valueObject,
  });
}
import { NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";

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

  if (appUserError) {
    return {
      appUser: null,
      errorResponse: NextResponse.json(
        { error: appUserError.message },
        { status: 500 }
      ),
    };
  }

  return {
    appUser,
    errorResponse: null,
  };
}

export async function GET() {
  const { appUser, errorResponse } = await getCurrentAppUser();

  if (errorResponse) {
    return errorResponse;
  }

  if (!appUser) {
    return NextResponse.json(
      { error: "App user not found" },
      { status: 500 }
    );
  }

  const { data: organizations, error: organizationsError } = await supabase
    .from("organizations")
    .select("*")
    .eq("created_by_user_id", appUser.id)
    .order("created_at", { ascending: false });

  if (organizationsError) {
    return NextResponse.json(
      { error: organizationsError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    organizations,
  });
}

export async function POST(request: Request) {
  const session = await auth0.getSession();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  const body = await request.json();

  const organizationName = body.organizationName;
  const organizationType = body.organizationType;
  const description = body.description ?? null;

  if (!organizationName || !organizationType) {
    return NextResponse.json(
      { error: "organizationName and organizationType are required" },
      { status: 400 }
    );
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("app_users")
    .select("*")
    .eq("auth0_sub", session.user.sub)
    .single();

  if (appUserError) {
    return NextResponse.json(
      { error: appUserError.message },
      { status: 500 }
    );
  }

  const { data: person, error: personError } = await supabase
    .from("persons")
    .select("*")
    .eq("user_id", appUser.id)
    .single();

  if (personError) {
    return NextResponse.json(
      { error: personError.message },
      { status: 500 }
    );
  }

  const { data: personActor, error: personActorError } = await supabase
    .from("actors")
    .select("*")
    .eq("person_id", person.id)
    .eq("actor_type", "person")
    .single();

  if (personActorError) {
    return NextResponse.json(
      { error: personActorError.message },
      { status: 500 }
    );
  }

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .insert({
      created_by_user_id: appUser.id,
      organization_name: organizationName,
      organization_type: organizationType,
      owner_person_id: person.id,
      description,
      status: "active",
    })
    .select()
    .single();

  if (organizationError) {
    return NextResponse.json(
      { error: organizationError.message },
      { status: 500 }
    );
  }

  const { data: organizationActor, error: organizationActorError } =
    await supabase
      .from("actors")
      .insert({
        actor_type: "organization",
        organization_id: organization.id,
        display_name: organization.organization_name,
        status: "active",
      })
      .select()
      .single();

  if (organizationActorError) {
    return NextResponse.json(
      { error: organizationActorError.message },
      { status: 500 }
    );
  }

  const { data: businessSpace, error: businessSpaceError } = await supabase
    .from("spaces")
    .insert({
      owner_user_id: appUser.id,
      space_type: "own_business",
      title: organization.organization_name,
      description: `Business space for ${organization.organization_name}`,
      status: "active",
    })
    .select()
    .single();

  if (businessSpaceError) {
    return NextResponse.json(
      { error: businessSpaceError.message },
      { status: 500 }
    );
  }

  const { data: ownerRole, error: ownerRoleError } = await supabase
    .from("actor_space_roles")
    .insert({
      actor_id: personActor.id,
      space_id: businessSpace.id,
      function_type: "owner",
      title: "Owner",
      is_active: true,
      authority_level: 100,
      responsibility_level: 100,
    })
    .select()
    .single();

  if (ownerRoleError) {
    return NextResponse.json(
      { error: ownerRoleError.message },
      { status: 500 }
    );
  }

  const { data: managerRole, error: managerRoleError } = await supabase
    .from("actor_space_roles")
    .insert({
      actor_id: personActor.id,
      space_id: businessSpace.id,
      function_type: "manager",
      title: "Manager",
      is_active: true,
      authority_level: 90,
      responsibility_level: 90,
    })
    .select()
    .single();

  if (managerRoleError) {
    return NextResponse.json(
      { error: managerRoleError.message },
      { status: 500 }
    );
  }

  const { data: sellerRole, error: sellerRoleError } = await supabase
    .from("actor_space_roles")
    .insert({
      actor_id: organizationActor.id,
      space_id: businessSpace.id,
      function_type: "seller",
      title: "Seller / Provider",
      is_active: true,
      authority_level: 100,
      responsibility_level: 100,
    })
    .select()
    .single();

  if (sellerRoleError) {
    return NextResponse.json(
      { error: sellerRoleError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    organization,
    organizationActor,
    businessSpace,
    roles: {
      owner: ownerRole,
      manager: managerRole,
      seller: sellerRole,
    },
  });
}
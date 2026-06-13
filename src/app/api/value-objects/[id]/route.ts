import { NextResponse } from "next/server";
import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type AppUserRow = {
  id: string;
  auth0_sub?: string | null;
};

type PersonRow = {
  id: string;
  user_id?: string | null;
};

type ActorRow = {
  id: string;
  person_id?: string | null;
  actor_type?: string | null;
};

type ValueObjectRow = {
  id: string;
  owner_actor_id?: string | null;
  created_by_actor_id?: string | null;
  actor_id?: string | null;
  app_user_id?: string | null;
  owner_user_id?: string | null;
  organization_id?: string | null;
  usage_scope?: string | null;
  value_type?: string | null;
  title?: string | null;
  description?: string | null;
  unit_type?: string | null;
  default_price?: number | null;
  default_currency?: string | null;
  default_duration_minutes?: number | null;
  is_marketplace_sellable?: boolean | null;
  is_free_possible?: boolean | null;
  commercial_usage?: string | null;
  visibility?: string | null;
  source?: string | null;
  status?: string | null;
  organizations?: {
    id: string;
    organization_name?: string | null;
    organization_type?: string | null;
    status?: string | null;
  } | null;
};

type CurrentUserContext =
  | {
      appUser: AppUserRow;
      person: PersonRow;
      personActor: ActorRow;
      errorResponse: null;
    }
  | {
      appUser: null;
      person: null;
      personActor: null;
      errorResponse: NextResponse;
    };

type ValueObjectRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function normalizeValueObjectId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed || trimmed.length > 200) {
    return null;
  }

  return trimmed;
}

function isValueObjectOwnedByCurrentActor(
  valueObject: ValueObjectRow,
  appUser: AppUserRow,
  personActor: ActorRow,
) {
  const currentActorIds = new Set(
    [personActor.id].filter((value): value is string => Boolean(value)),
  );

  const currentUserIds = new Set(
    [appUser.id].filter((value): value is string => Boolean(value)),
  );

  const valueObjectActorIds = [
    valueObject.owner_actor_id,
    valueObject.created_by_actor_id,
    valueObject.actor_id,
  ].filter((value): value is string => Boolean(value));

  const valueObjectUserIds = [
    valueObject.app_user_id,
    valueObject.owner_user_id,
  ].filter((value): value is string => Boolean(value));

  const actorMatches = valueObjectActorIds.some((actorId) =>
    currentActorIds.has(actorId),
  );

  const userMatches = valueObjectUserIds.some((userId) =>
    currentUserIds.has(userId),
  );

  return actorMatches || userMatches;
}

async function getCurrentUserContext(): Promise<CurrentUserContext> {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return {
      appUser: null,
      person: null,
      personActor: null,
      errorResponse: NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 },
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
      person: null,
      personActor: null,
      errorResponse: NextResponse.json(
        { error: appUserError?.message ?? "App user not found" },
        { status: 500 },
      ),
    };
  }

  const { data: person, error: personError } = await supabase
    .from("persons")
    .select("id, user_id")
    .eq("user_id", appUser.id)
    .single();

  if (personError || !person) {
    return {
      appUser: null,
      person: null,
      personActor: null,
      errorResponse: NextResponse.json(
        { error: personError?.message ?? "Person not found" },
        { status: 500 },
      ),
    };
  }

  const { data: personActor, error: personActorError } = await supabase
    .from("actors")
    .select("id, person_id, actor_type")
    .eq("person_id", person.id)
    .eq("actor_type", "person")
    .single();

  if (personActorError || !personActor) {
    return {
      appUser: null,
      person: null,
      personActor: null,
      errorResponse: NextResponse.json(
        { error: personActorError?.message ?? "Person actor not found" },
        { status: 500 },
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

export async function GET(_request: Request, context: ValueObjectRouteContext) {
  const { id: rawId } = await context.params;
  const valueObjectId = normalizeValueObjectId(rawId);

  if (!valueObjectId) {
    return NextResponse.json(
      { error: "Valid Value Object id is required" },
      { status: 400 },
    );
  }

  const { appUser, personActor, errorResponse } =
    await getCurrentUserContext();

  if (errorResponse) {
    return errorResponse;
  }

  const { data: valueObjectData, error: valueObjectError } = await supabase
    .from("value_objects")
    .select(
      `
      id,
      owner_actor_id,
      created_by_actor_id,
      actor_id,
      app_user_id,
      owner_user_id,
      organization_id,
      usage_scope,
      value_type,
      title,
      description,
      unit_type,
      default_price,
      default_currency,
      default_duration_minutes,
      is_marketplace_sellable,
      is_free_possible,
      commercial_usage,
      visibility,
      source,
      status,
      organizations (
        id,
        organization_name,
        organization_type,
        status
      )
    `,
    )
    .eq("id", valueObjectId)
    .maybeSingle();

  if (valueObjectError) {
    return NextResponse.json(
      { error: valueObjectError.message },
      { status: 500 },
    );
  }

  const valueObject = valueObjectData as ValueObjectRow | null;

  if (!valueObject) {
    return NextResponse.json(
      { error: "Value Object not found" },
      { status: 404 },
    );
  }

  if (!isValueObjectOwnedByCurrentActor(valueObject, appUser, personActor)) {
    return NextResponse.json(
      { error: "Value Object access denied" },
      { status: 403 },
    );
  }

  return NextResponse.json({
    ok: true,
    mode: "draft_read",
    valueObject,
    editContract: {
      getEnabled: true,
      patchEnabled: false,
      activateEnabled: false,
      characteristicsPersistenceEnabled: false,
      eventMeasuresPersistenceEnabled: false,
      relationsPersistenceEnabled: false,
      rollupPersistenceEnabled: false,
      noWriteGuard: true,
    },
  });
}

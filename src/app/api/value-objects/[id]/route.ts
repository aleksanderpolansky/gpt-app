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

type DraftPatchBody = Record<string, unknown>;

type DraftPatchResult =
  | {
      patch: Record<string, string | number | boolean | null>;
      errorResponse: null;
    }
  | {
      patch: null;
      errorResponse: NextResponse;
    };

const VALUE_OBJECT_SELECT = `
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
`;

const ALLOWED_PATCH_KEYS = new Set([
  "valueType",
  "title",
  "description",
  "unitType",
  "defaultPrice",
  "defaultCurrency",
  "defaultDurationMinutes",
  "isMarketplaceSellable",
  "isFreePossible",
  "commercialUsage",
]);

const BLOCKED_PATCH_KEYS = new Set([
  "id",
  "status",
  "visibility",
  "source",
  "usageScope",
  "usage_scope",
  "organizationId",
  "organization_id",
  "ownerActorId",
  "owner_actor_id",
  "createdByActorId",
  "created_by_actor_id",
  "actorId",
  "actor_id",
  "appUserId",
  "app_user_id",
  "ownerUserId",
  "owner_user_id",
  "activate",
  "activation",
  "characteristics",
  "eventMeasures",
  "relations",
  "rollups",
]);

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

function normalizeOptionalNumber(value: unknown): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : Number.NaN;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed);

    return Number.isFinite(parsed) && parsed >= 0 ? parsed : Number.NaN;
  }

  return Number.NaN;
}

function normalizeCommercialUsage(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return "none";
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (
    normalized === "none" ||
    normalized === "catalog_info" ||
    normalized === "certificate_base" ||
    normalized === "both"
  ) {
    return normalized;
  }

  return null;
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

async function readOwnedValueObject(
  valueObjectId: string,
  appUser: AppUserRow,
  personActor: ActorRow,
) {
  const { data: valueObjectData, error: valueObjectError } = await supabase
    .from("value_objects")
    .select(VALUE_OBJECT_SELECT)
    .eq("id", valueObjectId)
    .maybeSingle();

  if (valueObjectError) {
    return {
      valueObject: null,
      errorResponse: NextResponse.json(
        { error: valueObjectError.message },
        { status: 500 },
      ),
    };
  }

  const valueObject = valueObjectData as ValueObjectRow | null;

  if (!valueObject) {
    return {
      valueObject: null,
      errorResponse: NextResponse.json(
        { error: "Value Object not found" },
        { status: 404 },
      ),
    };
  }

  if (!isValueObjectOwnedByCurrentActor(valueObject, appUser, personActor)) {
    return {
      valueObject: null,
      errorResponse: NextResponse.json(
        { error: "Value Object access denied" },
        { status: 403 },
      ),
    };
  }

  return {
    valueObject,
    errorResponse: null,
  };
}

function buildEditContract() {
  return {
    getEnabled: true,
    patchEnabled: true,
    activateEnabled: false,
    characteristicsPersistenceEnabled: false,
    eventMeasuresPersistenceEnabled: false,
    relationsPersistenceEnabled: false,
    rollupPersistenceEnabled: false,
    noWriteGuard: false,
  };
}

function addStringPatchField(
  patch: Record<string, string | number | boolean | null>,
  body: DraftPatchBody,
  inputKey: string,
  columnName: string,
  options: {
    requiredNonEmpty?: boolean;
    maxLength: number;
  },
) {
  if (!Object.prototype.hasOwnProperty.call(body, inputKey)) {
    return null;
  }

  const raw = body[inputKey];

  if (raw === null) {
    if (options.requiredNonEmpty) {
      return `${inputKey} cannot be null`;
    }

    patch[columnName] = null;
    return null;
  }

  if (typeof raw !== "string") {
    return `${inputKey} must be a string`;
  }

  const trimmed = raw.trim();

  if (!trimmed && options.requiredNonEmpty) {
    return `${inputKey} cannot be empty`;
  }

  if (trimmed.length > options.maxLength) {
    return `${inputKey} is too long`;
  }

  patch[columnName] = trimmed || null;
  return null;
}

function addNumberPatchField(
  patch: Record<string, string | number | boolean | null>,
  body: DraftPatchBody,
  inputKey: string,
  columnName: string,
) {
  const normalized = normalizeOptionalNumber(body[inputKey]);

  if (normalized === undefined) {
    return null;
  }

  if (Number.isNaN(normalized)) {
    return `${inputKey} must be a non-negative number or null`;
  }

  patch[columnName] = normalized;
  return null;
}

function addBooleanPatchField(
  patch: Record<string, string | number | boolean | null>,
  body: DraftPatchBody,
  inputKey: string,
  columnName: string,
) {
  if (!Object.prototype.hasOwnProperty.call(body, inputKey)) {
    return null;
  }

  const raw = body[inputKey];

  if (typeof raw !== "boolean") {
    return `${inputKey} must be boolean`;
  }

  patch[columnName] = raw;
  return null;
}

function buildDraftPatch(
  body: unknown,
  valueObject: ValueObjectRow,
): DraftPatchResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      patch: null,
      errorResponse: NextResponse.json(
        { error: "JSON object body is required" },
        { status: 400 },
      ),
    };
  }

  const draftBody = body as DraftPatchBody;
  const bodyKeys = Object.keys(draftBody);

  for (const key of bodyKeys) {
    if (BLOCKED_PATCH_KEYS.has(key)) {
      return {
        patch: null,
        errorResponse: NextResponse.json(
          { error: `${key} cannot be changed through draft PATCH` },
          { status: 400 },
        ),
      };
    }

    if (!ALLOWED_PATCH_KEYS.has(key)) {
      return {
        patch: null,
        errorResponse: NextResponse.json(
          { error: `Unsupported draft PATCH field: ${key}` },
          { status: 400 },
        ),
      };
    }
  }

  const currentStatus = (valueObject.status ?? "draft").trim().toLowerCase();

  if (currentStatus && currentStatus !== "draft") {
    return {
      patch: null,
      errorResponse: NextResponse.json(
        { error: "Only draft Value Objects can be patched by this route" },
        { status: 409 },
      ),
    };
  }

  const patch: Record<string, string | number | boolean | null> = {};

  const stringFieldErrors = [
    addStringPatchField(patch, draftBody, "valueType", "value_type", {
      requiredNonEmpty: true,
      maxLength: 80,
    }),
    addStringPatchField(patch, draftBody, "title", "title", {
      requiredNonEmpty: true,
      maxLength: 200,
    }),
    addStringPatchField(patch, draftBody, "description", "description", {
      maxLength: 4000,
    }),
    addStringPatchField(patch, draftBody, "unitType", "unit_type", {
      maxLength: 120,
    }),
    addStringPatchField(patch, draftBody, "defaultCurrency", "default_currency", {
      maxLength: 12,
    }),
  ].filter((error): error is string => Boolean(error));

  if (stringFieldErrors.length > 0) {
    return {
      patch: null,
      errorResponse: NextResponse.json(
        { error: stringFieldErrors[0] },
        { status: 400 },
      ),
    };
  }

  const numberFieldErrors = [
    addNumberPatchField(patch, draftBody, "defaultPrice", "default_price"),
    addNumberPatchField(
      patch,
      draftBody,
      "defaultDurationMinutes",
      "default_duration_minutes",
    ),
  ].filter((error): error is string => Boolean(error));

  if (numberFieldErrors.length > 0) {
    return {
      patch: null,
      errorResponse: NextResponse.json(
        { error: numberFieldErrors[0] },
        { status: 400 },
      ),
    };
  }

  const booleanFieldErrors = [
    addBooleanPatchField(
      patch,
      draftBody,
      "isMarketplaceSellable",
      "is_marketplace_sellable",
    ),
    addBooleanPatchField(patch, draftBody, "isFreePossible", "is_free_possible"),
  ].filter((error): error is string => Boolean(error));

  if (booleanFieldErrors.length > 0) {
    return {
      patch: null,
      errorResponse: NextResponse.json(
        { error: booleanFieldErrors[0] },
        { status: 400 },
      ),
    };
  }

  if (
    Object.prototype.hasOwnProperty.call(draftBody, "isMarketplaceSellable") &&
    valueObject.usage_scope !== "commercial" &&
    draftBody.isMarketplaceSellable === true
  ) {
    return {
      patch: null,
      errorResponse: NextResponse.json(
        {
          error:
            "isMarketplaceSellable can be true only for commercial Value Objects",
        },
        { status: 400 },
      ),
    };
  }

  const commercialUsage = normalizeCommercialUsage(draftBody.commercialUsage);

  if (commercialUsage === null) {
    return {
      patch: null,
      errorResponse: NextResponse.json(
        {
          error:
            "commercialUsage must be none, catalog_info, certificate_base or both",
        },
        { status: 400 },
      ),
    };
  }

  if (commercialUsage !== undefined) {
    if (valueObject.usage_scope !== "commercial" && commercialUsage !== "none") {
      return {
        patch: null,
        errorResponse: NextResponse.json(
          {
            error:
              "commercialUsage other than none is allowed only for commercial Value Objects",
          },
          { status: 400 },
        ),
      };
    }

    patch.commercial_usage =
      valueObject.usage_scope === "commercial" ? commercialUsage : "none";
  }

  if (Object.keys(patch).length === 0) {
    return {
      patch: null,
      errorResponse: NextResponse.json(
        { error: "At least one supported draft field is required" },
        { status: 400 },
      ),
    };
  }

  return {
    patch,
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

  const {
    valueObject,
    errorResponse: valueObjectReadErrorResponse,
  } = await readOwnedValueObject(valueObjectId, appUser, personActor);

  if (valueObjectReadErrorResponse) {
    return valueObjectReadErrorResponse;
  }

  return NextResponse.json({
    ok: true,
    mode: "draft_read",
    valueObject,
    editContract: buildEditContract(),
  });
}

export async function PATCH(request: Request, context: ValueObjectRouteContext) {
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

  const {
    valueObject,
    errorResponse: valueObjectReadErrorResponse,
  } = await readOwnedValueObject(valueObjectId, appUser, personActor);

  if (valueObjectReadErrorResponse) {
    return valueObjectReadErrorResponse;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    patch,
    errorResponse: patchErrorResponse,
  } = buildDraftPatch(body, valueObject);

  if (patchErrorResponse) {
    return patchErrorResponse;
  }

  const { data: updatedValueObjectData, error: updateError } = await supabase
    .from("value_objects")
    .update(patch)
    .eq("id", valueObject.id)
    .select(VALUE_OBJECT_SELECT)
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const updatedValueObject = updatedValueObjectData as ValueObjectRow | null;

  if (!updatedValueObject) {
    return NextResponse.json(
      { error: "Value Object was not updated" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    mode: "draft_patch",
    valueObject: updatedValueObject,
    editContract: buildEditContract(),
  });
}

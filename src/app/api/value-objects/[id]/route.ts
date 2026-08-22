import { NextResponse } from "next/server";
import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../lib/actor-context";
import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";
import { localizeEntityContent } from "@/lib/localization/contentLocalization.server";

export const dynamic = "force-dynamic";

type AppUserRow = {
  id: string;
  auth0_sub?: string | null;
};

type ActorRow = {
  id: string;
  actor_type?: string | null;
};

type ValueObjectRow = {
  id: string;
  parent_value_object_id?: string | null;
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
  metadata_json?: Record<string, unknown> | null;
  canonical_key?: string | null;
  ontology_node_role_code?: string | null;
  definition_version?: number | null;
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
      personActor: ActorRow;
      errorResponse: null;
    }
  | {
      appUser: null;
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
      patch: Record<string, unknown>;
      errorResponse: null;
    }
  | {
      patch: null;
      errorResponse: NextResponse;
    };

const VALUE_OBJECT_SELECT = `
  id,
  parent_value_object_id,
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
  metadata_json,
  canonical_key,
  ontology_node_role_code,
  definition_version,
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
  "publicProfile",
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
  "parentValueObjectId",
  "activate",
  "activation",
  "characteristics",
  "eventMeasures",
  "relations",
  "rollups",
  "metadataJson",
  "metadata_json",
  "imageUrl",
  "location",
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
  return (
    valueObject.owner_user_id === appUser.id &&
    valueObject.owner_actor_id === personActor.id
  );
}

async function getCurrentUserContext(): Promise<CurrentUserContext> {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return {
      appUser: null,
      personActor: null,
      errorResponse: NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 },
      ),
    };
  }

  try {
    const actorContext = await resolveActiveActorContext(session.user.sub);

    return {
      appUser: {
        id: actorContext.appUserId,
        auth0_sub: session.user.sub,
      },
      personActor: {
        id: actorContext.actorId,
        actor_type: actorContext.actorType,
      },
      errorResponse: null,
    };
  } catch (error) {
    if (error instanceof ActorContextError) {
      return {
        appUser: null,
        personActor: null,
        errorResponse: NextResponse.json(
          {
            error: error.message,
            errorCode: error.code,
          },
          { status: error.status },
        ),
      };
    }

    return {
      appUser: null,
      personActor: null,
      errorResponse: NextResponse.json(
        { error: "Could not resolve active actor context" },
        { status: 500 },
      ),
    };
  }
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
    .eq("owner_user_id", appUser.id)
    .eq("owner_actor_id", personActor.id)
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
  patch: Record<string, unknown>,
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
  patch: Record<string, unknown>,
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
  patch: Record<string, unknown>,
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeNullableText(
  value: unknown,
  maxLength: number,
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (trimmed.length > maxLength) {
    return undefined;
  }

  return trimmed || null;
}

function normalizeCoordinate(
  value: unknown,
  min: number,
  max: number,
): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return undefined;
  }

  return parsed;
}

function normalizeImageUrl(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  if (typeof value !== "string" || value.length > 1_500_000) {
    return undefined;
  }

  const trimmed = value.trim();

  if (
    /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=\s]+$/i.test(trimmed) ||
    /^https:\/\/[^\s]+$/i.test(trimmed)
  ) {
    return trimmed;
  }

  return undefined;
}

function addPublicProfilePatch(
  patch: Record<string, unknown>,
  body: DraftPatchBody,
  valueObject: ValueObjectRow,
): string | null {
  if (!Object.prototype.hasOwnProperty.call(body, "publicProfile")) {
    return null;
  }

  const rawProfile = body.publicProfile;

  if (!isRecord(rawProfile)) {
    return "publicProfile must be an object";
  }

  const allowedProfileKeys = new Set(["imageUrl", "location"]);

  for (const key of Object.keys(rawProfile)) {
    if (!allowedProfileKeys.has(key)) {
      return `Unsupported publicProfile field: ${key}`;
    }
  }

  const imageUrl = normalizeImageUrl(rawProfile.imageUrl);

  if (rawProfile.imageUrl !== undefined && imageUrl === undefined) {
    return "publicProfile.imageUrl must be a supported image data URL, HTTPS URL or null";
  }

  let nextLocation: Record<string, unknown> | null | undefined;

  if (rawProfile.location !== undefined) {
    if (rawProfile.location === null) {
      nextLocation = null;
    } else if (!isRecord(rawProfile.location)) {
      return "publicProfile.location must be an object or null";
    } else {
      const allowedLocationKeys = new Set([
        "label",
        "countryCode",
        "region",
        "city",
        "district",
        "streetAddress",
        "postalCode",
        "latitude",
        "longitude",
        "addressVisibility",
      ]);

      for (const key of Object.keys(rawProfile.location)) {
        if (!allowedLocationKeys.has(key)) {
          return `Unsupported publicProfile.location field: ${key}`;
        }
      }

      const label = normalizeNullableText(rawProfile.location.label, 160);
      const countryCode = normalizeNullableText(
        rawProfile.location.countryCode,
        2,
      );
      const region = normalizeNullableText(rawProfile.location.region, 160);
      const city = normalizeNullableText(rawProfile.location.city, 160);
      const district = normalizeNullableText(rawProfile.location.district, 160);
      const streetAddress = normalizeNullableText(
        rawProfile.location.streetAddress,
        240,
      );
      const postalCode = normalizeNullableText(
        rawProfile.location.postalCode,
        32,
      );
      const addressVisibility = normalizeNullableText(
        rawProfile.location.addressVisibility,
        32,
      );
      const latitude = normalizeCoordinate(
        rawProfile.location.latitude,
        -90,
        90,
      );
      const longitude = normalizeCoordinate(
        rawProfile.location.longitude,
        -180,
        180,
      );

      const invalidText = [
        [rawProfile.location.label, label],
        [rawProfile.location.countryCode, countryCode],
        [rawProfile.location.region, region],
        [rawProfile.location.city, city],
        [rawProfile.location.district, district],
        [rawProfile.location.streetAddress, streetAddress],
        [rawProfile.location.postalCode, postalCode],
        [rawProfile.location.addressVisibility, addressVisibility],
      ].some(([raw, normalized]) => raw !== undefined && normalized === undefined);

      if (invalidText || latitude === undefined || longitude === undefined) {
        return "publicProfile.location contains an invalid value";
      }

      const normalizedAddressVisibility = addressVisibility ?? "public";

      if (!new Set(["public", "approximate", "private"]).has(normalizedAddressVisibility)) {
        return "publicProfile.location.addressVisibility is invalid";
      }

      nextLocation = {
        label: label ?? null,
        country_code: countryCode?.toUpperCase() ?? null,
        region: region ?? null,
        city: city ?? null,
        district: district ?? null,
        street_address: streetAddress ?? null,
        postal_code: postalCode ?? null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        address_visibility: normalizedAddressVisibility,
      };
    }
  }

  const currentMetadata = isRecord(valueObject.metadata_json)
    ? valueObject.metadata_json
    : {};
  const currentProfile = isRecord(currentMetadata.public_profile)
    ? currentMetadata.public_profile
    : {};
  const nextProfile: Record<string, unknown> = { ...currentProfile };

  if (imageUrl !== undefined) {
    nextProfile.image_url = imageUrl;
  }

  if (nextLocation !== undefined) {
    nextProfile.location = nextLocation;
  }

  patch.metadata_json = {
    ...currentMetadata,
    public_profile: nextProfile,
  };

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

  if (Object.prototype.hasOwnProperty.call(draftBody, "parentValueObjectId")) {
    return {
      patch: null,
      errorResponse: NextResponse.json(
        {
          error:
            "parentValueObjectId can be changed only through the controlled P8 tree restructure flow",
          errorCode: "P8_CONTROLLED_TREE_RESTRUCTURE_REQUIRED",
          restructureUrl: `/value-objects/${valueObject.id}/restructure`,
        },
        { status: 409 },
      ),
    };
  }

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

  const patch: Record<string, unknown> = {};

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

  const publicProfileError = addPublicProfilePatch(
    patch,
    draftBody,
    valueObject,
  );

  if (publicProfileError) {
    return {
      patch: null,
      errorResponse: NextResponse.json(
        { error: publicProfileError },
        { status: 400 },
      ),
    };
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

  if (
    valueObject.canonical_key &&
    valueObject.ontology_node_role_code &&
    isRecord(body) &&
    (Object.prototype.hasOwnProperty.call(body, "title") ||
      Object.prototype.hasOwnProperty.call(body, "description"))
  ) {
    return NextResponse.json(
      {
        error: "P2C_SEMANTIC_WRITE_REQUIRES_ONTOLOGY_EDITOR",
        editorEndpoint: `/api/value-objects/${encodeURIComponent(
          valueObject.id,
        )}/ontology-definition`,
      },
      { status: 409 },
    );
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
    .eq("owner_user_id", appUser.id)
    .eq("owner_actor_id", personActor.id)
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

  let contentLocalization = null;
  if (isRecord(body)) {
    const localizedFields: Record<string, string | null> = {};
    if (Object.prototype.hasOwnProperty.call(body, "title")) {
      localizedFields.title = updatedValueObject.title ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(body, "description")) {
      localizedFields.description = updatedValueObject.description ?? null;
    }

    if (Object.keys(localizedFields).length > 0) {
      contentLocalization = await localizeEntityContent({
        userId: appUser.id,
        actorId: personActor.id,
        table: "value_objects",
        entityId: updatedValueObject.id,
        sourceLocaleHint: body.locale,
        fields: localizedFields,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    mode: "draft_patch",
    valueObject: updatedValueObject,
    contentLocalization,
    editContract: buildEditContract(),
  });
}

type SafeDeleteRpcResult = {
  ok?: boolean;
  error?: string;
  errorCode?: string;
  deletedId?: string;
  deletedTitle?: string;
  parentValueObjectId?: string | null;
  blocker?: {
    table?: string | null;
    column?: string | null;
    count?: number | null;
  } | null;
};

function mapSafeDeleteRpcErrorStatus(error: {
  readonly code?: string | null;
}) {
  if (error.code === "42501") return 403;
  if (error.code === "P0002") return 404;
  if (error.code === "22023") return 400;
  if (error.code === "23514" || error.code === "55000") return 409;
  if (error.code === "40001") return 409;
  return 500;
}

export async function DELETE(
  _request: Request,
  context: ValueObjectRouteContext,
) {
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

  const { data, error } = await supabase.rpc(
    "delete_value_object_safe_v1",
    {
      p_owner_user_id: appUser.id,
      p_owner_actor_id: personActor.id,
      p_value_object_id: valueObject.id,
    },
  );

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        errorCode: error.code ?? "VALUE_OBJECT_SAFE_DELETE_FAILED",
      },
      { status: mapSafeDeleteRpcErrorStatus(error) },
    );
  }

  const result = data as SafeDeleteRpcResult | null;

  if (!result?.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result?.error || "This observation object cannot be deleted safely.",
        errorCode:
          result?.errorCode || "VALUE_OBJECT_DELETE_BLOCKED_DEPENDENCY",
        blocker: result?.blocker ?? null,
      },
      { status: 409 },
    );
  }

  const parentValueObjectId =
    typeof result.parentValueObjectId === "string"
      ? result.parentValueObjectId
      : null;

  return NextResponse.json({
    ...result,
    ok: true,
    parentValueObjectId,
    redirectUrl: parentValueObjectId
      ? `/value-objects/${encodeURIComponent(parentValueObjectId)}`
      : "/value-objects",
  });
}

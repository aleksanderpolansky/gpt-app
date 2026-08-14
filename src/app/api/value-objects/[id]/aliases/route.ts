import { NextResponse } from "next/server";

import {
  localizeGlobalSystemValueObject,
  normalizeGlobalSystemValueObjectLocale,
} from "@/lib/reality-core/global-system-value-object-localization";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type AliasAction = "add" | "archive" | "restore";

type GlobalAliasValueObjectRow = {
  id: string;
  title: string;
  canonical_key: string | null;
  status: string;
  definition_version: number | null;
  scope_code: string | null;
  origin_type_code: string | null;
};

type GlobalAliasRow = {
  id: string;
  alias_text: string;
  alias_normalized: string;
  locale: string | null;
  status: string;
  source_type: string;
  created_at: string;
  updated_at: string;
};

function isGlobalSystemObject(
  row: GlobalAliasValueObjectRow | null | undefined,
): row is GlobalAliasValueObjectRow {
  return Boolean(
    row &&
      row.scope_code === "global" &&
      row.origin_type_code === "system_model" &&
      row.status === "active",
  );
}

async function readGlobalSystemAliasProfile(
  valueObjectId: string,
  localeValue: unknown,
): Promise<
  | { handled: false }
  | { handled: true; response: NextResponse }
> {
  const { data: valueObjectData, error: valueObjectError } = await supabase
    .from("value_objects")
    .select(
      "id,title,canonical_key,status,definition_version,scope_code,origin_type_code",
    )
    .eq("id", valueObjectId)
    .maybeSingle();

  if (valueObjectError) {
    return {
      handled: true,
      response: NextResponse.json(
        {
          ok: false,
          error: valueObjectError.message,
          errorCode: "GLOBAL_SYSTEM_ALIAS_VALUE_OBJECT_LOOKUP_FAILED",
        },
        { status: 500 },
      ),
    };
  }

  const valueObject = valueObjectData as GlobalAliasValueObjectRow | null;

  if (!isGlobalSystemObject(valueObject)) {
    return { handled: false };
  }

  if (!valueObject.canonical_key || !valueObject.definition_version) {
    return {
      handled: true,
      response: NextResponse.json(
        {
          ok: false,
          error: "GLOBAL_SYSTEM_ALIAS_VALUE_OBJECT_NOT_ONTOLOGY_READY",
          errorCode: "GLOBAL_SYSTEM_ALIAS_VALUE_OBJECT_NOT_ONTOLOGY_READY",
        },
        { status: 409 },
      ),
    };
  }

  const locale = normalizeGlobalSystemValueObjectLocale(localeValue);
  const { data: aliasData, error: aliasError } = await supabase
    .from("concept_aliases")
    .select(
      "id,alias_text,alias_normalized,locale,status,source_type,created_at,updated_at",
    )
    .eq("concept_type", "value_object")
    .eq("concept_id", valueObject.id)
    .order("updated_at", { ascending: false });

  if (aliasError) {
    return {
      handled: true,
      response: NextResponse.json(
        {
          ok: false,
          error: aliasError.message,
          errorCode: "GLOBAL_SYSTEM_ALIAS_READ_FAILED",
        },
        { status: 500 },
      ),
    };
  }

  const aliasRows = (aliasData ?? []) as GlobalAliasRow[];
  const aliases = aliasRows
    .filter((row) => {
      const aliasLocale = row.locale?.trim().toLowerCase() ?? null;
      return aliasLocale === null || aliasLocale === locale;
    })
    .sort((left, right) => {
      const leftActive =
        left.status === "approved" || left.status === "published" ? 0 : 1;
      const rightActive =
        right.status === "approved" || right.status === "published" ? 0 : 1;
      if (leftActive !== rightActive) return leftActive - rightActive;
      return left.alias_normalized.localeCompare(right.alias_normalized);
    })
    .map((row) => ({
      id: row.id,
      aliasText: row.alias_text,
      aliasNormalized: row.alias_normalized,
      locale: row.locale,
      status: row.status,
      sourceType: row.source_type,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      recognitionActive:
        row.status === "approved" || row.status === "published",
    }));

  const localizedValueObject = localizeGlobalSystemValueObject(
    valueObject,
    locale,
  );
  const recognitionActiveAliasCount = aliases.filter(
    (alias) => alias.recognitionActive,
  ).length;

  return {
    handled: true,
    response: NextResponse.json(
      {
        ok: true,
        contractVersion: "P2D_VALUE_OBJECT_ALIAS_RECOGNITION_V1",
        valueObject: {
          id: localizedValueObject.id,
          title: localizedValueObject.title,
          canonicalKey: localizedValueObject.canonical_key,
          statusCode: localizedValueObject.status,
          definitionVersion: localizedValueObject.definition_version,
        },
        aliases,
        summary: {
          aliasCount: aliases.length,
          recognitionActiveAliasCount,
        },
        permissions: {
          actorOwner: false,
          canManageAliases: false,
          hardDeleteEnabled: false,
          primaryTitleManagedBy: "P2C",
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    ),
  };
}

function normalizeId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized && normalized.length <= 200 ? normalized : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function rpcStatus(message: string) {
  if (
    message.includes("ACCESS_DENIED") ||
    message.includes("ACTOR_NOT_OWNED")
  ) {
    return 403;
  }

  if (message.includes("NOT_FOUND")) {
    return 404;
  }

  if (
    message.includes("STATUS_NOT_MANAGEABLE") ||
    message.includes("ALIAS_EQUALS_PRIMARY_TITLE")
  ) {
    return 409;
  }

  return 400;
}

async function resolveContext() {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return {
      actorContext: null,
      errorResponse: NextResponse.json(
        { ok: false, error: "Not authenticated" },
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
            error: error.message,
            errorCode: error.code,
          },
          { status: error.status },
        ),
      };
    }

    return {
      actorContext: null,
      errorResponse: NextResponse.json(
        { ok: false, error: "Could not resolve active actor context" },
        { status: 500 },
      ),
    };
  }
}

export async function GET(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  const valueObjectId = normalizeId(rawId);

  if (!valueObjectId) {
    return NextResponse.json(
      { ok: false, error: "Valid Value Object id is required" },
      { status: 400 },
    );
  }

  const { actorContext, errorResponse } = await resolveContext();

  if (errorResponse || !actorContext) {
    return errorResponse;
  }

  const requestedLocale = new URL(request.url).searchParams.get("locale");
  const globalRead = await readGlobalSystemAliasProfile(
    valueObjectId,
    requestedLocale,
  );

  if (globalRead.handled) {
    return globalRead.response;
  }

  const { data, error } = await supabase.rpc(
    "get_value_object_alias_profile_v1",
    {
      p_owner_user_id: actorContext.appUserId,
      p_owner_actor_id: actorContext.actorId,
      p_value_object_id: valueObjectId,
    },
  );

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: rpcStatus(error.message) },
    );
  }

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  const valueObjectId = normalizeId(rawId);

  if (!valueObjectId) {
    return NextResponse.json(
      { ok: false, error: "Valid Value Object id is required" },
      { status: 400 },
    );
  }

  const { actorContext, errorResponse } = await resolveContext();

  if (errorResponse || !actorContext) {
    return errorResponse;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!isRecord(body)) {
    return NextResponse.json(
      { ok: false, error: "P2D_BODY_MUST_BE_OBJECT" },
      { status: 400 },
    );
  }

  const action: AliasAction | null =
    body.action === "add" ||
    body.action === "archive" ||
    body.action === "restore"
      ? body.action
      : null;

  if (!action) {
    return NextResponse.json(
      { ok: false, error: "P2D_ALIAS_ACTION_INVALID" },
      { status: 400 },
    );
  }

  const payload: Record<string, unknown> = {};

  if (action === "add") {
    if (typeof body.aliasText !== "string") {
      return NextResponse.json(
        { ok: false, error: "P2D_ALIAS_TEXT_REQUIRED" },
        { status: 400 },
      );
    }

    const aliasText = body.aliasText.trim();

    if (!aliasText || aliasText.length > 180) {
      return NextResponse.json(
        { ok: false, error: "P2D_ALIAS_TEXT_INVALID" },
        { status: 400 },
      );
    }

    payload.aliasText = aliasText;

    if (
      body.locale !== undefined &&
      body.locale !== null &&
      typeof body.locale !== "string"
    ) {
      return NextResponse.json(
        { ok: false, error: "P2D_ALIAS_LOCALE_INVALID" },
        { status: 400 },
      );
    }

    payload.locale =
      typeof body.locale === "string" && body.locale.trim()
        ? body.locale.trim().toLowerCase()
        : null;
  } else {
    const aliasId = normalizeId(body.aliasId);

    if (!aliasId) {
      return NextResponse.json(
        { ok: false, error: "P2D_ALIAS_ID_REQUIRED" },
        { status: 400 },
      );
    }

    payload.aliasId = aliasId;
  }

  const { data, error } = await supabase.rpc(
    "manage_value_object_alias_v1",
    {
      p_owner_user_id: actorContext.appUserId,
      p_owner_actor_id: actorContext.actorId,
      p_created_by_actor_id: actorContext.actorId,
      p_value_object_id: valueObjectId,
      p_action: action,
      p_payload: payload,
    },
  );

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: rpcStatus(error.message) },
    );
  }

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

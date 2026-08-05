import { NextResponse } from "next/server";

import { getOrganizationCurrency } from "@/lib/commercial/currency";
import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../lib/actor-context";
import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type ProductServiceKind = "product_type" | "service_type";

type ProductServiceRequestBody = {
  objectKind?: unknown;
  organizationId?: unknown;
  title?: unknown;
  description?: unknown;
  defaultPrice?: unknown;
  defaultCurrency?: unknown;
  defaultDurationMinutes?: unknown;
  locale?: unknown;
};

type CreateProductServiceRpcRow = {
  root_value_object_id: string;
  value_object_id: string;
  provider_actor_id: string;
  provider_type: string;
  organization_id: string | null;
  default_currency: string;
  created_root: boolean;
};

function normalizeUuid(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    normalized,
  )
    ? normalized
    : null;
}

function normalizeRequiredText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized ? normalized : null;
}

function normalizeOptionalText(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized ? normalized : null;
}

function normalizePrice(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(",", ".");

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDuration(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.trim())
        : Number.NaN;

  return Number.isInteger(parsed) ? parsed : null;
}

function normalizeObjectKind(value: unknown): ProductServiceKind | null {
  return value === "product_type" || value === "service_type" ? value : null;
}

function normalizeLocale(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  return ["en", "pl", "ru", "uk", "de", "es", "cs"].includes(normalized)
    ? normalized
    : null;
}

function buildValueObjectDetailUrl(id: string, locale: string | null) {
  const pathname = `/value-objects/${id}`;

  return locale && locale !== "en"
    ? `${pathname}?locale=${encodeURIComponent(locale)}`
    : pathname;
}

export async function POST(request: Request) {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let actorContext: Awaited<ReturnType<typeof resolveActiveActorContext>>;

  try {
    actorContext = await resolveActiveActorContext(session.user.sub);
  } catch (error) {
    if (error instanceof ActorContextError) {
      return NextResponse.json(
        {
          error: error.message,
          errorCode: error.code,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: "Could not resolve active actor context" },
      { status: 500 },
    );
  }

  let body: ProductServiceRequestBody;

  try {
    body = (await request.json()) as ProductServiceRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const objectKind = normalizeObjectKind(body.objectKind);
  const organizationId = normalizeUuid(body.organizationId);
  const organizationIdWasProvided =
    body.organizationId !== null &&
    body.organizationId !== undefined &&
    body.organizationId !== "";
  const title = normalizeRequiredText(body.title);
  const description = normalizeOptionalText(body.description);
  const defaultPrice = normalizePrice(body.defaultPrice);
  const requestedCurrency = normalizeOptionalText(body.defaultCurrency);
  const defaultDurationMinutes = normalizeDuration(
    body.defaultDurationMinutes,
  );
  const locale = normalizeLocale(body.locale);

  if (!objectKind) {
    return NextResponse.json(
      { error: "objectKind must be product_type or service_type" },
      { status: 400 },
    );
  }

  if (organizationIdWasProvided && !organizationId) {
    return NextResponse.json(
      { error: "organizationId must be a valid UUID" },
      { status: 400 },
    );
  }

  if (!title || title.length > 180) {
    return NextResponse.json(
      { error: "title is required and must be 180 characters or fewer" },
      { status: 400 },
    );
  }

  if (description && description.length > 4000) {
    return NextResponse.json(
      { error: "description must be 4000 characters or fewer" },
      { status: 400 },
    );
  }

  if (
    defaultPrice === null ||
    defaultPrice < 0 ||
    defaultPrice > 1_000_000_000
  ) {
    return NextResponse.json(
      { error: "defaultPrice must be a non-negative number" },
      { status: 400 },
    );
  }

  if (
    objectKind === "service_type" &&
    defaultDurationMinutes !== null &&
    (defaultDurationMinutes <= 0 || defaultDurationMinutes > 525_600)
  ) {
    return NextResponse.json(
      { error: "defaultDurationMinutes must be a positive whole number" },
      { status: 400 },
    );
  }

  let providerCurrency = "EUR";

  if (organizationId) {
    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .select("id, country_code, default_currency, status, owner_actor_id")
      .eq("id", organizationId)
      .eq("owner_actor_id", actorContext.actorId)
      .eq("status", "active")
      .maybeSingle();

    if (organizationError) {
      return NextResponse.json(
        { error: organizationError.message },
        { status: 500 },
      );
    }

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found or access denied" },
        { status: 403 },
      );
    }

    providerCurrency = getOrganizationCurrency(organization) ?? "";

    if (!providerCurrency) {
      return NextResponse.json(
        {
          error:
            "Organization currency does not match the country of its address. Save the organization address before creating a product or service.",
        },
        { status: 409 },
      );
    }

    if (
      requestedCurrency &&
      requestedCurrency.toUpperCase() !== providerCurrency
    ) {
      return NextResponse.json(
        {
          error:
            "The requested currency does not match the organization country.",
        },
        { status: 400 },
      );
    }
  } else if (requestedCurrency && requestedCurrency.toUpperCase() !== "EUR") {
    return NextResponse.json(
      { error: "Personal and avatar providers use EUR in this release" },
      { status: 400 },
    );
  }

  if (!/^[A-Z]{3}$/.test(providerCurrency)) {
    return NextResponse.json(
      { error: "Provider currency is unavailable" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.rpc(
    "create_product_service_leaf_v1",
    {
      p_owner_user_id: actorContext.appUserId,
      p_owner_actor_id: actorContext.actorId,
      p_organization_id: organizationId,
      p_object_kind: objectKind,
      p_title: title,
      p_description: description,
      p_default_price: defaultPrice,
      p_default_currency: providerCurrency,
      p_default_duration_minutes:
        objectKind === "service_type" ? defaultDurationMinutes : null,
    },
  );

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        errorCode: error.code ?? null,
      },
      { status: 400 },
    );
  }

  const creation = Array.isArray(data)
    ? (data[0] as CreateProductServiceRpcRow | undefined)
    : null;

  if (!creation?.value_object_id) {
    return NextResponse.json(
      { error: "Product/service creation returned no value object" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    valueObjectId: creation.value_object_id,
    rootValueObjectId: creation.root_value_object_id,
    providerActorId: creation.provider_actor_id,
    providerType: creation.provider_type,
    organizationId: creation.organization_id,
    defaultCurrency: creation.default_currency,
    createdRoot: creation.created_root,
    redirectUrl: buildValueObjectDetailUrl(
      creation.value_object_id,
      locale,
    ),
  });
}

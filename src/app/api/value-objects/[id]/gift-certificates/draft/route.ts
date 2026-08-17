import { NextResponse } from "next/server";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../../lib/auth0";
import { resolveOfficialEurReferenceRate } from "../../../../../../../lib/exchange-rates/official-eur-reference-rate";
import { supabase } from "../../../../../../../lib/supabase";
import { getOrganizationCurrency } from "@/lib/commercial/currency";
import { localizeEntityContent } from "@/lib/localization/contentLocalization.server";

export const dynamic = "force-dynamic";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";
type ProductServiceKind = "product_type" | "service_type";
type DeliveryMode =
  | "product_pickup"
  | "product_delivery"
  | "service_offline"
  | "service_online";
type CoverageMode = "percentage" | "provider_currency_amount";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type RequestBody = {
  idempotencyKey?: unknown;
  deliveryMode?: unknown;
  availableFrom?: unknown;
  availableUntil?: unknown;
  pointsCoverageMode?: unknown;
  pointsCoveragePercent?: unknown;
  pointsCoveredAmount?: unknown;
  termsText?: unknown;
  startedAt?: unknown;
  endedAt?: unknown;
  locale?: unknown;
};

type ValueObjectRow = {
  id: string;
  title: string;
  description: string | null;
  object_kind: ProductServiceKind;
  node_role_code: string | null;
  default_price: number | null;
  default_currency: string | null;
  organization_id: string | null;
  status: string;
};

type RpcPayload = {
  disposition?: string;
  activityEvent?: {
    id?: string;
  };
  giftCertificateTerms?: {
    activity_event_id?: string;
  };
};

function normalizeUuid(value: unknown): string | null {
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

function normalizeRequiredText(
  value: unknown,
  maximumLength: number,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized && normalized.length <= maximumLength
    ? normalized
    : null;
}

function normalizeOptionalText(
  value: unknown,
  maximumLength: number,
): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized.length <= maximumLength
    ? normalized || null
    : null;
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return null;
  }

  const parsed = new Date(`${normalized}T00:00:00Z`);

  return Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== normalized
    ? null
    : normalized;
}

function normalizeTimestamp(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number(value.trim().replace(",", "."));

  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDeliveryMode(value: unknown): DeliveryMode | null {
  return value === "product_pickup" ||
    value === "product_delivery" ||
    value === "service_offline" ||
    value === "service_online"
    ? value
    : null;
}

function normalizeCoverageMode(value: unknown): CoverageMode | null {
  return value === "percentage" ||
    value === "provider_currency_amount"
    ? value
    : null;
}

function normalizeLocale(value: unknown): LocaleCode {
  return value === "pl" ||
    value === "ru" ||
    value === "uk" ||
    value === "de" ||
    value === "es" ||
    value === "cs"
    ? value
    : "en";
}

function normalizeRpcErrorCode(
  message: string,
  sqlState: string | null | undefined,
): string | null {
  const normalizedMessage = message.trim();

  if (/^[A-Z][A-Z0-9_]+$/.test(normalizedMessage)) {
    return normalizedMessage;
  }

  return sqlState ?? null;
}

function buildGiftCertificateReviewUrl(
  activityEventId: string,
  locale: LocaleCode,
) {
  const pathname = `/certificates/${activityEventId}`;

  return locale === "en"
    ? pathname
    : `${pathname}?locale=${encodeURIComponent(locale)}`;
}

function calculateDateDifferenceDays(from: string, until: string) {
  const fromTime = Date.parse(`${from}T00:00:00Z`);
  const untilTime = Date.parse(`${until}T00:00:00Z`);

  return Math.round((untilTime - fromTime) / 86_400_000);
}

export async function POST(
  request: Request,
  routeContext: RouteContext,
) {
  const { id } = await routeContext.params;
  const valueObjectId = normalizeUuid(id);

  if (!valueObjectId) {
    return NextResponse.json(
      { error: "Invalid value object id" },
      { status: 400 },
    );
  }

  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 },
    );
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

  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const idempotencyKey = normalizeRequiredText(
    body.idempotencyKey,
    220,
  );
  const deliveryMode = normalizeDeliveryMode(body.deliveryMode);
  const availableFrom = normalizeDate(body.availableFrom);
  const availableUntil = normalizeDate(body.availableUntil);
  const coverageMode = normalizeCoverageMode(
    body.pointsCoverageMode,
  );
  const coveragePercent = normalizeNumber(
    body.pointsCoveragePercent,
  );
  const coveredAmount = normalizeNumber(body.pointsCoveredAmount);
  const termsText = normalizeOptionalText(body.termsText, 4000);

  if (
    typeof body.termsText === "string" &&
    body.termsText.trim().length > 4000
  ) {
    return NextResponse.json(
      { error: "termsText must be 4000 characters or fewer" },
      { status: 400 },
    );
  }
  const startedAt = normalizeTimestamp(body.startedAt);
  const endedAt = normalizeTimestamp(body.endedAt);
  const locale = normalizeLocale(body.locale);

  if (!idempotencyKey) {
    return NextResponse.json(
      { error: "idempotencyKey is required" },
      { status: 400 },
    );
  }

  if (!deliveryMode) {
    return NextResponse.json(
      { error: "deliveryMode is invalid" },
      { status: 400 },
    );
  }

  if (!availableFrom || !availableUntil) {
    return NextResponse.json(
      { error: "Both validity dates are required" },
      { status: 400 },
    );
  }

  const validityDays = calculateDateDifferenceDays(
    availableFrom,
    availableUntil,
  );

  if (validityDays < 0 || validityDays > 31) {
    return NextResponse.json(
      { error: "Validity period must be between 0 and 31 days" },
      { status: 400 },
    );
  }

  if (!coverageMode) {
    return NextResponse.json(
      { error: "pointsCoverageMode is invalid" },
      { status: 400 },
    );
  }

  const { data: valueObjectData, error: valueObjectError } = await supabase
    .from("value_objects")
    .select(
      `
      id,
      title,
      description,
      object_kind,
      node_role_code,
      default_price,
      default_currency,
      organization_id,
      status
    `,
    )
    .eq("id", valueObjectId)
    .eq("owner_user_id", actorContext.appUserId)
    .eq("owner_actor_id", actorContext.actorId)
    .eq("node_role_code", "activity_leaf")
    .in("object_kind", ["product_type", "service_type"])
    .in("status", ["draft", "active"])
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
      { error: "Product or service not found" },
      { status: 404 },
    );
  }

  const ordinaryPrice = Number(valueObject.default_price ?? 0);
  const valueObjectCurrency =
    typeof valueObject.default_currency === "string"
      ? valueObject.default_currency.trim().toUpperCase()
      : "";
  let providerCurrency = "EUR";

  if (valueObject.organization_id) {
    const { data: organizationData, error: organizationError } = await supabase
      .from("organizations")
      .select("id, country_code, default_currency, status, owner_actor_id")
      .eq("id", valueObject.organization_id)
      .eq("owner_actor_id", actorContext.actorId)
      .eq("status", "active")
      .maybeSingle();

    if (organizationError) {
      return NextResponse.json(
        { error: organizationError.message },
        { status: 500 },
      );
    }

    if (!organizationData) {
      return NextResponse.json(
        { error: "Organization not found or access denied" },
        { status: 403 },
      );
    }

    providerCurrency = getOrganizationCurrency(organizationData) ?? "";

    if (!providerCurrency) {
      return NextResponse.json(
        {
          error:
            "Organization currency does not match the country of its address.",
        },
        { status: 409 },
      );
    }
  }

  if (
    !Number.isFinite(ordinaryPrice) ||
    ordinaryPrice < 0 ||
    !/^[A-Z]{3}$/.test(providerCurrency) ||
    valueObjectCurrency !== providerCurrency
  ) {
    return NextResponse.json(
      {
        error:
          "Product or service price or provider currency is unavailable.",
      },
      { status: 400 },
    );
  }

  if (
    valueObject.object_kind === "product_type" &&
    deliveryMode !== "product_pickup" &&
    deliveryMode !== "product_delivery"
  ) {
    return NextResponse.json(
      { error: "Product delivery mode is invalid" },
      { status: 400 },
    );
  }

  if (
    valueObject.object_kind === "service_type" &&
    deliveryMode !== "service_offline" &&
    deliveryMode !== "service_online"
  ) {
    return NextResponse.json(
      { error: "Service delivery mode is invalid" },
      { status: 400 },
    );
  }

  if (coverageMode === "percentage") {
    if (
      coveragePercent === null ||
      coveragePercent < 0 ||
      coveragePercent > 100
    ) {
      return NextResponse.json(
        { error: "POINTS percentage must be between 0 and 100" },
        { status: 400 },
      );
    }
  } else if (
    coveredAmount === null ||
    coveredAmount < 0 ||
    coveredAmount > ordinaryPrice
  ) {
    return NextResponse.json(
      {
        error:
          "POINTS-covered amount must be between 0 and the ordinary price",
      },
      { status: 400 },
    );
  }


  let referenceRate: Awaited<ReturnType<typeof resolveOfficialEurReferenceRate>>;

  try {
    referenceRate = await resolveOfficialEurReferenceRate(providerCurrency);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Official euro reference rate is unavailable",
      },
      { status: 503 },
    );
  }

  if (valueObject.object_kind === "service_type") {
    const hasStartedAt = Boolean(startedAt);
    const hasEndedAt = Boolean(endedAt);

    if (hasStartedAt !== hasEndedAt) {
      return NextResponse.json(
        {
          error:
            "Service timing must be either individually agreed or a complete exact interval",
        },
        { status: 400 },
      );
    }

    if (
      startedAt &&
      endedAt &&
      Date.parse(endedAt) <= Date.parse(startedAt)
    ) {
      return NextResponse.json(
        { error: "A valid exact service interval is required" },
        { status: 400 },
      );
    }
  } else if (startedAt || endedAt) {
    return NextResponse.json(
      { error: "Product certificates do not use an exact service interval" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.rpc(
    "create_gift_certificate_activity_draft_v1",
    {
      p_owner_user_id: actorContext.appUserId,
      p_manager_actor_id: actorContext.actorId,
      p_value_object_id: valueObject.id,
      p_idempotency_key: idempotencyKey,
      p_delivery_mode: deliveryMode,
      p_available_from: availableFrom,
      p_available_until: availableUntil,
      p_points_coverage_mode: coverageMode,
      p_points_coverage_percent:
        coverageMode === "percentage" ? coveragePercent : null,
      p_points_covered_amount:
        coverageMode === "provider_currency_amount"
          ? coveredAmount
          : null,
      p_reference_exchange_rate:
        referenceRate.providerCurrencyPerEuro,
      p_reference_exchange_rate_source:
        referenceRate.sourceCode,
      p_reference_exchange_rate_date:
        referenceRate.referenceDate,
      p_reference_exchange_rate_fetched_at:
        referenceRate.fetchedAt,
      p_reference_exchange_rate_source_url:
        referenceRate.sourceUrl,
      p_reference_exchange_rate_is_fallback:
        referenceRate.isFallback,
      p_terms_text: termsText,
      p_started_at:
        valueObject.object_kind === "service_type"
          ? startedAt
          : null,
      p_ended_at:
        valueObject.object_kind === "service_type"
          ? endedAt
          : null,
    },
  );

  if (error) {
    return NextResponse.json(
      {
        error: "Gift-certificate draft could not be created",
        errorCode: normalizeRpcErrorCode(
          error.message,
          error.code,
        ),
      },
      { status: 400 },
    );
  }

  const payload = data as RpcPayload | null;
  const activityEventId =
    payload?.activityEvent?.id ??
    payload?.giftCertificateTerms?.activity_event_id ??
    null;

  if (!activityEventId) {
    return NextResponse.json(
      { error: "Gift-certificate draft returned no activity" },
      { status: 500 },
    );
  }

  const contentLocalization = await localizeEntityContent({
    userId: actorContext.appUserId,
    actorId: actorContext.actorId,
    table: "activity_events",
    entityId: activityEventId,
    sourceLocaleHint: locale,
    fields: {
      title: valueObject.title,
      description: valueObject.description,
      termsText,
    },
  });

  return NextResponse.json({
    ok: true,
    disposition: payload?.disposition ?? null,
    activityEventId,
    contentLocalization,
    redirectUrl: buildGiftCertificateReviewUrl(
      activityEventId,
      locale,
    ),
  });
}

import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";
import PurchaseConfirmationForm from "./PurchaseConfirmationForm";

export const dynamic = "force-dynamic";

type GeoAreaRow = {
  id: string;
  parent_id: string | null;
  area_type: string;
  country_code: string | null;
  name: string;
  slug: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  source: string | null;
  created_by_user_id: string | null;
  is_active: boolean;
};

type OrganizationLocation = {
  id: string;
  organization_id: string;
  country_code: string | null;
  city: string | null;
  district: string | null;
  address_visibility: string | null;
  latitude: number | null;
  longitude: number | null;
  is_primary: boolean | null;
  is_active: boolean | null;
  created_at: string;
  cityGeoStatus?: string | null;
  cityGeoSource?: string | null;
  cityGeoIsOwnSuggestion?: boolean;
  districtGeoStatus?: string | null;
  districtGeoSource?: string | null;
  districtGeoIsOwnSuggestion?: boolean;
  geoStatusLabel?: string | null;
};

type Organization = {
  id: string;
  organization_name: string;
  organization_type: string;
  description?: string | null;
  status: string;
  country_code?: string | null;
  default_currency?: string | null;
  created_by_user_id?: string | null;
  created_at?: string | null;
};

type ValueObject = {
  id: string;
  organization_id?: string | null;
  value_type: string;
  title: string;
  description: string | null;
  unit_type: string | null;
  default_price: number | null;
  default_currency: string | null;
  default_duration_minutes: number | null;
  status: string;
  created_at: string;
};

type OfferItemValueObject = {
  id: string;
  title: string;
  value_type: string;
};

type OfferItem = {
  id: string;
  value_object_id: string;
  quantity: number | string;
  unit_price: number | string | null;
  total_price: number | string | null;
  currency: string | null;
  is_required: boolean;
  status: string;
  value_objects?: OfferItemValueObject | OfferItemValueObject[] | null;
};

type Offer = {
  id: string;
  organization_id?: string | null;
  offer_type: string;
  title: string;
  description: string | null;

  price: number | null;
  regular_price: number | null;
  currency: string | null;

  is_paid: boolean | null;
  is_free: boolean | null;

  is_discount_active: boolean | null;
  discount_type: string | null;
  discount_value: number | null;
  discount_starts_at: string | null;
  discount_ends_at: string | null;
  lowest_price_30_days: number | null;
  lowest_price_30_days_currency: string | null;
  lowest_price_30_days_period_start: string | null;
  lowest_price_30_days_period_end: string | null;
  discount_legal_note: string | null;

  certificate_available: boolean | null;
  certificate_payment_mode: string | null;
  certificate_points_covered_amount: number | null;
  certificate_points_price: number | null;
  certificate_money_price: number | null;
  certificate_currency: string | null;
  certificate_terms: string | null;
  certificate_validity_days: number | null;
  requires_seller_confirmation: boolean | null;
  is_transferable: boolean | null;
  is_cancellable: boolean | null;
  points_refund_policy: string | null;
  max_certificates_total: number | null;
  max_certificates_per_user: number | null;
  is_public_reward: boolean | null;

  points_currency_code: string | null;
  reference_currency: string | null;
  reference_value_per_point: number | null;
  reference_exchange_rate: number | null;
  reference_exchange_rate_source: string | null;
  reference_exchange_rate_date: string | null;

  requires_booking: boolean;
  booking_mode: string;
  default_duration_minutes: number | null;
  min_duration_minutes: number | null;
  max_duration_minutes: number | null;
  quantity_limit: number | null;
  target_receiver_type: string | null;
  status: string;
  created_at: string;
  offer_items?: OfferItem[] | null;
};

type AppUser = {
  id: string;
  auth0_sub: string;
  email?: string | null;
  name?: string | null;
};

type PageData = {
  organization: Organization | null;
  primaryLocation: OrganizationLocation | null;
  valueObjects: ValueObject[];
  offers: Offer[];
  appUser: AppUser | null;
  errorMessage: string | null;
};

type OrganizationDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function getFirstRelatedItem<T>(value: T | T[] | null | undefined) {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function normalizeCountryCode(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(normalizedValue)) {
    return null;
  }

  return normalizedValue;
}

function getDefaultCurrencyByCountryCode(countryCode: string | null | undefined) {
  const normalizedCountryCode = normalizeCountryCode(countryCode);

  if (normalizedCountryCode === "PL") {
    return "PLN";
  }

  if (normalizedCountryCode === "ES") {
    return "EUR";
  }

  if (normalizedCountryCode === "DE") {
    return "EUR";
  }

  if (normalizedCountryCode === "UA") {
    return "UAH";
  }

  if (normalizedCountryCode === "US") {
    return "USD";
  }

  if (normalizedCountryCode === "GB") {
    return "GBP";
  }

  if (normalizedCountryCode === "CZ") {
    return "CZK";
  }

  return "PLN";
}

function getEffectiveOrganizationCurrency(organization: Organization | null) {
  if (!organization) {
    return "PLN";
  }

  return (
    organization.default_currency ??
    getDefaultCurrencyByCountryCode(organization.country_code)
  );
}

function formatMoney(
  value: number | string | null | undefined,
  currency: string | null | undefined
) {
  if (value === null || value === undefined || value === "") {
    return "Not specified";
  }

  return `${value} ${currency || ""}`.trim();
}

function formatNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "Not specified";
  }

  return String(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not specified";
  }

  return new Date(value).toLocaleString();
}

function getBooleanLabel(value: boolean | null | undefined) {
  return value ? "Yes" : "No";
}

function getPaymentModeLabel(paymentMode: string | null | undefined) {
  if (paymentMode === "money_only") {
    return "Money only";
  }

  if (paymentMode === "points_only") {
    return "Points only";
  }

  if (paymentMode === "mixed") {
    return "Mixed: money + points";
  }

  return paymentMode || "Not specified";
}

function getPaymentModeStyle(paymentMode: string | null | undefined) {
  if (paymentMode === "points_only") {
    return {
      background: "#edf8f0",
      color: "#176b2c",
      border: "1px solid #bfe5c8",
    };
  }

  if (paymentMode === "mixed") {
    return {
      background: "#fff8e6",
      color: "#7a4b00",
      border: "1px solid #f0d28a",
    };
  }

  return {
    background: "#f5f5f5",
    color: "#555555",
    border: "1px solid #dddddd",
  };
}

function getDiscountTypeLabel(discountType: string | null | undefined) {
  if (discountType === "manual_price") {
    return "Manual reduced price";
  }

  if (discountType === "percent") {
    return "Percent";
  }

  if (discountType === "fixed_amount") {
    return "Fixed amount";
  }

  return discountType || "Not specified";
}

function getLocationLabel(location: OrganizationLocation | null) {
  if (!location) {
    return "Not specified";
  }

  if (location.address_visibility === "hidden") {
    return "Address hidden";
  }

  const parts = [location.country_code, location.city, location.district].filter(
    Boolean
  );

  if (parts.length === 0) {
    return "Not specified";
  }

  return parts.join(" → ");
}

function getLocationVisibilityLabel(location: OrganizationLocation | null) {
  if (!location) {
    return "Not specified";
  }

  if (location.address_visibility === "approximate") {
    return "Approximate public location";
  }

  if (location.address_visibility === "public") {
    return "Public exact location";
  }

  if (location.address_visibility === "hidden") {
    return "Hidden location";
  }

  return location.address_visibility || "Not specified";
}

function getCoordinatesLabel(location: OrganizationLocation | null) {
  if (!location) {
    return "Not specified";
  }

  if (location.address_visibility !== "public") {
    return "Not shown for approximate or hidden location";
  }

  if (location.latitude === null || location.longitude === null) {
    return "Not specified";
  }

  return `${location.latitude}, ${location.longitude}`;
}

function getLocationGeoStatusLabel(location: OrganizationLocation | null) {
  if (!location) {
    return null;
  }

  if (location.geoStatusLabel) {
    return location.geoStatusLabel;
  }

  return null;
}

function isSuggestedOrNeedsReviewGeoArea(geoArea: GeoAreaRow | null) {
  return Boolean(
    geoArea &&
      geoArea.source === "user_suggestion" &&
      (geoArea.status === "suggested" || geoArea.status === "needs_review")
  );
}

async function findGeoAreaByLocationName(input: {
  areaType: "city" | "district";
  countryCode: string | null;
  name: string | null;
  parentId?: string | null;
}) {
  if (!input.countryCode || !input.name) {
    return null;
  }

  let query = supabase
    .from("geo_areas")
    .select(
      `
      id,
      parent_id,
      area_type,
      country_code,
      name,
      slug,
      latitude,
      longitude,
      status,
      source,
      created_by_user_id,
      is_active
    `
    )
    .eq("area_type", input.areaType)
    .eq("country_code", input.countryCode)
    .eq("name", input.name)
    .eq("is_active", true)
    .limit(1);

  if (input.parentId) {
    query = query.eq("parent_id", input.parentId);
  }

  const { data, error } = await query;

  if (error) {
    return null;
  }

  return ((data ?? [])[0] as GeoAreaRow | undefined) ?? null;
}

function createPublicGeoStatusLabel(input: {
  cityGeoArea: GeoAreaRow | null;
  districtGeoArea: GeoAreaRow | null;
}) {
  const parts: string[] = [];

  if (isSuggestedOrNeedsReviewGeoArea(input.cityGeoArea)) {
    parts.push("город ожидает проверки");
  } else if (
    input.cityGeoArea &&
    input.cityGeoArea.status &&
    input.cityGeoArea.status !== "approved"
  ) {
    parts.push(`город: ${input.cityGeoArea.status}`);
  }

  if (isSuggestedOrNeedsReviewGeoArea(input.districtGeoArea)) {
    parts.push("район ожидает проверки");
  } else if (
    input.districtGeoArea &&
    input.districtGeoArea.status &&
    input.districtGeoArea.status !== "approved"
  ) {
    parts.push(`район: ${input.districtGeoArea.status}`);
  }

  if (parts.length === 0) {
    return null;
  }

  return parts.join(", ");
}

async function enrichLocationWithGeoStatus(
  location: OrganizationLocation | null
): Promise<OrganizationLocation | null> {
  if (!location) {
    return null;
  }

  const cityGeoArea = await findGeoAreaByLocationName({
    areaType: "city",
    countryCode: location.country_code,
    name: location.city,
  });

  const districtGeoArea = await findGeoAreaByLocationName({
    areaType: "district",
    countryCode: location.country_code,
    name: location.district,
    parentId: cityGeoArea?.id ?? null,
  });

  const geoStatusLabel = createPublicGeoStatusLabel({
    cityGeoArea,
    districtGeoArea,
  });

  return {
    ...location,
    cityGeoStatus: cityGeoArea?.status ?? null,
    cityGeoSource: cityGeoArea?.source ?? null,
    cityGeoIsOwnSuggestion: false,
    districtGeoStatus: districtGeoArea?.status ?? null,
    districtGeoSource: districtGeoArea?.source ?? null,
    districtGeoIsOwnSuggestion: false,
    geoStatusLabel,
  };
}

async function getOptionalAppUser(): Promise<AppUser | null> {
  const session = await auth0.getSession();

  if (!session?.user) {
    return null;
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("app_users")
    .select("*")
    .eq("auth0_sub", session.user.sub)
    .single();

  if (appUserError || !appUser) {
    return null;
  }

  return appUser as AppUser;
}

async function getOrganizationPageData(
  organizationId: string
): Promise<PageData> {
  const appUser = await getOptionalAppUser();

  const [
    organizationResult,
    locationResult,
    valueObjectsResult,
    offersResult,
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select(
        `
        id,
        organization_name,
        organization_type,
        description,
        status,
        country_code,
        default_currency,
        created_by_user_id,
        created_at
      `
      )
      .eq("id", organizationId)
      .eq("status", "active")
      .maybeSingle(),

    supabase
      .from("organization_locations")
      .select(
        `
        id,
        organization_id,
        country_code,
        city,
        district,
        address_visibility,
        latitude,
        longitude,
        is_primary,
        is_active,
        created_at
      `
      )
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1),

    supabase
      .from("value_objects")
      .select(
        `
        id,
        organization_id,
        value_type,
        title,
        description,
        unit_type,
        default_price,
        default_currency,
        default_duration_minutes,
        status,
        created_at
      `
      )
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .order("created_at", { ascending: false }),

    supabase
      .from("offers")
      .select(
        `
        id,
        organization_id,
        offer_type,
        title,
        description,
        price,
        regular_price,
        currency,
        is_paid,
        is_free,
        is_discount_active,
        discount_type,
        discount_value,
        discount_starts_at,
        discount_ends_at,
        lowest_price_30_days,
        lowest_price_30_days_currency,
        lowest_price_30_days_period_start,
        lowest_price_30_days_period_end,
        discount_legal_note,
        certificate_available,
        certificate_payment_mode,
        certificate_points_covered_amount,
        certificate_points_price,
        certificate_money_price,
        certificate_currency,
        certificate_terms,
        certificate_validity_days,
        requires_seller_confirmation,
        is_transferable,
        is_cancellable,
        points_refund_policy,
        max_certificates_total,
        max_certificates_per_user,
        is_public_reward,
        points_currency_code,
        reference_currency,
        reference_value_per_point,
        reference_exchange_rate,
        reference_exchange_rate_source,
        reference_exchange_rate_date,
        requires_booking,
        booking_mode,
        default_duration_minutes,
        min_duration_minutes,
        max_duration_minutes,
        quantity_limit,
        target_receiver_type,
        status,
        created_at,
        offer_items (
          id,
          value_object_id,
          quantity,
          unit_price,
          total_price,
          currency,
          is_required,
          status,
          value_objects (
            id,
            title,
            value_type
          )
        )
      `
      )
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
  ]);

  if (organizationResult.error) {
    return {
      organization: null,
      primaryLocation: null,
      valueObjects: [],
      offers: [],
      appUser,
      errorMessage: organizationResult.error.message,
    };
  }

  if (!organizationResult.data) {
    return {
      organization: null,
      primaryLocation: null,
      valueObjects: [],
      offers: [],
      appUser,
      errorMessage: null,
    };
  }

  const organization = organizationResult.data as Organization;

  const effectiveOrganization: Organization = {
    ...organization,
    default_currency: getEffectiveOrganizationCurrency(organization),
  };

  if (locationResult.error) {
    return {
      organization: effectiveOrganization,
      primaryLocation: null,
      valueObjects: [],
      offers: [],
      appUser,
      errorMessage: locationResult.error.message,
    };
  }

  const rawPrimaryLocation =
    ((locationResult.data ?? [])[0] as OrganizationLocation | undefined) ??
    null;

  const enrichedPrimaryLocation =
    await enrichLocationWithGeoStatus(rawPrimaryLocation);

  if (valueObjectsResult.error) {
    return {
      organization: effectiveOrganization,
      primaryLocation: enrichedPrimaryLocation,
      valueObjects: [],
      offers: [],
      appUser,
      errorMessage: valueObjectsResult.error.message,
    };
  }

  if (offersResult.error) {
    return {
      organization: effectiveOrganization,
      primaryLocation: enrichedPrimaryLocation,
      valueObjects: (valueObjectsResult.data as ValueObject[] | null) ?? [],
      offers: [],
      appUser,
      errorMessage: offersResult.error.message,
    };
  }

  return {
    organization: effectiveOrganization,
    primaryLocation: enrichedPrimaryLocation,
    valueObjects: (valueObjectsResult.data as ValueObject[] | null) ?? [],
    offers: (offersResult.data as unknown as Offer[] | null) ?? [],
    appUser,
    errorMessage: null,
  };
}

export default async function OrganizationDetailsPage({
  params,
}: OrganizationDetailsPageProps) {
  const resolvedParams = await params;
  const organizationId = resolvedParams.id;

  const createValueObjectHref = `/value-objects/new?organizationId=${encodeURIComponent(
    organizationId
  )}`;
  const createOfferHref = `/offers/new?organizationId=${encodeURIComponent(
    organizationId
  )}`;
  const purchaseConfirmationsHref = `/purchase-confirmations?organizationId=${encodeURIComponent(
    organizationId
  )}`;
  const publicPurchaseHistoryHref = `/purchase-history?organizationId=${encodeURIComponent(
    organizationId
  )}`;
  const myPurchaseConfirmationsHref = "/my-purchase-confirmations";

  const {
    organization,
    primaryLocation,
    valueObjects,
    offers,
    appUser,
    errorMessage,
  } = await getOrganizationPageData(organizationId);

  const isAuthenticated = Boolean(appUser);
  const isOwner = Boolean(
    appUser && organization?.created_by_user_id === appUser.id
  );
  const organizationCurrency = getEffectiveOrganizationCurrency(organization);
  const locationGeoStatusLabel = getLocationGeoStatusLabel(primaryLocation);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        color: "#111111",
        padding: "40px 16px",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            marginBottom: "32px",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontSize: "32px",
              lineHeight: "1.2",
              fontWeight: 700,
              margin: "0 0 12px",
            }}
          >
            Карточка организации
          </h1>

          <nav
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "24px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <a href="/" style={{ color: "#2563eb" }}>
              На главную
            </a>

            <a href="/organizations" style={{ color: "#2563eb" }}>
              Каталог организаций
            </a>

            <a href={publicPurchaseHistoryHref} style={{ color: "#2563eb" }}>
              Public purchase history
            </a>

            {isAuthenticated ? (
              <a href={myPurchaseConfirmationsHref} style={{ color: "#2563eb" }}>
                My purchase confirmations
              </a>
            ) : (
              <a href="/api/auth/login" style={{ color: "#2563eb" }}>
                Войти
              </a>
            )}

            {isOwner ? (
              <>
                <a href={createValueObjectHref} style={{ color: "#2563eb" }}>
                  Create value object
                </a>

                <a href={createOfferHref} style={{ color: "#2563eb" }}>
                  Create offer
                </a>

                <a href={purchaseConfirmationsHref} style={{ color: "#2563eb" }}>
                  Seller purchase confirmations
                </a>
              </>
            ) : null}
          </nav>
        </header>

        {errorMessage ? (
          <div
            style={{
              border: "1px solid #f5c2c7",
              borderRadius: "10px",
              padding: "18px",
              background: "#f8d7da",
              color: "#842029",
            }}
          >
            {errorMessage}
          </div>
        ) : null}

        {!errorMessage && !organization ? (
          <div
            style={{
              border: "1px solid #facc15",
              borderRadius: "10px",
              padding: "18px",
              background: "#fefce8",
            }}
          >
            Organization not found or not public.
          </div>
        ) : null}

        {!errorMessage && organization ? (
          <div style={{ display: "grid", gap: "20px" }}>
            <section
              style={{
                border: "1px solid #dddddd",
                borderRadius: "12px",
                padding: "20px",
                background: "#f9fafb",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
              }}
            >
              <h2
                style={{
                  fontSize: "26px",
                  margin: "0 0 12px",
                }}
              >
                {organization.organization_name}
              </h2>

              <p style={{ margin: "0 0 6px" }}>
                <strong>Type:</strong> {organization.organization_type}
              </p>

              <p style={{ margin: "0 0 6px" }}>
                <strong>Status:</strong> {organization.status}
              </p>

              <p style={{ margin: "0 0 6px" }}>
                <strong>Location:</strong> {getLocationLabel(primaryLocation)}
              </p>

              {locationGeoStatusLabel ? (
                <p
                  style={{
                    margin: "0 0 6px",
                    color: "#92400e",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                >
                  <strong>Location status:</strong> {locationGeoStatusLabel}
                </p>
              ) : null}

              <p style={{ margin: "0 0 6px" }}>
                <strong>Address visibility:</strong>{" "}
                {getLocationVisibilityLabel(primaryLocation)}
              </p>

              <p style={{ margin: "0 0 6px" }}>
                <strong>Coordinates:</strong>{" "}
                {getCoordinatesLabel(primaryLocation)}
              </p>

              <p style={{ margin: "0 0 6px" }}>
                <strong>Country:</strong>{" "}
                {organization.country_code || "Not specified"}
              </p>

              <p style={{ margin: "0 0 6px" }}>
                <strong>Default currency:</strong> {organizationCurrency}
              </p>

              <p style={{ margin: "0 0 6px" }}>
                <strong>Description:</strong>{" "}
                {organization.description || "Not specified"}
              </p>

              <p
                style={{
                  margin: "12px 0 0",
                  color: "#666666",
                  fontSize: "14px",
                }}
              >
                ID: {organization.id}
              </p>
            </section>

            {isAuthenticated ? (
              <PurchaseConfirmationForm
                organizationId={organizationId}
                organizationDefaultCurrency={organizationCurrency}
                myPurchaseConfirmationsHref={myPurchaseConfirmationsHref}
                purchaseConfirmationsHref={purchaseConfirmationsHref}
                publicPurchaseHistoryHref={publicPurchaseHistoryHref}
              />
            ) : (
              <section
                style={{
                  border: "1px solid #bfdbfe",
                  borderRadius: "12px",
                  padding: "20px",
                  background: "#eff6ff",
                }}
              >
                <h2 style={{ margin: "0 0 10px", fontSize: "22px" }}>
                  Purchase confirmations & points
                </h2>

                <p style={{ margin: "0 0 14px", color: "#1e3a8a" }}>
                  Каталог и карточка организации доступны публично. Чтобы
                  зарегистрировать покупку, видеть свои заявки и получать points,
                  нужно войти в аккаунт.
                </p>

                <a
                  href="/api/auth/login"
                  style={{
                    color: "#2563eb",
                    textDecoration: "underline",
                    fontWeight: 700,
                  }}
                >
                  Войти и зарегистрировать покупку
                </a>
              </section>
            )}

            <section
              style={{
                border: "1px solid #dddddd",
                borderRadius: "12px",
                padding: "20px",
                background: "#ffffff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: "24px" }}>
                    Value objects
                  </h2>
                  <p style={{ margin: "6px 0 0", color: "#666666" }}>
                    Products, services and certificates connected to this
                    organization.
                  </p>
                </div>

                {isOwner ? (
                  <a
                    href={createValueObjectHref}
                    style={{
                      color: "#2563eb",
                      textDecoration: "underline",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Create value object
                  </a>
                ) : null}
              </div>

              {valueObjects.length === 0 ? (
                <p style={{ margin: 0, color: "#666666" }}>
                  No public value objects connected to this organization yet.
                </p>
              ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                  {valueObjects.map((valueObject) => (
                    <article
                      key={valueObject.id}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: "10px",
                        padding: "14px",
                        background: "#f9fafb",
                      }}
                    >
                      <h3 style={{ margin: "0 0 8px", fontSize: "20px" }}>
                        {valueObject.title}
                      </h3>

                      <p style={{ margin: "0 0 6px" }}>
                        <strong>Type:</strong> {valueObject.value_type}
                      </p>

                      <p style={{ margin: "0 0 6px" }}>
                        <strong>Price:</strong>{" "}
                        {formatMoney(
                          valueObject.default_price,
                          valueObject.default_currency
                        )}
                      </p>

                      <p style={{ margin: 0 }}>
                        <strong>Status:</strong> {valueObject.status}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section
              style={{
                border: "1px solid #dddddd",
                borderRadius: "12px",
                padding: "20px",
                background: "#ffffff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: "24px" }}>Offers</h2>
                  <p style={{ margin: "6px 0 0", color: "#666666" }}>
                    Commercial offers, certificates and rewards connected to this
                    organization.
                  </p>
                </div>

                {isOwner ? (
                  <a
                    href={createOfferHref}
                    style={{
                      color: "#2563eb",
                      textDecoration: "underline",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Create offer
                  </a>
                ) : null}
              </div>

              {offers.length === 0 ? (
                <p style={{ margin: 0, color: "#666666" }}>
                  No public offers connected to this organization yet.
                </p>
              ) : (
                <div style={{ display: "grid", gap: "16px" }}>
                  {offers.map((offer) => {
                    const paymentModeStyle = getPaymentModeStyle(
                      offer.certificate_payment_mode
                    );

                    return (
                      <article
                        key={offer.id}
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: "12px",
                          padding: "16px",
                          background: "#f9fafb",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "12px",
                            alignItems: "flex-start",
                            flexWrap: "wrap",
                            marginBottom: "12px",
                          }}
                        >
                          <div>
                            <h3 style={{ margin: "0 0 8px", fontSize: "22px" }}>
                              {offer.title}
                            </h3>

                            <p style={{ margin: 0, color: "#555555" }}>
                              {offer.offer_type} / {offer.status}
                            </p>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              flexWrap: "wrap",
                              alignItems: "center",
                            }}
                          >
                            <span
                              style={{
                                display: "inline-block",
                                borderRadius: "999px",
                                padding: "6px 10px",
                                fontSize: "13px",
                                fontWeight: 700,
                                ...paymentModeStyle,
                              }}
                            >
                              {getPaymentModeLabel(
                                offer.certificate_payment_mode
                              )}
                            </span>

                            <span
                              style={{
                                display: "inline-block",
                                borderRadius: "999px",
                                padding: "6px 10px",
                                fontSize: "13px",
                                fontWeight: 700,
                                background:
                                  offer.status === "active"
                                    ? "#edf8f0"
                                    : "#f5f5f5",
                                color:
                                  offer.status === "active"
                                    ? "#176b2c"
                                    : "#555555",
                                border:
                                  offer.status === "active"
                                    ? "1px solid #bfe5c8"
                                    : "1px solid #dddddd",
                              }}
                            >
                              {offer.status}
                            </span>
                          </div>
                        </div>

                        <section
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(190px, 1fr))",
                            gap: "12px",
                            marginBottom: "14px",
                          }}
                        >
                          <div
                            style={{
                              border: "1px solid #dddddd",
                              borderRadius: "10px",
                              padding: "12px",
                              background: "#ffffff",
                            }}
                          >
                            <div
                              style={{
                                color: "#666666",
                                marginBottom: "6px",
                              }}
                            >
                              Current price
                            </div>
                            <div style={{ fontSize: "20px", fontWeight: 700 }}>
                              {formatMoney(offer.price, offer.currency)}
                            </div>
                          </div>

                          <div
                            style={{
                              border: "1px solid #dddddd",
                              borderRadius: "10px",
                              padding: "12px",
                              background: "#ffffff",
                            }}
                          >
                            <div
                              style={{
                                color: "#666666",
                                marginBottom: "6px",
                              }}
                            >
                              Regular price
                            </div>
                            <div style={{ fontSize: "20px", fontWeight: 700 }}>
                              {formatMoney(offer.regular_price, offer.currency)}
                            </div>
                          </div>

                          <div
                            style={{
                              border: "1px solid #bfdbfe",
                              borderRadius: "10px",
                              padding: "12px",
                              background: "#eff6ff",
                            }}
                          >
                            <div
                              style={{
                                color: "#1e3a8a",
                                marginBottom: "6px",
                              }}
                            >
                              Buyer pays POINT
                            </div>
                            <div style={{ fontSize: "20px", fontWeight: 700 }}>
                              {formatMoney(
                                offer.certificate_points_price ?? 0,
                                offer.points_currency_code ?? "POINT"
                              )}
                            </div>
                          </div>

                          <div
                            style={{
                              border: "1px solid #dddddd",
                              borderRadius: "10px",
                              padding: "12px",
                              background: "#ffffff",
                            }}
                          >
                            <div
                              style={{
                                color: "#666666",
                                marginBottom: "6px",
                              }}
                            >
                              Buyer pays money
                            </div>
                            <div style={{ fontSize: "20px", fontWeight: 700 }}>
                              {formatMoney(
                                offer.certificate_money_price,
                                offer.certificate_currency ?? offer.currency
                              )}
                            </div>
                          </div>
                        </section>

                        <div
                          style={{
                            display: "grid",
                            gap: "6px",
                            marginBottom: "14px",
                          }}
                        >
                          <p style={{ margin: 0 }}>
                            <strong>Description:</strong>{" "}
                            {offer.description || "Not specified"}
                          </p>

                          <p style={{ margin: 0 }}>
                            <strong>Paid:</strong>{" "}
                            {getBooleanLabel(offer.is_paid)} /{" "}
                            <strong>Free:</strong>{" "}
                            {getBooleanLabel(offer.is_free)}
                          </p>
                        </div>

                        <section
                          style={{
                            border: "1px solid #bfdbfe",
                            borderRadius: "10px",
                            padding: "14px",
                            background: "#eff6ff",
                            marginBottom: "14px",
                            display: "grid",
                            gap: "8px",
                          }}
                        >
                          <h4
                            style={{
                              fontSize: "18px",
                              margin: 0,
                            }}
                          >
                            Certificate / reward commercial rules
                          </h4>

                          <p style={{ margin: 0 }}>
                            <strong>Certificate available:</strong>{" "}
                            {getBooleanLabel(offer.certificate_available)}
                          </p>

                          <p style={{ margin: 0 }}>
                            <strong>Automatic payment mode:</strong>{" "}
                            {getPaymentModeLabel(offer.certificate_payment_mode)}
                          </p>

                          <p style={{ margin: 0 }}>
                            <strong>Amount covered by points:</strong>{" "}
                            {formatMoney(
                              offer.certificate_points_covered_amount,
                              offer.certificate_currency ?? offer.currency
                            )}
                          </p>

                          <p style={{ margin: 0 }}>
                            <strong>Buyer will be charged:</strong>{" "}
                            {formatMoney(
                              offer.certificate_points_price ?? 0,
                              offer.points_currency_code ?? "POINT"
                            )}
                          </p>

                          <p style={{ margin: 0 }}>
                            <strong>Buyer money payment:</strong>{" "}
                            {formatMoney(
                              offer.certificate_money_price,
                              offer.certificate_currency ?? offer.currency
                            )}
                          </p>

                          <p style={{ margin: 0 }}>
                            <strong>Reference:</strong> 1{" "}
                            {offer.points_currency_code ?? "POINT"} ={" "}
                            {formatNumber(offer.reference_value_per_point ?? 1)}{" "}
                            {offer.reference_currency ?? "EUR"}
                          </p>

                          <p style={{ margin: 0 }}>
                            <strong>Exchange rate:</strong> 1{" "}
                            {offer.reference_currency ?? "EUR"} ={" "}
                            {formatNumber(offer.reference_exchange_rate)}{" "}
                            {offer.certificate_currency ?? offer.currency ?? ""}
                          </p>

                          <p style={{ margin: 0 }}>
                            <strong>Rate source:</strong>{" "}
                            {offer.reference_exchange_rate_source ??
                              "Not specified"}{" "}
                            / <strong>Rate date:</strong>{" "}
                            {offer.reference_exchange_rate_date ??
                              "Not specified"}
                          </p>

                          <p style={{ margin: 0 }}>
                            <strong>Terms:</strong>{" "}
                            {offer.certificate_terms || "Not specified"}
                          </p>

                          <p style={{ margin: 0 }}>
                            <strong>Validity days:</strong>{" "}
                            {offer.certificate_validity_days ?? "Not specified"}
                          </p>

                          <p style={{ margin: 0 }}>
                            <strong>Seller confirmation:</strong>{" "}
                            {getBooleanLabel(
                              offer.requires_seller_confirmation
                            )}{" "}
                            / <strong>Transferable:</strong>{" "}
                            {getBooleanLabel(offer.is_transferable)} /{" "}
                            <strong>Cancellable:</strong>{" "}
                            {getBooleanLabel(offer.is_cancellable)}
                          </p>

                          <p style={{ margin: 0 }}>
                            <strong>Refund policy:</strong>{" "}
                            {offer.points_refund_policy ?? "Not specified"}
                          </p>

                          <p style={{ margin: 0 }}>
                            <strong>Max total:</strong>{" "}
                            {offer.max_certificates_total ?? "Not specified"} /{" "}
                            <strong>Max per user:</strong>{" "}
                            {offer.max_certificates_per_user ??
                              "Not specified"}{" "}
                            / <strong>Public reward:</strong>{" "}
                            {getBooleanLabel(offer.is_public_reward)}
                          </p>
                        </section>

                        <section
                          style={{
                            border: "1px solid #f0d28a",
                            borderRadius: "10px",
                            padding: "14px",
                            background: "#fff8e6",
                            marginBottom: "14px",
                            display: "grid",
                            gap: "8px",
                          }}
                        >
                          <h4
                            style={{
                              fontSize: "18px",
                              margin: 0,
                            }}
                          >
                            Discount and legal price info
                          </h4>

                          <p style={{ margin: 0 }}>
                            <strong>Discount active:</strong>{" "}
                            {getBooleanLabel(offer.is_discount_active)}
                          </p>

                          <p style={{ margin: 0 }}>
                            <strong>Discount type:</strong>{" "}
                            {getDiscountTypeLabel(offer.discount_type)}
                          </p>

                          <p style={{ margin: 0 }}>
                            <strong>Discount value:</strong>{" "}
                            {formatNumber(offer.discount_value)}
                          </p>

                          <p style={{ margin: 0 }}>
                            <strong>Discount period:</strong>{" "}
                            {formatDate(offer.discount_starts_at)} →{" "}
                            {formatDate(offer.discount_ends_at)}
                          </p>

                          <p style={{ margin: 0 }}>
                            <strong>
                              Lowest price 30 days before discount:
                            </strong>{" "}
                            {formatMoney(
                              offer.lowest_price_30_days,
                              offer.lowest_price_30_days_currency ??
                                offer.currency
                            )}
                          </p>

                          <p style={{ margin: 0 }}>
                            <strong>30-day period:</strong>{" "}
                            {formatDate(
                              offer.lowest_price_30_days_period_start
                            )}{" "}
                            →{" "}
                            {formatDate(offer.lowest_price_30_days_period_end)}
                          </p>

                          <p style={{ margin: 0 }}>
                            <strong>Legal note:</strong>{" "}
                            {offer.discount_legal_note || "Not specified"}
                          </p>
                        </section>

                        <div
                          style={{
                            marginTop: "10px",
                            border: "1px solid #dddddd",
                            borderRadius: "8px",
                            padding: "10px",
                            background: "#ffffff",
                          }}
                        >
                          <strong>Items:</strong>

                          {!offer.offer_items ||
                          offer.offer_items.length === 0 ? (
                            <p style={{ margin: "6px 0 0", color: "#666666" }}>
                              No offer items.
                            </p>
                          ) : (
                            <ul
                              style={{ margin: "8px 0 0", paddingLeft: "20px" }}
                            >
                              {offer.offer_items.map((item) => {
                                const relatedValueObject = getFirstRelatedItem(
                                  item.value_objects
                                );

                                return (
                                  <li key={item.id}>
                                    {relatedValueObject?.title ??
                                      item.value_object_id}{" "}
                                    × {item.quantity} —{" "}
                                    {formatMoney(
                                      item.total_price,
                                      item.currency
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gap: "6px",
                            marginTop: "14px",
                            color: "#555555",
                            fontSize: "14px",
                          }}
                        >
                          <p style={{ margin: 0 }}>
                            <strong>Requires booking:</strong>{" "}
                            {getBooleanLabel(offer.requires_booking)}
                          </p>

                          <p style={{ margin: 0 }}>
                            <strong>Booking mode:</strong> {offer.booking_mode}
                          </p>

                          <p style={{ margin: 0 }}>
                            <strong>Default duration:</strong>{" "}
                            {offer.default_duration_minutes ?? "Not specified"}{" "}
                            minutes
                          </p>

                          <p style={{ margin: 0 }}>
                            <strong>Min duration:</strong>{" "}
                            {offer.min_duration_minutes ?? "Not specified"}{" "}
                            minutes
                          </p>

                          <p style={{ margin: 0 }}>
                            <strong>Max duration:</strong>{" "}
                            {offer.max_duration_minutes ?? "Not specified"}{" "}
                            minutes
                          </p>

                          <p style={{ margin: 0 }}>
                            <strong>Quantity limit:</strong>{" "}
                            {offer.quantity_limit ?? "Not specified"}
                          </p>

                          <p style={{ margin: 0 }}>
                            <strong>Target receiver:</strong>{" "}
                            {offer.target_receiver_type || "Not specified"}
                          </p>

                          <p style={{ margin: 0 }}>
                            <strong>Offer ID:</strong> {offer.id}
                          </p>

                          <p style={{ margin: 0 }}>
                            <strong>Created at:</strong>{" "}
                            {new Date(offer.created_at).toLocaleString()}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
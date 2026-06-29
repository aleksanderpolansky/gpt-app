import Link from "next/link";
import type { ReactNode } from "react";

import {
  getLocaleSearchParam,
  getOrganizationsMessage,
  type LocaleCode,
  type OrganizationsMessageKey,
} from "@/i18n";

import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";
import PurchaseConfirmationForm from "./PurchaseConfirmationForm";
import OrganizationLocationEditForm from "./OrganizationLocationEditForm";
import OrganizationCategoryReviewActions from "./OrganizationCategoryReviewActions";
import DirectorySuggestionRequestForm from "../../directory/components/DirectorySuggestionRequestForm";
import OrganizationHideButton from "./OrganizationHideButton";

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
  created_by_user_id?: string | null;
  organization_name: string;
  organization_type: string;
  description?: string | null;
  status: string;
  country_code?: string | null;
  default_currency?: string | null;
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

type OrganizationCurrentCategory = {
  classificationId: string;
  contextualCategoryId: string;
  categoryName: string;
  categorySlug: string;
  classificationRole: string;
  classificationStatus: string;
  sourceType: string | null;
  reviewState: string | null;
  isPrimary: boolean | null;
  updatedAt: string | null;
};

type BusinessDirectoryContextRow = {
  id: string;
};

type OrganizationCategoryOptionRow = {
  id: string;
  slug: string;
  name: string;
  sort_order: number | null;
};

type OrganizationCategoryOption = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number | null;
};

type OrganizationCategorySuggestionRequest = {
  id: string;
  user_text: string;
  proposed_category_text: string | null;
  status: string;
  admin_decision: string | null;
  ai_status: string | null;
  ai_confidence: number | null;
  request_source: string;
  ai_suggested_category_text: string | null;
  ai_suggested_contextual_category_id: string | null;
  matched_existing_category_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

type PageData = {
  organization: Organization | null;
  primaryLocation: OrganizationLocation | null;
  valueObjects: ValueObject[];
  offers: Offer[];
  categorySuggestionRequests?: OrganizationCategorySuggestionRequest[];
  currentCategory?: OrganizationCurrentCategory | null;
  categoryOptions?: OrganizationCategoryOption[];
  errorMessage: string | null;
  canEditOrganizationLocation?: boolean;
};

type OrganizationDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type OrganizationsTranslate = (key: OrganizationsMessageKey) => string;

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getOrganizationDetailLocale(
  searchParams: Record<string, string | string[] | undefined>
): LocaleCode {
  const localeValue = getSingleSearchParam(searchParams.locale);
  const params = new URLSearchParams();

  if (localeValue) {
    params.set("locale", localeValue);
  }

  return getLocaleSearchParam(params);
}

type TabItem = {
  id:
    | "overview"
    | "location"
    | "semantic"
    | "value-objects"
    | "offers"
    | "purchases"
    | "settings"
    | "danger";
  label: string;
  description: string;
  badge?: string;
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

function getPaymentModeClassName(paymentMode: string | null | undefined) {
  if (paymentMode === "points_only") {
    return "border-[#bfe5c8] bg-[#edf8f0] text-[#176b2c]";
  }

  if (paymentMode === "mixed") {
    return "border-[#f0d28a] bg-[#fff8e6] text-[#7a4b00]";
  }

  return "border-[#dfe3f1] bg-[#f8f9fd] text-[#4a4f6a]";
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

function isOwnSuggestedGeoArea(geoArea: GeoAreaRow | null, appUserId: string) {
  return Boolean(
    geoArea &&
      geoArea.source === "user_suggestion" &&
      geoArea.created_by_user_id === appUserId &&
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

function createGeoStatusLabel(input: {
  cityGeoArea: GeoAreaRow | null;
  districtGeoArea: GeoAreaRow | null;
  appUserId: string;
}) {
  const parts: string[] = [];

  if (isOwnSuggestedGeoArea(input.cityGeoArea, input.appUserId)) {
    parts.push("город ожидает проверки");
  } else if (
    input.cityGeoArea &&
    input.cityGeoArea.status &&
    input.cityGeoArea.status !== "approved"
  ) {
    parts.push(`город: ${input.cityGeoArea.status}`);
  }

  if (isOwnSuggestedGeoArea(input.districtGeoArea, input.appUserId)) {
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

async function enrichLocationWithGeoStatus(input: {
  location: OrganizationLocation | null;
  appUserId: string;
}): Promise<OrganizationLocation | null> {
  if (!input.location) {
    return null;
  }

  const cityGeoArea = await findGeoAreaByLocationName({
    areaType: "city",
    countryCode: input.location.country_code,
    name: input.location.city,
  });

  const districtGeoArea = await findGeoAreaByLocationName({
    areaType: "district",
    countryCode: input.location.country_code,
    name: input.location.district,
    parentId: cityGeoArea?.id ?? null,
  });

  const geoStatusLabel = createGeoStatusLabel({
    cityGeoArea,
    districtGeoArea,
    appUserId: input.appUserId,
  });

  return {
    ...input.location,
    cityGeoStatus: cityGeoArea?.status ?? null,
    cityGeoSource: cityGeoArea?.source ?? null,
    cityGeoIsOwnSuggestion: isOwnSuggestedGeoArea(cityGeoArea, input.appUserId),
    districtGeoStatus: districtGeoArea?.status ?? null,
    districtGeoSource: districtGeoArea?.source ?? null,
    districtGeoIsOwnSuggestion: isOwnSuggestedGeoArea(
      districtGeoArea,
      input.appUserId
    ),
    geoStatusLabel,
  };
}


function getClassificationReviewState(input: {
  evidenceJson: Record<string, unknown> | null;
  sourceType: string | null;
}) {
  const reviewState = input.evidenceJson?.review_state;

  if (typeof reviewState === "string" && reviewState.trim().length > 0) {
    return reviewState;
  }

  if (input.sourceType === "ai_suggested") {
    return "ai_candidate";
  }

  return input.sourceType;
}
async function getCurrentAppUser(): Promise<{
  appUser: AppUser | null;
  errorMessage: string | null;
}> {
  const session = await auth0.getSession();

  if (!session?.user) {
    return {
      appUser: null,
      errorMessage: "Not authenticated",
    };
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("app_users")
    .select("*")
    .eq("auth0_sub", session.user.sub)
    .single();

  if (appUserError || !appUser) {
    return {
      appUser: null,
      errorMessage: appUserError?.message ?? "App user not found",
    };
  }

  return {
    appUser: appUser as AppUser,
    errorMessage: null,
  };
}

async function getOrganizationPageData(
  organizationId: string
): Promise<PageData> {
  const { appUser, errorMessage } = await getCurrentAppUser();

  if (errorMessage) {
    return {
      organization: null,
      primaryLocation: null,
      valueObjects: [],
      offers: [],
      errorMessage,
    };
  }

  if (!appUser) {
    return {
      organization: null,
      primaryLocation: null,
      valueObjects: [],
      offers: [],
      errorMessage: "User context not found",
    };
  }

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
        created_by_user_id,
        organization_name,
        organization_type,
        description,
        status,
        country_code,
        default_currency,
        created_at
      `
      )
      .eq("id", organizationId)
      .single(),

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
      .order("created_at", { ascending: false }),
  ]);

  if (organizationResult.error) {
    return {
      organization: null,
      primaryLocation: null,
      valueObjects: [],
      offers: [],
      errorMessage: organizationResult.error.message,
    };
  }

  if (!organizationResult.data) {
    return {
      organization: null,
      primaryLocation: null,
      valueObjects: [],
      offers: [],
      errorMessage: null,
    };
  }

  if (locationResult.error) {
    return {
      organization: organizationResult.data as Organization,
      primaryLocation: null,
      valueObjects: [],
      offers: [],
      errorMessage: locationResult.error.message,
    };
  }

  const rawPrimaryLocation =
    ((locationResult.data ?? [])[0] as OrganizationLocation | undefined) ??
    null;

  const enrichedPrimaryLocation = await enrichLocationWithGeoStatus({
    location: rawPrimaryLocation,
    appUserId: appUser.id,
  });

  if (valueObjectsResult.error) {
    return {
      organization: organizationResult.data as Organization,
      primaryLocation: enrichedPrimaryLocation,
      valueObjects: [],
      offers: [],
      errorMessage: valueObjectsResult.error.message,
    };
  }

  if (offersResult.error) {
    return {
      organization: organizationResult.data as Organization,
      primaryLocation: enrichedPrimaryLocation,
      valueObjects: (valueObjectsResult.data as ValueObject[] | null) ?? [],
      offers: [],
      errorMessage: offersResult.error.message,
    };
  }

  const {
    data: categorySuggestionRequestsData,
    error: categorySuggestionRequestsError,
  } = await supabase
    .from("object_action_suggestion_requests")
    .select(
      `
      id,
      user_text,
      proposed_category_text,
      status,
      admin_decision,
      ai_status,
      ai_confidence,
      request_source,
      ai_suggested_category_text,
      ai_suggested_contextual_category_id,
      matched_existing_category_id,
      reviewed_at,
      created_at,
      updated_at
    `
    )
    .eq("entity_type", "organization")
    .eq("entity_id", organizationId)
    .eq("context_code", "business_directory")
    .in("request_source", ["organization_category_change", "api"])
    .order("created_at", { ascending: false })
    .limit(10);

  const categorySuggestionRequests =
    categorySuggestionRequestsError
      ? []
      : ((categorySuggestionRequestsData as
          | OrganizationCategorySuggestionRequest[]
          | null) ?? []);

  type CurrentClassificationRow = {
    id: string;
    contextual_category_id: string | null;
    classification_role: string;
    status: string;
    source_type: string | null;
    evidence_json: Record<string, unknown> | null;
    is_primary: boolean | null;
    updated_at: string | null;
  };

  type CurrentCategoryRow = {
    id: string;
    slug: string;
    name: string;
  };

  const {
    data: currentClassificationData,
    error: currentClassificationError,
  } = await supabase
    .from("entity_classifications")
    .select(
      `
      id,
      contextual_category_id,
      classification_role,
      status,
      source_type,
      evidence_json,
      is_primary,
      updated_at
    `
    )
    .eq("entity_type", "organization")
    .eq("entity_id", organizationId)
    .eq("classification_role", "primary")
    .in("status", ["approved", "published"])
    .eq("is_primary", true)
    .order("updated_at", { ascending: false })
    .limit(1);

  const currentClassificationRows =
    (currentClassificationData as CurrentClassificationRow[] | null) ?? [];

  const currentClassification =
    currentClassificationError || currentClassificationRows.length === 0
      ? null
      : currentClassificationRows[0];

  let currentCategory: OrganizationCurrentCategory | null = null;

  if (currentClassification?.contextual_category_id) {
    const { data: currentCategoryData } = await supabase
      .from("contextual_categories")
      .select(
        `
        id,
        slug,
        name
      `
      )
      .eq("id", currentClassification.contextual_category_id)
      .maybeSingle();

    const currentCategoryRow =
      currentCategoryData as CurrentCategoryRow | null;

    if (currentCategoryRow) {
      currentCategory = {
        classificationId: currentClassification.id,
        contextualCategoryId: currentCategoryRow.id,
        categoryName: currentCategoryRow.name,
        categorySlug: currentCategoryRow.slug,
        classificationRole: currentClassification.classification_role,
        classificationStatus: currentClassification.status,
        sourceType: currentClassification.source_type,
        reviewState: getClassificationReviewState({
          evidenceJson: currentClassification.evidence_json,
          sourceType: currentClassification.source_type,
        }),
        isPrimary: currentClassification.is_primary,
        updatedAt: currentClassification.updated_at,
      };
    }
  }

  let categoryOptions: OrganizationCategoryOption[] = [];

  const { data: businessDirectoryContextData } = await supabase
    .from("contexts")
    .select("id")
    .eq("code", "business_directory")
    .maybeSingle();

  const businessDirectoryContext =
    businessDirectoryContextData as BusinessDirectoryContextRow | null;

  if (businessDirectoryContext?.id) {
    const { data: categoryOptionsData, error: categoryOptionsError } =
      await supabase
        .from("contextual_categories")
        .select("id, slug, name, sort_order")
        .eq("context_id", businessDirectoryContext.id)
        .eq("is_active", true)
        .in("status", ["approved", "published"])
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

    if (!categoryOptionsError) {
      const categoryRows =
        (categoryOptionsData as OrganizationCategoryOptionRow[] | null) ?? [];

      categoryOptions = categoryRows.map((category) => ({
        id: category.id,
        slug: category.slug,
        name: category.name,
        sortOrder: category.sort_order,
      }));
    }
  }

  const organization = organizationResult.data as Organization;

  return {
    organization,
    primaryLocation: enrichedPrimaryLocation,
    valueObjects: (valueObjectsResult.data as ValueObject[] | null) ?? [],
    offers: (offersResult.data as unknown as Offer[] | null) ?? [],
    categorySuggestionRequests: categorySuggestionRequests,
    currentCategory: currentCategory,
    categoryOptions: categoryOptions,
    errorMessage: null,
    canEditOrganizationLocation: organization.created_by_user_id === appUser.id,
  };
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#edf0f7] bg-white px-4 py-3">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8b91aa]">
        {label}
      </div>
      <div className="mt-1 text-[14px] font-semibold text-[#1a1d2e]">
        {value}
      </div>
    </div>
  );
}

function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "blue" | "green" | "amber" | "red";
}) {
  const toneClassName = {
    neutral: "border-[#dfe3f1] bg-[#f8f9fd] text-[#4a4f6a]",
    blue: "border-[#dfe4ff] bg-[#eef2ff] text-[#3b6ef8]",
    green: "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]",
    amber: "border-[#fde68a] bg-[#fffbeb] text-[#92400e]",
    red: "border-[#fecaca] bg-[#fff1f2] text-[#b42318]",
  }[tone];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[12px] font-bold ${toneClassName}`}
    >
      {children}
    </span>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        {eyebrow ? (
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#8b91aa]">
            {eyebrow}
          </div>
        ) : null}
        <h2 className="text-[24px] font-bold tracking-[-0.03em] text-[#111827]">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 max-w-[760px] text-[14px] leading-6 text-[#5a5f7a]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[18px] border border-dashed border-[#dfe3f1] bg-[#f8f9fd] p-6">
      <h3 className="text-[18px] font-bold text-[#343854]">{title}</h3>
      <p className="mt-2 text-[14px] leading-6 text-[#7c8099]">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[22px] border border-[rgba(0,0,0,0.07)] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)] ${className}`}
    >
      {children}
    </section>
  );
}

function getTabInputId(tabId: TabItem["id"]) {
  return `org-detail-tab-${tabId}`;
}

function TabRadio({ tab, defaultChecked = false }: { tab: TabItem; defaultChecked?: boolean }) {
  return (
    <input
      id={getTabInputId(tab.id)}
      name="org-detail-tabs"
      type="radio"
      defaultChecked={defaultChecked}
      className="org-detail-tab-radio"
    />
  );
}

function TabLabel({ tab }: { tab: TabItem }) {
  return (
    <label
      htmlFor={getTabInputId(tab.id)}
      className="org-detail-tab-label group flex cursor-pointer items-start justify-between gap-3 rounded-2xl border border-transparent px-4 py-3 text-left transition hover:border-[#dfe4ff] hover:bg-[#f8f9fd]"
    >
      <span>
        <span className="block text-[14px] font-bold text-[#343854]">
          {tab.label}
        </span>
        <span className="mt-1 block text-[12px] leading-5 text-[#7c8099]">
          {tab.description}
        </span>
      </span>
      {tab.badge ? (
        <span className="rounded-full border border-[#dfe4ff] bg-[#eef2ff] px-2.5 py-1 text-[11px] font-bold text-[#3b6ef8]">
          {tab.badge}
        </span>
      ) : null}
    </label>
  );
}

function TabPanel({
  id,
  children,
}: {
  id: TabItem["id"];
  children: ReactNode;
}) {
  return (
    <div data-org-detail-panel={id} className="org-detail-panel">
      {children}
    </div>
  );
}

export default async function OrganizationDetailsPage({
  params,
  searchParams,
}: OrganizationDetailsPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const locale = getOrganizationDetailLocale(resolvedSearchParams);
  const t: OrganizationsTranslate = (key) => getOrganizationsMessage(key, locale);
  const localeSuffix = `?locale=${locale}`;
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
  const organizationsHref = `/organizations${localeSuffix}`;
  const deletedOrganizationsHref = `/organizations/deleted${localeSuffix}`;

  const {
    organization,
    primaryLocation,
    valueObjects,
    offers,
    categorySuggestionRequests = [],
    currentCategory = null,
    categoryOptions = [],
    errorMessage,
    canEditOrganizationLocation = false,
  } = await getOrganizationPageData(organizationId);

  const locationGeoStatusLabel = getLocationGeoStatusLabel(primaryLocation);

  const activeCategorySuggestionRequests = categorySuggestionRequests.filter(
    (request) =>
      request.status === "draft" ||
      request.status === "suggested" ||
      request.status === "needs_review"
  );

  const tabs: TabItem[] = [
    {
      id: "overview",
      label: "Overview",
      description: "Главная информация",
    },
    {
      id: "location",
      label: "Location",
      description: "Город, район, координаты",
    },
    {
      id: "semantic",
      label: "Semantic / AI",
      description: "AI-категория и уточнения",
      badge: activeCategorySuggestionRequests.length
        ? String(activeCategorySuggestionRequests.length)
        : undefined,
    },
    {
      id: "value-objects",
      label: "Value Objects",
      description: "Товары и услуги",
      badge: String(valueObjects.length),
    },
    {
      id: "offers",
      label: "Offers",
      description: "Коммерческие условия",
      badge: String(offers.length),
    },
    {
      id: "purchases",
      label: "Purchases",
      description: "Подтверждения покупок",
    },
    {
      id: "settings",
      label: "Settings",
      description: "Настройки карточки",
    },
    {
      id: "danger",
      label: "Danger zone",
      description: "Архивирование / удаление",
    },
  ];

  return (
    <main className="min-h-full bg-[#f5f6fb] px-4 py-6 text-[#1a1d2e]">
      <style>{`
        .org-detail-tab-radio {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .org-detail-layout {
          display: grid;
          gap: 20px;
          align-items: start;
        }

        .org-detail-tabs-sidebar {
          width: 100%;
        }

        .org-detail-main-content {
          min-width: 0;
        }

        @media (min-width: 1024px) {
          .org-detail-layout {
            grid-template-columns: 280px minmax(0, 1fr);
          }

          .org-detail-tabs-sidebar {
            width: 280px;
            position: sticky;
            top: 96px;
          }
        }

        @media (min-width: 1440px) {
          .org-detail-layout {
            grid-template-columns: 300px minmax(0, 1fr);
          }

          .org-detail-tabs-sidebar {
            width: 300px;
          }
        }

        .org-detail-panel {
          display: none;
        }

        #org-detail-tab-overview:checked ~ .org-detail-shell [data-org-detail-panel="overview"],
        #org-detail-tab-location:checked ~ .org-detail-shell [data-org-detail-panel="location"],
        #org-detail-tab-semantic:checked ~ .org-detail-shell [data-org-detail-panel="semantic"],
        #org-detail-tab-value-objects:checked ~ .org-detail-shell [data-org-detail-panel="value-objects"],
        #org-detail-tab-offers:checked ~ .org-detail-shell [data-org-detail-panel="offers"],
        #org-detail-tab-purchases:checked ~ .org-detail-shell [data-org-detail-panel="purchases"],
        #org-detail-tab-settings:checked ~ .org-detail-shell [data-org-detail-panel="settings"],
        #org-detail-tab-danger:checked ~ .org-detail-shell [data-org-detail-panel="danger"] {
          display: block;
        }

        #org-detail-tab-overview:checked ~ .org-detail-shell label[for="org-detail-tab-overview"],
        #org-detail-tab-location:checked ~ .org-detail-shell label[for="org-detail-tab-location"],
        #org-detail-tab-semantic:checked ~ .org-detail-shell label[for="org-detail-tab-semantic"],
        #org-detail-tab-value-objects:checked ~ .org-detail-shell label[for="org-detail-tab-value-objects"],
        #org-detail-tab-offers:checked ~ .org-detail-shell label[for="org-detail-tab-offers"],
        #org-detail-tab-purchases:checked ~ .org-detail-shell label[for="org-detail-tab-purchases"],
        #org-detail-tab-settings:checked ~ .org-detail-shell label[for="org-detail-tab-settings"],
        #org-detail-tab-danger:checked ~ .org-detail-shell label[for="org-detail-tab-danger"] {
          border-color: #dfe4ff;
          background: #eef2ff;
          box-shadow: 0 10px 24px rgba(59, 110, 248, 0.10);
        }

        #org-detail-tab-overview:checked ~ .org-detail-shell label[for="org-detail-tab-overview"] span:first-child span:first-child,
        #org-detail-tab-location:checked ~ .org-detail-shell label[for="org-detail-tab-location"] span:first-child span:first-child,
        #org-detail-tab-semantic:checked ~ .org-detail-shell label[for="org-detail-tab-semantic"] span:first-child span:first-child,
        #org-detail-tab-value-objects:checked ~ .org-detail-shell label[for="org-detail-tab-value-objects"] span:first-child span:first-child,
        #org-detail-tab-offers:checked ~ .org-detail-shell label[for="org-detail-tab-offers"] span:first-child span:first-child,
        #org-detail-tab-purchases:checked ~ .org-detail-shell label[for="org-detail-tab-purchases"] span:first-child span:first-child,
        #org-detail-tab-settings:checked ~ .org-detail-shell label[for="org-detail-tab-settings"] span:first-child span:first-child,
        #org-detail-tab-danger:checked ~ .org-detail-shell label[for="org-detail-tab-danger"] span:first-child span:first-child {
          color: #3b6ef8;
        }
      `}</style>

      <div className="mx-auto grid w-full max-w-[1180px] gap-5">
        {tabs.map((tab, index) => (
          <TabRadio key={tab.id} tab={tab} defaultChecked={index === 0} />
        ))}

        <div className="org-detail-shell grid gap-5">
          <header className="rounded-[24px] border border-[rgba(0,0,0,0.07)] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#8b91aa]">
                  Commercial core / Organization workspace
                </div>

                <h1 className="text-[32px] font-bold tracking-[-0.04em] text-[#111827]">
                  {organization?.organization_name ?? "Organization details"}
                </h1>

                <p className="mt-2 max-w-[780px] text-[14px] leading-6 text-[#5a5f7a]">
                  {organization?.description ??
                    "Карточка предприятия объединяет профиль, локацию, публичную категорию, товары/услуги, offers, подтверждения покупок и настройки."}
                </p>

                <p className="mt-4 max-w-[760px] text-[12px] font-medium leading-5 text-[#8b91aa]">
                  Подробности профиля, статус, локация, валюта и публичная категория
                  находятся во вкладках Overview, Location и Semantic / AI.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Link
                  href={organizationsHref}
                  className="rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50"
                >
                  {t("organizations.nav.myOrganizations")}
                </Link>

                {organization ? (
                  <>
                    <Link
                      href={createValueObjectHref}
                      className="rounded-xl border border-[#dfe4ff] bg-[#eef2ff] px-4 py-3 text-[13px] font-bold text-[#3b6ef8] transition hover:bg-[#e4eaff]"
                    >
                      {t("organizations.actions.addService")}
                    </Link>
                    <Link
                      href={createOfferHref}
                      className="rounded-xl bg-[#3b6ef8] px-4 py-3 text-[13px] font-bold text-white shadow-[0_10px_20px_rgba(59,110,248,0.24)] transition hover:bg-[#2f5fe3]"
                    >
                      {t("organizations.actions.createOffer")}
                    </Link>
                    <OrganizationHideButton
                      organizationId={organization.id}
                      organizationName={organization.organization_name}
                      redirectHref={deletedOrganizationsHref}
                      labels={{
                        hide: t("organizations.actions.hideOrganization"),
                        hiding: t("organizations.actions.hidingOrganization"),
                        confirm: t("organizations.hide.confirm"),
                        error: t("organizations.hide.error"),
                      }}
                    />
                  </>
                ) : null}
              </div>
            </div>
          </header>

          {errorMessage ? (
            <Card className="border-[#fecaca] bg-[#fff1f2]">
              <h2 className="text-[22px] font-bold text-[#b42318]">
                Не удалось загрузить предприятие
              </h2>
              <p className="mt-2 text-[14px] leading-6 text-[#b42318]">
                {errorMessage}
              </p>
            </Card>
          ) : null}

          {!errorMessage && !organization ? (
            <Card className="border-[#fde68a] bg-[#fffbeb]">
              <h2 className="text-[22px] font-bold text-[#92400e]">
                Organization not found or access denied
              </h2>
              <p className="mt-2 text-[14px] leading-6 text-[#92400e]">
                Проверьте ссылку или вернитесь к списку ваших предприятий.
              </p>
              <Link
                href="/organizations"
                className="mt-4 inline-flex rounded-xl bg-[#3b6ef8] px-4 py-3 text-[13px] font-bold text-white transition hover:bg-[#2f5fe3]"
              >
                Вернуться к организациям
              </Link>
            </Card>
          ) : null}

          {!errorMessage && organization ? (
            <div className="org-detail-layout">
              <aside className="org-detail-tabs-sidebar rounded-[24px] border border-[rgba(0,0,0,0.07)] bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
                <div className="px-3 pb-3 pt-2">
                  <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8b91aa]">
                    Разделы
                  </div>
                  <p className="mt-1 text-[12px] leading-5 text-[#7c8099]">
                    Нажмите вкладку, чтобы открыть нужный блок карточки.
                  </p>
                </div>

                <nav className="grid gap-1">
                  {tabs.map((tab) => (
                    <TabLabel key={tab.id} tab={tab} />
                  ))}
                </nav>
              </aside>

              <div className="org-detail-main-content">
                <TabPanel id="overview">
                  <Card>
                    <SectionHeader
                      eyebrow="Overview"
                      title="Краткая карточка предприятия"
                      description="Основная информация, которая нужна владельцу, маркетологу, QA и будущему каталогу."
                    />

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <DetailRow label="Type" value={organization.organization_type} />
                      <DetailRow label="Status" value={organization.status} />
                      <DetailRow
                        label="Location"
                        value={getLocationLabel(primaryLocation)}
                      />
                      <DetailRow
                        label="Address visibility"
                        value={getLocationVisibilityLabel(primaryLocation)}
                      />
                      <DetailRow
                        label="Country"
                        value={organization.country_code || "Not specified"}
                      />
                      <DetailRow
                        label="Default currency"
                        value={organization.default_currency || "Not specified"}
                      />
                      <DetailRow
                        label="Value Objects"
                        value={String(valueObjects.length)}
                      />
                      <DetailRow label="Offers" value={String(offers.length)} />
                      <DetailRow
                        label="Category requests"
                        value={String(categorySuggestionRequests.length)}
                      />
                    </div>

                    <div className="mt-5 rounded-2xl border border-[#edf0f7] bg-[#f8f9fd] p-5">
                      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8b91aa]">
                        Description
                      </div>
                      <p className="mt-2 text-[14px] leading-6 text-[#343854]">
                        {organization.description || "Not specified"}
                      </p>
                    </div>

                    <div className="mt-5 rounded-2xl border border-[#edf0f7] bg-white p-5">
                      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8b91aa]">
                        Technical ID
                      </div>
                      <p className="mt-2 break-all font-mono text-[12px] text-[#5a5f7a]">
                        {organization.id}
                      </p>
                    </div>
                  </Card>
                </TabPanel>

                <TabPanel id="location">
                  <Card>
                    <SectionHeader
                      eyebrow="Location"
                      title="Локация предприятия"
                      description="Здесь отображается публичная или приблизительная локация, координаты и статус geo-suggestion."
                    />

                    <div className="grid gap-3 md:grid-cols-2">
                      <DetailRow
                        label="Location"
                        value={getLocationLabel(primaryLocation)}
                      />
                      <DetailRow
                        label="Address visibility"
                        value={getLocationVisibilityLabel(primaryLocation)}
                      />
                      <DetailRow
                        label="Coordinates"
                        value={getCoordinatesLabel(primaryLocation)}
                      />
                      <DetailRow
                        label="Location status"
                        value={locationGeoStatusLabel ?? "No review flags"}
                      />
                    </div>

                    {canEditOrganizationLocation ? (
                      <div className="mt-5 rounded-[20px] border border-[#dbeafe] bg-[#f8fbff] p-5">
                        <OrganizationLocationEditForm
                          organizationId={organization.id}
                          initialCountryCode={
                            primaryLocation?.country_code ??
                            organization.country_code ??
                            null
                          }
                          initialCity={primaryLocation?.city ?? null}
                          initialDistrict={primaryLocation?.district ?? null}
                          initialAddressVisibility={
                            primaryLocation?.address_visibility ?? "approximate"
                          }
                          initialLatitude={primaryLocation?.latitude ?? null}
                          initialLongitude={primaryLocation?.longitude ?? null}
                        />
                      </div>
                    ) : (
                      <EmptyState
                        title="Редактирование недоступно"
                        description="Текущий пользователь не является владельцем предприятия или не имеет прав на изменение локации."
                      />
                    )}
                  </Card>
                </TabPanel>

                <TabPanel id="semantic">
                  <div className="grid gap-5">
                    <Card>
                      <SectionHeader
                        eyebrow="Semantic / AI"
                        title="AI-категория предприятия и заявки на уточнение"
                        description="AI может назначить рабочую публичную категорию сразу. Если источник ai_suggested, это AI candidate: категория уже записана и видна в Semantic Cloud, но её можно подтвердить, заменить или убрать."
                      />

                      <div className="rounded-[20px] border border-[#bbf7d0] bg-[#f0fdf4] p-5">
                        <h3 className="text-[18px] font-bold text-[#166534]">
                          Текущая категория предприятия
                        </h3>

                        {currentCategory ? (
                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <DetailRow
                              label="Category"
                              value={currentCategory.categoryName}
                            />
                            <DetailRow
                              label="Slug"
                              value={currentCategory.categorySlug}
                            />
                            <DetailRow
                              label="Status"
                              value={currentCategory.classificationStatus}
                            />
                            <DetailRow
                              label="Role"
                              value={currentCategory.classificationRole}
                            />
                            <DetailRow
                              label="Source"
                              value={currentCategory.sourceType ?? "not specified"}
                            />
                            <DetailRow
                              label="Review state"
                              value={currentCategory.reviewState ?? "not specified"}
                            />
                            <DetailRow
                              label="Updated"
                              value={currentCategory.updatedAt ?? "not specified"}
                            />
                          </div>
                        ) : (
                          <p className="mt-2 text-[14px] leading-6 text-[#166534]">
                            Категория предприятия ещё не назначена. После создания
                            предприятия серверная AI-категоризация должна добавить
                            primary category как AI candidate.
                          </p>
                        )}
                      </div>

                      {canEditOrganizationLocation ? (
                        <OrganizationCategoryReviewActions
                          organizationId={organization.id}
                          currentCategory={currentCategory}
                          categoryOptions={categoryOptions}
                        />
                      ) : null}

                      {canEditOrganizationLocation ? (
                        <div className="mt-5">
                          {activeCategorySuggestionRequests.length > 0 ? (
                            <div className="mb-4 rounded-2xl border border-[#fde68a] bg-[#fffbeb] p-4 text-[13px] leading-6 text-[#92400e]">
                              <strong>
                                There is already an active category correction request.
                              </strong>{" "}
                              Active requests:{" "}
                              <strong>{activeCategorySuggestionRequests.length}</strong>.
                              You can still send another request, but it may duplicate
                              an existing pending review.
                            </div>
                          ) : null}

                          <div className="rounded-[20px] border border-[#edf0f7] bg-white p-5">
                            <DirectorySuggestionRequestForm
                              title="Suggest organization category correction"
                              description="Describe what this organization really does and suggest a better category. The current AI category can be confirmed, corrected or removed through governance/review flow."
                              textareaLabel="Organization activity description"
                              textareaPlaceholder="Example: This company provides AI automation consulting, workflow optimization and business process improvement for small companies."
                              submitButtonLabel="Send category correction request"
                              successTitle="Category correction request sent."
                              entityType="organization"
                              entityId={organization.id}
                              requestSource="organization_category_change"
                              locale="en"
                              contextCode="business_directory"
                              initialText={organization.description ?? ""}
                              showProposedCategoryField={true}
                            />
                          </div>
                        </div>
                      ) : null}
                    </Card>

                    <Card>
                      <SectionHeader
                        eyebrow="Semantic request history"
                        title="Recent category correction requests"
                        description="Last requests submitted for this organization. AI-assigned category is already attached as candidate; requests help confirm, replace or remove it."
                      />

                      {categorySuggestionRequests.length === 0 ? (
                        <EmptyState
                          title="No category correction requests yet"
                          description="Заявки на уточнение категории пока не отправлялись."
                        />
                      ) : (
                        <div className="grid gap-3">
                          {categorySuggestionRequests.map((request) => (
                            <article
                              key={request.id}
                              className="rounded-2xl border border-[#dbeafe] bg-[#f8fbff] p-4"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-[16px] font-bold text-[#111827]">
                                  {request.proposed_category_text ??
                                    request.ai_suggested_category_text ??
                                    "Category not specified"}
                                </h3>
                                <StatusPill tone="blue">{request.status}</StatusPill>
                                <StatusPill>
                                  AI: {request.ai_status ?? "not_requested"}
                                </StatusPill>
                              </div>

                              <p className="mt-3 text-[13px] leading-6 text-[#374151]">
                                {request.user_text}
                              </p>

                              <div className="mt-3 grid gap-2 text-[12px] text-[#6b7280] md:grid-cols-2">
                                <span>ID: {request.id}</span>
                                <span>Source: {request.request_source}</span>
                                <span>Created: {request.created_at}</span>
                                <span>Updated: {request.updated_at}</span>
                                {request.admin_decision ? (
                                  <span>
                                    Admin decision: {request.admin_decision}
                                  </span>
                                ) : null}
                                {request.reviewed_at ? (
                                  <span>Reviewed: {request.reviewed_at}</span>
                                ) : null}
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </Card>
                  </div>
                </TabPanel>

                <TabPanel id="value-objects">
                  <Card>
                    <SectionHeader
                      eyebrow="Value Objects"
                      title="Товары и услуги предприятия"
                      description="Value Object является базой для offer и сертификата, а также самостоятельным информационным объектом."
                      action={
                        <Link
                          href={createValueObjectHref}
                          className="rounded-xl bg-[#3b6ef8] px-4 py-3 text-[13px] font-bold text-white shadow-[0_10px_20px_rgba(59,110,248,0.24)] transition hover:bg-[#2f5fe3]"
                        >
                          Create value object
                        </Link>
                      }
                    />

                    {valueObjects.length === 0 ? (
                      <EmptyState
                        title="No value objects connected"
                        description="Добавьте первый товар или услугу предприятия как enterprise-owned Value Object."
                        action={
                          <Link
                            href={createValueObjectHref}
                            className="inline-flex rounded-xl bg-[#3b6ef8] px-4 py-3 text-[13px] font-bold text-white transition hover:bg-[#2f5fe3]"
                          >
                            Create value object
                          </Link>
                        }
                      />
                    ) : (
                      <div className="grid gap-3">
                        {valueObjects.map((valueObject) => (
                          <article
                            key={valueObject.id}
                            className="rounded-[18px] border border-[#edf0f7] bg-[#f8f9fd] p-5"
                          >
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <h3 className="text-[20px] font-bold tracking-[-0.02em] text-[#111827]">
                                  {valueObject.title}
                                </h3>
                                <p className="mt-2 text-[14px] leading-6 text-[#5a5f7a]">
                                  {valueObject.description ?? "No description"}
                                </p>
                              </div>
                              <StatusPill
                                tone={valueObject.status === "active" ? "green" : "neutral"}
                              >
                                {valueObject.status}
                              </StatusPill>
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-3">
                              <DetailRow label="Type" value={valueObject.value_type} />
                              <DetailRow
                                label="Price"
                                value={formatMoney(
                                  valueObject.default_price,
                                  valueObject.default_currency
                                )}
                              />
                              <DetailRow
                                label="Duration"
                                value={
                                  valueObject.default_duration_minutes
                                    ? `${valueObject.default_duration_minutes} min`
                                    : "Not specified"
                                }
                              />
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </Card>
                </TabPanel>

                <TabPanel id="offers">
                  <Card>
                    <SectionHeader
                      eyebrow="Offers"
                      title="Коммерческие условия и сертификаты"
                      description="Offer в текущей логике является базой/коммерческими условиями для создания сертификатов, а не универсальной корзиной."
                      action={
                        <Link
                          href={createOfferHref}
                          className="rounded-xl bg-[#3b6ef8] px-4 py-3 text-[13px] font-bold text-white shadow-[0_10px_20px_rgba(59,110,248,0.24)] transition hover:bg-[#2f5fe3]"
                        >
                          Create offer
                        </Link>
                      }
                    />

                    {offers.length === 0 ? (
                      <EmptyState
                        title="No offers connected"
                        description="Создайте offer после добавления хотя бы одного Value Object."
                        action={
                          <Link
                            href={createOfferHref}
                            className="inline-flex rounded-xl bg-[#3b6ef8] px-4 py-3 text-[13px] font-bold text-white transition hover:bg-[#2f5fe3]"
                          >
                            Create offer
                          </Link>
                        }
                      />
                    ) : (
                      <div className="grid gap-4">
                        {offers.map((offer) => (
                          <article
                            key={offer.id}
                            className="rounded-[20px] border border-[#edf0f7] bg-[#f8f9fd] p-5"
                          >
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <h3 className="text-[22px] font-bold tracking-[-0.03em] text-[#111827]">
                                  {offer.title}
                                </h3>
                                <p className="mt-2 text-[14px] leading-6 text-[#5a5f7a]">
                                  {offer.description || "Not specified"}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <StatusPill>{offer.offer_type}</StatusPill>
                                  <StatusPill
                                    tone={offer.status === "active" ? "green" : "neutral"}
                                  >
                                    {offer.status}
                                  </StatusPill>
                                  <span
                                    className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[12px] font-bold ${getPaymentModeClassName(
                                      offer.certificate_payment_mode
                                    )}`}
                                  >
                                    {getPaymentModeLabel(
                                      offer.certificate_payment_mode
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                              <DetailRow
                                label="Current price"
                                value={formatMoney(offer.price, offer.currency)}
                              />
                              <DetailRow
                                label="Regular price"
                                value={formatMoney(offer.regular_price, offer.currency)}
                              />
                              <DetailRow
                                label="Buyer pays POINT"
                                value={formatMoney(
                                  offer.certificate_points_price ?? 0,
                                  offer.points_currency_code ?? "POINT"
                                )}
                              />
                              <DetailRow
                                label="Buyer pays money"
                                value={formatMoney(
                                  offer.certificate_money_price,
                                  offer.certificate_currency ?? offer.currency
                                )}
                              />
                            </div>

                            <div className="mt-5 grid gap-4 xl:grid-cols-2">
                              <div className="rounded-2xl border border-[#dbeafe] bg-[#eff6ff] p-4">
                                <h4 className="text-[16px] font-bold text-[#1e3a8a]">
                                  Certificate / reward commercial rules
                                </h4>
                                <div className="mt-3 grid gap-2 text-[13px] leading-6 text-[#1e3a8a]">
                                  <p>
                                    <strong>Certificate available:</strong>{" "}
                                    {getBooleanLabel(offer.certificate_available)}
                                  </p>
                                  <p>
                                    <strong>Amount covered by points:</strong>{" "}
                                    {formatMoney(
                                      offer.certificate_points_covered_amount,
                                      offer.certificate_currency ?? offer.currency
                                    )}
                                  </p>
                                  <p>
                                    <strong>Reference:</strong> 1{" "}
                                    {offer.points_currency_code ?? "POINT"} ={" "}
                                    {formatNumber(
                                      offer.reference_value_per_point ?? 1
                                    )}{" "}
                                    {offer.reference_currency ?? "EUR"}
                                  </p>
                                  <p>
                                    <strong>Terms:</strong>{" "}
                                    {offer.certificate_terms || "Not specified"}
                                  </p>
                                  <p>
                                    <strong>Validity days:</strong>{" "}
                                    {offer.certificate_validity_days ??
                                      "Not specified"}
                                  </p>
                                  <p>
                                    <strong>Seller confirmation:</strong>{" "}
                                    {getBooleanLabel(
                                      offer.requires_seller_confirmation
                                    )}
                                  </p>
                                  <p>
                                    <strong>Transferable:</strong>{" "}
                                    {getBooleanLabel(offer.is_transferable)} /{" "}
                                    <strong>Cancellable:</strong>{" "}
                                    {getBooleanLabel(offer.is_cancellable)}
                                  </p>
                                  <p>
                                    <strong>Refund policy:</strong>{" "}
                                    {offer.points_refund_policy ?? "Not specified"}
                                  </p>
                                </div>
                              </div>

                              <div className="rounded-2xl border border-[#fde68a] bg-[#fffbeb] p-4">
                                <h4 className="text-[16px] font-bold text-[#92400e]">
                                  Discount and legal price info
                                </h4>
                                <div className="mt-3 grid gap-2 text-[13px] leading-6 text-[#92400e]">
                                  <p>
                                    <strong>Discount active:</strong>{" "}
                                    {getBooleanLabel(offer.is_discount_active)}
                                  </p>
                                  <p>
                                    <strong>Discount type:</strong>{" "}
                                    {getDiscountTypeLabel(offer.discount_type)}
                                  </p>
                                  <p>
                                    <strong>Discount value:</strong>{" "}
                                    {formatNumber(offer.discount_value)}
                                  </p>
                                  <p>
                                    <strong>Discount period:</strong>{" "}
                                    {formatDate(offer.discount_starts_at)} →{" "}
                                    {formatDate(offer.discount_ends_at)}
                                  </p>
                                  <p>
                                    <strong>Lowest price 30 days:</strong>{" "}
                                    {formatMoney(
                                      offer.lowest_price_30_days,
                                      offer.lowest_price_30_days_currency ??
                                        offer.currency
                                    )}
                                  </p>
                                  <p>
                                    <strong>Legal note:</strong>{" "}
                                    {offer.discount_legal_note || "Not specified"}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="mt-5 rounded-2xl border border-[#edf0f7] bg-white p-4">
                              <h4 className="text-[16px] font-bold text-[#343854]">
                                Items
                              </h4>

                              {!offer.offer_items || offer.offer_items.length === 0 ? (
                                <p className="mt-2 text-[14px] text-[#7c8099]">
                                  No offer items.
                                </p>
                              ) : (
                                <ul className="mt-3 grid gap-2 text-[14px] text-[#4a4f6a]">
                                  {offer.offer_items.map((item) => {
                                    const relatedValueObject = getFirstRelatedItem(
                                      item.value_objects
                                    );

                                    return (
                                      <li key={item.id}>
                                        {relatedValueObject?.title ??
                                          item.value_object_id}{" "}
                                        × {item.quantity} —{" "}
                                        {formatMoney(item.total_price, item.currency)}
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </div>

                            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                              <DetailRow
                                label="Requires booking"
                                value={getBooleanLabel(offer.requires_booking)}
                              />
                              <DetailRow label="Booking mode" value={offer.booking_mode} />
                              <DetailRow
                                label="Default duration"
                                value={
                                  offer.default_duration_minutes
                                    ? `${offer.default_duration_minutes} minutes`
                                    : "Not specified"
                                }
                              />
                              <DetailRow
                                label="Min duration"
                                value={
                                  offer.min_duration_minutes
                                    ? `${offer.min_duration_minutes} minutes`
                                    : "Not specified"
                                }
                              />
                              <DetailRow
                                label="Max duration"
                                value={
                                  offer.max_duration_minutes
                                    ? `${offer.max_duration_minutes} minutes`
                                    : "Not specified"
                                }
                              />
                              <DetailRow
                                label="Quantity limit"
                                value={offer.quantity_limit ?? "Not specified"}
                              />
                              <DetailRow
                                label="Target receiver"
                                value={offer.target_receiver_type || "Not specified"}
                              />
                              <DetailRow
                                label="Created at"
                                value={new Date(offer.created_at).toLocaleString()}
                              />
                              <DetailRow label="Offer ID" value={offer.id} />
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </Card>
                </TabPanel>

                <TabPanel id="purchases">
                  <div className="grid gap-5">
                    <Card>
                      <SectionHeader
                        eyebrow="Purchases"
                        title="Подтверждения покупок"
                        description="Покупатель может зарегистрировать внешнюю покупку, а продавец позже подтверждает или отклоняет её."
                      />
                      <PurchaseConfirmationForm
                        organizationId={organizationId}
                        organizationDefaultCurrency={
                          organization.default_currency ?? null
                        }
                        myPurchaseConfirmationsHref={myPurchaseConfirmationsHref}
                        purchaseConfirmationsHref={purchaseConfirmationsHref}
                        publicPurchaseHistoryHref={publicPurchaseHistoryHref}
                      />
                    </Card>

                    <Card>
                      <SectionHeader
                        eyebrow="Purchase links"
                        title="Связанные журналы покупок"
                        description="Быстрые переходы к текущим страницам коммерческого ядра."
                      />

                      <div className="grid gap-3 md:grid-cols-3">
                        <Link
                          href={myPurchaseConfirmationsHref}
                          className="rounded-2xl border border-[#dfe3f1] bg-[#f8f9fd] p-4 text-[14px] font-bold text-[#343854] transition hover:border-[#dfe4ff] hover:bg-[#eef2ff] hover:text-[#3b6ef8]"
                        >
                          My purchase confirmations
                        </Link>
                        <Link
                          href={purchaseConfirmationsHref}
                          className="rounded-2xl border border-[#dfe3f1] bg-[#f8f9fd] p-4 text-[14px] font-bold text-[#343854] transition hover:border-[#dfe4ff] hover:bg-[#eef2ff] hover:text-[#3b6ef8]"
                        >
                          Seller purchase confirmations
                        </Link>
                        <Link
                          href={publicPurchaseHistoryHref}
                          className="rounded-2xl border border-[#dfe3f1] bg-[#f8f9fd] p-4 text-[14px] font-bold text-[#343854] transition hover:border-[#dfe4ff] hover:bg-[#eef2ff] hover:text-[#3b6ef8]"
                        >
                          Public purchase history
                        </Link>
                      </div>
                    </Card>
                  </div>
                </TabPanel>

                <TabPanel id="settings">
                  <Card>
                    <SectionHeader
                      eyebrow="Settings"
                      title="Настройки предприятия"
                      description="Этот раздел пока не открывает новых write-flow. Он показывает безопасную карту будущих настроек."
                    />

                    <div className="grid gap-3">
                      <div className="rounded-2xl border border-[#edf0f7] bg-[#f8f9fd] p-5">
                        <h3 className="text-[17px] font-bold text-[#343854]">
                          Public profile settings
                        </h3>
                        <p className="mt-2 text-[14px] leading-6 text-[#7c8099]">
                          Будущая настройка публичности профиля, логотипа,
                          фото, описания и карточки каталога. Сейчас не изменяется
                          этим UI-only блоком.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-[#edf0f7] bg-[#f8f9fd] p-5">
                        <h3 className="text-[17px] font-bold text-[#343854]">
                          Access and owner checks
                        </h3>
                        <p className="mt-2 text-[14px] leading-6 text-[#7c8099]">
                          Текущий canEdit marker:{" "}
                          <strong>
                            {canEditOrganizationLocation ? "owner/edit allowed" : "read only"}
                          </strong>
                          . Отдельный audit доступа для /organizations/[id] нужен
                          позже перед delete/archive.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-[#edf0f7] bg-[#f8f9fd] p-5">
                        <h3 className="text-[17px] font-bold text-[#343854]">
                          Media / logo
                        </h3>
                        <p className="mt-2 text-[14px] leading-6 text-[#7c8099]">
                          Фото и логотип предприятия остаются будущим шагом после
                          проверки schema/API на logo_url, image_url, avatar_url
                          или отдельную media/storage model.
                        </p>
                      </div>
                    </div>
                  </Card>
                </TabPanel>

                <TabPanel id="danger">
                  <Card className="border-[#fecaca]">
                    <SectionHeader
                      eyebrow="Danger zone"
                      title="Архивирование или удаление предприятия"
                      description="Этот раздел намеренно не выполняет DB write. Реальное удаление будет только после отдельного backend/schema gate."
                    />

                    <div className="rounded-[20px] border border-[#fecaca] bg-[#fff1f2] p-5">
                      <h3 className="text-[18px] font-bold text-[#b42318]">
                        Delete flow is not enabled in this UI-only step
                      </h3>
                      <p className="mt-2 text-[14px] leading-6 text-[#b42318]">
                        Безопасный следующий вариант — soft delete / archive,
                        потому что предприятие может быть связано с Value Objects,
                        offers, certificates, purchase confirmations, public semantic
                        cloud и category classifications.
                      </p>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <button
                          type="button"
                          disabled
                          className="cursor-not-allowed rounded-xl border border-[#fecaca] bg-white px-4 py-3 text-[13px] font-bold text-[#b42318] opacity-60"
                        >
                          Archive organization — future gate
                        </button>
                        <button
                          type="button"
                          disabled
                          className="cursor-not-allowed rounded-xl bg-[#b42318] px-4 py-3 text-[13px] font-bold text-white opacity-50"
                        >
                          Hard delete disabled
                        </button>
                      </div>

                      <p className="mt-4 text-[12px] leading-5 text-[#b42318]">
                        Required future approval phrase: ORGANIZATION_DELETE_GATE_APPROVED.
                        Перед этим нужно проверить API, schema, dependencies,
                        access policy, RLS/GRANT and audit behavior.
                      </p>
                    </div>
                  </Card>
                </TabPanel>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

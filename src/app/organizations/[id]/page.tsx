import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import {
  getLocaleSearchParam,
  getOrganizationsMessage,
  type LocaleCode,
  type OrganizationsMessageKey,
} from "@/i18n";

import {
  getOrganizationDetailMessage,
  type OrganizationDetailMessageKey,
} from "@/i18n/messages/organization-detail";
import {
  getOfferTypeLabel,
  getOrganizationTypeLabel,
} from "@/i18n/messages/system-labels";

import { resolveActiveActorContext } from "../../../../lib/actor-context";
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
  owner_actor_id?: string | null;
  organization_name: string;
  organization_type: string;
  public_slug?: string | null;
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
type OrganizationDetailTranslate = (key: OrganizationDetailMessageKey) => string;

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
  currency: string | null | undefined,
  fallbackLabel = "Not specified",
) {
  if (value === null || value === undefined || value === "") {
    return fallbackLabel;
  }

  return `${value} ${currency || ""}`.trim();
}

function formatNumber(
  value: number | string | null | undefined,
  fallbackLabel = "Not specified",
) {
  if (value === null || value === undefined || value === "") {
    return fallbackLabel;
  }

  return String(value);
}

function formatDate(
  value: string | null | undefined,
  fallbackLabel = "Not specified",
) {
  if (!value) {
    return fallbackLabel;
  }

  return new Date(value).toLocaleString();
}

function formatPlacedDate(
  value: string | null | undefined,
  locale: LocaleCode,
  fallbackLabel: string,
) {
  if (!value) {
    return fallbackLabel;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallbackLabel;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(date);
}

function getBooleanLabel(
  value: boolean | null | undefined,
  yesLabel = "Yes",
  noLabel = "No",
) {
  return value ? yesLabel : noLabel;
}

type PaymentModeLabels = {
  moneyOnly: string;
  pointsOnly: string;
  mixed: string;
  notSpecified: string;
};

function getPaymentModeLabel(
  paymentMode: string | null | undefined,
  labels?: PaymentModeLabels,
) {
  if (paymentMode === "money_only") {
    return labels?.moneyOnly ?? "Money only";
  }

  if (paymentMode === "points_only") {
    return labels?.pointsOnly ?? "Points only";
  }

  if (paymentMode === "mixed") {
    return labels?.mixed ?? "Mixed: money + points";
  }

  return paymentMode || labels?.notSpecified || "Not specified";
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

type DiscountTypeLabels = {
  manualPrice: string;
  percent: string;
  fixedAmount: string;
  notSpecified: string;
};

function getDiscountTypeLabel(
  discountType: string | null | undefined,
  labels?: DiscountTypeLabels,
) {
  if (discountType === "manual_price") {
    return labels?.manualPrice ?? "Manual reduced price";
  }

  if (discountType === "percent") {
    return labels?.percent ?? "Percent";
  }

  if (discountType === "fixed_amount") {
    return labels?.fixedAmount ?? "Fixed amount";
  }

  return discountType || labels?.notSpecified || "Not specified";
}

function getLocationLabel(
  location: OrganizationLocation | null,
  fallbackLabel = "Not specified",
  addressHiddenLabel = "Address hidden",
) {
  if (!location) {
    return fallbackLabel;
  }

  if (location.address_visibility === "hidden") {
    return addressHiddenLabel;
  }

  const parts = [location.country_code, location.city, location.district].filter(
    Boolean,
  );

  if (parts.length === 0) {
    return fallbackLabel;
  }

  return parts.join(" → ");
}

type LocationVisibilityLabels = {
  notSpecified: string;
  approximate: string;
  public: string;
  hidden: string;
};

function getLocationVisibilityLabel(
  location: OrganizationLocation | null,
  labels?: LocationVisibilityLabels,
) {
  if (!location) {
    return labels?.notSpecified ?? "Not specified";
  }

  if (location.address_visibility === "approximate") {
    return labels?.approximate ?? "Approximate public location";
  }

  if (location.address_visibility === "public") {
    return labels?.public ?? "Public exact location";
  }

  if (location.address_visibility === "hidden") {
    return labels?.hidden ?? "Hidden location";
  }

  return location.address_visibility || labels?.notSpecified || "Not specified";
}

function getCoordinatesLabel(
  location: OrganizationLocation | null,
  fallbackLabel = "Not specified",
) {
  if (!location) {
    return fallbackLabel;
  }

  if (location.latitude === null || location.longitude === null) {
    return fallbackLabel;
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
async function getCurrentActorContext(): Promise<{
  actorContext: Awaited<ReturnType<typeof resolveActiveActorContext>> | null;
  errorMessage: string | null;
}> {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return {
      actorContext: null,
      errorMessage: "Not authenticated",
    };
  }

  try {
    return {
      actorContext: await resolveActiveActorContext(session.user.sub),
      errorMessage: null,
    };
  } catch (error) {
    return {
      actorContext: null,
      errorMessage:
        error instanceof Error
          ? error.message
          : "Could not resolve active actor context",
    };
  }
}

async function getOrganizationPageData(
  organizationId: string
): Promise<PageData> {
  const { actorContext, errorMessage } = await getCurrentActorContext();

  if (errorMessage) {
    return {
      organization: null,
      primaryLocation: null,
      valueObjects: [],
      offers: [],
      errorMessage,
    };
  }

  if (!actorContext) {
    return {
      organization: null,
      primaryLocation: null,
      valueObjects: [],
      offers: [],
      errorMessage: "Actor context not found",
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
        owner_actor_id,
        organization_name,
        organization_type,
        public_slug,
        description,
        status,
        country_code,
        default_currency,
        created_at
      `
      )
      .eq("id", organizationId)
      .eq("owner_actor_id", actorContext.actorId)
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
    appUserId: actorContext.appUserId,
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
    canEditOrganizationLocation:
      organization.owner_actor_id === actorContext.actorId,
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

type OwnerPublicPreviewMessageKey =
  | "eyebrow"
  | "title"
  | "description"
  | "openPublic"
  | "edit"
  | "manage"
  | "category"
  | "location"
  | "descriptionLabel"
  | "type"
  | "offers"
  | "certificates"
  | "noCategory"
  | "adminBelow"
  | "visibleToGuests"
  | "ownerOnly"
  | "noOffers"
  | "createOffer"
  | "placed";

const OWNER_PUBLIC_PREVIEW_MESSAGES: Record<
  LocaleCode,
  Record<OwnerPublicPreviewMessageKey, string>
> = {
  en: {
    eyebrow: "Public profile preview",
    title: "Guest view first",
    description: "This owner page now starts with the same kind of public profile preview a visitor should see. Edit controls are visible only in owner mode.",
    openPublic: "Open public page",
    edit: "Edit",
    manage: "Manage",
    category: "Category",
    location: "Location",
    descriptionLabel: "Description",
    type: "Type",
    offers: "Offers",
    certificates: "Certificates",
    noCategory: "Category not confirmed",
    adminBelow: "Owner/admin settings continue below this preview.",
    visibleToGuests: "Visible to guests",
    ownerOnly: "Owner-only controls",
    noOffers: "No offers yet",
    createOffer: "Create offer",
    placed: "Placed",
  },
  ru: {
    eyebrow: "\u041f\u0440\u0435\u0434\u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440 \u043f\u0443\u0431\u043b\u0438\u0447\u043d\u043e\u0433\u043e \u043f\u0440\u043e\u0444\u0438\u043b\u044f",
    title: "\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0432\u0438\u0434 \u0433\u043e\u0441\u0442\u044f",
    description: "\u0421\u0442\u0440\u0430\u043d\u0438\u0446\u0430 \u0432\u043b\u0430\u0434\u0435\u043b\u044c\u0446\u0430 \u043d\u0430\u0447\u0438\u043d\u0430\u0435\u0442\u0441\u044f \u0441 \u043f\u0443\u0431\u043b\u0438\u0447\u043d\u043e\u0433\u043e \u0432\u0438\u0434\u0430 \u043f\u0440\u0435\u0434\u043f\u0440\u0438\u044f\u0442\u0438\u044f. \u041a\u043d\u043e\u043f\u043a\u0438 \u0440\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u044f \u0432\u0438\u0434\u0438\u0442 \u0442\u043e\u043b\u044c\u043a\u043e \u0432\u043b\u0430\u0434\u0435\u043b\u0435\u0446.",
    openPublic: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043f\u0443\u0431\u043b\u0438\u0447\u043d\u0443\u044e \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0443",
    edit: "\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c",
    manage: "\u0423\u043f\u0440\u0430\u0432\u043b\u044f\u0442\u044c",
    category: "\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f",
    location: "\u041b\u043e\u043a\u0430\u0446\u0438\u044f",
    descriptionLabel: "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435",
    type: "\u0422\u0438\u043f",
    offers: "\u041e\u0444\u0444\u0435\u0440\u044b",
    certificates: "\u0421\u0435\u0440\u0442\u0438\u0444\u0438\u043a\u0430\u0442\u044b",
    noCategory: "\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f \u043d\u0435 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0430",
    adminBelow: "\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438 \u0432\u043b\u0430\u0434\u0435\u043b\u044c\u0446\u0430 \u0438 \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0430 \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0430\u044e\u0442\u0441\u044f \u043d\u0438\u0436\u0435.",
    visibleToGuests: "\u0412\u0438\u0434\u043d\u043e \u0433\u043e\u0441\u0442\u044f\u043c",
    ownerOnly: "\u0422\u043e\u043b\u044c\u043a\u043e \u0434\u043b\u044f \u0432\u043b\u0430\u0434\u0435\u043b\u044c\u0446\u0430",
    noOffers: "\u041e\u0444\u0444\u0435\u0440\u043e\u0432 \u043f\u043e\u043a\u0430 \u043d\u0435\u0442",
    createOffer: "\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u043e\u0444\u0444\u0435\u0440",
    placed: "\u0420\u0430\u0437\u043c\u0435\u0449\u0435\u043d\u043e",
  },
  uk: {
    eyebrow: "\u041f\u043e\u043f\u0435\u0440\u0435\u0434\u043d\u0456\u0439 \u043f\u0435\u0440\u0435\u0433\u043b\u044f\u0434 \u043f\u0443\u0431\u043b\u0456\u0447\u043d\u043e\u0433\u043e \u043f\u0440\u043e\u0444\u0456\u043b\u044e",
    title: "\u0421\u043f\u043e\u0447\u0430\u0442\u043a\u0443 \u0432\u0438\u0433\u043b\u044f\u0434 \u0433\u043e\u0441\u0442\u044f",
    description: "\u0421\u0442\u043e\u0440\u0456\u043d\u043a\u0430 \u0432\u043b\u0430\u0441\u043d\u0438\u043a\u0430 \u043f\u043e\u0447\u0438\u043d\u0430\u0454\u0442\u044c\u0441\u044f \u0437 \u043f\u0443\u0431\u043b\u0456\u0447\u043d\u043e\u0433\u043e \u0432\u0438\u0433\u043b\u044f\u0434\u0443 \u043f\u0456\u0434\u043f\u0440\u0438\u0454\u043c\u0441\u0442\u0432\u0430. \u041a\u043d\u043e\u043f\u043a\u0438 \u0440\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u043d\u043d\u044f \u0431\u0430\u0447\u0438\u0442\u044c \u0442\u0456\u043b\u044c\u043a\u0438 \u0432\u043b\u0430\u0441\u043d\u0438\u043a.",
    openPublic: "\u0412\u0456\u0434\u043a\u0440\u0438\u0442\u0438 \u043f\u0443\u0431\u043b\u0456\u0447\u043d\u0443 \u0441\u0442\u043e\u0440\u0456\u043d\u043a\u0443",
    edit: "\u0420\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u0442\u0438",
    manage: "\u041a\u0435\u0440\u0443\u0432\u0430\u0442\u0438",
    category: "\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u044f",
    location: "\u041b\u043e\u043a\u0430\u0446\u0456\u044f",
    descriptionLabel: "\u041e\u043f\u0438\u0441",
    type: "\u0422\u0438\u043f",
    offers: "\u041f\u0440\u043e\u043f\u043e\u0437\u0438\u0446\u0456\u0457",
    certificates: "\u0421\u0435\u0440\u0442\u0438\u0444\u0456\u043a\u0430\u0442\u0438",
    noCategory: "\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u044e \u043d\u0435 \u043f\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043d\u043e",
    adminBelow: "\u041d\u0430\u043b\u0430\u0448\u0442\u0443\u0432\u0430\u043d\u043d\u044f \u0432\u043b\u0430\u0441\u043d\u0438\u043a\u0430 \u0439 \u0430\u0434\u043c\u0456\u043d\u0456\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0430 \u043f\u0440\u043e\u0434\u043e\u0432\u0436\u0443\u044e\u0442\u044c\u0441\u044f \u043d\u0438\u0436\u0447\u0435.",
    visibleToGuests: "\u0412\u0438\u0434\u043d\u043e \u0433\u043e\u0441\u0442\u044f\u043c",
    ownerOnly: "\u0422\u0456\u043b\u044c\u043a\u0438 \u0434\u043b\u044f \u0432\u043b\u0430\u0441\u043d\u0438\u043a\u0430",
    noOffers: "\u041f\u0440\u043e\u043f\u043e\u0437\u0438\u0446\u0456\u0439 \u043f\u043e\u043a\u0438 \u043d\u0435\u043c\u0430\u0454",
    createOffer: "\u0421\u0442\u0432\u043e\u0440\u0438\u0442\u0438 \u043f\u0440\u043e\u043f\u043e\u0437\u0438\u0446\u0456\u044e",
    placed: "\u0420\u043e\u0437\u043c\u0456\u0449\u0435\u043d\u043e",
  },
  pl: {
    eyebrow: "Podgl\u0105d profilu publicznego",
    title: "Najpierw widok go\u015bcia",
    description: "Strona w\u0142a\u015bciciela zaczyna si\u0119 od publicznego podgl\u0105du firmy. Przyciski edycji s\u0105 widoczne tylko dla w\u0142a\u015bciciela.",
    openPublic: "Otw\u00f3rz stron\u0119 publiczn\u0105",
    edit: "Edytuj",
    manage: "Zarz\u0105dzaj",
    category: "Kategoria",
    location: "Lokalizacja",
    descriptionLabel: "Opis",
    type: "Typ",
    offers: "Oferty",
    certificates: "Certyfikaty",
    noCategory: "Kategoria niepotwierdzona",
    adminBelow: "Ustawienia w\u0142a\u015bciciela i administratora s\u0105 ni\u017cej.",
    visibleToGuests: "Widoczne dla go\u015bci",
    ownerOnly: "Tylko dla w\u0142a\u015bciciela",
    noOffers: "Nie ma jeszcze ofert",
    createOffer: "Utw\u00f3rz ofert\u0119",
    placed: "Zamieszczono",
  },
  es: {
    eyebrow: "Vista previa del perfil p\u00fablico",
    title: "Primero la vista del visitante",
    description: "La p\u00e1gina del propietario empieza con una vista p\u00fablica de la empresa. Los controles de edici\u00f3n solo los ve el propietario.",
    openPublic: "Abrir p\u00e1gina p\u00fablica",
    edit: "Editar",
    manage: "Gestionar",
    category: "Categor\u00eda",
    location: "Ubicaci\u00f3n",
    descriptionLabel: "Descripci\u00f3n",
    type: "Tipo",
    offers: "Ofertas",
    certificates: "Certificados",
    noCategory: "Categor\u00eda no confirmada",
    adminBelow: "Los ajustes del propietario y del administrador contin\u00faan abajo.",
    visibleToGuests: "Visible para visitantes",
    ownerOnly: "Solo propietario",
    noOffers: "A\u00fan no hay ofertas",
    createOffer: "Crear oferta",
    placed: "Publicado",
  },
  de: {
    eyebrow: "Vorschau des \u00f6ffentlichen Profils",
    title: "Zuerst die G\u00e4steansicht",
    description: "Die Inhaberseite beginnt mit der \u00f6ffentlichen Vorschau des Unternehmens. Bearbeitungssteuerungen sind nur f\u00fcr den Inhaber sichtbar.",
    openPublic: "\u00d6ffentliche Seite \u00f6ffnen",
    edit: "Bearbeiten",
    manage: "Verwalten",
    category: "Kategorie",
    location: "Standort",
    descriptionLabel: "Beschreibung",
    type: "Typ",
    offers: "Angebote",
    certificates: "Gutscheine",
    noCategory: "Kategorie nicht best\u00e4tigt",
    adminBelow: "Inhaber- und Admin-Einstellungen folgen darunter.",
    visibleToGuests: "F\u00fcr G\u00e4ste sichtbar",
    ownerOnly: "Nur f\u00fcr Inhaber",
    noOffers: "Noch keine Angebote",
    createOffer: "Angebot erstellen",
    placed: "Eingestellt",
  },
  cs: {
    eyebrow: "N\u00e1hled ve\u0159ejn\u00e9ho profilu",
    title: "Nejd\u0159\u00edv pohled hosta",
    description: "Str\u00e1nka vlastn\u00edka za\u010d\u00edn\u00e1 ve\u0159ejn\u00fdm n\u00e1hledem podniku. Ovl\u00e1dac\u00ed prvky \u00faprav vid\u00ed jen vlastn\u00edk.",
    openPublic: "Otev\u0159\u00edt ve\u0159ejnou str\u00e1nku",
    edit: "Upravit",
    manage: "Spravovat",
    category: "Kategorie",
    location: "Lokalita",
    descriptionLabel: "Popis",
    type: "Typ",
    offers: "Nab\u00eddky",
    certificates: "Certifik\u00e1ty",
    noCategory: "Kategorie nepotvrzena",
    adminBelow: "Nastaven\u00ed vlastn\u00edka a administr\u00e1tora pokra\u010duj\u00ed n\u00ed\u017ee.",
    visibleToGuests: "Viditeln\u00e9 pro hosty",
    ownerOnly: "Pouze vlastn\u00edk",
    noOffers: "Zat\u00edm \u017e\u00e1dn\u00e9 nab\u00eddky",
    createOffer: "Vytvo\u0159it nab\u00eddku",
    placed: "Zve\u0159ejn\u011bno",
  },
};

function getOwnerPublicPreviewMessage(
  locale: LocaleCode,
  key: OwnerPublicPreviewMessageKey,
) {
  return OWNER_PUBLIC_PREVIEW_MESSAGES[locale]?.[key] ?? OWNER_PUBLIC_PREVIEW_MESSAGES.en[key];
}

function buildPublicOrganizationSlug(organization: Organization) {
  if (organization.public_slug) {
    return organization.public_slug;
  }

  return `organization-${organization.id.slice(0, 8)}`;
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
  const td: OrganizationDetailTranslate = (key) =>
    getOrganizationDetailMessage(key, locale);
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

  if (!organization && !errorMessage) {
    notFound();
  }

  const locationGeoStatusLabel = getLocationGeoStatusLabel(primaryLocation);

  const activeCategorySuggestionRequests = categorySuggestionRequests.filter(
    (request) =>
      request.status === "draft" ||
      request.status === "suggested" ||
      request.status === "needs_review"
  );

  const notSpecifiedLabel = td("common.notSpecified");
  const yesLabel = td("common.yes");
  const noLabel = td("common.no");
  const statusLabels: Record<string, string> = {
    active: td("status.active"),
    archived: td("status.archived"),
    draft: td("status.draft"),
    hidden: td("status.hidden"),
  };
  const getStatusLabel = (value: string | null | undefined) =>
    value ? statusLabels[value] ?? value : notSpecifiedLabel;
  const paymentModeLabels: PaymentModeLabels = {
    moneyOnly: td("paymentMode.moneyOnly"),
    pointsOnly: td("paymentMode.pointsOnly"),
    mixed: td("paymentMode.mixed"),
    notSpecified: notSpecifiedLabel,
  };
  const discountTypeLabels: DiscountTypeLabels = {
    manualPrice: td("discountType.manualPrice"),
    percent: td("discountType.percent"),
    fixedAmount: td("discountType.fixedAmount"),
    notSpecified: notSpecifiedLabel,
  };
  const locationVisibilityLabels: LocationVisibilityLabels = {
    notSpecified: notSpecifiedLabel,
    approximate: td("location.visibility.approximate"),
    public: td("location.visibility.public"),
    hidden: td("location.visibility.hidden"),
  };
  const formatMoneyValue = (
    value: number | string | null | undefined,
    currency: string | null | undefined,
  ) => formatMoney(value, currency, notSpecifiedLabel);
  const formatNumberValue = (value: number | string | null | undefined) =>
    formatNumber(value, notSpecifiedLabel);
  const formatDateValue = (value: string | null | undefined) =>
    formatDate(value, notSpecifiedLabel);
  const formatMinutesValue = (value: number | null | undefined) =>
    value ? `${value} ${td("common.minutesShort")}` : notSpecifiedLabel;

  const publicProfileHref = organization
    ? `/directory/${buildPublicOrganizationSlug(organization)}${localeSuffix}`
    : `/directory${localeSuffix}`;
  const ownerPreviewText = (key: OwnerPublicPreviewMessageKey) =>
    getOwnerPublicPreviewMessage(locale, key);
  const ownerPreviewCategoryLabel =
    currentCategory?.categoryName ?? ownerPreviewText("noCategory");
  const ownerPreviewLocationLabel = getLocationLabel(
    primaryLocation,
    notSpecifiedLabel,
    td("common.addressHidden"),
  );
  const ownerPreviewOffers = offers.slice(0, 3);
  const placedDate = formatPlacedDate(
    organization?.created_at,
    locale,
    notSpecifiedLabel,
  );

  const tabs: TabItem[] = [
    {
      id: "overview",
      label: td("tabs.overview"),
      description: td("tabs.overviewDescription"),
    },
    {
      id: "location",
      label: td("tabs.location"),
      description: td("tabs.locationDescription"),
    },
    {
      id: "semantic",
      label: td("tabs.semantic"),
      description: td("tabs.semanticDescription"),
      badge: activeCategorySuggestionRequests.length
        ? String(activeCategorySuggestionRequests.length)
        : undefined,
    },
    {
      id: "value-objects",
      label: td("tabs.valueObjects"),
      description: td("tabs.valueObjectsDescription"),
      badge: String(valueObjects.length),
    },
    {
      id: "offers",
      label: td("tabs.offers"),
      description: td("tabs.offersDescription"),
      badge: String(offers.length),
    },
    {
      id: "purchases",
      label: td("tabs.purchases"),
      description: td("tabs.purchasesDescription"),
    },
    {
      id: "settings",
      label: td("tabs.settings"),
      description: td("tabs.settingsDescription"),
    },
    {
      id: "danger",
      label: td("tabs.danger"),
      description: td("tabs.dangerDescription"),
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
          {!errorMessage && organization ? (
            <section
              id="owner-public-preview"
              className="rounded-[24px] border border-[rgba(0,0,0,0.07)] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
            >
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#8b91aa]">
                    {ownerPreviewText("eyebrow")}
                  </div>
                  <h2 className="text-[28px] font-bold tracking-[-0.035em] text-[#111827]">
                    {ownerPreviewText("title")}
                  </h2>
                  <p className="mt-2 max-w-[780px] text-[14px] leading-6 text-[#5a5f7a]">
                    {ownerPreviewText("description")}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Link
                    href={publicProfileHref}
                    className="rounded-xl border border-[#dfe4ff] bg-[#eef2ff] px-4 py-3 text-[13px] font-bold text-[#3b6ef8] transition hover:bg-[#e4eaff]"
                  >
                    {ownerPreviewText("openPublic")}
                  </Link>
                  <a
                    href="#owner-admin-workspace"
                    className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-[13px] font-bold text-[#92400e] transition hover:bg-[#fef3c7]"
                  >
                    {ownerPreviewText("adminBelow")}
                  </a>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
                <article className="rounded-[22px] border border-[#edf0f7] bg-[#f8f9fd] p-5">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#dfe4ff] bg-[#eef2ff] px-3 py-1.5 text-[12px] font-semibold text-[#3b6ef8]">
                      {ownerPreviewCategoryLabel}
                    </span>
                    <a
                      href="#owner-admin-workspace"
                      className="rounded-full border border-[#fde68a] bg-[#fffbeb] px-3 py-1.5 text-[12px] font-bold text-[#92400e]"
                    >
                      {ownerPreviewText("edit")}
                    </a>
                    <span className="rounded-full border border-[#e5e7eb] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#4a4f6a]">
                      {ownerPreviewLocationLabel}
                    </span>
                    <a
                      href="#owner-admin-workspace"
                      className="rounded-full border border-[#fde68a] bg-[#fffbeb] px-3 py-1.5 text-[12px] font-bold text-[#92400e]"
                    >
                      {ownerPreviewText("edit")}
                    </a>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <h3 className="text-[24px] font-bold tracking-[-0.03em] text-[#111827]">
                      {organization.organization_name}
                    </h3>
                    <a
                      href="#owner-admin-workspace"
                      className="w-fit rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-[12px] font-bold text-[#92400e]"
                    >
                      {ownerPreviewText("edit")}
                    </a>
                  </div>

                  <div className="mt-4 rounded-2xl border border-[#edf0f7] bg-white p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8b91aa]">
                          {ownerPreviewText("descriptionLabel")}
                        </div>
                        <p className="mt-2 text-[14px] leading-6 text-[#343854]">
                          {organization.description || notSpecifiedLabel}
                        </p>
                      </div>
                      <a
                        href="#owner-admin-workspace"
                        className="w-fit rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-[12px] font-bold text-[#92400e]"
                      >
                        {ownerPreviewText("edit")}
                      </a>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <DetailRow
                      label={ownerPreviewText("type")}
                      value={getOrganizationTypeLabel(organization.organization_type, locale)}
                    />
                    <DetailRow
                      label={ownerPreviewText("offers")}
                      value={String(offers.length)}
                    />
                    <DetailRow
                      label={ownerPreviewText("certificates")}
                      value={String(
                        offers.filter((offer) => offer.certificate_available).length,
                      )}
                    />
                  </div>
                </article>

                <aside className="grid content-start gap-3 rounded-[22px] border border-[#edf0f7] bg-[#f8f9fd] p-5">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8b91aa]">
                    {ownerPreviewText("ownerOnly")}
                  </div>
                  <Link
                    href={createOfferHref}
                    className="rounded-xl bg-[#3b6ef8] px-4 py-3 text-center text-[13px] font-bold text-white shadow-[0_10px_20px_rgba(59,110,248,0.22)] transition hover:bg-[#2f5fe3]"
                  >
                    {ownerPreviewText("createOffer")}
                  </Link>
                  <Link
                    href={createValueObjectHref}
                    className="rounded-xl border border-[#dfe4ff] bg-white px-4 py-3 text-center text-[13px] font-bold text-[#3b6ef8] transition hover:bg-[#eef2ff]"
                  >
                    {ownerPreviewText("manage")}
                  </Link>
                  <a
                    href="#owner-admin-workspace"
                    className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-center text-[13px] font-bold text-[#92400e] transition hover:bg-[#fef3c7]"
                  >
                    {ownerPreviewText("adminBelow")}
                  </a>
                </aside>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {ownerPreviewOffers.length === 0 ? (
                  <div className="rounded-[18px] border border-dashed border-[#dfe3f1] bg-[#f8f9fd] p-5">
                    <h3 className="text-[18px] font-bold text-[#343854]">
                      {ownerPreviewText("noOffers")}
                    </h3>
                    <p className="mt-2 text-[13px] leading-5 text-[#7c8099]">
                      {ownerPreviewText("visibleToGuests")}
                    </p>
                  </div>
                ) : (
                  ownerPreviewOffers.map((offer) => (
                    <article
                      key={offer.id}
                      className="rounded-[18px] border border-[#edf0f7] bg-[#f8f9fd] p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-[17px] font-bold text-[#111827]">
                          {offer.title}
                        </h3>
                        <Link
                          href={`/offers/${offer.id}${localeSuffix}`}
                          className="text-[12px] font-bold text-[#3b6ef8]"
                        >
                          {ownerPreviewText("manage")}
                        </Link>
                      </div>
                      <p className="mt-3 line-clamp-2 text-[13px] leading-5 text-[#5a5f7a]">
                        {offer.description || notSpecifiedLabel}
                      </p>
                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        <DetailRow
                          label={td("field.currentPrice")}
                          value={formatMoneyValue(offer.price, offer.currency)}
                        />
                        <DetailRow
                          label={td("field.defaultDuration")}
                          value={formatMinutesValue(offer.default_duration_minutes)}
                        />
                        <DetailRow
                          label={td("field.status")}
                          value={getStatusLabel(offer.status)}
                        />
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          ) : null}

          <header id="owner-admin-workspace" className="rounded-[24px] border border-[rgba(0,0,0,0.07)] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#8b91aa]">
                  {td("header.eyebrow")}
                </div>

                <h1 className="text-[32px] font-bold tracking-[-0.04em] text-[#111827]">
                  {organization?.organization_name ?? td("header.fallbackTitle")}
                </h1>

                <p className="mt-1 text-[12px] font-medium text-[#8b91aa]">
                  {ownerPreviewText("placed")}: {placedDate}
                </p>

                <p className="mt-2 max-w-[780px] text-[14px] leading-6 text-[#5a5f7a]">
                  {organization?.description ??
                    td("header.summary")}
                </p>

                <p className="mt-4 max-w-[760px] text-[12px] font-medium leading-5 text-[#8b91aa]">
                  {td("header.detailHint")}
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
                {td("error.loadTitle")}
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
                {td("error.loadDescription")}
              </p>
              <Link
                href="/organizations"
                className="mt-4 inline-flex rounded-xl bg-[#3b6ef8] px-4 py-3 text-[13px] font-bold text-white transition hover:bg-[#2f5fe3]"
              >
                {td("error.backToOrganizations")}
              </Link>
            </Card>
          ) : null}

          {!errorMessage && organization ? (
            <div className="org-detail-layout">
              <aside className="org-detail-tabs-sidebar rounded-[24px] border border-[rgba(0,0,0,0.07)] bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
                <div className="px-3 pb-3 pt-2">
                  <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8b91aa]">
                    {td("sections.title")}
                  </div>
                  <p className="mt-1 text-[12px] leading-5 text-[#7c8099]">
                    {td("sections.description")}
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
                      eyebrow={td("tabs.overview")}
                      title={td("overview.title")}
                      description={td("overview.description")}
                    />

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <DetailRow label={td("field.type")} value={getOrganizationTypeLabel(organization.organization_type, locale)} />
                      <DetailRow label={td("field.status")} value={getStatusLabel(organization.status)} />
                      <DetailRow
                        label={td("field.location")}
                        value={getLocationLabel(primaryLocation, notSpecifiedLabel, td("common.addressHidden"))}
                      />
                      <DetailRow
                        label={td("field.addressVisibility")}
                        value={getLocationVisibilityLabel(primaryLocation, locationVisibilityLabels)}
                      />
                      <DetailRow
                        label={td("field.country")}
                        value={organization.country_code || notSpecifiedLabel}
                      />
                      <DetailRow
                        label={td("field.defaultCurrency")}
                        value={organization.default_currency || notSpecifiedLabel}
                      />
                      <DetailRow
                        label={td("field.valueObjects")}
                        value={String(valueObjects.length)}
                      />
                      <DetailRow label={td("field.offers")} value={String(offers.length)} />
                      <DetailRow
                        label={td("field.categoryRequests")}
                        value={String(categorySuggestionRequests.length)}
                      />
                    </div>

                    <div className="mt-5 rounded-2xl border border-[#edf0f7] bg-[#f8f9fd] p-5">
                      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8b91aa]">
                        {td("field.description")}
                      </div>
                      <p className="mt-2 text-[14px] leading-6 text-[#343854]">
                        {organization.description || notSpecifiedLabel}
                      </p>
                    </div>

                    <div className="mt-5 rounded-2xl border border-[#edf0f7] bg-white p-5">
                      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8b91aa]">
                        {td("field.technicalId")}
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
                      eyebrow={td("tabs.location")}
                      title={td("location.title")}
                      description={td("location.description")}
                    />

                    <div className="grid gap-3 md:grid-cols-2">
                      <DetailRow
                        label={td("field.location")}
                        value={getLocationLabel(primaryLocation, notSpecifiedLabel, td("common.addressHidden"))}
                      />
                      <DetailRow
                        label={td("field.addressVisibility")}
                        value={getLocationVisibilityLabel(primaryLocation, locationVisibilityLabels)}
                      />
                      <DetailRow
                        label={td("field.coordinates")}
                        value={getCoordinatesLabel(primaryLocation, notSpecifiedLabel)}
                      />
                      <DetailRow
                        label={td("field.locationStatus")}
                        value={locationGeoStatusLabel ?? td("location.noReviewFlags")}
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
                          labels={{
                            title: td("locationForm.title"),
                            description: td("locationForm.description"),
                            countryCode: td("locationForm.countryCode"),
                            city: td("locationForm.city"),
                            district: td("locationForm.district"),
                            addressVisibility: td("locationForm.addressVisibility"),
                            latitude: td("locationForm.latitude"),
                            longitude: td("locationForm.longitude"),
                            save: td("locationForm.save"),
                            saving: td("locationForm.saving"),
                            updateFailed: td("locationForm.updateFailed"),
                            updateSuccess: td("locationForm.updateSuccess"),
                            unknownError: td("locationForm.unknownError"),
                            visibilityOptions: {
                              public: td("locationForm.visibilityPublic"),
                              approximate: td("locationForm.visibilityApproximate"),
                              hidden: td("locationForm.visibilityHidden"),
                            },
                          }}
                        />
                      </div>
                    ) : (
                      <EmptyState
                        title={td("location.editUnavailableTitle")}
                        description={td("location.editUnavailableDescription")}
                      />
                    )}
                  </Card>
                </TabPanel>

                <TabPanel id="semantic">
                  <div className="grid gap-5">
                    <Card>
                      <SectionHeader
                        eyebrow={td("tabs.semantic")}
                        title={td("semantic.title")}
                        description={td("semantic.description")}
                      />

                      <div className="rounded-[20px] border border-[#bbf7d0] bg-[#f0fdf4] p-5">
                        <h3 className="text-[18px] font-bold text-[#166534]">
                          {td("semantic.currentCategory")}
                        </h3>

                        {currentCategory ? (
                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <DetailRow
                              label={td("field.category")}
                              value={currentCategory.categoryName}
                            />
                            <DetailRow
                              label={td("field.slug")}
                              value={currentCategory.categorySlug}
                            />
                            <DetailRow
                              label={td("field.status")}
                              value={currentCategory.classificationStatus}
                            />
                            <DetailRow
                              label={td("field.role")}
                              value={currentCategory.classificationRole}
                            />
                            <DetailRow
                              label={td("field.source")}
                              value={currentCategory.sourceType ?? notSpecifiedLabel}
                            />
                            <DetailRow
                              label={td("field.reviewState")}
                              value={currentCategory.reviewState ?? notSpecifiedLabel}
                            />
                            <DetailRow
                              label={td("field.updated")}
                              value={currentCategory.updatedAt ?? notSpecifiedLabel}
                            />
                          </div>
                        ) : (
                          <p className="mt-2 text-[14px] leading-6 text-[#166534]">
                            {td("semantic.noCurrentCategory")}
                          </p>
                        )}
                      </div>

                      {canEditOrganizationLocation ? (
                        <OrganizationCategoryReviewActions
                          organizationId={organization.id}
                          currentCategory={currentCategory}
                          categoryOptions={categoryOptions}
                          labels={{
                            ownerActionsTitle: td("categoryReview.ownerActionsTitle"),
                            ownerActionsDescription: td("categoryReview.ownerActionsDescription"),
                            confirmAiCategory: td("categoryReview.confirmAiCategory"),
                            removeCurrentCategory: td("categoryReview.removeCurrentCategory"),
                            replaceCurrentCategory: td("categoryReview.replaceCurrentCategory"),
                            confirming: td("categoryReview.confirming"),
                            removing: td("categoryReview.removing"),
                            replacing: td("categoryReview.replacing"),
                            confirmCurrentAiCategory: td("categoryReview.confirmCurrentAiCategory"),
                            removeFromSemanticCloud: td("categoryReview.removeFromSemanticCloud"),
                            replaceWithApprovedCategory: td("categoryReview.replaceWithApprovedCategory"),
                            noReplacementCategories: td("categoryReview.noReplacementCategories"),
                            optionalOwnerNote: td("categoryReview.optionalOwnerNote"),
                            notePlaceholder: td("categoryReview.notePlaceholder"),
                            replaceCategory: td("categoryReview.replaceCategory"),
                            chooseTargetCategory: td("categoryReview.chooseTargetCategory"),
                            unknownSource: td("categoryReview.unknownSource"),
                            unknownReviewState: td("categoryReview.unknownReviewState"),
                            hiddenFromSemanticCloud: td("categoryReview.hiddenFromSemanticCloud"),
                            visibleInSemanticCloud: td("categoryReview.visibleInSemanticCloud"),
                            completed: td("categoryReview.completed"),
                            reviewState: td("categoryReview.reviewState"),
                            unknownError: td("categoryReview.unknownError"),
                          }}
                        />
                      ) : null}

                      {canEditOrganizationLocation ? (
                        <div className="mt-5">
                          {activeCategorySuggestionRequests.length > 0 ? (
                            <div className="mb-4 rounded-2xl border border-[#fde68a] bg-[#fffbeb] p-4 text-[13px] leading-6 text-[#92400e]">
                              <strong>
                                {td("semantic.activeCorrectionHeading")}
                              </strong>{" "}
                              {td("semantic.activeCorrectionCount")}{" "}
                              <strong>{activeCategorySuggestionRequests.length}</strong>.
                              {td("semantic.activeCorrectionDescription")}
                            </div>
                          ) : null}

                          <div className="rounded-[20px] border border-[#edf0f7] bg-white p-5">
                            <DirectorySuggestionRequestForm
                              title={td("semantic.suggestion.title")}
                              description={td("semantic.suggestion.description")}
                              textareaLabel={td("semantic.suggestion.textareaLabel")}
                              textareaPlaceholder={td("semantic.suggestion.placeholder")}
                              submitButtonLabel={td("semantic.suggestion.submit")}
                              successTitle={td("semantic.suggestion.success")}
                              entityType="organization"
                              entityId={organization.id}
                              requestSource="organization_category_change"
                              locale={locale}
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
                        eyebrow={td("semantic.history.eyebrow")}
                        title={td("semantic.history.title")}
                        description={td("semantic.history.description")}
                      />

                      {categorySuggestionRequests.length === 0 ? (
                        <EmptyState
                          title={td("semantic.history.emptyTitle")}
                          description={td("semantic.history.emptyDescription")}
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
                                    td("semantic.history.categoryNotSpecified")}
                                </h3>
                                <StatusPill tone="blue">{request.status}</StatusPill>
                                <StatusPill>
                                  AI: {request.ai_status ?? td("semantic.history.notRequested")}
                                </StatusPill>
                              </div>

                              <p className="mt-3 text-[13px] leading-6 text-[#374151]">
                                {request.user_text}
                              </p>

                              <div className="mt-3 grid gap-2 text-[12px] text-[#6b7280] md:grid-cols-2">
                                <span>ID: {request.id}</span>
                                <span>{td("field.source")}: {request.request_source}</span>
                                <span>{td("field.created")}: {request.created_at}</span>
                                <span>{td("field.updated")}: {request.updated_at}</span>
                                {request.admin_decision ? (
                                  <span>
                                    {td("semantic.history.adminDecision")}: {request.admin_decision}
                                  </span>
                                ) : null}
                                {request.reviewed_at ? (
                                  <span>{td("semantic.history.reviewed")}: {request.reviewed_at}</span>
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
                      eyebrow={td("tabs.valueObjects")}
                      title={td("valueObjects.title")}
                      description={td("valueObjects.description")}
                      action={
                        <Link
                          href={createValueObjectHref}
                          className="rounded-xl bg-[#3b6ef8] px-4 py-3 text-[13px] font-bold text-white shadow-[0_10px_20px_rgba(59,110,248,0.24)] transition hover:bg-[#2f5fe3]"
                        >
                          {td("valueObjects.createAction")}
                        </Link>
                      }
                    />

                    {valueObjects.length === 0 ? (
                      <EmptyState
                        title={td("valueObjects.emptyTitle")}
                        description={td("valueObjects.emptyDescription")}
                        action={
                          <Link
                            href={createValueObjectHref}
                            className="inline-flex rounded-xl bg-[#3b6ef8] px-4 py-3 text-[13px] font-bold text-white transition hover:bg-[#2f5fe3]"
                          >
                            {td("valueObjects.createAction")}
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
                                  {valueObject.description ?? td("common.noDescription")}
                                </p>
                              </div>
                              <StatusPill
                                tone={valueObject.status === "active" ? "green" : "neutral"}
                              >
                                {getStatusLabel(valueObject.status)}
                              </StatusPill>
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-3">
                              <DetailRow label={td("field.type")} value={valueObject.value_type} />
                              <DetailRow
                                label={td("field.price")}
                                value={formatMoneyValue(
                                  valueObject.default_price,
                                  valueObject.default_currency
                                )}
                              />
                              <DetailRow
                                label={td("field.duration")}
                                value={
                                  valueObject.default_duration_minutes
                                    ? `${valueObject.default_duration_minutes} ${td("common.minutesShort")}`
                                    : notSpecifiedLabel
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
                      eyebrow={td("tabs.offers")}
                      title={td("offers.title")}
                      description={td("offers.description")}
                      action={
                        <Link
                          href={createOfferHref}
                          className="rounded-xl bg-[#3b6ef8] px-4 py-3 text-[13px] font-bold text-white shadow-[0_10px_20px_rgba(59,110,248,0.24)] transition hover:bg-[#2f5fe3]"
                        >
                          {td("offers.createAction")}
                        </Link>
                      }
                    />

                    {offers.length === 0 ? (
                      <EmptyState
                        title={td("offers.emptyTitle")}
                        description={td("offers.emptyDescription")}
                        action={
                          <Link
                            href={createOfferHref}
                            className="inline-flex rounded-xl bg-[#3b6ef8] px-4 py-3 text-[13px] font-bold text-white transition hover:bg-[#2f5fe3]"
                          >
                            {td("offers.createAction")}
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
                                  {offer.description || notSpecifiedLabel}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <StatusPill>{getOfferTypeLabel(offer.offer_type, locale)}</StatusPill>
                                  <StatusPill
                                    tone={offer.status === "active" ? "green" : "neutral"}
                                  >
                                    {getStatusLabel(offer.status)}
                                  </StatusPill>
                                  <span
                                    className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[12px] font-bold ${getPaymentModeClassName(
                                      offer.certificate_payment_mode
                                    )}`}
                                  >
                                    {getPaymentModeLabel(
                                      offer.certificate_payment_mode,
                                      paymentModeLabels
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                              <DetailRow
                                label={td("field.currentPrice")}
                                value={formatMoneyValue(offer.price, offer.currency)}
                              />
                              <DetailRow
                                label={td("field.regularPrice")}
                                value={formatMoneyValue(offer.regular_price, offer.currency)}
                              />
                              <DetailRow
                                label={td("field.buyerPaysPoint")}
                                value={formatMoneyValue(
                                  offer.certificate_points_price ?? 0,
                                  offer.points_currency_code ?? "POINT"
                                )}
                              />
                              <DetailRow
                                label={td("field.buyerPaysMoney")}
                                value={formatMoneyValue(
                                  offer.certificate_money_price,
                                  offer.certificate_currency ?? offer.currency
                                )}
                              />
                            </div>

                            <div className="mt-5 grid gap-4 xl:grid-cols-2">
                              <div className="rounded-2xl border border-[#dbeafe] bg-[#eff6ff] p-4">
                                <h4 className="text-[16px] font-bold text-[#1e3a8a]">
                                  {td("certificate.rulesTitle")}
                                </h4>
                                <div className="mt-3 grid gap-2 text-[13px] leading-6 text-[#1e3a8a]">
                                  <p>
                                    <strong>{td("certificate.available")}:</strong>{" "}
                                    {getBooleanLabel(offer.certificate_available, yesLabel, noLabel)}
                                  </p>
                                  <p>
                                    <strong>{td("certificate.amountCoveredByPoints")}:</strong>{" "}
                                    {formatMoneyValue(
                                      offer.certificate_points_covered_amount,
                                      offer.certificate_currency ?? offer.currency
                                    )}
                                  </p>
                                  <p>
                                    <strong>{td("certificate.reference")}:</strong> 1{" "}
                                    {offer.points_currency_code ?? "POINT"} ={" "}
                                    {formatNumber(
                                      offer.reference_value_per_point ?? 1
                                    )}{" "}
                                    {offer.reference_currency ?? "EUR"}
                                  </p>
                                  <p>
                                    <strong>{td("certificate.terms")}:</strong>{" "}
                                    {offer.certificate_terms || notSpecifiedLabel}
                                  </p>
                                  <p>
                                    <strong>{td("certificate.validityDays")}:</strong>{" "}
                                    {offer.certificate_validity_days ??
                                      notSpecifiedLabel}
                                  </p>
                                  <p>
                                    <strong>{td("certificate.sellerConfirmation")}:</strong>{" "}
                                    {getBooleanLabel(
                                      offer.requires_seller_confirmation,
                                      yesLabel,
                                      noLabel
                                    )}
                                  </p>
                                  <p>
                                    <strong>{td("certificate.transferable")}:</strong>{" "}
                                    {getBooleanLabel(offer.is_transferable, yesLabel, noLabel)} /{" "}
                                    <strong>{td("certificate.cancellable")}:</strong>{" "}
                                    {getBooleanLabel(offer.is_cancellable, yesLabel, noLabel)}
                                  </p>
                                  <p>
                                    <strong>{td("certificate.refundPolicy")}:</strong>{" "}
                                    {offer.points_refund_policy ?? notSpecifiedLabel}
                                  </p>
                                </div>
                              </div>

                              <div className="rounded-2xl border border-[#fde68a] bg-[#fffbeb] p-4">
                                <h4 className="text-[16px] font-bold text-[#92400e]">
                                  {td("discount.title")}
                                </h4>
                                <div className="mt-3 grid gap-2 text-[13px] leading-6 text-[#92400e]">
                                  <p>
                                    <strong>{td("discount.active")}:</strong>{" "}
                                    {getBooleanLabel(offer.is_discount_active, yesLabel, noLabel)}
                                  </p>
                                  <p>
                                    <strong>{td("discount.type")}:</strong>{" "}
                                    {getDiscountTypeLabel(offer.discount_type, discountTypeLabels)}
                                  </p>
                                  <p>
                                    <strong>{td("discount.value")}:</strong>{" "}
                                    {formatNumberValue(offer.discount_value)}
                                  </p>
                                  <p>
                                    <strong>{td("discount.period")}:</strong>{" "}
                                    {formatDateValue(offer.discount_starts_at)} →{" "}
                                    {formatDateValue(offer.discount_ends_at)}
                                  </p>
                                  <p>
                                    <strong>{td("discount.lowestPrice30Days")}:</strong>{" "}
                                    {formatMoneyValue(
                                      offer.lowest_price_30_days,
                                      offer.lowest_price_30_days_currency ??
                                        offer.currency
                                    )}
                                  </p>
                                  <p>
                                    <strong>{td("discount.legalNote")}:</strong>{" "}
                                    {offer.discount_legal_note || notSpecifiedLabel}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="mt-5 rounded-2xl border border-[#edf0f7] bg-white p-4">
                              <h4 className="text-[16px] font-bold text-[#343854]">
                                {td("offerItems.title")}
                              </h4>

                              {!offer.offer_items || offer.offer_items.length === 0 ? (
                                <p className="mt-2 text-[14px] text-[#7c8099]">
                                  {td("offerItems.empty")}
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
                                        {formatMoneyValue(item.total_price, item.currency)}
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </div>

                            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                              <DetailRow
                                label={td("field.requiresBooking")}
                                value={getBooleanLabel(offer.requires_booking, yesLabel, noLabel)}
                              />
                              <DetailRow label={td("field.bookingMode")} value={offer.booking_mode} />
                              <DetailRow
                                label={td("field.defaultDuration")}
                                value={
                                  offer.default_duration_minutes
                                    ? `${offer.default_duration_minutes} ${td("common.minutes")}`
                                    : notSpecifiedLabel
                                }
                              />
                              <DetailRow
                                label={td("field.minDuration")}
                                value={
                                  offer.min_duration_minutes
                                    ? `${offer.min_duration_minutes} ${td("common.minutes")}`
                                    : notSpecifiedLabel
                                }
                              />
                              <DetailRow
                                label={td("field.maxDuration")}
                                value={
                                  offer.max_duration_minutes
                                    ? `${offer.max_duration_minutes} ${td("common.minutes")}`
                                    : notSpecifiedLabel
                                }
                              />
                              <DetailRow
                                label={td("field.quantityLimit")}
                                value={offer.quantity_limit ?? notSpecifiedLabel}
                              />
                              <DetailRow
                                label={td("field.targetReceiver")}
                                value={offer.target_receiver_type || notSpecifiedLabel}
                              />
                              <DetailRow
                                label={td("field.createdAt")}
                                value={new Date(offer.created_at).toLocaleString()}
                              />
                              <DetailRow label={td("field.offerId")} value={offer.id} />
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
                        eyebrow={td("tabs.purchases")}
                        title={td("purchases.title")}
                        description={td("purchases.description")}
                      />
                      <PurchaseConfirmationForm
                        organizationId={organizationId}
                        organizationDefaultCurrency={
                          organization.default_currency ?? null
                        }
                        myPurchaseConfirmationsHref={myPurchaseConfirmationsHref}
                        purchaseConfirmationsHref={purchaseConfirmationsHref}
                        publicPurchaseHistoryHref={publicPurchaseHistoryHref}
                        locale={locale}
                      />
                    </Card>

                    <Card>
                      <SectionHeader
                        eyebrow={td("purchases.linksEyebrow")}
                        title={td("purchases.linksTitle")}
                        description={td("purchases.linksDescription")}
                      />

                      <div className="grid gap-3 md:grid-cols-3">
                        <Link
                          href={myPurchaseConfirmationsHref}
                          className="rounded-2xl border border-[#dfe3f1] bg-[#f8f9fd] p-4 text-[14px] font-bold text-[#343854] transition hover:border-[#dfe4ff] hover:bg-[#eef2ff] hover:text-[#3b6ef8]"
                        >
                          {td("purchases.myConfirmations")}
                        </Link>
                        <Link
                          href={purchaseConfirmationsHref}
                          className="rounded-2xl border border-[#dfe3f1] bg-[#f8f9fd] p-4 text-[14px] font-bold text-[#343854] transition hover:border-[#dfe4ff] hover:bg-[#eef2ff] hover:text-[#3b6ef8]"
                        >
                          {td("purchases.sellerConfirmations")}
                        </Link>
                        <Link
                          href={publicPurchaseHistoryHref}
                          className="rounded-2xl border border-[#dfe3f1] bg-[#f8f9fd] p-4 text-[14px] font-bold text-[#343854] transition hover:border-[#dfe4ff] hover:bg-[#eef2ff] hover:text-[#3b6ef8]"
                        >
                          {td("purchases.publicHistory")}
                        </Link>
                      </div>
                    </Card>
                  </div>
                </TabPanel>

                <TabPanel id="settings">
                  <Card>
                    <SectionHeader
                      eyebrow={td("tabs.settings")}
                      title={td("settings.title")}
                      description={td("settings.description")}
                    />

                    <div className="grid gap-3">
                      <div className="rounded-2xl border border-[#edf0f7] bg-[#f8f9fd] p-5">
                        <h3 className="text-[17px] font-bold text-[#343854]">
                          {td("settings.publicProfileTitle")}
                        </h3>
                        <p className="mt-2 text-[14px] leading-6 text-[#7c8099]">
                          {td("settings.publicProfileDescription")}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-[#edf0f7] bg-[#f8f9fd] p-5">
                        <h3 className="text-[17px] font-bold text-[#343854]">
                          {td("settings.accessTitle")}
                        </h3>
                        <p className="mt-2 text-[14px] leading-6 text-[#7c8099]">
                          {td("settings.currentCanEditMarker")}:{" "}
                          <strong>
                            {canEditOrganizationLocation ? td("settings.ownerEditAllowed") : td("settings.readOnly")}
                          </strong>
                          . {td("settings.accessDescription")}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-[#edf0f7] bg-[#f8f9fd] p-5">
                        <h3 className="text-[17px] font-bold text-[#343854]">
                          {td("settings.mediaTitle")}
                        </h3>
                        <p className="mt-2 text-[14px] leading-6 text-[#7c8099]">
                          {td("settings.mediaDescription")}
                        </p>
                      </div>
                    </div>
                  </Card>
                </TabPanel>

                <TabPanel id="danger">
                  <Card className="border-[#fecaca]">
                    <SectionHeader
                      eyebrow={td("tabs.danger")}
                      title={td("danger.title")}
                      description={td("danger.description")}
                    />

                    <div className="rounded-[20px] border border-[#fecaca] bg-[#fff1f2] p-5">
                      <h3 className="text-[18px] font-bold text-[#b42318]">
                        {td("danger.disabledTitle")}
                      </h3>
                      <p className="mt-2 text-[14px] leading-6 text-[#b42318]">
                        {td("danger.disabledDescription")}
                      </p>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <button
                          type="button"
                          disabled
                          className="cursor-not-allowed rounded-xl border border-[#fecaca] bg-white px-4 py-3 text-[13px] font-bold text-[#b42318] opacity-60"
                        >
                          {td("danger.archiveFutureGate")}
                        </button>
                        <button
                          type="button"
                          disabled
                          className="cursor-not-allowed rounded-xl bg-[#b42318] px-4 py-3 text-[13px] font-bold text-white opacity-50"
                        >
                          {td("danger.hardDeleteDisabled")}
                        </button>
                      </div>

                      <p className="mt-4 text-[12px] leading-5 text-[#b42318]">
                        {td("danger.futureApproval")}
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

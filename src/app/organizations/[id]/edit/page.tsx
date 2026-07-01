import { notFound } from "next/navigation";

import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";
import OrganizationPublicProfileEditClient, {
  type OrganizationPublicProfileEditInitialData,
} from "./OrganizationPublicProfileEditClient";

export const dynamic = "force-dynamic";

type OrganizationEditPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type AppUserRow = {
  id: string;
  auth0_sub: string;
};

type OrganizationRow = {
  id: string;
  created_by_user_id: string | null;
  organization_name: string;
  organization_type: string;
  public_slug: string | null;
  description: string | null;
  short_description: string | null;
  status: string;
  country_code: string | null;
  default_currency: string | null;
  directory_status: string | null;
  verification_status: string | null;
  is_public_profile_enabled: boolean | null;
  is_listed_in_directory: boolean | null;
  public_email: string | null;
  public_phone: string | null;
  website_url: string | null;
  booking_url: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  directory_published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type OrganizationLocationRow = {
  id: string;
  organization_id: string;
  location_type: string | null;
  address_visibility: string | null;
  label: string | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
  district: string | null;
  street_address: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  is_primary: boolean | null;
  is_active: boolean | null;
  created_at: string | null;
};

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
};

function getLocaleValue(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const rawValue = searchParams.locale ?? searchParams.lang;

  if (Array.isArray(rawValue)) {
    return rawValue[0] ?? "en";
  }

  return rawValue || "en";
}

async function getCurrentAppUser() {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return null;
  }

  const { data, error } = await supabase
    .from("app_users")
    .select("id, auth0_sub")
    .eq("auth0_sub", session.user.sub)
    .single();

  if (error || !data) {
    return null;
  }

  return data as AppUserRow;
}

async function getCurrentCategoryName(organizationId: string) {
  const { data: classificationsData, error: classificationsError } =
    await supabase
      .from("entity_classifications")
      .select("contextual_category_id")
      .eq("entity_type", "organization")
      .eq("entity_id", organizationId)
      .eq("classification_role", "primary")
      .in("status", ["approved", "published"])
      .eq("is_primary", true)
      .order("updated_at", { ascending: false })
      .limit(1);

  if (classificationsError) {
    return null;
  }

  const contextualCategoryId =
    ((classificationsData ?? [])[0] as
      | { contextual_category_id: string | null }
      | undefined)?.contextual_category_id ?? null;

  if (!contextualCategoryId) {
    return null;
  }

  const { data: categoryData, error: categoryError } = await supabase
    .from("contextual_categories")
    .select("id, name, slug")
    .eq("id", contextualCategoryId)
    .limit(1);

  if (categoryError) {
    return null;
  }

  return ((categoryData ?? [])[0] as CategoryRow | undefined)?.name ?? null;
}

async function getCount(input: {
  organizationId: string;
  certificateOnly?: boolean;
}) {
  let query = supabase
    .from("offers")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", input.organizationId);

  if (input.certificateOnly) {
    query = query.eq("certificate_available", true);
  }

  const { count } = await query;

  return count ?? 0;
}

export default async function OrganizationEditPage({
  params,
  searchParams,
}: OrganizationEditPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const locale = getLocaleValue(resolvedSearchParams);
  const organizationId = resolvedParams.id;

  const appUser = await getCurrentAppUser();

  if (!appUser) {
    notFound();
  }

  const { data: organizationData, error: organizationError } = await supabase
    .from("organizations")
    .select(
      `
      id,
      created_by_user_id,
      organization_name,
      organization_type,
      public_slug,
      description,
      short_description,
      status,
      country_code,
      default_currency,
      directory_status,
      verification_status,
      is_public_profile_enabled,
      is_listed_in_directory,
      public_email,
      public_phone,
      website_url,
      booking_url,
      logo_url,
      cover_image_url,
      directory_published_at,
      created_at,
      updated_at
    `,
    )
    .eq("id", organizationId)
    .limit(1);

  if (organizationError) {
    throw new Error(organizationError.message);
  }

  const organization =
    ((organizationData ?? [])[0] as OrganizationRow | undefined) ?? null;

  if (!organization || organization.created_by_user_id !== appUser.id) {
    notFound();
  }

  const [
    locationResult,
    categoryName,
    offersCount,
    certificateOffersCount,
  ] = await Promise.all([
    supabase
      .from("organization_locations")
      .select(
        `
        id,
        organization_id,
        location_type,
        address_visibility,
        label,
        country_code,
        region,
        city,
        district,
        street_address,
        postal_code,
        latitude,
        longitude,
        is_primary,
        is_active,
        created_at
      `,
      )
      .eq("organization_id", organization.id)
      .eq("is_active", true)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1),
    getCurrentCategoryName(organization.id),
    getCount({ organizationId: organization.id }),
    getCount({ organizationId: organization.id, certificateOnly: true }),
  ]);

  if (locationResult.error) {
    throw new Error(locationResult.error.message);
  }

  const primaryLocation =
    ((locationResult.data ?? [])[0] as OrganizationLocationRow | undefined) ??
    null;

  const publicProfileHref = organization.public_slug
    ? `/directory/${organization.public_slug}?locale=${encodeURIComponent(locale)}`
    : null;

  const initialData: OrganizationPublicProfileEditInitialData = {
    locale,
    organization: {
      id: organization.id,
      name: organization.organization_name,
      type: organization.organization_type,
      description: organization.description,
      shortDescription: organization.short_description,
      publicSlug: organization.public_slug,
      publicEmail: organization.public_email,
      publicPhone: organization.public_phone,
      websiteUrl: organization.website_url,
      bookingUrl: organization.booking_url,
      logoUrl: organization.logo_url,
      coverImageUrl: organization.cover_image_url,
      countryCode: organization.country_code,
      defaultCurrency: organization.default_currency,
      directoryStatus: organization.directory_status,
      verificationStatus: organization.verification_status,
      isPublicProfileEnabled: organization.is_public_profile_enabled,
      isListedInDirectory: organization.is_listed_in_directory,
    },
    primaryLocation: primaryLocation
      ? {
          id: primaryLocation.id,
          label: primaryLocation.label,
          locationType: primaryLocation.location_type,
          addressVisibility: primaryLocation.address_visibility,
          countryCode: primaryLocation.country_code,
          region: primaryLocation.region,
          city: primaryLocation.city,
          district: primaryLocation.district,
          streetAddress: primaryLocation.street_address,
          postalCode: primaryLocation.postal_code,
          latitude: primaryLocation.latitude,
          longitude: primaryLocation.longitude,
        }
      : null,
    categoryName,
    publicProfileHref,
    counts: {
      offersCount,
      certificateOffersCount,
      pointsCount: 1,
    },
  };

  return <OrganizationPublicProfileEditClient initialData={initialData} />;
}
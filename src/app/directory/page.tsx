import Link from "next/link";
import { headers } from "next/headers";
import { getLocaleSearchParam, type LocaleCode } from "@/i18n";
import {
  getDirectoryListMessage,
  type DirectoryListMessageKey,
  type DirectoryListMessageParams,
} from "@/i18n/messages/directory-list";
import DirectoryLocationFilterFields from "./components/DirectoryLocationFilterFields";
import DirectoryUseLocationButton from "./components/DirectoryUseLocationButton";
import DirectorySuggestionRequestForm from "./components/DirectorySuggestionRequestForm";

export const dynamic = "force-dynamic";

type DirectoryActionFilter =
  | "all"
  | "hasOffers"
  | "hasCertificates"
  | "canRegisterPurchase";

type DirectorySortMode = "newest" | "distance";

type DirectoryPageProps = {
  searchParams?: Promise<{
    q?: string | string[];
    category?: string | string[];
    city?: string | string[];
    district?: string | string[];
    countryCode?: string | string[];
    action?: string | string[];
    sort?: string | string[];
    userLat?: string | string[];
    userLng?: string | string[];
    locale?: string | string[];
    lang?: string | string[];
  }>;
};

type DirectoryCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

type DirectoryLocation = {
  id: string;
  locationType: string;
  addressVisibility: string;
  label: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  district: string | null;
  streetAddress: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  geoArea:
    | {
        id: string;
        area_type: string;
        name: string;
        slug: string;
        country_code: string | null;
      }
    | null;
};

type DirectoryActionStats = {
  activeOffersCount: number;
  activeCertificatesCount: number;
  hasActiveOffers: boolean;
  hasActiveCertificates: boolean;
  canRegisterPurchase: boolean;
};

type DirectoryOrganization = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  shortDescription: string | null;
  publicSlug: string | null;
  countryCode: string | null;
  defaultCurrency: string | null;
  directoryStatus: string;
  verificationStatus: string;
  publicEmail: string | null;
  publicPhone: string | null;
  websiteUrl: string | null;
  bookingUrl: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  directoryPublishedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  primaryCategory: DirectoryCategory | null;
  primaryLocation: DirectoryLocation | null;
  distanceKm?: number | null;
  stats: {
    profileViewsCount: number;
    offerClicksCount: number;
    certificateClicksCount: number;
    purchaseRegistrationClicksCount: number;
  };
  actionStats?: DirectoryActionStats;
};

type DirectoryApiResponse = {
  ok: boolean;
  organizations?: DirectoryOrganization[];
  count?: number;
  filters?: {
    q: string | null;
    category: string | null;
    city: string | null;
    district: string | null;
    countryCode: string | null;
    action: DirectoryActionFilter;
    sort: DirectorySortMode;
    userLat: number | null;
    userLng: number | null;
    limit: number;
  };
  error?: string;
};

type DirectoryFilterCity = {
  city: string;
  countryCode: string;
  label: string;
};

type DirectoryFilterDistrict = {
  city: string;
  district: string;
  countryCode: string;
  label: string;
};

type DirectoryFilterCountry = {
  countryCode: string;
  label: string;
};

type DirectoryFiltersApiResponse = {
  ok: boolean;
  categories?: DirectoryCategory[];
  cities?: DirectoryFilterCity[];
  districts?: DirectoryFilterDistrict[];
  counts?: {
    organizations: number;
    categories: number;
    cities: number;
    districts: number;
  };
  error?: string;
};

type DirectoryFilterOptions = {
  categories: DirectoryCategory[];
  cities: DirectoryFilterCity[];
  districts: DirectoryFilterDistrict[];
};

type DirectoryFilters = {
  q: string;
  category: string;
  city: string;
  district: string;
  countryCode: string;
  action: DirectoryActionFilter;
  sort: DirectorySortMode;
  userLat: string;
  userLng: string;
  locale: LocaleCode;
};

const DIRECTORY_ACTION_FILTERS: {
  value: DirectoryActionFilter;
  labelKey: DirectoryListMessageKey;
}[] = [
  { value: "all", labelKey: "directoryList.action.all" },
  { value: "hasOffers", labelKey: "directoryList.action.hasOffers" },
  {
    value: "hasCertificates",
    labelKey: "directoryList.action.hasCertificates",
  },
  {
    value: "canRegisterPurchase",
    labelKey: "directoryList.action.canRegisterPurchase",
  },
];

const DIRECTORY_SORT_OPTIONS: {
  value: DirectorySortMode;
  labelKey: DirectoryListMessageKey;
}[] = [
  { value: "newest", labelKey: "directoryList.sort.newest" },
  { value: "distance", labelKey: "directoryList.sort.distance" },
];

async function getBaseUrl() {
  const headersList = await headers();

  const forwardedHost = headersList.get("x-forwarded-host");
  const host = forwardedHost ?? headersList.get("host");

  const forwardedProto = headersList.get("x-forwarded-proto");
  const protocol = forwardedProto ?? "https";

  if (host) {
    return `${protocol}://${host}`;
  }

  const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

  if (publicAppUrl) {
    return publicAppUrl;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

function getFirstSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function normalizeFilterValue(value: string | string[] | undefined) {
  return getFirstSearchParam(value).trim();
}


function normalizeDirectoryLocale(
  locale: string | string[] | undefined,
  lang: string | string[] | undefined,
): LocaleCode {
  const candidate = normalizeFilterValue(locale) || normalizeFilterValue(lang);
  const params = new URLSearchParams();

  if (candidate) {
    params.set("locale", candidate);
  }

  return getLocaleSearchParam(params);
}

function createDirectoryListTranslator(locale: LocaleCode) {
  return (
    key: DirectoryListMessageKey,
    params?: DirectoryListMessageParams,
  ) => getDirectoryListMessage(key, locale, params);
}
function normalizeActionFilter(
  value: string | string[] | undefined
): DirectoryActionFilter {
  const normalizedValue = normalizeFilterValue(value);

  if (
    normalizedValue === "hasOffers" ||
    normalizedValue === "hasCertificates" ||
    normalizedValue === "canRegisterPurchase"
  ) {
    return normalizedValue;
  }

  return "all";
}

function normalizeSortMode(
  value: string | string[] | undefined
): DirectorySortMode {
  const normalizedValue = normalizeFilterValue(value);

  if (normalizedValue === "distance") {
    return "distance";
  }

  return "newest";
}

function buildDirectoryApiUrl(baseUrl: string, filters: DirectoryFilters) {
  const searchParams = new URLSearchParams();

  if (filters.q) {
    searchParams.set("q", filters.q);
  }

  if (filters.category) {
    searchParams.set("category", filters.category);
  }

  if (filters.city) {
    searchParams.set("city", filters.city);
  }

  if (filters.district) {
    searchParams.set("district", filters.district);
  }

  if (filters.countryCode) {
    searchParams.set("countryCode", filters.countryCode);
  }

  if (filters.action !== "all") {
    searchParams.set("action", filters.action);
  }

  if (filters.sort !== "newest") {
    searchParams.set("sort", filters.sort);
  }

  if (filters.userLat) {
    searchParams.set("userLat", filters.userLat);
  }

  if (filters.userLng) {
    searchParams.set("userLng", filters.userLng);
  }

  if (filters.locale) {
    searchParams.set("locale", filters.locale);
  }

  searchParams.set("limit", "100");

  const queryString = searchParams.toString();

  if (!queryString) {
    return `${baseUrl}/api/directory/organizations`;
  }

  return `${baseUrl}/api/directory/organizations?${queryString}`;
}

async function readJsonResponse<T>(
  response: Response,
  endpointLabel: string
): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const responseText = await response.text();

  if (!contentType.includes("application/json")) {
    throw new Error(
      `${endpointLabel} returned non-JSON response: status ${
        response.status
      }, content-type ${contentType || "not specified"}, body: ${responseText.slice(
        0,
        160
      )}`
    );
  }

  return JSON.parse(responseText) as T;
}

async function getDirectoryOrganizations(
  filters: DirectoryFilters
): Promise<{
  organizations: DirectoryOrganization[];
  errorMessage: string | null;
}> {
  const baseUrl = await getBaseUrl();
  const apiUrl = buildDirectoryApiUrl(baseUrl, filters);

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      cache: "no-store",
    });

    const json = await readJsonResponse<DirectoryApiResponse>(
      response,
      "/api/directory/organizations"
    );

    if (!response.ok || !json.ok) {
      return {
        organizations: [],
        errorMessage: json.error ?? "Cannot load directory organizations",
      };
    }

    return {
      organizations: json.organizations ?? [],
      errorMessage: null,
    };
  } catch (error) {
    return {
      organizations: [],
      errorMessage:
        error instanceof Error ? error.message : "Unknown directory error",
    };
  }
}

async function getDirectoryFilterOptions(locale: string): Promise<{
  filterOptions: DirectoryFilterOptions;
  errorMessage: string | null;
}> {
  const baseUrl = await getBaseUrl();

  const filtersApiSearchParams = new URLSearchParams();

  if (locale) {
    filtersApiSearchParams.set("locale", locale);
  }

  const filtersApiQueryString = filtersApiSearchParams.toString();
  const filtersApiUrl = filtersApiQueryString
    ? `${baseUrl}/api/directory/filters?${filtersApiQueryString}`
    : `${baseUrl}/api/directory/filters`;

  try {
    const response = await fetch(filtersApiUrl, {
      method: "GET",
      cache: "no-store",
    });

    const json = await readJsonResponse<DirectoryFiltersApiResponse>(
      response,
      "/api/directory/filters"
    );

    if (!response.ok || !json.ok) {
      return {
        filterOptions: {
          categories: [],
          cities: [],
          districts: [],
        },
        errorMessage: json.error ?? "Cannot load directory filter options",
      };
    }

    return {
      filterOptions: {
        categories: json.categories ?? [],
        cities: json.cities ?? [],
        districts: json.districts ?? [],
      },
      errorMessage: null,
    };
  } catch (error) {
    return {
      filterOptions: {
        categories: [],
        cities: [],
        districts: [],
      },
      errorMessage:
        error instanceof Error
          ? error.message
          : "Unknown directory filters error",
    };
  }
}

function getLocationLabel(location: DirectoryLocation | null, locale: LocaleCode) {
  if (!location) {
    return getDirectoryListMessage("directoryList.location.notSpecified", locale);
  }

  if (location.addressVisibility === "hidden") {
    return getDirectoryListMessage("directoryList.location.hidden", locale);
  }

  const parts = [
    location.city,
    location.district,
    location.addressVisibility === "public" ? location.streetAddress : null,
  ].filter(Boolean);

  if (parts.length === 0) {
    return getDirectoryListMessage("directoryList.location.notSpecified", locale);
  }

  if (location.addressVisibility === "approximate") {
    return getDirectoryListMessage("directoryList.location.approximate", locale, {
      location: parts.join(", "),
    });
  }

  return parts.join(", ");
}

function getDistanceExplanation(
  location: DirectoryLocation | null,
  locale: LocaleCode,
) {
  if (!location) {
    return getDirectoryListMessage(
      "directoryList.distance.explanation.default",
      locale,
    );
  }

  if (location.addressVisibility === "approximate") {
    return getDirectoryListMessage(
      "directoryList.distance.explanation.approximate",
      locale,
    );
  }

  if (location.addressVisibility === "public") {
    return getDirectoryListMessage(
      "directoryList.distance.explanation.public",
      locale,
    );
  }

  return getDirectoryListMessage(
    "directoryList.distance.explanation.hidden",
    locale,
  );
}

function canShowDistance(location: DirectoryLocation | null) {
  return Boolean(location && location.addressVisibility !== "hidden");
}

function getVerificationLabel(
  status: string | null | undefined,
  locale: LocaleCode,
) {
  if (status === "verified") {
    return getDirectoryListMessage("directoryList.verification.verified", locale);
  }

  if (status === "pending") {
    return getDirectoryListMessage("directoryList.verification.pending", locale);
  }

  if (status === "rejected") {
    return getDirectoryListMessage("directoryList.verification.rejected", locale);
  }

  if (status === "revoked") {
    return getDirectoryListMessage("directoryList.verification.revoked", locale);
  }

  return getDirectoryListMessage("directoryList.verification.notVerified", locale);
}

function getOrganizationTypeLabel(
  type: string | null | undefined,
  locale: LocaleCode,
) {
  if (type === "private_business") {
    return getDirectoryListMessage(
      "directoryList.organizationType.privateBusiness",
      locale,
    );
  }

  if (type === "company") {
    return getDirectoryListMessage("directoryList.organizationType.company", locale);
  }

  if (type === "ngo") {
    return getDirectoryListMessage("directoryList.organizationType.ngo", locale);
  }

  return type ?? getDirectoryListMessage("directoryList.organizationType.default", locale);
}

function appendDirectoryLocale(pathname: string, filters: DirectoryFilters) {
  if (!filters.locale) {
    return pathname;
  }

  const searchParams = new URLSearchParams();
  searchParams.set("locale", filters.locale);

  return `${pathname}?${searchParams.toString()}`;
}

function getDirectoryRootHref(filters: DirectoryFilters) {
  return appendDirectoryLocale("/directory", filters);
}

function getDirectoryOrganizationHref(
  organization: DirectoryOrganization,
  filters: DirectoryFilters
) {
  if (organization.publicSlug) {
    return appendDirectoryLocale(`/directory/${organization.publicSlug}`, filters);
  }

  return getDirectoryRootHref(filters);
}

function getActionStats(organization: DirectoryOrganization) {
  return (
    organization.actionStats ?? {
      activeOffersCount: 0,
      activeCertificatesCount: 0,
      hasActiveOffers: false,
      hasActiveCertificates: false,
      canRegisterPurchase: false,
    }
  );
}

function hasActiveFilters(filters: DirectoryFilters) {
  return Boolean(
    filters.q ||
      filters.category ||
      filters.city ||
      filters.district ||
      filters.countryCode ||
      filters.action !== "all" ||
      filters.sort !== "newest" ||
      filters.userLat ||
      filters.userLng
  );
}

function getActionFilterLabel(action: DirectoryActionFilter, locale: LocaleCode) {
  const labelKey =
    DIRECTORY_ACTION_FILTERS.find((filter) => filter.value === action)
      ?.labelKey ?? ("directoryList.action.all" as DirectoryListMessageKey);

  return getDirectoryListMessage(labelKey, locale);
}

function getSortModeLabel(sort: DirectorySortMode, locale: LocaleCode) {
  const labelKey =
    DIRECTORY_SORT_OPTIONS.find((sortOption) => sortOption.value === sort)
      ?.labelKey ?? ("directoryList.sort.newest" as DirectoryListMessageKey);

  return getDirectoryListMessage(labelKey, locale);
}

function getCountryOptions(
  cities: DirectoryFilterCity[],
  districts: DirectoryFilterDistrict[]
): DirectoryFilterCountry[] {
  const countryMap = new Map<string, DirectoryFilterCountry>();

  for (const city of cities) {
    if (!city.countryCode) {
      continue;
    }

    countryMap.set(city.countryCode, {
      countryCode: city.countryCode,
      label: city.countryCode === "PL" ? "Poland / PL" : city.countryCode,
    });
  }

  for (const district of districts) {
    if (!district.countryCode) {
      continue;
    }

    countryMap.set(district.countryCode, {
      countryCode: district.countryCode,
      label:
        district.countryCode === "PL"
          ? "Poland / PL"
          : district.countryCode,
    });
  }

  return Array.from(countryMap.values()).sort((left, right) =>
    left.label.localeCompare(right.label, "en", {
      sensitivity: "base",
    })
  );
}

function getDistrictOptions(
  filters: DirectoryFilters,
  districts: DirectoryFilterDistrict[]
) {
  if (!filters.city) {
    return [];
  }

  return districts.filter((districtOption) => {
    if (districtOption.city !== filters.city) {
      return false;
    }

    if (
      filters.countryCode &&
      districtOption.countryCode !== filters.countryCode
    ) {
      return false;
    }

    return true;
  });
}

function getDistrictLabel(
  district: string,
  districtOptions: DirectoryFilterDistrict[],
  locale: LocaleCode,
) {
  if (!district) {
    return getDirectoryListMessage("directoryList.filter.allDistricts", locale);
  }

  return (
    districtOptions.find((districtOption) => districtOption.district === district)
      ?.label ?? district
  );
}

function getCategoryLabel(
  categorySlug: string,
  categories: DirectoryCategory[],
  locale: LocaleCode,
) {
  if (!categorySlug) {
    return getDirectoryListMessage("directoryList.filter.all", locale);
  }

  return (
    categories.find((category) => category.slug === categorySlug)?.name ??
    categorySlug
  );
}

function getCityLabel(city: string, cities: DirectoryFilterCity[], locale: LocaleCode) {
  if (!city) {
    return getDirectoryListMessage("directoryList.filter.allCities", locale);
  }

  return cities.find((cityOption) => cityOption.city === city)?.label ?? city;
}

function getCountryLabel(
  countryCode: string,
  countries: DirectoryFilterCountry[],
  locale: LocaleCode,
) {
  if (!countryCode) {
    return getDirectoryListMessage("directoryList.filter.allCountries", locale);
  }

  return (
    countries.find((countryOption) => countryOption.countryCode === countryCode)
      ?.label ?? countryCode
  );
}

function hasDistanceCoordinates(filters: DirectoryFilters) {
  return Boolean(filters.userLat && filters.userLng);
}

function formatDistanceKm(distanceKm: number | null | undefined) {
  if (typeof distanceKm !== "number" || Number.isNaN(distanceKm)) {
    return null;
  }

  if (distanceKm < 1) {
    return `${distanceKm.toFixed(2)} км`;
  }

  if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} км`;
  }

  return `${Math.round(distanceKm)} км`;
}

export default async function DirectoryPage({
  searchParams,
}: DirectoryPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const filters: DirectoryFilters = {
    q: normalizeFilterValue(resolvedSearchParams?.q),
    category: normalizeFilterValue(resolvedSearchParams?.category),
    city: normalizeFilterValue(resolvedSearchParams?.city),
    district: normalizeFilterValue(resolvedSearchParams?.district),
    countryCode: normalizeFilterValue(resolvedSearchParams?.countryCode),
    action: normalizeActionFilter(resolvedSearchParams?.action),
    sort: normalizeSortMode(resolvedSearchParams?.sort),
    userLat: normalizeFilterValue(resolvedSearchParams?.userLat),
    userLng: normalizeFilterValue(resolvedSearchParams?.userLng),
    locale: normalizeDirectoryLocale(
      resolvedSearchParams?.locale,
      resolvedSearchParams?.lang,
    ),
  };

  const [
    { organizations, errorMessage: organizationsErrorMessage },
    { filterOptions, errorMessage: filterOptionsErrorMessage },
  ] = await Promise.all([
    getDirectoryOrganizations(filters),
    getDirectoryFilterOptions(filters.locale),
  ]);

  const categoryOptions = filterOptions.categories;
  const cityOptions = filterOptions.cities;
  const countryOptions = getCountryOptions(
    filterOptions.cities,
    filterOptions.districts
  );
  const districtOptions = getDistrictOptions(filters, filterOptions.districts);

  const t = createDirectoryListTranslator(filters.locale);

  const selectedCategoryLabel = getCategoryLabel(
    filters.category,
    categoryOptions,
    filters.locale,
  );
  const selectedCityLabel = getCityLabel(filters.city, cityOptions, filters.locale);
  const selectedCountryLabel = getCountryLabel(
    filters.countryCode,
    countryOptions,
    filters.locale,
  );
  const selectedDistrictLabel = getDistrictLabel(
    filters.district,
    districtOptions,
    filters.locale,
  );

  const shouldShowDistanceCoordinateWarning =
    filters.sort === "distance" && !hasDistanceCoordinates(filters);

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
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <header style={{ marginBottom: "28px" }}>
          <h1
            style={{
              fontSize: "34px",
              lineHeight: "1.2",
              fontWeight: 700,
              margin: "0 0 10px",
            }}
          >
            {t("directoryList.header.title")}
          </h1>

          <p
            style={{
              margin: "0 0 6px",
              color: "#555555",
              fontSize: "16px",
              lineHeight: "1.5",
            }}
          >
            {t("directoryList.header.subtitle")}
          </p>

          <p
            style={{
              margin: 0,
              color: "#666666",
              fontSize: "14px",
              lineHeight: "1.5",
            }}
          >
            {t("directoryList.header.privacyNote")}
          </p>
        </header>

        <section
          style={{
            border: "1px solid #dddddd",
            borderRadius: "16px",
            padding: "20px",
            background: "#f9fafb",
            marginBottom: "24px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
          }}
        >
          <h2
            style={{
              margin: "0 0 12px",
              fontSize: "22px",
            }}
          >
            {t("directoryList.filters.title")}
          </h2>

          {filterOptionsErrorMessage ? (
            <div
              style={{
                border: "1px solid #fde68a",
                borderRadius: "10px",
                padding: "12px",
                background: "#fffbeb",
                color: "#92400e",
                marginBottom: "14px",
                lineHeight: "1.5",
              }}
            >
              {t("directoryList.filters.dynamicLoadErrorPrefix")}{" "}
              {filterOptionsErrorMessage}.{" "}
              {t("directoryList.filters.dynamicLoadErrorSuffix")}
            </div>
          ) : null}

          <form
            method="GET"
            action="/directory"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
              alignItems: "end",
            }}
          >
            {filters.locale ? (
              <input type="hidden" name="locale" value={filters.locale} />
            ) : null}

            <label style={{ display: "grid", gap: "7px", fontWeight: 700 }}>
              {t("directoryList.filters.search")}
              <input
                name="q"
                defaultValue={filters.q}
                placeholder={t("directoryList.filters.searchPlaceholder")}
                style={{
                  border: "1px solid #cccccc",
                  borderRadius: "8px",
                  padding: "11px 12px",
                  fontSize: "15px",
                  fontWeight: 400,
                  background: "#ffffff",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: "7px", fontWeight: 700 }}>
              {t("directoryList.filters.category")}
              <select
                name="category"
                defaultValue={filters.category}
                style={{
                  border: "1px solid #cccccc",
                  borderRadius: "8px",
                  padding: "11px 12px",
                  fontSize: "15px",
                  fontWeight: 400,
                  background: "#ffffff",
                }}
              >
                <option value="">{t("directoryList.filter.allCategories")}</option>

                {filters.category &&
                !categoryOptions.some(
                  (category) => category.slug === filters.category
                ) ? (
                  <option value={filters.category}>
                    {filters.category} / {t("directoryList.filters.temporaryUrlFilter")}
                  </option>
                ) : null}

                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <DirectoryLocationFilterFields
              cities={cityOptions}
              districts={filterOptions.districts}
              countries={countryOptions}
              selectedCity={filters.city}
              selectedDistrict={filters.district}
              selectedCountryCode={filters.countryCode}
              locale={filters.locale}
            />

            <label style={{ display: "grid", gap: "7px", fontWeight: 700 }}>
              {t("directoryList.filters.userAction")}
              <select
                name="action"
                defaultValue={filters.action}
                style={{
                  border: "1px solid #cccccc",
                  borderRadius: "8px",
                  padding: "11px 12px",
                  fontSize: "15px",
                  fontWeight: 400,
                  background: "#ffffff",
                }}
              >
                {DIRECTORY_ACTION_FILTERS.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {getDirectoryListMessage(filter.labelKey, filters.locale)}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: "7px", fontWeight: 700 }}>
              {t("directoryList.filters.sort")}
              <select
                name="sort"
                defaultValue={filters.sort}
                style={{
                  border: "1px solid #cccccc",
                  borderRadius: "8px",
                  padding: "11px 12px",
                  fontSize: "15px",
                  fontWeight: 400,
                  background: "#ffffff",
                }}
              >
                {DIRECTORY_SORT_OPTIONS.map((sortOption) => (
                  <option key={sortOption.value} value={sortOption.value}>
                    {getDirectoryListMessage(sortOption.labelKey, filters.locale)}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: "7px", fontWeight: 700 }}>
              {t("directoryList.filters.latitude")}
              <input
                name="userLat"
                defaultValue={filters.userLat}
                placeholder="53.4300"
                inputMode="decimal"
                style={{
                  border: "1px solid #cccccc",
                  borderRadius: "8px",
                  padding: "11px 12px",
                  fontSize: "15px",
                  fontWeight: 400,
                  background: "#ffffff",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: "7px", fontWeight: 700 }}>
              {t("directoryList.filters.longitude")}
              <input
                name="userLng"
                defaultValue={filters.userLng}
                placeholder="14.5500"
                inputMode="decimal"
                style={{
                  border: "1px solid #cccccc",
                  borderRadius: "8px",
                  padding: "11px 12px",
                  fontSize: "15px",
                  fontWeight: 400,
                  background: "#ffffff",
                }}
              />
            </label>

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <button
                type="submit"
                style={{
                  border: "1px solid #2563eb",
                  borderRadius: "8px",
                  padding: "11px 14px",
                  background: "#2563eb",
                  color: "#ffffff",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {t("directoryList.filters.apply")}
              </button>

              <Link
                href={getDirectoryRootHref(filters)}
                style={{
                  display: "inline-block",
                  border: "1px solid #dddddd",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  background: "#ffffff",
                  color: "#111111",
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                {t("directoryList.filters.reset")}
              </Link>
            </div>
          </form>

          <div style={{ marginTop: "16px" }}>
            <DirectoryUseLocationButton

              locale={filters.locale}currentSearchParams={{
                q: filters.q,
                category: filters.category,
                city: filters.city,
                district: filters.district,
                countryCode: filters.countryCode,
                action: filters.action,
                locale: filters.locale,
              }}
            />
          </div>

          <div
            style={{
              marginTop: "16px",
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              padding: "12px",
              background: "#ffffff",
              color: "#555555",
              fontSize: "14px",
              lineHeight: "1.5",
            }}
          >
            <strong>{t("directoryList.distance.title")}</strong>{" "}
            {t("directoryList.distance.infoBody")}
          </div>

          {shouldShowDistanceCoordinateWarning ? (
            <div
              style={{
                marginTop: "16px",
                border: "1px solid #fde68a",
                borderRadius: "10px",
                padding: "12px",
                background: "#fffbeb",
                color: "#92400e",
                lineHeight: "1.5",
              }}
            >
              {t("directoryList.distance.coordinateWarning")}
            </div>
          ) : null}

          {hasActiveFilters(filters) ? (
            <div
              style={{
                marginTop: "16px",
                border: "1px solid #bfdbfe",
                borderRadius: "10px",
                padding: "12px",
                background: "#eff6ff",
                color: "#1e3a8a",
                display: "grid",
                gap: "6px",
              }}
            >
              <strong>{t("directoryList.active.title")}</strong>

              <div>
                {filters.q ? (
                  <span>
                    {t("directoryList.active.search")}: <strong>{filters.q}</strong>{" "}
                  </span>
                ) : null}

                {filters.category ? (
                  <span>
                    {t("directoryList.active.category")}: <strong>{selectedCategoryLabel}</strong>{" "}
                  </span>
                ) : null}

                {filters.city ? (
                  <span>
                    {t("directoryList.active.city")}: <strong>{selectedCityLabel}</strong>{" "}
                  </span>
                ) : null}

                {filters.district ? (
                  <span>
                    {t("directoryList.active.district")}: <strong>{selectedDistrictLabel}</strong>{" "}
                  </span>
                ) : null}

                {filters.countryCode ? (
                  <span>
                    {t("directoryList.active.country")}: <strong>{selectedCountryLabel}</strong>{" "}
                  </span>
                ) : null}

                {filters.action !== "all" ? (
                  <span>
                    {t("directoryList.active.action")}:{" "}
                    <strong>{getActionFilterLabel(filters.action, filters.locale)}</strong>{" "}
                  </span>
                ) : null}

                {filters.sort !== "newest" ? (
                  <span>
                    {t("directoryList.active.sort")}:{" "}
                    <strong>{getSortModeLabel(filters.sort, filters.locale)}</strong>{" "}
                  </span>
                ) : null}

                {hasDistanceCoordinates(filters) ? (
                  <span>
                    {t("directoryList.active.distancePoint")}:{" "}
                    <strong>
                      {filters.userLat}, {filters.userLng}
                    </strong>{" "}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>

        <DirectorySuggestionRequestForm
              locale={filters.locale}/>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              border: "1px solid #dddddd",
              borderRadius: "16px",
              padding: "22px",
              background: "#ffffff",
              boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ color: "#666666", marginBottom: "8px" }}>
              {t("directoryList.stats.found")}
            </div>
            <div style={{ fontSize: "34px", fontWeight: 700 }}>
              {organizations.length}
            </div>
          </div>

          <div
            style={{
              border: "1px solid #bfdbfe",
              borderRadius: "16px",
              padding: "22px",
              background: "#eff6ff",
              boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ color: "#1e3a8a", marginBottom: "8px" }}>
              {t("directoryList.stats.currentCity")}
            </div>
            <div style={{ fontSize: "24px", fontWeight: 700 }}>
              {selectedCityLabel}
            </div>
          </div>

          <div
            style={{
              border: "1px solid #c7d2fe",
              borderRadius: "16px",
              padding: "22px",
              background: "#eef2ff",
              boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ color: "#3730a3", marginBottom: "8px" }}>
              {t("directoryList.stats.district")}
            </div>
            <div style={{ fontSize: "24px", fontWeight: 700 }}>
              {filters.district ? selectedDistrictLabel : t("directoryList.filter.allDistricts")}
            </div>
          </div>

          <div
            style={{
              border: "1px solid #f0d28a",
              borderRadius: "16px",
              padding: "22px",
              background: "#fff8e6",
              boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ color: "#7a4b00", marginBottom: "8px" }}>
              {t("directoryList.stats.category")}
            </div>
            <div style={{ fontSize: "24px", fontWeight: 700 }}>
              {selectedCategoryLabel}
            </div>
          </div>

          <div
            style={{
              border: "1px solid #bbf7d0",
              borderRadius: "16px",
              padding: "22px",
              background: "#f0fdf4",
              boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ color: "#166534", marginBottom: "8px" }}>
              {t("directoryList.stats.action")}
            </div>
            <div style={{ fontSize: "22px", fontWeight: 800 }}>
              {getActionFilterLabel(filters.action, filters.locale)}
            </div>
          </div>

          <div
            style={{
              border: "1px solid #fed7aa",
              borderRadius: "16px",
              padding: "22px",
              background: "#fff7ed",
              boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ color: "#9a3412", marginBottom: "8px" }}>
              {t("directoryList.stats.sorting")}
            </div>
            <div style={{ fontSize: "22px", fontWeight: 800 }}>
              {getSortModeLabel(filters.sort, filters.locale)}
            </div>
            {filters.sort === "distance" && hasDistanceCoordinates(filters) ? (
              <div
                style={{
                  marginTop: "8px",
                  color: "#9a3412",
                  fontSize: "14px",
                  lineHeight: "1.4",
                }}
              >
                {t("directoryList.stats.fromPoint")} {filters.userLat}, {filters.userLng}
              </div>
            ) : null}
          </div>
        </section>

        {organizationsErrorMessage ? (
          <section
            style={{
              border: "1px solid #f2b8b5",
              borderRadius: "12px",
              padding: "24px",
              background: "#fff5f5",
              color: "#a40000",
              marginBottom: "24px",
            }}
          >
            <h2 style={{ marginTop: 0 }}>{t("directoryList.error.loadTitle")}</h2>
            <p>{organizationsErrorMessage}</p>
          </section>
        ) : null}

        <section
          style={{
            border: "1px solid #dddddd",
            borderRadius: "16px",
            background: "#ffffff",
            overflow: "hidden",
            boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
          }}
        >
          <div
            style={{
              padding: "20px 24px",
              borderBottom: "1px solid #eeeeee",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "22px" }}>
              {t("directoryList.published.title")}
            </h2>
            <p style={{ margin: "6px 0 0", color: "#666666" }}>
              {t("directoryList.published.description")}
            </p>
          </div>

          {organizations.length === 0 ? (
            <div style={{ padding: "24px", color: "#666666" }}>
              {t("directoryList.published.noResults")}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "16px",
                padding: "20px",
              }}
            >
              {organizations.map((organization) => {
                const organizationHref =
                  getDirectoryOrganizationHref(organization, filters);
                const actionStats = getActionStats(organization);
                const formattedDistance = formatDistanceKm(
                  organization.distanceKm
                );
                const shouldShowDistance =
                  formattedDistance &&
                  canShowDistance(organization.primaryLocation);

                return (
                  <article
                    key={organization.id}
                    style={{
                      border: "1px solid #dddddd",
                      borderRadius: "16px",
                      padding: "20px",
                      background: "#ffffff",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                      display: "grid",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: "#666666",
                          fontSize: "13px",
                          marginBottom: "6px",
                        }}
                      >
                        {organization.primaryCategory?.name ??
                          t("directoryList.card.categoryMissing")}
                      </div>

                      <h3
                        style={{
                          margin: 0,
                          fontSize: "22px",
                          lineHeight: "1.2",
                        }}
                      >
                        {organization.name}
                      </h3>
                    </div>

                    <p
                      style={{
                        margin: 0,
                        color: "#555555",
                        lineHeight: "1.5",
                      }}
                    >
                      {organization.shortDescription ??
                        organization.description ??
                        t("directoryList.card.descriptionMissing")}
                    </p>

                    <div
                      style={{
                        display: "grid",
                        gap: "6px",
                        color: "#444444",
                        fontSize: "14px",
                      }}
                    >
                      <div>
                        <strong>{t("directoryList.card.type")}</strong>{" "}
                        {getOrganizationTypeLabel(organization.type, filters.locale)}
                      </div>
                      <div>
                        <strong>{t("directoryList.card.location")}</strong>{" "}
                        {getLocationLabel(organization.primaryLocation, filters.locale)}
                      </div>
                      <div>
                        <strong>{t("directoryList.card.district")}</strong>{" "}
                        {organization.primaryLocation?.district ??
                          t("directoryList.card.districtMissing")}
                      </div>

                      {shouldShowDistance ? (
                        <div>
                          <strong>{t("directoryList.card.distance")}</strong>{" "}
                          {t("directoryList.card.approximately")}{" "}
                          {formattedDistance}
                          <div
                            style={{
                              marginTop: "4px",
                              color: "#777777",
                              fontSize: "13px",
                              lineHeight: "1.4",
                            }}
                          >
                            {getDistanceExplanation(
                              organization.primaryLocation,
                              filters.locale,
                            )}
                          </div>
                        </div>
                      ) : null}

                      <div>
                        <strong>{t("directoryList.card.verification")}</strong>{" "}
                        {getVerificationLabel(
                          organization.verificationStatus,
                          filters.locale,
                        )}
                      </div>
                    </div>

                    <section
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                        padding: "12px",
                        background: "#f9fafb",
                        display: "grid",
                        gap: "8px",
                        fontSize: "14px",
                      }}
                    >
                      <div style={{ fontWeight: 800 }}>
                        {t("directoryList.card.availableActions")}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            border: "1px solid #bfdbfe",
                            borderRadius: "999px",
                            padding: "6px 10px",
                            background: "#eff6ff",
                            color: "#1e3a8a",
                            fontWeight: 700,
                          }}
                        >
                          Offers: {actionStats.activeOffersCount}
                        </span>

                        <span
                          style={{
                            display: "inline-block",
                            border: "1px solid #bfdbfe",
                            borderRadius: "999px",
                            padding: "6px 10px",
                            background: actionStats.hasActiveCertificates
                              ? "#eff6ff"
                              : "#ffffff",
                            color: actionStats.hasActiveCertificates
                              ? "#1e3a8a"
                              : "#666666",
                            fontWeight: 700,
                          }}
                        >
                          Certificates: {actionStats.activeCertificatesCount}
                        </span>

                        <span
                          style={{
                            display: "inline-block",
                            border: actionStats.canRegisterPurchase
                              ? "1px solid #bbf7d0"
                              : "1px solid #dddddd",
                            borderRadius: "999px",
                            padding: "6px 10px",
                            background: actionStats.canRegisterPurchase
                              ? "#f0fdf4"
                              : "#ffffff",
                            color: actionStats.canRegisterPurchase
                              ? "#166534"
                              : "#666666",
                            fontWeight: 700,
                          }}
                        >
                          POINTS:{" "}
                          {actionStats.canRegisterPurchase
                            ? t("directoryList.card.pointsAvailable")
                            : t("directoryList.card.pointsUnavailable")}
                        </span>
                      </div>
                    </section>

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                        marginTop: "4px",
                      }}
                    >
                      <Link
                        href={organizationHref}
                        style={{
                          display: "inline-block",
                          padding: "9px 12px",
                          borderRadius: "8px",
                          border: "1px solid #2563eb",
                          background: "#2563eb",
                          color: "#ffffff",
                          textDecoration: "none",
                          fontWeight: 700,
                        }}
                      >
                        {t("directoryList.card.openCard")}
                      </Link>

                      {organization.publicSlug &&
                      actionStats.canRegisterPurchase ? (
                        <Link
                          href={`${organizationHref}#register-purchase`}
                          style={{
                            display: "inline-block",
                            padding: "9px 12px",
                            borderRadius: "8px",
                            border: "1px solid #16a34a",
                            background: "#16a34a",
                            color: "#ffffff",
                            textDecoration: "none",
                            fontWeight: 800,
                          }}
                        >
                          {t("directoryList.card.registerPurchase")}
                        </Link>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

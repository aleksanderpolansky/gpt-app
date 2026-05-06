import Link from "next/link";

export const dynamic = "force-dynamic";

type DirectoryActionFilter =
  | "all"
  | "hasOffers"
  | "hasCertificates"
  | "canRegisterPurchase";

type DirectoryPageProps = {
  searchParams?: Promise<{
    q?: string | string[];
    category?: string | string[];
    city?: string | string[];
    district?: string | string[];
    countryCode?: string | string[];
    action?: string | string[];
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
    limit: number;
  };
  error?: string;
};

type DirectoryFilters = {
  q: string;
  category: string;
  city: string;
  district: string;
  countryCode: string;
  action: DirectoryActionFilter;
};

type DirectoryDistrictOption = {
  city: string;
  district: string;
  countryCode: string;
  label: string;
};

const DIRECTORY_CATEGORIES = [
  {
    slug: "auto",
    name: "Авто",
  },
  {
    slug: "beauty",
    name: "Красота",
  },
  {
    slug: "health-and-wellness",
    name: "Здоровье и wellness",
  },
  {
    slug: "food-and-drinks",
    name: "Еда и напитки",
  },
  {
    slug: "sport-and-fitness",
    name: "Спорт и фитнес",
  },
  {
    slug: "education",
    name: "Образование",
  },
  {
    slug: "retail",
    name: "Розница",
  },
  {
    slug: "home-services",
    name: "Домашние услуги",
  },
  {
    slug: "professional-services",
    name: "Профессиональные услуги",
  },
  {
    slug: "b2b-services",
    name: "B2B-услуги",
  },
  {
    slug: "events-and-entertainment",
    name: "События и развлечения",
  },
  {
    slug: "other",
    name: "Другое",
  },
];

const DIRECTORY_CITIES = [
  {
    city: "Szczecin",
    countryCode: "PL",
    label: "Szczecin, PL",
  },
];

const DIRECTORY_DISTRICTS: DirectoryDistrictOption[] = [
  {
    city: "Szczecin",
    district: "Centrum",
    countryCode: "PL",
    label: "Centrum",
  },
];

const DIRECTORY_ACTION_FILTERS: {
  value: DirectoryActionFilter;
  label: string;
}[] = [
  {
    value: "all",
    label: "Все предприятия",
  },
  {
    value: "hasOffers",
    label: "Есть предложения",
  },
  {
    value: "hasCertificates",
    label: "Есть сертификаты",
  },
  {
    value: "canRegisterPurchase",
    label: "Можно зарегистрировать покупку / POINTS",
  },
];

function getBaseUrl() {
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

  searchParams.set("limit", "100");

  const queryString = searchParams.toString();

  if (!queryString) {
    return `${baseUrl}/api/directory/organizations`;
  }

  return `${baseUrl}/api/directory/organizations?${queryString}`;
}

async function getDirectoryOrganizations(
  filters: DirectoryFilters
): Promise<{
  organizations: DirectoryOrganization[];
  errorMessage: string | null;
}> {
  const baseUrl = getBaseUrl();
  const apiUrl = buildDirectoryApiUrl(baseUrl, filters);

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      cache: "no-store",
    });

    const json = (await response.json()) as DirectoryApiResponse;

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

function getLocationLabel(location: DirectoryLocation | null) {
  if (!location) {
    return "Локация не указана";
  }

  if (location.addressVisibility === "hidden") {
    return "Адрес скрыт";
  }

  const parts = [
    location.city,
    location.district,
    location.addressVisibility === "public" ? location.streetAddress : null,
  ].filter(Boolean);

  if (parts.length === 0) {
    return "Локация не указана";
  }

  if (location.addressVisibility === "approximate") {
    return `${parts.join(", ")} · приблизительная локация`;
  }

  return parts.join(", ");
}

function getVerificationLabel(status: string | null | undefined) {
  if (status === "verified") {
    return "Проверено";
  }

  if (status === "pending") {
    return "На проверке";
  }

  if (status === "rejected") {
    return "Проверка отклонена";
  }

  if (status === "revoked") {
    return "Проверка отозвана";
  }

  return "Не проверено";
}

function getOrganizationTypeLabel(type: string | null | undefined) {
  if (type === "private_business") {
    return "Частное предприятие";
  }

  if (type === "company") {
    return "Компания";
  }

  if (type === "ngo") {
    return "Организация";
  }

  return type ?? "Предприятие";
}

function getDirectoryOrganizationHref(organization: DirectoryOrganization) {
  if (organization.publicSlug) {
    return `/directory/${organization.publicSlug}`;
  }

  return "/directory";
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
      filters.action !== "all"
  );
}

function getActionFilterLabel(action: DirectoryActionFilter) {
  return (
    DIRECTORY_ACTION_FILTERS.find((filter) => filter.value === action)?.label ??
    "Все предприятия"
  );
}

function getDistrictOptions(filters: DirectoryFilters) {
  return DIRECTORY_DISTRICTS.filter((districtOption) => {
    if (filters.city && districtOption.city !== filters.city) {
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
  districtOptions: DirectoryDistrictOption[]
) {
  if (!district) {
    return "Все районы";
  }

  return (
    districtOptions.find((districtOption) => districtOption.district === district)
      ?.label ?? district
  );
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
  };

  const districtOptions = getDistrictOptions(filters);

  const { organizations, errorMessage } =
    await getDirectoryOrganizations(filters);

  const selectedCategory = DIRECTORY_CATEGORIES.find(
    (category) => category.slug === filters.category
  );

  const selectedCity = DIRECTORY_CITIES.find(
    (cityOption) =>
      cityOption.city === filters.city &&
      (!filters.countryCode || cityOption.countryCode === filters.countryCode)
  );

  const selectedDistrictLabel = getDistrictLabel(
    filters.district,
    districtOptions
  );

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
            Каталог предприятий
          </h1>

          <p
            style={{
              margin: "0 0 6px",
              color: "#555555",
              fontSize: "16px",
              lineHeight: "1.5",
            }}
          >
            Здесь отображаются опубликованные предприятия, связанные с
            предложениями, сертификатами и POINTS.
          </p>

          <p
            style={{
              margin: 0,
              color: "#666666",
              fontSize: "14px",
              lineHeight: "1.5",
            }}
          >
            В каталоге показываются только предприятия, которые включили
            публичный профиль и были опубликованы в directory layer. Если адрес
            скрыт или указан приблизительно, точный адрес и точные координаты не
            раскрываются.
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
            Поиск и фильтры
          </h2>

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
            <label style={{ display: "grid", gap: "7px", fontWeight: 700 }}>
              Поиск
              <input
                name="q"
                defaultValue={filters.q}
                placeholder="Название, описание, услуга..."
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
              Категория
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
                <option value="">Все категории</option>
                {DIRECTORY_CATEGORIES.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: "7px", fontWeight: 700 }}>
              Город
              <select
                name="city"
                defaultValue={filters.city}
                style={{
                  border: "1px solid #cccccc",
                  borderRadius: "8px",
                  padding: "11px 12px",
                  fontSize: "15px",
                  fontWeight: 400,
                  background: "#ffffff",
                }}
              >
                <option value="">Все города</option>
                {DIRECTORY_CITIES.map((cityOption) => (
                  <option key={cityOption.label} value={cityOption.city}>
                    {cityOption.label}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: "7px", fontWeight: 700 }}>
              Район
              <select
                name="district"
                defaultValue={filters.district}
                style={{
                  border: "1px solid #cccccc",
                  borderRadius: "8px",
                  padding: "11px 12px",
                  fontSize: "15px",
                  fontWeight: 400,
                  background: "#ffffff",
                }}
              >
                <option value="">Все районы</option>

                {filters.district &&
                !districtOptions.some(
                  (districtOption) =>
                    districtOption.district === filters.district
                ) ? (
                  <option value={filters.district}>
                    {filters.district} / временный URL-фильтр
                  </option>
                ) : null}

                {districtOptions.map((districtOption) => (
                  <option
                    key={`${districtOption.city}-${districtOption.district}`}
                    value={districtOption.district}
                  >
                    {districtOption.label}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: "7px", fontWeight: 700 }}>
              Страна
              <select
                name="countryCode"
                defaultValue={filters.countryCode}
                style={{
                  border: "1px solid #cccccc",
                  borderRadius: "8px",
                  padding: "11px 12px",
                  fontSize: "15px",
                  fontWeight: 400,
                  background: "#ffffff",
                }}
              >
                <option value="">Все страны</option>
                <option value="PL">Poland / PL</option>
              </select>
            </label>

            <label style={{ display: "grid", gap: "7px", fontWeight: 700 }}>
              Действие пользователя
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
                    {filter.label}
                  </option>
                ))}
              </select>
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
                Применить фильтры
              </button>

              <Link
                href="/directory"
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
                Сбросить
              </Link>
            </div>
          </form>

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
              <strong>Активные фильтры:</strong>

              <div>
                {filters.q ? (
                  <span>
                    Поиск: <strong>{filters.q}</strong>{" "}
                  </span>
                ) : null}

                {selectedCategory ? (
                  <span>
                    Категория: <strong>{selectedCategory.name}</strong>{" "}
                  </span>
                ) : null}

                {selectedCity ? (
                  <span>
                    Город: <strong>{selectedCity.label}</strong>{" "}
                  </span>
                ) : filters.city ? (
                  <span>
                    Город: <strong>{filters.city}</strong>{" "}
                  </span>
                ) : null}

                {filters.district ? (
                  <span>
                    Район: <strong>{selectedDistrictLabel}</strong>{" "}
                  </span>
                ) : null}

                {filters.countryCode ? (
                  <span>
                    Страна: <strong>{filters.countryCode}</strong>{" "}
                  </span>
                ) : null}

                {filters.action !== "all" ? (
                  <span>
                    Действие:{" "}
                    <strong>{getActionFilterLabel(filters.action)}</strong>
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>

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
              Найдено
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
              Текущий город
            </div>
            <div style={{ fontSize: "24px", fontWeight: 700 }}>
              {filters.city || "Все города"}
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
              Район
            </div>
            <div style={{ fontSize: "24px", fontWeight: 700 }}>
              {filters.district ? selectedDistrictLabel : "Все районы"}
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
              Категория
            </div>
            <div style={{ fontSize: "24px", fontWeight: 700 }}>
              {selectedCategory?.name ?? "Все"}
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
              Действие
            </div>
            <div style={{ fontSize: "22px", fontWeight: 800 }}>
              {getActionFilterLabel(filters.action)}
            </div>
          </div>
        </section>

        {errorMessage ? (
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
            <h2 style={{ marginTop: 0 }}>Ошибка загрузки каталога</h2>
            <p>{errorMessage}</p>
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
              Опубликованные предприятия
            </h2>
            <p style={{ margin: "6px 0 0", color: "#666666" }}>
              На этом этапе показывается только безопасная публичная информация:
              название, категория, город, район, тип локации, публичные действия
              и ссылка на карточку.
            </p>
          </div>

          {organizations.length === 0 ? (
            <div style={{ padding: "24px", color: "#666666" }}>
              По выбранным фильтрам предприятия не найдены.
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
                  getDirectoryOrganizationHref(organization);
                const actionStats = getActionStats(organization);

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
                          "Категория не указана"}
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
                        "Описание пока не добавлено."}
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
                        <strong>Тип:</strong>{" "}
                        {getOrganizationTypeLabel(organization.type)}
                      </div>
                      <div>
                        <strong>Локация:</strong>{" "}
                        {getLocationLabel(organization.primaryLocation)}
                      </div>
                      <div>
                        <strong>Район:</strong>{" "}
                        {organization.primaryLocation?.district ?? "Не указан"}
                      </div>
                      <div>
                        <strong>Проверка:</strong>{" "}
                        {getVerificationLabel(organization.verificationStatus)}
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
                        Доступные действия
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
                            ? "можно"
                            : "недоступно"}
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
                        Открыть карточку
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
                          Зарегистрировать покупку
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
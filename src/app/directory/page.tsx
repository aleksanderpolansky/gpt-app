import Link from "next/link";

export const dynamic = "force-dynamic";

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
};

type DirectoryApiResponse = {
  ok: boolean;
  organizations?: DirectoryOrganization[];
  count?: number;
  error?: string;
};

async function getDirectoryOrganizations(): Promise<{
  organizations: DirectoryOrganization[];
  errorMessage: string | null;
}> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

  try {
    const response = await fetch(`${baseUrl}/api/directory/organizations`, {
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

  const parts = [
    location.city,
    location.district,
    location.addressVisibility === "public" ? location.streetAddress : null,
  ].filter(Boolean);

  if (parts.length === 0) {
    return "Локация не указана";
  }

  if (location.addressVisibility === "hidden") {
    return "Адрес скрыт";
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

export default async function DirectoryPage() {
  const { organizations, errorMessage } = await getDirectoryOrganizations();

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
            Здесь будут отображаться опубликованные предприятия, связанные с
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
            скрыт или указан приблизительно, точный адрес не раскрывается.
          </p>
        </header>

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
              Опубликовано
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
            <div style={{ fontSize: "24px", fontWeight: 700 }}>Szczecin</div>
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
              Статус MVP
            </div>
            <div style={{ fontSize: "24px", fontWeight: 700 }}>
              Directory test
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
              название, категория, город, тип локации и ссылки на карточку.
            </p>
          </div>

          {organizations.length === 0 ? (
            <div style={{ padding: "24px", color: "#666666" }}>
              В каталоге пока нет опубликованных предприятий.
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
                const organizationHref = organization.publicSlug
                  ? `/directory/${organization.publicSlug}`
                  : `/organizations/${organization.id}`;

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
                        {organization.primaryCategory?.name ?? "Категория не указана"}
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
                        <strong>Проверка:</strong>{" "}
                        {getVerificationLabel(organization.verificationStatus)}
                      </div>
                    </div>

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

                      <Link
                        href={`/organizations/${organization.id}`}
                        style={{
                          display: "inline-block",
                          padding: "9px 12px",
                          borderRadius: "8px",
                          border: "1px solid #dddddd",
                          background: "#ffffff",
                          color: "#111111",
                          textDecoration: "none",
                          fontWeight: 600,
                        }}
                      >
                        Внутренняя страница
                      </Link>
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
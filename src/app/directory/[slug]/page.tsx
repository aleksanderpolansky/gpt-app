import Link from "next/link";
import { notFound } from "next/navigation";

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
  socialLinks: Record<string, unknown>;
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

type DirectoryOrganizationApiResponse = {
  ok: boolean;
  organization?: DirectoryOrganization;
  error?: string;
};

type DirectoryOrganizationPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

async function getDirectoryOrganization(slug: string): Promise<{
  organization: DirectoryOrganization | null;
  errorMessage: string | null;
}> {
  try {
    const response = await fetch(
      `${getBaseUrl()}/api/directory/organizations/${encodeURIComponent(slug)}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const json = (await response.json()) as DirectoryOrganizationApiResponse;

    if (response.status === 404) {
      return {
        organization: null,
        errorMessage: null,
      };
    }

    if (!response.ok || !json.ok || !json.organization) {
      return {
        organization: null,
        errorMessage: json.error ?? "Cannot load directory organization",
      };
    }

    return {
      organization: json.organization,
      errorMessage: null,
    };
  } catch (error) {
    return {
      organization: null,
      errorMessage:
        error instanceof Error
          ? error.message
          : "Unknown directory organization error",
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

function getAddressVisibilityLabel(visibility: string | null | undefined) {
  if (visibility === "public") {
    return "Публичный адрес";
  }

  if (visibility === "approximate") {
    return "Приблизительная локация";
  }

  if (visibility === "hidden") {
    return "Адрес скрыт";
  }

  return "Не указано";
}

export default async function DirectoryOrganizationPage({
  params,
}: DirectoryOrganizationPageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  const { organization, errorMessage } = await getDirectoryOrganization(slug);

  if (!organization && !errorMessage) {
    notFound();
  }

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
        <header style={{ marginBottom: "24px" }}>
          <Link
            href="/directory"
            style={{
              color: "#2563eb",
              textDecoration: "underline",
              display: "inline-block",
              marginBottom: "16px",
            }}
          >
            ← Назад в каталог
          </Link>

          {errorMessage ? (
            <>
              <h1
                style={{
                  fontSize: "32px",
                  lineHeight: "1.2",
                  fontWeight: 700,
                  margin: "0 0 10px",
                }}
              >
                Ошибка загрузки карточки
              </h1>

              <p
                style={{
                  margin: 0,
                  color: "#a40000",
                  fontSize: "16px",
                  lineHeight: "1.5",
                }}
              >
                {errorMessage}
              </p>
            </>
          ) : null}

          {organization ? (
            <>
              <div
                style={{
                  color: "#666666",
                  fontSize: "14px",
                  marginBottom: "8px",
                }}
              >
                {organization.primaryCategory?.name ?? "Категория не указана"}
              </div>

              <h1
                style={{
                  fontSize: "38px",
                  lineHeight: "1.15",
                  fontWeight: 700,
                  margin: "0 0 10px",
                }}
              >
                {organization.name}
              </h1>

              <p
                style={{
                  margin: "0 0 8px",
                  color: "#555555",
                  fontSize: "17px",
                  lineHeight: "1.5",
                }}
              >
                {organization.shortDescription ??
                  organization.description ??
                  "Описание пока не добавлено."}
              </p>

              <p
                style={{
                  margin: 0,
                  color: "#666666",
                  fontSize: "14px",
                  lineHeight: "1.5",
                }}
              >
                На этой публичной карточке показывается только безопасная
                информация предприятия. Если адрес скрыт или указан
                приблизительно, точный адрес не раскрывается.
              </p>
            </>
          ) : null}
        </header>

        {organization ? (
          <>
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
                  padding: "20px",
                  background: "#ffffff",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ color: "#666666", marginBottom: "8px" }}>
                  Тип
                </div>
                <div style={{ fontSize: "18px", fontWeight: 700 }}>
                  {getOrganizationTypeLabel(organization.type)}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #dddddd",
                  borderRadius: "16px",
                  padding: "20px",
                  background: "#ffffff",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ color: "#666666", marginBottom: "8px" }}>
                  Проверка
                </div>
                <div style={{ fontSize: "18px", fontWeight: 700 }}>
                  {getVerificationLabel(organization.verificationStatus)}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #dddddd",
                  borderRadius: "16px",
                  padding: "20px",
                  background: "#ffffff",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ color: "#666666", marginBottom: "8px" }}>
                  Локация
                </div>
                <div style={{ fontSize: "18px", fontWeight: 700 }}>
                  {getLocationLabel(organization.primaryLocation)}
                </div>
              </div>
            </section>

            <section
              style={{
                border: "1px solid #dddddd",
                borderRadius: "16px",
                background: "#ffffff",
                overflow: "hidden",
                boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  padding: "20px 24px",
                  borderBottom: "1px solid #eeeeee",
                }}
              >
                <h2 style={{ margin: 0, fontSize: "22px" }}>
                  Информация о предприятии
                </h2>
                <p style={{ margin: "6px 0 0", color: "#666666" }}>
                  Базовая публичная информация из каталога.
                </p>
              </div>

              <div
                style={{
                  padding: "20px 24px",
                  display: "grid",
                  gap: "12px",
                }}
              >
                <div>
                  <strong>Категория:</strong>{" "}
                  {organization.primaryCategory?.name ?? "Не указана"}
                </div>

                <div>
                  <strong>Страна:</strong>{" "}
                  {organization.countryCode ?? "Не указана"}
                </div>

                <div>
                  <strong>Валюта:</strong>{" "}
                  {organization.defaultCurrency ?? "Не указана"}
                </div>

                <div>
                  <strong>Видимость адреса:</strong>{" "}
                  {getAddressVisibilityLabel(
                    organization.primaryLocation?.addressVisibility
                  )}
                </div>

                <div>
                  <strong>Город:</strong>{" "}
                  {organization.primaryLocation?.city ?? "Не указан"}
                </div>

                {organization.publicEmail ? (
                  <div>
                    <strong>Email:</strong> {organization.publicEmail}
                  </div>
                ) : null}

                {organization.publicPhone ? (
                  <div>
                    <strong>Телефон:</strong> {organization.publicPhone}
                  </div>
                ) : null}

                {organization.websiteUrl ? (
                  <div>
                    <strong>Сайт:</strong>{" "}
                    <a
                      href={organization.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {organization.websiteUrl}
                    </a>
                  </div>
                ) : null}

                {organization.bookingUrl ? (
                  <div>
                    <strong>Бронирование:</strong>{" "}
                    <a
                      href={organization.bookingUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {organization.bookingUrl}
                    </a>
                  </div>
                ) : null}
              </div>
            </section>

            <section
              style={{
                border: "1px solid #bfdbfe",
                borderRadius: "16px",
                background: "#eff6ff",
                padding: "20px 24px",
                marginBottom: "24px",
                color: "#1e3a8a",
              }}
            >
              <h2 style={{ margin: "0 0 8px", fontSize: "20px" }}>
                Offers, certificates и POINTS
              </h2>
              <p style={{ margin: 0, lineHeight: "1.5" }}>
                На следующем этапе эта карточка будет связана с публичными
                предложениями, сертификатами и регистрацией покупки. POINTS —
                это бонусные единицы программы лояльности, а не деньги, валюта
                или средство платежа.
              </p>
            </section>

            <section
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <Link
                href="/directory"
                style={{
                  display: "inline-block",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #dddddd",
                  background: "#ffffff",
                  color: "#111111",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                Назад в каталог
              </Link>

              <Link
                href={`/organizations/${organization.id}`}
                style={{
                  display: "inline-block",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #2563eb",
                  background: "#2563eb",
                  color: "#ffffff",
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                Внутренняя страница предприятия
              </Link>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
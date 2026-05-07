"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
  created_at: string;
  primaryLocation?: OrganizationLocation | null;
};

function getLocationLabel(location: OrganizationLocation | null | undefined) {
  if (!location) {
    return "Локация не указана";
  }

  if (location.address_visibility === "hidden") {
    return "Адрес скрыт";
  }

  const parts = [location.country_code, location.city, location.district].filter(
    Boolean
  );

  if (parts.length === 0) {
    return "Локация не указана";
  }

  return parts.join(" → ");
}

function getLocationPrivacyLabel(
  location: OrganizationLocation | null | undefined
) {
  if (!location) {
    return null;
  }

  if (location.address_visibility === "approximate") {
    return "Показывается приблизительная локация";
  }

  if (location.address_visibility === "public") {
    return "Публичная локация";
  }

  if (location.address_visibility === "hidden") {
    return "Скрытая локация";
  }

  return null;
}

function getLocationStatusLabel(
  location: OrganizationLocation | null | undefined
) {
  if (!location) {
    return null;
  }

  if (location.geoStatusLabel) {
    return location.geoStatusLabel;
  }

  return null;
}

function isAuthError(error: string) {
  return error.trim().toLowerCase() === "not authenticated";
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadOrganizations() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/organizations", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setError(data.error || "Ошибка загрузки организаций.");
        return;
      }

      setOrganizations(data.organizations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadOrganizations();
  }, []);

  const authError = isAuthError(error);

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
          maxWidth: "960px",
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
            Мои организации
          </h1>

          <p
            style={{
              margin: "0 0 20px",
              color: "#555555",
              fontSize: "16px",
              lineHeight: "1.5",
            }}
          >
            Это личный кабинет владельца предприятия. Здесь можно управлять
            своими организациями, товарами, услугами, сертификатами и
            предложениями.
          </p>

          <nav
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "24px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/"
              style={{
                color: "#2563eb",
                textDecoration: "underline",
                fontSize: "16px",
              }}
            >
              На главную
            </Link>

            <Link
              href="/directory"
              style={{
                color: "#2563eb",
                textDecoration: "underline",
                fontSize: "16px",
              }}
            >
              Публичный каталог
            </Link>

            <Link
              href="/organizations/new"
              style={{
                color: "#2563eb",
                textDecoration: "underline",
                fontSize: "16px",
              }}
            >
              Создать организацию
            </Link>

            <Link
              href="/value-objects"
              style={{
                color: "#2563eb",
                textDecoration: "underline",
                fontSize: "16px",
              }}
            >
              Value objects
            </Link>

            <Link
              href="/offers"
              style={{
                color: "#2563eb",
                textDecoration: "underline",
                fontSize: "16px",
              }}
            >
              Offers
            </Link>
          </nav>
        </header>

        {isLoading && (
          <div
            style={{
              border: "1px solid #dddddd",
              borderRadius: "10px",
              padding: "18px",
              background: "#f9fafb",
            }}
          >
            Загружаю организации...
          </div>
        )}

        {!isLoading && authError ? (
          <section
            style={{
              border: "1px solid #bfdbfe",
              borderRadius: "14px",
              padding: "24px",
              background: "#eff6ff",
              color: "#1e3a8a",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
            }}
          >
            <h2
              style={{
                margin: "0 0 12px",
                fontSize: "24px",
                lineHeight: "1.25",
              }}
            >
              Нужно войти в аккаунт
            </h2>

            <p
              style={{
                margin: "0 0 10px",
                fontSize: "16px",
                lineHeight: "1.5",
              }}
            >
              Страница <strong>“Мои организации”</strong> — это приватный
              кабинет владельца. Чтобы увидеть свои предприятия и управлять ими,
              войди в аккаунт.
            </p>

            <p
              style={{
                margin: "0 0 18px",
                fontSize: "15px",
                lineHeight: "1.5",
                color: "#1f2937",
              }}
            >
              Публичный каталог предприятий доступен без авторизации отдельно на
              странице <strong>/directory</strong>.
            </p>

            <div
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <Link
                href="/auth/login"
                style={{
                  display: "inline-block",
                  border: "1px solid #2563eb",
                  borderRadius: "8px",
                  padding: "11px 16px",
                  background: "#2563eb",
                  color: "#ffffff",
                  textDecoration: "none",
                  fontWeight: 800,
                }}
              >
                Войти
              </Link>

              <Link
                href="/directory"
                style={{
                  display: "inline-block",
                  border: "1px solid #bfdbfe",
                  borderRadius: "8px",
                  padding: "10px 16px",
                  background: "#ffffff",
                  color: "#2563eb",
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                Перейти в публичный каталог
              </Link>
            </div>
          </section>
        ) : null}

        {!isLoading && error && !authError ? (
          <div
            style={{
              border: "1px solid #f5c2c7",
              borderRadius: "10px",
              padding: "18px",
              background: "#f8d7da",
              color: "#842029",
            }}
          >
            {error}
          </div>
        ) : null}

        {!isLoading && !error && organizations.length === 0 && (
          <div
            style={{
              border: "1px solid #facc15",
              borderRadius: "10px",
              padding: "18px",
              background: "#fefce8",
            }}
          >
            У тебя пока нет организаций.
          </div>
        )}

        {!isLoading && !error && organizations.length > 0 && (
          <section
            style={{
              display: "grid",
              gap: "16px",
            }}
          >
            {organizations.map((organization) => {
              const locationLabel = getLocationLabel(
                organization.primaryLocation
              );
              const locationPrivacyLabel = getLocationPrivacyLabel(
                organization.primaryLocation
              );
              const locationStatusLabel = getLocationStatusLabel(
                organization.primaryLocation
              );

              return (
                <article
                  key={organization.id}
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
                      fontSize: "22px",
                      lineHeight: "1.25",
                      fontWeight: 700,
                      margin: "0 0 10px",
                    }}
                  >
                    {organization.organization_name}
                  </h2>

                  <p style={{ margin: "0 0 6px" }}>
                    <strong>Тип:</strong> {organization.organization_type}
                  </p>

                  <p style={{ margin: "0 0 6px" }}>
                    <strong>Статус:</strong> {organization.status}
                  </p>

                  <p style={{ margin: "0 0 6px" }}>
                    <strong>Локация:</strong> {locationLabel}
                  </p>

                  {locationPrivacyLabel ? (
                    <p
                      style={{
                        margin: "0 0 6px",
                        color: "#666666",
                        fontSize: "14px",
                      }}
                    >
                      {locationPrivacyLabel}
                    </p>
                  ) : null}

                  {locationStatusLabel ? (
                    <p
                      style={{
                        margin: "0 0 6px",
                        color: "#92400e",
                        fontSize: "14px",
                        fontWeight: 700,
                      }}
                    >
                      Статус локации: {locationStatusLabel}
                    </p>
                  ) : null}

                  {organization.description && (
                    <p style={{ margin: "10px 0 0" }}>
                      <strong>Описание:</strong> {organization.description}
                    </p>
                  )}

                  <p
                    style={{
                      margin: "14px 0 0",
                      fontSize: "14px",
                      color: "#666666",
                    }}
                  >
                    ID: {organization.id}
                  </p>

                  <div
                    style={{
                      marginTop: "16px",
                      display: "flex",
                      gap: "16px",
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <Link
                      href={`/organizations/${organization.id}`}
                      style={{
                        color: "#2563eb",
                        textDecoration: "underline",
                        fontWeight: 700,
                      }}
                    >
                      Открыть организацию
                    </Link>

                    <Link
                      href={`/value-objects/new?organizationId=${encodeURIComponent(
                        organization.id
                      )}`}
                      style={{
                        color: "#2563eb",
                        textDecoration: "underline",
                      }}
                    >
                      Создать value object
                    </Link>

                    <Link
                      href={`/offers/new?organizationId=${encodeURIComponent(
                        organization.id
                      )}`}
                      style={{
                        color: "#2563eb",
                        textDecoration: "underline",
                      }}
                    >
                      Создать offer
                    </Link>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
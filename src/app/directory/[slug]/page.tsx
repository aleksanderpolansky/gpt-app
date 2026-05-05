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

type PublicDirectoryOffer = {
  id: string;
  organizationId: string | null;
  offerType: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  isPaid: boolean;
  isFree: boolean;
  certificateAvailable: boolean;
  requiresBooking: boolean;
  bookingMode: string;
  defaultDurationMinutes: number | null;
  minDurationMinutes: number | null;
  maxDurationMinutes: number | null;
  quantityLimit: number | null;
  validFrom: string | null;
  validUntil: string | null;
  status: string;
  regularPrice: number | null;
  isDiscountActive: boolean;
  discountType: string | null;
  discountValue: number | null;
  discountStartsAt: string | null;
  discountEndsAt: string | null;
  lowestPrice30Days: number | null;
  lowestPrice30DaysCurrency: string | null;
  discountLegalNote: string | null;
  certificate: {
    available: boolean;
    paymentMode: string;
    pointsPrice: number;
    moneyPrice: number | null;
    currency: string | null;
    terms: string | null;
    validityDays: number | null;
    requiresSellerConfirmation: boolean;
    isTransferable: boolean;
    isCancellable: boolean;
    pointsRefundPolicy: string;
    maxCertificatesTotal: number | null;
  };
  createdAt: string;
  updatedAt: string | null;
};

type DirectoryOrganizationApiResponse = {
  ok: boolean;
  organization?: DirectoryOrganization;
  error?: string;
};

type DirectoryOrganizationOffersApiResponse = {
  ok: boolean;
  offers?: PublicDirectoryOffer[];
  count?: number;
  error?: string;
};

type DirectoryOrganizationPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function getBaseUrl() {
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

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

    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.includes("application/json")) {
      return {
        organization: null,
        errorMessage: "Directory organization API returned non-JSON response",
      };
    }

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

async function getDirectoryOrganizationOffers(slug: string): Promise<{
  offers: PublicDirectoryOffer[];
  errorMessage: string | null;
}> {
  try {
    const response = await fetch(
      `${getBaseUrl()}/api/directory/organizations/${encodeURIComponent(
        slug
      )}/offers`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.includes("application/json")) {
      return {
        offers: [],
        errorMessage: "Directory offers API returned non-JSON response",
      };
    }

    const json =
      (await response.json()) as DirectoryOrganizationOffersApiResponse;

    if (!response.ok || !json.ok) {
      return {
        offers: [],
        errorMessage: json.error ?? "Cannot load directory organization offers",
      };
    }

    return {
      offers: json.offers ?? [],
      errorMessage: null,
    };
  } catch (error) {
    return {
      offers: [],
      errorMessage:
        error instanceof Error
          ? error.message
          : "Unknown directory organization offers error",
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

function getOfferTypeLabel(type: string | null | undefined) {
  if (type === "bookable_service") {
    return "Услуга с бронированием";
  }

  if (type === "product") {
    return "Товар";
  }

  if (type === "service") {
    return "Услуга";
  }

  if (type === "bundle") {
    return "Набор / bundle";
  }

  if (type === "reward") {
    return "Reward offer";
  }

  return type ?? "Предложение";
}

function formatMoney(
  amount: number | null | undefined,
  currency: string | null | undefined
) {
  if (typeof amount !== "number") {
    return "—";
  }

  return `${new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: 2,
  }).format(amount)} ${currency ?? ""}`.trim();
}

function formatPoints(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "0";
  }

  return new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: 2,
  }).format(value);
}

function getCertificatePaymentLabel(offer: PublicDirectoryOffer) {
  if (!offer.certificate.available) {
    return "Сертификат недоступен";
  }

  if (offer.certificate.paymentMode === "points_only") {
    return `${formatPoints(offer.certificate.pointsPrice)} POINTS`;
  }

  if (offer.certificate.paymentMode === "money_only") {
    return formatMoney(
      offer.certificate.moneyPrice,
      offer.certificate.currency ?? offer.currency
    );
  }

  if (offer.certificate.paymentMode === "mixed") {
    return `${formatPoints(offer.certificate.pointsPrice)} POINTS + ${formatMoney(
      offer.certificate.moneyPrice,
      offer.certificate.currency ?? offer.currency
    )}`;
  }

  return "Сертификат доступен";
}

function getBookingLabel(offer: PublicDirectoryOffer) {
  if (!offer.requiresBooking) {
    return "Бронирование не требуется";
  }

  if (offer.defaultDurationMinutes) {
    return `Требуется бронирование · ${offer.defaultDurationMinutes} мин.`;
  }

  return "Требуется бронирование";
}

export default async function DirectoryOrganizationPage({
  params,
}: DirectoryOrganizationPageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  const [{ organization, errorMessage }, offersResult] = await Promise.all([
    getDirectoryOrganization(slug),
    getDirectoryOrganizationOffers(slug),
  ]);

  if (!organization && !errorMessage) {
    notFound();
  }

  const offers = offersResult.offers;
  const offersErrorMessage = offersResult.errorMessage;

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
                POINTS — это бонусные единицы программы лояльности, а не деньги,
                валюта или средство платежа. Публичные предложения ниже
                показывают только безопасные условия для покупателя.
              </p>
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
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: "22px" }}>
                    Публичные предложения
                  </h2>
                  <p style={{ margin: "6px 0 0", color: "#666666" }}>
                    Товары, услуги, наборы и сертификаты, доступные в публичной
                    карточке предприятия.
                  </p>
                </div>

                <div
                  style={{
                    border: "1px solid #dddddd",
                    borderRadius: "999px",
                    padding: "7px 12px",
                    color: "#444444",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  {offers.length} предложений
                </div>
              </div>

              {offersErrorMessage ? (
                <div
                  style={{
                    padding: "20px 24px",
                    color: "#a40000",
                    background: "#fff5f5",
                    borderBottom: "1px solid #f2b8b5",
                  }}
                >
                  {offersErrorMessage}
                </div>
              ) : null}

              {offers.length === 0 ? (
                <div style={{ padding: "24px", color: "#666666" }}>
                  У этого предприятия пока нет публичных предложений.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: "16px",
                    padding: "20px",
                  }}
                >
                  {offers.map((offer) => (
                    <article
                      key={offer.id}
                      style={{
                        border: "1px solid #dddddd",
                        borderRadius: "16px",
                        padding: "18px",
                        background: "#ffffff",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                        display: "grid",
                        gap: "10px",
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
                          {getOfferTypeLabel(offer.offerType)}
                        </div>

                        <h3
                          style={{
                            margin: 0,
                            fontSize: "20px",
                            lineHeight: "1.25",
                          }}
                        >
                          {offer.title}
                        </h3>
                      </div>

                      <p
                        style={{
                          margin: 0,
                          color: "#555555",
                          lineHeight: "1.5",
                        }}
                      >
                        {offer.description ?? "Описание пока не добавлено."}
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
                          <strong>Цена:</strong>{" "}
                          {offer.isFree
                            ? "Бесплатно"
                            : formatMoney(offer.price, offer.currency)}
                        </div>

                        {offer.regularPrice ? (
                          <div>
                            <strong>Обычная цена:</strong>{" "}
                            {formatMoney(offer.regularPrice, offer.currency)}
                          </div>
                        ) : null}

                        <div>
                          <strong>Бронирование:</strong>{" "}
                          {getBookingLabel(offer)}
                        </div>

                        <div>
                          <strong>Сертификат:</strong>{" "}
                          {offer.certificateAvailable
                            ? "Доступен"
                            : "Недоступен"}
                        </div>

                        {offer.certificateAvailable ? (
                          <>
                            <div>
                              <strong>Стоимость сертификата:</strong>{" "}
                              {getCertificatePaymentLabel(offer)}
                            </div>

                            <div>
                              <strong>Срок действия:</strong>{" "}
                              {offer.certificate.validityDays
                                ? `${offer.certificate.validityDays} дней`
                                : "Не указан"}
                            </div>

                            <div>
                              <strong>Можно отменить:</strong>{" "}
                              {offer.certificate.isCancellable ? "Да" : "Нет"}
                            </div>

                            <div>
                              <strong>Можно передать:</strong>{" "}
                              {offer.certificate.isTransferable ? "Да" : "Нет"}
                            </div>

                            {offer.certificate.terms ? (
                              <div>
                                <strong>Условия:</strong>{" "}
                                {offer.certificate.terms}
                              </div>
                            ) : null}
                          </>
                        ) : null}
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
                          href="/offers"
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
                          Смотреть предложения
                        </Link>

                        {offer.certificateAvailable ? (
                          <Link
                            href="/rewards"
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
                            Сертификаты
                          </Link>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              )}
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
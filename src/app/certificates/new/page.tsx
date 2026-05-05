import Link from "next/link";
import { supabase } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";

type CertificateNewPageProps = {
  searchParams?: Promise<{
    offerId?: string | string[];
  }>;
};

type OfferRow = {
  id: string;
  organization_id: string | null;
  offer_type: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  is_paid: boolean;
  is_free: boolean;
  certificate_available: boolean;
  certificate_payment_mode: string;
  certificate_points_price: number;
  certificate_money_price: number | null;
  certificate_currency: string | null;
  certificate_terms: string | null;
  certificate_validity_days: number | null;
  requires_seller_confirmation: boolean;
  is_transferable: boolean;
  is_cancellable: boolean;
  points_refund_policy: string;
  max_certificates_total: number | null;
  status: string;
  created_at: string;
  updated_at: string | null;
};

type OrganizationRow = {
  id: string;
  organization_name: string;
  organization_type: string;
  public_slug: string | null;
  directory_status: string | null;
  is_public_profile_enabled: boolean | null;
  is_listed_in_directory: boolean | null;
  status: string | null;
  country_code: string | null;
  default_currency: string | null;
};

type CertificateOrderPageData = {
  offer: OfferRow | null;
  organization: OrganizationRow | null;
  errorMessage: string | null;
};

function getFirstSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

async function getCertificateOrderPageData(
  offerId: string | null
): Promise<CertificateOrderPageData> {
  if (!offerId) {
    return {
      offer: null,
      organization: null,
      errorMessage: "Offer id is missing",
    };
  }

  const { data: offerData, error: offerError } = await supabase
    .from("offers")
    .select(
      `
      id,
      organization_id,
      offer_type,
      title,
      description,
      price,
      currency,
      is_paid,
      is_free,
      certificate_available,
      certificate_payment_mode,
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
      status,
      created_at,
      updated_at
    `
    )
    .eq("id", offerId)
    .eq("status", "active")
    .single();

  if (offerError || !offerData) {
    return {
      offer: null,
      organization: null,
      errorMessage: offerError?.message ?? "Offer not found",
    };
  }

  const offer = offerData as OfferRow;

  if (!offer.organization_id) {
    return {
      offer,
      organization: null,
      errorMessage: null,
    };
  }

  const { data: organizationData, error: organizationError } = await supabase
    .from("organizations")
    .select(
      `
      id,
      organization_name,
      organization_type,
      public_slug,
      directory_status,
      is_public_profile_enabled,
      is_listed_in_directory,
      status,
      country_code,
      default_currency
    `
    )
    .eq("id", offer.organization_id)
    .eq("status", "active")
    .single();

  if (organizationError || !organizationData) {
    return {
      offer,
      organization: null,
      errorMessage: null,
    };
  }

  return {
    offer,
    organization: organizationData as OrganizationRow,
    errorMessage: null,
  };
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

function getCertificatePaymentLabel(offer: OfferRow | null) {
  if (!offer) {
    return "—";
  }

  if (!offer.certificate_available) {
    return "Сертификат недоступен";
  }

  if (offer.certificate_payment_mode === "points_only") {
    return `${formatPoints(offer.certificate_points_price)} POINTS`;
  }

  if (offer.certificate_payment_mode === "money_only") {
    return formatMoney(
      offer.certificate_money_price,
      offer.certificate_currency ?? offer.currency
    );
  }

  if (offer.certificate_payment_mode === "mixed") {
    return `${formatPoints(offer.certificate_points_price)} POINTS + ${formatMoney(
      offer.certificate_money_price,
      offer.certificate_currency ?? offer.currency
    )}`;
  }

  return "Сертификат доступен";
}

function getDirectoryHref(organization: OrganizationRow | null) {
  if (
    organization?.public_slug &&
    organization.directory_status === "published" &&
    organization.is_public_profile_enabled &&
    organization.is_listed_in_directory
  ) {
    return `/directory/${organization.public_slug}`;
  }

  return "/directory";
}

function getOfferHref(offer: OfferRow | null) {
  if (!offer?.id) {
    return "/offers";
  }

  return `/offers/${offer.id}`;
}

function getOrganizationInternalHref(organization: OrganizationRow | null) {
  if (!organization?.id) {
    return "/organizations";
  }

  return `/organizations/${organization.id}`;
}

export default async function NewCertificatePage({
  searchParams,
}: CertificateNewPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const offerId = getFirstSearchParam(resolvedSearchParams?.offerId);

  const { offer, organization, errorMessage } =
    await getCertificateOrderPageData(offerId);

  const directoryHref = getDirectoryHref(organization);
  const offerHref = getOfferHref(offer);
  const organizationInternalHref = getOrganizationInternalHref(organization);

  const canOrderCertificate = Boolean(offer?.certificate_available);

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
          maxWidth: "1050px",
          margin: "0 auto",
        }}
      >
        <header style={{ marginBottom: "24px" }}>
          <Link
            href={offer ? offerHref : directoryHref}
            style={{
              color: "#2563eb",
              textDecoration: "underline",
              display: "inline-block",
              marginBottom: "16px",
            }}
          >
            ← Назад к предложению
          </Link>

          <h1
            style={{
              fontSize: "38px",
              lineHeight: "1.15",
              fontWeight: 700,
              margin: "0 0 10px",
            }}
          >
            Заказ сертификата
          </h1>

          <p
            style={{
              margin: "0 0 16px",
              color: "#555555",
              fontSize: "17px",
              lineHeight: "1.5",
            }}
          >
            Сертификат создаётся на основании конкретного предложения
            предприятия. На этом шаге страница подготавливает заказ; запись
            заявки в базу данных будет добавлена следующим этапом.
          </p>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <Link
              href={offerHref}
              style={{
                display: "inline-block",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #dddddd",
                background: "#ffffff",
                color: "#111111",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Подробное описание offer
            </Link>

            <Link
              href={directoryHref}
              style={{
                display: "inline-block",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #dddddd",
                background: "#ffffff",
                color: "#111111",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Публичная карточка предприятия
            </Link>

            <Link
              href={organizationInternalHref}
              style={{
                display: "inline-block",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #16a34a",
                background: "#16a34a",
                color: "#ffffff",
                textDecoration: "none",
                fontWeight: 800,
              }}
            >
              Зарегистрировать покупку у предприятия
            </Link>
          </div>
        </header>

        {errorMessage ? (
          <section
            style={{
              border: "1px solid #f2b8b5",
              borderRadius: "16px",
              background: "#fff5f5",
              color: "#a40000",
              padding: "20px 24px",
              marginBottom: "24px",
            }}
          >
            <h2 style={{ margin: "0 0 8px", fontSize: "22px" }}>
              Ошибка загрузки
            </h2>
            <p style={{ margin: 0 }}>{errorMessage}</p>
          </section>
        ) : null}

        {offer ? (
          <>
            {!canOrderCertificate ? (
              <section
                style={{
                  border: "1px solid #f2b8b5",
                  borderRadius: "16px",
                  background: "#fff5f5",
                  color: "#a40000",
                  padding: "20px 24px",
                  marginBottom: "24px",
                }}
              >
                <h2 style={{ margin: "0 0 8px", fontSize: "22px" }}>
                  Сертификат недоступен
                </h2>
                <p style={{ margin: 0, lineHeight: "1.5" }}>
                  Для этого предложения заказ сертификата сейчас недоступен.
                </p>
              </section>
            ) : null}

            <section
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
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
                  Предприятие
                </div>
                <div style={{ fontSize: "20px", fontWeight: 700 }}>
                  {organization?.organization_name ?? "Не указано"}
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
                  Предложение
                </div>
                <div style={{ fontSize: "20px", fontWeight: 700 }}>
                  {offer.title}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #bfdbfe",
                  borderRadius: "16px",
                  padding: "20px",
                  background: "#eff6ff",
                  color: "#1e3a8a",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ marginBottom: "8px" }}>Стоимость сертификата</div>
                <div style={{ fontSize: "20px", fontWeight: 800 }}>
                  {getCertificatePaymentLabel(offer)}
                </div>
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
                POINTS и сертификаты
              </h2>
              <p style={{ margin: 0, lineHeight: "1.5" }}>
                POINTS — это бонусные единицы программы лояльности, а не деньги,
                валюта или средство платежа. Сертификат относится к выбранному
                offer, а регистрация покупки относится к предприятию в целом.
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
                }}
              >
                <h2 style={{ margin: 0, fontSize: "22px" }}>
                  Данные сертификата
                </h2>
                <p style={{ margin: "6px 0 0", color: "#666666" }}>
                  Информация, которая будет использована для создания заявки.
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
                  <strong>Offer id:</strong> {offer.id}
                </div>

                <div>
                  <strong>Тип предложения:</strong>{" "}
                  {getOfferTypeLabel(offer.offer_type)}
                </div>

                <div>
                  <strong>Описание:</strong>{" "}
                  {offer.description ?? "Описание пока не добавлено."}
                </div>

                <div>
                  <strong>Обычная цена offer:</strong>{" "}
                  {offer.is_free
                    ? "Бесплатно"
                    : formatMoney(offer.price, offer.currency)}
                </div>

                <div>
                  <strong>Сертификат доступен:</strong>{" "}
                  {offer.certificate_available ? "Да" : "Нет"}
                </div>

                <div>
                  <strong>Стоимость сертификата:</strong>{" "}
                  {getCertificatePaymentLabel(offer)}
                </div>

                <div>
                  <strong>Срок действия:</strong>{" "}
                  {offer.certificate_validity_days
                    ? `${offer.certificate_validity_days} дней`
                    : "Не указан"}
                </div>

                <div>
                  <strong>Требуется подтверждение продавца:</strong>{" "}
                  {offer.requires_seller_confirmation ? "Да" : "Нет"}
                </div>

                <div>
                  <strong>Можно отменить:</strong>{" "}
                  {offer.is_cancellable ? "Да" : "Нет"}
                </div>

                <div>
                  <strong>Можно передать:</strong>{" "}
                  {offer.is_transferable ? "Да" : "Нет"}
                </div>

                <div>
                  <strong>Политика возврата POINTS:</strong>{" "}
                  {offer.points_refund_policy}
                </div>

                {offer.max_certificates_total ? (
                  <div>
                    <strong>Максимальное количество сертификатов:</strong>{" "}
                    {offer.max_certificates_total}
                  </div>
                ) : null}

                {offer.certificate_terms ? (
                  <div>
                    <strong>Условия сертификата:</strong>{" "}
                    {offer.certificate_terms}
                  </div>
                ) : null}
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
                  Форма заказа сертификата
                </h2>
                <p style={{ margin: "6px 0 0", color: "#666666" }}>
                  Следующим шагом эта форма будет сохранять заявку в таблицу
                  certificates.
                </p>
              </div>

              <form
                style={{
                  padding: "20px 24px",
                  display: "grid",
                  gap: "14px",
                }}
              >
                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontWeight: 700 }}>Имя получателя</span>
                  <input
                    type="text"
                    name="receiver_person_name"
                    placeholder="Например: Anna Kowalska"
                    disabled={!canOrderCertificate}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "15px",
                    }}
                  />
                </label>

                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontWeight: 700 }}>Email получателя</span>
                  <input
                    type="email"
                    name="receiver_email"
                    placeholder="email@example.com"
                    disabled={!canOrderCertificate}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "15px",
                    }}
                  />
                </label>

                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontWeight: 700 }}>Сообщение</span>
                  <textarea
                    name="message"
                    placeholder="Короткое сообщение для получателя сертификата"
                    disabled={!canOrderCertificate}
                    rows={4}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "15px",
                      resize: "vertical",
                    }}
                  />
                </label>

                <button
                  type="button"
                  disabled
                  style={{
                    justifySelf: "start",
                    padding: "11px 16px",
                    borderRadius: "8px",
                    border: "1px solid #94a3b8",
                    background: "#e2e8f0",
                    color: "#475569",
                    fontWeight: 800,
                    cursor: "not-allowed",
                  }}
                >
                  Создание заявки будет добавлено следующим шагом
                </button>
              </form>
            </section>

            <section
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <Link
                href={offerHref}
                style={{
                  display: "inline-block",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #dddddd",
                  background: "#ffffff",
                  color: "#111111",
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                Назад к offer
              </Link>

              <Link
                href={directoryHref}
                style={{
                  display: "inline-block",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #dddddd",
                  background: "#ffffff",
                  color: "#111111",
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                Публичная карточка предприятия
              </Link>

              <Link
                href={organizationInternalHref}
                style={{
                  display: "inline-block",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #16a34a",
                  background: "#16a34a",
                  color: "#ffffff",
                  textDecoration: "none",
                  fontWeight: 800,
                }}
              >
                Зарегистрировать покупку у предприятия
              </Link>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
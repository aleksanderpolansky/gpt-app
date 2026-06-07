import Link from "next/link";

import { supabase } from "../../../../lib/supabase";

import CertificateOrderForm from "./CertificateOrderForm";

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
  offerId: string | null,
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
    `,
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
    `,
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
  currency: string | null | undefined,
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
  switch (type) {
    case "bookable_service":
      return "Услуга с бронированием";
    case "product":
      return "Товар";
    case "service":
      return "Услуга";
    case "bundle":
      return "Набор / bundle";
    case "reward":
      return "Reward offer";
    default:
      return type ?? "Предложение";
  }
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
      offer.certificate_currency ?? offer.currency,
    );
  }

  if (offer.certificate_payment_mode === "mixed") {
    return `${formatPoints(offer.certificate_points_price)} POINTS + ${formatMoney(
      offer.certificate_money_price,
      offer.certificate_currency ?? offer.currency,
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

function getPolicyLabel(policy: string | null | undefined) {
  switch (policy) {
    case "refund_until_seller_confirmation":
      return "Возврат до подтверждения продавца";
    case "refund_until_delivery":
      return "Возврат до оказания услуги";
    case "manual_review":
      return "Ручное рассмотрение";
    case "no_refund":
      return "Без возврата";
    default:
      return policy ?? "не указано";
  }
}

function getOrganizationTypeLabel(type: string | null | undefined) {
  switch (type) {
    case "private_business":
      return "частный бизнес";
    case "company":
      return "компания";
    case "non_profit":
      return "некоммерческая организация";
    case "public_institution":
      return "публичная организация";
    default:
      return type ?? "тип не указан";
  }
}

export default async function NewCertificatePage({
  searchParams,
}: CertificateNewPageProps) {
  const resolvedSearchParams = await searchParams;
  const offerId = getFirstSearchParam(resolvedSearchParams?.offerId);
  const { offer, organization, errorMessage } =
    await getCertificateOrderPageData(offerId);

  const canOrderCertificate = Boolean(
    offer?.certificate_available && offer.status === "active",
  );

  const organizationName = organization?.organization_name ?? "Предприятие не найдено";
  const offerTitle = offer?.title ?? "Предложение не найдено";
  const directoryHref = getDirectoryHref(organization);
  const offerHref = getOfferHref(offer);

  return (
    <main className="min-h-full bg-[#f5f6fb] px-4 py-8 text-[#1a1d2e]">
      <div className="mx-auto grid w-full max-w-[1120px] gap-5">
        <Link
          href={offerHref}
          className="w-fit rounded-full border border-[#dfe3f1] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4f6a] transition hover:bg-gray-50"
        >
          ← Назад к предложению
        </Link>

        <header className="rounded-[22px] border border-[rgba(0,0,0,0.07)] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7c8099]">
            Commercial core / Certificate order
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
            <div>
              <h1 className="text-[32px] font-bold tracking-[-0.035em] text-[#111827]">
                Получить подарочный сертификат
              </h1>

              <p className="mt-3 max-w-[820px] text-[14px] leading-6 text-[#5a5f7a]">
                Сертификат создаётся на основании конкретного предложения
                предприятия. Сейчас сертификат будет добавлен в список
                заказанных сертификатов в личном кабинете. Email-уведомление
                будет подключено позже.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href={offerHref}
                  className="rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50"
                >
                  Подробное описание offer
                </Link>

                <Link
                  href={directoryHref}
                  className="rounded-xl border border-[#dfe4ff] bg-[#eef2ff] px-4 py-3 text-[13px] font-bold text-[#3b6ef8] transition hover:bg-[#e4eaff]"
                >
                  Публичная карточка предприятия
                </Link>

                <Link
                  href="/my-certificates"
                  className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-[13px] font-bold text-[#15803d] transition hover:bg-[#dcfce7]"
                >
                  Мои сертификаты
                </Link>
              </div>
            </div>

            <aside className="grid content-start gap-3 rounded-[18px] border border-[#dbeafe] bg-[#eff6ff] p-5 text-[#1e3a8a]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                Стоимость сертификата
              </div>

              <div className="text-[28px] font-bold tracking-[-0.03em]">
                {getCertificatePaymentLabel(offer)}
              </div>

              <p className="text-[12px] leading-5">
                POINTS — бонусные единицы программы лояльности, а не деньги,
                валюта или средство платежа.
              </p>
            </aside>
          </div>
        </header>

        {errorMessage ? (
          <section className="rounded-[18px] border border-[#fecaca] bg-[#fff1f2] p-5 text-[#b42318] shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em]">
              Ошибка
            </div>
            <h2 className="mt-2 text-[22px] font-bold">
              Не удалось загрузить сертификат
            </h2>
            <p className="mt-2 text-[14px] leading-6">{errorMessage}</p>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[16px] border border-[rgba(0,0,0,0.07)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
              Предприятие
            </div>
            <div className="mt-2 text-[20px] font-bold text-[#111827]">
              {organizationName}
            </div>
            <div className="mt-1 text-[12px] text-[#7c8099]">
              {getOrganizationTypeLabel(organization?.organization_type)}
            </div>
          </article>

          <article className="rounded-[16px] border border-[rgba(0,0,0,0.07)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
              Предложение
            </div>
            <div className="mt-2 text-[20px] font-bold text-[#111827]">
              {offerTitle}
            </div>
            <div className="mt-1 text-[12px] text-[#7c8099]">
              {getOfferTypeLabel(offer?.offer_type)}
            </div>
          </article>

          <article className="rounded-[16px] border border-[rgba(0,0,0,0.07)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
              Статус
            </div>
            <div className="mt-2 text-[20px] font-bold text-[#111827]">
              {canOrderCertificate ? "Доступен" : "Недоступен"}
            </div>
            <div className="mt-1 text-[12px] text-[#7c8099]">
              {offer?.certificate_validity_days
                ? `${offer.certificate_validity_days} дней`
                : "срок не указан"}
            </div>
          </article>
        </section>

        <section className="rounded-[18px] border border-[#dbeafe] bg-[#eff6ff] p-6 text-[#1e3a8a] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em]">
            POINTS / email / availability
          </div>

          <h2 className="mt-2 text-[22px] font-bold">
            Что произойдёт после получения сертификата
          </h2>

          <div className="mt-3 grid gap-2 text-[13px] leading-6">
            <p className="m-0">
              <strong>Сертификат:</strong> будет создан через штатный API и
              должен появиться в личном кабинете в разделе “Мои сертификаты”.
            </p>
            <p className="m-0">
              <strong>Email:</strong> пока не отправляем. TODO: добавить email
              уведомление получателю сертификата.
            </p>
            <p className="m-0">
              <strong>Доступное количество:</strong> на следующем шаге публичная
              карточка предприятия должна показывать остаток: лимит минус уже
              заказанные активные сертификаты.
            </p>
          </div>
        </section>

        {offer ? (
          <section className="rounded-[18px] border border-[rgba(0,0,0,0.07)] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <div className="mb-4 border-b border-[#edf0f7] pb-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7c8099]">
                Данные сертификата
              </div>

              <h2 className="mt-2 text-[24px] font-bold text-[#111827]">
                {offer.title}
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[#edf0f7] bg-[#f8f9fd] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
                  Оплата
                </div>
                <div className="mt-2 text-[20px] font-bold text-[#111827]">
                  {getCertificatePaymentLabel(offer)}
                </div>
                <div className="mt-1 text-[12px] text-[#7c8099]">
                  Цена offer: {formatMoney(offer.price, offer.currency)}
                </div>
              </div>

              <div className="rounded-2xl border border-[#edf0f7] bg-[#f8f9fd] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
                  Условия
                </div>
                <div className="mt-2 grid gap-1 text-[13px] leading-5 text-[#5a5f7a]">
                  <p className="m-0">
                    Продавец подтверждает:{" "}
                    <strong className="text-[#343854]">
                      {offer.requires_seller_confirmation ? "да" : "нет"}
                    </strong>
                  </p>
                  <p className="m-0">
                    Можно передать:{" "}
                    <strong className="text-[#343854]">
                      {offer.is_transferable ? "да" : "нет"}
                    </strong>
                  </p>
                  <p className="m-0">
                    Можно отменить:{" "}
                    <strong className="text-[#343854]">
                      {offer.is_cancellable ? "да" : "нет"}
                    </strong>
                  </p>
                  <p className="m-0">
                    Возврат:{" "}
                    <strong className="text-[#343854]">
                      {getPolicyLabel(offer.points_refund_policy)}
                    </strong>
                  </p>
                  {offer.max_certificates_total ? (
                    <p className="m-0">
                      Лимит сертификатов:{" "}
                      <strong className="text-[#343854]">
                        {offer.max_certificates_total}
                      </strong>
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            {offer.certificate_terms ? (
              <div className="mt-4 rounded-2xl border border-[#dbeafe] bg-[#eff6ff] p-4 text-[#1e3a8a]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                  Условия сертификата
                </div>
                <p className="mt-2 text-[13px] leading-6">
                  {offer.certificate_terms}
                </p>
              </div>
            ) : null}
          </section>
        ) : null}

        {offer ? (
          <CertificateOrderForm
            offerId={offer.id}
            offerTitle={offer.title}
            organizationName={organizationName}
            canOrderCertificate={canOrderCertificate}
          />
        ) : null}

        <section className="flex flex-wrap gap-2">
          <Link
            href={offerHref}
            className="rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50"
          >
            Назад к offer
          </Link>

          <Link
            href={directoryHref}
            className="rounded-xl border border-[#dfe4ff] bg-[#eef2ff] px-4 py-3 text-[13px] font-bold text-[#3b6ef8] transition hover:bg-[#e4eaff]"
          >
            Публичная карточка предприятия
          </Link>

          <Link
            href="/my-certificates"
            className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-[13px] font-bold text-[#15803d] transition hover:bg-[#dcfce7]"
          >
            Мои сертификаты
          </Link>
        </section>
      </div>
    </main>
  );
}

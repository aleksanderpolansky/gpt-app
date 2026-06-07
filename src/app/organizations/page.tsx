"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type OrganizationLocation = {
  country_code?: string | null;
  city?: string | null;
  district?: string | null;
  address_visibility?: string | null;
};

type Organization = {
  id: string;
  organization_name: string;
  organization_type?: string | null;
  description?: string | null;
  status?: string | null;
  default_currency?: string | null;
  directory_status?: string | null;
  is_public_profile_enabled?: boolean | null;
  primaryLocation?: OrganizationLocation | null;
  location?: OrganizationLocation | null;
  locations?: OrganizationLocation[];
};

type OrganizationsResponse = {
  ok?: boolean;
  error?: string;
  organizations?: Organization[];
};

function formatOptional(value: string | null | undefined, fallback = "не указано") {
  const trimmedValue = value?.trim();

  return trimmedValue && trimmedValue.length > 0 ? trimmedValue : fallback;
}

function getOrganizationLocation(organization: Organization) {
  return (
    organization.primaryLocation ??
    organization.location ??
    organization.locations?.[0] ??
    null
  );
}

function formatLocation(organization: Organization) {
  const location = getOrganizationLocation(organization);

  if (!location) {
    return "Локация не указана";
  }

  const parts = [
    location.country_code,
    location.city,
    location.district,
  ].filter(Boolean);

  if (parts.length === 0) {
    return "Локация не указана";
  }

  return parts.join(", ");
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
      return formatOptional(type, "тип не указан");
  }
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadOrganizations = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/organizations", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as OrganizationsResponse;

      if (!response.ok || !data.ok) {
        setErrorMessage(data.error ?? "Не удалось загрузить предприятия.");
        return;
      }

      setOrganizations(Array.isArray(data.organizations) ? data.organizations : []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Неизвестная ошибка загрузки предприятий.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadOrganizations();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadOrganizations]);

  const publishedCount = useMemo(
    () =>
      organizations.filter(
        (organization) =>
          organization.directory_status === "published" ||
          organization.is_public_profile_enabled === true,
      ).length,
    [organizations],
  );

  return (
    <main className="min-h-full bg-[#f5f6fb] px-4 py-8 text-[#1a1d2e]">
      <div className="mx-auto grid w-full max-w-[1120px] gap-5">
        <header className="rounded-[18px] border border-[rgba(0,0,0,0.07)] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7c8099]">
            Commercial core / My enterprises
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-[30px] font-bold tracking-[-0.03em] text-[#111827]">
                Мои предприятия
              </h1>

              <p className="mt-2 max-w-[760px] text-[14px] leading-6 text-[#5a5f7a]">
                Здесь показываются реальные предприятия текущего пользователя.
                Отсюда можно открыть карточку, добавить услугу как Value Object,
                создать offer и проверить публичный каталог.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/organizations/new"
                className="rounded-xl bg-[#3b6ef8] px-4 py-3 text-[13px] font-bold text-white shadow-[0_10px_20px_rgba(59,110,248,0.24)] transition hover:bg-[#2f5fe3]"
              >
                Создать предприятие
              </Link>

              <button
                type="button"
                onClick={loadOrganizations}
                className="rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50"
              >
                Обновить список
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          <article className="rounded-[16px] border border-[rgba(0,0,0,0.07)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
              Всего
            </div>
            <div className="mt-2 text-[30px] font-bold text-[#111827]">
              {organizations.length}
            </div>
            <div className="mt-1 text-[12px] text-[#7c8099]">
              предприятий в вашем аккаунте
            </div>
          </article>

          <article className="rounded-[16px] border border-[rgba(0,0,0,0.07)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
              Публичные
            </div>
            <div className="mt-2 text-[30px] font-bold text-[#3b6ef8]">
              {publishedCount}
            </div>
            <div className="mt-1 text-[12px] text-[#7c8099]">
              доступны для каталога
            </div>
          </article>

          <article className="rounded-[16px] border border-[rgba(0,0,0,0.07)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
              Следующий шаг
            </div>
            <div className="mt-2 text-[18px] font-bold text-[#111827]">
              Добавить услугу
            </div>
            <div className="mt-1 text-[12px] leading-5 text-[#7c8099]">
              Услуга создаётся как enterprise-owned Value Object.
            </div>
          </article>
        </section>

        {errorMessage ? (
          <section className="rounded-[16px] border border-[#fecaca] bg-[#fff1f2] p-5 text-[13px] font-medium text-[#b42318]">
            {errorMessage}
          </section>
        ) : null}

        {isLoading ? (
          <section className="rounded-[18px] border border-[rgba(0,0,0,0.07)] bg-white p-6 text-[14px] text-[#5a5f7a] shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            Загружаю предприятия...
          </section>
        ) : null}

        {!isLoading && organizations.length === 0 ? (
          <section className="rounded-[18px] border border-[#fde68a] bg-[#fffbeb] p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <h2 className="text-[22px] font-bold text-[#92400e]">
              Пока нет предприятий
            </h2>
            <p className="mt-2 text-[14px] leading-6 text-[#92400e]">
              Создайте первое предприятие. После этого можно будет добавить
              услугу, создать offer и сертификат.
            </p>
            <Link
              href="/organizations/new"
              className="mt-4 inline-flex rounded-xl bg-[#3b6ef8] px-4 py-3 text-[13px] font-bold text-white transition hover:bg-[#2f5fe3]"
            >
              Создать предприятие
            </Link>
          </section>
        ) : null}

        {!isLoading && organizations.length > 0 ? (
          <section className="grid gap-4">
            {organizations.map((organization) => (
              <article
                key={organization.id}
                className="rounded-[18px] border border-[rgba(0,0,0,0.07)] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
                      {getOrganizationTypeLabel(organization.organization_type)}
                    </div>

                    <h2 className="text-[24px] font-bold tracking-[-0.02em] text-[#111827]">
                      {organization.organization_name}
                    </h2>

                    <p className="mt-2 max-w-[760px] text-[14px] leading-6 text-[#5a5f7a]">
                      {formatOptional(
                        organization.description,
                        "Описание пока не добавлено.",
                      )}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2 text-[12px]">
                      <span className="rounded-full border border-[#dfe3f1] bg-[#f8f9fd] px-3 py-1.5 font-semibold text-[#4a4f6a]">
                        {formatLocation(organization)}
                      </span>
                      <span className="rounded-full border border-[#dfe3f1] bg-[#f8f9fd] px-3 py-1.5 font-semibold text-[#4a4f6a]">
                        Валюта: {formatOptional(organization.default_currency, "PLN")}
                      </span>
                      <span className="rounded-full border border-[#dfe3f1] bg-[#f8f9fd] px-3 py-1.5 font-semibold text-[#4a4f6a]">
                        Статус: {formatOptional(organization.status, "active")}
                      </span>
                      <span className="rounded-full border border-[#dfe3f1] bg-[#f8f9fd] px-3 py-1.5 font-semibold text-[#4a4f6a]">
                        Каталог:{" "}
                        {organization.directory_status === "published" ||
                        organization.is_public_profile_enabled === true
                          ? "публичный"
                          : "не опубликован"}
                      </span>
                    </div>
                  </div>

                  <div className="grid min-w-[240px] gap-2">
                    <Link
                      href={`/organizations/${organization.id}`}
                      className="rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-center text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50"
                    >
                      Открыть карточку
                    </Link>

                    <Link
                      href={`/value-objects/new?organizationId=${organization.id}`}
                      className="rounded-xl bg-[#3b6ef8] px-4 py-3 text-center text-[13px] font-bold text-white transition hover:bg-[#2f5fe3]"
                    >
                      Добавить услугу
                    </Link>

                    <Link
                      href={`/offers/new?organizationId=${organization.id}`}
                      className="rounded-xl border border-[#3b6ef8] bg-[#eef2ff] px-4 py-3 text-center text-[13px] font-bold text-[#3b6ef8] transition hover:bg-[#e4eaff]"
                    >
                      Создать предложение
                    </Link>

                    <Link
                      href="/directory"
                      className="rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-center text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50"
                    >
                      Смотреть в каталоге
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : null}
      </div>
    </main>
  );
}

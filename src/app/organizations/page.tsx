"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getLocaleSearchParam,
  getOrganizationsMessage,
  type LocaleCode,
  type OrganizationsMessageKey,
} from "@/i18n";

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

type OrganizationsTranslate = (key: OrganizationsMessageKey) => string;

function useInterfaceLocale(): LocaleCode {
  const [locale, setLocale] = useState<LocaleCode>("en");

  useEffect(() => {
    function readLocaleFromUrl() {
      if (typeof window === "undefined") {
        return;
      }

      setLocale(getLocaleSearchParam(new URLSearchParams(window.location.search)));
    }

    readLocaleFromUrl();
    window.addEventListener("popstate", readLocaleFromUrl);

    return () => {
      window.removeEventListener("popstate", readLocaleFromUrl);
    };
  }, []);

  return locale;
}

function formatOptional(
  value: string | null | undefined,
  fallback: string,
) {
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

function formatLocation(organization: Organization, t: OrganizationsTranslate) {
  const location = getOrganizationLocation(organization);

  if (!location) {
    return t("organizations.location.missing");
  }

  const parts = [
    location.country_code,
    location.city,
    location.district,
  ].filter(Boolean);

  if (parts.length === 0) {
    return t("organizations.location.missing");
  }

  return parts.join(", ");
}

function getOrganizationTypeLabel(
  type: string | null | undefined,
  t: OrganizationsTranslate,
) {
  switch (type) {
    case "private_business":
      return t("organizations.organizationType.privateBusiness");
    case "company":
      return t("organizations.organizationType.company");
    case "non_profit":
      return t("organizations.organizationType.nonProfit");
    case "public_institution":
      return t("organizations.organizationType.publicInstitution");
    default:
      return formatOptional(type, t("organizations.organizationType.unspecified"));
  }
}

export default function OrganizationsPage() {
  const locale = useInterfaceLocale();
  const t = useCallback<OrganizationsTranslate>(
    (key) => getOrganizationsMessage(key, locale),
    [locale],
  );

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
        setErrorMessage(data.error ?? t("organizations.error.loadFailed"));
        return;
      }

      setOrganizations(Array.isArray(data.organizations) ? data.organizations : []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("organizations.error.loadUnknown"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [t]);

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
            {t("organizations.list.kicker")}
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-[30px] font-bold tracking-[-0.03em] text-[#111827]">
                {t("organizations.list.heading")}
              </h1>

              <p className="mt-2 max-w-[760px] text-[14px] leading-6 text-[#5a5f7a]">
                {t("organizations.list.description")}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/organizations/new"
                className="rounded-xl bg-[#3b6ef8] px-4 py-3 text-[13px] font-bold text-white shadow-[0_10px_20px_rgba(59,110,248,0.24)] transition hover:bg-[#2f5fe3]"
              >
                {t("organizations.actions.createOrganization")}
              </Link>

              <button
                type="button"
                onClick={loadOrganizations}
                className="rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50"
              >
                {t("organizations.actions.refreshList")}
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          <article className="rounded-[16px] border border-[rgba(0,0,0,0.07)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
              {t("organizations.stats.total")}
            </div>
            <div className="mt-2 text-[30px] font-bold text-[#111827]">
              {organizations.length}
            </div>
            <div className="mt-1 text-[12px] text-[#7c8099]">
              {t("organizations.stats.totalDescription")}
            </div>
          </article>

          <article className="rounded-[16px] border border-[rgba(0,0,0,0.07)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
              {t("organizations.stats.public")}
            </div>
            <div className="mt-2 text-[30px] font-bold text-[#3b6ef8]">
              {publishedCount}
            </div>
            <div className="mt-1 text-[12px] text-[#7c8099]">
              {t("organizations.stats.availableForDirectory")}
            </div>
          </article>

          <article className="rounded-[16px] border border-[rgba(0,0,0,0.07)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
              {t("organizations.stats.nextStep")}
            </div>
            <div className="mt-2 text-[18px] font-bold text-[#111827]">
              {t("organizations.actions.addService")}
            </div>
            <div className="mt-1 text-[12px] leading-5 text-[#7c8099]">
              {t("organizations.stats.addServiceDescription")}
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
            {t("organizations.list.loading")}
          </section>
        ) : null}

        {!isLoading && organizations.length === 0 ? (
          <section className="rounded-[18px] border border-[#fde68a] bg-[#fffbeb] p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <h2 className="text-[22px] font-bold text-[#92400e]">
              {t("organizations.list.emptyHeading")}
            </h2>
            <p className="mt-2 text-[14px] leading-6 text-[#92400e]">
              {t("organizations.list.emptyDescription")}
            </p>
            <Link
              href="/organizations/new"
              className="mt-4 inline-flex rounded-xl bg-[#3b6ef8] px-4 py-3 text-[13px] font-bold text-white transition hover:bg-[#2f5fe3]"
            >
              {t("organizations.actions.createOrganization")}
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
                      {getOrganizationTypeLabel(organization.organization_type, t)}
                    </div>

                    <h2 className="text-[24px] font-bold tracking-[-0.02em] text-[#111827]">
                      {organization.organization_name}
                    </h2>

                    <p className="mt-2 max-w-[760px] text-[14px] leading-6 text-[#5a5f7a]">
                      {formatOptional(
                        organization.description,
                        t("organizations.card.descriptionMissing"),
                      )}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2 text-[12px]">
                      <span className="rounded-full border border-[#dfe3f1] bg-[#f8f9fd] px-3 py-1.5 font-semibold text-[#4a4f6a]">
                        {formatLocation(organization, t)}
                      </span>
                      <span className="rounded-full border border-[#dfe3f1] bg-[#f8f9fd] px-3 py-1.5 font-semibold text-[#4a4f6a]">
                        {t("organizations.card.currency")}{" "}
                        {formatOptional(organization.default_currency, "PLN")}
                      </span>
                      <span className="rounded-full border border-[#dfe3f1] bg-[#f8f9fd] px-3 py-1.5 font-semibold text-[#4a4f6a]">
                        {t("organizations.card.status")}{" "}
                        {formatOptional(organization.status, "active")}
                      </span>
                      <span className="rounded-full border border-[#dfe3f1] bg-[#f8f9fd] px-3 py-1.5 font-semibold text-[#4a4f6a]">
                        {t("organizations.card.catalog")}{" "}
                        {organization.directory_status === "published" ||
                        organization.is_public_profile_enabled === true
                          ? t("organizations.card.published")
                          : t("organizations.card.notPublished")}
                      </span>
                    </div>
                  </div>

                  <div className="grid min-w-[240px] gap-2">
                    <Link
                      href={`/organizations/${organization.id}`}
                      className="rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-center text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50"
                    >
                      {t("organizations.actions.openOrganization")}
                    </Link>

                    <Link
                      href={`/value-objects/new?organizationId=${organization.id}`}
                      className="rounded-xl bg-[#3b6ef8] px-4 py-3 text-center text-[13px] font-bold text-white transition hover:bg-[#2f5fe3]"
                    >
                      {t("organizations.actions.addService")}
                    </Link>

                    <Link
                      href={`/offers/new?organizationId=${organization.id}`}
                      className="rounded-xl border border-[#3b6ef8] bg-[#eef2ff] px-4 py-3 text-center text-[13px] font-bold text-[#3b6ef8] transition hover:bg-[#e4eaff]"
                    >
                      {t("organizations.actions.createOffer")}
                    </Link>

                    <Link
                      href="/directory"
                      className="rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-center text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50"
                    >
                      {t("organizations.actions.viewInDirectory")}
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

"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import OrganizationAddressAutocomplete, {
  type OrganizationAddressSelection,
} from "@/components/commercial/OrganizationAddressAutocomplete";
import {
  getLocaleSearchParam,
  getOrganizationsMessage,
  type LocaleCode,
  type OrganizationsMessageKey,
} from "@/i18n";

type SemanticIntakeCandidate = {
  label?: string;
  slug?: string;
  confidence?: number;
  reason?: string;
  sourceText?: string;
  visibilitySuggestion?: "public_safe" | "internal_only" | "needs_review";
};

type SemanticIntakeUnknownTerm = {
  term?: string;
  reason?: string;
  suggestedLookup?: string;
};

type SemanticIntakeResponse = {
  ok?: boolean;
  error?: string;
  mode?: string;
  objectType?: string;
  objectId?: string | null;
  source?: string;
  model?: string;
  responseId?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  } | null;
  analysis?: {
    language?: string;
    normalizedTitle?: string;
    shortSummary?: string;
    categoryCandidates?: SemanticIntakeCandidate[];
    unknownTermCandidates?: SemanticIntakeUnknownTerm[];
    riskFlags?: string[];
  };
  persistence?: {
    wroteToDatabase?: boolean;
    createdCategoryCandidatesRows?: boolean;
    createdApprovedCategories?: boolean;
    createdPublicSemanticCloudLinks?: boolean;
    note?: string;
  };
};

type SemanticIntakeStatus = "idle" | "running" | "done" | "failed";

type CreateOrganizationResponse = {
  semanticIntake?: SemanticIntakeResponse | null;
  ok?: boolean;
  error?: string;
  organization?: {
    id: string;
    organization_name: string;
    organization_type: string;
    description?: string | null;
    status?: string | null;
    default_currency?: string | null;
    directory_status?: string | null;
    is_public_profile_enabled?: boolean | null;
  };
  organizationLocation?: {
    country_code?: string | null;
    city?: string | null;
    district?: string | null;
    street_address?: string | null;
    postal_code?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    address_visibility?: string | null;
  } | null;
  organizationActor?: {
    id: string;
    display_name: string;
    actor_type: string;
  };
  businessSpace?: {
    id: string;
    title: string;
    space_type: string;
  };
  directory?: {
    status?: string | null;
    isPublicProfileEnabled?: boolean | null;
  };
};

type OrganizationsTranslate = (key: OrganizationsMessageKey) => string;

const ORGANIZATION_TYPES = [
  "private_business",
  "company",
  "non_profit",
  "public_institution",
] as const;

type OrganizationTypeValue = (typeof ORGANIZATION_TYPES)[number];

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

function normalizeCountryCode(value: string) {
  return value.trim().toUpperCase();
}

function formatOptional(
  value: string | null | undefined,
  fallback: string,
) {
  const trimmedValue = value?.trim();

  return trimmedValue && trimmedValue.length > 0 ? trimmedValue : fallback;
}

function getOrganizationTypeLabel(
  type: OrganizationTypeValue,
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
  }
}

function getSemanticIntakeStatusLabel(
  status: SemanticIntakeStatus,
  t: OrganizationsTranslate,
) {
  switch (status) {
    case "idle":
      return t("organizations.aiCategory.waiting");
    case "running":
      return t("organizations.aiCategory.running");
    case "done":
      return t("organizations.aiCategory.assigned");
    case "failed":
      return t("organizations.aiCategory.notAssigned");
  }
}

export default function NewOrganizationPage() {
  const locale = useInterfaceLocale();
  const t = useMemo<OrganizationsTranslate>(
    () => (key) => getOrganizationsMessage(key, locale),
    [locale],
  );

  const [organizationName, setOrganizationName] = useState("");
  const [organizationType, setOrganizationType] =
    useState<OrganizationTypeValue>("private_business");
  const [description, setDescription] = useState("");

  const [addressQuery, setAddressQuery] = useState("");
  const [addressSelectionToken, setAddressSelectionToken] = useState<
    string | null
  >(null);
  const [selectedAddressLabel, setSelectedAddressLabel] = useState<
    string | null
  >(null);
  const [countryCode, setCountryCode] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");

  const [result, setResult] = useState<CreateOrganizationResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [semanticIntakeStatus, setSemanticIntakeStatus] =
    useState<SemanticIntakeStatus>("idle");
  const [semanticIntake, setSemanticIntake] =
    useState<SemanticIntakeResponse | null>(null);
  const [semanticIntakeError, setSemanticIntakeError] = useState<string | null>(
    null,
  );

  const organizationId = result?.organization?.id ?? null;

  const locationPreview = useMemo(() => {
    if (selectedAddressLabel) {
      return selectedAddressLabel;
    }

    const parts = [
      normalizeCountryCode(countryCode),
      city.trim(),
      district.trim(),
    ].filter(Boolean);

    if (parts.length === 0) {
      return t("organizations.location.enabledEmpty");
    }

    return parts.join(", ");
  }, [city, countryCode, district, selectedAddressLabel, t]);

  const canSubmit =
    !isSubmitting &&
    organizationName.trim().length >= 2 &&
    normalizeCountryCode(countryCode).length === 2;

  function clearVerifiedAddressSelection() {
    setAddressSelectionToken(null);
    setSelectedAddressLabel(null);
  }

  function handleAddressQueryChange(value: string) {
    setAddressQuery(value);

    if (value !== selectedAddressLabel) {
      clearVerifiedAddressSelection();
    }
  }

  function handleAddressSelection(selection: OrganizationAddressSelection) {
    setAddressQuery(selection.formattedAddress);
    setAddressSelectionToken(selection.addressSelectionToken);
    setSelectedAddressLabel(selection.formattedAddress);
    setCountryCode(selection.countryCode);
    setCity(selection.city ?? "");
    setDistrict(selection.district ?? "");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setResult(null);
    setErrorMessage(null);
    setSemanticIntake(null);
    setSemanticIntakeError(null);
    setSemanticIntakeStatus("idle");
    setIsSubmitting(true);

    const payload: Record<string, unknown> = {
      organizationName: organizationName.trim(),
      organizationType,
      description: description.trim() || null,
    };

    payload.countryCode = normalizeCountryCode(countryCode);
    payload.city = city.trim() || null;
    payload.district = district.trim() || null;
    payload.addressSelectionToken = addressSelectionToken;

    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as CreateOrganizationResponse;

      if (!response.ok || !data.ok) {
        setErrorMessage(data.error ?? t("organizations.error.createFailed"));
        return;
      }

      setResult(data);

      const serverSemanticIntake = data.semanticIntake ?? null;
      setSemanticIntake(serverSemanticIntake);

      if (serverSemanticIntake?.ok) {
        setSemanticIntakeStatus("done");
      } else if (serverSemanticIntake) {
        setSemanticIntakeStatus("failed");
        setSemanticIntakeError(
          serverSemanticIntake.error ??
            t("organizations.aiCategory.serverFailed"),
        );
      } else {
        setSemanticIntakeStatus("failed");
        setSemanticIntakeError(t("organizations.aiCategory.notReturned"));
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("organizations.error.createUnknown"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-full bg-[#f5f6fb] px-4 py-8 text-[#1a1d2e]">
      <div className="mx-auto grid w-full max-w-[980px] gap-5">
        <header className="rounded-[18px] border border-[rgba(0,0,0,0.07)] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7c8099]">
            {t("organizations.create.kicker")}
          </div>

          <h1 className="text-[30px] font-bold tracking-[-0.03em] text-[#111827]">
            {t("organizations.create.heading")}
          </h1>

          <p className="mt-2 max-w-[760px] text-[14px] leading-6 text-[#5a5f7a]">
            {t("organizations.create.description")}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/organizations"
              className="rounded-full border border-[#dfe4ff] bg-[#eef2ff] px-4 py-2 text-[12px] font-semibold text-[#3b6ef8] transition hover:bg-[#e4eaff]"
            >
              {t("organizations.nav.myOrganizations")}
            </Link>
            <Link
              href="/directory"
              className="rounded-full border border-[#e5e7eb] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4f6a] transition hover:bg-gray-50"
            >
              {t("organizations.nav.publicDirectory")}
            </Link>
            <Link
              href="/value-objects/new"
              className="rounded-full border border-[#e5e7eb] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4f6a] transition hover:bg-gray-50"
            >
              {t("organizations.actions.addService")}
            </Link>
          </div>
        </header>

        <section className="rounded-[18px] border border-[rgba(0,0,0,0.07)] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <form className="grid gap-5" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <label className="text-[13px] font-semibold text-[#343854]">
                {t("organizations.form.name")}
              </label>
              <input
                value={organizationName}
                onChange={(event) => setOrganizationName(event.target.value)}
                placeholder={t("organizations.form.namePlaceholder")}
                className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
                required
              />
            </div>

            <div className="grid gap-2">
              <label className="text-[13px] font-semibold text-[#343854]">
                {t("organizations.form.organizationType")}
              </label>
              <select
                value={organizationType}
                onChange={(event) =>
                  setOrganizationType(event.target.value as OrganizationTypeValue)
                }
                className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
              >
                {ORGANIZATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {getOrganizationTypeLabel(type, t)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-[13px] font-semibold text-[#343854]">
                {t("organizations.form.description")}
              </label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t("organizations.form.descriptionPlaceholder")}
                rows={4}
                className="w-full resize-y rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] leading-6 text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
              />
            </div>

            <div className="rounded-2xl border border-[#edf0f7] bg-[#f8f9fd] p-4">
              <div>
                <span className="block text-[13px] font-semibold text-[#343854]">
                  {t("organizations.form.addBaseLocation")}
                </span>
                <span className="mt-1 block text-[12px] leading-5 text-[#7c8099]">
                  {t("organizations.form.baseLocationDescription")}
                </span>
              </div>

              <div className="mt-4">
                <OrganizationAddressAutocomplete
                  locale={locale}
                  value={addressQuery}
                  onChange={handleAddressQueryChange}
                  onSelect={handleAddressSelection}
                  countryCodeHint={countryCode}
                  selectedAddress={selectedAddressLabel}
                />
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="grid gap-2">
                  <label className="text-[12px] font-semibold text-[#4a4f6a]">
                    {t("organizations.form.country")}
                  </label>
                  <input
                    value={countryCode}
                    onChange={(event) => {
                      clearVerifiedAddressSelection();
                      setCountryCode(event.target.value);
                    }}
                    maxLength={2}
                    autoComplete="off"
                    required
                    className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] uppercase text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-[12px] font-semibold text-[#4a4f6a]">
                    {t("organizations.form.city")}
                  </label>
                  <input
                    value={city}
                    onChange={(event) => {
                      clearVerifiedAddressSelection();
                      setCity(event.target.value);
                    }}
                    autoComplete="off"
                    className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-[12px] font-semibold text-[#4a4f6a]">
                    {t("organizations.form.district")}
                  </label>
                  <input
                    value={district}
                    onChange={(event) => {
                      clearVerifiedAddressSelection();
                      setDistrict(event.target.value);
                    }}
                    placeholder={t("organizations.form.optional")}
                    autoComplete="off"
                    className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
                  />
                </div>
              </div>


              <div className="mt-4 rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-[12px] leading-5 text-[#5a5f7a]">
                <strong className="text-[#343854]">
                  {t("organizations.form.locationPreview")}
                </strong>{" "}
                {locationPreview}
              </div>
            </div>

            {errorMessage ? (
              <div className="rounded-xl border border-[#fecaca] bg-[#fff1f2] px-4 py-3 text-[13px] font-medium text-[#b42318]">
                {errorMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-xl bg-[#3b6ef8] px-5 py-3 text-[14px] font-bold text-white shadow-[0_10px_20px_rgba(59,110,248,0.24)] transition hover:bg-[#2f5fe3] disabled:cursor-not-allowed disabled:bg-[#aeb6c8] disabled:shadow-none"
            >
              {isSubmitting
                ? t("organizations.form.submitCreating")
                : t("organizations.actions.createOrganization")}
            </button>
          </form>
        </section>

        {result?.organization ? (
          <section className="rounded-[18px] border border-[#c7f2d4] bg-[#f0fdf4] p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#15803d]">
              {t("organizations.create.successHeading")}
            </div>

            <h2 className="text-[24px] font-bold text-[#14532d]">
              {result.organization.organization_name}
            </h2>

            <p className="mt-2 text-[14px] leading-6 text-[#166534]">
              {t("organizations.create.successDescription")}
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {organizationId ? (
                <>
                  <Link
                    href={`/value-objects/new?organizationId=${organizationId}`}
                    className="rounded-xl bg-[#3b6ef8] px-4 py-3 text-center text-[13px] font-bold text-white transition hover:bg-[#2f5fe3]"
                  >
                    {t("organizations.actions.addService")}
                  </Link>

                  <Link
                    href={`/offers/new?organizationId=${organizationId}`}
                    className="rounded-xl border border-[#3b6ef8] bg-white px-4 py-3 text-center text-[13px] font-bold text-[#3b6ef8] transition hover:bg-[#eef2ff]"
                  >
                    {t("organizations.actions.createOffer")}
                  </Link>

                  <Link
                    href={`/organizations/${organizationId}`}
                    className="rounded-xl border border-[#bbf7d0] bg-white px-4 py-3 text-center text-[13px] font-bold text-[#15803d] transition hover:bg-[#dcfce7]"
                  >
                    {t("organizations.actions.openOrganization")}
                  </Link>

                  <Link
                    href="/organizations"
                    className="rounded-xl border border-[#bbf7d0] bg-white px-4 py-3 text-center text-[13px] font-bold text-[#15803d] transition hover:bg-[#dcfce7]"
                  >
                    {t("organizations.nav.myOrganizations")}
                  </Link>
                </>
              ) : null}
            </div>

            <div className="mt-5 grid gap-3 rounded-2xl border border-[#bbf7d0] bg-white p-4 text-[13px] text-[#166534]">
              <p className="m-0">
                <strong>{t("organizations.result.status")}</strong>{" "}
                {formatOptional(result.organization.status, "active")}
              </p>
              <p className="m-0">
                <strong>{t("organizations.result.directory")}</strong>{" "}
                {result.directory?.isPublicProfileEnabled ||
                result.organization.is_public_profile_enabled
                  ? t("organizations.result.profileEnabled")
                  : t("organizations.result.profileDisabled")}
              </p>
              <p className="m-0">
                <strong>{t("organizations.result.location")}</strong>{" "}
                {result.organizationLocation
                  ? [
                      result.organizationLocation.country_code,
                      result.organizationLocation.city,
                      result.organizationLocation.district,
                    ]
                      .filter(Boolean)
                      .join(", ")
                  : t("organizations.notSpecified")}
              </p>
            </div>

            <div className="mt-4 rounded-xl border border-[#bfdbfe] bg-[#eff6ff] p-4 text-[12px] leading-5 text-[#1e3a8a]">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2563eb]">
                {t("organizations.aiCategory.heading")}
              </div>

              <p className="m-0">
                <strong>{t("organizations.aiCategory.status")}</strong>{" "}
                {getSemanticIntakeStatusLabel(semanticIntakeStatus, t)}
              </p>

              {semanticIntakeError ? (
                <p className="mt-2 rounded-lg border border-[#fecaca] bg-white px-3 py-2 text-[#b42318]">
                  {semanticIntakeError}
                </p>
              ) : null}

              {semanticIntake?.analysis?.shortSummary ? (
                <p className="mt-2">
                  <strong>{t("organizations.aiCategory.shortSummary")}</strong>{" "}
                  {semanticIntake.analysis.shortSummary}
                </p>
              ) : null}

              {semanticIntake?.responseId ? (
                <p className="mt-2">
                  <strong>Response ID:</strong> {semanticIntake.responseId}
                </p>
              ) : null}

              {semanticIntake?.model ? (
                <p className="mt-1">
                  <strong>Model:</strong> {semanticIntake.model}
                </p>
              ) : null}

              {semanticIntake?.usage?.total_tokens ? (
                <p className="mt-1">
                  <strong>Tokens:</strong> {semanticIntake.usage.total_tokens}
                </p>
              ) : null}

              {semanticIntake?.analysis?.categoryCandidates?.length ? (
                <div className="mt-3">
                  <strong>{t("organizations.aiCategory.heading")}:</strong>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {semanticIntake.analysis.categoryCandidates.map((candidate) => (
                      <span
                        key={`${candidate.slug ?? candidate.label}-${candidate.confidence ?? "na"}`}
                        className="rounded-full border border-[#bfdbfe] bg-white px-3 py-1 text-[11px] font-semibold text-[#1d4ed8]"
                      >
                        {candidate.label}
                        {typeof candidate.confidence === "number"
                          ? ` · ${Math.round(candidate.confidence * 100)}%`
                          : ""}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {semanticIntake?.persistence ? (
                <p className="mt-3 text-[#475569]">
                  {t("organizations.aiCategory.persistence")}{" "}
                  {semanticIntake.persistence.wroteToDatabase
                    ? t("organizations.aiCategory.recorded")
                    : t("organizations.aiCategory.notAssigned")}
                </p>
              ) : null}
            </div>
            <details className="mt-4 rounded-xl border border-[#d1fae5] bg-white p-4 text-[12px] text-[#5a5f7a]">
              <summary className="cursor-pointer font-semibold text-[#166534]">
                {t("organizations.dev.summary")}
              </summary>

              <div className="mt-3 grid gap-2">
                <p className="m-0">
                  <strong>Actor:</strong>{" "}
                  {result.organizationActor?.display_name ??
                    t("organizations.dev.actorNotCreated")}{" "}
                  {result.organizationActor?.actor_type
                    ? `(${result.organizationActor.actor_type})`
                    : ""}
                </p>
                <p className="m-0">
                  <strong>{t("organizations.dev.businessSpace")}</strong>{" "}
                  {result.businessSpace?.title ?? t("organizations.dev.notCreated")}
                </p>
                <p className="m-0">{t("organizations.dev.note")}</p>
              </div>
            </details>
          </section>
        ) : null}
      </div>
    </main>
  );
}

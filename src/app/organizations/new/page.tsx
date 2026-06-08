"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

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

const ORGANIZATION_TYPES = [
  {
    value: "private_business",
    label: "Индивидуальный предприниматель / частный бизнес",
  },
  {
    value: "company",
    label: "Компания",
  },
  {
    value: "non_profit",
    label: "Некоммерческая организация",
  },
  {
    value: "public_institution",
    label: "Публичная / муниципальная организация",
  },
];

function normalizeCountryCode(value: string) {
  return value.trim().toUpperCase();
}

function formatOptional(value: string | null | undefined, fallback = "не указано") {
  const trimmedValue = value?.trim();

  return trimmedValue && trimmedValue.length > 0 ? trimmedValue : fallback;
}

export default function NewOrganizationPage() {
  const [organizationName, setOrganizationName] = useState("");
  const [organizationType, setOrganizationType] = useState("private_business");
  const [description, setDescription] = useState("");

  const [includeLocation, setIncludeLocation] = useState(true);
  const [countryCode, setCountryCode] = useState("PL");
  const [city, setCity] = useState("Szczecin");
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
    if (!includeLocation) {
      return "Локация не указана. Её можно добавить или уточнить позже в карточке предприятия.";
    }

    const parts = [
      normalizeCountryCode(countryCode),
      city.trim(),
      district.trim(),
    ].filter(Boolean);

    if (parts.length === 0) {
      return "Локация включена, но пока не заполнена.";
    }

    return parts.join(", ");
  }, [city, countryCode, district, includeLocation]);

  const canSubmit =
    !isSubmitting &&
    organizationName.trim().length >= 2 &&
    (!includeLocation || normalizeCountryCode(countryCode).length === 2);

  async function triggerOrganizationSemanticIntake(
    createData: CreateOrganizationResponse,
  ) {
    const organization = createData.organization;

    if (!organization) {
      setSemanticIntakeStatus("failed");
      setSemanticIntakeError("AI-анализ не запущен: предприятие отсутствует в ответе API.");
      return;
    }

    setSemanticIntakeStatus("running");
    setSemanticIntake(null);
    setSemanticIntakeError(null);

    try {
      const semanticResponse = await fetch("/api/ai/semantic-intake/organization", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          objectType: "organization",
          objectId: organization.id,
          source: "organization_create_success_client_preview",
          name: organization.organization_name,
          description: organization.description ?? description.trim() ?? "",
          organizationType: organization.organization_type ?? organizationType,
          country:
            createData.organizationLocation?.country_code ??
            (includeLocation ? normalizeCountryCode(countryCode) : ""),
          city:
            createData.organizationLocation?.city ??
            (includeLocation ? city.trim() : ""),
          district:
            createData.organizationLocation?.district ??
            (includeLocation ? district.trim() : ""),
        }),
      });

      const semanticData =
        (await semanticResponse.json()) as SemanticIntakeResponse;

      if (!semanticResponse.ok || !semanticData.ok) {
        setSemanticIntakeStatus("failed");
        setSemanticIntake(semanticData);
        setSemanticIntakeError(
          semanticData.error ?? "AI-анализ предприятия не выполнен.",
        );
        return;
      }

      setSemanticIntakeStatus("done");
      setSemanticIntake(semanticData);
      console.info("Organization semantic intake preview", semanticData);
    } catch (error) {
      setSemanticIntakeStatus("failed");
      setSemanticIntakeError(
        error instanceof Error
          ? error.message
          : "Неизвестная ошибка AI-анализа предприятия.",
      );
    }
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

    if (includeLocation) {
      payload.countryCode = normalizeCountryCode(countryCode);
      payload.city = city.trim() || null;
      payload.district = district.trim() || null;
    }

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
        setErrorMessage(data.error ?? "Не удалось создать предприятие.");
        return;
      }

      setResult(data);
      void triggerOrganizationSemanticIntake(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Неизвестная ошибка создания предприятия.",
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
            Commercial core / Enterprise setup
          </div>

          <h1 className="text-[30px] font-bold tracking-[-0.03em] text-[#111827]">
            Создать предприятие
          </h1>

          <p className="mt-2 max-w-[760px] text-[14px] leading-6 text-[#5a5f7a]">
            Предприятие — это коммерческий actor на платформе. После создания
            можно добавить услугу как enterprise-owned Value Object, затем
            создать предложение и подарочный сертификат на базе этой услуги.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/organizations"
              className="rounded-full border border-[#dfe4ff] bg-[#eef2ff] px-4 py-2 text-[12px] font-semibold text-[#3b6ef8] transition hover:bg-[#e4eaff]"
            >
              Мои предприятия
            </Link>
            <Link
              href="/directory"
              className="rounded-full border border-[#e5e7eb] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4f6a] transition hover:bg-gray-50"
            >
              Публичный каталог
            </Link>
            <Link
              href="/value-objects/new"
              className="rounded-full border border-[#e5e7eb] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4f6a] transition hover:bg-gray-50"
            >
              Добавить услугу
            </Link>
          </div>
        </header>

        <section className="rounded-[18px] border border-[rgba(0,0,0,0.07)] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <form className="grid gap-5" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <label className="text-[13px] font-semibold text-[#343854]">
                Название предприятия
              </label>
              <input
                value={organizationName}
                onChange={(event) => setOrganizationName(event.target.value)}
                placeholder="Например: Aleksander Polański — masaż"
                className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
                required
              />
            </div>

            <div className="grid gap-2">
              <label className="text-[13px] font-semibold text-[#343854]">
                Тип предприятия
              </label>
              <select
                value={organizationType}
                onChange={(event) => setOrganizationType(event.target.value)}
                className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
              >
                {ORGANIZATION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-[13px] font-semibold text-[#343854]">
                Описание
              </label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Например: Relaksacyjny masaż w Szczecinie. Usługi masażu relaksacyjnego i regeneracyjnego."
                rows={4}
                className="w-full resize-y rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] leading-6 text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
              />
            </div>

            <div className="rounded-2xl border border-[#edf0f7] bg-[#f8f9fd] p-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={includeLocation}
                  onChange={(event) => setIncludeLocation(event.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span>
                  <span className="block text-[13px] font-semibold text-[#343854]">
                    Добавить базовую локацию
                  </span>
                  <span className="mt-1 block text-[12px] leading-5 text-[#7c8099]">
                    Это не обязательный шаг. Если локация не указана, предприятие
                    всё равно создаётся, а адрес можно уточнить позже.
                  </span>
                </span>
              </label>

              {includeLocation ? (
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="grid gap-2">
                    <label className="text-[12px] font-semibold text-[#4a4f6a]">
                      Страна
                    </label>
                    <input
                      value={countryCode}
                      onChange={(event) => setCountryCode(event.target.value)}
                      placeholder="PL"
                      maxLength={2}
                      className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] uppercase text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-[12px] font-semibold text-[#4a4f6a]">
                      Город
                    </label>
                    <input
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                      placeholder="Szczecin"
                      className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-[12px] font-semibold text-[#4a4f6a]">
                      Район
                    </label>
                    <input
                      value={district}
                      onChange={(event) => setDistrict(event.target.value)}
                      placeholder="необязательно"
                      className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
                    />
                  </div>
                </div>
              ) : null}

              <div className="mt-4 rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-[12px] leading-5 text-[#5a5f7a]">
                <strong className="text-[#343854]">Как будет записано:</strong>{" "}
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
              {isSubmitting ? "Создаю предприятие..." : "Создать предприятие"}
            </button>
          </form>
        </section>

        {result?.organization ? (
          <section className="rounded-[18px] border border-[#c7f2d4] bg-[#f0fdf4] p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#15803d]">
              Предприятие создано
            </div>

            <h2 className="text-[24px] font-bold text-[#14532d]">
              {result.organization.organization_name}
            </h2>

            <p className="mt-2 text-[14px] leading-6 text-[#166534]">
              Теперь можно добавить услугу как ценный объект предприятия, создать
              предложение и затем сертификат на базе этого предложения.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {organizationId ? (
                <>
                  <Link
                    href={`/value-objects/new?organizationId=${organizationId}`}
                    className="rounded-xl bg-[#3b6ef8] px-4 py-3 text-center text-[13px] font-bold text-white transition hover:bg-[#2f5fe3]"
                  >
                    Добавить услугу
                  </Link>

                  <Link
                    href={`/offers/new?organizationId=${organizationId}`}
                    className="rounded-xl border border-[#3b6ef8] bg-white px-4 py-3 text-center text-[13px] font-bold text-[#3b6ef8] transition hover:bg-[#eef2ff]"
                  >
                    Создать предложение
                  </Link>

                  <Link
                    href={`/organizations/${organizationId}`}
                    className="rounded-xl border border-[#bbf7d0] bg-white px-4 py-3 text-center text-[13px] font-bold text-[#15803d] transition hover:bg-[#dcfce7]"
                  >
                    Открыть карточку предприятия
                  </Link>

                  <Link
                    href="/organizations"
                    className="rounded-xl border border-[#bbf7d0] bg-white px-4 py-3 text-center text-[13px] font-bold text-[#15803d] transition hover:bg-[#dcfce7]"
                  >
                    Мои предприятия
                  </Link>
                </>
              ) : null}
            </div>

            <div className="mt-5 grid gap-3 rounded-2xl border border-[#bbf7d0] bg-white p-4 text-[13px] text-[#166534]">
              <p className="m-0">
                <strong>Статус:</strong>{" "}
                {formatOptional(result.organization.status, "active")}
              </p>
              <p className="m-0">
                <strong>Публичный каталог:</strong>{" "}
                {result.directory?.isPublicProfileEnabled ||
                result.organization.is_public_profile_enabled
                  ? "профиль включён"
                  : "профиль пока не включён"}
              </p>
              <p className="m-0">
                <strong>Локация:</strong>{" "}
                {result.organizationLocation
                  ? [
                      result.organizationLocation.country_code,
                      result.organizationLocation.city,
                      result.organizationLocation.district,
                    ]
                      .filter(Boolean)
                      .join(", ")
                  : "не указана"}
              </p>
            </div>

            <div className="mt-4 rounded-xl border border-[#bfdbfe] bg-[#eff6ff] p-4 text-[12px] leading-5 text-[#1e3a8a]">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2563eb]">
                OpenAI semantic intake preview
              </div>

              <p className="m-0">
                <strong>Статус:</strong>{" "}
                {semanticIntakeStatus === "idle"
                  ? "ожидает запуска после создания предприятия"
                  : semanticIntakeStatus === "running"
                    ? "AI-анализ выполняется..."
                    : semanticIntakeStatus === "done"
                      ? "AI-анализ выполнен"
                      : "AI-анализ не выполнен"}
              </p>

              {semanticIntakeError ? (
                <p className="mt-2 rounded-lg border border-[#fecaca] bg-white px-3 py-2 text-[#b42318]">
                  {semanticIntakeError}
                </p>
              ) : null}

              {semanticIntake?.analysis?.shortSummary ? (
                <p className="mt-2">
                  <strong>Summary:</strong>{" "}
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
                  <strong>Category candidates:</strong>
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
                  DB persistence:{" "}
                  {semanticIntake.persistence.wroteToDatabase
                    ? "writes enabled"
                    : "preview only, no category DB writes"}
                </p>
              ) : null}
            </div>
            <details className="mt-4 rounded-xl border border-[#d1fae5] bg-white p-4 text-[12px] text-[#5a5f7a]">
              <summary className="cursor-pointer font-semibold text-[#166534]">
                Служебная информация для разработчика
              </summary>

              <div className="mt-3 grid gap-2">
                <p className="m-0">
                  <strong>Actor:</strong>{" "}
                  {result.organizationActor?.display_name ?? "не создан"}{" "}
                  {result.organizationActor?.actor_type
                    ? `(${result.organizationActor.actor_type})`
                    : ""}
                </p>
                <p className="m-0">
                  <strong>Рабочее пространство предприятия:</strong>{" "}
                  {result.businessSpace?.title ?? "не создано"}
                </p>
                <p className="m-0">
                  Это внутренние связи платформы. Пользователь работает с
                  предприятием, услугами, предложениями и сертификатами; слова
                  Actor/Space в обычном интерфейсе показывать не нужно.
                </p>
              </div>
            </details>
          </section>
        ) : null}
      </div>
    </main>
  );
}


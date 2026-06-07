"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Organization = {
  id: string;
  organization_name: string;
  organization_type?: string | null;
  default_currency?: string | null;
  status?: string | null;
};

type OrganizationsResponse = {
  ok?: boolean;
  error?: string;
  organizations?: Organization[];
};

type CreatedValueObject = {
  id: string;
  organization_id?: string | null;
  value_type?: string | null;
  title?: string | null;
  description?: string | null;
  unit_type?: string | null;
  default_price?: number | string | null;
  default_currency?: string | null;
  default_duration_minutes?: number | string | null;
  status?: string | null;
};

type CreateValueObjectResponse = {
  ok?: boolean;
  error?: string;
  valueObject?: CreatedValueObject;
  value_object?: CreatedValueObject;
};

const VALUE_TYPES = [
  {
    value: "service",
    label: "Услуга",
    helper:
      "Коммерческий ценный объект предприятия: массаж, консультация, занятие, ремонт, процедура.",
  },
  {
    value: "product",
    label: "Товар",
    helper:
      "Физический или цифровой объект предприятия. В новой модели это тоже Value Object.",
  },
  {
    value: "consultation",
    label: "Консультация",
    helper:
      "Встреча, экспертный звонок, диагностика, разбор ситуации.",
  },
  {
    value: "access",
    label: "Доступ / абонемент",
    helper:
      "Доступ к пакету, клубу, подписке, серии встреч или закрытому материалу.",
  },
  {
    value: "content",
    label: "Контент / материал",
    helper:
      "Курс, инструкция, файл, запись, методичка, шаблон.",
  },
  {
    value: "other",
    label: "Другое",
    helper:
      "Любая ценность, которую предприятие может предложить клиенту.",
  },
];

const UNIT_TYPES = [
  {
    value: "service_session",
    label: "Сеанс услуги",
  },
  {
    value: "hour",
    label: "Час",
  },
  {
    value: "piece",
    label: "Штука",
  },
  {
    value: "package",
    label: "Пакет",
  },
  {
    value: "consultation",
    label: "Консультация",
  },
  {
    value: "access_period",
    label: "Период доступа",
  },
];

const PILOT_TITLE = "Relaksacyjny masaż łydek";

const PILOT_DESCRIPTION =
  "Relaksacyjny masaż łydek w Szczecinie. Usługa ukierunkowana na rozluźnienie napięcia mięśniowego, poprawę komfortu nóg i regenerację po chodzeniu, pracy stojącej, sporcie lub długim siedzeniu.";

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

function normalizeCurrency(value: string) {
  const nextValue = value.trim().toUpperCase();

  return nextValue.length > 0 ? nextValue : "PLN";
}

function extractCreatedValueObject(
  response: CreateValueObjectResponse,
): CreatedValueObject | null {
  return response.valueObject ?? response.value_object ?? null;
}

function formatCreatedValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "не указано";
  }

  return String(value);
}

export default function NewValueObjectPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [organizationIdFromUrl, setOrganizationIdFromUrl] = useState("");

  const [valueType, setValueType] = useState("service");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [unitType, setUnitType] = useState("service_session");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("PLN");
  const [defaultDurationMinutes, setDefaultDurationMinutes] = useState("30");
  const [isMarketplaceSellable, setIsMarketplaceSellable] = useState(true);
  const [isFreePossible, setIsFreePossible] = useState(false);

  const [createdValueObject, setCreatedValueObject] =
    useState<CreatedValueObject | null>(null);
  const [message, setMessage] = useState("");
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadOrganizations = useCallback(async () => {
    setIsLoadingOrganizations(true);
    setMessage("");

    const urlOrganizationId =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("organizationId") ?? ""
        : "";

    setOrganizationIdFromUrl(urlOrganizationId);

    try {
      const response = await fetch("/api/organizations", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as OrganizationsResponse;

      if (!response.ok || !data.ok) {
        setMessage(data.error ?? "Не удалось загрузить предприятия.");
        return;
      }

      const loadedOrganizations = Array.isArray(data.organizations)
        ? data.organizations
        : [];

      setOrganizations(loadedOrganizations);

      const organizationFromUrl = loadedOrganizations.find(
        (organization) => organization.id === urlOrganizationId,
      );

      if (organizationFromUrl) {
        setOrganizationId(organizationFromUrl.id);

        if (organizationFromUrl.default_currency) {
          setDefaultCurrency(organizationFromUrl.default_currency);
        }

        return;
      }

      if (loadedOrganizations.length > 0) {
        setOrganizationId(loadedOrganizations[0].id);

        if (loadedOrganizations[0].default_currency) {
          setDefaultCurrency(loadedOrganizations[0].default_currency);
        }
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Неизвестная ошибка загрузки предприятий.",
      );
    } finally {
      setIsLoadingOrganizations(false);
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

  const selectedOrganization = useMemo(
    () =>
      organizations.find((organization) => organization.id === organizationId) ??
      null,
    [organizationId, organizations],
  );

  const selectedValueType = useMemo(
    () => VALUE_TYPES.find((type) => type.value === valueType) ?? VALUE_TYPES[0],
    [valueType],
  );

  const canSubmit =
    !isSubmitting &&
    !isLoadingOrganizations &&
    organizationId.trim().length > 0 &&
    title.trim().length > 1;

  function applyMassagePilot() {
    setValueType("service");
    setUnitType("service_session");
    setTitle(PILOT_TITLE);
    setDescription(PILOT_DESCRIPTION);
    setDefaultDurationMinutes("30");
    setDefaultCurrency("PLN");
    setIsMarketplaceSellable(true);
    setIsFreePossible(false);
    setCreatedValueObject(null);
    setMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setCreatedValueObject(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/value-objects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          organizationId,
          valueType,
          title: title.trim(),
          description: description.trim() || null,
          unitType,
          defaultPrice: defaultPrice.trim() || null,
          defaultCurrency: normalizeCurrency(defaultCurrency),
          defaultDurationMinutes: defaultDurationMinutes.trim() || null,
          isMarketplaceSellable,
          isFreePossible,
        }),
      });

      const data = (await response.json()) as CreateValueObjectResponse;

      if (!response.ok || !data.ok) {
        setMessage(data.error ?? "Не удалось создать услугу.");
        return;
      }

      const created = extractCreatedValueObject(data);

      setCreatedValueObject(created);
      setMessage("Услуга создана как ценный объект предприятия.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Неизвестная ошибка создания услуги.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const createdValueObjectId = createdValueObject?.id ?? null;

  return (
    <main className="min-h-full bg-[#f5f6fb] px-4 py-8 text-[#1a1d2e]">
      <div className="mx-auto grid w-full max-w-[1120px] gap-5">
        <header className="rounded-[18px] border border-[rgba(0,0,0,0.07)] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7c8099]">
            Commercial core / Enterprise value object
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-[30px] font-bold tracking-[-0.03em] text-[#111827]">
                Добавить услугу предприятия
              </h1>

              <p className="mt-2 max-w-[780px] text-[14px] leading-6 text-[#5a5f7a]">
                Здесь создаётся не старая категория “товар / услуга”, а ценный
                объект предприятия. Позже на его базе можно создать предложение
                и подарочный сертификат.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/organizations"
                className="rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50"
              >
                Мои предприятия
              </Link>

              <Link
                href="/offers/new"
                className="rounded-xl border border-[#dfe4ff] bg-[#eef2ff] px-4 py-3 text-[13px] font-bold text-[#3b6ef8] transition hover:bg-[#e4eaff]"
              >
                Создать предложение
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-[18px] border border-[rgba(0,0,0,0.07)] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
          >
            <div className="mb-5 flex flex-col gap-3 border-b border-[#edf0f7] pb-5 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
                  Шаг 1
                </div>
                <h2 className="mt-1 text-[22px] font-bold text-[#111827]">
                  Описание ценного объекта
                </h2>
                <p className="mt-1 text-[13px] leading-5 text-[#7c8099]">
                  Для пилота можно сразу заполнить примером “Relaksacyjny masaż łydek”.
                </p>
              </div>

              <button
                type="button"
                onClick={applyMassagePilot}
                className="rounded-xl border border-[#dfe4ff] bg-[#eef2ff] px-4 py-3 text-[13px] font-bold text-[#3b6ef8] transition hover:bg-[#e4eaff]"
              >
                Заполнить пилот массажа
              </button>
            </div>

            {organizationIdFromUrl &&
            !selectedOrganization &&
            !isLoadingOrganizations ? (
              <div className="mb-5 rounded-xl border border-[#facc15] bg-[#fefce8] px-4 py-3 text-[13px] leading-5 text-[#92400e]">
                Предприятие из ссылки не найдено или доступ запрещён. Выбрано
                первое доступное предприятие.
              </div>
            ) : null}

            {selectedOrganization ? (
              <div className="mb-5 rounded-xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-[13px] leading-5 text-[#1d4ed8]">
                <strong>Выбранное предприятие:</strong>{" "}
                {selectedOrganization.organization_name}
              </div>
            ) : null}

            <div className="grid gap-5">
              <div className="grid gap-2">
                <label className="text-[13px] font-semibold text-[#343854]">
                  Предприятие
                </label>
                <select
                  value={organizationId}
                  onChange={(event) => setOrganizationId(event.target.value)}
                  required
                  disabled={isLoadingOrganizations || organizations.length === 0}
                  className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
                >
                  {organizations.length === 0 ? (
                    <option value="">Нет доступных предприятий</option>
                  ) : null}

                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.organization_name} —{" "}
                      {getOrganizationTypeLabel(organization.organization_type)}
                    </option>
                  ))}
                </select>

                {organizations.length === 0 && !isLoadingOrganizations ? (
                  <Link
                    href="/organizations/new"
                    className="text-[12px] font-semibold text-[#3b6ef8] underline-offset-4 hover:underline"
                  >
                    Сначала создать предприятие
                  </Link>
                ) : null}
              </div>

              <div className="grid gap-2">
                <label className="text-[13px] font-semibold text-[#343854]">
                  Роль объекта в каталоге
                </label>
                <select
                  value={valueType}
                  onChange={(event) => setValueType(event.target.value)}
                  className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
                >
                  {VALUE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>

                <p className="text-[12px] leading-5 text-[#7c8099]">
                  {selectedValueType.helper}
                </p>
              </div>

              <div className="grid gap-2">
                <label className="text-[13px] font-semibold text-[#343854]">
                  Название услуги
                </label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Relaksacyjny masaż łydek"
                  className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
                  required
                />
              </div>

              <div className="grid gap-2">
                <label className="text-[13px] font-semibold text-[#343854]">
                  Описание для клиента и AI-категоризации
                </label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={PILOT_DESCRIPTION}
                  rows={6}
                  className="w-full resize-y rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] leading-6 text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="grid gap-2 md:col-span-1">
                  <label className="text-[13px] font-semibold text-[#343854]">
                    Единица
                  </label>
                  <select
                    value={unitType}
                    onChange={(event) => setUnitType(event.target.value)}
                    className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
                  >
                    {UNIT_TYPES.map((unit) => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className="text-[13px] font-semibold text-[#343854]">
                    Длительность, мин.
                  </label>
                  <input
                    value={defaultDurationMinutes}
                    onChange={(event) =>
                      setDefaultDurationMinutes(event.target.value)
                    }
                    inputMode="numeric"
                    placeholder="30"
                    className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-[13px] font-semibold text-[#343854]">
                    Цена
                  </label>
                  <input
                    value={defaultPrice}
                    onChange={(event) => setDefaultPrice(event.target.value)}
                    inputMode="decimal"
                    placeholder="например 120"
                    className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-[13px] font-semibold text-[#343854]">
                    Валюта
                  </label>
                  <input
                    value={defaultCurrency}
                    onChange={(event) => setDefaultCurrency(event.target.value)}
                    maxLength={3}
                    placeholder="PLN"
                    className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] uppercase text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
                  />
                </div>
              </div>

              <div className="grid gap-3 rounded-2xl border border-[#edf0f7] bg-[#f8f9fd] p-4">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isMarketplaceSellable}
                    onChange={(event) =>
                      setIsMarketplaceSellable(event.target.checked)
                    }
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    <span className="block text-[13px] font-semibold text-[#343854]">
                      Можно показывать в коммерческом каталоге
                    </span>
                    <span className="mt-1 block text-[12px] leading-5 text-[#7c8099]">
                      Объект можно использовать как основу для предложения
                      предприятия и будущего сертификата.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isFreePossible}
                    onChange={(event) => setIsFreePossible(event.target.checked)}
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    <span className="block text-[13px] font-semibold text-[#343854]">
                      Возможен бесплатный вариант
                    </span>
                    <span className="mt-1 block text-[12px] leading-5 text-[#7c8099]">
                      Например пробная консультация или бесплатная диагностика.
                    </span>
                  </span>
                </label>
              </div>

              {message ? (
                <div
                  className={`rounded-xl border px-4 py-3 text-[13px] font-medium ${
                    createdValueObject
                      ? "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]"
                      : "border-[#fecaca] bg-[#fff1f2] text-[#b42318]"
                  }`}
                >
                  {message}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={!canSubmit}
                className="rounded-xl bg-[#3b6ef8] px-5 py-3 text-[14px] font-bold text-white shadow-[0_10px_20px_rgba(59,110,248,0.24)] transition hover:bg-[#2f5fe3] disabled:cursor-not-allowed disabled:bg-[#aeb6c8] disabled:shadow-none"
              >
                {isSubmitting ? "Создаю услугу..." : "Создать услугу"}
              </button>
            </div>
          </form>

          <aside className="grid content-start gap-4">
            <section className="rounded-[18px] border border-[rgba(0,0,0,0.07)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
                Семантическая модель
              </div>

              <h2 className="mt-2 text-[20px] font-bold text-[#111827]">
                Услуга = Value Object
              </h2>

              <p className="mt-2 text-[13px] leading-6 text-[#5a5f7a]">
                “Relaksacyjny masaż łydek” не должен попадать в старую
                жёсткую рубрику “Услуги”. Это ценный объект предприятия,
                который AI позже разложит на смысловые категории.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  "masaż",
                  "łydki",
                  "nogi",
                  "relaks",
                  "regeneracja",
                  "zdrowie",
                  "wellness",
                  "Szczecin",
                ].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-[#dfe4ff] bg-[#eef2ff] px-3 py-1.5 text-[12px] font-semibold text-[#3b6ef8]"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </section>

            <section className="rounded-[18px] border border-[rgba(0,0,0,0.07)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
                Что дальше
              </div>

              <ol className="mt-3 grid gap-3 text-[13px] leading-5 text-[#5a5f7a]">
                <li>
                  <strong className="text-[#343854]">1.</strong> Создать услугу.
                </li>
                <li>
                  <strong className="text-[#343854]">2.</strong> Создать
                  предложение предприятия на базе этой услуги.
                </li>
                <li>
                  <strong className="text-[#343854]">3.</strong> Включить
                  подарочный сертификат для предложения.
                </li>
                <li>
                  <strong className="text-[#343854]">4.</strong> Проверить
                  появление в каталоге и списке предложений.
                </li>
              </ol>
            </section>

            {createdValueObject ? (
              <section className="rounded-[18px] border border-[#bbf7d0] bg-[#f0fdf4] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#15803d]">
                  Услуга создана
                </div>

                <h2 className="mt-2 text-[20px] font-bold text-[#14532d]">
                  {formatCreatedValue(createdValueObject.title)}
                </h2>

                <div className="mt-3 grid gap-2 text-[13px] leading-5 text-[#166534]">
                  <p className="m-0">
                    <strong>Тип:</strong>{" "}
                    {formatCreatedValue(createdValueObject.value_type)}
                  </p>
                  <p className="m-0">
                    <strong>Длительность:</strong>{" "}
                    {formatCreatedValue(
                      createdValueObject.default_duration_minutes,
                    )}{" "}
                    мин.
                  </p>
                  <p className="m-0">
                    <strong>Цена:</strong>{" "}
                    {formatCreatedValue(createdValueObject.default_price)}{" "}
                    {formatCreatedValue(createdValueObject.default_currency)}
                  </p>
                </div>

                <div className="mt-4 grid gap-2">
                  <Link
                    href={`/offers/new?organizationId=${organizationId}${
                      createdValueObjectId
                        ? `&valueObjectId=${createdValueObjectId}`
                        : ""
                    }`}
                    className="rounded-xl bg-[#3b6ef8] px-4 py-3 text-center text-[13px] font-bold text-white transition hover:bg-[#2f5fe3]"
                  >
                    Создать предложение на базе услуги
                  </Link>

                  <Link
                    href={`/organizations/${organizationId}`}
                    className="rounded-xl border border-[#bbf7d0] bg-white px-4 py-3 text-center text-[13px] font-bold text-[#15803d] transition hover:bg-[#dcfce7]"
                  >
                    Открыть карточку предприятия
                  </Link>
                </div>
              </section>
            ) : null}
          </aside>
        </section>
      </div>
    </main>
  );
}

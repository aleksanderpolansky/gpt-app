"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Organization = {
  id: string;
  organization_name: string;
  organization_type?: string | null;
  status?: string | null;
};

type ValueObject = {
  id: string;
  organization_id?: string | null;
  title: string;
  value_type: string;
  default_price: number | null;
  default_currency: string | null;
  default_duration_minutes: number | null;
  organizations?: Organization | null;
};

type Offer = {
  id: string;
  organization_id?: string | null;
  value_object_id?: string | null;
  offer_type?: string | null;
  title?: string | null;
  description?: string | null;
  price?: number | string | null;
  currency?: string | null;
  certificate_available?: boolean | null;
  certificate_payment_mode?: string | null;
  certificate_points_price?: number | string | null;
  certificate_money_price?: number | string | null;
  certificate_currency?: string | null;
  certificate_validity_days?: number | string | null;
  status?: string | null;
};

type OrganizationsResponse = {
  ok?: boolean;
  error?: string;
  organizations?: Organization[];
};

type ValueObjectsResponse = {
  ok?: boolean;
  error?: string;
  valueObjects?: ValueObject[];
  value_objects?: ValueObject[];
};

type CreateOfferResponse = {
  ok?: boolean;
  error?: string;
  offer?: Offer;
};

const PILOT_OFFER_TITLE = "Relaksacyjny masaż łydek w Szczecinie";

const PILOT_OFFER_DESCRIPTION =
  "Relaksacyjny masaż łydek w Szczecinie. Oferta obejmuje 30-minutową usługę masażu relaksacyjnego ukierunkowaną na rozluźnienie napięcia mięśniowego, poprawę komfortu nóg i regenerację po chodzeniu, pracy stojącej, sporcie lub długim siedzeniu.\n\nUsługa jest przeznaczona dla osób, które odczuwają zmęczenie, napięcie lub ciężkość nóg po codziennej aktywności. Ma charakter relaksacyjny i regeneracyjny. Nie jest usługą medyczną i nie zastępuje konsultacji lekarskiej ani fizjoterapeutycznej.";

const PILOT_CERTIFICATE_TERMS =
  "Certyfikat uprawnia do skorzystania z jednej 30-minutowej usługi: relaksacyjny masaż łydek w Szczecinie. Termin realizacji należy uzgodnić wcześniej ze sprzedawcą. Certyfikat nie jest usługą medyczną i nie zastępuje konsultacji lekarskiej ani fizjoterapeutycznej.";

function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeCurrency(value: string) {
  const trimmedValue = value.trim().toUpperCase();

  return trimmedValue.length > 0 ? trimmedValue : "PLN";
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

function getValueTypeLabel(type: string | null | undefined) {
  switch (type) {
    case "service":
      return "услуга";
    case "bookable_service":
      return "услуга с записью";
    case "product":
      return "товар";
    case "consultation":
      return "консультация";
    case "access":
      return "доступ";
    case "content":
      return "контент";
    default:
      return type ?? "ценный объект";
  }
}

function formatMoney(value: string | number | null | undefined, currency: string) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return `${value} ${currency}`.trim();
  }

  return `${new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: 2,
  }).format(numericValue)} ${currency}`.trim();
}

function parseNonNegativeNumber(value: string) {
  if (value.trim().length === 0) {
    return 0;
  }

  const parsedValue = Number(value);

  if (Number.isNaN(parsedValue) || parsedValue < 0) {
    return 0;
  }

  return parsedValue;
}

function parsePositiveNumber(value: string) {
  const parsedValue = Number(value);

  if (Number.isNaN(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

function buildOfferTitleFromValueObject(valueObject: ValueObject) {
  const title = valueObject.title.trim();

  if (title.toLowerCase().includes("szczecin")) {
    return title;
  }

  return `${title} w Szczecinie`;
}

function buildCertificateTerms(valueObjectTitle: string) {
  return `Certyfikat uprawnia do skorzystania z jednej 30-minutowej usługi: ${valueObjectTitle} w Szczecinie. Termin realizacji należy uzgodnić wcześniej ze sprzedawcą. Certyfikat nie jest usługą medyczną i nie zastępuje konsultacji lekarskiej ani fizjoterapeutycznej.`;
}

export default function NewOfferPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [valueObjects, setValueObjects] = useState<ValueObject[]>([]);

  const [organizationId, setOrganizationId] = useState("");
  const [organizationIdFromUrl, setOrganizationIdFromUrl] = useState("");
  const [valueObjectId, setValueObjectId] = useState("");

  const [offerType, setOfferType] = useState("bookable_service");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [regularPrice, setRegularPrice] = useState("");
  const [currency, setCurrency] = useState("PLN");
  const [isPaid, setIsPaid] = useState(true);
  const [isFree, setIsFree] = useState(false);

  const [certificateAvailable, setCertificateAvailable] = useState(true);
  const [certificatePointsCoveredAmount, setCertificatePointsCoveredAmount] =
    useState("0");
  const [certificateCurrency, setCertificateCurrency] = useState("PLN");
  const [certificateTerms, setCertificateTerms] = useState(
    PILOT_CERTIFICATE_TERMS,
  );
  const [certificateValidityDays, setCertificateValidityDays] = useState("180");
  const [requiresSellerConfirmation, setRequiresSellerConfirmation] =
    useState(true);
  const [isTransferable, setIsTransferable] = useState(true);
  const [isCancellable, setIsCancellable] = useState(true);
  const [pointsRefundPolicy, setPointsRefundPolicy] = useState(
    "refund_until_seller_confirmation",
  );
  const [maxCertificatesTotal, setMaxCertificatesTotal] = useState("");
  const [maxCertificatesPerUser, setMaxCertificatesPerUser] = useState("");
  const [isPublicReward, setIsPublicReward] = useState(true);

  const [pointsCurrencyCode, setPointsCurrencyCode] = useState("POINT");
  const [referenceCurrency, setReferenceCurrency] = useState("EUR");
  const [referenceValuePerPoint, setReferenceValuePerPoint] = useState("1");
  const [referenceExchangeRate, setReferenceExchangeRate] = useState("4.30");
  const [referenceExchangeRateSource, setReferenceExchangeRateSource] =
    useState("manual");
  const [referenceExchangeRateDate, setReferenceExchangeRateDate] = useState(
    todayDateInputValue(),
  );

  const [requiresBooking, setRequiresBooking] = useState(true);
  const [bookingMode, setBookingMode] = useState("seller_confirmed");
  const [defaultDurationMinutes, setDefaultDurationMinutes] = useState("30");
  const [minDurationMinutes, setMinDurationMinutes] = useState("30");
  const [maxDurationMinutes, setMaxDurationMinutes] = useState("30");
  const [quantityLimit, setQuantityLimit] = useState("");
  const [targetReceiverType, setTargetReceiverType] = useState("person");

  const [message, setMessage] = useState("");
  const [createdOffer, setCreatedOffer] = useState<Offer | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedOrganization = useMemo(
    () =>
      organizations.find((organization) => organization.id === organizationId) ??
      null,
    [organizationId, organizations],
  );

  const filteredValueObjects = useMemo(() => {
    if (!organizationId) {
      return [];
    }

    return valueObjects.filter(
      (valueObject) => valueObject.organization_id === organizationId,
    );
  }, [organizationId, valueObjects]);

  const selectedValueObject = useMemo(
    () =>
      valueObjects.find((valueObject) => valueObject.id === valueObjectId) ??
      null,
    [valueObjectId, valueObjects],
  );

  const certificatePreview = useMemo(() => {
    const offerPrice = parsePositiveNumber(price);
    const coveredByPoints = parseNonNegativeNumber(certificatePointsCoveredAmount);

    if (!certificateAvailable || !offerPrice) {
      return {
        mode: "money_only",
        moneyToPay: offerPrice ?? 0,
        pointsPrice: 0,
        warning: null as string | null,
      };
    }

    if (coveredByPoints > offerPrice) {
      return {
        mode: "invalid",
        moneyToPay: 0,
        pointsPrice: 0,
        warning:
          "Сумма покрытия POINTS не может быть больше цены предложения.",
      };
    }

    if (coveredByPoints <= 0) {
      return {
        mode: "money_only",
        moneyToPay: offerPrice,
        pointsPrice: 0,
        warning: null,
      };
    }

    const exchangeRate = parsePositiveNumber(referenceExchangeRate);
    const valuePerPoint = parsePositiveNumber(referenceValuePerPoint);

    if (!exchangeRate || !valuePerPoint) {
      return {
        mode: "invalid",
        moneyToPay: offerPrice,
        pointsPrice: 0,
        warning: "Для расчёта POINTS нужен курс и ценность одного POINT.",
      };
    }

    return {
      mode: coveredByPoints >= offerPrice ? "points_only" : "mixed",
      moneyToPay: Math.round((offerPrice - coveredByPoints) * 100) / 100,
      pointsPrice:
        Math.round((coveredByPoints / exchangeRate / valuePerPoint) * 100) / 100,
      warning: null,
    };
  }, [
    certificateAvailable,
    certificatePointsCoveredAmount,
    price,
    referenceExchangeRate,
    referenceValuePerPoint,
  ]);

  const canSubmit =
    !isSubmitting &&
    !isLoadingData &&
    organizationId.trim().length > 0 &&
    title.trim().length > 1 &&
    parsePositiveNumber(price) !== null &&
    certificatePreview.warning === null;

  const applyValueObjectToOffer = useCallback((valueObject: ValueObject) => {
    const nextTitle = buildOfferTitleFromValueObject(valueObject);
    const nextCurrency = valueObject.default_currency ?? "PLN";
    const nextPrice =
      valueObject.default_price !== null &&
      valueObject.default_price !== undefined
        ? String(valueObject.default_price)
        : "";

    const nextDuration =
      valueObject.default_duration_minutes !== null &&
      valueObject.default_duration_minutes !== undefined
        ? String(valueObject.default_duration_minutes)
        : "30";

    setValueObjectId(valueObject.id);
    setOrganizationId(valueObject.organization_id ?? "");
    setOfferType(
      valueObject.value_type === "service" ? "bookable_service" : valueObject.value_type,
    );
    setTitle(nextTitle);
    setDescription(PILOT_OFFER_DESCRIPTION);
    setPrice(nextPrice);
    setRegularPrice(nextPrice);
    setCurrency(nextCurrency);
    setCertificateCurrency(nextCurrency);
    setCertificatePointsCoveredAmount("0");
    setCertificateTerms(buildCertificateTerms(valueObject.title));
    setDefaultDurationMinutes(nextDuration);
    setMinDurationMinutes(nextDuration);
    setMaxDurationMinutes(nextDuration);
    setRequiresBooking(true);
    setBookingMode("seller_confirmed");
    setIsPaid(true);
    setIsFree(false);
    setCertificateAvailable(true);
    setRequiresSellerConfirmation(true);
    setIsTransferable(true);
    setIsCancellable(true);
    setIsPublicReward(true);
    setCreatedOffer(null);
    setMessage("");
  }, []);

  const loadInitialData = useCallback(async () => {
    setIsLoadingData(true);
    setMessage("");

    const searchParams =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();

    const urlOrganizationId = searchParams.get("organizationId") ?? "";
    const urlValueObjectId = searchParams.get("valueObjectId") ?? "";

    setOrganizationIdFromUrl(urlOrganizationId);

    try {
      const [organizationsResponse, valueObjectsResponse] = await Promise.all([
        fetch("/api/organizations", {
          method: "GET",
          cache: "no-store",
        }),
        fetch("/api/value-objects", {
          method: "GET",
          cache: "no-store",
        }),
      ]);

      const organizationsData =
        (await organizationsResponse.json()) as OrganizationsResponse;
      const valueObjectsData =
        (await valueObjectsResponse.json()) as ValueObjectsResponse;

      if (!organizationsResponse.ok || !organizationsData.ok) {
        setMessage(organizationsData.error ?? "Не удалось загрузить предприятия.");
        return;
      }

      if (!valueObjectsResponse.ok || !valueObjectsData.ok) {
        setMessage(valueObjectsData.error ?? "Не удалось загрузить услуги.");
        return;
      }

      const loadedOrganizations = Array.isArray(organizationsData.organizations)
        ? organizationsData.organizations
        : [];

      const loadedValueObjects = Array.isArray(valueObjectsData.valueObjects)
        ? valueObjectsData.valueObjects
        : Array.isArray(valueObjectsData.value_objects)
          ? valueObjectsData.value_objects
          : [];

      setOrganizations(loadedOrganizations);
      setValueObjects(loadedValueObjects);

      const valueObjectFromUrl = loadedValueObjects.find(
        (valueObject) => valueObject.id === urlValueObjectId,
      );

      if (valueObjectFromUrl) {
        applyValueObjectToOffer(valueObjectFromUrl);
        return;
      }

      const organizationFromUrl = loadedOrganizations.find(
        (organization) => organization.id === urlOrganizationId,
      );

      if (organizationFromUrl) {
        setOrganizationId(organizationFromUrl.id);
        return;
      }

      if (loadedOrganizations.length > 0) {
        setOrganizationId(loadedOrganizations[0].id);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Неизвестная ошибка загрузки данных.",
      );
    } finally {
      setIsLoadingData(false);
    }
  }, [applyValueObjectToOffer]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadInitialData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadInitialData]);

  function handleOrganizationChange(nextOrganizationId: string) {
    setOrganizationId(nextOrganizationId);
    setValueObjectId("");
    setCreatedOffer(null);
    setMessage("");
  }

  function handleValueObjectChange(nextValueObjectId: string) {
    const nextValueObject = valueObjects.find(
      (valueObject) => valueObject.id === nextValueObjectId,
    );

    if (!nextValueObject) {
      setValueObjectId("");
      return;
    }

    applyValueObjectToOffer(nextValueObject);
  }

  function applyMassageOfferPilot() {
    setOfferType("bookable_service");
    setTitle(PILOT_OFFER_TITLE);
    setDescription(PILOT_OFFER_DESCRIPTION);
    setPrice("60");
    setRegularPrice("60");
    setCurrency("PLN");
    setCertificateCurrency("PLN");
    setCertificatePointsCoveredAmount("0");
    setCertificateTerms(PILOT_CERTIFICATE_TERMS);
    setCertificateValidityDays("180");
    setDefaultDurationMinutes("30");
    setMinDurationMinutes("30");
    setMaxDurationMinutes("30");
    setRequiresBooking(true);
    setBookingMode("seller_confirmed");
    setIsPaid(true);
    setIsFree(false);
    setCertificateAvailable(true);
    setRequiresSellerConfirmation(true);
    setIsTransferable(true);
    setIsCancellable(true);
    setPointsRefundPolicy("refund_until_seller_confirmation");
    setIsPublicReward(true);
    setCreatedOffer(null);
    setMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setCreatedOffer(null);
    setIsSubmitting(true);

    const preparedItems = valueObjectId
      ? [
          {
            valueObjectId,
            quantity: "1",
            unitPrice: price,
            currency: normalizeCurrency(currency),
            sortOrder: 0,
            isRequired: true,
          },
        ]
      : [];

    try {
      const response = await fetch("/api/offers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          organizationId,
          valueObjectId: valueObjectId || null,
          offerType,
          title: title.trim(),
          description: description.trim() || null,
          price: price.trim(),
          regularPrice: regularPrice.trim() || price.trim(),
          currency: normalizeCurrency(currency),
          isPaid,
          isFree,

          isDiscountActive: false,
          discountType: "manual_price",
          discountValue: "",
          discountStartsAt: "",
          discountEndsAt: "",
          lowestPrice30Days: "",
          lowestPrice30DaysCurrency: normalizeCurrency(currency),
          lowestPrice30DaysPeriodStart: "",
          lowestPrice30DaysPeriodEnd: "",
          discountLegalNote: "",

          certificateAvailable,
          certificatePointsCoveredAmount:
            certificatePointsCoveredAmount.trim().length > 0
              ? certificatePointsCoveredAmount.trim()
              : "0",
          certificateCurrency: normalizeCurrency(certificateCurrency || currency),
          certificateTerms: certificateTerms.trim() || null,
          certificateValidityDays: certificateValidityDays.trim() || "180",
          requiresSellerConfirmation,
          isTransferable,
          isCancellable,
          pointsRefundPolicy,
          maxCertificatesTotal: maxCertificatesTotal.trim() || null,
          maxCertificatesPerUser: maxCertificatesPerUser.trim() || null,
          isPublicReward,

          pointsCurrencyCode: normalizeCurrency(pointsCurrencyCode),
          referenceCurrency: normalizeCurrency(referenceCurrency),
          referenceValuePerPoint: referenceValuePerPoint.trim() || "1",
          referenceExchangeRate: referenceExchangeRate.trim() || "4.30",
          referenceExchangeRateSource,
          referenceExchangeRateDate,

          requiresBooking,
          bookingMode,
          defaultDurationMinutes: defaultDurationMinutes.trim() || null,
          minDurationMinutes: minDurationMinutes.trim() || null,
          maxDurationMinutes: maxDurationMinutes.trim() || null,
          quantityLimit: quantityLimit.trim() || null,
          targetReceiverType,
          items: preparedItems,
        }),
      });

      const data = (await response.json()) as CreateOfferResponse;

      if (!response.ok || !data.ok) {
        setMessage(data.error ?? "Не удалось создать предложение.");
        return;
      }

      setCreatedOffer(data.offer ?? null);
      setMessage("Предложение создано. Теперь можно проверить сертификат и каталог.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Неизвестная ошибка создания предложения.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const createdOfferId = createdOffer?.id ?? null;

  return (
    <main className="min-h-full bg-[#f5f6fb] px-4 py-8 text-[#1a1d2e]">
      <div className="mx-auto grid w-full max-w-[1120px] gap-5">
        <header className="rounded-[18px] border border-[rgba(0,0,0,0.07)] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7c8099]">
            Commercial core / Enterprise offer
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-[30px] font-bold tracking-[-0.03em] text-[#111827]">
                Создать предложение предприятия
              </h1>

              <p className="mt-2 max-w-[820px] text-[14px] leading-6 text-[#5a5f7a]">
                Предложение связывает предприятие, услугу как Value Object,
                цену, условия записи и подарочный сертификат. Здесь мы создаём
                реальное предложение для Szczecin.
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
                href="/offers"
                className="rounded-xl border border-[#dfe4ff] bg-[#eef2ff] px-4 py-3 text-[13px] font-bold text-[#3b6ef8] transition hover:bg-[#e4eaff]"
              >
                Список предложений
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
                  Шаг 2
                </div>
                <h2 className="mt-1 text-[22px] font-bold text-[#111827]">
                  Предложение на базе услуги
                </h2>
                <p className="mt-1 text-[13px] leading-5 text-[#7c8099]">
                  Услуга уже создана. Теперь оформляем offer и включаем
                  подарочный сертификат.
                </p>
              </div>

              <button
                type="button"
                onClick={applyMassageOfferPilot}
                className="rounded-xl border border-[#dfe4ff] bg-[#eef2ff] px-4 py-3 text-[13px] font-bold text-[#3b6ef8] transition hover:bg-[#e4eaff]"
              >
                Заполнить offer массажа
              </button>
            </div>

            {organizationIdFromUrl &&
            !selectedOrganization &&
            !isLoadingData ? (
              <div className="mb-5 rounded-xl border border-[#facc15] bg-[#fefce8] px-4 py-3 text-[13px] leading-5 text-[#92400e]">
                Предприятие из ссылки не найдено или доступ запрещён. Выберите
                предприятие вручную.
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
                  onChange={(event) => handleOrganizationChange(event.target.value)}
                  required
                  disabled={isLoadingData || organizations.length === 0}
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
              </div>

              <div className="grid gap-2">
                <label className="text-[13px] font-semibold text-[#343854]">
                  Услуга / основной Value Object
                </label>
                <select
                  value={valueObjectId}
                  onChange={(event) => handleValueObjectChange(event.target.value)}
                  disabled={isLoadingData || filteredValueObjects.length === 0}
                  className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
                >
                  <option value="">
                    {filteredValueObjects.length === 0
                      ? "Нет услуг для выбранного предприятия"
                      : "Выберите услугу"}
                  </option>

                  {filteredValueObjects.map((valueObject) => (
                    <option key={valueObject.id} value={valueObject.id}>
                      {valueObject.title} ({getValueTypeLabel(valueObject.value_type)})
                    </option>
                  ))}
                </select>

                {organizationId && filteredValueObjects.length === 0 ? (
                  <Link
                    href={`/value-objects/new?organizationId=${organizationId}`}
                    className="text-[12px] font-semibold text-[#3b6ef8] underline-offset-4 hover:underline"
                  >
                    Сначала добавить услугу для этого предприятия
                  </Link>
                ) : null}
              </div>

              <div className="grid gap-2">
                <label className="text-[13px] font-semibold text-[#343854]">
                  Название предложения
                </label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Relaksacyjny masaż łydek w Szczecinie"
                  className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
                  required
                />
              </div>

              <div className="grid gap-2">
                <label className="text-[13px] font-semibold text-[#343854]">
                  Описание предложения
                </label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={PILOT_OFFER_DESCRIPTION}
                  rows={7}
                  className="w-full resize-y rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] leading-6 text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="grid gap-2">
                  <label className="text-[13px] font-semibold text-[#343854]">
                    Тип offer
                  </label>
                  <select
                    value={offerType}
                    onChange={(event) => setOfferType(event.target.value)}
                    className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
                  >
                    <option value="bookable_service">Услуга с записью</option>
                    <option value="service">Услуга</option>
                    <option value="product">Товар</option>
                    <option value="bundle">Пакет / bundle</option>
                    <option value="consultation">Консультация</option>
                    <option value="reward">Reward / сертификат</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className="text-[13px] font-semibold text-[#343854]">
                    Цена
                  </label>
                  <input
                    value={price}
                    onChange={(event) => {
                      setPrice(event.target.value);
                      setRegularPrice(event.target.value);
                    }}
                    inputMode="decimal"
                    placeholder="60"
                    className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-[13px] font-semibold text-[#343854]">
                    Валюта
                  </label>
                  <input
                    value={currency}
                    onChange={(event) => {
                      const nextCurrency = event.target.value;
                      setCurrency(nextCurrency);
                      setCertificateCurrency(nextCurrency);
                    }}
                    maxLength={3}
                    placeholder="PLN"
                    className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] uppercase text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-[13px] font-semibold text-[#343854]">
                    Длительность, мин.
                  </label>
                  <input
                    value={defaultDurationMinutes}
                    onChange={(event) => {
                      setDefaultDurationMinutes(event.target.value);
                      setMinDurationMinutes(event.target.value);
                      setMaxDurationMinutes(event.target.value);
                    }}
                    inputMode="numeric"
                    placeholder="30"
                    className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
                  />
                </div>
              </div>

              <div className="grid gap-3 rounded-2xl border border-[#edf0f7] bg-[#f8f9fd] p-4">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={requiresBooking}
                    onChange={(event) => setRequiresBooking(event.target.checked)}
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    <span className="block text-[13px] font-semibold text-[#343854]">
                      Требуется согласование времени
                    </span>
                    <span className="mt-1 block text-[12px] leading-5 text-[#7c8099]">
                      Для массажа клиент должен договориться о времени со
                      продавцом.
                    </span>
                  </span>
                </label>

                <div className="grid gap-2 md:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="text-[12px] font-semibold text-[#4a4f6a]">
                      Режим записи
                    </label>
                    <select
                      value={bookingMode}
                      onChange={(event) => setBookingMode(event.target.value)}
                      className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px] text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
                    >
                      <option value="seller_confirmed">Подтверждает продавец</option>
                      <option value="not_required">Запись не требуется</option>
                      <option value="manual">Ручное согласование</option>
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-[12px] font-semibold text-[#4a4f6a]">
                      Для кого
                    </label>
                    <select
                      value={targetReceiverType}
                      onChange={(event) =>
                        setTargetReceiverType(event.target.value)
                      }
                      className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px] text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
                    >
                      <option value="person">Для человека</option>
                      <option value="organization">Для организации</option>
                      <option value="any">Для любого получателя</option>
                    </select>
                  </div>
                </div>
              </div>

              <section className="grid gap-4 rounded-2xl border border-[#dbeafe] bg-[#eff6ff] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1d4ed8]">
                      Подарочный сертификат
                    </div>
                    <h3 className="mt-1 text-[18px] font-bold text-[#1e3a8a]">
                      Включить сертификат на базе этого предложения
                    </h3>
                    <p className="mt-1 text-[12px] leading-5 text-[#1d4ed8]">
                      Сертификат будет связан с offer и услугой. На этом этапе
                      сертификат оплачивается деньгами, POINTS можно подключать
                      позже.
                    </p>
                  </div>

                  <label className="flex items-center gap-2 rounded-full border border-[#bfdbfe] bg-white px-3 py-2 text-[12px] font-semibold text-[#1d4ed8]">
                    <input
                      type="checkbox"
                      checked={certificateAvailable}
                      onChange={(event) =>
                        setCertificateAvailable(event.target.checked)
                      }
                    />
                    Сертификат доступен
                  </label>
                </div>

                {certificateAvailable ? (
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <label className="text-[13px] font-semibold text-[#1e3a8a]">
                        Условия сертификата
                      </label>
                      <textarea
                        value={certificateTerms}
                        onChange={(event) =>
                          setCertificateTerms(event.target.value)
                        }
                        rows={4}
                        className="w-full resize-y rounded-xl border border-[#bfdbfe] bg-white px-4 py-3 text-[13px] leading-6 text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="grid gap-2">
                        <label className="text-[12px] font-semibold text-[#1e3a8a]">
                          Срок, дней
                        </label>
                        <input
                          value={certificateValidityDays}
                          onChange={(event) =>
                            setCertificateValidityDays(event.target.value)
                          }
                          inputMode="numeric"
                          placeholder="180"
                          className="w-full rounded-xl border border-[#bfdbfe] bg-white px-4 py-3 text-[13px] text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
                        />
                      </div>

                      <div className="grid gap-2">
                        <label className="text-[12px] font-semibold text-[#1e3a8a]">
                          Валюта сертификата
                        </label>
                        <input
                          value={certificateCurrency}
                          onChange={(event) =>
                            setCertificateCurrency(event.target.value)
                          }
                          maxLength={3}
                          placeholder="PLN"
                          className="w-full rounded-xl border border-[#bfdbfe] bg-white px-4 py-3 text-[13px] uppercase text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
                        />
                      </div>

                      <div className="grid gap-2">
                        <label className="text-[12px] font-semibold text-[#1e3a8a]">
                          Покрытие POINTS
                        </label>
                        <input
                          value={certificatePointsCoveredAmount}
                          onChange={(event) =>
                            setCertificatePointsCoveredAmount(event.target.value)
                          }
                          inputMode="decimal"
                          placeholder="0"
                          className="w-full rounded-xl border border-[#bfdbfe] bg-white px-4 py-3 text-[13px] text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
                        />
                      </div>

                      <div className="grid gap-2">
                        <label className="text-[12px] font-semibold text-[#1e3a8a]">
                          Лимит сертификатов
                        </label>
                        <input
                          value={maxCertificatesTotal}
                          onChange={(event) =>
                            setMaxCertificatesTotal(event.target.value)
                          }
                          inputMode="numeric"
                          placeholder="без лимита"
                          className="w-full rounded-xl border border-[#bfdbfe] bg-white px-4 py-3 text-[13px] text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <label className="flex items-start gap-2 text-[12px] font-semibold text-[#1d4ed8]">
                        <input
                          type="checkbox"
                          checked={requiresSellerConfirmation}
                          onChange={(event) =>
                            setRequiresSellerConfirmation(event.target.checked)
                          }
                          className="mt-0.5"
                        />
                        Продавец подтверждает использование
                      </label>

                      <label className="flex items-start gap-2 text-[12px] font-semibold text-[#1d4ed8]">
                        <input
                          type="checkbox"
                          checked={isTransferable}
                          onChange={(event) =>
                            setIsTransferable(event.target.checked)
                          }
                          className="mt-0.5"
                        />
                        Можно передать другому человеку
                      </label>

                      <label className="flex items-start gap-2 text-[12px] font-semibold text-[#1d4ed8]">
                        <input
                          type="checkbox"
                          checked={isCancellable}
                          onChange={(event) =>
                            setIsCancellable(event.target.checked)
                          }
                          className="mt-0.5"
                        />
                        Можно отменить по правилам платформы
                      </label>
                    </div>
                  </div>
                ) : null}
              </section>

              <details className="rounded-2xl border border-[#edf0f7] bg-white p-4">
                <summary className="cursor-pointer text-[13px] font-bold text-[#4a4f6a]">
                  Дополнительные настройки POINTS и ограничений
                </summary>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div className="grid gap-2">
                    <label className="text-[12px] font-semibold text-[#4a4f6a]">
                      Валюта баллов
                    </label>
                    <input
                      value={pointsCurrencyCode}
                      onChange={(event) =>
                        setPointsCurrencyCode(event.target.value)
                      }
                      className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px]"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-[12px] font-semibold text-[#4a4f6a]">
                      Базовая валюта
                    </label>
                    <input
                      value={referenceCurrency}
                      onChange={(event) =>
                        setReferenceCurrency(event.target.value)
                      }
                      className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px]"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-[12px] font-semibold text-[#4a4f6a]">
                      Курс 1 EUR к PLN
                    </label>
                    <input
                      value={referenceExchangeRate}
                      onChange={(event) =>
                        setReferenceExchangeRate(event.target.value)
                      }
                      className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px]"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-[12px] font-semibold text-[#4a4f6a]">
                      Value per point
                    </label>
                    <input
                      value={referenceValuePerPoint}
                      onChange={(event) =>
                        setReferenceValuePerPoint(event.target.value)
                      }
                      className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px]"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-[12px] font-semibold text-[#4a4f6a]">
                      Источник курса
                    </label>
                    <input
                      value={referenceExchangeRateSource}
                      onChange={(event) =>
                        setReferenceExchangeRateSource(event.target.value)
                      }
                      className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px]"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-[12px] font-semibold text-[#4a4f6a]">
                      Дата курса
                    </label>
                    <input
                      type="date"
                      value={referenceExchangeRateDate}
                      onChange={(event) =>
                        setReferenceExchangeRateDate(event.target.value)
                      }
                      className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px]"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-[12px] font-semibold text-[#4a4f6a]">
                      Лимит на пользователя
                    </label>
                    <input
                      value={maxCertificatesPerUser}
                      onChange={(event) =>
                        setMaxCertificatesPerUser(event.target.value)
                      }
                      placeholder="без лимита"
                      className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px]"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-[12px] font-semibold text-[#4a4f6a]">
                      Лимит количества услуг
                    </label>
                    <input
                      value={quantityLimit}
                      onChange={(event) => setQuantityLimit(event.target.value)}
                      placeholder="без лимита"
                      className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px]"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-[12px] font-semibold text-[#4a4f6a]">
                      Политика возврата
                    </label>
                    <select
                      value={pointsRefundPolicy}
                      onChange={(event) =>
                        setPointsRefundPolicy(event.target.value)
                      }
                      className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px]"
                    >
                      <option value="refund_until_seller_confirmation">
                        Возврат до подтверждения продавца
                      </option>
                      <option value="refund_until_delivery">
                        Возврат до оказания услуги
                      </option>
                      <option value="manual_review">Ручное рассмотрение</option>
                      <option value="no_refund">Без возврата</option>
                    </select>
                  </div>

                  <label className="flex items-start gap-2 text-[12px] font-semibold text-[#4a4f6a]">
                    <input
                      type="checkbox"
                      checked={isPublicReward}
                      onChange={(event) => setIsPublicReward(event.target.checked)}
                      className="mt-0.5"
                    />
                    Публичный reward / сертификат
                  </label>
                </div>
              </details>

              {message ? (
                <div
                  className={`rounded-xl border px-4 py-3 text-[13px] font-medium ${
                    createdOffer
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
                {isSubmitting ? "Создаю предложение..." : "Создать предложение"}
              </button>
            </div>
          </form>

          <aside className="grid content-start gap-4">
            <section className="rounded-[18px] border border-[rgba(0,0,0,0.07)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
                Связь данных
              </div>

              <h2 className="mt-2 text-[20px] font-bold text-[#111827]">
                Enterprise → Value Object → Offer
              </h2>

              <div className="mt-3 grid gap-3 text-[13px] leading-5 text-[#5a5f7a]">
                <p className="m-0">
                  <strong className="text-[#343854]">Предприятие:</strong>{" "}
                  {selectedOrganization?.organization_name ?? "не выбрано"}
                </p>
                <p className="m-0">
                  <strong className="text-[#343854]">Услуга:</strong>{" "}
                  {selectedValueObject?.title ?? "не выбрана"}
                </p>
                <p className="m-0">
                  <strong className="text-[#343854]">Цена:</strong>{" "}
                  {formatMoney(price, normalizeCurrency(currency))}
                </p>
                <p className="m-0">
                  <strong className="text-[#343854]">Сертификат:</strong>{" "}
                  {certificateAvailable ? "включён" : "выключен"}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  "offer",
                  "masaże",
                  "łydki",
                  "Szczecin",
                  "certificate-ready",
                  "enterprise-owned",
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
                Preview сертификата
              </div>

              <h2 className="mt-2 text-[20px] font-bold text-[#111827]">
                {certificateAvailable
                  ? "Подарочный сертификат будет доступен"
                  : "Сертификат выключен"}
              </h2>

              <div className="mt-3 grid gap-2 text-[13px] leading-5 text-[#5a5f7a]">
                <p className="m-0">
                  <strong className="text-[#343854]">К оплате деньгами:</strong>{" "}
                  {formatMoney(
                    certificatePreview.moneyToPay,
                    normalizeCurrency(certificateCurrency || currency),
                  )}
                </p>
                <p className="m-0">
                  <strong className="text-[#343854]">POINTS:</strong>{" "}
                  {certificatePreview.pointsPrice}
                </p>
                <p className="m-0">
                  <strong className="text-[#343854]">Срок:</strong>{" "}
                  {certificateValidityDays || "180"} дней
                </p>
              </div>

              {certificatePreview.warning ? (
                <div className="mt-3 rounded-xl border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-[12px] font-medium text-[#b42318]">
                  {certificatePreview.warning}
                </div>
              ) : null}
            </section>

            <section className="rounded-[18px] border border-[rgba(0,0,0,0.07)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
                Что дальше
              </div>

              <ol className="mt-3 grid gap-3 text-[13px] leading-5 text-[#5a5f7a]">
                <li>
                  <strong className="text-[#343854]">1.</strong> Создать offer.
                </li>
                <li>
                  <strong className="text-[#343854]">2.</strong> Открыть
                  сертификат на базе offer.
                </li>
                <li>
                  <strong className="text-[#343854]">3.</strong> Проверить
                  появление в списке предложений.
                </li>
                <li>
                  <strong className="text-[#343854]">4.</strong> Потом связать
                  offer с динамическими категориями меню.
                </li>
              </ol>
            </section>

            {createdOffer ? (
              <section className="rounded-[18px] border border-[#bbf7d0] bg-[#f0fdf4] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#15803d]">
                  Предложение создано
                </div>

                <h2 className="mt-2 text-[20px] font-bold text-[#14532d]">
                  {createdOffer.title ?? title}
                </h2>

                <div className="mt-3 grid gap-2 text-[13px] leading-5 text-[#166534]">
                  <p className="m-0">
                    <strong>Цена:</strong>{" "}
                    {formatMoney(createdOffer.price ?? price, createdOffer.currency ?? currency)}
                  </p>
                  <p className="m-0">
                    <strong>Сертификат:</strong>{" "}
                    {createdOffer.certificate_available ?? certificateAvailable
                      ? "доступен"
                      : "выключен"}
                  </p>
                  <p className="m-0">
                    <strong>Статус:</strong> {createdOffer.status ?? "active"}
                  </p>
                </div>

                <div className="mt-4 grid gap-2">
                  {createdOfferId ? (
                    <Link
                      href={`/certificates/new?offerId=${createdOfferId}`}
                      className="rounded-xl bg-[#3b6ef8] px-4 py-3 text-center text-[13px] font-bold text-white transition hover:bg-[#2f5fe3]"
                    >
                      Открыть сертификат на базе offer
                    </Link>
                  ) : null}

                  <Link
                    href="/offers"
                    className="rounded-xl border border-[#bbf7d0] bg-white px-4 py-3 text-center text-[13px] font-bold text-[#15803d] transition hover:bg-[#dcfce7]"
                  >
                    Перейти к списку предложений
                  </Link>

                  <Link
                    href="/certificates"
                    className="rounded-xl border border-[#bbf7d0] bg-white px-4 py-3 text-center text-[13px] font-bold text-[#15803d] transition hover:bg-[#dcfce7]"
                  >
                    Перейти к сертификатам
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

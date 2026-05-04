"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Organization = {
  id: string;
  organization_name: string;
  organization_type: string;
  status: string;
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

type OfferItemForm = {
  localId: string;
  valueObjectId: string;
  quantity: string;
  unitPrice: string;
  currency: string;
  isRequired: boolean;
};

function createEmptyOfferItem(currency = "PLN"): OfferItemForm {
  return {
    localId: crypto.randomUUID(),
    valueObjectId: "",
    quantity: "1",
    unitPrice: "",
    currency,
    isRequired: true,
  };
}

function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function parsePositiveNumber(value: string) {
  const parsedValue = Number(value);

  if (Number.isNaN(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

function parseNonNegativeNumber(value: string) {
  const parsedValue = Number(value);

  if (Number.isNaN(parsedValue) || parsedValue < 0) {
    return null;
  }

  return parsedValue;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export default function NewOfferPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [valueObjects, setValueObjects] = useState<ValueObject[]>([]);

  const [organizationId, setOrganizationId] = useState("");
  const [organizationIdFromUrl, setOrganizationIdFromUrl] = useState("");
  const [valueObjectId, setValueObjectId] = useState("");

  const [offerItems, setOfferItems] = useState<OfferItemForm[]>([
    createEmptyOfferItem("PLN"),
  ]);

  const [offerType, setOfferType] = useState("bundle");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [regularPrice, setRegularPrice] = useState("");
  const [currency, setCurrency] = useState("PLN");
  const [isPaid, setIsPaid] = useState(true);
  const [isFree, setIsFree] = useState(false);

  const [isDiscountActive, setIsDiscountActive] = useState(false);
  const [discountType, setDiscountType] = useState("manual_price");
  const [discountValue, setDiscountValue] = useState("");
  const [discountStartsAt, setDiscountStartsAt] = useState("");
  const [discountEndsAt, setDiscountEndsAt] = useState("");
  const [lowestPrice30Days, setLowestPrice30Days] = useState("");
  const [lowestPrice30DaysCurrency, setLowestPrice30DaysCurrency] =
    useState("PLN");
  const [lowestPrice30DaysPeriodStart, setLowestPrice30DaysPeriodStart] =
    useState("");
  const [lowestPrice30DaysPeriodEnd, setLowestPrice30DaysPeriodEnd] =
    useState("");
  const [discountLegalNote, setDiscountLegalNote] = useState("");

  const [certificateAvailable, setCertificateAvailable] = useState(true);
  const [certificatePaymentMode, setCertificatePaymentMode] =
    useState("points_only");
  const [certificatePointsCoveredAmount, setCertificatePointsCoveredAmount] =
    useState("");
  const [certificateCurrency, setCertificateCurrency] = useState("PLN");
  const [certificateTerms, setCertificateTerms] = useState("");
  const [certificateValidityDays, setCertificateValidityDays] = useState("180");
  const [requiresSellerConfirmation, setRequiresSellerConfirmation] =
    useState(true);
  const [isTransferable, setIsTransferable] = useState(true);
  const [isCancellable, setIsCancellable] = useState(true);
  const [pointsRefundPolicy, setPointsRefundPolicy] = useState(
    "refund_until_seller_confirmation"
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
    todayDateInputValue()
  );

  const [requiresBooking, setRequiresBooking] = useState(false);
  const [bookingMode, setBookingMode] = useState("not_required");
  const [defaultDurationMinutes, setDefaultDurationMinutes] = useState("");
  const [minDurationMinutes, setMinDurationMinutes] = useState("");
  const [maxDurationMinutes, setMaxDurationMinutes] = useState("");
  const [quantityLimit, setQuantityLimit] = useState("");
  const [targetReceiverType, setTargetReceiverType] = useState("person");

  const [message, setMessage] = useState("");
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(true);
  const [isLoadingValueObjects, setIsLoadingValueObjects] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredValueObjects = useMemo(() => {
    if (!organizationId) {
      return [];
    }

    return valueObjects.filter(
      (valueObject) => valueObject.organization_id === organizationId
    );
  }, [organizationId, valueObjects]);

  const selectedOrganization = useMemo(() => {
    return organizations.find(
      (organization) => organization.id === organizationId
    );
  }, [organizationId, organizations]);

  const calculatedItemsTotal = useMemo(() => {
    return offerItems.reduce((sum, item) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);

      if (Number.isNaN(quantity) || Number.isNaN(unitPrice)) {
        return sum;
      }

      return sum + quantity * unitPrice;
    }, 0);
  }, [offerItems]);

  const certificatePricingPreview = useMemo(() => {
    const offerPrice = parsePositiveNumber(price);
    const exchangeRate = parsePositiveNumber(referenceExchangeRate);
    const valuePerPoint = parsePositiveNumber(referenceValuePerPoint);

    if (!certificateAvailable || !offerPrice) {
      return {
        canCalculate: false,
        coveredAmount: 0,
        calculatedPointsPrice: 0,
        moneyToPay: offerPrice ?? 0,
        warning: null,
      };
    }

    if (certificatePaymentMode === "money_only") {
      return {
        canCalculate: true,
        coveredAmount: 0,
        calculatedPointsPrice: 0,
        moneyToPay: round2(offerPrice),
        warning: null,
      };
    }

    if (!exchangeRate || !valuePerPoint) {
      return {
        canCalculate: false,
        coveredAmount: 0,
        calculatedPointsPrice: 0,
        moneyToPay: offerPrice,
        warning:
          "Введите курс: например, если 1 EUR = 4.30 PLN, укажите 4.30.",
      };
    }

    const enteredCoveredAmount = parseNonNegativeNumber(
      certificatePointsCoveredAmount
    );

    const coveredAmount =
      certificatePaymentMode === "points_only" &&
      (certificatePointsCoveredAmount.trim().length === 0 ||
        enteredCoveredAmount === null)
        ? offerPrice
        : enteredCoveredAmount ?? 0;

    if (coveredAmount <= 0) {
      return {
        canCalculate: false,
        coveredAmount,
        calculatedPointsPrice: 0,
        moneyToPay: offerPrice,
        warning:
          "Введите сумму, которую продавец готов покрыть points в валюте offer.",
      };
    }

    if (coveredAmount > offerPrice) {
      return {
        canCalculate: false,
        coveredAmount,
        calculatedPointsPrice: 0,
        moneyToPay: 0,
        warning:
          "Сумма покрытия points не может быть больше текущей цены offer.",
      };
    }

    const calculatedPointsPrice = round2(
      coveredAmount / exchangeRate / valuePerPoint
    );

    const moneyToPay =
      certificatePaymentMode === "points_only"
        ? 0
        : round2(offerPrice - coveredAmount);

    if (certificatePaymentMode === "mixed" && moneyToPay <= 0) {
      return {
        canCalculate: false,
        coveredAmount,
        calculatedPointsPrice,
        moneyToPay,
        warning:
          "Для mixed-режима денежная часть должна быть больше 0. Если points покрывают всю цену, выберите points_only.",
      };
    }

    return {
      canCalculate: true,
      coveredAmount: round2(coveredAmount),
      calculatedPointsPrice,
      moneyToPay,
      warning: null,
    };
  }, [
    certificateAvailable,
    certificatePaymentMode,
    certificatePointsCoveredAmount,
    price,
    referenceExchangeRate,
    referenceValuePerPoint,
  ]);

  async function loadOrganizations() {
    setIsLoadingOrganizations(true);

    const urlOrganizationId =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("organizationId") ??
          ""
        : "";

    setOrganizationIdFromUrl(urlOrganizationId);

    try {
      const response = await fetch("/api/organizations", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setMessage(data.error ?? "Failed to load organizations");
        return;
      }

      const loadedOrganizations: Organization[] = data.organizations ?? [];
      setOrganizations(loadedOrganizations);

      const organizationFromUrl = loadedOrganizations.find(
        (organization) => organization.id === urlOrganizationId
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
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    } finally {
      setIsLoadingOrganizations(false);
    }
  }

  async function loadValueObjects() {
    setIsLoadingValueObjects(true);

    try {
      const response = await fetch("/api/value-objects", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setMessage(data.error ?? "Failed to load value objects");
        return;
      }

      setValueObjects(data.valueObjects ?? []);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    } finally {
      setIsLoadingValueObjects(false);
    }
  }

  useEffect(() => {
    loadOrganizations();
    loadValueObjects();
  }, []);

  useEffect(() => {
    setValueObjectId("");
    setOfferItems([createEmptyOfferItem(currency)]);
  }, [organizationId]);

  useEffect(() => {
    setCertificateCurrency(currency);
    setLowestPrice30DaysCurrency(currency);
  }, [currency]);

  useEffect(() => {
    if (
      certificatePaymentMode === "points_only" &&
      price.trim().length > 0 &&
      certificatePointsCoveredAmount.trim().length === 0
    ) {
      setCertificatePointsCoveredAmount(price);
    }
  }, [certificatePaymentMode, price, certificatePointsCoveredAmount]);

  function findValueObject(valueObjectIdToFind: string) {
    return valueObjects.find(
      (valueObject) => valueObject.id === valueObjectIdToFind
    );
  }

  function applyMainValueObjectDefaults(selectedId: string) {
    const selectedValueObject = findValueObject(selectedId);

    if (!selectedValueObject) {
      return;
    }

    setTitle(selectedValueObject.title);
    setOfferType(
      selectedValueObject.value_type === "service"
        ? "bookable_service"
        : selectedValueObject.value_type
    );

    if (selectedValueObject.default_price !== null) {
      const defaultPrice = String(selectedValueObject.default_price);

      setPrice(defaultPrice);
      setRegularPrice(defaultPrice);
      setCertificatePointsCoveredAmount(defaultPrice);
    }

    if (selectedValueObject.default_currency) {
      setCurrency(selectedValueObject.default_currency);
      setCertificateCurrency(selectedValueObject.default_currency);
      setLowestPrice30DaysCurrency(selectedValueObject.default_currency);
    }

    if (selectedValueObject.default_duration_minutes !== null) {
      setDefaultDurationMinutes(
        String(selectedValueObject.default_duration_minutes)
      );
      setMinDurationMinutes(String(selectedValueObject.default_duration_minutes));
      setMaxDurationMinutes(String(selectedValueObject.default_duration_minutes));
    }
  }

  function updateOfferItem(
    localId: string,
    updates: Partial<Omit<OfferItemForm, "localId">>
  ) {
    setOfferItems((currentItems) =>
      currentItems.map((item) =>
        item.localId === localId ? { ...item, ...updates } : item
      )
    );
  }

  function handleOfferItemValueObjectChange(localId: string, selectedId: string) {
    const selectedValueObject = findValueObject(selectedId);

    updateOfferItem(localId, {
      valueObjectId: selectedId,
      unitPrice:
        selectedValueObject?.default_price !== null &&
        selectedValueObject?.default_price !== undefined
          ? String(selectedValueObject.default_price)
          : "",
      currency: selectedValueObject?.default_currency || currency,
    });
  }

  function addOfferItem() {
    setOfferItems((currentItems) => [
      ...currentItems,
      createEmptyOfferItem(currency),
    ]);
  }

  function removeOfferItem(localId: string) {
    setOfferItems((currentItems) => {
      if (currentItems.length <= 1) {
        return currentItems;
      }

      return currentItems.filter((item) => item.localId !== localId);
    });
  }

  function useItemsTotalAsOfferPrice() {
    if (calculatedItemsTotal > 0) {
      const total = String(calculatedItemsTotal);

      setPrice(total);
      setRegularPrice(total);

      if (certificatePaymentMode === "points_only") {
        setCertificatePointsCoveredAmount(total);
      }
    }
  }

  function prepareDiscountDates() {
    if (!isDiscountActive) {
      return;
    }

    const today = todayDateInputValue();

    if (!discountStartsAt) {
      setDiscountStartsAt(today);
    }

    if (!lowestPrice30DaysPeriodEnd) {
      setLowestPrice30DaysPeriodEnd(today);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setIsSubmitting(true);

    const preparedItems = offerItems
      .filter((item) => item.valueObjectId.trim().length > 0)
      .map((item, index) => ({
        valueObjectId: item.valueObjectId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        currency: item.currency || currency,
        sortOrder: index,
        isRequired: item.isRequired,
      }));

    try {
      const response = await fetch("/api/offers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId,
          valueObjectId: valueObjectId || null,
          offerType,
          title,
          description,
          price,
          regularPrice,
          currency,
          isPaid,
          isFree,

          isDiscountActive,
          discountType,
          discountValue,
          discountStartsAt,
          discountEndsAt,
          lowestPrice30Days,
          lowestPrice30DaysCurrency,
          lowestPrice30DaysPeriodStart,
          lowestPrice30DaysPeriodEnd,
          discountLegalNote,

          certificateAvailable,
          certificatePaymentMode,
          certificatePointsCoveredAmount:
            certificatePaymentMode === "money_only"
              ? "0"
              : certificatePointsCoveredAmount,
          certificateMoneyPrice:
            certificatePaymentMode === "money_only"
              ? price
              : String(certificatePricingPreview.moneyToPay),
          certificateCurrency,
          certificateTerms,
          certificateValidityDays,
          requiresSellerConfirmation,
          isTransferable,
          isCancellable,
          pointsRefundPolicy,
          maxCertificatesTotal,
          maxCertificatesPerUser,
          isPublicReward,

          pointsCurrencyCode,
          referenceCurrency,
          referenceValuePerPoint,
          referenceExchangeRate,
          referenceExchangeRateSource,
          referenceExchangeRateDate,

          requiresBooking,
          bookingMode,
          defaultDurationMinutes,
          minDurationMinutes,
          maxDurationMinutes,
          quantityLimit,
          targetReceiverType,
          items: preparedItems,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setMessage(data.error ?? "Failed to create offer");
        return;
      }

      setMessage("Offer created successfully");

      setValueObjectId("");
      setOfferItems([createEmptyOfferItem(currency)]);
      setOfferType("bundle");
      setTitle("");
      setDescription("");
      setPrice("");
      setRegularPrice("");
      setCurrency("PLN");
      setIsPaid(true);
      setIsFree(false);

      setIsDiscountActive(false);
      setDiscountType("manual_price");
      setDiscountValue("");
      setDiscountStartsAt("");
      setDiscountEndsAt("");
      setLowestPrice30Days("");
      setLowestPrice30DaysCurrency("PLN");
      setLowestPrice30DaysPeriodStart("");
      setLowestPrice30DaysPeriodEnd("");
      setDiscountLegalNote("");

      setCertificateAvailable(true);
      setCertificatePaymentMode("points_only");
      setCertificatePointsCoveredAmount("");
      setCertificateCurrency("PLN");
      setCertificateTerms("");
      setCertificateValidityDays("180");
      setRequiresSellerConfirmation(true);
      setIsTransferable(true);
      setIsCancellable(true);
      setPointsRefundPolicy("refund_until_seller_confirmation");
      setMaxCertificatesTotal("");
      setMaxCertificatesPerUser("");
      setIsPublicReward(true);

      setPointsCurrencyCode("POINT");
      setReferenceCurrency("EUR");
      setReferenceValuePerPoint("1");
      setReferenceExchangeRate("4.30");
      setReferenceExchangeRateSource("manual");
      setReferenceExchangeRateDate(todayDateInputValue());

      setRequiresBooking(false);
      setBookingMode("not_required");
      setDefaultDurationMinutes("");
      setMinDurationMinutes("");
      setMaxDurationMinutes("");
      setQuantityLimit("");
      setTargetReceiverType("person");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLoading = isLoadingOrganizations || isLoadingValueObjects;

  const hasAtLeastOneItem = offerItems.some(
    (item) => item.valueObjectId.trim().length > 0
  );

  const isSubmitDisabled =
    isSubmitting ||
    isLoading ||
    organizations.length === 0 ||
    organizationId.trim().length === 0 ||
    title.trim().length === 0 ||
    (!valueObjectId && !hasAtLeastOneItem);

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
          maxWidth: "980px",
          margin: "0 auto",
        }}
      >
        <header style={{ marginBottom: "32px", textAlign: "center" }}>
          <h1
            style={{
              fontSize: "32px",
              lineHeight: "1.2",
              fontWeight: 700,
              margin: "0 0 12px",
            }}
          >
            Create offer
          </h1>

          <p
            style={{
              maxWidth: "820px",
              margin: "0 auto 20px",
              color: "#555555",
              fontSize: "16px",
              lineHeight: "1.5",
            }}
          >
            Create a commercial offer connected to one organization. The seller
            enters the money amount covered by points, and the system calculates
            how many POINT will be charged.
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
            <Link href="/" style={{ color: "#2563eb", textDecoration: "underline" }}>
              На главную
            </Link>

            <Link
              href="/organizations"
              style={{ color: "#2563eb", textDecoration: "underline" }}
            >
              Мои организации
            </Link>

            {organizationId ? (
              <Link
                href={`/organizations/${organizationId}`}
                style={{ color: "#2563eb", textDecoration: "underline" }}
              >
                Открыть организацию
              </Link>
            ) : null}

            <Link
              href="/offers"
              style={{ color: "#2563eb", textDecoration: "underline" }}
            >
              Offers
            </Link>

            <Link
              href="/value-objects"
              style={{ color: "#2563eb", textDecoration: "underline" }}
            >
              Value objects
            </Link>
          </nav>
        </header>

        {isLoading ? (
          <div
            style={{
              border: "1px solid #dddddd",
              borderRadius: "10px",
              padding: "16px",
              background: "#f9fafb",
              marginBottom: "16px",
            }}
          >
            Loading organizations and value objects...
          </div>
        ) : null}

        {!isLoading && organizations.length === 0 ? (
          <div
            style={{
              border: "1px solid #facc15",
              borderRadius: "10px",
              padding: "16px",
              background: "#fefce8",
              marginBottom: "16px",
            }}
          >
            You need to create an organization first.{" "}
            <Link href="/organizations/new">Create organization</Link>
          </div>
        ) : null}

        {organizationIdFromUrl &&
        !selectedOrganization &&
        !isLoadingOrganizations ? (
          <div
            style={{
              border: "1px solid #facc15",
              borderRadius: "10px",
              padding: "16px",
              background: "#fefce8",
              marginBottom: "16px",
            }}
          >
            Organization from URL was not found or access is denied. The first
            available organization was selected instead.
          </div>
        ) : null}

        <form
          onSubmit={handleSubmit}
          style={{
            border: "1px solid #dddddd",
            borderRadius: "12px",
            padding: "20px",
            background: "#f9fafb",
            display: "grid",
            gap: "18px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
          }}
        >
          <section
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              padding: "16px",
              background: "#ffffff",
              display: "grid",
              gap: "16px",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "22px" }}>1. Organization</h2>

            <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
              Organization
              <select
                value={organizationId}
                onChange={(event) => setOrganizationId(event.target.value)}
                required
                disabled={isLoading || organizations.length === 0}
                style={{
                  width: "100%",
                  border: "1px solid #cccccc",
                  borderRadius: "8px",
                  padding: "12px",
                  fontSize: "16px",
                  boxSizing: "border-box",
                  fontWeight: 400,
                }}
              >
                {organizations.length === 0 ? (
                  <option value="">No organizations available</option>
                ) : null}

                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.organization_name} —{" "}
                    {organization.organization_type}
                  </option>
                ))}
              </select>
            </label>

            {selectedOrganization ? (
              <p style={{ margin: 0, color: "#555555" }}>
                Selected organization:{" "}
                <strong>{selectedOrganization.organization_name}</strong>
              </p>
            ) : null}
          </section>

          <section
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              padding: "16px",
              background: "#ffffff",
              display: "grid",
              gap: "16px",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "22px" }}>2. Offer header</h2>

            <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
              Main value object
              <select
                value={valueObjectId}
                onChange={(event) => {
                  setValueObjectId(event.target.value);
                  applyMainValueObjectDefaults(event.target.value);
                }}
                disabled={isLoading || organizationId.trim().length === 0}
                style={{
                  width: "100%",
                  border: "1px solid #cccccc",
                  borderRadius: "8px",
                  padding: "12px",
                  fontSize: "16px",
                  boxSizing: "border-box",
                  fontWeight: 400,
                }}
              >
                <option value="">No main value object selected</option>

                {filteredValueObjects.map((valueObject) => (
                  <option key={valueObject.id} value={valueObject.id}>
                    {valueObject.title} ({valueObject.value_type})
                  </option>
                ))}
              </select>

              <span style={{ fontWeight: 400, color: "#666666" }}>
                Optional. For bundles, this can be empty or one main object.
              </span>
            </label>

            <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
              Offer type
              <select
                value={offerType}
                onChange={(event) => setOfferType(event.target.value)}
                required
                style={{
                  width: "100%",
                  border: "1px solid #cccccc",
                  borderRadius: "8px",
                  padding: "12px",
                  fontSize: "16px",
                  boxSizing: "border-box",
                  fontWeight: 400,
                }}
              >
                <option value="product">Product</option>
                <option value="service">Service</option>
                <option value="consultation">Consultation</option>
                <option value="gift_certificate">Gift certificate</option>
                <option value="discount_certificate">Discount certificate</option>
                <option value="free_trial">Free trial</option>
                <option value="loyalty_reward">Loyalty reward</option>
                <option value="bundle">Bundle</option>
                <option value="subscription">Subscription</option>
                <option value="event">Event</option>
                <option value="bookable_service">Bookable service</option>
              </select>
            </label>

            <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
              Title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Basic service package"
                required
                style={{
                  width: "100%",
                  border: "1px solid #cccccc",
                  borderRadius: "8px",
                  padding: "12px",
                  fontSize: "16px",
                  boxSizing: "border-box",
                  fontWeight: 400,
                }}
              />
            </label>

            <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
              Description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Offer details"
                rows={4}
                style={{
                  width: "100%",
                  border: "1px solid #cccccc",
                  borderRadius: "8px",
                  padding: "12px",
                  fontSize: "16px",
                  boxSizing: "border-box",
                  resize: "vertical",
                  fontWeight: 400,
                }}
              />
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 160px",
                gap: "12px",
              }}
            >
              <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
                Regular price
                <input
                  type="number"
                  step="0.01"
                  value={regularPrice}
                  onChange={(event) => setRegularPrice(event.target.value)}
                  placeholder="299"
                  style={{
                    width: "100%",
                    border: "1px solid #cccccc",
                    borderRadius: "8px",
                    padding: "12px",
                    fontSize: "16px",
                    boxSizing: "border-box",
                    fontWeight: 400,
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
                Current price
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="249"
                  style={{
                    width: "100%",
                    border: "1px solid #cccccc",
                    borderRadius: "8px",
                    padding: "12px",
                    fontSize: "16px",
                    boxSizing: "border-box",
                    fontWeight: 400,
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
                Currency
                <input
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                  placeholder="PLN"
                  style={{
                    width: "100%",
                    border: "1px solid #cccccc",
                    borderRadius: "8px",
                    padding: "12px",
                    fontSize: "16px",
                    boxSizing: "border-box",
                    fontWeight: 400,
                  }}
                />
              </label>
            </div>

            <button
              type="button"
              onClick={useItemsTotalAsOfferPrice}
              style={{
                border: "1px solid #111827",
                borderRadius: "8px",
                padding: "10px 14px",
                background: "#ffffff",
                color: "#111827",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Use items total as offer price ({calculatedItemsTotal.toFixed(2)}{" "}
              {currency})
            </button>
          </section>

          <section
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              padding: "16px",
              background: "#ffffff",
              display: "grid",
              gap: "16px",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "22px" }}>
              3. Discount and legal price info
            </h2>

            <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={isDiscountActive}
                onChange={(event) => {
                  setIsDiscountActive(event.target.checked);
                  if (event.target.checked) {
                    prepareDiscountDates();
                  }
                }}
              />
              Discount active
            </label>

            <p style={{ margin: 0, color: "#555555", lineHeight: "1.5" }}>
              If you show a price reduction in Poland/EU, you should store the
              lowest price from the 30 days before the discount. This field will
              later be displayed near the reduced price.
            </p>

            {isDiscountActive ? (
              <div style={{ display: "grid", gap: "14px" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <label
                    style={{ display: "grid", gap: "8px", fontWeight: 700 }}
                  >
                    Discount type
                    <select
                      value={discountType}
                      onChange={(event) => setDiscountType(event.target.value)}
                      style={{
                        width: "100%",
                        border: "1px solid #cccccc",
                        borderRadius: "8px",
                        padding: "12px",
                        fontSize: "16px",
                        boxSizing: "border-box",
                        fontWeight: 400,
                      }}
                    >
                      <option value="manual_price">Manual reduced price</option>
                      <option value="percent">Percent</option>
                      <option value="fixed_amount">Fixed amount</option>
                    </select>
                  </label>

                  <label
                    style={{ display: "grid", gap: "8px", fontWeight: 700 }}
                  >
                    Discount value
                    <input
                      type="number"
                      step="0.01"
                      value={discountValue}
                      onChange={(event) => setDiscountValue(event.target.value)}
                      placeholder="20"
                      style={{
                        width: "100%",
                        border: "1px solid #cccccc",
                        borderRadius: "8px",
                        padding: "12px",
                        fontSize: "16px",
                        boxSizing: "border-box",
                        fontWeight: 400,
                      }}
                    />
                  </label>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <label
                    style={{ display: "grid", gap: "8px", fontWeight: 700 }}
                  >
                    Discount starts at
                    <input
                      type="date"
                      value={discountStartsAt}
                      onChange={(event) =>
                        setDiscountStartsAt(event.target.value)
                      }
                      style={{
                        width: "100%",
                        border: "1px solid #cccccc",
                        borderRadius: "8px",
                        padding: "12px",
                        fontSize: "16px",
                        boxSizing: "border-box",
                        fontWeight: 400,
                      }}
                    />
                  </label>

                  <label
                    style={{ display: "grid", gap: "8px", fontWeight: 700 }}
                  >
                    Discount ends at
                    <input
                      type="date"
                      value={discountEndsAt}
                      onChange={(event) => setDiscountEndsAt(event.target.value)}
                      style={{
                        width: "100%",
                        border: "1px solid #cccccc",
                        borderRadius: "8px",
                        padding: "12px",
                        fontSize: "16px",
                        boxSizing: "border-box",
                        fontWeight: 400,
                      }}
                    />
                  </label>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 160px",
                    gap: "12px",
                  }}
                >
                  <label
                    style={{ display: "grid", gap: "8px", fontWeight: 700 }}
                  >
                    Lowest price 30 days before discount
                    <input
                      type="number"
                      step="0.01"
                      value={lowestPrice30Days}
                      onChange={(event) =>
                        setLowestPrice30Days(event.target.value)
                      }
                      placeholder="299"
                      required={isDiscountActive}
                      style={{
                        width: "100%",
                        border: "1px solid #cccccc",
                        borderRadius: "8px",
                        padding: "12px",
                        fontSize: "16px",
                        boxSizing: "border-box",
                        fontWeight: 400,
                      }}
                    />
                  </label>

                  <label
                    style={{ display: "grid", gap: "8px", fontWeight: 700 }}
                  >
                    Currency
                    <input
                      value={lowestPrice30DaysCurrency}
                      onChange={(event) =>
                        setLowestPrice30DaysCurrency(event.target.value)
                      }
                      placeholder="PLN"
                      style={{
                        width: "100%",
                        border: "1px solid #cccccc",
                        borderRadius: "8px",
                        padding: "12px",
                        fontSize: "16px",
                        boxSizing: "border-box",
                        fontWeight: 400,
                      }}
                    />
                  </label>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <label
                    style={{ display: "grid", gap: "8px", fontWeight: 700 }}
                  >
                    30-day period start
                    <input
                      type="date"
                      value={lowestPrice30DaysPeriodStart}
                      onChange={(event) =>
                        setLowestPrice30DaysPeriodStart(event.target.value)
                      }
                      style={{
                        width: "100%",
                        border: "1px solid #cccccc",
                        borderRadius: "8px",
                        padding: "12px",
                        fontSize: "16px",
                        boxSizing: "border-box",
                        fontWeight: 400,
                      }}
                    />
                  </label>

                  <label
                    style={{ display: "grid", gap: "8px", fontWeight: 700 }}
                  >
                    30-day period end
                    <input
                      type="date"
                      value={lowestPrice30DaysPeriodEnd}
                      onChange={(event) =>
                        setLowestPrice30DaysPeriodEnd(event.target.value)
                      }
                      style={{
                        width: "100%",
                        border: "1px solid #cccccc",
                        borderRadius: "8px",
                        padding: "12px",
                        fontSize: "16px",
                        boxSizing: "border-box",
                        fontWeight: 400,
                      }}
                    />
                  </label>
                </div>

                <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
                  Discount legal note
                  <textarea
                    value={discountLegalNote}
                    onChange={(event) => setDiscountLegalNote(event.target.value)}
                    placeholder="Lowest price in 30 days before discount: 299 PLN."
                    rows={3}
                    style={{
                      width: "100%",
                      border: "1px solid #cccccc",
                      borderRadius: "8px",
                      padding: "12px",
                      fontSize: "16px",
                      boxSizing: "border-box",
                      resize: "vertical",
                      fontWeight: 400,
                    }}
                  />
                </label>
              </div>
            ) : null}
          </section>

          <section
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              padding: "16px",
              background: "#ffffff",
              display: "grid",
              gap: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                alignItems: "center",
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: "22px" }}>4. Offer items</h2>
                <p style={{ margin: "6px 0 0", color: "#666666" }}>
                  Add one or more value objects with quantity and unit price.
                </p>
              </div>

              <button
                type="button"
                onClick={addOfferItem}
                disabled={filteredValueObjects.length === 0}
                style={{
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  background:
                    filteredValueObjects.length === 0 ? "#9ca3af" : "#111827",
                  color: "#ffffff",
                  fontWeight: 700,
                  cursor:
                    filteredValueObjects.length === 0
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                Add item
              </button>
            </div>

            {organizationId && filteredValueObjects.length === 0 ? (
              <div
                style={{
                  border: "1px solid #facc15",
                  borderRadius: "10px",
                  padding: "14px",
                  background: "#fefce8",
                }}
              >
                No value objects connected to this organization yet.{" "}
                <Link
                  href={`/value-objects/new?organizationId=${encodeURIComponent(
                    organizationId
                  )}`}
                >
                  Create value object
                </Link>
              </div>
            ) : null}

            {offerItems.map((item, index) => {
              const selectedValueObject = findValueObject(item.valueObjectId);
              const quantity = Number(item.quantity);
              const unitPrice = Number(item.unitPrice);
              const lineTotal =
                Number.isNaN(quantity) || Number.isNaN(unitPrice)
                  ? 0
                  : quantity * unitPrice;

              return (
                <div
                  key={item.localId}
                  style={{
                    border: "1px solid #dddddd",
                    borderRadius: "10px",
                    padding: "14px",
                    background: "#f9fafb",
                    display: "grid",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "12px",
                      alignItems: "center",
                    }}
                  >
                    <strong>Item {index + 1}</strong>

                    <button
                      type="button"
                      onClick={() => removeOfferItem(item.localId)}
                      disabled={offerItems.length <= 1}
                      style={{
                        border: "1px solid #dc2626",
                        borderRadius: "8px",
                        padding: "6px 10px",
                        background: "#ffffff",
                        color:
                          offerItems.length <= 1 ? "#9ca3af" : "#dc2626",
                        cursor:
                          offerItems.length <= 1 ? "not-allowed" : "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </div>

                  <label
                    style={{ display: "grid", gap: "8px", fontWeight: 700 }}
                  >
                    Value object
                    <select
                      value={item.valueObjectId}
                      onChange={(event) =>
                        handleOfferItemValueObjectChange(
                          item.localId,
                          event.target.value
                        )
                      }
                      style={{
                        width: "100%",
                        border: "1px solid #cccccc",
                        borderRadius: "8px",
                        padding: "12px",
                        fontSize: "16px",
                        boxSizing: "border-box",
                        fontWeight: 400,
                      }}
                    >
                      <option value="">Select value object</option>

                      {filteredValueObjects.map((valueObject) => (
                        <option key={valueObject.id} value={valueObject.id}>
                          {valueObject.title} ({valueObject.value_type})
                        </option>
                      ))}
                    </select>
                  </label>

                  {selectedValueObject ? (
                    <p style={{ margin: 0, color: "#666666" }}>
                      Selected: {selectedValueObject.title} /{" "}
                      {selectedValueObject.value_type}
                    </p>
                  ) : null}

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 120px",
                      gap: "12px",
                    }}
                  >
                    <label
                      style={{ display: "grid", gap: "8px", fontWeight: 700 }}
                    >
                      Quantity
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.quantity}
                        onChange={(event) =>
                          updateOfferItem(item.localId, {
                            quantity: event.target.value,
                          })
                        }
                        style={{
                          width: "100%",
                          border: "1px solid #cccccc",
                          borderRadius: "8px",
                          padding: "12px",
                          fontSize: "16px",
                          boxSizing: "border-box",
                          fontWeight: 400,
                        }}
                      />
                    </label>

                    <label
                      style={{ display: "grid", gap: "8px", fontWeight: 700 }}
                    >
                      Unit price
                      <input
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(event) =>
                          updateOfferItem(item.localId, {
                            unitPrice: event.target.value,
                          })
                        }
                        style={{
                          width: "100%",
                          border: "1px solid #cccccc",
                          borderRadius: "8px",
                          padding: "12px",
                          fontSize: "16px",
                          boxSizing: "border-box",
                          fontWeight: 400,
                        }}
                      />
                    </label>

                    <label
                      style={{ display: "grid", gap: "8px", fontWeight: 700 }}
                    >
                      Currency
                      <input
                        value={item.currency}
                        onChange={(event) =>
                          updateOfferItem(item.localId, {
                            currency: event.target.value,
                          })
                        }
                        style={{
                          width: "100%",
                          border: "1px solid #cccccc",
                          borderRadius: "8px",
                          padding: "12px",
                          fontSize: "16px",
                          boxSizing: "border-box",
                          fontWeight: 400,
                        }}
                      />
                    </label>
                  </div>

                  <label
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={item.isRequired}
                      onChange={(event) =>
                        updateOfferItem(item.localId, {
                          isRequired: event.target.checked,
                        })
                      }
                    />
                    Required item
                  </label>

                  <p style={{ margin: 0, fontWeight: 700 }}>
                    Line total: {lineTotal.toFixed(2)}{" "}
                    {item.currency || currency}
                  </p>
                </div>
              );
            })}
          </section>

          <section
            style={{
              border: "1px solid #bfdbfe",
              borderRadius: "10px",
              padding: "16px",
              background: "#eff6ff",
              display: "grid",
              gap: "16px",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "22px" }}>
              5. Certificate / reward rules
            </h2>

            <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={certificateAvailable}
                onChange={(event) =>
                  setCertificateAvailable(event.target.checked)
                }
              />
              Certificate / reward available
            </label>

            {certificateAvailable ? (
              <>
                <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
                  Certificate payment mode
                  <select
                    value={certificatePaymentMode}
                    onChange={(event) => {
                      const nextMode = event.target.value;
                      setCertificatePaymentMode(nextMode);

                      if (nextMode === "points_only" && price) {
                        setCertificatePointsCoveredAmount(price);
                      }

                      if (nextMode === "money_only") {
                        setCertificatePointsCoveredAmount("0");
                      }
                    }}
                    style={{
                      width: "100%",
                      border: "1px solid #cccccc",
                      borderRadius: "8px",
                      padding: "12px",
                      fontSize: "16px",
                      boxSizing: "border-box",
                      fontWeight: 400,
                    }}
                  >
                    <option value="money_only">Money only</option>
                    <option value="points_only">Points only</option>
                    <option value="mixed">Mixed: money + points</option>
                  </select>
                </label>

                <div
                  style={{
                    border: "1px solid #bfdbfe",
                    borderRadius: "10px",
                    padding: "14px",
                    background: "#ffffff",
                    display: "grid",
                    gap: "12px",
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "18px" }}>
                    Points calculation
                  </h3>

                  <p style={{ margin: 0, color: "#374151", lineHeight: "1.5" }}>
                    Продавец указывает, какую сумму в валюте offer он готов
                    покрыть points. Система рассчитывает, сколько POINT будет
                    списано с покупателя. По умолчанию:{" "}
                    <strong>
                      1 {pointsCurrencyCode || "POINT"} ={" "}
                      {referenceValuePerPoint || "1"}{" "}
                      {referenceCurrency || "EUR"}
                    </strong>
                    .
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "12px",
                    }}
                  >
                    <label
                      style={{ display: "grid", gap: "8px", fontWeight: 700 }}
                    >
                      Amount covered by points ({certificateCurrency || currency})
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={certificatePointsCoveredAmount}
                        disabled={certificatePaymentMode === "money_only"}
                        onChange={(event) =>
                          setCertificatePointsCoveredAmount(event.target.value)
                        }
                        placeholder={
                          certificatePaymentMode === "points_only"
                            ? "Full offer price"
                            : "For example: 40"
                        }
                        style={{
                          width: "100%",
                          border: "1px solid #cccccc",
                          borderRadius: "8px",
                          padding: "12px",
                          fontSize: "16px",
                          boxSizing: "border-box",
                          fontWeight: 400,
                          background:
                            certificatePaymentMode === "money_only"
                              ? "#f3f4f6"
                              : "#ffffff",
                        }}
                      />
                    </label>

                    <label
                      style={{ display: "grid", gap: "8px", fontWeight: 700 }}
                    >
                      Certificate currency
                      <input
                        value={certificateCurrency}
                        onChange={(event) =>
                          setCertificateCurrency(event.target.value)
                        }
                        placeholder="PLN"
                        style={{
                          width: "100%",
                          border: "1px solid #cccccc",
                          borderRadius: "8px",
                          padding: "12px",
                          fontSize: "16px",
                          boxSizing: "border-box",
                          fontWeight: 400,
                        }}
                      />
                    </label>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "12px",
                    }}
                  >
                    <label
                      style={{ display: "grid", gap: "8px", fontWeight: 700 }}
                    >
                      Points currency
                      <input
                        value={pointsCurrencyCode}
                        onChange={(event) =>
                          setPointsCurrencyCode(event.target.value)
                        }
                        placeholder="POINT"
                        style={{
                          width: "100%",
                          border: "1px solid #cccccc",
                          borderRadius: "8px",
                          padding: "12px",
                          fontSize: "16px",
                          boxSizing: "border-box",
                          fontWeight: 400,
                        }}
                      />
                    </label>

                    <label
                      style={{ display: "grid", gap: "8px", fontWeight: 700 }}
                    >
                      Reference currency
                      <input
                        value={referenceCurrency}
                        onChange={(event) =>
                          setReferenceCurrency(event.target.value)
                        }
                        placeholder="EUR"
                        style={{
                          width: "100%",
                          border: "1px solid #cccccc",
                          borderRadius: "8px",
                          padding: "12px",
                          fontSize: "16px",
                          boxSizing: "border-box",
                          fontWeight: 400,
                        }}
                      />
                    </label>

                    <label
                      style={{ display: "grid", gap: "8px", fontWeight: 700 }}
                    >
                      Value per point
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={referenceValuePerPoint}
                        onChange={(event) =>
                          setReferenceValuePerPoint(event.target.value)
                        }
                        placeholder="1"
                        style={{
                          width: "100%",
                          border: "1px solid #cccccc",
                          borderRadius: "8px",
                          padding: "12px",
                          fontSize: "16px",
                          boxSizing: "border-box",
                          fontWeight: 400,
                        }}
                      />
                    </label>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "12px",
                    }}
                  >
                    <label
                      style={{ display: "grid", gap: "8px", fontWeight: 700 }}
                    >
                      Exchange rate
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        value={referenceExchangeRate}
                        onChange={(event) =>
                          setReferenceExchangeRate(event.target.value)
                        }
                        placeholder="4.30"
                        style={{
                          width: "100%",
                          border: "1px solid #cccccc",
                          borderRadius: "8px",
                          padding: "12px",
                          fontSize: "16px",
                          boxSizing: "border-box",
                          fontWeight: 400,
                        }}
                      />
                    </label>

                    <label
                      style={{ display: "grid", gap: "8px", fontWeight: 700 }}
                    >
                      Rate source
                      <input
                        value={referenceExchangeRateSource}
                        onChange={(event) =>
                          setReferenceExchangeRateSource(event.target.value)
                        }
                        placeholder="manual"
                        style={{
                          width: "100%",
                          border: "1px solid #cccccc",
                          borderRadius: "8px",
                          padding: "12px",
                          fontSize: "16px",
                          boxSizing: "border-box",
                          fontWeight: 400,
                        }}
                      />
                    </label>

                    <label
                      style={{ display: "grid", gap: "8px", fontWeight: 700 }}
                    >
                      Rate date
                      <input
                        type="date"
                        value={referenceExchangeRateDate}
                        onChange={(event) =>
                          setReferenceExchangeRateDate(event.target.value)
                        }
                        style={{
                          width: "100%",
                          border: "1px solid #cccccc",
                          borderRadius: "8px",
                          padding: "12px",
                          fontSize: "16px",
                          boxSizing: "border-box",
                          fontWeight: 400,
                        }}
                      />
                    </label>
                  </div>

                  <div
                    style={{
                      border: certificatePricingPreview.warning
                        ? "1px solid #f0d28a"
                        : "1px solid #bfe5c8",
                      borderRadius: "10px",
                      padding: "14px",
                      background: certificatePricingPreview.warning
                        ? "#fff8e6"
                        : "#edf8f0",
                      color: certificatePricingPreview.warning
                        ? "#7a4b00"
                        : "#176b2c",
                      display: "grid",
                      gap: "6px",
                      lineHeight: "1.5",
                    }}
                  >
                    <strong>Calculation preview</strong>

                    {certificatePricingPreview.warning ? (
                      <span>{certificatePricingPreview.warning}</span>
                    ) : (
                      <>
                        <span>
                          Offer price: <strong>{price || "0"} {currency}</strong>
                        </span>
                        <span>
                          Covered by points:{" "}
                          <strong>
                            {certificatePricingPreview.coveredAmount.toFixed(2)}{" "}
                            {certificateCurrency || currency}
                          </strong>
                        </span>
                        <span>
                          Reference:{" "}
                          <strong>
                            1 {pointsCurrencyCode || "POINT"} ={" "}
                            {referenceValuePerPoint || "1"}{" "}
                            {referenceCurrency || "EUR"}
                          </strong>
                        </span>
                        <span>
                          Exchange rate:{" "}
                          <strong>
                            1 {referenceCurrency || "EUR"} ={" "}
                            {referenceExchangeRate || "0"}{" "}
                            {certificateCurrency || currency}
                          </strong>
                        </span>
                        <span>
                          Buyer will be charged:{" "}
                          <strong>
                            {certificatePricingPreview.calculatedPointsPrice.toFixed(
                              2
                            )}{" "}
                            {pointsCurrencyCode || "POINT"}
                          </strong>
                        </span>
                        <span>
                          Buyer money payment:{" "}
                          <strong>
                            {certificatePricingPreview.moneyToPay.toFixed(2)}{" "}
                            {certificateCurrency || currency}
                          </strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
                  Certificate terms
                  <textarea
                    value={certificateTerms}
                    onChange={(event) => setCertificateTerms(event.target.value)}
                    placeholder="Certificate can be used once within 180 days. Booking required."
                    rows={4}
                    style={{
                      width: "100%",
                      border: "1px solid #cccccc",
                      borderRadius: "8px",
                      padding: "12px",
                      fontSize: "16px",
                      boxSizing: "border-box",
                      resize: "vertical",
                      fontWeight: 400,
                    }}
                  />
                </label>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <label
                    style={{ display: "grid", gap: "8px", fontWeight: 700 }}
                  >
                    Validity days
                    <input
                      type="number"
                      value={certificateValidityDays}
                      onChange={(event) =>
                        setCertificateValidityDays(event.target.value)
                      }
                      placeholder="180"
                      style={{
                        width: "100%",
                        border: "1px solid #cccccc",
                        borderRadius: "8px",
                        padding: "12px",
                        fontSize: "16px",
                        boxSizing: "border-box",
                        fontWeight: 400,
                      }}
                    />
                  </label>

                  <label
                    style={{ display: "grid", gap: "8px", fontWeight: 700 }}
                  >
                    Max certificates total
                    <input
                      type="number"
                      value={maxCertificatesTotal}
                      onChange={(event) =>
                        setMaxCertificatesTotal(event.target.value)
                      }
                      placeholder="Optional"
                      style={{
                        width: "100%",
                        border: "1px solid #cccccc",
                        borderRadius: "8px",
                        padding: "12px",
                        fontSize: "16px",
                        boxSizing: "border-box",
                        fontWeight: 400,
                      }}
                    />
                  </label>

                  <label
                    style={{ display: "grid", gap: "8px", fontWeight: 700 }}
                  >
                    Max per user
                    <input
                      type="number"
                      value={maxCertificatesPerUser}
                      onChange={(event) =>
                        setMaxCertificatesPerUser(event.target.value)
                      }
                      placeholder="Optional"
                      style={{
                        width: "100%",
                        border: "1px solid #cccccc",
                        borderRadius: "8px",
                        padding: "12px",
                        fontSize: "16px",
                        boxSizing: "border-box",
                        fontWeight: 400,
                      }}
                    />
                  </label>
                </div>

                <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
                  Points refund policy
                  <select
                    value={pointsRefundPolicy}
                    onChange={(event) => setPointsRefundPolicy(event.target.value)}
                    style={{
                      width: "100%",
                      border: "1px solid #cccccc",
                      borderRadius: "8px",
                      padding: "12px",
                      fontSize: "16px",
                      boxSizing: "border-box",
                      fontWeight: 400,
                    }}
                  >
                    <option value="no_refund">No refund</option>
                    <option value="refund_until_seller_confirmation">
                      Refund until seller confirmation
                    </option>
                    <option value="refund_until_delivery">
                      Refund until delivery
                    </option>
                    <option value="manual_review">Manual review</option>
                  </select>
                </label>

                <div style={{ display: "grid", gap: "10px" }}>
                  <label
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={requiresSellerConfirmation}
                      onChange={(event) =>
                        setRequiresSellerConfirmation(event.target.checked)
                      }
                    />
                    Requires seller confirmation
                  </label>

                  <label
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isTransferable}
                      onChange={(event) =>
                        setIsTransferable(event.target.checked)
                      }
                    />
                    Transferable to another receiver
                  </label>

                  <label
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isCancellable}
                      onChange={(event) =>
                        setIsCancellable(event.target.checked)
                      }
                    />
                    Cancellable
                  </label>

                  <label
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isPublicReward}
                      onChange={(event) =>
                        setIsPublicReward(event.target.checked)
                      }
                    />
                    Show in public reward / certificate catalog
                  </label>
                </div>
              </>
            ) : null}
          </section>

          <section
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              padding: "16px",
              background: "#ffffff",
              display: "grid",
              gap: "16px",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "22px" }}>
              6. Booking and options
            </h2>

            <div style={{ display: "grid", gap: "10px" }}>
              <label
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                <input
                  type="checkbox"
                  checked={isPaid}
                  onChange={(event) => setIsPaid(event.target.checked)}
                />
                Paid
              </label>

              <label
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                <input
                  type="checkbox"
                  checked={isFree}
                  onChange={(event) => setIsFree(event.target.checked)}
                />
                Free
              </label>

              <label
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                <input
                  type="checkbox"
                  checked={requiresBooking}
                  onChange={(event) => setRequiresBooking(event.target.checked)}
                />
                Requires booking
              </label>
            </div>

            <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
              Booking mode
              <select
                value={bookingMode}
                onChange={(event) => setBookingMode(event.target.value)}
                required
                style={{
                  width: "100%",
                  border: "1px solid #cccccc",
                  borderRadius: "8px",
                  padding: "12px",
                  fontSize: "16px",
                  boxSizing: "border-box",
                  fontWeight: 400,
                }}
              >
                <option value="not_required">Not required</option>
                <option value="fixed_slots">Fixed slots</option>
                <option value="request_confirmation">Request confirmation</option>
                <option value="auto_confirm">Auto confirm</option>
                <option value="manual_confirm">Manual confirm</option>
              </select>
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "12px",
              }}
            >
              <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
                Default duration minutes
                <input
                  type="number"
                  value={defaultDurationMinutes}
                  onChange={(event) =>
                    setDefaultDurationMinutes(event.target.value)
                  }
                  placeholder="20"
                  style={{
                    width: "100%",
                    border: "1px solid #cccccc",
                    borderRadius: "8px",
                    padding: "12px",
                    fontSize: "16px",
                    boxSizing: "border-box",
                    fontWeight: 400,
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
                Min duration minutes
                <input
                  type="number"
                  value={minDurationMinutes}
                  onChange={(event) => setMinDurationMinutes(event.target.value)}
                  placeholder="20"
                  style={{
                    width: "100%",
                    border: "1px solid #cccccc",
                    borderRadius: "8px",
                    padding: "12px",
                    fontSize: "16px",
                    boxSizing: "border-box",
                    fontWeight: 400,
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
                Max duration minutes
                <input
                  type="number"
                  value={maxDurationMinutes}
                  onChange={(event) => setMaxDurationMinutes(event.target.value)}
                  placeholder="20"
                  style={{
                    width: "100%",
                    border: "1px solid #cccccc",
                    borderRadius: "8px",
                    padding: "12px",
                    fontSize: "16px",
                    boxSizing: "border-box",
                    fontWeight: 400,
                  }}
                />
              </label>
            </div>

            <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
              Quantity limit
              <input
                type="number"
                value={quantityLimit}
                onChange={(event) => setQuantityLimit(event.target.value)}
                placeholder="Optional"
                style={{
                  width: "100%",
                  border: "1px solid #cccccc",
                  borderRadius: "8px",
                  padding: "12px",
                  fontSize: "16px",
                  boxSizing: "border-box",
                  fontWeight: 400,
                }}
              />
            </label>

            <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
              Target receiver type
              <input
                value={targetReceiverType}
                onChange={(event) => setTargetReceiverType(event.target.value)}
                placeholder="person, business, family"
                style={{
                  width: "100%",
                  border: "1px solid #cccccc",
                  borderRadius: "8px",
                  padding: "12px",
                  fontSize: "16px",
                  boxSizing: "border-box",
                  fontWeight: 400,
                }}
              />
            </label>
          </section>

          <button
            type="submit"
            disabled={isSubmitDisabled}
            style={{
              width: "100%",
              border: "none",
              borderRadius: "8px",
              padding: "16px 18px",
              background: isSubmitDisabled ? "#9ca3af" : "#111827",
              color: "#ffffff",
              fontSize: "17px",
              fontWeight: 700,
              cursor: isSubmitDisabled ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting ? "Creating..." : "Create offer"}
          </button>
        </form>

        {message ? (
          <div
            style={{
              marginTop: "16px",
              border: "1px solid #bfdbfe",
              borderRadius: "10px",
              padding: "14px",
              background: "#eff6ff",
            }}
          >
            {message}
          </div>
        ) : null}
      </div>
    </main>
  );
}
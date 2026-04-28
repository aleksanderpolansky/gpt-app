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

export default function NewOfferPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [valueObjects, setValueObjects] = useState<ValueObject[]>([]);

  const [organizationId, setOrganizationId] = useState("");
  const [valueObjectId, setValueObjectId] = useState("");

  const [offerItems, setOfferItems] = useState<OfferItemForm[]>([
    createEmptyOfferItem("PLN"),
  ]);

  const [offerType, setOfferType] = useState("bundle");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("PLN");
  const [isPaid, setIsPaid] = useState(true);
  const [isFree, setIsFree] = useState(false);
  const [certificateAvailable, setCertificateAvailable] = useState(true);
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

  async function loadOrganizations() {
    setIsLoadingOrganizations(true);

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

      const loadedOrganizations = data.organizations ?? [];
      setOrganizations(loadedOrganizations);

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
      setPrice(String(selectedValueObject.default_price));
    }

    if (selectedValueObject.default_currency) {
      setCurrency(selectedValueObject.default_currency);
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
      setPrice(String(calculatedItemsTotal));
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
          currency,
          isPaid,
          isFree,
          certificateAvailable,
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
      setCurrency("PLN");
      setIsPaid(true);
      setIsFree(false);
      setCertificateAvailable(true);
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
          maxWidth: "900px",
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
              maxWidth: "760px",
              margin: "0 auto 20px",
              color: "#555555",
              fontSize: "16px",
              lineHeight: "1.5",
            }}
          >
            Create a commercial offer connected to one organization. It can
            contain one or many value objects with quantities and prices.
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
            <Link
              href="/"
              style={{
                color: "#2563eb",
                textDecoration: "underline",
                fontSize: "16px",
              }}
            >
              На главную
            </Link>

            <Link
              href="/organizations"
              style={{
                color: "#2563eb",
                textDecoration: "underline",
                fontSize: "16px",
              }}
            >
              Мои организации
            </Link>

            <Link
              href="/offers"
              style={{
                color: "#2563eb",
                textDecoration: "underline",
                fontSize: "16px",
              }}
            >
              Offers
            </Link>

            <Link
              href="/value-objects"
              style={{
                color: "#2563eb",
                textDecoration: "underline",
                fontSize: "16px",
              }}
            >
              Value objects
            </Link>
          </nav>
        </header>

        {isLoading && (
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
        )}

        {!isLoading && organizations.length === 0 && (
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
        )}

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
                {organizations.length === 0 && (
                  <option value="">No organizations available</option>
                )}

                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.organization_name} —{" "}
                    {organization.organization_type}
                  </option>
                ))}
              </select>
            </label>

            {selectedOrganization && (
              <p style={{ margin: 0, color: "#555555" }}>
                Selected organization:{" "}
                <strong>{selectedOrganization.organization_name}</strong>
              </p>
            )}
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
              2. Offer header
            </h2>

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
                gridTemplateColumns: "1fr 160px",
                gap: "12px",
              }}
            >
              <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
                Offer price
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                alignItems: "center",
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: "22px" }}>
                  3. Offer items
                </h2>
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

            {organizationId && filteredValueObjects.length === 0 && (
              <div
                style={{
                  border: "1px solid #facc15",
                  borderRadius: "10px",
                  padding: "14px",
                  background: "#fefce8",
                }}
              >
                No value objects connected to this organization yet.{" "}
                <Link href="/value-objects/new">Create value object</Link>
              </div>
            )}

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

                  {selectedValueObject && (
                    <p style={{ margin: 0, color: "#666666" }}>
                      Selected: {selectedValueObject.title} /{" "}
                      {selectedValueObject.value_type}
                    </p>
                  )}

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
                    Line total: {lineTotal.toFixed(2)} {item.currency || currency}
                  </p>
                </div>
              );
            })}
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
              4. Booking and options
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
                  checked={certificateAvailable}
                  onChange={(event) =>
                    setCertificateAvailable(event.target.checked)
                  }
                />
                Certificate available
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

        {message && (
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
        )}
      </div>
    </main>
  );
}
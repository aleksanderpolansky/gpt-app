"use client";

import { useEffect, useState } from "react";

type ValueObject = {
  id: string;
  title: string;
  value_type: string;
  default_price: number | null;
  default_currency: string | null;
  default_duration_minutes: number | null;
};

export default function NewOfferPage() {
  const [valueObjects, setValueObjects] = useState<ValueObject[]>([]);

  const [valueObjectId, setValueObjectId] = useState("");
  const [offerType, setOfferType] = useState("bookable_service");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("PLN");
  const [isPaid, setIsPaid] = useState(true);
  const [isFree, setIsFree] = useState(false);
  const [certificateAvailable, setCertificateAvailable] = useState(true);
  const [requiresBooking, setRequiresBooking] = useState(true);
  const [bookingMode, setBookingMode] = useState("manual_confirm");
  const [defaultDurationMinutes, setDefaultDurationMinutes] = useState("");
  const [minDurationMinutes, setMinDurationMinutes] = useState("");
  const [maxDurationMinutes, setMaxDurationMinutes] = useState("");
  const [quantityLimit, setQuantityLimit] = useState("");
  const [targetReceiverType, setTargetReceiverType] = useState("person");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadValueObjects() {
      const response = await fetch("/api/value-objects");
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Failed to load value objects");
        return;
      }

      setValueObjects(data.valueObjects ?? []);
    }

    loadValueObjects();
  }, []);

  function applyValueObjectDefaults(selectedId: string) {
    const selectedValueObject = valueObjects.find(
      (valueObject) => valueObject.id === selectedId
    );

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setIsSubmitting(true);

    const response = await fetch("/api/offers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
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
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Failed to create offer");
      setIsSubmitting(false);
      return;
    }

    setMessage("Offer created successfully");

    setValueObjectId("");
    setOfferType("bookable_service");
    setTitle("");
    setDescription("");
    setPrice("");
    setCurrency("PLN");
    setIsPaid(true);
    setIsFree(false);
    setCertificateAvailable(true);
    setRequiresBooking(true);
    setBookingMode("manual_confirm");
    setDefaultDurationMinutes("");
    setMinDurationMinutes("");
    setMaxDurationMinutes("");
    setQuantityLimit("");
    setTargetReceiverType("person");
    setIsSubmitting(false);
  }

  return (
    <main style={{ padding: "32px", maxWidth: "720px" }}>
      <h1>Create offer</h1>

      <p>
        This page creates a marketplace offer connected to a value object.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
        <label>
          Value object
          <select
            value={valueObjectId}
            onChange={(event) => {
              setValueObjectId(event.target.value);
              applyValueObjectDefaults(event.target.value);
            }}
            style={{ display: "block", width: "100%", padding: "8px" }}
          >
            <option value="">No value object selected</option>
            {valueObjects.map((valueObject) => (
              <option key={valueObject.id} value={valueObject.id}>
                {valueObject.title} ({valueObject.value_type})
              </option>
            ))}
          </select>
        </label>

        <label>
          Offer type
          <select
            value={offerType}
            onChange={(event) => setOfferType(event.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
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

        <label>
          Title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="20-minute calf massage"
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Offer details"
            rows={4}
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          Price
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="60"
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          Currency
          <input
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            placeholder="PLN"
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          <input
            type="checkbox"
            checked={isPaid}
            onChange={(event) => setIsPaid(event.target.checked)}
          />{" "}
          Paid
        </label>

        <label>
          <input
            type="checkbox"
            checked={isFree}
            onChange={(event) => setIsFree(event.target.checked)}
          />{" "}
          Free
        </label>

        <label>
          <input
            type="checkbox"
            checked={certificateAvailable}
            onChange={(event) => setCertificateAvailable(event.target.checked)}
          />{" "}
          Certificate available
        </label>

        <label>
          <input
            type="checkbox"
            checked={requiresBooking}
            onChange={(event) => setRequiresBooking(event.target.checked)}
          />{" "}
          Requires booking
        </label>

        <label>
          Booking mode
          <select
            value={bookingMode}
            onChange={(event) => setBookingMode(event.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          >
            <option value="not_required">Not required</option>
            <option value="fixed_slots">Fixed slots</option>
            <option value="request_confirmation">Request confirmation</option>
            <option value="auto_confirm">Auto confirm</option>
            <option value="manual_confirm">Manual confirm</option>
          </select>
        </label>

        <label>
          Default duration minutes
          <input
            type="number"
            value={defaultDurationMinutes}
            onChange={(event) => setDefaultDurationMinutes(event.target.value)}
            placeholder="20"
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          Min duration minutes
          <input
            type="number"
            value={minDurationMinutes}
            onChange={(event) => setMinDurationMinutes(event.target.value)}
            placeholder="20"
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          Max duration minutes
          <input
            type="number"
            value={maxDurationMinutes}
            onChange={(event) => setMaxDurationMinutes(event.target.value)}
            placeholder="20"
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          Quantity limit
          <input
            type="number"
            value={quantityLimit}
            onChange={(event) => setQuantityLimit(event.target.value)}
            placeholder="Optional"
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          Target receiver type
          <input
            value={targetReceiverType}
            onChange={(event) => setTargetReceiverType(event.target.value)}
            placeholder="person, business, family"
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{ padding: "10px 16px", cursor: "pointer" }}
        >
          {isSubmitting ? "Creating..." : "Create offer"}
        </button>
      </form>

      {message && <p style={{ marginTop: "16px" }}>{message}</p>}
    </main>
  );
}
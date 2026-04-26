"use client";

import { useState } from "react";

export default function NewValueObjectPage() {
  const [valueType, setValueType] = useState("service");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [unitType, setUnitType] = useState("service_session");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("PLN");
  const [defaultDurationMinutes, setDefaultDurationMinutes] = useState("");
  const [isMarketplaceSellable, setIsMarketplaceSellable] = useState(true);
  const [isFreePossible, setIsFreePossible] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setIsSubmitting(true);

    const response = await fetch("/api/value-objects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        valueType,
        title,
        description,
        unitType,
        defaultPrice,
        defaultCurrency,
        defaultDurationMinutes,
        isMarketplaceSellable,
        isFreePossible,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Failed to create value object");
      setIsSubmitting(false);
      return;
    }

    setMessage("Value object created successfully");

    setValueType("service");
    setTitle("");
    setDescription("");
    setUnitType("service_session");
    setDefaultPrice("");
    setDefaultCurrency("PLN");
    setDefaultDurationMinutes("");
    setIsMarketplaceSellable(true);
    setIsFreePossible(false);
    setIsSubmitting(false);
  }

  return (
    <main style={{ padding: "32px", maxWidth: "720px" }}>
      <h1>Create value object</h1>

      <p>
        This page creates a reusable value object: product, service,
        consultation, certificate, access, content, or other value.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
        <label>
          Value type
          <select
            value={valueType}
            onChange={(event) => setValueType(event.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          >
            <option value="product">Product</option>
            <option value="service">Service</option>
            <option value="labor">Labor</option>
            <option value="salary">Salary</option>
            <option value="care">Care</option>
            <option value="knowledge">Knowledge</option>
            <option value="consultation">Consultation</option>
            <option value="money">Money</option>
            <option value="certificate">Certificate</option>
            <option value="discount">Discount</option>
            <option value="gift">Gift</option>
            <option value="meal">Meal</option>
            <option value="escort">Escort</option>
            <option value="content">Content</option>
            <option value="access">Access</option>
            <option value="booking_slot">Booking slot</option>
          </select>
        </label>

        <label>
          Title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Calf massage, German consultation, Coffee package"
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What this value object is"
            rows={4}
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          Unit type
          <input
            value={unitType}
            onChange={(event) => setUnitType(event.target.value)}
            placeholder="piece, hour, session, kg, month"
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          Default price
          <input
            type="number"
            step="0.01"
            value={defaultPrice}
            onChange={(event) => setDefaultPrice(event.target.value)}
            placeholder="60"
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          Default currency
          <input
            value={defaultCurrency}
            onChange={(event) => setDefaultCurrency(event.target.value)}
            placeholder="PLN"
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
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
          <input
            type="checkbox"
            checked={isMarketplaceSellable}
            onChange={(event) => setIsMarketplaceSellable(event.target.checked)}
          />{" "}
          Marketplace sellable
        </label>

        <label>
          <input
            type="checkbox"
            checked={isFreePossible}
            onChange={(event) => setIsFreePossible(event.target.checked)}
          />{" "}
          Free possible
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{ padding: "10px 16px", cursor: "pointer" }}
        >
          {isSubmitting ? "Creating..." : "Create value object"}
        </button>
      </form>

      {message && <p style={{ marginTop: "16px" }}>{message}</p>}
    </main>
  );
}
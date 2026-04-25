"use client";

import { useState } from "react";

export default function NewLocationPage() {
  const [title, setTitle] = useState("");
  const [locationType, setLocationType] = useState("home");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setIsSubmitting(true);

    const response = await fetch("/api/locations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        locationType,
        address,
        city,
        country,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Failed to create location");
      setIsSubmitting(false);
      return;
    }

    setMessage("Location created successfully");

    setTitle("");
    setLocationType("home");
    setAddress("");
    setCity("");
    setCountry("");
    setIsSubmitting(false);
  }

  return (
    <main style={{ padding: "32px", maxWidth: "720px" }}>
      <h1>Create location</h1>

      <p>
        This page creates a location owned by your personal actor.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
        <label>
          Title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Home, Opera, CSP office, Client office"
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          Location type
          <select
            value={locationType}
            onChange={(event) => setLocationType(event.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          >
            <option value="home">Home</option>
            <option value="workplace">Workplace</option>
            <option value="business">Business</option>
            <option value="client_place">Client place</option>
            <option value="service_place">Service place</option>
            <option value="public_place">Public place</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label>
          Address
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Street, building, office"
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          City
          <input
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Szczecin"
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          Country
          <input
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            placeholder="Poland"
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{ padding: "10px 16px", cursor: "pointer" }}
        >
          {isSubmitting ? "Creating..." : "Create location"}
        </button>
      </form>

      {message && (
        <p style={{ marginTop: "16px" }}>
          {message}
        </p>
      )}
    </main>
  );
}
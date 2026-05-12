"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type OrganizationLocationEditFormProps = {
  organizationId: string;
  initialCountryCode: string | null;
  initialCity: string | null;
  initialDistrict: string | null;
  initialAddressVisibility: string | null;
  initialLatitude: number | null;
  initialLongitude: number | null;
};

type SubmitState = {
  isSubmitting: boolean;
  message: string | null;
  error: string | null;
};

const INITIAL_SUBMIT_STATE: SubmitState = {
  isSubmitting: false,
  message: null,
  error: null,
};

const ADDRESS_VISIBILITY_OPTIONS = [
  {
    value: "public",
    label: "Public address",
  },
  {
    value: "approximate",
    label: "Approximate location",
  },
  {
    value: "hidden",
    label: "Hidden address",
  },
];

function normalizeInitialText(value: string | null) {
  return value ?? "";
}

function normalizeInitialAddressVisibility(value: string | null) {
  if (
    value === "public" ||
    value === "approximate" ||
    value === "hidden"
  ) {
    return value;
  }

  return "approximate";
}

function normalizeInitialCoordinate(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "";
  }

  return String(value);
}

export default function OrganizationLocationEditForm({
  organizationId,
  initialCountryCode,
  initialCity,
  initialDistrict,
  initialAddressVisibility,
  initialLatitude,
  initialLongitude,
}: OrganizationLocationEditFormProps) {
  const router = useRouter();

  const [countryCode, setCountryCode] = useState(
    normalizeInitialText(initialCountryCode)
  );
  const [city, setCity] = useState(normalizeInitialText(initialCity));
  const [district, setDistrict] = useState(
    normalizeInitialText(initialDistrict)
  );
  const [addressVisibility, setAddressVisibility] = useState(
    normalizeInitialAddressVisibility(initialAddressVisibility)
  );
  const [latitude, setLatitude] = useState(
    normalizeInitialCoordinate(initialLatitude)
  );
  const [longitude, setLongitude] = useState(
    normalizeInitialCoordinate(initialLongitude)
  );
  const [submitState, setSubmitState] =
    useState<SubmitState>(INITIAL_SUBMIT_STATE);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitState({
      isSubmitting: true,
      message: null,
      error: null,
    });

    try {
      const response = await fetch(
        `/api/organizations/${encodeURIComponent(organizationId)}/location`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            countryCode,
            city,
            district,
            addressVisibility,
            latitude,
            longitude,
          }),
        }
      );

      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        setSubmitState({
          isSubmitting: false,
          message: null,
          error: result.error ?? "Location update failed.",
        });

        return;
      }

      setSubmitState({
        isSubmitting: false,
        message:
          "Location updated. Organization country and default currency were recalculated on the backend.",
        error: null,
      });

      router.refresh();
    } catch (error) {
      setSubmitState({
        isSubmitting: false,
        message: null,
        error:
          error instanceof Error
            ? error.message
            : "Unknown location update error.",
      });
    }
  }

  return (
    <section
      style={{
        border: "1px solid #bfdbfe",
        borderRadius: "12px",
        padding: "20px",
        background: "#eff6ff",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
      }}
    >
      <h2
        style={{
          fontSize: "22px",
          margin: "0 0 8px",
        }}
      >
        Edit organization location
      </h2>

      <p
        style={{
          margin: "0 0 16px",
          color: "#1e3a8a",
          lineHeight: "1.5",
        }}
      >
        Changing the country also recalculates the organization default
        currency on the backend.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
          }}
        >
          <label style={{ display: "grid", gap: "6px", fontWeight: 700 }}>
            Country code
            <input
              value={countryCode}
              onChange={(event) => setCountryCode(event.target.value)}
              placeholder="PL, ES, DE, UA, US, GB, CZ"
              maxLength={2}
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #b6c7e3",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: "6px", fontWeight: 700 }}>
            City
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Szczecin, Valencia, Berlin..."
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #b6c7e3",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: "6px", fontWeight: 700 }}>
            District
            <input
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
              placeholder="Centrum, Ruzafa..."
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #b6c7e3",
              }}
            />
          </label>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
          }}
        >
          <label style={{ display: "grid", gap: "6px", fontWeight: 700 }}>
            Address visibility
            <select
              value={addressVisibility}
              onChange={(event) => setAddressVisibility(event.target.value)}
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #b6c7e3",
                background: "#ffffff",
              }}
            >
              {ADDRESS_VISIBILITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: "6px", fontWeight: 700 }}>
            Latitude
            <input
              value={latitude}
              onChange={(event) => setLatitude(event.target.value)}
              placeholder="53.4285"
              inputMode="decimal"
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #b6c7e3",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: "6px", fontWeight: 700 }}>
            Longitude
            <input
              value={longitude}
              onChange={(event) => setLongitude(event.target.value)}
              placeholder="14.5528"
              inputMode="decimal"
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #b6c7e3",
              }}
            />
          </label>
        </div>

        {submitState.error ? (
          <div
            style={{
              border: "1px solid #f2b8b5",
              borderRadius: "8px",
              padding: "10px 12px",
              background: "#fff5f5",
              color: "#a40000",
              fontWeight: 700,
            }}
          >
            {submitState.error}
          </div>
        ) : null}

        {submitState.message ? (
          <div
            style={{
              border: "1px solid #bbf7d0",
              borderRadius: "8px",
              padding: "10px 12px",
              background: "#f0fdf4",
              color: "#166534",
              fontWeight: 700,
            }}
          >
            {submitState.message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitState.isSubmitting}
          style={{
            justifySelf: "start",
            padding: "10px 16px",
            borderRadius: "8px",
            border: "1px solid #2563eb",
            background: submitState.isSubmitting ? "#93c5fd" : "#2563eb",
            color: "#ffffff",
            fontWeight: 800,
            cursor: submitState.isSubmitting ? "not-allowed" : "pointer",
          }}
        >
          {submitState.isSubmitting ? "Saving..." : "Save location"}
        </button>
      </form>
    </section>
  );
}

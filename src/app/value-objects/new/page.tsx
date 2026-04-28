"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Organization = {
  id: string;
  organization_name: string;
  organization_type: string;
  status: string;
};

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
  const [defaultDurationMinutes, setDefaultDurationMinutes] = useState("");
  const [isMarketplaceSellable, setIsMarketplaceSellable] = useState(true);
  const [isFreePossible, setIsFreePossible] = useState(false);

  const [message, setMessage] = useState("");
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadOrganizations() {
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

  useEffect(() => {
    loadOrganizations();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/value-objects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId,
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

      if (!response.ok || !data.ok) {
        setMessage(data.error ?? "Failed to create value object");
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
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedOrganization = organizations.find(
    (organization) => organization.id === organizationId
  );

  const isSubmitDisabled =
    isSubmitting ||
    isLoadingOrganizations ||
    organizations.length === 0 ||
    organizationId.trim().length === 0 ||
    title.trim().length === 0;

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
          maxWidth: "760px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            marginBottom: "32px",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontSize: "32px",
              lineHeight: "1.2",
              fontWeight: 700,
              margin: "0 0 12px",
            }}
          >
            Create value object
          </h1>

          <p
            style={{
              maxWidth: "680px",
              margin: "0 auto 20px",
              color: "#555555",
              fontSize: "16px",
              lineHeight: "1.5",
            }}
          >
            Create a reusable product, service, consultation, certificate,
            access, content or other value connected to one organization.
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

            {organizationId && (
              <Link
                href={`/organizations/${organizationId}`}
                style={{
                  color: "#2563eb",
                  textDecoration: "underline",
                  fontSize: "16px",
                }}
              >
                Открыть организацию
              </Link>
            )}

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

        {isLoadingOrganizations && (
          <div
            style={{
              border: "1px solid #dddddd",
              borderRadius: "10px",
              padding: "16px",
              background: "#f9fafb",
              marginBottom: "16px",
            }}
          >
            Loading organizations...
          </div>
        )}

        {!isLoadingOrganizations && organizations.length === 0 && (
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

        {organizationIdFromUrl &&
          !selectedOrganization &&
          !isLoadingOrganizations && (
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
          )}

        {selectedOrganization && (
          <div
            style={{
              border: "1px solid #bfdbfe",
              borderRadius: "10px",
              padding: "14px",
              background: "#eff6ff",
              marginBottom: "16px",
            }}
          >
            Selected organization:{" "}
            <strong>{selectedOrganization.organization_name}</strong>
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
            gap: "16px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
          }}
        >
          <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
            Organization
            <select
              value={organizationId}
              onChange={(event) => setOrganizationId(event.target.value)}
              required
              disabled={isLoadingOrganizations || organizations.length === 0}
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

          <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
            Value type
            <select
              value={valueType}
              onChange={(event) => setValueType(event.target.value)}
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
              <option value="gift_certificate">Gift certificate</option>
              <option value="discount_certificate">Discount certificate</option>
              <option value="service_certificate">Service certificate</option>
              <option value="product_certificate">Product certificate</option>
              <option value="subscription">Subscription</option>
              <option value="digital_access">Digital access</option>
              <option value="consultation">Consultation</option>
              <option value="knowledge">Knowledge</option>
              <option value="content">Content</option>
              <option value="booking_slot">Booking slot</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Calf massage, German consultation, Coffee package"
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
              placeholder="What this value object is"
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

          <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
            Unit type
            <input
              value={unitType}
              onChange={(event) => setUnitType(event.target.value)}
              placeholder="piece, hour, session, kg, month"
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
            Default price
            <input
              type="number"
              step="0.01"
              value={defaultPrice}
              onChange={(event) => setDefaultPrice(event.target.value)}
              placeholder="60"
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
            Default currency
            <input
              value={defaultCurrency}
              onChange={(event) => setDefaultCurrency(event.target.value)}
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

          <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
            Default duration minutes
            <input
              type="number"
              value={defaultDurationMinutes}
              onChange={(event) => setDefaultDurationMinutes(event.target.value)}
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

          <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={isMarketplaceSellable}
              onChange={(event) =>
                setIsMarketplaceSellable(event.target.checked)
              }
            />
            Marketplace sellable
          </label>

          <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={isFreePossible}
              onChange={(event) => setIsFreePossible(event.target.checked)}
            />
            Free possible
          </label>

          <button
            type="submit"
            disabled={isSubmitDisabled}
            style={{
              width: "100%",
              border: "none",
              borderRadius: "8px",
              padding: "14px 18px",
              background: isSubmitDisabled ? "#9ca3af" : "#111827",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: 700,
              cursor: isSubmitDisabled ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting ? "Creating..." : "Create value object"}
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
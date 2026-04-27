"use client";

import { useEffect, useState } from "react";
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
  owner_actor_id?: string | null;
  value_type: string;
  title: string;
  description: string | null;
  unit_type: string | null;
  default_price: number | null;
  default_currency: string | null;
  default_duration_minutes: number | null;
  is_marketplace_sellable: boolean;
  is_free_possible: boolean;
  status: string;
  created_at: string;
  organizations?: Organization | null;
};

export default function ValueObjectsPage() {
  const [valueObjects, setValueObjects] = useState<ValueObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadValueObjects() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/value-objects", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setErrorMessage(data.error ?? "Failed to load value objects");
        return;
      }

      setValueObjects(data.valueObjects ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadValueObjects();
  }, []);

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
          maxWidth: "960px",
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
            Value objects
          </h1>

          <p
            style={{
              maxWidth: "720px",
              margin: "0 auto 20px",
              color: "#555555",
              fontSize: "16px",
              lineHeight: "1.5",
            }}
          >
            Reusable products, services, certificates, consultations, access,
            content and other values connected to your organizations.
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
              href="/value-objects/new"
              style={{
                color: "#2563eb",
                textDecoration: "underline",
                fontSize: "16px",
              }}
            >
              Create new value object
            </Link>
          </nav>
        </header>

        {isLoading && (
          <div
            style={{
              border: "1px solid #dddddd",
              borderRadius: "10px",
              padding: "18px",
              background: "#f9fafb",
            }}
          >
            Loading value objects...
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              border: "1px solid #f5c2c7",
              borderRadius: "10px",
              padding: "18px",
              background: "#f8d7da",
              color: "#842029",
            }}
          >
            {errorMessage}
          </div>
        )}

        {!isLoading && !errorMessage && valueObjects.length === 0 && (
          <div
            style={{
              border: "1px solid #facc15",
              borderRadius: "10px",
              padding: "18px",
              background: "#fefce8",
            }}
          >
            No value objects yet.
          </div>
        )}

        {!isLoading && !errorMessage && valueObjects.length > 0 && (
          <section
            style={{
              display: "grid",
              gap: "16px",
            }}
          >
            {valueObjects.map((valueObject) => (
              <article
                key={valueObject.id}
                style={{
                  border: "1px solid #dddddd",
                  borderRadius: "12px",
                  padding: "20px",
                  background: "#f9fafb",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
                }}
              >
                <h2
                  style={{
                    fontSize: "22px",
                    lineHeight: "1.25",
                    fontWeight: 700,
                    margin: "0 0 10px",
                  }}
                >
                  {valueObject.title}
                </h2>

                <p style={{ margin: "0 0 6px" }}>
                  <strong>Organization:</strong>{" "}
                  {valueObject.organizations?.organization_name ??
                    "Not connected"}
                </p>

                <p style={{ margin: "0 0 6px" }}>
                  <strong>Type:</strong> {valueObject.value_type}
                </p>

                <p style={{ margin: "0 0 6px" }}>
                  <strong>Description:</strong>{" "}
                  {valueObject.description || "Not specified"}
                </p>

                <p style={{ margin: "0 0 6px" }}>
                  <strong>Unit type:</strong>{" "}
                  {valueObject.unit_type || "Not specified"}
                </p>

                <p style={{ margin: "0 0 6px" }}>
                  <strong>Default price:</strong>{" "}
                  {valueObject.default_price ?? "Not specified"}{" "}
                  {valueObject.default_currency || ""}
                </p>

                <p style={{ margin: "0 0 6px" }}>
                  <strong>Default duration:</strong>{" "}
                  {valueObject.default_duration_minutes ?? "Not specified"}{" "}
                  minutes
                </p>

                <p style={{ margin: "0 0 6px" }}>
                  <strong>Marketplace sellable:</strong>{" "}
                  {valueObject.is_marketplace_sellable ? "Yes" : "No"}
                </p>

                <p style={{ margin: "0 0 6px" }}>
                  <strong>Free possible:</strong>{" "}
                  {valueObject.is_free_possible ? "Yes" : "No"}
                </p>

                <p style={{ margin: "0 0 6px" }}>
                  <strong>Status:</strong> {valueObject.status}
                </p>

                <p
                  style={{
                    margin: "14px 0 0",
                    fontSize: "14px",
                    color: "#666666",
                  }}
                >
                  ID: {valueObject.id}
                </p>

                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: "14px",
                    color: "#666666",
                  }}
                >
                  Organization ID:{" "}
                  {valueObject.organization_id ?? "Not connected"}
                </p>

                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: "14px",
                    color: "#666666",
                  }}
                >
                  Created at:{" "}
                  {new Date(valueObject.created_at).toLocaleString()}
                </p>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
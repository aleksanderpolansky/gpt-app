"use client";

import { useEffect, useState } from "react";

type ValueObject = {
  id: string;
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
};

export default function ValueObjectsPage() {
  const [valueObjects, setValueObjects] = useState<ValueObject[]>([]);
  const [message, setMessage] = useState("Loading value objects...");

  useEffect(() => {
    async function loadValueObjects() {
      const response = await fetch("/api/value-objects");
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Failed to load value objects");
        return;
      }

      setValueObjects(data.valueObjects ?? []);
      setMessage("");
    }

    loadValueObjects();
  }, []);

  return (
    <main style={{ padding: "32px", maxWidth: "900px" }}>
      <h1>Value objects</h1>

      <p>
        This page shows reusable value objects: services, products,
        consultations, certificates, access, content and other values.
      </p>

      <p>
        <a href="/value-objects/new">Create new value object</a>
      </p>

      {message && <p>{message}</p>}

      {!message && valueObjects.length === 0 && <p>No value objects yet.</p>}

      {valueObjects.length > 0 && (
        <div style={{ display: "grid", gap: "16px" }}>
          {valueObjects.map((valueObject) => (
            <article
              key={valueObject.id}
              style={{
                border: "1px solid #ddd",
                padding: "16px",
                borderRadius: "8px",
              }}
            >
              <h2>{valueObject.title}</h2>

              <p>
                <strong>Type:</strong> {valueObject.value_type}
              </p>

              <p>
                <strong>Description:</strong>{" "}
                {valueObject.description || "Not specified"}
              </p>

              <p>
                <strong>Unit type:</strong>{" "}
                {valueObject.unit_type || "Not specified"}
              </p>

              <p>
                <strong>Default price:</strong>{" "}
                {valueObject.default_price ?? "Not specified"}{" "}
                {valueObject.default_currency || ""}
              </p>

              <p>
                <strong>Default duration:</strong>{" "}
                {valueObject.default_duration_minutes ?? "Not specified"}{" "}
                minutes
              </p>

              <p>
                <strong>Marketplace sellable:</strong>{" "}
                {valueObject.is_marketplace_sellable ? "Yes" : "No"}
              </p>

              <p>
                <strong>Free possible:</strong>{" "}
                {valueObject.is_free_possible ? "Yes" : "No"}
              </p>

              <p>
                <strong>Status:</strong> {valueObject.status}
              </p>

              <p>
                <strong>Created at:</strong>{" "}
                {new Date(valueObject.created_at).toLocaleString()}
              </p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
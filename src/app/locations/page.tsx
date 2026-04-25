"use client";

import { useEffect, useState } from "react";

type Location = {
  id: string;
  title: string;
  location_type: string;
  address: string | null;
  city: string | null;
  country: string | null;
  status: string;
  created_at: string;
};

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [message, setMessage] = useState("Loading locations...");

  useEffect(() => {
    async function loadLocations() {
      const response = await fetch("/api/locations");
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Failed to load locations");
        return;
      }

      setLocations(data.locations ?? []);
      setMessage("");
    }

    loadLocations();
  }, []);

  return (
    <main style={{ padding: "32px", maxWidth: "900px" }}>
      <h1>Locations</h1>

      <p>This page shows locations owned by your personal actor.</p>

      <p>
        <a href="/locations/new">Create new location</a>
      </p>

      {message && <p>{message}</p>}

      {!message && locations.length === 0 && <p>No locations yet.</p>}

      {locations.length > 0 && (
        <div style={{ display: "grid", gap: "16px" }}>
          {locations.map((location) => (
            <article
              key={location.id}
              style={{
                border: "1px solid #ddd",
                padding: "16px",
                borderRadius: "8px",
              }}
            >
              <h2>{location.title}</h2>

              <p>
                <strong>Type:</strong> {location.location_type}
              </p>

              <p>
                <strong>Address:</strong>{" "}
                {location.address || "Not specified"}
              </p>

              <p>
                <strong>City:</strong> {location.city || "Not specified"}
              </p>

              <p>
                <strong>Country:</strong>{" "}
                {location.country || "Not specified"}
              </p>

              <p>
                <strong>Status:</strong> {location.status}
              </p>

              <p>
                <strong>Created at:</strong>{" "}
                {new Date(location.created_at).toLocaleString()}
              </p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
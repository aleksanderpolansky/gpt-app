"use client";

import { useEffect, useState } from "react";

type TimeBlock = {
  id: string;
  block_type: string;
  start_time: string;
  end_time: string;
  duration_minutes: number | null;
  availability_status: string;
  energy_expectation: string | null;
  attention_requirement: string | null;
  can_multitask: boolean;
  source: string;
  created_at: string;
};

export default function TimeBlocksPage() {
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [message, setMessage] = useState("Loading time blocks...");

  useEffect(() => {
    async function loadTimeBlocks() {
      const response = await fetch("/api/time-blocks");
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Failed to load time blocks");
        return;
      }

      setTimeBlocks(data.timeBlocks ?? []);
      setMessage("");
    }

    loadTimeBlocks();
  }, []);

  return (
    <main style={{ padding: "32px", maxWidth: "900px" }}>
      <h1>Time blocks</h1>

      <p>
        This page shows time blocks for availability, work, sleep, travel,
        recovery, free time and service availability analysis.
      </p>

      <p>
        <a href="/time-blocks/new">Create new time block</a>
      </p>

      {message && <p>{message}</p>}

      {!message && timeBlocks.length === 0 && <p>No time blocks yet.</p>}

      {timeBlocks.length > 0 && (
        <div style={{ display: "grid", gap: "16px" }}>
          {timeBlocks.map((timeBlock) => (
            <article
              key={timeBlock.id}
              style={{
                border: "1px solid #ddd",
                padding: "16px",
                borderRadius: "8px",
              }}
            >
              <h2>{timeBlock.block_type}</h2>

              <p>
                <strong>Start:</strong>{" "}
                {new Date(timeBlock.start_time).toLocaleString()}
              </p>

              <p>
                <strong>End:</strong>{" "}
                {new Date(timeBlock.end_time).toLocaleString()}
              </p>

              <p>
                <strong>Duration:</strong>{" "}
                {timeBlock.duration_minutes ?? "Not calculated"} minutes
              </p>

              <p>
                <strong>Availability:</strong>{" "}
                {timeBlock.availability_status}
              </p>

              <p>
                <strong>Energy expectation:</strong>{" "}
                {timeBlock.energy_expectation || "Not specified"}
              </p>

              <p>
                <strong>Attention requirement:</strong>{" "}
                {timeBlock.attention_requirement || "Not specified"}
              </p>

              <p>
                <strong>Can multitask:</strong>{" "}
                {timeBlock.can_multitask ? "Yes" : "No"}
              </p>

              <p>
                <strong>Source:</strong> {timeBlock.source}
              </p>

              <p>
                <strong>Created at:</strong>{" "}
                {new Date(timeBlock.created_at).toLocaleString()}
              </p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
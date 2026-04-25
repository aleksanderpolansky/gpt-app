"use client";

import { useEffect, useState } from "react";

type CalendarEvent = {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  duration_minutes: number | null;
  status: string;
  source: string;
  created_at: string;
};

export default function CalendarPage() {
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [message, setMessage] = useState("Loading calendar events...");

  useEffect(() => {
    async function loadCalendarEvents() {
      const response = await fetch("/api/calendar/events");
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Failed to load calendar events");
        return;
      }

      setCalendarEvents(data.calendarEvents ?? []);
      setMessage("");
    }

    loadCalendarEvents();
  }, []);

  return (
    <main style={{ padding: "32px", maxWidth: "900px" }}>
      <h1>Calendar</h1>

      <p>This page shows your calendar events.</p>

      <p>
        <a href="/calendar/new">Create new calendar event</a>
      </p>

      {message && <p>{message}</p>}

      {!message && calendarEvents.length === 0 && (
        <p>No calendar events yet.</p>
      )}

      {calendarEvents.length > 0 && (
        <div style={{ display: "grid", gap: "16px" }}>
          {calendarEvents.map((calendarEvent) => (
            <article
              key={calendarEvent.id}
              style={{
                border: "1px solid #ddd",
                padding: "16px",
                borderRadius: "8px",
              }}
            >
              <h2>{calendarEvent.title}</h2>

              <p>
                <strong>Type:</strong> {calendarEvent.event_type}
              </p>

              <p>
                <strong>Description:</strong>{" "}
                {calendarEvent.description || "Not specified"}
              </p>

              <p>
                <strong>Start:</strong>{" "}
                {new Date(calendarEvent.start_time).toLocaleString()}
              </p>

              <p>
                <strong>End:</strong>{" "}
                {new Date(calendarEvent.end_time).toLocaleString()}
              </p>

              <p>
                <strong>Duration:</strong>{" "}
                {calendarEvent.duration_minutes ?? "Not calculated"} minutes
              </p>

              <p>
                <strong>Status:</strong> {calendarEvent.status}
              </p>

              <p>
                <strong>Source:</strong> {calendarEvent.source}
              </p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
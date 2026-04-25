"use client";

import { useState } from "react";

export default function NewCalendarEventPage() {
  const [eventType, setEventType] = useState("meeting");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [status, setStatus] = useState("planned");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setIsSubmitting(true);

    const response = await fetch("/api/calendar/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventType,
        title,
        description,
        startTime,
        endTime,
        status,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Failed to create calendar event");
      setIsSubmitting(false);
      return;
    }

    setMessage("Calendar event created successfully");

    setEventType("meeting");
    setTitle("");
    setDescription("");
    setStartTime("");
    setEndTime("");
    setStatus("planned");
    setIsSubmitting(false);
  }

  return (
    <main style={{ padding: "32px", maxWidth: "720px" }}>
      <h1>Create calendar event</h1>

      <p>
        This page creates a simple calendar event for your personal actor.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
        <label>
          Event type
          <select
            value={eventType}
            onChange={(event) => setEventType(event.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          >
            <option value="work">Work</option>
            <option value="sleep">Sleep</option>
            <option value="meal">Meal</option>
            <option value="meeting">Meeting</option>
            <option value="school">School</option>
            <option value="childcare">Childcare</option>
            <option value="travel">Travel</option>
            <option value="exercise">Exercise</option>
            <option value="study">Study</option>
            <option value="rest">Rest</option>
            <option value="business">Business</option>
            <option value="purchase">Purchase</option>
            <option value="family">Family</option>
            <option value="free_time">Free time</option>
            <option value="blocked_time">Blocked time</option>
            <option value="service_booking">Service booking</option>
            <option value="certificate_redemption">
              Certificate redemption
            </option>
          </select>
        </label>

        <label>
          Title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Morning work block, Sleep, Meeting with client"
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional details"
            rows={4}
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          Start time
          <input
            type="datetime-local"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          End time
          <input
            type="datetime-local"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          >
            <option value="planned">Planned</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="missed">Missed</option>
            <option value="rescheduled">Rescheduled</option>
          </select>
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{ padding: "10px 16px", cursor: "pointer" }}
        >
          {isSubmitting ? "Creating..." : "Create calendar event"}
        </button>
      </form>

      {message && <p style={{ marginTop: "16px" }}>{message}</p>}
    </main>
  );
}
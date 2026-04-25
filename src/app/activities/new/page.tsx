"use client";

import { useState } from "react";

export default function NewActivityPage() {
  const [activityType, setActivityType] = useState("study");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rawInput, setRawInput] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [status, setStatus] = useState("completed");
  const [source, setSource] = useState("manual");
  const [participantRole, setParticipantRole] = useState("self");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setIsSubmitting(true);

    const response = await fetch("/api/activities", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        activityType,
        title,
        description,
        rawInput,
        startTime: startTime || null,
        endTime: endTime || null,
        status,
        source,
        participants: [
          {
            participantRole,
            isPrimary: true,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Failed to create activity");
      setIsSubmitting(false);
      return;
    }

    setMessage("Activity created successfully");

    setActivityType("study");
    setTitle("");
    setDescription("");
    setRawInput("");
    setStartTime("");
    setEndTime("");
    setStatus("completed");
    setSource("manual");
    setParticipantRole("self");
    setIsSubmitting(false);
  }

  return (
    <main style={{ padding: "32px", maxWidth: "720px" }}>
      <h1>Create activity</h1>

      <p>
        This page creates a basic activity with one primary participant.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
        <label>
          Activity type
          <select
            value={activityType}
            onChange={(event) => setActivityType(event.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          >
            <option value="sleep">Sleep</option>
            <option value="meal">Meal</option>
            <option value="exercise">Exercise</option>
            <option value="study">Study</option>
            <option value="reading">Reading</option>
            <option value="work">Work</option>
            <option value="purchase">Purchase</option>
            <option value="meeting">Meeting</option>
            <option value="travel">Travel</option>
            <option value="rest">Rest</option>
            <option value="communication">Communication</option>
            <option value="service_provided">Service provided</option>
            <option value="service_received">Service received</option>
            <option value="certificate_received">Certificate received</option>
            <option value="certificate_redeemed">Certificate redeemed</option>
            <option value="booking_created">Booking created</option>
            <option value="salary_received">Salary received</option>
            <option value="family_help">Family help</option>
            <option value="care">Care</option>
            <option value="escort">Escort</option>
            <option value="product_delivered">Product delivered</option>
            <option value="content_created">Content created</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label>
          Title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Studied German, Ate lunch, Walked to work"
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional structured description"
            rows={4}
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          Raw input
          <textarea
            value={rawInput}
            onChange={(event) => setRawInput(event.target.value)}
            placeholder="Original phrase, for example: I studied German for 30 minutes"
            rows={3}
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          Start time
          <input
            type="datetime-local"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          End time
          <input
            type="datetime-local"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
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
            <option value="draft">Draft</option>
            <option value="planned">Planned</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="missed">Missed</option>
            <option value="corrected">Corrected</option>
          </select>
        </label>

        <label>
          Source
          <select
            value={source}
            onChange={(event) => setSource(event.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          >
            <option value="manual">Manual</option>
            <option value="chat_ai">Chat AI</option>
            <option value="calendar">Calendar</option>
            <option value="booking">Booking</option>
            <option value="rule">Rule</option>
            <option value="import">Import</option>
            <option value="system">System</option>
          </select>
        </label>

        <label>
          Participant role
          <select
            value={participantRole}
            onChange={(event) => setParticipantRole(event.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          >
            <option value="self">Self</option>
            <option value="provider">Provider</option>
            <option value="receiver">Receiver</option>
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
            <option value="payer">Payer</option>
            <option value="payee">Payee</option>
            <option value="employee">Employee</option>
            <option value="employer">Employer</option>
            <option value="parent">Parent</option>
            <option value="child">Child</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
            <option value="organizer">Organizer</option>
            <option value="participant">Participant</option>
            <option value="service_provider">Service provider</option>
            <option value="service_receiver">Service receiver</option>
            <option value="certificate_issuer">Certificate issuer</option>
            <option value="certificate_receiver">Certificate receiver</option>
          </select>
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{ padding: "10px 16px", cursor: "pointer" }}
        >
          {isSubmitting ? "Creating..." : "Create activity"}
        </button>
      </form>

      {message && <p style={{ marginTop: "16px" }}>{message}</p>}
    </main>
  );
}
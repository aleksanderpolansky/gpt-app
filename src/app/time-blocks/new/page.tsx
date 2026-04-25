"use client";

import { useState } from "react";

export default function NewTimeBlockPage() {
  const [blockType, setBlockType] = useState("work");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [availabilityStatus, setAvailabilityStatus] = useState("busy");
  const [energyExpectation, setEnergyExpectation] = useState("");
  const [attentionRequirement, setAttentionRequirement] = useState("");
  const [canMultitask, setCanMultitask] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setIsSubmitting(true);

    const response = await fetch("/api/time-blocks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        blockType,
        startTime,
        endTime,
        availabilityStatus,
        energyExpectation,
        attentionRequirement,
        canMultitask,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Failed to create time block");
      setIsSubmitting(false);
      return;
    }

    setMessage("Time block created successfully");

    setBlockType("work");
    setStartTime("");
    setEndTime("");
    setAvailabilityStatus("busy");
    setEnergyExpectation("");
    setAttentionRequirement("");
    setCanMultitask(false);
    setIsSubmitting(false);
  }

  return (
    <main style={{ padding: "32px", maxWidth: "720px" }}>
      <h1>Create time block</h1>

      <p>
        This page creates a time block for availability, work, sleep, travel,
        recovery, or free time analysis.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
        <label>
          Block type
          <select
            value={blockType}
            onChange={(event) => setBlockType(event.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          >
            <option value="work">Work</option>
            <option value="sleep">Sleep</option>
            <option value="travel">Travel</option>
            <option value="family_obligation">Family obligation</option>
            <option value="recovery">Recovery</option>
            <option value="free_time">Free time</option>
            <option value="blocked_time">Blocked time</option>
            <option value="service_available">Service available</option>
            <option value="study">Study</option>
            <option value="exercise">Exercise</option>
            <option value="rest">Rest</option>
            <option value="other">Other</option>
          </select>
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
          Availability status
          <select
            value={availabilityStatus}
            onChange={(event) => setAvailabilityStatus(event.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "8px" }}
          >
            <option value="busy">Busy</option>
            <option value="free">Free</option>
            <option value="partially_free">Partially free</option>
            <option value="blocked">Blocked</option>
            <option value="sleep">Sleep</option>
            <option value="work">Work</option>
            <option value="travel">Travel</option>
            <option value="family_obligation">Family obligation</option>
            <option value="recovery">Recovery</option>
            <option value="service_available">Service available</option>
          </select>
        </label>

        <label>
          Energy expectation
          <input
            value={energyExpectation}
            onChange={(event) => setEnergyExpectation(event.target.value)}
            placeholder="low, medium, high, recovery needed"
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          Attention requirement
          <input
            value={attentionRequirement}
            onChange={(event) => setAttentionRequirement(event.target.value)}
            placeholder="low, medium, high, no multitasking"
            style={{ display: "block", width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          <input
            type="checkbox"
            checked={canMultitask}
            onChange={(event) => setCanMultitask(event.target.checked)}
          />{" "}
          Can multitask
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{ padding: "10px 16px", cursor: "pointer" }}
        >
          {isSubmitting ? "Creating..." : "Create time block"}
        </button>
      </form>

      {message && <p style={{ marginTop: "16px" }}>{message}</p>}
    </main>
  );
}
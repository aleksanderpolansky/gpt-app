"use client";

import { useEffect, useState } from "react";

type ActivityParticipant = {
  id: string;
  participant_role: string;
  is_primary: boolean;
  status: string;
  actor_id: string | null;
  space_id: string | null;
};

type ActivityLink = {
  id: string;
  linked_entity_type: string;
  linked_entity_id: string;
  link_type: string;
  created_at: string;
};

type Activity = {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  raw_input: string | null;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  status: string;
  source: string;
  ai_confidence: number | null;
  created_at: string;
  activity_participants: ActivityParticipant[];
  activity_links: ActivityLink[];
};

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [message, setMessage] = useState("Loading activities...");

  useEffect(() => {
    async function loadActivities() {
      const response = await fetch("/api/activities");
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Failed to load activities");
        return;
      }

      setActivities(data.activities ?? []);
      setMessage("");
    }

    loadActivities();
  }, []);

  return (
    <main style={{ padding: "32px", maxWidth: "900px" }}>
      <h1>Activities</h1>

      <p>
        This page shows the central Activity Core records with participants and
        links to related entities.
      </p>

      <p>
        <a href="/activities/new">Create new activity</a>
      </p>

      {message && <p>{message}</p>}

      {!message && activities.length === 0 && <p>No activities yet.</p>}

      {activities.length > 0 && (
        <div style={{ display: "grid", gap: "16px" }}>
          {activities.map((activity) => (
            <article
              key={activity.id}
              style={{
                border: "1px solid #ddd",
                padding: "16px",
                borderRadius: "8px",
              }}
            >
              <h2>{activity.title}</h2>

              <p>
                <strong>Type:</strong> {activity.activity_type}
              </p>

              <p>
                <strong>Description:</strong>{" "}
                {activity.description || "Not specified"}
              </p>

              <p>
                <strong>Raw input:</strong>{" "}
                {activity.raw_input || "Not specified"}
              </p>

              <p>
                <strong>Start:</strong>{" "}
                {activity.start_time
                  ? new Date(activity.start_time).toLocaleString()
                  : "Not specified"}
              </p>

              <p>
                <strong>End:</strong>{" "}
                {activity.end_time
                  ? new Date(activity.end_time).toLocaleString()
                  : "Not specified"}
              </p>

              <p>
                <strong>Duration:</strong>{" "}
                {activity.duration_minutes ?? "Not calculated"} minutes
              </p>

              <p>
                <strong>Status:</strong> {activity.status}
              </p>

              <p>
                <strong>Source:</strong> {activity.source}
              </p>

              <p>
                <strong>AI confidence:</strong>{" "}
                {activity.ai_confidence ?? "Not specified"}
              </p>

              <p>
                <strong>Created at:</strong>{" "}
                {new Date(activity.created_at).toLocaleString()}
              </p>

              <h3>Participants</h3>

              {activity.activity_participants?.length > 0 ? (
                <ul>
                  {activity.activity_participants.map((participant) => (
                    <li key={participant.id}>
                      {participant.participant_role}
                      {participant.is_primary ? " — primary" : ""}
                      {" — "}
                      {participant.status}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No participants.</p>
              )}

              <h3>Links</h3>

              {activity.activity_links?.length > 0 ? (
                <ul>
                  {activity.activity_links.map((link) => (
                    <li key={link.id}>
                      {link.linked_entity_type} — {link.link_type}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No links.</p>
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
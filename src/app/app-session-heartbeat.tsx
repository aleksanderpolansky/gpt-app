"use client";

import { useEffect } from "react";

const CLIENT_SESSION_STORAGE_KEY = "gpt_app_client_session_id_v1";
const HEARTBEAT_INTERVAL_MS = 60_000;

function createClientSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return [
    "fallback",
    Date.now().toString(36),
    Math.random().toString(36).slice(2),
    Math.random().toString(36).slice(2),
  ].join("-");
}

function getOrCreateClientSessionId(): string {
  try {
    const existing = window.localStorage.getItem(CLIENT_SESSION_STORAGE_KEY);

    if (existing && existing.length >= 16 && existing.length <= 256) {
      return existing;
    }

    const created = createClientSessionId();
    window.localStorage.setItem(CLIENT_SESSION_STORAGE_KEY, created);
    return created;
  } catch {
    return createClientSessionId();
  }
}

async function sendHeartbeat(clientSessionId: string) {
  try {
    await fetch("/api/app/session-heartbeat", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        clientSessionId,
      }),
    });
  } catch {
    // Heartbeat is best-effort telemetry. UI must never break because of it.
  }
}

export function AppSessionHeartbeat() {
  useEffect(() => {
    const clientSessionId = getOrCreateClientSessionId();

    void sendHeartbeat(clientSessionId);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void sendHeartbeat(clientSessionId);
      }
    }, HEARTBEAT_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void sendHeartbeat(clientSessionId);
      }
    };

    const handleFocus = () => {
      void sendHeartbeat(clientSessionId);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return null;
}

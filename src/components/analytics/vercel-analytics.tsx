"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

const BLOCKED_PATH_PREFIXES = [
  "/admin",
  "/api",
  "/auth",
  "/debug",
  "/project-knowledge",
  "/activity-capture",
  "/activity-facts",
  "/calendar",
  "/time-blocks",
  "/value-objects",
  "/organizations/deleted",
  "/organizations/new",
];

function shouldSkipAnalyticsEvent(event: BeforeSendEvent) {
  const pathname = new URL(event.url).pathname;

  if (BLOCKED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }

  if (/^\/organizations\/[^/]+/.test(pathname)) {
    return true;
  }

  return false;
}

export default function VercelAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        if (shouldSkipAnalyticsEvent(event)) {
          return null;
        }

        return event;
      }}
    />
  );
}

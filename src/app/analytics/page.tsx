import type { Metadata } from "next";

import {
  AnalyticsDashboard,
  analyticsDashboardFixture,
} from "@/components/workspace/analytics-dashboard";

export const metadata: Metadata = {
  title: "Analytics Dashboard | AI Navigator",
  description:
    "Read-only analytics dashboard preview for balance, weak directions, weekly progress, and load/recovery signals.",
};

export default function AnalyticsPage() {
  return <AnalyticsDashboard viewModel={analyticsDashboardFixture} />;
}

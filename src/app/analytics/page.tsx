import { ContextualAIColumn, getContextForRoute } from "@/components/workspace/contextual-ai";
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
  const analyticsAIContext = getContextForRoute("/analytics");

  return (
    <div className="grid min-h-0 gap-4 xl:grid-cols-3">
      <div className="min-w-0 xl:col-span-2">
        <AnalyticsDashboard viewModel={analyticsDashboardFixture} />
      </div>

      <ContextualAIColumn
        context={analyticsAIContext}
        className="hidden xl:flex"
      />
    </div>
  );
}


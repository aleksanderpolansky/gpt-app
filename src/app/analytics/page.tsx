import type { Metadata } from "next";

import {
  AnalyticsDashboard,
  analyticsDashboardFixture,
} from "@/components/workspace/analytics-dashboard";
import { ValueObjectAnalyticsCard } from "@/components/workspace/analytics-dashboard/value-object-analytics-card";
import { resolveDemoFamilyTimeAnalytics } from "@/lib/value-objects/value-object-analytics-resolver";

export const metadata: Metadata = {
  title: "Analytics Dashboard | AI Navigator",
  description:
    "Read-only analytics dashboard preview for balance, weak directions, weekly progress, and load/recovery signals.",
};

export default function AnalyticsPage() {
  const familyTimeAnalyticsResult = resolveDemoFamilyTimeAnalytics();

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <section className="mx-auto max-w-7xl">
        <AnalyticsDashboard viewModel={analyticsDashboardFixture} />

        <section className="mt-8" data-testid="analytics-step64-value-object-card">
          <ValueObjectAnalyticsCard
            title="Family Time"
            subtitle="Step 64 / 76: Value Object facts are compared with a target standard through the Step 62 resolver."
            result={familyTimeAnalyticsResult}
          />
        </section>
      </section>
    </main>
  );
}
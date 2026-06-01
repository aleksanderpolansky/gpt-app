/**
 * UI-3.13 — KPI strip using UI-kit metric primitive.
 *
 * This component is fixture-only and local to UI-3.
 * It does not call network, database, auth, environment variables or server routes.
 *
 * Result marker: WORKSPACE_KPI_STRIP_CREATED
 * UI-kit primitive: KpiCard
 */

import type { ComponentType, ReactNode } from "react";

import { KpiCard as UiMetricPrimitive } from "../ui";

import { workspaceKpiFixture } from "./workspace-fixtures";

export const WORKSPACE_KPI_STRIP_RESULT =
  "WORKSPACE_KPI_STRIP_CREATED" as const;

export const WORKSPACE_KPI_STRIP_UI_PRIMITIVE = "KpiCard" as const;

type UiMetricPrimitiveProps = {
  readonly label?: string;
  readonly title?: string;
  readonly value?: ReactNode;
  readonly helper?: string;
  readonly description?: string;
  readonly trend?: string;
  readonly tone?: string;
  readonly className?: string;
  readonly children?: ReactNode;
};

const UiMetricCard = UiMetricPrimitive as ComponentType<UiMetricPrimitiveProps>;

export function WorkspaceKpiStrip() {
  return (
    <section aria-label="Workspace KPI strip" className="mt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
            KPI strip
          </p>
          <h3 className="mt-1 text-sm font-semibold text-[#1a1d2e]">
            Static workspace signals
          </h3>
        </div>

        <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-[#7c8099]">
          UI-kit KpiCard
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {workspaceKpiFixture.map((kpi) => (
          <UiMetricCard
            key={kpi.id}
            label={kpi.label}
            title={kpi.label}
            value={kpi.value}
            helper={kpi.helper}
            description={kpi.helper}
            trend={kpi.trend}
            tone={kpi.tone}
            className="h-full min-h-[132px]"
          >
            <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
                {kpi.label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-[#1a1d2e]">
                {kpi.value}
              </p>
              <p className="mt-1 text-xs text-[#7c8099]">{kpi.helper}</p>
              <p className="mt-2 text-xs font-medium text-[#3b6ef8]">
                {kpi.trend}
              </p>
            </div>
          </UiMetricCard>
        ))}
      </div>

      <p className="mt-4 text-xs text-[#7c8099]">
        WORKSPACE_KPI_STRIP_CREATED · UI-kit KpiCard · done 13/32 · left 19
      </p>
    </section>
  );
}

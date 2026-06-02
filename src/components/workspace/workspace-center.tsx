/**
 * UI-3.11 — CenterWorkspace flex-1 / p-5.
 * UI-3.12 — Greeting / context header connected.
 * UI-3.13 — KPI strip connected through UI-kit metric primitive.
 * UI-3.14 — Workspace toolbar filters connected.
 * UI-3.15 — Analytics / overview cards connected.
 * UI-3.16 — Activity Review placeholder panel connected.
 * UI-3.24 — Empty / loading / no-rights placeholders connected.
 *
 * This component is fixture-only and local to UI-3.
 * It does not call network, database, auth, environment variables or server routes.
 *
 * Result markers:
 * WORKSPACE_CENTER_CREATED
 * WORKSPACE_CONTEXT_HEADER_CREATED
 * WORKSPACE_KPI_STRIP_CREATED
 * WORKSPACE_FILTER_TOOLBAR_CREATED
 * WORKSPACE_OVERVIEW_CARDS_CREATED
 * ACTIVITY_REVIEW_PLACEHOLDER_CREATED
 * WORKSPACE_STATE_PLACEHOLDERS_CREATED
 */

import type { ReactNode } from "react";

import {
  workspaceContextFixture,
  workspaceProfileFixture,
  workspaceTimelineFixture,
} from "./workspace-fixtures";

import { ActivityCapturePanel } from "./activity-capture/activity-capture-panel";
import { WorkspaceActivityReviewPanel } from "./workspace-activity-review-panel";
import { WorkspaceContextHeader } from "./workspace-context-header";
import { WorkspaceFilterToolbar } from "./workspace-filter-toolbar";
import { WorkspaceKpiStrip } from "./workspace-kpi-strip";
import { WorkspaceOverviewCards } from "./workspace-overview-cards";
import { WorkspaceStatePlaceholders } from "./workspace-state-placeholders";

export const WORKSPACE_CENTER_RESULT = "WORKSPACE_CENTER_CREATED" as const;

export const WORKSPACE_CONTEXT_HEADER_CONNECTED_RESULT =
  "WORKSPACE_CONTEXT_HEADER_CREATED" as const;

export const WORKSPACE_KPI_STRIP_CONNECTED_RESULT =
  "WORKSPACE_KPI_STRIP_CREATED" as const;

export const WORKSPACE_FILTER_TOOLBAR_CONNECTED_RESULT =
  "WORKSPACE_FILTER_TOOLBAR_CREATED" as const;

export const WORKSPACE_OVERVIEW_CARDS_CONNECTED_RESULT =
  "WORKSPACE_OVERVIEW_CARDS_CREATED" as const;

export const ACTIVITY_REVIEW_PLACEHOLDER_CONNECTED_RESULT =
  "ACTIVITY_REVIEW_PLACEHOLDER_CREATED" as const;

export const WORKSPACE_STATE_PLACEHOLDERS_CONNECTED_RESULT =
  "WORKSPACE_STATE_PLACEHOLDERS_CREATED" as const;

function CenterSectionLabel({ children }: { readonly children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7c8099]">
      {children}
    </p>
  );
}

export const ACTIVITY_CAPTURE_CONNECTED_TO_WORKSPACE_CENTER =
  "ACTIVITY_CAPTURE_CONNECTED_TO_WORKSPACE_CENTER" as const;

export function WorkspaceCenter() {
  return (
    <section className="min-h-0 flex-1 overflow-y-auto p-5">
      <WorkspaceContextHeader
        profile={workspaceProfileFixture}
        context={workspaceContextFixture}
      />

      <WorkspaceKpiStrip />

      <WorkspaceFilterToolbar />

      <WorkspaceStatePlaceholders />

      <WorkspaceOverviewCards />

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div
          data-ui4-activity-capture="local-mvp"
          className="rounded-[28px] border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/40 to-white p-4 shadow-sm"
        >
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
                UI-4 Activity Capture
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Local MVP connected inside workspace center. Draft preview only:
                no Activity Event, no DB write, no API call.
              </p>
            </div>
            <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Local MVP connected
            </span>
          </div>
          <ActivityCapturePanel />
        </div>
        <WorkspaceActivityReviewPanel />

        <article className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
          <CenterSectionLabel>Timeline preview</CenterSectionLabel>

          <div className="mt-3 space-y-3">
            {workspaceTimelineFixture.map((item) => (
              <div key={item.id} className="rounded-xl bg-[#f0f2f7] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#1a1d2e]">
                    {item.title}
                  </p>
                  <span className="text-xs text-[#7c8099]">{item.time}</span>
                </div>

                <p className="mt-1 text-xs leading-5 text-[#7c8099]">
                  {item.description}
                </p>

                <p className="mt-2 text-[11px] font-medium text-[#3b6ef8]">
                  {item.meta}
                </p>
              </div>
            ))}
          </div>
        </article>
      </div>

      <p className="mt-4 text-xs text-[#7c8099]">
        WORKSPACE_STATE_PLACEHOLDERS_CREATED · flex-1 · p-5 · done 24/32 · left 8
      </p>
    </section>
  );
}

/**
 * UI-3.23 — Responsive switch desktop / mobile.
 *
 * This component is fixture-only and local to UI-3.
 * It does not call network, database, auth, environment variables or server routes.
 *
 * Result marker: WORKSPACE_RESPONSIVE_SWITCH_CREATED
 */

import {
  workspaceAiInsightsFixture,
  workspaceAiMessagesFixture,
  workspaceContextFixture,
  workspaceNavigationFixture,
} from "./workspace-fixtures";

import { WorkspaceCenter } from "./workspace-center";
import { WorkspaceLeftNav } from "./workspace-left-nav";
import { WorkspaceRightAiColumn } from "./workspace-right-ai-column";

export const WORKSPACE_RESPONSIVE_SWITCH_RESULT =
  "WORKSPACE_RESPONSIVE_SWITCH_CREATED" as const;

function MobileResponsiveNotice() {
  return (
    <div className="border-b border-black/10 bg-white px-4 py-3 lg:hidden">
      <div className="mx-auto flex w-[390px] max-w-full items-center justify-between gap-3 rounded-xl border border-black/10 bg-[#eef2ff] px-3 py-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c8099]">
            Mobile workspace shell 390px
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-[#1a1d2e]">
            Active tab: Workspace
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-[#3b6ef8]">
          390px
        </span>
      </div>
    </div>
  );
}

export function WorkspaceResponsiveSwitch() {
  return (
    <>
      <section
        aria-label="Desktop workspace shell"
        className="hidden min-h-0 flex-1 lg:flex"
      >
        <WorkspaceLeftNav
          navigation={workspaceNavigationFixture}
          activeItemId="today"
        />

        <WorkspaceCenter />

        <WorkspaceRightAiColumn
          context={workspaceContextFixture}
          messages={workspaceAiMessagesFixture}
          insights={workspaceAiInsightsFixture}
        />
      </section>

      <section
        aria-label="Mobile workspace shell 390px"
        className="flex min-h-0 flex-1 flex-col overflow-hidden lg:hidden"
      >
        <MobileResponsiveNotice />

        <WorkspaceCenter />

        <p className="sr-only">
          WORKSPACE_RESPONSIVE_SWITCH_CREATED · mobile 390px · desktop hidden
          below lg · done 23/32 · left 9
        </p>
      </section>
    </>
  );
}

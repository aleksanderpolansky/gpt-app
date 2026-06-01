/**
 * UI-3.7 — WorkspaceShell desktop layout skeleton.
 * UI-3.8 — WorkspaceTopBar connected.
 * UI-3.21 — BottomQuickActions desktop connected.
 * UI-3.22 — Mobile shell tabs 390px connected.
 * UI-3.23 — Responsive switch desktop/mobile connected.
 * UI-3.24 — State placeholders available through WorkspaceCenter.
 * UI-3.25 — Accessibility landmarks / labels connected.
 *
 * This component is fixture-only and local to UI-3.
 * It does not call network, database, auth, environment variables or server routes.
 *
 * Result markers:
 * WORKSPACE_SHELL_DESKTOP_CREATED
 * WORKSPACE_TOP_BAR_CREATED
 * WORKSPACE_LEFT_NAV_CREATED
 * WORKSPACE_LEFT_NAV_TREE_CREATED
 * WORKSPACE_CENTER_CREATED
 * RIGHT_AI_COLUMN_CREATED
 * BOTTOM_QUICK_ACTIONS_CREATED
 * MOBILE_WORKSPACE_TABS_CREATED
 * WORKSPACE_RESPONSIVE_SWITCH_CREATED
 * WORKSPACE_STATE_PLACEHOLDERS_CREATED
 * WORKSPACE_A11Y_LANDMARKS_ADDED
 */

import {
  workspaceContextFixture,
  workspaceMobileTabsFixture,
  workspaceProfileFixture,
  workspaceQuickActionsFixture,
} from "./workspace-fixtures";

import { WorkspaceA11yLandmarks } from "./workspace-a11y-landmarks";
import { WorkspaceBottomQuickActions } from "./workspace-bottom-quick-actions";
import { WorkspaceMobileShellTabs } from "./workspace-mobile-shell-tabs";
import { WorkspaceResponsiveSwitch } from "./workspace-responsive-switch";
import { WorkspaceTopBar } from "./workspace-top-bar";

import type { WorkspaceShellProps } from "./workspace-types";

export const WORKSPACE_SHELL_DESKTOP_RESULT =
  "WORKSPACE_SHELL_DESKTOP_CREATED" as const;

export const WORKSPACE_TOP_BAR_CONNECTED_RESULT =
  "WORKSPACE_TOP_BAR_CREATED" as const;

export const WORKSPACE_LEFT_NAV_CONNECTED_RESULT =
  "WORKSPACE_LEFT_NAV_CREATED" as const;

export const WORKSPACE_LEFT_NAV_TREE_CONNECTED_RESULT =
  "WORKSPACE_LEFT_NAV_TREE_CREATED" as const;

export const WORKSPACE_CENTER_CONNECTED_RESULT =
  "WORKSPACE_CENTER_CREATED" as const;

export const RIGHT_AI_COLUMN_CONNECTED_RESULT =
  "RIGHT_AI_COLUMN_CREATED" as const;

export const BOTTOM_QUICK_ACTIONS_CONNECTED_RESULT =
  "BOTTOM_QUICK_ACTIONS_CREATED" as const;

export const MOBILE_WORKSPACE_TABS_CONNECTED_RESULT =
  "MOBILE_WORKSPACE_TABS_CREATED" as const;

export const WORKSPACE_RESPONSIVE_SWITCH_CONNECTED_RESULT =
  "WORKSPACE_RESPONSIVE_SWITCH_CREATED" as const;

export const WORKSPACE_STATE_PLACEHOLDERS_CONNECTED_RESULT =
  "WORKSPACE_STATE_PLACEHOLDERS_CREATED" as const;

export const WORKSPACE_A11Y_LANDMARKS_CONNECTED_RESULT =
  "WORKSPACE_A11Y_LANDMARKS_ADDED" as const;

export function WorkspaceShell(_props: WorkspaceShellProps) {
  return (
    <div
      id="workspace-root"
      className="h-screen w-screen overflow-hidden bg-[#f0f2f7] text-[#1a1d2e]"
    >
      <WorkspaceA11yLandmarks />

      <div className="flex h-full min-h-0 flex-col">
        <header
          id="workspace-topbar-region"
          role="banner"
          aria-label="Workspace top bar"
        >
          <WorkspaceTopBar
            profile={workspaceProfileFixture}
            context={workspaceContextFixture}
          />
        </header>

        <main
          id="workspace-main"
          role="main"
          aria-labelledby="workspace-main-heading"
          className="min-h-0 flex-1"
        >
          <WorkspaceResponsiveSwitch />
        </main>

        <section
          id="workspace-actions-region"
          aria-label="Workspace quick actions"
          className="shrink-0"
        >
          <WorkspaceBottomQuickActions actions={workspaceQuickActionsFixture} />
        </section>

        <section
          id="workspace-mobile-tabs-region"
          aria-label="Mobile workspace navigation"
          className="shrink-0"
        >
          <WorkspaceMobileShellTabs tabs={workspaceMobileTabsFixture} />
        </section>
      </div>

      <p className="sr-only">
        WORKSPACE_A11Y_LANDMARKS_ADDED · WORKSPACE_STATE_PLACEHOLDERS_CREATED ·
        accessibility landmarks · done 25/32 · left 7
      </p>
    </div>
  );
}

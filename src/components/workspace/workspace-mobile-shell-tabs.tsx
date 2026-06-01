/**
 * UI-3.22 — Mobile shell tabs 390px.
 *
 * This component is fixture-only and local to UI-3.
 * It does not call network, database, auth, environment variables or server routes.
 *
 * Result marker: MOBILE_WORKSPACE_TABS_CREATED
 */

import type { WorkspaceMobileTab } from "./workspace-types";

export const MOBILE_WORKSPACE_TABS_RESULT =
  "MOBILE_WORKSPACE_TABS_CREATED" as const;

export const MOBILE_WORKSPACE_TABS_WIDTH = "390px" as const;

export const MOBILE_WORKSPACE_TABS_ORDER_LABEL =
  "AI / Workspace / Objects / Calendar / Actions" as const;

export type WorkspaceMobileShellTabsProps = {
  readonly tabs: readonly WorkspaceMobileTab[];
};

const MOBILE_TAB_ORDER: readonly string[] = [
  "ai",
  "workspace",
  "objects",
  "calendar",
  "actions",
];

function getMobileTabOrder(tabId: string) {
  const position = MOBILE_TAB_ORDER.indexOf(tabId);
  return position === -1 ? 99 : position;
}

function MobileTabButton({
  tab,
  isActive,
}: {
  readonly tab: WorkspaceMobileTab;
  readonly isActive: boolean;
}) {
  return (
    <button
      type="button"
      disabled
      aria-current={isActive ? "page" : undefined}
      className={
        isActive
          ? "flex min-w-[72px] flex-1 flex-col items-center justify-center rounded-xl border border-[#3b6ef8]/30 bg-[#eef2ff] px-2 py-2 text-center disabled:cursor-not-allowed disabled:opacity-95"
          : "flex min-w-[72px] flex-1 flex-col items-center justify-center rounded-xl border border-black/10 bg-white px-2 py-2 text-center disabled:cursor-not-allowed disabled:opacity-80"
      }
    >
      <span
        className={
          isActive
            ? "text-xs font-semibold text-[#1a1d2e]"
            : "text-xs font-medium text-[#7c8099]"
        }
      >
        {tab.label}
      </span>

      <span className="mt-0.5 line-clamp-1 text-[10px] text-[#9ca3b8]">
        {tab.description}
      </span>
    </button>
  );
}

export function WorkspaceMobileShellTabs({
  tabs,
}: WorkspaceMobileShellTabsProps) {
  const orderedTabs = [...tabs].sort(
    (firstTab, secondTab) =>
      getMobileTabOrder(firstTab.id) - getMobileTabOrder(secondTab.id),
  );

  return (
    <nav
      aria-label="Mobile workspace tabs 390px"
      className="lg:hidden border-t border-black/10 bg-white px-3 py-2"
    >
      <div className="mx-auto flex h-[64px] w-[390px] max-w-full items-stretch gap-2 overflow-x-auto">
        {orderedTabs.map((tab) => (
          <MobileTabButton
            key={tab.id}
            tab={tab}
            isActive={tab.id === "workspace"}
          />
        ))}
      </div>

      <p className="sr-only">
        MOBILE_WORKSPACE_TABS_CREATED · 390px · AI / Workspace / Objects /
        Calendar / Actions · done 22/32 · left 10
      </p>
    </nav>
  );
}

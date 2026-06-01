/**
 * UI-3.21 — BottomQuickActions desktop.
 *
 * This component is fixture-only and local to UI-3.
 * It does not call network, database, auth, environment variables or server routes.
 *
 * Result marker: BOTTOM_QUICK_ACTIONS_CREATED
 */

import type { WorkspaceQuickAction } from "./workspace-types";

export const BOTTOM_QUICK_ACTIONS_RESULT =
  "BOTTOM_QUICK_ACTIONS_CREATED" as const;

export type WorkspaceBottomQuickActionsProps = {
  readonly actions: readonly WorkspaceQuickAction[];
};

function DesktopQuickActionButton({
  action,
  index,
}: {
  readonly action: WorkspaceQuickAction;
  readonly index: number;
}) {
  const toneClass =
    index < 4
      ? "border-[#3b6ef8]/30 bg-[#eef2ff] text-[#1a1d2e]"
      : "border-black/10 bg-[#f0f2f7] text-[#1a1d2e]";

  return (
    <button
      type="button"
      disabled
      className={`shrink-0 rounded-xl border px-4 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-80 ${toneClass}`}
    >
      <span className="block font-semibold">{action.label}</span>
      <span className="mt-0.5 block text-xs text-[#7c8099]">
        Preview only · {action.shortcut}
      </span>
    </button>
  );
}

export function WorkspaceBottomQuickActions({
  actions,
}: WorkspaceBottomQuickActionsProps) {
  return (
    <footer className="hidden min-h-16 shrink-0 items-center gap-3 overflow-x-auto border-t border-black/10 bg-white px-5 py-3 lg:flex">
      <div className="flex shrink-0 items-center gap-2 pr-2">
        <span className="h-2 w-2 rounded-full bg-[#3b6ef8]" />
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c8099]">
          Bottom quick actions
        </span>
      </div>

      {actions.map((action, index) => (
        <DesktopQuickActionButton
          key={action.id}
          action={action}
          index={index}
        />
      ))}

      <span className="ml-auto shrink-0 rounded-full border border-black/10 bg-[#f0f2f7] px-3 py-1 text-xs text-[#7c8099]">
        BOTTOM_QUICK_ACTIONS_CREATED · desktop · done 21/32 · left 11
      </span>
    </footer>
  );
}

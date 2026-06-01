/**
 * UI-3.20 — Quick commands in AI column.
 *
 * This component is fixture-only and local to UI-3.
 * It does not call network, database, auth, environment variables or server routes.
 *
 * Result marker: AI_QUICK_COMMANDS_CREATED
 */

import { workspaceQuickActionsFixture } from "./workspace-fixtures";

import type { WorkspaceQuickAction } from "./workspace-types";

export const AI_QUICK_COMMANDS_RESULT = "AI_QUICK_COMMANDS_CREATED" as const;

function QuickCommandButton({
  action,
  index,
}: {
  readonly action: WorkspaceQuickAction;
  readonly index: number;
}) {
  const priorityLabel = index < 3 ? "primary" : "secondary";

  return (
    <button
      type="button"
      disabled
      className={
        index < 3
          ? "rounded-xl border border-[#3b6ef8]/30 bg-[#eef2ff] px-3 py-3 text-left disabled:cursor-not-allowed disabled:opacity-90"
          : "rounded-xl border border-black/10 bg-white px-3 py-3 text-left disabled:cursor-not-allowed disabled:opacity-80"
      }
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-[#1a1d2e]">
          {action.label}
        </span>

        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#7c8099]">
          {priorityLabel}
        </span>
      </span>

      <span className="mt-1 block text-xs leading-5 text-[#7c8099]">
        Shortcut preview: {action.shortcut}
      </span>
    </button>
  );
}

export function WorkspaceAiQuickCommands() {
  return (
    <section className="mt-4 rounded-xl border border-black/10 bg-[#f0f2f7] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c8099]">
            AI quick commands
          </p>

          <h3 className="mt-1 text-sm font-semibold text-[#1a1d2e]">
            Suggested commands for the current workspace
          </h3>

          <p className="mt-1 text-xs leading-5 text-[#7c8099]">
            Commands are disabled placeholders in UI-3. They do not start tools,
            routing, persistence, message sending or background work.
          </p>
        </div>

        <span className="shrink-0 rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs font-medium text-[#7c8099]">
          {workspaceQuickActionsFixture.length}
        </span>
      </div>

      <div className="mt-3 grid gap-2">
        {workspaceQuickActionsFixture.map((action, index) => (
          <QuickCommandButton
            key={action.id}
            action={action}
            index={index}
          />
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-black/10 bg-white p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7c8099]">
          Command boundary
        </p>
        <p className="mt-1 text-xs leading-5 text-[#7c8099]">
          The AI column can display possible next commands, but every real
          action remains blocked until a later explicit implementation gate.
        </p>
      </div>

      <p className="mt-3 text-xs text-[#7c8099]">
        AI_QUICK_COMMANDS_CREATED · quick commands · done 20/32 · left 12
      </p>
    </section>
  );
}

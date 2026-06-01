/**
 * UI-3.8 — WorkspaceTopBar by Figma 56px contract.
 *
 * This component is fixture-only and local to UI-3.
 * It does not call network, database, auth, environment variables or server routes.
 *
 * Result marker: WORKSPACE_TOP_BAR_CREATED
 */

import type { WorkspaceContext, WorkspaceProfile } from "./workspace-types";

export const WORKSPACE_TOP_BAR_RESULT = "WORKSPACE_TOP_BAR_CREATED" as const;

export type WorkspaceTopBarProps = {
  readonly profile: WorkspaceProfile;
  readonly context: WorkspaceContext;
};

function TopBarStatusPill({ label }: { readonly label: string }) {
  return (
    <span className="inline-flex h-7 items-center rounded-full border border-black/10 bg-[#f0f2f7] px-3 text-xs font-medium text-[#7c8099]">
      {label}
    </span>
  );
}

function TopBarIconButton({
  label,
  symbol,
}: {
  readonly label: string;
  readonly symbol: string;
}) {
  return (
    <button
      type="button"
      disabled
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white text-sm font-semibold text-[#7c8099] shadow-sm disabled:cursor-not-allowed disabled:opacity-80"
    >
      {symbol}
    </button>
  );
}

export function WorkspaceTopBar({ profile, context }: WorkspaceTopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-black/10 bg-white px-5 shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#3b6ef8] text-sm font-bold text-white">
          AI
        </div>

        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-[0.2em] text-[#7c8099]">
            UI-3.8 / Master Workspace
          </p>
          <h1 className="truncate text-sm font-semibold text-[#1a1d2e]">
            {context.title}
          </h1>
        </div>
      </div>

      <div className="hidden min-w-[260px] max-w-xl flex-1 items-center rounded-xl border border-black/10 bg-[#f0f2f7] px-3 py-2 text-sm text-[#7c8099] lg:flex">
        <span className="mr-2 text-[#9ca3b8]">⌕</span>
        <span className="truncate">
          Search objects, activities, windows and candidate actions
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="hidden items-center gap-2 xl:flex">
          <TopBarStatusPill label={profile.currentMode} />
          <TopBarStatusPill label={profile.privacyLabel} />
          <TopBarStatusPill label="No hidden writes" />
        </div>

        <TopBarIconButton label="Notifications placeholder" symbol="!" />
        <TopBarIconButton label="Settings placeholder" symbol="⚙" />

        <div className="flex h-9 items-center gap-2 rounded-xl border border-black/10 bg-white px-2.5 shadow-sm">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#eef2ff] text-xs font-bold text-[#3b6ef8]">
            A
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="max-w-[120px] truncate text-xs font-semibold text-[#1a1d2e]">
              {profile.displayName}
            </p>
            <p className="max-w-[120px] truncate text-[10px] text-[#7c8099]">
              {profile.syncLabel}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

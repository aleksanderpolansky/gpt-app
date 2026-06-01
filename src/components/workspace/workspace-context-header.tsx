/**
 * UI-3.12 — Greeting / context header for CenterWorkspace.
 *
 * This component is fixture-only and local to UI-3.
 * It does not call network, database, auth, environment variables or server routes.
 *
 * Result marker: WORKSPACE_CONTEXT_HEADER_CREATED
 */

import type { WorkspaceContext, WorkspaceProfile } from "./workspace-types";

export const WORKSPACE_CONTEXT_HEADER_RESULT =
  "WORKSPACE_CONTEXT_HEADER_CREATED" as const;

export type WorkspaceContextHeaderProps = {
  readonly profile: WorkspaceProfile;
  readonly context: WorkspaceContext;
};

function ContextPill({ label }: { readonly label: string }) {
  return (
    <span className="inline-flex rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs font-medium text-[#7c8099]">
      {label}
    </span>
  );
}

export function WorkspaceContextHeader({
  profile,
  context,
}: WorkspaceContextHeaderProps) {
  return (
    <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7c8099]">
            Greeting / context header
          </p>

          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#1a1d2e]">
            Good focus window, {profile.displayName}
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#7c8099]">
            {context.subtitle}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <ContextPill label={context.activeObjectLabel} />
            <ContextPill label={context.activeDirectionLabel} />
            <ContextPill label={context.statusLabel} />
            <ContextPill label={context.confidenceLabel} />
          </div>
        </div>

        <div className="w-full shrink-0 rounded-xl border border-black/10 bg-[#eef2ff] p-4 xl:w-[260px]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c8099]">
            Current workspace mode
          </p>

          <p className="mt-2 text-sm font-semibold text-[#1a1d2e]">
            {profile.currentMode}
          </p>

          <p className="mt-1 text-xs leading-5 text-[#7c8099]">
            {profile.privacyLabel} · {profile.syncLabel}
          </p>

          <p className="mt-3 text-[11px] leading-4 text-[#7c8099]">
            WORKSPACE_CONTEXT_HEADER_CREATED · done 12/32 · left 20
          </p>
        </div>
      </div>
    </section>
  );
}

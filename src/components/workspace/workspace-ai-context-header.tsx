/**
 * UI-3.18 — AI context header + online indicator.
 *
 * This component is fixture-only and local to UI-3.
 * It does not call network, database, auth, environment variables or server routes.
 *
 * Result marker: AI_CONTEXT_HEADER_CREATED
 */

import type { WorkspaceContext } from "./workspace-types";

export const AI_CONTEXT_HEADER_RESULT = "AI_CONTEXT_HEADER_CREATED" as const;

export type WorkspaceAiContextHeaderProps = {
  readonly context: WorkspaceContext;
};

function AiContextPill({ label }: { readonly label: string }) {
  return (
    <span className="inline-flex rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs font-medium text-[#7c8099]">
      {label}
    </span>
  );
}

export function WorkspaceAiContextHeader({
  context,
}: WorkspaceAiContextHeaderProps) {
  return (
    <section className="mt-4 rounded-xl border border-black/10 bg-[#eef2ff] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
            AI context header
          </p>

          <h2 className="mt-1 text-sm font-semibold text-[#1a1d2e]">
            Contextual AI
          </h2>

          <p className="mt-1 text-xs leading-5 text-[#7c8099]">
            Scoped to {context.activeObjectLabel}.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 rounded-full bg-white px-2.5 py-1">
          <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#22c55e]">
            online
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <AiContextPill label={context.activeDirectionLabel} />
        <AiContextPill label={context.statusLabel} />
        <AiContextPill label={context.confidenceLabel} />
      </div>

      <div className="mt-3 rounded-xl border border-black/10 bg-white p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7c8099]">
          Execution boundary
        </p>
        <p className="mt-1 text-xs leading-5 text-[#7c8099]">
          Online means the UI indicator is visible. It does not start real chat,
          tools, routing, persistence or background actions in UI-3.
        </p>
      </div>

      <p className="mt-3 text-xs text-[#7c8099]">
        AI_CONTEXT_HEADER_CREATED · online indicator · done 18/32 · left 14
      </p>
    </section>
  );
}

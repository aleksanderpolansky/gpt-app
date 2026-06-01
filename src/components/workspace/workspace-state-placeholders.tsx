/**
 * UI-3.24 — Empty / loading / no-rights placeholders.
 *
 * This component is fixture-only and local to UI-3.
 * It does not call network, database, auth, environment variables or server routes.
 *
 * Result marker: WORKSPACE_STATE_PLACEHOLDERS_CREATED
 */

import type { ReactNode } from "react";

export const WORKSPACE_STATE_PLACEHOLDERS_RESULT =
  "WORKSPACE_STATE_PLACEHOLDERS_CREATED" as const;

type WorkspacePlaceholderState = {
  readonly id: "empty" | "loading" | "no-rights";
  readonly label: string;
  readonly title: string;
  readonly description: string;
  readonly hint: string;
  readonly accentClassName: string;
  readonly children: ReactNode;
};

const PLACEHOLDER_STATES: readonly WorkspacePlaceholderState[] = [
  {
    id: "empty",
    label: "EmptyState",
    title: "Nothing to review yet",
    description:
      "The workspace can show an empty state when there are no candidates, activities or unresolved objects in the selected scope.",
    hint: "Visible placeholder only",
    accentClassName: "bg-[#3b6ef8]",
    children: (
      <div className="flex h-12 items-center justify-center rounded-xl border border-dashed border-black/10 bg-white text-xs font-medium text-[#7c8099]">
        Empty state preview
      </div>
    ),
  },
  {
    id: "loading",
    label: "LoadingState",
    title: "Preparing workspace preview",
    description:
      "The loading state reserves space for semantic cards, review queues and analytics while the real data layer is unavailable.",
    hint: "No async work in UI-3",
    accentClassName: "bg-[#8b5cf6]",
    children: (
      <div className="space-y-2">
        <div className="h-2 rounded-full bg-white" />
        <div className="h-2 w-3/4 rounded-full bg-white" />
        <div className="h-2 w-1/2 rounded-full bg-white" />
      </div>
    ),
  },
  {
    id: "no-rights",
    label: "NoRightsState",
    title: "Access is not available",
    description:
      "The no-rights state explains that an organization, certificate, offer or object may be visible only with the proper permission.",
    hint: "Permission placeholder",
    accentClassName: "bg-[#f97316]",
    children: (
      <div className="rounded-xl border border-black/10 bg-white p-3 text-xs leading-5 text-[#7c8099]">
        No rights / read-only / restricted workspace preview
      </div>
    ),
  },
] as const;

function PlaceholderCard({ state }: { readonly state: WorkspacePlaceholderState }) {
  return (
    <article className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c8099]">
            {state.label}
          </p>

          <h3 className="mt-1 text-sm font-semibold text-[#1a1d2e]">
            {state.title}
          </h3>
        </div>

        <span className={`h-3 w-3 shrink-0 rounded-full ${state.accentClassName}`} />
      </div>

      <p className="mt-3 text-xs leading-5 text-[#7c8099]">
        {state.description}
      </p>

      <div className="mt-3 rounded-xl bg-[#f0f2f7] p-3">
        {state.children}
      </div>

      <p className="mt-3 text-[11px] font-medium text-[#3b6ef8]">
        {state.hint}
      </p>
    </article>
  );
}

export function WorkspaceStatePlaceholders() {
  return (
    <section className="mt-4 rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
            Empty / loading / no-rights placeholders
          </p>
          <h3 className="mt-1 text-sm font-semibold text-[#1a1d2e]">
            State previews for workspace cards
          </h3>
        </div>

        <span className="rounded-full border border-black/10 bg-[#f0f2f7] px-3 py-1 text-xs font-medium text-[#7c8099]">
          UI states only
        </span>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        {PLACEHOLDER_STATES.map((state) => (
          <PlaceholderCard key={state.id} state={state} />
        ))}
      </div>

      <p className="mt-4 text-xs text-[#7c8099]">
        WORKSPACE_STATE_PLACEHOLDERS_CREATED · EmptyState · LoadingState ·
        NoRightsState · done 24/32 · left 8
      </p>
    </section>
  );
}

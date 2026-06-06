import { ContextualAIColumn, getContextForRoute } from "./contextual-ai";
/**
 * UI-3.16 — placeholder Activity Review panel.
 *
 * This component is fixture-only and local to UI-3.
 * It does not call network, database, auth, environment variables or server routes.
 *
 * Result marker: ACTIVITY_REVIEW_PLACEHOLDER_CREATED
 */

import { workspaceActivityPreviewFixture } from "./workspace-fixtures";

export const ACTIVITY_REVIEW_PLACEHOLDER_RESULT =
  "ACTIVITY_REVIEW_PLACEHOLDER_CREATED" as const;

const REVIEW_DECISIONS = [
  {
    id: "confirm",
    label: "Confirm",
    description: "Accept the candidate meaning later through an explicit gate.",
  },
  {
    id: "correct",
    label: "Correct",
    description: "Adjust detected meaning before it becomes trusted data.",
  },
  {
    id: "merge",
    label: "Merge",
    description: "Connect similar candidates without duplicating time.",
  },
  {
    id: "reject",
    label: "Reject",
    description: "Discard an incorrect candidate from the review queue.",
  },
  {
    id: "ask-later",
    label: "Ask later",
    description: "Keep the candidate visible without making a decision now.",
  },
] as const;

function ReviewChip({ label }: { readonly label: string }) {
  return (
    <span className="inline-flex rounded-full border border-black/10 bg-[#f0f2f7] px-2.5 py-1 text-xs font-medium text-[#7c8099]">
      {label}
    </span>
  );
}

function ReviewSectionLabel({ children }: { readonly children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
      {children}
    </p>
  );
}

export function WorkspaceActivityReviewPanel() {
  const activity = workspaceActivityPreviewFixture;
  const activityReviewAIContext = getContextForRoute("/activity/review");

  return (
    <div className="grid min-h-0 gap-4 xl:grid-cols-3">
      <div className="min-w-0 xl:col-span-2">
        <article className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <ReviewSectionLabel>Activity Review placeholder</ReviewSectionLabel>

          <h3 className="mt-2 text-lg font-semibold text-[#1a1d2e]">
            {activity.title}
          </h3>

          <p className="mt-1 text-xs leading-5 text-[#7c8099]">
            Candidate review is visual only in UI-3. Confirm, correct, merge,
            reject and ask-later actions are disabled placeholders.
          </p>
        </div>

        <span className="shrink-0 rounded-full border border-black/10 bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#3b6ef8]">
          {activity.status}
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="rounded-xl border border-black/10 bg-[#f0f2f7] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7c8099]">
            Raw user text
          </p>
          <p className="mt-2 text-sm leading-6 text-[#1a1d2e]">
            {activity.rawText}
          </p>
        </div>

        <div className="rounded-xl border border-black/10 bg-white p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7c8099]">
            Normalized candidate meaning
          </p>
          <p className="mt-2 text-sm leading-6 text-[#7c8099]">
            {activity.normalizedText}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7c8099]">
            Semantic chips
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {activity.semanticChips.map((chip) => (
              <ReviewChip key={chip} label={chip} />
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7c8099]">
            Value Object candidates
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {activity.valueObjectCandidates.map((candidate) => (
              <ReviewChip key={candidate} label={candidate} />
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7c8099]">
            Privacy hints
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {activity.privacyHints.map((hint) => (
              <ReviewChip key={hint} label={hint} />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-black/10 bg-[#eef2ff] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
              Review decisions
            </p>
            <p className="mt-1 text-sm font-semibold text-[#1a1d2e]">
              Confirm / Correct / Merge / Reject / Ask later
            </p>
          </div>

          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#7c8099]">
            Disabled in UI-3
          </span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {REVIEW_DECISIONS.map((decision) => (
            <button
              key={decision.id}
              type="button"
              disabled
              className="rounded-xl border border-black/10 bg-white px-3 py-3 text-left disabled:cursor-not-allowed disabled:opacity-80"
            >
              <span className="block text-sm font-semibold text-[#1a1d2e]">
                {decision.label}
              </span>
              <span className="mt-1 block text-xs leading-5 text-[#7c8099]">
                {decision.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs text-[#7c8099]">
        ACTIVITY_REVIEW_PLACEHOLDER_CREATED · review panel · done 16/32 · left 16
      </p>
        </article>
      </div>

      <ContextualAIColumn
        context={activityReviewAIContext}
        className="hidden xl:flex"
      />
    </div>
  );
}


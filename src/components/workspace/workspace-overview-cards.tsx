/**
 * UI-3.15 — Analytics / overview cards for CenterWorkspace.
 *
 * This component is fixture-only and local to UI-3.
 * It does not call network, database, auth, environment variables or server routes.
 *
 * Result marker: WORKSPACE_OVERVIEW_CARDS_CREATED
 */

import { workspaceOverviewCardsFixture } from "./workspace-fixtures";

export const WORKSPACE_OVERVIEW_CARDS_RESULT =
  "WORKSPACE_OVERVIEW_CARDS_CREATED" as const;

function OverviewStatusPill({ label }: { readonly label: string }) {
  return (
    <span className="inline-flex rounded-full border border-black/10 bg-[#f0f2f7] px-2.5 py-1 text-xs font-medium text-[#7c8099]">
      {label}
    </span>
  );
}

function OverviewSignalBar({ index }: { readonly index: number }) {
  const widthByIndex = ["w-3/4", "w-2/3", "w-4/5", "w-1/2"];
  const width = widthByIndex[index % widthByIndex.length] ?? "w-2/3";

  return (
    <div className="mt-4 h-2 rounded-full bg-[#f0f2f7]">
      <div className={`h-2 rounded-full bg-[#3b6ef8] ${width}`} />
    </div>
  );
}

export function WorkspaceOverviewCards() {
  return (
    <section className="mt-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
            Analytics / overview cards
          </p>
          <h3 className="mt-1 text-sm font-semibold text-[#1a1d2e]">
            Local preview of workspace health and review flow
          </h3>
        </div>

        <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-[#7c8099]">
          Fixture analytics only
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {workspaceOverviewCardsFixture.map((card, index) => (
          <article
            key={card.id}
            className="rounded-xl border border-black/10 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
                  {card.eyebrow}
                </p>

                <h3 className="mt-2 text-lg font-semibold text-[#1a1d2e]">
                  {card.title}
                </h3>
              </div>

              <OverviewStatusPill label={card.status} />
            </div>

            <p className="mt-3 text-sm leading-6 text-[#7c8099]">
              {card.description}
            </p>

            <OverviewSignalBar index={index} />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-medium text-[#7c8099]">
                Local shell preview
              </span>

              <button
                type="button"
                disabled
                className="rounded-xl border border-black/10 bg-[#eef2ff] px-3 py-2 text-sm font-semibold text-[#3b6ef8] disabled:cursor-not-allowed disabled:opacity-80"
              >
                {card.actionLabel}
              </button>
            </div>
          </article>
        ))}
      </div>

      <p className="mt-4 text-xs text-[#7c8099]">
        WORKSPACE_OVERVIEW_CARDS_CREATED · analytics cards · done 15/32 · left 17
      </p>
    </section>
  );
}

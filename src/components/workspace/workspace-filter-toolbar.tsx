/**
 * UI-3.14 — Workspace toolbar filters.
 *
 * This component is fixture-only and local to UI-3.
 * It does not call network, database, auth, environment variables or server routes.
 *
 * Result marker: WORKSPACE_FILTER_TOOLBAR_CREATED
 */

export const WORKSPACE_FILTER_TOOLBAR_RESULT =
  "WORKSPACE_FILTER_TOOLBAR_CREATED" as const;

const FILTER_GROUPS = [
  {
    id: "scope",
    label: "Scope",
    options: ["Today", "This week", "Current object"],
  },
  {
    id: "mode",
    label: "Mode",
    options: ["Planning", "Review", "Analytics"],
  },
  {
    id: "direction",
    label: "Direction",
    options: ["Career", "Language", "Health", "Money"],
  },
  {
    id: "queue",
    label: "Review queue",
    options: ["All", "Needs review", "Candidate"],
  },
  {
    id: "privacy",
    label: "Privacy",
    options: ["Private", "Sensitive", "Public preview"],
  },
] as const;

function ToolbarBadge({ label }: { readonly label: string }) {
  return (
    <span className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs font-medium text-[#7c8099]">
      {label}
    </span>
  );
}

export function WorkspaceFilterToolbar() {
  return (
    <section className="mt-4 rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
            Workspace toolbar filters
          </p>
          <h3 className="mt-1 text-sm font-semibold text-[#1a1d2e]">
            Visual filters for the center workspace
          </h3>
          <p className="mt-1 text-xs leading-5 text-[#7c8099]">
            Filters are placeholders in UI-3. They do not change data, trigger
            routing, persist state or execute actions.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <ToolbarBadge label="Fixture only" />
          <ToolbarBadge label="No hidden writes" />
          <ToolbarBadge label="No persistence" />
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-5">
        {FILTER_GROUPS.map((group) => (
          <div
            key={group.id}
            className="rounded-xl border border-black/10 bg-[#f0f2f7] p-3"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7c8099]">
              {group.label}
            </p>

            <div className="mt-2 flex flex-wrap gap-2 xl:flex-col">
              {group.options.map((option, index) => (
                <button
                  key={option}
                  type="button"
                  disabled
                  className={
                    index === 0
                      ? "rounded-lg border border-[#3b6ef8]/30 bg-[#eef2ff] px-3 py-2 text-left text-xs font-semibold text-[#1a1d2e] disabled:cursor-not-allowed disabled:opacity-90"
                      : "rounded-lg border border-black/10 bg-white px-3 py-2 text-left text-xs font-medium text-[#7c8099] disabled:cursor-not-allowed disabled:opacity-80"
                  }
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-[#7c8099]">
        WORKSPACE_FILTER_TOOLBAR_CREATED · visual filters · done 14/32 · left 18
      </p>
    </section>
  );
}

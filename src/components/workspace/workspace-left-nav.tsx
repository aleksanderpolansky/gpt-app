/**
 * UI-3.9 — LeftSemanticNavigation 240px contract.
 * UI-3.10 — Navigation groups/tree added.
 *
 * This component is fixture-only and local to UI-3.
 * It does not call network, database, auth, environment variables or server routes.
 *
 * Result markers:
 * WORKSPACE_LEFT_NAV_CREATED
 * WORKSPACE_LEFT_NAV_TREE_CREATED
 */

import type { WorkspaceNavigationGroup } from "./workspace-types";

export const WORKSPACE_LEFT_NAV_RESULT = "WORKSPACE_LEFT_NAV_CREATED" as const;

export const WORKSPACE_LEFT_NAV_TREE_RESULT =
  "WORKSPACE_LEFT_NAV_TREE_CREATED" as const;

export type WorkspaceLeftNavProps = {
  readonly navigation: readonly WorkspaceNavigationGroup[];
  readonly activeItemId?: string;
};

type TreeStatus = "active" | "candidate" | "review" | "locked" | "preview";

const TREE_STATUS_BY_ITEM_ID: Record<string, TreeStatus> = {
  today: "active",
  "activity-review": "candidate",
  calendar: "preview",
  objects: "active",
  "semantic-review": "review",
  analytics: "candidate",
  next: "candidate",
  organizations: "preview",
  offers: "preview",
  points: "locked",
  "purchase-confirmations": "review",
};

const TREE_CHILDREN_BY_ITEM_ID: Record<string, readonly string[]> = {
  today: ["Timeline", "Focus windows", "Balance rings"],
  "activity-review": ["Raw text", "Normalized meaning", "Candidate objects"],
  calendar: ["Free windows", "Constraints", "Family/work context"],
  objects: ["Personal objects", "Categories", "Relations"],
  "semantic-review": ["New concepts", "Needs decision", "External hints"],
  analytics: ["Weak direction", "Progress", "Signals"],
  next: ["Direction choice", "Action candidates", "No auto-execute"],
  organizations: ["Enterprise context", "Public profile", "Private owner"],
  offers: ["Certificates", "Availability", "Preview cards"],
  points: ["Wallet", "Burned points", "Transactions"],
  "purchase-confirmations": ["Buyer request", "Seller decision", "Audit trail"],
};

function LeftNavSectionLabel({ children }: { readonly children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7c8099]">
      {children}
    </p>
  );
}

function LeftNavBadge({ label }: { readonly label: string }) {
  return (
    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#7c8099]">
      {label}
    </span>
  );
}

function TreeStatusBadge({ status }: { readonly status: TreeStatus }) {
  const labelByStatus: Record<TreeStatus, string> = {
    active: "active",
    candidate: "candidate",
    review: "review",
    locked: "locked",
    preview: "preview",
  };

  return (
    <span className="rounded-full border border-black/10 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#3b6ef8]">
      {labelByStatus[status]}
    </span>
  );
}

export function WorkspaceLeftNav({
  navigation,
  activeItemId = "today",
}: WorkspaceLeftNavProps) {
  return (
    <aside className="w-[240px] min-w-[240px] max-w-[240px] min-h-0 overflow-y-auto border-r border-black/10 bg-white p-4">
      <LeftNavSectionLabel>Left semantic navigation</LeftNavSectionLabel>

      <div className="mt-4 space-y-4">
        {navigation.map((group) => (
          <section
            key={group.id}
            className="rounded-xl border border-black/10 bg-white p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-[#1a1d2e]">
                  {group.label}
                </h2>

                <p className="mt-1 text-xs leading-5 text-[#7c8099]">
                  {group.description}
                </p>
              </div>

              <span className="rounded-full bg-[#f0f2f7] px-2 py-0.5 text-[10px] font-semibold text-[#7c8099]">
                {group.items.length}
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {group.items.map((item) => {
                const isActive = item.id === activeItemId;
                const status = TREE_STATUS_BY_ITEM_ID[item.id] ?? "preview";
                const children = TREE_CHILDREN_BY_ITEM_ID[item.id] ?? [];

                return (
                  <div
                    key={item.id}
                    className={
                      isActive
                        ? "rounded-lg border border-[#3b6ef8]/30 bg-[#eef2ff] px-3 py-2"
                        : "rounded-lg border border-black/5 bg-[#f0f2f7] px-3 py-2"
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-[#1a1d2e]">
                        {item.label}
                      </span>
                      <LeftNavBadge label={item.badge} />
                    </div>

                    <p className="mt-1 line-clamp-2 text-xs leading-4 text-[#7c8099]">
                      {item.description}
                    </p>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="truncate text-[11px] font-medium text-[#3b6ef8]">
                        {item.href}
                      </p>
                      <TreeStatusBadge status={status} />
                    </div>

                    {children.length > 0 && (
                      <div className="mt-2 border-l border-black/10 pl-3">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9ca3b8]">
                          Tree
                        </p>
                        <ul className="space-y-1">
                          {children.map((child) => (
                            <li
                              key={child}
                              className="flex items-center gap-2 text-[11px] leading-4 text-[#7c8099]"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-[#3b6ef8]" />
                              <span className="truncate">{child}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-black/10 bg-[#eef2ff] p-3">
        <p className="text-xs font-semibold text-[#1a1d2e]">
          Navigation tree boundary
        </p>
        <p className="mt-1 text-xs leading-5 text-[#7c8099]">
          Groups and tree nodes are visual placeholders in UI-3. No routing, no
          hidden writes, no persistence and no automatic action execution.
        </p>
      </div>

      <p className="mt-4 text-xs text-[#7c8099]">
        WORKSPACE_LEFT_NAV_TREE_CREATED · width 240px · done 10/32 · left 22
      </p>
    </aside>
  );
}

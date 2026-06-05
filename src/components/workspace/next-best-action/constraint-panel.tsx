import type { ConstraintState } from "./next-best-action.types";
import { getVisibleConstraints } from "./next-best-action.utils";

export interface ConstraintPanelProps {
  readonly constraints: ConstraintState;
}

export function ConstraintPanel({ constraints }: ConstraintPanelProps) {
  const visibleConstraints = getVisibleConstraints(constraints);

  return (
    <section
      aria-labelledby="constraint-panel-title"
      className="rounded-xl border border-border bg-card p-6 shadow-sm"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Constraint panel
          </p>
          <h2 id="constraint-panel-title" className="mt-2 text-xl font-semibold text-foreground">
            Read-only context for candidate filtering
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Time, energy, place, privacy, and tools are shown as read-only preview controls.
            Nothing is saved, changed, scheduled, or executed from this panel.
          </p>
        </div>

        <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
          No persistence
        </span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visibleConstraints.map((constraint) => (
          <ReadOnlyConstraintControl
            key={constraint.id}
            label={constraint.label}
            value={constraint.value}
          />
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ConstraintTagGroup
          title="Available tools"
          description="Tools may support a candidate, but this UI does not invoke them."
          items={constraints.availableTools}
        />
        <ConstraintTagGroup
          title="Blocked contexts"
          description="These contexts are explicitly excluded from UI-12 execution."
          items={constraints.blockedContexts}
        />
      </div>

      <div className="mt-6 rounded-lg border border-border bg-background/60 p-4">
        <p className="text-sm font-semibold text-foreground">Preview controls are disabled</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground"
          >
            Change time
          </button>
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground"
          >
            Change energy
          </button>
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground"
          >
            Save constraints
          </button>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Disabled/static controls only: no form submit, no API call, no database write, and no
          hidden persistence.
        </p>
      </div>
    </section>
  );
}

interface ReadOnlyConstraintControlProps {
  readonly label: string;
  readonly value: string;
}

function ReadOnlyConstraintControl({ label, value }: ReadOnlyConstraintControlProps) {
  return (
    <article className="rounded-lg border border-border bg-background/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        Read-only preview value
      </p>
    </article>
  );
}

interface ConstraintTagGroupProps {
  readonly title: string;
  readonly description: string;
  readonly items: readonly string[];
}

function ConstraintTagGroup({ title, description, items }: ConstraintTagGroupProps) {
  return (
    <article className="rounded-lg border border-border bg-background/60 p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground"
          >
            {item}
          </span>
        ))}
      </div>
    </article>
  );
}

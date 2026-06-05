import type { WeakDirection } from "./next-best-action.types";
import {
  formatScore,
  getColorTokenClassName,
  getDomainLabel,
  getScoreToneLabel,
} from "./next-best-action.utils";

export interface WeakDirectionListProps {
  readonly weakDirections: readonly WeakDirection[];
  readonly selectedDirectionId: string;
}

export function WeakDirectionList({
  weakDirections,
  selectedDirectionId,
}: WeakDirectionListProps) {
  return (
    <section
      aria-labelledby="weak-direction-list-title"
      className="rounded-xl border border-border bg-card p-6 shadow-sm"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Weak directions
          </p>
          <h2 id="weak-direction-list-title" className="mt-2 text-xl font-semibold text-foreground">
            Choose the signal before reviewing candidates
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            These cards show weak directions as signals only. User choice is required before any
            candidate can be treated as relevant.
          </p>
        </div>

        <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
          No auto-selected final command
        </span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {weakDirections.map((direction) => (
          <WeakDirectionCard
            key={direction.id}
            direction={direction}
            isSelected={direction.id === selectedDirectionId}
          />
        ))}
      </div>

      <p className="mt-5 rounded-lg border border-border bg-background/60 px-4 py-3 text-xs leading-5 text-muted-foreground">
        User choice required: the selected state is a fixture preview and does not create a final
        Next Best Action, execute an action, or persist feedback.
      </p>
    </section>
  );
}

interface WeakDirectionCardProps {
  readonly direction: WeakDirection;
  readonly isSelected: boolean;
}

function WeakDirectionCard({ direction, isSelected }: WeakDirectionCardProps) {
  const accentClassName = getColorTokenClassName(direction.colorToken);
  const selectedClassName = isSelected ? "ring-2 ring-primary/20" : "";

  return (
    <article
      aria-label={`${direction.title} weak direction card`}
      aria-current={isSelected ? "true" : undefined}
      className={`rounded-xl border bg-background/60 p-4 ${accentClassName} ${selectedClassName}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {getDomainLabel(direction.domain)}
          </p>
          <h3 className="mt-2 text-base font-semibold text-foreground">{direction.title}</h3>
        </div>

        <span className="rounded-full border border-border bg-card px-2 py-1 text-xs font-semibold text-foreground">
          {formatScore(direction.score)}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground">
          {getScoreToneLabel(direction.score)}
        </span>
        <span className="rounded-full border border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground">
          {direction.scoreLabel}
        </span>
        {isSelected ? (
          <span className="rounded-full border border-primary/20 bg-secondary px-2 py-1 text-xs font-semibold text-primary">
            Selected preview
          </span>
        ) : (
          <span className="rounded-full border border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground">
            Available signal
          </span>
        )}
      </div>

      <p className="mt-4 text-sm leading-6 text-muted-foreground">{direction.reason}</p>

      <div className="mt-4 rounded-lg border border-border bg-card p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Risk of ignoring
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{direction.riskOfIgnoring}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" aria-label={`${direction.title} evidence labels`}>
        {direction.evidenceLabels.map((label) => (
          <span
            key={label}
            className="rounded-full border border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground"
          >
            {label}
          </span>
        ))}
      </div>
    </article>
  );
}

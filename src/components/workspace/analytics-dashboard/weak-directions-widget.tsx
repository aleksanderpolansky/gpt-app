import type {
  AnalyticsEvidenceItem,
  AnalyticsTone,
  WeakDirection,
} from "./analytics-dashboard.types";
import { formatSignalStrength } from "./analytics-dashboard.utils";

const directionClassNameByTone: Record<AnalyticsTone, string> = {
  primary: "border-primary/20 bg-secondary text-secondary-foreground",
  success: "border-border bg-background text-foreground",
  warning: "border-border bg-background text-foreground",
  danger: "border-border bg-background text-foreground",
  muted: "border-border bg-muted text-muted-foreground",
  neutral: "border-border bg-background text-foreground",
};

const evidenceKindLabel: Record<AnalyticsEvidenceItem["kind"], string> = {
  fixture: "Fixture",
  preview: "Preview",
  activity: "Activity",
  "semantic-capital": "Semantic capital",
  calendar: "Calendar",
  manual: "Manual",
};

export interface WeakDirectionsWidgetProps {
  readonly directions: readonly WeakDirection[];
}

interface WeakDirectionCardProps {
  readonly direction: WeakDirection;
  readonly rank: number;
}

interface EvidenceListProps {
  readonly evidence: readonly AnalyticsEvidenceItem[];
}

function EvidenceList({ evidence }: EvidenceListProps) {
  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Evidence
      </p>

      {evidence.map((item) => (
        <div key={item.id} className="rounded-lg border bg-background p-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-sm font-medium">{item.label}</p>
            <span className="rounded-full border bg-card px-2 py-1 text-xs text-muted-foreground">
              {evidenceKindLabel[item.kind]}
            </span>
          </div>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {item.description}
          </p>
        </div>
      ))}
    </div>
  );
}

function WeakDirectionCard({ direction, rank }: WeakDirectionCardProps) {
  return (
    <article className="rounded-xl border bg-background p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">
            Candidate signal #{rank}
          </p>
          <h3 className="mt-1 text-lg font-semibold">{direction.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {direction.reason}
          </p>
        </div>

        <div className="shrink-0 rounded-xl border bg-card px-4 py-3 text-sm">
          <p className="font-semibold">
            {formatSignalStrength(direction.signalStrength)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {direction.confidenceLabel}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span
          className={[
            "rounded-full border px-3 py-1 text-xs font-medium",
            directionClassNameByTone[direction.tone],
          ].join(" ")}
        >
          {direction.domainId}
        </span>

        <span className="rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          Signal only
        </span>

        <span className="rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          Not final action
        </span>
      </div>

      <div className="mt-4 rounded-lg border bg-card p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Constraints
        </p>
        <ul className="mt-2 space-y-1 text-sm leading-6 text-muted-foreground">
          {direction.constraints.map((constraint) => (
            <li key={constraint}>• {constraint}</li>
          ))}
        </ul>
      </div>

      <EvidenceList evidence={direction.relatedEvidence} />

      <p className="mt-4 rounded-lg border bg-card p-3 text-xs leading-5 text-muted-foreground">
        {direction.boundaryText}
      </p>
    </article>
  );
}

export function WeakDirectionsWidget({ directions }: WeakDirectionsWidgetProps) {
  const primaryDirection = directions[0];

  return (
    <section
      aria-label="Weak directions widget"
      className="rounded-xl border bg-card p-6 shadow-sm"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Weak directions
          </p>
          <h2 className="text-xl font-semibold">Review candidates</h2>
        </div>

        <p className="max-w-md text-sm leading-6 text-muted-foreground">
          These are analytics signals for review. UI-11 does not select the
          final Next Best Action and does not execute actions.
        </p>
      </div>

      {primaryDirection ? (
        <div className="mt-6 rounded-xl border bg-background p-5">
          <p className="text-sm font-medium text-muted-foreground">
            Primary weak direction
          </p>
          <h3 className="mt-1 text-2xl font-semibold">
            {primaryDirection.title}
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            {primaryDirection.reason}
          </p>
          <p className="mt-4 rounded-lg border bg-card p-3 text-xs leading-5 text-muted-foreground">
            Weak direction is not final action. UI-12 will decide action
            candidates separately.
          </p>
        </div>
      ) : (
        <div className="mt-6 rounded-xl border bg-background p-5">
          <p className="font-medium">No weak direction signal available.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            The fixture does not contain weak-direction candidates.
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-4">
        {directions.map((direction, index) => (
          <WeakDirectionCard
            key={direction.id}
            direction={direction}
            rank={index + 1}
          />
        ))}
      </div>
    </section>
  );
}

import type { NextBestActionHeader, WeakDirection } from "./next-best-action.types";
import { formatScore, getColorTokenClassName, getDomainLabel } from "./next-best-action.utils";

export interface NbaSummaryHeaderProps {
  readonly header: NextBestActionHeader;
  readonly selectedDirection: WeakDirection | undefined;
}

export function NbaSummaryHeader({ header, selectedDirection }: NbaSummaryHeaderProps) {
  return (
    <header className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <SummaryChip label="Fixture-first" tone="primary" />
            <SummaryChip label="No final NBA" tone="neutral" />
            <SummaryChip label="No execute" tone="neutral" />
            <SummaryChip label="Signals only" tone="neutral" />
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
            {header.title}
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">{header.subtitle}</p>

          <div className="mt-5 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            <p className="rounded-lg border border-border bg-background/60 px-4 py-3">
              {header.decisionWindowLabel}
            </p>
            <p className="rounded-lg border border-border bg-background/60 px-4 py-3">
              {header.sourceContextLabel}
            </p>
          </div>
        </div>

        <SelectedDirectionBadge selectedDirection={selectedDirection} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2" aria-label="Next Best Action preview badges">
        {header.badges.map((badge) => (
          <SummaryChip key={badge} label={badge} tone="neutral" />
        ))}
      </div>
    </header>
  );
}

interface SummaryChipProps {
  readonly label: string;
  readonly tone: "primary" | "neutral";
}

function SummaryChip({ label, tone }: SummaryChipProps) {
  const toneClassName =
    tone === "primary"
      ? "border-primary/20 bg-secondary text-primary"
      : "border-border bg-background text-muted-foreground";

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClassName}`}>
      {label}
    </span>
  );
}

interface SelectedDirectionBadgeProps {
  readonly selectedDirection: WeakDirection | undefined;
}

function SelectedDirectionBadge({ selectedDirection }: SelectedDirectionBadgeProps) {
  if (!selectedDirection) {
    return (
      <aside className="w-full rounded-xl border border-border bg-background/60 p-4 lg:max-w-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Selected signal
        </p>
        <h2 className="mt-2 text-base font-semibold text-foreground">
          User choice required
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          No weak direction is treated as final without explicit confirmation.
        </p>
      </aside>
    );
  }

  const accentClassName = getColorTokenClassName(selectedDirection.colorToken);

  return (
    <aside className="w-full rounded-xl border border-border bg-background/60 p-4 lg:max-w-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Selected signal preview
      </p>

      <div className={`mt-3 rounded-lg border bg-card p-4 ${accentClassName}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {selectedDirection.title}
            </h2>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              {getDomainLabel(selectedDirection.domain)} · {selectedDirection.scoreLabel}
            </p>
          </div>
          <span className="rounded-full border border-border bg-background px-2 py-1 text-xs font-semibold text-foreground">
            {formatScore(selectedDirection.score)}
          </span>
        </div>

        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {selectedDirection.reason}
        </p>
      </div>

      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        Signal-only preview: no action is executed and no final recommendation is created.
      </p>
    </aside>
  );
}

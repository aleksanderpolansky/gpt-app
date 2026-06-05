import type { ActionCandidate } from "./next-best-action.types";
import {
  getCandidateDurationLabel,
  getCandidateFitLabel,
  getConstraintMatchLabel,
  getDomainAccentClassName,
  getDomainLabel,
} from "./next-best-action.utils";

export interface ActionCandidateCardProps {
  readonly candidate: ActionCandidate;
}

export function ActionCandidateCard({ candidate }: ActionCandidateCardProps) {
  const accentClassName = getDomainAccentClassName(candidate.domain);

  return (
    <article className={`rounded-xl border bg-card p-5 shadow-sm ${accentClassName}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border bg-background px-2 py-1 text-xs font-semibold text-muted-foreground">
              Candidate preview
            </span>
            <span className="rounded-full border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground">
              {getCandidateFitLabel(candidate.fitGroup)}
            </span>
            <span className="rounded-full border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground">
              {getDomainLabel(candidate.domain)}
            </span>
          </div>

          <h3 className="mt-3 text-lg font-semibold text-foreground">{candidate.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {candidate.expectedBenefit}
          </p>
        </div>

        <div className="grid min-w-40 grid-cols-2 gap-2 text-xs sm:text-right">
          <CandidateMetric label="Duration" value={getCandidateDurationLabel(candidate)} />
          <CandidateMetric label="Energy" value={candidate.energyCost} />
          <CandidateMetric label="Place" value={candidate.placeFit} />
          <CandidateMetric label="Confidence" value={candidate.confidenceLabel} />
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-border bg-background/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Why now
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{candidate.whyNow}</p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-background/60 p-4">
          <p className="text-sm font-semibold text-foreground">Suggested preview steps</p>
          <ol className="mt-3 space-y-3">
            {candidate.steps.map((step, index) => (
              <li key={step.id} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-border bg-card text-xs font-semibold text-foreground">
                  {index + 1}
                </span>
                <span>
                  <span className="font-medium text-foreground">{step.label}</span>
                  <span className="block">{step.detail}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-lg border border-border bg-background/60 p-4">
          <p className="text-sm font-semibold text-foreground">Limits and guardrails</p>
          <ul className="mt-3 space-y-3">
            {candidate.limitations.map((limit) => (
              <li key={limit.id} className="flex gap-2 text-sm leading-6 text-muted-foreground">
                <span
                  aria-hidden="true"
                  className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary"
                />
                <span>{limit.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2" aria-label={`${candidate.title} constraint match labels`}>
        {candidate.constraintMatchLabels.map((label) => (
          <span
            key={label}
            className="rounded-full border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground"
          >
            {label}
          </span>
        ))}
      </div>

      <p className="mt-4 rounded-lg border border-border bg-background/60 px-4 py-3 text-xs leading-5 text-muted-foreground">
        Constraint match: {getConstraintMatchLabel(candidate)}. This card is a candidate preview,
        not a command. It does not perform work, send messages, schedule events, or persist feedback.
      </p>
    </article>
  );
}

interface CandidateMetricProps {
  readonly label: string;
  readonly value: string;
}

function CandidateMetric({ label, value }: CandidateMetricProps) {
  return (
    <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold capitalize text-foreground">{value}</p>
    </div>
  );
}

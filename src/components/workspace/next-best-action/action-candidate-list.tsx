import type { ActionCandidate, CandidateFitGroup } from "./next-best-action.types";
import { ActionCandidateCard } from "./action-candidate-card";
import { getCandidateFitLabel } from "./next-best-action.utils";

export interface ActionCandidateListProps {
  readonly candidates: readonly ActionCandidate[];
}

interface CandidateBucketDefinition {
  readonly fitGroup: CandidateFitGroup;
  readonly title: string;
  readonly description: string;
}

const candidateBucketDefinitions: readonly CandidateBucketDefinition[] = [
  {
    fitGroup: "best-fit",
    title: "Best fit",
    description:
      "Candidates that currently match the visible time, energy, place, and privacy constraints.",
  },
  {
    fitGroup: "low-energy",
    title: "Low energy",
    description:
      "Candidates that keep the window useful when attention or recovery capacity is limited.",
  },
  {
    fitGroup: "later",
    title: "Later",
    description:
      "Candidates that may become relevant after another signal, window, or constraint changes.",
  },
];

export function ActionCandidateList({ candidates }: ActionCandidateListProps) {
  const candidateBuckets = candidateBucketDefinitions
    .map((bucket) => ({
      ...bucket,
      candidates: candidates.filter((candidate) => candidate.fitGroup === bucket.fitGroup),
    }))
    .filter((bucket) => bucket.candidates.length > 0);

  return (
    <section
      aria-labelledby="action-candidate-list-title"
      className="rounded-xl border border-border bg-card p-6 shadow-sm"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Action candidates
          </p>
          <h2 id="action-candidate-list-title" className="mt-2 text-xl font-semibold text-foreground">
            Candidate groups by constraint fit
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Candidates are grouped as best fit, low energy, or later. They explain why the option
            might fit the current constraints, but they do not create command semantics.
          </p>
        </div>

        <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
          Preview only
        </span>
      </div>

      <div className="mt-6 space-y-6">
        {candidateBuckets.map((bucket) => (
          <section
            key={bucket.fitGroup}
            aria-labelledby={`candidate-bucket-${bucket.fitGroup}`}
            className="rounded-xl border border-border bg-background/60 p-4"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {getCandidateFitLabel(bucket.fitGroup)}
                </p>
                <h3
                  id={`candidate-bucket-${bucket.fitGroup}`}
                  className="mt-1 text-lg font-semibold text-foreground"
                >
                  {bucket.title}
                </h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  {bucket.description}
                </p>
              </div>

              <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
                {bucket.candidates.length} candidate
              </span>
            </div>

            <div className="mt-4 grid gap-4">
              {bucket.candidates.map((candidate) => (
                <ActionCandidateCard key={candidate.id} candidate={candidate} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-6 rounded-lg border border-border bg-background/60 px-4 py-3 text-xs leading-5 text-muted-foreground">
        No command semantics: this list presents candidates and constraint explanations only. It
        does not execute actions, send messages, schedule events, persist feedback, or create a
        final Next Best Action.
      </p>
    </section>
  );
}

import type {
  SemanticConceptCandidateKind,
  SemanticLocalMatch,
} from "./semantic-review-types";

export const LOCAL_MATCHES_LIST_CREATED = true as const;

export interface LocalMatchesListProps {
  matches: ReadonlyArray<SemanticLocalMatch>;
  title?: string;
  description?: string;
  compact?: boolean;
}

function clampMatchScore(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

function formatMatchPercent(value: number): string {
  return `${Math.round(clampMatchScore(value) * 100)}%`;
}

function getScoreWidthClass(value: number): string {
  const percent = Math.round(clampMatchScore(value) * 100);

  if (percent >= 96) {
    return "w-full";
  }

  if (percent >= 88) {
    return "w-11/12";
  }

  if (percent >= 80) {
    return "w-10/12";
  }

  if (percent >= 72) {
    return "w-9/12";
  }

  if (percent >= 64) {
    return "w-8/12";
  }

  if (percent >= 56) {
    return "w-7/12";
  }

  if (percent >= 48) {
    return "w-6/12";
  }

  if (percent >= 40) {
    return "w-5/12";
  }

  if (percent >= 32) {
    return "w-4/12";
  }

  if (percent >= 24) {
    return "w-3/12";
  }

  if (percent >= 16) {
    return "w-2/12";
  }

  if (percent >= 8) {
    return "w-1/12";
  }

  return "w-0";
}

function getKindLabel(kind: SemanticConceptCandidateKind): string {
  return kind.replaceAll("_", " ");
}

function getMatchStatusClasses(match: SemanticLocalMatch): string {
  if (match.currentStatus === "active" && match.alreadyExists) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
  }

  if (match.currentStatus === "draft") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";
  }

  return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300";
}

function getMatchKindClasses(kind: SemanticConceptCandidateKind): string {
  if (kind === "value_object") {
    return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300";
  }

  if (kind === "role" || kind === "context") {
    return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300";
  }

  if (kind === "metric" || kind === "state_dimension") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";
  }

  return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300";
}

function ScoreBar({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "indigo" | "violet";
}) {
  const fillClass =
    tone === "indigo"
      ? "bg-indigo-500 dark:bg-indigo-400"
      : "bg-violet-500 dark:bg-violet-400";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
          {label}
        </span>
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          {formatMatchPercent(value)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          aria-hidden="true"
          className={`h-full rounded-full ${fillClass} ${getScoreWidthClass(value)}`}
        />
      </div>
    </div>
  );
}

function LocalMatchCard({ match }: { match: SemanticLocalMatch }) {
  return (
    <article className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${getMatchKindClasses(match.kind)}`}
            >
              {getKindLabel(match.kind)}
            </span>
            <span
              className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${getMatchStatusClasses(match)}`}
            >
              {match.alreadyExists ? "Existing local item" : "Draft local item"}
            </span>
          </div>
          <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">
            {match.label}
          </h3>
          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
            {match.reason}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Source
          </p>
          <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">
            {match.sourceLabel}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ScoreBar label="Similarity" value={match.similarity} tone="indigo" />
        <ScoreBar label="Relevance" value={match.relevance} tone="violet" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        Similarity and relevance are shown separately. A similar local item is not automatically the right category, role, state dimension, or Value Object.
      </div>
    </article>
  );
}

export function LocalMatchesList({
  matches,
  title = "Local matches",
  description = "Possible existing local meanings are shown for review only.",
  compact = false,
}: LocalMatchesListProps) {
  if (matches.length === 0) {
    return (
      <section
        aria-labelledby="local-matches-list-empty"
        className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
          Local vocabulary
        </p>
        <h2
          id="local-matches-list-empty"
          className="mt-2 text-lg font-semibold text-slate-950 dark:text-slate-50"
        >
          No local matches found
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          The item can stay in the review queue. No category, state fact, Activity Event,
          or Value Object is created by this empty state.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="local-matches-list-title"
      className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Local match candidates
          </p>
          <div className="space-y-1">
            <h2
              id="local-matches-list-title"
              className="text-xl font-semibold text-slate-950 dark:text-slate-50"
            >
              {title}
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>
        </div>

        <span className="inline-flex w-fit items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300">
          {matches.length} candidates
        </span>
      </div>

      <div className={compact ? "space-y-3" : "grid gap-4 xl:grid-cols-2"}>
        {matches.map((match) => (
          <LocalMatchCard key={match.id} match={match} />
        ))}
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
        Local matches are review hints only. UI-6 does not merge categories, does not
        confirm Value Objects, and does not write ontology records.
      </div>
    </section>
  );
}

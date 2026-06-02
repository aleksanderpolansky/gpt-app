import type {
  SemanticConceptCandidate,
  SemanticConceptCandidateKind,
  SemanticReviewConfidence,
  SemanticReviewItem,
} from "./semantic-review-types";

export const CATEGORY_RESOLUTION_CARD_CREATED = true as const;

export interface CategoryResolutionCardProps {
  item: SemanticReviewItem;
  title?: string;
  description?: string;
  compact?: boolean;
}

function formatConfidencePercent(confidence: SemanticReviewConfidence): string {
  return `${Math.round(confidence.value * 100)}%`;
}

function getKindLabel(kind: SemanticConceptCandidateKind): string {
  return kind.replaceAll("_", " ");
}

function getKindClasses(kind: SemanticConceptCandidateKind): string {
  if (kind === "category") {
    return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300";
  }

  if (kind === "role" || kind === "context") {
    return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300";
  }

  if (kind === "value_object") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
  }

  if (kind === "metric" || kind === "state_dimension") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";
  }

  return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300";
}

function getStatusClasses(candidate: SemanticConceptCandidate): string {
  if (candidate.status === "candidate") {
    return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300";
  }

  if (candidate.status === "needs_review") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";
  }

  if (candidate.status === "local_only" || candidate.status === "resolved_preview") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
  }

  return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300";
}

function getConfidenceClasses(confidence: SemanticReviewConfidence): string {
  if (confidence.level === "high") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
  }

  if (confidence.level === "medium") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";
  }

  return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300";
}

function CandidateAttributes({
  candidate,
}: {
  candidate: SemanticConceptCandidate;
}) {
  if (!candidate.attributes?.length && !candidate.synonyms?.length) {
    return null;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {candidate.attributes?.length ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Attributes
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {candidate.attributes.map((attribute) => (
              <span
                key={attribute}
                className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
              >
                {attribute}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {candidate.synonyms?.length ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Synonyms
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {candidate.synonyms.map((synonym) => (
              <span
                key={synonym}
                className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300"
              >
                {synonym}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CandidateCard({
  candidate,
}: {
  candidate: SemanticConceptCandidate;
}) {
  return (
    <article className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${getKindClasses(candidate.kind)}`}
            >
              {getKindLabel(candidate.kind)}
            </span>
            <span
              className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${getStatusClasses(candidate)}`}
            >
              {candidate.status.replaceAll("_", " ")}
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">
              {candidate.label}
            </h3>
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
              {candidate.reason}
            </p>
          </div>
        </div>

        <div
          className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${getConfidenceClasses(candidate.confidence)}`}
        >
          {candidate.confidence.label} · {formatConfidencePercent(candidate.confidence)}
        </div>
      </div>

      <CandidateAttributes candidate={candidate} />
    </article>
  );
}

function ResolutionLayerSummary({ item }: { item: SemanticReviewItem }) {
  const categoryCount = item.conceptCandidates.filter(
    (candidate) => candidate.kind === "category",
  ).length;

  const roleCount = item.conceptCandidates.filter(
    (candidate) => candidate.kind === "role",
  ).length;

  const valueObjectCount = item.conceptCandidates.filter(
    (candidate) => candidate.kind === "value_object",
  ).length;

  const stateDimensionCount = item.conceptCandidates.filter(
    (candidate) => candidate.kind === "state_dimension",
  ).length;

  return (
    <div className="grid gap-3 md:grid-cols-4">
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-3 dark:border-indigo-900/60 dark:bg-indigo-950/40">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500 dark:text-indigo-300">
          Categories
        </p>
        <p className="mt-2 text-2xl font-semibold text-indigo-700 dark:text-indigo-200">
          {categoryCount}
        </p>
      </div>

      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3 dark:border-violet-900/60 dark:bg-violet-950/40">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-500 dark:text-violet-300">
          Roles
        </p>
        <p className="mt-2 text-2xl font-semibold text-violet-700 dark:text-violet-200">
          {roleCount}
        </p>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/40">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-500 dark:text-emerald-300">
          Value objects
        </p>
        <p className="mt-2 text-2xl font-semibold text-emerald-700 dark:text-emerald-200">
          {valueObjectCount}
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/40">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-500 dark:text-amber-300">
          State dimensions
        </p>
        <p className="mt-2 text-2xl font-semibold text-amber-700 dark:text-amber-200">
          {stateDimensionCount}
        </p>
      </div>
    </div>
  );
}

export function CategoryResolutionCard({
  item,
  title = "Category resolution",
  description = "Review candidate meanings before connecting them with local semantic layers.",
  compact = false,
}: CategoryResolutionCardProps) {
  if (item.conceptCandidates.length === 0) {
    return (
      <section
        aria-labelledby="category-resolution-empty"
        className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
          Category resolution
        </p>
        <h2
          id="category-resolution-empty"
          className="mt-2 text-lg font-semibold text-slate-950 dark:text-slate-50"
        >
          No concept candidates attached
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          The item can stay in the queue until the semantic layer has candidate meanings
          to compare. No category, Value Object, Activity Event, or ontology record is created.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby={`category-resolution-card-${item.id}`}
      className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Semantic layer resolution
          </p>
          <div className="space-y-1">
            <h2
              id={`category-resolution-card-${item.id}`}
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
          {item.conceptCandidates.length} candidates
        </span>
      </div>

      {!compact ? <ResolutionLayerSummary item={item} /> : null}

      <div className={compact ? "space-y-3" : "grid gap-4 xl:grid-cols-2"}>
        {item.conceptCandidates.map((candidate) => (
          <CandidateCard key={candidate.id} candidate={candidate} />
        ))}
      </div>

      <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
        <p>Category is not a state fact.</p>
        <p>AI output is a candidate, not truth.</p>
        <p>No category, Value Object, Activity Event, or ontology record is created.</p>
        <p>Role, responsibility, care, and purpose stay visible as separate review layers.</p>
      </div>
    </section>
  );
}

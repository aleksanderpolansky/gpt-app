import type {
  SemanticExternalConceptHint,
  SemanticReviewConfidence,
} from "./semantic-review-types";

export const EXTERNAL_CONCEPT_HINT_CREATED = true as const;

export interface ExternalConceptHintCardProps {
  hints: ReadonlyArray<SemanticExternalConceptHint>;
  title?: string;
  description?: string;
  compact?: boolean;
}

function formatConfidencePercent(confidence: SemanticReviewConfidence): string {
  return `${Math.round(confidence.value * 100)}%`;
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

function getSourceTypeClasses(
  sourceType: SemanticExternalConceptHint["sourceType"],
): string {
  if (sourceType === "external_ontology") {
    return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300";
  }

  if (sourceType === "business_taxonomy") {
    return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300";
  }

  if (sourceType === "dictionary") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
  }

  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";
}

function getSourceTypeLabel(
  sourceType: SemanticExternalConceptHint["sourceType"],
): string {
  return sourceType.replaceAll("_", " ");
}

function ExternalHintCard({
  hint,
  compact,
}: {
  hint: SemanticExternalConceptHint;
  compact: boolean;
}) {
  return (
    <article className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${getSourceTypeClasses(hint.sourceType)}`}
            >
              {getSourceTypeLabel(hint.sourceType)}
            </span>
            <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              Hint only
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">
              {hint.label}
            </h3>
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
              {hint.description}
            </p>
          </div>
        </div>

        <div
          className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${getConfidenceClasses(hint.confidence)}`}
        >
          {hint.confidence.label} · {formatConfidencePercent(hint.confidence)}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Source name
          </p>
          <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            {hint.sourceName}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Internal category
          </p>
          <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            {hint.isInternalCategory ? "Unexpected internal category" : "No · external hint only"}
          </p>
        </div>
      </div>

      {!compact ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          {hint.note}
        </div>
      ) : null}
    </article>
  );
}

export function ExternalConceptHintCard({
  hints,
  title = "External concept hints",
  description = "External references can explain a candidate, but they are not internal categories.",
  compact = false,
}: ExternalConceptHintCardProps) {
  if (hints.length === 0) {
    return (
      <section
        aria-labelledby="external-concept-hint-empty"
        className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
          External hints
        </p>
        <h2
          id="external-concept-hint-empty"
          className="mt-2 text-lg font-semibold text-slate-950 dark:text-slate-50"
        >
          No external hints attached
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          The review item can still be handled through local candidates. No external concept is converted into an internal category by this empty state.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="external-concept-hint-title"
      className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            External reference layer
          </p>
          <div className="space-y-1">
            <h2
              id="external-concept-hint-title"
              className="text-xl font-semibold text-slate-950 dark:text-slate-50"
            >
              {title}
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>
        </div>

        <span className="inline-flex w-fit items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300">
          {hints.length} hints
        </span>
      </div>

      <div className={compact ? "space-y-3" : "grid gap-4 xl:grid-cols-2"}>
        {hints.map((hint) => (
          <ExternalHintCard key={hint.id} hint={hint} compact={compact} />
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        External concept is a hint, not an internal category. AI output is a candidate,
        not truth. This component does not create internal categories and does not write ontology records.
      </div>
    </section>
  );
}


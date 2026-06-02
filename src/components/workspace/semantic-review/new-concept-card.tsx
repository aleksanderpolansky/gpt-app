import type {
  SemanticNewConcept,
  SemanticReviewConfidence,
  SemanticReviewItem,
  SemanticSummaryChip,
} from "./semantic-review-types";

export const NEW_CONCEPT_CARD_CREATED = true as const;

export interface NewConceptCardProps {
  item: SemanticReviewItem;
  compact?: boolean;
}

function getConfidenceToneClasses(confidence: SemanticReviewConfidence): string {
  if (confidence.level === "high") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
  }

  if (confidence.level === "medium") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";
  }

  return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300";
}

function getChipToneClasses(chip: SemanticSummaryChip): string {
  if (chip.tone === "indigo") {
    return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300";
  }

  if (chip.tone === "violet") {
    return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300";
  }

  if (chip.tone === "emerald") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
  }

  if (chip.tone === "amber") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";
  }

  return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300";
}

function formatConfidencePercent(confidence: SemanticReviewConfidence): string {
  return `${Math.round(confidence.value * 100)}%`;
}

function renderListSection(title: string, values: ReadonlyArray<string>) {
  if (values.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
        {title}
      </p>
      <ul className="space-y-2">
        {values.map((value) => (
          <li
            key={value}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            {value}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NewConceptDetails({
  concept,
}: {
  concept: SemanticNewConcept;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500 dark:text-indigo-300">
          New concept candidate
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
              {concept.suggestedLabel}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Raw term: <span className="font-medium text-slate-700 dark:text-slate-200">{concept.term}</span>
            </p>
          </div>
          <span className="inline-flex w-fit items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300">
            {concept.proposedKind.replaceAll("_", " ")}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          {concept.description}
        </p>
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          {concept.reason}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {renderListSection("Attributes", concept.attributes)}
        {renderListSection("Risk notes", concept.riskNotes)}
      </div>
    </div>
  );
}

export function NewConceptCard({ item, compact = false }: NewConceptCardProps) {
  const confidenceClasses = getConfidenceToneClasses(item.confidence);

  return (
    <section
      aria-labelledby={`new-concept-card-${item.id}`}
      className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Semantic Review · Candidate, not truth
          </p>
          <div className="space-y-1">
            <h2
              id={`new-concept-card-${item.id}`}
              className="text-xl font-semibold text-slate-950 dark:text-slate-50"
            >
              {item.title}
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              {item.subtitle}
            </p>
          </div>
        </div>

        <div
          className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${confidenceClasses}`}
        >
          {item.confidence.label} · {formatConfidencePercent(item.confidence)}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {item.summaryChips.map((chip) => (
          <span
            key={chip.id}
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getChipToneClasses(chip)}`}
          >
            {chip.label}
            {chip.value ? (
              <span className="ml-1 font-medium opacity-80">· {chip.value}</span>
            ) : null}
          </span>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
          Source phrase
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
          {item.rawText}
        </p>
        {item.highlightedTerm ? (
          <p className="mt-3 inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300">
            Highlighted: {item.highlightedTerm}
          </p>
        ) : null}
      </div>

      {item.newConcept ? (
        <NewConceptDetails concept={item.newConcept} />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          No new concept candidate is attached to this review item.
        </div>
      )}

      {!compact ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Safety boundary
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            This card explains a semantic candidate only. It does not create categories,
            Value Objects, Activity Events, state facts, points, or commercial records.
          </p>
        </div>
      ) : null}
    </section>
  );
}

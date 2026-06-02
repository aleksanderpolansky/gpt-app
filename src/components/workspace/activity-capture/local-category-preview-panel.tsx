import type {
  LocalCategoryCandidate,
  UnknownTermCandidate,
} from "./activity-capture-types";

export const LOCAL_CATEGORY_PREVIEW_PANEL_CREATED =
  "LOCAL_CATEGORY_PREVIEW_PANEL_CREATED" as const;

export interface LocalCategoryPreviewPanelProps {
  categoryCandidates: LocalCategoryCandidate[];
  unknownTermCandidates: UnknownTermCandidate[];
}

function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

function getStatusLabel(status: LocalCategoryCandidate["status"]): string {
  if (status === "needs_review") {
    return "needs review";
  }

  return "suggested";
}

export function LocalCategoryPreviewPanel({
  categoryCandidates,
  unknownTermCandidates,
}: LocalCategoryPreviewPanelProps) {
  const hasCategoryCandidates = categoryCandidates.length > 0;
  const hasUnknownTerms = unknownTermCandidates.length > 0;

  return (
    <article
      aria-labelledby="local-category-preview-title"
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Local category preview
          </p>

          <h3
            id="local-category-preview-title"
            className="mt-2 text-lg font-semibold tracking-tight text-slate-950"
          >
            Категории-кандидаты
          </h3>

          <p className="mt-1 text-sm leading-6 text-slate-600">
            Это локальные category candidates из deterministic rules. Они не
            являются подтверждёнными категориями, state facts или решением AI.
          </p>
        </div>

        <span className="w-fit rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          {categoryCandidates.length} candidates
        </span>
      </div>

      {hasCategoryCandidates ? (
        <div className="mt-4 grid gap-3">
          {categoryCandidates.map((candidate) => (
            <div
              key={candidate.id}
              className="rounded-xl border border-slate-100 bg-slate-50 p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {candidate.label}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {candidate.reason}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    {candidate.domain}
                  </span>

                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    {getStatusLabel(candidate.status)}
                  </span>

                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    {formatConfidence(candidate.confidence)}
                  </span>
                </div>
              </div>

              <div className="mt-3 rounded-lg bg-white px-3 py-2 text-xs leading-5 text-slate-500">
                sourceRule: {candidate.sourceRule}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">
            Category candidates не найдены
          </p>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Локальные keyword rules пока не определили подходящую категорию.
            Это не ошибка и не означает отсутствие смысла в активности.
          </p>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-900">
              Unknown term candidates
            </p>

            <p className="mt-1 text-xs leading-5 text-amber-800">
              Эти слова могут потребовать future review. Они не создают новые
              категории автоматически.
            </p>
          </div>

          <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-800">
            {unknownTermCandidates.length} terms
          </span>
        </div>

        {hasUnknownTerms ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {unknownTermCandidates.map((unknownTerm) => (
              <span
                key={unknownTerm.term}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-amber-800"
                title={unknownTerm.reason}
              >
                {unknownTerm.term} · {unknownTerm.suggestedAction}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs leading-5 text-amber-800">
            Unknown terms не найдены.
          </p>
        )}
      </div>
    </article>
  );
}
